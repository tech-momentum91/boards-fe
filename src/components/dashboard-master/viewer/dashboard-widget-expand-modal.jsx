import React, { Suspense, lazy } from 'react';

import * as Modal from '@/components/ui/modal';

const DashboardWidgetPreview = lazy(
  () => import('@/components/dashboard-master/viewer/dashboard-widget-preview'),
);

const EXPAND_MODAL_CONTENT_CLASS =
  'flex !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none flex-col gap-0 overflow-hidden !rounded-none border-0 !p-0 shadow-none bg-bg-white-0';

const EXPAND_MODAL_OVERLAY_CLASS = 'z-[200] !items-stretch !justify-stretch gap-0 !p-0';

function ExpandPreviewFallback() {
  return (
    <div className='flex flex-1 items-center justify-center text-text-sub-500'>
      <div className='animate-pulse paragraph-small'>Loading chart…</div>
    </div>
  );
}

/** Fullscreen expand — KPI uses canvas tile; other charts fill the viewport. */
export function DashboardWidgetExpandModal({
  open,
  onOpenChange,
  title,
  summary = '',
  chartType = 'vertical_bar',
  chartData,
  loading = false,
}) {
  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className={EXPAND_MODAL_CONTENT_CLASS}
        showClose
        overlayClassName={EXPAND_MODAL_OVERLAY_CLASS}
      >
        <div className='flex h-[88px] shrink-0 items-center border-b border-stroke-soft-200 px-8'>
          <h2 className='label-large truncate text-text-strong-950'>{title || 'Chart'}</h2>
        </div>

        <Suspense fallback={<ExpandPreviewFallback />}>
          <DashboardWidgetPreview
            variant='expand'
            title={title}
            summary={summary}
            chartType={chartType}
            chartData={chartData}
            loading={loading}
            className='min-h-0 flex-1'
          />
        </Suspense>
      </Modal.Content>
    </Modal.Root>
  );
}
