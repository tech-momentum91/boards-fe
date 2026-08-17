import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  RiAddLine,
  RiCalendarLine,
  RiCloseLine,
  RiCollageLine,
  // RiDeleteBinLine,
  RiFileLine,
  RiFlagLine,
  RiImageLine,
  RiPriceTag3Line,
  RiStackLine,
  RiStickyNoteLine,
  RiUserLine,
} from 'react-icons/ri';
import { useDispatch } from 'react-redux';
import ProjectBadgeSelect, {
  formatProjectPriorityLabel,
} from '@/components/projects/shared/project-badge-select';
import ProjectDrawerAttachmentsSection from '@/components/projects/shared/project-drawer-attachments-section';
import ProjectDrawerTagsSection from '@/components/projects/shared/project-drawer-tags-section';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import ProjectSelectionComments from '@/components/projects/project-selection/project-selection-comments';
import {
  AddCustomColumnPopover,
  CustomFieldCell,
} from '@/pages/profile/project-master/selection-category-table-shared';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Drawer from '@/components/ui/drawer';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { InlineEditableRichEditor } from '@/components/event-management/inline-editable-fields';
import { Datepicker } from '@/components/ui/datepicker';
import {
  PROJECT_DETAIL_DELIVERY_STATUS_OPTIONS,
  PROJECT_DETAIL_PO_STATUS_OPTIONS,
  PROJECT_DETAIL_SELECTION_PRIORITY_OPTIONS,
  PROJECT_DETAIL_SELECTION_STATUS_OPTIONS,
  PROJECT_DELIVERY_STATUS_META,
  PROJECT_PO_STATUS_META,
  PROJECT_SELECTION_STATUS_META,
  colorForLayoutPriority,
} from '@/components/projects/constants';
import { parseToDate } from '@/utils/date-utils';
import { normalizeTaskAssigneeEntry } from '@/utils/task-utils';
import {
  resolveItemExpSelectionDate,
  resolveItemSelectionStatus,
} from '@/components/projects/project-selection/project-selection-helpers';
import {
  DeliveryChallanCell,
  DeliveryPhotoCell,
} from '@/components/projects/project-selection/project-selection-delivery-cells';
import { fetchProductCategoryOptions } from '@/redux/projectMasterSlice';

function getVendorAssigneeValue(vendor) {
  const fromList = (vendor?.assignees ?? [])
    .map((entry) =>
      normalizeTaskAssigneeEntry(
        typeof entry === 'string'
          ? entry
          : {
              assignee: entry.assignee || entry.id,
              value: entry.assignee || entry.id,
              label: entry.label || entry.full_name || entry.initials || entry.assignee || entry.id,
              full_name: entry.full_name || entry.label || entry.initials,
              user_image: entry.user_image || entry.image,
            },
      ),
    )
    .filter(Boolean);
  if (fromList.length > 0) return fromList;

  if (vendor?.assignee) {
    const normalized = normalizeTaskAssigneeEntry({
      assignee: vendor.assignee,
      value: vendor.assignee,
      label: vendor.assignee,
    });
    return normalized ? [normalized] : [];
  }
  return [];
}

function getCustomFieldValue(vendor, column) {
  const fieldValue = (vendor?.field_values ?? []).find(
    (entry) => entry.column_label === column.column_label,
  );
  if (!fieldValue) return '';
  return column.column_type === 'Image'
    ? fieldValue.attachment || ''
    : fieldValue.field_value || '';
}

