import type { IconProps } from '@tabler/icons-react';
import Image from 'next/image';
import {
  IconAlertTriangle,
  IconActivity,
  IconArrowRight,
  IconArrowUp,
  IconBell,
  IconBug,
  IconCircleCheck,
  IconCircleX,
  IconCarouselVertical,
  IconDeviceMobile,
  IconDeviceLaptop,
  IconDownload,
  IconExternalLink,
  IconFlask,
  IconGitMerge,
  IconHistory,
  IconInfoCircle,
  IconInbox,
  IconKey,
  IconLayoutKanban,
  IconMessage,
  IconMessageCircle,
  IconMoon,
  IconPackage,
  IconPlayerPlay,
  IconReportAnalytics,
  IconRobot,
  IconRotate,
  IconSun,
  IconSparkles,
  IconTicket,
  IconClock,
  IconUser,
  IconPlus,
  IconTags,
  IconSearch,
  IconCopy,
  IconTrash,
  IconPencil,
  IconFileText,
  IconLink,
  IconCalendarMonth,
  IconChevronLeft,
  IconChevronRight
} from '@tabler/icons-react';

export type Icon = React.ComponentType<IconProps>;

function PlatformIcon({ className }: IconProps) {
  return (
    <Image
      src='/platform-logo.png'
      alt=''
      width={32}
      height={32}
      className={`size-8 shrink-0 object-cover ${className ?? ''}`}
    />
  );
}

export const Icons = {
  activity: IconActivity,
  alertTriangle: IconAlertTriangle,
  arrowRight: IconArrowRight,
  arrowUp: IconArrowUp,
  bell: IconBell,
  bug: IconBug,
  chat: IconMessage,
  circleCheck: IconCircleCheck,
  circleX: IconCircleX,
  deviceMobile: IconDeviceMobile,
  download: IconDownload,
  externalLink: IconExternalLink,
  flask: IconFlask,
  gitMerge: IconGitMerge,
  history: IconHistory,
  info: IconInfoCircle,
  inbox: IconInbox,
  galleryVerticalEnd: IconCarouselVertical,
  key: IconKey,
  kanban: IconLayoutKanban,
  laptop: IconDeviceLaptop,
  messageCircle: IconMessageCircle,
  moon: IconMoon,
  package: IconPackage,
  playerPlay: IconPlayerPlay,
  platform: PlatformIcon,
  report: IconReportAnalytics,
  robot: IconRobot,
  rotate: IconRotate,
  sun: IconSun,
  sparkles: IconSparkles,
  ticket: IconTicket,
  clock: IconClock,
  user: IconUser,
  plus: IconPlus,
  tags: IconTags,
  search: IconSearch,
  copy: IconCopy,
  trash: IconTrash,
  pencil: IconPencil,
  fileText: IconFileText,
  link: IconLink,
  calendar: IconCalendarMonth,
  chevronLeft: IconChevronLeft,
  chevronRight: IconChevronRight
};
