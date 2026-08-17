import React from 'react';
import * as SegmentedControl from '@/components/ui/segmented-control';
import { MY_TASK_VIEW_TABS } from '@/components/my-tasks/my-task-constants';

const MyTaskViewTabs = ({ value = 'list', onValueChange }) => {
  return (
    <SegmentedControl.Root value={value} onValueChange={onValueChange}>
      <SegmentedControl.List className='gap-6 border-t-0' wrapperClassName='w-auto'>
        {MY_TASK_VIEW_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <SegmentedControl.Trigger key={tab.id} value={tab.id} className='h-8 px-4'>
              {Icon && <Icon className='size-4' />}
              <span>{tab.label}</span>
            </SegmentedControl.Trigger>
          );
        })}
      </SegmentedControl.List>
      {MY_TASK_VIEW_TABS.map((tab) => (
        <SegmentedControl.Content key={tab.id} value={tab.id} className='sr-only'>
          {tab.label}
        </SegmentedControl.Content>
      ))}
    </SegmentedControl.Root>
  );
};

export default MyTaskViewTabs;
