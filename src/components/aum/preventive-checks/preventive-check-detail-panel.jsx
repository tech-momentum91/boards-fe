import React, { memo, useMemo, useState } from 'react';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiAttachment2,
  RiBuildingLine,
  RiCalendarLine,
  RiCollageLine,
  RiMoneyRupeeCircleLine,
  RiPriceTag3Line,
  RiShieldCheckLine,
  RiStackLine,
  RiStickyNoteLine,
  RiUploadLine,
  RiUserLine,
} from 'react-icons/ri';

import { formatAumDetailDateDisplay } from '@/components/aum/asset/asset-detail-helper';
import AumEditableBadgeWithCaret from '@/components/aum/asset/aum-badge-with-caret';
import AumStatusDropdown from '@/components/aum/shared/aum-status-dropdown';
import {
  buildPreventiveCheckMetaLine,
  formatMwqDrawerDate,
  getPreventiveCheckDescription,
  getPreventiveCheckFloor,
  normalizePreventiveCheckAttachments,
} from '@/components/aum/preventive-checks/preventive-check-detail-helper';
import {
  getMwqPreventiveConditionOptionsForRow,
  getMwqConditionBadgeStyle,
  getMwqPriorityBadgeStyle,
} from '@/components/aum/maintenance-work-queue/maintenance-work-queue-constants';
import MwqAssigneePicker from '@/components/aum/maintenance-work-queue/mwq-assignee-picker';
import AttachmentCard from '@/components/ui/attachment-card';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import FieldRow from '@/components/ui/field-row';
import { normalizeAttachment } from '@/lib/utils';

function PreventiveCheckAssigneeField({ row, onAssigneeChange }) {
  return (
    <div className='px-2 py-1'>
      <MwqAssigneePicker
        assignees={row?.assignees}
        primaryAssigneeEmail={row?.primaryAssigneeEmail}
        onChange={onAssigneeChange}
        size='xsmall'
        variant='borderless'
        maxVisibleAvatars={1}
      />
    </div>
  );
}

function PreventiveCheckTextValue({ children }) {
  return <span className='paragraph-small px-2 py-1.5 text-text-main-900'>{children}</span>;
}

function PreventiveCheckStaticBadge({ value, style }) {
  if (!value) return <PreventiveCheckTextValue>—</PreventiveCheckTextValue>;

  return (
    <div className='px-2 py-1.5'>
      <Badge.Root size='small' variant={style.variant} color={style.color} className='uppercase'>
        {value}
      </Badge.Root>
    </div>
  );
}

