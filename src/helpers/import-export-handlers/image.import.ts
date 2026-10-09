/**
 * Load the image data of a *.jpg, *.jpeg or *.png file as a base64 data url
 * A data url keeps working after saving and reloading the drawing, unlike an object url
 */
export function imageImport(file: File | null | undefined): Promise<HTMLImageElement> {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		if (!file) return;

		const reader = new FileReader();
		reader.addEventListener('load', () => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
			img.src = reader.result as string;
		});
		reader.addEventListener('error', () => reject(reader.error));
		reader.readAsDataURL(file);
	});
}
