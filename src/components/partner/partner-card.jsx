import React from 'react';
import { RiExternalLinkLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Avatar from '@/components/ui/avatar';
import { PARTNER_STAGE_BADGE_COLORS } from '@/components/partner/constants';
import { getPartnerAvatarColor, getPartnerInitials } from '@/components/partner/partner-helper';
import { hasStatusBadgeColor, StatusColorPill } from '@/components/ui/status-color-pill';

const getStageBadgeColor = (stage) => PARTNER_STAGE_BADGE_COLORS[stage] || 'gray';

const PartnerCard = ({ row, onViewDetails, index = 0 }) => {
  const name = row.partner_name || 'Unknown';
  const category = row.secondary || row.primary || '—';
  const stage = row.stage || row.onboarding_stage;
  const stageColorRaw = row.onboarding_stage_color;
  const initials = getPartnerInitials(name);
  const avatarColor = getPartnerAvatarColor(index);

  return (
    <div className='flex flex-col rounded-xl border border-stroke-soft-200 bg-white shadow-sm transition-shadow hover:shadow-md'>
      {/* Header */}
      <div className='flex items-start gap-3 p-4 pb-3'>
        <Avatar.Root size='40' className={avatarColor}>
          <span className='text-label-sm font-semibold text-white'>{initials}</span>
        </Avatar.Root>
        <div className='min-w-0 flex-1'>
          <h3 className='truncate text-paragraph-sm font-semibold text-text-main-900'>{name}</h3>
          <p className='truncate text-paragraph-xs text-text-sub-600'>{category}</p>
        </div>
        {stage &&
          (hasStatusBadgeColor(stageColorRaw) ? (
            <StatusColorPill
              value={stage}
              color={stageColorRaw}
              className='shrink-0 max-w-[min(100%,140px)]'
            />
          ) : (
            <Badge.Root
              variant='light'
              color={getStageBadgeColor(stage)}
              size='small'
              className='shrink-0'
            >
              {stage}
            </Badge.Root>
          ))}
      </div>

      {/* Body - key-value pairs */}
      <div className='flex flex-col gap-2 px-4 pb-4'>
        <FieldRow label='Industry' value={row.industry} />
        <FieldRow label='City' value={row.city} />
        <FieldRow label='Frequency' value={row.frequency} />
      </div>

      {/* Footer */}
      <div className='border-t border-stroke-soft-200 p-3'>
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='xsmall'
          className='w-full gap-1.5'
          onClick={() => onViewDetails?.(row)}
        >
          <span>View Details</span>
          <Button.Icon>
            <RiExternalLinkLine size={16} />
          </Button.Icon>
        </Button.Root>
      </div>
    </div>
  );
};

const FieldRow = ({ label, value }) => (
  <div className='flex items-baseline justify-between gap-2'>
    <span className='text-paragraph-xs text-text-sub-600'>{label}</span>
    <span className='truncate text-paragraph-xs font-medium text-text-main-900'>
      {value || '—'}
    </span>
  </div>
);

PartnerCard.displayName = 'PartnerCard';

export default PartnerCard;
