import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { RiBuildingLine, RiPriceTag3Line } from 'react-icons/ri';
import { getStatusOptions } from '@/api/dynamic-status';

const CentersStatusTabs = ({
  value = 'all',
  counts = {},
  onValueChange,
  totalCount,
  search = '',
  appliedFilters = {},
  // navbar_filter = null,
}) => {
  const [statusTabs, setStatusTabs] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opts = await getStatusOptions({ doctype: 'Center', field: 'status' });
        if (!cancelled) {
          setStatusTabs(
            (Array.isArray(opts) ? opts : []).map((o) => ({
              value: o.value,
              label: o.label || o.value,
            })),
          );
        }
      } catch {
        if (!cancelled) setStatusTabs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = useMemo(
    () => [
      { value: 'all', label: 'All', icon: RiBuildingLine },
      ...statusTabs.map((s) => ({ value: s.value, label: s.label, icon: RiPriceTag3Line })),
    ],
    [statusTabs],
  );

  const buildFiltersArray = useCallback(
    (statusValue) => {
      const filtersArray = [];
      if (appliedFilters.city) {
        filtersArray.push(['city', '=', appliedFilters.city]);
      }
      if (appliedFilters.state) {
        filtersArray.push(['state', '=', appliedFilters.state]);
      }
      if (appliedFilters.zone) {
        filtersArray.push(['zone', '=', appliedFilters.zone]);
      }
      if (statusValue && statusValue !== 'all') {
        filtersArray.push(['status', '=', statusValue]);
      }
      return filtersArray;
    },
    [appliedFilters],
  );

  const handleValueChange = useCallback(
    (newValue) => {
      // Call the parent's onValueChange callback for state management
      if (onValueChange) {
        onValueChange(newValue);
      }
    },
    [onValueChange],
  );
  return (
    <TabMenuHorizontal.Root value={value} onValueChange={handleValueChange}>
      <TabMenuHorizontal.List className='gap-6 !border-t-0' wrapperClassName='w-full'>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.value] ?? 0;
          const finalCount = tab.value === 'all' ? (totalCount ?? 0) : (count ?? 0);

          return (
            <TabMenuHorizontal.Trigger
              key={tab.value}
              value={tab.value}
              className='group h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
            >
              <TabMenuHorizontal.Icon as={Icon} className='size-4' />
              <span>{tab.label}</span>
              {finalCount > 0 && (
                <span className='inline-flex items-center justify-center rounded-full bg-bg-weak-100 px-2 py-0.5 text-[12px] text-text-sub-600 group-data-[state=active]:bg-green-500 group-data-[state=active]:text-white group-data-[state=active]:font-semibold'>
                  {finalCount}
                </span>
              )}
            </TabMenuHorizontal.Trigger>
          );
        })}
      </TabMenuHorizontal.List>
      {tabs.map((tab) => (
        <TabMenuHorizontal.Content key={tab.value} value={tab.value} className='sr-only'>
          {tab.label}
        </TabMenuHorizontal.Content>
      ))}
    </TabMenuHorizontal.Root>
  );
};

export default CentersStatusTabs;
