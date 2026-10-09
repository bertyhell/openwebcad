import { TOOL_SHORTCUTS, Tool } from '../tools.ts';

const NUMBER = '-?[0-9]+(?:[.][0-9]+)?';
const NUMBER_REGEXP = new RegExp(`^${NUMBER}$`);
const ABSOLUTE_POINT_REGEXP = new RegExp(`^(${NUMBER})\\s*,\\s*(${NUMBER})$`);
const RELATIVE_POINT_REGEXP = new RegExp(`^@(${NUMBER})\\s*,\\s*(${NUMBER})$`);

export type ParsedCommand =
	| { type: 'tool'; tool: Tool }
	| { type: 'number'; value: number }
	| { type: 'absolutePoint'; x: number; y: number }
	| { type: 'relativePoint'; x: number; y: number }
	| { type: 'text'; value: string };

/**
 * Tools whose name starts with the typed text. eg: C => CIRCLE, COPY
 * Shortcuts take precedence over tools that start with that text. eg: D => COPY
 */
export function getToolNamesFromPrefixText(text: string): Tool[] {
	if (text === '') {
		return [];
	}
	const upperCaseText = text.toUpperCase();
	const toolNames = Object.values(Tool).filter((toolName) => toolName.startsWith(upperCaseText));

	const shortcutTool = (Object.keys(TOOL_SHORTCUTS) as Tool[]).find(
		(tool) => TOOL_SHORTCUTS[tool] === upperCaseText
	);
	if (!shortcutTool) {
		return toolNames;
	}
	return [shortcutTool, ...toolNames.filter((toolName) => toolName !== shortcutTool)];
}

/**
 * Interprets the text typed into the input field next to the cursor
 * - a tool name or shortcut. eg: L or LINE
 * - a number. eg: 100 or -2.5
 * - an absolute point. eg: 10,20
 * - a relative point. eg: @10,-20
 * - anything else is passed to the active tool as text
 */
export function parseCommandInput(text: string): ParsedCommand {
	const trimmedText = text.trim();

	const tool = getToolNamesFromPrefixText(trimmedText)[0];
	if (tool) {
		return { type: 'tool', tool };
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
