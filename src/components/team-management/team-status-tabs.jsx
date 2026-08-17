import React from 'react';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { TEAM_STATUS_TAB_OPTIONS } from '@/components/team-management/constants';
import { TeamManagementCenters } from '.';
import TeamManagementCoreTeam from './team-management-core-team';
import TeamManagementSupportTeam from './team-management-support-team';
import { useNavigate } from 'react-router-dom';

const TeamStatusTabs = ({ value = 'all', counts = {}, onValueChange, ...props }) => {
  // console.log('counts', counts);
  const countsMap = {
    centers: counts.centers_count,
    core: counts.core_team_count,
    support: counts.support_team_count,
  };

  const navigate = useNavigate();

  return (
    <TabMenuHorizontal.Root
      className='flex flex-col flex-1 min-h-0 w-full'
      value={value}
      onValueChange={onValueChange}
    >
      <TabMenuHorizontal.List className='gap-6 border-y-0 border-b' wrapperClassName='w-full'>
        {TEAM_STATUS_TAB_OPTIONS.map((tab) => {
          const count = counts[tab.value] || 0;
          const Icon = tab.icon;
          return (
            <TabMenuHorizontal.Trigger
              key={tab.value}
              value={tab.value}
              onClick={() => navigate(tab.path)}
              className='h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
            >
              <TabMenuHorizontal.Icon as={Icon} className='size-4' />
              <span>{tab.label}</span>
              <span className='inline-flex items-center justify-center rounded-full bg-bg-weak-100 px-2 py-0.5 text-[12px] text-text-sub-600 group-data-[state=active]/tab-item:bg-black group-data-[state=active]/tab-item:text-white'>
                {countsMap[tab.value] ?? 0}
              </span>
            </TabMenuHorizontal.Trigger>
          );
        })}
      </TabMenuHorizontal.List>
      {TEAM_STATUS_TAB_OPTIONS.map((tab) => (
        <TabMenuHorizontal.Content
          key={tab.value}
          value={tab.value}
          className='flex-1 min-h-0 flex flex-col w-full data-[state=active]:flex'
        >
          {tab.value === 'centers' && <TeamManagementCenters {...props} activeTab={value} />}
          {tab.value === 'core' && (
            <TeamManagementCoreTeam
              {...props}
              activeTab={value}
              onEdit={props.onEditCoreTeam}
              onDelete={props.onDeleteCoreTeam}
            />
          )}
          {tab.value === 'support' && (
            <TeamManagementSupportTeam
              {...props}
              teamTabValue={value}
              onEdit={props.onEditSupportTeam}
              onDelete={props.onDeleteSupportTeam}
            />
          )}
        </TabMenuHorizontal.Content>
      ))}
    </TabMenuHorizontal.Root>
  );
};

export default TeamStatusTabs;
