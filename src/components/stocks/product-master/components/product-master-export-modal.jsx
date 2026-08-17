import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiDownloadLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Label from '@/components/ui/label';
import * as Modal from '@/components/ui/modal';

/** Detail-view fields available for Product Master export (single Price). */
export const PRODUCT_MASTER_EXPORT_COLUMNS = [
  { id: 'product', columnLabel: 'Product' },
  { id: 'itemCode', columnLabel: 'Item Code' },
  { id: 'brand', columnLabel: 'Brand' },
  { id: 'vendors', columnLabel: 'Vendor' },
  { id: 'category', columnLabel: 'Category' },
  { id: 'hsnCode', columnLabel: 'HSN Code' },
  { id: 'type', columnLabel: 'Type' },
  { id: 'oemCompany', columnLabel: 'OEM / Company' },
  { id: 'price', columnLabel: 'Price' },
  { id: 'unit', columnLabel: 'Unit' },
  { id: 'notes', columnLabel: 'Notes' },
  { id: 'status', columnLabel: 'Status' },
  { id: 'createBy', columnLabel: 'Create By' },
  { id: 'createAt', columnLabel: 'Create At' },
  { id: 'lastModifiedAt', columnLabel: 'Last Modified At' },
];

const DEFAULT_SELECTED = PRODUCT_MASTER_EXPORT_COLUMNS.map((column) => column.id);

const ProductMasterExportModal = ({
  open,
  onOpenChange,
  onExport,
  isExporting = false,
  totalCount = 0,
}) => {
  const [selectedColumns, setSelectedColumns] = useState(DEFAULT_SELECTED);

  useEffect(() => {
    if (open) {
      setSelectedColumns(DEFAULT_SELECTED);
    }
  }, [open]);

  const allSelected = useMemo(
    () =>
      PRODUCT_MASTER_EXPORT_COLUMNS.length > 0 &&
      PRODUCT_MASTER_EXPORT_COLUMNS.every((column) => selectedColumns.includes(column.id)),
    [selectedColumns],
  );

  const toggleColumn = useCallback((columnId, checked) => {
    setSelectedColumns((previous) => {
      if (checked) {
        return previous.includes(columnId) ? previous : [...previous, columnId];
      }
      return previous.filter((id) => id !== columnId);
    });
  }, []);

  const handleToggleAll = useCallback((checked) => {
    setSelectedColumns(checked ? PRODUCT_MASTER_EXPORT_COLUMNS.map((column) => column.id) : []);
  }, []);

  const handleExport = useCallback(() => {
    // Keep export column order same as detail-view field order.
    const ordered = PRODUCT_MASTER_EXPORT_COLUMNS.map((column) => column.id).filter((id) =>
      selectedColumns.includes(id),
    );
    onExport?.({ columns: ordered });
  }, [onExport, selectedColumns]);

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[560px]'>
        <Modal.Header
          icon={RiDownloadLine}
          title='Export Product Master'
          description={
            totalCount > 0
              ? `Choose detail fields to include. Current filters will export up to ${totalCount} product(s). Price is exported as a single value.`
              : 'Choose detail fields to include. Current list filters will be applied. Price is exported as a single value.'
          }
        />

        <Modal.Body className='flex flex-col gap-4'>
          <div className='flex items-center justify-between gap-3'>
            <Label.Root className='text-label-sm font-medium text-text-main-900'>Fields</Label.Root>
            <button
              type='button'
              className='text-label-sm text-primary-base hover:underline'
              onClick={() => handleToggleAll(!allSelected)}
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>

          <div className='grid max-h-[320px] grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-stroke-soft-200 p-3 sm:grid-cols-2'>
            {PRODUCT_MASTER_EXPORT_COLUMNS.map((column) => {
              const checked = selectedColumns.includes(column.id);
              return (
                <label
                  key={column.id}
                  className='flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-bg-weak-50'
                >
                  <Checkbox.Root
                    checked={checked}
                    onCheckedChange={(next) => toggleColumn(column.id, next === true)}
                  />
                  <span className='text-paragraph-sm text-text-main-900'>{column.columnLabel}</span>
                </label>
              );
            })}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='small'
            className='w-full'
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button.Root>
          <Button.Root
            variant='primary'
            mode='filled'
            size='small'
            className='w-full'
            onClick={handleExport}
            disabled={isExporting || selectedColumns.length === 0}
          >
            {isExporting ? 'Exporting…' : 'Export Excel'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default ProductMasterExportModal;
