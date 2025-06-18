import {EntityName} from '../entities/Entity.ts';
import type {JsonDrawingFileSerialized} from './import-export-handlers/export-entities-to-json.ts';

export const arcAndLineEntitiesMock: JsonDrawingFileSerialized = {
	entities: [
		{
			id: 'ef6a4059-b477-4f53-af00-42241efae328',
			type: EntityName.Line,
			lineColor: '#fff',
			lineWidth: 1,
			layerId: 'e9d841dd-7ee4-4bd8-8cfd-b8381c73fd50',
			shapeData: {
				startPoint: {
					x: 276.92367603039963,
					y: 1172.4901562767805,
				},
				endPoint: {
					x: 524.8487532291128,
					y: 1172.4901562767805,
				},
			},
		},
		{
			id: '8656dec4-00ae-4042-ba67-1f7d0056079b',
			type: EntityName.Arc,
			lineColor: '#fff',
			lineWidth: 1,
			layerId: 'e9d841dd-7ee4-4bd8-8cfd-b8381c73fd50',
			shapeData: {
				center: {
					x: 524.8487532291128,
					y: 1015.5664802463798,
				},
				radius: 156.92367603040066,
				startAngle: 0,
				// endAngle: (2 * Math.PI * 3) / 4,
				endAngle: 1.5707963267948966,
				counterClockwise: true,
			},
		},
	],
	layers: [
		{
			id: 'e9d841dd-7ee4-4bd8-8cfd-b8381c73fd50',
			isLocked: false,
			isVisible: true,
			name: 'Default',
		},
	],
};
