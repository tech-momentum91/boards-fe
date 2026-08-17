import { useMemo, useState } from 'react';
import { RiCheckLine } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import CircularProgress, { resolveBadgeColor } from '@/components/ui/circular-progress';
import { cn } from '@/utils/cn';
import { findBoardStatusOption } from '@/pages/boards/utils/task-statuses-utils';

function StatusOptionIcon({ option, iconColor }) {
  const color = iconColor ?? resolveBadgeColor(option.color);

  return (
    <CircularProgress
      percentage={option.percentage ?? 0}
      color={color}
      size={15}
      variant='sector'
      aria-label={`${option.label} status`}
    />
  );
}

function StatusPillDisplay({ option, className }) {
  const bgColor = resolveBadgeColor(option.color) || option.color || '#525866';

  return (
    <span
      className={cn(
        'inline-flex h-6 max-w-none shrink-0 items-center gap-1.5 rounded-md px-2',
        'text-xs font-medium uppercase tracking-[0.48px] text-white',
        className,
      )}
      style={{ backgroundColor: bgColor }}
    >
      <StatusOptionIcon option={option} iconColor='#FFFFFF' />
      <span className='whitespace-nowrap'>{option.label}</span>
    </span>
  );
}

function StatusTriggerContent({ option, placeholder, iconOnly = false, selectedIconOnly = false }) {
  if (!option) {
    return iconOnly ? <Select.Value placeholder='' /> : <Select.Value placeholder={placeholder} />;
  }

  if (selectedIconOnly) {
    return <StatusOptionIcon option={option} />;
  }

  return <StatusPillDisplay option={option} />;
}

export default function BoardTaskStatusDropdown({
  value,
  onValueChange,
  groups = [],
  allGroups = [],
  disabled = false,
  hasError = false,
  isLoading = false,
  placeholder = 'Select status',
  showLabel = true,
  iconOnly = false,
  selectedIconOnly = false,
  inlinePopover = false,
  portalled = true,
  onOpenChange,
  className,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = useMemo(() => {
    const enabledMatch = findBoardStatusOption(groups, value);
    if (enabledMatch) {
      return enabledMatch;
    }

    return findBoardStatusOption(allGroups, value);
  }, [allGroups, groups, value]);

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return groups;
    }

    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) =>
          String(option.label ?? '')
            .toLowerCase()
            .includes(query),
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, searchQuery]);

  const hasOptions = groups.some((group) => group.options.length > 0);

  return (
    <div
      className={cn(
        showLabel ? 'flex flex-col gap-1.5' : iconOnly ? 'shrink-0' : 'w-full',
        className,
      )}
    >
      {showLabel ? <span className='text-xs font-medium text-text-sub-500'>Status</span> : null}

      <Select.Root
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={disabled || isLoading || !hasOptions}
        hasError={hasError}
        size='small'
        variant={showLabel ? 'default' : 'borderless'}
        onOpenChange={(open) => {
          if (!open) {
            setSearchQuery('');
          }
          onOpenChange?.(open);
        }}
      >
        <Select.Trigger
          aria-label={selectedOption?.label || placeholder}
          className={cn(
            selectedOption
              ? 'h-auto min-h-0 w-auto shrink-0 border-0 bg-transparent p-0 shadow-none ring-0 hover:bg-transparent'
              : iconOnly
                ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-0 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] transition hover:bg-bg-weak-50 min-w-0'
                : 'h-8 w-full min-w-0 rounded-lg border-0 bg-transparent p-0 shadow-none ring-0',
            showLabel && !selectedOption && 'h-9 w-fit min-w-[120px]',
          )}
          showArrow={false}
        >
          {isLoading ? (
            <Select.Value placeholder={iconOnly ? '' : 'Loading statuses...'} />
          ) : (
            <StatusTriggerContent
              option={selectedOption}
              placeholder={placeholder}
              iconOnly={iconOnly}
              selectedIconOnly={selectedIconOnly}
            />
          )}
        </Select.Trigger>

        <Select.Content
          layout='searchable'
          className={cn('min-w-[280px]', !portalled && 'z-[70]')}
          portalled={portalled}
          {...(inlinePopover ? { 'data-inline-task-create-popover': '' } : {})}
        >
          <div className='pb-2'>
            <Input.Root variant='default' size='xsmall'>
              <Input.Wrapper>
                <Input.Input
                  placeholder='Search...'
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='max-h-72 overflow-y-auto'>
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <Select.Group key={group.key}>
                  <Select.GroupLabel className='px-2 py-1.5 text-xs font-medium uppercase tracking-[0.48px] text-text-soft-400'>
                    {group.label}
                  </Select.GroupLabel>

                  {group.options.map((option) => {
                    const isSelected = value === option.value;

                    return (
                      <Select.Item key={option.value} value={option.value} className='pr-9'>
                        <StatusOptionIcon option={option} />
                        <span className='text-xs font-medium uppercase tracking-[0.48px] text-text-main-900'>
                          {option.label}
                        </span>
                        {isSelected ? (
                          <RiCheckLine className='absolute right-2 size-4 text-text-sub-500' />
                        ) : null}
                      </Select.Item>
                    );
                  })}
                </Select.Group>
              ))
            ) : (
              <div className='px-2 py-2 text-sm text-text-soft-400'>
                {hasOptions ? 'No statuses found.' : 'No statuses available.'}
              </div>
            )}
          </div>
        </Select.Content>
      </Select.Root>
    </div>
  );
}
