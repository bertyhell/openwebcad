import type {FC} from 'react';
import AlignBottomIcon from 'teenyicons/outline/align-bottom.svg?react';
import AlignCenterHorizontalIcon from 'teenyicons/outline/align-center-horizontal.svg?react';
import AlignCenterVerticalIcon from 'teenyicons/outline/align-center-vertical.svg?react';
import AlignLeftIcon from 'teenyicons/outline/align-left.svg?react';
import AlignRightIcon from 'teenyicons/outline/align-right.svg?react';
import AlignTextJustifyIcon from 'teenyicons/outline/align-text-justify.svg?react';
import AlignTopIcon from 'teenyicons/outline/align-top.svg?react';
import AntiClockwiseIcon from 'teenyicons/outline/anti-clockwise.svg?react';
import ArrowLeftCircle from 'teenyicons/outline/arrow-left-circle.svg?react';
import ArrowRightCircle from 'teenyicons/outline/arrow-right-circle.svg?react';
import CircleIcon from 'teenyicons/outline/circle.svg?react';
import ClockwiseIcon from 'teenyicons/outline/clockwise.svg?react';
import CropIcon from 'teenyicons/outline/crop.svg?react';
import DirectionIcon from 'teenyicons/outline/direction.svg?react';
import DocumentsIcon from 'teenyicons/outline/documents.svg?react';
import DownloadIcon from 'teenyicons/outline/download.svg?react';
import EditIcon from 'teenyicons/outline/edit.svg?react';
import ExpandIcon from 'teenyicons/outline/expand.svg?react';
import EyeClosedIcon from 'teenyicons/outline/eye-closed.svg?react';
import EyeIcon from 'teenyicons/outline/eye.svg?react';
import FilePlusIcon from 'teenyicons/outline/file-plus.svg?react';
import FolderPlusIcon from 'teenyicons/outline/folder-plus.svg?react';
import FolderTickIcon from 'teenyicons/outline/folder-tick.svg?react';
import FolderXIcon from 'teenyicons/outline/folder-x.svg?react';
import FolderIcon from 'teenyicons/outline/folder.svg?react';
import GithubIcon from 'teenyicons/outline/github.svg?react';
import GridLayoutIcon from 'teenyicons/outline/grid-layout.svg?react';
import ImageIcon from 'teenyicons/outline/image.svg?react';
import JavascriptIcon from 'teenyicons/outline/javascript.svg?react';
import LayersDifferenceIcon from 'teenyicons/outline/layers-difference.svg?react';
import LineIcon from 'teenyicons/outline/line.svg?react';
import LockIcon from 'teenyicons/outline/lock.svg?react';
import Menu from 'teenyicons/outline/menu.svg?react';
import PdfIcon from 'teenyicons/outline/pdf.svg?react';
import PngIcon from 'teenyicons/outline/png.svg?react';
import QuestionSmallIcon from 'teenyicons/outline/question-small.svg?react';
import SaveIcon from 'teenyicons/outline/save.svg?react';
import SendDownIcon from 'teenyicons/outline/send-down.svg?react';
import SendLeftIcon from 'teenyicons/outline/send-left.svg?react';
import SendRightIcon from 'teenyicons/outline/send-right.svg?react'; // https://icon-sets.iconify.design/teenyicons
import SendUpIcon from 'teenyicons/outline/send-up.svg?react';
import SquareIcon from 'teenyicons/outline/square.svg?react';
import SvgIcon from 'teenyicons/outline/svg.svg?react';
import UnlockIcon from 'teenyicons/outline/unlock.svg?react';
import VectorDocumentIcon from 'teenyicons/outline/vector-document.svg?react';
import SolidDownSmallIcon from 'teenyicons/solid/down-small.svg?react';
import SolidDownIcon from 'teenyicons/solid/down.svg?react';
import ImageSoldIcon from 'teenyicons/solid/image.svg?react';
import JavascriptSolidIcon from 'teenyicons/solid/javascript.svg?react';
import PdfSolidIcon from 'teenyicons/solid/pdf.svg?react';
import SolidUpSmallIcon from 'teenyicons/solid/up-small.svg?react';
import SolidUpIcon from 'teenyicons/solid/up.svg?react';
import VectorDocumentSolidIcon from 'teenyicons/solid/vector-document.svg?react'; // Custom icons
import MeasurementIcon from './custom-icons/measurement.svg?react';
import ScaleIcon from './custom-icons/scale.svg?react';

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
	FolderTick = 'FolderTick',
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
	AlignLeft = 'AlignLeft',
	AlignRight = 'AlignRight',
	AlignCenterHorizontal = 'AlignCenterHorizontal',
	AlignTop = 'AlignTop',
	AlignBottom = 'AlignBottom',
	AlignCenterVertical = 'AlignCenterVertical',
	Documents = 'Documents',
	Download = 'Download',
	FolderX = 'FolderX',
	FolderPlus = 'FolderPlus',
	AlignTextJustify = 'AlignTextJustify',
	Eye = 'Eye',
	EyeClosed = 'EyeClosed',
	Lock = 'Lock',
	Unlock = 'Unlock',
	GridLayout = 'GridLayout',
	Menu = 'Menu',
	SendLeft = 'SendLeft',
	SendRight = 'SendRight',
	QuestionSmall = 'QuestionSmall',

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
	[IconName.FolderTick]: FolderTickIcon,
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
	[IconName.AlignLeft]: AlignLeftIcon,
	[IconName.AlignRight]: AlignRightIcon,
	[IconName.AlignCenterHorizontal]: AlignCenterHorizontalIcon,
	[IconName.AlignTop]: AlignTopIcon,
	[IconName.AlignBottom]: AlignBottomIcon,
	[IconName.AlignCenterVertical]: AlignCenterVerticalIcon,
	[IconName.Documents]: DocumentsIcon,
	[IconName.Download]: DownloadIcon,
	[IconName.FolderX]: FolderXIcon,
	[IconName.FolderPlus]: FolderPlusIcon,
	[IconName.AlignTextJustify]: AlignTextJustifyIcon,
	[IconName.Eye]: EyeIcon,
	[IconName.EyeClosed]: EyeClosedIcon,
	[IconName.Lock]: LockIcon,
	[IconName.Unlock]: UnlockIcon,
	[IconName.GridLayout]: GridLayoutIcon,
	[IconName.Menu]: Menu,
	[IconName.SendLeft]: SendLeftIcon,
	[IconName.SendRight]: SendRightIcon,
	[IconName.QuestionSmall]: QuestionSmallIcon,

	// Solid icons
	[IconName.SolidDown]: SolidDownIcon,
	[IconName.SolidUp]: SolidUpIcon,
	[IconName.SolidUpSmall]: SolidUpSmallIcon,
	[IconName.SolidDownSmall]: SolidDownSmallIcon,

	// Custom icons
	[IconName.Scale]: ScaleIcon,
};

export { IconName };

interface IconProps {
	name: IconName;
	className?: string;
}

export const Icon: FC<IconProps> = ({ name, className }) => {
	const CurrentIcon = icons[name];
	return (
		<div className={`icon w-5${className ? ` ${className}` : ''}`}>
			<CurrentIcon />
		</div>
	);
};
