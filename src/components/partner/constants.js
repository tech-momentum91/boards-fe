import {
  RiAttachment2,
  RiAttachmentFill,
  RiCalendarEventFill,
  RiCalendarEventLine,
  RiChat3Line,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiFileList2Fill,
  RiFileList2Line,
  RiFileTextLine,
  RiFlagLine,
  RiGlobalLine,
  RiGroupFill,
  RiGroupLine,
  RiHandCoinLine,
  RiLayoutGridLine,
  RiPulseFill,
  RiPulseLine,
  RiTaskFill,
  RiTaskLine,
  RiUserSharedLine,
} from 'react-icons/ri';

import { TASK_STATUS_OPTIONS } from '@/components/clients-management/constants';

export const PARTNER_STATS_CONFIG = [
  {
    key: 'total_partners',
    label: 'TOTAL PARTNERS',
    value: '0',
    icon: RiUserSharedLine,
    gradient: 'from-[#c2d6ff] to-[#ebf1ff]',
    text: 'text-[#162664]',
    icon_color: 'text-[#253EA7]',
  },
  {
    key: 'active',
    label: 'ACTIVE',
    value: '0',
    icon: RiCheckboxCircleLine,
    gradient: 'from-[#fbedb1] to-[#fef7ec]',
    text: 'text-[#693d11]',
    icon_color: 'text-[#B47818]',
  },
  {
    key: 'contacts',
    label: 'CONTACTS',
    value: '0',
    icon: RiGroupLine,
    gradient: 'from-[#cac2ff] to-[#eeebff]',
    text: 'text-[#2b1664]',
    icon_color: 'text-[#5A36BF]',
  },
  {
    key: 'cities',
    label: 'CITIES',
    value: '0',
    icon: RiGlobalLine,
    gradient: 'from-[#f9c2ff] to-[#fdebff]',
    text: 'text-[#620f6c]',
    icon_color: 'text-[#9C23A9]',
  },
];

export const PARTNER_LIST_PAGE_SIZE = 20;

/** Default ordering for `get_partner_list_view` (must match thunk default). */
export const PARTNER_LIST_DEFAULT_ORDER_BY = 'creation desc';

/**
 * Build `order_by` for `getPartnerListViewThunk` from TanStack sorting state.
 * The first list column (`partner_name`) is not sortable and must not appear in `sorting`.
 *
 * @param {import('@tanstack/react-table').SortingState} sorting
 */
export const buildPartnerListOrderBy = (sorting = []) => {
  if (!Array.isArray(sorting) || sorting.length === 0) {
    return PARTNER_LIST_DEFAULT_ORDER_BY;
  }
  const clause = sorting
    .filter((s) => s && s.id && s.id !== 'partner_name')
    .map((s) => `${s.id} ${s.desc ? 'desc' : 'asc'}`)
    .join(', ');
  return clause || PARTNER_LIST_DEFAULT_ORDER_BY;
};

/**
 * Dummy payload for testing partner creation API.
 * Use only for dummy data creation until backend is ready.
 */
export const DUMMY_PARTNER_CREATE_PAYLOAD = {
  partner_name: 'Test Partner (Dummy)',
  website: 'https://example.com',
  primary_category: 'B2B',
  secondary_category: 'Startup Community',
  partner_base_city: 'Bangalore',
  company_size: '11-50',
  industry_type: 'Technology',
  revenue_model: [
    { revenue_model: 'Social Media Barter' },
    { revenue_model: 'Community Access Barter' },
  ],
  estimated_engagement_frequency: 'Quarterly',
  partner_owner: 'Muskan Heda',
  onboarding_stage: 'Lead Identified',
  internal_description: 'Dummy partner for API testing.',
  linkedin_url: '',
  instagram_url: '',
  facebook_url: '',
  youtube_url: '',
  contact: [
    {
      contact_name: 'John Doe',
      contact_designation: 'Partnership Lead',
      contact_email: 'john@example.com',
      mobile_number: '+91-9876543210',
      is_primary: 1,
    },
  ],
};

// /** Detail view horizontal tabs */
export const PARTNER_DETAIL_TAB_OPTIONS = [
  {
    value: 'basic-details',
    label: 'Basic Details',
    icon: RiFileList2Line,
    activeIcon: RiFileList2Fill,
  },
  { value: 'contacts', label: 'Contacts', icon: RiGroupLine, activeIcon: RiGroupFill },
  { value: 'tasks', label: 'Tasks', icon: RiTaskLine, activeIcon: RiTaskFill },
  { value: 'events', label: 'Events', icon: RiCalendarEventLine, activeIcon: RiCalendarEventFill },
  { value: 'attachments', label: 'Attachments', icon: RiAttachment2, activeIcon: RiAttachmentFill },
  { value: 'activities', label: 'Activities', icon: RiPulseLine, activeIcon: RiPulseFill },
];

