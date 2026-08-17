import React, { useMemo } from 'react';
import {
  RiUploadCloud2Line,
  RiUserLine,
  RiFlagLine,
  RiPriceTag3Line,
  RiCalendarLine,
  RiCloseLine,
  RiCheckLine,
  RiAddLine,
  RiAttachment2,
  RiUploadLine,
  RiLoader2Fill,
  RiDownloadLine,
  RiDeleteBinLine,
  RiImage2Line,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Input from '@/components/ui/input';
import FieldRow from '@/components/ui/field-row';
import { Datepicker } from '@/components/ui/datepicker';
import {
  formatDateToYYYYMMDD,
  formatDisplayDateTime,
  getMinCustomNextUpdateDate,
  parseToDate,
} from '@/utils/date-utils';
import { isCustomNextUpdateAfterDueDate } from '@/schemas/task-schema';
import {
  FALLBACK_PRIORITY_OPTIONS,
  getPriorityColor,
} from '@/components/client-onboarding/task-view-drawer-utils';
import { getStatusColor } from '@/components/clients-management/constants';
import { PARTNER_INDIVIDUAL_CRM_TASK_STATUS_OPTIONS } from '@/components/partner/constants';
import * as Button from '@/components/ui/button';
import * as LinkButton from '@/components/ui/link-button';
import * as Tag from '@/components/ui/tag';
import * as CompactButton from '@/components/ui/compact-button';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import { formatFileSize } from '@/utils/file-utils';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { joinAssigneeIds } from '@/utils/task-utils';
import { showErrorToast } from '@/utils/error-utils';

/** Drag-and-drop overlay for the partner task drawer upload zone */
export function PartnerTaskDrawerDragOverlay({ overlayHeight, messageTop }) {
  return (
    <>
      <div
        className='absolute top-0 left-0 right-0 z-50 bg-information-lighter/80 backdrop-blur-sm border-2 border-dashed border-information-base pointer-events-none'
        style={{
          height: overlayHeight,
          minHeight: '100%',
        }}
      />
      <div
        className='absolute left-0 right-0 z-50 flex items-center justify-center pointer-events-none'
        style={{
          top: messageTop,
          transform: 'translateY(-50%)',
        }}
      >
        <div className='flex flex-col items-center gap-4'>
          <RiUploadCloud2Line className='size-16 text-information-base' />
          <div className='flex flex-col items-center gap-2'>
            <p className='label-large text-information-base font-semibold'>Drop files here</p>
            <p className='text-paragraph-sm text-text-sub-600'>
              All file types, up to 50 MB per file
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export function PartnerTaskDrawerFormFields({
  status,
  priority,
  dueDate,
  customNextUpdateDate,
  assignedTo,
  assigneeDisplayValue,
  roles,
  assigneeSelectItems,
  assigneeSelectLoading = false,
  handleFieldChange,
  setLocalChanges,
}) {
  const assigneeValue = useMemo(() => {
    const list = Array.isArray(assignedTo)
      ? assignedTo
      : assignedTo
        ? [assignedTo].filter(Boolean)
        : assigneeDisplayValue
          ? [assigneeDisplayValue]
          : [];
    return list.filter(Boolean);
  }, [assignedTo, assigneeDisplayValue]);

  const statusSelectOptions = useMemo(() => {
    const base = PARTNER_INDIVIDUAL_CRM_TASK_STATUS_OPTIONS;
    const current = String(status || '').trim();
    if (!current || base.some((o) => o.value === current)) return base;
    return [{ value: current, label: current, color: 'gray', percentage: 100 }, ...base];
  }, [status]);

  const assigneeOptions = useMemo(() => {
    return (roles || []).map((role) => {
      const value = role?.name ?? role?.role ?? role?.value ?? String(role);
      const label = role?.name ?? role?.description ?? role?.role ?? value;
      return { value, label };
    });
  }, [roles]);

  const priorityOptions = useMemo(() => {
    return FALLBACK_PRIORITY_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.value,
    }));
  }, []);

  return (
    <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
      <FieldRow icon={RiPriceTag3Line} label='Status' editable={true}>
        <SearchableSelect
          variant='borderless'
          value={status || 'Pending'}
          onValueChange={(value) => handleFieldChange('status', value)}
          size='xsmall'
          options={statusSelectOptions}
          placeholder='Not Set'
          triggerClassName='w-full text-left'
          renderTrigger={({ selectedOption }) => (
            <Badge.Root
              variant='light'
              color={getStatusColor(selectedOption?.value || status || 'Pending')}
              className='text-nowrap'
            >
              {selectedOption ? String(selectedOption.label).toUpperCase() : 'Not Set'}
            </Badge.Root>
          )}
          renderOptionLabel={(opt) => (
            <Badge.Root variant='light' color={getStatusColor(opt.value)} className='text-nowrap'>
              {String(opt.label).toUpperCase()}
            </Badge.Root>
          )}
        />
      </FieldRow>

      <FieldRow icon={RiUserLine} label='Assignee' editable={true}>
        {assigneeSelectItems !== undefined ? (
          assigneeSelectLoading ? (
            <span className='text-paragraph-sm text-text-soft-400'>Loading assignees...</span>
          ) : (
            <AssigneeMultiSelect
              value={assigneeValue}
              options={assigneeSelectItems}
              optionsLoading={assigneeSelectLoading}
              onBlur={(values) => {
                const prev = joinAssigneeIds(assigneeValue);
                const next = joinAssigneeIds(values);
                if (prev === next) return;

                setLocalChanges((previous) => ({
                  ...previous,
                  assigned_to: Array.isArray(values) ? values : [],
                }));
                handleFieldChange('assigned_to', values);
              }}
              placeholder='Select assignees'
              maxVisibleAvatars={3}
              variant='borderless'
              size='small'
            />
          )
        ) : (
          <SearchableSelect
            variant='borderless'
            value={assigneeDisplayValue}
            onValueChange={(value) => {
              setLocalChanges((previous) => ({
                ...previous,
                assigned_to: value,
              }));
              handleFieldChange('assigned_to', value);
            }}
            size='xsmall'
            options={assigneeOptions}
            placeholder='Not Set'
            triggerClassName='w-full text-left'
          />
        )}
      </FieldRow>

      <FieldRow icon={RiCalendarLine} label='Due Date' editable={true}>
        <div className='items-center justify-start gap-2 w-full min-w-0'>
          <Datepicker
            value={dueDate ? parseToDate(dueDate) : null}
            onChange={(date) => {
              const string_ = date ? formatDateToYYYYMMDD(date) : '';
              handleFieldChange('due_date', string_);
            }}
            placeholder='Select a date'
            size='xsmall'
            variant='borderless'
            className='w-full min-h-8 -ml-2'
          />
        </div>
      </FieldRow>

      <FieldRow icon={RiCalendarLine} label='Next Update Date' editable={true}>
        <div className='items-center justify-start gap-2 w-full min-w-0'>
          <Datepicker
            value={customNextUpdateDate ? parseToDate(customNextUpdateDate) : null}
            onChange={(date) => {
              const s = date ? formatDateToYYYYMMDD(date) : '';
              const dueStr = String(dueDate || '')
                .trim()
                .split('T')[0];
              if (s && !isCustomNextUpdateAfterDueDate(dueStr, s)) {
                showErrorToast('Next update date must be after the due date');
                return;
              }
              handleFieldChange('custom_next_update_date', s);
            }}
            min={getMinCustomNextUpdateDate(dueDate)}
            placeholder='Select a date'
            size='xsmall'
            variant='borderless'
            className='w-full min-h-8 -ml-2'
          />
        </div>
      </FieldRow>

      <FieldRow icon={RiFlagLine} label='Priority' editable={true}>
        <SearchableSelect
          variant='borderless'
          value={priority}
          onValueChange={(value) => handleFieldChange('priority', value)}
          size='xsmall'
          options={priorityOptions}
          placeholder='Not Set'
          triggerClassName='w-full text-left'
          renderTrigger={({ selectedOption }) => (
            <Badge.Root
              variant='light'
              color={getPriorityColor(selectedOption?.value || priority)}
              className='text-nowrap'
            >
              {selectedOption ? selectedOption.label : 'Not Set'}
            </Badge.Root>
          )}
          renderOptionLabel={(opt) => (
            <Badge.Root variant='light' color={getPriorityColor(opt.value)} className='text-nowrap'>
              {opt.label}
            </Badge.Root>
          )}
        />
      </FieldRow>
    </div>
  );
}

