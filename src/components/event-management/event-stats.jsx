import React from 'react';
import { RiArrowDownLine, RiArrowUpLine } from 'react-icons/ri';
import { EVENT_MANAGEMENT_STATS, EVENT_STATS_CONFIG } from '@/components/event-management/constant';

/**
 * Reusable stats component for all Events sub-modules.
 *
 * The color palette and layout are inspired by TeamStats.
 */
const EventStats = ({ moduleType = 'spotlight', stats: overrideStats }) => {
  const baseStats = EVENT_MANAGEMENT_STATS?.[moduleType]?.stat || [];
  const stats = overrideStats || baseStats;

  const sorted = [...stats]
    .sort(
      (a, b) => (EVENT_STATS_CONFIG[a.key]?.order || 0) - (EVENT_STATS_CONFIG[b.key]?.order || 0),
    )
    .filter((stat) => EVENT_STATS_CONFIG[stat.key]);

  const renderTrend = (trend) => {
    if (!trend) return null;
    const isUp = trend.direction === 'up';
    const Icon = isUp ? RiArrowUpLine : RiArrowDownLine;
    const colorClass = isUp ? 'text-[#df1c41]' : 'text-[#0ea371]';

    return (
      <div
        className={`inline-flex items-center gap-1 rounded-full bg-white pl-[2px] pr-[4px]  py-[2px] shadow-sm ${colorClass}`}
      >
        <Icon className='size-3' />
        <span className='text-[11px] font-semibold leading-4'>{trend.value}</span>
      </div>
    );
  };

  return (
    <section className='flex flex-col gap-3'>
      <div className='flex-1 flex flex-row gap-4 w-full'>
        {sorted.map((stat) => {
          const cfg = EVENT_STATS_CONFIG[stat.key];
          const Icon = cfg.icon;
          return (
            <div
              key={stat.key}
              className={`flex-1 flex min-h-[96px] shrink-0 items-center justify-between gap-4 rounded-[12px] bg-linear-to-b p-4 shadow-[0px_2px_4px_rgba(27,28,29,0.04)] ${cfg.gradient}`}
            >
              <div className='flex flex-col gap-1'>
                <div className='flex items-center gap-2'>
                  <div className={`text-title-h5  ${cfg.textColor}`}>{stat.value}</div>
                  {renderTrend(stat.trend)}
                </div>
                <div className={`text-subheading-sm ${cfg.textColor} opacity-70 `}>
                  {(stat.label || '').toUpperCase()}
                </div>
              </div>

              <div className='flex items-center justify-center p-1 shrink-0 rounded-full bg-white/90 shadow-[0px_2px_4px_rgba(27,28,29,0.1)] self-start'>
                <Icon className={`size-5 ${cfg.iconColor}`} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default EventStats;
