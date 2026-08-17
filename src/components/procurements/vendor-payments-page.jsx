import React, { useCallback, useState } from 'react';

import {
  VALID_VENDOR_PAYMENTS_TAB_IDS,
  VENDOR_PAYMENTS_TAB_IDS,
} from '@/components/procurements/constants';
import BillAndInvoiceListTab from '@/components/procurements/bill-and-invoice-list-tab';
import MasterPaymentSheetsListTab from '@/components/procurements/master-payment-sheets-list-tab';
import VendorPaymentsListTab from '@/components/procurements/vendor-payments-list-tab';
import VendorPaymentsTabs from '@/components/procurements/vendor-payments-tabs';
import ComingSoonMessage from '@/components/coming-soon-message';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

export default function VendorPaymentsPage() {
  const [activeTab, setActiveTab] = useState(VENDOR_PAYMENTS_TAB_IDS.VENDOR_PAYMENTS);

  const handleTabChange = useCallback((nextTab) => {
    if (!VALID_VENDOR_PAYMENTS_TAB_IDS.has(nextTab)) return;
    setActiveTab(nextTab);
  }, []);

  return (
    <TabMenuHorizontal.Root
      value={activeTab}
      onValueChange={handleTabChange}
      className='flex min-h-0 flex-1 flex-col overflow-hidden'
    >
      <VendorPaymentsTabs activeTab={activeTab} />

      <TabMenuHorizontal.Content
        value={VENDOR_PAYMENTS_TAB_IDS.ANALYTICS}
        className='min-h-0 flex-1 overflow-y-auto outline-none'
      >
        <div className='flex min-h-[50vh] items-center justify-center px-8 py-10'>
          <ComingSoonMessage />
        </div>
      </TabMenuHorizontal.Content>

      <TabMenuHorizontal.Content
        value={VENDOR_PAYMENTS_TAB_IDS.VENDOR_PAYMENTS}
        className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
      >
        <VendorPaymentsListTab />
      </TabMenuHorizontal.Content>

      <TabMenuHorizontal.Content
        value={VENDOR_PAYMENTS_TAB_IDS.MASTER_PAYMENT_SHEETS}
        className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
      >
        <MasterPaymentSheetsListTab />
      </TabMenuHorizontal.Content>

      <TabMenuHorizontal.Content
        value={VENDOR_PAYMENTS_TAB_IDS.BILL_AND_INVOICE}
        className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
      >
        <BillAndInvoiceListTab />
      </TabMenuHorizontal.Content>
    </TabMenuHorizontal.Root>
  );
}
