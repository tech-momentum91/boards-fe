import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  PROPOSAL_ZOOM_MAX,
  PROPOSAL_ZOOM_MIN,
} from '@/components/ui/proposal-builder/proposal-template/hooks/use-proposal-preview-zoom';

function clampPage(page, totalPages) {
  return Math.min(totalPages, Math.max(1, Math.round(page)));
}

function normalizePageId(pageId, pageIds) {
  if (!Array.isArray(pageIds) || pageIds.length === 0) return null;
  const index = pageIds.indexOf(pageId);
  if (index === -1) return null;
  return index + 1;
}

/**
 * Tracks the visible page while panning and supports jump-to-page navigation.
 */
export function useProposalPreviewPageNav({
  enabled = true,
  totalPages = 1,
  pageLayoutKey = '',
  pageIds = null,
  wrapperEl = null,
  transformRef = null,
  beginProgrammaticNav = null,
} = {}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const pageRefs = useRef(new Map());

  // Ref mirrors so closures always read the latest values without re-creating callbacks.
  const currentPageRef = useRef(1);
  const pageIdsRef = useRef(pageIds);
  const totalPagesRef = useRef(totalPages);
  pageIdsRef.current = pageIds;
  totalPagesRef.current = totalPages;

  // Suppresses observer-driven page updates while a programmatic scroll is animating,
  // preventing mid-animation threshold crossings from overwriting the intended page.
  const isProgrammaticNavRef = useRef(false);

  // Tracks the current intersection ratio of every observed page element.
  // Updated on every threshold crossing so we always know which page is most visible.
  const intersectionRatioMap = useRef(new Map());

  const setPage = useCallback((pageNumber) => {
    currentPageRef.current = pageNumber;
    setCurrentPage((prev) => (prev === pageNumber ? prev : pageNumber));
  }, []);

  const registerPageRef = useCallback((pageNumber, node) => {
    if (node) {
      pageRefs.current.set(pageNumber, node);
      return;
    }
    pageRefs.current.delete(pageNumber);
    intersectionRatioMap.current.delete(pageNumber);
  }, []);

  useEffect(() => {
    setPage(1);
    setPageInput('1');
    intersectionRatioMap.current.clear();
  }, [pageLayoutKey, totalPages, pageIds, setPage]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    if (!enabled || !wrapperEl || totalPages < 1) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        // Update the ratio map for every element that crossed a threshold.
        for (const entry of entries) {
          const key = entry.target.dataset.pageNumber;
          if (key === undefined) continue;
          if (entry.isIntersecting) {
            intersectionRatioMap.current.set(key, entry.intersectionRatio);
          } else {
            intersectionRatioMap.current.delete(key);
          }
        }

        // Suppress updates while a programmatic scroll animation is running.
        if (isProgrammaticNavRef.current) return;

        // Pick the page with the highest intersection ratio from the FULL map,
        // not just from the entries batch — this is the fix for the core tracking bug.
        let bestKey = null;
        let bestRatio = -1;
        intersectionRatioMap.current.forEach((ratio, key) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestKey = key;
          }
        });

        if (bestKey === null) return;

        const pageNumber = Number(bestKey);
        if (Number.isFinite(pageNumber) && pageNumber) {
          setPage(pageNumber);
          return;
        }
        const instancePage = normalizePageId(bestKey, pageIdsRef.current);
        if (instancePage) setPage(instancePage);
      },
      {
        root: wrapperEl,
        // Include 0 so elements that fully exit/enter the viewport are removed from / added
        // to the ratio map immediately, keeping the map accurate at all times.
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      },
    );

    pageRefs.current.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      intersectionRatioMap.current.clear();
    };
  }, [enabled, wrapperEl, totalPages, pageLayoutKey, setPage]);

  const resolveScrollTarget = useCallback((pageNumber) => {
    const ids = pageIdsRef.current;
    if (Array.isArray(ids) && ids.length > 0) {
      if (typeof pageNumber === 'string' && ids.includes(pageNumber)) {
        return { id: pageNumber, pageNumber: ids.indexOf(pageNumber) + 1 };
      }
      const parsed = Number(pageNumber);
      if (!Number.isFinite(parsed)) return null;
      const targetIndex = clampPage(parsed, ids.length) - 1;
      return { id: ids[targetIndex], pageNumber: targetIndex + 1 };
    }

    const parsed = Number(pageNumber);
    if (!Number.isFinite(parsed)) return null;
    const target = clampPage(parsed, totalPagesRef.current);
    return { id: target, pageNumber: target };
  }, []);

  const scrollToPage = useCallback(
    (pageNumber) => {
      const target = resolveScrollTarget(pageNumber);
      if (!target) return;
      const element = pageRefs.current.get(target.id);
      const ref = transformRef?.current;
      if (!element || !ref?.zoomToElement) return;

      const rawScale = ref.state?.scale ?? ref.instance?.transformState?.scale ?? PROPOSAL_ZOOM_MIN;
      const scale = Math.min(PROPOSAL_ZOOM_MAX, Math.max(PROPOSAL_ZOOM_MIN, rawScale));

      // Lock observer updates for the duration of the animation so mid-scroll
      // threshold crossings cannot corrupt the current page display.
      isProgrammaticNavRef.current = true;
      window.setTimeout(() => {
        isProgrammaticNavRef.current = false;
      }, 500);

      beginProgrammaticNav?.(420);
      ref.zoomToElement(element, scale, 380, 'easeOut', 0, 0);

      setPage(target.pageNumber);
      setPageInput(String(target.pageNumber));
    },
    [resolveScrollTarget, transformRef, beginProgrammaticNav, setPage],
  );

  const handlePageInputChange = useCallback((event) => {
    setPageInput(event.target.value.replaceAll(/\D/g, ''));
  }, []);

  const commitPageInput = useCallback(() => {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isFinite(parsed)) {
      scrollToPage(parsed);
      return;
    }
    setPageInput(String(currentPageRef.current));
  }, [pageInput, scrollToPage]);

  // Read from currentPageRef so these always use the latest page even if the
  // React state hasn't committed yet (avoids the off-by-one skip bug).
  const goToPreviousPage = useCallback(() => {
    scrollToPage(currentPageRef.current - 1);
  }, [scrollToPage]);

  const goToNextPage = useCallback(() => {
    scrollToPage(currentPageRef.current + 1);
  }, [scrollToPage]);

  return useMemo(
    () => ({
      currentPage,
      totalPages,
      pageInput,
      registerPageRef,
      scrollToPage,
      handlePageInputChange,
      commitPageInput,
      goToPreviousPage,
      goToNextPage,
    }),
    [
      currentPage,
      totalPages,
      pageInput,
      registerPageRef,
      scrollToPage,
      handlePageInputChange,
      commitPageInput,
      goToPreviousPage,
      goToNextPage,
    ],
  );
}
