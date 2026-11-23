import { COMMAND_ACTION_ALIASES, CommandAction } from '../commands.ts';
import { TOOL_ALIASES, Tool } from '../tools.ts';

/**
 * A number with an optional sign, decimals and exponent. eg: 5, -2.5, .5, 5., +5, 1e3
 */
const NUMBER = '[+-]?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+)(?:[eE][+-]?[0-9]+)?';
const NUMBER_REGEXP = new RegExp(`^${NUMBER}$`);
const ABSOLUTE_POINT_REGEXP = new RegExp(`^(${NUMBER})\\s*,\\s*(${NUMBER})$`);
const RELATIVE_POINT_REGEXP = new RegExp(`^@\\s*(${NUMBER})\\s*,\\s*(${NUMBER})$`);
const ABSOLUTE_POLAR_POINT_REGEXP = new RegExp(`^(${NUMBER})\\s*<\\s*(${NUMBER})$`);
const RELATIVE_POLAR_POINT_REGEXP = new RegExp(`^@\\s*(${NUMBER})\\s*<\\s*(${NUMBER})$`);

export type ParsedCommand =
	| { type: 'tool'; tool: Tool }
	| { type: 'action'; action: CommandAction }
	| { type: 'number'; value: number }
	| { type: 'absolutePoint'; x: number; y: number }
	| { type: 'relativePoint'; x: number; y: number }
	| { type: 'text'; value: string };

export type CommandName = Tool | CommandAction;

const COMMAND_NAMES: CommandName[] = [...Object.values(Tool), ...Object.values(CommandAction)];

const COMMAND_ALIASES: Partial<Record<CommandName, string[]>> = {
	...TOOL_ALIASES,
	...COMMAND_ACTION_ALIASES,
};

/**
 * The command with exactly this alias or name, an alias wins over a name. eg: FILL => HATCH, not FILLET
 * A partial name doesn't run a command, so a typo can't start a random tool
 */
export function getExactCommandName(text: string): CommandName | null {
	const upperCaseText = text.trim().toUpperCase();
	if (upperCaseText === '') {
		return null;
	}
	return (
		COMMAND_NAMES.find((commandName) => COMMAND_ALIASES[commandName]?.includes(upperCaseText)) ??
		COMMAND_NAMES.find((commandName) => commandName === upperCaseText) ??
		null
	);
}

/**
 * Commands that match the typed text, best match first. eg: C => CIRCLE, COPY, COLOR
 * This list is only a suggestion next to the cursor, ENTER only runs an exact match
 * 1. a command with that exact alias. eg: CO => COPY
 * 2. a command with that exact name. eg: ALIGN => ALIGN, not ALIGN_LEFT
 * 3. commands whose name starts with the typed text
 */
export function getCommandNamesFromPrefixText(text: string): CommandName[] {
	if (text === '') {
		return [];
	}
	const upperCaseText = text.toUpperCase();
	const aliasCommand = COMMAND_NAMES.find((commandName) =>
		COMMAND_ALIASES[commandName]?.includes(upperCaseText)
	);
	const exactCommand = COMMAND_NAMES.find((commandName) => commandName === upperCaseText);
	const prefixCommands = COMMAND_NAMES.filter((commandName) =>
		commandName.startsWith(upperCaseText)
	);
	const commandNames = [aliasCommand, exactCommand, ...prefixCommands].filter(
		(commandName): commandName is CommandName => !!commandName
	);
	return [...new Set(commandNames)];
}

function isTool(commandName: CommandName): commandName is Tool {
	return (Object.values(Tool) as string[]).includes(commandName);
}

/**
 * Converts a distance and an angle into x and y offsets
 * The angle is in degrees, counterclockwise from the positive x axis
 */
function polarToCartesian(distance: number, angleInDegrees: number): { x: number; y: number } {
	const angle = (angleInDegrees * Math.PI) / 180;
	// Cosine and sine are never exactly 0 at multiples of 90 degrees, so remove that floating point noise
	const removeNoise = (value: number) => (Math.abs(value) < Math.abs(distance) * 1e-12 ? 0 : value);
	return {
		x: removeNoise(distance * Math.cos(angle)),
		y: removeNoise(distance * Math.sin(angle)),
	};
}

/**
 * Interprets the text typed into the input field next to the cursor
 * - a tool or command name or alias. eg: L or LINE
 * - a number. eg: 100, -2.5, .5 or 1e3
 * - an absolute point. eg: 10,20
 * - a relative point. eg: @10,-20
 * - an absolute polar point, a distance and an angle from the origin. eg: 100<45
 * - a relative polar point, a distance and an angle from the last point. eg: @100<45
 * - anything else is passed to the active tool as text
 */
export function parseCommandInput(text: string): ParsedCommand {
	const trimmedText = text.trim();

	const commandName = getExactCommandName(trimmedText);
	if (commandName) {
		return isTool(commandName)
			? { type: 'tool', tool: commandName }
			: { type: 'action', action: commandName };
	}

	if (NUMBER_REGEXP.test(trimmedText)) {
		return { type: 'number', value: Number(trimmedText) };
	}

	const absoluteMatch = ABSOLUTE_POINT_REGEXP.exec(trimmedText);
	if (absoluteMatch) {
		return {
			type: 'absolutePoint',
			x: Number(absoluteMatch[1]),
			y: Number(absoluteMatch[2]),
		};
	}

	const relativeMatch = RELATIVE_POINT_REGEXP.exec(trimmedText);
	if (relativeMatch) {
		return {
			type: 'relativePoint',
			x: Number(relativeMatch[1]),
			y: Number(relativeMatch[2]),
		};
	}

	const absolutePolarMatch = ABSOLUTE_POLAR_POINT_REGEXP.exec(trimmedText);
	if (absolutePolarMatch) {
		return {
			type: 'absolutePoint',
			...polarToCartesian(Number(absolutePolarMatch[1]), Number(absolutePolarMatch[2])),
		};
	}

	const relativePolarMatch = RELATIVE_POLAR_POINT_REGEXP.exec(trimmedText);
	if (relativePolarMatch) {
		return {
			type: 'relativePoint',
			...polarToCartesian(Number(relativePolarMatch[1]), Number(relativePolarMatch[2])),
		};
	}

	return { type: 'text', value: trimmedText };
}
