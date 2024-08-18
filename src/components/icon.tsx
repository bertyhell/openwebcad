import LineIcon from 'teenyicons/outline/line.svg?react';
import SquareIcon from 'teenyicons/outline/square.svg?react';
import CircleIcon from 'teenyicons/outline/circle.svg?react';
import DirectionIcon from 'teenyicons/outline/direction.svg?react';
import VectorDocumentIcon from 'teenyicons/outline/vector-document.svg?react';
import LayersDifferenceIcon from 'teenyicons/outline/layers-difference.svg?react';
import SvgIcon from 'teenyicons/outline/svg.svg?react';
import SolidDownIcon from 'teenyicons/solid/down.svg?react';
import SolidUpIcon from 'teenyicons/solid/up.svg?react';
import SolidUpSmallIcon from 'teenyicons/solid/up-small.svg?react';
import SolidDownSmallIcon from 'teenyicons/solid/down-small.svg?react';
import AntiClockwiseIcon from 'teenyicons/outline/anti-clockwise.svg?react';
import ClockwiseIcon from 'teenyicons/outline/clockwise.svg?react';
import GithubIcon from 'teenyicons/outline/github.svg?react';
import CropIcon from 'teenyicons/outline/crop.svg?react';
import { FC } from 'react';

// https://icon-sets.iconify.design/teenyicons
enum IconName {
  Line = 'Line',
  Square = 'Square',
  Circle = 'Circle',
  Direction = 'Direction',
  VectorDocument = 'VectorDocument',
  LayersDifference = 'LayersDifference',
  AntiClockwise = 'AntiClockwise',
  Clockwise = 'Clockwise',
  Github = 'Github',
  Crop = 'Crop',
  Svg = 'Svg',
  SolidDown = 'SolidDown',
  SolidUp = 'SolidUp',
  SolidUpSmall = 'SolidUpSmall',
  SolidDownSmall = 'SolidDownSmall',
}

const icons: Record<IconName, FC> = {
  [IconName.Line]: LineIcon,
  [IconName.Square]: SquareIcon,
  [IconName.Circle]: CircleIcon,
  [IconName.Direction]: DirectionIcon,
  [IconName.VectorDocument]: VectorDocumentIcon,
  [IconName.LayersDifference]: LayersDifferenceIcon,
  [IconName.AntiClockwise]: AntiClockwiseIcon,
  [IconName.Clockwise]: ClockwiseIcon,
  [IconName.Github]: GithubIcon,
  [IconName.Crop]: CropIcon,
  [IconName.Svg]: SvgIcon,
  [IconName.SolidDown]: SolidDownIcon,
  [IconName.SolidUp]: SolidUpIcon,
  [IconName.SolidUpSmall]: SolidUpSmallIcon,
  [IconName.SolidDownSmall]: SolidDownSmallIcon,
};

export { IconName };

interface IconProps {
  name: IconName;
  className?: string;
}

export const Icon: FC<IconProps> = ({ name, className }) => {
  const CurrentIcon = icons[name];
  return (
    <div className={'icon w-5' + (className ? ' ' + className : '')}>
      <CurrentIcon />
    </div>
  );
};
