// AlignUI CompactButton v0.0.0

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { tv } from '@/utils/tv';

const COMPACT_BUTTON_ROOT_NAME = 'CompactButtonRoot';
const COMPACT_BUTTON_ICON_NAME = 'CompactButtonIcon';

export const compactButtonVariants = tv({
  slots: {
    root: [
      'relative flex shrink-0 items-center justify-center outline-none',
      'transition duration-200 ease-out',
      'disabled:pointer-events-none disabled:border-transparent disabled:bg-transparent disabled:text-text-disabled-300 disabled:shadow-none',
      'focus:outline-none',
    ],
    icon: '',
  },
  variants: {
    variant: {
      stroke: {
        root: [
          'border border-stroke-soft-200 bg-bg-white-0 text-text-sub-600 shadow-regular-xs',
          'hover:border-transparent hover:bg-bg-weak-50 hover:text-[var(--color-text-sub-500)] hover:shadow-none',
          'focus-visible:border-transparent focus-visible:bg-bg-strong-950 focus-visible:text-text-white-0 focus-visible:shadow-none',
        ],
      },
      ghost: {
        root: [
          'bg-transparent text-text-sub-600',
          'hover:bg-bg-weak-50 hover:text-text-strong-950',
          'focus-visible:bg-bg-strong-950 focus-visible:text-text-white-0',
        ],
      },
      white: {
        root: [
          'bg-bg-white-0 text-text-sub-600 shadow-regular-xs',
          'hover:bg-bg-weak-50 hover:text-text-strong-950',
          'focus-visible:bg-bg-strong-950 focus-visible:text-text-white-0',
        ],
      },
      primary: {
        root: [
          'bg-primary-base text-text-white-0',
          'hover:bg-primary-darker',
          'focus-visible:bg-primary-darker',
        ],
      },
      error: {
        root: [
          // kind of ghost when hover show error color
          'bg-transparent hover:text-error-base ring-transparent',
          'hover:bg-red-alpha-10 hover:ring-error-base',
          'focus-visible:bg-bg-white-0 focus-visible:shadow-button-error-focus focus-visible:ring-error-base',
        ],
      },
      modifiable: {},
    },
    size: {
      large: {
        root: 'size-6',
        icon: 'size-5',
      },
      medium: {
        root: 'size-5',
        icon: 'size-[18px]',
      },
    },
    fullRadius: {
      true: {
        root: 'rounded-full',
      },
      false: {
        root: 'rounded-md',
      },
    },
  },
  defaultVariants: {
    variant: 'stroke',
    size: 'large',
    fullRadius: false,
  },
});

const CompactButtonRoot = React.forwardRef(
  ({ asChild, variant, size, fullRadius, children, className, ...rest }, forwardedRef) => {
    const uniqueId = React.useId();
    const Component = asChild ? Slot : 'button';
    const { root } = compactButtonVariants({ variant, size, fullRadius });

    const sharedProps = { variant, size };

    const extendedChildren = recursiveCloneChildren(
      children,
      sharedProps,
      [COMPACT_BUTTON_ICON_NAME],
      uniqueId,
      asChild,
    );

    return (
      <Component ref={forwardedRef} className={root({ class: className })} {...rest}>
        {extendedChildren}
      </Component>
    );
  },
);
CompactButtonRoot.displayName = COMPACT_BUTTON_ROOT_NAME;

function CompactButtonIcon({ variant, size, as, className, ...rest }) {
  const Component = as || 'div';
  const { icon } = compactButtonVariants({ variant, size });

  return <Component className={icon({ class: className })} {...rest} />;
}
CompactButtonIcon.displayName = COMPACT_BUTTON_ICON_NAME;

export { CompactButtonRoot as Root, CompactButtonIcon as Icon };
