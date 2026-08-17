import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as ButtonGroup from '@/components/ui/button-group';
import ClientBillingCategories from '@/pages/profile/client-billing-categories';
import ConfigureClientBillingCategories from '@/pages/profile/configure-client-billing-categories';

const BILLING_TAB_CATEGORY = 'category';
const BILLING_TAB_CONFIGURE = 'configure';

const BILLING_TAB_OPTIONS = [
  { value: BILLING_TAB_CATEGORY, label: 'Category' },
  { value: BILLING_TAB_CONFIGURE, label: 'Configure' },
];

const BillingCategoriesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParameter = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    tabParameter === BILLING_TAB_CONFIGURE ? BILLING_TAB_CONFIGURE : BILLING_TAB_CATEGORY,
  );

  useEffect(() => {
    if (tabParameter === BILLING_TAB_CONFIGURE || tabParameter === BILLING_TAB_CATEGORY) {
      setActiveTab(tabParameter);
    }
  }, [tabParameter]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchParams(value === BILLING_TAB_CATEGORY ? {} : { tab: value });
  };

  const tabsSlot = (
    <ButtonGroup.Root size='small'>
      {BILLING_TAB_OPTIONS.map((tab) => (
        <ButtonGroup.Item
          data-state={tab.value === activeTab ? 'on' : 'off'}
          onClick={(e) => {
            e.preventDefault();
            handleTabChange(tab.value);
          }}
          className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
          size='small'
          key={tab.value}
        >
          {tab.label}
        </ButtonGroup.Item>
      ))}
    </ButtonGroup.Root>
  );

  return (
    <div className='flex h-full min-h-0 w-full flex-col p-2'>
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden pt-px'>
        {activeTab === BILLING_TAB_CATEGORY && (
          <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
            <ClientBillingCategories slotBeforeToolbar={tabsSlot} />
          </div>
        )}
        {activeTab === BILLING_TAB_CONFIGURE && (
          <ConfigureClientBillingCategories slotBeforeToolbar={tabsSlot} />
        )}
      </div>
    </div>
  );
};

export default BillingCategoriesPage;
