import React, { useMemo } from 'react';
import CrmConfigurableTabBar from '@/components/crm-leads/crm-configurable-tab-bar';
import { buildDisplayTabs, emptyTabBucket } from '@/pages/crm/leads-view/crm-lead-tab-preferences';

const DEFAULT_TABS = [{ value: 'all', label: 'All' }];
const LOCKED_VALUES = ['all'];

/**
 * Lifecycle stage row: locked All + configurable stage tabs (pin / hide / reorder / More).
 */
const CrmLeadsTab = ({
  tabs: tabsProp,
  value = 'all',
  counts = {},
  prefs,
  onValueChange,
  onReorder,
  onTogglePin,
  onHide,
  onUnhide,
  isMutating = false,
}) => {
  const tabs = useMemo(() => {
    const list = Array.isArray(tabsProp) && tabsProp.length > 0 ? tabsProp : DEFAULT_TABS;
    return list;
  }, [tabsProp]);

  const bucket = prefs ?? emptyTabBucket();
  const { visible, hidden } = useMemo(
    () => buildDisplayTabs(tabs, bucket, { lockedIds: LOCKED_VALUES }),
    [bucket, tabs],
  );

  return (
    <CrmConfigurableTabBar
      visibleTabs={visible}
      hiddenTabs={hidden}
      value={value}
      counts={counts}
      prefs={bucket}
      lockedValues={LOCKED_VALUES}
      requireOneVisible={false}
      onValueChange={onValueChange}
      onReorder={onReorder}
      onTogglePin={onTogglePin}
      onHide={onHide}
      onUnhide={onUnhide}
      isMutating={isMutating}
    />
  );
};

export default CrmLeadsTab;
