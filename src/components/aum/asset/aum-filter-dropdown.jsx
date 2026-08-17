import React from 'react';

import { AUM_DEFAULT_APPLIED_FILTERS, AUM_FILTER_TABS } from '@/components/aum/constants';
import AumFilterDropdownBase from '@/components/aum/shared/aum-filter-dropdown-base';

const FILTER_KEYS = Object.keys(AUM_DEFAULT_APPLIED_FILTERS);

const AumFilterDropdown = React.forwardRef((props, ref) => (
  <AumFilterDropdownBase
    ref={ref}
    filterTabs={AUM_FILTER_TABS}
    filterKeys={FILTER_KEYS}
    appliedFilters={props.appliedFilters ?? AUM_DEFAULT_APPLIED_FILTERS}
    bodyClassName='h-[280px]'
    {...props}
  />
));

AumFilterDropdown.displayName = 'AumFilterDropdown';

export default AumFilterDropdown;
