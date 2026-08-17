/**
 * CRM Contacts module — constants and column configuration.
 */

import { DEFAULT_DATETIME_FILTER } from '@/components/crm-accounts/constants';
import {
  RiFocus2Line,
  RiUserHeartLine,
  RiBriefcaseLine,
  RiLockUnlockLine,
  RiVipCrownLine,
} from 'react-icons/ri';

export const CRM_CONTACTS_STATUS_OPTIONS = [
  { value: 'all', label: 'All', icon: null },
  { value: 'MQL', label: 'MQL', icon: RiFocus2Line },
  { value: 'SQL', label: 'SQL', icon: RiUserHeartLine },
  { value: 'Opportunity', label: 'Opportunity', icon: RiBriefcaseLine },
  { value: 'Closure', label: 'Closure', icon: RiLockUnlockLine },
  { value: 'Customer', label: 'Customer', icon: RiVipCrownLine },
];

export const GROUPS_BY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'account', label: 'Account' },
  { value: 'sales_owner', label: 'Sales Owner' },
  { value: 'designation', label: 'Designation' },
  { value: 'department', label: 'Department' },
  { value: 'city', label: 'City' },
  { value: 'subscription_status', label: 'Subscription Status' },
];

export const CONTACT_FILTER_TABS = {
  ACCOUNT: 'account',
  SALES_OWNER: 'sales_owner',
  DESIGNATION: 'designation',
  DEPARTMENT: 'department',
  CITY: 'city',
  SUBSCRIPTION_STATUS: 'subscription_status',
  CREATED_AT: 'created_at',
  LAST_MODIFIED: 'last_modified_at',
};

export const CONTACT_FILTER_TAB_CONFIG = [
  { value: CONTACT_FILTER_TABS.ACCOUNT, label: 'Account' },
  { value: CONTACT_FILTER_TABS.SALES_OWNER, label: 'Sales Owner' },
  { value: CONTACT_FILTER_TABS.DESIGNATION, label: 'Designation' },
  { value: CONTACT_FILTER_TABS.DEPARTMENT, label: 'Department' },
  { value: CONTACT_FILTER_TABS.CITY, label: 'City' },
  { value: CONTACT_FILTER_TABS.SUBSCRIPTION_STATUS, label: 'Subscription Status' },
  { value: CONTACT_FILTER_TABS.CREATED_AT, label: 'Created At' },
  { value: CONTACT_FILTER_TABS.LAST_MODIFIED, label: 'Last Modified' },
];

export const SALES_OWNER_OPTIONS = [
  { value: 'Guy Hawkins', label: 'Guy Hawkins' },
  { value: 'Darrell Steward', label: 'Darrell Steward' },
  { value: 'Ralph Edwards', label: 'Ralph Edwards' },
  { value: 'Savannah Nguyen', label: 'Savannah Nguyen' },
  { value: 'Esther Howard', label: 'Esther Howard' },
  { value: 'Courtney Henry', label: 'Courtney Henry' },
  { value: 'Floyd Miles', label: 'Floyd Miles' },
];

