'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/utils/cn';

const ComboboxContext = React.createContext({
  anchorRef: { current: null },
  open: false,
  onOpenChange: () => {},
});

/**
 * Combobox shell: trigger is an input inside {@link ComboboxAnchor} (search-as-trigger).
 * Panel in {@link ComboboxContent} should be options only — no second search field.
 *
 * Uses the same Popover pattern as {@link Autocomplete}: `modal={false}`, block auto-focus
 * into the panel, and ignore “outside” events that hit the anchor so the input keeps focus.
 */
function ComboboxRoot({ children, open, onOpenChange, disabled = false, modal = false, ...props }) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const anchorRef = React.useRef(null);

  const isControlled = open !== undefined;
  const resolvedOpen = disabled ? false : isControlled ? open : internalOpen;

  const handleOpenChange = React.useCallback(
    (next) => {
      if (disabled && next) {
        return;
      }
      if (isControlled) {
        onOpenChange?.(next);
      } else {
        setInternalOpen(next);
      }
    },
    [disabled, isControlled, onOpenChange],
  );

  return (
    <ComboboxContext.Provider
      value={{
        anchorRef,
        open: resolvedOpen,
        onOpenChange: handleOpenChange,
      }}
    >
      <PopoverPrimitive.Root
        open={resolvedOpen}
        onOpenChange={handleOpenChange}
        modal={modal}
        {...props}
      >
        {children}
      </PopoverPrimitive.Root>
    </ComboboxContext.Provider>
  );
}

const ComboboxAnchor = React.forwardRef(({ className, children, ...rest }, forwardedRef) => {
  const { anchorRef } = React.useContext(ComboboxContext);

  const setRefs = React.useCallback(
    (node) => {
      anchorRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [anchorRef, forwardedRef],
  );

  return (
    <PopoverPrimitive.Anchor asChild>
      <div ref={setRefs} className={cn('relative w-full min-w-0', className)} {...rest}>
        {children}
      </div>
    </PopoverPrimitive.Anchor>
  );
});
ComboboxAnchor.displayName = 'ComboboxAnchor';

const ComboboxContent = React.forwardRef(
  (
    {
      className,
      align = 'start',
      side = 'bottom',
      sideOffset = 8,
      collisionPadding = 8,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const { anchorRef } = React.useContext(ComboboxContext);

    const isWithinAnchor = React.useCallback(
      (event) => {
        const el = anchorRef?.current;
        if (!el) {
          return false;
        }
        const { target } = event;
        return el === target || el.contains(target);
      },
      [anchorRef],
    );

    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={forwardedRef}
          align={align}
          side={side}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            if (isWithinAnchor(e)) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            if (isWithinAnchor(e)) {
              e.preventDefault();
            }
          }}
          className={cn(
            'relative z-50 overflow-hidden rounded-2xl bg-bg-white-0 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200',
            // Anchor-based popovers: width comes from the anchor via Popper (not --radix-popover-trigger-width).
            'w-(--radix-popper-anchor-width) min-w-0 max-w-[min(100vw-2rem,var(--radix-popper-anchor-width))]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            className,
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    );
  },
);
ComboboxContent.displayName = 'ComboboxContent';

export const Combobox = {
  Root: ComboboxRoot,
  Anchor: ComboboxAnchor,
  Content: ComboboxContent,
};
