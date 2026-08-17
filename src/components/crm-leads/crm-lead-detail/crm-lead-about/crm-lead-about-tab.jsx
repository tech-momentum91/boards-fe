import React, { useState, useEffect } from 'react';
import CrmLeadAboutSidebar from './crm-lead-about-sidebar';
import CrmLeadAboutBasic from './crm-lead-about-basic';
import CrmLeadAboutUtm from './crm-lead-about-utm';
import CrmLeadAboutCallDetails from './crm-lead-about-call-details';
import CrmLeadAboutCommunityInbound from './crm-lead-about-community-inbound';
import { getCrmLeadOptions, getCrmStages, getInsideSalesList } from '@/api/crmLeads';

const CrmLeadAboutTab = ({
  lead = {},
  onFieldChange,
  onBatchFieldChange,
  isSaving,
  isSavingContacts = false,
}) => {
  const [activeSidebarItem, setActiveSidebarItem] = useState('basic');
  const [leadOptions, setLeadOptions] = useState({});
  // Normalize so label/docname drift (case / whitespace) still shows the panel.
  const sourceType = String(lead?.source_type || '')
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, ' ');
  // New sync uses AI Signals; keep Community Inbound for any older local leads.
  const showCommunityInbound = sourceType === 'ai signals' || sourceType === 'community inbound';

  useEffect(() => {
    let cancelled = false;
    const pipelineId =
      lead?.pipeline && String(lead.pipeline).trim() ? String(lead.pipeline).trim() : null;

    (async () => {
      try {
        const [options, insideSales] = await Promise.all([
          getCrmLeadOptions(),
          getInsideSalesList(),
        ]);
        const pipelineForStages =
          pipelineId || (Array.isArray(options.pipelines) && options.pipelines[0]?.value) || '';
        const stagesData = pipelineForStages
          ? await getCrmStages(pipelineForStages)
          : { stages: [], stageStatusMap: {}, allStatuses: [], stageColorMap: {} };
        if (!cancelled) {
          setLeadOptions({
            ...options,
            ...stagesData,
            inside_sales: Array.isArray(insideSales) ? insideSales : [],
          });
        }
      } catch {
        if (!cancelled) setLeadOptions({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lead?.pipeline, lead?.name]);

  useEffect(() => {
    if (!showCommunityInbound && activeSidebarItem === 'community-inbound') {
      setActiveSidebarItem('basic');
    }
  }, [showCommunityInbound, activeSidebarItem]);

  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='h-full shrink-0'>
        <CrmLeadAboutSidebar
          activeItem={activeSidebarItem}
          onItemChange={setActiveSidebarItem}
          showCommunityInbound={showCommunityInbound}
        />
      </div>

      <div className='flex min-w-0 flex-1 flex-col overflow-y-auto bg-white px-6'>
        {activeSidebarItem === 'basic' && (
          <CrmLeadAboutBasic
            lead={lead}
            onFieldChange={onFieldChange}
            onBatchFieldChange={onBatchFieldChange}
            isSaving={isSaving}
            isSavingContacts={isSavingContacts}
            leadOptions={leadOptions}
          />
        )}
        {activeSidebarItem === 'utm' && (
          <CrmLeadAboutUtm
            lead={lead}
            onFieldChange={onFieldChange}
            isSaving={isSaving}
            leadOptions={leadOptions}
          />
        )}
        {activeSidebarItem === 'call-details' && (
          <CrmLeadAboutCallDetails
            lead={lead}
            onFieldChange={onFieldChange}
            onBatchFieldChange={onBatchFieldChange}
            isSaving={isSaving}
            leadOptions={leadOptions}
          />
        )}
        {showCommunityInbound && activeSidebarItem === 'community-inbound' && (
          <CrmLeadAboutCommunityInbound lead={lead} />
        )}
      </div>
    </div>
  );
};

export default CrmLeadAboutTab;
