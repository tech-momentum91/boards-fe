import React from 'react';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';

export function formatProjectPriorityLabel(priority) {
  const normalized = String(priority ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'high') return 'HIGH';
  if (normalized === 'medium') return 'MEDIUM';
  if (normalized === 'low') return 'LOW';
  return String(priority ?? '').toUpperCase();
}

export function ProjectBadgeLabel({ value, colorFn, label, size = 'small', className }) {
  if (!value) return null;

  return (
    <Badge.Root
      size={size}
      variant='light'
      color={colorFn(value)}
      className={cn('text-nowrap', className)}
    >
      {label ?? value}
    </Badge.Root>
  );
}

export default function ProjectBadgeSelect({
  value,
  onValueChange,
  options = [],
  colorFn,
  formatLabel,
  size = 'xsmall',
  variant = 'borderless',
  triggerClassName,
  placeholder = 'Select',
  showArrow = false,
  disabled,
  hasError,
  badgeSize = 'small',
}) {
  const resolveLabel = (optionValue, optionLabel) => {
    if (optionLabel != null && optionLabel !== '') return optionLabel;
    if (formatLabel) return formatLabel(optionValue);
    return optionValue;
  };

  const normalizedOptions = options.map((option) =>
    typeof option === 'string'
      ? { value: option, label: resolveLabel(option) }
      : { value: option.value, label: resolveLabel(option.value, option.label) },
  );

  const selectedOption = normalizedOptions.find((option) => option.value === value);

  return (
    <Select.Root
      value={value || undefined}
      onValueChange={onValueChange}
      size={size}
      variant={variant}
      disabled={disabled}
      hasError={hasError}
    >
      <Select.Trigger className={cn('h-8 min-w-[120px]', triggerClassName)} showArrow={showArrow}>
        {value ? (
          <ProjectBadgeLabel
            value={value}
            colorFn={colorFn}
            label={selectedOption?.label ?? resolveLabel(value)}
            size={badgeSize}
          />
        ) : (
          <Select.Value placeholder={placeholder} />
        )}
      </Select.Trigger>
      <Select.Content className='min-w-[148px]'>
        {normalizedOptions.map((option) => (
          <Select.Item key={option.value} value={option.value}>
            <ProjectBadgeLabel
              value={option.value}
              colorFn={colorFn}
              label={option.label}
              size={badgeSize}
            />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
