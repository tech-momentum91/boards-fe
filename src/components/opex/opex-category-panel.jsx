import React, { useCallback, useMemo, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import * as Switch from '@/components/ui/switch';
import { cn } from '@/utils/cn';

/**
 * Filter categories by search (matches category name or subcategory name).
 */
function filterCategories(categories, search) {
  const q = (search || '').trim().toLowerCase();
  if (!q) return categories;
  return categories
    .map((cat) => {
      const nameMatches = cat.name?.toLowerCase().includes(q);
      const subcategories = (cat.subcategories || []).filter((s) =>
        s.name?.toLowerCase().includes(q),
      );
      const hasMatchChild = subcategories.length > 0;
      if (nameMatches) return cat;
      if (hasMatchChild) return { ...cat, subcategories };
      return null;
    })
    .filter(Boolean);
}

/**
 * Opex category panel for center/opex: search + category groups with "Hide All/Show All" and item toggles.
 * No drag and drop; toggle only. Uses backend shape: categories with subcategories.
 */
const OpexCategoryPanel = ({
  centerId,
  categories = [],
  isLoading = false,
  onToggle,
  onToggleAll,
  className,
  /** When true, scroll area fills available height (e.g. inside dropdown) */
  fillHeight = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hiddenGroups, setHiddenGroups] = useState(new Set());

  const filteredCategories = useMemo(
    () => filterCategories(categories, searchTerm),
    [categories, searchTerm],
  );

  const toggleGroup = useCallback((groupName) => {
    setHiddenGroups((previous) => {
      const next = new Set(previous);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col shadow-regular-xs overflow-auto',
        fillHeight && 'min-h-0',
        className,
      )}
    >
      <div className='p-3 border-b border-stroke-soft-200 shrink-0'>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine className='size-4' />
            </Input.Icon>
            <Input.Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder='Search...'
            />
          </Input.Wrapper>
        </Input.Root>
      </div>

      <div
        className={cn(
          'flex flex-col overflow-auto p-px',
          fillHeight ? 'flex-1 min-h-0' : 'max-h-[320px]',
        )}
      >
        {isLoading ? (
          <div className='p-4 text-paragraph-sm text-text-soft-400'>Loading categories...</div>
        ) : filteredCategories.length === 0 ? (
          <div className='p-4 text-paragraph-sm text-text-soft-400'>No categories found.</div>
        ) : (
          filteredCategories.map((category) => (
            <CategoryGroup
              key={category.name}
              category={category}
              isHidden={hiddenGroups.has(category.name)}
              onToggleHideAll={() => toggleGroup(category.name)}
              centerId={centerId}
              onToggle={onToggle}
              onToggleAll={onToggleAll}
            />
          ))
        )}
      </div>
    </div>
  );
};

function CategoryGroup({ category, isHidden, onToggleHideAll, centerId, onToggle, onToggleAll }) {
  const subcategories = category.subcategories || [];
  const visibleSubcategories = isHidden ? [] : subcategories;
  const allEnabled = subcategories.length > 0 && subcategories.every((s) => s.enabled_for_center);

  const handleHideShowAll = () => {
    const categoryNames = subcategories.map((s) => s.name);
    if (onToggleAll) {
      onToggleAll(categoryNames, centerId, !allEnabled);
    }
    onToggleHideAll();
  };

  return (
    <div className='flex flex-col border-b border-stroke-soft-200 last:border-b-0'>
      <div className='flex items-center justify-between gap-2 px-3 py-2 min-h-10 bg-bg-weak-50'>
        <span className='text-paragraph-sm font-medium text-text-strong-950 truncate'>
          {category.name}
        </span>
        {subcategories.length > 0 && (
          <button
            type='button'
            onClick={handleHideShowAll}
            className='shrink-0 text-paragraph-sm text-primary-base hover:underline'
          >
            {allEnabled ? 'Hide All' : 'Show All'}
          </button>
        )}
      </div>
      {visibleSubcategories.map((sub) => (
        <div
          key={sub.name}
          className='flex items-center justify-between gap-2 px-3 py-2 min-h-10 pl-5 hover:bg-bg-weak-50'
        >
          <span className='text-paragraph-sm text-text-strong-950 truncate'>{sub.name}</span>
          <Switch.Root
            checked={Boolean(sub.enabled_for_center)}
            onCheckedChange={(checked) => onToggle?.(sub.name, centerId, checked)}
            className='shrink-0'
          />
        </div>
      ))}
    </div>
  );
}

export default OpexCategoryPanel;
