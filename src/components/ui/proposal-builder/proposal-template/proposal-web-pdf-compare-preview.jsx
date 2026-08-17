import React, { memo, useEffect, useMemo, useRef } from 'react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

import {
  ProposalPreviewChromeContext,
  ProposalPreviewDeckContext,
} from '@/components/ui/proposal-builder/proposal-template/context/proposal-preview-zoom-context';
import { useProposalPreviewPageNav } from '@/components/ui/proposal-builder/proposal-template/hooks/use-proposal-preview-page-nav';
import {
  PROPOSAL_PAGE_HEIGHT,
  PROPOSAL_PAGE_WIDTH,
  PROPOSAL_ZOOM_MAX,
  PROPOSAL_ZOOM_MIN,
  useProposalPreviewZoom,
} from '@/components/ui/proposal-builder/proposal-template/hooks/use-proposal-preview-zoom';
import ProposalPdfPreview from '@/components/ui/proposal-builder/proposal-template/pdf/proposal-pdf-preview';
import ProposalPreviewZoomBar from '@/components/ui/proposal-builder/proposal-template/proposal-preview-zoom-bar';
import ProposalTemplatePreview from '@/components/ui/proposal-builder/proposal-template/proposal-template-preview';

/** Isolated from zoom context so pan/scroll on web side does not re-render PDFViewer. */
const ComparePdfColumn = memo(
  ({
    content,
    contentByInstanceId,
    pageInstances,
    inventory,
    primaryColor,
    clientAiTheme,
    title,
    visiblePages,
    layoutInventory,
  }) => {
    return (
      <div className='proposal-web-pdf-compare__column proposal-web-pdf-compare__column--pdf'>
        <div className='proposal-web-pdf-compare__header'>
          <span className='proposal-web-pdf-compare__header-title'>PDF export</span>
          <span className='proposal-web-pdf-compare__header-meta'>
            {visiblePages.length} pages · react-pdf
          </span>
        </div>
        <div className='proposal-web-pdf-compare__viewport proposal-web-pdf-compare__viewport--pdf'>
          <ProposalPdfPreview
            className='proposal-web-pdf-compare__pdf'
            content={content}
            contentByInstanceId={contentByInstanceId}
            pageInstances={pageInstances}
            primaryColor={primaryColor}
            clientAiTheme={clientAiTheme}
            title={title}
            visiblePages={visiblePages}
            layoutInventory={layoutInventory}
            inventory={inventory}
            showToolbar={false}
          />
        </div>
      </div>
    );
  },
);

ComparePdfColumn.displayName = 'ComparePdfColumn';

/**
 * Debug view — all enabled pages side by side: HTML (left) vs react-pdf export (right).
 * Shares zoom + page navigation with the main builder preview.
 */
