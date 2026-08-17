import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import CrmSetupMasterList from './crm-setup-master-list';

const LOST_REASON_API_BASE =
  '/method/devx.devx_crm.doctype.crm_lead_lost_reason.crm_lead_lost_reason';

const LEAD_RELEVANCE_API_BASE = '/method/devx.devx_crm.doctype.lead_relevance.lead_relevance';

const LEAD_SIZE_API_BASE = '/method/devx.devx_crm.doctype.crm_lead_size.crm_lead_size';

const CRM_SETUP_TABS = [
  { id: 'drop-reason', label: 'Drop Reason' },
  { id: 'lead-relevance', label: 'Lead Relevance' },
  { id: 'lead-size', label: 'Lead Size' },
];

const VALID_TAB_IDS = new Set(CRM_SETUP_TABS.map((tab) => tab.id));

const CRM_SETUP_LIST_CONFIG = {
  'drop-reason': {
    apiBase: LOST_REASON_API_BASE,
    getMethod: 'get_lost_reasons_by_stage_status',
    upsertMethod: 'upsert_lost_reason',
    disableMethod: 'disable_lost_reason',
    valueField: 'lost_reason',
    title: 'Drop Reasons',
    subtitle: 'Manage CRM lead drop reasons',
    columnHeader: 'Drop Reason',
    addButtonLabel: 'Add Reason',
    searchPlaceholder: 'Search drop reason',
    newItemPlaceholder: 'Enter drop reason and press Enter',
    emptyTitle: 'No drop reasons found',
    emptySearchMessage: 'Try searching with a different keyword.',
    emptyDefaultMessage: 'Create your first drop reason to show it here.',
    requiredMessage: 'Drop reason is required',
    duplicateMessage: 'This drop reason already exists.',
    createSuccessMessage: 'Drop reason created successfully.',
    updateSuccessMessage: 'Drop reason updated successfully.',
    disableSuccessMessage: 'Drop reason disabled successfully.',
    loadErrorMessage: 'Unable to load drop reasons.',
    createErrorMessage: 'Unable to create drop reason.',
    updateErrorMessage: 'Unable to update drop reason.',
    disableErrorMessage: 'Unable to disable drop reason.',
    disableModalTitle: 'Disable drop reason?',
    disableModalDescription: 'This drop reason will no longer be available for new CRM leads.',
  },
  'lead-relevance': {
    apiBase: LEAD_RELEVANCE_API_BASE,
    getMethod: 'get_lead_relevances',
    upsertMethod: 'upsert_lead_relevance',
    disableMethod: 'disable_lead_relevance',
    valueField: 'lead_relevance',
    title: 'Lead Relevance',
    subtitle: 'Manage CRM lead relevance options',
    columnHeader: 'Lead Relevance',
    addButtonLabel: 'Add Relevance',
    searchPlaceholder: 'Search lead relevance',
    newItemPlaceholder: 'Enter lead relevance and press Enter',
    emptyTitle: 'No lead relevance options found',
    emptySearchMessage: 'Try searching with a different keyword.',
    emptyDefaultMessage: 'Create your first lead relevance option to show it here.',
    requiredMessage: 'Lead relevance is required',
    duplicateMessage: 'This lead relevance already exists.',
    createSuccessMessage: 'Lead relevance created successfully.',
    updateSuccessMessage: 'Lead relevance updated successfully.',
    disableSuccessMessage: 'Lead relevance disabled successfully.',
    loadErrorMessage: 'Unable to load lead relevance options.',
    createErrorMessage: 'Unable to create lead relevance.',
    updateErrorMessage: 'Unable to update lead relevance.',
    disableErrorMessage: 'Unable to disable lead relevance.',
    disableModalTitle: 'Disable lead relevance?',
    disableModalDescription:
      'This lead relevance option will no longer be available for new CRM leads.',
  },
  'lead-size': {
    apiBase: LEAD_SIZE_API_BASE,
    getMethod: 'get_lead_sizes',
    upsertMethod: 'upsert_lead_size',
    disableMethod: 'disable_lead_size',
    valueField: 'lead_size',
    title: 'Lead Size',
    subtitle: 'Manage CRM lead size options',
    columnHeader: 'Lead Size',
    addButtonLabel: 'Add Size',
    searchPlaceholder: 'Search lead size',
    newItemPlaceholder: 'Enter lead size and press Enter',
    emptyTitle: 'No lead sizes found',
    emptySearchMessage: 'Try searching with a different keyword.',
    emptyDefaultMessage: 'Create your first lead size to show it here.',
    requiredMessage: 'Lead size is required',
    duplicateMessage: 'This lead size already exists.',
    createSuccessMessage: 'Lead size created successfully.',
    updateSuccessMessage: 'Lead size updated successfully.',
    disableSuccessMessage: 'Lead size disabled successfully.',
    loadErrorMessage: 'Unable to load lead sizes.',
    createErrorMessage: 'Unable to create lead size.',
    updateErrorMessage: 'Unable to update lead size.',
    disableErrorMessage: 'Unable to disable lead size.',
    disableModalTitle: 'Disable lead size?',
    disableModalDescription: 'This lead size will no longer be available for new CRM leads.',
  },
};

function getTabFromSearchParams(searchParams) {
  const id = (searchParams.get('tab') || '').toLowerCase();
  return VALID_TAB_IDS.has(id) ? id : 'drop-reason';
}

const CrmSetup = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParameter = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => getTabFromSearchParams(searchParams));

  useEffect(() => {
    const id = getTabFromSearchParams(searchParams);
    setActiveTab(id);
  }, [tabParameter, searchParams]);

  const handleTabChange = useCallback(
    (value) => {
      setActiveTab(value);
      setSearchParams({ tab: value });
    },
    [setSearchParams],
  );

  const listConfig = CRM_SETUP_LIST_CONFIG[activeTab] ?? CRM_SETUP_LIST_CONFIG['drop-reason'];

  return (
    <div className='w-full flex flex-col gap-6'>
      <div className='w-full'>
        <TabMenuHorizontal.Root value={activeTab} onValueChange={handleTabChange}>
          <TabMenuHorizontal.List
            wrapperClassName='border-b border-stroke-soft-200'
            className='border-none h-12 gap-6'
          >
            {CRM_SETUP_TABS.map((tab) => (
              <TabMenuHorizontal.Trigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabMenuHorizontal.Trigger>
            ))}
          </TabMenuHorizontal.List>
        </TabMenuHorizontal.Root>
      </div>

      <div className='w-full'>
        <CrmSetupMasterList key={activeTab} {...listConfig} />
      </div>
    </div>
  );
};

export default CrmSetup;
