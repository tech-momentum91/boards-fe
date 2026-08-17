// AlignUI Tag v0.0.0 (JSX Version)

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { RiCloseFill } from 'react-icons/ri';

import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { tv } from '@/utils/tv';

const TAG_ROOT_NAME = 'TagRoot';
const TAG_ICON_NAME = 'TagIcon';
const TAG_DISMISS_BUTTON_NAME = 'TagDismissButton';
const TAG_DISMISS_ICON_NAME = 'TagDismissIcon';

export const tagVariants = tv({
  slots: {
    root: [
      'group/tag inline-flex h-6  items-center gap-2 rounded-md px-2 text-label-xs text-text-sub-600',
      'transition duration-200 ease-out',
      'ring-1 ring-inset',
    ],
    icon: [
      '-mx-1 size-4 shrink-0 text-text-soft-400 transition duration-200 ease-out',
      'group-hover/tag:text-text-sub-600',
    ],
    dismissButton: ['group/dismiss-button -ml-1.5 -mr-1 size-4 shrink-0', 'focus:outline-none'],
    dismissIcon: 'size-4 text-text-soft-400 cursor-pointer transition duration-200 ease-out',
  },
  variants: {
    variant: {
      stroke: {
        root: [
          'bg-bg-white-0 ring-stroke-soft-200',
          'hover:bg-bg-weak-50 hover:ring-transparent',
          'focus-within:bg-bg-weak-50 focus-within:ring-transparent',
        ],
        dismissIcon: [
          'group-hover/dismiss-button:text-text-sub-600',
          'group-focus/dismiss-button:text-text-sub-600',
        ],
      },
      gray: {
        root: ['bg-bg-weak-50 ring-transparent', 'hover:bg-bg-white-0 hover:ring-stroke-soft-200'],
      },
    },
    disabled: {
      true: {
        root: 'pointer-events-none bg-bg-weak-50 text-text-disabled-300 ring-transparent',
        icon: 'text-text-disabled-300 [&:not(.remixicon)]:opacity-[.48]',
        dismissIcon: 'text-text-disabled-300',
      },
    },
  },
  defaultVariants: {
    variant: 'stroke',
  },
});

const TagRoot = React.forwardRef(
  ({ asChild, children, variant, disabled, className, ...rest }, forwardedRef) => {
    const uniqueId = React.useId();
    const Component = asChild ? Slot : 'div';
    const { root } = tagVariants({ variant, disabled });

    const sharedProps = { variant, disabled };

    const extendedChildren = recursiveCloneChildren(
      children,
      sharedProps,
      [TAG_ICON_NAME, TAG_DISMISS_BUTTON_NAME, TAG_DISMISS_ICON_NAME],
      uniqueId,
      asChild,
    );

    return (
      <Component
        ref={forwardedRef}
        className={root({ class: className })}
        aria-disabled={disabled}
        {...rest}
      >
        {extendedChildren}
      </Component>
    );
  },
);
TagRoot.displayName = TAG_ROOT_NAME;

function TagIcon({ className, variant, disabled, as, ...rest }) {
  const Component = as || 'div';
  const { icon } = tagVariants({ variant, disabled });

  return <Component className={icon({ class: className })} {...rest} />;
}
TagIcon.displayName = TAG_ICON_NAME;

const TagDismissButton = React.forwardRef(
  ({ asChild, children, className, variant, disabled, ...rest }, forwardedRef) => {
    const Component = asChild ? Slot : 'button';
    const { dismissButton } = tagVariants({ variant, disabled });

    return (
      <Component ref={forwardedRef} className={dismissButton({ class: className })} {...rest}>
        {children ?? <TagDismissIcon variant={variant} disabled={disabled} as={RiCloseFill} />}
      </Component>
    );
  },
);
TagDismissButton.displayName = TAG_DISMISS_BUTTON_NAME;

function TagDismissIcon({ className, variant, disabled, as, ...rest }) {
  const Component = as || 'div';
  const { dismissIcon } = tagVariants({ variant, disabled });

  return <Component className={dismissIcon({ class: className })} {...rest} />;
}
TagDismissIcon.displayName = TAG_DISMISS_ICON_NAME;

export {
  TagRoot as Root,
  TagIcon as Icon,
  TagDismissButton as DismissButton,
  TagDismissIcon as DismissIcon,
};
