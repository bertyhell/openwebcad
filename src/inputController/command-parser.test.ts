import { describe, expect, it } from 'vitest';
import { CommandAction } from '../commands.ts';
import { Tool } from '../tools.ts';
import { getCommandNamesFromPrefixText, parseCommandInput } from './command-parser.ts';

describe('getCommandNamesFromPrefixText', () => {
	it('returns nothing for empty text', () => {
		expect(getCommandNamesFromPrefixText('')).toEqual([]);
	});

	it('puts the alias command first', () => {
		const commandNames = getCommandNamesFromPrefixText('c');
		expect(commandNames[0]).toBe(Tool.CIRCLE);
		expect(commandNames).toContain(Tool.COPY);
		expect(commandNames).toContain(CommandAction.COLOR);
	});

	it('finds a command by an alias that is not a prefix of its name', () => {
		expect(getCommandNamesFromPrefixText('CP')[0]).toBe(Tool.COPY);
		expect(getCommandNamesFromPrefixText('rectang')[0]).toBe(Tool.RECTANGLE);
	});

	it('prefers an alias over an exact name and an exact name over a prefix', () => {
		expect(getCommandNamesFromPrefixText('FILL')[0]).toBe(Tool.HATCH);
		expect(getCommandNamesFromPrefixText('FILLET')[0]).toBe(Tool.FILLET);
		expect(getCommandNamesFromPrefixText('EXPORT')[0]).toBe(CommandAction.EXPORT);
	});

	it('lists every match only once', () => {
		const commandNames = getCommandNamesFromPrefixText('LINE');
		expect(commandNames.filter((commandName) => commandName === Tool.LINE)).toHaveLength(1);
	});
});

describe('parseCommandInput', () => {
	it('parses tool names and shortcuts', () => {
		expect(parseCommandInput('line')).toEqual({ type: 'tool', tool: Tool.LINE });
		expect(parseCommandInput('M')).toEqual({ type: 'tool', tool: Tool.MOVE });
	});

	it('parses commands that run immediately', () => {
		expect(parseCommandInput('ra')).toEqual({ type: 'action', action: CommandAction.REDRAW });
		expect(parseCommandInput('EXPORTPDF')).toEqual({
			type: 'action',
			action: CommandAction.EXPORTPDF,
		});
	});

	it('parses positive, negative and decimal numbers', () => {
		expect(parseCommandInput('100')).toEqual({ type: 'number', value: 100 });
		expect(parseCommandInput('-2.5')).toEqual({ type: 'number', value: -2.5 });
	});

	it('parses absolute points', () => {
		expect(parseCommandInput('10, -20.5')).toEqual({ type: 'absolutePoint', x: 10, y: -20.5 });
	});

	it('parses relative points', () => {
		expect(parseCommandInput('@-10,20')).toEqual({ type: 'relativePoint', x: -10, y: 20 });
	});

	it('passes other text to the tool', () => {
		expect(parseCommandInput('hello world')).toEqual({ type: 'text', value: 'hello world' });
		expect(parseCommandInput('1,2,3')).toEqual({ type: 'text', value: '1,2,3' });
	});
});
