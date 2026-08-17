import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { tv } from '@/utils/tv';

const BANNER_ROOT_NAME = 'BannerRoot';
const BANNER_CONTENT_NAME = 'BannerContent';
const BANNER_ICON_NAME = 'BannerIcon';
const BANNER_CLOSE_BUTTON_NAME = 'BannerCloseButton';

export const bannerVariants = tv({
  slots: {
    root: 'relative grid h-11 w-full grid-cols-[1fr,auto,1fr] items-center justify-center gap-3 px-3',
    content: 'col-start-2 flex items-center justify-center gap-3',
    icon: 'size-5 shrink-0',
    closeButton: 'ml-auto size-5',
  },
  variants: {
    variant: {
      filled: {},
      light: {},
      lighter: {},
      stroke: {
        root: 'bg-bg-white-0 text-text-strong-950 before:absolute before:bottom-0 before:h-px before:w-full before:bg-stroke-soft-200',
      },
    },
    status: {
      error: {},
      warning: {},
      success: {},
      information: {},
      feature: {},
    },
  },
  compoundVariants: [
    {
      variant: 'filled',
      class: { closeButton: 'opacity-[.72]' },
    },
    {
      variant: ['light', 'lighter', 'stroke'],
      class: { closeButton: 'opacity-[.48]' },
    },

    // ERROR
    {
      variant: 'filled',
      status: 'error',
      class: { icon: 'text-static-white', root: 'bg-error-base text-static-white' },
    },
    {
      variant: 'light',
      status: 'error',
      class: { icon: 'text-error-base', root: 'bg-error-light text-text-strong-950' },
    },
    {
      variant: 'lighter',
      status: 'error',
      class: { icon: 'text-error-base', root: 'bg-error-lighter text-text-strong-950' },
    },
    {
      variant: 'stroke',
      status: 'error',
      class: { icon: 'text-error-base' },
    },

    // WARNING
    {
      variant: 'filled',
      status: 'warning',
      class: { icon: 'text-static-white', root: 'bg-warning-base text-static-white' },
    },
    {
      variant: 'light',
      status: 'warning',
      class: { icon: 'text-warning-base', root: 'bg-warning-light text-text-strong-950' },
    },
    {
      variant: 'lighter',
      status: 'warning',
      class: { icon: 'text-warning-base', root: 'bg-warning-lighter text-text-strong-950' },
    },
    {
      variant: 'stroke',
      status: 'warning',
      class: { icon: 'text-warning-base' },
    },

    // SUCCESS
    {
      variant: 'filled',
      status: 'success',
      class: { icon: 'text-static-white', root: 'bg-success-base text-static-white' },
    },
    {
      variant: 'light',
      status: 'success',
      class: { icon: 'text-success-base', root: 'bg-success-light text-text-strong-950' },
    },
    {
      variant: 'lighter',
      status: 'success',
      class: { icon: 'text-success-base', root: 'bg-success-lighter text-text-strong-950' },
    },
    {
      variant: 'stroke',
      status: 'success',
      class: { icon: 'text-success-base' },
    },

    // INFO
    {
      variant: 'filled',
      status: 'information',
      class: { icon: 'text-static-white', root: 'bg-information-base text-static-white' },
    },
    {
      variant: 'light',
      status: 'information',
      class: { icon: 'text-information-base', root: 'bg-information-light text-text-strong-950' },
    },
    {
      variant: 'lighter',
      status: 'information',
      class: { icon: 'text-information-base', root: 'bg-information-lighter text-text-strong-950' },
    },
    {
      variant: 'stroke',
      status: 'information',
      class: { icon: 'text-information-base' },
    },

    // FEATURE
    {
      variant: 'filled',
      status: 'feature',
      class: { icon: 'text-static-white', root: 'bg-faded-base text-static-white' },
    },
    {
      variant: 'light',
      status: 'feature',
      class: { icon: 'text-faded-base', root: 'bg-faded-light text-text-strong-950' },
    },
    {
      variant: 'lighter',
      status: 'feature',
      class: { icon: 'text-faded-base', root: 'bg-faded-lighter text-text-strong-950' },
    },
    {
      variant: 'stroke',
      status: 'feature',
      class: { icon: 'text-faded-base' },
    },
  ],
  defaultVariants: {
    variant: 'filled',
    status: 'feature',
  },
});

function Banner({ children, className, variant, status, ...rest }) {
  const uniqueId = React.useId();
  const { root } = bannerVariants({ variant, status });

  const sharedProps = { variant, status };

  const extendedChildren = recursiveCloneChildren(
    children,
    sharedProps,
    [BANNER_ICON_NAME, BANNER_CLOSE_BUTTON_NAME],
    uniqueId,
  );

  return (
    <div className={root({ class: className })} {...rest}>
      {extendedChildren}
    </div>
  );
}
Banner.displayName = BANNER_ROOT_NAME;

function BannerContent({ className, ...rest }) {
  const { content } = bannerVariants();
  return <div className={content({ class: className })} {...rest} />;
}
BannerContent.displayName = BANNER_CONTENT_NAME;

function BannerIcon({ className, variant, status, as, ...rest }) {
  const Component = as || 'div';
  const { icon } = bannerVariants({ variant, status });

  return <Component className={icon({ class: className })} {...rest} />;
}
BannerIcon.displayName = BANNER_ICON_NAME;

const BannerCloseButton = React.forwardRef(
  ({ asChild, children, variant, status, className, ...rest }, ref) => {
    const Component = asChild ? Slot : 'button';
    const { closeButton } = bannerVariants({ variant, status });

    return (
      <Component ref={ref} className={closeButton({ class: className })} {...rest}>
        {children}
      </Component>
    );
  },
);
BannerCloseButton.displayName = BANNER_CLOSE_BUTTON_NAME;

export {
  Banner as Root,
  BannerContent as Content,
  BannerIcon as Icon,
  BannerCloseButton as CloseButton,
};
