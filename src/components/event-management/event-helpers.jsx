export const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '--';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export const getParticipationLabel = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'SINGLE_MEMBER') return 'Individual';
  if (normalized === 'TEAM_PARTICIPATION') return 'Team';
  return value || '--';
};

export const toNumberOrNull = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const getActivityType = (a) => a?.type ?? a?.activity_type ?? '';

export const StatsCard = ({ label, value, bgClassName = '' }) => (
  <div className={`rounded-xl px-5 py-4 ${bgClassName}`}>
    <div className='text-paragraph-sm text-text-sub-500 text-center'>{label}</div>
    <div className='mt-2 text-label-lg text-text-strong-950 text-center'>{value ?? '--'}</div>
  </div>
);
