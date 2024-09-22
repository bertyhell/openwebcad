/**
 * Open a file selection dialog to select *.jpg, *.jpeg, *.png files
 * Load the image data
 * Convert it to a base64 string
 */
export function importImageFromFile(
  file: File | null | undefined,
): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>(resolve => {
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', async () => {
      const imageArrayBuffer = reader.result as ArrayBuffer;

      resolve(imageArrayBuffer);
    });
    reader.readAsArrayBuffer(file);
  });
}
