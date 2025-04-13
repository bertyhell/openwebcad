import {noop} from 'es-toolkit';
import type {CSSProperties, FC, MouseEvent, ReactNode} from 'react';
import {Icon, type IconName} from './Icon/Icon.tsx';

interface ButtonProps {
	label?: string;
	title?: string;
	iconName?: IconName;
	iconClassname?: string;
	iconComponent?: ReactNode;
	active?: boolean;
	onClick?: (evt: MouseEvent) => void;
	children?: ReactNode;
	className?: string;
	style?: CSSProperties;
	dataId?: string;
	size?: 'small' | 'regular';
	type?: 'regular' | 'transparent';
	left?: ReactNode;
	right?: ReactNode;
}

export const Button: FC<ButtonProps> = ({
	label,
	title,
	iconName,
	iconClassname,
	iconComponent,
	onClick,
	active = false,
	children,
	className,
	style,
	dataId,
	type = 'regular',
	size = 'regular',
	left = null,
	right = null,
}) => {
	const classParts = [
		'font-semibold py-4 h-10 flex flex-row justify-start w-full items-center hover:bg-blue-500 hover:text-white hover:border-transparent',
		type === 'regular' ? 'bg-gray-950 text-blue-500' : '',
		type === 'transparent' ? 'bg-transparent text-blue-500' : '',
		active ? 'bg-blue-500 text-white border-transparent hover:bg-blue-400' : '',
		size === 'regular' ? 'pl-2 pr-2 gap-2' : '',
		size === 'small' ? 'pl-2 pr-2 gap-0' : '',
		className || '',
	];
	return (
		<>
			<button
				className={classParts.join(' ')}
				style={style}
				data-active={active}
				data-size={size}
				data-type={type}
				onClick={onClick || noop}
				onKeyUp={(evt) => {
					if (evt.key === 'Enter' || evt.key === ' ') {
						onClick?.(evt as unknown as MouseEvent);
					}
				}}
				title={title}
				data-id={dataId}
				type="button"
			>
				{iconComponent ||
					(iconName && (
						<Icon
							name={iconName}
							className={`${iconClassname} text-blue-700 ${active ? 'text-white' : ''} ${size === 'small' ? 'w-4' : 'w-5'}`}
						/>
					))}
				<div className="flex flex-row flex-nowrap">{left}</div>
				{label && <span className="text-nowrap flex-grow text-left">{label}</span>}
				{children}
				<div className="flex flex-row flex-nowrap">{right}</div>
			</button>
		</>
	);
};
