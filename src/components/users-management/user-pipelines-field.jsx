import React, { useMemo, useState } from 'react';
import { RiArrowDownSLine, RiErrorWarningFill, RiSearchLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Dropdown from '@/components/ui/dropdown';
import * as Hint from '@/components/ui/hint';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Tag from '@/components/ui/tag';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

/**
 * Zone-style CRM pipelines multi-select used on Add / Edit User.
 * Parent "All" toggles every visible option; validation is left to the form (save-time).
 */
const UserPipelinesField = ({
  options = [],
  value = [],
  onChange,
  onClearError,
  loading = false,
  hasError = false,
  errorMessage,
  loadError = false,
  onRetry,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allCollapsed, setAllCollapsed] = useState(false);

  const selected = Array.isArray(value) ? value : [];

  const summary = useMemo(() => {
    const labelForValue = (v) => {
      const found = options.find((p) => p.value === v);
      return found?.label || v;
    };
    const labels = selected.map(labelForValue).filter(Boolean);
    return {
      firstLabel: labels[0] ?? '',
      remainingLabels: labels.slice(1),
      count: labels.length,
    };
  }, [selected, options]);

  const filtered = useMemo(() => {
    if (!Array.isArray(options) || options.length === 0) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((item) => {
      const label = String(item.label || '').toLowerCase();
      const val = String(item.value || '').toLowerCase();
      return label.includes(q) || val.includes(q);
    });
  }, [options, searchQuery]);

  const setPipelines = (next) => {
    onClearError?.();
    onChange?.(Array.isArray(next) ? next : []);
  };

  const visibleValues = filtered.map((p) => p.value);
  const selectedVisibleCount = visibleValues.filter((v) => selected.includes(v)).length;
  const allVisibleSelected =
    visibleValues.length > 0 && selectedVisibleCount === visibleValues.length;

  const toggleAll = () => {
    if (allVisibleSelected) {
      setPipelines(selected.filter((v) => !visibleValues.includes(v)));
    } else {
      const next = new Set(selected);
      visibleValues.forEach((v) => next.add(v));
      setPipelines([...next]);
    }
  };

  return (
    <div className='w-full flex flex-col gap-2'>
      <Label.Root>
        Pipeline
        <Label.Asterisk />
      </Label.Root>
      <Dropdown.Root
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSearchQuery('');
        }}
      >
        <Dropdown.Trigger asChild>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='medium'
            type='button'
            disabled={disabled || loading}
            className={cn(
              'w-full text-left justify-start items-center min-h-[40px]',
              Boolean(hasError) && 'ring-error-base',
            )}
            hasError={Boolean(hasError)}
          >
            <div className='flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden'>
              {summary.count === 0 ? (
                <span className='text-text-soft-400'>
                  {loading ? 'Loading pipelines...' : 'Select pipelines'}
                </span>
              ) : (
                <>
                  <Tag.Root variant='gray' className='shrink-0 max-w-[150px]'>
                    <span className='truncate block'>{summary.firstLabel}</span>
                  </Tag.Root>
                  {summary.count > 1 && (
                    <Tooltip.Root size='xsmall'>
                      <Tooltip.Trigger asChild>
                        <span className='text-paragraph-xs text-text-soft-400 shrink-0 whitespace-nowrap cursor-pointer'>
                          +{summary.count - 1}
                        </span>
                      </Tooltip.Trigger>
                      <Tooltip.Content
                        size='small'
                        variant='light'
                        side='top'
                        className='max-w-xs'
                      >
                        <div className='flex flex-col gap-1'>
                          <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                            Additional Pipelines ({summary.count - 1})
                          </span>
                          <div className='flex flex-col gap-1'>
                            {summary.remainingLabels.map((pipelineLabel, index) => (
                              <div
                                key={`${pipelineLabel}-${index}`}
                                className='text-paragraph-sm text-text-sub-600'
                              >
                                {pipelineLabel}
                              </div>
                            ))}
                          </div>
                        </div>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  )}
                </>
              )}
            </div>
          </Button.Root>
        </Dropdown.Trigger>
        <Dropdown.Content
          className='w-[max(var(--radix-dropdown-menu-trigger-width),220px)] p-0 gap-0 max-h-[320px]'
          align='start'
          sideOffset={4}
        >
          <div className='p-2 border-b border-stroke-soft-200'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  placeholder='Search pipelines...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete='off'
                  autoCorrect='off'
                  autoCapitalize='off'
                  spellCheck='false'
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='flex flex-col max-h-[260px] overflow-y-auto p-2'>
            {loadError ? (
              <div className='flex flex-col items-center gap-2 px-2 py-3'>
                <p className='text-paragraph-sm text-text-soft-400 text-center'>
                  Failed to load pipelines
                </p>
                {typeof onRetry === 'function' && (
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='small'
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRetry();
                    }}
                  >
                    Retry
                  </Button.Root>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <p className='px-2 py-3 text-paragraph-sm text-text-soft-400 text-center'>
                {searchQuery.trim()
                  ? 'No pipelines found'
                  : loading
                    ? 'Loading pipelines...'
                    : 'No pipelines available'}
              </p>
            ) : (
              <div className='flex flex-col gap-1'>
                <div
                  role='button'
                  tabIndex={0}
                  className='flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-text-soft-400 outline-none transition hover:bg-bg-weak-50'
                  onClick={toggleAll}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggleAll();
                    }
                  }}
                >
                  <Checkbox.Root checked={allVisibleSelected} readOnly />
                  <span className='flex-1 cursor-pointer text-[11px] font-medium uppercase tracking-[0.08em]'>
                    All
                  </span>
                  <span className='inline-flex items-center justify-center rounded-full bg-bg-weak-100 px-2 py-0.5 text-[12px] text-text-sub-600'>
                    {filtered.length}
                  </span>
                  <button
                    type='button'
                    aria-label={allCollapsed ? 'Expand pipelines' : 'Collapse pipelines'}
                    className='inline-flex shrink-0 rounded p-0.5 outline-none hover:bg-bg-weak-100'
                    onClick={(event) => {
                      event.stopPropagation();
                      setAllCollapsed((prev) => !prev);
                    }}
                  >
                    <RiArrowDownSLine
                      className={cn(
                        'size-4 transition-transform',
                        allCollapsed ? '-rotate-90' : 'rotate-0',
                      )}
                    />
                  </button>
                </div>

                {!allCollapsed &&
                  filtered.map((item) => {
                    const itemValue = item.value || '';
                    const isSelected = selected.includes(itemValue);
                    const togglePipeline = () => {
                      if (isSelected) {
                        setPipelines(selected.filter((v) => v !== itemValue));
                      } else {
                        setPipelines([...selected, itemValue]);
                      }
                    };
                    return (
                      <button
                        key={itemValue}
                        type='button'
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-2 py-2 pl-6 text-left outline-none transition hover:bg-bg-weak-50',
                          isSelected && 'bg-bg-weak-100',
                        )}
                        onClick={togglePipeline}
                      >
                        <Checkbox.Root checked={isSelected} readOnly />
                        <span className='truncate text-paragraph-sm text-text-strong-950'>
                          {item.label || itemValue || 'Unnamed Pipeline'}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </Dropdown.Content>
      </Dropdown.Root>
      {hasError && errorMessage && (
        <Hint.Root hasError>
          <Hint.Icon as={RiErrorWarningFill} />
          {errorMessage}
        </Hint.Root>
      )}
    </div>
  );
};

export default UserPipelinesField;
