import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as ButtonGroup from '@/components/ui/button-group';
import ClientOpexCategories from '@/pages/profile/client-opex-categories';
import ConfigureClientOpex from '@/pages/profile/configure-client-opex';

const OPEX_TAB_CATEGORY = 'category';
const OPEX_TAB_CONFIGURE = 'configure';

const OPEX_TAB_OPTIONS = [
  { value: OPEX_TAB_CATEGORY, label: 'Category' },
  { value: OPEX_TAB_CONFIGURE, label: 'Configure' },
];

const ClinetOpex = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParameter = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    tabParameter === OPEX_TAB_CONFIGURE ? OPEX_TAB_CONFIGURE : OPEX_TAB_CATEGORY,
  );

  useEffect(() => {
    if (tabParameter === OPEX_TAB_CONFIGURE || tabParameter === OPEX_TAB_CATEGORY) {
      setActiveTab(tabParameter);
    }
  }, [tabParameter]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchParams(value === OPEX_TAB_CATEGORY ? {} : { tab: value });
  };

  // ─── Render ────────────────────────────────────────────

  const tabsSlot = (
    <ButtonGroup.Root size='small'>
      {OPEX_TAB_OPTIONS.map((tab) => (
        <ButtonGroup.Item
          data-state={tab.value === activeTab ? 'on' : 'off'}
          onClick={(event) => {
            event.preventDefault();
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
        {activeTab === OPEX_TAB_CATEGORY && (
          <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
            <ClientOpexCategories slotBeforeToolbar={tabsSlot} />
          </div>
        )}
        {activeTab === OPEX_TAB_CONFIGURE && <ConfigureClientOpex slotBeforeToolbar={tabsSlot} />}
      </div>
    </div>
  );
};

export default ClinetOpex;
