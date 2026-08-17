import {
  RiMoneyDollarCircleLine,
  RiListCheck3,
  RiUserLine,
  RiTicketLine,
  RiLayoutGridLine,
  RiSettings2Line,
  RiBuildingLine,
  RiBox3Line,
  RiUser2Line,
  RiCalendarLine,
  RiTeamLine,
  RiFileTextLine,
  RiFileList2Line,
  RiInboxLine,
  RiUserStarLine,
  RiShakeHandsLine,
  RiUserFollowLine,
  RiGroupLine,
  RiUserReceivedLine,
  RiUserSharedLine,
  RiAccountCircleLine,
  RiPriceTag3Line,
  RiSuitcaseLine,
  RiUserSettingsLine,
  RiHammerLine,
  RiStackLine,
  RiAlertLine,
  RiArticleLine,
  RiBriefcaseLine,
  RiGitBranchLine,
  RiFundsLine,
  RiShoppingCartLine,
  RiTaskLine,
  RiBarChartBoxLine,
} from 'react-icons/ri';

import { GrGroup } from 'react-icons/gr';
import { getRole, getUserRole, hasModulePermission } from '@/utils/user-role-utils';

export const sidebar = {
  Bookings: {
    icon: <RiCalendarLine size={20} />,
    label: 'Bookings',
    tooltipContent: 'Bookings',
    path: '/bookings',
  },
  'Seat Inventory': {
    icon: <RiListCheck3 size={20} />,
    label: 'Seats Inventory',
    tooltipContent: 'Seats Inventory',
    path: '/seats',
  },
  Clients: {
    icon: <RiUserLine size={20} />,
    label: 'Clients',
    tooltipContent: 'Clients',
    path: '/clients',
  },
  Projects: {
    icon: <RiSuitcaseLine size={20} />,
    label: 'Projects',
    tooltipContent: 'Projects',
    path: '/projects',
  },
  'Billing & Collection': {
    icon: <RiMoneyDollarCircleLine size={20} />,
    label: 'Billing & Collection',
    tooltipContent: 'Billing & Collection',
    path: '/collection',
  },
  VMS: {
    icon: <RiUserFollowLine size={20} />,
    label: 'VMS',
    tooltipContent: 'VMS',
    path: '/vms/visitors',
  },
  Collections: {
    icon: <RiFundsLine size={20} />,
    label: 'Collections',
    tooltipContent: 'Collections',
    path: '/collections',
  },
  Opex: {
    icon: <RiMoneyDollarCircleLine size={20} />,
    label: 'OPEX',
    tooltipContent: 'OPEX',
    path: '/opex',
  },
  'Ticket Management': {
    icon: <RiTicketLine size={20} />,
    label: 'Tickets',
    tooltipContent: 'Tickets',
    path: '/ticket-management',
  },

  'DevX Tasks': {
    icon: <RiTicketLine size={20} />,
    label: 'Boards',
    tooltipContent: 'Boards',
    path: '/boards',
  },

  Dashboard: {
    icon: <RiLayoutGridLine size={20} />,
    label: 'Dashboard',
    tooltipContent: 'Dashboard',
    path: '/dashboard',
  },
  'Support Tickets': {
    icon: <RiTicketLine size={20} />,
    label: 'Support Tickets',
    tooltipContent: 'Support Tickets',
    path: '/support-tickets',
  },
  Landlords: {
    icon: <RiUser2Line size={20} />,
    label: 'Landlords',
    tooltipContent: 'Landlords',
    path: '/landlords',
  },
  Settings: {
    icon: <RiSettings2Line size={20} />,
    label: 'Settings',
    tooltipContent: 'Settings',
    path: '/settings',
  },
  'Release Note': {
    icon: <RiArticleLine size={20} />,
    label: 'Release Note',
    tooltipContent: 'Release Note',
    path: '/release-note',
  },
  Centers: {
    icon: <RiBuildingLine size={20} />,
    label: 'Centers',
    tooltipContent: 'Centers',
    path: '/centers',
  },
  Spaces: {
    icon: <RiBox3Line size={20} />,
    label: 'Spaces',
    tooltipContent: 'Spaces',
    path: '/spaces',
  },
  'Team Management': {
    icon: <RiTeamLine size={20} />,
    label: 'Team Management',
    tooltipContent: 'Team Management',
    path: '/team-management',
  },
  'Team Planning': {
    icon: <RiCalendarLine size={20} />,
    label: 'Team Planning',
    tooltipContent: 'Team Planning',
    path: '/team-planning',
  },
  // 'Event Management': {
  //   icon: <RiCalendarLine size={20} />,
  //   label: 'Event Management',
  //   tooltipContent: 'Event Management',
  //   path: '/events',
  // },
  Inbox: {
    icon: <RiInboxLine size={20} />,
    label: 'Inbox',
    tooltipContent: 'Inbox',
    path: '/inbox',
  },
  OPEX: {
    icon: <RiMoneyDollarCircleLine size={20} />,
    label: 'OPEX',
    tooltipContent: 'OPEX',
    path: '/opex',
  },
  Agreements: {
    icon: <RiFileTextLine size={20} />,
    label: 'Agreements',
    tooltipContent: 'Agreements',
    path: '/agreements/client',
  },
  'Landlord Agreement': {
    icon: <RiUser2Line size={20} />,
    label: 'Landlord',
    tooltipContent: 'Landlord',
    path: '/agreements/landlord',
  },
  Client: {
    icon: <RiUserLine size={20} />,
    label: 'Client',
    tooltipContent: 'Client',
    path: '/agreements/client',
  },
  Vendor: {
    icon: <GrGroup size={20} />,
    label: 'Vendor',
    tooltipContent: 'Vendor',
    path: '/agreements/vendor',
  },
  Vendors: {
    icon: <GrGroup size={20} />,
    label: 'Vendors',
    tooltipContent: 'Vendors',
    path: '/vendors',
  },
  Products: {
    icon: <RiBox3Line size={20} />,
    label: 'Products',
    tooltipContent: 'Products',
    path: '/products',
  },
  'Devx Events': {
    icon: <RiCalendarLine size={20} />,
    label: 'Events',
    tooltipContent: 'Events',
    path: '/events/spotlight',
  },
  // Keys 'Micro' and 'External' intentionally match the child names returned by the
  // sidebar/permissions API (sidebar[childLabel] lookup in buildSidebarSections).
  // Only the user-visible label/path values were updated here; do NOT rename the
  // object keys unless the backend permission payload is also renamed.
  Micro: {
    icon: <RiCalendarLine size={20} />,
    label: 'Spotlight',
    tooltipContent: 'Spotlight',
    path: '/events/spotlight',
  },
  Community: {
    icon: <RiCalendarLine size={20} />,
    label: 'Community',
    tooltipContent: 'Community',
    path: '/events/community',
  },
  External: {
    icon: <RiCalendarLine size={20} />,
    label: 'Hosted',
    tooltipContent: 'Hosted',
    path: '/events/hosted',
  },
  'Devx CRM': {
    icon: <RiUserStarLine size={20} />,
    label: 'Devx CRM',
    tooltipContent: 'Devx CRM',
    path: null,
  },
  Accounts: {
    icon: null,
    label: 'Accounts',
    tooltipContent: 'Accounts',
    path: '/crm/accounts',
  },
  Contacts: {
    icon: null,
    label: 'Contacts',
    tooltipContent: 'Contacts',
    path: '/crm/contacts',
  },
  Leads: {
    icon: null,
    label: 'Leads',
    tooltipContent: 'Leads',
    path: '/crm/leads',
  },
  Proposals: {
    icon: null,
    label: 'Proposals',
    tooltipContent: 'Proposals',
    path: '/crm/proposals',
  },
  'Channel Partner': {
    icon: <RiShakeHandsLine size={20} />,
    label: 'Channel Partner',
    tooltipContent: 'Channel Partner',
    path: '/channel-partner/accounts',
  },
  'CP Accounts': {
    label: 'CP Accounts',
    tooltipContent: 'CP Accounts',
    path: '/channel-partner/accounts',
  },
  'CP Contacts': {
    icon: <RiUserLine size={20} />,
    label: 'CP Contacts',
    tooltipContent: 'CP Contacts',
    path: '/channel-partner/contacts',
  },
  Partners: {
    icon: <RiUserLine size={20} />,
    label: 'Partners',
    tooltipContent: 'Partners',
    path: '/partner',
  },
  Product: {
    icon: <RiBox3Line size={20} />,
    label: 'Product',
    tooltipContent: 'Product',
    path: '/products',
  },
  Stocks: {
    icon: <RiBox3Line size={20} />,
    label: 'Stocks',
    tooltipContent: 'Stocks',
    path: '/stocks',
  },
  BOQ: {
    icon: <RiStackLine size={20} />,
    label: 'BOQ',
    tooltipContent: 'BOQ',
    path: '/boq',
  },
  Procurements: {
    icon: <RiShoppingCartLine size={20} />,
    label: 'Procurements',
    tooltipContent: 'Procurements',
    path: '/procurements/project-procurements',
  },
  'Project Procurements': {
    label: 'Project Procurements',
    tooltipContent: 'Project Procurements',
    path: '/procurements/project-procurements',
  },
  "PO's": {
    label: "PO's",
    tooltipContent: "PO's",
    path: '/procurements/pos',
  },
  'PO\u2019s': {
    label: "PO's",
    tooltipContent: "PO's",
    path: '/procurements/pos',
  },
  'Vendor Payments': {
    label: 'Vendor Payments',
    tooltipContent: 'Vendor Payments',
    path: '/procurements/vendor-payments',
  },
  Facility: {
    icon: <RiHammerLine size={20} />,
    label: 'Facility',
    tooltipContent: 'Facility',
    path: '/facility/tracker',
  },
  'Knowledge Center': {
    icon: <RiArticleLine size={20} />,
    label: 'Knowledge Center',
    tooltipContent: 'Knowledge Center',
    path: '/settings/knowledge-center',
  },
  AUM: {
    icon: <RiBriefcaseLine size={20} />,
    label: 'AUM',
    tooltipContent: 'AUM',
    path: '/aum/asset',
  },
  Tracker: {
    icon: null,
    label: 'Tracker',
    tooltipContent: 'Tracker',
    path: '/facility/tracker',
  },
};

