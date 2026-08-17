import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  getCrmProposal,
  saveCrmProposalDeck,
  themeSourceToColorTheme,
  listCrmProposalVersions,
  getCrmProposalVersion,
  restoreCrmProposalVersion,
} from '@/api/crmProposals';
import { getCrmAccount } from '@/api/crmAccounts';
import {
  buildDeckSavePayload,
  buildInitialDeckState,
  stripLegacyDeckFields,
} from '@/components/ui/proposal-builder/deck/build-initial-deck-state';
import { loadTemplateDefinitionFromCrm } from '@/services/crm-proposal-template-service';
import {
  normalizePageOrder,
  reorderPages as applyPageReorder,
} from '@/components/ui/proposal-builder/deck/proposal-page-order';
import {
  findPageInstance,
  reorderCenterWithinCity,
  reorderCityGroup,
  setPageInstanceEnabled,
} from '@/components/ui/proposal-builder/deck/proposal-page-plan';
import {
  DEFAULT_PROPOSAL_TEMPLATE_KEY,
  normalizeProposalTemplateKey,
  resolveTemplate,
} from '@/components/ui/proposal-builder/deck/template-registry';
import { ensureProposalTemplateSettingsLoaded } from '@/components/ui/proposal-builder/proposal-template/proposal-template-settings';
import { BUILDER_STATUS } from '@/components/ui/proposal-builder/deck/constants';
import {
  DEVX_BRAND_ANCHORS,
  PROPOSAL_PRIMARY_COLOR,
  normHex,
} from '@/components/ui/proposal-builder/theme/theme-contrast';
import { extractErrorMessage } from '@/utils/error-utils';

const DEVX_PRIMARY = DEVX_BRAND_ANCHORS[0];

export { BUILDER_STATUS };

const deckInitial = {
  deck_schema_version: 2,
  brandPalette: [],
  brandCombinedScheme: null,
  pagesState: {},
  pageOrder: [],
  activePageId: 1,
  templateContent: null,
  previewMode: 'web',
  deckLocked: false,
  warnings: [],
};

const initialState = {
  status: BUILDER_STATUS.IDLE,
  proposalId: null,
  proposal: null,
  proposalTemplate: null,
  templateId: null,
  templateLabel: null,
  definition: null,
  hydrationContext: null,
  deck: { ...deckInitial },
  error: null,
  saveError: null,
  readOnly: false,
  isDirty: false,
  lastSavedAt: null,
  savedDeckSnapshot: null,
  versions: [],
  activeVersionId: null,
  versionsLoading: false,
  versionError: null,
  builderTheme: {
    themeSource: 'devx',
    themeColor: PROPOSAL_PRIMARY_COLOR,
  },
};

export const loadProposalBuilder = createAsyncThunk(
  'crmProposalBuilder/load',
  async ({ proposalId, readOnly = false }, { rejectWithValue }) => {
    try {
      let proposal = await getCrmProposal(proposalId);
      if (!proposal) {
        return rejectWithValue('Proposal not found.');
      }
      if (proposal.account && !proposal.account_name) {
        try {
          const account = await getCrmAccount(proposal.account);
          proposal = {
            ...proposal,
            account_name: account?.account_name || account?.name || '',
          };
        } catch {
          // Account label is optional for template hydration.
        }
      }
      const proposalTemplate = normalizeProposalTemplateKey(
        proposal.proposal_template || DEFAULT_PROPOSAL_TEMPLATE_KEY,
      );
      const template = resolveTemplate(proposalTemplate);
      if (!template) {
        return rejectWithValue(`Unknown proposal template: ${proposalTemplate}`);
      }
      const definition = await loadTemplateDefinitionFromCrm(proposalTemplate);
      if (!definition) {
        return rejectWithValue(`Unknown proposal template: ${proposalTemplate}`);
      }

      try {
        await ensureProposalTemplateSettingsLoaded();
      } catch {
        // Allow fallback to baked registries when settings API is unavailable.
      }

      const hydrationContext = template.buildHydrationContext(proposal);
      const rawDeck = stripLegacyDeckFields(proposal.deck_json);
      if (!rawDeck?.pagePlan) {
        return rejectWithValue(
          'Proposal deck is missing pagePlan. Delete this proposal and create a new one.',
        );
      }
      const deck = buildInitialDeckState(rawDeck, {
        hydrationContext,
        proposal,
        forceHydrate: true,
      });
      const brand = proposal.brand_json;
      if (brand?.palette?.length) {
        deck.brandPalette = brand.palette;
        deck.brandCombinedScheme = brand.combinedScheme ?? deck.brandCombinedScheme ?? null;
      }
      return {
        proposalId,
        proposal,
        proposalTemplate,
        templateId: template.id,
        templateLabel: template.label,
        definition,
        deck,
        hydrationContext,
        readOnly,
      };
    } catch (error) {
      const message = extractErrorMessage(error, 'Could not load proposal. Please try again.');
      if (/duplicate page instance id/i.test(message)) {
        return rejectWithValue(
          'Inventory has duplicate page instances. Please check center/space ids and try again.',
        );
      }
      return rejectWithValue(message);
    }
  },
);

