import React from 'react';
import { RiBarChart2Line, RiGroupLine, RiArrowUpLine, RiArrowDownLine } from 'react-icons/ri';

const statConfig = {
  csi: {
    icon: RiBarChart2Line,
    gradient: 'from-[#b8f1df] to-[#e7f8f1]',
    textColor: 'text-[#0a7c5f]',
    iconColor: 'fill-[#0a7c5f] text-white',
    order: 1,
  },
  engagement: {
    icon: RiBarChart2Line,
    gradient: 'from-[#c8edff] to-[#e5f6ff]',
    textColor: 'text-[#136e97]',
    iconColor: 'fill-[#0e7aa6] text-white',
    order: 2,
  },
  exiting: {
    icon: RiGroupLine,
    gradient: 'from-[#f9d2da] to-[#fdedf0]',
    textColor: 'text-[#af1d38]',
    iconColor: 'fill-[#af1d38] text-white',
    order: 3,
  },
};

const ClientsStats = ({ stats = [] }) => {
  const sortedStats = [...stats].sort(
    (a, b) => (statConfig[a.key]?.order || 0) - (statConfig[b.key]?.order || 0),
  );

  const renderTrendBadge = (trend) => {
    if (!trend) return null;

    const isUp = trend.direction === 'up';
    const Icon = isUp ? RiArrowUpLine : RiArrowDownLine;
    const colorClass = isUp ? 'text-[#0ea371]' : 'text-[#df1c41]';

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
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {sortedStats.map((stat) => {
        const config = statConfig[stat.key];
        if (!config) return null;

        const Icon = config.icon;

        return (
          <div
            key={stat.key}
            className={`flex min-h-[96px] items-center justify-between gap-4 rounded-2xl bg-linear-to-b px-4 py-4 shadow-[0px_2px_4px_rgba(27,28,29,0.04)] ${config.gradient}`}
          >
            <div className='flex flex-col gap-2'>
              <div className='flex items-center gap-2'>
                <div className={`text-title-h5 ${config.textColor}`}>{stat.value}</div>
                {renderTrendBadge(stat.trend)}
              </div>
              <div className={`text-subheading-sm ${config.textColor} opacity-70`}>
                {stat.label?.toUpperCase()}
              </div>
            </div>

            <div className='flex items-center justify-center p-1 shrink-0 rounded-full bg-white/90 shadow-[0px_2px_4px_rgba(27,28,29,0.1)] self-start'>
              <Icon className={`size-5 ${config.iconColor}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ClientsStats;