/** Parent section keys from the sidebar API (object keys) - used to identify collapsible vs single nav */
export const SIDEBAR_PARENT_KEYS = [
  'Centers',
  'Spaces',
  'Landlords',
  'Clients',
  'Ticket Management',
  'Bookings',
  'Agreements',
  'Vendors',
  'Devx CRM',
  'Channel Partner',
  'Procurements',
];

export const BOTTOM_NAV_ROUTES = [
  {
    key: 'Inbox',
    label: 'Inbox',
    path: '/inbox',
  },
  {
    key: 'Support',
    label: 'Support',
    path: '/support',
  },
  {
    key: 'Release Note',
    label: 'Release Note',
    path: '/release-note',
  },
  {
    key: 'Settings',
    label: 'Settings',
    path: '/settings',
  },
];

export const SETTINGS_QUICK_ACCESS_ROUTES = [
  {
    value: 'profile',
    title: 'Profile',
    route: '/settings',
    subtitle: 'Settings > Profile',
    icon: RiUserLine,
    disabledWhileLoading: true,
  },
  {
    value: 'dashboards',
    title: 'Dashboard',
    route: '/settings/dashboards',
    subtitle: 'Settings > Dashboard',
    icon: RiBarChartBoxLine,
    disabledWhileLoading: false,
  },
  {
    value: 'company-profile',
    title: 'Company Profile',
    route: '/settings/company-profile',
    subtitle: 'Settings > Company Profile',
    icon: RiBuildingLine,
    disabledWhileLoading: false,
  },
  {
    value: 'projects-master',
    title: 'Projects Master',
    route: '/settings/projects-master',
    subtitle: 'Settings > Projects Master',
    icon: RiSuitcaseLine,
    disabledWhileLoading: true,
  },
  {
    value: 'users',
    title: 'Users',
    route: '/settings/users',
    subtitle: 'Settings > Users',
    icon: RiGroupLine,
    disabledWhileLoading: true,
  },
  {
    value: 'roles-permissions',
    title: 'Roles & Permissions',
    route: '/settings/roles-permissions',
    subtitle: 'Settings > Roles & Permissions',
    icon: RiSettings2Line,
    disabledWhileLoading: true,
  },
  {
    value: 'status-master',
    title: 'Status Master',
    route: '/settings/status-master',
    subtitle: 'Settings > Status Master',
    icon: RiPriceTag3Line,
    disabledWhileLoading: true,
  },
  {
    value: 'task-master',
    title: 'Task Master',
    route: '/settings/task-master',
    subtitle: 'Settings > Task Master',
    icon: RiTaskLine,
    disabledWhileLoading: true,
  },
  {
    value: 'categories-master',
    title: 'Categories Master',
    route: '/settings/categories-master',
    subtitle: 'Settings > Categories Master',
    icon: RiGitBranchLine,
    disabledWhileLoading: false,
  },
  {
    value: 'crm',
    title: 'CRM',
    route: '/settings/crm',
    subtitle: 'Settings > CRM',
    icon: RiAccountCircleLine,
    disabledWhileLoading: true,
  },
  {
    value: 'emergency-contacts',
    title: 'Emergency Contacts',
    route: '/settings/emergency-contacts',
    subtitle: 'Settings > Emergency Contacts',
    icon: RiAlertLine,
    disabledWhileLoading: true,
  },
  {
    value: 'tracker-settings',
    title: 'Facility Tracker',
    route: '/settings/tracker-settings',
    subtitle: 'Settings > Facility Tracker',
    icon: RiBuildingLine,
    disabledWhileLoading: true,
  },
  {
    value: 'finance-settings',
    title: 'Finance Settings',
    route: '/settings/finance-settings',
    subtitle: 'Settings > Finance Settings',
    icon: RiMoneyDollarCircleLine,
    disabledWhileLoading: true,
  },
];

