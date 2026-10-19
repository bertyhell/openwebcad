/**
 * Commands that run immediately instead of activating a tool
 */
export enum CommandAction {
	REDRAW = 'REDRAW',
	SNAP = 'SNAP',
	COLOR = 'COLOR',
	EXPORT = 'EXPORT',
	EXPORTPDF = 'EXPORTPDF',
}

/**
 * Command aliases: type one of them and press ENTER to run the command
 */
export const COMMAND_ACTION_ALIASES: Partial<Record<CommandAction, string[]>> = {
	[CommandAction.REDRAW]: ['R', 'RA'],
	[CommandAction.SNAP]: ['SN'],
	[CommandAction.COLOR]: ['COL', 'COLOUR'],
	[CommandAction.EXPORT]: ['EXP'],
};
