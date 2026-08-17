import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiCheckLine, RiSearchLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';

import { CrmAccountAvatar, getInitials } from '@/components/crm-accounts/crm-account-avatar';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import {
  clearUnassignedCoworkerListState,
  getUnassignedCoworkerListThunk,
  selectUnassignedCoworkerListState,
} from '@/redux/coworkerSlice';
import { selectClientDetail } from '@/redux/clientDetailSlice';
import { cn } from '@/utils/cn';
import { buildClientLayoutDepartmentFilterOptions } from '@/utils/client-layout-coworker-filters';
import { LAYOUT_FILTER_ALL } from '@/constants/layout/filter-sentinel';
import { showErrorToast } from '@/utils/error-utils';

const MODAL_LIST_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 350;

function toUnassignedListDepartment(value) {
  const dept = String(value ?? '').trim();
  if (!dept || dept === LAYOUT_FILTER_ALL || dept.toLowerCase() === 'all') return 'All';
  return dept;
}

export function getCoworkerDisplayName(cw) {
  if (!cw || typeof cw !== 'object') return '';
  return (
    `${cw.first_name || ''} ${cw.last_name || ''}`.trim() ||
    cw.full_name ||
    cw.coworker_name ||
    String(cw.name || '').trim()
  );
}

/**
 * Shared department + co-worker picker for assign modals.
 *
 * @param {{
 *   open: boolean,
 *   clientId: string,
 *   selectedDepartment: string,
 *   onDepartmentChange: (dept: string) => void,
 *   selectedCoworkerId: string,
 *   onCoworkerIdChange: (id: string) => void,
 *   onSelectedCoworkerLabelChange?: (label: string) => void,
 * }} props
 */
