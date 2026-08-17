import {
  buildInitialDeckState,
  buildDeckSavePayload,
} from '@/components/ui/proposal-builder/deck/build-initial-deck-state';
import {
  buildPageInstanceContent,
  resolvePageInstanceInventory,
} from '@/components/ui/proposal-builder/deck/proposal-page-instance-content';
import { setProposalTemplateSettingsForTests } from '@/components/ui/proposal-builder/proposal-template/proposal-template-settings';
import { fixturePuneAhmedabadPagePlan } from '@/components/ui/proposal-builder/deck/__tests__/page-plan-fixtures';

const TEST_TEMPLATE_SETTINGS = {
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
        aboutCity: {
          stats: [{ label: 'Population', value: '7.6M' }],
        },
      },
    },
  },
  centers: {
    'BN-AMD': {
      page4: { statsLayout: 'variation-2' },
      page5: {
        sections: {
          commonAreas: {
            images: {
              1: '/proposal-template/page-5/centers/BN-AMD/common-areas-1.jpg',
            },
          },
        },
      },
    },
  },
};

beforeAll(() => {
  setProposalTemplateSettingsForTests(TEST_TEMPLATE_SETTINGS);
});

afterAll(() => {
  setProposalTemplateSettingsForTests(null);
});

function buildInventoryRow({
  name,
  centerId,
  centerDocName,
  centerName,
  centerAbbr,
  city,
  floor,
  space,
  seats,
  area,
} = {}) {
  const center = {
    id: centerId,
    // Frappe document name may differ from semantic id — prefer `id` when both exist.
    name: centerDocName ?? centerId,
    center_name: centerName,
    center_abbr: centerAbbr,
    city,
  };

  return {
    name,
    center_id: centerId,
    center_name: centerName,
    center_abbr: centerAbbr,
    city,
    floor,
    space,
    lead_req_seats: seats,
    area,
    center,
  };
}

function buildProposal() {
  const inventory = [
    buildInventoryRow({
      name: 'INV-PUNE-01',
      centerId: 'PUNE-001',
      centerDocName: 'CTR-FRAPPE-PUNE-DOC',
      centerName: 'DevX Magarpatta',
      centerAbbr: 'PN-PUN',
      city: 'Pune',
      floor: '3',
      space: 'SP-PUN-01',
      seats: 120,
      area: '14000',
    }),
    buildInventoryRow({
      name: 'INV-BN-01',
      centerId: 'BN-AMD',
      centerDocName: 'CTR-FRAPPE-BN-AMD-DOC',
      centerName: 'Bodakdev',
      centerAbbr: 'BN-AMD',
      city: 'Ahmedabad',
      floor: '12',
      space: 'SP-AMD-01',
      seats: 160,
      area: '21000',
    }),
  ];

  return {
    proposal_title: 'Acme Managed Workspace',
    account: 'Acme Corp',
    account_name: 'Acme Corp',
    website_url: 'https://acme.example',
    color_theme: 'DevX',
    inventory,
  };
}

function buildSavedSchemaV3Deck(proposal, contentByInstanceId = null) {
  const pagePlan = fixturePuneAhmedabadPagePlan();
  const content =
    contentByInstanceId ??
    buildPageInstanceContent(pagePlan, proposal, null, { includeWarnings: false });
  return {
    deck_schema_version: 3,
    pagePlan,
    contentByInstanceId: content,
    activePageId: 'page:page1',
    templateContent: {},
  };
}

