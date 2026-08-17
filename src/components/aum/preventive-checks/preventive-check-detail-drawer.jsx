import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { RiChat2Line, RiCloseLine } from 'react-icons/ri';

import { clearMaintenanceActivities } from '@/redux/aumMaintenanceSlice';
import AumMaintenanceComments from '@/components/aum/shared/aum-maintenance-comments';
import PreventiveCheckDetailPanel from '@/components/aum/preventive-checks/preventive-check-detail-panel';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';

const PreventiveCheckDetailDrawer = ({
  open,
  onOpenChange,
  row,
  rows = [],
  onStatusChange,
  onConditionChange,
  onPriorityChange,
  onAssigneeChange,
}) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  const rowIndex = useMemo(() => rows.findIndex((item) => item.id === row?.id), [row?.id, rows]);

  const bumpActivityRefresh = useCallback(() => {
    setActivityRefreshKey((value) => value + 1);
  }, []);

  const handleDrawerOpenChange = useCallback(
    (nextOpen) => {
      if (!nextOpen && row?.id) {
        dispatch(clearMaintenanceActivities(row.id));
      }
      onOpenChange?.(nextOpen);
    },
    [dispatch, onOpenChange, row?.id],
  );

  const handleStatusChange = useCallback(
    async (...args) => {
      await onStatusChange?.(...args);
      bumpActivityRefresh();
    },
    [bumpActivityRefresh, onStatusChange],
  );

  const handleConditionChange = useCallback(
    async (...args) => {
      await onConditionChange?.(...args);
      bumpActivityRefresh();
    },
    [bumpActivityRefresh, onConditionChange],
  );

  const handlePriorityChange = useCallback(
    async (...args) => {
      await onPriorityChange?.(...args);
      bumpActivityRefresh();
    },
    [bumpActivityRefresh, onPriorityChange],
  );

  const handleAssigneeChange = useCallback(
    async (...args) => {
      await onAssigneeChange?.(...args);
      bumpActivityRefresh();
    },
    [bumpActivityRefresh, onAssigneeChange],
  );

  const handleUploadAttachments = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAttachmentSelect = useCallback(async (event) => {
    const files = [...(event.target.files || [])];
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      // Attachment upload in comments panel uses CommentInput; keep file picker for detail panel parity.
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  if (!row) return null;

  return (
    <Drawer.Root open={open} onOpenChange={handleDrawerOpenChange}>
      <Drawer.Content className='max-w-[1200px]'>
        <Drawer.Header
          className='border-b border-stroke-soft-200 px-6 py-3'
          showCloseButton={false}
        >
          <div className='flex w-full items-center justify-between gap-3'>
            <div className='min-w-0'>
              <Drawer.Title className='truncate'>{row.name}</Drawer.Title>
              {rowIndex >= 0 ? (
                <p className='text-label-xs text-text-soft-400'>
                  {rowIndex + 1} of {rows.length}
                </p>
              ) : null}
            </div>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={() => handleDrawerOpenChange(false)}
              aria-label='Close preventive check details'
            >
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex min-h-0 flex-1 flex-col overflow-hidden p-0'>
          <div className='flex min-h-0 flex-1'>
            <div className='w-[460px] shrink-0 overflow-y-auto border-r border-stroke-soft-200 min-h-0'>
              <PreventiveCheckDetailPanel
                row={row}
                onStatusChange={handleStatusChange}
                onConditionChange={handleConditionChange}
                onPriorityChange={handlePriorityChange}
                onAssigneeChange={handleAssigneeChange}
                onUploadAttachments={handleUploadAttachments}
                isUploading={isUploading}
              />
              <input
                ref={fileInputRef}
                type='file'
                multiple
                className='hidden'
                onChange={handleAttachmentSelect}
              />
            </div>

            <div className='flex min-w-0 flex-1 flex-col overflow-hidden bg-bg-white-0'>
              <div className='flex shrink-0 items-center gap-2 border-b border-stroke-soft-200 px-6 py-4'>
                <RiChat2Line className='size-[18px] text-text-sub-500' aria-hidden />
                <span className='text-label-sm font-medium text-text-sub-600'>Comments</span>
              </div>

              <AumMaintenanceComments key={`${row.id}-${activityRefreshKey}`} amlId={row.id} />
            </div>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default PreventiveCheckDetailDrawer;
