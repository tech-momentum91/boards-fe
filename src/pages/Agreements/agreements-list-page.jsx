import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as ButtonGroup from '@/components/ui/button-group';
import ClientAgreementsList from '@/pages/Agreements/client-agreements-list';
import PendingAgreementsList from '@/pages/Agreements/pending-agreements-list';

export const AGREEMENT_LIST_TAB_ACTIVE = 'active';
export const AGREEMENT_LIST_TAB_PENDING = 'pending';

const TAB_OPTIONS = [
  { value: AGREEMENT_LIST_TAB_ACTIVE, label: 'Active' },
  { value: AGREEMENT_LIST_TAB_PENDING, label: 'Pending' },
];

/**
 * Client agreements list: Active vs Pending, same pattern as BillingCategoriesPage
 * (tabs via ButtonGroup + separate page modules per tab).
 */
const AgreementsListPage = ({
  clientListProps,
  pendingListProps,
  activeTabCount = 0,
  pendingTabCount = 0,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('listTab');
  const [activeTab, setActiveTab] = useState(
    tabParam === AGREEMENT_LIST_TAB_PENDING
      ? AGREEMENT_LIST_TAB_PENDING
      : AGREEMENT_LIST_TAB_ACTIVE,
  );

  useEffect(() => {
    if (tabParam === AGREEMENT_LIST_TAB_PENDING || tabParam === AGREEMENT_LIST_TAB_ACTIVE) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchParams(value === AGREEMENT_LIST_TAB_ACTIVE ? {} : { listTab: value });
  };

  const tabsSlot = (
    <ButtonGroup.Root size='xsmall' className='shrink-0'>
      {TAB_OPTIONS.map((tab) => {
        const isPending = tab.value === AGREEMENT_LIST_TAB_PENDING;
        const count = isPending ? pendingTabCount : activeTabCount;
        const isActive = tab.value === activeTab;

        return (
          <ButtonGroup.Item
            key={tab.value}
            type='button'
            data-state={isActive ? 'on' : 'off'}
            onClick={(e) => {
              e.preventDefault();
              handleTabChange(tab.value);
            }}
            className={cnTabItem(tab.value)}
          >
            <span className='inline-flex items-center gap-2'>
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={
                    isActive
                      ? 'flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-base px-1.5 text-label-xs text-static-white'
                      : 'flex h-5 min-w-5 items-center justify-center rounded-full bg-faded-light px-1.5 text-label-xs text-static-black'
                  }
                >
                  {count}
                </span>
              )}
            </span>
          </ButtonGroup.Item>
        );
      })}
    </ButtonGroup.Root>
  );

  return (
    <div className='flex w-full flex-col gap-5 flex-1 min-h-0 h-full'>
      {activeTab === AGREEMENT_LIST_TAB_ACTIVE && (
        <ClientAgreementsList
          slotBeforeToolbar={tabsSlot}
          toolbarProps={clientListProps.toolbarProps}
          tableProps={clientListProps.tableProps}
        />
      )}
      {activeTab === AGREEMENT_LIST_TAB_PENDING && (
        <PendingAgreementsList slotBeforeToolbar={tabsSlot} {...pendingListProps} />
      )}
    </div>
  );
};

function cnTabItem(tabValue) {
  const base =
    'min-w-0 px-3 font-medium data-[state=on]:z-[1] data-[state=on]:ring-1 data-[state=on]:ring-primary-base';
  if (tabValue === AGREEMENT_LIST_TAB_PENDING) {
    return `${base} data-[state=on]:bg-success-lighter data-[state=on]:!text-text-strong-950`;
  }
  return `${base} data-[state=on]:bg-primary-lighter`;
}

export default AgreementsListPage;
