import {
  getActiveToolActor,
  getLastStateInstructions,
  getScreenCanvasDrawController,
  getSnapPoint,
  getSnapPointOnAngleGuide,
  redo,
  setActiveToolActor,
  setGhostHelperEntities,
  setSelectedEntityIds,
  undo,
} from '../state.ts';
import {
  AbsolutePointInputEvent,
  ActorEvent,
  NumberInputEvent,
  RelativePointInputEvent,
  TextInputEvent,
} from '../tools/tool.types.ts';
import { ScreenCanvasDrawController } from '../drawControllers/screenCanvas.drawController.ts';
import { Point } from '@flatten-js/core';
import {
  CANVAS_INPUT_FIELD_BACKGROUND_COLOR,
  CANVAS_INPUT_FIELD_HEIGHT,
  CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR,
  CANVAS_INPUT_FIELD_MOUSE_OFFSET,
  CANVAS_INPUT_FIELD_TEXT_COLOR,
  CANVAS_INPUT_FIELD_WIDTH,
} from '../App.consts.ts';
import { TOOL_STATE_MACHINES } from '../tools/tool.consts.ts';
import { Actor } from 'xstate';
import { Tool } from '../tools.ts';

const NUMBER_REGEXP = /^[0-9]+([.][0-9]+)?$/;
const ABSOLUTE_POINT_REGEXP =
  /^([0-9]+([.][0-9]+)?)\s*,\s*([0-9]+([.][0-9]+)?)$/;
const RELATIVE_POINT_REGEXP =
  /^@([0-9]+([.][0-9]+)?)\s*,\s*([0-9]+([.][0-9]+)?)$/;

export class InputController {
  private text: string = '';

  constructor() {
    // Listen for keystrokes
    document.addEventListener('keydown', evt => {
      this.handleKeyStroke(evt);
    });
    // Listen for right mouse button click => perform the same action as ENTER
    document.addEventListener('mouseup', evt => {
      this.handleMouseUp(evt);
    });
    // Stop the context menu from appearing when right-clicking
    document.addEventListener('contextmenu', evt => {
      evt.preventDefault();
    });
  }

  public draw(drawController: ScreenCanvasDrawController) {
    const screenMouseLocation = drawController.getScreenMouseLocation();

    // draw input field
    drawController.fillRectScreen(
      screenMouseLocation.x + CANVAS_INPUT_FIELD_MOUSE_OFFSET,
      screenMouseLocation.y + CANVAS_INPUT_FIELD_MOUSE_OFFSET,
      CANVAS_INPUT_FIELD_WIDTH,
      CANVAS_INPUT_FIELD_HEIGHT,
      CANVAS_INPUT_FIELD_BACKGROUND_COLOR,
    );
    drawController.drawTextScreen(
      this.text,
      new Point(
        screenMouseLocation.x + CANVAS_INPUT_FIELD_MOUSE_OFFSET + 2,
        screenMouseLocation.y +
          CANVAS_INPUT_FIELD_MOUSE_OFFSET +
          CANVAS_INPUT_FIELD_HEIGHT -
          2,
      ),
      {
        textAlign: 'left',
        textColor: CANVAS_INPUT_FIELD_TEXT_COLOR,
        fontSize: 18,
      },
    );

    const matchingToolNames = this.getToolNamesFromPrefixText();
    const toolInstruction = getLastStateInstructions();
    const texts: string[] = [];
    if (toolInstruction) {
      // Draw tool instruction
      texts.push(toolInstruction);
    }
    if (matchingToolNames.length) {
      // Draw list of matching tools. eg: C => CIRCLE, COPY, ...
      texts.push(...matchingToolNames);
    }
    this.drawListBelowInputField(drawController, texts);
  }

  private handleMouseUp(evt: MouseEvent) {
    if (evt.button === 2) {
      // Right click => confirm action (ENTER)
      evt.preventDefault();
      evt.stopPropagation();
      this.handleEnterKey();
    }
  }

  public handleKeyStroke(evt: KeyboardEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    if (evt.ctrlKey && evt.key === 'v') {
      // User wants to paste the clipboard
    } else if (evt.ctrlKey && !evt.shiftKey && evt.key === 'z') {
      // User wants to undo the last action
      this.handleUndo(evt);
    } else if (evt.ctrlKey && evt.shiftKey && evt.key === 'z') {
      // User wants to redo the last action
      this.handleRedo(evt);
    } else if (evt.ctrlKey && evt.key === 'y') {
      // User wants to redo the last action
      this.handleRedo(evt);
    } else if (evt.key === 'Backspace') {
      // Remove the last character from the input field
      evt.preventDefault();
      this.text = this.text.slice(0, this.text.length - 1);
    } else if (evt.key === 'Delete') {
      // User wants to delete the current selection
      evt.preventDefault();
      getActiveToolActor()?.send({
        type: ActorEvent.DELETE,
      });
    } else if (evt.key === 'Escape') {
      // User wants to cancel the current action
      this.handleEscapeKey();
    } else if (evt.key === 'Enter') {
      // User wants to submit the input or submit the action
      this.handleEnterKey();
    } else if (evt.key?.length === 1) {
      // User entered a single character => add to input field text
      this.text += evt.key.toUpperCase();
    }
  }

