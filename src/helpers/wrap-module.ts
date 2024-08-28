// Wraps the index so that if you go past the length it resets to 0
// ["one", "two", "three"]
// index maps like this
// 0 => 0
// 1 => 1
// 2 => 2
// 3 => 0
// 4 => 1
export function wrapModule(index: number, length: number) {
  return (index + length) % length;
}
