// AlignUI Accordion v0.0.0

'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { RiAddLine, RiSubtractLine } from 'react-icons/ri';

import { cn } from '@/utils/cn';

const ACCORDION_ITEM_NAME = 'AccordionItem';
const ACCORDION_ICON_NAME = 'AccordionIcon';
const ACCORDION_ARROW_NAME = 'AccordionArrow';
const ACCORDION_TRIGGER_NAME = 'AccordionTrigger';
const ACCORDION_CONTENT_NAME = 'AccordionContent';

const AccordionRoot = AccordionPrimitive.Root;
const AccordionHeader = AccordionPrimitive.Header;

const AccordionItem = React.forwardRef(({ className, ...rest }, forwardedRef) => {
  return (
    <AccordionPrimitive.Item
      ref={forwardedRef}
      className={cn(
        'group/accordion',
        'rounded-10 bg-bg-white-0 p-3.5 ring-1 ring-inset ring-stroke-soft-200',
        'transition duration-200 ease-out',
        'hover:bg-bg-weak-50 hover:ring-transparent',
        'has-[:focus-visible]:bg-bg-weak-50 has-[:focus-visible]:ring-transparent',
        'data-[state=open]:bg-bg-weak-50 data-[state=open]:ring-transparent',
        className,
      )}
      {...rest}
    />
  );
});
AccordionItem.displayName = ACCORDION_ITEM_NAME;

const AccordionTrigger = React.forwardRef(({ children, className, ...rest }, forwardedRef) => {
  return (
    <AccordionPrimitive.Trigger
      ref={forwardedRef}
      className={cn(
        'w-[calc(100%+theme(space.7))] text-left text-label-sm text-text-strong-950',
        'grid auto-cols-auto grid-flow-col grid-cols-[auto,minmax(0,1fr)] items-center gap-2.5',
        '-m-3.5 p-3.5 outline-none',
        'focus:outline-none',
        className,
      )}
      {...rest}
    >
      {children}
    </AccordionPrimitive.Trigger>
  );
});
AccordionTrigger.displayName = ACCORDION_TRIGGER_NAME;

function AccordionIcon({ className, as: Component = 'div', ...rest }) {
  return <Component className={cn('size-5 text-text-sub-600', className)} {...rest} />;
}
AccordionIcon.displayName = ACCORDION_ICON_NAME;

function AccordionArrow({
  className,
  openIcon: OpenIcon = RiAddLine,
  closeIcon: CloseIcon = RiSubtractLine,
  ...rest
}) {
  return (
    <>
      <OpenIcon
        className={cn(
          'size-5 text-text-soft-400',
          'transition duration-200 ease-out',
          'group-hover/accordion:text-text-sub-600',
          'group-data-[state=open]/accordion:hidden',
          className,
        )}
        {...rest}
      />
      <CloseIcon
        className={cn(
          'size-5 text-text-sub-600',
          'hidden group-data-[state=open]/accordion:block',
          className,
        )}
        {...rest}
      />
    </>
  );
}
AccordionArrow.displayName = ACCORDION_ARROW_NAME;

const AccordionContent = React.forwardRef(({ children, className, ...rest }, forwardedRef) => {
  return (
    <AccordionPrimitive.Content
      ref={forwardedRef}
      className='overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down'
      {...rest}
    >
      <div className={cn('pt-1.5 text-paragraph-sm text-text-sub-600', className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
});
AccordionContent.displayName = ACCORDION_CONTENT_NAME;

export {
  AccordionRoot as Root,
  AccordionHeader as Header,
  AccordionItem as Item,
  AccordionTrigger as Trigger,
  AccordionIcon as Icon,
  AccordionArrow as Arrow,
  AccordionContent as Content,
};
