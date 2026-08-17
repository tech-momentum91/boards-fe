/** CRM Leads — constants, column config, filter and group-by options. */

import { State, City } from 'country-state-city';
import { RiFireFill, RiSunFill, RiSnowflakeFill, RiCactusFill } from 'react-icons/ri';
import { DEFAULT_DATETIME_FILTER } from '@/components/crm-accounts/constants';

/** Badge color for CRM Lead Call Status / Info Call Status (TruePulse). */
export function getInfoCallStatusBadgeColor(status) {
  const key = String(status || '')
    .trim()
    .toLowerCase();
  if (!key) return 'gray';
  if (['answered', 'connected', 'completed'].includes(key)) return 'green';
  if (['missed', 'no answer', 'not answered', 'busy', 'voicemail'].includes(key)) return 'red';
  if (['unknown', 'n/a', 'na'].includes(key)) return 'gray';
  return 'gray';
}

/** Darken a hex color by factor (0–1). Used for stage pill text (e.g. purple-darker). */
export function darkenHex(hex, factor = 0.6) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
  const h = hex.slice(1);
  if (h.length !== 6) return hex;
  const r = Math.max(0, Math.min(255, Math.floor(Number.parseInt(h.slice(0, 2), 16) * factor)));
  const g = Math.max(0, Math.min(255, Math.floor(Number.parseInt(h.slice(2, 4), 16) * factor)));
  const b = Math.max(0, Math.min(255, Math.floor(Number.parseInt(h.slice(4, 6), 16) * factor)));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/** Defaults aligned with Status Master / backend create defaults. */
export const CRM_DEFAULT_PIPELINE_COLOR = '#9C27B0';
export const CRM_DEFAULT_STAGE_COLOR = '#2196F3';
export const CRM_DEFAULT_STATUS_COLOR = '#4CAF50';
export const CRM_DEFAULT_STATUS_DROP_LOST_COLOR = '#F44336';

/** Won / Lost / Drop fallback when a status has no stored color. */
export function getCrmDefaultStatusColor(statusName = '', defaultType = null) {
  if (defaultType === 'drop' || defaultType === 'lost') return CRM_DEFAULT_STATUS_DROP_LOST_COLOR;
  const label = String(statusName || '')
    .trim()
    .toLowerCase();
  if (label === 'won') return CRM_DEFAULT_STATUS_COLOR;
  if (label === 'lost' || label.includes('drop')) return CRM_DEFAULT_STATUS_DROP_LOST_COLOR;
  return CRM_DEFAULT_STATUS_COLOR;
}

/** First non-empty color, or fallback. */
export function resolveCrmColor(...candidates) {
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }
  return '';
}

/** Status badge color: master color → option color → Won/Lost/Drop default → green. */
export function resolveCrmStatusBadgeColor({
  statusColor,
  optionColor,
  statusLabel,
} = {}) {
  const fromMaster = resolveCrmColor(statusColor, optionColor);
  if (fromMaster) return fromMaster;
  return getCrmDefaultStatusColor(statusLabel);
}

// Indian cities only, deduplicated by name. Used by CityCombobox for lead forms.
export const INDIA_CITY_OPTIONS = (() => {
  const seen = new Set();
  const list = [];
  const states = State.getStatesOfCountry('IN');
  states.forEach((s) => {
    City.getCitiesOfState('IN', s.isoCode).forEach((c) => {
      if (seen.has(c.name)) return;
      seen.add(c.name);
      list.push({ value: c.name, label: c.name });
    });
  });
  return list.sort((a, b) => a.label.localeCompare(b.label));
})();

export const findCityLocationInIndia = (cityName) => {
  if (!cityName) return null;
  const states = State.getStatesOfCountry('IN');
  for (const s of states) {
    const cities = City.getCitiesOfState('IN', s.isoCode);
    const found = cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
    if (found) {
      return { country: 'IN', state: s.isoCode, city: found.name };
    }
  }
  return null;
};