export default function ProposalWebPdfComparePreview({
  content,
  contentByInstanceId,
  pageInstances = null,
  primaryColor,
  clientAiTheme = false,
  title,
  visiblePages = null,
  initialPageId = null,
  pageLayoutKey = '',
  layoutInventory = [],
  inventory = [],
  readOnly = true,
  onContentChange,
}) {
  const instancePages = useMemo(
    () => (Array.isArray(pageInstances) ? pageInstances.map((page) => page.id) : null),
    [pageInstances],
  );
  const pages = instancePages ?? visiblePages ?? [];
  const totalPages = pages.length || 1;
  const lastSidebarPageRef = useRef(null);

  const zoom = useProposalPreviewZoom({ enabled: totalPages > 0 });
  const pageNav = useProposalPreviewPageNav({
    enabled: totalPages > 0,
    totalPages,
    pageLayoutKey,
    pageIds: instancePages,
    wrapperEl: zoom.wrapperEl,
    transformRef: zoom.transformRef,
    beginProgrammaticNav: zoom.beginProgrammaticNav,
  });

  const deckContextValue = useMemo(
    () => ({
      registerPageRef: pageNav.registerPageRef,
      showPageChrome: true,
      useCanvasZoom: true,
      exportFullSize: false,
    }),
    [pageNav.registerPageRef],
  );

  const chromeContextValue = useMemo(
    () => ({
      zoomPercent: zoom.zoomPercent,
      zoomPercentInput: zoom.zoomPercentInput,
      zoomMode: zoom.zoomMode,
      minPercent: zoom.minPercent,
      maxPercent: zoom.maxPercent,
      zoomIn: zoom.zoomIn,
      zoomOut: zoom.zoomOut,
      fitPage: zoom.fitPage,
      fillPage: zoom.fillPage,
      handleSliderChange: zoom.handleSliderChange,
      handleZoomPercentInputChange: zoom.handleZoomPercentInputChange,
      commitZoomPercentInput: zoom.commitZoomPercentInput,
      currentPage: pageNav.currentPage,
      totalPages: pageNav.totalPages,
      pageInput: pageNav.pageInput,
      handlePageInputChange: pageNav.handlePageInputChange,
      commitPageInput: pageNav.commitPageInput,
      goToPreviousPage: pageNav.goToPreviousPage,
      goToNextPage: pageNav.goToNextPage,
    }),
    [
      zoom.zoomPercent,
      zoom.zoomPercentInput,
      zoom.zoomMode,
      zoom.minPercent,
      zoom.maxPercent,
      zoom.zoomIn,
      zoom.zoomOut,
      zoom.fitPage,
      zoom.fillPage,
      zoom.handleSliderChange,
      zoom.handleZoomPercentInputChange,
      zoom.commitZoomPercentInput,
      pageNav.currentPage,
      pageNav.totalPages,
      pageNav.pageInput,
      pageNav.handlePageInputChange,
      pageNav.commitPageInput,
      pageNav.goToPreviousPage,
      pageNav.goToNextPage,
    ],
  );

  // Jump web preview only when user picks a page in the sidebar — not while scrolling.
  useEffect(() => {
    if (!initialPageId || !pages.includes(initialPageId)) return;
    if (lastSidebarPageRef.current === initialPageId) return;
    lastSidebarPageRef.current = initialPageId;

    const timer = window.setTimeout(() => {
      pageNav.scrollToPage(initialPageId);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [initialPageId, pages, pageNav.scrollToPage]);

  useEffect(() => {
    lastSidebarPageRef.current = null;
  }, [pageLayoutKey]);

  if (pages.length === 0) {
    return (
      <div className='proposal-web-pdf-compare proposal-web-pdf-compare--empty'>
        <p className='text-paragraph-small text-text-soft-400'>No pages selected.</p>
      </div>
    );
  }

  return (
    <div className='proposal-web-pdf-compare' data-proposal-web-pdf-compare>
      <div className='proposal-web-pdf-compare__columns'>
        <ProposalPreviewDeckContext.Provider value={deckContextValue}>
          <div className='proposal-web-pdf-compare__column proposal-web-pdf-compare__column--web'>
            <div className='proposal-web-pdf-compare__header'>
              <span className='proposal-web-pdf-compare__header-title'>Web preview</span>
              <span className='proposal-web-pdf-compare__header-meta'>
                {totalPages} pages · HTML/CSS
              </span>
            </div>
            <div
              ref={zoom.containerRef}
              className='proposal-web-pdf-compare__viewport proposal-preview-viewport'
            >
              <TransformWrapper
                ref={zoom.transformRef}
                minScale={PROPOSAL_ZOOM_MIN}
                maxScale={PROPOSAL_ZOOM_MAX}
                limitToBounds
                centerZoomedOut
                alignmentAnimation={{ sizeX: 0, sizeY: 0, animationTime: 200 }}
                onPanningStop={zoom.handlePanningStop}
                doubleClick={{ disabled: true }}
                wheel={{
                  activationKeys: zoom.isCmdOrCtrlZoomWheelActive,
                  step: 0.005,
                }}
                trackPadPanning={{ disabled: false }}
                panning={{
                  allowLeftClickPan: true,
                  allowMiddleClickPan: true,
                  excluded: [
                    'input',
                    'button',
                    'textarea',
                    'proposal-editable-text',
                    'proposal-editable-table',
                  ],
                }}
                onTransform={zoom.handleTransform}
                onInit={zoom.handleInit}
              >
                <TransformComponent
                  wrapperClass='proposal-preview-transform-wrapper'
                  contentClass='proposal-preview-transform-content'
                  wrapperStyle={{ width: '100%', height: '100%' }}
                  contentStyle={{
                    width: PROPOSAL_PAGE_WIDTH,
                    minHeight: PROPOSAL_PAGE_HEIGHT,
                    position: 'relative',
                  }}
                >
                  <ProposalTemplatePreview
                    content={content}
                    contentByInstanceId={contentByInstanceId}
                    onContentChange={onContentChange}
                    readOnly={readOnly}
                    previewMode='web'
                    primaryColor={primaryColor}
                    pageInstances={pageInstances}
                    visiblePages={visiblePages}
                    layoutInventory={layoutInventory}
                    inventory={inventory}
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>
          </div>
        </ProposalPreviewDeckContext.Provider>

        <ComparePdfColumn
          content={content}
          contentByInstanceId={contentByInstanceId}
          pageInstances={pageInstances}
          inventory={inventory}
          primaryColor={primaryColor}
          clientAiTheme={clientAiTheme}
          title={title}
          visiblePages={visiblePages ?? []}
          layoutInventory={layoutInventory}
        />
      </div>

      <ProposalPreviewChromeContext.Provider value={chromeContextValue}>
        <ProposalPreviewZoomBar {...chromeContextValue} />
      </ProposalPreviewChromeContext.Provider>
    </div>
  );
}
