import {
  RiBuildingLine,
  RiBox3Line,
  RiCalendarLine,
  RiUser2Line,
  RiUserLine,
  RiTicketLine,
  RiSettings2Line,
  RiTimeLine,
  RiFileList2Line,
  RiFileLine,
} from 'react-icons/ri';
import triggersJson from '@/data/notification-triggers.json';
import { PendingStatusIcon } from './pending-status-icon';

const ICON_MAP = {
  RiBuildingLine,
  RiBox3Line,
  RiCalendarLine,
  RiUser2Line,
  RiUserLine,
  RiTicketLine,
  RiSettings2Line,
  RiTimeLine,
  RiFileList2Line,
  RiFileLine,
};

/** Trigger type config with React icon component and Tailwind classes */
export const NOTIFICATION_TRIGGERS = Object.fromEntries(
  Object.entries(triggersJson.triggers || {}).map(([key, t]) => [
    key,
    {
      ...t,
      Icon: ICON_MAP[t.icon] || RiTimeLine,
    },
  ]),
);

/** Status config for activity (blue, orange, gray) – use when showing status-wise icon */
export const NOTIFICATION_STATUSES = Object.fromEntries(
  Object.entries(triggersJson.statuses || {}).map(([key, s]) => [
    key,
    {
      ...s,
      Icon: RiTimeLine,
    },
  ]),
);

/** Submodule (secondary module) config – e.g. Document, Onboard, CSI */
export const NOTIFICATION_SUBMODULES = Object.fromEntries(
  Object.entries(triggersJson.submodules || {}).map(([key, sm]) => [
    key,
    {
      ...sm,
      Icon: ICON_MAP[sm.icon] || RiFileList2Line,
    },
  ]),
);

/**
 * Get submodule config for secondary module display (icon + label before assignee).
 * @param {string} [submodule] - e.g. 'document', 'onboard', 'csi'
 * @returns {{ Icon: React.ComponentType, label: string, id: string } | null}
 */
export function getSubmoduleConfig(submodule) {
  if (!submodule) return null;
  return NOTIFICATION_SUBMODULES[submodule] ?? null;
}

/**
 * Get trigger config for a notification type. Use for trigger-type icon and color.
 * @param {string} [triggerType] - e.g. 'centers', 'space', 'booking', 'landlords', 'clients', 'ticket', 'settings'
 * @returns {{ Icon: React.ComponentType, iconBg: string, iconColor: string, label: string, id: string } | null}
 */
export function getTriggerConfig(triggerType) {
  if (!triggerType) return null;
  return NOTIFICATION_TRIGGERS[triggerType] ?? null;
}

/**
 * Get status config for activity. Use when showing status-wise icon/color.
 * @param {string} [statusType] - e.g. 'blue', 'orange', 'gray'
 * @returns {{ Icon: React.ComponentType, iconBg: string, iconColor: string, label: string, id: string } | null}
 */
export function getStatusConfig(statusType) {
  if (!statusType) return null;
  return NOTIFICATION_STATUSES[statusType] ?? NOTIFICATION_STATUSES.gray ?? null;
}

/** Neutral icon style when there is no activity (no badge color) */
const NEUTRAL_ICON = {
  iconBg: 'bg-bg-weak-100',
  iconColor: 'text-text-soft-400',
};

/** Pending icon fill fraction by status: blue 1/4, orange 1/2, gray 3/4 */
const STATUS_PENDING_FILL = {
  blue: 0.25,
  orange: 0.5,
  green: 0.75,
};

/**
 * Get icon and badge style for an inbox item.
 * - Only when useStatusIcon is true: use PendingStatusIcon with status-based fill (1/4, 1/2, 3/4) and colors.
 * - Otherwise: use trigger icon with neutral style (normal).
 * @param {{ triggerType?: string, statusType?: string, useStatusIcon?: boolean }} item
 * @returns {{ Icon: React.ComponentType, iconBg: string, iconColor: string, iconProps?: object }}
 */
export function getNotificationIconConfig(item) {
  const triggerCfg = getTriggerConfig(item?.doctype);
  const useStatusIcon = item?.useStatusIcon === true;
  const hasActivity = useStatusIcon && item?.statusType != null && item?.statusType !== '';
  const statusCfg = hasActivity ? getStatusConfig(item.statusType) : null;
  if (triggerCfg && statusCfg) {
    const fillFraction = STATUS_PENDING_FILL[statusCfg.id] ?? 0.25;
    return {
      Icon: PendingStatusIcon,
      iconBg: statusCfg.iconBg,
      iconColor: statusCfg.iconColor,
      iconProps: { fillFraction },
    };
  }
  if (triggerCfg) {
    return {
      Icon: triggerCfg.Icon,
      iconBg: NEUTRAL_ICON.iconBg,
      iconColor: NEUTRAL_ICON.iconColor,
    };
  }
  if (statusCfg) {
    return {
      Icon: RiTimeLine,
      iconBg: statusCfg.iconBg,
      iconColor: statusCfg.iconColor,
    };
  }
  return {
    Icon: RiTimeLine,
    iconBg: NEUTRAL_ICON.iconBg,
    iconColor: NEUTRAL_ICON.iconColor,
  };
}

export default NOTIFICATION_TRIGGERS;
