import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  getCrmProposalTemplates,
  themeSourceToColorTheme,
  updateCrmProposal,
} from '@/api/crmProposals';
import ProposalAnalyticsModal from '@/components/ui/proposal-builder/shell/proposal-analytics-modal';
import ProposalBuilderAiPanel from '@/components/ui/proposal-builder/shell/proposal-builder-ai-panel';
import ProposalBuilderControlsPanel from '@/components/ui/proposal-builder/shell/proposal-builder-controls-panel';
import ProposalBuilderHeader from '@/components/ui/proposal-builder/shell/proposal-builder-header';
import {
  BUILDER_STATUS,
  mergeTemplateContent,
  persistProposalDeck,
  reorderPages,
  selectBuilderDeck,
  selectBuilderHydrationContext,
  selectBuilderIsDirty,
  selectBuilderProposal,
  selectBuilderProposalId,
  selectBuilderReadOnly,
  selectBuilderSavedDeckSnapshot,
  selectBuilderTemplateContent,
  selectBuilderStatus,
  selectBuilderProposalTemplate,
  selectBuilderTemplateId,
  selectBuilderTemplateLabel,
  selectBuilderVersions,
  selectBuilderActiveVersionId,
  selectBuilderVersionsLoading,
  applyProposalVersion,
  loadProposalVersions,
  revertProposalVersion,
  setActivePage,
  setDeckLocked,
  setPageInstanceContent,
  setProposalWebsiteUrl,
  setBuilderTheme,
  setPreviewMode,
  setPagesStateBulk,
  setTemplateContent,
  switchProposalTemplate,
  togglePage,
  togglePageInstance,
  reorderCity,
  reorderCenter,
} from '@/redux/crmProposalBuilderSlice';
import { buildTemplateSelectOptions } from '@/components/ui/proposal-builder/deck/template-registry';
import {
  DEFAULT_TEMPLATE_PAGE_IDS,
  getEnabledPagesInOrder,
} from '@/components/ui/proposal-builder/deck/proposal-page-order';
import {
  findPageInstance,
  flattenPagePlan,
} from '@/components/ui/proposal-builder/deck/proposal-page-plan';
import { useProposalBuilderTheme } from '@/components/ui/proposal-builder/hooks/use-proposal-builder-theme';
import { isValidWebsiteUrl, normalizeWebsiteUrl } from '@/utils/url-utils';
import ProposalTemplatePreview from '@/components/ui/proposal-builder/proposal-template/proposal-template-preview';
import ProposalWebPdfComparePreview from '@/components/ui/proposal-builder/proposal-template/proposal-web-pdf-compare-preview';
import ProposalPdfPreview from '@/components/ui/proposal-builder/proposal-template/pdf/proposal-pdf-preview';
import { downloadProposalTemplatePdf } from '@/components/ui/proposal-builder/proposal-template/pdf/export-proposal-template-pdf';
import ProposalPreviewZoomProvider from '@/components/ui/proposal-builder/proposal-template/proposal-preview-zoom-provider';
import { resolveProposalTemplateContent } from '@/components/ui/proposal-builder/proposal-template/apply-city-center-template-content';
import {
  PROPOSAL_PAGE_COUNT,
  PROPOSAL_TEMPLATE_PAGES,
} from '@/components/ui/proposal-builder/proposal-template/proposal-content';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import {
  countVersionsAfterTarget,
  versionRequiresRevertConfirm,
} from '@/components/ui/proposal-builder/deck/proposal-deck-versions';
import { RiErrorWarningLine, RiSparklingLine } from 'react-icons/ri';

const EMPTY_INVENTORY = Object.freeze([]);
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const buildPreviewPageIdsFromInstances = (instances, templateIdByKey) => {
  const ids = [];
  const seen = new Set();
  (instances ?? []).forEach((instance) => {
    const templateId = templateIdByKey?.[instance?.templateKey];
    if (!templateId || seen.has(templateId)) return;
    seen.add(templateId);
    ids.push(templateId);
  });
  return ids;
};

