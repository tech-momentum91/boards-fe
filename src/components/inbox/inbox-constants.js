import {
  RiInbox2Line,
  RiPulseLine,
  RiTimeLine,
  RiCheckDoubleLine,
  RiCalendarLine,
  RiSunLine,
  RiAtLine,
  RiUserLine,
  RiMailUnreadLine,
} from 'react-icons/ri';

export const INBOX_TAB_OPTIONS = [
  { value: 'primary', label: 'Primary', icon: RiInbox2Line },
  { value: 'later', label: 'Later', icon: RiTimeLine },
  { value: 'cleared', label: 'Cleared', icon: RiCheckDoubleLine },
  //{ value: 'other', label: 'Other', icon: RiPulseLine },
];

export const INBOX_TAB_TITLES = {
  primary: 'Today',
  other: 'Other',
  later: 'Later',
  cleared: 'Cleared',
};

export const SNOOZE_OPTIONS = [
  { value: 'later', label: 'Later', secondary: 'in 2 hours', icon: RiCalendarLine },
  { value: 'tomorrow', label: 'Tomorrow', icon: RiSunLine },
  { value: 'in_2_days', label: 'In 2 Days', icon: RiTimeLine },
  { value: 'next_week', label: 'Next Week', icon: RiCalendarLine },
  { value: 'unsnooze', label: 'Unsnooze', icon: RiSunLine },
];

/** Status pill styles for secondary text (e.g. "set status to ONHOLD -> INPROGRESS") */
export const STATUS_PILL_STYLES = {
  OPEN: 'bg-information-lighter text-information-base',
  INPROGRESS: 'bg-amber-100 text-amber-800',
  ONHOLD: 'bg-[#E8E0F5] text-[#5B4B8A]',
  RESOLVED: 'bg-success-lighter text-success-base',
  CLOSED: 'bg-bg-weak-200 text-text-sub-600',
  PENDING: 'bg-warning-lighter text-warning-base',
};

export const DEFAULT_PILL_STYLE = 'bg-bg-weak-200 text-text-sub-600';

export const INBOX_FILTER_KEYS = {
  MENTIONS: 'mentions',
  ASSIGNED_TO_ME: 'assigned_to_me',
  UNREAD: 'unread',
};

export const FILTER_LABEL_MAP = {
  [INBOX_FILTER_KEYS.MENTIONS]: 'Mentions',
  [INBOX_FILTER_KEYS.ASSIGNED_TO_ME]: 'Assigned to me',
  [INBOX_FILTER_KEYS.UNREAD]: 'Unread',
};

export const INBOX_FILTER_OPTIONS = [
  { value: INBOX_FILTER_KEYS.MENTIONS, label: 'Mentions', icon: RiAtLine },
  { value: INBOX_FILTER_KEYS.ASSIGNED_TO_ME, label: 'Assigned to me', icon: RiUserLine },
  { value: INBOX_FILTER_KEYS.UNREAD, label: 'Unread', icon: RiMailUnreadLine },
];

/** Inbox filter dropdown — sessionStorage slot (shared by Inbox page and My Tasks inbox tab). */
export const INBOX_FILTER_SESSION_KEY = 'inbox-view-filter-dropdown';

/** Canonical persisted shape for inbox list filters (single-select stored as a one-item array). */
export const INBOX_APPLIED_FILTER_DEFAULTS = {
  filters: [],
};

const VALID_INBOX_FILTER_VALUES = new Set(Object.values(INBOX_FILTER_KEYS));

export function mergeStoredInboxFilters(stored) {
  const filters = Array.isArray(stored?.filters) ? stored.filters : [];
  const valid = filters.filter((value) => VALID_INBOX_FILTER_VALUES.has(value));
  return valid.length > 0 ? [valid[0]] : [];
}
