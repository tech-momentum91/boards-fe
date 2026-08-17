import React from 'react';
import SuggestedInventoryFilterBar from '@/components/crm-leads/crm-lead-suggested-inventory/suggested-inventory-filter-bar';

const CrmLeadSuggestedInventoryToolbar = ({
  searchValue,
  onSearchChange,
  onDownload,
  tableRef,
  selectedCount,
  onCreateProposal,
}) => (
  <SuggestedInventoryFilterBar
    searchValue={searchValue}
    onSearchChange={onSearchChange}
    onDownload={onDownload}
    tableRef={tableRef}
    selectedCount={selectedCount}
    onCreateProposal={onCreateProposal}
  />
);

export default CrmLeadSuggestedInventoryToolbar;
