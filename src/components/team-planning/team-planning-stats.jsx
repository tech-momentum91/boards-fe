import React from 'react';
import { RiGroupFill, RiUser2Fill, RiBriefcase4Fill, RiAlertFill } from 'react-icons/ri';
import { TEAM_PLANNING_STATS_CONFIG } from './constants';

const ICONS = {
  group: RiGroupFill,
  user: RiUser2Fill,
  briefcase: RiBriefcase4Fill,
  alert: RiAlertFill,
};

const TeamPlanningStats = ({ stats = {} }) => {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5'>
      {TEAM_PLANNING_STATS_CONFIG.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <div
            key={item.key}
            className={`flex min-h-[84px] items-start rounded-xl bg-linear-to-b p-4 shadow-[0px_2px_4px_rgba(27,28,29,0.04)] ${item.gradient}`}
          >
            <div className='flex flex-1 items-start justify-between gap-4'>
              <div className='flex flex-col gap-1'>
                <div
                  className={`text-[24px] font-medium leading-8 tracking-[-0.36px] ${item.textColor}`}
                >
                  {stats[item.key] ?? 0}
                </div>
                <div className={`text-subheading-xs uppercase opacity-72 ${item.textColor}`}>
                  {item.label}
                </div>
              </div>
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full bg-white shadow-[0px_2px_2px_rgba(27,28,29,0.04)] ${item.iconWrap}`}
              >
                <Icon className={`size-5 ${item.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TeamPlanningStats;
