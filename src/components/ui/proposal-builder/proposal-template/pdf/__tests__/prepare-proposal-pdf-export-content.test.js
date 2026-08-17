import { prepareProposalPdfExportContent } from '@/components/ui/proposal-builder/proposal-template/pdf/prepare-proposal-pdf-export-content';
import { prepareProposalPage6FloorPlanForExport } from '@/components/ui/proposal-builder/proposal-template/sections/prepare-proposal-page-6-floor-plan-export';
import { prepareTemplateContentForPdf } from '@/components/ui/proposal-builder/proposal-template/pdf/prepare-template-content-for-pdf';

jest.mock(
  '@/components/ui/proposal-builder/proposal-template/pdf/prepare-template-content-for-pdf',
  () => ({
    prepareTemplateContentForPdf: jest.fn(async (content) => content),
  }),
);

jest.mock(
  '@/components/ui/proposal-builder/proposal-template/sections/prepare-proposal-page-6-floor-plan-export',
  () => ({
    prepareProposalPage6FloorPlanForExport: jest.fn(),
  }),
);

describe('prepareProposalPdfExportContent (schema v3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prepares each page6 instance with its bound inventory row', async () => {
    const pageInstances = [
      {
        id: 'layout:one',
        templateKey: 'page6',
        binding: { inventoryId: 'INV-01' },
      },
      {
        id: 'layout:two',
        templateKey: 'page6',
        binding: { inventoryId: 'INV-02' },
      },
      {
        id: 'center:alpha:page4',
        templateKey: 'page4',
        binding: { centerId: 'CENTER-01' },
      },
    ];

    const contentByInstanceId = {
      'layout:one': { heading: 'Layout one', floorPlan: { image: '/floor-1.png' } },
      'layout:two': { heading: 'Layout two', floorPlan: { image: '/floor-2.png' } },
      'center:alpha:page4': { heading: 'Center alpha' },
    };

    const inventory = [
      { name: 'INV-01', center_id: 'CENTER-01', floor: '3', space: 'S-03' },
      { name: 'INV-02', center_id: 'CENTER-01', floor: '3', space: 'S-04' },
    ];

    prepareProposalPage6FloorPlanForExport.mockImplementation(
      async ({ content, inventoryRow }) => ({
        ...content,
        floorPlan: {
          ...(content?.floorPlan ?? {}),
          compositionImage: `data:${inventoryRow?.name}`,
        },
      }),
    );

    const result = await prepareProposalPdfExportContent({
      pageInstances,
      contentByInstanceId,
      inventory,
    });

    expect(prepareProposalPage6FloorPlanForExport).toHaveBeenCalledTimes(2);
    expect(prepareProposalPage6FloorPlanForExport).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        content: contentByInstanceId['layout:one'],
        inventoryRow: inventory[0],
        embeddedLayoutDetail: null,
      }),
    );
    expect(prepareProposalPage6FloorPlanForExport).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        content: contentByInstanceId['layout:two'],
        inventoryRow: inventory[1],
        embeddedLayoutDetail: null,
      }),
    );
    expect(result.contentByInstanceId['layout:one'].floorPlan.compositionImage).toBe('data:INV-01');
    expect(result.contentByInstanceId['layout:two'].floorPlan.compositionImage).toBe('data:INV-02');
    expect(result.contentByInstanceId['center:alpha:page4'].heading).toBe('Center alpha');
    expect(prepareTemplateContentForPdf).toHaveBeenCalled();
  });

  it('passes per-floor embedded layout detail for page6 instances', async () => {
    const pageInstances = [
      {
        id: 'layout:one',
        templateKey: 'page6',
        binding: { inventoryId: 'INV-01' },
      },
    ];
    const contentByInstanceId = {
      'layout:one': { heading: 'Layout one', floorPlan: {} },
    };
    const inventory = [{ name: 'INV-01', center_id: 'CENTER-01', floor: '3', space: 'S-03' }];
    const embedded = {
      floor_detail: { layout_image: '/files/floor.png' },
      layout_shapes: [{ space_ref: 'S-03' }],
    };

    prepareProposalPage6FloorPlanForExport.mockImplementation(async ({ content }) => content);

    await prepareProposalPdfExportContent({
      pageInstances,
      contentByInstanceId,
      inventory,
      page6LayoutDetailsByKey: { 'CENTER-01::3': embedded },
      skipLiveLayoutFetch: true,
    });

    expect(prepareProposalPage6FloorPlanForExport).toHaveBeenCalledWith(
      expect.objectContaining({
        inventoryRow: inventory[0],
        embeddedLayoutDetail: embedded,
        skipLiveLayoutFetch: true,
      }),
    );
  });
});
