import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  RiAddCircleFill,
  RiDeleteBinLine,
  RiExpandUpDownFill,
  RiFileCopyLine,
} from 'react-icons/ri';

import erAreaArrowIcon from '@/assets/boq/er-area-arrow.svg';
import erAreaRadioIcon from '@/assets/boq/er-area-radio.svg';
import {
  BOQ_ER_EDITABLE_ITEM_FIELDS,
  BOQ_ER_DIMENSION_ITEM_FIELDS,
  BOQ_ER_TABLE_COLUMNS,
  BOQ_ER_TEXT_ITEM_FIELDS,
} from '@/components/boq/shared/boq-er-estimation-constants';
import {
  areErItemDimensionsEmpty,
  computeErItemQtyFromDimensions,
  hasIncompleteMeasurementLineItems,
} from '@/components/boq/shared/boq-er-estimation-areas-utils';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';

const TABLE_MIN_WIDTH = BOQ_ER_TABLE_COLUMNS.reduce((sum, column) => sum + column.width, 0);

const tableHeadClass =
  'h-9 border-r border-stroke-soft-200 bg-bg-weak-100 !px-0 !py-0 text-left text-[14px] font-medium leading-5 tracking-[-0.084px] text-text-soft-400 first:rounded-none last:rounded-none last:border-r-0';

const tableBodyCellClass =
  'border-r border-stroke-soft-200 !h-12 !min-h-12 !max-h-12 !px-0 !py-0 align-middle first:rounded-none last:rounded-none last:border-r-0 group-hover/row:bg-inherit';

const BoqErTableCellContent = ({ children, className, align = 'start', heightClass = 'h-12' }) => (
  <div
    className={cn(
      'flex w-full min-w-0 items-center',
      heightClass,
      align === 'end' ? 'justify-end' : 'justify-start',
      className,
    )}
  >
    {children}
  </div>
);

const BoqErTableCellInput = ({
  value,
  className,
  'aria-label': ariaLabel,
  onChange,
  disabled = false,
  inputType = 'number',
}) => (
  <div
    className={cn(
      'flex w-full items-center overflow-hidden rounded-lg bg-bg-weak-100 p-1.5',
      className,
    )}
  >
    <input
      type={inputType}
      {...(inputType === 'number' ? { min: '0', step: 'any' } : {})}
      value={value ?? ''}
      aria-label={ariaLabel}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.value)}
      onKeyDown={(event) => event.stopPropagation()}
      className='w-full min-w-0 border-0 bg-transparent px-1 py-0 text-left text-[14px] font-normal leading-5 tracking-[-0.084px] text-text-main-900 outline-none disabled:cursor-not-allowed disabled:opacity-60'
    />
  </div>
);

const buildEditableDraftFromItem = (item) => ({
  areaType: String(item.areaType ?? ''),
  length: String(item.length ?? ''),
  breadth: String(item.breadth ?? ''),
  height: String(item.height ?? ''),
  qty: String(item.qty ?? ''),
});

