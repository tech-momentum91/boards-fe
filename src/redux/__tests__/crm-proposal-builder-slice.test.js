jest.mock('@/api/crmProposals', () => ({
  getCrmProposal: jest.fn(),
  saveCrmProposalDeck: jest.fn(),
  themeSourceToColorTheme: jest.fn(),
  listCrmProposalVersions: jest.fn(),
  getCrmProposalVersion: jest.fn(),
  restoreCrmProposalVersion: jest.fn(),
}));
jest.mock('@/api/crmAccounts', () => ({
  getCrmAccount: jest.fn(),
}));
jest.mock('@/services/crm-proposal-template-service', () => ({
  loadTemplateDefinitionFromCrm: jest.fn(),
}));
jest.mock('@/components/ui/proposal-builder/deck/build-initial-deck-state', () => ({
  buildDeckSavePayload: jest.fn(),
  buildInitialDeckState: jest.fn(),
  stripLegacyDeckFields: (deck) => deck,
}));
jest.mock('@/components/ui/proposal-builder/deck/template-registry', () => ({
  DEFAULT_PROPOSAL_TEMPLATE_KEY: 'default',
  normalizeProposalTemplateKey: (value) => value,
  resolveTemplate: () => ({
    id: 'default-template',
    label: 'Default Template',
    buildHydrationContext: () => ({}),
  }),
}));
jest.mock('@/components/ui/proposal-builder/proposal-template/proposal-template-settings', () => ({
  ensureProposalTemplateSettingsLoaded: jest.fn(),
}));

const {
  default: reducer,
  BUILDER_STATUS,
  loadProposalBuilder,
  setActivePage,
  setPageInstanceContent,
  togglePageInstance,
} = require('@/redux/crmProposalBuilderSlice');
const { findPageInstance } = require('@/components/ui/proposal-builder/deck/proposal-page-plan');
const {
  fixtureSingleCenterPagePlan,
} = require('@/components/ui/proposal-builder/deck/__tests__/page-plan-fixtures');
const { configureStore } = require('@reduxjs/toolkit');
const { getCrmProposal } = require('@/api/crmProposals');
const { loadTemplateDefinitionFromCrm } = require('@/services/crm-proposal-template-service');
const {
  buildInitialDeckState,
} = require('@/components/ui/proposal-builder/deck/build-initial-deck-state');

function buildSchemaV3State() {
  const pagePlan = fixtureSingleCenterPagePlan();
  const baseState = reducer(undefined, { type: 'crmProposalBuilder/INIT' });
  const cityId = pagePlan.cities[0].page.id;
  const layoutId = pagePlan.cities[0].centers[0].pages[2].id;

  return {
    ...baseState,
    deck: {
      ...baseState.deck,
      deck_schema_version: 3,
      pagePlan,
      contentByInstanceId: {
        [cityId]: { heading: 'City heading' },
        [layoutId]: { heading: 'Layout heading' },
      },
      activePageId: cityId,
    },
  };
}

describe('crmProposalBuilderSlice (schema v3)', () => {
  it('stores string instance IDs for active page', () => {
    const state = buildSchemaV3State();
    const targetId = state.deck.pagePlan.cities[0].centers[0].pages[2].id;

    const nextState = reducer(state, setActivePage(targetId));

    expect(nextState.deck.activePageId).toBe(targetId);
  });

  it('toggles only the targeted instance', () => {
    const state = buildSchemaV3State();
    const targetId = state.deck.pagePlan.cities[0].centers[0].pages[2].id;
    const otherId = state.deck.pagePlan.cities[0].page.id;

    const nextState = reducer(state, togglePageInstance(targetId));

    expect(findPageInstance(nextState.deck.pagePlan, targetId)?.enabled).toBe(false);
    expect(findPageInstance(nextState.deck.pagePlan, otherId)?.enabled).toBe(true);
  });

  it('updates content for only one instance', () => {
    const state = buildSchemaV3State();
    const targetId = state.deck.pagePlan.cities[0].centers[0].pages[2].id;
    const otherId = state.deck.pagePlan.cities[0].page.id;

    const nextState = reducer(
      state,
      setPageInstanceContent({
        instanceId: targetId,
        content: { heading: 'Updated layout heading' },
      }),
    );

    expect(nextState.deck.contentByInstanceId[targetId]).toEqual({
      heading: 'Updated layout heading',
    });
    expect(nextState.deck.contentByInstanceId[otherId]).toEqual(
      state.deck.contentByInstanceId[otherId],
    );
  });
});

describe('crmProposalBuilderSlice (legacy)', () => {
  it('keeps numeric page IDs for legacy decks', () => {
    const state = reducer(undefined, { type: 'crmProposalBuilder/INIT' });

    const nextState = reducer(state, setActivePage('2'));

    expect(nextState.deck.activePageId).toBe(2);
  });
});

describe('crmProposalBuilderSlice (load errors)', () => {
  it('surfaces duplicate page instance id errors as builder state', async () => {
    getCrmProposal.mockResolvedValue({
      name: 'PROP-001',
      proposal_template: 'default',
      deck_json: {
        pagePlan: { prefix: [], cities: [], suffix: [] },
      },
      inventory: [],
    });
    loadTemplateDefinitionFromCrm.mockResolvedValue({ id: 'default-template' });
    buildInitialDeckState.mockImplementation(() => {
      throw new Error('Duplicate page instance id: city:ahmedabad');
    });

    const store = configureStore({
      reducer: { crmProposalBuilder: reducer },
    });

    await store.dispatch(loadProposalBuilder({ proposalId: 'PROP-001' }));

    const state = store.getState().crmProposalBuilder;
    expect(state.status).toBe(BUILDER_STATUS.ERROR);
    expect(state.error).toBe(
      'Inventory has duplicate page instances. Please check center/space ids and try again.',
    );
  });
});
