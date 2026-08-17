import React, { memo, useCallback, useMemo, useState } from 'react';

import { resolvePageInstanceInventory } from '@/components/ui/proposal-builder/deck/proposal-page-instance-content';
import Page1 from '@/components/ui/proposal-builder/proposal-template/pages/page-1';
import Page2 from '@/components/ui/proposal-builder/proposal-template/pages/page-2';
import Page3 from '@/components/ui/proposal-builder/proposal-template/pages/page-3';
import Page4 from '@/components/ui/proposal-builder/proposal-template/pages/page-4';
import Page5 from '@/components/ui/proposal-builder/proposal-template/pages/page-5';
import Page6 from '@/components/ui/proposal-builder/proposal-template/pages/page-6';
import Page7 from '@/components/ui/proposal-builder/proposal-template/pages/page-7';
import Page8 from '@/components/ui/proposal-builder/proposal-template/pages/page-8';
import Page9 from '@/components/ui/proposal-builder/proposal-template/pages/page-9';
import {
  defaultProposalContent,
  PROPOSAL_TEMPLATE_PAGES,
} from '@/components/ui/proposal-builder/proposal-template/proposal-content';
import { useProposalPreviewDeckContext } from '@/components/ui/proposal-builder/proposal-template/context/proposal-preview-zoom-context';
import { useProposalPageScale } from '@/components/ui/proposal-builder/proposal-template/hooks/use-proposal-page-scale';
import { setNestedValue } from '@/components/ui/proposal-builder/proposal-template/utils/set-nested-value';
import { resolveEmbeddedLayoutDetailForInventory } from '@/components/ui/proposal-builder/proposal-template/sections/proposal-page-6-floor-plan-utils';

const PAGE_WIDTH = 2480;
const PAGE_HEIGHT = 3508;

const PAGE_COMPONENTS = {
  page1: Page1,
  page2: Page2,
  page3: Page3,
  page4: Page4,
  page5: Page5,
  page6: Page6,
  page7: Page7,
  page8: Page8,
  page9: Page9,
};

