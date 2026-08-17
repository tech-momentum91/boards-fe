import React, { useEffect, useState } from 'react';
import {
  RiArrowUpLine,
  RiAttachment2,
  RiCalendarLine,
  RiChat2Line,
  RiCloseLine,
  // RiDeleteBinLine,
  RiHashtag,
  RiImageLine,
  RiMoneyDollarCircleLine,
  RiPercentLine,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiWallet3Line,
} from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import { Datepicker } from '@/components/ui/datepicker';
import * as Drawer from '@/components/ui/drawer';
import * as Input from '@/components/ui/input';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import ProjectCollectionComments from '@/components/projects/collections/project-collection-comments';
import ProjectDrawerPanelHeader from '@/components/projects/shared/project-drawer-panel-header';
import FieldRow from '@/components/ui/field-row';
import { PROJECT_DETAIL_COLLECTION_STATUS_META } from '@/components/projects/constants';
import { formatDateToYYYYMMDD, formatToDDMMYYYY, parseToDate } from '@/utils/date-utils';

function formatCollectionCurrency(value) {
  if (value == null || value === '') return '—';
  if (value === '-') return '-';
  const normalized = String(value).trim();
  if (normalized.startsWith('₹')) return normalized;
  return `₹${normalized}`;
}

function formatCollectionPercent(value) {
  if (value == null || value === '') return '—';
  const normalized = String(value).trim();
  if (normalized.endsWith('%')) return normalized;
  return `${normalized}%`;
}

function CollectionStatusBadge({ status }) {
  const meta = PROJECT_DETAIL_COLLECTION_STATUS_META[status] ?? {
    label: status?.toUpperCase?.() ?? '—',
    color: 'gray',
  };

  return (
    <Badge.Root variant='light' color={meta.color} size='small' className='uppercase'>
      {meta.label}
    </Badge.Root>
  );
}

function BoqTypeBadge({ value }) {
  return (
    <Badge.Root variant='light' color='blue' size='small'>
      {value}
    </Badge.Root>
  );
}

function ReadOnlyValue({ children, className }) {
  return (
    <span className={`text-paragraph-sm text-text-sub-500 ${className ?? ''}`.trim()}>
      {children}
    </span>
  );
}

function EditableDateField({ value, onChange }) {
  return (
    <Datepicker
      value={parseToDate(value) ?? undefined}
      onChange={(date) => onChange?.(date ? formatDateToYYYYMMDD(date) : '')}
      placeholder='DD/MM/YY'
      formatDate={(date) => formatToDDMMYYYY(date)}
      size='xsmall'
      variant='compact'
    />
  );
}

function EditableRemarksField({ value, onChange }) {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  return (
    <Input.Root size='xsmall'>
      <Input.Wrapper>
        <Input.Input
          value={draft}
          placeholder='Enter remark'
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            const next = draft.trim();
            const previous = String(value ?? '').trim();
            if (next !== previous) onChange?.(next);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      </Input.Wrapper>
    </Input.Root>
  );
}

function AttachmentCard({ attachment }) {
  return (
    <div className='relative w-[220px] overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
      <div className='flex h-[176px] items-center justify-center bg-bg-weak-100'>
        <RiImageLine className='size-6 text-text-soft-400' />
      </div>
      <div className='space-y-1 px-4 py-3'>
        <p className='truncate text-label-sm text-text-main-900'>{attachment.name}</p>
        <p className='truncate text-paragraph-xs text-text-sub-500'>
          {attachment.size} • {attachment.uploadedAt}
        </p>
      </div>
    </div>
  );
}