export default function ProjectSelectionViewDrawer({
  open,
  onOpenChange,
  vendor,
  viewMode = 'category',
  categoryRow = null,
  projectId,
  selectionId,
  onUpdateVendor,
  onAddColumn,
  onUploadAttachments,
  isUploadingAttachments = false,
  commentsData = {},
  commentsLoading = false,
  commentsFetchStatus = 'idle',
  onAddComment,
  onRefreshComments,
}) {
  const isItemView = viewMode === 'item';
  const dispatch = useDispatch();
  const [titleDraft, setTitleDraft] = useState(vendor?.title ?? '');
  const [productOptions, setProductOptions] = useState([]);

  useEffect(() => {
    setTitleDraft(vendor?.title ?? '');
  }, [vendor?.id, vendor?.title]);

  useEffect(() => {
    if (!open || isItemView) return undefined;
    let cancelled = false;
    dispatch(fetchProductCategoryOptions({}))
      .unwrap()
      .then((data) => {
        if (!cancelled) setProductOptions(data?.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setProductOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, isItemView, open]);

  const attachments = useMemo(() => vendor?.attachments ?? [], [vendor?.attachments]);
  const customColumns = useMemo(() => vendor?.custom_columns ?? [], [vendor?.custom_columns]);

  const handleCustomFieldChange = useCallback(
    (column, value) => {
      if (!vendor) return;
      const previous = getCustomFieldValue(vendor, column);
      if (String(previous ?? '') === String(value ?? '')) return;

      const fieldValues = [...(vendor.field_values ?? [])];
      const index = fieldValues.findIndex((entry) => entry.column_label === column.column_label);
      const entry = {
        column_label: column.column_label,
        column_type: column.column_type,
        field_value: column.column_type === 'Image' ? '' : value,
        attachment: column.column_type === 'Image' ? value : '',
      };
      if (index >= 0) {
        fieldValues[index] = { ...fieldValues[index], ...entry };
      } else {
        fieldValues.push(entry);
      }
      onUpdateVendor?.({ field_values: fieldValues });
    },
    [onUpdateVendor, vendor],
  );

  const commitTitle = useCallback(() => {
    const next = String(titleDraft ?? '').trim();
    const current = String(vendor?.title ?? vendor?.selection_category_name ?? '').trim();
    if (next === current) return;
    onUpdateVendor?.({ selection_category_name: titleDraft });
  }, [onUpdateVendor, titleDraft, vendor?.selection_category_name, vendor?.title]);

  const commitQty = useCallback(
    (event) => {
      const next = String(event?.target?.value ?? '');
      const current = String(vendor?.qty ?? '1');
      if (next === current) return;
      onUpdateVendor?.({ qty: next });
    },
    [onUpdateVendor, vendor?.qty],
  );

  const handleAddColumnClick = useCallback(
    ({ label, columnType }) => {
      if (!categoryRow?.id || !onAddColumn) return;
      onAddColumn(categoryRow.id, { label, columnType });
    },
    [categoryRow?.id, onAddColumn],
  );

  if (!open) return null;

  const orderCategoryLabel =
    categoryRow?.order_category_label || categoryRow?.order_category || '—';

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content
        title={vendor?.title ?? 'Selection'}
        className='h-full w-full max-w-[1200px] overflow-hidden p-0'
      >
        <div className='flex h-full flex-col'>
          <div className='flex items-center justify-end border-b border-stroke-soft-200 px-6 py-3'>
            <div className='flex items-center gap-2'>
              {projectId && vendor?.task ? (
                <ProjectFollowersPopover
                  projectId={projectId}
                  scopeMode='leaf'
                  section='selection'
                  referenceDoctype='Task'
                  referenceName={vendor.task}
                  activityLabel='selection'
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
                  aria-label='Close selection drawer'
                >
                  <Button.Icon as={RiCloseLine} />
                </Button.Root>
              </Drawer.Close>
            </div>
          </div>

          {!vendor ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              Loading selection details...
            </div>
          ) : (
            <div className='grid min-h-0 flex-1 grid-cols-[minmax(360px,422px)_minmax(0,1fr)]'>
              <div className='min-w-0 overflow-y-auto border-r border-stroke-soft-200 px-6 py-5'>
                <div className='mt-1'>
                  {isItemView ? (
                    <h2 className='text-title-h5 text-text-strong-950'>{vendor.title ?? 'Item'}</h2>
                  ) : (
                    <Input.Root size='medium' variant='borderless' className='flex-1'>
                      <Input.Wrapper>
                        <Input.Input
                          value={titleDraft}
                          onBlur={commitTitle}
                          onChange={(event) => setTitleDraft(event.target.value)}
                          className='text-title-h5'
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  )}
                </div>

                <div className='mt-4 overflow-hidden divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200'>
                  <FieldRow icon={RiUserLine} label='Assignee'>
                    <AssigneeMultiSelect
                      value={getVendorAssigneeValue(vendor)}
                      onBlur={(nextValue) =>
                        onUpdateVendor?.({
                          assignees: Array.isArray(nextValue) ? nextValue : [],
                        })
                      }
                      placeholder='Select'
                      maxVisibleAvatars={3}
                      variant='borderless'
                      projectId={projectId}
                      size='xsmall'
                    />
                  </FieldRow>
                  <FieldRow
                    icon={RiPriceTag3Line}
                    label={isItemView ? 'Product Sub-category' : 'Product Category'}
                  >
                    {isItemView ? (
                      <span className='text-paragraph-sm text-text-sub-500'>
                        {vendor.product_sub_category}
                      </span>
                    ) : (
                      <Select.Root
                        value={vendor.product_category || undefined}
                        onValueChange={(value) => onUpdateVendor?.({ product_category: value })}
                        size='xsmall'
                        variant='borderless'
                      >
                        <Select.Trigger className='h-8 min-w-[160px]'>
                          <Select.Value placeholder='Select' />
                        </Select.Trigger>
                        <Select.Content>
                          {productOptions.map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                              {option.label || option.value}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  </FieldRow>
                  {!isItemView ? (
                    <FieldRow icon={RiPriceTag3Line} label='Order Category'>
                      <Badge.Root variant='light' color='blue' size='small' className='uppercase'>
                        {orderCategoryLabel}
                      </Badge.Root>
                    </FieldRow>
                  ) : null}
                  <FieldRow icon={RiCalendarLine} label='Exp. Selection Date'>
                    <Datepicker
                      value={
                        parseToDate(
                          isItemView
                            ? resolveItemExpSelectionDate(vendor, categoryRow)
                            : vendor.exp_selection_date,
                        ) ?? undefined
                      }
                      onChange={(value) =>
                        onUpdateVendor?.({
                          exp_selection_date: value ? format(value, 'yyyy-MM-dd') : '',
                        })
                      }
                      size='xsmall'
                      variant='borderless'
                      placeholder='Select'
                      className='h-8 min-w-[120px]'
                    />
                  </FieldRow>
                  <FieldRow icon={RiPriceTag3Line} label='Selection Status'>
                    <ProjectStatusDropdown
                      value={
                        isItemView
                          ? resolveItemSelectionStatus(vendor, categoryRow)
                          : vendor.selection_status || 'Pending'
                      }
                      onValueChange={(value) => onUpdateVendor?.({ selection_status: value })}
                      statusOptions={PROJECT_DETAIL_SELECTION_STATUS_OPTIONS}
                      statusMetaMap={PROJECT_SELECTION_STATUS_META}
                      size='xsmall'
                    />
                  </FieldRow>
                  {isItemView ? (
                    <>
                      <FieldRow icon={RiFlagLine} label='Long Lead'>
                        <Checkbox.Root
                          checked={Boolean(vendor.long_lead)}
                          onCheckedChange={(checked) =>
                            onUpdateVendor?.({ long_lead: Boolean(checked) })
                          }
                        />
                      </FieldRow>
                      <FieldRow icon={RiStackLine} label='QTY'>
                        <Input.Root size='xsmall' variant='borderless'>
                          <Input.Wrapper>
                            <Input.Input defaultValue={vendor.qty ?? '1'} onBlur={commitQty} />
                          </Input.Wrapper>
                        </Input.Root>
                      </FieldRow>
                      {customColumns.map((column) => (
                        <FieldRow
                          key={column.column_id || column.column_label}
                          icon={RiCollageLine}
                          label={column.column_label}
                        >
                          <CustomFieldCell
                            column={column}
                            value={getCustomFieldValue(vendor, column)}
                            onUploadFile={
                              column.column_type === 'Image'
                                ? (file) =>
                                    onUpdateVendor?.({
                                      custom_image: {
                                        column_label: column.column_label,
                                        file,
                                      },
                                    })
                                : undefined
                            }
                            onChange={(value) => handleCustomFieldChange(column, value)}
                          />
                        </FieldRow>
                      ))}
                      <FieldRow icon={RiAddLine} label='Add Column'>
                        <AddCustomColumnPopover onAdd={handleAddColumnClick} />
                      </FieldRow>
                    </>
                  ) : (
                    <>
                      <FieldRow icon={RiCalendarLine} label='Exp. PO Date'>
                        <Datepicker
                          value={parseToDate(vendor.exp_po_date) ?? undefined}
                          onChange={(value) =>
                            onUpdateVendor?.({
                              exp_po_date: value ? format(value, 'yyyy-MM-dd') : '',
                            })
                          }
                          size='xsmall'
                          variant='borderless'
                          placeholder='Select'
                          className='h-8 min-w-[120px]'
                        />
                      </FieldRow>
                      <FieldRow icon={RiPriceTag3Line} label='PO Status'>
                        <ProjectStatusDropdown
                          value={vendor.po_status || 'Pending'}
                          onValueChange={(value) => onUpdateVendor?.({ po_status: value })}
                          statusOptions={PROJECT_DETAIL_PO_STATUS_OPTIONS}
                          statusMetaMap={PROJECT_PO_STATUS_META}
                          size='xsmall'
                        />
                      </FieldRow>
                      <FieldRow icon={RiCalendarLine} label='Exp. Delivery Date'>
                        <Datepicker
                          value={parseToDate(vendor.exp_delivery_date) ?? undefined}
                          onChange={(value) =>
                            onUpdateVendor?.({
                              exp_delivery_date: value ? format(value, 'yyyy-MM-dd') : '',
                            })
                          }
                          size='xsmall'
                          variant='borderless'
                          placeholder='Select'
                          className='h-8 min-w-[120px]'
                        />
                      </FieldRow>
                      <FieldRow icon={RiPriceTag3Line} label='Delivery Status'>
                        <ProjectStatusDropdown
                          value={vendor.delivery_status || 'Pending'}
                          onValueChange={(value) => onUpdateVendor?.({ delivery_status: value })}
                          statusOptions={PROJECT_DETAIL_DELIVERY_STATUS_OPTIONS}
                          statusMetaMap={PROJECT_DELIVERY_STATUS_META}
                          size='xsmall'
                        />
                      </FieldRow>
                      <FieldRow icon={RiImageLine} label='Delivery Photo'>
                        <DeliveryPhotoCell
                          photoUrl={vendor.delivery_photo_url || vendor.delivery_photo || ''}
                          onChange={(value) => onUpdateVendor?.({ delivery_photo: value })}
                        />
                      </FieldRow>
                      <FieldRow icon={RiFileLine} label='Delivery Challan'>
                        <DeliveryChallanCell
                          challan={vendor.delivery_challan}
                          onChange={(value) => onUpdateVendor?.({ delivery_challan: value })}
                        />
                      </FieldRow>
                      <FieldRow icon={RiFlagLine} label='Priority'>
                        <ProjectBadgeSelect
                          value={vendor.priority}
                          onValueChange={(value) => onUpdateVendor?.({ priority: value })}
                          options={PROJECT_DETAIL_SELECTION_PRIORITY_OPTIONS}
                          colorFn={colorForLayoutPriority}
                          formatLabel={formatProjectPriorityLabel}
                        />
                      </FieldRow>
                    </>
                  )}
                </div>

                <section className='mt-6'>
                  <div className='mb-3 flex items-center gap-2 text-label-md text-text-sub-500'>
                    <RiStickyNoteLine className='size-5 text-text-soft-400' />
                    Description
                  </div>
                  <InlineEditableRichEditor
                    value={vendor.description ?? ''}
                    onSave={(value) => onUpdateVendor?.({ description: value })}
                  />
                </section>

                <ProjectDrawerTagsSection
                  tags={vendor.tags ?? []}
                  resetKey={vendor.id}
                  onTagsChange={(tags) => onUpdateVendor?.({ tags })}
                />

                <ProjectDrawerAttachmentsSection
                  attachments={attachments}
                  onUpload={(mode, files) =>
                    onUploadAttachments?.(vendor.task, mode, files, vendor)
                  }
                  uploadDisabled={isUploadingAttachments || !vendor.task}
                  emptyLabel='Drop your files here to upload'
                />
              </div>

              <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
                {selectionId ? (
                  <ProjectSelectionComments
                    selectionId={selectionId}
                    commentsData={commentsData}
                    loading={commentsLoading}
                    fetchStatus={commentsFetchStatus}
                    onAddComment={onAddComment}
                    onRefreshData={onRefreshComments}
                  />
                ) : (
                  <div className='flex min-h-[320px] flex-1 items-center justify-center px-6 text-center text-paragraph-sm text-text-sub-600'>
                    Selection activity will appear here once the project selection is loaded.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
