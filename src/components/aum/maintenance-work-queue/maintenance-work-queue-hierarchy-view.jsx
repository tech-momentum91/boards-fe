import React, { memo, useState } from 'react';

import AumAssetGroupDivider from '@/components/aum/asset/asset-group-divider';
import MaintenanceWorkQueueTable from '@/components/aum/maintenance-work-queue/maintenance-work-queue-table';

function HierarchyGroupRow({
  group,
  columnConfig,
  mode,
  showCheckboxes,
  selectedRowIds,
  onSelectedRowIdsChange,
  onConditionChange,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onRowClick,
  defaultExpanded = true,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className='flex w-full flex-col'>
      <AumAssetGroupDivider
        name={group.name}
        depth={group.depth}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />

      {expanded ? (
        <HierarchyNode
          node={group.node}
          columnConfig={columnConfig}
          mode={mode}
          showCheckboxes={showCheckboxes}
          selectedRowIds={selectedRowIds}
          onSelectedRowIdsChange={onSelectedRowIdsChange}
          onConditionChange={onConditionChange}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          onAssigneeChange={onAssigneeChange}
          onRowClick={onRowClick}
          defaultExpanded={defaultExpanded}
        />
      ) : null}
    </div>
  );
}

function HierarchyNode({
  node,
  columnConfig,
  mode,
  showCheckboxes,
  selectedRowIds,
  onSelectedRowIdsChange,
  onConditionChange,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onRowClick,
  defaultExpanded = true,
}) {
  if (node.type === 'leaf') {
    if (!node.rows?.length) return null;
    return (
      <MaintenanceWorkQueueTable
        flatRows={node.rows}
        columnConfig={columnConfig}
        mode={mode}
        showCheckboxes={showCheckboxes}
        selectedRowIds={selectedRowIds}
        onSelectedRowIdsChange={onSelectedRowIdsChange}
        onConditionChange={onConditionChange}
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
        onAssigneeChange={onAssigneeChange}
        onRowClick={onRowClick}
        embedded
      />
    );
  }

  if (node.type !== 'branch' || !node.children?.length) {
    return null;
  }

  return (
    <div className='flex w-full flex-col'>
      {node.children.map((group) => (
        <HierarchyGroupRow
          key={group.id}
          group={group}
          columnConfig={columnConfig}
          mode={mode}
          showCheckboxes={showCheckboxes}
          selectedRowIds={selectedRowIds}
          onSelectedRowIdsChange={onSelectedRowIdsChange}
          onConditionChange={onConditionChange}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          onAssigneeChange={onAssigneeChange}
          onRowClick={onRowClick}
          defaultExpanded={defaultExpanded}
        />
      ))}
    </div>
  );
}

const MaintenanceWorkQueueHierarchyView = memo(
  ({
    hierarchy,
    columnConfig = [],
    mode = 'preventive',
    showCheckboxes = false,
    selectedRowIds,
    onSelectedRowIdsChange,
    onConditionChange,
    onStatusChange,
    onPriorityChange,
    onAssigneeChange,
    onRowClick,
    defaultExpanded = true,
  }) => {
    if (!hierarchy) return null;

    return (
      <div className='flex w-full flex-col bg-bg-white-0'>
        <HierarchyNode
          node={hierarchy}
          columnConfig={columnConfig}
          mode={mode}
          showCheckboxes={showCheckboxes}
          selectedRowIds={selectedRowIds}
          onSelectedRowIdsChange={onSelectedRowIdsChange}
          onConditionChange={onConditionChange}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          onAssigneeChange={onAssigneeChange}
          onRowClick={onRowClick}
          defaultExpanded={defaultExpanded}
        />
      </div>
    );
  },
);

MaintenanceWorkQueueHierarchyView.displayName = 'MaintenanceWorkQueueHierarchyView';

export default MaintenanceWorkQueueHierarchyView;
