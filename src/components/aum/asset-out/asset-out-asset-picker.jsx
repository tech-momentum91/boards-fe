import React, { useMemo, useState } from 'react';
import { RiDeleteBinLine, RiImageLine, RiSearchLine } from 'react-icons/ri';

import {
  filterAssetOutCatalog,
  getSelectedAssetIdSet,
  groupAssetsByProductType,
  groupLineItemsByProductType,
  summarizeAssetOutLineItems,
  toggleAllAssetsInLineItems,
  toggleAssetInLineItems,
} from '@/components/aum/asset-out/asset-out-line-items';
import { InlineFieldInput } from '@/components/stocks/stocks-helper';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Modal from '@/components/ui/modal';
import * as Table from '@/components/ui/table';
import { resolveFileUrl } from '@/lib/utils';
import { cn } from '@/utils/cn';

const TABLE_HEAD =
  'rounded-none first:rounded-none last:rounded-none !bg-bg-weak-100 !px-3 !py-2 h-9 align-middle font-medium text-text-soft-400';

const TABLE_CELL =
  'rounded-none first:rounded-none last:rounded-none !h-12 !max-h-12 !py-0 !pl-3 !pr-3 align-middle whitespace-nowrap';

const GROUP_HEAD_CELL =
  'rounded-none first:rounded-none last:rounded-none !h-9 !max-h-9 !py-0 !px-3 align-middle bg-bg-weak-50';

const COL = {
  product: 'min-w-[220px]',
  assetCode: 'min-w-[140px]',
  barcode: 'min-w-[180px]',
  value: 'min-w-[100px]',
  remarks: 'min-w-[120px]',
};

function AssetOutThumbnail({ image, className }) {
  const imageUrl = image ? resolveFileUrl(image) : '';

  return (
    <div
      className={cn(
        'relative size-8 shrink-0 overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-weak-100',
        className,
      )}
    >
      {imageUrl ? (
        <img src={imageUrl} alt='' className='size-full object-cover' />
      ) : (
        <RiImageLine className='absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-text-soft-400' />
      )}
    </div>
  );
}

function AssetOutNameCell({ product, image }) {
  return (
    <div className='flex min-w-0 items-center gap-2.5'>
      <AssetOutThumbnail image={image} />
      <span className='block truncate text-paragraph-sm font-medium text-text-strong-950'>
        {product || '—'}
      </span>
    </div>
  );
}

function ProductTypeGroupHeader({ productType, count, className }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-t border-stroke-soft-200 bg-bg-weak-50 px-2 py-2 first:border-t-0',
        className,
      )}
    >
      <span className='text-label-sm font-semibold text-text-sub-600'>{productType}</span>
      <span className='text-label-xs text-text-soft-400'>
        ({count} asset{count === 1 ? '' : 's'})
      </span>
    </div>
  );
}

