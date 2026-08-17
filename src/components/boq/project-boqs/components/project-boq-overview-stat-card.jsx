import React, { memo } from 'react';

import ProjectBoqOverviewCostBreakdownTooltip from '@/components/boq/project-boqs/components/project-boq-overview-cost-breakdown-tooltip';
import { cn } from '@/utils/cn';

const CARD_TONES = {
  pink: {
    gradient: 'from-[#f9c2ff] to-[#fdebff]',
    textColor: 'text-[#620f6c]',
    iconColor: 'text-[#620f6c]',
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
  purple: {
    gradient: 'from-[#cac2ff] to-[#eeebff]',
    textColor: 'text-[#2b1664]',
    iconColor: 'text-[#5A36BF]',
  },
  teal: {
    gradient: 'from-[#c2efff] to-[#ebfaff]',
    textColor: 'text-[#164564]',
    iconColor: 'text-[#136e97]',
  },
};

const ProjectBoqOverviewStatCard = memo(
  ({
    value,
    label,
    icon: Icon,
    tone = 'pink',
    showInfo = false,
    infoBreakdown = [],
    className,
  }) => {
    const styles = CARD_TONES[tone] ?? CARD_TONES.pink;

    return (
      <div
        className={cn(
          'flex min-h-[96px] min-w-0 items-center justify-between gap-4 rounded-[12px] bg-linear-to-b p-4 shadow-[0px_2px_4px_rgba(27,28,29,0.04)]',
          styles.gradient,
          className,
        )}
      >
        <div className='flex min-w-0 flex-col gap-1'>
          <div className={cn('truncate text-title-h5', styles.textColor)}>{value}</div>
          <div className={cn('flex min-w-0 items-center gap-1', styles.textColor)}>
            <span className='truncate text-subheading-sm opacity-70'>{label}</span>
            {showInfo ? (
              <ProjectBoqOverviewCostBreakdownTooltip
                items={infoBreakdown}
                iconColor={styles.iconColor}
              />
            ) : null}
          </div>
        </div>

        {Icon ? (
          <div className='flex shrink-0 items-center justify-center self-start rounded-full bg-white/90 p-1 shadow-[0px_2px_4px_rgba(27,28,29,0.1)]'>
            <Icon className={cn('size-5', styles.iconColor)} aria-hidden />
          </div>
        ) : null}
      </div>
    );
  },
);

ProjectBoqOverviewStatCard.displayName = 'ProjectBoqOverviewStatCard';

export default ProjectBoqOverviewStatCard;
