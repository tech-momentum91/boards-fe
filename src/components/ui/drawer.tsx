// AlignUI Drawer v0.0.0

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { RiCloseLine } from 'react-icons/ri';

import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/utils/cn';

const DrawerRoot = DialogPrimitive.Root;
DrawerRoot.displayName = 'Drawer';

const DrawerTrigger = DialogPrimitive.Trigger;
DrawerTrigger.displayName = 'DrawerTrigger';

const DrawerClose = DialogPrimitive.Close;
DrawerClose.displayName = 'DrawerClose';

const DrawerPortal = DialogPrimitive.Portal;
DrawerPortal.displayName = 'DrawerPortal';

type DrawerOverlayProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>;

const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  DrawerOverlayProps
>(({ className, ...rest }, forwardedRef) => {
  return (
    <DialogPrimitive.Overlay
      ref={forwardedRef}
      className={cn(
        // base
        'fixed inset-0 z-50 grid grid-cols-1 place-items-end overflow-hidden bg-overlay',
        // animation
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...rest}
    />
  );
});
DrawerOverlay.displayName = 'DrawerOverlay';

type DrawerContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  title?: string;
};

const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DrawerContentProps
>(({ className, children, title, ...rest }, forwardedRef) => {
  const accessibleTitle = title || 'Panel';
  return (
    <DrawerPortal>
      <DrawerOverlay>
        <DialogPrimitive.Content
          ref={forwardedRef}
          className={cn(
            'size-full max-w-[520px] overflow-y-auto',
            'border-l border-stroke-soft-200 bg-bg-white-0',
            // Performance optimizations for smooth animation
            'will-change-transform',
            // animation
            'data-[state=open]:duration-200 data-[state=open]:ease-out data-[state=open]:animate-in',
            'data-[state=closed]:duration-200 data-[state=closed]:ease-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-right-full',
            'data-[state=closed]:slide-out-to-right-full',
            className,
          )}
          {...rest}
        >
          <DialogPrimitive.Title className='sr-only'>{accessibleTitle}</DialogPrimitive.Title>
          <DialogPrimitive.Description className='sr-only'>
            Drawer panel content
          </DialogPrimitive.Description>
          <div className='relative flex size-full flex-col'>{children}</div>
        </DialogPrimitive.Content>
      </DrawerOverlay>
    </DrawerPortal>
  );
});
DrawerContent.displayName = 'DrawerContent';

type DrawerHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  showCloseButton?: boolean;
};

function DrawerHeader({ className, children, showCloseButton = true, ...rest }: DrawerHeaderProps) {
  return (
    <div className={cn('flex items-center border-b border-stroke-soft-200', className)} {...rest}>
      {children}
      {showCloseButton && (
        <DrawerClose asChild>
          <CompactButton.Root variant='ghost' size='large' className='absolute right-4 top-4'>
            <CompactButton.Icon
              className='border border-stroke-soft-200 text-text-sub-500 rounded-[4px] cursor-pointer'
              as={RiCloseLine}
            />
          </CompactButton.Root>
        </DrawerClose>
      )}
    </div>
  );
}
DrawerHeader.displayName = 'DrawerHeader';

type DrawerTitleProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;

const DrawerTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  DrawerTitleProps
>(({ className, ...rest }, forwardedRef) => {
  return (
    <DialogPrimitive.Title
      ref={forwardedRef}
      className={cn('flex-1  text-label-lg text-text-strong-950', className)}
      {...rest}
    />
  );
});
DrawerTitle.displayName = 'DrawerTitle';

type DrawerBodyProps = React.HTMLAttributes<HTMLDivElement>;

function DrawerBody({ className, children, ...rest }: DrawerBodyProps) {
  return (
    <div className={cn('flex-1 flex flex-col ', className)} {...rest}>
      {children}
    </div>
  );
}
DrawerBody.displayName = 'DrawerBody';

type DrawerFooterProps = React.HTMLAttributes<HTMLDivElement>;

function DrawerFooter({ className, ...rest }: DrawerFooterProps) {
  return <div className={cn(' border-stroke-soft-200', className)} {...rest} />;
}
DrawerFooter.displayName = 'DrawerFooter';

export {
  DrawerRoot as Root,
  DrawerTrigger as Trigger,
  DrawerClose as Close,
  DrawerContent as Content,
  DrawerHeader as Header,
  DrawerTitle as Title,
  DrawerBody as Body,
  DrawerFooter as Footer,
};
