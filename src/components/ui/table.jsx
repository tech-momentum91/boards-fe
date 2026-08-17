// AlignUI Table v0.0.0 (JavaScript Version)

import * as React from 'react';

import * as Divider from '@/components/ui/divider';
import { cn } from '@/utils/cn';
import { RiArrowUpSFill, RiArrowDownSFill, RiExpandUpDownFill } from 'react-icons/ri';

// Table Context (variant + optional tableInstance for spacer/divider to render one cell per column)
const TableContext = React.createContext({
  variant: 'default',
  tableInstance: undefined,
  stickyHeader: false,
});

/**
 * Returns Tailwind className + minimal inline style for sticky column pinning (TanStack Table).
 * Used by Root (for context), Head, and Cell.
 */
const getPinningStyles = (column, isHeader = false, stickyHeader = false) => {
  const isPinned = column.getIsPinned?.();
  if (!isPinned) return undefined;
  const meta = column?.columnDef?.meta ?? {};
  const hidePinShadow = meta.hidePinShadow === true;
  const isLeft = isPinned === 'left';
  const isRight = isPinned === 'right';
  const isLastLeft = isLeft && column.getIsLastColumn?.('left');
  const isFirstRight = isRight && column.getIsFirstColumn?.('right');
  const className = cn(
    'sticky',
    isHeader
      ? stickyHeader
        ? 'z-40 bg-bg-weak-50 top-0'
        : 'z-30 bg-bg-weak-50'
      : cn(
          'z-20 bg-bg-white-0',
          // Match row highlight backgrounds so pinned cells don't look like a floating strip.
          'group-hover/row:bg-bg-weak-50',
          'group-[.bg-bg-weak-50]/row:bg-bg-weak-50',
          'group-[.bg-bg-weak-100]/row:bg-bg-weak-100',
          'group-[.bg-primary-lighter]/row:bg-primary-lighter',
          'group-[.bg-primary-alpha-10]/row:bg-primary-alpha-10',
        ),
    hidePinShadow && 'shadow-none',
    isLastLeft && !hidePinShadow && 'shadow-[inset_-2px_0_2px_-2px_rgba(0,0,0,0.25)]',
    isFirstRight && !hidePinShadow && 'shadow-[inset_4px_0_4px_-4px_rgba(0,0,0,0.25)]',
  );
  const style = {
    left: isLeft ? (column.getStart?.('left') ?? 0) : undefined,
    right: isRight ? (column.getAfter?.('right') ?? 0) : undefined,
  };
  return { className, style };
};

// Root Table
// Pass tableInstance (TanStack useReactTable result) to enable pinning-aware spacer and RowDivider automatically.
const Table = React.forwardRef(
  (
    { className, variant = 'default', tableInstance, stickyHeader = false, ...rest },
    forwardedRef,
  ) => {
    const contextValue = React.useMemo(
      () => ({ variant, tableInstance: tableInstance ?? undefined, stickyHeader }),
      [variant, tableInstance, stickyHeader],
    );

    return (
      <TableContext.Provider value={contextValue}>
        <div className={cn('w-full overflow-x-auto', className)}>
          <table ref={forwardedRef} className='w-full' {...rest} />
        </div>
      </TableContext.Provider>
    );
  },
);
Table.displayName = 'Table';

// Table Header
const TableHeader = React.forwardRef(({ ...rest }, forwardedRef) => {
  return <thead ref={forwardedRef} {...rest} />;
});
TableHeader.displayName = 'TableHeader';

// Table Head Cell
// When column is provided, applies columnDef.meta (columnClassName, headClassName) and pinning styles.
const TableHead = React.forwardRef(({ className, style, column, ...rest }, forwardedRef) => {
  const { variant, stickyHeader } = React.useContext(TableContext);
  const paddingClass = variant === 'compact' ? 'px-4 py-1.5' : 'px-4 py-3';
  const pinning = column ? getPinningStyles(column, true, stickyHeader) : undefined;
  const meta = column?.columnDef?.meta ?? {};

  return (
    <th
      ref={forwardedRef}
      className={cn(
        stickyHeader && 'sticky top-0 z-10',
        // Named group for StatusColumnPopover hover-reveal gear on every module table.
        'group/status-col',
        'bg-bg-weak-100 text-left text-paragraph-sm text-text-sub-600 first:rounded-l-lg last:rounded-r-lg',
        paddingClass,
        meta.columnClassName,
        meta.headClassName,
        pinning?.className,
        className,
      )}
      style={{ ...pinning?.style, ...style }}
      {...rest}
    />
  );
});
TableHead.displayName = 'TableHead';

// Table Body
// When tableInstance is in context, spacer row renders one cell per column (with per-column pinning) so shadow is continuous.
const TableBody = React.forwardRef(({ spacing = 8, ...rest }, forwardedRef) => {
  const context = React.useContext(TableContext);
  const { tableInstance } = context;
  const headers = tableInstance?.getHeaderGroups?.()?.[0]?.headers ?? [];
  const useColumnCells = headers.length > 0;

  return (
    <>
      {/* gap between thead and tbody */}

      <tbody ref={forwardedRef} {...rest} />
    </>
  );
});
TableBody.displayName = 'TableBody';

