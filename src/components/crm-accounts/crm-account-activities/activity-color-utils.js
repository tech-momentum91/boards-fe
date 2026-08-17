/**
 * Status and priority color helpers for CRM activities.
 * Matches the task view drawer (crm-task-view-drawer) Badge styling.
 */

import { getInfoCallStatusBadgeColor } from '@/components/crm-leads/constants';

export function getStatusColor(status) {
  const s = String(status || '').toLowerCase();
  // TruePulse / Info Call Status
  if (
    [
      'answered',
      'connected',
      'missed',
      'no answer',
      'not answered',
      'unknown',
      'busy',
      'voicemail',
    ].includes(s)
  ) {
    return getInfoCallStatusBadgeColor(status);
  }
  if (s === 'completed') return 'green';
  if (s === 'ongoing') return 'blue';
  if (s === 'on hold') return 'gray';
  return 'orange'; // pending, default
}

export function getPriorityColor(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'low') return 'green';
  if (p === 'medium') return 'orange';
  if (p === 'high' || p === 'urgent') return 'red';
  return 'gray';
}

/** Progress icon for task status (matches crm-tasks-table). */
export function getTaskProgress(status) {
  if (!status) return { percentage: 0, color: 'gray' };
  const normalized = String(status).toLowerCase();
  if (normalized === 'completed') return { percentage: 100, color: 'green' };
  if (normalized === 'ongoing') return { percentage: 60, color: 'blue' };
  if (normalized === 'overdue') return { percentage: 80, color: 'red' };
  return { percentage: 25, color: 'orange' }; // pending, default
}

/** Stage colors for lifecycle stage fields. */
export function getStageColor(stage) {
  const s = String(stage || '').toLowerCase();
  const colorMap = {
    qualification: 'orange',
    proposal: 'blue',
    negotiation: 'purple',
    closed_won: 'green',
    closed_lost: 'red',
    discovery: 'sky',
  };
  return colorMap[s] || hashToColor(stage);
}

const BADGE_COLORS = ['gray', 'blue', 'orange', 'green', 'purple', 'sky', 'pink', 'teal', 'yellow'];
export function hashToColor(str) {
  if (!str || typeof str !== 'string') return 'gray';
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return BADGE_COLORS[Math.abs(h) % BADGE_COLORS.length];
}
