/** Query param: open allocated layout gallery from Allocate tab. */
export const CLIENT_ALLOCATE_LAYOUT_QUERY_PARAM = 'allocateLayout';

/** localStorage key prefix for client-placed floor markers. */
export const CLIENT_MARKER_STORAGE_KEY_PREFIX = 'clientMarkers';

/** Palette for parent space region outlines on the client floor plan. */
export const CLIENT_LAYOUT_SPACE_PALETTE = [
  { fill: 'rgba(0, 0, 0, 0)', stroke: '#6366f1' },
  { fill: 'rgba(16, 185, 129, 0.15)', stroke: '#10b981' },
  { fill: 'rgba(245, 158, 11, 0.15)', stroke: '#f59e0b' },
  { fill: 'rgba(239, 68, 68, 0.15)', stroke: '#ef4444' },
  { fill: 'rgba(59, 130, 246, 0.15)', stroke: '#3b82f6' },
  { fill: 'rgba(168, 85, 247, 0.15)', stroke: '#a855f7' },
  { fill: 'rgba(236, 72, 153, 0.15)', stroke: '#ec4899' },
  { fill: 'rgba(20, 184, 166, 0.15)', stroke: '#14b8a6' },
];

/** Sub-space fill/stroke colors by type key on the client floor plan. */
export const CLIENT_SUBSPACE_COLORS = {
  production: {
    fill: 'rgba(7, 148, 85, 0.5)',
    stroke: '#22c55e',
  },
  hotDesk: {
    fill: 'rgba(241, 123, 44, 0.5)',
    stroke: '#f97316',
  },
  resource: {
    fill: 'rgba(110, 63, 243, 0.45)',
    stroke: '#a855f7',
  },
};
