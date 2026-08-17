import * as React from 'react';
import { Slottable } from '@radix-ui/react-slot';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import mergeRefs from 'merge-refs';

import { useTabObserver } from '@/hooks/use-tab-observer';
import { cn } from '@/lib/utils';

const TabMenuHorizontalContent = TabsPrimitive.Content;
TabMenuHorizontalContent.displayName = 'TabMenuHorizontalContent';

// Root
const TabMenuHorizontalRoot = React.forwardRef(({ className, ...rest }, forwardedRef) => {
  return (
    <TabsPrimitive.Root
      ref={forwardedRef}
      orientation='horizontal'
      className={cn('w-full', className)}
      {...rest}
    />
  );
});
TabMenuHorizontalRoot.displayName = 'TabMenuHorizontalRoot';

// List
const TabMenuHorizontalList = React.forwardRef(
  ({ children, className, wrapperClassName, ...rest }, forwardedRef) => {
    const [lineStyle, setLineStyle] = React.useState({ width: 0, left: 0 });
    const listWrapperRef = React.useRef(null);

    const { mounted, listRef } = useTabObserver({
      onActiveTabChange: (_, activeTab) => {
        const { offsetWidth: width, offsetLeft: left } = activeTab;
        setLineStyle({ width, left });

        const listWrapper = listWrapperRef.current;
        if (listWrapper) {
          const containerWidth = listWrapper.clientWidth;
          const scrollPosition = left - containerWidth / 2 + width / 2;

          listWrapper.scrollTo({
            left: scrollPosition,
            behavior: 'smooth',
          });
        }
      },
    });

    return (
      <div
        ref={listWrapperRef}
        className={cn('relative grid overflow-x-auto overscroll-contain', wrapperClassName)}
      >
        <TabsPrimitive.List
          ref={mergeRefs(forwardedRef, listRef)}
          className={cn(
            'group/tab-list relative flex h-12 items-center gap-6 whitespace-nowrap border-y border-stroke-soft-200',
            className,
          )}
          {...rest}
        >
          <Slottable>{children}</Slottable>

          {/* Active tab indicator */}
          <div
            className={cn(
              'pointer-events-none absolute bottom-0 left-0 z-10 h-0.5 bg-primary-base opacity-0 transition-all duration-300 group-has-data-[state=active]/tab-list:opacity-100',
              { hidden: !mounted },
            )}
            style={{
              transform: `translate3d(${lineStyle.left}px, 0, 0)`,
              width: `${lineStyle.width}px`,
              transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)',
            }}
            aria-hidden='true'
          />
        </TabsPrimitive.List>
      </div>
    );
  },
);
TabMenuHorizontalList.displayName = 'TabMenuHorizontalList';

// Trigger
const TabMenuHorizontalTrigger = React.forwardRef(({ className, ...rest }, forwardedRef) => {
  return (
    <TabsPrimitive.Trigger
      ref={forwardedRef}
      className={`${cn(
        'group/tab-item cursor-pointer h-12 py-3.5 text-label-sm outline-none',
        'flex items-center justify-center gap-1.5',
        'transition duration-200 ease-out',
        'focus:outline-none',
        'data-[state=active]:text-text-strong-950',
        className,
      )} ${'text-text-sub-500'}`}
      {...rest}
    />
  );
});
TabMenuHorizontalTrigger.displayName = 'TabMenuHorizontalTrigger';

// Icon
function TabMenuHorizontalIcon({ className, as, ...rest }) {
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
TabMenuHorizontalIcon.displayName = 'TabsHorizontalIcon';

// Arrow Icon
function TabMenuHorizontalArrowIcon({ className, as, ...rest }) {
  const Component = as || 'div';

  return <Component className={cn('size-5 text-text-sub-600', className)} {...rest} />;
}
TabMenuHorizontalArrowIcon.displayName = 'TabsHorizontalArrow';

export {
  TabMenuHorizontalRoot as Root,
  TabMenuHorizontalList as List,
  TabMenuHorizontalTrigger as Trigger,
  TabMenuHorizontalIcon as Icon,
  TabMenuHorizontalArrowIcon as ArrowIcon,
  TabMenuHorizontalContent as Content,
};