function ProposalPageSlot({
  pageId,
  label,
  registerPageRef,
  showPageChrome,
  scaledPageWidth,
  pageWrapStyle,
  innerStyle,
  containerRef,
  children,
}) {
  const pageSlotRef = useCallback(
    (node) => {
      registerPageRef?.(pageId, node);
    },
    [pageId, registerPageRef],
  );

  const pageWrapRef = useCallback(
    (node) => {
      if (containerRef) {
        containerRef.current = node;
      }
    },
    [containerRef],
  );

  return (
    <div
      ref={pageSlotRef}
      className='proposal-template-deck__page-slot'
      data-page-number={pageId}
      style={{ width: scaledPageWidth }}
    >
      {showPageChrome ? (
        <div className='proposal-template-deck__page-chrome'>
          <span className='proposal-template-deck__page-chrome-label'>
            Page {pageId}
            {label ? (
              <>
                {' '}
                <span className='proposal-template-deck__page-chrome-title'>— {label}</span>
              </>
            ) : null}
          </span>
        </div>
      ) : null}
      <div
        ref={pageWrapRef}
        data-page-number={pageId}
        className='proposal-template-deck__page-wrap print-slide-page proposal-template-page'
        style={pageWrapStyle}
      >
        <div className='print-slide-scale-root' style={innerStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Wraps static template pages in the existing PDF preview deck structure:
 * gray canvas background, white page containers, gap between pages.
 *
 * Subscribes only to the stable deck zoom context so scroll/zoom/page-nav
 * chrome updates do not re-render the full proposal.
 */
function ProposalTemplatePreview({
  content: contentProp,
  onContentChange,
  readOnly = false,
  primaryColor,
  previewMode = 'web',
  printMode = false,
  visiblePages = null,
  layoutInventory = [],
  embeddedPage6LayoutDetail = null,
  page6LayoutDetailsByKey = null,
  skipLiveLayoutFetch = false,
  pageInstances = null,
  contentByInstanceId = null,
  inventory = [],
}) {
  const [localContent, setLocalContent] = useState(defaultProposalContent);
  const [localInstanceContent, setLocalInstanceContent] = useState({});
  const content = contentProp ?? localContent;
  const instanceContent = contentByInstanceId ?? localInstanceContent;
  const isInstanceMode = Array.isArray(pageInstances);
  const isPdfLike = previewMode === 'pdf' || printMode;
  const deckContext = useProposalPreviewDeckContext();
  const useCanvasZoom = Boolean(deckContext?.useCanvasZoom);
  const { containerRef, scale: legacyScale } = useProposalPageScale(isPdfLike && !deckContext);
  const scale = legacyScale;
  const shouldScale = isPdfLike && !useCanvasZoom;

  const handleContentChange = useCallback(
    (next) => {
      if (onContentChange) {
        onContentChange(next);
      } else {
        setLocalContent(next);
      }
    },
    [onContentChange],
  );

  const deckClass = useMemo(() => {
    const parts = ['proposal-template-deck'];
    if (isPdfLike) {
      parts.push('proposal-template-deck--pdf-preview');
    } else {
      parts.push('proposal-template-deck--web-preview');
    }
    if (!readOnly && !printMode) {
      parts.push('proposal-template-deck--edit-mode');
    }
    return parts.join(' ');
  }, [isPdfLike, readOnly, printMode]);

  const pagesToRender = useMemo(() => {
    if (isInstanceMode) return pageInstances ?? [];
    if (!visiblePages) return PROPOSAL_TEMPLATE_PAGES;
    const byId = Object.fromEntries(PROPOSAL_TEMPLATE_PAGES.map((page) => [page.id, page]));
    return visiblePages.map((id) => byId[id]).filter(Boolean);
  }, [isInstanceMode, pageInstances, visiblePages]);

  const pageWrapStyle = useMemo(
    () =>
      shouldScale
        ? {
            width: PAGE_WIDTH * scale,
            height: PAGE_HEIGHT * scale,
          }
        : undefined,
    [shouldScale, scale],
  );

  const innerStyle = useMemo(
    () =>
      shouldScale
        ? {
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }
        : undefined,
    [shouldScale, scale],
  );

  const handlePageContentChange = useCallback(
    (path, value) => {
      handleContentChange(setNestedValue(content, path, value));
    },
    [content, handleContentChange],
  );

  const handleInstanceContentChange = useCallback(
    (instanceId, templateKey) => (path, value) => {
      if (!instanceId || !Array.isArray(path) || path.length === 0) return;
      const normalizedPath = path[0] === templateKey ? path.slice(1) : path;
      if (normalizedPath.length === 0) return;
      const base = instanceContent?.[instanceId] ?? {};
      const nextInstanceContent = setNestedValue(base, normalizedPath, value);
      if (onContentChange) {
        onContentChange(nextInstanceContent, instanceId);
      } else {
        setLocalInstanceContent((prev) => ({
          ...prev,
          [instanceId]: nextInstanceContent,
        }));
      }
    },
    [instanceContent, onContentChange],
  );

  const showPageChrome = Boolean(deckContext?.showPageChrome) && !printMode;
  const registerPageRef = deckContext?.registerPageRef;
  const scaledPageWidth = shouldScale ? PAGE_WIDTH * scale : PAGE_WIDTH;

  return (
    <div
      className={deckClass}
      data-proposal-template-preview
      data-preview-mode={previewMode}
      style={primaryColor ? { '--proposal-primary-color': primaryColor } : undefined}
    >
      {pagesToRender.map((page, index) => {
        const pageId = page?.id;
        const key = isInstanceMode ? page?.templateKey : page?.key;
        const label = page?.label;
        const Component = PAGE_COMPONENTS[key];
        if (!Component || !pageId || !key) return null;
        const pageContent = isInstanceMode ? instanceContent?.[pageId] : content[key];
        const pageInventory =
          isInstanceMode && key === 'page6'
            ? resolvePageInstanceInventory(page, inventory)
            : key === 'page6'
              ? layoutInventory
              : undefined;
        const pageEmbeddedLayout =
          key === 'page6'
            ? resolveEmbeddedLayoutDetailForInventory(
                pageInventory,
                embeddedPage6LayoutDetail,
                page6LayoutDetailsByKey,
              )
            : undefined;

        return (
          <ProposalPageSlot
            key={pageId}
            pageId={pageId}
            label={label}
            registerPageRef={registerPageRef}
            showPageChrome={showPageChrome}
            scaledPageWidth={scaledPageWidth}
            pageWrapStyle={pageWrapStyle}
            innerStyle={innerStyle}
            containerRef={index === 0 ? containerRef : undefined}
          >
            <Component
              content={pageContent}
              onContentChange={
                isInstanceMode ? handleInstanceContentChange(pageId, key) : handlePageContentChange
              }
              readOnly={readOnly}
              layoutInventory={pageInventory}
              embeddedPage6LayoutDetail={pageEmbeddedLayout}
              skipLiveLayoutFetch={skipLiveLayoutFetch}
            />
          </ProposalPageSlot>
        );
      })}
    </div>
  );
}

export default memo(ProposalTemplatePreview);
