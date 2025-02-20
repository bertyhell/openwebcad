import { saveAs } from 'file-saver';
import { convertEntitiesToSvgString } from './export-entities-to-svg';
import { getEntities } from '../../state';

/**
 * Takes an svg string and converts it to a png data uri
 * by creating an svg element in the dom and drawing that element on the canvas
 * Then taking the canvas data and outputting it as a png data blob
 * @param svgLines
 * @param width
 * @param height
 * @param margin
 */
export function convertSvgToPngBlob(
  svgLines: string[],
  width: number,
  height: number,
  margin: number,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    const img = new Image();
    const svg = new Blob(svgLines, { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svg);

    img.onload = () => {
      canvas.width = width + margin * 2;
      canvas.height = height + margin * 2;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, margin, margin);

      URL.revokeObjectURL(url);

      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Could not convert canvas to blob'));
        }
      }, 'image/png');
    };

    img.src = url;
  });
}

export async function exportEntitiesToPngFile() {
  const entities = getEntities();

  const svg = convertEntitiesToSvgString(entities);
  const pngDataBlob: Blob = await convertSvgToPngBlob(
    svg.svgLines,
    svg.width,
    svg.height,
    20,
  );

  saveAs(pngDataBlob, 'open-web-cad--drawing.png');
}