export const LEAD_COLUMN_DEFS = [
  { id: 'name', label: 'Name', visible: true, enableHiding: false },
  { id: 'contact', label: 'Contact', visible: true },
  { id: 'account', label: 'Account', visible: true },
  { id: 'cp_account', label: 'CP Account', visible: true },
  { id: 'company_legal_name', label: 'Company Legal Name', visible: false },
  { id: 'lead_of', label: 'Lead Of', visible: true },
  { id: 'created_at', label: 'Created At', visible: true },
  { id: 'pipeline', label: 'Pipeline', visible: true },
  { id: 'lifecycle_stage', label: 'Lifecycle Stage', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'lead_temperature', label: 'Lead Temperature', visible: true },
  { id: 'sales_owner', label: 'Sales Owner', visible: true },
  { id: 'inside_sales', label: 'Inside Sales', visible: true },
  { id: 'product', label: 'Product', visible: true },
  { id: 'seats', label: 'Seats', visible: true },
  { id: 'monthly_value', label: 'Monthly Value (₹)', visible: true },
  { id: 'lead_source', label: 'Lead Source', visible: true },
  { id: 'city', label: 'City', visible: true },
  { id: 'lead_size', label: 'Lead Size', visible: false },
  { id: 'est_lifetime_value', label: 'Est. Lifetime Value', visible: false },
  { id: 'lost_cause', label: 'Drop Reason', visible: false },
  { id: 'need_urgency', label: 'Need Urgency', visible: false },
  { id: 'lead_relevance', label: 'Lead Relevance', visible: false },
  { id: 'info_call_status', label: 'Info Call Status', visible: false },
  { id: 'campaign', label: 'Campaign', visible: false },
  { id: 'medium', label: 'Medium', visible: false },
  { id: 'term', label: 'Term', visible: false },
  { id: 'content', label: 'Content', visible: false },
  { id: 'gclid', label: 'GClid', visible: false },
  { id: 'ad_group', label: 'Ad Group', visible: false },
  { id: 'landing_page_url', label: 'Landing Page URL', visible: false },
  { id: 'contact_from_url', label: 'Contact From URL', visible: false },
  { id: 'contact_message', label: 'Message by Prospect', visible: false },
  { id: 'contact_subject', label: 'Contact Subject', visible: false },
  { id: 'delacon_info_date', label: 'Delacon Info Date', visible: false },
  { id: 'delacon_info_termination_point', label: 'Delacon Info Termination Point', visible: false },
  { id: 'delacon_info_call_status', label: 'Delacon Info Call Status', visible: false },
  { id: 'delacon_web_info_search_engine', label: 'Delacon Web Info Search Engine', visible: false },
  { id: 'delacon_web_info_search_type', label: 'Delacon Web Info Search Type', visible: false },
  { id: 'delacon_location_city', label: 'Delacon Location City', visible: false },
  {
    id: 'delacon_adwords_info_conversions',
    label: 'Delacon Adwords Info Conversions',
    visible: false,
  },
  { id: 'delacon_adwords_info_cpc', label: 'Delacon Adwords Info CPC', visible: false },
  { id: 'delacon_adwords_info_cost', label: 'Delacon Adwords Info Cost', visible: false },
  { id: 'delacon_info_caller', label: 'Delacon Info Caller', visible: false },
  { id: 'delacon_adwords_info_clicks', label: 'Delacon Adwords Info Clicks', visible: false },
  { id: 'delacon_call_recording', label: 'Delacon Call Recording', visible: false },
  { id: 'delacon_landing_page', label: 'Delacon Landing Page', visible: false },
  {
    id: 'delacon_web_info_page_called_from',
    label: 'Delacon Web Info Page Called From',
    visible: false,
  },
  { id: 'delacon_inside_sales_fr_tat', label: 'Delacon Inside Sales FR TAT', visible: false },
  { id: 'delacon_sales_fr_tat', label: 'Delacon Sales FR TAT', visible: false },
  { id: 'external_id', label: 'External ID', visible: false },
  { id: 'service_id', label: 'Service ID', visible: false },
  { id: 'last_modified_at', label: 'Last Modified At', visible: false },
];

/** Pipeline strip tab: all pipelines (backend filter value is the literal "All"). */
export const ALL_PIPELINE_TAB_VALUE = 'All';
export const ALL_PIPELINE_TAB = {
  value: ALL_PIPELINE_TAB_VALUE,
  label: 'All',
};

/** Stage strip tab: dropped leads (any stage with a drop/lost reason) for the current pipeline. */
export const DROPPED_LEADS_TAB_VALUE = '__dropped_leads__';
export const DROPPED_LEADS_TAB = {
  value: DROPPED_LEADS_TAB_VALUE,
  label: 'Dropped leads',
};

