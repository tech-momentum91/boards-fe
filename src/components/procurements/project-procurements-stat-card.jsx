import React, { memo } from 'react';

import { cn } from '@/utils/cn';

const CARD_TONES = {
  pink: {
    gradient: 'from-[#f9c2ff] to-[#fdebff]',
    textColor: 'text-[#620f6c]',
    iconColor: 'text-[#620f6c]',
  },
  teal: {
    gradient: 'from-[#c2efff] to-[#ebfaff]',
    textColor: 'text-[#164564]',
    iconColor: 'text-[#164564]',
  },
  yellow: {
    gradient: 'from-[#fbedb1] to-[#fef7ec]',
    textColor: 'text-[#693d11]',
    iconColor: 'text-[#693d11]',
  },
  blue: {
    gradient: 'from-[#c2d6ff] to-[#ebf1ff]',
    textColor: 'text-[#162664]',
    iconColor: 'text-[#162664]',
  },
  orange: {
    gradient: 'from-[#ffdac2] to-[#fef3eb]',
    textColor: 'text-[#6e330c]',
    iconColor: 'text-[#6e330c]',
  },
  purple: {
    gradient: 'from-[#cac2ff] to-[#eeebff]',
    textColor: 'text-[#2b1664]',
    iconColor: 'text-[#2b1664]',
  },
  red: {
    gradient: 'from-[#f9d2da] to-[#fdedf0]',
    textColor: 'text-[#710e21]',
    iconColor: 'text-[#710e21]',
  },
  green: {
    gradient: 'from-[#d4f7e9] to-[#effaf6]',
    textColor: 'text-[#045933]',
    iconColor: 'text-[#045933]',
  },
};

const ProjectProcurementsStatCard = memo(
  ({ value, label, icon: Icon, tone = 'pink', className }) => {
    const styles = CARD_TONES[tone] ?? CARD_TONES.pink;

    return (
      <div
        className={cn(
          'relative flex h-[60px] min-w-0 flex-1 flex-col justify-center overflow-hidden rounded-[8px] bg-linear-to-b p-3',
          styles.gradient,
          className,
        )}
      >
        <div className='flex min-w-0 flex-col gap-0'>
          <div className={cn('truncate text-label-sm font-semibold', styles.textColor)}>
            {value}
          </div>
          <div className={cn('truncate text-subheading-xs font-medium', styles.textColor)}>
            {label}
          </div>
        </div>

        {Icon ? (
          <Icon
            className={cn('absolute top-[10px] right-[11px] size-4', styles.iconColor)}
            aria-hidden
          />
        ) : null}
      </div>
    );
  },
);

ProjectProcurementsStatCard.displayName = 'ProjectProcurementsStatCard';

export default ProjectProcurementsStatCard;
