import { useEffect, useState } from 'react';
import { type GridSettings, HtmlEvent, type Layer } from '../../App.types.ts';
import type { Entity } from '../../entities/Entity.ts';
import {
	getActiveFillColor,
	getActiveLayerId,
	getActiveLineColor,
	getActiveLineWidth,
	getActiveToolActor,
	getAngleStep,
	getGridSettings,
	getLastStateInstructions,
	getLayers,
	getScreenCanvasDrawController,
	getSelectedEntities,
	getSelectedEntityIds,
} from '../../state.ts';
import type { Tool } from '../../tools.ts';

export interface AppState {
	activeTool: Tool | undefined;
	instructions: string | null;
	angleStep: number;
	lineColor: string;
	fillColor: string;
	lineWidth: number;
	screenZoom: number;
	layers: Layer[];
	activeLayerId: string;
	selectedCount: number;
	selectedEntities: Entity[];
	gridSettings: GridSettings;
}

function getScreenZoom(): number {
	try {
		return getScreenCanvasDrawController().getScreenScale();
	} catch {
		return 1; // The draw controller is created after the first react render
	}
}

function readAppState(): AppState {
	return {
		activeTool: getActiveToolActor()?.getSnapshot()?.context.type,
		instructions: getLastStateInstructions(),
		angleStep: getAngleStep(),
		lineColor: getActiveLineColor(),
		fillColor: getActiveFillColor(),
		lineWidth: getActiveLineWidth(),
		screenZoom: getScreenZoom(),
		layers: getLayers(),
		activeLayerId: getActiveLayerId(),
		selectedCount: getSelectedEntityIds().length,
		selectedEntities: getSelectedEntities(),
		gridSettings: getGridSettings(),
	};
}

/**
 * Mirrors the global app state into react and re-renders whenever the app signals a change
 */
export function useAppState(): AppState {
	const [appState, setAppState] = useState<AppState>(readAppState);

	useEffect(() => {
		const handleUpdate = () => setAppState(readAppState());
		window.addEventListener(HtmlEvent.UPDATE_STATE, handleUpdate);
		handleUpdate();
		return () => window.removeEventListener(HtmlEvent.UPDATE_STATE, handleUpdate);
	}, []);

	return appState;
}
