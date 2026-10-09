import type { ChangeEvent, CSSProperties, FC, MouseEvent, ReactNode } from 'react';
import { PathIcon } from '../PathIcon.tsx';
import { activateTool, startImageImport } from './sidebar.actions.ts';
import { NEUTRAL_TOOL_COLOR, TOOL_GROUPS, type ToolDefinition } from './sidebar.consts.ts';

export function getToolColor(toolDefinition: ToolDefinition): string {
	if (toolDefinition.neutral) {
		return NEUTRAL_TOOL_COLOR;
	}
	return (
		TOOL_GROUPS.find((group) => group.id === toolDefinition.group)?.color ?? NEUTRAL_TOOL_COLOR
	);
}

function getToolButtonStyle(color: string, isActive: boolean): CSSProperties {
	return {
		background: isActive
			? `color-mix(in oklch, ${color} 22%, var(--color-hw-night))`
			: 'var(--color-hw-ink)',
		borderColor: isActive ? color : 'var(--color-hw-ink)',
	};
}

interface ToolButtonShellProps {
	toolDefinition: ToolDefinition;
	className: string;
	style: CSSProperties;
	title?: string;
	onMouseEnter?: (evt: MouseEvent<HTMLElement>) => void;
	onMouseLeave?: () => void;
	children: ReactNode;
}

/**
 * Renders a button, or a label wrapping a hidden file input for tools that start from a file
 */
const ToolButtonShell: FC<ToolButtonShellProps> = ({
	toolDefinition,
	className,
	style,
	title,
	onMouseEnter,
	onMouseLeave,
	children,
}) => {
	const sharedProps = {
		className,
		style,
		title,
		onMouseEnter,
		onMouseLeave,
		'data-id': toolDefinition.dataId,
	};

	if (toolDefinition.fileAccept) {
		const handleFileChange = async (evt: ChangeEvent<HTMLInputElement>) => {
			const file = evt.target.files?.[0];
			evt.target.value = '';
			await startImageImport(file);
		};
		return (
			<label {...sharedProps}>
				{children}
				<input
					type="file"
					accept={toolDefinition.fileAccept}
					onChange={handleFileChange}
					className="hidden"
				/>
			</label>
		);
	}

	return (
		<button type="button" {...sharedProps} onClick={() => activateTool(toolDefinition.tool)}>
			{children}
		</button>
	);
};

interface ToolButtonProps {
	toolDefinition: ToolDefinition;
	isActive: boolean;
}

/**
 * Tool button with icon, label and shortcut, used in the expanded sidebar
 */
export const ToolButton: FC<ToolButtonProps> = ({ toolDefinition, isActive }) => {
	const color = getToolColor(toolDefinition);
	return (
		<ToolButtonShell
			toolDefinition={toolDefinition}
			title={toolDefinition.hint}
			className={`flex items-center gap-2 h-[38px] min-w-0 pl-2 pr-1.5 border rounded-[2px] text-left cursor-pointer hover:brightness-[1.18] ${
				isActive ? 'text-hw-paper' : 'text-hw-stone-300'
			}`}
			style={getToolButtonStyle(color, isActive)}
		>
			<PathIcon path={toolDefinition.iconPath} color={color} />
			<span className="flex-1 min-w-0 font-semibold text-[13px] leading-none whitespace-nowrap overflow-hidden text-ellipsis">
				{toolDefinition.label}
			</span>
			{toolDefinition.shortcut && (
				<span className="flex-none grid place-items-center min-w-[18px] h-[18px] px-1 border border-hw-line rounded-[2px] font-semibold text-[10px] leading-none text-hw-stone-500">
					{toolDefinition.shortcut}
				</span>
			)}
		</ToolButtonShell>
	);
};

interface RailToolButtonProps extends ToolButtonProps {
	onMouseEnter: (evt: MouseEvent<HTMLElement>) => void;
	onMouseLeave: () => void;
}

/**
 * Icon only tool button, used in the collapsed sidebar
 */
export const RailToolButton: FC<RailToolButtonProps> = ({
	toolDefinition,
	isActive,
	onMouseEnter,
	onMouseLeave,
}) => {
	const color = getToolColor(toolDefinition);
	return (
		<ToolButtonShell
			toolDefinition={toolDefinition}
			className="grid place-items-center w-10 h-9 border rounded-[2px] cursor-pointer hover:brightness-125"
			style={getToolButtonStyle(color, isActive)}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			<PathIcon path={toolDefinition.iconPath} color={color} />
		</ToolButtonShell>
	);
};
