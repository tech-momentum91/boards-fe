// AlignUI Filter v0.0.0

import * as React from 'react';
import { RiCloseLine, RiFilter3Line, RiSearchLine } from 'react-icons/ri';
import { useVirtualizer } from '@tanstack/react-virtual';

import { cn } from '@/utils/cn';
import * as Popover from '@/components/ui/popover';
import * as Input from '@/components/ui/input';
import * as Checkbox from '@/components/ui/checkbox';
import * as LinkButton from '@/components/ui/link-button';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { capitalizeEachWordFirstLetter } from '@/lib/utils';

const FILTER_ROOT_NAME = 'FilterRoot';
const FILTER_HEADER_NAME = 'FilterHeader';
const FILTER_BODY_NAME = 'FilterBody';
const FILTER_SIDEBAR_NAME = 'FilterSidebar';
const FILTER_SIDEBAR_ITEM_NAME = 'FilterSidebarItem';
const FILTER_CONTENT_NAME = 'FilterContent';
const FILTER_LIST_NAME = 'FilterList';
const FILTER_LIST_ITEM_NAME = 'FilterListItem';
const FILTER_TRIGGER_BUTTON_NAME = 'FilterTriggerButton';

const FilterRoot = React.forwardRef(
  ({ className, children, onInteractOutside, onEscapeKeyDown, ...rest }, forwardedRef) => {
    return (
      <Popover.Content
        ref={forwardedRef}
        className={cn('p-0', className)}
        onInteractOutside={onInteractOutside}
        onEscapeKeyDown={onEscapeKeyDown}
        {...rest}
      >
        <div className='w-full rounded-xl border border-stroke-soft-200 flex flex-col bg-white'>
          {children}
        </div>
      </Popover.Content>
    );
  },
);
FilterRoot.displayName = FILTER_ROOT_NAME;

const FilterHeader = React.forwardRef(
  (
    { className, title = 'FILTERS', onClear, clearLabel = 'Clear All', children, ...rest },
    forwardedRef,
  ) => {
    return (
      <div
        ref={forwardedRef}
        className={cn(
          'w-full rounded-t-xl flex justify-between bg-[#F6F8FA] px-4 py-3 items-center border-b border-stroke-soft-200',
          className,
        )}
        {...rest}
      >
        <span className='subheading-2xs w-full text-text-soft-400'>{title}</span>
        {onClear && (
          <LinkButton.Root variant='primary' size='small' onClick={onClear}>
            {clearLabel}
          </LinkButton.Root>
        )}
        {children}
      </div>
    );
  },
);
FilterHeader.displayName = FILTER_HEADER_NAME;

const FilterBody = React.forwardRef(({ className, children, ...rest }, forwardedRef) => {
  return (
    <div ref={forwardedRef} className={cn('flex h-[250px]', className)} {...rest}>
      {children}
    </div>
  );
});
FilterBody.displayName = FILTER_BODY_NAME;

