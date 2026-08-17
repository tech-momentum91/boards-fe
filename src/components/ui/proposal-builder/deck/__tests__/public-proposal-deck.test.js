import { resolvePublicProposalDeck } from '@/components/ui/proposal-builder/deck/public-proposal-deck';

describe('resolvePublicProposalDeck', () => {
  it('returns enabled instance pages for schema v3 decks', () => {
    const deck = {
      deck_schema_version: 3,
      pagePlan: {
        prefix: [
          { id: 'page:page1', templateKey: 'page1', enabled: true },
          { id: 'page:page2', templateKey: 'page2', enabled: false },
        ],
        cities: [
          {
            id: 'city:ahmedabad',
            page: { id: 'city:ahmedabad', templateKey: 'page3', enabled: true },
            centers: [
              {
                id: 'center:001',
                pages: [
                  { id: 'center:001:page4', templateKey: 'page4', enabled: true },
                  { id: 'space:INV-01:layout', templateKey: 'page6', enabled: false },
                ],
              },
            ],
          },
        ],
        suffix: [],
      },
      contentByInstanceId: {
        'page:page1': { heading: 'Cover' },
        'center:001:page4': { heading: 'Center' },
      },
    };

    const resolved = resolvePublicProposalDeck(deck);

    expect(resolved.mode).toBe('instance');
    expect(resolved.pageInstances.map((page) => page.id)).toEqual([
      'page:page1',
      'city:ahmedabad',
      'center:001:page4',
    ]);
    expect(resolved.contentByInstanceId).toEqual(deck.contentByInstanceId);
  });

  it('returns legacy page ids when pagePlan is missing', () => {
    const deck = {
      pagesState: { 1: true, 2: false, 3: true },
      pageOrder: [3, 1, 2],
    };

    const resolved = resolvePublicProposalDeck(deck);

    expect(resolved.mode).toBe('legacy');
    expect(resolved.enabledPageIds).toEqual([3, 1]);
  });

  it('falls back to legacy when pagePlan exists without contentByInstanceId', () => {
    const deck = {
      pagePlan: {
        prefix: [{ id: 'page:page1', templateKey: 'page1', enabled: true }],
        cities: [],
        suffix: [],
      },
      pagesState: { 1: true, 2: true },
      pageOrder: [1, 2],
    };

    const resolved = resolvePublicProposalDeck(deck);

    expect(resolved.mode).toBe('legacy');
    expect(resolved.enabledPageIds).toEqual([1, 2]);
  });
});
