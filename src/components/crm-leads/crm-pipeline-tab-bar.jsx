import React, { useMemo } from 'react';
import CrmConfigurableTabBar from '@/components/crm-leads/crm-configurable-tab-bar';
import { ALL_PIPELINE_TAB_VALUE } from '@/components/crm-leads/constants';
import { buildDisplayTabs, emptyTabBucket } from '@/pages/crm/leads-view/crm-lead-tab-preferences';

const LOCKED_VALUES = [ALL_PIPELINE_TAB_VALUE];

/**
 * Horizontal pipeline tabs with pin / hide / reorder / More.
 * Locked "All" tab is always first when present in `pipelines`.
 */
const CrmPipelineTabBar = ({
  pipelines = [],
  value = '',
  counts = {},
  prefs,
  onValueChange,
  onReorder,
  onTogglePin,
  onHide,
  onUnhide,
  isMutating = false,
}) => {
  const bucket = prefs ?? emptyTabBucket();
  const { visible, hidden } = useMemo(
    () => buildDisplayTabs(pipelines, bucket, { lockedIds: LOCKED_VALUES }),
    [bucket, pipelines],
  );

  if (pipelines.length === 0) return null;

  return (
    <CrmConfigurableTabBar
      visibleTabs={visible}
      hiddenTabs={hidden}
      value={value}
      counts={counts}
      prefs={bucket}
      lockedValues={LOCKED_VALUES}
      requireOneVisible
      onValueChange={onValueChange}
      onReorder={onReorder}
      onTogglePin={onTogglePin}
      onHide={onHide}
      onUnhide={onUnhide}
      isMutating={isMutating}
    />
  );
};

export default CrmPipelineTabBar;