export function getVisibleSettingsItems(userSideBarPerm) {
  const role = getRole(userSideBarPerm);
  const userRole = getUserRole(userSideBarPerm);

  const hasCrmTaskWritePermission = hasModulePermission(userSideBarPerm, 'Task Master', 'write');
  const hasCrmStatusMasterPermission =
    hasModulePermission(userSideBarPerm, 'CRM Status Master', 'read') ||
    hasModulePermission(userSideBarPerm, 'CRM Status Master', 'write');
  const hasCrmTaskMasterPermission =
    hasModulePermission(userSideBarPerm, 'Lead CRM Task Master', 'read') ||
    hasModulePermission(userSideBarPerm, 'Lead CRM Task Master', 'write');

  return SETTINGS_QUICK_ACCESS_ROUTES.filter((item) => {
    if (item.value === 'users') {
      return Boolean(userRole?.User);
    }
    if (item.value === 'roles-permissions') {
      return role === 'Super Admin' || role === 'Admin';
    }
    if (item.value === 'task-master') {
      return hasCrmTaskWritePermission || hasCrmTaskMasterPermission || true;
    }
    if (item.value === 'crm') {
      return hasCrmTaskMasterPermission || hasCrmStatusMasterPermission;
    }
    if (item.value === 'status-master') {
      return role === 'Super Admin';
    }
    if (item.value === 'tracker-settings') {
      return true;
    }
    if (item.value === 'emergency-contacts') {
      return true;
    }
    if (item.value === 'finance-settings') {
      return role === 'Super Admin' || role === 'Admin';
    }
    if (item.value === 'dashboards') {
      return hasModulePermission(userSideBarPerm, 'Dashboard Master', 'create');
    }
    return true;
  });
}

