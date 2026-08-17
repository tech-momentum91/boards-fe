import React from 'react';

import { MultiSelect } from '@/components/ui/multi-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { LAYOUT_FILTER_ALL } from '@/constants/layout/center-filter-constants';
import { LAYOUT_SPACE_TYPE_MULTI_SELECT_OPTIONS } from '@/utils/layout-annotation-filter-utils';

function SpaceTypeOptionLabel({ label, color }) {
  if (!color) return label;
  return (
    <span className='flex min-w-0 items-center gap-2'>
      <span
        className='size-2.5 shrink-0 rounded-full'
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className='truncate'>{label}</span>
    </span>
  );
}

/**
 * @param {{
 *   spaceTypes: string[],
 *   spaceRef: string,
 *   spaceOptions: Array<{ value: string, label: string }>,
 *   onSpaceTypesChange: (values: string[]) => void,
 *   onSpaceRefChange: (value: string) => void,
 * }} props
 */
export default function ProposalPage6FloorPlanEditorFilters({
  spaceTypes,
  spaceRef,
  spaceOptions,
  onSpaceTypesChange,
  onSpaceRefChange,
}) {
  return (
    <div className='flex max-w-full flex-wrap items-center gap-3'>
      <MultiSelect
        options={LAYOUT_SPACE_TYPE_MULTI_SELECT_OPTIONS}
        value={Array.isArray(spaceTypes) ? spaceTypes : []}
        onValueChange={onSpaceTypesChange}
        placeholder='Add space types'
        searchPlaceholder='Search space types…'
        size='small'
        className='w-[10.5rem] max-w-full min-w-0 shrink'
        maxDisplayItems={1}
        renderOptionLabel={(opt) => <SpaceTypeOptionLabel label={opt.label} color={opt.color} />}
      />

      <SearchableSelect
        value={spaceRef || LAYOUT_FILTER_ALL}
        onValueChange={onSpaceRefChange}
        options={spaceOptions}
        placeholder='All space'
        searchPlaceholder='Search spaces…'
        valueSentinel={LAYOUT_FILTER_ALL}
        size='small'
        showArrow
        matchTriggerWidth
        triggerClassName='w-[9.25rem] max-w-full min-w-0 shrink'
      />
    </div>
  );
}
