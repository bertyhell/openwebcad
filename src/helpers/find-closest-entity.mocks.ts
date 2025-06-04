import type {JsonDrawingFileSerialized} from "./import-export-handlers/export-entities-to-json.ts";
import {EntityName} from "../entities/Entity.ts";

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
			id: '3239deab-8508-472d-ae3e-5844c965a741',
			type: EntityName.Line,
			lineColor: '#fff',
			lineWidth: 1,
			layerId: 'e9d841dd-7ee4-4bd8-8cfd-b8381c73fd50',
			shapeData: {
				startPoint: {
					x: 681.7724292595135,
					y: 1015.5664802463798,
				},
				endPoint: {
					x: 681.7724292595135,
					y: 695.9867564584438,
				},
			},
		},
		{
			id: '7e58d805-ff2d-4cff-9e55-2fa1a27e5d23',
			type: EntityName.Line,
			lineColor: '#fff',
			lineWidth: 1,
			layerId: 'e9d841dd-7ee4-4bd8-8cfd-b8381c73fd50',
			shapeData: {
				startPoint: {
					x: 681.7724292595135,
					y: 695.9867564584438,
				},
				endPoint: {
					x: 524.8487532291128,
					y: 858.6428042159791,
				},
			},
		},
		{
			id: 'de896389-798d-4121-9f16-07e16e49414b',
			type: EntityName.Line,
			lineColor: '#fff',
			lineWidth: 1,
			layerId: 'e9d841dd-7ee4-4bd8-8cfd-b8381c73fd50',
			shapeData: {
				startPoint: {
					x: 367.9250771986994,
					y: 1015.566480246392,
				},
				endPoint: {
					x: 208.13521530474463,
					y: 1015.566480246392,
				},
			},
		},
		{
			id: 'f3ab4ada-18e3-4be4-973b-43596e3a719b',
			type: EntityName.Line,
			lineColor: '#fff',
			lineWidth: 1,
			layerId: 'e9d841dd-7ee4-4bd8-8cfd-b8381c73fd50',
			shapeData: {
				startPoint: {
					x: 208.13521530474463,
					y: 1015.566480246392,
				},
				endPoint: {
					x: 276.92367603039963,
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