/** Default min/max for dynamic column width. */
export const LEAD_COLUMN_MIN_WIDTH = 100;
export const LEAD_COLUMN_MAX_WIDTH = 500;

/** Seats, GClid: show up to this many characters, then ellipsis + hover for full value. */
export const LEAD_TRUNCATED_TEXT_MAX_CHARS = 15;

/** Default column width for truncated text columns (~15 chars + cell padding). */
export const LEAD_TRUNCATED_TEXT_COLUMN_WIDTH = 175;

/** Static default widths (e.g. for content-heavy columns). Final default = max(dynamic from label, this). */
const STATIC_LEAD_COLUMN_WIDTHS = {
  name: 240,
  contact: 180,
  account: 180,
  cp_account: 180,
  company_legal_name: 180,
  lead_of: 160,
  created_at: 160,
  pipeline: 140,
  /** Pills stay on one line — defaults sized for long labels (e.g. status, lost cause). */
  lifecycle_stage: 150,
  status: 130,
  lead_temperature: 150,
  sales_owner: 160,
  inside_sales: 180,
  product: 160,
  seats: LEAD_TRUNCATED_TEXT_COLUMN_WIDTH,
  monthly_value: 160,
  lead_source: 180,
  city: 160,
  lead_size: 160,
  est_lifetime_value: 160,
  lost_cause: 160,
  need_urgency: 150,
  lead_relevance: 180,
  info_call_status: 180,
  campaign: 140,
  medium: 120,
  term: 120,
  content: 160,
  gclid: LEAD_TRUNCATED_TEXT_COLUMN_WIDTH,
  ad_group: 120,
  landing_page_url: 220,
  contact_from_url: 160,
  contact_message: 180,
  contact_subject: 160,
  delacon_info_date: 160,
  delacon_info_termination_point: 220,
  delacon_info_call_status: 180,
  delacon_web_info_search_engine: 220,
  delacon_web_info_search_type: 200,
  delacon_location_city: 180,
  delacon_adwords_info_conversions: 220,
  delacon_adwords_info_cpc: 180,
  delacon_adwords_info_cost: 180,
  delacon_info_caller: 160,
  delacon_adwords_info_clicks: 200,
  delacon_call_recording: 180,
  delacon_landing_page: 200,
  delacon_web_info_page_called_from: 260,
  delacon_inside_sales_fr_tat: 220,
  delacon_sales_fr_tat: 180,
  external_id: 140,
  service_id: 140,
  last_modified_at: 160,
};

/** Pixels per character for label + extra for sort icon/padding. */
const PX_PER_CHAR = 10;
const LABEL_PADDING = 32;

/**
 * Compute default column width from label length so headers don't truncate.
 * Width = clamp(MIN, label.length * PX_PER_CHAR + LABEL_PADDING, MAX).
 */
function getDefaultWidthForLabel(label) {
  if (!label || typeof label !== 'string') return LEAD_COLUMN_MIN_WIDTH;
  const w = label.length * PX_PER_CHAR + LABEL_PADDING;
  return Math.min(LEAD_COLUMN_MAX_WIDTH, Math.max(LEAD_COLUMN_MIN_WIDTH, w));
}

/**
 * Default column width = max(dynamic from label, static constant).
 * Ensures we never go smaller than the static default (e.g. for content-heavy columns like Name).
 */
export const DEFAULT_LEAD_COLUMN_WIDTHS = Object.fromEntries([
  ...LEAD_COLUMN_DEFS.map((col) => {
    const dynamicW = getDefaultWidthForLabel(col.label);
    const staticW = STATIC_LEAD_COLUMN_WIDTHS[col.id] ?? 0;
    return [col.id, Math.max(dynamicW, staticW)];
  }),
  ['actions', 60],
]);

export const LEAD_COLUMN_STORAGE_KEY = 'crm-leads-column-widths';
export const LEAD_RESIZE_ENABLED_KEY = 'crm-leads-resize-enabled';

/** Separate list view for leads inside an account detail (own column prefs & widths). */
export const REACT_TABLE_ID_ACCOUNT_LEADS = 'crm-leads-table-account-detail';
export const ACCOUNT_LEADS_COLUMN_STORAGE_KEY = 'crm-leads-column-widths-account-detail';
export const ACCOUNT_LEADS_RESIZE_ENABLED_KEY = 'crm-leads-resize-enabled-account-detail';

