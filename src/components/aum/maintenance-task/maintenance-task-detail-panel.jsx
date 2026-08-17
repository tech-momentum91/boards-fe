import React, { memo, useMemo } from 'react';
import {
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

import AumEditableBadgeWithCaret from '@/components/aum/asset/aum-badge-with-caret';
import AumStatusDropdown from '@/components/aum/shared/aum-status-dropdown';
import {
  buildMaintenanceTaskMetaLine,
  formatMaintenanceTaskRmImpactValue,
  formatMwqDrawerDate,
  getMaintenanceTaskDescription,
  getMaintenanceTaskFloor,
  normalizeMaintenanceTaskAttachments,
} from '@/components/aum/maintenance-task/maintenance-task-detail-helper';
import {
  getMwqConditionBadgeStyle,
  getMwqPriorityBadgeStyle,
  getMwqTaskConditionOptionsForRow,
} from '@/components/aum/maintenance-work-queue/maintenance-work-queue-constants';
import * as Avatar from '@/components/ui/avatar';
import * as AvatarGroup from '@/components/ui/avatar-group';
import AttachmentCard from '@/components/ui/attachment-card';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import FieldRow from '@/components/ui/field-row';
import { normalizeAttachment } from '@/lib/utils';

function MaintenanceTaskAssigneeField({ assignees = [] }) {
  if (assignees.length === 0) {
    return <span className='paragraph-small px-2 py-1.5 text-text-sub-500'>—</span>;
  }

  if (assignees.length === 1) {
    const assignee = assignees[0];
    return (
      <div className='flex items-center px-2 py-1.5'>
        <Avatar.Root size={20} color='gray'>
          <span className='text-label-sm'>{assignee.initials}</span>
        </Avatar.Root>
      </div>
    );
  }

  const visible = assignees.slice(0, 3);

  return (
    <div className='px-2 py-1.5'>
      <AvatarGroup.Root size={20}>
        {visible.map((assignee) => (
          <Avatar.Root key={assignee.name} size={20} color='gray'>
            <span className='text-label-sm'>{assignee.initials}</span>
          </Avatar.Root>
        ))}
        {assignees.length > 3 ? (
          <AvatarGroup.Overflow size={20}>+{assignees.length - 3}</AvatarGroup.Overflow>
        ) : null}
      </AvatarGroup.Root>
    </div>
  );
}

function MaintenanceTaskTextValue({ children }) {
  return <span className='paragraph-small px-2 py-1.5 text-text-main-900'>{children}</span>;
}

function MaintenanceTaskStaticBadge({ value, style }) {
  if (!value) return <MaintenanceTaskTextValue>—</MaintenanceTaskTextValue>;

  return (
    <div className='px-2 py-1.5'>
      <Badge.Root size='small' variant={style.variant} color={style.color} className='uppercase'>
        {value}
      </Badge.Root>
    </div>
  );
}

const MaintenanceTaskDetailPanel = memo(
  ({
    row,
    onStatusChange,
    onConditionChange,
    onUploadAttachments,
    isUploading = false,
    isStatusSaving = false,
    isConditionSaving = false,
  }) => {
    const conditionStyle = getMwqConditionBadgeStyle(row?.condition);
    const conditionOptions = useMemo(() => getMwqTaskConditionOptionsForRow(row), [row]);
    const priorityStyle = getMwqPriorityBadgeStyle(row?.priority);
    const attachments = useMemo(() => normalizeMaintenanceTaskAttachments(row), [row]);
    const metaLine = buildMaintenanceTaskMetaLine(row);

    const fields = [
      {
        id: 'assignee',
        icon: RiUserLine,
        label: 'Assignee',
        value: <MaintenanceTaskAssigneeField assignees={row?.assignees} />,
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
              disabled={isConditionSaving}
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
        value: <MaintenanceTaskStaticBadge value={row?.priority} style={priorityStyle} />,
      },
      {
        id: 'startDate',
        icon: RiCalendarLine,
        label: 'Start Date',
        value: (
          <MaintenanceTaskTextValue>{formatMwqDrawerDate(row?.startDate)}</MaintenanceTaskTextValue>
        ),
      },
      {
        id: 'dueDate',
        icon: RiCalendarLine,
        label: 'Due Date',
        value: (
          <MaintenanceTaskTextValue>{formatMwqDrawerDate(row?.dueDate)}</MaintenanceTaskTextValue>
        ),
      },
      {
        id: 'center',
        icon: RiBuildingLine,
        label: 'Center',
        value: (
          <MaintenanceTaskTextValue>
            {row?.centerName || row?.center || '—'}
          </MaintenanceTaskTextValue>
        ),
      },
      {
        id: 'floor',
        icon: RiStackLine,
        label: 'Floor',
        value: <MaintenanceTaskTextValue>{getMaintenanceTaskFloor(row)}</MaintenanceTaskTextValue>,
      },
      {
        id: 'area',
        icon: RiCollageLine,
        label: 'Area',
        value: <MaintenanceTaskTextValue>{row?.area || '—'}</MaintenanceTaskTextValue>,
      },
      {
        id: 'rmImpactValue',
        icon: RiMoneyRupeeCircleLine,
        label: 'R&M Impact Value',
        value: (
          <MaintenanceTaskTextValue>
            {formatMaintenanceTaskRmImpactValue(row)}
          </MaintenanceTaskTextValue>
        ),
      },
    ];

    return (
      <div className='flex flex-col gap-6 px-6 py-5'>
        <div className='flex flex-col gap-4'>
          <AumStatusDropdown
            mode='task'
            value={row?.status}
            onValueChange={(next) => onStatusChange?.(next)}
            row={row}
            disabled={isStatusSaving || !onStatusChange}
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
              {fields.map((field) => (
                <FieldRow key={field.id} icon={field.icon} label={field.label}>
                  {field.value}
                </FieldRow>
              ))}
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-3'>
          <div className='flex items-center gap-2'>
            <RiStickyNoteLine className='size-5 text-text-soft-400' aria-hidden />
            <span className='text-label-md font-medium text-text-sub-500'>Description</span>
          </div>
          <p className='paragraph-small text-text-main-900'>{getMaintenanceTaskDescription(row)}</p>
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

MaintenanceTaskDetailPanel.displayName = 'MaintenanceTaskDetailPanel';

export default MaintenanceTaskDetailPanel;
