import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { RiArrowDownSLine, RiArrowUpSLine, RiCloseLine } from 'react-icons/ri';

import { fetchProjectPaymentSheetDetail } from '@/api/projectPaymentSheets';
import { PROJECT_PROCUREMENT_PAYMENT_SHEET_PO_STATUS_BADGE_STYLES } from '@/components/procurements/constants';
import ProjectProcurementPaymentStatusBadge from '@/components/procurements/project-procurement-payment-status-badge';
import ProjectProcurementPaymentSheetDetailToolbar from '@/components/procurements/project-procurement-payment-sheet-detail-toolbar';
import ProjectProcurementPaymentTag from '@/components/procurements/project-procurement-payment-tag';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';
import { showErrorToast } from '@/utils/error-utils';

function VendorSummaryBadge({ label, value }) {
  return (
    <div className='rounded-[4px] border border-stroke-soft-200 bg-bg-weak-100 px-[7px] py-[5px]'>
      <div className='flex items-center gap-1 whitespace-nowrap leading-none'>
        <span className='text-[9px] font-bold uppercase tracking-[0.72px] text-text-soft-400'>
          {label}
        </span>
        <span className='text-[12px] font-normal text-text-sub-500'>{value}</span>
      </div>
    </div>
  );
}

function PoStatusBadge({ value }) {
  if (!value) return <span className='text-paragraph-sm text-text-soft-400'>—</span>;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2 py-[2px] text-[11px] font-medium uppercase leading-[12px] tracking-[0.22px]',
        PROJECT_PROCUREMENT_PAYMENT_SHEET_PO_STATUS_BADGE_STYLES[value] ??
          'bg-bg-weak-100 text-text-sub-500',
      )}
    >
      {value}
    </span>
  );
}

function SortableHead({ label, showCheckbox = false }) {
  return (
    <div className='flex items-center gap-2'>
      {showCheckbox ? <Checkbox.Root size='medium' aria-label='Select all' /> : null}
      <div className='flex items-center gap-0.5'>
        <span className='text-paragraph-sm whitespace-nowrap text-text-soft-400'>{label}</span>
        <span className='flex size-5 items-center justify-center text-text-soft-400' aria-hidden>
          {Table.getSortingIcon(false)}
        </span>
      </div>
    </div>
  );
}

function formatSheetSubtitle(sheet) {
  const parts = [
    sheet?.sheet_no,
    sheet?.master_sheet,
    sheet?.requested_budget != null ? formatProcurementAmount(sheet.requested_budget) : null,
    sheet?.expected_payment_date
      ? format(new Date(sheet.expected_payment_date), 'dd MMM yyyy')
      : null,
  ].filter(Boolean);

  return parts.join(' · ');
}