const ProposalBuilderShell = ({ onExit }) => {
  const dispatch = useDispatch();
  const proposal = useSelector(selectBuilderProposal);
  const hydrationContext = useSelector(selectBuilderHydrationContext);
  const deck = useSelector(selectBuilderDeck);
  const savedDeckSnapshot = useSelector(selectBuilderSavedDeckSnapshot);
  const templateContent = useSelector(selectBuilderTemplateContent);
  const readOnly = useSelector(selectBuilderReadOnly);
  const status = useSelector(selectBuilderStatus);
  const isDirty = useSelector(selectBuilderIsDirty);
  const versions = useSelector(selectBuilderVersions);
  const activeVersionId = useSelector(selectBuilderActiveVersionId);
  const versionsLoading = useSelector(selectBuilderVersionsLoading);

  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const proposalTemplate = useSelector(selectBuilderProposalTemplate);
  const templateId = useSelector(selectBuilderTemplateId);
  const templateLabel = useSelector(selectBuilderTemplateLabel);
  const [templateOptions, setTemplateOptions] = useState([]);
  const [revertConfirm, setRevertConfirm] = useState({ open: false, version: null });
  const [revertBusy, setRevertBusy] = useState(false);
  const sidebarDragPageRef = useRef(null);
  const previewExportRef = useRef(null);
  const previewZoomRef = useRef(null);
  const proposalId = useSelector(selectBuilderProposalId);

  useEffect(() => {
    getCrmProposalTemplates()
      .then((list) => setTemplateOptions(buildTemplateSelectOptions(list)))
      .catch(() => setTemplateOptions(buildTemplateSelectOptions([])));
  }, []);

  useEffect(() => {
    if (!proposalId) return;
    dispatch(loadProposalVersions(proposalId));
  }, [dispatch, proposalId]);

  const {
    pagesState = {},
    pageOrder = DEFAULT_TEMPLATE_PAGE_IDS,
    activePageId = 1,
    previewMode = 'web',
    deckLocked = false,
  } = deck ?? {};

  const isSchemaV3Deck =
    Number(deck?.deck_schema_version ?? 0) >= 3 ||
    Boolean(deck?.pagePlan) ||
    Boolean(deck?.contentByInstanceId);

  const pagePlan = deck?.pagePlan ?? null;
  const flatPageInstances = useMemo(
    () => (isSchemaV3Deck ? flattenPagePlan(pagePlan) : []),
    [isSchemaV3Deck, pagePlan],
  );
  const enabledPageInstances = useMemo(
    () => (isSchemaV3Deck ? flattenPagePlan(pagePlan, { enabledOnly: true }) : []),
    [isSchemaV3Deck, pagePlan],
  );

  const legacyEnabledPageIds = useMemo(
    () => getEnabledPagesInOrder(pagesState, pageOrder),
    [pagesState, pageOrder],
  );

  const enabledPageIds = legacyEnabledPageIds;

  const templateIdByKey = useMemo(
    () => Object.fromEntries(PROPOSAL_TEMPLATE_PAGES.map((page) => [page.key, page.id])),
    [],
  );

  const previewPageIds = useMemo(
    () =>
      isSchemaV3Deck
        ? buildPreviewPageIdsFromInstances(enabledPageInstances, templateIdByKey)
        : enabledPageIds,
    [enabledPageIds, enabledPageInstances, isSchemaV3Deck, templateIdByKey],
  );

  const previewPageInstanceIds = useMemo(
    () => (isSchemaV3Deck ? enabledPageInstances.map((instance) => instance.id) : null),
    [enabledPageInstances, isSchemaV3Deck],
  );

  const clientData = useMemo(
    () => ({
      lead_account: hydrationContext?.client ?? proposal?.account ?? 'Client',
      proposal_name: proposal?.proposal_title ?? '',
      city: hydrationContext?.city ?? '',
      product: hydrationContext?.center ?? '',
      seats_required: hydrationContext?.seats ?? '—',
      website: hydrationContext?.website ?? '',
      proposal_status: proposal?.status ?? 'Draft',
      crm_lead: proposal?.crm_lead ?? '',
    }),
    [hydrationContext, proposal],
  );

  const proposalWebsite = proposal?.website_url || clientData.website || '';
  const [websiteDraft, setWebsiteDraft] = useState('');
  const [websiteCommitted, setWebsiteCommitted] = useState('');

  useEffect(() => {
    setWebsiteDraft(proposalWebsite);
    setWebsiteCommitted(proposalWebsite);
  }, [proposalId, proposalWebsite]);

  const handleWebsiteUrlChange = useCallback((value) => {
    setWebsiteDraft(value);
  }, []);

  const handleWebsiteUrlCommit = useCallback(async () => {
    const trimmed = String(websiteDraft ?? '').trim();
    const normalized = trimmed ? normalizeWebsiteUrl(trimmed) : '';
    if (trimmed && !isValidWebsiteUrl(normalized)) {
      showErrorToast('Enter a valid website URL');
      setWebsiteDraft(websiteCommitted);
      return;
    }
    const next = normalized || '';
    if (next === websiteCommitted) {
      setWebsiteDraft(next);
      return;
    }

    const previous = websiteCommitted;

    if (!proposalId || readOnly) {
      setWebsiteCommitted(next);
      setWebsiteDraft(next);
      return;
    }

    try {
      await updateCrmProposal(proposalId, { website_url: next });
      dispatch(setProposalWebsiteUrl(next));
      setWebsiteCommitted(next);
      setWebsiteDraft(next);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Could not save website URL' });
      setWebsiteDraft(previous);
    }
  }, [websiteDraft, websiteCommitted, proposalId, readOnly, dispatch]);

  const websiteUrl = websiteCommitted;
  const {
    themeSource,
    setThemeSource,
    themeColor,
    setThemeColor,
    websitePalette,
    clientLogoUrl,
    logoCandidates,
    selectLogoCandidate,
    uploadClientLogo,
    publicationThemeVars,
    themeLoading,
    themeToast,
    hasWebsite,
    effectiveThemeSource,
    buildBrandJson,
  } = useProposalBuilderTheme({
    websiteUrl,
    colorTheme: proposal?.color_theme ?? 'DevX',
    persistedBrand: proposal?.brand_json ?? null,
    persistedLogoUrl: proposal?.brand_json?.selectedLogoUrl ?? null,
    persistedPalette: deck?.brandPalette ?? [],
    persistedCombinedScheme: deck?.brandCombinedScheme ?? null,
    proposalId,
    readOnly,
  });

  useEffect(() => {
    dispatch(setBuilderTheme({ themeSource, themeColor }));
  }, [dispatch, themeSource, themeColor]);

  // Page structure only — do NOT include activeVersionId. Versions load after the
  // first paint and would remount the entire zoom canvas (double layout fetches).
  const previewLayoutKey = useMemo(
    () =>
      isSchemaV3Deck
        ? enabledPageInstances.map((instance) => instance.id).join('.')
        : enabledPageIds.join('.'),
    [enabledPageIds, enabledPageInstances, isSchemaV3Deck],
  );

  const workingTemplateContent = useMemo(
    () => resolveProposalTemplateContent(templateContent, hydrationContext),
    [templateContent, hydrationContext],
  );

  const savedTemplateContent = useMemo(
    () => resolveProposalTemplateContent(savedDeckSnapshot?.templateContent, hydrationContext),
    [savedDeckSnapshot, hydrationContext],
  );

  const savedExportPageIds = useMemo(
    () =>
      getEnabledPagesInOrder(
        savedDeckSnapshot?.pagesState ?? pagesState,
        savedDeckSnapshot?.pageOrder ?? pageOrder,
      ),
    [savedDeckSnapshot, pagesState, pageOrder],
  );

  const handleTemplateContentChange = useCallback(
    (next) => {
      if (readOnly || deckLocked) return;
      dispatch(setTemplateContent(next));
    },
    [dispatch, readOnly, deckLocked],
  );

  const handleInstanceContentChange = useCallback(
    (nextContent, instanceId) => {
      if (readOnly || deckLocked || !instanceId) return;
      dispatch(setPageInstanceContent({ instanceId, content: nextContent ?? {} }));
    },
    [dispatch, readOnly, deckLocked],
  );

  const enabledPageCount = isSchemaV3Deck ? enabledPageInstances.length : enabledPageIds.length;
  const selectedCount = enabledPageCount;
  const totalPages = isSchemaV3Deck ? flatPageInstances.length : PROPOSAL_PAGE_COUNT;
  const deckPack = enabledPageCount > 0 ? { state: 'ready' } : { state: 'empty' };

  const handleTemplateChange = useCallback(
    (nextTemplate) => {
      if (readOnly || !nextTemplate || nextTemplate === proposalTemplate) return;
      dispatch(switchProposalTemplate(nextTemplate));
    },
    [dispatch, readOnly, proposalTemplate],
  );

  const handleTogglePage = useCallback(
    (pageId) => {
      if (readOnly) return;
      if (isSchemaV3Deck) {
        dispatch(togglePageInstance(pageId));
        return;
      }
      dispatch(togglePage(pageId));
    },
    [readOnly, dispatch, isSchemaV3Deck],
  );

  const handleToggleAllPages = useCallback(
    (nextChecked) => {
      if (readOnly) return;
      if (isSchemaV3Deck) {
        const nextEnabled =
          typeof nextChecked === 'boolean'
            ? nextChecked
            : enabledPageInstances.length !== flatPageInstances.length;
        flatPageInstances.forEach((instance) => {
          if (instance.enabled === nextEnabled) return;
          dispatch(togglePageInstance(instance.id));
        });
        return;
      }

      const allEnabled = enabledPageIds.length === totalPages;
      const nextState = Object.fromEntries(
        DEFAULT_TEMPLATE_PAGE_IDS.map((id) => [id, !allEnabled]),
      );
      dispatch(setPagesStateBulk(nextState));
    },
    [
      readOnly,
      enabledPageIds.length,
      totalPages,
      dispatch,
      isSchemaV3Deck,
      enabledPageInstances.length,
      flatPageInstances,
    ],
  );

  const handleReorderPages = useCallback(
    (draggedId, targetId) => {
      if (readOnly || deckLocked) return;
      dispatch(reorderPages({ draggedId, targetId }));
    },
    [dispatch, readOnly, deckLocked],
  );

  const handleReorderCity = useCallback(
    (draggedId, targetId) => {
      if (readOnly || deckLocked) return;
      dispatch(reorderCity({ draggedId, targetId }));
    },
    [dispatch, readOnly, deckLocked],
  );

  const handleReorderCenter = useCallback(
    (cityId, draggedId, targetId) => {
      if (readOnly || deckLocked) return;
      dispatch(reorderCenter({ cityId, draggedId, targetId }));
    },
    [dispatch, readOnly, deckLocked],
  );

  const resolvePreviewPageId = useCallback(
    (instanceId) => {
      if (!isSchemaV3Deck) return instanceId;
      return instanceId;
    },
    [isSchemaV3Deck],
  );

  const handleSelectPage = useCallback(
    (pageId) => {
      dispatch(setActivePage(pageId));
      const previewPageId = resolvePreviewPageId(pageId);
      previewZoomRef.current?.scrollToPage?.(previewPageId);
    },
    [dispatch, resolvePreviewPageId],
  );

  const handlePdfExport = useCallback(async () => {
    if (!proposalId || deckPack.state !== 'ready') return;
    const safeName =
      (clientData.proposal_name || 'proposal').replaceAll(/[^\w-]+/g, '_').slice(0, 80) ||
      'proposal';
    setExportBusy(true);

    try {
      await downloadProposalTemplatePdf({
        content: savedTemplateContent,
        contentByInstanceId: isSchemaV3Deck
          ? (savedDeckSnapshot?.contentByInstanceId ?? deck?.contentByInstanceId ?? null)
          : null,
        pageInstances: isSchemaV3Deck ? enabledPageInstances : null,
        primaryColor: themeColor,
        clientAiTheme: effectiveThemeSource === 'client',
        title: clientData.proposal_name || 'Proposal',
        filename: `${safeName}.pdf`,
        visiblePages: savedExportPageIds,
        layoutInventory: proposal?.inventory ?? EMPTY_INVENTORY,
        inventory: proposal?.inventory ?? EMPTY_INVENTORY,
      });
      showSuccessToast('PDF download started');
    } catch (error) {
      showErrorToast(error?.message || 'PDF export failed');
    } finally {
      setExportBusy(false);
    }
  }, [
    proposalId,
    deckPack.state,
    clientData.proposal_name,
    themeColor,
    effectiveThemeSource,
    savedTemplateContent,
    savedExportPageIds,
    proposal?.inventory,
    enabledPageInstances,
    isSchemaV3Deck,
    savedDeckSnapshot?.contentByInstanceId,
    deck?.contentByInstanceId,
  ]);

  const templatePreviewNode = useMemo(() => {
    if (deckPack.state !== 'ready') return null;

    return (
      <ProposalTemplatePreview
        content={workingTemplateContent}
        contentByInstanceId={deck?.contentByInstanceId ?? null}
        pageInstances={isSchemaV3Deck ? enabledPageInstances : null}
        onContentChange={isSchemaV3Deck ? handleInstanceContentChange : handleTemplateContentChange}
        previewMode='web'
        readOnly={readOnly || deckLocked}
        primaryColor={themeColor}
        visiblePages={previewPageIds}
        layoutInventory={proposal?.inventory ?? EMPTY_INVENTORY}
        inventory={proposal?.inventory ?? EMPTY_INVENTORY}
      />
    );
  }, [
    deckPack.state,
    workingTemplateContent,
    handleTemplateContentChange,
    handleInstanceContentChange,
    previewMode,
    readOnly,
    deckLocked,
    themeColor,
    previewPageIds,
    enabledPageInstances,
    isSchemaV3Deck,
    deck?.contentByInstanceId,
    proposal?.inventory,
  ]);

  const comparePreviewNode = useMemo(() => {
    if (deckPack.state !== 'ready') return null;

    return (
      <ProposalWebPdfComparePreview
        content={workingTemplateContent}
        contentByInstanceId={deck?.contentByInstanceId ?? null}
        pageInstances={isSchemaV3Deck ? enabledPageInstances : null}
        onContentChange={isSchemaV3Deck ? handleInstanceContentChange : handleTemplateContentChange}
        readOnly={readOnly || deckLocked}
        primaryColor={themeColor}
        clientAiTheme={effectiveThemeSource === 'client'}
        title={clientData.proposal_name || 'Proposal'}
        visiblePages={previewPageIds}
        initialPageId={resolvePreviewPageId(activePageId)}
        pageLayoutKey={previewLayoutKey}
        layoutInventory={proposal?.inventory ?? EMPTY_INVENTORY}
        inventory={proposal?.inventory ?? EMPTY_INVENTORY}
      />
    );
  }, [
    deckPack.state,
    workingTemplateContent,
    handleTemplateContentChange,
    handleInstanceContentChange,
    readOnly,
    deckLocked,
    themeColor,
    effectiveThemeSource,
    clientData.proposal_name,
    previewPageIds,
    previewLayoutKey,
    proposal?.inventory,
    activePageId,
    enabledPageInstances,
    isSchemaV3Deck,
    deck?.contentByInstanceId,
    resolvePreviewPageId,
  ]);

  const pdfPreviewNode = useMemo(() => {
    if (deckPack.state !== 'ready') return null;

    return (
      <ProposalPdfPreview
        className='proposal-pdf-preview'
        content={workingTemplateContent}
        contentByInstanceId={deck?.contentByInstanceId ?? null}
        pageInstances={isSchemaV3Deck ? enabledPageInstances : null}
        primaryColor={themeColor}
        clientAiTheme={effectiveThemeSource === 'client'}
        title={clientData.proposal_name || 'Proposal'}
        visiblePages={previewPageIds}
        layoutInventory={proposal?.inventory ?? EMPTY_INVENTORY}
        inventory={proposal?.inventory ?? EMPTY_INVENTORY}
        showToolbar={false}
      />
    );
  }, [
    deckPack.state,
    workingTemplateContent,
    themeColor,
    effectiveThemeSource,
    clientData.proposal_name,
    previewPageIds,
    proposal?.inventory,
    deck?.contentByInstanceId,
    enabledPageInstances,
    isSchemaV3Deck,
  ]);

  const enabledPageKeys = useMemo(() => previewPageIds.map((id) => `page${id}`), [previewPageIds]);

  const deckWarnings = deck?.warnings ?? [];

  const handleAiApplyUpdates = useCallback(
    (updates) => {
      if (readOnly || deckLocked) return;
      dispatch(mergeTemplateContent(updates));
    },
    [dispatch, readOnly, deckLocked],
  );

  const handleSave = async () => {
    try {
      const brandJson = buildBrandJson();
      const result = await dispatch(
        persistProposalDeck({
          brandJson,
          colorTheme: themeSourceToColorTheme(themeSource),
          website_url: websiteCommitted,
        }),
      ).unwrap();
      const savedLabel = result?.version?.label;
      showSuccessToast(savedLabel ? `Saved — ${savedLabel}` : 'Proposal saved');
    } catch (error) {
      showErrorToast(error?.message || 'Save failed');
    }
  };

  const handleVersionChange = useCallback(
    async (versionName) => {
      if (!versionName || versionName === activeVersionId) return;
      try {
        const payload = await dispatch(applyProposalVersion(versionName)).unwrap();
        showSuccessToast(`Previewing ${payload.version?.label || 'version'}`);
      } catch (error) {
        showErrorToast(error?.message || 'Could not load version');
      }
    },
    [dispatch, activeVersionId],
  );

  const canRevertVersion = useMemo(
    () => versionRequiresRevertConfirm(versions, activeVersionId),
    [versions, activeVersionId],
  );

  const handleVersionRevert = useCallback(() => {
    const target = versions.find((item) => item.name === activeVersionId);
    if (!target || !versionRequiresRevertConfirm(versions, activeVersionId)) return;
    setRevertConfirm({ open: true, version: target });
  }, [versions, activeVersionId]);

  const handleConfirmRevert = useCallback(async () => {
    const versionName = revertConfirm.version?.name;
    if (!versionName) return;
    setRevertBusy(true);
    try {
      const payload = await dispatch(revertProposalVersion(versionName)).unwrap();
      setRevertConfirm({ open: false, version: null });
      const removed = payload.removedCount ?? 0;
      showSuccessToast(
        removed > 0
          ? `Reverted to ${payload.result?.version?.label || revertConfirm.version?.label} — ${removed} later version${removed === 1 ? '' : 's'} removed`
          : `Reverted to ${payload.result?.version?.label || revertConfirm.version?.label}`,
      );
    } catch (error) {
      showErrorToast(error?.message || 'Revert failed');
    } finally {
      setRevertBusy(false);
    }
  }, [dispatch, revertConfirm.version]);

  const saveLabel =
    status === BUILDER_STATUS.SAVING ? 'Saving…' : isDirty ? 'Save changes' : 'Save';

  const contactName = proposal?.contact || '';
  const statusBadge =
    [proposal?.color_theme, proposal?.status].filter(Boolean).join(' | ') || 'Draft';

  return (
    <div className='flex h-full min-h-0 flex-col bg-bg-weak-100' style={publicationThemeVars}>
      <ProposalBuilderHeader
        title={clientData.proposal_name || clientData.lead_account || 'Untitled Proposal'}
        statusLabel={statusBadge}
        templateLabel={templateLabel || templateId}
        account={clientData.lead_account}
        city={clientData.city}
        seats={clientData.seats_required}
        contactName={contactName}
        onBack={onExit}
        onClose={onExit}
        onSave={handleSave}
        onPdf={handlePdfExport}
        proposalId={proposalId}
        onAiToggle={() => setAiPanelOpen((open) => !open)}
        aiOpen={aiPanelOpen}
        saveLabel={saveLabel}
        saveDisabled={status === BUILDER_STATUS.SAVING}
        pdfDisabled={exportBusy || deckPack.state !== 'ready'}
        readOnly={readOnly}
        versions={versions}
        activeVersionId={activeVersionId}
        versionsLoading={versionsLoading}
        onVersionChange={handleVersionChange}
        canRevert={canRevertVersion}
        onVersionRevert={handleVersionRevert}
        onAnalytics={() => setAnalyticsOpen(true)}
        analyticsDisabled={!proposalId}
      />

      <ProposalAnalyticsModal
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        proposalId={proposalId}
      />

      <DeleteConfirmModal
        isOpen={revertConfirm.open}
        onOpenChange={(open) => {
          if (!open && !revertBusy) setRevertConfirm({ open: false, version: null });
        }}
        title={`Revert to ${revertConfirm.version?.label || 'this version'}?`}
        description='This will restore the proposal to the selected version and make it your active version.'
        note={
          countVersionsAfterTarget(versions, revertConfirm.version?.name) > 0
            ? `All ${countVersionsAfterTarget(versions, revertConfirm.version?.name)} version(s) saved after this point will be permanently removed. This cannot be undone.`
            : 'This action cannot be undone.'
        }
        onConfirm={handleConfirmRevert}
        isLoading={revertBusy}
        confirmLabel='Revert'
        loadingLabel='Reverting…'
      />

      {themeToast ? (
        <div
          className='shrink-0 border-b border-warning-light bg-warning-lighter px-6 py-2 text-center text-paragraph-x-small text-warning-base'
          role='status'
        >
          {themeToast}
        </div>
      ) : null}

      {deckWarnings.length > 0 ? (
        <div className='shrink-0 border-b border-warning-light bg-warning-lighter px-6 py-2 text-paragraph-x-small text-warning-base'>
          <div className='flex items-center justify-center gap-2'>
            <RiErrorWarningLine className='size-4' aria-hidden />
            <span>
              {`Some bound pages no longer match inventory (${deckWarnings.length}). Review page bindings.`}
            </span>
          </div>
        </div>
      ) : null}

      <div className='flex min-h-0 flex-1'>
        <main className='flex min-w-0 flex-1 flex-col overflow-hidden bg-bg-weak-100 p-0'>
          {previewMode === 'compare' ? (
            <div className='proposal-builder-preview-canvas flex min-h-0 flex-1 flex-col overflow-hidden'>
              {deckPack.state === 'empty' ? (
                <div className='flex flex-col items-center justify-center px-10 py-20 text-center'>
                  <RiSparklingLine size={48} className='mb-4 opacity-40 text-icon-soft-400' />
                  <h3 className='text-label-md text-text-sub-600'>No pages selected</h3>
                  <p className='mt-2 text-paragraph-small text-text-soft-400'>
                    Select pages in Proposal Pages to build your deck.
                  </p>
                </div>
              ) : (
                comparePreviewNode
              )}
            </div>
          ) : previewMode === 'pdf' ? (
            <div className='proposal-builder-preview-canvas proposal-pdf-preview-mode flex min-h-0 flex-1 flex-col overflow-hidden'>
              {deckPack.state === 'empty' ? (
                <div className='flex flex-col items-center justify-center px-10 py-20 text-center'>
                  <RiSparklingLine size={48} className='mb-4 opacity-40 text-icon-soft-400' />
                  <h3 className='text-label-md text-text-sub-600'>No pages selected</h3>
                  <p className='mt-2 text-paragraph-small text-text-soft-400'>
                    Select pages in Proposal Pages to build your deck.
                  </p>
                </div>
              ) : (
                pdfPreviewNode
              )}
            </div>
          ) : (
            <ProposalPreviewZoomProvider
              key={previewLayoutKey}
              ref={previewZoomRef}
              exportRef={previewExportRef}
              deckEmpty={deckPack.state === 'empty'}
              totalPages={previewPageIds.length > 0 ? previewPageIds.length : PROPOSAL_PAGE_COUNT}
              pageLayoutKey={previewLayoutKey}
              pageIds={previewPageInstanceIds}
              className='proposal-builder-preview-canvas proposal-preview-workspace border-0 rounded-none bg-bg-weak-100 shadow-none'
            >
              {deckPack.state === 'empty' ? (
                <div className='flex flex-col items-center justify-center px-10 py-20 text-center'>
                  <RiSparklingLine size={48} className='mb-4 opacity-40 text-icon-soft-400' />
                  <h3 className='text-label-md text-text-sub-600'>No pages selected</h3>
                  <p className='mt-2 text-paragraph-small text-text-soft-400'>
                    Select pages in Proposal Pages to build your deck.
                  </p>
                </div>
              ) : (
                templatePreviewNode
              )}
            </ProposalPreviewZoomProvider>
          )}
        </main>

        {!aiPanelOpen ? (
          <ProposalBuilderControlsPanel
            previewMode={previewMode}
            onPreviewModeChange={(mode) => dispatch(setPreviewMode(mode))}
            themeSource={themeSource}
            onThemeSourceChange={setThemeSource}
            websiteUrl={websiteDraft}
            onWebsiteUrlChange={handleWebsiteUrlChange}
            onWebsiteUrlCommit={handleWebsiteUrlCommit}
            templateId={proposalTemplate || templateOptions[0]?.value}
            templateOptions={templateOptions}
            onTemplateChange={handleTemplateChange}
            websitePalette={websitePalette}
            themeColor={themeColor}
            onThemeColorChange={setThemeColor}
            themeLoading={themeLoading}
            hasWebsite={hasWebsite}
            logoCandidates={logoCandidates}
            clientLogoUrl={clientLogoUrl}
            onSelectLogo={selectLogoCandidate}
            onUploadLogo={uploadClientLogo}
            selectedCount={selectedCount}
            totalPages={totalPages}
            pagesState={pagesState}
            pageOrder={pageOrder}
            pagePlan={isSchemaV3Deck ? pagePlan : null}
            onTogglePage={handleTogglePage}
            onToggleAllPages={handleToggleAllPages}
            onTogglePageInstance={handleTogglePage}
            onReorderCity={handleReorderCity}
            onReorderCenter={handleReorderCenter}
            onReorderPages={handleReorderPages}
            readOnly={readOnly}
            sidebarDragPageRef={sidebarDragPageRef}
            activePageId={activePageId}
            onSelectPage={handleSelectPage}
          />
        ) : null}

        {aiPanelOpen ? (
          <ProposalBuilderAiPanel
            onClose={() => setAiPanelOpen(false)}
            clientData={clientData}
            templateContent={workingTemplateContent}
            enabledPageKeys={enabledPageKeys}
            onApplyUpdates={handleAiApplyUpdates}
            readOnly={readOnly || deckLocked}
          />
        ) : null}
      </div>

      {deckLocked ? (
        <div className='shrink-0 border-t border-stroke-soft-200 bg-bg-weak-50 px-6 py-2 text-center'>
          <button
            type='button'
            className='text-label-sm text-primary-base hover:underline'
            onClick={() => dispatch(setDeckLocked(false))}
          >
            Unlock to edit
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ProposalBuilderShell;
