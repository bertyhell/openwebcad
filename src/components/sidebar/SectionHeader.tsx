import type { FC } from 'react';
import { PathIcon } from '../PathIcon.tsx';
import { ICON_PATHS } from './sidebar.consts.ts';

interface SectionHeaderProps {
	label: string;
	color: string;
	count: string | number;
	isOpen: boolean;
	onToggle: () => void;
	dataId?: string;
}

export const SectionHeader: FC<SectionHeaderProps> = ({
	label,
	color,
	count,
	isOpen,
	onToggle,
	dataId,
}) => (
	<button
		type="button"
		onClick={onToggle}
		data-id={dataId}
		aria-expanded={isOpen}
		className="flex items-center gap-2 w-full h-7 px-0.5 bg-transparent border-0 text-hw-stone-500 hover:text-hw-stone-100 cursor-pointer"
	>
		<span className="size-2 flex-none" style={{ background: color }} />
		<span className="flex-1 text-left font-bold text-[11px] leading-none tracking-[0.16em] uppercase">
			{label}
		</span>
		<span className="font-semibold text-[11px] leading-none text-hw-stone-700">{count}</span>
		<PathIcon
			path={ICON_PATHS.chevronDown}
			size={14}
			strokeWidth={2}
			className="transition-transform duration-150"
			style={{ transform: isOpen ? 'none' : 'rotate(-90deg)' }}
		/>
	</button>
);

/**
 * Small uppercase label above a group of controls inside a popover
 */
export const PopoverLabel: FC<{ label: string; className?: string }> = ({ label, className }) => (
	<div
		className={`mb-2 font-bold text-[10px] leading-none tracking-[0.16em] uppercase text-hw-stone-500 ${className ?? ''}`}
	>
		{label}
	</div>
);

/**
 * Keyboard shortcut indicator
 */
export const KeyBadge: FC<{ shortcut: string; className?: string }> = ({ shortcut, className }) => (
	<span
		className={`px-[5px] border border-hw-graphite rounded-[2px] font-semibold text-[11px] leading-[1.3] text-hw-stone-300 ${className ?? ''}`}
	>
		{shortcut}
	</span>
);