function filterVendorPos(vendor, { search, categoryFilter, statusFilter }) {
  const keyword = search.trim().toLowerCase();
  const pos = vendor.pos ?? [];

  return pos.filter((po) => {
    if (categoryFilter !== 'all' && po.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && po.status !== statusFilter) return false;
    if (!keyword) return true;

    const haystack = [po.po_no, po.package, po.category, vendor.vendor_name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(keyword);
  });
}

function mapDetailVendors(vendors) {
  if (!Array.isArray(vendors)) return [];
  return vendors.map((vendor, index) => ({
    ...vendor,
    id: vendor?.id ?? vendor?.vendor ?? vendor?.vendor_name ?? `vendor-${index}`,
    expanded: false,
  }));
}

export default function ProjectProcurementPaymentSheetDetailView({ sheet, onClose }) {
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendors, setVendors] = useState([]);
  const [header, setHeader] = useState(sheet ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const fetchRequestIdRef = useRef(0);
  const vendorTableScrollNodesRef = useRef(new Map());
  const vendorTableScrollLeftRef = useRef(0);
  const isSyncingVendorTableScrollRef = useRef(false);

  const bindVendorTableScrollRef = useCallback((vendorId) => {
    return (node) => {
      if (node) {
        vendorTableScrollNodesRef.current.set(vendorId, node);
        if (vendorTableScrollLeftRef.current) {
          node.scrollLeft = vendorTableScrollLeftRef.current;
        }
        return;
      }
      vendorTableScrollNodesRef.current.delete(vendorId);
    };
  }, []);

  const handleVendorTableScroll = useCallback((event) => {
    if (isSyncingVendorTableScrollRef.current) return;
    const source = event.currentTarget;
    const nextLeft = source.scrollLeft;
    if (nextLeft === vendorTableScrollLeftRef.current) return;

    isSyncingVendorTableScrollRef.current = true;
    vendorTableScrollLeftRef.current = nextLeft;
    for (const node of vendorTableScrollNodesRef.current.values()) {
      if (node !== source) node.scrollLeft = nextLeft;
    }
    requestAnimationFrame(() => {
      isSyncingVendorTableScrollRef.current = false;
    });
  }, []);

  const sheetKey = sheet?.name || sheet?.id;

  const loadDetail = useCallback(async (targetSheet) => {
    const name = targetSheet?.name || targetSheet?.id;
    setHeader(targetSheet ?? null);
    setVendors([]);

    if (!name) {
      setIsLoading(false);
      return;
    }

    const requestId = fetchRequestIdRef.current + 1;
    fetchRequestIdRef.current = requestId;
    setIsLoading(true);

    try {
      const detail = await fetchProjectPaymentSheetDetail(name);
      if (requestId !== fetchRequestIdRef.current) return;
      setHeader({ ...targetSheet, ...detail });
      setVendors(mapDetailVendors(detail?.vendors));
    } catch (error) {
      if (requestId !== fetchRequestIdRef.current) return;
      showErrorToast(error, { defaultMessage: 'Failed to load payment sheet details.' });
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setSearchValue('');
    setCategoryFilter('all');
    setStatusFilter('all');
    loadDetail(sheet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetKey]);

  const filteredVendors = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return vendors
      .map((vendor) => {
        const filteredPos = filterVendorPos(vendor, {
          search: searchValue,
          categoryFilter,
          statusFilter,
        });

        return { ...vendor, pos: filteredPos };
      })
      .filter((vendor) => {
        if (
          keyword &&
          !vendor.vendor_name.toLowerCase().includes(keyword) &&
          vendor.pos.length === 0
        ) {
          return false;
        }
        if (categoryFilter !== 'all' && vendor.pos.length === 0) return false;
        if (statusFilter !== 'all' && vendor.pos.length === 0) return false;
        return true;
      });
  }, [categoryFilter, searchValue, statusFilter, vendors]);

  const toggleVendorExpanded = (vendorId) => {
    setVendors((current) =>
      current.map((vendor) =>
        vendor.id === vendorId ? { ...vendor, expanded: !vendor.expanded } : vendor,
      ),
    );
  };

  if (!sheet) return null;

  const displaySheet = header ?? sheet;
  const showInitialLoading = isLoading && vendors.length === 0;
  const showEmptyState = !showInitialLoading && filteredVendors.length === 0;

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='shrink-0 px-8 pb-5 pt-5'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <div className='flex flex-wrap items-center gap-1.5'>
              <h2 className='text-[18px] font-medium leading-7 tracking-[-0.45px] text-text-main-900'>
                {displaySheet.sheet_name}
              </h2>
              <ProjectProcurementPaymentStatusBadge value={displaySheet.status} />
            </div>
            <p className='text-[12px] font-medium leading-4 text-[#737373]'>
              {formatSheetSubtitle(displaySheet)}
            </p>
          </div>

          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
            aria-label='Close payment sheet detail'
            onClick={onClose}
          >
            <Button.Icon as={RiCloseLine} />
          </Button.Root>
        </div>
      </div>

      <div className='shrink-0 border-b border-stroke-soft-200 px-8 pb-5'>
        <ProjectProcurementPaymentSheetDetailToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto border-t border-stroke-soft-200'>
        {showInitialLoading && (
          <div className='flex min-h-[240px] flex-col items-center justify-center text-center'>
            <p className='text-label-md text-text-strong-950'>Loading payment sheet details…</p>
          </div>
        )}

        {showEmptyState && (
          <div className='flex min-h-[240px] flex-col items-center justify-center text-center'>
            <p className='text-label-md text-text-strong-950'>No vendors found</p>
            <p className='mt-1 text-paragraph-sm text-text-sub-500'>
              Try adjusting your search or filters.
            </p>
          </div>
        )}

        {!showInitialLoading &&
          !showEmptyState &&
          filteredVendors.map((vendor) => (
            <div key={vendor.id} className='border-b border-[#e2e6e0]'>
              <button
                type='button'
                className='flex h-9 w-full items-center justify-between gap-3 bg-[rgba(226,228,233,0.2)] px-8'
                onClick={() => toggleVendorExpanded(vendor.id)}
              >
                <div className='flex min-w-0 items-center gap-2'>
                  <span className='truncate text-[12px] font-semibold uppercase tracking-[0.56px] text-text-sub-500'>
                    {vendor.vendor_name}
                  </span>
                  {vendor.expanded ? (
                    <RiArrowUpSLine className='size-5 shrink-0 text-text-sub-500' />
                  ) : (
                    <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-500' />
                  )}
                </div>
                <div className='flex shrink-0 items-center gap-1.5'>
                  <VendorSummaryBadge
                    label='PO Value'
                    value={formatProcurementAmount(vendor.po_value)}
                  />
                  <VendorSummaryBadge
                    label='Pending'
                    value={formatProcurementAmount(vendor.pending_amt)}
                  />
                  <VendorSummaryBadge
                    label='Requested'
                    value={formatProcurementAmount(vendor.requested_amt)}
                  />
                  <VendorSummaryBadge label='Allocated' value={String(vendor.allocated_amt ?? 0)} />
                </div>
              </button>

              {vendor.expanded && (vendor.pos?.length ?? 0) > 0 && (
                <div className='bg-white px-8 py-3'>
                  <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-white'>
                    <div
                      ref={bindVendorTableScrollRef(vendor.id)}
                      className='overflow-x-auto overscroll-x-contain'
                      onScroll={handleVendorTableScroll}
                    >
                      <Table.Root variant='compact' className='min-w-[1279px] overflow-x-visible'>
                        <Table.Header className='bg-bg-weak-100'>
                          <Table.Row>
                            <Table.Head className='min-w-[165px] whitespace-nowrap'>
                              <SortableHead label='PO No.' showCheckbox />
                            </Table.Head>
                            <Table.Head className='min-w-[129px] max-w-[180px]'>
                              <SortableHead label='Package' />
                            </Table.Head>
                            <Table.Head className='min-w-[129px] max-w-[180px]'>
                              <SortableHead label='Category' />
                            </Table.Head>
                            <Table.Head className='min-w-[110px]'>
                              <SortableHead label='PO Value' />
                            </Table.Head>
                            <Table.Head className='min-w-[113px]'>
                              <SortableHead label='Paid Amt.' />
                            </Table.Head>
                            <Table.Head className='min-w-[135px]'>
                              <SortableHead label='Pending Amt.' />
                            </Table.Head>
                            <Table.Head className='min-w-[158px]'>
                              <SortableHead label='Requested Amt.' />
                            </Table.Head>
                            <Table.Head className='min-w-[140px]'>
                              <SortableHead label='Allocated Amt.' />
                            </Table.Head>
                            <Table.Head className='min-w-[100px]'>
                              <SortableHead label='Status' />
                            </Table.Head>
                            <Table.Head className='min-w-[100px]'>
                              <SortableHead label='Remarks' />
                            </Table.Head>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body spacing={4}>
                          {vendor.pos.map((po, index) => (
                            <React.Fragment key={po.id}>
                              <Table.Row
                                className={cn('h-10', index % 2 === 1 && '[&>td]:bg-[#fbfbfb]')}
                              >
                                <Table.Cell className='whitespace-nowrap'>
                                  <div className='flex items-center gap-3'>
                                    <Checkbox.Root
                                      size='medium'
                                      aria-label={`Select ${po.po_no}`}
                                    />
                                    <span className='text-paragraph-sm font-medium text-text-main-900'>
                                      {po.po_no}
                                    </span>
                                  </div>
                                </Table.Cell>
                                <Table.Cell className='max-w-[180px]'>
                                  <span
                                    className='block truncate text-paragraph-sm text-text-sub-500'
                                    title={po.package || undefined}
                                  >
                                    {po.package}
                                  </span>
                                </Table.Cell>
                                <Table.Cell className='max-w-[180px]'>
                                  <ProjectProcurementPaymentTag value={po.category} />
                                </Table.Cell>
                                <Table.Cell>
                                  <span className='text-paragraph-sm text-text-sub-500'>
                                    {formatProcurementAmount(po.po_value)}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <span className='text-paragraph-sm text-[#067644]'>
                                    {formatProcurementAmount(po.paid_amt)}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <span className='text-paragraph-sm text-[#b47818]'>
                                    {formatProcurementAmount(po.pending_amt)}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <span className='text-paragraph-sm text-text-sub-500'>
                                    {formatProcurementAmount(po.requested_amt)}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <span className='text-paragraph-sm text-text-sub-500'>
                                    {po.allocated_amt ?? 0}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <PoStatusBadge value={po.status} />
                                </Table.Cell>
                                <Table.Cell>
                                  <span className='text-paragraph-sm text-text-sub-500'>
                                    {po.remarks || '—'}
                                  </span>
                                </Table.Cell>
                              </Table.Row>
                              <Table.RowDivider dividerClassName='bg-transparent' />
                            </React.Fragment>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
