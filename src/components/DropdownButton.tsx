import type {CSSProperties, FC, ReactNode} from 'react';
import useLocalStorageState from 'use-local-storage-state';
import {LOCAL_STORAGE_KEY} from '../helpers/import-export-handlers/export-entities-to-local-storage.ts';
import {keyboardHandler} from "../helpers/keyboard-handler.ts";
import {Button} from './Button.tsx';
import {Icon, IconName} from './Icon/Icon.tsx';

interface DropdownButtonProps {
	label?: string;
	title?: string;
	iconName?: IconName;
	iconComponent?: ReactNode;
	active?: boolean;
	onClick?: () => void;
	className?: string;
	style?: CSSProperties;
	buttonStyle?: CSSProperties;
	dataId: string;
	children?: ReactNode;
	defaultOpen?: boolean;
}

export const DropdownButton: FC<DropdownButtonProps> = ({
	label,
	title,
	iconName,
	iconComponent,
	className,
	style,
	buttonStyle,
	dataId,
	children,
	defaultOpen = false,
}) => {
	const [isOpen, setIsOpen] = useLocalStorageState<boolean>(
		`${LOCAL_STORAGE_KEY.DROPDOWN}___${dataId}`,
		{ defaultValue: defaultOpen }
	);

	const classParts = [
		'flex flex-col gap-2 relative',
		className || '',
		isOpen ? ' bg-slate-900' : '',
	];
	return (
		<div className={classParts.join(' ')} style={style} data-id={dataId}>
			<Button
				iconName={iconName}
				iconComponent={iconComponent}
				label={label}
				title={title}
				active={isOpen}
				onClick={() => setIsOpen(!isOpen)}
				style={buttonStyle}
				className={'w-full data-[active=true]:bg-blue-950 data-[active=true]:text-white'}
			/>
			<Icon name={IconName.SolidDownSmall} className={'absolute top-2.5 right-1 text-blue-700'} />
			{isOpen && (
				<div
					className="flex flex-row flex-wrap max-w-72 gap-1 pl-1 pb-6"
					onClick={() => setIsOpen(false)}
					onKeyUp={keyboardHandler(() => setIsOpen(false))}
				>
					{children}
				</div>
			)}
		</div>
	);
};