function ReadOnlyAssetTable({ lineItems }) {
  const selectedLines = lineItems.filter(
    (row) => row.assetId && String(row.issued ?? '').trim() === '1',
  );
  const groupedLines = useMemo(() => groupLineItemsByProductType(selectedLines), [selectedLines]);

  if (selectedLines.length === 0) {
    return (
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
        No assets selected for this out entry.
      </div>
    );
  }

  return (
    <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
      <div className='overflow-x-auto'>
        <Table.Root variant='compact' className='w-full min-w-[900px] [&_table]:table-fixed'>
          <Table.Header>
            <Table.Row className='border-b border-stroke-soft-200 bg-bg-weak-100'>
              <Table.Head className={cn(TABLE_HEAD, COL.product)}>Name</Table.Head>
              <Table.Head className={cn(TABLE_HEAD, COL.assetCode)}>Asset code</Table.Head>
              <Table.Head className={cn(TABLE_HEAD, COL.barcode)}>Barcode</Table.Head>
              <Table.Head className={cn(TABLE_HEAD, COL.value)}>Value</Table.Head>
              <Table.Head className={cn(TABLE_HEAD, COL.remarks)}>Remarks</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {groupedLines.map((group) => (
              <React.Fragment key={group.productType}>
                <Table.Row className='border-b border-stroke-soft-200'>
                  <Table.Cell colSpan={5} className={GROUP_HEAD_CELL}>
                    <ProductTypeGroupHeader
                      productType={group.productType}
                      count={group.lines.length}
                      className='border-t-0 bg-transparent px-0 py-0'
                    />
                  </Table.Cell>
                </Table.Row>
                {group.lines.map((line) => (
                  <Table.Row
                    key={line.id}
                    className='border-b border-stroke-soft-200 last:border-b-0'
                  >
                    <Table.Cell className={cn(TABLE_CELL, COL.product)}>
                      <AssetOutNameCell product={line.product} image={line.image} />
                    </Table.Cell>
                    <Table.Cell className={cn(TABLE_CELL, COL.assetCode)}>
                      <span className='block truncate text-paragraph-sm text-text-sub-500'>
                        {line.assetCode || '—'}
                      </span>
                    </Table.Cell>
                    <Table.Cell className={cn(TABLE_CELL, COL.barcode)}>
                      <span
                        className='block truncate text-paragraph-sm text-text-sub-500'
                        title={line.barcode}
                      >
                        {line.barcode || '—'}
                      </span>
                    </Table.Cell>
                    <Table.Cell className={cn(TABLE_CELL, COL.value)}>
                      <span className='block truncate text-paragraph-sm text-text-sub-500'>
                        {line.unitValue || '—'}
                      </span>
                    </Table.Cell>
                    <Table.Cell className={cn(TABLE_CELL, COL.remarks)}>
                      <span className='block truncate text-paragraph-sm text-text-sub-500'>
                        {line.remarks || '—'}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </React.Fragment>
            ))}
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  );
}

function AssetCatalogModal({
  isOpen,
  onOpenChange,
  availableAssets,
  lineItems,
  onApply,
  isSaving = false,
}) {
  const [search, setSearch] = useState('');
  const [draftLineItems, setDraftLineItems] = useState(lineItems);

  React.useEffect(() => {
    if (isOpen) {
      setDraftLineItems(lineItems);
      setSearch('');
    }
  }, [isOpen, lineItems]);

  const filteredAssets = useMemo(
    () => filterAssetOutCatalog(availableAssets, { search }),
    [availableAssets, search],
  );
  const groupedAssets = useMemo(() => groupAssetsByProductType(filteredAssets), [filteredAssets]);

  const selectedIds = getSelectedAssetIdSet(draftLineItems);
  const allVisibleSelected =
    filteredAssets.length > 0 && filteredAssets.every((asset) => selectedIds.has(asset.assetId));

  const handleToggle = (asset, checked) => {
    setDraftLineItems((current) => toggleAssetInLineItems(current, asset, checked));
  };

  const handleToggleAll = (checked) => {
    setDraftLineItems((current) => toggleAllAssetsInLineItems(current, filteredAssets, checked));
  };

  const handleApply = () => {
    onApply?.(draftLineItems);
    onOpenChange(false);
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='flex max-h-[min(85vh,calc(100vh-32px))] max-w-[min(720px,calc(100vw-16px))] flex-col overflow-hidden p-0'>
        <Modal.Header className='border-b border-stroke-soft-200 px-6 py-4'>
          <Modal.Title className='text-label-lg font-medium text-text-main-900'>
            Select assets
          </Modal.Title>
          <Modal.Description className='text-label-sm text-text-sub-500'>
            Choose individual assets from this center, floor, and area.
          </Modal.Description>
        </Modal.Header>

        <div className='border-b border-stroke-soft-200 px-6 py-3'>
          <div className='flex items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2'>
            <RiSearchLine className='size-4 shrink-0 text-text-soft-400' />
            <input
              type='text'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search by name, product type, code, or barcode'
              className='min-w-0 flex-1 bg-transparent text-paragraph-sm text-text-strong-950 outline-none placeholder:text-text-soft-400'
            />
          </div>
        </div>

        <Modal.Body className='min-h-0 flex-1 overflow-y-auto px-6 py-4'>
          {availableAssets.length === 0 ? (
            <p className='py-8 text-center text-label-sm text-text-sub-500'>
              No assets available at this location.
            </p>
          ) : filteredAssets.length === 0 ? (
            <p className='py-8 text-center text-label-sm text-text-sub-500'>
              No assets match your search.
            </p>
          ) : (
            <div className='flex flex-col gap-2'>
              <label className='flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-bg-weak-50'>
                <Checkbox.Root
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => handleToggleAll(Boolean(checked))}
                />
                <span className='text-label-sm font-medium text-text-sub-600'>
                  Select all visible
                </span>
              </label>

              {groupedAssets.map((group) => (
                <div key={group.productType} className='flex flex-col gap-1'>
                  <ProductTypeGroupHeader
                    productType={group.productType}
                    count={group.assets.length}
                  />
                  {group.assets.map((asset) => {
                    const checked = selectedIds.has(asset.assetId);
                    return (
                      <label
                        key={asset.assetId}
                        className='flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-bg-weak-50'
                      >
                        <Checkbox.Root
                          checked={checked}
                          onCheckedChange={(value) => handleToggle(asset, Boolean(value))}
                          className='mt-1'
                        />
                        <AssetOutThumbnail image={asset.image} className='mt-0.5' />
                        <div className='min-w-0 flex-1'>
                          <p className='text-label-sm font-medium text-text-strong-950'>
                            {asset.product}
                          </p>
                          <p className='text-label-xs text-text-sub-500'>
                            {asset.assetCode}
                            {asset.barcode ? ` · ${asset.barcode}` : ''}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className='flex items-center justify-between gap-3 border-t border-stroke-soft-200 px-6 py-4'>
          <span className='text-label-sm text-text-sub-500'>
            {selectedIds.size} asset{selectedIds.size === 1 ? '' : 's'} selected
          </span>
          <div className='flex items-center gap-2'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              onClick={handleApply}
              disabled={isSaving || selectedIds.size === 0}
            >
              Add selected
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

export default function AssetOutAssetPicker({
  availableAssets = [],
  lineItems = [],
  locationLabel = '',
  isEditable = false,
  isSaving = false,
  onLineItemsChange,
}) {
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const summary = useMemo(() => summarizeAssetOutLineItems(lineItems), [lineItems]);

  const selectedLines = useMemo(
    () => lineItems.filter((row) => row.assetId && String(row.issued ?? '').trim() === '1'),
    [lineItems],
  );
  const groupedSelectedLines = useMemo(
    () => groupLineItemsByProductType(selectedLines),
    [selectedLines],
  );

  const handleRemarksChange = (lineId, remarks) => {
    onLineItemsChange?.(lineItems.map((row) => (row.id === lineId ? { ...row, remarks } : row)));
  };

  const handleRemoveLine = (lineId) => {
    onLineItemsChange?.(lineItems.filter((row) => row.id !== lineId));
  };

  const handleApplyCatalog = (nextLineItems) => {
    onLineItemsChange?.(nextLineItems);
  };

  if (!isEditable) {
    return <ReadOnlyAssetTable lineItems={lineItems} />;
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-label-sm text-text-sub-500'>
          {locationLabel ? `Assets at ${locationLabel}` : 'Select assets from this location'}
        </p>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          onClick={() => setIsCatalogOpen(true)}
          disabled={availableAssets.length === 0 || isSaving}
        >
          Add
        </Button.Root>
      </div>

      {availableAssets.length === 0 ? (
        <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
          No assets available at this location.
        </div>
      ) : selectedLines.length === 0 ? (
        <div className='rounded-xl border border-stroke-soft-200 bg-bg-weak-100 px-4 py-10 text-center'>
          <p className='text-label-md font-medium text-text-sub-500'>No assets added yet.</p>
          <p className='mt-1 text-label-xs font-medium text-text-soft-400'>
            Click Add to pick individual assets from this center, floor, and area.
          </p>
        </div>
      ) : (
        <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
          <div className='overflow-x-auto'>
            <Table.Root variant='compact' className='w-full min-w-[900px] [&_table]:table-fixed'>
              <Table.Header>
                <Table.Row className='border-b border-stroke-soft-200 bg-bg-weak-100'>
                  <Table.Head className={cn(TABLE_HEAD, COL.product)}>Name</Table.Head>
                  <Table.Head className={cn(TABLE_HEAD, COL.assetCode)}>Asset code</Table.Head>
                  <Table.Head className={cn(TABLE_HEAD, COL.barcode)}>Barcode</Table.Head>
                  <Table.Head className={cn(TABLE_HEAD, COL.value)}>Value</Table.Head>
                  <Table.Head className={cn(TABLE_HEAD, COL.remarks)}>Remarks</Table.Head>
                  <Table.Head className={cn(TABLE_HEAD, 'w-10')} aria-label='Remove' />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {groupedSelectedLines.map((group) => (
                  <React.Fragment key={group.productType}>
                    <Table.Row className='border-b border-stroke-soft-200'>
                      <Table.Cell colSpan={6} className={GROUP_HEAD_CELL}>
                        <ProductTypeGroupHeader
                          productType={group.productType}
                          count={group.lines.length}
                          className='border-t-0 bg-transparent px-0 py-0'
                        />
                      </Table.Cell>
                    </Table.Row>
                    {group.lines.map((line) => (
                      <Table.Row
                        key={line.id}
                        className='border-b border-stroke-soft-200 last:border-b-0'
                      >
                        <Table.Cell className={cn(TABLE_CELL, COL.product)}>
                          <AssetOutNameCell product={line.product} image={line.image} />
                        </Table.Cell>
                        <Table.Cell className={cn(TABLE_CELL, COL.assetCode)}>
                          <span className='block truncate text-paragraph-sm text-text-sub-500'>
                            {line.assetCode || '—'}
                          </span>
                        </Table.Cell>
                        <Table.Cell className={cn(TABLE_CELL, COL.barcode)}>
                          <span
                            className='block truncate text-paragraph-sm text-text-sub-500'
                            title={line.barcode}
                          >
                            {line.barcode || '—'}
                          </span>
                        </Table.Cell>
                        <Table.Cell className={cn(TABLE_CELL, COL.value)}>
                          <span className='block truncate text-paragraph-sm text-text-sub-500'>
                            {line.unitValue || '—'}
                          </span>
                        </Table.Cell>
                        <Table.Cell className={cn(TABLE_CELL, COL.remarks)}>
                          <InlineFieldInput
                            value={line.remarks}
                            onChange={(event) => handleRemarksChange(line.id, event.target.value)}
                            placeholder='—'
                          />
                        </Table.Cell>
                        <Table.Cell className={cn(TABLE_CELL, 'w-10')}>
                          <Button.Root
                            type='button'
                            variant='neutral'
                            mode='ghost'
                            size='xsmall'
                            className='size-8 p-0 text-text-sub-600 hover:text-error-base'
                            aria-label='Remove line item'
                            onClick={() => handleRemoveLine(line.id)}
                            disabled={isSaving}
                          >
                            <Button.Icon as={RiDeleteBinLine} />
                          </Button.Root>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </React.Fragment>
                ))}
              </Table.Body>
            </Table.Root>
          </div>

          <div className='flex border-t border-stroke-soft-200 bg-bg-weak-50'>
            <div className='flex flex-1 items-center justify-center gap-1 border-r border-stroke-soft-200 py-2.5'>
              <span className='text-label-xs font-medium uppercase tracking-wide text-text-sub-600'>
                Assets
              </span>
              <span className='text-label-md font-medium text-text-main-900'>
                {summary.assetCount}
              </span>
            </div>
            <div className='flex flex-1 items-center justify-center gap-1 py-2.5'>
              <span className='text-label-xs font-medium uppercase tracking-wide text-text-sub-600'>
                Out qty
              </span>
              <span className='text-label-md font-medium text-text-main-900'>
                {summary.issuedLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      <AssetCatalogModal
        isOpen={isCatalogOpen}
        onOpenChange={setIsCatalogOpen}
        availableAssets={availableAssets}
        lineItems={lineItems}
        onApply={handleApplyCatalog}
        isSaving={isSaving}
      />
    </div>
  );
}
