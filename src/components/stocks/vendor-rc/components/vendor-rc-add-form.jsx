import React, { useCallback, useRef } from 'react';
import {
  RiAddLine,
  RiCalendarLine,
  RiDeleteBin6Line,
  RiFileTextLine,
  RiInformationLine,
  RiListCheck2,
  RiStickyNoteLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';

import {
  formatVendorRcDateDisplay,
  vendorRcDateToIso,
  vendorRcIsoToDate,
} from '@/components/stocks/stocks-helper';
import * as Button from '@/components/ui/button';
import { Datepicker } from '@/components/ui/datepicker';
import { MultiSelect } from '@/components/ui/multi-select';
import StocksFormSearchableSelect from '@/components/stocks/shared/stocks-form-searchable-select';
import StocksSearchableCategorySelect from '@/components/stocks/shared/stocks-searchable-category-select';
import * as Textarea from '@/components/ui/textarea';

import VendorRcLineItemsTable from '@/components/stocks/vendor-rc/components/vendor-rc-line-items-table';

const FieldLabel = ({ children, required }) => (
  <span className='flex items-center gap-px text-label-sm font-medium text-text-main-900'>
    {children}
    {required ? <span className='text-text-soft-400'>*</span> : null}
  </span>
);

const VendorRcAddForm = ({
  vendor,
  onVendorChange,
  vendorOptions = [],
  vendorsLoading = false,
  category,
  onCategoryChange,
  categoryOptions = [],
  centers,
  onCentersChange,
  centerOptions = [],
  centersLoading = false,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  lineItems,
  onLineItemsChange,
  onAddLineItem,
  productOptions = [],
  isLoadingProducts = false,
  productsError = null,
  contractFiles,
  onContractFilesAppend,
  onContractFileRemove,
  notes,
  onNotesChange,
}) => {
  const fileInputRef = useRef(null);
  const lineItemsReady = Boolean(category && Array.isArray(centers) && centers.length > 0);
  const handlePickFile = useCallback(
    (fileList) => {
      const list = fileList?.length ? [...fileList] : [];
      if (list.length === 0) return;
      onContractFilesAppend(list);
    },
    [onContractFilesAppend],
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      handlePickFile(event.dataTransfer?.files);
    },
    [handlePickFile],
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  return (
    <div className='flex flex-col gap-5'>
      <section className='flex flex-col gap-3'>
        <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
          <RiInformationLine className='size-5 shrink-0 text-text-sub-600' />
          Basic Information
        </div>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div className='flex flex-col gap-1'>
            <FieldLabel required>Vendor</FieldLabel>
            <StocksFormSearchableSelect
              value={vendor}
              onValueChange={onVendorChange}
              options={vendorOptions}
              placeholder={vendorsLoading ? 'Loading vendors…' : 'Select'}
              disabled={vendorsLoading}
            />
          </div>
          <div className='flex flex-col gap-1'>
            <FieldLabel required>Category</FieldLabel>
            <StocksSearchableCategorySelect
              value={category}
              onValueChange={onCategoryChange}
              options={categoryOptions}
              size='medium'
              variant='default'
            />
          </div>
          <div className='flex flex-col gap-1'>
            <FieldLabel required>Center</FieldLabel>
            <MultiSelect
              options={centerOptions}
              value={Array.isArray(centers) ? centers : []}
              onValueChange={onCentersChange}
              placeholder={centersLoading ? 'Loading centers…' : 'Select'}
              size='medium'
              variant='default'
              disabled={centersLoading}
            />
          </div>
          <div className='grid grid-cols-1 gap-4 sm:col-span-1 sm:grid-cols-2'>
            <div className='flex flex-col gap-1'>
              <FieldLabel required>Start Date</FieldLabel>
              <Datepicker
                value={vendorRcIsoToDate(startDate)}
                onChange={(date) => onStartDateChange(vendorRcDateToIso(date))}
                placeholder='DD/MM/YY'
                size='medium'
                variant='default'
                prefixIcon={<RiCalendarLine className='size-4 text-text-soft-400' />}
                formatDate={(date) => formatVendorRcDateDisplay(vendorRcDateToIso(date))}
              />
            </div>
            <div className='flex flex-col gap-1'>
              <FieldLabel required>End Date</FieldLabel>
              <Datepicker
                value={vendorRcIsoToDate(endDate)}
                onChange={(date) => onEndDateChange(vendorRcDateToIso(date))}
                placeholder='DD/MM/YY'
                size='medium'
                variant='default'
                min={vendorRcIsoToDate(startDate)}
                prefixIcon={<RiCalendarLine className='size-4 text-text-soft-400' />}
                formatDate={(date) => formatVendorRcDateDisplay(vendorRcDateToIso(date))}
              />
            </div>
          </div>
        </div>
      </section>

      <section className='flex flex-col gap-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
            <RiListCheck2 className='size-5 shrink-0 text-text-sub-600' />
            Product Line Items
          </div>
          {lineItemsReady ? (
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='gap-2'
              onClick={onAddLineItem}
              disabled={isLoadingProducts}
            >
              <Button.Icon as={RiAddLine} className='!mx-0' />
              <span>Add</span>
            </Button.Root>
          ) : null}
        </div>
        {lineItemsReady ? (
          isLoadingProducts ? (
            <p className='text-label-sm text-text-soft-400'>Loading products…</p>
          ) : productsError ? (
            <p className='text-label-sm text-red-600'>{productsError}</p>
          ) : (
            <VendorRcLineItemsTable
              lineItems={lineItems}
              onChange={onLineItemsChange}
              productOptions={productOptions}
            />
          )
        ) : (
          <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
            <p className='text-label-md font-medium text-text-sub-500'>No products yet.</p>
            <p className='text-label-xs font-medium text-text-soft-400'>
              Choose a center and category to get started.
            </p>
          </div>
        )}
      </section>

      <section className='flex flex-col gap-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
            <RiFileTextLine className='size-5 shrink-0 text-text-sub-600' />
            Rate Contract
          </div>
          {contractFiles.length > 0 ? (
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='shrink-0'
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </Button.Root>
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type='file'
          accept='application/pdf,.pdf,image/*,.png,.jpg,.jpeg'
          multiple
          className='hidden'
          onChange={(event) => {
            handlePickFile(event.target.files);
            event.target.value = '';
          }}
        />
        {contractFiles.length > 0 ? (
          <ul className='flex flex-col gap-2'>
            {contractFiles.map((file) => (
              <li
                key={file.id}
                className='flex items-center gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5'
              >
                <RiFileTextLine className='size-5 shrink-0 text-text-sub-600' aria-hidden />
                <span
                  className='min-w-0 flex-1 truncate text-label-sm text-text-main-900'
                  title={file.name}
                >
                  {file.name}
                </span>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='ghost'
                  size='xsmall'
                  className='shrink-0 text-text-sub-600 hover:text-red-600'
                  onClick={() => onContractFileRemove(file.id)}
                  aria-label={`Remove ${file.name}`}
                >
                  <Button.Icon as={RiDeleteBin6Line} />
                </Button.Root>
              </li>
            ))}
          </ul>
        ) : null}
        <div
          role='presentation'
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={
            contractFiles.length > 0
              ? 'flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-stroke-sub-300 bg-bg-white-0 px-5 py-4'
              : 'flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-stroke-sub-300 bg-bg-white-0 px-5 py-5'
          }
        >
          {contractFiles.length === 0 ? (
            <>
              <RiUploadCloud2Line className='size-6 shrink-0 text-text-sub-600' />
              <div className='min-w-0 flex-1'>
                <p className='text-label-sm font-medium text-text-main-900'>
                  Choose a file or drag & drop.
                </p>
                <p className='mt-1 text-paragraph-xs text-text-soft-400'>
                  PDF / Signed contract up to 50 MB.
                </p>
              </div>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                className='shrink-0'
                onClick={() => fileInputRef.current?.click()}
              >
                Browse File
              </Button.Root>
            </>
          ) : (
            <p className='text-center text-paragraph-xs text-text-soft-400'>
              Drop more files here or use Upload above.
            </p>
          )}
        </div>
      </section>

      <section className='flex flex-col gap-2'>
        <div className='flex items-center gap-2 text-label-sm font-medium text-text-sub-500'>
          <RiStickyNoteLine className='size-5 shrink-0 text-text-sub-600' />
          Notes
        </div>
        <Textarea.Root
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder='Add notes'
          rows={3}
          containerClassName='min-h-[88px]'
        />
      </section>
    </div>
  );
};

export default VendorRcAddForm;
