import React from 'react';
import {
  RiArrowUpLine,
  RiArrowDownLine,
  RiUserFill,
  RiToolsFill,
  RiBrushFill,
  RiShieldFill,
  RiMoreFill,
  RiGroupLine,
  RiGroupFill,
  RiBuildingFill,
  RiBrush2Fill,
  RiShieldCheckFill,
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiIndeterminateCircleLine,
  RiErrorWarningLine,
} from 'react-icons/ri';
import * as Popover from '@/components/ui/popover';

const TeamStats = ({ stats = [] }) => {
  const [openKey, setOpenKey] = React.useState(null);
  const config = {
    // Core team stats
    crm: {
      icon: RiGroupFill,
      gradient: 'from-[#CAC2FF] to-[#EEEBFF]',
      textColor: 'text-[#2B1664]',
      iconColor: 'fill-[#5A36BF]',
      order: 1,
    },
    fm: {
      icon: RiBuildingFill,
      gradient: 'from-[#FBEDB1] to-[#FEF7EC]',
      textColor: 'text-[#693D11]',
      iconColor: 'fill-[#B47818]',
      order: 2,
    },
    hk: {
      icon: RiBrush2Fill,
      gradient: 'from-[#C2D6FF] to-[#EBF1FF]',
      textColor: 'text-[#162664]',
      iconColor: 'fill-[#253EA7]',
      order: 3,
    },
    security: {
      icon: RiShieldCheckFill,
      gradient: 'from-[#F9C2FF] to-[#FDEBFF]',
      textColor: 'text-[#620F6C]',
      iconColor: 'fill-[#9C23A9]',
      order: 4,
    },
    sales: {
      icon: RiBrush2Fill,
      gradient: 'from-[#C2D6FF] to-[#EBF1FF]',
      textColor: 'text-[#162664]',
      iconColor: 'fill-[#253EA7]',
      order: 3,
    },
    mst: {
      icon: RiGroupFill,
      gradient: 'from-[#F9D2DA] to-[#FDEDF0]',
      textColor: 'text-[#710E21]',
      iconColor: 'fill-[#AF1D38]',
      order: 4,
    },
    others: {
      icon: RiShieldCheckFill,
      gradient: 'from-[#F9C2FF] to-[#FDEBFF]',
      textColor: 'text-[#620F6C]',
      iconColor: 'fill-[#9C23A9]',
      order: 5,
    },
    // Support team stats
    on_time: {
      icon: RiCheckboxCircleFill,
      gradient: 'from-[#C8E6C9] to-[#E8F5E9]',
      textColor: 'text-[#2E7D32]',
      iconColor: 'fill-[#4CAF50]',
      order: 1,
    },
    not_on_time: {
      icon: RiCloseCircleFill,
      gradient: 'from-[#FFCDD2] to-[#FFEBEE]',
      textColor: 'text-[#C62828]',
      iconColor: 'fill-[#F44336]',
      order: 2,
    },
    out_of_office: {
      icon: RiIndeterminateCircleLine,
      gradient: 'from-[#FFF9C4] to-[#FFFDE7]',
      textColor: 'text-[#F57F17]',
      iconColor: 'fill-[#FFC107]',
      order: 3,
    },
    not_checked_in_yet: {
      icon: RiErrorWarningLine,
      gradient: 'from-[#E1BEE7] to-[#F3E5F5]',
      textColor: 'text-[#6A1B9A]',
      iconColor: 'fill-[#9C27B0]',
      order: 4,
    },
  };

  const sorted = [...stats]
    .sort((a, b) => (config[a.key]?.order || 0) - (config[b.key]?.order || 0))
    .filter((stat) => config[stat.key]);

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
    <div
      className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${
        sorted.length === 4
          ? 'lg:grid-cols-4'
          : sorted.length === 5
            ? 'lg:grid-cols-5'
            : 'lg:grid-cols-4'
      }`}
    >
      {sorted.map((stat) => {
        const cfg = config[stat.key];
        const Icon = cfg.icon;
        const hasDetails =
          stat.key === 'others' && stat.details && Object.keys(stat.details).length > 0;

        const CardContent = React.forwardRef((props, ref) => (
          <div
            ref={ref}
            {...props}
            className={`flex min-h-[96px] items-center justify-between gap-4 rounded-[12px] bg-linear-to-b p-4 shadow-[0px_2px_4px_rgba(27,28,29,0.04)] ${cfg.gradient} cursor-pointer`}
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
        ));
        CardContent.displayName = 'CardContent';

        if (hasDetails) {
          const detailsArray = Object.entries(stat.details).map(([label, data]) => ({
            label,
            count: data.count ?? 0,
          }));

          return (
            <Popover.Root
              key={stat.key}
              open={openKey === stat.key}
              onOpenChange={(open) => setOpenKey(open ? stat.key : null)}
            >
              <Popover.Trigger asChild>
                <CardContent
                  onMouseEnter={() => setOpenKey(stat.key)}
                  onMouseLeave={() => setOpenKey(null)}
                />
              </Popover.Trigger>
              <Popover.Content
                className='p-0'
                side='bottom'
                align='end'
                sideOffset={8}
                showArrow={false}
                onMouseEnter={() => setOpenKey(stat.key)}
                onMouseLeave={() => setOpenKey(null)}
              >
                <div className='bg-bg-white-0 rounded-2xl shadow-regular-large border border-stroke-soft-200 min-w-[200px] flex flex-col gap-2 p-4'>
                  <p className='text-subheading-2xs text-text-soft-400'>OTHERS BREAKDOWN</p>
                  <div className='flex flex-col gap-2'>
                    {detailsArray.map(({ label, count }) => (
                      <div key={label} className='flex items-center justify-between gap-3'>
                        <span className='text-paragraph-sm text-text-sub-500 truncate'>
                          {label}
                        </span>
                        <span className='inline-flex items-center justify-center min-w-6 h-6 rounded-full text-[13px] font-semibold bg-bg-weak-100 text-text-main-900'>
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Popover.Content>
            </Popover.Root>
          );
        }

        return <CardContent key={stat.key} />;
      })}
    </div>
  );
};

export default TeamStats;
