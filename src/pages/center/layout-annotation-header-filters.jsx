import React from 'react';

import { MultiSelect } from '@/components/ui/multi-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import LayoutAnnotationAgreementDateFilter from '@/pages/center/layout-annotation-agreement-date-filter';
import {
  LAYOUT_FILTER_ALL,
  LAYOUT_OCCUPANCY_OPTIONS,
  LAYOUT_SPACE_TYPE_MULTI_SELECT_OPTIONS,
} from '@/utils/layout-annotation-filter-utils';

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
 *   clientOptions: Array<{ value: string, label: string }>,
 *   spaceOptions: Array<{ value: string, label: string }>,
 *   clientId: string,
 *   spaceRef: string,
 *   spaceTypes: string[],
 *   occupancy: string,
 *   onClientIdChange: (v: string) => void,
 *   onSpaceRefChange: (v: string) => void,
 *   onSpaceTypesChange: (v: string[]) => void,
 *   onOccupancyChange: (v: string) => void,
 *   agreementDateFilter?: { type: string, fromDate: string, toDate: string } | null,
 *   onAgreementDateFilterChange?: (value: { type: string, fromDate: string, toDate: string } | null) => void,
 *   spaceOptionsLoading?: boolean,
 *   onSpaceSearchQueryChange?: (query: string) => void,
 * }} props
 */
export default function LayoutAnnotationHeaderFilters({
  clientOptions,
  spaceOptions,
  clientId,
  spaceRef,
  spaceTypes,
  occupancy,
  onClientIdChange,
  onSpaceRefChange,
  onSpaceTypesChange,
  onOccupancyChange,
  agreementDateFilter = null,
  onAgreementDateFilterChange,
  spaceOptionsLoading = false,
  onSpaceSearchQueryChange,
}) {
  const selectClass = 'w-[8.25rem] shrink-0';
  const agreementDateSelectClass = 'w-[10rem] shrink-0';

  return (
    <div className='flex shrink-0 flex-row flex-nowrap items-center gap-2'>
      <SearchableSelect
        value={clientId || LAYOUT_FILTER_ALL}
        onValueChange={onClientIdChange}
        options={clientOptions}
        placeholder='All client'
        searchPlaceholder='Search clients…'
        valueSentinel={LAYOUT_FILTER_ALL}
        size='small'
        showArrow
        matchTriggerWidth
        triggerClassName={selectClass}
      />
      <MultiSelect
        options={LAYOUT_SPACE_TYPE_MULTI_SELECT_OPTIONS}
        value={Array.isArray(spaceTypes) ? spaceTypes : []}
        onValueChange={onSpaceTypesChange}
        placeholder='All space type'
        searchPlaceholder='Search space types…'
        size='small'
        className={selectClass}
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
        triggerClassName={selectClass}
        disabled={spaceTypes.length === 0}
        onSearchQueryChange={onSpaceSearchQueryChange}
        emptyMessage={
          spaceOptionsLoading
            ? 'Loading spaces…'
            : spaceTypes.length === 0
              ? 'Select a space type first'
              : 'No spaces available'
        }
        noResultsMessage='No spaces found'
      />

      <SearchableSelect
        value={occupancy || LAYOUT_FILTER_ALL}
        onValueChange={onOccupancyChange}
        options={LAYOUT_OCCUPANCY_OPTIONS}
        placeholder='All occupancies'
        searchPlaceholder='Search occupancies…'
        valueSentinel={LAYOUT_FILTER_ALL}
        size='small'
        showArrow
        matchTriggerWidth
        triggerClassName={selectClass}
      />

      <LayoutAnnotationAgreementDateFilter
        value={agreementDateFilter}
        onChange={onAgreementDateFilterChange ?? (() => {})}
        className={agreementDateSelectClass}
      />
    </div>
  );
}
