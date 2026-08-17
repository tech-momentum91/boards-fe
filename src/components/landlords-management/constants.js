import {
  RiUserLine,
  RiCheckDoubleLine,
  RiCloseLine,
  RiUserFollowLine,
  RiUserUnfollowLine,
} from 'react-icons/ri';

import { NO_CENTERS_EMPTY_STATE } from '@/utils/global-center-filter';

export const STATUS_TAB_OPTIONS = [
  { value: 'Active', label: 'Active Landlord', icon: RiUserFollowLine },
  { value: 'Inactive', label: 'Inactive Landlords', icon: RiUserUnfollowLine },
];

export const DEFAULT_FILTERS = {
  search: '',
  status: 'Active', // 'all' means "All Status"
};

export const ENGAGEMENT_MODE_OPTIONS = [
  { value: 'Straight Lease', label: 'Straight Lease' },
  { value: 'Bare Shell', label: 'Bare Shell' },
  { value: 'Furnished By Landlord', label: 'Furnished By Landlord' },
];

export const EMPTY_STATES = {
  default: {
    title: 'No landlords yet',
    description: 'Create your first landlord to get started.',
  },
  search: {
    title: 'No landlords match these filters',
    description: 'Try adjusting filters or clearing search.',
  },
  no_centers: NO_CENTERS_EMPTY_STATE,
};

/** Values match landlord list row fields used for client-side grouping */
export const LANDLORDS_GROUP_BY_OPTIONS = [
  { value: 'center', label: 'Centre' },
  { value: 'state', label: 'State' },
  { value: 'city', label: 'City' },
  { value: 'engagement_mode', label: 'Eng mode' },
  { value: 'status', label: 'Status' },
];

/** Row keys on landlord list rows used for client-side grouping (same pattern as agreements). */
export const LANDLORDS_GROUP_BY_FIELD_MAP = {
  center: 'center_name',
  state: 'state',
  city: 'city',
  engagement_mode: 'engagement_mode',
  status: 'status',
};

export const getDepartmentOptions = (departmentList) => {
  return (departmentList?.data ?? [])
    .filter((d) => d.department_name !== 'All Departments' && d.department_name !== 'Other')
    .map((d) => ({
      label: d.department_name,
      value: d.department_name,
    }));
};

/** Landlord detail main tab id → sidebar module name for `read`. */
export const LANDLORD_DETAIL_TAB_READ_MODULE = Object.freeze({
  about: 'Landlord',
  agreements: null,
  billing: 'Client Billing',
  activities: null,
});
