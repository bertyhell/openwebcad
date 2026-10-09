import type {Layer} from '../../App.types.ts';
import type {Entity, JsonEntity} from '../../entities/Entity.ts';

export interface JsonDrawingFileOpenWebCadSerialized {
	entities: JsonEntity[];
	layers: Layer[];
}

export type SegmentRawJson = {
	ps: {
		x: number;
		y: number;
		name: 'point';
	};
	pe: {
		x: number;
		y: number;
		name: 'point';
	};
	name: 'segment';
};

export type ArcRawJson = {
	pc: {
		x: number;
		y: number;
		name: 'point';
	};
	r: number;
	startAngle: number;
	endAngle: number;
	counterClockwise: boolean;
	name: 'arc';
};

export type JsonDrawingFileFlattenRawSerialized = (SegmentRawJson | ArcRawJson)[];

export type JsonDrawingFileSerialized =
	| JsonDrawingFileOpenWebCadSerialized
	| JsonDrawingFileFlattenRawSerialized;

export interface JsonDrawingFileDeserialized {
	entities: Entity[];
	layers: Layer[];
}
