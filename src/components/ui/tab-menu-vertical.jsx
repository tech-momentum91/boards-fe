'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/utils/cn';

const TabMenuVerticalContent = TabsPrimitive.Content;
TabMenuVerticalContent.displayName = 'TabMenuVerticalContent';

const TabMenuVerticalRoot = React.forwardRef(({ ...rest }, forwardedRef) => {
  return <TabsPrimitive.Root ref={forwardedRef} orientation='vertical' {...rest} />;
});
TabMenuVerticalRoot.displayName = 'TabMenuVerticalRoot';

const TabMenuVerticalList = React.forwardRef(({ className, ...rest }, forwardedRef) => {
  return (
    <TabsPrimitive.List
      ref={forwardedRef}
      className={cn('w-full border-r  px-2  border-r-stroke-soft-200 space-y-2', className)}
      {...rest}
    />
  );
});
TabMenuVerticalList.displayName = 'TabMenuVerticalList';

const TabMenuVerticalTrigger = React.forwardRef(({ className, ...rest }, forwardedRef) => {
  return (
    <TabsPrimitive.Trigger
      ref={forwardedRef}
      className={cn(
        // base
        'group/tab-item w-full rounded-lg p-2 text-left text-label-sm text-text-sub-600 outline-none',
        'grid auto-cols-auto grid-flow-col grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5',
        'transition duration-200 ease-out',
        // hover
        'hover:bg-bg-weak-50',
        // focus
        'focus:outline-none',
        // active
        'data-[state=active]:bg-bg-weak-50 data-[state=active]:text-text-strong-950',
        className,
      )}
      type='button'
      {...rest}
    />
  );
});
TabMenuVerticalTrigger.displayName = 'TabMenuVerticalTrigger';

function TabMenuVerticalIcon({ className, as, ...rest }) {
  const Component = as || 'div';

  return (
    <Component
      className={cn(
        'size-5 text-text-soft-400',
        'transition duration-200 ease-out',
        'group-data-[state=active]/tab-item:text-primary-base',
        className,
      )}
      {...rest}
    />
  );
}
TabMenuVerticalIcon.displayName = 'TabsVerticalIcon';

function TabMenuVerticalArrowIcon({ className, as, ...rest }) {
  const Component = as || 'div';

  return (
    <Component
      className={cn(
        'size-5 p-px flex self-end justify-end text-text-sub-600',
        'rounded-full bg-bg-weak-100 opacity-0 shadow-regular-xs',
        'scale-75 transition ease-out',
        'group-data-[state=active]/tab-item:scale-100 group-data-[state=active]/tab-item:opacity-100',
        'hidden',
        'group-data-[state=active]/tab-item:block',
        className,
      )}
      {...rest}
    />
  );
}
TabMenuVerticalArrowIcon.displayName = 'TabMenuVerticalArrowIcon';

export {
  TabMenuVerticalRoot as Root,
  TabMenuVerticalList as List,
  TabMenuVerticalTrigger as Trigger,
  TabMenuVerticalIcon as Icon,
  TabMenuVerticalArrowIcon as ArrowIcon,
  TabMenuVerticalContent as Content,
};