const PreventiveCheckDetailPanel = memo(
  ({
    row,
    onStatusChange,
    onConditionChange,
    onPriorityChange: _onPriorityChange,
    onAssigneeChange,
    onUploadAttachments,
    isUploading = false,
  }) => {
    const [showExtendedFields, setShowExtendedFields] = useState(false);

    const conditionStyle = getMwqConditionBadgeStyle(row?.condition);
    const conditionOptions = useMemo(() => getMwqPreventiveConditionOptionsForRow(row), [row]);
    const priorityStyle = getMwqPriorityBadgeStyle(row?.priority);
    const attachments = useMemo(() => normalizePreventiveCheckAttachments(row), [row]);
    const metaLine = buildPreventiveCheckMetaLine(row);

    const primaryFields = [
      {
        id: 'assignee',
        icon: RiUserLine,
        label: 'Assignee',
        value: <PreventiveCheckAssigneeField row={row} onAssigneeChange={onAssigneeChange} />,
      },
      {
        id: 'condition',
        icon: RiShieldCheckLine,
        label: 'Condition',
        value: (
          <div className='px-2 py-1'>
            <AumEditableBadgeWithCaret
              value={row?.condition}
              options={conditionOptions}
              color={conditionStyle.color}
              variant={conditionStyle.variant}
              onChange={(next) => onConditionChange?.(next)}
              uppercase
              ariaLabel='Change condition'
            />
          </div>
        ),
      },
      {
        id: 'priority',
        icon: RiPriceTag3Line,
        label: 'Priority',
        value: <PreventiveCheckStaticBadge value={row?.priority} style={priorityStyle} />,
      },
      {
        id: 'startDate',
        icon: RiCalendarLine,
        label: 'Start Date',
        value: (
          <PreventiveCheckTextValue>{formatMwqDrawerDate(row?.startDate)}</PreventiveCheckTextValue>
        ),
      },
      {
        id: 'dueDate',
        icon: RiCalendarLine,
        label: 'Due Date',
        value: (
          <PreventiveCheckTextValue>{formatMwqDrawerDate(row?.dueDate)}</PreventiveCheckTextValue>
        ),
      },
      {
        id: 'center',
        icon: RiBuildingLine,
        label: 'Center',
        value: (
          <PreventiveCheckTextValue>
            {row?.centerName || row?.center || '—'}
          </PreventiveCheckTextValue>
        ),
      },
      {
        id: 'floor',
        icon: RiStackLine,
        label: 'Floor',
        value: <PreventiveCheckTextValue>{getPreventiveCheckFloor(row)}</PreventiveCheckTextValue>,
      },
      {
        id: 'area',
        icon: RiCollageLine,
        label: 'Area',
        value: <PreventiveCheckTextValue>{row?.area || '—'}</PreventiveCheckTextValue>,
      },
    ];

    const extendedFields = [
      {
        id: 'productGroup',
        icon: RiPriceTag3Line,
        label: 'Product Group',
        value: <PreventiveCheckTextValue>{row?.productGroup || '—'}</PreventiveCheckTextValue>,
      },
      {
        id: 'productCategory',
        icon: RiPriceTag3Line,
        label: 'Category Type',
        value: <PreventiveCheckTextValue>{row?.productCategory || '—'}</PreventiveCheckTextValue>,
      },
      {
        id: 'purchaseDate',
        icon: RiCalendarLine,
        label: 'Purchase Date',
        value: (
          <PreventiveCheckTextValue>
            {formatMwqDrawerDate(row?.purchaseDate)}
          </PreventiveCheckTextValue>
        ),
      },
      {
        id: 'warrantyDueDate',
        icon: RiCalendarLine,
        label: 'Warranty Due Date',
        value: (
          <PreventiveCheckTextValue>
            {formatMwqDrawerDate(row?.warrantyDueDate)}
          </PreventiveCheckTextValue>
        ),
      },
      {
        id: 'originalValue',
        icon: RiMoneyRupeeCircleLine,
        label: 'Original Value',
        value: <PreventiveCheckTextValue>{row?.originalValue || '—'}</PreventiveCheckTextValue>,
      },
      {
        id: 'currentValue',
        icon: RiMoneyRupeeCircleLine,
        label: 'Current Value',
        value: <PreventiveCheckTextValue>{row?.currentValue || '—'}</PreventiveCheckTextValue>,
      },
      {
        id: 'lastMaintenanceDate',
        icon: RiCalendarLine,
        label: 'Last Maintenance',
        value: (
          <PreventiveCheckTextValue>
            {formatAumDetailDateDisplay(row?.lastMaintenanceDate) || '—'}
          </PreventiveCheckTextValue>
        ),
      },
      {
        id: 'totalMaintenanceValue',
        icon: RiMoneyRupeeCircleLine,
        label: 'Total Maintenance Cost',
        value: (
          <PreventiveCheckTextValue>{row?.totalMaintenanceValue || '—'}</PreventiveCheckTextValue>
        ),
      },
    ];

    const visibleFields = showExtendedFields
      ? [...primaryFields, ...extendedFields]
      : primaryFields;

    return (
      <div className='flex flex-col gap-6 px-6 py-5'>
        <div className='flex flex-col gap-4'>
          <AumStatusDropdown
            mode='preventive'
            value={row?.status}
            onValueChange={(next) => onStatusChange?.(next)}
            disabled={!onStatusChange}
            size='small'
          />

          <div className='flex flex-col gap-2'>
            <h2 className='text-title-h5 font-medium text-text-main-900'>{row?.name || '—'}</h2>
            {metaLine ? (
              <p className='text-label-sm font-medium text-text-sub-500'>{metaLine}</p>
            ) : null}
          </div>

          <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
            <div className='divide-y divide-stroke-soft-200'>
              {visibleFields.map((field) => (
                <FieldRow key={field.id} icon={field.icon} label={field.label}>
                  {field.value}
                </FieldRow>
              ))}

              <button
                type='button'
                onClick={() => setShowExtendedFields((current) => !current)}
                className='flex h-8 w-full items-center gap-2 px-2.5 text-left text-label-xs font-medium text-text-soft-400 transition hover:bg-bg-weak-50'
              >
                {showExtendedFields ? (
                  <RiArrowUpSLine className='size-5 shrink-0' aria-hidden />
                ) : (
                  <RiArrowDownSLine className='size-5 shrink-0' aria-hidden />
                )}
                {showExtendedFields ? 'Show less fields' : 'Show 8 more fields'}
              </button>
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-3'>
          <div className='flex items-center gap-2'>
            <RiStickyNoteLine className='size-5 text-text-soft-400' aria-hidden />
            <span className='text-label-md font-medium text-text-sub-500'>Description</span>
          </div>
          <p className='paragraph-small text-text-main-900'>{getPreventiveCheckDescription(row)}</p>
        </div>

        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-2'>
              <RiAttachment2 className='size-5 text-text-soft-400' aria-hidden />
              <span className='text-label-md font-medium text-text-sub-500'>Attachments</span>
            </div>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              className='gap-1'
              onClick={onUploadAttachments}
              disabled={isUploading}
            >
              <Button.Icon as={RiUploadLine} className='p-0.5' />
              Upload Files
            </Button.Root>
          </div>

          <div className='w-[220px] max-w-full'>
            {attachments.map((attachment, index) => (
              <AttachmentCard
                key={attachment.id || `${attachment.fileName}-${index}`}
                attachment={normalizeAttachment(attachment, index)}
                showDownload={Boolean(attachment.fileUrl)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  },
);

PreventiveCheckDetailPanel.displayName = 'PreventiveCheckDetailPanel';

export default PreventiveCheckDetailPanel;
