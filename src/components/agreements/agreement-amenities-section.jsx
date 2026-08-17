import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiAddLine, RiDeleteBinLine, RiCheckLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Input from '@/components/ui/input';
import * as Dropdown from '@/components/ui/dropdown';
import { cn } from '@/utils/cn';
import { fetchAmenitiesTypeThunk } from '@/redux/agreementsSlice';

const newRowId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `amenity-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DEFAULT_ROWS = () => [];

/**
 * Amenities table (create agreement): layout matches `agreement-view-amenities-section` AmenityRow
 * — 180px name column, fluid remark column, same row heights and borders.
 */
const AgreementAmenitiesSection = React.forwardRef(({ className }, ref) => {
  const dispatch = useDispatch();
  const { data: amenitiesTypesData } = useSelector((state) => state.agreements.amenitiesTypes);

  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [amenitySearchQuery, setAmenitySearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Fetch amenities from backend on mount
  useEffect(() => {
    dispatch(fetchAmenitiesTypeThunk());
  }, [dispatch]);

  React.useImperativeHandle(ref, () => ({ getAmenitiesRows: () => rows }), [rows]);

  // Focus search input whenever a dropdown opens (either manually or programmatically)
  useEffect(() => {
    if (openDropdownId) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [openDropdownId]);

  const setChecked = useCallback((id, checked) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, checked: Boolean(checked) } : r)));
  }, []);

  const patchRow = useCallback((id, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [field]: value };
        if (field === 'name' || field === 'remark') {
          const name = field === 'name' ? value : r.name;
          const remark = field === 'remark' ? value : r.remark;
          if (String(name).trim() || String(remark).trim()) {
            next.isDraft = false;
          }
        }
        return next;
      }),
    );
  }, []);

  const removeRow = useCallback((id) => {
    setEditingRemarkId((cur) => (cur === id ? null : cur));
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addRow = useCallback(() => {
    const id = newRowId();
    setRows((prev) => [
      ...prev,
      {
        id,
        name: '',
        remark: '',
        checked: true,
        isDraft: true,
      },
    ]);
    // Automatically open the dropdown for the new row
    setOpenDropdownId(id);
  }, []);

  const handleRemarkBlur = useCallback((e, rowId) => {
    const rowEl = e.currentTarget.closest('[data-amenity-row]');
    const { relatedTarget } = e;
    if (relatedTarget instanceof Node && rowEl?.contains(relatedTarget)) {
      return;
    }
    setEditingRemarkId((cur) => (cur === rowId ? null : cur));
  }, []);

  const startEditingRemark = useCallback((rowId) => {
    setEditingRemarkId(rowId);
  }, []);

  const handleRowBlur = useCallback(
    (e, rowId) => {
      const { currentTarget, relatedTarget } = e;

      if (openDropdownId === rowId) return;

      if (relatedTarget instanceof Node) {
        if (currentTarget.contains(relatedTarget)) return;
        if (relatedTarget.closest?.('[data-amenity-table]')) return;
      }
      setRows((prev) => {
        const row = prev.find((r) => r.id === rowId);
        if (!row || !row.isDraft || String(row.name).trim() || String(row.remark).trim()) {
          return prev;
        }
        return prev.filter((r) => r.id !== rowId);
      });
      setEditingRemarkId((cur) => (cur === rowId ? null : cur));
    },
    [openDropdownId],
  );

  return (
    <div
      data-amenity-table
      className={cn('overflow-hidden rounded-xl border border-stroke-soft-200', className)}
    >
      <div
        className='grid grid-cols-[180px_1fr] items-center gap-1.5 border-b border-stroke-soft-200 bg-bg-weak-100 text-label-sm text-text-sub-600'
        role='row'
      >
        <div className='flex h-11 min-w-0 items-center pl-3'>Name</div>
        <div className='flex h-11 min-w-0 items-center border-l border-stroke-soft-200 pl-1.5 pr-1'>
          Remark
        </div>
      </div>

      <div>
        {rows.map((row) => {
          const hasRemark = String(row.remark).trim().length > 0;
          const remarkEditing = editingRemarkId === row.id;

          // Use backend data
          const currentAmenitiesList =
            amenitiesTypesData && amenitiesTypesData.length > 0
              ? amenitiesTypesData.map((item) => item.label)
              : [];

          // Filter out already selected amenities (except the one current to this row)
          const filteredOptions = currentAmenitiesList.filter((opt) => {
            const isAlreadySelected = rows.some((r) => r.id !== row.id && r.name === opt);
            return (
              !isAlreadySelected && opt.toLowerCase().includes(amenitySearchQuery.toLowerCase())
            );
          });

          return (
            <div
              key={row.id}
              data-amenity-row
              className='group/amenity-row border-b border-stroke-soft-200 last:border-b-0'
              role='row'
              onBlur={(e) => handleRowBlur(e, row.id)}
            >
              <div className='grid grid-cols-[180px_1fr] items-center gap-1.5'>
                <div className='flex h-11 w-full min-w-0 items-center gap-2 pl-3'>
                  <Checkbox.Root
                    checked={row.checked}
                    onCheckedChange={(v) => setChecked(row.id, v === true)}
                    aria-label={`Select ${row.name.trim() || 'amenity'}`}
                    className='shrink-0'
                  />
                  <div className='min-w-0 flex-1'>
                    <Dropdown.Root
                      open={openDropdownId === row.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setOpenDropdownId(row.id);
                        } else {
                          setOpenDropdownId(null);
                          setAmenitySearchQuery('');
                        }
                      }}
                    >
                      <Dropdown.Trigger asChild>
                        <Button.Root
                          type='button'
                          variant='neutral'
                          mode='ghost'
                          className={cn(
                            'flex w-full min-w-0 items-center justify-start rounded-md p-0 text-left text-paragraph-sm transition-colors hover:bg-bg-weak-50',
                            !row.name ? 'text-text-soft-400' : 'text-text-strong-950',
                          )}
                        >
                          <span className='truncate'>{row.name || 'Select amenity'}</span>
                        </Button.Root>
                      </Dropdown.Trigger>
                      <Dropdown.Content
                        className='max-w-[max(var(--radix-dropdown-menu-trigger-width),220px)] p-0 gap-0 min-h-[200px] max-h-[300px] overflow-hidden'
                        align='start'
                        sideOffset={4}
                      >
                        <div className='border-b border-stroke-soft-200 p-2'>
                          <Input.Root size='small'>
                            <Input.Wrapper>
                              <Input.Input
                                ref={searchInputRef}
                                placeholder='Search amenity...'
                                value={amenitySearchQuery}
                                onChange={(e) => setAmenitySearchQuery(e.target.value)}
                                autoComplete='off'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </div>
                        <div className='flex h-full max-h-[240px] flex-1 flex-col space-y-1 overflow-y-auto p-2'>
                          {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, i) => {
                              const isSelected = row.name === opt;
                              return (
                                <div
                                  key={opt + i}
                                  onClick={() => {
                                    patchRow(row.id, 'name', opt);
                                    setOpenDropdownId(null);
                                  }}
                                  className={cn(
                                    'group/item relative cursor-pointer select-none rounded-lg p-2 text-paragraph-sm text-text-strong-950 outline-none',
                                    'flex items-center gap-2',
                                    'transition duration-200 ease-out',
                                    'hover:bg-bg-weak-50',
                                    isSelected && 'bg-bg-weak-50',
                                  )}
                                  role='button'
                                  tabIndex={0}
                                >
                                  <span className='flex-1'>{opt}</span>
                                  {isSelected && (
                                    <RiCheckLine className='size-4 text-text-main-900 shrink-0' />
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className='p-4 text-center text-paragraph-sm text-text-soft-400'>
                              No amenities found
                            </div>
                          )}
                        </div>
                      </Dropdown.Content>
                    </Dropdown.Root>
                  </div>
                </div>
                <div
                  className={cn(
                    'group/field relative flex h-11 min-w-0 flex-1 flex-row items-center gap-2 border-l border-stroke-soft-200',
                    'pl-1.5 pr-1',
                  )}
                >
                  <div className='flex h-full min-w-0 flex-1 items-center'>
                    {hasRemark || remarkEditing ? (
                      <Input.Root
                        variant='borderless'
                        size='medium'
                        className='h-8 min-h-8 w-full shadow-none'
                        noRing
                      >
                        <Input.Wrapper className='!h-11 !min-h-11 !px-0 !py-0'>
                          <Input.Input
                            variant='borderless'
                            size='medium'
                            type='text'
                            placeholder='Enter Remark'
                            className='h-8 min-h-8 py-0 leading-none'
                            value={row.remark}
                            onChange={(e) => patchRow(row.id, 'remark', e.target.value)}
                            onBlur={(e) => handleRemarkBlur(e, row.id)}
                            aria-label='Amenity remark'
                            autoFocus={remarkEditing && !hasRemark}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    ) : (
                      <Button.Root
                        type='button'
                        variant='neutral'
                        mode='ghost'
                        size='xsmall'
                        className={cn(
                          'h-11 min-h-11 w-full min-w-0 shrink-0 justify-start px-0 py-0 text-paragraph-sm text-text-sub-500',
                          'transition-colors hover:bg-bg-weak-50 hover:text-text-sub-600',
                        )}
                        onClick={() => startEditingRemark(row.id)}
                      >
                        -
                      </Button.Root>
                    )}
                  </div>
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='ghost'
                    size='xxsmall'
                    className={cn(
                      'shrink-0 !h-8 !w-8 !px-0',
                      'bg-transparent text-text-sub-600 shadow-none ring-transparent',
                      'hover:bg-bg-weak-50 hover:text-text-strong-950',
                    )}
                    onClick={() => removeRow(row.id)}
                    aria-label='Remove amenity'
                  >
                    <RiDeleteBinLine className='size-5' aria-hidden />
                  </Button.Root>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className='cursor-pointer border-t border-stroke-soft-200 bg-bg-weak-100 transition-colors hover:bg-bg-weak-50'
        onClick={addRow}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            addRow();
          }
        }}
        role='button'
        tabIndex={0}
      >
        <div className='flex items-center gap-2 px-4 py-2'>
          <span className='flex size-7 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-600'>
            <RiAddLine className='size-4' aria-hidden />
          </span>
          <span className='text-paragraph-sm text-text-sub-500'>Add New Amenity</span>
        </div>
      </div>
    </div>
  );
});

AgreementAmenitiesSection.displayName = 'AgreementAmenitiesSection';

export default AgreementAmenitiesSection;