export function normalizeSidebarLabel(value) {
  const normalizedValue = String(value ?? '').trim();
  if (!normalizedValue) return normalizedValue;
  const lower = normalizedValue.toLowerCase();
  if (lower === 'devx crm') return 'CRM';
  if (lower === 'event management') return 'Events';
  if (lower === 'ticket management') return 'Tickets';
  return normalizedValue;
}

export function buildSidebarSections(sidebarData = {}) {
  if (!sidebarData || typeof sidebarData !== 'object') {
    return [];
  }

  const baseKeys = [
    ...SIDEBAR_PARENT_KEYS.filter((key) => key in sidebarData),
    ...Object.keys(sidebarData).filter((key) => !SIDEBAR_PARENT_KEYS.includes(key)),
  ];

  const hasKnowledgeCenter = baseKeys.includes('Knowledge Center');
  const hasFacility = baseKeys.includes('Facility');

  let orderedKeys = baseKeys;

  if (hasFacility) {
    orderedKeys = [];
    baseKeys.forEach((key) => {
      if (key === 'Knowledge Center') return;
      orderedKeys.push(key);
      if (key === 'Facility') {
        orderedKeys.push('Knowledge Center');
      }
    });
  }
  console.log('orderedKeys', orderedKeys);

  const sections = orderedKeys.map((key) => {
    const childrenArray = Array.isArray(sidebarData[key]) ? sidebarData[key] : [];
    const parentConfig = sidebar[key];
    const rawLabel = parentConfig?.label ?? key;
    const rawTooltip = parentConfig?.tooltipContent ?? key;

    return {
      key,
      label: normalizeSidebarLabel(rawLabel),
      icon: parentConfig?.icon,
      path: parentConfig?.path,
      tooltipContent: normalizeSidebarLabel(rawTooltip),
      children: childrenArray.map((childLabel) => {
        const childConfig = sidebar[childLabel];
        return childConfig
          ? {
              key: childLabel,
              label: normalizeSidebarLabel(childConfig.label),
              path: childConfig.path,
            }
          : {
              key: childLabel,
              label: normalizeSidebarLabel(childLabel),
              path: null,
            };
      }),
      hasChildren: childrenArray.length > 0,
    };
  });

  return sections;
}