/** Separate list view for leads inside a contact detail (own column prefs & widths). */
export const REACT_TABLE_ID_CONTACT_LEADS = 'crm-leads-table-contact-detail';
export const CONTACT_LEADS_COLUMN_STORAGE_KEY = 'crm-leads-column-widths-contact-detail';
export const CONTACT_LEADS_RESIZE_ENABLED_KEY = 'crm-leads-resize-enabled-contact-detail';

export const GROUP_BY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'account', label: 'Account' },
  { value: 'lead_of', label: 'Lead Of' },
  { value: 'lifecycle_stage', label: 'Lifecycle Stage' },
  { value: 'status', label: 'Status' },
  { value: 'sales_owner', label: 'Sales Owner' },
  { value: 'product', label: 'Product' },
  { value: 'lead_source', label: 'Lead Source' },
  { value: 'source', label: 'Source' },
  { value: 'city', label: 'City' },
  { value: 'lead_relevance', label: 'Lead Relevance' },
  { value: 'need_urgency', label: 'Need Urgency' },
  { value: 'info_call_status', label: 'Info Call Status' },
  { value: 'lost_cause', label: 'Drop Reason' },
];

export const LEAD_FILTER_TABS = {
  LIFECYCLE_STAGE: 'lifecycle_stage',
  STATUS: 'status',
  LEAD_OF: 'lead_of',
  SALES_OWNER: 'sales_owner',
  INSIDE_SALES: 'inside_sales',
  PRODUCT: 'product',
  LEAD_SOURCE: 'lead_source',
  CITY: 'city',
  LEAD_RELEVANCE: 'lead_relevance',
  NEED_URGENCY: 'need_urgency',
  INFO_CALL_STATUS: 'info_call_status',
  LOST_REASON: 'lost_reason',
  CREATED_AT: 'created_at',
  LAST_MODIFIED: 'last_modified_at',
};

export const LEAD_FILTER_TAB_CONFIG = [
  { value: LEAD_FILTER_TABS.LIFECYCLE_STAGE, label: 'Lifecycle Stage' },
  { value: LEAD_FILTER_TABS.STATUS, label: 'Status' },
  { value: LEAD_FILTER_TABS.LEAD_OF, label: 'Lead Of' },
  { value: LEAD_FILTER_TABS.SALES_OWNER, label: 'Sales Owner' },
  { value: LEAD_FILTER_TABS.INSIDE_SALES, label: 'Inside Sales' },
  { value: LEAD_FILTER_TABS.PRODUCT, label: 'Product' },
  { value: LEAD_FILTER_TABS.LEAD_SOURCE, label: 'Lead Source' },
  { value: LEAD_FILTER_TABS.CITY, label: 'City' },
  { value: LEAD_FILTER_TABS.LEAD_RELEVANCE, label: 'Lead Relevance' },
  { value: LEAD_FILTER_TABS.NEED_URGENCY, label: 'Need Urgency' },
  { value: LEAD_FILTER_TABS.INFO_CALL_STATUS, label: 'Info Call Status' },
  { value: LEAD_FILTER_TABS.LOST_REASON, label: 'Drop Reason' },
  { value: LEAD_FILTER_TABS.CREATED_AT, label: 'Created At' },
  { value: LEAD_FILTER_TABS.LAST_MODIFIED, label: 'Last Modified' },
];

export const DEFAULT_LEAD_FILTERS = {
  lifecycle_stage: [],
  status: [],
  lead_of: [],
  sales_owner: [],
  inside_sales: [],
  product: [],
  lead_source: [],
  city: [],
  lead_relevance: [],
  need_urgency: [],
  info_call_status: [],
  lost_reason: [],
  created_at: { ...DEFAULT_DATETIME_FILTER },
  last_modified_at: { ...DEFAULT_DATETIME_FILTER },
};

export const LIFECYCLE_STAGE_OPTIONS = [
  { value: 'MQL', label: 'MQL' },
  { value: 'SQL', label: 'SQL' },
  { value: 'Opportunity', label: 'Opportunity' },
  { value: 'Lead', label: 'Lead' },
];

export const LEAD_STATUS_OPTIONS = [
  { value: 'Open', label: 'Open' },
  { value: 'Won', label: 'Won' },
  { value: 'Lost', label: 'Lost' },
];

/** Value used in Select for "none" / empty; not sent to API. */
export const SELECT_NONE_VALUE = '__none__';

