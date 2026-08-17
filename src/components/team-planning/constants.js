export const TEAM_PLANNING_DOCTYPE = 'Team Planning Allocation';

export const VIEW_MODE_OPTIONS = [
  { value: 'monthly_capacity', label: 'Monthly Capacity' },
  { value: 'weekly_allocation', label: 'Weekly Allocation' },
  { value: 'bench', label: 'Bench' },
];

export const BENCH_MAX_VISIBLE_MEMBERS = 3;

export const getFreePercentageBadgeClass = (percentage) => {
  const value = Number(percentage) || 0;
  if (value >= 50) {
    return 'bg-[#C7E5D6] text-[#0B4627]';
  }
  return 'bg-[#FBDFB1] text-[#693D11]';
};

export const ALLOCATION_STATUS_CONFIG = {
  bench: { label: 'Bench / Free', color: 'gray', badgeColor: 'gray' },
  underutilized: { label: 'Underutilized', color: 'orange', badgeColor: 'orange' },
  healthy: { label: 'Healthy', color: 'green', badgeColor: 'green' },
  at_capacity: { label: 'At Capacity', color: 'blue', badgeColor: 'blue' },
  overloaded: { label: 'Overloaded', color: 'red', badgeColor: 'red' },
};

export const TEAM_PLANNING_STATS_CONFIG = [
  {
    key: 'total',
    label: 'Total',
    icon: 'group',
    gradient: 'from-[#CAC2FF] to-[#EEEBFF]',
    textColor: 'text-[#2B1664]',
    iconWrap: 'bg-white/90',
    iconColor: 'fill-[#5A36BF]',
  },
  {
    key: 'bench',
    label: 'Bench / Free',
    icon: 'user',
    gradient: 'from-[#FBEDB1] to-[#FEF7EC]',
    textColor: 'text-[#693D11]',
    iconWrap: 'bg-white/90',
    iconColor: 'fill-[#B47818]',
  },
  {
    key: 'under_50',
    label: '<50%',
    icon: 'briefcase',
    gradient: 'from-[#C2D6FF] to-[#EBF1FF]',
    textColor: 'text-[#162664]',
    iconWrap: 'bg-white/90',
    iconColor: 'fill-[#253EA7]',
  },
  {
    key: 'over_50',
    label: '>50%',
    icon: 'briefcase',
    gradient: 'from-[#F9C2FF] to-[#FDEBFF]',
    textColor: 'text-[#620F6C]',
    iconWrap: 'bg-white/90',
    iconColor: 'fill-[#9C23A9]',
  },
  {
    key: 'overloaded',
    label: 'Overloaded',
    icon: 'alert',
    gradient: 'from-[#F9D2DA] to-[#FDEDF0]',
    textColor: 'text-[#710E21]',
    iconWrap: 'bg-white/90',
    iconColor: 'fill-[#AF1D38]',
  },
];

export const VIEW_BY_OPTIONS = [
  { value: 'departments', label: 'Departments' },
  { value: 'projects', label: 'Projects' },
];

/** Badge for allocated % (Available Bench). Always shown, including 0%. */
export const getAllocatedPercentageBadgeClass = (percentage) => {
  const value = Number(percentage) || 0;
  if (value >= 50) {
    return 'bg-[#FBDFB1] text-[#693D11]';
  }
  return 'bg-[#C7E5D6] text-[#0B4627]';
};

export const DEFAULT_TEAM_PLANNING_FILTERS = {
  search: '',
  view_mode: 'monthly_capacity',
  planning_year: new Date().getFullYear(),
  planning_month: null,
  planning_week_start: null,
  member: 'all',
  department: 'all',
  project: 'all',
  view_by: 'departments',
};