export function buildQuickAccessRoutes(userSideBarPerm = {}) {
  const sidebarData = userSideBarPerm?.data?.message?.sidebar || {};
  const sections = buildSidebarSections(sidebarData);
  const routeMap = new Map();
  const hasSettingsRoute = sections.some((section) => section.path === '/settings');

  sections.forEach((section) => {
    if (section.path) {
      routeMap.set(section.path, {
        id: `quick-access::${section.path}`,
        doctype: '__quick_access__',
        moduleLabel: 'Quick Access',
        title: section.label,
        subtitle: '',
        route: section.path,
        score: 0,
        resultType: 'quick-access',
      });
    }

    section.children.forEach((child) => {
      if (!child.path) {
        return;
      }

      routeMap.set(child.path, {
        id: `quick-access::${child.path}`,
        doctype: '__quick_access__',
        moduleLabel: 'Quick Access',
        title: child.label,
        subtitle: `${section.label} > ${child.label}`,
        route: child.path,
        score: 0,
        resultType: 'quick-access',
      });
    });
  });

  BOTTOM_NAV_ROUTES.forEach((item) => {
    if (!item.path || routeMap.has(item.path)) {
      return;
    }

    routeMap.set(item.path, {
      id: `quick-access::${item.path}`,
      doctype: '__quick_access__',
      moduleLabel: 'Quick Access',
      title: item.label,
      subtitle: '',
      route: item.path,
      score: 0,
      resultType: 'quick-access',
    });
  });

  if (hasSettingsRoute || routeMap.has('/settings')) {
    getVisibleSettingsItems(userSideBarPerm).forEach((item) => {
      if (!item.route || routeMap.has(item.route)) {
        return;
      }

      routeMap.set(item.route, {
        id: `quick-access::${item.route}`,
        doctype: '__quick_access__',
        moduleLabel: 'Quick Access',
        title: item.title,
        subtitle: item.subtitle,
        route: item.route,
        score: 0,
        resultType: 'quick-access',
      });
    });
  }

  return [...routeMap.values()];
}

export function buildTopLevelNavigationItems(userSideBarPerm = {}) {
  const sidebarData = userSideBarPerm?.data?.message?.sidebar || {};
  const sections = buildSidebarSections(sidebarData);
  const routeMap = new Map();

  const dashboardConfig = sidebar.Dashboard;
  if (dashboardConfig?.path) {
    routeMap.set(dashboardConfig.path, {
      id: `top-nav::${dashboardConfig.path}`,
      title: dashboardConfig.label,
      subtitle: '',
      route: dashboardConfig.path,
      icon: dashboardConfig.icon || null,
      resultType: 'quick-nav',
    });
  }

  sections.forEach((section) => {
    if (!section.path) {
      return;
    }

    routeMap.set(section.path, {
      id: `top-nav::${section.path}`,
      title: section.label,
      subtitle: '',
      route: section.path,
      icon: section.icon || null,
      resultType: 'quick-nav',
    });
  });

  BOTTOM_NAV_ROUTES.forEach((item) => {
    if (!item.path || routeMap.has(item.path)) {
      return;
    }

    const config = sidebar[item.key];
    routeMap.set(item.path, {
      id: `top-nav::${item.path}`,
      title: item.label,
      subtitle: '',
      route: item.path,
      icon: config?.icon || null,
      resultType: 'quick-nav',
    });
  });

  return [...routeMap.values()];
}
