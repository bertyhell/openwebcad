/**
 * Based on https://github.com/wobsoriano/undo-stacker
 */
export function createStack<T>() {
  const stack: T[] = [];

  let index = stack.length;

  function peek() {
    return stack[index - 1];
  }

  return {
    push: (value: T) => {
      stack.length = index;
      stack[index++] = value;

      console.log('stack push', JSON.stringify(stack, null, 2));
      return peek();
    },
    replace: (value: T) => {
      stack[index - 1] = value;

      console.log('stack replace', JSON.stringify(stack, null, 2));
      return peek();
    },
    peek: () => {
      return peek();
    },
    undo: () => {
      if (index > 1) index -= 1;

      console.log('stack undo', JSON.stringify(stack, null, 2));
      return peek();
    },
    redo: () => {
      if (index < stack.length) index += 1;

      console.log('stack redo', JSON.stringify(stack, null, 2));
      return peek();
    },
  };
}
