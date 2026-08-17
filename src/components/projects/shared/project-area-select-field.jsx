import React from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useProjectAreas } from '@/hooks/use-project-areas';
import { cn } from '@/utils/cn';

/**
 * Area dropdown backed by layout areas (`get_layout_areas`).
 * When a floor is set, fetches floor-scoped Floor Layout areas by default.
 * Pass `fetchByFloor={false}` to filter from the project-wide cache instead.
 */
export default function ProjectAreaSelectField({
  projectId,
  floor,
  value,
  onValueChange,
  fetchByFloor = Boolean(String(floor ?? '').trim()),
  size = 'xsmall',
  variant = 'compact',
  showArrow: showArrowProp,
  placeholder,
  searchPlaceholder = 'Search...',
  contentClassName,
  triggerClassName,
  disabled = false,
  className,
}) {
  const { areaOptions, isLoading } = useProjectAreas(projectId, floor, value, { fetchByFloor });

  const showArrow = showArrowProp ?? variant !== 'borderless';
  const requiresFloor = fetchByFloor;
  const resolvedPlaceholder =
    placeholder ?? (requiresFloor && !floor ? 'Select floor first' : 'Select');

  return (
    <SearchableSelect
      className={className}
      size={size}
      variant={variant}
      showArrow={showArrow}
      value={value}
      onValueChange={onValueChange}
      options={areaOptions}
      placeholder={resolvedPlaceholder}
      searchPlaceholder={searchPlaceholder}
      contentClassName={contentClassName}
      triggerClassName={cn(triggerClassName)}
      disabled={disabled || (requiresFloor && !floor) || isLoading}
    />
  );
}