describe('proposal-page-instance-content', () => {
  it('hydrates page instances with bound city + center content', () => {
    const proposal = buildProposal();
    const pagePlan = fixturePuneAhmedabadPagePlan();
    const contentByInstanceId = buildPageInstanceContent(pagePlan, proposal);

    const puneContent = contentByInstanceId['city:pune'];
    expect(puneContent.heading).toContain('Pune');
    expect(puneContent.aboutCity.stats[0].value).toBe('7.6M');

    const centerPage4 = contentByInstanceId['center:BN-AMD:page4'];
    const centerPage5 = contentByInstanceId['center:BN-AMD:page5'];
    expect(centerPage4.statsLayout).toBe('variation-2');
    expect(centerPage5.sections.commonAreas.images['1']).toContain(
      '/proposal-template/page-5/centers/BN-AMD/',
    );
  });

  it('prefers nested center id over Frappe name for page4/page5 bindings', () => {
    const proposal = buildProposal();
    const pagePlan = fixturePuneAhmedabadPagePlan();

    // Semantic ids must be used — not the distinct Frappe `name` values.
    expect(pagePlan.cities[0].centers[0].id).toBe('center:PUNE-001');
    expect(pagePlan.cities[1].centers[0].id).toBe('center:BN-AMD');

    const page4 = pagePlan.cities[1].centers[0].pages.find((page) => page.templateKey === 'page4');
    const page5 = pagePlan.cities[1].centers[0].pages.find((page) => page.templateKey === 'page5');

    const page4Rows = resolvePageInstanceInventory(page4, proposal.inventory);
    const page5Rows = resolvePageInstanceInventory(page5, proposal.inventory);
    expect(page4Rows).toHaveLength(1);
    expect(page4Rows[0].name).toBe('INV-BN-01');
    expect(page5Rows[0].name).toBe('INV-BN-01');

    // Bound center content — not inventory[0] (Pune / Magarpatta) fallback.
    const contentByInstanceId = buildPageInstanceContent(pagePlan, proposal);
    expect(contentByInstanceId['center:BN-AMD:page4'].statsLayout).toBe('variation-2');
    expect(contentByInstanceId['center:BN-AMD:page4'].heading).toContain('Bodakdev');
    expect(contentByInstanceId['center:BN-AMD:page5'].heading).toContain('Bodakdev');
    expect(contentByInstanceId['center:BN-AMD:page5'].heading).not.toContain('Magarpatta');
  });

  it('resolves a single inventory row for layout pages', () => {
    const proposal = buildProposal();
    const pagePlan = fixturePuneAhmedabadPagePlan();
    const ahmedabadCity = pagePlan.cities.find((city) => city.id === 'city:ahmedabad');
    const layoutInstance = ahmedabadCity.centers[0].pages.find(
      (page) => page.templateKey === 'page6',
    );

    const rows = resolvePageInstanceInventory(layoutInstance, proposal.inventory);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('INV-BN-01');
  });

  it('loads schema-v3 decks from saved pagePlan without FE rebuild', () => {
    const proposal = buildProposal();
    const saved = buildSavedSchemaV3Deck(proposal);
    const loaded = buildInitialDeckState(saved, { proposal });

    expect(loaded.deck_schema_version).toBe(3);
    expect(loaded.pagePlan).toEqual(saved.pagePlan);
    expect(loaded.contentByInstanceId).toHaveProperty('city:pune');
    expect(typeof loaded.activePageId).toBe('string');
  });

  it('loads legacy decks with string activePageId without treating them as schema v3', () => {
    const legacy = buildInitialDeckState({
      deck_schema_version: 2,
      activePageId: '2',
    });

    expect(legacy.deck_schema_version).toBe(2);
    expect(legacy.pagePlan).toBeUndefined();
    expect(legacy.contentByInstanceId).toBeUndefined();
    expect(legacy.activePageId).toBe('2');
  });

  it('saves schema-v3 fields with the deck payload', () => {
    const proposal = buildProposal();
    const deckState = buildInitialDeckState(buildSavedSchemaV3Deck(proposal), { proposal });

    const payload = buildDeckSavePayload(deckState);
    expect(payload.pagePlan).toEqual(deckState.pagePlan);
    expect(payload.contentByInstanceId).toEqual(deckState.contentByInstanceId);
    expect(payload.activePageId).toBe(deckState.activePageId);
  });

  it('rebuilds empty contentByInstanceId when loading a schema-v3 deck with proposal', () => {
    const proposal = buildProposal();
    const created = buildSavedSchemaV3Deck(proposal);
    const savedDeck = {
      ...created,
      contentByInstanceId: {},
    };

    const loaded = buildInitialDeckState(savedDeck, { proposal });

    expect(loaded.contentByInstanceId['city:pune']).toBeTruthy();
    expect(loaded.contentByInstanceId['city:pune'].heading).toContain('Pune');
    expect(loaded.contentByInstanceId['center:BN-AMD:page4'].heading).toContain('Bodakdev');
    expect(String(JSON.stringify(loaded.contentByInstanceId))).not.toContain('<<City Name>>');
  });

  it('preserves non-empty saved instance content when rebuilding missing entries', () => {
    const proposal = buildProposal();
    const created = buildSavedSchemaV3Deck(proposal);
    const savedDeck = {
      ...created,
      contentByInstanceId: {
        'city:pune': { heading: 'Custom Pune heading' },
      },
    };

    const loaded = buildInitialDeckState(savedDeck, { proposal });

    expect(loaded.contentByInstanceId['city:pune'].heading).toBe('Custom Pune heading');
    expect(loaded.contentByInstanceId['center:BN-AMD:page4']).toBeTruthy();
  });

  it('does not persist v3 fields for legacy decks', () => {
    const legacyDeck = buildInitialDeckState({ deck_schema_version: 2, activePageId: 2 });
    const payload = buildDeckSavePayload({
      ...legacyDeck,
      pagePlan: { forced: true },
      activePageId: 'page:page1',
    });

    expect(payload.pagePlan).toBeUndefined();
    expect(payload.contentByInstanceId).toBeUndefined();
  });

  it('adds warnings when bound instances lose inventory rows', () => {
    const proposal = buildProposal();
    const pagePlan = fixturePuneAhmedabadPagePlan();
    const trimmedProposal = {
      ...proposal,
      inventory: proposal.inventory.slice(0, 1),
    };

    const missingCity = pagePlan.cities.find((city) => city.id === 'city:ahmedabad');
    const missingCenterPages = missingCity?.centers?.[0]?.pages ?? [];

    const result = buildPageInstanceContent(pagePlan, trimmedProposal, null, {
      includeWarnings: true,
    });

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instanceId: missingCity?.page?.id,
          templateKey: 'page3',
        }),
        expect.objectContaining({
          instanceId: missingCenterPages.find((page) => page.templateKey === 'page4')?.id,
          templateKey: 'page4',
        }),
      ]),
    );
  });
});
