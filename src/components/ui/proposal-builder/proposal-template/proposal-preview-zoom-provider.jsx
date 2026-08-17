import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
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
import { PROPOSAL_PAGE_COUNT } from '@/components/ui/proposal-builder/proposal-template/proposal-content';
import ProposalPreviewZoomBar from '@/components/ui/proposal-builder/proposal-template/proposal-preview-zoom-bar';
import { cn } from '@/utils/cn';

const ProposalPreviewZoomProvider = forwardRef(
  (
    {
      children,
      exportRef,
      className,
      showZoomBar = true,
      showPageChrome = true,
      deckEmpty = false,
      skipZoom = false,
      totalPages = PROPOSAL_PAGE_COUNT,
      pageLayoutKey = '',
      pageIds = null,
    },
    ref,
  ) => {
    const [exportFullSize, setExportFullSize] = useState(false);
    const zoom = useProposalPreviewZoom({ enabled: !deckEmpty && !skipZoom, exportFullSize });
    const pageNav = useProposalPreviewPageNav({
      enabled: !deckEmpty,
      totalPages: Array.isArray(pageIds) ? pageIds.length : totalPages,
      pageLayoutKey,
      pageIds,
      wrapperEl: zoom.wrapperEl,
      transformRef: zoom.transformRef,
      beginProgrammaticNav: zoom.beginProgrammaticNav,
    });

    useImperativeHandle(ref, () => ({
      setExportFullSize,
      scrollToPage: pageNav.scrollToPage,
    }));

    // Stable: only fields pages need. Must not depend on zoomPercent / currentPage.
    const deckContextValue = useMemo(
      () => ({
        registerPageRef: pageNav.registerPageRef,
        showPageChrome: !deckEmpty && showPageChrome,
        useCanvasZoom: !deckEmpty,
        exportFullSize,
      }),
      [pageNav.registerPageRef, deckEmpty, showPageChrome, exportFullSize],
    );

    // Volatile: zoom bar only — scroll/zoom/page updates stay out of the deck.
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

    return (
      <ProposalPreviewDeckContext.Provider value={deckContextValue}>
        <ProposalPreviewChromeContext.Provider value={chromeContextValue}>
          <div
            ref={exportRef}
            lang='en'
            className={cn(
              'proposal-preview-workspace flex min-h-0 flex-1 flex-col overflow-hidden',
              className,
            )}
          >
            <div
              ref={zoom.containerRef}
              className='proposal-preview-viewport min-h-0 flex-1 overflow-hidden'
            >
              {deckEmpty || skipZoom ? (
                children
              ) : exportFullSize ? (
                <div className='proposal-preview-zoom-canvas'>{children}</div>
              ) : (
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
                    {children}
                  </TransformComponent>
                </TransformWrapper>
              )}
            </div>
            {showZoomBar && !deckEmpty && !skipZoom ? (
              <ProposalPreviewZoomBar {...chromeContextValue} />
            ) : null}
          </div>
        </ProposalPreviewChromeContext.Provider>
      </ProposalPreviewDeckContext.Provider>
    );
  },
);

ProposalPreviewZoomProvider.displayName = 'ProposalPreviewZoomProvider';

export default ProposalPreviewZoomProvider;