/** Partner detail tab value → sidebar module name for `read`. */
export const PARTNER_DETAIL_TAB_READ_MODULE = Object.freeze({
  'basic-details': 'Partner',
  contacts: 'Partner',
  tasks: 'Task',
  events: 'Partner',
  attachments: 'Partner',
  activities: null,
});

/** Placeholder detail data – wire to API later */
export const PARTNER_DETAIL_MOCK_DATA = {
  partner_name: 'GrowthX',
  website: 'https://growthx.club',
  primary_category: 'B2B',
  secondary_category: 'Startup Community',
  partner_base_city: 'Bangalore',
  company_size: '11-50',
  industry_type: 'Technology',
  contact: [
    {
      contact_name: 'Priya Mehta',
      contact_designation: 'Partnership Lead',
      contact_email: 'priya@growthx.in',
      mobile_number: '+91-9876543210',
      is_primary: 1,
    },
  ],
  revenue_model: [
    { revenue_model: 'Social Media Barter' },
    { revenue_model: 'Community Access Barter' },
  ],
  estimated_engagement_frequency: 'Quarterly',
  partner_owner: 'Muskan Heda',
  onboarding_stage: 'Active',
  internal_description: 'Startup community partner focused on founder programs.',
};

/** Filter vertical tab keys and labels */
export const PARTNER_FILTER_VERTICAL_TABS = [
  { value: 'primaryCategory', label: 'Primary Category' },
  { value: 'secondaryCategory', label: 'Secondary Category' },
  { value: 'industry', label: 'Industry' },
  { value: 'baseCity', label: 'Base City' },
  { value: 'companySize', label: 'Company Size' },
  { value: 'revenueModel', label: 'Revenue Model' },
  { value: 'engagementFrequency', label: 'Engagement Frequency' },
  { value: 'owner', label: 'Owner' },
];

/** Filter options per category (static for now; can be API-driven later) */
export const PARTNER_FILTER_PRIMARY_CATEGORY_OPTIONS = [
  { value: 'B2B', label: 'B2B' },
  { value: 'B2C', label: 'B2C' },
  { value: 'Both', label: 'Both' },
];

export const PARTNER_FILTER_SECONDARY_CATEGORY_OPTIONS = [
  { value: 'Startup Community', label: 'Startup Community' },
  { value: 'Payments Partner', label: 'Payments Partner' },
  { value: 'Gym / Fitness', label: 'Gym / Fitness' },
  { value: 'Printing & Stationery', label: 'Printing & Stationery' },
  { value: 'Hotel / Stay Partner', label: 'Hotel / Stay Partner' },
  { value: 'Catering Services', label: 'Catering Services' },
  { value: 'Cloud / Hosting', label: 'Cloud / Hosting' },
  { value: 'Brand', label: 'Brand' },
  { value: 'Day Care', label: 'Day Care' },
  { value: 'Courier / Logistics', label: 'Courier / Logistics' },
  { value: 'Legal Services', label: 'Legal Services' },
  { value: 'Co-working Aggregator', label: 'Co-working Aggregator' },
  { value: 'Insurance Partner', label: 'Insurance Partner' },
  { value: 'Digital Marketing', label: 'Digital Marketing' },
  { value: 'Photography / Video', label: 'Photography / Video' },
  { value: 'Event Management', label: 'Event Management' },
  { value: 'Banking Partner', label: 'Banking Partner' },
];

/**
 * Partner DocType `industry_type` — must match Frappe select options exactly.
 * Server allows "" or one of these values.
 */
export const PARTNER_INDUSTRY_TYPE_CHOICES = [
  'Consulting',
  'FinTech',
  'Wellness',
  'Manufacturing',
  'Hospitality',
  'Logistics',
  'Technology',
  'Legal',
  'Retail',
  'Education',
  'Healthcare',
  'Real Estate',
  'Media',
];

export const PARTNER_INDUSTRY_TYPE_OPTIONS = PARTNER_INDUSTRY_TYPE_CHOICES.map((value) => ({
  value,
  label: value,
}));

/** List/filter + detail inline select */
export const PARTNER_FILTER_INDUSTRY_OPTIONS = PARTNER_INDUSTRY_TYPE_OPTIONS;

