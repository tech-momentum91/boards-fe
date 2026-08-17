import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiExpandUpDownFill,
  RiImageAddLine,
  RiRadioButtonLine,
} from 'react-icons/ri';
import {
  areErItemDimensionsEmpty,
  computeErItemQtyFromDimensions,
} from '@/components/boq/shared/boq-er-estimation-areas-utils';
import * as Checkbox from '@/components/ui/checkbox';
import * as Table from '@/components/ui/table';
import JmrCompletedBadge from '@/components/projects/billing-qc/jmr-completed-badge';
import JmrMarkAsCompletedRow from '@/components/projects/billing-qc/jmr-mark-as-completed-row';
import {
  PROJECT_DETAIL_BILLING_QC_JMR_COLUMN_WIDTHS,
  PROJECT_DETAIL_BILLING_QC_JMR_FULL_TABLE_MIN_WIDTH,
  PROJECT_DETAIL_BILLING_QC_MR_COLUMN_WIDTHS,
  PROJECT_DETAIL_BILLING_QC_MR_FULL_TABLE_MIN_WIDTH,
} from '@/components/projects/constants';
import { toAbsoluteAttachmentUrl } from '@/lib/utils';
import { cn } from '@/utils/cn';

function getTableMinWidth(viewMode) {
  return viewMode === 'mr'
    ? PROJECT_DETAIL_BILLING_QC_MR_FULL_TABLE_MIN_WIDTH
    : PROJECT_DETAIL_BILLING_QC_JMR_FULL_TABLE_MIN_WIDTH;
}

function getColumnWidthClass(columnId, viewMode) {
  if (viewMode === 'mr') {
    return (
      PROJECT_DETAIL_BILLING_QC_MR_COLUMN_WIDTHS[columnId] ??
      PROJECT_DETAIL_BILLING_QC_JMR_COLUMN_WIDTHS[columnId]
    );
  }
  return PROJECT_DETAIL_BILLING_QC_JMR_COLUMN_WIDTHS[columnId];
}

function formatMeasurementDisplay(value) {
  if (value === null || value === undefined || value === '') return '0';
  if (typeof value === 'string' && value.includes('₹')) return value;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return String(numeric);
  return String(value);
}

function formatQtyDisplay(value) {
  if (value === null || value === undefined || value === '') return '0';
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric.toLocaleString('en-IN');
  return String(value);
}

function isVendorMeasurementColumn(columnId) {
  return ['vendor_length', 'vendor_breadth', 'vendor_height'].includes(columnId);
}

function isAmountColumn(columnId) {
  return ['amount', 'vendor_amount', 'difference'].includes(columnId);
}

function isQtyColumn(columnId) {
  return ['qty', 'vendor_qty'].includes(columnId);
}

function isCenteredNumericColumn(columnId) {
  return isAmountColumn(columnId) || isQtyColumn(columnId);
}

function SortableHeader({ label, sortable = true }) {
  return (
    <div className='flex min-w-0 items-center gap-0.5'>
      <span className='truncate text-label-sm font-medium whitespace-nowrap text-text-soft-400'>
        {label}
      </span>
      {sortable ? (
        <RiExpandUpDownFill className='size-5 shrink-0 text-text-sub-600' aria-hidden />
      ) : null}
    </div>
  );
}

function buildMeasurementPatch(item, field, value) {
  const patch = { [field]: value };
  const draft = { ...item, ...patch };
  if (['length', 'breadth', 'height'].includes(field) && !areErItemDimensionsEmpty(draft)) {
    patch.qty = computeErItemQtyFromDimensions(draft.length, draft.breadth, draft.height);
  }
  return patch;
}

/** Matches vendor portal Work Order MR measure pill. */
function MeasurePill({ value, className }) {
  return (
    <div
      className={cn(
        'flex h-7 w-full max-w-[104px] items-center justify-center rounded-md bg-bg-weak-100 px-2',
        className,
      )}
    >
      <span className='truncate px-0.5 text-center text-label-sm text-text-soft-400'>{value}</span>
    </div>
  );
}

