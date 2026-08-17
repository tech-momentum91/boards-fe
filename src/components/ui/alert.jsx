// AlignUI Alert (JSX Version)

import * as React from 'react';
import { RiCloseLine } from 'react-icons/ri';

import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { tv } from '@/utils/tv';

const ALERT_ROOT_NAME = 'AlertRoot';
const ALERT_ICON_NAME = 'AlertIcon';
const ALERT_CLOSE_ICON_NAME = 'AlertCloseIcon';

export const alertVariants = tv({
  slots: {
    root: 'w-full',
    wrapper: [
      'grid w-full  auto-cols-auto grid-flow-col grid-cols-1 items-start justify-start has-[>svg:first-child]:grid-cols-[auto,minmax(0,1fr)]',
      'transition duration-200 ease-out group-data-[expanded=false]/toast:group-data-[front=false]/toast:opacity-0',
    ],
    icon: 'shrink-0',
    closeIcon: '',
  },
  variants: {
    variant: {
      filled: {
        root: 'text-static-white',
        closeIcon: 'text-static-white opacity-[.72]',
      },
      light: {
        root: 'text-text-strong-950',
        closeIcon: 'text-text-strong-950 opacity-40',
      },
      lighter: {
        root: 'text-text-strong-950',
        closeIcon: 'text-text-strong-950 opacity-40',
      },
      stroke: {
        root: 'bg-bg-white-0 text-text-strong-950 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200',
        closeIcon: 'text-text-strong-950 opacity-40',
      },
    },
    status: {
      error: {},
      warning: {},
      success: {},
      information: {},
      feature: {},
    },
    size: {
      xsmall: {
        root: 'rounded-lg p-2 text-paragraph-xs',
        wrapper: 'gap-2',
        icon: 'size-4',
        closeIcon: 'size-4',
      },
      small: {
        root: 'rounded-lg px-2.5 py-2 text-paragraph-sm',
        wrapper: 'gap-2',
        icon: 'size-5',
        closeIcon: 'size-5',
      },
      large: {
        root: 'rounded-xl p-3.5 pb-4 text-paragraph-sm',
        wrapper: 'items-start gap-3',
        icon: 'size-5',
        closeIcon: 'size-5',
      },
    },
  },
  compoundVariants: [
    { variant: 'filled', status: 'error', class: { root: 'bg-error-base' } },
    { variant: 'filled', status: 'warning', class: { root: 'bg-warning-base' } },
    { variant: 'filled', status: 'success', class: { root: 'bg-success-base' } },
    { variant: 'filled', status: 'information', class: { root: 'bg-information-base' } },
    { variant: 'filled', status: 'feature', class: { root: 'bg-faded-base' } },

    { variant: 'light', status: 'error', class: { root: 'bg-error-light' } },
    { variant: 'light', status: 'warning', class: { root: 'bg-warning-light' } },
    { variant: 'light', status: 'success', class: { root: 'bg-success-light' } },
    { variant: 'light', status: 'information', class: { root: 'bg-information-light' } },
    { variant: 'light', status: 'feature', class: { root: 'bg-faded-light' } },

    { variant: 'lighter', status: 'error', class: { root: 'bg-error-lighter' } },
    { variant: 'lighter', status: 'warning', class: { root: 'bg-warning-lighter' } },
    { variant: 'lighter', status: 'success', class: { root: 'bg-success-lighter' } },
    { variant: 'lighter', status: 'information', class: { root: 'bg-information-lighter' } },
    { variant: 'lighter', status: 'feature', class: { root: 'bg-faded-lighter' } },

    {
      variant: ['light', 'lighter', 'stroke'],
      status: 'error',
      class: { icon: 'text-error-base' },
    },
    {
      variant: ['light', 'lighter', 'stroke'],
      status: 'warning',
      class: { icon: 'text-warning-base' },
    },
    {
      variant: ['light', 'lighter', 'stroke'],
      status: 'success',
      class: { icon: 'text-success-base' },
    },
    {
      variant: ['light', 'lighter', 'stroke'],
      status: 'information',
      class: { icon: 'text-information-base' },
    },
    {
      variant: ['light', 'lighter', 'stroke'],
      status: 'feature',
      class: { icon: 'text-faded-base' },
    },
  ],
  defaultVariants: {
    size: 'small',
    variant: 'filled',
    status: 'information',
  },
});

// ------------------
// ROOT
// ------------------
const AlertRoot = React.forwardRef((props, forwardedRef) => {
  const { children, className, wrapperClassName, size, variant, status, ...rest } = props;

  const uniqueId = React.useId();
  const { root, wrapper } = alertVariants({ size, variant, status });

  const sharedProps = { size, variant, status };

  const extendedChildren = recursiveCloneChildren(
    children,
    sharedProps,
    [ALERT_ICON_NAME, ALERT_CLOSE_ICON_NAME],
    uniqueId,
  );

  return (
    <div ref={forwardedRef} className={root({ class: className })} {...rest}>
      <div className={wrapper({ class: wrapperClassName })}>{extendedChildren}</div>
    </div>
  );
});
AlertRoot.displayName = ALERT_ROOT_NAME;

// ------------------
// ICON
// ------------------
function AlertIcon({ size, variant, status, className, as }) {
  const Component = as || 'div';
  const { icon } = alertVariants({ size, variant, status });

  return <Component className={icon({ class: className })} />;
}
AlertIcon.displayName = ALERT_ICON_NAME;

// ------------------
// CLOSE ICON
// ------------------
function AlertCloseIcon({ size, variant, status, className, as }) {
  const Component = as || RiCloseLine;
  const { closeIcon } = alertVariants({ size, variant, status });

  return <Component className={closeIcon({ class: className })} />;
}
AlertCloseIcon.displayName = ALERT_CLOSE_ICON_NAME;

// ------------------
export { AlertRoot as Root, AlertIcon as Icon, AlertCloseIcon as CloseIcon };
