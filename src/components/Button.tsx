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
										}) => {
	return (
		<>
			<button
				className={
					'bg-gray-950 text-blue-500 font-semibold py-2 px-2 w-100 h-10 pl-4 pr-6 flex flex-row justify-start gap-2 items-center hover:bg-blue-500 hover:text-white hover:border-transparent  data-[active=true]:bg-blue-500 data-[active=true]:text-white data-[active=true]:border-transparent' +
					(className ? ' ' + className : '')
				}
				style={style}
				data-active={active}
				onClick={onClick || noop}
				onKeyUp={(evt) => {
					if (evt.key === 'Enter' || evt.key === ' ') {
						onClick && onClick(evt);
					}
				}}
				title={title}
				data-id={dataId}
			>
				{iconComponent || (iconName && <Icon name={iconName} className={iconClassname + ' text-blue-700'}  />)}
				{label && <span>{label}</span>}
				{children}
			</button>
		</>
	);
};