export function ClientAssignCoworkerPickerFields({
  open,
  clientId,
  selectedDepartment,
  onDepartmentChange,
  selectedCoworkerId,
  onCoworkerIdChange,
  onSelectedCoworkerLabelChange,
}) {
  const dispatch = useDispatch();
  const unassignedList = useSelector(selectUnassignedCoworkerListState);
  const clientDetail = useSelector(selectClientDetail);
  const departmentOptions = useMemo(
    () => buildClientLayoutDepartmentFilterOptions(clientDetail?.data),
    [clientDetail?.data],
  );
  const {
    rows: coworkerRows,
    isLoading: isLoadingCoworkerList,
    error: unassignedCoworkerListError,
  } = unassignedList;

  const [coworkerSearch, setCoworkerSearch] = useState('');
  const [coworkerSelectOpen, setCoworkerSelectOpen] = useState(false);
  const searchInputRef = useRef(null);
  const cid = String(clientId || '').trim();

  const fetchCoworkers = useCallback(
    (department, keyword) => {
      if (!cid) return;
      dispatch(
        getUnassignedCoworkerListThunk({
          keyword: String(keyword ?? '').trim(),
          client_id: cid,
          department: toUnassignedListDepartment(department),
          page: 1,
          page_size: MODAL_LIST_PAGE_SIZE,
        }),
      );
    },
    [cid, dispatch],
  );

  useEffect(() => {
    if (!open || !cid) return undefined;
    const delayMs = coworkerSearch.trim() ? SEARCH_DEBOUNCE_MS : 0;
    const handle = window.setTimeout(() => {
      fetchCoworkers(selectedDepartment, coworkerSearch);
    }, delayMs);
    return () => window.clearTimeout(handle);
  }, [open, cid, selectedDepartment, coworkerSearch, fetchCoworkers]);

  useEffect(() => {
    if (!open || !unassignedCoworkerListError) return;
    showErrorToast(unassignedCoworkerListError, {
      defaultMessage: 'Failed to load co-workers.',
    });
  }, [open, unassignedCoworkerListError]);

  const selectedCoworker = useMemo(
    () => coworkerRows.find((cw) => String(cw.name || '').trim() === selectedCoworkerId),
    [coworkerRows, selectedCoworkerId],
  );

  const selectedCoworkerLabel = selectedCoworker ? getCoworkerDisplayName(selectedCoworker) : '';

  useEffect(() => {
    onSelectedCoworkerLabelChange?.(selectedCoworkerLabel);
  }, [selectedCoworkerLabel, onSelectedCoworkerLabelChange]);

  const handleDepartmentChange = useCallback(
    (value) => {
      const dept = String(value || LAYOUT_FILTER_ALL).trim() || LAYOUT_FILTER_ALL;
      onDepartmentChange(dept);
      onCoworkerIdChange('');
      setCoworkerSearch('');
    },
    [onDepartmentChange, onCoworkerIdChange],
  );

  const coworkerListBody = useMemo(() => {
    if (isLoadingCoworkerList) {
      return (
        <div className='flex min-h-[140px] items-center justify-center px-4 py-8 text-paragraph-sm text-text-sub-600'>
          Loading co-workers…
        </div>
      );
    }
    if (coworkerRows.length === 0) {
      return (
        <div className='px-4 py-8 text-center text-paragraph-sm text-text-sub-600'>
          No co-workers found for this department.
        </div>
      );
    }
    return (
      <ul className='flex flex-col gap-0.5 p-1'>
        {coworkerRows.map((cw, index) => {
          const id = String(cw.name || '').trim();
          const name = getCoworkerDisplayName(cw) || id;
          const isSelected = selectedCoworkerId === id;
          const dept = String(cw.department || '').trim();
          return (
            <li key={id || `${name}-${index}`}>
              <button
                type='button'
                onClick={() => {
                  onCoworkerIdChange(id);
                  setCoworkerSelectOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                  isSelected ? 'bg-bg-weak-50' : 'hover:bg-bg-weak-50',
                )}
              >
                <CrmAccountAvatar
                  name={name}
                  initials={getInitials(name)}
                  image={cw.image || cw.user_image || null}
                  size={32}
                  variant='weak'
                  showNativeTitle={false}
                />
                <span className='min-w-0 flex-1 truncate text-[14px] leading-5 text-text-strong-950'>
                  {name}
                  {dept ? (
                    <span className='ml-1.5 font-normal text-text-sub-600'>{dept}</span>
                  ) : null}
                </span>
                {isSelected ? (
                  <RiCheckLine className='size-5 shrink-0 text-primary-base' aria-hidden />
                ) : (
                  <span className='size-5 shrink-0' aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }, [coworkerRows, isLoadingCoworkerList, selectedCoworkerId, onCoworkerIdChange]);

  if (!cid) {
    return (
      <p className='text-paragraph-sm text-error-base'>
        Missing client context. Open this layout from the client Allocate tab.
      </p>
    );
  }

  return (
    <>
      <div className='flex flex-col gap-1.5'>
        <Label.Root htmlFor='assign-coworker-department'>Department</Label.Root>
        <Select.Root
          value={selectedDepartment || LAYOUT_FILTER_ALL}
          onValueChange={handleDepartmentChange}
          size='small'
        >
          <Select.Trigger id='assign-coworker-department' className='w-full'>
            <Select.Value placeholder='All departments' />
          </Select.Trigger>
          <Select.Content>
            {departmentOptions.map((opt) => (
              <Select.Item key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label.Root htmlFor='assign-coworker-picker'>
          Co-worker
          <Label.Asterisk className='text-red-500' />
        </Label.Root>
        <Select.Root
          open={coworkerSelectOpen}
          onOpenChange={setCoworkerSelectOpen}
          value={selectedCoworkerId || undefined}
          onValueChange={onCoworkerIdChange}
          size='small'
        >
          <Select.Trigger id='assign-coworker-picker' className='w-full'>
            {selectedCoworkerLabel ? (
              <span className='min-w-0 flex-1 truncate text-left text-paragraph-sm text-text-strong-950'>
                {selectedCoworkerLabel}
              </span>
            ) : (
              <Select.Value placeholder='Select' />
            )}
          </Select.Trigger>
          <Select.Content
            layout='searchable'
            className='min-w-[var(--radix-select-trigger-width)] max-h-[320px] overflow-hidden border border-stroke-soft-200 p-0'
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              requestAnimationFrame(() => searchInputRef.current?.focus());
            }}
          >
            <div className='border-b border-stroke-soft-200 p-2'>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    ref={searchInputRef}
                    placeholder='Search...'
                    value={coworkerSearch}
                    onChange={(e) => setCoworkerSearch(e.target.value)}
                    autoComplete='off'
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
            <div
              className='max-h-[236px] overflow-y-auto overscroll-contain'
              onWheel={(e) => e.stopPropagation()}
            >
              {coworkerListBody}
            </div>
          </Select.Content>
        </Select.Root>
      </div>
    </>
  );
}

/** Reset unassigned list when modals close. */
export function useClearUnassignedCoworkersOnClose(open) {
  const dispatch = useDispatch();
  useEffect(() => {
    if (!open) dispatch(clearUnassignedCoworkerListState());
  }, [open, dispatch]);
}
