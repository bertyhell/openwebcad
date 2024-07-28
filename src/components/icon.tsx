import LineIcon from 'teenyicons/outline/line.svg?react';
import SquareIcon from 'teenyicons/outline/square.svg?react';
import CircleIcon from 'teenyicons/outline/circle.svg?react';
import DirectionIcon from 'teenyicons/outline/direction.svg?react';
import VectorDocumentIcon from 'teenyicons/outline/vector-document.svg?react';
import { FC } from 'react';

// https://icon-sets.iconify.design/teenyicons
enum IconName {
  Line = 'Line',
  Square = 'Square',
  Circle = 'Circle',
  Direction = 'Direction',
  VectorDocument = 'VectorDocument',
}

const icons: Record<IconName, FC> = {
  [IconName.Line]: LineIcon,
  [IconName.Square]: SquareIcon,
  [IconName.Circle]: CircleIcon,
  [IconName.Direction]: DirectionIcon,
  [IconName.VectorDocument]: VectorDocumentIcon,
};

export { IconName };

interface IconProps {
  name: IconName;
}

export const Icon: FC<IconProps> = ({ name }) => {
  const CurrentIcon = icons[name];
  return (
    <div className="icon w-5">
      <CurrentIcon />
    </div>
  );
};
