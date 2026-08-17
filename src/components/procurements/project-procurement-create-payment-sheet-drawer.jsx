import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiBox3Line,
  RiExpandUpDownLine,
  RiSearchLine,
} from 'react-icons/ri';

import {
  createProjectPaymentSheet,
  fetchCreatePaymentSheetData,
  fetchMasterPaymentSheetOptions,
  fetchProjectPaymentSheetDetail,
  updateProjectPaymentSheet,
} from '@/api/projectPaymentSheets';
import ProjectProcurementPaymentTag from '@/components/procurements/project-procurement-payment-tag';
import {
  buildCreateProjectPaymentSheetPayload,
  formatProcurementAmount,
  normalizeCreatePaymentSheetVendors,
} from '@/components/procurements/project-procurements-utils';
import * as Button from '@/components/ui/button';
import { Datepicker } from '@/components/ui/datepicker';
import * as Drawer from '@/components/ui/drawer';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const filterTriggerClassName =
  'h-8 min-h-8 gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 pl-2 pr-1.5 font-normal text-text-main-900 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] ring-0 hover:bg-bg-weak-50 hover:ring-0 before:!content-none focus:shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] data-[state=open]:before:ring-0';

function formatOrdinalDate(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'do MMM yyyy');
}

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

function FooterStatBadge({ label, value }) {
  return (
    <div className='rounded-[4px] bg-[#f6f8fa] p-[5px]'>
      <div className='flex items-center gap-1.5 whitespace-nowrap'>
        <span className='text-[12px] font-bold uppercase tracking-[0.72px] text-[#868c98]'>
          {label}
        </span>
        <span className='text-[14px] font-normal text-text-sub-500'>{value}</span>
      </div>
    </div>
  );
}

function RequestedPaymentInputCell({ amountValue, percentValue, onAmountChange, onPercentChange }) {
  return (
    <div className='flex items-center'>
      <div className='flex h-8 w-[134px] items-center gap-1.5 rounded-l-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
        <input
          type='text'
          value={amountValue}
          onChange={(event) => onAmountChange?.(event.target.value)}
          placeholder='Amount'
          className='min-w-0 flex-1 bg-transparent text-paragraph-sm text-text-main-900 outline-none placeholder:text-text-soft-400'
        />
        <span className='shrink-0 text-[12px] font-medium uppercase tracking-[0.48px] text-text-soft-400'>
          ₹
        </span>
      </div>
      <div className='-ml-px flex h-8 w-[65px] items-center gap-1.5 rounded-r-lg border border-stroke-soft-200 bg-[rgba(246,248,250,0.4)] px-2 py-1.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
        <input
          type='text'
          value={percentValue}
          onChange={(event) => onPercentChange?.(event.target.value)}
          placeholder='0'
          className='min-w-0 flex-1 bg-transparent text-paragraph-sm text-text-main-900 outline-none placeholder:text-text-soft-400'
        />
        <span className='shrink-0 text-[12px] font-medium uppercase tracking-[0.48px] text-text-soft-400'>
          %
        </span>
      </div>
    </div>
  );
}

