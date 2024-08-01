export function times<T>(num: number, iterateeFunc: (i: number) => T): T[] {
  let i = 0;
  const items = [];
  while (i < num) {
    items.push(iterateeFunc(i));
    i++;
  }
  return items;
}
