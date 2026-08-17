import React, { useCallback, useState } from 'react';
import * as Button from '@/components/ui/button';
import * as Divider from '@/components/ui/divider';
import * as Label from '@/components/ui/label';
import * as Badge from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import {
  RiArrowRightLine,
  RiCheckboxCircleFill,
  RiCloseCircleLine,
  RiDatabase2Line,
  RiFileEditLine,
  RiFilter3Line,
  RiKey2Line,
  RiStackLine,
} from 'react-icons/ri';

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function DetailRow({ label, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label.Root className='text-[11px] font-medium uppercase tracking-wide text-text-soft-400'>
        {label}
      </Label.Root>
      <div className='text-label-sm text-text-main-900'>{children}</div>
    </div>
  );
}

function isBulkPayload(payload) {
  return payload?.action === 'bulk_update';
}

/**
 * Align UI–styled confirmation for DevX AI updates (single record or bulk).
 */
export function DevxAiUpdateConfirmCard({
  payload,
  status,
  busy = false,
  updateResult = null,
  errorMessage = null,
  onConfirm,
  onDecline,
}) {
  const [localBusy, setLocalBusy] = useState(false);
  const submitting = busy || localBusy;
  const isBulk = isBulkPayload(payload);

  const doctype = payload?.doctype ?? '—';
  const record = payload?.record_display || payload?.record_name || '—';
  const fieldLabel = payload?.field_label || payload?.fieldname || '—';
  const fieldname = payload?.fieldname;
  const fieldTitle =
    fieldLabel && fieldname && fieldLabel !== fieldname
      ? `${fieldLabel} (${fieldname})`
      : fieldLabel;
  const oldVal = displayValue(payload?.old_value);
  const newVal = displayValue(payload?.new_value);
  const recordCount = typeof payload?.record_count === 'number' ? payload.record_count : 0;
  const filtersSummary = String(payload?.filters_summary || '').trim();
  const sampleRecords = Array.isArray(payload?.sample_records) ? payload.sample_records : [];

  const handleConfirm = useCallback(async () => {
    if (submitting || status !== 'pending') return;
    setLocalBusy(true);
    try {
      await onConfirm?.();
    } finally {
      setLocalBusy(false);
    }
  }, [onConfirm, status, submitting]);

  const handleDecline = useCallback(() => {
    if (submitting || status !== 'pending') return;
    onDecline?.();
  }, [onDecline, status, submitting]);

  return (
    <div
      className={cn(
        'w-full max-w-[392px] overflow-hidden rounded-2xl border border-stroke-soft-200',
        'bg-gradient-to-br from-bg-white-0 via-[#faf9ff] to-[#f3f0ff]/90',
        'shadow-[0_4px_24px_-4px_rgba(88,92,95,0.12),0_1px_3px_rgba(88,92,95,0.06)]',
      )}
    >
      <div className='flex items-start justify-between gap-3 border-b border-stroke-soft-200 bg-primary-alpha-10/40 px-4 py-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-bg-white-0 shadow-regular-xs ring-1 ring-stroke-soft-200'>
            {isBulk ? (
              <RiStackLine className='size-4 text-primary-base' aria-hidden />
            ) : (
              <RiFileEditLine className='size-4 text-primary-base' aria-hidden />
            )}
          </span>
          <div className='min-w-0'>
            <p className='text-label-sm font-semibold text-text-main-900'>
              {isBulk ? 'Confirm bulk update' : 'Confirm database update'}
            </p>
            <p className='mt-0.5 text-paragraph-xs text-text-sub-600'>
              {isBulk
                ? 'One field will be written on every matching row shown in the count below.'
                : 'This will change one field on a single record.'}{' '}
              This cannot be undone from here.
            </p>
          </div>
        </div>
        <div className='flex shrink-0 flex-col items-end gap-1'>
          <Badge.Root variant='lighter' color='purple' size='medium'>
            {doctype}
          </Badge.Root>
          {isBulk && recordCount > 0 ? (
            <Badge.Root variant='lighter' color='gray' size='small' className='tabular-nums'>
              {recordCount} rows
            </Badge.Root>
          ) : null}
        </div>
      </div>

      <div className='space-y-4 px-4 py-4'>
        {isBulk ? (
          <>
            <div className='flex flex-wrap items-center gap-2 rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 shadow-regular-xs'>
              <span className='text-[11px] font-semibold uppercase tracking-wide text-text-soft-400'>
                Set field
              </span>
              <span className='text-label-sm font-medium text-text-main-900'>{fieldTitle}</span>
              <RiArrowRightLine className='size-4 shrink-0 text-text-soft-400' aria-hidden />
              <span className='rounded-md bg-primary-alpha-10 px-2 py-0.5 text-label-sm font-semibold text-primary-base'>
                {newVal}
              </span>
            </div>
            {filtersSummary ? (
              <div className='flex gap-2 rounded-xl border border-stroke-soft-200 bg-bg-weak-50/80 px-3 py-2'>
                <RiFilter3Line className='mt-0.5 size-4 shrink-0 text-text-soft-400' aria-hidden />
                <div className='min-w-0'>
                  <Label.Root className='text-[10px] font-semibold uppercase tracking-wide text-text-soft-400'>
                    Match criteria
                  </Label.Root>
                  <p className='mt-0.5 text-paragraph-sm leading-snug text-text-sub-600'>
                    {filtersSummary}
                  </p>
                </div>
              </div>
            ) : null}
            {sampleRecords.length > 0 ? (
              <details className='group rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'>
                <summary
                  className={cn(
                    'cursor-pointer list-none px-3 py-2 text-label-sm font-medium text-text-main-900',
                    'outline-none transition hover:bg-bg-weak-50 [&::-webkit-details-marker]:hidden',
                  )}
                >
                  Preview sample
                  <span className='ml-1.5 font-normal text-text-soft-400'>
                    ({sampleRecords.length}
                    {recordCount > sampleRecords.length ? ` of ${recordCount}` : ''})
                  </span>
                </summary>
                <Divider.Root variant='line' className='mx-3' />
                <ul className='max-h-[140px] space-y-1 overflow-y-auto px-3 py-2 text-paragraph-xs text-text-sub-600'>
                  {sampleRecords.map((row) => (
                    <li
                      key={row.name}
                      className='flex items-center justify-between gap-2 rounded-md bg-bg-weak-50/60 px-2 py-1'
                    >
                      <span className='font-mono text-[12px] text-text-main-900'>{row.name}</span>
                      {row.record_display && row.record_display !== row.name ? (
                        <span className='min-w-0 truncate text-text-soft-400'>
                          {row.record_display}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : (
          <>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <DetailRow label='DocType'>
                <span className='inline-flex items-center gap-1.5'>
                  <RiDatabase2Line className='size-3.5 shrink-0 text-text-soft-400' aria-hidden />
                  <span className='font-medium'>{doctype}</span>
                </span>
              </DetailRow>
              <DetailRow label='Record'>
                <span className='inline-flex items-center gap-1.5'>
                  <RiKey2Line className='size-3.5 shrink-0 text-text-soft-400' aria-hidden />
                  <span className='font-mono text-[13px] font-medium tracking-tight'>{record}</span>
                </span>
              </DetailRow>
            </div>

            <DetailRow label='Field'>
              <span className='text-text-main-900'>{fieldTitle}</span>
            </DetailRow>

            <Divider.Root variant='line-spacing' className='my-1' />

            <div>
              <Label.Root className='mb-2 text-[11px] font-medium uppercase tracking-wide text-text-soft-400'>
                Value change
              </Label.Root>
              <div className='flex flex-wrap items-stretch gap-2'>
                <div className='min-w-0 flex-1 rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 shadow-regular-xs'>
                  <p className='text-[10px] font-semibold uppercase tracking-wide text-text-soft-400'>
                    Before
                  </p>
                  <p className='mt-1 break-words text-label-sm text-text-sub-600'>{oldVal}</p>
                </div>
                <div className='flex shrink-0 items-center justify-center px-0.5'>
                  <span className='flex size-8 items-center justify-center rounded-full bg-primary-alpha-10 ring-1 ring-primary-base/20'>
                    <RiArrowRightLine className='size-4 text-primary-base' aria-hidden />
                  </span>
                </div>
                <div className='min-w-0 flex-1 rounded-xl border border-primary-base/25 bg-primary-alpha-10 px-3 py-2.5 shadow-regular-xs'>
                  <p className='text-[10px] font-semibold uppercase tracking-wide text-primary-base'>
                    After
                  </p>
                  <p className='mt-1 break-words text-label-sm font-medium text-text-main-900'>
                    {newVal}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {status === 'confirmed' ? (
          <div className='flex items-start gap-2 rounded-xl border border-green-200/80 bg-green-alpha-10 px-3 py-2.5'>
            <RiCheckboxCircleFill className='mt-0.5 size-4 shrink-0 text-green-600' aria-hidden />
            <div className='min-w-0'>
              <p className='text-label-sm font-medium text-text-main-900'>
                {updateResult?.bulk ? 'Bulk update applied' : 'Update applied'}
              </p>
              {updateResult?.bulk ? (
                <p className='mt-0.5 text-paragraph-xs text-text-sub-600'>
                  Successfully updated{' '}
                  <span className='font-semibold text-text-main-900'>
                    {updateResult.updated ?? 0}
                  </span>{' '}
                  of {(updateResult.updated ?? 0) + (updateResult.failed ?? 0)} record(s).
                  {(updateResult.failed ?? 0) > 0 ? (
                    <span className='block pt-1 text-error-base'>
                      {updateResult.failed} failed — check permissions or validation on those rows.
                    </span>
                  ) : null}
                </p>
              ) : updateResult ? (
                <p className='mt-0.5 text-paragraph-xs text-text-sub-600'>
                  Field is now{' '}
                  <span className='font-medium text-text-main-900'>
                    {displayValue(updateResult.new_value)}
                  </span>
                  {updateResult.old_value !== undefined ? (
                    <span className='text-text-soft-400'>
                      {' '}
                      (was {displayValue(updateResult.old_value)})
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className='mt-0.5 text-paragraph-xs text-text-sub-600'>
                  The record was saved successfully.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {status === 'declined' ? (
          <div className='flex items-center gap-2 rounded-xl border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2.5 text-paragraph-sm text-text-sub-600'>
            <RiCloseCircleLine className='size-4 shrink-0 text-text-soft-400' aria-hidden />
            Update cancelled — no changes were made.
          </div>
        ) : null}

        {status === 'error' && errorMessage ? (
          <p className='rounded-xl border border-red-200 bg-red-alpha-10 px-3 py-2 text-paragraph-sm text-error-base'>
            {errorMessage}
          </p>
        ) : null}

        {status === 'pending' ? (
          <div className='flex flex-wrap items-center justify-end gap-2 pt-1'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='medium'
              onClick={handleDecline}
              disabled={submitting}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='medium'
              onClick={handleConfirm}
              disabled={submitting}
              className='min-w-[108px]'
            >
              {submitting ? (
                <span className='inline-flex items-center gap-2'>
                  <span className='inline-block size-4 animate-spin rounded-full border-2 border-static-white border-t-transparent' />
                  Applying…
                </span>
              ) : isBulk ? (
                `Confirm ${recordCount || 'all'} updates`
              ) : (
                'Confirm update'
              )}
            </Button.Root>
          </div>
        ) : null}
      </div>
    </div>
  );
}