export const DESIGNATION_OPTIONS = [
  { value: 'CEO', label: 'CEO' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Developer', label: 'Developer' },
  { value: 'HR', label: 'HR' },
];

export const DEPARTMENT_OPTIONS = [
  { value: 'Sales', label: 'Sales' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Human Resources', label: 'Human Resources' },
];

export const CITY_OPTIONS = [
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Bangalore', label: 'Bangalore' },
];

export const LIFECYCLE_STAGE_OPTIONS = [
  { value: 'Subscriber', label: 'Subscriber' },
  { value: 'Lead', label: 'Lead' },
  { value: 'MQL', label: 'MQL' },
  { value: 'SQL', label: 'SQL' },
  { value: 'Opportunity', label: 'Opportunity' },
  { value: 'Customer', label: 'Customer' },
];

export const LIFECYCLE_STATUS_MAP = {
  Subscriber: [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ],
  Lead: [
    { value: 'New', label: 'New' },
    { value: 'In Conversation', label: 'In Conversation' },
    { value: 'Lead Drop', label: 'Lead Drop' },
  ],
  MQL: [
    { value: 'MQL Qualified', label: 'MQL Qualified' },
    { value: 'MQL Drop', label: 'MQL Drop' },
  ],
  SQL: [
    { value: 'SQL Qualified', label: 'SQL Qualified' },
    { value: 'SQL Drop', label: 'SQL Drop' },
  ],
  Opportunity: [
    { value: 'Nurturing', label: 'Nurturing' },
    { value: 'Closure', label: 'Closure' },
    { value: 'Opportunity Drop', label: 'Opportunity Drop' },
  ],
  Customer: [
    { value: 'Active', label: 'Active' },
    { value: 'Churned', label: 'Churned' },
  ],
};

export const LOST_REASON_OPTIONS = [
  { value: 'Price too high', label: 'Price too high' },
  { value: 'Competitor chosen', label: 'Competitor chosen' },
  { value: 'No budget', label: 'No budget' },
  { value: 'Not interested', label: 'Not interested' },
  { value: 'Location issue', label: 'Location issue' },
  { value: 'Other', label: 'Other' },
];

/** Sentinel for "no selection" — Radix Select does not allow value="". */
export const SELECT_NONE_VALUE = '__none__';

/** Fallback when API does not return subscription_status (Link to CRM Subscription Status). */
export const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: SELECT_NONE_VALUE, label: '—' },
  { value: 'Subscribed', label: 'Subscribed' },
  { value: 'Unsubscribed', label: 'Unsubscribed' },
  { value: 'Not Subscribed', label: 'Not Subscribed' },
  { value: 'Reported as Spam', label: 'Reported as Spam' },
  { value: 'Bounced', label: 'Bounced' },
];

/** Options for Unsubscribed Reason (Link to Contact Unsubscribed Reason). Populate from API or keep static. */
export const UNSUBSCRIBED_REASON_OPTIONS = [
  { value: SELECT_NONE_VALUE, label: 'Select' },
  { value: 'No longer interested', label: 'No longer interested' },
  { value: 'Too many emails', label: 'Too many emails' },
  { value: 'Content not relevant', label: 'Content not relevant' },
  { value: 'Other', label: 'Other' },
];

