import { toast } from 'react-toastify';
import { HtmlEvent } from './App.types.ts';
import { CommandAction } from './commands.ts';
import type { PopoverId } from './components/sidebar/SidebarPopovers.tsx';
import { exportEntitiesToPdfFile } from './helpers/import-export-handlers/pdf.export.ts';
import { getGridSettings, setGhostHelperEntities, setGridSettings } from './state.ts';

function openPopover(popoverId: PopoverId): void {
	window.dispatchEvent(new CustomEvent<PopoverId>(HtmlEvent.OPEN_POPOVER, { detail: popoverId }));
}

export const COMMAND_ACTIONS: Record<CommandAction, () => void> = {
	[CommandAction.REDRAW]: () => {
		// Remove leftover previews, the canvas is redrawn every frame
		setGhostHelperEntities([]);
	},
	[CommandAction.SNAP]: () => {
		const isSnapEnabled = !getGridSettings().isSnapEnabled;
		setGridSettings({ ...getGridSettings(), isSnapEnabled });
		toast.info(`Grid snap ${isSnapEnabled ? 'on' : 'off'}`);
	},
	[CommandAction.COLOR]: () => openPopover('color'),
	[CommandAction.EXPORT]: () => openPopover('file'),
	[CommandAction.EXPORTPDF]: () => {
		exportEntitiesToPdfFile().catch((err) => {
			console.error(err);
			toast.error('Failed to export the drawing as pdf');
		});
	},
};