export const PARTNER_FILTER_BASE_CITY_OPTIONS = [
  { value: 'Ahmedabad', label: 'Ahmedabad' },
  { value: 'Bangalore', label: 'Bangalore' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Hyderabad', label: 'Hyderabad' },
  { value: 'Surat', label: 'Surat' },
  { value: 'Vadodara', label: 'Vadodara' },
  { value: 'Chennai', label: 'Chennai' },
];

export const PARTNER_FILTER_COMPANY_SIZE_OPTIONS = [
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '500+', label: '500+' },
];

export const PARTNER_FILTER_REVENUE_MODEL_OPTIONS = [
  { value: 'Brand Collaboration', label: 'Brand Collaboration' },
  { value: 'Community Access Barter', label: 'Community Access Barter' },
  { value: 'Space Barter', label: 'Space Barter' },
  { value: 'Social Media Barter', label: 'Social Media Barter' },
  { value: 'Complimentary', label: 'Complimentary' },
  { value: 'Space Rental (Paid)', label: 'Space Rental (Paid)' },
  { value: 'Sponsorship-Based', label: 'Sponsorship-Based' },
  { value: 'Ticketed Event (Partner Managed)', label: 'Ticketed Event (Partner Managed)' },
  { value: 'Commission-Based', label: 'Commission-Based' },
];

export const PARTNER_FILTER_ENGAGEMENT_FREQUENCY_OPTIONS = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Bi-annually', label: 'Bi-annually' },
  { value: 'Annually', label: 'Annually' },
  { value: 'Ad-hoc', label: 'Ad-hoc' },
];

/** Icons for partner onboarding stage tabs (labels from Status Configuration API). */
export const PARTNER_ONBOARDING_STAGE_TAB_ICONS = {
  'Lead Identified': RiFlagLine,
  'Initial Discussion': RiChat3Line,
  'Proposal Shared': RiFileList2Line,
  'Commercial Finalized': RiHandCoinLine,
  'Agreement Signed': RiFileTextLine,
  Active: RiCheckboxCircleLine,
  Inactive: RiCloseCircleLine,
};

/** Build list-page stage tabs from `getStatusOptions` (Partner / onboarding_stage). */
export function buildPartnerStageTabOptionsFromDynamic(dynamicRows) {
  const rows = Array.isArray(dynamicRows) ? dynamicRows : [];
  if (rows.length === 0) return null;
  return [
    { value: 'all', label: 'All', icon: RiLayoutGridLine },
    ...rows.map((o) => ({
      value: o.value,
      label: o.label || o.value,
      icon: PARTNER_ONBOARDING_STAGE_TAB_ICONS[o.value] || RiUserSharedLine,
    })),
  ];
}

/** Partner create form options (kept separate from filter options) */
export const PARTNER_CREATE_PRIMARY_CATEGORY_OPTIONS = [
  { value: 'B2B', label: 'B2B' },
  { value: 'B2C', label: 'B2C' },
  { value: 'Both', label: 'Both' },
];

export const PARTNER_CREATE_SECONDARY_CATEGORY_OPTIONS = [
  { value: 'Startup Community', label: 'Startup Community' },
  { value: 'Payments Partner', label: 'Payments Partner' },
  { value: 'Gym / Fitness', label: 'Gym / Fitness' },
  { value: 'Printing & Stationery', label: 'Printing & Stationery' },
  { value: 'Hotel / Stay Partner', label: 'Hotel / Stay Partner' },
  { value: 'Catering Services', label: 'Catering Services' },
  { value: 'Cloud / Hosting', label: 'Cloud / Hosting' },
  { value: 'Brand', label: 'Brand' },
];

export const PARTNER_CREATE_COMPANY_SIZE_OPTIONS = [
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '500+', label: '500+' },
];

export const PARTNER_CREATE_INDUSTRY_TYPE_OPTIONS = PARTNER_INDUSTRY_TYPE_OPTIONS;

export const PARTNER_CREATE_PREFERRED_REVENUE_MODELS = [...PARTNER_FILTER_REVENUE_MODEL_OPTIONS];

export const PARTNER_CREATE_ENGAGEMENT_FREQUENCY_OPTIONS = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Bi-annually', label: 'Bi-annually' },
  { value: 'Annually', label: 'Annually' },
  { value: 'Ad-hoc', label: 'Ad-hoc' },
];

export const PARTNER_FILTER_OWNER_OPTIONS = [
  { value: 'Karan Madan', label: 'Karan Madan' },
  { value: 'Mehul Taunk', label: 'Mehul Taunk' },
  { value: 'Muskan Heda', label: 'Muskan Heda' },
  { value: 'Parth Shah', label: 'Parth Shah' },
  { value: 'Priyanka Chandnani', label: 'Priyanka Chandnani' },
  { value: 'Rameshwari Mulewar', label: 'Rameshwari Mulewar' },
  { value: 'Shivangi Shakya', label: 'Shivangi Shakya' },
];