function parseNumericInput(raw) {
  const value = String(raw ?? '')
    .trim()
    .replaceAll(',', '');
  if (!value) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/** Cap percent input at 100; keep empty / in-progress strings as-is. */
function clampPercentInput(value) {
  if (value === '' || value == null) return '';
  const num = parseNumericInput(value);
  if (num == null) return value;
  if (num > 100) return '100';
  if (num < 0) return '0';
  return value;
}

function formatSyncedAmount(value) {
  if (!Number.isFinite(value)) return '';
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

function formatSyncedPercent(value) {
  if (!Number.isFinite(value)) return '';
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

function SortableHead({ label }) {
  return (
    <div className='flex items-center gap-0.5'>
      <span className='text-paragraph-sm whitespace-nowrap text-text-soft-400'>{label}</span>
      <span className='flex size-5 items-center justify-center text-text-soft-400' aria-hidden>
        {Table.getSortingIcon(false)}
      </span>
    </div>
  );
}

function buildSavedAmountMaps(detail) {
  const amounts = {};
  const percents = {};
  const vendorIdsWithAmounts = new Set();

  for (const vendor of detail?.vendors || []) {
    for (const po of vendor.pos || []) {
      const key = po.purchase_order || po.po_no || po.id;
      if (!key) continue;
      const requested = Number(po.requested_amt);
      if (Number.isFinite(requested) && requested > 0) {
        amounts[key] = String(requested);
        vendorIdsWithAmounts.add(vendor.id || vendor.vendor);
      }
      const pct = Number(po.requested_pct);
      if (Number.isFinite(pct) && pct > 0) {
        percents[key] = String(pct);
      }
    }
  }

  return { amounts, percents, vendorIdsWithAmounts };
}

export default function ProjectProcurementCreatePaymentSheetDrawer({
  open,
  onOpenChange,
  projectId,
  onCreated,
  editingSheet = null,
}) {
  const isEditing = Boolean(editingSheet?.name || editingSheet?.id);
  const editingSheetName = editingSheet?.name || editingSheet?.id || '';

  const [sheetName, setSheetName] = useState('');
  const [masterSheet, setMasterSheet] = useState('');
  const [expectedDate, setExpectedDate] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vendors, setVendors] = useState([]);
  const [masterSheetOptions, setMasterSheetOptions] = useState([]);
  const [poAmounts, setPoAmounts] = useState({});
  const [poPercents, setPoPercents] = useState({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  useEffect(() => {
    if (!open || !projectId) return undefined;

    let cancelled = false;
    setIsLoadingData(true);

    Promise.all([
      fetchCreatePaymentSheetData({ project: projectId }),
      fetchMasterPaymentSheetOptions(),
      isEditing && editingSheetName
        ? fetchProjectPaymentSheetDetail(editingSheetName)
        : Promise.resolve(null),
    ])
      .then(([vendorsData, masterOptions, detail]) => {
        if (cancelled) return;
        let normalized = normalizeCreatePaymentSheetVendors(vendorsData);
        const nextAmounts = {};
        const nextPercents = {};

        if (detail) {
          setSheetName(detail.sheet_name || '');
          setMasterSheet(detail.master_sheet || '');
          setRemarks(detail.remarks || '');
          const dateValue = detail.expected_payment_date
            ? new Date(detail.expected_payment_date)
            : null;
          setExpectedDate(dateValue && !Number.isNaN(dateValue.getTime()) ? dateValue : null);

          const saved = buildSavedAmountMaps(detail);
          Object.assign(nextAmounts, saved.amounts);
          Object.assign(nextPercents, saved.percents);
          normalized = normalized.map((vendor) => ({
            ...vendor,
            expanded: saved.vendorIdsWithAmounts.has(vendor.id || vendor.vendor),
          }));
        } else {
          for (const vendor of normalized) {
            for (const po of vendor.pos || []) {
              const key = po.id || po.purchase_order || po.po_no;
              if (po.suggested_payment != null && po.suggested_payment !== '') {
                nextAmounts[key] = String(po.suggested_payment);
              }
              if (po.due_terms_pct != null && po.due_terms_pct !== '') {
                nextPercents[key] = String(po.due_terms_pct);
              }
            }
          }
        }

        setVendors(normalized);
        setPoAmounts(nextAmounts);
        setPoPercents(nextPercents);
        setMasterSheetOptions(
          (Array.isArray(masterOptions) ? masterOptions : []).map((option) => ({
            value: option.value,
            label: option.label,
          })),
        );
      })
      .catch((error) => {
        if (cancelled) return;
        showErrorToast(error, { defaultMessage: 'Failed to load payment sheet data.' });
      })
      .finally(() => {
        if (!cancelled) setIsLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editingSheetName, isEditing, open, projectId]);

  const vendorOptions = useMemo(
    () => [
      { value: 'all', label: 'All Vendor' },
      ...vendors.map((vendor) => ({
        value: vendor.id,
        label: vendor.vendor_name,
      })),
    ],
    [vendors],
  );

  const categoryOptions = useMemo(() => {
    const categories = new Set();
    vendors.forEach((vendor) => {
      vendor.pos?.forEach((po) => {
        if (po.category) categories.add(po.category);
      });
    });
    return [
      { value: 'all', label: 'All Category' },
      ...[...categories].sort().map((category) => ({ value: category, label: category })),
    ];
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    return vendors.filter((vendor) => {
      if (vendorFilter !== 'all' && vendor.id !== vendorFilter) return false;
      if (keyword && !vendor.vendor_name.toLowerCase().includes(keyword)) return false;
      if (categoryFilter !== 'all') {
        const hasCategory = vendor.pos?.some((po) => po.category === categoryFilter);
        if (!hasCategory && (vendor.pos?.length ?? 0) > 0) return false;
      }
      return true;
    });
  }, [categoryFilter, searchValue, vendorFilter, vendors]);

  const footerStats = useMemo(() => {
    let poCount = 0;
    let totalPlanned = 0;
    const vendorIdsWithAmount = new Set();

    Object.entries(poAmounts).forEach(([poId, raw]) => {
      const value = String(raw ?? '').trim();
      if (!value) return;
      poCount += 1;
      const numeric = Number(value.replaceAll(',', ''));
      if (Number.isFinite(numeric)) totalPlanned += numeric;

      const owner = vendors.find((vendor) => vendor.pos?.some((po) => po.id === poId));
      if (owner) vendorIdsWithAmount.add(owner.id);
    });

    return {
      vendors: vendorIdsWithAmount.size,
      pos: poCount,
      totalPlanned: totalPlanned > 0 ? formatProcurementAmount(totalPlanned) : '0',
    };
  }, [poAmounts, vendors]);

  const selectedPoCount = useMemo(
    () => Object.values(poAmounts).filter((value) => String(value ?? '').trim()).length,
    [poAmounts],
  );

  const toggleVendorExpanded = (vendorId) => {
    setVendors((current) =>
      current.map((vendor) =>
        vendor.id === vendorId ? { ...vendor, expanded: !vendor.expanded } : vendor,
      ),
    );
  };

  const handlePoAmountChange = (poId, value, poValue = 0) => {
    const base = Number(poValue) || 0;
    let amountValue = value;
    let amount = parseNumericInput(value);
    if (amount != null && base > 0 && amount > base) {
      amount = base;
      amountValue = formatSyncedAmount(base);
    }
    setPoAmounts((current) => ({ ...current, [poId]: amountValue }));

    if (amount == null || base <= 0) {
      setPoPercents((current) => ({ ...current, [poId]: '' }));
      return;
    }
    setPoPercents((current) => ({
      ...current,
      [poId]: formatSyncedPercent(Math.min(100, (amount / base) * 100)),
    }));
  };

  const handlePoPercentChange = (poId, value, poValue = 0) => {
    const clamped = clampPercentInput(value);
    setPoPercents((current) => ({ ...current, [poId]: clamped }));

    const percent = parseNumericInput(clamped);
    const base = Number(poValue) || 0;
    if (percent == null || base <= 0) {
      setPoAmounts((current) => ({ ...current, [poId]: '' }));
      return;
    }
    setPoAmounts((current) => ({
      ...current,
      [poId]: formatSyncedAmount((percent / 100) * base),
    }));
  };

  const resetForm = () => {
    setSheetName('');
    setMasterSheet('');
    setExpectedDate(null);
    setRemarks('');
    setSearchValue('');
    setVendorFilter('all');
    setCategoryFilter('all');
    setPoAmounts({});
    setPoPercents({});
    setVendors([]);
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) resetForm();
    onOpenChange?.(nextOpen);
  };

  const handleSubmit = async (status) => {
    const trimmedName = sheetName.trim();
    if (!trimmedName) {
      showErrorToast(null, { defaultMessage: 'Project Payment Sheet Name is required.' });
      return;
    }

    const payload = buildCreateProjectPaymentSheetPayload({
      sheetName: trimmedName,
      projectId,
      masterSheet,
      expectedPaymentDate: expectedDate ? format(expectedDate, 'yyyy-MM-dd') : null,
      remarks,
      status,
      vendors,
      poAmounts,
      poPercents,
    });

    if (!payload.items || payload.items.length === 0) {
      showErrorToast(null, { defaultMessage: 'Add at least one requested payment amount.' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingSheetName) {
        await updateProjectPaymentSheet(editingSheetName, payload);
        showSuccessToast(
          status === 'Draft'
            ? 'Payment sheet draft updated.'
            : 'Payment sheet submitted for approval.',
        );
      } else {
        await createProjectPaymentSheet(payload);
        showSuccessToast(
          status === 'Draft'
            ? 'Payment sheet saved as draft.'
            : 'Payment sheet submitted for approval.',
        );
      }
      onCreated?.();
      handleOpenChange(false);
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: isEditing
          ? 'Failed to update payment sheet.'
          : 'Failed to create payment sheet.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Content
        title={isEditing ? 'Edit Payment Sheet' : 'Create Payment Sheet'}
        className='relative flex h-full max-w-[947px] flex-col overflow-hidden'
      >
        <Drawer.Header className='relative shrink-0 bg-bg-white-0'>
          <div className='flex w-full items-center gap-4 px-8 py-5 pr-14'>
            <div className='flex size-11 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0'>
              <RiBox3Line className='size-6 text-text-sub-500' />
            </div>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
              <Drawer.Title className='text-label-lg text-text-main-900'>
                {isEditing ? 'Edit Payment Sheet' : 'Create Payment Sheet'}
              </Drawer.Title>
              <p className='text-paragraph-sm text-text-sub-500'>
                {selectedPoCount} Items selected
              </p>
            </div>
          </div>
        </Drawer.Header>

        <Drawer.Body className='min-h-0 flex-1 overflow-hidden'>
          <div className='flex h-full min-h-0 flex-col overflow-hidden'>
            {/* Form fields */}
            <div className='grid shrink-0 grid-cols-1 gap-4 border-b border-black/[0.06] bg-white p-6 md:grid-cols-2 xl:grid-cols-4'>
              <div className='flex flex-col gap-1'>
                <Label.Root className='text-label-sm text-text-main-900'>
                  Project Payment Sheet Name
                  <span className='text-text-soft-400'>*</span>
                </Label.Root>
                <Input.Root
                  size='medium'
                  className='shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'
                >
                  <Input.Wrapper>
                    <Input.Input
                      value={sheetName}
                      onChange={(event) => setSheetName(event.target.value)}
                      placeholder='Enter name'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>

              <div className='flex flex-col gap-1'>
                <Label.Root className='text-label-sm text-text-main-900'>
                  Master Payment Sheet
                </Label.Root>
                <SearchableSelect
                  size='small'
                  showArrow
                  value={masterSheet}
                  onValueChange={setMasterSheet}
                  options={masterSheetOptions}
                  placeholder='Select'
                  triggerClassName='w-full shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'
                />
              </div>

              <div className='flex flex-col gap-1'>
                <Label.Root className='text-label-sm text-text-main-900'>
                  Expected Payment Date
                </Label.Root>
                <Datepicker
                  value={expectedDate}
                  onChange={setExpectedDate}
                  variant='default'
                  size='small'
                  placeholder='DD / MM / YYYY'
                  formatDate={(date) => format(date, 'dd / MM / yyyy')}
                  className='h-10 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'
                />
              </div>

              <div className='flex flex-col gap-1'>
                <Label.Root className='text-label-sm text-text-main-900'>Remarks</Label.Root>
                <Input.Root
                  size='medium'
                  className='shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'
                >
                  <Input.Wrapper>
                    <Input.Input
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      placeholder='Type here...'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
            </div>

            {/* Search / filters */}
            <div className='flex shrink-0 flex-col gap-3 border-b border-stroke-soft-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between'>
              <div className='w-full max-w-[274px]'>
                <Input.Root size='xsmall'>
                  <Input.Wrapper>
                    <Input.Icon as={RiSearchLine} />
                    <Input.Input
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder='Search by here...'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>

              <div className='flex flex-wrap items-center justify-end gap-2'>
                <SearchableSelect
                  size='xsmall'
                  variant='compact'
                  showArrow
                  value={vendorFilter}
                  onValueChange={setVendorFilter}
                  options={vendorOptions}
                  placeholder='All Vendor'
                  searchPlaceholder='Search vendors...'
                  noResultsMessage='No vendors found'
                  triggerClassName={cn(filterTriggerClassName, 'min-w-[120px]')}
                  contentClassName='min-w-[200px]'
                />
                <SearchableSelect
                  size='xsmall'
                  variant='compact'
                  showArrow
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                  options={categoryOptions}
                  placeholder='All Category'
                  searchPlaceholder='Search categories...'
                  noResultsMessage='No categories found'
                  triggerClassName={cn(filterTriggerClassName, 'min-w-[130px]')}
                  contentClassName='min-w-[200px]'
                />
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  className='size-8 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                  aria-label='Sort'
                >
                  <Button.Icon as={RiExpandUpDownLine} />
                </Button.Root>
              </div>
            </div>

            {/* Vendor accordion rows — Figma 34464:49269 */}
            <div className='min-h-0 flex-1 overflow-y-auto'>
              {isLoadingData && (
                <div className='flex items-center justify-center py-10 text-paragraph-sm text-text-soft-400'>
                  Loading vendors...
                </div>
              )}
              {!isLoadingData && filteredVendors.length === 0 && (
                <div className='flex items-center justify-center py-10 text-paragraph-sm text-text-soft-400'>
                  No vendors found.
                </div>
              )}
              {!isLoadingData &&
                filteredVendors.map((vendor) => (
                  <div key={vendor.id} className='border-b border-[#e2e6e0]'>
                    <button
                      type='button'
                      className='flex h-9 w-full items-center justify-between gap-3 border-t border-[#e2e6e0] bg-[rgba(226,228,233,0.2)] px-6'
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
                          label='Paid'
                          value={formatProcurementAmount(vendor.paid_amt)}
                        />
                        <VendorSummaryBadge
                          label='pending'
                          value={formatProcurementAmount(vendor.pending_amt)}
                        />
                      </div>
                    </button>

                    {vendor.expanded && (vendor.pos?.length ?? 0) > 0 && (
                      <div className='bg-white px-6 py-3'>
                        <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-white'>
                          <div
                            ref={bindVendorTableScrollRef(vendor.id)}
                            className='overflow-x-auto overscroll-x-contain'
                            onScroll={handleVendorTableScroll}
                          >
                            <Table.Root
                              variant='compact'
                              className='min-w-[1461px] overflow-x-visible'
                            >
                              <Table.Header className='bg-bg-weak-100'>
                                <Table.Row>
                                  <Table.Head className='min-w-[165px] whitespace-nowrap'>
                                    <SortableHead label='PO No.' />
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
                                    <SortableHead label='Due As Per Terms' />
                                  </Table.Head>
                                  <Table.Head className='min-w-[222px]'>
                                    <SortableHead label='Requested Payment' />
                                  </Table.Head>
                                  <Table.Head className='min-w-[140px]'>
                                    <SortableHead label='Design End' />
                                  </Table.Head>
                                  <Table.Head className='min-w-[140px]'>
                                    <SortableHead label='Milestone End' />
                                  </Table.Head>
                                </Table.Row>
                              </Table.Header>
                              <Table.Body spacing={4}>
                                {vendor.pos.map((po, index) => (
                                  <React.Fragment key={po.id}>
                                    <Table.Row
                                      className={cn(
                                        'h-10',
                                        index % 2 === 1 && '[&>td]:bg-[#fbfbfb]',
                                      )}
                                    >
                                      <Table.Cell className='whitespace-nowrap'>
                                        <span className='text-paragraph-sm font-medium text-text-main-900'>
                                          {po.po_no}
                                        </span>
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
                                          {formatProcurementAmount(po.due_as_per_terms)}
                                          {po.due_terms_pct != null && (
                                            <span className='font-medium uppercase tracking-[0.84px] text-text-soft-400'>
                                              {' '}
                                              ({po.due_terms_pct}%)
                                            </span>
                                          )}
                                        </span>
                                      </Table.Cell>
                                      <Table.Cell>
                                        <RequestedPaymentInputCell
                                          amountValue={poAmounts[po.id] ?? ''}
                                          percentValue={poPercents[po.id] ?? ''}
                                          onAmountChange={(value) =>
                                            handlePoAmountChange(po.id, value, po.po_value)
                                          }
                                          onPercentChange={(value) =>
                                            handlePoPercentChange(po.id, value, po.po_value)
                                          }
                                        />
                                      </Table.Cell>
                                      <Table.Cell>
                                        <span className='text-paragraph-sm text-text-sub-500'>
                                          {formatOrdinalDate(po.design_end)}
                                        </span>
                                      </Table.Cell>
                                      <Table.Cell>
                                        <span className='text-paragraph-sm text-text-sub-500'>
                                          {formatOrdinalDate(po.milestone_end)}
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
        </Drawer.Body>

        <Drawer.Footer className='flex shrink-0 flex-col items-stretch gap-3 border-t border-stroke-soft-200 bg-bg-white-0 px-8 py-6 sm:flex-row sm:items-center sm:justify-end sm:gap-3'>
          <div className='flex h-[30px] items-center gap-1.5'>
            <FooterStatBadge label='vendors' value={footerStats.vendors} />
            <FooterStatBadge label="po's" value={footerStats.pos} />
            <FooterStatBadge label='total planned' value={footerStats.totalPlanned} />
          </div>

          <div className='flex flex-1 items-center justify-end gap-3'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='ghost'
              size='small'
              disabled={isSubmitting}
              onClick={() => handleSubmit('Draft')}
            >
              {isEditing ? 'Save Draft' : 'Save as Draft'}
            </Button.Root>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              className='shadow-[0px_1px_2px_0px_rgba(55,93,251,0.08)]'
              disabled={isSubmitting}
              onClick={() => handleSubmit('Submitted for approval')}
            >
              Submit
            </Button.Root>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
}
