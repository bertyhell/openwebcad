import { Point } from '@flatten-js/core';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LineEntity } from '../../entities/LineEntity.ts';
import { createTestLayer, resetState } from '../../test-helpers/reset-state.ts';
import { exportEntitiesToPdfFile } from './pdf.export.ts';
import { exportEntitiesToPngFile } from './png.export.ts';
import { exportEntitiesToSvgFile } from './svg.export.ts';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
vi.mock('react-toastify', () => ({
	toast: { error: vi.fn(), info: vi.fn(), warning: vi.fn(), success: vi.fn() },
}));
// The pdf library needs a browser, the export only needs a blob from it
vi.mock('../../drawControllers/pdf.drawController.ts', () => ({
	PdfDrawController: class {
		setLineStyles() {}
		drawLine() {}
		export() {
			return Promise.resolve(new Blob(['%PDF']));
		}
	},
}));

const exportHandlers = {
	svg: exportEntitiesToSvgFile,
	pdf: exportEntitiesToPdfFile,
	png: exportEntitiesToPngFile,
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe('svg, pdf and png export', () => {
	it.each(Object.entries(exportHandlers))(
		'shows a message instead of exporting an empty drawing to %s',
		async (_, exportHandler) => {
			resetState([createTestLayer('layer')]);
			await exportHandler();
			expect(toast.info).toHaveBeenCalledWith('Nothing to export');
			expect(saveAs).not.toHaveBeenCalled();
		}
	);

	it('shows a message when all entities are on hidden layers', async () => {
		const hiddenLayer = createTestLayer('hidden', { isVisible: false });
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		line.layerId = hiddenLayer.id;
		resetState([hiddenLayer], [line]);
		await exportEntitiesToSvgFile();
		expect(toast.info).toHaveBeenCalledWith('Nothing to export');
		expect(saveAs).not.toHaveBeenCalled();
	});

	it.each([
		['svg', exportEntitiesToSvgFile, 'image/svg+xml;charset=utf-8'],
		['pdf', exportEntitiesToPdfFile, 'application/pdf'],
	] as const)('saves %s files with their media type', async (_, exportHandler, mediaType) => {
		const layer = createTestLayer('layer');
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		line.layerId = layer.id;
		resetState([layer], [line]);
		await exportHandler();
		const blob = vi.mocked(saveAs).mock.lastCall?.[0] as Blob;
		expect(blob.type).toBe(mediaType);
	});
});
