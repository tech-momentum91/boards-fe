import * as Badge from '@/components/ui/badge';
import { darkenHex } from '@/components/crm-leads/constants';
import { LIFECYCLE_STAGE_BADGE_MAP } from '@/components/crm-tasks/constants';

function getStageHexStyle(hex) {
  return {
    backgroundColor: hex.length === 7 ? `${hex}28` : `${hex}20`,
    color: hex.length === 7 ? darkenHex(hex, 0.6) : hex,
  };
}

/**
 * @param {string} [value] Stage label
 * @param {string} [stageColor] Hex from CRM Status Master (e.g. #6366f1)
 */
export function CrmLifecycleStagePill({ value, stageColor }) {
  const display =
    value && value !== '-' && value !== '--' && value !== '—' ? String(value).trim() : null;

  if (!display) {
    return (
      <Badge.Root variant='stroke' color='gray' size='medium'>
        -
      </Badge.Root>
    );
  }

  const hex = typeof stageColor === 'string' && stageColor.startsWith('#') ? stageColor : null;
  if (hex) {
    return (
      <Badge.Root variant='light' color='gray' size='medium' style={getStageHexStyle(hex)}>
        {display}
      </Badge.Root>
    );
  }

  const normalizedKey = display.toLowerCase();
  const info = LIFECYCLE_STAGE_BADGE_MAP[normalizedKey] || { color: 'gray', label: display };

  return (
    <Badge.Root
      variant={info.color === 'gray' ? 'stroke' : 'light'}
      color={info.color}
      size='medium'
    >
      {info.label}
    </Badge.Root>
  );
}