export const MONTH_FILTER_OPTIONS = [
  { value: '1', label: 'Jan' },
  { value: '2', label: 'Feb' },
  { value: '3', label: 'Mar' },
  { value: '4', label: 'Apr' },
  { value: '5', label: 'May' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' },
  { value: '8', label: 'Aug' },
  { value: '9', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
];

const getOrdinalSuffix = (day) => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

/** Parse YYYY-MM-DD (or Date) as a local calendar date to avoid UTC month/day shifts. */
export const parseLocalDateString = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  const str = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatWeekRangeLabel = (weekStart) => {
  if (!weekStart) return '';
  const start = parseLocalDateString(weekStart);
  if (!start) return '';
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const yearSuffix = String(end.getFullYear()).slice(-2);
  return `${startDay}${getOrdinalSuffix(startDay)} ${startMonth} - ${endDay}${getOrdinalSuffix(endDay)} ${endMonth} ${yearSuffix}`;
};

/** Single day label for weekly day-cell allocation modals (e.g. "15th Jul 2026"). */
export const formatPlanningDayLabel = (value) => {
  if (!value) return '';
  const date = parseLocalDateString(value);
  if (!date) return '';
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
};

export const getMondayOfWeek = (value) => {
  const date = value instanceof Date ? new Date(value) : parseLocalDateString(value);
  if (!date || Number.isNaN(date.getTime())) return new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const addWeeks = (value, weeks) => {
  const date = getMondayOfWeek(value);
  date.setDate(date.getDate() + weeks * 7);
  return date;
};

export const toPlanningMonthValue = (year, month) => {
  const monthNumber = Number(month);
  if (!year || !monthNumber) return null;
  return `${year}-${String(monthNumber).padStart(2, '0')}-01`;
};

export const getMonthValueFromDate = (value) => {
  if (!value) return String(new Date().getMonth() + 1);
  const date = parseLocalDateString(value);
  if (!date) return String(new Date().getMonth() + 1);
  return String(date.getMonth() + 1);
};

export const getWeekStartForMonth = (year, month) => {
  const monthNumber = Number(month);
  const firstOfMonth = new Date(year, monthNumber - 1, 1);
  return getMondayOfWeek(firstOfMonth);
};

export const toDateInputValue = (value) => {
  const date = value instanceof Date ? value : parseLocalDateString(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CLIENT_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'Onboarding', label: 'Onboarding' },
  { value: 'Engagement', label: 'Engagement' },
  { value: 'On Notice', label: 'On Notice' },
  { value: 'Exited', label: 'Exited' },
];

export const formatPlanningMonthLabel = (planningMonth) => {
  if (!planningMonth) return '';
  const date = parseLocalDateString(planningMonth);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

export const getAllocationStatusConfig = (status) =>
  ALLOCATION_STATUS_CONFIG[status] || ALLOCATION_STATUS_CONFIG.bench;

export const getProjectPercentageBadgeClass = (percentage) => {
  const value = Number(percentage) || 0;
  if (value >= 50) {
    return 'bg-[#FBDFB1] text-[#693D11]';
  }
  return 'bg-[#C7E5D6] text-[#0B4627]';
};

export const getAllocationCellFooterConfig = (totalPercentage, projectCount = 0) => {
  const total = Number(totalPercentage) || 0;
  const count = Number(projectCount) || 0;

  if (total > 100) {
    return {
      label: 'Overloaded',
      value: `${Math.round(total)}%`,
      barClassName: 'bg-[rgba(249,210,218,0.6)]',
      textClassName: 'text-[#AF1D38]',
    };
  }

  if (total === 100) {
    const hasHiddenProjects = count > 3;
    return {
      label: hasHiddenProjects ? 'Fully Occupied' : 'Availability',
      value: hasHiddenProjects ? '100%' : '0%',
      barClassName: 'bg-[rgba(251,223,177,0.6)]',
      textClassName: 'text-[#B47818]',
    };
  }

  const availability = Math.max(0, 100 - total);

  return {
    label: 'Availability',
    value: `${availability}%`,
    barClassName: 'bg-[rgba(199,229,211,0.6)]',
    textClassName: 'text-[#0B4627]',
  };
};

export const WEEKLY_PRIORITY_TASK_CATEGORIES = [
  { id: '3D Works', label: '3D Works' },
  { id: 'GFC Works', label: 'GFC Works' },
  { id: 'BOQ Works', label: 'BOQ Works' },
  { id: 'Graphics', label: 'Graphics' },
  { id: 'Selections', label: 'Selections' },
];

export const getProjectStageBadgeClass = () => 'bg-[#B5DFCC] text-[#045933]';

export const getTaskCompletionBadgeClass = (percentage) => {
  const value = Number(percentage) || 0;
  if (value >= 50) {
    return 'bg-[#C7E5D6] text-[#176448]';
  }
  return 'bg-[#FBDFB1] text-[#693D11]';
};

export const getTaskCompletionBarClass = (percentage) => {
  const value = Number(percentage) || 0;
  if (value >= 50) {
    return 'bg-[#079455]';
  }
  return 'bg-[#E6A23C]';
};
