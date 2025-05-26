import fs from 'fs';
import path from 'path';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { getEntities, setEntities, getActiveLayerId, getActiveLineColor, getActiveLineWidth, setActiveLayerId, setActiveLineColor, setActiveLineWidth } from '../../state';
import { EntityType, type LineEntity, type CircleEntity } from '../../App.types';
import { importEntitiesFromDxfFile } from './import-entities-from-dxf';

// Mock react-toastify
jest.mock('react-toastify', () => ({
	toast: {
		success: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		info: jest.fn(),
	},
}));

// Mock uuid to return predictable IDs
let mockUuidCounter = 0;
jest.mock('uuid', () => ({
	v4: jest.fn(() => `mock-uuid-${mockUuidCounter++}`),
}));


describe('importEntitiesFromDxfFile', () => {
	const mockFilesBasePath = path.join(__dirname, '../../../../test/mocks/dxf');
	let consoleLogSpy: jest.SpyInstance;
	let consoleWarnSpy: jest.SpyInstance;
	let consoleErrorSpy: jest.SpyInstance;

	const defaultLayerId = 'layer-dxf-default';
	const defaultColor = '#FF00FF';
	const defaultWidth = 3;

	beforeEach(() => {
		setEntities([]);
		mockUuidCounter = 0;
		(toast.success as jest.Mock).mockClear();
		(toast.warn as jest.Mock).mockClear();
		(toast.error as jest.Mock).mockClear();
		(toast.info as jest.Mock).mockClear();
		(uuidv4 as jest.Mock).mockClear(); // Clear mock usage counts

		// Set default active states for predictability in tests
		setActiveLayerId(defaultLayerId);
		setActiveLineColor(defaultColor);
		setActiveLineWidth(defaultWidth);

		// Spy on console methods
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress log output during tests
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		// Restore console spies
		consoleLogSpy.mockRestore();
		consoleWarnSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	const loadMockDxfFile = (fileName: string): File => {
		const filePath = path.join(mockFilesBasePath, fileName);
		const fileContent = fs.readFileSync(filePath, 'utf-8');
		return new File([fileContent], fileName, { type: 'application/dxf' });
	};

	it('should warn if no file is provided', async () => {
		await importEntitiesFromDxfFile(undefined);
		expect(getEntities()).toHaveLength(0);
		expect(toast.warn).toHaveBeenCalledWith('No DXF file selected.');
		expect(toast.success).not.toHaveBeenCalled();
	});

	it('should import a single LINE entity from line.dxf', async () => {
		const file = loadMockDxfFile('line.dxf');
		await importEntitiesFromDxfFile(file);

		const entities = getEntities();
		expect(entities).toHaveLength(1);
		expect(toast.success).toHaveBeenCalledWith('1 entities imported successfully from DXF!');

		const line = entities[0] as LineEntity;
		expect(line.type).toBe(EntityType.LINE);
		expect(line.id).toBe('mock-uuid-0');
		expect(line.layerId).toBe(defaultLayerId);
		expect(line.start).toEqual({ x: 10.0, y: 10.0 });
		expect(line.end).toEqual({ x: 20.0, y: 20.0 });
		expect(line.color).toBe(defaultColor); // DXF color 256 (ByLayer) should use default
		expect(line.width).toBe(defaultWidth);
	});

	it('should import a single CIRCLE entity from circle.dxf', async () => {
		const file = loadMockDxfFile('circle.dxf');
		await importEntitiesFromDxfFile(file);

		const entities = getEntities();
		expect(entities).toHaveLength(1);
		expect(toast.success).toHaveBeenCalledWith('1 entities imported successfully from DXF!');

		const circle = entities[0] as CircleEntity;
		expect(circle.type).toBe(EntityType.CIRCLE);
		expect(circle.id).toBe('mock-uuid-0');
		expect(circle.layerId).toBe(defaultLayerId);
		expect(circle.center).toEqual({ x: 30.0, y: 30.0 });
		expect(circle.radius).toBe(5.0);
		expect(circle.color).toBe(defaultColor);
		expect(circle.width).toBe(defaultWidth);
	});

	it('should import one LINE and one CIRCLE entity from line-and-circle.dxf', async () => {
		const file = loadMockDxfFile('line-and-circle.dxf');
		await importEntitiesFromDxfFile(file);

		const entities = getEntities();
		expect(entities).toHaveLength(2);
		expect(toast.success).toHaveBeenCalledWith('2 entities imported successfully from DXF!');

		const line = entities.find(e => e.type === EntityType.LINE) as LineEntity;
		expect(line).toBeDefined();
		expect(line.id).toBe('mock-uuid-0'); // First entity parsed
		expect(line.layerId).toBe(defaultLayerId);
		expect(line.start).toEqual({ x: 10.0, y: 10.0 });
		expect(line.end).toEqual({ x: 20.0, y: 20.0 });

		const circle = entities.find(e => e.type === EntityType.CIRCLE) as CircleEntity;
		expect(circle).toBeDefined();
		expect(circle.id).toBe('mock-uuid-1'); // Second entity parsed
		expect(circle.layerId).toBe(defaultLayerId);
		expect(circle.center).toEqual({ x: 30.0, y: 30.0 });
		expect(circle.radius).toBe(5.0);
	});

	it('should import no entities from empty.dxf and show info toast', async () => {
		const file = loadMockDxfFile('empty.dxf');
		await importEntitiesFromDxfFile(file);

		const entities = getEntities();
		expect(entities).toHaveLength(0);
		expect(toast.info).toHaveBeenCalledWith('No supported entities found in the DXF file.');
		expect(toast.success).not.toHaveBeenCalled();
	});

	it('should log a message for unsupported entities in unsupported.dxf', async () => {
		const file = loadMockDxfFile('unsupported.dxf');
		await importEntitiesFromDxfFile(file);

		const entities = getEntities();
		expect(entities).toHaveLength(0); // ARC is not supported
		expect(toast.info).toHaveBeenCalledWith('No supported entities found in the DXF file.');
		// Check console.log because that's what the implementation uses for unsupported types
		expect(consoleLogSpy).toHaveBeenCalledWith('Unsupported DXF entity type: ARC. Skipping.');
	});

	it('should handle invalid DXF content and show error toast', async () => {
		const invalidFileContent = "this is not a dxf file";
		const file = new File([invalidFileContent], 'invalid.dxf', { type: 'application/dxf' });
		await importEntitiesFromDxfFile(file);

		const entities = getEntities();
		expect(entities).toHaveLength(0);
		expect(toast.error).toHaveBeenCalledWith('An error occurred while parsing the DXF file. See console for details.');
		expect(consoleErrorSpy).toHaveBeenCalled(); // Check if console.error was called for the parsing error
	});

	// TODO: Add a test case for DXF files with specific color numbers to check color mapping,
	// once the color mapping logic is more sophisticated than just defaultColor.
	// For example, a LINE with color index 1 (red) should be mapped to '#FF0000'.
});
