import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import ProjectLayoutFloorEditor from '@/components/projects/layouts/project-layout-floor-editor';
import { layoutHasUploadedImage } from '@/components/projects/layouts/project-layout-upload-version-button';
import * as Button from '@/components/ui/button';
import {
  fetchProjectLayoutDetail,
  selectProjectLayoutDetail,
  selectProjectLayoutDetailError,
  selectProjectLayoutDetailLoading,
} from '@/redux/projectSlice';
import { extractErrorMessage } from '@/utils/error-utils';

export default function ProjectLayoutEditorPage() {
  const dispatch = useDispatch();
  const { id: projectId, layoutId } = useParams();

  const layout = useSelector(selectProjectLayoutDetail);
  const isLoading = useSelector(selectProjectLayoutDetailLoading);
  const error = useSelector(selectProjectLayoutDetailError);

  const loadLayout = useCallback(() => {
    const normalizedLayoutId = String(layoutId ?? '').trim();
    if (!normalizedLayoutId) return;

    dispatch(fetchProjectLayoutDetail(normalizedLayoutId)).catch(() => {
      // Error state is stored in Redux; toast is optional for full-page editor.
    });
  }, [dispatch, layoutId]);

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  const errorMessage = error
    ? extractErrorMessage(error, 'Failed to load project layout')
    : !String(layoutId ?? '').trim()
      ? 'Layout ID is required'
      : null;

  return (
    <div className='flex h-dvh w-dvw flex-col overflow-hidden bg-bg-white-0'>
      <div className='min-h-0 flex-1 overflow-hidden p-4'>
        {isLoading ? (
          <div className='flex h-full items-center justify-center rounded-xl border border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-500'>
            Loading layout…
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <div className='flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-error-lighter bg-bg-weak-50 px-6 text-center'>
            <p className='text-paragraph-sm text-error-base'>{errorMessage}</p>
            {String(layoutId ?? '').trim() ? (
              <Button.Root
                type='button'
                variant='primary'
                mode='filled'
                size='small'
                onClick={loadLayout}
              >
                Try again
              </Button.Root>
            ) : null}
          </div>
        ) : null}

        {!isLoading && !errorMessage && layout ? (
          <ProjectLayoutFloorEditor
            layout={layout}
            projectId={projectId}
            onLayoutRefresh={loadLayout}
            showExpand={false}
            allowUpload={!layoutHasUploadedImage(layout)}
            fillContainer
            className='h-full'
          />
        ) : null}
      </div>
    </div>
  );
}
