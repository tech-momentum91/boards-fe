import React from 'react';

import {
  MWQ_DEFAULT_APPLIED_FILTERS,
  MWQ_FILTER_TABS,
} from '@/components/aum/maintenance-work-queue/maintenance-work-queue-constants';
import AumFilterDropdownBase from '@/components/aum/shared/aum-filter-dropdown-base';

const FILTER_KEYS = Object.keys(MWQ_DEFAULT_APPLIED_FILTERS);

function renderCenterOptionLabel(option) {
  const centerName = option?.centerName || option?.label || option?.value;
  const centerCode = option?.centerCode;

  if (!centerCode) {
    return centerName;
  }

  return (
    <>
      <span className='font-medium text-text-strong-950'>{centerName}</span>
      <span className='text-text-soft-400'>{` (${centerCode})`}</span>
    </>
  );
}

const MwqFilterDropdown = React.forwardRef((props, ref) => (
  <AumFilterDropdownBase
    ref={ref}
    filterTabs={MWQ_FILTER_TABS}
    filterKeys={FILTER_KEYS}
    appliedFilters={props.appliedFilters ?? MWQ_DEFAULT_APPLIED_FILTERS}
    bodyClassName='h-[460px]'
    treatUndefinedFilterOptionsAsEmpty
    getEmptyMessage={(activeTab, filterTabs) => {
      const activeTabLabel =
        filterTabs.find((tab) => tab.value === activeTab)?.label?.toLowerCase() || activeTab;
      return `No ${activeTabLabel} options found`;
    }}
    resolveRenderOptionLabel={(activeTab) =>
      activeTab === 'center' ? (option) => renderCenterOptionLabel(option) : undefined
    }
    {...props}
  />
));

MwqFilterDropdown.displayName = 'MwqFilterDropdown';

export default MwqFilterDropdown;
