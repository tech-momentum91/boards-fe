import React from 'react';
import { RiChat2Line, RiStackLine } from 'react-icons/ri';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import {
  PROJECT_DRAWER_TAB_LIST_CLASS,
  PROJECT_TAB_TRIGGER_CLASS,
} from '@/components/projects/constants';

export default function ProjectDrawerCommentLayoutTabs({
  value,
  onValueChange,
  commentsContent,
  layoutContent,
  className = '',
}) {
  return (
    <TabMenuHorizontal.Root
      value={value}
      onValueChange={onValueChange}
      className={`flex min-h-0 flex-1 flex-col overflow-hidden ${className}`.trim()}
    >
      <TabMenuHorizontal.List className={PROJECT_DRAWER_TAB_LIST_CLASS}>
        <TabMenuHorizontal.Trigger className={PROJECT_TAB_TRIGGER_CLASS} value='comments'>
          <TabMenuHorizontal.Icon as={RiChat2Line} />
          Comments
        </TabMenuHorizontal.Trigger>
        <TabMenuHorizontal.Trigger className={PROJECT_TAB_TRIGGER_CLASS} value='layout'>
          <TabMenuHorizontal.Icon as={RiStackLine} />
          Layout
        </TabMenuHorizontal.Trigger>
      </TabMenuHorizontal.List>

      <TabMenuHorizontal.Content
        value='comments'
        className='flex min-h-0 flex-1 flex-col overflow-hidden'
      >
        {commentsContent}
      </TabMenuHorizontal.Content>

      <TabMenuHorizontal.Content
        value='layout'
        className='flex min-h-0 flex-1 flex-col overflow-hidden'
      >
        {layoutContent}
      </TabMenuHorizontal.Content>
    </TabMenuHorizontal.Root>
  );
}