export const switchProposalTemplate = createAsyncThunk(
  'crmProposalBuilder/switchTemplate',
  async (proposalTemplateKey, { getState, rejectWithValue }) => {
    const state = getState().crmProposalBuilder;
    if (!state.proposal) {
      return rejectWithValue('No proposal loaded.');
    }
    const proposalTemplate = normalizeProposalTemplateKey(proposalTemplateKey);
    const template = resolveTemplate(proposalTemplate);
    if (!template) {
      return rejectWithValue(`Unknown proposal template: ${proposalTemplate}`);
    }
    const definition = await loadTemplateDefinitionFromCrm(proposalTemplate);
    if (!definition) {
      return rejectWithValue(`Unknown proposal template: ${proposalTemplate}`);
    }
    return { proposalTemplate, template, definition };
  },
);

export const persistProposalDeck = createAsyncThunk(
  'crmProposalBuilder/saveDeck',
  async (options = {}, { getState, rejectWithValue }) => {
    const state = getState().crmProposalBuilder;
    const proposalId = state.proposalId;
    if (!proposalId) {
      return rejectWithValue('No proposal loaded.');
    }
    try {
      const payload = buildDeckSavePayload(state.deck);
      const brandJson = options.brandJson ?? null;
      if (brandJson?.palette?.length) {
        payload.brandPalette = brandJson.palette;
        payload.brandCombinedScheme = brandJson.combinedScheme ?? null;
      } else if (brandJson?.themeSource === 'devx') {
        payload.brandPalette = brandJson.palette ?? [];
        payload.brandCombinedScheme = brandJson.combinedScheme ?? null;
      }
      const colorTheme =
        options.colorTheme ??
        (brandJson?.themeSource ? themeSourceToColorTheme(brandJson.themeSource) : null);
      const result = await saveCrmProposalDeck(proposalId, payload, {
        proposal_template: state.proposalTemplate ?? state.proposal?.proposal_template,
        color_theme: colorTheme,
        brand_json: brandJson,
        ...(options.website_url !== undefined
          ? { website_url: options.website_url }
          : state.proposal?.website_url !== undefined
            ? { website_url: state.proposal.website_url }
            : {}),
      });
      return {
        result,
        savedAt: Date.now(),
        brandJson,
        colorTheme,
        version: result?.version ?? null,
      };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Could not save proposal.'));
    }
  },
);

export const loadProposalVersions = createAsyncThunk(
  'crmProposalBuilder/loadVersions',
  async (proposalId, { rejectWithValue }) => {
    try {
      const versions = await listCrmProposalVersions(proposalId);
      return { versions, activeVersionId: versions[0]?.name ?? null };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Could not load version history.'));
    }
  },
);

export const applyProposalVersion = createAsyncThunk(
  'crmProposalBuilder/applyVersion',
  async (versionName, { getState, rejectWithValue }) => {
    const state = getState().crmProposalBuilder;
    if (!state.definition) {
      return rejectWithValue('Proposal template is not loaded.');
    }
    try {
      const version = await getCrmProposalVersion(versionName);
      if (!version) return rejectWithValue('Version not found.');
      const deck = buildInitialDeckState(stripLegacyDeckFields(version.deck_json), {
        hydrationContext: state.hydrationContext,
      });
      if (version.brand_json?.palette?.length) {
        deck.brandPalette = version.brand_json.palette;
        deck.brandCombinedScheme = version.brand_json.combinedScheme ?? null;
      }
      return {
        version,
        deck,
        brandJson: version.brand_json ?? null,
        colorTheme: version.color_theme ?? null,
      };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Could not load version.'));
    }
  },
);

