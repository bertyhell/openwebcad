import type { CSSProperties, FC } from 'react';

interface PathIconProps {
	/**
	 * Svg path in a 24x24 viewBox
	 */
	path: string;
	size?: number;
	strokeWidth?: number;
	color?: string;
	className?: string;
	style?: CSSProperties;
}

/**
 * Line icon drawn with square stroke caps, matching the technical drawing look of the app
 */
export const PathIcon: FC<PathIconProps> = ({
	path,
	size = 20,
	strokeWidth = 1.5,
	color = 'currentColor',
	className,
	style,
}) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke={color}
		strokeWidth={strokeWidth}
		strokeLinecap="square"
		className={`flex-none ${className ?? ''}`}
		style={style}
		aria-hidden="true"
	>
		<path d={path} />
	</svg>
);
