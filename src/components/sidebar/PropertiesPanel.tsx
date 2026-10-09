import { round } from 'es-toolkit';
import { type FC, type KeyboardEvent, useEffect, useState } from 'react';
import { COLOR_LIST } from '../../App.consts.ts';
import type { Layer } from '../../App.types.ts';
import { type Entity, EntityName } from '../../entities/Entity.ts';
import type { FillEntity } from '../../entities/FillEntity.ts';
import { type EntityGeometry, getEntityGeometry, type XY } from '../../helpers/entity-geometry.ts';
import { toFullHexColor } from './color.helpers.ts';
import { PopoverLabel } from './SectionHeader.tsx';
import {
	moveSelectionToLayer,
	setSelectionFillColor,
	setSelectionGeometry,
	setSelectionLineColor,
	setSelectionLineWidth,
} from './sidebar.actions.ts';
import { LINE_WIDTHS } from './sidebar.consts.ts';

const FIELD_CLASSES =
	'w-full min-w-0 h-8 px-2 bg-hw-night border border-hw-line rounded-[2px] text-hw-paper font-semibold text-xs outline-none focus:border-hw-stone-300';

/**
 * Returns the value when all entities share it, otherwise null
 */
function getSharedValue<T>(entities: Entity[], getValue: (entity: Entity) => T): T | null {
	const firstValue = getValue(entities[0]);
	return entities.every((entity) => getValue(entity) === firstValue) ? firstValue : null;
}

function getSelectionDescription(entities: Entity[]): string {
	const countByType = new Map<string, number>();
	for (const entity of entities) {
		countByType.set(entity.getType(), (countByType.get(entity.getType()) ?? 0) + 1);
	}
	return [...countByType.entries()]
		.map(([type, count]) => (count > 1 ? `${count} × ${type}` : type))
		.join(', ');
}

interface FieldProps<T> {
	label: string;
	value: T;
	onCommit: (value: T) => void;
	dataId?: string;
}

/**
 * Text field that only changes the drawing when the user presses ENTER or leaves the field
 * ESC restores the current value
 */
function useDraftValue<T>(value: T, format: (value: T) => string) {
	const [draft, setDraft] = useState(format(value));
	useEffect(() => setDraft(format(value)), [value, format]);
	return [draft, setDraft] as const;
}

const formatNumber = (value: number) => String(round(value, 4));

const NumberField: FC<FieldProps<number>> = ({ label, value, onCommit, dataId }) => {
	const [draft, setDraft] = useDraftValue(value, formatNumber);
	const commit = () => {
		const parsedValue = Number.parseFloat(draft);
		if (Number.isFinite(parsedValue) && parsedValue !== value) {
			onCommit(parsedValue);
		} else {
			setDraft(formatNumber(value));
		}
	};
	const handleKeyDown = (evt: KeyboardEvent<HTMLInputElement>) => {
		if (evt.key === 'Enter') {
			commit();
		} else if (evt.key === 'Escape') {
			setDraft(formatNumber(value));
			evt.currentTarget.blur();
		}
	};
	return (
		<label className="flex items-center gap-1.5 min-w-0">
			<span className="flex-none w-3 font-bold text-[10px] text-hw-stone-500 uppercase">
				{label}
			</span>
			<input
				type="text"
				inputMode="decimal"
				value={draft}
				onChange={(evt) => setDraft(evt.target.value)}
				onBlur={commit}
				onKeyDown={handleKeyDown}
				className={FIELD_CLASSES}
				data-id={dataId}
			/>
		</label>
	);
};

const identity = (value: string) => value;

const TextField: FC<FieldProps<string>> = ({ label, value, onCommit, dataId }) => {
	const [draft, setDraft] = useDraftValue(value, identity);
	const commit = () => {
		if (draft.trim() && draft !== value) {
			onCommit(draft);
		} else {
			setDraft(value);
		}
	};
	return (
		<label className="flex flex-col gap-1">
			<PopoverLabel label={label} className="mb-0" />
			<input
				type="text"
				value={draft}
				onChange={(evt) => setDraft(evt.target.value)}
				onBlur={commit}
				onKeyDown={(evt) => {
					if (evt.key === 'Enter') commit();
					if (evt.key === 'Escape') setDraft(value);
				}}
				className={FIELD_CLASSES}
				data-id={dataId}
			/>
		</label>
	);
};

const PointFields: FC<{ label: string; point: XY; onCommit: (point: XY) => void; id: string }> = ({
	label,
	point,
	onCommit,
	id,
}) => (
	<div>
		<PopoverLabel label={label} className="mb-1" />
		<div className="grid grid-cols-2 gap-1.5">
			<NumberField
				label="x"
				value={point.x}
				onCommit={(x) => onCommit({ ...point, x })}
				dataId={`${id}-x`}
			/>
			<NumberField
				label="y"
				value={point.y}
				onCommit={(y) => onCommit({ ...point, y })}
				dataId={`${id}-y`}
			/>
		</div>
	</div>
);