export const revertProposalVersion = createAsyncThunk(
  'crmProposalBuilder/revertVersion',
  async (versionName, { getState, rejectWithValue }) => {
    const state = getState().crmProposalBuilder;
    const proposalId = state.proposalId;
    if (!proposalId || !state.definition) {
      return rejectWithValue('No proposal loaded.');
    }
    try {
      const result = await restoreCrmProposalVersion(proposalId, versionName);
      const deck = buildInitialDeckState(stripLegacyDeckFields(result.deck_json), {
        hydrationContext: state.hydrationContext,
      });
      if (result.brand_json?.palette?.length) {
        deck.brandPalette = result.brand_json.palette;
        deck.brandCombinedScheme = result.brand_json.combinedScheme ?? null;
      }
      return {
        result,
        deck,
        brandJson: result.brand_json ?? null,
        colorTheme: result.color_theme ?? null,
        activeVersionId: versionName,
        versions: Array.isArray(result.versions) ? result.versions : [],
        removedCount: result.removed_count ?? 0,
      };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Could not revert proposal.'));
    }
  },
);

const crmProposalBuilderSlice = createSlice({
  name: 'crmProposalBuilder',
  initialState,
  reducers: {
    resetProposalBuilder(state) {
      Object.assign(state, initialState);
      state.deck = { ...deckInitial };
    },
    discardBuilderChanges(state) {
      if (!state.savedDeckSnapshot) return;
      state.deck = JSON.parse(JSON.stringify(state.savedDeckSnapshot));
      state.isDirty = false;
      state.saveError = null;
    },
    setActivePage(state, action) {
      const pageId = action.payload;
      const isSchemaV3 =
        Number(state.deck?.deck_schema_version ?? 0) >= 3 ||
        Boolean(state.deck?.pagePlan) ||
        Boolean(state.deck?.contentByInstanceId);

      if (isSchemaV3) {
        if (typeof pageId === 'string' && pageId) {
          state.deck.activePageId = pageId;
        }
        return;
      }

      const legacyPageId = Number(pageId);
      if (legacyPageId) state.deck.activePageId = legacyPageId;
    },
    togglePage(state, action) {
      const pageId = Number(action.payload);
      if (!pageId) return;
      state.deck.pagesState[pageId] = !state.deck.pagesState[pageId];
      state.isDirty = true;
    },
    togglePageInstance(state, action) {
      const instanceId = action.payload;
      if (!instanceId || !state.deck?.pagePlan) return;
      const instance = findPageInstance(state.deck.pagePlan, instanceId);
      if (!instance) return;
      const nextPlan = setPageInstanceEnabled(state.deck.pagePlan, instanceId, !instance.enabled);
      if (nextPlan !== state.deck.pagePlan) {
        state.deck.pagePlan = nextPlan;
        state.isDirty = true;
      }
    },
    setPagesStateBulk(state, action) {
      state.deck.pagesState = {
        ...state.deck.pagesState,
        ...action.payload,
      };
      state.isDirty = true;
    },
    setPageInstanceContent(state, action) {
      const { instanceId, content } = action.payload ?? {};
      if (!instanceId || !state.deck?.contentByInstanceId) return;
      state.deck.contentByInstanceId = {
        ...state.deck.contentByInstanceId,
        [instanceId]: content ?? {},
      };
      state.isDirty = true;
    },
    setTemplateContent(state, action) {
      state.deck.templateContent = action.payload;
      state.isDirty = true;
    },
    mergeTemplateContent(state, action) {
      const patches = action.payload;
      if (!patches || typeof patches !== 'object') return;
      state.deck.templateContent = { ...state.deck.templateContent, ...patches };
      state.isDirty = true;
    },
    reorderPages(state, action) {
      const { draggedId, targetId } = action.payload;
      state.deck.pageOrder = normalizePageOrder(
        applyPageReorder(state.deck.pageOrder, draggedId, targetId),
      );
      state.isDirty = true;
    },
    reorderCity(state, action) {
      const { draggedId, targetId } = action.payload ?? {};
      if (!state.deck?.pagePlan) return;
      const nextPlan = reorderCityGroup(state.deck.pagePlan, draggedId, targetId);
      if (nextPlan !== state.deck.pagePlan) {
        state.deck.pagePlan = nextPlan;
        state.isDirty = true;
      }
    },
    reorderCenter(state, action) {
      const { cityId, draggedId, targetId } = action.payload ?? {};
      if (!state.deck?.pagePlan) return;
      const nextPlan = reorderCenterWithinCity(state.deck.pagePlan, cityId, draggedId, targetId);
      if (nextPlan !== state.deck.pagePlan) {
        state.deck.pagePlan = nextPlan;
        state.isDirty = true;
      }
    },
    setPreviewMode(state, action) {
      state.deck.previewMode = action.payload;
    },
    setDeckLocked(state, action) {
      state.deck.deckLocked = Boolean(action.payload);
    },
    setDeckBrand(state, action) {
      state.deck.brandPalette = action.payload?.palette ?? [];
      state.deck.brandCombinedScheme = action.payload?.combinedScheme ?? null;
      state.isDirty = true;
    },
    setProposalWebsiteUrl(state, action) {
      if (state.proposal) {
        state.proposal.website_url = action.payload ?? '';
      }
    },
    setBuilderTheme(state, action) {
      const { themeSource, themeColor } = action.payload ?? {};
      if (themeSource) state.builderTheme.themeSource = themeSource;
      if (themeColor) {
        state.builderTheme.themeColor = normHex(themeColor) || DEVX_PRIMARY;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProposalBuilder.pending, (state, action) => {
        state.status = BUILDER_STATUS.LOADING;
        state.proposalId = action.meta.arg?.proposalId ?? null;
        state.error = null;
        state.readOnly = Boolean(action.meta.arg?.readOnly);
      })
      .addCase(loadProposalBuilder.fulfilled, (state, action) => {
        state.status = BUILDER_STATUS.READY;
        state.proposalId = action.payload.proposalId;
        state.proposal = action.payload.proposal;
        state.templateId = action.payload.templateId;
        state.templateLabel = action.payload.templateLabel;
        state.definition = action.payload.definition;
        state.deck = action.payload.deck;
        state.proposalTemplate = action.payload.proposalTemplate;
        state.savedDeckSnapshot = JSON.parse(JSON.stringify(action.payload.deck));
        state.hydrationContext = action.payload.hydrationContext;
        state.readOnly = action.payload.readOnly;
        state.error = null;
        state.isDirty = false;
        state.saveError = null;
      })
      .addCase(loadProposalBuilder.rejected, (state, action) => {
        state.status = BUILDER_STATUS.ERROR;
        state.error = action.payload || 'Failed to load proposal.';
        state.proposal = null;
        state.definition = null;
      })
      .addCase(persistProposalDeck.pending, (state) => {
        state.status = BUILDER_STATUS.SAVING;
        state.saveError = null;
      })
      .addCase(persistProposalDeck.fulfilled, (state, action) => {
        state.status = BUILDER_STATUS.READY;
        state.isDirty = false;
        state.lastSavedAt = action.payload.savedAt;
        if (action.payload.brandJson) {
          state.deck.brandPalette = action.payload.brandJson.palette ?? [];
          state.deck.brandCombinedScheme = action.payload.brandJson.combinedScheme ?? null;
        }
        state.savedDeckSnapshot = JSON.parse(JSON.stringify(state.deck));
        if (action.payload.brandJson && state.proposal) {
          state.proposal.brand_json = action.payload.brandJson;
        }
        if (action.payload.colorTheme && state.proposal) {
          state.proposal.color_theme = action.payload.colorTheme;
        }
        if (action.payload.version) {
          const existingIdx = state.versions.findIndex(
            (v) => v.name === action.payload.version.name,
          );
          if (existingIdx >= 0) {
            state.versions[existingIdx] = action.payload.version;
          } else {
            state.versions = [action.payload.version, ...state.versions];
          }
          state.activeVersionId = action.payload.version.name;
        }
      })
      .addCase(persistProposalDeck.rejected, (state, action) => {
        state.status = BUILDER_STATUS.READY;
        state.saveError = action.payload || 'Save failed.';
      })
      .addCase(switchProposalTemplate.fulfilled, (state, action) => {
        const { proposalTemplate, template, definition } = action.payload;
        if (!template || !state.proposal || !definition) return;

        state.proposalTemplate = proposalTemplate;
        state.proposal.proposal_template = proposalTemplate;
        state.templateId = template.id;
        state.templateLabel = template.label;
        state.definition = definition;
        state.hydrationContext = template.buildHydrationContext(state.proposal);
        state.isDirty = true;
      })
      .addCase(loadProposalVersions.pending, (state) => {
        state.versionsLoading = true;
        state.versionError = null;
      })
      .addCase(loadProposalVersions.fulfilled, (state, action) => {
        state.versionsLoading = false;
        state.versions = action.payload.versions ?? [];
        state.activeVersionId = action.payload.activeVersionId ?? state.activeVersionId;
      })
      .addCase(loadProposalVersions.rejected, (state, action) => {
        state.versionsLoading = false;
        state.versionError = action.payload || 'Could not load versions.';
      })
      .addCase(applyProposalVersion.fulfilled, (state, action) => {
        state.deck = action.payload.deck;
        state.savedDeckSnapshot = JSON.parse(JSON.stringify(action.payload.deck));
        state.activeVersionId = action.payload.version?.name ?? state.activeVersionId;
        state.isDirty = false;
        if (action.payload.brandJson && state.proposal) {
          state.proposal.brand_json = action.payload.brandJson;
        }
        if (action.payload.colorTheme && state.proposal) {
          state.proposal.color_theme = action.payload.colorTheme;
        }
      })
      .addCase(revertProposalVersion.fulfilled, (state, action) => {
        state.deck = action.payload.deck;
        state.savedDeckSnapshot = JSON.parse(JSON.stringify(action.payload.deck));
        state.activeVersionId = action.payload.activeVersionId ?? state.activeVersionId;
        state.isDirty = false;
        if (Array.isArray(action.payload.versions)) {
          state.versions = action.payload.versions;
        }
        if (action.payload.brandJson && state.proposal) {
          state.proposal.brand_json = action.payload.brandJson;
        }
        if (action.payload.colorTheme && state.proposal) {
          state.proposal.color_theme = action.payload.colorTheme;
        }
      });
  },
});

export const {
  resetProposalBuilder,
  discardBuilderChanges,
  setActivePage,
  togglePage,
  togglePageInstance,
  setPagesStateBulk,
  setPageInstanceContent,
  setTemplateContent,
  mergeTemplateContent,
  reorderPages,
  reorderCity,
  reorderCenter,
  setPreviewMode,
  setDeckLocked,
  setDeckBrand,
  setProposalWebsiteUrl,
  setBuilderTheme,
} = crmProposalBuilderSlice.actions;

export const selectBuilderProposalId = (state) => state.crmProposalBuilder?.proposalId;

export const selectCrmProposalBuilder = (state) => state.crmProposalBuilder;
export const selectBuilderStatus = (state) => state.crmProposalBuilder?.status;
export const selectBuilderError = (state) => state.crmProposalBuilder?.error;
export const selectBuilderProposal = (state) => state.crmProposalBuilder?.proposal;
export const selectBuilderProposalTemplate = (state) => state.crmProposalBuilder?.proposalTemplate;
export const selectBuilderTemplateId = (state) => state.crmProposalBuilder?.templateId;
export const selectBuilderTemplateLabel = (state) => state.crmProposalBuilder?.templateLabel;
export const selectBuilderDefinition = (state) => state.crmProposalBuilder?.definition;
export const selectBuilderDeck = (state) => state.crmProposalBuilder?.deck;

export const selectBuilderSavedDeckSnapshot = (state) =>
  state.crmProposalBuilder?.savedDeckSnapshot;

export const selectBuilderTemplateContent = (state) =>
  state.crmProposalBuilder?.deck?.templateContent ?? null;

export const selectBuilderHydrationContext = (state) => state.crmProposalBuilder?.hydrationContext;
export const selectBuilderTheme = (state) => state.crmProposalBuilder?.builderTheme;
export const selectBuilderThemeColor = () => PROPOSAL_PRIMARY_COLOR;
export const selectBuilderClientAiTheme = () => false;
export const selectBuilderIsDirty = (state) => state.crmProposalBuilder?.isDirty;
export const selectBuilderReadOnly = (state) => state.crmProposalBuilder?.readOnly;
export const selectBuilderSaveError = (state) => state.crmProposalBuilder?.saveError;
export const selectBuilderLastSavedAt = (state) => state.crmProposalBuilder?.lastSavedAt;

export const selectBuilderDeckLocked = (state) =>
  Boolean(state.crmProposalBuilder?.deck?.deckLocked);

export const selectBuilderVersions = (state) => state.crmProposalBuilder?.versions ?? [];

export const selectBuilderActiveVersionId = (state) =>
  state.crmProposalBuilder?.activeVersionId ?? null;

export const selectBuilderVersionsLoading = (state) =>
  Boolean(state.crmProposalBuilder?.versionsLoading);

export default crmProposalBuilderSlice.reducer;