  private handleEscapeKey() {
    if (this.text === '') {
      // Cancel tool action
      getActiveToolActor()?.send({
        type: ActorEvent.ESC,
      });
    } else {
      // clear the input field
      this.text = '';
    }
  }

  private getToolNamesFromPrefixText(): Tool[] {
    if (this.text === '') {
      return [];
    }
    return (Object.keys(TOOL_STATE_MACHINES).filter(cmd =>
      cmd.startsWith(this.text.toUpperCase()),
    ) || null) as Tool[];
  }

  private handleEnterKey() {
    // submit the text as input to the active tool and clear the input field
    if (this.text === '') {
      console.log('ENTER: ', {
        text: this.text,
        activeTool: getActiveToolActor(),
      });
      // Send the ENTER event to the active tool
      getActiveToolActor()?.send({
        type: ActorEvent.ENTER,
      });
    } else if (this.getToolNamesFromPrefixText()[0]) {
      // User entered a command. eg: L or LINE
      const toolName = this.getToolNamesFromPrefixText()[0];

      getActiveToolActor()?.stop();

      const newToolActor = new Actor(TOOL_STATE_MACHINES[toolName]);
      setActiveToolActor(newToolActor);

      console.log('SWITCH TO TOOL: ', {
        toolName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeTool: (getActiveToolActor()?.src as any).config.context.type,
      });

      this.text = '';
    } else if (NUMBER_REGEXP.test(this.text)) {
      console.log(' NUMBER_INPUT: ', {
        text: this.text,
        activeTool: getActiveToolActor(),
      });
      // User entered a number. eg: 100
      getActiveToolActor()?.send({
        type: ActorEvent.NUMBER_INPUT,
        value: parseFloat(this.text),
        worldMouseLocation:
          getSnapPointOnAngleGuide()?.point ||
          getSnapPoint()?.point ||
          getScreenCanvasDrawController().getWorldMouseLocation(),
      } as NumberInputEvent);
      this.text = '';
    } else if (ABSOLUTE_POINT_REGEXP.test(this.text)) {
      console.log('ABSOLUTE_POINT_INPUT: ', {
        text: this.text,
        activeTool: getActiveToolActor(),
      });
      // User entered coordinates to an absolute point on the canvas. eg: 100, 200
      const match = ABSOLUTE_POINT_REGEXP.exec(this.text);
      if (!match) {
        return;
      }
      const x = parseFloat(match[1]);
      const y = parseFloat(match[3]);
      getActiveToolActor()?.send({
        type: ActorEvent.ABSOLUTE_POINT_INPUT,
        value: new Point(x, -y), // User expects mathematical coordinates, where y axis goes up, but canvas y axis goes down
      } as AbsolutePointInputEvent);
      this.text = '';
    } else if (RELATIVE_POINT_REGEXP.test(this.text)) {
      console.log('RELATIVE_POINT_INPUT: ', {
        text: this.text,
        activeTool: getActiveToolActor(),
      });
      // User entered coordinates to a relative point on the canvas. eg: @100, 200
      const match = RELATIVE_POINT_REGEXP.exec(this.text);
      if (!match) {
        return;
      }
      const x = parseFloat(match[1]);
      const y = parseFloat(match[3]);
      getActiveToolActor()?.send({
        type: ActorEvent.RELATIVE_POINT_INPUT,
        value: new Point(x, -y), // User expects mathematical coordinates, where y axis goes up, but canvas y axis goes down
      } as RelativePointInputEvent);
      this.text = '';
    } else {
      console.log('TEXT_INPUT: ', {
        text: this.text,
        activeTool: getActiveToolActor(),
      });
      // Send the text to the active tool
      getActiveToolActor()?.send({
        type: ActorEvent.TEXT_INPUT,
        value: this.text,
      } as TextInputEvent);
      this.text = '';
    }
  }

  private handleUndo(evt: KeyboardEvent) {
    evt.preventDefault();
    undo();
    setGhostHelperEntities([]);
    setSelectedEntityIds([]);
    getActiveToolActor()?.send({
      type: ActorEvent.ESC,
    });
  }

  private handleRedo(evt: KeyboardEvent) {
    evt.preventDefault();
    redo();
    setGhostHelperEntities([]);
    setSelectedEntityIds([]);
    getActiveToolActor()?.send({
      type: ActorEvent.ESC,
    });
  }

  private drawListBelowInputField(
    drawController: ScreenCanvasDrawController,
    texts: string[],
  ): void {
    const screenMouseLocation = drawController.getScreenMouseLocation();
    const startY =
      screenMouseLocation.y +
      CANVAS_INPUT_FIELD_MOUSE_OFFSET +
      CANVAS_INPUT_FIELD_HEIGHT * 2 +
      2;
    const offsetY = CANVAS_INPUT_FIELD_HEIGHT;
    texts.forEach((text, index) => {
      drawController.drawTextScreen(
        text,
        new Point(
          screenMouseLocation.x + CANVAS_INPUT_FIELD_MOUSE_OFFSET + 2,
          startY + index * offsetY,
        ),
        {
          textAlign: 'left',
          textColor: CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR,
          fontSize: 18,
        },
      );
    });
  }
}
