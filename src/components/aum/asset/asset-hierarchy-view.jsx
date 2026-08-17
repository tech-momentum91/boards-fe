import React, { memo, useState } from 'react';

import AumAssetGroupDivider from '@/components/aum/asset/asset-group-divider';
import AumAssetListTable from '@/components/aum/asset/asset-list-table';

function HierarchyGroupRow({ group, columnConfig, defaultExpanded = true }) {
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
          defaultExpanded={defaultExpanded}
        />
      ) : null}
    </div>
  );
}

function HierarchyNode({ node, columnConfig, defaultExpanded = true }) {
  if (node.type === 'leaf') {
    if (!node.rows?.length) return null;
    return <AumAssetListTable rows={node.rows} columnConfig={columnConfig} embedded />;
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
          defaultExpanded={defaultExpanded}
        />
      ))}
    </div>
  );
}

const AumAssetHierarchyView = memo(({ hierarchy, columnConfig = [], defaultExpanded = true }) => {
  if (!hierarchy) return null;

  return (
    <div className='flex w-full flex-col bg-bg-white-0'>
      <HierarchyNode
        node={hierarchy}
        columnConfig={columnConfig}
        defaultExpanded={defaultExpanded}
      />
    </div>
  );
});

AumAssetHierarchyView.displayName = 'AumAssetHierarchyView';

export default AumAssetHierarchyView;
