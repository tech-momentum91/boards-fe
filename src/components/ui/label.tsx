// AlignUI Label v0.0.0

'use client';

import * as React from 'react';
import * as LabelPrimitives from '@radix-ui/react-label';

import { cn } from '@/utils/cn';

type LabelRootProps = React.ComponentPropsWithoutRef<typeof LabelPrimitives.Root> & {
  disabled?: boolean;
};

const LabelRoot = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitives.Root>,
  LabelRootProps
>((props, forwardedRef) => {
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

type LabelAsteriskProps = React.HTMLAttributes<HTMLSpanElement>;

function LabelAsterisk({ className, children, ...rest }: LabelAsteriskProps) {
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

type LabelSubProps = React.HTMLAttributes<HTMLSpanElement>;

function LabelSub({ children, className, ...rest }: LabelSubProps) {
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
