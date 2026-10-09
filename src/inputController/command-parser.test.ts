import { describe, expect, it } from 'vitest';
import { Tool } from '../tools.ts';
import { getToolNamesFromPrefixText, parseCommandInput } from './command-parser.ts';

describe('getToolNamesFromPrefixText', () => {
	it('returns nothing for empty text', () => {
		expect(getToolNamesFromPrefixText('')).toEqual([]);
	});

	it('puts the shortcut tool first', () => {
		const tools = getToolNamesFromPrefixText('c');
		expect(tools[0]).toBe(Tool.CIRCLE);
		expect(tools).toContain(Tool.COPY);
	});

	it('finds a tool by a shortcut that is not a prefix of its name', () => {
		expect(getToolNamesFromPrefixText('D')[0]).toBe(Tool.COPY);
	});
});

describe('parseCommandInput', () => {
	it('parses tool names and shortcuts', () => {
		expect(parseCommandInput('line')).toEqual({ type: 'tool', tool: Tool.LINE });
		expect(parseCommandInput('M')).toEqual({ type: 'tool', tool: Tool.MOVE });
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