function VendorMeasurementCell({ value, viewMode = 'jmr' }) {
  const display = formatMeasurementDisplay(value);

  if (viewMode === 'mr') {
    return <MeasurePill value={display} />;
  }

  return (
    <div className='flex w-full items-center justify-center px-1 py-1.5'>
      <span className='text-paragraph-sm font-medium text-[#162664]'>{display}</span>
    </div>
  );
}

function AmountCell({ value, viewMode = 'jmr', variant = 'default' }) {
  const display = formatMeasurementDisplay(value);

  return (
    <span
      className={cn(
        'block w-full truncate whitespace-nowrap text-center tabular-nums',
        viewMode === 'mr' ? 'text-label-sm text-text-sub-500' : 'text-paragraph-sm',
        viewMode === 'jmr' && variant === 'vendor' && 'font-medium text-[#162664]',
        viewMode === 'jmr' && variant !== 'vendor' && 'text-text-sub-500',
      )}
      title={display}
    >
      {display}
    </span>
  );
}

function QtyCell({ value, viewMode = 'jmr', variant = 'default' }) {
  const display = formatQtyDisplay(value);

  if (viewMode === 'mr') {
    return <MeasurePill value={display} />;
  }

  return (
    <span
      className={cn(
        'block w-full whitespace-nowrap text-center text-paragraph-sm tabular-nums',
        variant === 'vendor' && 'font-medium text-[#162664]',
        variant !== 'vendor' && 'text-text-sub-500',
      )}
      title={display}
    >
      {display}
    </span>
  );
}

function GmrMeasureInput({ value, disabled, onCommit, ariaLabel }) {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  return (
    <div
      className={cn(
        'flex w-full items-center justify-center rounded-lg p-1.5',
        disabled ? 'bg-bg-weak-100' : 'bg-bg-white-0 ring-1 ring-stroke-soft-200',
      )}
    >
      <input
        type='text'
        inputMode='decimal'
        disabled={disabled}
        value={draft}
        aria-label={ariaLabel}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const next = Number(draft);
          const previous = Number(value);
          if (!Number.isFinite(next) || next === previous) {
            setDraft(value ?? '');
            return;
          }
          onCommit?.(next);
        }}
        className={cn(
          'w-full min-w-0 bg-transparent px-1 text-center text-paragraph-sm outline-none',
          disabled ? 'cursor-not-allowed text-text-soft-400' : 'text-text-sub-500',
        )}
      />
    </div>
  );
}

