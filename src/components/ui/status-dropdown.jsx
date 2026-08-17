import React, { useMemo, createContext, useContext } from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';
import * as Select from '@/components/ui/select';
import { cn } from '@/lib/utils';
import CircularProgress, { resolveBadgeColor } from '@/components/ui/circular-progress';
import { resolveStatusSemanticKey } from '@/components/ui/status-color-pill';

/**
 * Pure reusable status dropdown (slot API).
 * No hardcoded colors, status names, or filtering — consumer provides options and optional getOptionMeta.
 *
 * Root props:
 * - value, onValueChange, statusOptions (array of { value, label, color?, percentage? })
 * - getOptionMeta(option)? => ({ color?: string, percentage?: number }) — display color (CSS) and progress 0–100
 * - indicator: 'auto' | 'progress' | 'dot' | 'none'
 * - variant, size, placeholder, disabled, hasError, etc.
 *
 * When getOptionMeta is not provided, option.color and option.percentage are used as-is.
 */

const clampPercentage = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

/**
 * Solid fills for StatusDropdown only (not pills/tables elsewhere): map Status Configuration
 * semantic / legacy hex → the same saturated tokens used by Badge filled variants.
 */
function getStatusDropdownSolidFill(color) {
  if (color == null || color === '') return resolveBadgeColor('gray');
  const key = resolveStatusSemanticKey(color);
  if (key) return resolveBadgeColor(key);
  const raw = String(color).trim();
  if (raw.startsWith('#')) return raw;
  const mapped = resolveBadgeColor(raw);
  if (typeof mapped === 'string' && mapped.startsWith('var(--')) return mapped;
  return resolveBadgeColor('gray');
}

const StatusDropdownContext = createContext(null);

const useStatusDropdownContext = () => {
  const context = useContext(StatusDropdownContext);
  if (!context)
    throw new Error('StatusDropdown.Trigger/Content must be used inside StatusDropdown.Root');
  return context;
};

const getMeta = (option, getOptionMeta) => {
  const fromMeta = getOptionMeta?.(option);
  if (fromMeta) return fromMeta;
  return {
    color: option?.color,
    percentage: option?.percentage == null ? undefined : clampPercentage(option.percentage),
  };
};

const Root = ({
  value,
  onValueChange,
  statusOptions = [],
  getOptionMeta = null,
  indicator = 'auto',
  disabled = false,
  hasError = false,
  size = 'medium',
  placeholder = 'Select status',
  variant = 'inline',
  children,
  showArrow = true,
  ...rest
}) => {
  const selectedOption = useMemo(
    () => statusOptions.find((o) => (o.value ?? o) === value),
    [statusOptions, value],
  );
  const selectedLabel = selectedOption?.label ?? selectedOption?.value ?? value ?? '';
  const selectedMeta = useMemo(
    () => (selectedOption ? getMeta(selectedOption, getOptionMeta) : {}),
    [selectedOption, getOptionMeta],
  );
  const selectedColor = selectedMeta.color;

  const context = useMemo(
    () => ({
      value,
      onValueChange,
      statusOptions,
      getOptionMeta,
      indicator,
      size,
      placeholder,
      variant,
      selectedLabel,
      selectedColor,
      showArrow,
      getMeta: (option) => getMeta(option, getOptionMeta),
    }),
    [
      value,
      onValueChange,
      statusOptions,
      getOptionMeta,
      indicator,
      size,
      placeholder,
      variant,
      selectedLabel,
      selectedColor,
      showArrow,
    ],
  );

  return (
    <StatusDropdownContext.Provider value={context}>
      <Select.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        size={size}
        hasError={hasError}
        variant='borderless'
        {...rest}
      >
        {children}
      </Select.Root>
    </StatusDropdownContext.Provider>
  );
};

Root.displayName = 'StatusDropdown.Root';

