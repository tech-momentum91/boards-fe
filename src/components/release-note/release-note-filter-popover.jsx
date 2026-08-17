import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import { computeReleaseNoteFilterCount } from '@/components/release-note/utils';

const MODULE_TAB_VALUE = 'module';

const normalizeApplied = (applied) => ({
  published: applied?.published !== false,
  draft: applied?.draft !== false,
  modules: Array.isArray(applied?.modules) ? applied.modules : [],
});

const ReleaseNoteFilterPopover = React.forwardRef(
  ({ open, appliedFilters, onFiltersChange, setFilterCount, moduleOptions = [] }, ref) => {
    const [searchText, setSearchText] = useState('');
    const [localFilters, setLocalFilters] = useState(() => normalizeApplied(appliedFilters));
    const popoverRef = useRef(null);

    useEffect(() => {
      setLocalFilters(normalizeApplied(appliedFilters));
    }, [appliedFilters]);

    useEffect(() => {
      setFilterCount?.(computeReleaseNoteFilterCount(localFilters));
    }, [localFilters, setFilterCount]);

    const mappedModuleOptions = useMemo(
      () =>
        moduleOptions.map((opt) => ({
          value: typeof opt === 'object' ? opt.value : opt,
          label: typeof opt === 'object' ? opt.label : String(opt),
        })),
      [moduleOptions],
    );

    const filteredModuleOptions = useMemo(() => {
      if (!searchText.trim()) return mappedModuleOptions;
      const q = searchText.toLowerCase().trim();
      return mappedModuleOptions.filter(
        (opt) =>
          String(opt.label).toLowerCase().includes(q) ||
          String(opt.value).toLowerCase().includes(q),
      );
    }, [mappedModuleOptions, searchText]);

    const moduleCount = Array.isArray(localFilters.modules) ? localFilters.modules.length : 0;

    const handleModuleToggle = useCallback((moduleValue) => {
      setLocalFilters((previous) => {
        const current = Array.isArray(previous.modules) ? previous.modules : [];
        const isSelected = current.includes(moduleValue);
        return {
          ...previous,
          modules: isSelected
            ? current.filter((m) => m !== moduleValue)
            : [...current, moduleValue],
        };
      });
    }, []);

    const handleClear = useCallback(() => {
      setLocalFilters((previous) => ({ ...previous, modules: [] }));
      setSearchText('');
    }, []);

    const handlePopoverClose = useCallback(() => {
      onFiltersChange?.({ ...localFilters });
    }, [localFilters, onFiltersChange]);

    useImperativeHandle(ref, () => ({
      handleClose: handlePopoverClose,
    }));

    const previousOpenRef = useRef(open);
    useEffect(() => {
      if (previousOpenRef.current && !open) {
        handlePopoverClose();
      }
      previousOpenRef.current = open;
    }, [open, handlePopoverClose]);

    if (!open) return null;

    return (
      <Filter.Root
        ref={popoverRef}
        align='end'
        sideOffset={8}
        className='w-[min(480px,calc(100vw-2rem))]'
        onInteractOutside={handlePopoverClose}
        onEscapeKeyDown={handlePopoverClose}
      >
        <Filter.Header title='FILTERS' onClear={handleClear} clearLabel='Clear all' />
        <Filter.Body>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root defaultValue={MODULE_TAB_VALUE}>
              <TabMenuVertical.List className='border-r-0 p-2'>
                <TabMenuVertical.Trigger
                  className='flex w-full items-center justify-between'
                  value={MODULE_TAB_VALUE}
                >
                  Modules
                  {moduleCount > 0 ? (
                    <Badge.Root
                      size='medium'
                      variant='filled'
                      className='shrink-0 rounded-full bg-black text-white'
                    >
                      {moduleCount}
                    </Badge.Root>
                  ) : (
                    <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                  )}
                </TabMenuVertical.Trigger>
              </TabMenuVertical.List>
            </TabMenuVertical.Root>
          </Filter.Sidebar>

          <Filter.Content width='300px'>
            <Filter.List
              options={filteredModuleOptions}
              selectedValues={localFilters.modules || []}
              onToggle={handleModuleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              virtualized
              emptyMessage='No modules found'
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

ReleaseNoteFilterPopover.displayName = 'ReleaseNoteFilterPopover';

export default ReleaseNoteFilterPopover;
