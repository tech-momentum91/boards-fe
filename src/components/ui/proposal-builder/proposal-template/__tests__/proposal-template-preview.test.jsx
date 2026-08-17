import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import ProposalTemplatePreview from '@/components/ui/proposal-builder/proposal-template/proposal-template-preview';

jest.mock('@/components/ui/proposal-builder/proposal-template/pages/page-6', () => ({
  __esModule: true,
  default: ({ content, layoutInventory }) => (
    <div
      data-testid='page6'
      data-layout-name={layoutInventory?.[0]?.name ?? ''}
      data-layout-count={layoutInventory?.length ?? 0}
    >
      {content?.heading ?? ''}
    </div>
  ),
}));

describe('ProposalTemplatePreview (schema v3)', () => {
  const renderPreview = (ui) => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(ui);
    });
    return {
      container,
      unmount: () => {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  };

  it('renders page6 instances with instance content and inventory', () => {
    const pageInstances = [
      {
        id: 'layout:one',
        templateKey: 'page6',
        label: 'Layout one',
        binding: { inventoryId: 'INV-01' },
      },
      {
        id: 'layout:two',
        templateKey: 'page6',
        label: 'Layout two',
        binding: { inventoryId: 'INV-02' },
      },
    ];
    const contentByInstanceId = {
      'layout:one': { heading: 'Layout one' },
      'layout:two': { heading: 'Layout two' },
    };
    const inventory = [
      { name: 'INV-01', space: 'S-01' },
      { name: 'INV-02', space: 'S-02' },
    ];

    const { container, unmount } = renderPreview(
      <ProposalTemplatePreview
        pageInstances={pageInstances}
        contentByInstanceId={contentByInstanceId}
        inventory={inventory}
        previewMode='web'
        readOnly
      />,
    );

    const firstSlot = container.querySelector('[data-page-number="layout:one"]');
    expect(firstSlot).not.toBeNull();
    const firstPage = firstSlot.querySelector('[data-testid="page6"]');
    expect(firstPage.textContent).toBe('Layout one');
    expect(firstPage.getAttribute('data-layout-count')).toBe('1');
    expect(firstPage.getAttribute('data-layout-name')).toBe('INV-01');

    const secondSlot = container.querySelector('[data-page-number="layout:two"]');
    expect(secondSlot).not.toBeNull();
    const secondPage = secondSlot.querySelector('[data-testid="page6"]');
    expect(secondPage.textContent).toBe('Layout two');
    expect(secondPage.getAttribute('data-layout-count')).toBe('1');
    expect(secondPage.getAttribute('data-layout-name')).toBe('INV-02');

    unmount();
  });
});