export function PartnerTaskDrawerTagsSection({
  tagInputVisible,
  setTagInputVisible,
  newTagValue,
  setNewTagValue,
  tags,
  handleAddTag,
  handleRemoveTag,
}) {
  const visibleTags = useMemo(() => {
    if (!Array.isArray(tags)) return [];
    return tags
      .map((tag) => (typeof tag === 'string' ? tag : tag?.name || tag?.label || tag))
      .map((tag) => String(tag ?? '').trim())
      .filter(Boolean);
  }, [tags]);

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-2'>
        <RiPriceTag3Line size={20} className='text-text-sub-500' />
        <span className='label-small text-text-sub-500'>Tags</span>
      </div>

      {visibleTags.length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {visibleTags.map((tagDisplay, index) => {
            return (
              <Tag.Root key={`${tagDisplay}-${index}`} variant='stroke'>
                <span className='text-label-xs text-text-sub-600'>{tagDisplay}</span>
                <Tag.DismissButton
                  onClick={() => handleRemoveTag(index)}
                  aria-label={`Remove ${tagDisplay}`}
                />
              </Tag.Root>
            );
          })}
        </div>
      )}

      <div className='w-full'>
        {tagInputVisible ? (
          <div className='flex items-center gap-2'>
            <Input.Root className='flex-1' size='xsmall'>
              <Input.Wrapper>
                <Input.Input
                  placeholder='Enter tag'
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setTagInputVisible(false);
                      setNewTagValue('');
                    }
                  }}
                  autoFocus
                />
              </Input.Wrapper>
            </Input.Root>
            <Button.Root
              variant='neutral'
              mode='ghost'
              size='xsmall'
              className='bg-error-lighter text-error-base shrink-0 w-8 h-8 p-[6px]'
              onClick={() => {
                setTagInputVisible(false);
                setNewTagValue('');
              }}
              aria-label='Cancel adding tag'
            >
              <Button.Icon as={RiCloseLine} className='size-5' />
            </Button.Root>
            <Button.Root
              variant='neutral'
              mode='ghost'
              size='xsmall'
              className='bg-primary-lighter text-primary-base shrink-0 w-8 h-8 p-[6px]'
              onClick={handleAddTag}
              aria-label='Add tag'
            >
              <Button.Icon as={RiCheckLine} className='size-5' />
            </Button.Root>
          </div>
        ) : (
          <LinkButton.Root
            variant='primary'
            size='small'
            underline
            onClick={() => setTagInputVisible(true)}
            className='w-fit'
          >
            <LinkButton.Icon as={RiAddLine} />
            <span>Add New Tag</span>
          </LinkButton.Root>
        )}
      </div>
    </div>
  );
}

