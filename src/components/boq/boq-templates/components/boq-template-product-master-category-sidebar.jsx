import React, { useMemo } from 'react';

import { BOQ_LABELS } from '@/components/boq/constants';
import { filterBoqProductMasterCategories } from '@/components/boq/boq-templates/components/boq-template-product-master-utils';
import { cn } from '@/utils/cn';

const CategoryCountBadge = ({ count, isActive }) => {
  const displayCount = Number.isFinite(count) && count > 0 ? count : 0;

  return (
    <span
      className={cn(
        'flex min-w-4 shrink-0 items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-medium uppercase leading-3 text-white',
        isActive ? 'bg-[#20232d]' : 'bg-[rgba(32,35,45,0.6)]',
      )}
      aria-hidden
    >
      {displayCount > 99 ? '99' : displayCount}
    </span>
  );
};

const CategoryItem = ({ child, isActive, count, onSelect }) => (
  <button
    type='button'
    onClick={() => onSelect(child.value)}
    className={cn(
      'flex w-full items-center gap-1.5 rounded-lg p-2 text-left transition-colors',
      isActive
        ? 'bg-bg-weak-100 text-text-main-900'
        : 'bg-bg-white-0 text-text-sub-500 hover:bg-bg-weak-50',
    )}
    aria-current={isActive ? 'true' : undefined}
  >
    <span className='min-w-0 flex-1 truncate text-label-sm font-medium' title={child.label}>
      {child.label}
    </span>
    <CategoryCountBadge count={count} isActive={isActive} />
  </button>
);

const BoqTemplateProductMasterCategorySidebar = ({
  groups = [],
  selectedCategory,
  onSelectCategory,
  categorySearch = '',
  categoryCounts = {},
  listClassName = 'p-3',
  emptyStateClassName = 'px-3 py-4',
}) => {
  const filteredGroups = useMemo(
    () => filterBoqProductMasterCategories(groups, categorySearch),
    [categorySearch, groups],
  );

  if (filteredGroups.length === 0) {
    return (
      <p className={cn(emptyStateClassName, 'text-paragraph-xs text-text-sub-500')}>
        {BOQ_LABELS.noCategoriesFound}
      </p>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', listClassName)}>
      {filteredGroups.map((group) => (
        <div key={group.parent} className='flex flex-col gap-1'>
          <div className='flex h-6 items-center px-2'>
            <span className='text-[11px] font-medium uppercase tracking-[0.22px] text-text-soft-400'>
              {group.label}
            </span>
          </div>
          <div className='flex flex-col gap-1'>
            {(group.children ?? []).map((child) => (
              <CategoryItem
                key={child.value}
                child={child}
                isActive={selectedCategory === child.value}
                count={categoryCounts[child.value] ?? child.count}
                onSelect={onSelectCategory}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BoqTemplateProductMasterCategorySidebar;