const GeometryFields: FC<{ geometry: EntityGeometry }> = ({ geometry }) => {
	switch (geometry.type) {
		case EntityName.Line:
			return (
				<>
					<PointFields
						label="Start"
						point={geometry.start}
						onCommit={(start) => setSelectionGeometry({ ...geometry, start })}
						id="property-start"
					/>
					<PointFields
						label="End"
						point={geometry.end}
						onCommit={(end) => setSelectionGeometry({ ...geometry, end })}
						id="property-end"
					/>
				</>
			);
		case EntityName.Circle:
		case EntityName.Arc:
			return (
				<>
					<PointFields
						label="Center"
						point={geometry.center}
						onCommit={(center) => setSelectionGeometry({ ...geometry, center })}
						id="property-center"
					/>
					<NumberField
						label="r"
						value={geometry.radius}
						onCommit={(radius) => setSelectionGeometry({ ...geometry, radius })}
						dataId="property-radius"
					/>
				</>
			);
		case EntityName.Text:
			return (
				<>
					<TextField
						label="Text"
						value={geometry.label}
						onCommit={(label) => setSelectionGeometry({ ...geometry, label })}
						dataId="property-label"
					/>
					<PointFields
						label="Position"
						point={geometry.basePoint}
						onCommit={(basePoint) => setSelectionGeometry({ ...geometry, basePoint })}
						id="property-position"
					/>
					<NumberField
						label="h"
						value={geometry.height}
						onCommit={(height) => setSelectionGeometry({ ...geometry, height })}
						dataId="property-height"
					/>
				</>
			);
	}
};

const ColorSwatches: FC<{
	activeColor: string | null;
	onSelect: (color: string) => void;
	dataIdPrefix: string;
}> = ({ activeColor, onSelect, dataIdPrefix }) => (
	<div className="grid grid-cols-8 gap-1">
		{COLOR_LIST.map((color) => {
			const isActive = !!activeColor && toFullHexColor(activeColor) === color;
			return (
				<button
					key={color}
					type="button"
					title={color}
					aria-label={color}
					aria-pressed={isActive}
					onClick={() => onSelect(color)}
					className="aspect-square border-0 cursor-pointer"
					style={{
						background: color,
						outline: isActive
							? '2px solid var(--color-hw-paper)'
							: '1px solid var(--color-hw-graphite)',
						outlineOffset: 1,
					}}
					data-id={`${dataIdPrefix}-${color}-button`}
				/>
			);
		})}
	</div>
);

interface PropertiesPanelProps {
	selectedEntities: Entity[];
	layers: Layer[];
}

/**
 * Shows and edits the style, layer and geometry of the selected entities
 */
export const PropertiesPanel: FC<PropertiesPanelProps> = ({ selectedEntities, layers }) => {
	if (!selectedEntities.length) {
		return (
			<div className="mt-1 text-xs leading-[1.4] text-hw-stone-500">
				Select entities to see and change their properties
			</div>
		);
	}

	const lineColor = getSharedValue(selectedEntities, (entity) => entity.lineColor);
	const lineWidth = getSharedValue(selectedEntities, (entity) => entity.lineWidth);
	const layerId = getSharedValue(selectedEntities, (entity) => entity.layerId);
	const fills = selectedEntities.filter((entity) => entity.getType() === EntityName.Fill);
	const fillColor = fills.length
		? getSharedValue(fills, (entity) => (entity as FillEntity).fillColor)
		: null;
	const geometry = selectedEntities.length === 1 ? getEntityGeometry(selectedEntities[0]) : null;

	return (
		<div className="flex flex-col gap-3 mt-1" data-id="properties-panel">
			<div className="text-xs leading-[1.4] text-hw-stone-300">
				{getSelectionDescription(selectedEntities)}
			</div>

			<div>
				<PopoverLabel label="Line colour" className="mb-1.5" />
				<ColorSwatches
					activeColor={lineColor}
					onSelect={setSelectionLineColor}
					dataIdPrefix="property-line-color"
				/>
			</div>

			{fills.length > 0 && (
				<div>
					<PopoverLabel label="Fill colour" className="mb-1.5" />
					<ColorSwatches
						activeColor={fillColor}
						onSelect={setSelectionFillColor}
						dataIdPrefix="property-fill-color"
					/>
				</div>
			)}

			<div className="grid grid-cols-2 gap-1.5">
				<label className="flex flex-col gap-1">
					<PopoverLabel label="Width" className="mb-0" />
					<select
						value={lineWidth ?? ''}
						onChange={(evt) => setSelectionLineWidth(Number(evt.target.value))}
						className={FIELD_CLASSES}
						data-id="property-line-width"
					>
						{lineWidth === null && <option value="">Mixed</option>}
						{LINE_WIDTHS.map((width) => (
							<option key={width} value={width}>
								{width} px
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-1">
					<PopoverLabel label="Layer" className="mb-0" />
					<select
						value={layerId ?? ''}
						onChange={(evt) => moveSelectionToLayer(evt.target.value)}
						className={FIELD_CLASSES}
						data-id="property-layer"
					>
						{layerId === null && <option value="">Mixed</option>}
						{layers.map((layer) => (
							<option key={layer.id} value={layer.id} disabled={!layer.isVisible || layer.isLocked}>
								{layer.name}
							</option>
						))}
					</select>
				</label>
			</div>

			{geometry && <GeometryFields geometry={geometry} />}
		</div>
	);
};
