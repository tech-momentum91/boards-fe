/**
 * Central status-related constants: HD Ticket badge meta, dynamic-status badge palette,
 * and Set Statuses (Status Configuration) picker ↔ storage hex mapping.
 */

// =============================================================================
// Ticket (HD Ticket) — dropdown meta, table badge tokens (options from Status Configuration API)
// =============================================================================

export const TICKET_STATUS_META = {
  open: { color: 'blue', percentage: 20 },
  'in progress': { color: 'orange', percentage: 40 },
  'on hold': { color: 'purple', percentage: 30 },
  resolved: { color: 'green', percentage: 80 },
  closed: { color: 'gray', percentage: 100 },
  escalated: { color: 'red', percentage: 50 },
  breached: { color: 'red', percentage: 95 },
  active: { color: 'green', percentage: 60 },
  inactive: { color: 'gray', percentage: 10 },
};

/** Badge `color` prop (design token) keyed by normalized status string */
export const TICKET_STATUS_BADGE_VARIANTS = {
  open: 'blue',
  'in progress': 'orange',
  'on hold': 'purple',
  resolved: 'green',
  closed: 'gray',
  escalated: 'red',
  breached: 'red',
  active: 'green',
  inactive: 'gray',
};

// =============================================================================
// Dynamic status — canonical badge palette (API `color` semantic or legacy hex)
// =============================================================================

/**
 * Fixed text + background hex per semantic key.
 * Keys are lowercase names used in Status Configuration / API `color`.
 */
export const STATUS_BADGE_PALETTE = {
  purple: { text: '#2B1664', background: '#CAC2FF' },
  blue: { text: '#162664', background: '#C2D6FF' },
  green: { text: '#176448', background: '#CBF5E5' },
  orange: { text: '#6E330C', background: '#FFDAC2' },
  yellow: { text: '#693D11', background: '#FBDFB1' },
  teal: { text: '#164564', background: '#C2EFFF' },
  pink: { text: '#620F6C', background: '#F9C2FF' },
  red: { text: '#710E21', background: '#F8C9D2' },
  gray: { text: '#525866', background: '#F6F8FA' },
};

export const STATUS_SEMANTIC_ALIASES = {
  grey: 'gray',
  violet: 'purple',
  cyan: 'teal',
  black: 'gray',
  amber: 'yellow',
  sky: 'blue',
};

/** Legacy / seed hex (backend setup + older UI) → palette semantic key */
export const STATUS_HEX_TO_SEMANTIC = {
  '#111827': 'gray',
  '#6B7280': 'gray',
  '#2563EB': 'blue',
  '#16A34A': 'green',
  '#DC2626': 'red',
  '#EC4899': 'pink',
  '#F97316': 'orange',
  '#F59E0B': 'yellow',
  '#EAB308': 'yellow',
  '#06B6D4': 'teal',
  '#14B8A6': 'teal',
  '#7C3AED': 'purple',
  '#375DFB': 'blue',
  '#F27B2C': 'orange',
  '#6E3FF3': 'purple',
  '#079455': 'green',
  '#868C98': 'gray',
  '#E63946': 'red',
  '#F79009': 'yellow',
};

// =============================================================================
// Status Configuration modal — dark picker swatches → light hex stored on API
// =============================================================================

/** Dark hex swatches shown in Set Statuses (order = UI left-to-right). */
export const STATUS_CONFIG_PICKER_HEXES = [
  '#6E3FF3',
  '#375DFB',
  '#079455',
  '#F17B2C',
  '#F2AE40',
  '#35B9E9',
  '#E255F2',
  '#DF1C41',
  '#525866',
  '#6B7280',
];

/**
 * Picker (dark) → canonical light storage hex (matches STATUS_BADGE_PALETTE.background).
 * Keys are uppercase `#RRGGBB` as produced by `normalizeStatusHex`.
 */
export const STATUS_CONFIG_PICKER_TO_STORAGE_HEX = {
  '#6E3FF3': '#CAC2FF',
  '#375DFB': '#C2D6FF',
  '#079455': '#CBF5E5',
  '#F17B2C': '#FFDAC2',
  '#F27B2C': '#FFDAC2',
  '#F2AE40': '#FBDFB1',
  '#35B9E9': '#C2EFFF',
  '#E255F2': '#F9C2FF',
  '#DF1C41': '#F8C9D2',
  '#525866': '#F6F8FA',
  '#6B7280': '#F6F8FA',
};