/** Lead Temperature display colors. */
export const LEAD_TEMPERATURE_COLORS = {
  Hot: '#F87171',
  Warm: '#EAB308',
  Cold: '#0EA5E9',
  Dry: '#16A34A',
};

/** Lead Temperature icons shown beside Name / in selects. */
export const LEAD_TEMPERATURE_ICONS = {
  Hot: RiFireFill,
  Warm: RiSunFill,
  Cold: RiSnowflakeFill,
  Dry: RiCactusFill,
};

export const LEAD_TEMPERATURE_OPTIONS = Object.keys(LEAD_TEMPERATURE_COLORS).map((v) => ({
  value: v,
  label: v,
}));

/**
 * Map list/detail raw value or label to the canonical option `value` (e.g. CRM Stages Pipeline.name).
 * Options from get_crm_lead_options use value = doc name, label = display title.
 */
export function resolveLinkFieldSelectValue(rawValue, rawLabel, options) {
  const opts = Array.isArray(options) ? options : [];
  const valueStr = rawValue != null ? String(rawValue).trim() : '';
  const labelStr = rawLabel != null ? String(rawLabel).trim() : '';

  if (valueStr) {
    const byValue = opts.find((o) => String(o.value) === valueStr);
    if (byValue) return String(byValue.value);
    const valueAsLabel = opts.find(
      (o) =>
        String(o.label || '')
          .trim()
          .toLowerCase() === valueStr.toLowerCase(),
    );
    if (valueAsLabel) return String(valueAsLabel.value);
  }
  if (labelStr) {
    const byLabel = opts.find(
      (o) =>
        String(o.label || '')
          .trim()
          .toLowerCase() === labelStr.toLowerCase(),
    );
    if (byLabel) return String(byLabel.value);
  }
  return valueStr;
}

export function getLinkFieldOptionLabel(value, options, fallbackLabel = '') {
  const id = value != null ? String(value).trim() : '';
  if (!id) return '';
  const match = (Array.isArray(options) ? options : []).find((o) => String(o.value) === id);
  if (match?.label) return String(match.label);
  const fallback = fallbackLabel != null ? String(fallbackLabel).trim() : '';
  if (fallback) return fallback;
  return id;
}

/** True when CRM stage status label indicates lost/drop (lost reason may apply). */
export function statusLabelRequiresLostReason(label) {
  const lower = String(label || '')
    .toLowerCase()
    .trim();
  return lower.includes('lost') || lower.includes('drop');
}

/** Keeps current link value in options when missing from the loaded list. */
export function buildLinkSelectOptions(baseOptions, rawValue, displayLabel) {
  const base = Array.isArray(baseOptions) ? baseOptions : [];
  const resolved = resolveLinkFieldSelectValue(rawValue, displayLabel, base);
  if (!resolved || base.some((o) => String(o.value) === resolved)) return base;
  const label = getLinkFieldOptionLabel(resolved, base, displayLabel) || resolved;
  return [{ value: resolved, label }, ...base];
}

export const SALES_OWNER_OPTIONS = [
  { value: 'Guy Hawkins', label: 'Guy Hawkins' },
  { value: 'Darrell Steward', label: 'Darrell Steward' },
  { value: 'Floyd Miles', label: 'Floyd Miles' },
];

export const TRUEPULSE_SERVICE_OPTIONS = [
  {
    value: '35',
    label: 'Primary Business Number',
  },
  {
    value: '36',
    label: 'Interior Blogs',
  },
  {
    value: '37',
    label: 'DevX Website',
  },
  {
    value: '38',
    label: 'Google Ads Extension',
  },
  {
    value: '51',
    label: 'Search Ads Default',
  },
  {
    value: '118',
    label: 'DG1',
  },
];

export function getServiceName(serviceId) {
  const names = {
    35: 'Primary Business Number',
    36: 'Interior Blogs',
    37: 'DevX Website',
    38: 'Google Ads Extension',
    51: 'Search Ads Default',
    118: 'DG1',
  };
  return names[String(serviceId)] || '';
}

export function getServiceDisplayLabel(serviceId) {
  if (!serviceId) return '';
  const name = getServiceName(serviceId);
  return name || String(serviceId);
}

export const PRODUCT_OPTIONS = [
  { value: 'Product A', label: 'Product A' },
  { value: 'Product B', label: 'Product B' },
];

