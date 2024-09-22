export interface UndoState {
  variable: StateVariable;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

export enum StateVariable {
  canvasSize = 'canvasSize',
  canvas = 'canvas',
  context = 'context',
  screenMouseLocation = 'screenMouseLocation',
  activeTool = 'activeTool',
  entities = 'entities',
  activeEntity = 'activeEntity',
  shouldDrawCursor = 'shouldDrawCursor',
  helperEntities = 'helperEntities',
  debugEntities = 'debugEntities',
  angleStep = 'angleStep',
  screenOffset = 'screenOffset',
  screenZoom = 'screenZoom',
  panStartLocation = 'panStartLocation',
  snapPoint = 'snapPoint',
  snapPointOnAngleGuide = 'snapPointOnAngleGuide',
  hoveredSnapPoints = 'hoveredSnapPoints',
  lastDrawTimestamp = 'lastDrawTimestamp',
  activeLineColor = 'activeLineColor',
  activeLineWidth = 'activeLineWidth',
}

/**
 * Based on https://github.com/wobsoriano/undo-stacker
 */
export function createStack() {
  let stack: UndoState[] = [];

  let index = stack.length;

  function peek() {
    return stack[index - 1];
  }

  return {
    push: (value: UndoState) => {
      stack.length = index;
      stack[index++] = value;

      // console.log('stack push', JSON.stringify(stack, null, 2));
      return peek();
    },
    replace: (value: UndoState) => {
      stack[index - 1] = value;

      // console.log('stack replace', JSON.stringify(stack, null, 2));
      return peek();
    },
    peek: () => {
      return peek();
    },
    undo: () => {
      if (index > 1) index -= 1;

      // console.log('stack undo', JSON.stringify(stack, null, 2));
      return peek();
    },
    redo: () => {
      if (index < stack.length) index += 1;

      // console.log('stack redo', JSON.stringify(stack, null, 2));
      return peek();
    },
    // Clear certain states from the undo stack
    clear: (variable: StateVariable) => {
      // Update the index be reducing it by the number of states that are removed to the left of the index
      index =
        index -
        stack.slice(0, index).filter(state => state.variable === variable)
          .length;

      stack = stack.filter(state => state.variable !== variable);
    },
  };
}
