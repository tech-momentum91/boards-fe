import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import {
  SPACE_STATUS_TAB_OPTIONS,
  SPACE_STATUS_TAB_VALUES_SALES_INSIDE_SALES,
} from '@/components/space-management/constants';
import { isSalesOrInsideSalesRole } from '@/utils/user-role-utils';

const SpaceStatusTabs = ({ value = 'all', counts = {}, onValueChange, hideBorderTop = false }) => {
  const { userSideBarPerm } = useSelector((state) => state.auth);

  const items = useMemo(() => {
    if (!isSalesOrInsideSalesRole(userSideBarPerm)) {
      return SPACE_STATUS_TAB_OPTIONS;
    }
    const allowed = new Set(SPACE_STATUS_TAB_VALUES_SALES_INSIDE_SALES);
    return SPACE_STATUS_TAB_OPTIONS.filter((t) => allowed.has(t.value));
  }, [userSideBarPerm]);

  const safeValue = items.some((t) => t.value === value) ? value : 'all';

  // Parent may still have e.g. Occupied in state while that tab is hidden for Sales / Inside Sales
  useEffect(() => {
    if (!onValueChange || !value || value === 'all') return;
    if (!items.some((t) => t.value === value)) {
      onValueChange('all');
    }
  }, [value, items, onValueChange]);

  return (
    <TabMenuHorizontal.Root value={safeValue} onValueChange={onValueChange}>
      <TabMenuHorizontal.List
        className={`gap-6 ${hideBorderTop ? 'border-t-0' : ''}`}
        wrapperClassName='w-full'
      >
        {items.map((tab) => {
          const count = counts[tab.value] || 0;
          const Icon = tab.icon;
          return (
            <TabMenuHorizontal.Trigger
              key={tab.value}
              value={tab.value}
              className='group h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
            >
              <TabMenuHorizontal.Icon as={Icon} className='size-4' />
              <span>{tab.label}</span>
              <span className='inline-flex items-center justify-center rounded-full bg-bg-weak-100 px-2 py-0.5 text-[12px] text-text-sub-600 group-data-[state=active]:bg-green-500 group-data-[state=active]:text-white group-data-[state=active]:font-semibold'>
                {count ?? 0}
              </span>
            </TabMenuHorizontal.Trigger>
          );
        })}
      </TabMenuHorizontal.List>
      {items.map((tab) => (
        <TabMenuHorizontal.Content key={tab.value} value={tab.value} className='sr-only'>
          {tab.label}
        </TabMenuHorizontal.Content>
      ))}
    </TabMenuHorizontal.Root>
  );
};

export default SpaceStatusTabs;
