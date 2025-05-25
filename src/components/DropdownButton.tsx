import type {CSSProperties, FC, ReactNode} from 'react';
import useLocalStorageState from 'use-local-storage-state';
import {LOCAL_STORAGE_KEY} from '../App.types.ts';
import {keyboardHandler} from '../helpers/keyboard-handler.ts';
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
	isCollapsed?: boolean;
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
	isCollapsed = false,
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
				iconComponent={iconComponent || <Icon name={iconName || IconName.QuestionSmall} />}
				label={!isCollapsed ? label : undefined}
				title={title}
				active={!isCollapsed && isOpen}
				onClick={() => {
					if (!isCollapsed) {
						setIsOpen(!isOpen);
					} else {
						setIsOpen(false); // Ensure it's closed when collapsed
					}
				}}
				style={buttonStyle}
				className={'w-full data-[active=true]:bg-blue-950 data-[active=true]:text-white'}
				isCollapsed={isCollapsed} // Pass down for Button's own label handling
			/>
			{!isCollapsed && (
				<Icon name={IconName.SolidDownSmall} className={'absolute top-2.5 right-1 text-blue-700'} />
			)}
			{!isCollapsed && isOpen && (
				<div
					className="flex flex-row flex-wrap max-w-72 gap-1 pl-1 pb-6"
					onClick={() => {
						if (!isCollapsed) setIsOpen(false);
					}}
					onKeyUp={keyboardHandler(() => {
						if (!isCollapsed) setIsOpen(false);
					})}
				>
					{!isCollapsed && children}
				</div>
			)}
		</div>
	);
};