const FilterSidebar = React.forwardRef(
  ({ className, children, width = '200px', ...rest }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        className={cn('border-r border-stroke-soft-200 flex flex-col overflow-y-auto', className)}
        style={{ width }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
FilterSidebar.displayName = FILTER_SIDEBAR_NAME;

const FilterSidebarItem = React.forwardRef(
  ({ className, children, count, icon: Icon, isActive, onClick, ...rest }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        className={cn(
          'w-full flex items-center justify-between rounded-lg p-2 text-left text-label-sm text-text-sub-600 outline-none cursor-pointer transition duration-200 ease-out',
          'hover:bg-bg-weak-50',
          isActive && 'bg-bg-weak-50 text-text-strong-950',
          className,
        )}
        onClick={onClick}
        {...rest}
      >
        <span className='flex-1'>{children}</span>
        {count !== undefined && count > 0 ? (
          <Badge.Root
            size='medium'
            variant='filled'
            className='shrink-0 rounded-full bg-black text-white'
          >
            {count}
          </Badge.Root>
        ) : (
          Icon && <Icon className='size-5 text-text-sub-600 shrink-0' />
        )}
      </div>
    );
  },
);
FilterSidebarItem.displayName = FILTER_SIDEBAR_ITEM_NAME;

const FilterContent = React.forwardRef(
  ({ className, children, width = '356px', ...rest }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        className={cn('flex flex-col overflow-hidden', className)}
        style={{ width }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
FilterContent.displayName = FILTER_CONTENT_NAME;

const FilterList = React.forwardRef(
  (
    {
      className,
      options = [],
      selectedValues = [],
      onToggle,
      searchValue = '',
      onSearchChange,
      isLoading = false,
      emptyMessage = 'No results found',
      searchPlaceholder = 'Search...',
      virtualized = false,
      itemHeight = 36,
      overscan = 5,
      hasMore = false,
      isLoadingMore = false,
      onLoadMore,
      renderOptionLabel,
      children,
      sortOptions = true,
      capitalizeOptions = true,
      ...rest
    },
    forwardedRef,
  ) => {
    const handleToggle = React.useCallback(
      (value) => {
        onToggle?.(value);
      },
      [onToggle],
    );

    const scrollParentRef = React.useRef(null);

    const processedOptions = React.useMemo(() => {
      const result = options.map((option) => {
        const optionValue = option && typeof option === 'object' ? option.value : option;
        const optionLabel = option && typeof option === 'object' ? option.label : option;

        let formattedLabel = optionLabel;
        if (capitalizeOptions && typeof optionLabel === 'string') {
          formattedLabel = capitalizeEachWordFirstLetter(optionLabel);
        }

        if (option && typeof option === 'object') {
          return {
            ...option,
            value: optionValue,
            label: formattedLabel,
          };
        }
        return {
          value: optionValue,
          label: formattedLabel,
        };
      });

      if (sortOptions) {
        result.sort((a, b) => {
          const labelA = String(a.label ?? '');
          const labelB = String(b.label ?? '');
          return labelA.localeCompare(labelB, undefined, { numeric: true, sensitivity: 'base' });
        });
      }

      return result;
    }, [options, sortOptions, capitalizeOptions]);

    const rowVirtualizer = useVirtualizer({
      count: processedOptions.length,
      getScrollElement: () => scrollParentRef.current,
      estimateSize: React.useCallback(() => itemHeight, [itemHeight]),
      overscan,
    });

    const handleScroll = React.useCallback(
      (event) => {
        if (!onLoadMore || !hasMore || isLoadingMore || isLoading) return;
        const element = event.currentTarget;
        const threshold = 48;
        if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
          onLoadMore();
        }
      },
      [hasMore, isLoading, isLoadingMore, onLoadMore],
    );

    const renderItems = () => {
      if (isLoading && options.length === 0) {
        return (
          <div className='p-2 text-paragraph-sm text-text-sub-600 text-center'>Loading...</div>
        );
      }

      if (processedOptions.length === 0) {
        if (children) return children;

        return (
          <div className='p-2 text-paragraph-sm text-text-sub-600 text-center'>{emptyMessage}</div>
        );
      }

      if (!virtualized) {
        return processedOptions.map((option) => {
          const optionValue = option.value;
          const optionLabel = option.label;
          const isChecked = selectedValues.includes(optionValue);
          const labelContent = renderOptionLabel?.(option) ?? optionLabel;

          return (
            <FilterListItem
              key={optionValue}
              value={optionValue}
              label={optionLabel}
              checked={isChecked}
              onToggle={handleToggle}
              capitalizeLabel={false}
            />
          );
        });
      }

      const virtualItems = rowVirtualizer.getVirtualItems();
      const totalSize = rowVirtualizer.getTotalSize();

      return (
        <div style={{ height: totalSize, position: 'relative' }}>
          {virtualItems.map((virtualRow) => {
            const option = processedOptions[virtualRow.index];
            const optionValue = option.value;
            const optionLabel = option.label;
            const isChecked = selectedValues.includes(optionValue);

            return (
              <div
                key={optionValue}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <FilterListItem
                  value={optionValue}
                  label={optionLabel}
                  checked={isChecked}
                  onToggle={handleToggle}
                  capitalizeLabel={false}
                />
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div ref={forwardedRef} className={cn('flex flex-col gap-4 h-full', className)} {...rest}>
        <div className='flex flex-col gap-2 overflow-y-aut min-h-0'>
          {onSearchChange && (
            <div className='p-2 pb-0'>
              <Input.Root size='xsmall' className='shrink-0'>
                <Input.Wrapper>
                  <Input.Icon>
                    <RiSearchLine />
                  </Input.Icon>
                  <Input.Input
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    autoFocus
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          )}

          <div
            ref={virtualized ? scrollParentRef : undefined}
            onScroll={virtualized ? handleScroll : undefined}
            className={cn('w-full flex flex-col gap-1 overflow-y-auto min-h-0')}
          >
            {renderItems()}
            {isLoadingMore ? (
              <div className='p-2 text-center text-paragraph-sm text-text-sub-600'>
                Loading more...
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  },
);
FilterList.displayName = FILTER_LIST_NAME;

const FilterListItem = React.forwardRef(
  (
    { className, value, label, checked, onToggle, children, capitalizeLabel = true, ...rest },
    forwardedRef,
  ) => {
    const handleClick = React.useCallback(() => {
      onToggle?.(value);
    }, [onToggle, value]);

    const handleCheckboxClick = React.useCallback((e) => {
      // Radix `onCheckedChange` does NOT pass an event object.
      // We only stop bubbling on the click event to prevent double-toggling.
      e.stopPropagation();
    }, []);

    const handleCheckedChange = React.useCallback(() => {
      onToggle?.(value);
    }, [onToggle, value]);

    return (
      <div
        ref={forwardedRef}
        className={cn(
          'group relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg p-2 text-paragraph-sm text-text-strong-950',
          'transition duration-200 ease-out hover:bg-bg-weak-50',
          className,
          checked && 'bg-bg-weak-50 text-text-strong-950',
        )}
        onClick={handleClick}
        {...rest}
      >
        <Checkbox.Root
          size='medium'
          checked={checked}
          onCheckedChange={handleCheckedChange}
          onClick={handleCheckboxClick}
          className='shrink-0'
        />
        <span className='flex-1 truncate'>
          {children ||
            (capitalizeLabel && typeof label === 'string'
              ? capitalizeEachWordFirstLetter(label)
              : label)}
        </span>
      </div>
    );
  },
);

FilterListItem.displayName = FILTER_LIST_ITEM_NAME;

const FilterTriggerButton = React.forwardRef(
  (
    {
      className,
      filterCount = 0,
      filterLabel = '',
      onClear,
      tooltipContent = 'Filter',
      ariaLabel = 'Filter tickets',
      ...rest
    },
    forwardedRef,
  ) => {
    const hasActiveFilters = filterCount > 0 || Boolean(filterLabel);

    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Popover.Trigger asChild>
            <Button.Root
              ref={forwardedRef}
              variant={hasActiveFilters ? 'primary' : 'neutral'}
              mode={hasActiveFilters ? 'lighter' : 'stroke'}
              size='small'
              className={cn('gap-2', className)}
              aria-label={ariaLabel}
              {...rest}
            >
              <Button.Icon>
                <RiFilter3Line size={20} />
              </Button.Icon>
              {filterLabel ? filterLabel : hasActiveFilters ? `Filter ${filterCount}` : ''}
              {hasActiveFilters && (
                <Button.Icon
                  className='text-primary-dark bg-primary-light rounded-sm'
                  as={RiCloseLine}
                  size={20}
                  onClick={onClear}
                />
              )}
            </Button.Root>
          </Popover.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{tooltipContent}</p>
        </Tooltip.Content>
      </Tooltip.Root>
    );
  },
);
FilterTriggerButton.displayName = FILTER_TRIGGER_BUTTON_NAME;

export {
  FilterRoot as Root,
  FilterHeader as Header,
  FilterBody as Body,
  FilterSidebar as Sidebar,
  FilterSidebarItem as SidebarItem,
  FilterContent as Content,
  FilterList as List,
  FilterListItem as ListItem,
  FilterTriggerButton as TriggerButton,
};
