// AlignUI Hint v0.0.0

import * as React from 'react';
import type { VariantProps } from 'tailwind-variants';

import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { tv } from '@/utils/tv';

const HINT_ROOT_NAME = 'HintRoot';
const HINT_ICON_NAME = 'HintIcon';

export const hintVariants = tv({
  slots: {
    root: 'group flex items-center gap-1 text-paragraph-xs text-text-sub-600',
    icon: 'size-4 shrink-0 text-text-soft-400',
  },
  variants: {
    disabled: {
      true: {
        root: 'text-text-disabled-300',
        icon: 'text-text-disabled-300',
      },
    },
    hasError: {
      true: {
        root: 'text-error-base',
        icon: 'text-error-base',
      },
    },
  },
});

type HintSharedProps = VariantProps<typeof hintVariants>;

type HintRootProps = React.HTMLAttributes<HTMLDivElement> &
  HintSharedProps & {
    children?: React.ReactNode;
  };

function HintRoot({ children, hasError, disabled, className, ...rest }: HintRootProps) {
  const uniqueId = React.useId();
  const { root } = hintVariants({ hasError, disabled });

  const sharedProps: HintSharedProps = {
    hasError,
    disabled,
  };

  const extendedChildren = recursiveCloneChildren(
    children,
    sharedProps,
    [HINT_ICON_NAME],
    uniqueId,
    undefined,
  );

  return (
    <div className={root({ class: className })} {...rest}>
      {extendedChildren}
    </div>
  );
}
HintRoot.displayName = HINT_ROOT_NAME;

type HintIconProps = HintSharedProps &
  React.HTMLAttributes<HTMLElement> & {
    as?: React.ElementType;
  };

function HintIcon({ as, className, hasError, disabled, ...rest }: HintIconProps) {
  const Component = as || 'div';
  const { icon } = hintVariants({ hasError, disabled });

  return <Component className={icon({ class: className })} {...rest} />;
}
HintIcon.displayName = HINT_ICON_NAME;

export { HintRoot as Root, HintIcon as Icon };
