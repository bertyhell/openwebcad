/**
 * Open a file selection dialog to select *.jpg, *.jpeg, *.png files
 * Load the image data
 * Convert it to a base64 string
 */
export function importImageFromFile(
  file: File | null | undefined,
): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>(resolve => {
    if (!file) return;

    const img = new Image();
    img.onload = function () {
      resolve(img);
    };
    img.src = URL.createObjectURL(file);
  });
}
