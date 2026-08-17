import React from 'react';
import {
  RiArrowUpLine,
  RiArrowDownLine,
  RiPieChartFill,
  RiUserFill,
  RiBox1Fill,
  RiCheckboxCircleFill,
  RiMoneyRupeeCircleLine,
} from 'react-icons/ri';

const SpaceStats = ({ stats = [] }) => {
  const config = {
    occupancyRate: {
      icon: RiPieChartFill,
      gradient: 'from-[#D4F7E9] to-[#EFFAF6]',
      textColor: 'text-[#0a7c5f]',
      iconColor: 'fill-[#067644] ',
      order: 1,
    },
    occupied: {
      icon: RiUserFill,
      gradient: 'from-[#c8edff] to-[#EBFAFF]',
      textColor: 'text-[#136e97]',
      iconColor: 'fill-[#0e7aa6] text-white',
      order: 2,
    },
    available: {
      icon: RiCheckboxCircleFill,
      gradient: 'from-[#CAC2FF] to-[#EEEBFF]',
      textColor: 'text-[#5A36BF]',
      iconColor: 'fill-[#5A36BF] text-white',
      order: 3,
    },
    aggOpportunityLoss: {
      icon: RiMoneyRupeeCircleLine,
      gradient: 'from-[#FFE8CC] to-[#FFF5EB]',
      textColor: 'text-[#9a5b00]',
      iconColor: 'fill-[#c97706] text-white',
      order: 1,
    },
    aggAvailableSpaces: {
      icon: RiCheckboxCircleFill,
      gradient: 'from-[#CAC2FF] to-[#EEEBFF]',
      textColor: 'text-[#5A36BF]',
      iconColor: 'fill-[#5A36BF] text-white',
      order: 2,
    },
    aggTotalAvailableSeats: {
      icon: RiBox1Fill,
      gradient: 'from-[#c8edff] to-[#EBFAFF]',
      textColor: 'text-[#136e97]',
      iconColor: 'fill-[#0e7aa6] text-white',
      order: 3,
    },
    aggTotalRevenue: {
      icon: RiMoneyRupeeCircleLine,
      gradient: 'from-[#D4F7E9] to-[#EFFAF6]',
      textColor: 'text-[#0a7c5f]',
      iconColor: 'fill-[#067644] ',
      order: 4,
    },
  };

  const sorted = [...stats]
    .sort((a, b) => (config[a.key]?.order || 0) - (config[b.key]?.order || 0))
    .filter((stat) => config[stat.key]);

  const gridClass =
    sorted.length >= 4
      ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'
      : 'grid grid-cols-1 gap-4 lg:grid-cols-3';

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
    <div className={gridClass}>
      {sorted.map((stat) => {
        const cfg = config[stat.key];
        const Icon = cfg.icon;
        return (
          <div
            key={stat.key}
            className={`flex min-h-[96px] items-center justify-between gap-4 rounded-[12px] bg-linear-to-b p-4 shadow-[0px_2px_4px_rgba(27,28,29,0.04)] ${cfg.gradient}`}
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
  );
};

export default SpaceStats;