export const SOURCE_OPTIONS = [
  { value: 'Website', label: 'Website' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Campaign', label: 'Campaign' },
];

export const LEAD_LIFECYCLE_STAGE_BADGE_MAP = {
  mql: { color: 'orange', label: 'MQL' },
  sql: { color: 'purple', label: 'SQL' },
  opportunity: { color: 'green', label: 'Opportunity' },
  lead: { color: 'blue', label: 'Lead' },
};

export const LEAD_STATUS_BADGE_MAP = {
  open: { color: 'blue', label: 'Open' },
  won: { color: 'green', label: 'Won' },
  lost: { color: 'red', label: 'Lost' },
};

/** Format number as Indian Rupee (₹ 1,00,000). */
export const formatCurrencyInr = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `₹ ${num.toLocaleString('en-IN')}`;
};

/** Format number for currency input display (1,50,000). */
export const formatNumberInrForInput = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value).replaceAll(/[^\d.]/g, '');
  if (!str) return '';
  const num = Number(str);
  if (Number.isNaN(num)) return str;
  return num.toLocaleString('en-IN');
};

/** List columns that truncate at LEAD_TRUNCATED_TEXT_MAX_CHARS with hover for full text. */
export const LEAD_TRUNCATED_TEXT_FIELD_IDS = new Set(['seats', 'gclid']);

export const LEAD_INLINE_EDITABLE_TEXT_FIELD_IDS = new Set([
  'est_lifetime_value',
  'gclid',
  'ad_group',
  'medium',
  'campaign',
  'content',
  'term',
  'contact_message',
  'landing_page_url',
  'contact_from_url',
]);

export function getLeadFieldRawString(raw, fieldId) {
  if (raw === undefined || raw === null || raw === '') return '';
  if (fieldId === 'est_lifetime_value') {
    return String(raw).replaceAll(/[^\d.]/g, '');
  }
  return String(raw).trim();
}

export function getLeadFieldDisplayValue(valueStr, fieldId) {
  if (!valueStr) return '';
  if (fieldId === 'est_lifetime_value') {
    return formatNumberInrForInput(valueStr);
  }
  return valueStr;
}

export function normalizeLeadFieldSaveValue(value, fieldId) {
  if (fieldId === 'est_lifetime_value') {
    return String(value ?? '').replaceAll(/[^\d.]/g, '');
  }
  return String(value ?? '').trim();
}

export const EMPTY_STATES = {
  default: {
    title: 'No leads yet',
    description: 'Add your first lead to get started.',
  },
  search: {
    title: 'No leads match your filters',
    description: 'Try adjusting search or filters.',
  },
};

/** CRM Lead detail tab key → sidebar module name for `read`. */
export const CRM_LEAD_DETAIL_TAB_READ_MODULE = Object.freeze({
  about: 'CRM Lead',
  tasks: 'ACL Task',
  contacts: 'CRM Contact',
  account: 'CRM Account',
  'suggested-inventory': 'CRM Lead',
  proposals: null,
  activities: null,
});

export const PHI_BRAND_NAMES = ['phi designs', 'phi design'];
export const PHI_DEFAULT_PIPELINE = 'Design & Build Pipeline';
export const PHI_DEFAULT_PRODUCT = 'Office Design & Build';

export function isPhiBrand(val) {
  if (!val) return false;
  const clean = String(val).trim().toLowerCase();
  return PHI_BRAND_NAMES.includes(clean);
}

export function resolvePhiPipeline(options) {
  const opts = Array.isArray(options) ? options : [];
  const match = resolveLinkFieldSelectValue(PHI_DEFAULT_PIPELINE, PHI_DEFAULT_PIPELINE, opts);
  if (match && opts.some((o) => String(o.value) === match)) return match;
  const altMatch = resolveLinkFieldSelectValue('Design and build', 'Design and build', opts);
  if (altMatch && opts.some((o) => String(o.value) === altMatch)) return altMatch;
  if (opts.length > 0) {
    const found = opts.find((o) => {
      const v = String(o.value || '').toLowerCase();
      const l = String(o.label || '').toLowerCase();
      return v.includes('design') || l.includes('design');
    });
    if (found) return String(found.value);
    return String(opts[0].value);
  }
  return PHI_DEFAULT_PIPELINE;
}

export function resolvePhiProduct(options) {
  return (
    resolveLinkFieldSelectValue(PHI_DEFAULT_PRODUCT, PHI_DEFAULT_PRODUCT, options) ||
    PHI_DEFAULT_PRODUCT
  );
}
