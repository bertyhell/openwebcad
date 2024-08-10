type NotFalsey<T> = Exclude<T, false | null | 0 | '' | undefined>;

export function compact<T>(arr: readonly T[]): Array<NotFalsey<T>> {
  const result: Array<NotFalsey<T>> = [];

  for (const item of arr) {
    if (item) {
      result.push(item as NotFalsey<T>);
    }
  }

  return result;
}
