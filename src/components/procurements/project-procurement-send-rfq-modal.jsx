import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { RiCloseLine, RiSendPlaneLine } from 'react-icons/ri';

import { fetchActiveVendors } from '@/api/vendors';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import { Datepicker } from '@/components/ui/datepicker';
import * as Label from '@/components/ui/label';
import * as Modal from '@/components/ui/modal';
import { SearchableSelect } from '@/components/ui/searchable-select';

const EMPTY_FORM = {
  vendors: [],
  submissionEndDate: null,
};

const ProjectProcurementSendRfqModal = memo(
  ({ open = false, onOpenChange, vendorOptions: vendorOptionsProp, onSend, isSending = false }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [fetchedVendors, setFetchedVendors] = useState([]);
    const [isLoadingVendors, setIsLoadingVendors] = useState(false);
    const [vendorsError, setVendorsError] = useState(null);

    // Reset transient state whenever the modal closes.
    useEffect(() => {
      if (!open) {
        setForm(EMPTY_FORM);
        setVendorsError(null);
      }
    }, [open]);

    // Fetch active vendors when opened, unless the caller supplies its own options.
    useEffect(() => {
      if (!open || vendorOptionsProp) return undefined;

      let cancelled = false;
      setIsLoadingVendors(true);
      setVendorsError(null);
      fetchActiveVendors()
        .then((vendors) => {
          if (cancelled) return;
          setFetchedVendors(vendors);
        })
        .catch((error) => {
          if (cancelled) return;
          setFetchedVendors([]);
          setVendorsError(error?.message || 'Failed to load vendors.');
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoadingVendors(false);
        });

      return () => {
        cancelled = true;
      };
    }, [open, vendorOptionsProp]);

    const vendorOptions = useMemo(() => {
      const base = vendorOptionsProp ?? fetchedVendors;
      const seen = new Set();
      return base.filter((option) => {
        if (!option?.value || seen.has(option.value)) return false;
        seen.add(option.value);
        return true;
      });
    }, [vendorOptionsProp, fetchedVendors]);

    const selectedVendorValues = useMemo(
      () => form.vendors.map((vendor) => vendor.value),
      [form.vendors],
    );

    const handleOpenChange = useCallback(
      (nextOpen) => {
        onOpenChange?.(nextOpen);
      },
      [onOpenChange],
    );

    const handleVendorChange = useCallback(
      (nextValues) => {
        const values = Array.isArray(nextValues) ? nextValues : [];
        setForm((previous) => ({
          ...previous,
          vendors: values.map((value) => {
            const option = vendorOptions.find((vendor) => vendor.value === value);
            return { value, label: option?.label ?? value };
          }),
        }));
      },
      [vendorOptions],
    );

    const canSend = form.vendors.length > 0 && !isSending;

    const handleSend = useCallback(async () => {
      if (!canSend) return;
      try {
        await onSend?.({
          vendors: form.vendors.map((vendor) => ({
            vendorId: vendor.value,
            vendorName: vendor.label || vendor.value,
          })),
          submissionEndDate: form.submissionEndDate
            ? format(form.submissionEndDate, 'yyyy-MM-dd')
            : '',
        });
        onOpenChange?.(false);
      } catch {
        // Keep the modal open on failure; the caller surfaces the error.
      }
    }, [canSend, form, onOpenChange, onSend]);

    return (
      <Modal.Root open={open} onOpenChange={handleOpenChange}>
        <Modal.Content
          className='flex w-full max-w-[440px] flex-col overflow-hidden p-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
          showClose={false}
        >
          <div className='relative flex shrink-0 items-center gap-4 border-b border-stroke-soft-200 px-8 py-5'>
            <span className='flex size-11 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0'>
              <RiSendPlaneLine className='size-6 text-text-sub-500' aria-hidden />
            </span>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
              <Modal.Title className='text-label-lg font-medium tracking-[-0.27px] text-text-main-900'>
                Send RFQ
              </Modal.Title>
              <Modal.Description className='text-paragraph-sm text-text-sub-500'>
                Select one or more vendors to receive RFQ.
              </Modal.Description>
            </div>
            <Modal.Close asChild>
              <CompactButton.Root
                variant='ghost'
                size='medium'
                className='absolute right-4 top-4'
                aria-label='Close send RFQ modal'
              >
                <CompactButton.Icon as={RiCloseLine} />
              </CompactButton.Root>
            </Modal.Close>
          </div>

          <Modal.Body className='flex flex-col gap-4 px-8 py-6'>
            <div className='flex flex-col gap-1'>
              <Label.Root>Vendor</Label.Root>
              <SearchableSelect
                multiple
                value={selectedVendorValues}
                onValueChange={handleVendorChange}
                options={vendorOptions}
                placeholder='Select'
                searchPlaceholder='Search here...'
                emptyMessage={
                  isLoadingVendors ? 'Loading vendors...' : (vendorsError ?? 'No vendors found')
                }
                noResultsMessage='No vendors found'
                disabled={isLoadingVendors}
                matchTriggerWidth
                showArrow
                contentClassName='min-w-[var(--radix-popover-trigger-width)]'
              />
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root>Submission End Date</Label.Root>
              <Datepicker
                variant='bordered'
                size='medium'
                value={form.submissionEndDate}
                onChange={(date) =>
                  setForm((previous) => ({
                    ...previous,
                    submissionEndDate: date ?? null,
                  }))
                }
                placeholder='DD / MM / YYYY'
                formatDate={(date) => format(date, 'dd / MM / yyyy')}
                triggerAriaLabel='Submission end date'
                className='w-full'
              />
            </div>
          </Modal.Body>

          <Modal.Footer className='flex shrink-0 gap-3 border-t border-stroke-soft-200 px-8 py-6'>
            <Modal.Close asChild>
              <Button.Root
                className='flex-1'
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
              >
                Cancel
              </Button.Root>
            </Modal.Close>
            <Button.Root
              type='button'
              className='flex-1'
              variant='primary'
              mode='filled'
              size='small'
              disabled={!canSend}
              onClick={handleSend}
            >
              {isSending ? 'Sending...' : 'Send'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    );
  },
);

ProjectProcurementSendRfqModal.displayName = 'ProjectProcurementSendRfqModal';

export default ProjectProcurementSendRfqModal;