export default function ProjectCollectionViewDrawer({
  open,
  onOpenChange,
  collection,
  projectId,
  onUpdateMilestone,
}) {
  if (!open) return null;

  const attachments = collection?.attachments ?? [];
  const collectionBoqId = collection?.collection_boq || collection?.name || '';

  const updateField = (changes) => {
    if (!collection || !onUpdateMilestone) return;
    onUpdateMilestone(collection, changes);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='h-full w-full max-w-[1200px] overflow-hidden p-0'>
        <div className='flex h-full flex-col'>
          <div className='flex items-center justify-end border-b border-stroke-soft-200 px-6 py-3'>
            <div className='flex items-center gap-2'>
              {projectId && collectionBoqId ? (
                <ProjectFollowersPopover
                  projectId={projectId}
                  scopeMode='leaf'
                  section='collections'
                  referenceDoctype='Project Collection BOQ'
                  referenceName={collectionBoqId}
                  activityLabel='collection'
                />
              ) : null}
              {/*
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='flex flex-row gap-3'
              >
                <Button.Icon as={RiDeleteBinLine} />
                Remove
              </Button.Root>
              */}
              <Drawer.Close asChild>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  aria-label='Close collection view drawer'
                >
                  <Button.Icon as={RiCloseLine} />
                </Button.Root>
              </Drawer.Close>
            </div>
          </div>

          {!collection ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              Collection record not found
            </div>
          ) : (
            <div className='grid min-h-0 flex-1 grid-cols-[minmax(360px,422px)_minmax(0,1fr)]'>
              <div className='min-w-0 overflow-y-auto border-r border-stroke-soft-200 px-6 py-5'>
                <h2 className='text-title-xl text-text-main-900'>{collection.milestone}</h2>

                <div className='mt-4 overflow-hidden rounded-xl border border-stroke-soft-200 divide-y divide-stroke-soft-200'>
                  <FieldRow icon={RiPriceTag3Line} label='BOQ Type'>
                    <BoqTypeBadge value={collection.boq_type} />
                  </FieldRow>
                  <FieldRow icon={RiHashtag} label='Invoice No.'>
                    <button type='button' className='text-paragraph-sm text-text-sub-500 underline'>
                      {collection.invoice_no || '—'}
                    </button>
                  </FieldRow>
                  <FieldRow icon={RiCalendarLine} label='Exp. Inv. Date'>
                    <EditableDateField
                      value={collection.expected_invoice_date}
                      onChange={(next) => updateField({ expected_invoice_date: next })}
                    />
                  </FieldRow>
                  <FieldRow icon={RiCalendarLine} label='Exp. Pay Date'>
                    <EditableDateField
                      value={collection.expected_payment_date}
                      onChange={(next) => updateField({ expected_payment_date: next })}
                    />
                  </FieldRow>
                  <FieldRow icon={RiCalendarLine} label='Actual Inv. Date'>
                    <ReadOnlyValue>{collection.actual_invoice_date || '—'}</ReadOnlyValue>
                  </FieldRow>
                  <FieldRow icon={RiMoneyDollarCircleLine} label='Net Receivable (₹)'>
                    <ReadOnlyValue>
                      {formatCollectionCurrency(collection.net_receivable)}
                    </ReadOnlyValue>
                  </FieldRow>
                  <FieldRow icon={RiMoneyDollarCircleLine} label='Received'>
                    <ReadOnlyValue>{formatCollectionCurrency(collection.received)}</ReadOnlyValue>
                  </FieldRow>
                  <FieldRow icon={RiPriceTag3Line} label='Status'>
                    <CollectionStatusBadge status={collection.status} />
                  </FieldRow>
                  <FieldRow icon={RiPercentLine} label='Pay'>
                    <ReadOnlyValue>{formatCollectionPercent(collection.pay_percent)}</ReadOnlyValue>
                  </FieldRow>
                  <FieldRow icon={RiMoneyDollarCircleLine} label='BOQ Ref. Val.'>
                    <ReadOnlyValue>
                      {formatCollectionCurrency(collection.boq_ref_value)}
                    </ReadOnlyValue>
                  </FieldRow>
                  <FieldRow icon={RiMoneyDollarCircleLine} label='Inv. (with GST)'>
                    <ReadOnlyValue>
                      {formatCollectionCurrency(collection.invoice_with_gst)}
                    </ReadOnlyValue>
                  </FieldRow>
                  <FieldRow icon={RiPercentLine} label='TDS'>
                    <ReadOnlyValue>{formatCollectionPercent(collection.tds_percent)}</ReadOnlyValue>
                  </FieldRow>
                  <FieldRow icon={RiMoneyDollarCircleLine} label='TDS Amt.'>
                    <ReadOnlyValue>{formatCollectionCurrency(collection.tds_amount)}</ReadOnlyValue>
                  </FieldRow>
                  <FieldRow icon={RiWallet3Line} label='Balance'>
                    <ReadOnlyValue>
                      {collection.balance === '-'
                        ? '-'
                        : formatCollectionCurrency(collection.balance)}
                    </ReadOnlyValue>
                  </FieldRow>
                </div>

                <section className='mt-6'>
                  <div className='mb-3 flex items-center gap-2 text-label-md text-text-sub-500'>
                    <RiStickyNoteLine className='size-5 text-text-soft-400' />
                    Remarks
                  </div>
                  <EditableRemarksField
                    value={collection.remarks}
                    onChange={(next) => updateField({ remarks: next })}
                  />
                </section>

                <section className='mt-6'>
                  <div className='mb-3 flex items-center justify-between'>
                    <div className='flex items-center gap-2 text-label-md text-text-sub-500'>
                      <RiAttachment2 className='size-5 text-text-soft-400' />
                      Attachments
                    </div>
                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='stroke'
                      size='small'
                      className='flex flex-row gap-1.5'
                    >
                      <Button.Icon as={RiArrowUpLine} />
                      Upload Files
                    </Button.Root>
                  </div>
                  {attachments.length > 0 ? (
                    <div className='flex flex-wrap gap-3'>
                      {attachments.map((attachment) => (
                        <AttachmentCard
                          key={attachment.id ?? attachment.name}
                          attachment={attachment}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className='text-paragraph-sm text-text-sub-500'>No attachments</p>
                  )}
                </section>
              </div>

              <div className='flex min-h-0 min-w-0 flex-col'>
                <ProjectDrawerPanelHeader icon={RiChat2Line} label='Comments' />
                <div className='min-h-0 flex-1 overflow-hidden'>
                  <ProjectCollectionComments collectionBoqId={collectionBoqId} />
                </div>
              </div>
            </div>
          )}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
