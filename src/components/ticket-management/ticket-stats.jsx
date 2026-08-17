import React from 'react';
import {
  RiTicketFill,
  RiTimeFill,
  RiTimerFlashFill,
  RiArrowUpLine,
  RiArrowDownLine,
} from 'react-icons/ri';
import { useSelector } from 'react-redux';
import { isClient } from '@/constants/users-constants';

const TicketStats = ({ stats = [] }) => {
  const defaultStats = {
    open: {
      icon: RiTimeFill,
      gradient: 'from-[#c8edff] to-[#e5f6ff]',
      textColor: 'text-[#136e97]',
      iconColor: 'fill-[#0e7aa6] text-white',
      order: 1,
    },
    avgResponse: {
      icon: RiTimerFlashFill,
      gradient: 'from-[#b8f1df] to-[#e7f8f1]',
      textColor: 'text-[#0a7c5f]',
      iconColor: 'fill-[#0a7c5f] text-white',
      order: 2,
    },
    total: {
      icon: RiTicketFill,
      gradient: 'from-[#fce0c2] to-[#feefe5]',
      textColor: 'text-[#8b1f1f]',
      iconColor: 'fill-[#c15d2b] text-white',
      order: 3,
    },
  };

  const clientStats = {
    resolved: {
      icon: RiTimerFlashFill,
      gradient: 'from-[#b8f1df] to-[#e7f8f1]',
      textColor: 'text-[#0a7c5f]',
      iconColor: 'fill-[#0a7c5f] text-white',
      order: 1,
    },
    open: {
      icon: RiTimeFill,
      gradient: 'from-[#c8edff] to-[#e5f6ff]',
      textColor: 'text-[#136e97]',
      iconColor: 'fill-[#0e7aa6] text-white',
      order: 2,
    },
    total: {
      icon: RiTicketFill,
      gradient: 'from-[#fce0c2] to-[#feefe5]',
      textColor: 'text-[#8b1f1f]',
      iconColor: 'fill-[#c15d2b] text-white',
      order: 4,
    },
  };

  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const roleMap = userSideBarPerm?.data?.message?.role;
  const isClientUser = isClient(roleMap);

  const statConfig = isClientUser ? clientStats : defaultStats;

  const sortedStats = [...stats]
    .sort((a, b) => (statConfig[a.key]?.order || 0) - (statConfig[b.key]?.order || 0))
    .filter(
      // filter based on stat config keys
      (stat) => statConfig[stat.key] !== undefined,
    );

  const transformedStats = sortedStats.map((stat) => {
    const config = statConfig[stat.key] || statConfig.total;

    return {
      ...stat,
      icon: config.icon,
      iconColor: config.iconColor,
      gradient: config.gradient,
      textColor: config.textColor,
      displayLabel: stat.label?.toUpperCase(),
      displayTrend: stat.trend
        ? {
            direction: stat.trend.direction,
            value: stat.trend.value,
            period: stat.trend?.comparison?.toUpperCase() || 'THEN LAST MONTH',
          }
        : null,
    };
  });

  const renderTrendBadge = (trend) => {
    if (!trend) return null;

    const isUp = trend.direction === 'up';
    const Icon = isUp ? RiArrowUpLine : RiArrowDownLine;
    const colorClass = isUp ? 'text-[#df1c41]' : 'text-[#0ea371]';

    return (
      <div
        className={`inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 shadow-sm ${colorClass}`}
      >
        <Icon className='size-3' />
        <span className='text-[11px] font-semibold leading-4'>{trend.value}</span>
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-5`}>
      {transformedStats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.key}
            className={`flex min-h-[96px] items-center justify-between gap-4 rounded-2xl bg-linear-to-b px-4 py-4 shadow-[0px_2px_4px_rgba(27,28,29,0.04)] ${stat.gradient}`}
          >
            <div className='flex flex-col gap-2'>
              <div className='flex items-center gap-2'>
                <div className={`text-title-h5 ${stat.textColor}`}>{stat.value}</div>
                {renderTrendBadge(stat.displayTrend)}
              </div>
              <div className={`text-subheading-sm ${stat.textColor} opacity-70`}>
                {stat.displayLabel}
              </div>
            </div>

            <div className='flex items-center justify-center p-1 shrink-0 rounded-full bg-white/90 shadow-[0px_2px_4px_rgba(27,28,29,0.1)] self-start'>
              <Icon className={`size-5 ${stat.iconColor}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TicketStats;