export function PartnerTaskDrawerAttachmentsSection({
  fileInputRef,
  uploadError,
  isUploading,
  attachments,
  attachmentsListRef,
  currentAttachmentIndex,
  imagePreviewErrors,
  getPreviewUrl,
  isImageFile,
  handleImageError,
  handleFileInputChange,
  handleUploadButtonClick,
  handleAttachmentView,
  handleAttachmentDownload,
  handleRemoveAttachment,
  handleAttachmentNav,
}) {
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <RiAttachment2 className='size-5 text-text-sub-500' />
          <span className='label-small text-text-sub-500'>Attachments</span>
        </div>

        <input
          ref={fileInputRef}
          type='file'
          multiple
          className='hidden'
          onChange={handleFileInputChange}
          accept='*/*'
        />
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='xsmall'
          className='gap-1'
          onClick={handleUploadButtonClick}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Button.Icon as={RiLoader2Fill} className='p-0.5 animate-spin' />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Button.Icon as={RiUploadLine} className='p-0.5' />
              <span>Upload Files</span>
            </>
          )}
        </Button.Root>
      </div>
      {uploadError && (
        <div className='rounded-lg border border-error-base bg-error-50 px-3 py-2'>
          <span className='text-paragraph-xs text-error-base'>{uploadError}</span>
        </div>
      )}
      {attachments.length > 0 && (
        <div className='flex flex-col gap-3'>
          <div
            ref={attachmentsListRef}
            className='flex gap-4 overflow-x-auto pb-1 pr-2 snap-x snap-mandatory'
          >
            {attachments.map((attachment, index) => {
              const hasSize =
                attachment.size !== null && attachment.size !== undefined && attachment.size !== '';
              const hasDate = Boolean(attachment.createdAt);

              return (
                <div
                  key={attachment.id || `${attachment.fileName}-${index}`}
                  className='w-[220px] shrink-0 snap-start'
                >
                  <div
                    className='group relative flex h-full flex-col overflow-hidden rounded-[10px] border border-stroke-soft-200 bg-bg-weak-100 cursor-pointer hover:border-stroke-sub-300 transition-colors'
                    onClick={(e) => handleAttachmentView(attachment, e)}
                  >
                    <div className='relative flex size-[176px] w-full items-center justify-center bg-bg-weak-100'>
                      <div
                        className='attachment-actions absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100'
                        onClick={(e) => e.stopPropagation()}
                      >
                        {getPreviewUrl(attachment) && (
                          <CompactButton.Root
                            size='large'
                            variant='ghost'
                            onClick={() => handleAttachmentDownload(attachment)}
                            aria-label={`Download ${attachment.fileName || 'attachment'}`}
                            className='bg-white/90 hover:bg-white'
                          >
                            <CompactButton.Icon as={RiDownloadLine} />
                          </CompactButton.Root>
                        )}
                        {!attachment.isNew && attachment.childRowId && (
                          <CompactButton.Root
                            size='large'
                            variant='ghost'
                            onClick={() =>
                              handleRemoveAttachment(attachment.id, attachment.childRowId)
                            }
                            aria-label={`Delete ${attachment.fileName || 'attachment'}`}
                            className='bg-white/90 hover:bg-white text-error-base'
                          >
                            <CompactButton.Icon as={RiDeleteBinLine} />
                          </CompactButton.Root>
                        )}
                        {attachment.isNew && (
                          <CompactButton.Root
                            size='large'
                            variant='ghost'
                            onClick={() => handleRemoveAttachment(attachment.id)}
                            aria-label={`Remove ${attachment.fileName || 'attachment'}`}
                            className='bg-white/90 hover:bg-white text-error-base'
                          >
                            <CompactButton.Icon as={RiCloseLine} />
                          </CompactButton.Root>
                        )}
                      </div>

                      {isImageFile(attachment) &&
                      getPreviewUrl(attachment) &&
                      !imagePreviewErrors[attachment.id] ? (
                        <img
                          src={getPreviewUrl(attachment)}
                          alt={attachment.fileName}
                          className='h-full w-full object-cover'
                          loading='lazy'
                          onError={() => handleImageError(attachment.id)}
                        />
                      ) : (
                        <div className='flex flex-col items-center justify-center gap-2 px-3 text-center text-text-sub-500'>
                          <div className='flex size-10 items-center justify-center rounded-lg border border-stroke-soft-200 bg-white shadow-sm'>
                            <RiImage2Line className='size-5 text-text-sub-500' />
                          </div>
                          <span className='text-paragraph-xs text-text-sub-500'>
                            Preview unavailable
                          </span>
                        </div>
                      )}
                    </div>
                    <div className='border-t border-stroke-soft-200 bg-white px-4 py-3 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
                      <div className='flex items-center gap-2 min-w-0'>
                        <FileFormatIcon.Root
                          format={attachment.extension || 'FILE'}
                          size='small'
                          color='purple'
                        />
                        <div className='flex flex-col flex-1 min-w-0'>
                          <div className='flex items-center gap-1'>
                            <span
                              className='label-small text-text-main-900 truncate'
                              title={attachment.fileName}
                            >
                              {attachment.fileName}
                            </span>
                            {attachment.isNew && (
                              <Badge.Root
                                variant='light'
                                color='blue'
                                size='small'
                                className='shrink-0'
                              >
                                New
                              </Badge.Root>
                            )}
                          </div>
                          <div className='mt-1 flex items-center gap-2 text-paragraph-xs text-text-sub-500'>
                            {hasSize && <span>{formatFileSize(attachment.size)}</span>}
                            {!hasSize && !hasDate && <span>--</span>}
                          </div>
                          <div className='mt-1 flex items-center gap-2 text-paragraph-xs text-text-sub-500'>
                            {hasDate && <span>{formatDisplayDateTime(attachment.createdAt)}</span>}
                          </div>
                        </div>
                        {!attachment.isNew && attachment.childRowId && (
                          <CompactButton.Root
                            size='small'
                            variant='ghost'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAttachment(attachment.id, attachment.childRowId);
                            }}
                            aria-label={`Delete ${attachment.fileName || 'attachment'}`}
                            className='text-[var(--color-text-sub-500)]'
                          >
                            <CompactButton.Icon as={RiDeleteBinLine} />
                          </CompactButton.Root>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {attachments.length > 1 && (
            <div className='flex items-center justify-center gap-2 text-paragraph-xs text-text-sub-500'>
              <CompactButton.Root
                size='large'
                variant='ghost'
                onClick={() => handleAttachmentNav(-1)}
                disabled={currentAttachmentIndex === 0}
                className='shrink-0'
              >
                <CompactButton.Icon as={RiArrowLeftSLine} />
              </CompactButton.Root>
              <span className='min-w-[52px] text-center'>
                {currentAttachmentIndex + 1}/{attachments.length}
              </span>
              <CompactButton.Root
                size='large'
                variant='ghost'
                onClick={() => handleAttachmentNav(1)}
                disabled={currentAttachmentIndex === attachments.length - 1}
                className='shrink-0'
              >
                <CompactButton.Icon as={RiArrowRightSLine} />
              </CompactButton.Root>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
