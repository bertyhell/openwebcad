import LineIcon from 'teenyicons/outline/line.svg?react';
import SquareIcon from 'teenyicons/outline/square.svg?react';
import CircleIcon from 'teenyicons/outline/circle.svg?react';
import DirectionIcon from 'teenyicons/outline/direction.svg?react';
import VectorDocumentIcon from 'teenyicons/outline/vector-document.svg?react';
import VectorDocumentSolidIcon from 'teenyicons/solid/vector-document.svg?react';
import LayersDifferenceIcon from 'teenyicons/outline/layers-difference.svg?react';
import SvgIcon from 'teenyicons/outline/svg.svg?react';
import PdfIcon from 'teenyicons/outline/pdf.svg?react';
import PdfSolidIcon from 'teenyicons/solid/pdf.svg?react';
import PngIcon from 'teenyicons/outline/png.svg?react';
import JavascriptIcon from 'teenyicons/outline/javascript.svg?react';
import JavascriptSolidIcon from 'teenyicons/solid/javascript.svg?react';
import SolidDownIcon from 'teenyicons/solid/down.svg?react';
import SolidUpIcon from 'teenyicons/solid/up.svg?react';
import SolidUpSmallIcon from 'teenyicons/solid/up-small.svg?react';
import SolidDownSmallIcon from 'teenyicons/solid/down-small.svg?react';
import AntiClockwiseIcon from 'teenyicons/outline/anti-clockwise.svg?react';
import ClockwiseIcon from 'teenyicons/outline/clockwise.svg?react';
import GithubIcon from 'teenyicons/outline/github.svg?react';
import CropIcon from 'teenyicons/outline/crop.svg?react';
import FolderIcon from 'teenyicons/outline/folder.svg?react';
import ExpandIcon from 'teenyicons/outline/expand.svg?react';
import SaveIcon from 'teenyicons/outline/save.svg?react';
import ImageIcon from 'teenyicons/outline/image.svg?react';
import ImageSoldIcon from 'teenyicons/solid/image.svg?react';
import FilePlusIcon from 'teenyicons/outline/file-plus.svg?react';
import ArrowLeftCircle from 'teenyicons/outline/arrow-left-circle.svg?react';
import ArrowRightCircle from 'teenyicons/outline/arrow-right-circle.svg?react';
import ScaleIcon from './custom-icons/scale.svg?react';
import MeasurementIcon from './custom-icons/measurement.svg?react';
import EditIcon from 'teenyicons/outline/edit.svg?react';
import SendUpIcon from 'teenyicons/outline/send-up.svg?react';
import SendDownIcon from 'teenyicons/outline/send-down.svg?react';
import {FC} from 'react';

// https://icon-sets.iconify.design/teenyicons
enum IconName {
	// Outline icons
	Line = 'Line',
	Square = 'Square',
	Circle = 'Circle',
	Direction = 'Direction',
	VectorDocument = 'VectorDocument',
	VectorDocumentSolid = 'VectorDocumentSolid',
	LayersDifference = 'LayersDifference',
	AntiClockwise = 'AntiClockwise',
	Clockwise = 'Clockwise',
	Github = 'Github',
	Crop = 'Crop',
	Folder = 'Folder',
	Save = 'Save',
	Svg = 'Svg',
	Pdf = 'Pdf',
	PdfSolid = 'PdfSolid',
	Png = 'Png',
	Javascript = 'Javascript',
	JavascriptSolid = 'JavascriptSolid',
	Expand = 'Expand',
	Image = 'Image',
	ImageSolid = 'ImageSolid',
	ArrowLeftCircle = 'ArrowLeftCircle',
	ArrowRightCircle = 'ArrowRightCircle',
	Measurement = 'Measurement',
	FilePlus = 'FilePlus',
	Edit = 'Edit',
	SendUp = 'SendUp',
	SendDown = 'SendDown',

	// Solid icons
	SolidDown = 'SolidDown',
	SolidUp = 'SolidUp',
	SolidUpSmall = 'SolidUpSmall',
	SolidDownSmall = 'SolidDownSmall',

	// Custom icons
	Scale = 'Scale',
}

const icons: Record<IconName, FC> = {
	// Outline icons
	[IconName.Line]: LineIcon,
	[IconName.Square]: SquareIcon,
	[IconName.Circle]: CircleIcon,
	[IconName.Direction]: DirectionIcon,
	[IconName.VectorDocument]: VectorDocumentIcon,
	[IconName.VectorDocumentSolid]: VectorDocumentSolidIcon,
	[IconName.LayersDifference]: LayersDifferenceIcon,
	[IconName.AntiClockwise]: AntiClockwiseIcon,
	[IconName.Clockwise]: ClockwiseIcon,
	[IconName.Github]: GithubIcon,
	[IconName.Crop]: CropIcon,
	[IconName.Folder]: FolderIcon,
	[IconName.Save]: SaveIcon,
	[IconName.Svg]: SvgIcon,
	[IconName.Pdf]: PdfIcon,
	[IconName.PdfSolid]: PdfSolidIcon,
	[IconName.Png]: PngIcon,
	[IconName.Javascript]: JavascriptIcon,
	[IconName.JavascriptSolid]: JavascriptSolidIcon,
	[IconName.Expand]: ExpandIcon,
	[IconName.Image]: ImageIcon,
	[IconName.ImageSolid]: ImageSoldIcon,
	[IconName.ArrowLeftCircle]: ArrowLeftCircle,
	[IconName.ArrowRightCircle]: ArrowRightCircle,
	[IconName.Measurement]: MeasurementIcon,
	[IconName.FilePlus]: FilePlusIcon,
	[IconName.Edit]: EditIcon,
	[IconName.SendUp]: SendUpIcon,
	[IconName.SendDown]: SendDownIcon,

	// Solid icons
	[IconName.SolidDown]: SolidDownIcon,
	[IconName.SolidUp]: SolidUpIcon,
	[IconName.SolidUpSmall]: SolidUpSmallIcon,
	[IconName.SolidDownSmall]: SolidDownSmallIcon,

	// Custom icons
	[IconName.Scale]: ScaleIcon,
};

export {IconName};

interface IconProps {
	name: IconName;
	className?: string;
}

export const Icon: FC<IconProps> = ({name, className}) => {
	const CurrentIcon = icons[name];
	return (
		<div className={'icon w-5' + (className ? ' ' + className : '')}>
			<CurrentIcon/>
		</div>
	);
};
