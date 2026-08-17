import React from 'react';

import { SearchableSelect } from '@/components/ui/searchable-select';
import ClientLayoutCoworkerSearchPopover from '@/pages/clients/client-layout-coworker-search-popover';
import {
  CLIENT_LAYOUT_FILTER_ALL,
  CLIENT_LAYOUT_WORK_MODE_FILTER_OPTIONS,
} from '@/utils/client-layout-coworker-filters';

/**
 * Top-bar filters for the client-side layout view.
 * Mirrors the center editor toolbar pattern (`layout-annotation-header-filters.jsx`)
 * but with co-worker centric controls.
 *
 * @param {{
 *   searchInput: string,
 *   onSearchInputChange: (value: string) => void,
 *   onSearchPick: (coworkerRef: string) => void,
 *   workType: string,
 *   onWorkTypeChange: (value: string) => void,
 *   coworkerRef: string,
 *   onCoworkerRefChange: (value: string) => void,
 *   department: string,
 *   onDepartmentChange: (value: string) => void,
 *   coworkerOptions: Array<{ value: string, label: string }>,
 *   departmentOptions: Array<{ value: string, label: string }>,
 * }} props
 */
export default function ClientLayoutHeaderFilters({
  searchInput,
  onSearchInputChange,
  onSearchPick,
  workType,
  onWorkTypeChange,
  coworkerRef,
  onCoworkerRefChange,
  department,
  onDepartmentChange,
  coworkerOptions,
  departmentOptions,
}) {
  const selectClass = 'w-[9.5rem] max-w-full min-w-0 shrink';

  return (
    <div className='flex max-w-full flex-wrap items-center justify-end gap-2'>
      <ClientLayoutCoworkerSearchPopover
        value={searchInput}
        onValueChange={onSearchInputChange}
        onPick={onSearchPick}
        options={coworkerOptions}
        placeholder='Search co-workers'
      />

      <SearchableSelect
        value={workType || CLIENT_LAYOUT_FILTER_ALL}
        onValueChange={onWorkTypeChange}
        options={CLIENT_LAYOUT_WORK_MODE_FILTER_OPTIONS}
        placeholder='All work types'
        searchPlaceholder='Search work types…'
        valueSentinel={CLIENT_LAYOUT_FILTER_ALL}
        size='small'
        showArrow
        matchTriggerWidth
        triggerClassName={selectClass}
      />

      <SearchableSelect
        value={coworkerRef || CLIENT_LAYOUT_FILTER_ALL}
        onValueChange={onCoworkerRefChange}
        options={coworkerOptions}
        placeholder='All co-workers'
        searchPlaceholder='Search co-workers…'
        valueSentinel={CLIENT_LAYOUT_FILTER_ALL}
        size='small'
        showArrow
        matchTriggerWidth
        triggerClassName={selectClass}
      />

      <SearchableSelect
        value={department || CLIENT_LAYOUT_FILTER_ALL}
        onValueChange={onDepartmentChange}
        options={departmentOptions}
        placeholder='All departments'
        searchPlaceholder='Search departments…'
        valueSentinel={CLIENT_LAYOUT_FILTER_ALL}
        size='small'
        showArrow
        matchTriggerWidth
        triggerClassName={selectClass}
      />
    </div>
  );
}
