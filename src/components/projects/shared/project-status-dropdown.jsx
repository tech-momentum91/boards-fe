import React, { useMemo } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { StatusBadgeDisplay } from '@/components/ui/status-dropdown';
import CircularProgress, { resolveBadgeColor } from '@/components/ui/circular-progress';
import { getStatusMetaForOption } from '@/components/ticket-management/constants';
import { cn } from '@/lib/utils';

const ProjectStatusDropdown = ({
  value,
  onValueChange,
  statusOptions = [],
  statusMetaMap = {},
  disabled = false,
  placeholder = 'Select status',
  variant = 'inline',
  size = 'small',
  hasError = false,
  indicator = 'auto',
  className,
  showArrow = true,
  ...rest
}) => {
  const getOptionMeta = useMemo(
    () => (option) => getStatusMetaForOption(option, statusMetaMap),
    [statusMetaMap],
  );

  const selectedOption = useMemo(
    () => statusOptions.find((o) => (o.value ?? o) === value),
    [statusOptions, value],
  );
  const selectedLabel = selectedOption?.label ?? selectedOption?.value ?? value ?? '';
  const selectedMeta = useMemo(
    () => (selectedOption ? getOptionMeta(selectedOption) : {}),
    [selectedOption, getOptionMeta],
  );

  const isInline = variant === 'inline';
  const isFull = variant === 'full';
  const isIndicator = variant === 'indicator';
  const neutralColor = 'var(--color-faded-base)';
  const indicatorColor = resolveBadgeColor(selectedMeta.color) || neutralColor;
  const indicatorPercentage = Number(selectedMeta.percentage ?? 0);

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={statusOptions}
      disabled={disabled}
      hasError={hasError}
      size={size}
      placeholder={placeholder}
      variant={isIndicator || isInline ? 'inline' : 'borderless'}
      // Inline badge already renders its own chevron — hide SearchableSelect's outer arrow.
      showArrow={isIndicator || isFull || isInline ? false : showArrow}
      matchTriggerWidth={false}
      triggerClassName={cn(
        'w-auto flex items-center bg-transparent',
        // Match StatusDropdown ringLess — no focus/open chrome around the badge.
        '!ring-0 !shadow-none hover:!bg-transparent hover:!ring-transparent',
        'focus:!ring-0 focus:!ring-transparent focus:!shadow-none',
        'focus-visible:!ring-0 focus-visible:!ring-transparent focus-visible:!shadow-none',
        'data-[state=open]:!ring-0 data-[state=open]:!shadow-none',
        'before:!hidden data-[state=open]:before:!ring-0',
        className,
        (isInline || isIndicator) && '!h-auto !min-h-0 !gap-0 !p-0 !pr-0',
        isIndicator && 'shrink-0 rounded-full',
      )}
      contentClassName='min-w-[200px]'
      renderTrigger={() => {
        if (isIndicator) {
          return (
            <CircularProgress
              percentage={Math.min(100, Math.max(0, indicatorPercentage))}
              color={indicatorColor}
              size={16}
              variant='sector'
              aria-label={selectedLabel ? `Status: ${selectedLabel}` : 'Change status'}
              className='pointer-events-none'
            />
          );
        }
        if (isFull && selectedLabel) {
          return <span className='text-white'>{selectedLabel}</span>;
        }
        if (isInline) {
          return selectedLabel ? (
            <span className='block w-full min-w-0 overflow-hidden'>
              <StatusBadgeDisplay
                label={selectedLabel}
                color={selectedMeta.color}
                showArrow={showArrow}
              />
            </span>
          ) : (
            <span className='text-text-soft-400'>{placeholder}</span>
          );
        }
        return selectedLabel || placeholder;
      }}
      renderOptionLabel={(option) => {
        const optionLabel = option.label ?? option.value ?? option;
        const meta = getOptionMeta(option);
        const rawColor = meta.color ?? neutralColor;
        const color = resolveBadgeColor(rawColor) || rawColor;
        const { percentage } = meta;
        const hasPercentage = percentage != null;
        const canShowProgress = indicator === 'progress' || (indicator === 'auto' && hasPercentage);

        const icon =
          indicator === 'none' ? null : canShowProgress ? (
            <CircularProgress
              percentage={Math.min(100, Math.max(0, Number(percentage ?? 0)))}
              color={color}
              size={15}
              variant='sector'
              aria-label={`${optionLabel} progress`}
            />
          ) : (
            <span
              className='inline-block size-3 shrink-0 rounded-full'
              style={{ backgroundColor: color }}
              aria-hidden
            />
          );

        return (
          <div className='flex items-center gap-1.5'>
            {icon}
            <span className='text-paragraph-sm text-text-main-900 text-nowrap'>{optionLabel}</span>
          </div>
        );
      }}
      {...rest}
    />
  );
};

ProjectStatusDropdown.displayName = 'ProjectStatusDropdown';

export default ProjectStatusDropdown;
