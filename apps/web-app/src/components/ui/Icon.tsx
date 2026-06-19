import type { ComponentType, ReactElement } from 'react';
import {
  ArrowsClockwise,
  ArrowsDownUp,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  FileCode,
  Funnel,
  GithubLogo,
  MagnifyingGlass,
  SpinnerGap,
  Star,
  Warning,
  WarningCircle,
  type IconProps as PhosphorIconProps
} from '@phosphor-icons/react';

type IconName =
  | 'github'
  | 'search'
  | 'filter'
  | 'alertCircle'
  | 'refresh'
  | 'sort'
  | 'arrowLeft'
  | 'arrowRight'
  | 'copy'
  | 'check'
  | 'fileCode'
  | 'alertTriangle'
  | 'loader'
  | 'book'
  | 'star';

type IconComponent = ComponentType<PhosphorIconProps>;

const ICONS: Record<IconName, IconComponent> = {
  github: GithubLogo,
  search: MagnifyingGlass,
  filter: Funnel,
  alertCircle: WarningCircle,
  refresh: ArrowsClockwise,
  sort: ArrowsDownUp,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  copy: Copy,
  check: Check,
  fileCode: FileCode,
  alertTriangle: Warning,
  loader: SpinnerGap,
  book: BookOpen,
  star: Star,
};

export interface IconProps extends Omit<PhosphorIconProps, 'size' | 'weight'> {
  name: IconName;
  size?: number;
  weight?: PhosphorIconProps['weight'];
}

export function Icon({ name, size = 20, weight = 'regular', ...props }: IconProps): ReactElement {
  const Component = ICONS[name];

  return <Component size={size} weight={weight} aria-hidden="true" {...props} />;
}
