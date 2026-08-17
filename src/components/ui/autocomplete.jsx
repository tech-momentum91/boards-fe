'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as ScrollAreaPrimitives from '@radix-ui/react-scroll-area';
import { RiArrowDownSLine, RiCheckLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import { selectVariants } from '@/components/ui/select';

// 1. Context to share the input's Ref with the content
const AutocompleteContext = React.createContext({
  triggerRef: { current: null },
  open: false,
  onOpenChange: () => {},
});

const AutocompleteRoot = ({ children, open, onOpenChange, disabled, ...props }) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const triggerRef = React.useRef(null);

  const isControlled = open !== undefined;
  const show = disabled ? false : isControlled ? open : internalOpen;
  const handleOpenChange = (newOpen) => {
    // Prevent opening if disabled
    if (disabled && newOpen) {
      return;
    }
    if (isControlled) {
      onOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  return (
    <AutocompleteContext.Provider
      value={{
        triggerRef,
        open: show,
        onOpenChange: handleOpenChange,
      }}
    >
      <PopoverPrimitive.Root
        open={show}
        onOpenChange={handleOpenChange}
        modal={false} // CRITICAL: Allows interaction with input while popover is open
        {...props}
      >
        <CommandPrimitive shouldFilter={false}>{children}</CommandPrimitive>
      </PopoverPrimitive.Root>
    </AutocompleteContext.Provider>
  );
};

const AutocompleteInput = React.forwardRef(
  (
    { className, hasError, size = 'medium', variant = 'default', onFocus, disabled, ...props },
    ref,
  ) => {
    const { triggerRoot, triggerArrow } = selectVariants({ size, variant, hasError });
    const { triggerRef, open, onOpenChange } = React.useContext(AutocompleteContext);

    // Merge refs (internal context ref + external forwarded ref)
    const composedRef = (node) => {
      triggerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };

    // Handle focus event to open popover when focused via keyboard
    const handleFocus = (e) => {
      // Don't open if disabled
      if (disabled) {
        e.preventDefault();
        return;
      }
      // Call user's onFocus handler if provided
      onFocus?.(e);
      // Open popover if not already open
      if (!open) {
        onOpenChange(true);
      }
    };

    return (
      <PopoverPrimitive.Anchor asChild>
        <div
          ref={composedRef}
          className={cn(
            triggerRoot({ class: 'relative px-0 cursor-text' }),
            // Apply disabled styles manually since div doesn't support disabled attribute
            // Match the exact disabled styles from selectVariants
            disabled && [
              'pointer-events-none',
              'bg-bg-weak-50!',
              'text-text-disabled-300!',
              'shadow-none!',
              'ring-transparent!',
              'cursor-not-allowed',
              'hover:bg-bg-weak-50!',
              'hover:ring-transparent!',
            ],
            className,
          )}
          aria-disabled={disabled}
          // Open on click if not already open
          onClick={(e) => {
            if (disabled) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            e.stopPropagation(); // Prevent event bubbling
            if (!open) {
              onOpenChange(true);
            }
          }}
        >
          <CommandPrimitive.Input
            className={cn(
              'flex h-full w-full bg-transparent outline-none placeholder:text-text-soft-400',
              size === 'medium' && 'pl-3 pr-8',
              size === 'small' && 'pl-2.5 pr-8',
              size === 'xsmall' && 'pl-2 pr-6',
              'text-text-strong-950',
              disabled && [
                'cursor-not-allowed',
                'text-text-disabled-300',
                'placeholder:text-text-disabled-300',
              ],
            )}
            onFocus={handleFocus}
            disabled={disabled}
            {...props}
          />
          <RiArrowDownSLine
            className={cn(
              triggerArrow(),
              'absolute right-2 pointer-events-none',
              disabled && 'text-text-disabled-300',
            )}
          />
        </div>
      </PopoverPrimitive.Anchor>
    );
  },
);
AutocompleteInput.displayName = 'AutocompleteInput';

const AutocompleteContent = React.forwardRef(
  ({ className, align = 'start', sideOffset = 8, children, ...props }, ref) => {
    const { triggerRef } = React.useContext(AutocompleteContext);

    // Check if the event target is within the trigger element
    const isTriggerClick = (event) => {
      if (!triggerRef.current) return false;
      const { target } = event;
      return triggerRef.current === target || triggerRef.current.contains(target);
    };

    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          align={align}
          sideOffset={sideOffset}
          // CRITICAL: Prevent popover from stealing focus from input on open
          onOpenAutoFocus={(e) => e.preventDefault()}
          // CRITICAL: Prevent closing if clicking inside the input wrapper
          onPointerDownOutside={(e) => {
            if (isTriggerClick(e)) {
              e.preventDefault();
            }
          }}
          // CRITICAL: Also prevent closing on interact outside (covers more cases)
          onInteractOutside={(e) => {
            if (isTriggerClick(e)) {
              e.preventDefault();
            }
          }}
          className={cn(
            'relative z-50 overflow-hidden rounded-2xl bg-bg-white-0 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200',
            'w-(--radix-popover-trigger-width) min-w-[120px]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            className,
          )}
          {...props}
        >
          <CommandPrimitive.List>
            <ScrollAreaPrimitives.Root type='auto'>
              <ScrollAreaPrimitives.Viewport className='max-h-[196px] w-full scroll-py-2 overflow-auto p-2'>
                {children}
              </ScrollAreaPrimitives.Viewport>
              <ScrollAreaPrimitives.Scrollbar orientation='vertical'>
                <ScrollAreaPrimitives.Thumb className='w-1! rounded bg-bg-soft-200' />
              </ScrollAreaPrimitives.Scrollbar>
            </ScrollAreaPrimitives.Root>
          </CommandPrimitive.List>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    );
  },
);
AutocompleteContent.displayName = 'AutocompleteContent';

const AutocompleteItem = React.forwardRef(
  ({ className, isSelected, children, size = 'medium', ...props }, ref) => {
    return (
      <CommandPrimitive.Item
        ref={ref}
        className={cn(
          'group relative cursor-pointer select-none rounded-lg p-2 pr-9 text-paragraph-sm text-text-strong-950',
          'flex items-center gap-2 transition duration-200 ease-out',
          'aria-selected:bg-bg-weak-50 aria-selected:outline-0',

          // --- FIX: REMOVED the data-[disabled] styles that caused the issue ---
          // 'data-[disabled]:pointer-events-none data-[disabled]:text-text-disabled-300',

          // Optional: Add opacity if you want explicit disabled items to look disabled
          'data-disabled:opacity-100',
          size === 'xsmall' && 'gap-1.5 pr-[34px]',
          className,
        )}
        {...props}
      >
        <span className='line-clamp-1 flex-1'>{children}</span>
        {isSelected && (
          <RiCheckLine className='absolute right-2 top-1/2 size-5 shrink-0 -translate-y-1/2 text-text-soft-400' />
        )}
      </CommandPrimitive.Item>
    );
  },
);
AutocompleteItem.displayName = 'AutocompleteItem';

const AutocompleteEmpty = CommandPrimitive.Empty;

export const Autocomplete = {
  Root: AutocompleteRoot,
  Input: AutocompleteInput,
  Content: AutocompleteContent,
  Item: AutocompleteItem,
  Empty: AutocompleteEmpty,
};