/** Stage → badge color mapping for partner cards */
export const PARTNER_STAGE_BADGE_COLORS = {
  Active: 'green',
  'Agreement Signed': 'blue',
  'Commercial Finalized': 'orange',
  /** Legacy rows until DB patch normalizes label */
  'Commercials Finalized': 'orange',
  'Initial Discussion': 'sky',
  'Proposal Shared': 'yellow',
  'Lead Identified': 'gray',
  Inactive: 'gray',
};

export const PARTNER_STAGE_COLOR_CODE_MAP = {
  'Lead Identified': { bg: '#EEF2FF', text: '#3730A3' },
  'Initial Discussion': { bg: '#E0F2FE', text: '#0C4A6E' },
  'Proposal Shared': { bg: '#FEF3C7', text: '#92400E' },
  'Commercial Finalized': { bg: '#FFE4E6', text: '#9F1239' },
  'Commercials Finalized': { bg: '#FFE4E6', text: '#9F1239' },
  'Agreement Signed': { bg: '#F3E8FF', text: '#6B21A8' },
  Active: { bg: '#DCFCE7', text: '#166534' },
  Inactive: { bg: '#F3F4F6', text: '#374151' },
};

/** Partner detail → Activities tab: fallbacks when `get_partner_activities` omits option lists */
export const PARTNER_ACTIVITIES_DEFAULT_ACTIVITY_FILTER_OPTIONS = [
  { value: 'all', label: 'All Activities' },
  { value: 'partner', label: 'Partner' },
  { value: 'task', label: 'Task' },
];

export const PARTNER_ACTIVITIES_DEFAULT_TIME_FRAME_OPTIONS = [
  { value: 'all', label: 'All Time Periods' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'older', label: 'Older' },
];

/**
 * CRM task statuses for Partner record–scoped tasks (partner detail → Tasks tab + drawer).
 * Same four statuses as client/vendor document tasks: Pending, Ongoing, Overdue, Completed.
 * Partner Master in Settings continues to use Active/Inactive from onboarding constants.
 */
export const PARTNER_INDIVIDUAL_CRM_TASK_STATUS_OPTIONS = TASK_STATUS_OPTIONS;

export const PARTNER_INDIVIDUAL_CRM_TASK_DEFAULT_STATUS = 'Pending';

// const PARTNER_DETAIL_TAB_OPTIONS = [
//   { value: 'basic-details', label: 'Basic Details' },
//   { value: 'contacts', label: 'Contacts' },
//   { value: 'events', label: 'Events' },
//   { value: 'attachments', label: 'Attachments' },
//   { value: 'activities', label: 'Activities' },
// ];

/** Avatar background colors for partner card initials */
export const PARTNER_AVATAR_COLORS = [
  'bg-success-base',
  'bg-information-base',
  'bg-feature-base',
  'bg-warning-base',
  'bg-highlighted-base',
  'bg-destructive-base',
  'bg-primary-base',
  'bg-secondary-base',
  'bg-tertiary-base',
  'bg-quaternary-base',
  'bg-quinary-base',
  'bg-senary-base',
  'bg-septenary-base',
  'bg-octonary-base',
];

export const DEFAULT_PARTNER_COLUMNS = [
  { id: 'partner_name', label: 'Partner Name', visible: true, enableHiding: false },
  { id: 'primary', label: 'Primary', visible: true },
  { id: 'secondary', label: 'Secondary', visible: true },
  { id: 'industry', label: 'Industry', visible: true },
  { id: 'city', label: 'City', visible: true },
  { id: 'size', label: 'Size', visible: true },
  { id: 'revenue_model', label: 'Revenue Model', visible: true },
  { id: 'frequency', label: 'Frequency', visible: true },
];

/** Settings > Partner Task Master — Status / Priority filter (Task Master). */
export const PARTNER_TASK_MASTER_FILTER_TABS = {
  STATUS: 'status',
  PRIORITY: 'priority',
};

export const PARTNER_TASK_MASTER_FILTER_TAB_CONFIG = [
  { value: PARTNER_TASK_MASTER_FILTER_TABS.STATUS, label: 'Status' },
  { value: PARTNER_TASK_MASTER_FILTER_TABS.PRIORITY, label: 'Priority' },
];

export const PARTNER_TASK_MASTER_FILTER_OPTION = {
  status: [],
  priority: [],
};

export const PARTNER_TASK_MASTER_FILTERS_KEY = 'partner-task-master-filters';
