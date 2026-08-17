import {
  buildInitialDeckState,
  buildDeckSavePayload,
} from '@/components/ui/proposal-builder/deck/build-initial-deck-state';
import { setProposalTemplateSettingsForTests } from '@/components/ui/proposal-builder/proposal-template/proposal-template-settings';
import { fixtureSingleCenterPagePlan } from '@/components/ui/proposal-builder/deck/__tests__/page-plan-fixtures';

beforeAll(() => {
  setProposalTemplateSettingsForTests({
    version: 1,
    placeholders: {
      CLIENT_BRAND: '<<Client Brand Name>>',
      CLIENT_NAME: '<<Client Name>>',
      CITY_NAME: '<<City Name>>',
      CENTER_NAME: '<<Center Name>>',
      ASSET_NAME: '<<Asset Name>>',
    },
    cities: {
      pune: {
        page3: {
          heading: 'National Presence - Pune',
        },
      },
    },
    centers: {},
  });
});

afterAll(() => {
  setProposalTemplateSettingsForTests(null);
});

function buildSavedSchemaV3Deck() {
  const pagePlan = fixtureSingleCenterPagePlan({
    city: 'Pune',
    cityId: 'pune',
    centerId: 'PUNE-001',
    centerName: 'DevX Magarpatta',
    inventoryId: 'INV-PUNE-01',
    floor: '3',
    space: 'SP-PUN-01',
  });
  return {
    deck_schema_version: 3,
    pagePlan,
    contentByInstanceId: {
      'city:pune': { heading: 'National Presence - Pune' },
      'center:PUNE-001:page4': { heading: 'Asset Overview - DevX Magarpatta' },
    },
    activePageId: 'page:page1',
    templateContent: {},
  };
}

describe('build-initial-deck-state', () => {
  it('loads schema-v3 decks from saved pagePlan (backend-built)', () => {
    const saved = buildSavedSchemaV3Deck();
    const proposal = {
      proposal_title: 'Acme Managed Workspace',
      inventory: [
        {
          name: 'INV-PUNE-01',
          center_id: 'PUNE-001',
          center_name: 'DevX Magarpatta',
          city: 'Pune',
          center: {
            id: 'PUNE-001',
            name: 'PUNE-001',
            center_name: 'DevX Magarpatta',
            city: 'Pune',
          },
        },
      ],
    };

    const loaded = buildInitialDeckState(saved, { proposal });

    expect(loaded.deck_schema_version).toBe(3);
    expect(loaded.pagePlan).toEqual(saved.pagePlan);
    expect(loaded.contentByInstanceId).toHaveProperty('city:pune');
    expect(loaded.activePageId).toBe('page:page1');
  });

  it('keeps legacy decks without inventing a pagePlan', () => {
    const legacy = buildInitialDeckState({ deck_schema_version: 2, activePageId: 2 });
    expect(legacy.deck_schema_version).toBe(2);
    expect(legacy.pagePlan).toBeUndefined();
    expect(legacy.contentByInstanceId).toBeUndefined();
    expect(legacy.activePageId).toBe(2);
  });

  it('saves schema-v3 fields with the deck payload', () => {
    const saved = buildSavedSchemaV3Deck();
    const deckState = buildInitialDeckState(saved);
    const payload = buildDeckSavePayload(deckState);
    expect(payload.pagePlan).toEqual(deckState.pagePlan);
    expect(payload.contentByInstanceId).toEqual(deckState.contentByInstanceId);
    expect(payload.activePageId).toBe(deckState.activePageId);
  });
});
