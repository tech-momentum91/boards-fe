import React from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import { QA_CATEGORY_ITEMS } from '@/pages/profile/knowledge-center-qa-constants';

/**
 * Vertical category nav — same interaction pattern as Center “About” sidebar (icons + active pill + arrow).
 */
export default function KnowledgeCenterQaCategorySidebar({
  value,
  onValueChange,
  countForCategoryItem,
}) {
  return (
    <TabMenuVertical.Root
      value={value}
      onValueChange={onValueChange}
      className='flex h-full min-h-0 flex-col'
    >
      <TabMenuVertical.List className='h-full min-h-0 min-w-[240px] space-y-2 overflow-y-auto border-r border-stroke-soft-200 bg-[#F6F8FA] p-4'>
        {QA_CATEGORY_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <TabMenuVertical.Trigger
              key={item.value}
              value={item.value}
              className='group data-[state=active]:bg-bg-white-0 group-data-[state=active]:shadow-regular-sm'
            >
              <TabMenuVertical.Icon as={Icon} />
              <span className='flex min-w-0 flex-1 items-center justify-between gap-2'>
                <span className='truncate'>{item.label}</span>
                <Badge.Root
                  variant='stroke'
                  size='medium'
                  color='gray'
                  className='shrink-0 px-1.5 text-text-sub-500 bg-white group-data-[state=active]:hidden'
                >
                  {countForCategoryItem(item)}
                </Badge.Root>
              </span>
              <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
            </TabMenuVertical.Trigger>
          );
        })}
      </TabMenuVertical.List>
    </TabMenuVertical.Root>
  );
}
