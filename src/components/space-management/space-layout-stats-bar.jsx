import React from 'react';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCheckboxCircleFill,
  RiPieChartFill,
  RiUserFill,
} from 'react-icons/ri';

const STAT_CONFIG = {
  occupancyRate: {
    icon: RiPieChartFill,
    iconBg: 'bg-[#D4F7E9]',
    iconColor: 'text-[#067644]',
    order: 1,
  },
  occupied: {
    icon: RiUserFill,
    iconBg: 'bg-[#EBFAFF]',
    iconColor: 'text-[#0e7aa6]',
    order: 2,
  },
  available: {
    icon: RiCheckboxCircleFill,
    iconBg: 'bg-[#EEEBFF]',
    iconColor: 'text-[#5A36BF]',
    order: 3,
  },
};

function renderTrendBadge(trend) {
  if (!trend?.value) return null;

  const isUp = trend.direction === 'up';
  const Icon = isUp ? RiArrowUpLine : RiArrowDownLine;

  return (
    <span className='inline-flex items-center gap-0.5 rounded-full bg-[#D4F7E9] px-1.5 py-0.5 text-[#067644]'>
      <Icon className='size-3 shrink-0' aria-hidden />
      <span className='text-[11px] font-semibold leading-4'>{trend.value}</span>
    </span>
  );
}

/**
 * Horizontal occupancy stats bar for layout view (Figma: icon left, label + value + trend).
 *
 * @param {{ stats?: Array<{ key: string, label?: string, value: string | number, trend?: { direction: 'up' | 'down', value: string } }> }} props
 */
export default function SpaceLayoutStatsBar({ stats = [] }) {
  const sorted = [...stats]
    .filter((stat) => STAT_CONFIG[stat.key])
    .sort((a, b) => (STAT_CONFIG[a.key]?.order || 0) - (STAT_CONFIG[b.key]?.order || 0));

  if (sorted.length === 0) return null;

  return (
    <div className='flex flex-col overflow-hidden   bg-bg-white-0 sm:flex-row sm:divide-x sm:divide-stroke-soft-200'>
      {sorted.map((stat, index) => {
        const cfg = STAT_CONFIG[stat.key];
        const Icon = cfg.icon;
        const isLast = index === sorted.length - 1;

        return (
          <div
            key={stat.key}
            className={`flex flex-1 mx-3 items-center gap-4 ${
              !isLast ? 'border-b  border-stroke-soft-200 sm:border-b-0' : ''
            }`}
          >
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${cfg.iconBg}`}
            >
              <Icon className={`size-5 ${cfg.iconColor}`} aria-hidden />
            </span>

            <div className='flex min-w-0 flex-col gap-1'>
              <span className='text-subheading-xs font-medium uppercase tracking-wide text-text-sub-500'>
                {stat.label || ''}
              </span>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='text-title-h5 font-semibold text-text-strong-950'>
                  {stat.value}
                </span>
                {renderTrendBadge(stat.trend)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
