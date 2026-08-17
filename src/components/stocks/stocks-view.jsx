import React, { Suspense, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  STOCKS_DEFAULT_ACTIVE_TAB,
  STOCKS_TAB_IDS,
  STOCKS_TABS,
} from '@/components/stocks/constants';
import StocksComingSoonTabs from '@/components/stocks/stocks-coming-soon-tabs';
import StocksTabsList from '@/components/stocks/stocks-tabs-list';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const CurrentStock = React.lazy(() => import('@/components/stocks/current-stock'));
const StockIn = React.lazy(() => import('@/components/stocks/stock-in'));
const StockOut = React.lazy(() => import('@/components/stocks/stock-out'));
const Orders = React.lazy(() => import('@/components/stocks/orders'));
const ProductMaster = React.lazy(() => import('@/components/stocks/product-master'));
const StockRules = React.lazy(() => import('@/components/stocks/stock-rules'));
const VendorRc = React.lazy(() => import('@/components/stocks/vendor-rc'));

const LAZY_STOCK_TAB_IDS = new Set([
  STOCKS_TAB_IDS.CURRENT_STOCK,
  STOCKS_TAB_IDS.STOCK_IN,
  STOCKS_TAB_IDS.STOCK_OUT,
  STOCKS_TAB_IDS.ORDERS,
  STOCKS_TAB_IDS.PRODUCT_MASTER,
  STOCKS_TAB_IDS.STOCK_RULES,
  STOCKS_TAB_IDS.VENDOR_RC,
]);
const VALID_STOCK_TAB_IDS = new Set(STOCKS_TABS.map((tab) => tab.id));

const StocksTabLoading = ({ value }) => (
  <TabMenuHorizontal.Content value={value} className='min-h-0 flex-1 outline-none'>
    <div className='flex min-h-0 flex-1 items-center justify-center px-8 py-10'>
      <span className='paragraph-small text-text-sub-600'>Loading stock section...</span>
    </div>
  </TabMenuHorizontal.Content>
);

const StocksView = () => {
  const navigate = useNavigate();
  const { section } = useParams();
  const activeTab = VALID_STOCK_TAB_IDS.has(section) ? section : STOCKS_DEFAULT_ACTIVE_TAB;
  const [loadedTabs, setLoadedTabs] = useState(() => new Set([activeTab]));

  useEffect(() => {
    if (section && !VALID_STOCK_TAB_IDS.has(section)) {
      navigate(`/stocks/${STOCKS_DEFAULT_ACTIVE_TAB}`, { replace: true });
    }
  }, [navigate, section]);

  useEffect(() => {
    if (!LAZY_STOCK_TAB_IDS.has(activeTab)) return;
    setLoadedTabs((previous) => {
      if (previous.has(activeTab)) return previous;
      const next = new Set(previous);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const handleTabChange = (nextTab) => {
    if (nextTab === activeTab) return;
    navigate(`/stocks/${nextTab}`);
  };

  return (
    <div className='flex min-h-0  flex-1 flex-col'>
      <div className='min-h-0 flex-1 border-t border-stroke-soft-200 bg-bg-white-0'>
        <TabMenuHorizontal.Root
          value={activeTab}
          onValueChange={handleTabChange}
          className='flex min-h-0 flex-1 flex-col'
        >
          <StocksTabsList activeTab={activeTab} />

          <Suspense fallback={<StocksTabLoading value={activeTab} />}>
            {loadedTabs.has(STOCKS_TAB_IDS.CURRENT_STOCK) ? (
              <CurrentStock isActive={activeTab === STOCKS_TAB_IDS.CURRENT_STOCK} />
            ) : null}
            {loadedTabs.has(STOCKS_TAB_IDS.STOCK_IN) ? (
              <StockIn isActive={activeTab === STOCKS_TAB_IDS.STOCK_IN} />
            ) : null}
            {loadedTabs.has(STOCKS_TAB_IDS.STOCK_OUT) ? (
              <StockOut isActive={activeTab === STOCKS_TAB_IDS.STOCK_OUT} />
            ) : null}
            {loadedTabs.has(STOCKS_TAB_IDS.ORDERS) ? (
              <Orders isActive={activeTab === STOCKS_TAB_IDS.ORDERS} />
            ) : null}
            {loadedTabs.has(STOCKS_TAB_IDS.PRODUCT_MASTER) ? (
              <ProductMaster isActive={activeTab === STOCKS_TAB_IDS.PRODUCT_MASTER} />
            ) : null}
            {loadedTabs.has(STOCKS_TAB_IDS.STOCK_RULES) ? (
              <StockRules isActive={activeTab === STOCKS_TAB_IDS.STOCK_RULES} />
            ) : null}
            {loadedTabs.has(STOCKS_TAB_IDS.VENDOR_RC) ? (
              <VendorRc isActive={activeTab === STOCKS_TAB_IDS.VENDOR_RC} />
            ) : null}
          </Suspense>

          <StocksComingSoonTabs />
        </TabMenuHorizontal.Root>
      </div>
    </div>
  );
};

export default StocksView;
