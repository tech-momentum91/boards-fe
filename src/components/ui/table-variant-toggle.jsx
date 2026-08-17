import React from 'react';
import { RiLineHeight } from 'react-icons/ri';
import * as Button from '@/components/ui/button';

/**
 * Compact variant icon (custom SVG)
 */
const CompactIcon = ({ className = 'size-5' }) => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    className={className}
  >
    <path
      d='M9.25 4H16.75V5.5H9.25V4ZM5.5 6.25V9.25H4V6.25H1.75L4.75 3.25L7.75 6.25H5.5ZM5.5 13.75H7.75L4.75 16.75L1.75 13.75H4V10.75H5.5V13.75ZM9.25 14.5H16.75V16H9.25V14.5ZM7.75 7.62162H16.75V9.12162H7.75V7.62162Z'
      fill='currentColor'
    />
    <path d='M16.75 11H7.75V12.5H16.75V11Z' fill='currentColor' />
  </svg>
);

/**
 * Reusable table variant toggle button component
 * @param {Object} props
 * @param {string} props.variant - Current variant ('default' | 'compact')
 * @param {Function} props.onToggle - Callback when button is clicked
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.buttonProps - Additional props to pass to Button.Root
 */
const TableVariantToggle = React.forwardRef(
  (
    { variant = 'default', onToggle, className, onClick, size = 'small', ...buttonProps },
    forwardedRef,
  ) => {
    const isCompact = variant === 'compact';
    const nextVariant = isCompact ? 'default' : 'compact';

    // IMPORTANT:
    // When wrapped in Radix Tooltip with `asChild`, Tooltip.Trigger injects event handlers.
    // We must compose clicks instead of letting injected props override our onToggle.
    const handleClick = (event) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        onToggle?.(event);
      }
    };

    return (
      <Button.Root
        ref={forwardedRef}
        variant='neutral'
        mode='stroke'
        size={size}
        className={`gap-1 ${className || ''}`}
        onClick={handleClick}
        aria-label={`Switch to ${nextVariant} table view`}
        {...buttonProps}
      >
        <Button.Icon>
          {isCompact ? (
            <CompactIcon className='size-5 text-text-sub-600' />
          ) : (
            <RiLineHeight className='size-5 text-text-sub-600' />
          )}
        </Button.Icon>
      </Button.Root>
    );
  },
);
TableVariantToggle.displayName = 'TableVariantToggle';

export default TableVariantToggle;
