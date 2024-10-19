import { CSSProperties, FC, ReactNode } from 'react';
import { Icon, IconName } from './Icon/Icon.tsx';

interface ButtonProps {
  label?: string;
  title?: string;
  icon?: IconName;
  active?: boolean;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  iconClassname?: string;
  style?: CSSProperties;
}

export const Button: FC<ButtonProps> = ({
  label,
  title,
  icon,
  onClick,
  active = false,
  children,
  className,
  iconClassname,
  style,
}) => {
  return (
    <>
      <button
        className={
          'bg-gray-950 text-blue-700 font-semibold py-2 px-2 border border-blue-500 rounded w-10 h-10 flex flex-row justify-center items-center hover:bg-blue-500 hover:text-white hover:border-transparent  data-[active=true]:bg-blue-500 data-[active=true]:text-white data-[active=true]:border-transparent' +
          (className ? ' ' + className : '')
        }
        style={style}
        data-active={active}
        onClick={onClick}
        title={title}
      >
        {icon && <Icon name={icon} className={iconClassname} />}
        {label && <span>{label}</span>}
        {children}
      </button>
    </>
  );
};
