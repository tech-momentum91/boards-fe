import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { RiDownloadLine, RiFileList2Line } from 'react-icons/ri';

import { formatShareLinkError, getPublicProposalDeck } from '@/api/crmProposalShare';
import * as Button from '@/components/ui/button';
import ErrorStateCard from '@/components/ui/error-state-card';
import PageLayout from '@/components/page-layout';
import { resolvePublicProposalDeck } from '@/components/ui/proposal-builder/deck/public-proposal-deck';
import { downloadProposalTemplatePdf } from '@/components/ui/proposal-builder/proposal-template/pdf/export-proposal-template-pdf';
import { buildHydrationContext } from '@/components/ui/proposal-builder/deck/hydrate-context';
import { resolveProposalTemplateContent } from '@/components/ui/proposal-builder/proposal-template/apply-city-center-template-content';
import { useProposalPreviewChromeContext } from '@/components/ui/proposal-builder/proposal-template/context/proposal-preview-zoom-context';
import ProposalPreviewZoomProvider from '@/components/ui/proposal-builder/proposal-template/proposal-preview-zoom-provider';
import ProposalTemplatePreview from '@/components/ui/proposal-builder/proposal-template/proposal-template-preview';
import { PROPOSAL_TEMPLATE_PAGES } from '@/components/ui/proposal-builder/proposal-template/proposal-content';
import { PROPOSAL_PRIMARY_COLOR } from '@/components/ui/proposal-builder/theme/theme-contrast';
import { resolveProposalSectionLabel } from '@/components/proposal-analytics/section-labels';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { createProposalAnalyticsTracker } from '@/utils/proposal-analytics-tracker';

import '@/components/ui/proposal-builder/styles/proposal-builder.css';

/**
 * Reads the zoom provider's current page number and fires a section_enter event
 * whenever the user navigates to a different page in the proposal.
 * Must be rendered as a child of ProposalPreviewZoomProvider.
 */
function PublicProposalSectionTracker({ pages, tracker }) {
  // currentPage lives in the chrome context (volatile), not the deck context.
  const chrome = useProposalPreviewChromeContext();
  const currentPage = chrome?.currentPage || 1;

  useEffect(() => {
    if (!tracker || !pages?.length) return undefined;
    const page = pages[currentPage - 1];
    const sectionName =
      resolveProposalSectionLabel(page?.label || page?.templateKey) ||
      page?.label ||
      String(page?.templateKey || '');
    if (sectionName) {
      tracker.trackSectionEnter(sectionName);
    }
    return undefined;
  }, [currentPage, pages, tracker]);

  return null;
}

