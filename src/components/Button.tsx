import {CSSProperties, FC, KeyboardEvent, MouseEvent, ReactNode} from 'react';
import {Icon, IconName} from './Icon/Icon.tsx';
import {noop} from "es-toolkit";

interface ButtonProps {
	label?: string;
	title?: string;
	iconName?: IconName;
	iconClassname?: string;
	iconComponent?: ReactNode;
	active?: boolean;
	onClick?: (evt: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) => void;
	children?: ReactNode;
	className?: string;
	style?: CSSProperties;
	dataId?: string;
	size?: 'small' | 'regular';
	type?: 'regular' | 'transparent'
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
	size = 'regular'
										}) => {
	return (
		<>
			<button
				className={
					'font-semibold py-4 h-10 flex flex-row justify-start gap-2 w-full items-center hover:bg-blue-500 hover:text-white hover:border-transparent data-[size=regular]:pl-4 data-[size=regular]:pr-6 data-[size=small]:pl-2 data-[size=small]:pr-2' +
					(className ? ' ' + className : '') + ' ' +
					(type === 'regular' ? 'bg-gray-950 text-blue-500' : '') + ' ' +
					(type === 'transparent' ? 'bg-transparent text-blue-500' : '') + ' ' +
					(active ? 'bg-blue-500 text-white border-transparent hover:bg-blue-400' : '')
				}
				style={style}
				data-active={active}
				data-size={size}
				data-type={type}
				onClick={onClick || noop}
				onKeyUp={(evt) => {
					if (evt.key === 'Enter' || evt.key === ' ') {
						onClick && onClick(evt);
					}
				}}
				title={title}
				data-id={dataId}
			>
				{iconComponent || (iconName && <Icon name={iconName} className={iconClassname + ' ' + 'text-blue-700' + ' ' + (active ? 'text-white' : '')}  />)}
				{label && <span className="text-nowrap">{label}</span>}
				{children}
			</button>
		</>
	);
};
