import { CSSProperties, FC, ReactNode, useState } from 'react';
import { Icon, IconName } from './Icon/Icon.tsx';
import { Button } from './Button.tsx';

interface DropdownButtonProps {
  label?: string;
  title?: string;
  icon?: IconName;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  buttonStyle?: CSSProperties;
  children?: ReactNode;
}

export const DropdownButton: FC<DropdownButtonProps> = ({
  label,
  title,
  icon,
  className,
  style,
  buttonStyle,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={
        'flex flex-row gap-2 relative' + (className ? ' ' + className : '')
      }
      style={style}
    >
      <Button
        icon={icon}
        label={label}
        title={title}
        data-active={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        style={buttonStyle}
      />
      <Icon
        name={IconName.SolidDownSmall}
        className={'-rotate-45 absolute -bottom-1 left-6 text-blue-700'}
      ></Icon>
      {isOpen && (
        <div className="flex flex-row gap-1" onClick={() => setIsOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
};
