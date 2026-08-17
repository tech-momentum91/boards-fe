// AlignUI Label v0.0.0

'use client';

import * as React from 'react';
import * as LabelPrimitives from '@radix-ui/react-label';

import { cn } from '@/utils/cn';

const LabelRoot = React.forwardRef((props, forwardedRef) => {
  const { className, disabled, ...rest } = props;

  return (
    <LabelPrimitives.Root
      ref={forwardedRef}
      className={cn(
        'group text-label-sm text-[var(--color-text-main-900)]',
        // disabled
        'aria-disabled:text-text-disabled-300',
        className,
      )}
      aria-disabled={disabled}
      {...rest}
    />
  );
});
LabelRoot.displayName = 'LabelRoot';

function LabelAsterisk({ className, children, ...rest }) {
  return (
    <span
      className={cn(
        'text-[var(--color-text-soft-400)]',
        // disabled
        'group-aria-disabled:text-text-disabled-300',
        className,
      )}
      {...rest}
    >
      {children || '*'}
    </span>
  );
}

function LabelSub({ children, className, ...rest }) {
  return (
    <span
      className={cn(
        'text-paragraph-sm text-text-sub-600',
        // disabled
        'group-aria-disabled:text-text-disabled-300',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export { LabelRoot as Root, LabelAsterisk as Asterisk, LabelSub as Sub };