export const SUBSCRIPTION_TYPE_OPTIONS = [
  { value: 'Newsletter', label: 'Newsletter' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Product Updates', label: 'Product Updates' },
  { value: 'Promotion', label: 'Promotion' },
  { value: 'Events', label: 'Events' },
  { value: 'Webinars', label: 'Webinars' },
  { value: 'Company News', label: 'Company News' },
  { value: 'Special Offers', label: 'Special Offers' },
  { value: 'Partners', label: 'Partners' },
  { value: 'Security Alerts', label: 'Security Alerts' },
  { value: 'Billing', label: 'Billing' },
  { value: 'Customer Success', label: 'Customer Success' },
];

/** Status options for filter dropdown (excludes "All"). */
export const CONTACT_STATUS_FILTER_OPTIONS = CRM_CONTACTS_STATUS_OPTIONS.filter(
  (o) => o.value !== 'all',
);

/** Account names for filter; can be replaced by API later. */
export const ACCOUNT_OPTIONS = [
  { value: 'Avenue Reality', label: 'Avenue Reality' },
  { value: 'One Advanced', label: 'One Advanced' },
];

export const DEFAULT_CONTACT_FILTERS = {
  account: [],
  sales_owner: [],
  designation: [],
  department: [],
  city: [],
  subscription_status: [],
  created_at: { ...DEFAULT_DATETIME_FILTER },
  last_modified_at: { ...DEFAULT_DATETIME_FILTER },
};

export const CONTACT_COLUMN_DEFS = [
  { id: 'name', label: 'Name', visible: true, enableHiding: false },
  { id: 'account', label: 'Account', visible: true },
  { id: 'cp_account', label: 'CP Account', visible: false },
  { id: 'cp_contact', label: 'CP Contact', visible: false },
  { id: 'created_at', label: 'Created At', visible: true },
  { id: 'last_modified_at', label: 'Last Modified', visible: true },
  { id: 'sales_owner', label: 'Sales Owner', visible: true },
  { id: 'email', label: 'Email', visible: true },
  { id: 'designation', label: 'Designation', visible: true },
  { id: 'department', label: 'Department', visible: true },
  { id: 'mobile_number', label: 'Contact', visible: true },
  { id: 'alt_mobile_number', label: 'Alternate Contact', visible: true },
  { id: 'dob', label: 'DOB', visible: true },
  { id: 'age', label: 'Age', visible: true },
  { id: 'city', label: 'City', visible: true },
  { id: 'subscription_status', label: 'Subscription Status', visible: true },
  { id: 'subscription_type', label: 'Subscription Type', visible: true },
  { id: 'unsubscribe_reason', label: 'Unsubscribe Reason', visible: true },
];

export const CONTACT_COLUMN_MIN_WIDTH = 120;
export const CONTACT_COLUMN_MAX_WIDTH = 500;

export const CONTACT_COLUMN_STORAGE_KEY = 'crm-contacts-column-widths';
export const CONTACT_RESIZE_ENABLED_KEY = 'crm-contacts-resize-enabled';

/** Separate list view for contacts inside an account detail (own column prefs & widths). */
export const REACT_TABLE_ID_ACCOUNT_CONTACTS = 'crm-contacts-table-account-detail';
export const ACCOUNT_CONTACTS_COLUMN_STORAGE_KEY = 'crm-contacts-column-widths-account-detail';
export const ACCOUNT_CONTACTS_RESIZE_ENABLED_KEY = 'crm-contacts-resize-enabled-account-detail';

/** Contact list inside lead detail (read-only, one row). */
export const REACT_TABLE_ID_LEAD_CONTACT = 'crm-contacts-table-lead-detail';
export const LEAD_CONTACT_COLUMN_STORAGE_KEY = 'crm-contacts-column-widths-lead-detail';
export const LEAD_CONTACT_RESIZE_ENABLED_KEY = 'crm-contacts-resize-enabled-lead-detail';

export const DEFAULT_CONTACT_COLUMN_WIDTHS = {
  name: 200,
  account: 180,
  cp_account: 180,
  cp_contact: 180,
  created_at: 160,
  last_modified_at: 190,
  sales_owner: 180,
  email: 220,
  designation: 150,
  department: 150,
  mobile_number: 150,
  alt_mobile_number: 150,
  dob: 155,
  age: 80,
  city: 120,
  subscription_status: 160,
  subscription_type: 200,
  unsubscribe_reason: 200,
  actions: 60,
};

/** ~px per character at paragraph-xs for rough content-based min widths. */
export const CONTACT_COLUMN_CONTENT_PX_PER_CHAR = 7;

/** Extra pixels beyond text (cell padding, pill borders, gap). Actions column is separate. */
export const CONTACT_COLUMN_CONTENT_WIDTH_PAD = 72;

/** Longest expected single-line labels (dropdown options / date display). */
export const CONTACT_COLUMN_CONTENT_MIN_CHARS = {
  dob: 12,
  subscription_status: 16,
  unsubscribe_reason: 20,
};

/**
 * Min width per column from the longest single-line string in current rows.
 * Skips subscription_type (multi-value + "+N" pattern should keep default width).
 */
export function computeContactDataMinWidths(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return {};

  const getters = {
    name: (r) => String(r.name || '').trim(),
    account: (r) => String(r.account || '').trim(),
    cp_account: (r) => String(r.cp_account_name || r.cp_account || '').trim(),
    cp_contact: (r) => String(r.cp_contact_name || r.cp_contact || '').trim(),
    email: (r) => String(r.email || '').trim(),
    sales_owner: (r) => String(r.sales_owner || '').trim(),
    designation: (r) => String(r.designation || '').trim(),
    department: (r) => String(r.department || '').trim(),
    mobile_number: (r) => String(r.mobile_number || '').trim(),
    alt_mobile_number: (r) => String(r.alt_mobile_number || '').trim(),
    city: (r) => String(r.city || '').trim(),
    subscription_status: (r) => String(r.subscription_status || '').trim(),
    unsubscribe_reason: (r) => String(r.unsubscribe_reason || '').trim(),
  };

  const out = {};
  for (const [colId, getStr] of Object.entries(getters)) {
    let maxLen = 0;
    for (const row of rows) {
      const len = getStr(row).length;
      if (len > maxLen) maxLen = len;
    }
    const floor = CONTACT_COLUMN_CONTENT_MIN_CHARS[colId];
    if (floor) maxLen = Math.max(maxLen, floor);
    if (maxLen === 0) continue;
    const w = Math.ceil(
      maxLen * CONTACT_COLUMN_CONTENT_PX_PER_CHAR + CONTACT_COLUMN_CONTENT_WIDTH_PAD,
    );
    out[colId] = Math.min(CONTACT_COLUMN_MAX_WIDTH, Math.max(CONTACT_COLUMN_MIN_WIDTH, w));
  }
  return out;
}

export const EMPTY_STATES = {
  default: {
    title: 'No contacts yet',
    description: 'Start by adding your first contact to manage all CRM contacts in one place.',
  },
  search: {
    title: 'No contacts match your filters',
    description: 'Try adjusting your search term, status, or filters to see more contacts.',
  },
};

// Status badge map
export const CONTACT_STATUS_BADGE_MAP = {
  mql: { color: 'yellow', label: 'MQL' },
  sql: { color: 'blue', label: 'SQL' },
  opportunity: { color: 'purple', label: 'Opportunity' },
  closure: { color: 'orange', label: 'Closure' },
  customer: { color: 'green', label: 'Customer' },
};

// Lifecycle stage badge map
export const LIFECYCLE_STAGE_BADGE_MAP = {
  subscriber: { color: 'blue', label: 'Subscriber' },
  lead: { color: 'yellow', label: 'Lead' },
  mql: { color: 'orange', label: 'MQL' },
  sql: { color: 'purple', label: 'SQL' },
  opportunity: { color: 'cyan', label: 'Opportunity' },
  customer: { color: 'green', label: 'Customer' },
  evangelist: { color: 'pink', label: 'Evangelist' },
  other: { color: 'gray', label: 'Other' },
};

export const TASK_COLUMN_MIN_WIDTH = 100;
export const TASK_COLUMN_MAX_WIDTH = 600;

export const CONTACT_TASKS_COLUMN_STORAGE_KEY = 'crm-contact-tasks-column-widths';
export const CONTACT_TASKS_RESIZE_ENABLED_KEY = 'crm-contact-tasks-resize-enabled';

export const DEFAULT_TASK_COLUMN_WIDTHS = {
  task: 350,
  assignee: 120,
  type: 120,
  lifecycle_stage: 150,
  lifecycle_stage_status: 160,
  due_date: 120,
  tags: 230,
  priority: 140,
  status: 140,
  description: 350,
  attachments: 150,
  created_by: 200,
  created_at: 200,
  last_updated: 200,
};

/** CRM Contact detail tab key → sidebar module name for `read`. */
export const CRM_CONTACT_DETAIL_TAB_READ_MODULE = Object.freeze({
  about: 'CRM Contact',
  tasks: 'ACL Task',
  account: 'CRM Account',
  leads: 'CRM Lead',
  proposals: null,
  activities: null,
});
