import { COMMAND_ACTION_ALIASES, CommandAction } from '../commands.ts';
import { TOOL_ALIASES, Tool } from '../tools.ts';

const NUMBER = '-?[0-9]+(?:[.][0-9]+)?';
const NUMBER_REGEXP = new RegExp(`^${NUMBER}$`);
const ABSOLUTE_POINT_REGEXP = new RegExp(`^(${NUMBER})\\s*,\\s*(${NUMBER})$`);
const RELATIVE_POINT_REGEXP = new RegExp(`^@(${NUMBER})\\s*,\\s*(${NUMBER})$`);

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
 * Commands that match the typed text, best match first. eg: C => CIRCLE, COPY, COLOR
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
 * Interprets the text typed into the input field next to the cursor
 * - a tool or command name or alias. eg: L or LINE
 * - a number. eg: 100 or -2.5
 * - an absolute point. eg: 10,20
 * - a relative point. eg: @10,-20
 * - anything else is passed to the active tool as text
 */
export function parseCommandInput(text: string): ParsedCommand {
	const trimmedText = text.trim();

	const commandName = getCommandNamesFromPrefixText(trimmedText)[0];
	if (commandName) {
		return isTool(commandName)
			? { type: 'tool', tool: commandName }
			: { type: 'action', action: commandName };
	}

	if (NUMBER_REGEXP.test(trimmedText)) {
		return { type: 'number', value: Number.parseFloat(trimmedText) };
	}

	const absoluteMatch = ABSOLUTE_POINT_REGEXP.exec(trimmedText);
	if (absoluteMatch) {
		return {
			type: 'absolutePoint',
			x: Number.parseFloat(absoluteMatch[1]),
			y: Number.parseFloat(absoluteMatch[2]),
		};
	}

	const relativeMatch = RELATIVE_POINT_REGEXP.exec(trimmedText);
	if (relativeMatch) {
		return {
			type: 'relativePoint',
			x: Number.parseFloat(relativeMatch[1]),
			y: Number.parseFloat(relativeMatch[2]),
		};
	}

	return { type: 'text', value: trimmedText };
}