const buildPersistPayloadFromDraft = (item, draft) => {
  const parseNumeric = (value) => {
    const numericValue = Number.parseFloat(String(value ?? '').replaceAll(',', ''));
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  const length = parseNumeric(draft.length);
  const breadth = parseNumeric(draft.breadth);
  const height = parseNumeric(draft.height);
  const dimensionsEmpty =
    parseNumeric(draft.length) === 0 &&
    parseNumeric(draft.breadth) === 0 &&
    parseNumeric(draft.height) === 0;
  const qty = dimensionsEmpty
    ? parseNumeric(draft.qty)
    : computeErItemQtyFromDimensions(length, breadth, height);

  return {
    recordName: item.recordName,
    itemName: item.id,
    areaType: String(draft.areaType ?? ''),
    length,
    breadth,
    height,
    qty,
  };
};

const BoqErEditableItemRow = ({
  item,
  savingItemId = null,
  actingItemId = null,
  readOnly = false,
  onItemLinePersist,
  onDuplicateItem,
  onDeleteItem,
}) => {
  const rowRef = useRef(null);
  const draftRef = useRef(buildEditableDraftFromItem(item));
  const [draft, setDraft] = useState(() => buildEditableDraftFromItem(item));
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const nextDraft = buildEditableDraftFromItem(item);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setIsDirty(false);
  }, [item.areaType, item.breadth, item.height, item.id, item.length, item.qty]);

  const updateDraftField = useCallback(
    (field, value) => {
      if (readOnly) return;
      setDraft((current) => {
        const nextDraft = { ...current, [field]: value };
        draftRef.current = nextDraft;
        return nextDraft;
      });
      setIsDirty(true);
    },
    [readOnly],
  );

  const handleLineBlur = useCallback(
    (event) => {
      if (readOnly) return;
      const nextFocus = event.relatedTarget;
      if (nextFocus && rowRef.current?.contains(nextFocus)) return;
      if (!isDirty) return;

      setIsDirty(false);
      onItemLinePersist?.(buildPersistPayloadFromDraft(item, draftRef.current));
    },
    [isDirty, item, onItemLinePersist, readOnly],
  );

  const renderCellValue = (column) => {
    if (column.id === 'item') {
      return (
        <div className='flex min-w-0 items-center gap-3'>
          <BoqErItemThumbnail imageUrl={item.itemImageUrl} />
          <span className='min-w-0 truncate text-[14px] font-normal leading-5 tracking-[-0.084px] text-text-sub-500'>
            {item.item}
          </span>
        </div>
      );
    }

    if (column.id === 'uom') {
      return (
        <span className='whitespace-nowrap text-[14px] font-normal leading-5 tracking-[-0.084px] text-text-sub-500'>
          {item.uom}
        </span>
      );
    }

    if (column.id === 'qty') {
      if (!readOnly && areErItemDimensionsEmpty(draft)) {
        return (
          <BoqErTableCellInput
            value={draft.qty}
            aria-label={column.label}
            inputType='number'
            disabled={savingItemId === item.id}
            onChange={(nextValue) => updateDraftField('qty', nextValue)}
          />
        );
      }

      const qtyValue = areErItemDimensionsEmpty(draft)
        ? Number.parseFloat(String(draft.qty ?? '').replaceAll(',', ''))
        : computeErItemQtyFromDimensions(draft.length, draft.breadth, draft.height);
      return (
        <span className='whitespace-nowrap text-[14px] font-normal leading-5 tracking-[-0.084px] text-text-sub-500'>
          {Number.isFinite(qtyValue)
            ? qtyValue.toLocaleString('en-IN', { maximumFractionDigits: 4 })
            : '0'}
        </span>
      );
    }

    if (BOQ_ER_EDITABLE_ITEM_FIELDS.includes(column.id)) {
      if (readOnly) {
        const displayValue = draft[column.id];
        return (
          <span className='whitespace-nowrap text-[14px] font-normal leading-5 tracking-[-0.084px] text-text-sub-500'>
            {displayValue || '—'}
          </span>
        );
      }

      return (
        <BoqErTableCellInput
          value={draft[column.id]}
          aria-label={column.label}
          inputType={BOQ_ER_TEXT_ITEM_FIELDS.includes(column.id) ? 'text' : 'number'}
          disabled={savingItemId === item.id}
          onChange={(nextValue) => updateDraftField(column.id, nextValue)}
        />
      );
    }

    if (column.id === 'actions') {
      if (readOnly) return null;

      const isActing = actingItemId === item.id;
      return (
        <div className='flex items-center gap-2'>
          <button
            type='button'
            className='rounded-md p-0.5 text-text-soft-400 disabled:cursor-not-allowed disabled:opacity-50'
            aria-label='Copy row'
            disabled={isActing}
            onClick={() => onDuplicateItem?.(item)}
          >
            <RiFileCopyLine className='size-5' />
          </button>
          <button
            type='button'
            className='rounded-md p-0.5 text-text-soft-400 disabled:cursor-not-allowed disabled:opacity-50'
            aria-label='Delete row'
            disabled={isActing}
            onClick={() => onDeleteItem?.(item)}
          >
            <RiDeleteBinLine className='size-5' />
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <Table.Row
      ref={rowRef}
      className='border-t border-stroke-soft-200 bg-bg-white-0 hover:bg-transparent'
      onBlur={handleLineBlur}
    >
      {BOQ_ER_TABLE_COLUMNS.map((column) => (
        <Table.Cell
          key={column.id}
          className={cn(tableBodyCellClass, 'bg-bg-white-0')}
          style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
        >
          <BoqErTableCellContent
            className={column.cellClassName}
            align={column.id === 'actions' ? 'end' : 'start'}
          >
            {renderCellValue(column)}
          </BoqErTableCellContent>
        </Table.Cell>
      ))}
    </Table.Row>
  );
};

const BoqErItemThumbnail = ({ imageUrl }) =>
  imageUrl ? (
    <img src={imageUrl} alt='' className='size-8 shrink-0 rounded object-cover' />
  ) : (
    <div className='size-8 shrink-0 rounded bg-bg-weak-100' aria-hidden />
  );

const BoqErAddActionRow = ({ label, className, onClick, disabled = false }) => (
  <div className={cn('flex h-10 items-center bg-[#fbfbfb]', className)}>
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className='flex h-12 items-center gap-2 pl-[20px] pr-5 disabled:cursor-not-allowed disabled:opacity-50'
    >
      <RiAddCircleFill className='size-[18px] shrink-0 text-text-sub-500/70' aria-hidden />
      <span className='text-[12px] font-medium leading-5 tracking-[-0.072px] text-text-sub-500/70'>
        {label}
      </span>
    </button>
  </div>
);

const BoqErAreaHeader = ({ name, expanded, onToggle }) => (
  <button
    type='button'
    onClick={onToggle}
    className='flex h-10 w-full items-center gap-1 border-b border-t border-stroke-soft-200 py-1.5 text-left'
  >
    <div className='flex items-center gap-1.5'>
      <span className='flex size-[18px] shrink-0 items-center justify-center overflow-hidden p-[1.8px]'>
        <img src={erAreaRadioIcon} alt='' className='block size-3' aria-hidden />
      </span>
      <span
        className={cn(
          'truncate text-[14px] leading-5 tracking-normal',
          expanded ? 'font-semibold text-text-sub-500' : 'font-medium text-text-soft-400',
        )}
      >
        {name}
      </span>
    </div>
    <span
      className={cn(
        'relative size-5 shrink-0 overflow-hidden transition-transform',
        expanded && '-scale-y-100',
      )}
    >
      <img src={erAreaArrowIcon} alt='' className='block size-5' aria-hidden />
    </span>
  </button>
);

const BoqErAreaTable = ({
  items = [],
  readOnly = false,
  onItemLinePersist,
  onDuplicateItem,
  onDeleteItem,
  savingItemId = null,
  actingItemId = null,
}) => (
  <Table.Root className='w-full' style={{ minWidth: TABLE_MIN_WIDTH, tableLayout: 'fixed' }}>
    <colgroup>
      {BOQ_ER_TABLE_COLUMNS.map((column) => (
        <col key={column.id} style={{ width: column.width }} />
      ))}
    </colgroup>

    <Table.Header>
      <Table.Row className='hover:bg-transparent'>
        {BOQ_ER_TABLE_COLUMNS.map((column) => (
          <Table.Head
            key={column.id}
            className={tableHeadClass}
            style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
          >
            <BoqErTableCellContent className={column.headClassName} heightClass='h-9'>
              <div className='flex min-w-0 items-center gap-0.5 whitespace-nowrap'>
                <span>{column.label}</span>
                {column.sortable ? (
                  <RiExpandUpDownFill className='size-5 shrink-0 text-text-soft-400' aria-hidden />
                ) : null}
              </div>
            </BoqErTableCellContent>
          </Table.Head>
        ))}
      </Table.Row>
    </Table.Header>

    <Table.Body>
      {(Array.isArray(items) ? items : []).map((item) => (
        <BoqErEditableItemRow
          key={item.id}
          item={item}
          readOnly={readOnly}
          savingItemId={savingItemId}
          actingItemId={actingItemId}
          onItemLinePersist={onItemLinePersist}
          onDuplicateItem={onDuplicateItem}
          onDeleteItem={onDeleteItem}
        />
      ))}
    </Table.Body>
  </Table.Root>
);

const BoqErEstimationAreasPanel = ({
  areas = [],
  isLoading = false,
  isAddingItem = false,
  savingItemId = null,
  actingItemId = null,
  focusedAreaId = null,
  focusNonce = 0,
  readOnly = false,
  onAddItem,
  onItemLinePersist,
  onDuplicateItem,
  onDeleteItem,
}) => {
  const areaSectionRefs = useRef({});
  const [areaStates, setAreaStates] = useState(() =>
    areas.map((area) => ({ id: area.id, expanded: Boolean(area.expanded) })),
  );

  useEffect(() => {
    setAreaStates((current) => {
      const previousExpanded = new Map(current.map((state) => [state.id, state.expanded]));
      return areas.map((area) => ({
        id: area.id,
        expanded: previousExpanded.has(area.id)
          ? Boolean(previousExpanded.get(area.id))
          : Boolean(area.expanded),
      }));
    });
  }, [areas]);

  useEffect(() => {
    if (!focusedAreaId) return;

    setAreaStates((current) =>
      current.map((area) => ({
        ...area,
        expanded: area.id === focusedAreaId,
      })),
    );

    const frameId = window.requestAnimationFrame(() => {
      areaSectionRefs.current[focusedAreaId]?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'nearest',
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [focusedAreaId, focusNonce]);

  const handleToggle = useCallback((areaId) => {
    setAreaStates((current) =>
      current.map((area) => (area.id === areaId ? { ...area, expanded: !area.expanded } : area)),
    );
  }, []);

  return (
    <div className='flex w-full flex-col px-8 pb-8'>
      {isLoading ? (
        <div className='py-6 text-[14px] text-text-soft-400'>Loading areas...</div>
      ) : areas.length === 0 ? (
        <div className='py-6 text-[14px] text-text-soft-400'>
          No areas found for this floor. Add areas in the project Areas tab.
        </div>
      ) : null}

      {!isLoading && areas.length > 0
        ? areas.map((area) => {
            const expanded = areaStates.find((state) => state.id === area.id)?.expanded ?? false;

            return (
              <div
                key={area.id}
                ref={(node) => {
                  if (node) areaSectionRefs.current[area.id] = node;
                  else delete areaSectionRefs.current[area.id];
                }}
                className='w-full'
              >
                <BoqErAreaHeader
                  name={area.subareaName || area.name}
                  expanded={expanded}
                  onToggle={() => handleToggle(area.id)}
                />
                {expanded ? (
                  <div className='w-full overflow-x-auto'>
                    <BoqErAreaTable
                      items={area.items}
                      readOnly={readOnly}
                      savingItemId={savingItemId}
                      actingItemId={actingItemId}
                      onItemLinePersist={onItemLinePersist}
                      onDuplicateItem={onDuplicateItem}
                      onDeleteItem={onDeleteItem}
                    />
                    {!readOnly ? (
                      <BoqErAddActionRow
                        label='Add Item'
                        className='border-t border-stroke-soft-200'
                        disabled={
                          isLoading || isAddingItem || hasIncompleteMeasurementLineItems(area.items)
                        }
                        onClick={() => onAddItem?.(area)}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        : null}
    </div>
  );
};

export default memo(BoqErEstimationAreasPanel);
