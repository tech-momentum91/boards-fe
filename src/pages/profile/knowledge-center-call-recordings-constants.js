import { RiBuilding2Line, RiPhoneLine, RiStackLine } from 'react-icons/ri';

export const CALL_RECORDING_TABLE_ID = 'knowledge-center-call-recordings';

export const ALL_CENTERS = '__all_centers__';
export const ALL_CLIENTS = '__all_clients__';
export const ALL_CALL_TYPES = '__all_call_types__';

/** Sidebar company tabs — `value` is sent as `company` filter to the list API. */
export const CALL_RECORDING_CATEGORY_ITEMS = [
  { value: 'all', label: 'All', icon: RiStackLine },
  { value: 'DevX', label: 'DevX', icon: RiBuilding2Line },
  { value: 'Phi Designs', label: 'Phi Designs', icon: RiPhoneLine },
];

export const COMPANY_FORM_OPTIONS = [
  { value: 'DevX', label: 'DevX' },
  { value: 'Phi Designs', label: 'Phi Designs' },
];

export const CALL_TYPE_FORM_OPTIONS = [
  { value: 'Inquiry', label: 'Inquiry' },
  { value: 'Booking', label: 'Booking' },
  { value: 'Support', label: 'Support' },
];

export const CALL_TYPE_FILTER_OPTIONS = [
  { value: ALL_CALL_TYPES, label: 'All Call Types' },
  ...CALL_TYPE_FORM_OPTIONS,
];

export const CALL_RECORDING_DEFAULT_COLUMNS = [
  { id: 'call_recording_name', label: 'Name', visible: true, enableHiding: false },
  { id: 'center', label: 'Center', visible: true, enableHiding: true },
  { id: 'client', label: 'Client', visible: true, enableHiding: true },
  { id: 'duration', label: 'Duration', visible: true, enableHiding: true },
  { id: 'call_type', label: 'Call Type', visible: true, enableHiding: true },
  { id: 'caller', label: 'Caller', visible: true, enableHiding: true },
  { id: 'receiver', label: 'Receiver', visible: true, enableHiding: true },
  { id: 'call_date_time', label: 'Date & Time', visible: true, enableHiding: true },
  { id: 'tags', label: 'Tags', visible: false, enableHiding: true },
  { id: 'creation', label: 'Created at', visible: false, enableHiding: true },
  { id: 'modified', label: 'Last modified at', visible: false, enableHiding: true },
];

export const callRecordingCategoryLabelByValue = CALL_RECORDING_CATEGORY_ITEMS.reduce(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  /** @type {Record<string, string>} */ ({}),
);

export const MP3_UPLOAD_RULES = {
  accept: 'audio/mpeg,audio/mp3,.mp3',
  extensions: new Set(['mp3']),
  multiple: false,
  hint: 'MP3 files only, up to 25 MB.',
  maxFileSizeBytes: 25 * 1024 * 1024,
};

/** Pre-fill add form company from sidebar tab (`all` → empty). */
export function getAddCallRecordingDefaultCompany(activeCategory) {
  if (!activeCategory || activeCategory === 'all') return '';
  return COMPANY_FORM_OPTIONS.some((item) => item.value === activeCategory) ? activeCategory : '';
}

/**
 * @param {File} file
 */
export function isMp3File(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (MP3_UPLOAD_RULES.extensions.has(ext)) return true;
  const mime = (file.type || '').toLowerCase();
  return mime === 'audio/mpeg' || mime === 'audio/mp3';
}