// Table Row
const TableRow = React.forwardRef(({ className, ...rest }, forwardedRef) => {
  return <tr ref={forwardedRef} className={cn('group/row', className)} {...rest} />;
});
TableRow.displayName = 'TableRow';

// Divider Row
// When tableInstance is in context, renders one cell per column (with per-column pinning) so structure and shadow match the table.
function TableRowDivider({ className, dividerClassName, ...rest }) {
  const context = React.useContext(TableContext);
  const { tableInstance } = context;
  const headers = tableInstance?.getHeaderGroups?.()?.[0]?.headers ?? [];
  const useColumnCells = headers.length > 0;

  if (useColumnCells) {
    return (
      <tr aria-hidden='true' className={className}>
        {headers.map((header) => {
          const pinning = getPinningStyles(header.column, false);
          const meta = header.column.columnDef.meta ?? {};
          return (
            <td
              key={header.id}
              aria-hidden
              className={cn(
                'py-1',
                pinning?.className,
                meta.columnClassName,
                meta.dividerClassName,
              )}
              style={{ ...pinning?.style, ...meta.dividerStyle }}
            >
              <Divider.Root variant='line-spacing' className={dividerClassName} {...rest} />
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <tr aria-hidden='true' className={className}>
      <td colSpan={999} className='py-1'>
        <Divider.Root variant='line-spacing' className={dividerClassName} {...rest} />
      </td>
    </tr>
  );
}
TableRowDivider.displayName = 'TableRowDivider';

// Table Cell
// When column is provided, applies columnDef.meta (columnClassName, cellClassName) and pinning styles.
const TableCell = React.forwardRef(({ className, style, column, ...rest }, forwardedRef) => {
  const { variant } = React.useContext(TableContext);
  const heightClass = variant === 'compact' ? 'h-10' : 'h-16';
  const pinning = column ? getPinningStyles(column, false) : undefined;
  const meta = column?.columnDef?.meta ?? {};

  return (
    <td
      ref={forwardedRef}
      className={cn(
        heightClass,
        'px-4 text-[var(--color-text-sub-500)] transition duration-200 ease-out first:rounded-l-xl last:rounded-r-xl group-hover/row:bg-bg-weak-50',
        meta.columnClassName,
        meta.cellClassName,
        pinning?.className,
        className,
      )}
      style={{ ...pinning?.style, ...style }}
      {...rest}
    />
  );
});
TableCell.displayName = 'TableCell';

// Caption
const TableCaption = React.forwardRef(({ className, ...rest }, forwardedRef) => (
  <caption
    ref={forwardedRef}
    className={cn('mt-4 text-paragraph-sm text-text-sub-600', className)}
    {...rest}
  />
));
TableCaption.displayName = 'TableCaption';

export const getSortingIcon = (state) => {
  if (state === 'asc') return <RiArrowUpSFill className='size-5 text-text-sub-600' />;
  if (state === 'desc') return <RiArrowDownSFill className='size-5 text-text-sub-600' />;
  return <RiExpandUpDownFill className='size-5 text-text-sub-600' />;
};

/**
 * Reusable column header for use with TanStack Table.
 * - Sortable:  header: ({ column }) => <Table.SortableHeader column={column} label="Name" />
 * - Static:    header: () => <Table.SortableHeader label="Name" />
 *
 * @param {Object} props
 * @param {import('@tanstack/react-table').Column} [props.column] - TanStack Table column instance (optional)
 * @param {string} [props.label] - Header label (used for display and aria-label)
 * @param {string} [props.className] - Optional class for the wrapper div
 * @param {string} [props.ariaLabel] - Optional custom aria-label; defaults to "Sort by {label} ascending/descending"
 * @param {boolean} [props.sortable=true] - Whether sorting UI/behavior should be enabled
 */
function SortableHeader({
  column,
  label,
  children,
  className,
  ariaLabel,
  sortable = false,
  nowrap = false,
}) {
  const displayLabel = label ?? children ?? '';
  const isSortable = Boolean(sortable && column);
  const sortState = isSortable && column.getIsSorted ? column.getIsSorted() : undefined;

  const resolvedAriaLabel =
    ariaLabel ??
    (isSortable
      ? `Sort by ${displayLabel} ${sortState === 'asc' ? 'descending' : 'ascending'}`
      : undefined);

  return (
    <div className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <span
        className={cn(
          'text-paragraph-sm text-text-sub-600 min-w-0',
          nowrap ? 'whitespace-nowrap' : 'truncate',
        )}
        title={displayLabel ? String(displayLabel) : undefined}
      >
        {displayLabel}
      </span>
      {isSortable && (
        <button
          type='button'
          className='flex shrink-0 items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
          onClick={() => column.toggleSorting?.(sortState === 'asc')}
          aria-label={resolvedAriaLabel}
        >
          {getSortingIcon(sortState)}
        </button>
      )}
    </div>
  );
}
SortableHeader.displayName = 'SortableHeader';

export {
  Table as Root,
  TableHeader as Header,
  TableBody as Body,
  TableHead as Head,
  TableRow as Row,
  TableRowDivider as RowDivider,
  TableCell as Cell,
  TableCaption as Caption,
  SortableHeader,
  getPinningStyles,
};

// Export variant toggle component for convenience
export { default as VariantToggle } from './table-variant-toggle';