function JmrPhotoCell({ item, readOnly, onPhotoChange }) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const photos = useMemo(() => {
    if (Array.isArray(item?.photos) && item.photos.length > 0) {
      return item.photos.filter(Boolean);
    }
    const single = item?.photo || item?.photo_url || '';
    return single ? [single] : [];
  }, [item?.photo, item?.photo_url, item?.photos]);

  const handleSelect = async (event) => {
    const files = [...(event.target.files ?? [])].filter(Boolean);
    event.target.value = '';
    if (files.length === 0 || readOnly || isUploading) return;

    setIsUploading(true);
    try {
      await onPhotoChange?.(item, files);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className='flex max-w-full min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain'
      onWheel={(event) => {
        const node = event.currentTarget;
        if (node.scrollWidth <= node.clientWidth) return;
        // Prefer horizontal scroll inside the photo strip.
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
          event.stopPropagation();
          return;
        }
        if (event.deltaY !== 0) {
          node.scrollLeft += event.deltaY;
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        multiple
        className='hidden'
        onChange={handleSelect}
      />
      {photos.map((photoUrl) => (
        <div key={photoUrl} className='size-8 shrink-0 overflow-hidden rounded bg-bg-weak-100'>
          <img
            src={toAbsoluteAttachmentUrl(photoUrl) || photoUrl}
            alt=''
            className='size-full object-cover'
          />
        </div>
      ))}
      <button
        type='button'
        disabled={readOnly || isUploading}
        className='flex size-8 shrink-0 items-center justify-center rounded bg-[#e5e7eb] text-text-soft-400 disabled:cursor-not-allowed disabled:opacity-50'
        aria-label={isUploading ? 'Uploading photos' : 'Add photos'}
        onClick={() => {
          if (!readOnly && !isUploading) fileInputRef.current?.click();
        }}
      >
        <RiImageAddLine className='size-4' />
      </button>
    </div>
  );
}

function JmrSnagsCell({ item, onClick }) {
  const snagsCount = Number(item?.snags_count ?? 0);
  const hasSnags = snagsCount > 0;

  return (
    <button
      type='button'
      className='inline-flex items-center gap-1.5 transition-opacity hover:opacity-80'
      aria-label={hasSnags ? `${snagsCount} snags. Add snag` : 'Add snag'}
      onClick={onClick}
    >
      <Checkbox.Root
        size='small'
        checked={hasSnags}
        tabIndex={-1}
        aria-hidden
        className='pointer-events-none shrink-0'
      />
      {hasSnags ? <span className='text-paragraph-sm text-text-sub-500'>{snagsCount}</span> : null}
    </button>
  );
}

function TotalsChip({ label, value }) {
  return (
    <div className='inline-flex shrink-0 items-center gap-2.5 rounded border border-stroke-soft-200 bg-[#f6f8fa] px-2.5 py-1.5'>
      <span className='text-[9px] font-bold tracking-[0.72px] text-text-soft-400 uppercase'>
        {label}
      </span>
      <span className='text-label-xs font-medium text-text-soft-400'>{value}</span>
    </div>
  );
}

function GroupTotals({ mr, gmr, difference, isCompleted, viewMode = 'jmr' }) {
  const chips = (
    <>
      {viewMode === 'jmr' && isCompleted ? <JmrCompletedBadge /> : null}
      {viewMode === 'mr' ? (
        <TotalsChip label='Total' value={mr} />
      ) : (
        <>
          <TotalsChip label='MR' value={mr} />
          <TotalsChip label='GMR' value={gmr} />
          <TotalsChip label='difference' value={difference} />
        </>
      )}
    </>
  );

  // sticky right: stay on the visible right edge while the wide JMR table scrolls horizontally
  return (
    <div className='sticky right-0 z-10 ml-auto flex h-[30px] shrink-0 items-center gap-[7px] bg-bg-white-0 pl-3'>
      {chips}
    </div>
  );
}

function GroupRowButton({ label, badge, expanded, onToggle }) {
  return (
    <button type='button' className='flex items-center gap-1.5 text-left' onClick={onToggle}>
      <span className='inline-flex size-[18px] shrink-0 items-center justify-center'>
        <RiRadioButtonLine className='size-3 text-text-soft-400' />
      </span>
      <span className='text-label-sm font-semibold text-text-sub-500'>{label}</span>
      {badge ? (
        <span className='inline-flex shrink-0 items-center rounded-full border border-stroke-soft-200 bg-bg-white-0 px-2 py-0.5 text-[11px] font-medium tracking-[0.22px] text-text-sub-500 uppercase'>
          {badge}
        </span>
      ) : null}
      {expanded ? (
        <RiArrowUpSLine className='size-5 shrink-0 text-text-soft-400' />
      ) : (
        <RiArrowDownSLine className='size-5 shrink-0 text-text-soft-400' />
      )}
    </button>
  );
}

function AreaGroupRow({ area, expanded, onToggle, viewMode = 'jmr' }) {
  return (
    <div className='relative flex w-full items-center gap-1 border-t border-stroke-soft-200 bg-bg-white-0 py-1.5'>
      <GroupRowButton
        label={area.name}
        badge={area.floor_badge}
        expanded={expanded}
        onToggle={onToggle}
      />
      <GroupTotals
        mr={area.mr}
        gmr={area.gmr}
        difference={area.difference}
        isCompleted={area.isCompleted}
        viewMode={viewMode}
      />
    </div>
  );
}

function CategoryGroupRow({ category, expanded, onToggle, viewMode = 'jmr' }) {
  return (
    <div className='relative flex w-full items-center gap-1 border-t border-stroke-soft-200 bg-bg-white-0 py-1.5 pl-[26px]'>
      <GroupRowButton label={category.name} expanded={expanded} onToggle={onToggle} />
      {viewMode === 'jmr' ? (
        <GroupTotals
          mr={category.mr}
          gmr={category.gmr}
          difference={category.difference}
          isCompleted={category.isCompleted}
          viewMode={viewMode}
        />
      ) : null}
    </div>
  );
}

function getCellClass(columnId, rowIndex, viewMode = 'jmr') {
  const isAltRow = rowIndex % 2 === 1;
  const isMrMeasurement = ['length', 'breadth', 'height', 'qty', 'amount'].includes(columnId);
  const isVendorMeasurement = isVendorMeasurementColumn(columnId);
  const isPoRate = columnId === 'po_rate';
  const isLeadingColumn = ['subarea', 'po_item', 'uom'].includes(columnId);
  const isNeutralColumn = [
    'same_as_vendor',
    'difference',
    'description',
    'remarks',
    'photo',
    'snags',
  ].includes(columnId);

  if (isVendorMeasurement) {
    if (viewMode === 'mr') {
      return isAltRow ? 'bg-[#fbfbfb] text-text-sub-500' : 'bg-bg-white-0 text-text-sub-500';
    }
    return 'bg-[#ebf1ff] text-[#162664]';
  }

  if (columnId === 'vendor_amount' && viewMode === 'jmr') {
    return 'bg-[#ebf1ff] text-[#162664]';
  }

  if (columnId === 'vendor_qty' && viewMode === 'jmr') {
    return 'bg-[#ebf1ff] text-[#162664]';
  }

  if (isMrMeasurement) {
    return isAltRow ? 'bg-[#fbfbfb] text-text-sub-500' : 'bg-bg-white-0 text-text-sub-500';
  }

  if (isPoRate) {
    return isAltRow
      ? 'bg-[#fbfbfb] border-stroke-soft-200 text-text-sub-500'
      : 'bg-bg-white-0 border-stroke-soft-200 text-text-sub-500';
  }

  if (isLeadingColumn || isNeutralColumn) {
    return isAltRow ? 'bg-[#fbfbfb] text-text-sub-500' : 'bg-bg-white-0 text-text-sub-500';
  }

  return 'bg-bg-white-0 text-text-sub-500';
}

const COLUMN_DEFS = {
  subarea: {
    label: 'Subarea',
    sortable: false,
    render: (item) => (
      <span className='block min-w-0 truncate text-label-sm font-medium text-text-main-900'>
        {item.subarea}
      </span>
    ),
  },
  po_item: {
    label: 'PO Item',
    sortable: false,
    render: (item) => (
      <div className='flex min-w-0 items-center gap-2.5'>
        {item.item_image_url ? (
          <img src={item.item_image_url} alt='' className='size-7 shrink-0 rounded object-cover' />
        ) : (
          <div className='size-7 shrink-0 rounded bg-bg-weak-100' aria-hidden />
        )}
        <span className='block min-w-0 flex-1 truncate text-label-sm text-text-sub-500'>
          {item.po_item}
        </span>
      </div>
    ),
  },
  uom: {
    label: 'UOM',
    render: (item) => (
      <span className='block w-full min-w-0 truncate text-label-sm text-text-sub-500'>
        {item.uom || '—'}
      </span>
    ),
  },
  po_rate: {
    label: 'PO Rate',
    render: (item) => {
      const raw = item.po_rate;
      const display = typeof raw === 'string' && raw.includes('₹') ? raw : `₹ ${raw ?? 0}`;
      return (
        <span className='block truncate whitespace-nowrap text-label-sm text-text-sub-500'>
          {display}
        </span>
      );
    },
  },
  length: {
    label: 'Length',
    render: (item, { readOnly, onFieldCommit }) => (
      <GmrMeasureInput
        value={item.length}
        disabled={readOnly}
        ariaLabel='Length'
        onCommit={(next) => onFieldCommit?.(item, buildMeasurementPatch(item, 'length', next))}
      />
    ),
  },
  breadth: {
    label: 'Breadth',
    render: (item, { readOnly, onFieldCommit }) => (
      <GmrMeasureInput
        value={item.breadth}
        disabled={readOnly}
        ariaLabel='Breadth'
        onCommit={(next) => onFieldCommit?.(item, buildMeasurementPatch(item, 'breadth', next))}
      />
    ),
  },
  height: {
    label: 'Height',
    render: (item, { readOnly, onFieldCommit }) => (
      <GmrMeasureInput
        value={item.height}
        disabled={readOnly}
        ariaLabel='Height'
        onCommit={(next) => onFieldCommit?.(item, buildMeasurementPatch(item, 'height', next))}
      />
    ),
  },
  qty: {
    label: 'Qty.',
    render: (item, { readOnly, onFieldCommit, viewMode }) => {
      if (!areErItemDimensionsEmpty(item)) {
        const qtyValue = computeErItemQtyFromDimensions(item.length, item.breadth, item.height);
        return <QtyCell value={qtyValue} viewMode={viewMode} />;
      }

      if (readOnly) {
        return <QtyCell value={item.qty} viewMode={viewMode} />;
      }

      return (
        <GmrMeasureInput
          value={item.qty}
          disabled={readOnly}
          ariaLabel='Qty'
          onCommit={(next) => onFieldCommit?.(item, { qty: next })}
        />
      );
    },
  },
  amount: {
    label: 'Amount',
    render: (item, { viewMode }) => <AmountCell value={item.amount} viewMode={viewMode} />,
  },
  description: {
    label: 'Description',
    render: (item) => (
      <span className='block w-full min-w-0 truncate text-label-sm text-text-sub-500'>
        {item.description || '—'}
      </span>
    ),
  },
  same_as_vendor: {
    label: 'Same as Vendor',
    render: (item, { readOnly, onSameAsVendorChange }) => (
      <Checkbox.Root
        checked={Boolean(item.same_as_vendor)}
        disabled={readOnly}
        aria-label='Same as vendor'
        onCheckedChange={(checked) => onSameAsVendorChange?.(item, checked === true)}
      />
    ),
  },
  vendor_length: {
    label: 'Length',
    render: (item, { viewMode }) => (
      <VendorMeasurementCell value={item.vendor_length} viewMode={viewMode} />
    ),
  },
  vendor_breadth: {
    label: 'Breadth',
    render: (item, { viewMode }) => (
      <VendorMeasurementCell value={item.vendor_breadth} viewMode={viewMode} />
    ),
  },
  vendor_height: {
    label: 'Height',
    render: (item, { viewMode }) => (
      <VendorMeasurementCell value={item.vendor_height} viewMode={viewMode} />
    ),
  },
  vendor_qty: {
    label: 'Qty.',
    render: (item, { viewMode }) => (
      <QtyCell value={item.vendor_qty} viewMode={viewMode} variant='vendor' />
    ),
  },
  vendor_amount: {
    label: 'Amount',
    render: (item, { viewMode }) => (
      <AmountCell value={item.vendor_amount} viewMode={viewMode} variant='vendor' />
    ),
  },
  difference: {
    label: 'Difference',
    render: (item, { viewMode }) => <AmountCell value={item.difference} viewMode={viewMode} />,
  },
  remarks: {
    label: 'Remarks',
    sortable: false,
    render: (item, { viewMode }) =>
      viewMode === 'mr' ? (
        <MeasurePill value={item.remarks || '-'} className='max-w-[120px]' />
      ) : (
        <span className='block min-w-0 truncate text-label-sm text-text-sub-500'>
          {item.remarks || '-'}
        </span>
      ),
  },
  photo: {
    label: 'Photo',
    sortable: false,
    render: () => null,
  },
  snags: {
    label: 'Snags',
    sortable: false,
    render: () => null,
  },
};

function isMeasureColumn(columnId) {
  return [
    'length',
    'breadth',
    'height',
    'qty',
    'vendor_length',
    'vendor_breadth',
    'vendor_height',
    'vendor_qty',
    'remarks',
  ].includes(columnId);
}

function JmrCategoryTable({
  area,
  category,
  visibleColumns,
  viewMode = 'jmr',
  onSnagClick,
  onPhotoChange,
  onMarkCategoryComplete,
  onFieldCommit,
  onSameAsVendorChange,
}) {
  const readOnly = viewMode === 'mr' || Boolean(category.readOnly || category.gmrCertified);
  const tableMinWidth = getTableMinWidth(viewMode);
  const isMrView = viewMode === 'mr';

  return (
    <div className='w-full border-t border-stroke-soft-200'>
      <table
        className='w-full table-fixed border-collapse'
        style={{ minWidth: tableMinWidth, width: tableMinWidth }}
      >
        <Table.Header>
          <Table.Row className='h-9 bg-bg-weak-100 hover:bg-bg-weak-100'>
            {visibleColumns.map((column) => {
              const def = COLUMN_DEFS[column.id];
              if (!def) return null;
              return (
                <Table.Head
                  key={column.id}
                  className={cn(
                    'h-9 overflow-hidden border-r border-stroke-soft-200 px-3 py-0',
                    !isMrView && column.id === 'subarea' && 'pl-[50px]',
                    isMrView && isMeasureColumn(column.id) && 'px-2',
                    getColumnWidthClass(column.id, viewMode),
                    isVendorMeasurementColumn(column.id) && viewMode !== 'mr' && 'bg-[#ebf1ff]',
                    column.id === 'vendor_amount' && viewMode === 'jmr' && 'bg-[#ebf1ff]',
                    column.id === 'vendor_qty' && viewMode === 'jmr' && 'bg-[#ebf1ff]',
                    (isCenteredNumericColumn(column.id) ||
                      (isMrView && isMeasureColumn(column.id))) &&
                      'text-center',
                  )}
                >
                  <div
                    className={cn(
                      'flex min-w-0',
                      (isCenteredNumericColumn(column.id) ||
                        (isMrView && isMeasureColumn(column.id))) &&
                        'justify-center',
                    )}
                  >
                    <SortableHeader label={def.label} sortable={def.sortable !== false} />
                  </div>
                </Table.Head>
              );
            })}
          </Table.Row>
        </Table.Header>
        <Table.Body spacing={0}>
          {category.items?.map((item, rowIndex) => (
            <Table.Row
              key={item.id}
              className={cn(
                isMrView ? 'h-9' : 'h-10',
                rowIndex < (category.items?.length ?? 0) - 1 && 'border-b border-stroke-soft-200',
              )}
            >
              {visibleColumns.map((column) => {
                const def = COLUMN_DEFS[column.id];
                if (!def) return null;
                const itemReadOnly = readOnly || Boolean(item.read_only);

                return (
                  <Table.Cell
                    key={column.id}
                    className={cn(
                      'border-r border-stroke-soft-200',
                      column.id === 'photo' ? 'overflow-x-auto' : 'overflow-hidden',
                      isMrView ? 'h-9 px-3 py-0' : 'h-10 py-3',
                      !isMrView && (column.id === 'subarea' ? 'pl-[50px] pr-5' : 'px-3 pr-5'),
                      isMrView && isMeasureColumn(column.id) && 'px-2',
                      getColumnWidthClass(column.id, viewMode),
                      getCellClass(column.id, rowIndex, viewMode),
                      (isCenteredNumericColumn(column.id) ||
                        (isMrView && isMeasureColumn(column.id))) &&
                        'text-center',
                    )}
                  >
                    {column.id === 'snags' ? (
                      <JmrSnagsCell
                        item={item}
                        onClick={() => onSnagClick?.({ item, area, category })}
                      />
                    ) : column.id === 'photo' ? (
                      <JmrPhotoCell
                        item={item}
                        readOnly={itemReadOnly}
                        onPhotoChange={(targetItem, files) =>
                          onPhotoChange?.(targetItem, files, { area, category })
                        }
                      />
                    ) : (
                      def.render(item, {
                        readOnly: itemReadOnly,
                        viewMode,
                        onFieldCommit,
                        onSameAsVendorChange,
                      })
                    )}
                  </Table.Cell>
                );
              })}
            </Table.Row>
          ))}
        </Table.Body>
      </table>

      {!category.isCompleted && viewMode === 'jmr' ? (
        <JmrMarkAsCompletedRow onClick={() => onMarkCategoryComplete?.(category.id)} />
      ) : null}
    </div>
  );
}

export default function ProjectBillingQcJmrTable({
  areas = [],
  columnConfig = [],
  viewMode = 'jmr',
  onSnagClick,
  onPhotoChange,
  onMarkCategoryComplete,
  onMarkAreaComplete,
  onFieldCommit,
  onSameAsVendorChange,
  emptyStateMessage = 'No JMR records found.',
}) {
  const [expandedAreas, setExpandedAreas] = useState(() => new Set());
  const [expandedCategories, setExpandedCategories] = useState(() => new Set());

  const areaStructureKey = useMemo(
    () =>
      areas
        .map(
          (area) =>
            `${area.id}:${(area.categories ?? []).map((category) => category.id).join(',')}`,
        )
        .join('|'),
    [areas],
  );

  useEffect(() => {
    if (areas.length === 0) return;

    setExpandedAreas(new Set(areas.map((area) => area.id)));
    setExpandedCategories(
      new Set(areas.flatMap((area) => (area.categories ?? []).map((category) => category.id))),
    );
  }, [areaStructureKey, areas]);

  const visibleColumns = useMemo(
    () => columnConfig.filter((column) => column.visible),
    [columnConfig],
  );
  const tableMinWidth = getTableMinWidth(viewMode);

  const toggleArea = (areaId) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  if (areas.length === 0) {
    return (
      <div className='flex min-h-[200px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 px-6 py-10 text-center text-paragraph-sm text-text-sub-500'>
        {emptyStateMessage}
      </div>
    );
  }

  return (
    <div className='flex w-full min-w-max flex-col bg-bg-white-0'>
      {areas.map((area) => {
        const isAreaExpanded = expandedAreas.has(area.id);

        return (
          <div key={area.id} className='w-full' style={{ minWidth: tableMinWidth }}>
            <AreaGroupRow
              area={area}
              expanded={isAreaExpanded}
              onToggle={() => toggleArea(area.id)}
              viewMode={viewMode}
            />

            {isAreaExpanded ? (
              <>
                {area.categories?.map((category) => {
                  const isCategoryExpanded = expandedCategories.has(category.id);

                  return (
                    <div key={`${area.id}-${category.id}`} className='w-full'>
                      <CategoryGroupRow
                        category={category}
                        expanded={isCategoryExpanded}
                        onToggle={() => toggleCategory(category.id)}
                        viewMode={viewMode}
                      />

                      {isCategoryExpanded ? (
                        <JmrCategoryTable
                          area={area}
                          category={category}
                          visibleColumns={visibleColumns}
                          viewMode={viewMode}
                          onSnagClick={onSnagClick}
                          onPhotoChange={onPhotoChange}
                          onMarkCategoryComplete={onMarkCategoryComplete}
                          onFieldCommit={onFieldCommit}
                          onSameAsVendorChange={onSameAsVendorChange}
                        />
                      ) : null}
                    </div>
                  );
                })}

                {(area.categories?.length ?? 0) === 0 && !area.isCompleted && viewMode === 'jmr' ? (
                  <JmrMarkAsCompletedRow onClick={() => onMarkAreaComplete?.(area.id)} />
                ) : null}
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