/** Inline trigger: solid token background + white label (StatusDropdown-only styling). */
const StatusBadgeDisplay = ({ label, color, showArrow = true }) => {
  if (!label) return null;
  const backgroundColor = getStatusDropdownSolidFill(color);

  return (
    <div
      className='inline-flex h-7 max-w-full items-center overflow-hidden rounded-lg'
      style={{ backgroundColor, color: '#fff' }}
    >
      <div
        className={cn(
          'flex h-7 min-w-0 max-w-full items-center truncate whitespace-nowrap pl-2 pr-2 text-subheading-2xs uppercase tracking-[0.48px]',
          showArrow && 'border-r border-white/40',
        )}
      >
        {label}
      </div>
      {showArrow ? (
        <div className='flex size-7 shrink-0 items-center justify-center'>
          <RiArrowDownSLine className='size-5 shrink-0 text-white' />
        </div>
      ) : null}
    </div>
  );
};

const Trigger = ({
  className,
  variant: triggerVariant,
  size: triggerSize,
  placeholder: triggerPlaceholder,
  ...rest
}) => {
  const context = useStatusDropdownContext();
  const variant = triggerVariant ?? context.variant;
  const size = triggerSize ?? context.size;
  const placeholder = triggerPlaceholder ?? context.placeholder;
  const isFull = variant === 'full';
  const isInline = variant === 'inline';

  const triggerStyle =
    isFull && context.selectedLabel && context.selectedColor
      ? {
          backgroundColor: getStatusDropdownSolidFill(context.selectedColor),
          color: '#fff',
        }
      : undefined;

  return (
    <Select.Trigger
      showArrow={isFull}
      className={cn(
        'w-auto flex items-center bg-transparent',
        className,
        isInline && 'p-0 h-[unset] min-h-[unset]',
      )}
      style={triggerStyle}
      arrowColor={isFull ? 'white' : ''}
      ringLess
      {...rest}
    >
      {isFull ? (
        context.selectedLabel ? (
          <Select.Value>
            <span className='text-white'>{context.selectedLabel}</span>
          </Select.Value>
        ) : (
          <Select.Value placeholder={placeholder} />
        )
      ) : null}
      {isInline &&
        (context.selectedLabel ? (
          <StatusBadgeDisplay
            label={context.selectedLabel}
            color={context.selectedColor}
            showArrow={context.showArrow}
          />
        ) : (
          <Select.Value placeholder={placeholder} />
        ))}
    </Select.Trigger>
  );
};

Trigger.displayName = 'StatusDropdown.Trigger';

const Content = ({ className, ...rest }) => {
  const context = useStatusDropdownContext();
  const neutralColor = 'var(--color-faded-base)';

  return (
    <Select.Content className={cn('min-w-[200px]', className)} {...rest}>
      {context.statusOptions
        .filter((option) => !option.hidden)
        .map((option) => {
          const optionValue = option.value ?? option;
          const optionLabel = option.label ?? option;
          const isSelected = context.value === optionValue;
          const meta = context.getMeta(option);
          const rawColor = meta.color ?? neutralColor;
          const solidFill = getStatusDropdownSolidFill(rawColor);
          const { percentage } = meta;
          const hasPercentage = percentage != null;
          const canShowProgress =
            context.indicator === 'progress' || (context.indicator === 'auto' && hasPercentage);

          const icon =
            context.indicator === 'none' ? null : canShowProgress ? (
              <CircularProgress
                percentage={clampPercentage(percentage ?? 0)}
                color={solidFill}
                size={15}
                variant='sector'
                aria-label={`${optionLabel} progress`}
              />
            ) : (
              <CircularProgress
                percentage={100}
                color={solidFill}
                size={15}
                variant='sector'
                aria-label={`${optionLabel} status`}
              />
            );

          return (
            <Select.Item
              key={optionValue}
              value={optionValue}
              className='mb-1'
              data-state={isSelected ? 'checked' : 'unchecked'}
            >
              <div className='flex items-center gap-1.5'>
                {icon}
                <span className='text-paragraph-sm text-text-main-900 text-nowrap'>
                  {optionLabel}
                </span>
              </div>
            </Select.Item>
          );
        })}
    </Select.Content>
  );
};

Content.displayName = 'StatusDropdown.Content';

export const StatusDropdown = {
  Root,
  Trigger,
  Content,
};

export { StatusBadgeDisplay };

export default StatusDropdown;
