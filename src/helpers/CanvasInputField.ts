import {
  getActiveToolActor,
  getLastStateInstructions,
  getScreenCanvasDrawController,
  getSnapPoint,
  getSnapPointOnAngleGuide,
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

const NUMBER_REGEXP = /^[0-9]+([.][0-9]+)?$/;
const ABSOLUTE_POINT_REGEXP =
  /^([0-9]+([.][0-9]+))\s*,\s*([0-9]+([.][0-9]+)?)$/;
const RELATIVE_POINT_REGEXP =
  /^@([0-9]+([.][0-9]+))\s*,\s*([0-9]+([.][0-9]+)?)$/;

export class CanvasInputField {
  private text: string = '';

  constructor() {
    document.addEventListener('keydown', evt => {
      this.handleKeyStroke(evt);
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

    // Draw tool instruction
    const toolInstruction = getLastStateInstructions();
    if (toolInstruction) {
      drawController.drawTextScreen(
        toolInstruction,
        new Point(
          screenMouseLocation.x + CANVAS_INPUT_FIELD_MOUSE_OFFSET + 2,
          screenMouseLocation.y +
            CANVAS_INPUT_FIELD_MOUSE_OFFSET +
            CANVAS_INPUT_FIELD_HEIGHT * 2 +
            2,
        ),
        {
          textAlign: 'left',
          textColor: CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR,
          fontSize: 18,
        },
      );
    }
  }

  public handleKeyStroke(evt: KeyboardEvent) {
    if (evt.ctrlKey && evt.key === 'v') {
      // User wants to paste the clipboard
    } else if (evt.key === 'Backspace') {
      this.text = this.text.slice(0, this.text.length - 1);
    } else if (evt.key === 'Escape') {
      if (this.text === '') {
        // Cancel tool action
        getActiveToolActor()?.send({
          type: ActorEvent.ESC,
        });
      } else {
        // clear the input field
        this.text = '';
      }
    } else if (evt.key === 'Enter') {
      // submit the text as input to the active tool and clear the input field
      if (this.text === '') {
        getActiveToolActor()?.send({
          type: ActorEvent.ENTER,
        });
      } else if (NUMBER_REGEXP.test(this.text)) {
        // User entered a number. eg: 100
        getActiveToolActor()?.send({
          type: ActorEvent.NUMBER_INPUT,
          value: parseFloat(this.text),
          worldClickPoint:
            getSnapPointOnAngleGuide()?.point ||
            getSnapPoint()?.point ||
            getScreenCanvasDrawController().getWorldMouseLocation(),
        } as NumberInputEvent);
        this.text = '';
      } else if (ABSOLUTE_POINT_REGEXP.test(this.text)) {
        // User entered coordinates to an absolute point on the canvas. eg: 100, 200
        const match = ABSOLUTE_POINT_REGEXP.exec(this.text);
        if (!match) {
          return;
        }
        const x = parseFloat(match[1]);
        const y = parseFloat(match[3]);
        getActiveToolActor()?.send({
          type: ActorEvent.ABSOLUTE_POINT_INPUT,
          value: new Point(x, y),
        } as AbsolutePointInputEvent);
        this.text = '';
      } else if (RELATIVE_POINT_REGEXP.test(this.text)) {
        // User entered coordinates to a relative point on the canvas. eg: @100, 200
        const match = RELATIVE_POINT_REGEXP.exec(this.text);
        if (!match) {
          return;
        }
        const x = parseFloat(match[1]);
        const y = parseFloat(match[3]);
        getActiveToolActor()?.send({
          type: ActorEvent.RELATIVE_POINT_INPUT,
          value: new Point(x, y),
          worldClickPoint:
            getSnapPointOnAngleGuide()?.point ||
            getSnapPoint()?.point ||
            getScreenCanvasDrawController().getWorldMouseLocation(),
        } as RelativePointInputEvent);
        this.text = '';
      } else {
        getActiveToolActor()?.send({
          type: ActorEvent.TEXT_INPUT,
          value: this.text,
        } as TextInputEvent);
        this.text = '';
      }
    } else if (evt.key?.length === 1) {
      // User entered a single character
      this.text += evt.key.toUpperCase();
    }
  }
}
