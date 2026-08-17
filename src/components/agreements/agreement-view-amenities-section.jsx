import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RiArrowDownSLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiArrowUpSLine,
  RiAddLine,
  RiDeleteBinLine,
  RiLayoutGridLine,
} from 'react-icons/ri';

import * as SegmentedControl from '@/components/ui/segmented-control';
import * as Tooltip from '@/components/ui/tooltip';
import * as Input from '@/components/ui/input';
import * as Dropdown from '@/components/ui/dropdown';
import FieldRow from '@/components/ui/field-row';
import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAmenitiesTypeThunk } from '@/redux/agreementsSlice';

const newAmenityId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `amenity-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DEFAULT_INCLUDED = [
  { id: 'am-parking', name: 'Parking', remark: '' },
  { id: 'am-cafeteria', name: 'Cafeteria', remark: '' },
  { id: 'am-security', name: 'Security', remark: '' },
  { id: 'am-lift', name: 'Lift', remark: 'Accessible between 8:00 AM – 8:00 PM' },
  { id: 'am-wifi', name: 'Wifi', remark: '' },
  { id: 'am-conference', name: 'Conference Room', remark: 'Accessible between 12:00 PM – 8:00 PM' },
];

const DEFAULT_EXCLUDED = [];

function normalizeText(v) {
  return String(v ?? '').trim();
}

/** Build API-shaped rows from local lists (same shape as commit / move / delete). */
function buildAmenitiesPayload(included, excluded) {
  const includedDetails = included
    .filter((a) => normalizeText(a?.name))
    .map((a) => ({
      amenity_name: normalizeText(a.name),
      remarks: normalizeText(a.remark),
      included: 1,
    }));
  const excludedDetails = excluded
    .filter((a) => normalizeText(a?.name))
    .map((a) => ({
      amenity_name: normalizeText(a.name),
      remarks: normalizeText(a.remark),
      included: 0,
    }));
  const rows = [...includedDetails, ...excludedDetails];
  rows.sort((a, b) => {
    const byName = a.amenity_name.localeCompare(b.amenity_name);
    if (byName !== 0) return byName;
    if (a.included !== b.included) return a.included - b.included;
    return a.remarks.localeCompare(b.remarks);
  });
  return rows;
}

function payloadSignature(payload) {
  return JSON.stringify(payload);
}

function truncateText(text, max = 28) {
  const s = String(text ?? '');
  if (s.length <= max) return { display: s, truncated: false };
  return { display: `${s.slice(0, max)}…`, truncated: true };
}

function AmenityRow({
  amenity,
  side,
  onMove,
  onDelete,
  onChange,
  openDropdownId,
  setOpenDropdownId,
  amenitiesOptions,
  usedAmenityNames,
  amenitySearchQuery,
  setAmenitySearchQuery,
  searchInputRef,
  editingRemarkId,
  setEditingRemarkId,
  focusNameOnMount = false,
}) {
  const nameRef = useRef(null);
  const remarkRef = useRef(null);

  useEffect(() => {
    if (focusNameOnMount) {
      nameRef.current?.focus?.();
    }
  }, [focusNameOnMount]);

  const name = amenity.name ?? '';
  const remark = amenity.remark ?? '';
  const hasRemark = normalizeText(remark).length > 0;
  const isEditingRemark = editingRemarkId === amenity.id;
  const remarkPreview = hasRemark ? truncateText(remark, 28) : { display: '-', truncated: false };

  const moveLabel = side === 'included' ? 'Move to Exclude' : 'Move to Include';
  const MoveIcon = side === 'included' ? RiArrowRightLine : RiArrowLeftLine;

  const isDraft = Boolean(amenity.isDraft);

  const actions = (
    <div
      className={cn(
        'absolute right-2 top-1/2 -translate-y-1/2',
        'flex items-center gap-0.5',
        'opacity-0 transition-opacity',
        'pointer-events-none',
        'group-hover/amenity-row:opacity-100',
        'group-focus-within/amenity-row:opacity-100',
      )}
    >
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button.Root
            type='button'
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(amenity.id);
            }}
            variant='neutral'
            mode='ghost'
            size='xxsmall'
            className={cn(
              '!h-7 !w-7 !px-0',
              'bg-transparent ring-transparent shadow-none',
              'text-text-sub-600 hover:text-text-strong-950 hover:bg-bg-weak-50',
            )}
            aria-label='Delete'
            style={{ pointerEvents: 'auto' }}
          >
            <RiDeleteBinLine className='size-5' aria-hidden />
          </Button.Root>
        </Tooltip.Trigger>
        <Tooltip.Content side='top' size='small'>
          Delete
        </Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button.Root
            type='button'
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMove(amenity.id);
            }}
            variant='neutral'
            mode='ghost'
            size='xxsmall'
            className={cn(
              '!h-7 !w-7 !px-0',
              'bg-transparent ring-transparent shadow-none',
              'text-text-sub-600 hover:text-text-strong-950 hover:bg-bg-weak-50',
            )}
            aria-label={moveLabel}
            style={{ pointerEvents: 'auto' }}
          >
            <MoveIcon className='size-5' aria-hidden />
          </Button.Root>
        </Tooltip.Trigger>
        <Tooltip.Content side='top' size='small'>
          {moveLabel}
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  );

  return (
    <div className='group/amenity-row border-b border-stroke-soft-200 last:border-b-0'>
      <div className='grid grid-cols-[180px_1fr] items-start gap-1.5'>
        <div className={cn('flex w-[180px] items-center gap-2 h-10 pl-3 min-w-0')}>
          <div className='relative flex w-full items-center min-w-0 pr-16'>
            <div className='min-w-0 flex-1 truncate'>
              {isDraft ? (
                <Dropdown.Root
                  open={openDropdownId === amenity.id}
                  onOpenChange={(open) => {
                    if (open) {
                      setOpenDropdownId(amenity.id);
                    } else {
                      setOpenDropdownId(null);
                      setAmenitySearchQuery('');
                    }
                  }}
                >
                  <Dropdown.Trigger asChild>
                    <Button.Root
                      ref={nameRef}
                      type='button'
                      variant='neutral'
                      mode='ghost'
                      className={cn(
                        'flex w-full min-w-0 items-center justify-start rounded-md p-0 text-left text-paragraph-sm',
                        !name ? 'text-text-soft-400' : 'text-text-strong-950',
                      )}
                    >
                      <span className='truncate'>{name || 'Select amenity'}</span>
                    </Button.Root>
                  </Dropdown.Trigger>
                  <Dropdown.Content
                    className='max-w-[max(var(--radix-dropdown-menu-trigger-width),220px)] p-0 gap-0 min-h-[200px] max-h-[300px] overflow-hidden'
                    align='start'
                    sideOffset={4}
                  >
                    <div className='p-2 border-b border-stroke-soft-200'>
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
                    <div className='flex flex-col h-full flex-1 max-h-[240px] overflow-y-auto p-2 space-y-1'>
                      {amenitiesOptions
                        .filter((opt) => {
                          if (usedAmenityNames.has(opt) && opt !== name) return false;
                          return opt.toLowerCase().includes(amenitySearchQuery.toLowerCase());
                        })
                        .map((opt) => {
                          const isSelected = name === opt;
                          return (
                            <div
                              key={opt}
                              onClick={() => {
                                onChange(amenity.id, { name: opt, isDraft: false });
                                setOpenDropdownId(null);
                                setEditingRemarkId(amenity.id);
                                setTimeout(() => remarkRef.current?.focus?.(), 0);
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
                            </div>
                          );
                        })}
                    </div>
                  </Dropdown.Content>
                </Dropdown.Root>
              ) : (
                <span className='truncate'>{name || '—'}</span>
              )}
            </div>
            {actions}
          </div>
        </div>
        <div
          className={cn(
            'min-h-10 flex-1 min-w-0 pl-1.5 pr-1 pb-1 pt-1 border-l border-stroke-soft-200 relative group/field',
            'flex flex-col items-start justify-center',
          )}
        >
          {isEditingRemark ? (
            <Input.Root variant='borderless' noRing className='w-full'>
              <Input.Wrapper className='!px-0'>
                <Input.Input
                  ref={remarkRef}
                  variant='borderless'
                  value={remark}
                  placeholder='Enter Remark'
                  onChange={(e) => onChange(amenity.id, { remark: e.target.value })}
                  onBlur={() => {
                    if (!normalizeText(remark)) setEditingRemarkId(null);
                  }}
                />
              </Input.Wrapper>
            </Input.Root>
          ) : (
            (() => {
              const openEdit = () => {
                setEditingRemarkId(amenity.id);
                setTimeout(() => remarkRef.current?.focus?.(), 0);
              };

              const remarkDisplay = hasRemark ? remarkPreview.display : '-';
              const remarkTextClass = hasRemark ? 'text-text-main-900' : 'text-text-sub-500';

              const trigger = (
                <Button.Root
                  type='button'
                  onClick={openEdit}
                  variant='neutral'
                  mode='ghost'
                  size='xsmall'
                  className={cn(
                    'w-full min-w-0 justify-start px-0',
                    'text-paragraph-sm',
                    remarkTextClass,
                  )}
                  aria-label='Edit remark'
                >
                  {remarkDisplay}
                </Button.Root>
              );

              return hasRemark && remarkPreview.truncated ? (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>{trigger}</Tooltip.Trigger>
                  <Tooltip.Content side='top' size='small'>
                    {remark}
                  </Tooltip.Content>
                </Tooltip.Root>
              ) : (
                trigger
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Agreement drawer amenities (Included / Excluded) – static now, API later.
 *
 * Props are intentionally optional; when API is ready pass `included` and `excluded`.
 */
function AgreementViewAmenitiesSection({
  defaultExpanded = false,
  included: includedProp,
  excluded: excludedProp,
  onCommit,
  className,
}) {
  const dispatch = useDispatch();
  const { data: amenitiesTypesData } = useSelector((state) => state.agreements.amenitiesTypes);
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded));
  const [tab, setTab] = useState('included');

  const [included, setIncluded] = useState(() => includedProp ?? DEFAULT_INCLUDED);
  const [excluded, setExcluded] = useState(() => excludedProp ?? DEFAULT_EXCLUDED);
  const [focusNewId, setFocusNewId] = useState(null);
  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [amenitySearchQuery, setAmenitySearchQuery] = useState('');
  const searchInputRef = useRef(null);
  /** Signature of last payload sent to parent or received from props — avoids redundant API on blur. */
  const lastEmittedSigRef = useRef(null);

  useEffect(() => {
    dispatch(fetchAmenitiesTypeThunk());
  }, [dispatch]);

  useEffect(() => {
    if (openDropdownId) {
      const t = setTimeout(() => searchInputRef.current?.focus?.(), 100);
      return () => clearTimeout(t);
    }
  }, [openDropdownId]);

  const emitAmenitiesIfChanged = useCallback(
    (payload) => {
      if (!onCommit) return;
      const sig = payloadSignature(payload);
      if (sig === lastEmittedSigRef.current) return;
      lastEmittedSigRef.current = sig;
      onCommit(payload);
    },
    [onCommit],
  );

  useEffect(() => {
    const inc = Array.isArray(includedProp) ? includedProp : [];
    const exc = Array.isArray(excludedProp) ? excludedProp : [];
    const sig = payloadSignature(buildAmenitiesPayload(inc, exc));
    if (sig === lastEmittedSigRef.current) return;
    lastEmittedSigRef.current = sig;
    setIncluded(inc);
    setExcluded(exc);
  }, [includedProp, excludedProp]);

  const commit = useCallback(() => {
    emitAmenitiesIfChanged(buildAmenitiesPayload(included, excluded));
  }, [emitAmenitiesIfChanged, excluded, included]);

  const amenitiesOptions =
    amenitiesTypesData && amenitiesTypesData.length > 0
      ? amenitiesTypesData.map((item) => item.label)
      : [];

  const usedAmenityNames = new Set(
    [...included, ...excluded].map((a) => normalizeText(a?.name)).filter(Boolean),
  );

  const setActiveList = tab === 'included' ? setIncluded : setExcluded;
  const setOtherList = tab === 'included' ? setExcluded : setIncluded;

  const moveAmenity = useCallback(
    (id) => {
      const fromIncluded = tab === 'included';
      const src = fromIncluded ? included : excluded;
      const dst = fromIncluded ? excluded : included;
      const item = src.find((a) => a.id === id);
      if (!item) return;
      const nextSrc = src.filter((a) => a.id !== id);
      const nextDst = [item, ...dst];
      if (fromIncluded) {
        setIncluded(nextSrc);
        setExcluded(nextDst);
        emitAmenitiesIfChanged(buildAmenitiesPayload(nextSrc, nextDst));
      } else {
        setExcluded(nextSrc);
        setIncluded(nextDst);
        emitAmenitiesIfChanged(buildAmenitiesPayload(nextDst, nextSrc));
      }
    },
    [emitAmenitiesIfChanged, excluded, included, tab],
  );

  const deleteAmenity = useCallback(
    (id) => {
      const nextIncluded = included.filter((a) => a.id !== id);
      const nextExcluded = excluded.filter((a) => a.id !== id);
      setIncluded(nextIncluded);
      setExcluded(nextExcluded);
      emitAmenitiesIfChanged(buildAmenitiesPayload(nextIncluded, nextExcluded));
    },
    [emitAmenitiesIfChanged, excluded, included],
  );

  const patchAmenity = useCallback(
    (id, patch) => {
      const apply = (arr) => arr.map((a) => (a.id === id ? { ...a, ...patch } : a));
      setIncluded((p) => apply(p));
      setExcluded((p) => apply(p));
    },
    [setIncluded, setExcluded],
  );

  const addAmenity = useCallback(() => {
    const id = newAmenityId();
    setFocusNewId(id);
    setEditingRemarkId(null);
    setActiveList((prev) => [
      ...prev,
      {
        id,
        name: '',
        remark: '',
        isDraft: true,
      },
    ]);
    setOpenDropdownId(id);
  }, [setActiveList]);

  // Clear focus flag once it has been used (after render)
  useEffect(() => {
    if (!focusNewId) return;
    const t = setTimeout(() => setFocusNewId(null), 0);
    return () => clearTimeout(t);
  }, [focusNewId]);

  return (
    <div
      className={cn('mt-2', className)}
      onBlur={(e) => {
        const { currentTarget, relatedTarget } = e;
        if (relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) return;
        if (openDropdownId) return;
        commit();
      }}
    >
      <Button.Root
        type='button'
        variant='neutral'
        mode='ghost'
        size='small'
        className='w-full !justify-between !px-0 py-2'
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className='flex items-center gap-2'>
          <RiLayoutGridLine className='text-text-sub-500' size={20} />
          <span className='label-medium text-text-sub-500'>Amenities</span>
        </div>
        {expanded ? (
          <RiArrowUpSLine className='size-5 text-text-sub-500' aria-hidden />
        ) : (
          <RiArrowDownSLine className='size-5 text-text-sub-500' aria-hidden />
        )}
      </Button.Root>

      {expanded ? (
        <div>
          <SegmentedControl.Root value={tab} onValueChange={setTab}>
            <SegmentedControl.List className='mb-3'>
              <SegmentedControl.Trigger value='included'>Included</SegmentedControl.Trigger>
              <SegmentedControl.Trigger value='excluded'>Excluded</SegmentedControl.Trigger>
            </SegmentedControl.List>

            <div className='overflow-hidden rounded-xl border border-stroke-soft-200'>
              <SegmentedControl.Content value='included'>
                <div>
                  {included.map((a) => (
                    <AmenityRow
                      key={a.id}
                      amenity={a}
                      side='included'
                      onMove={moveAmenity}
                      onDelete={deleteAmenity}
                      onChange={patchAmenity}
                      openDropdownId={openDropdownId}
                      setOpenDropdownId={setOpenDropdownId}
                      amenitiesOptions={amenitiesOptions}
                      usedAmenityNames={usedAmenityNames}
                      amenitySearchQuery={amenitySearchQuery}
                      setAmenitySearchQuery={setAmenitySearchQuery}
                      searchInputRef={searchInputRef}
                      editingRemarkId={editingRemarkId}
                      setEditingRemarkId={setEditingRemarkId}
                      focusNameOnMount={focusNewId === a.id}
                    />
                  ))}
                  <Button.Root
                    type='button'
                    onClick={addAmenity}
                    variant='neutral'
                    mode='ghost'
                    size='small'
                    className='w-full !justify-start gap-2 bg-bg-weak-100 px-4 py-3 text-paragraph-sm text-text-sub-600 hover:bg-bg-weak-50'
                  >
                    <span className='flex size-7 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-600'>
                      <RiAddLine className='size-4' aria-hidden />
                    </span>
                    <span className='text-text-sub-500'>Add New Amenity</span>
                  </Button.Root>
                </div>
              </SegmentedControl.Content>

              <SegmentedControl.Content value='excluded'>
                <div>
                  {excluded.map((a) => (
                    <AmenityRow
                      key={a.id}
                      amenity={a}
                      side='excluded'
                      onMove={moveAmenity}
                      onDelete={deleteAmenity}
                      onChange={patchAmenity}
                      openDropdownId={openDropdownId}
                      setOpenDropdownId={setOpenDropdownId}
                      amenitiesOptions={amenitiesOptions}
                      usedAmenityNames={usedAmenityNames}
                      amenitySearchQuery={amenitySearchQuery}
                      setAmenitySearchQuery={setAmenitySearchQuery}
                      searchInputRef={searchInputRef}
                      editingRemarkId={editingRemarkId}
                      setEditingRemarkId={setEditingRemarkId}
                      focusNameOnMount={focusNewId === a.id}
                    />
                  ))}
                  <Button.Root
                    type='button'
                    onClick={addAmenity}
                    variant='neutral'
                    mode='ghost'
                    size='small'
                    className='w-full !justify-start gap-2 bg-bg-weak-100 px-4 py-3 text-paragraph-sm text-text-sub-600 hover:bg-bg-weak-50'
                  >
                    <span className='flex size-7 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-600'>
                      <RiAddLine className='size-4' aria-hidden />
                    </span>
                    <span className='text-text-sub-500'>Add New Amenity</span>
                  </Button.Root>
                </div>
              </SegmentedControl.Content>
            </div>
          </SegmentedControl.Root>
        </div>
      ) : null}
    </div>
  );
}

export default AgreementViewAmenitiesSection;