export default function PublicProposalPage() {
  const { proposalId } = useParams();
  const [searchParams] = useSearchParams();
  const key = searchParams.get('key');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Create a stable tracker instance for this proposal share session.
  const tracker = useMemo(() => {
    if (!proposalId || !key) return null;
    return createProposalAnalyticsTracker({ proposalId, token: key });
  }, [proposalId, key]);

  // Keep a ref so event listeners / cleanup can fire without stale closures.
  const trackerRef = useRef(null);
  useEffect(() => {
    trackerRef.current = tracker;
  }, [tracker]);

  // Keepalive close on pagehide only. Tab hide uses heartbeat (not proposal_close).
  useEffect(() => {
    const flushKeepaliveClose = () => {
      trackerRef.current?.trackClose({ keepalive: true });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Presence only — do not treat tab/app hide as session end.
        trackerRef.current?.trackHeartbeat();
        return;
      }
      if (document.visibilityState === 'visible') {
        trackerRef.current?.trackHeartbeat();
      }
    };
    window.addEventListener('pagehide', flushKeepaliveClose);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushKeepaliveClose);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // No-ops if pagehide already marked the session closed.
      trackerRef.current?.trackClose();
    };
  }, []);

  const loadDeck = useCallback(async () => {
    if (!proposalId || !key) {
      setError('Invalid or incomplete share link.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await getPublicProposalDeck(proposalId, key);
      setPayload(data);
      // Client-side open is the source of truth for visit tracking.
      tracker?.trackOpen();
    } catch (error_) {
      setError(formatShareLinkError(error_));
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [proposalId, key, tracker]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  // Heartbeat keeps the "live visitors" counter fresh while the page is open.
  useEffect(() => {
    if (!tracker || !payload) return undefined;
    tracker.trackHeartbeat();
    const timer = setInterval(() => tracker.trackHeartbeat(), 60_000);
    return () => clearInterval(timer);
  }, [tracker, payload]);

  // ─── Rendering (unchanged) ────────────────────────────────────────────────

  const resolvedDeck = useMemo(() => resolvePublicProposalDeck(payload?.deck_json), [payload]);
  const isInstanceMode = resolvedDeck.mode === 'instance';
  const pageInstances = resolvedDeck.pageInstances ?? [];
  const contentByInstanceId = resolvedDeck.contentByInstanceId ?? {};
  const enabledPageIds = resolvedDeck.enabledPageIds ?? [];
  const pageIds = useMemo(
    () => (isInstanceMode ? pageInstances.map((page) => page.id) : enabledPageIds),
    [isInstanceMode, pageInstances, enabledPageIds],
  );
  const previewLayoutKey = useMemo(() => `public:${pageIds.join('.')}`, [pageIds]);

  const hydrationContext = useMemo(
    () => (!isInstanceMode && payload ? buildHydrationContext(payload) : null),
    [payload, isInstanceMode],
  );

  const templateContent = useMemo(
    () =>
      isInstanceMode
        ? null
        : resolveProposalTemplateContent(payload?.deck_json?.templateContent, hydrationContext),
    [payload, hydrationContext, isInstanceMode],
  );

  // Pages array for PublicProposalSectionTracker — ordered to match rendered pages.
  const trackerPages = useMemo(() => {
    if (isInstanceMode) {
      return pageInstances.map((page) => {
        const baseKey = String(page.templateKey || '').replace(/_\d+$/, '');
        const templatePage = PROPOSAL_TEMPLATE_PAGES.find((p) => p.key === baseKey);
        return {
          id: String(page.id),
          templateKey: baseKey,
          // Prefer the actual deck label ("Floor Plan - The First - Floor A…")
          // so the analytics section name matches what the user sees in the proposal.
          label: page.label || templatePage?.label || baseKey,
        };
      });
    }
    return enabledPageIds
      .map((id) => {
        const templatePage = PROPOSAL_TEMPLATE_PAGES.find((p) => p.id === Number(id));
        return {
          id: String(id),
          templateKey: templatePage?.key || '',
          label: templatePage?.label || '',
        };
      })
      .filter((p) => p.label);
  }, [isInstanceMode, pageInstances, enabledPageIds]);

  // ─── Download ─────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    if (!payload) return;
    setDownloading(true);

    try {
      const safeName =
        (payload.proposal_title || 'proposal').replaceAll(/[^\w-]+/g, '_').slice(0, 80) ||
        'proposal';
      const inventory = payload?.inventory ?? [];
      const downloadOptions = {
        primaryColor: PROPOSAL_PRIMARY_COLOR,
        title: payload.proposal_title || 'Proposal',
        filename: `${safeName}.pdf`,
        skipLiveLayoutFetch: true,
      };

      if (isInstanceMode) {
        await downloadProposalTemplatePdf({
          ...downloadOptions,
          contentByInstanceId,
          pageInstances,
          inventory,
          embeddedPage6LayoutDetail: payload?.page6_layout_detail ?? null,
          page6LayoutDetailsByKey: payload?.page6_layout_details_by_key ?? null,
        });
      } else {
        await downloadProposalTemplatePdf({
          ...downloadOptions,
          content: templateContent,
          visiblePages: enabledPageIds,
          layoutInventory: inventory,
          embeddedPage6LayoutDetail: payload?.page6_layout_detail ?? null,
          page6LayoutDetailsByKey: payload?.page6_layout_details_by_key ?? null,
        });
      }
      tracker?.trackDownload();
      showSuccessToast('PDF download started');
    } catch (error_) {
      showErrorToast(error_?.message || 'PDF download failed');
    } finally {
      setDownloading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderBody = () => {
    if (!proposalId || !key) {
      return (
        <div className='flex items-center justify-center px-6 py-12'>
          <ErrorStateCard
            title='Invalid proposal link'
            message='This link is missing required parameters. Ask the sender for a new link.'
          />
        </div>
      );
    }

    if (loading && !payload) {
      return (
        <div className='flex h-full items-center justify-center px-6 py-12'>
          <div className='flex flex-col items-center gap-3'>
            <div className='size-8 animate-spin rounded-full border-4 border-primary-base border-t-transparent' />
            <p className='text-paragraph-small text-text-sub-500'>Loading proposal…</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className='flex items-center justify-center px-6 py-12'>
          <ErrorStateCard title='Unable to open proposal' message={error} onRetry={loadDeck} />
        </div>
      );
    }

    if (pageIds.length === 0) {
      return (
        <div className='flex items-center justify-center px-6 py-12'>
          <ErrorStateCard
            title='No pages in this proposal'
            message='The shared proposal does not include any enabled pages.'
          />
        </div>
      );
    }

    return (
      <div className='flex min-h-0 flex-1 flex-col'>
        <div className='flex shrink-0 items-center justify-between gap-3 border-b border-stroke-soft-200 bg-bg-white-0 px-4 py-2'>
          <div className='flex min-w-0 items-center gap-2'>
            <p className='truncate text-label-sm text-text-main-900'>
              {payload?.proposal_title || 'Proposal'}
            </p>
            {payload?.account_name ? (
              <>
                <span className='shrink-0 text-text-soft-400' aria-hidden>
                  ·
                </span>
                <p className='truncate text-paragraph-x-small text-text-sub-500'>
                  {payload.account_name}
                </p>
              </>
            ) : null}
          </div>
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='xsmall'
            className='shrink-0 gap-2'
            disabled={downloading}
            onClick={handleDownload}
          >
            <Button.Icon as={RiDownloadLine} />
            {downloading ? 'Preparing…' : 'Download PDF'}
          </Button.Root>
        </div>

        <div className='min-h-0 flex-1 overflow-hidden bg-bg-weak-50'>
          <ProposalPreviewZoomProvider
            key={previewLayoutKey}
            showPageChrome={false}
            totalPages={pageIds.length}
            pageIds={pageIds}
            pageLayoutKey={previewLayoutKey}
            className='proposal-builder-preview-canvas h-full border-0 rounded-none bg-bg-weak-50 shadow-none'
          >
            <PublicProposalSectionTracker pages={trackerPages} tracker={tracker} />
            <ProposalTemplatePreview
              content={templateContent}
              contentByInstanceId={contentByInstanceId}
              pageInstances={isInstanceMode ? pageInstances : null}
              inventory={isInstanceMode ? (payload?.inventory ?? []) : []}
              readOnly
              previewMode='web'
              primaryColor={PROPOSAL_PRIMARY_COLOR}
              visiblePages={isInstanceMode ? null : enabledPageIds}
              layoutInventory={isInstanceMode ? [] : (payload?.inventory ?? [])}
              embeddedPage6LayoutDetail={payload?.page6_layout_detail ?? null}
              page6LayoutDetailsByKey={payload?.page6_layout_details_by_key ?? null}
              skipLiveLayoutFetch
            />
          </ProposalPreviewZoomProvider>
        </div>
      </div>
    );
  };

  return (
    <PageLayout
      pageTitle={payload?.proposal_title || 'Shared Proposal'}
      pageIcon={<RiFileList2Line size={24} />}
      showSidebar={false}
      showAiChatSidebar={false}
      showDefaultHeader={false}
      borderDivClassName='hidden'
      contentAreaClassName='h-full'
    >
      {renderBody()}
    </PageLayout>
  );
}
