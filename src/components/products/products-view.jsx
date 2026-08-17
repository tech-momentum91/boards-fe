import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import ProductsTabPanel from '@/components/products/products-tab-panel';
import ProductsTabsList from '@/components/products/products-tabs-list';
import { PRODUCTS_TAB_IDS, getProductsTabFromSearchParams } from '@/components/products/constants';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const ALL_TAB_IDS = Object.values(PRODUCTS_TAB_IDS);

const ProductsView = ({
  onAddProduct,
  onOpenPackageDetail,
  onOpenProductDetail,
  listRefreshKey = 0,
  listVariationPatch = null,
  onListVariationPatchApplied,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParameter = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => getProductsTabFromSearchParams(searchParams));
  const [loadedTabs, setLoadedTabs] = useState(
    () => new Set([getProductsTabFromSearchParams(searchParams)]),
  );

  useEffect(() => {
    const nextTab = getProductsTabFromSearchParams(searchParams);
    setActiveTab(nextTab);
    setLoadedTabs((previous) => {
      if (previous.has(nextTab)) return previous;
      const next = new Set(previous);
      next.add(nextTab);
      return next;
    });
  }, [tabParameter, searchParams]);

  const handleTabChange = useCallback(
    (nextTab) => {
      if (nextTab === activeTab) return;
      setActiveTab(nextTab);
      setLoadedTabs((previous) => {
        if (previous.has(nextTab)) return previous;
        const next = new Set(previous);
        next.add(nextTab);
        return next;
      });
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('tab', nextTab);
        return next;
      });
    },
    [activeTab, setSearchParams],
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='flex min-h-0 flex-1 flex-col bg-bg-white-0'>
        <TabMenuHorizontal.Root
          value={activeTab}
          onValueChange={handleTabChange}
          className='flex min-h-0 flex-1 flex-col'
        >
          <ProductsTabsList />

          {ALL_TAB_IDS.map((tabId) =>
            loadedTabs.has(tabId) ? (
              <ProductsTabPanel
                key={tabId}
                tabId={tabId}
                isActive={activeTab === tabId}
                onAddProduct={onAddProduct}
                onOpenPackageDetail={onOpenPackageDetail}
                onOpenProductDetail={onOpenProductDetail}
                listRefreshKey={listRefreshKey}
                listVariationPatch={listVariationPatch}
                onListVariationPatchApplied={onListVariationPatchApplied}
              />
            ) : null,
          )}
        </TabMenuHorizontal.Root>
      </div>
    </div>
  );
};

export default ProductsView;
