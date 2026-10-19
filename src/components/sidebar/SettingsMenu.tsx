import { type FC, useEffect, useState } from 'react';
import {
	getDefaultSettingValue,
	getSettingValue,
	resetAllSettings,
	SETTING_DEFINITIONS,
	SETTINGS_CHANGE_EVENT,
	type SettingDefinition,
	type SettingValue,
	setSetting,
	setTheme,
	THEME,
	type Theme,
} from '../../App.consts.ts';
import { PathIcon } from '../PathIcon.tsx';
import { toFullHexColor } from './color.helpers.ts';
import { PopoverLabel } from './SectionHeader.tsx';
import { ICON_PATHS } from './sidebar.consts.ts';

const INPUT_CLASSES =
	'w-20 h-7 px-1.5 bg-hw-night border border-hw-line rounded-[2px] text-hw-paper text-xs';

/**
 * Rerender when any setting changes
 */
function useSettingsVersion(): number {
	const [version, setVersion] = useState(0);
	useEffect(() => {
		const handleChange = () => setVersion((oldVersion) => oldVersion + 1);
		window.addEventListener(SETTINGS_CHANGE_EVENT, handleChange);
		return () => window.removeEventListener(SETTINGS_CHANGE_EVENT, handleChange);
	}, []);
	return version;
}

/**
 * Percentages are stored as a fraction, eg: 0.35 is shown as 35
 */
function getDisplayFactor(definition: SettingDefinition): number {
	return definition.unit === '%' ? 100 : 1;
}

function formatValue(value: SettingValue, displayFactor = 1): string {
	if (Array.isArray(value)) return value.join(', ');
	if (typeof value === 'number') return String(Math.round(value * displayFactor * 1e6) / 1e6);
	return value;
}

const SettingInput: FC<{ definition: SettingDefinition }> = ({ definition }) => {
	const value = getSettingValue(definition.key);

	if (definition.type === 'color') {
		return (
			<input
				type="color"
				value={toFullHexColor(value as string)}
				onChange={(evt) => setSetting(definition.key, evt.target.value)}
				className="w-20 h-7 p-0 bg-transparent border border-hw-line cursor-pointer"
				id={`setting-${definition.key}`}
				data-id={`setting-${definition.key}`}
			/>
		);
	}

	if (definition.type === 'dash') {
		return (
			<input
				type="text"
				// Remount when the value changes from elsewhere, eg: reset
				key={formatValue(value)}
				defaultValue={formatValue(value)}
				onBlur={(evt) => {
					const dash = evt.target.value
						.split(',')
						.map((part) => Number(part.trim()))
						.filter((part) => Number.isFinite(part) && part >= 0);
					setSetting(definition.key, dash);
				}}
				className={INPUT_CLASSES}
				id={`setting-${definition.key}`}
				data-id={`setting-${definition.key}`}
			/>
		);
	}

	const displayFactor = getDisplayFactor(definition);
	return (
		<input
			type="number"
			key={formatValue(value)}
			defaultValue={formatValue(value, displayFactor)}
			onBlur={(evt) => {
				const newValue = Number(evt.target.value);
				if (evt.target.value !== '' && Number.isFinite(newValue)) {
					setSetting(definition.key, newValue / displayFactor);
				}
			}}
			className={INPUT_CLASSES}
			id={`setting-${definition.key}`}
			data-id={`setting-${definition.key}`}
		/>
	);
};

const THEMES: { theme: Theme; label: string }[] = [
	{ theme: 'dark', label: 'Dark' },
	{ theme: 'light', label: 'Light' },
];

/**
 * Lets the user change the theme and all the settings from App.consts.ts
 */
export const SettingsMenu: FC<{ onBack: () => void }> = ({ onBack }) => {
	useSettingsVersion();

	return (
		<div className="flex flex-col gap-1">
			<button
				type="button"
				onClick={onBack}
				className="self-start flex items-center gap-1.5 h-7 px-2 bg-transparent border-0 text-hw-stone-300 font-semibold text-xs cursor-pointer hover:text-hw-paper"
				data-id="settings-back-button"
			>
				<PathIcon path={ICON_PATHS.arrowLeft} size={14} />
				Back
			</button>
			<PopoverLabel label="Theme" className="mx-2 mb-1" />
			<div className="grid grid-cols-2 gap-1 px-1">
				{THEMES.map(({ theme, label }) => (
					<button
						key={theme}
						type="button"
						aria-pressed={THEME === theme}
						onClick={() => setTheme(theme)}
						className={`h-8 border rounded-[2px] font-semibold text-xs cursor-pointer ${
							THEME === theme
								? 'bg-hw-ash border-hw-stone-500 text-hw-paper'
								: 'bg-hw-night border-hw-line text-hw-stone-300'
						}`}
						data-id={`theme-${theme}-button`}
					>
						{label}
					</button>
				))}
			</div>
			<div className="flex items-center justify-between mt-2.5 mx-2 mb-1">
				<PopoverLabel label="Settings" className="mb-0" />
				<button
					type="button"
					onClick={resetAllSettings}
					className="h-6 px-1.5 bg-transparent border-0 text-hw-stone-300 font-semibold text-[11px] cursor-pointer hover:text-hw-paper"
					data-id="settings-reset-all-button"
				>
					↺ Reset all
				</button>
			</div>
			{SETTING_DEFINITIONS.map((definition) => (
				<div key={definition.key} className="flex items-center gap-1.5 px-2 min-h-8">
					<label
						htmlFor={`setting-${definition.key}`}
						className="flex-1 text-xs leading-[1.3] text-hw-stone-100"
						title={`Default: ${formatValue(getDefaultSettingValue(definition.key), getDisplayFactor(definition))}${definition.unit ? ` ${definition.unit}` : ''}`}
					>
						{definition.label}
					</label>
					<SettingInput definition={definition} />
					<span className="w-8 text-[11px] text-hw-stone-500">{definition.unit}</span>
				</div>
			))}
		</div>
	);
};
