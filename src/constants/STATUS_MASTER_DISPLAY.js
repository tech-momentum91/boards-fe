import {
  RiBriefcaseLine,
  RiBuilding2Line,
  RiBuildingLine,
  RiCalendarCheckLine,
  RiCalendarEventLine,
  RiChat3Line,
  RiHandCoinLine,
  RiListCheck3,
  RiMapPinLine,
  RiMoneyDollarCircleLine,
  RiPriceTag3Line,
  RiTeamLine,
  RiUserStarLine,
} from 'react-icons/ri';

/**
 * Figma Status Master landing cards (order and copy match design).
 * `id` maps to backend module registry ids from getStatusModules().
 */

/** Modules without Import — shown under Status Master → System Statuses. */
export const STATUS_MASTER_SYSTEM_MODULE_IDS = [
  'opex',
  'billing',
  'spaces',
  'bookings',
  'agreements',
  'vms',
  'centers',
];

export const STATUS_MASTER_SYSTEM_MODULE_ID_SET = new Set(STATUS_MASTER_SYSTEM_MODULE_IDS);

export function isStatusMasterSystemModule(moduleId) {
  return STATUS_MASTER_SYSTEM_MODULE_ID_SET.has(moduleId);
}

export const STATUS_MASTER_DISPLAY_MODULES = [
  {
    id: 'tickets',
    title: 'Task',
    description: 'Create and manage task statuses',
    icon: RiBuildingLine,
  },
  {
    id: 'vendors',
    title: 'Vendors',
    description: 'Create and manage vendor statuses',
    icon: RiPriceTag3Line,
  },
  {
    id: 'landlords',
    title: 'Landlords',
    description: 'Create and manage landlord statuses',
    icon: RiHandCoinLine,
  },
  {
    id: 'events',
    title: 'Events',
    description: 'Create and manage event statuses',
    icon: RiCalendarEventLine,
  },
  {
    id: 'partners',
    title: 'Partners',
    description: 'Create and manage partner onboarding stages',
    icon: RiUserStarLine,
  },
  {
    id: 'center_tasks',
    title: 'Center Tasks',
    description: 'Create and manage center preboarding task statuses',
    icon: RiListCheck3,
  },
  {
    id: 'client_tasks',
    title: 'Client Tasks',
    description: 'Create and manage client onboarding, engagement, and exit task statuses',
    icon: RiListCheck3,
  },
  {
    id: 'vendor_tasks',
    title: 'Vendor Tasks',
    description: 'Create and manage vendor onboarding task statuses',
    icon: RiListCheck3,
  },
  {
    id: 'partner_tasks',
    title: 'Partner Tasks',
    description: 'Create and manage partner task statuses',
    icon: RiListCheck3,
  },
  {
    id: 'event_tasks',
    title: 'Event Tasks',
    description: 'Create and manage event task statuses',
    icon: RiListCheck3,
  },
  {
    id: 'crm_tasks',
    title: 'CRM Tasks',
    description: 'Create and manage CRM task statuses',
    icon: RiListCheck3,
  },
  {
    id: 'cp_tasks',
    title: 'CP Tasks',
    description: 'Create and manage CP task statuses',
    icon: RiListCheck3,
  },
  {
    id: 'projects',
    title: 'Projects',
    description: 'Stages, layout statuses, and per-tab task statuses',
    icon: RiBriefcaseLine,
  },
  // System statuses (no import; default rows cannot be disabled/deleted)
  {
    id: 'opex',
    title: 'OPEX',
    description: 'Create and manage operations statuses',
    icon: RiListCheck3,
  },
  {
    id: 'billing',
    title: 'Billing & Collection',
    description: 'Create and manage billing and payment statuses',
    icon: RiMoneyDollarCircleLine,
  },
  {
    id: 'bookings',
    title: 'Booking',
    description: 'Create and manage booking statuses',
    icon: RiCalendarCheckLine,
  },
  {
    id: 'agreements',
    title: 'Agreements',
    description: 'Create and manage agreement statuses',
    icon: RiTeamLine,
  },
  {
    id: 'vms',
    title: 'VMS',
    description: 'Create and manage visitor or communication statuses',
    icon: RiChat3Line,
  },
  {
    id: 'spaces',
    title: 'Spaces',
    description: 'Create and manage space statuses',
    icon: RiMapPinLine,
  },
  {
    id: 'centers',
    title: 'Centers',
    description: 'Create and manage center statuses',
    icon: RiBuilding2Line,
  },
];

const DISPLAY_BY_ID = Object.fromEntries(
  STATUS_MASTER_DISPLAY_MODULES.map((entry) => [entry.id, entry]),
);

export function getStatusMasterDisplay(moduleId) {
  return DISPLAY_BY_ID[moduleId] ?? null;
}

export function enrichModuleWithDisplay(module) {
  const display = getStatusMasterDisplay(module.id);
  return {
    ...module,
    title: display?.title ?? module.label ?? module.id,
    description:
      display?.description ??
      `Create and manage ${(module.label || module.id).toLowerCase()} statuses`,
    icon: display?.icon ?? RiPriceTag3Line,
  };
}

export function orderModulesForStatusMaster(modules = []) {
  const byId = Object.fromEntries(modules.map((m) => [m.id, m]));
  const ordered = STATUS_MASTER_DISPLAY_MODULES.map((display) => {
    const module = byId[display.id];
    if (!module) return null;
    return enrichModuleWithDisplay(module);
  }).filter(Boolean);

  const seen = new Set(ordered.map((m) => m.id));
  modules.forEach((module) => {
    if (!seen.has(module.id)) {
      ordered.push(enrichModuleWithDisplay(module));
    }
  });

  return ordered;
}

/** Split Status Master landing into configurable modules vs system (no-import) modules. */
export function partitionStatusMasterModules(modules = []) {
  const standard = [];
  const system = [];
  (modules || []).forEach((module) => {
    if (isStatusMasterSystemModule(module.id) || module.allow_import === false) {
      system.push(module);
    } else {
      standard.push(module);
    }
  });

  // Keep system cards in the declared system order when possible.
  const systemById = Object.fromEntries(system.map((m) => [m.id, m]));
  const orderedSystem = [
    ...STATUS_MASTER_SYSTEM_MODULE_IDS.map((id) => systemById[id]).filter(Boolean),
    ...system.filter((m) => !STATUS_MASTER_SYSTEM_MODULE_ID_SET.has(m.id)),
  ];

  return { standard, system: orderedSystem };
}
