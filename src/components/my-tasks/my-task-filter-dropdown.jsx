import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useImperativeHandle,
} from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';

const FILTER_TABS = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
];

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const toOptions = (values) =>
  (values || []).map((v) => ({
    value: v,
    label: v,
  }));

const MyTaskFilterDropdown = React.forwardRef(
  (
    {
      open,
      statusOptions = [],
      priorityOptions = [],
      appliedStatuses = [],
      appliedPriorities = [],
      onFiltersChange,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState('status');
    const [localStatuses, setLocalStatuses] = useState(() => ensureArray(appliedStatuses));
    const [localPriorities, setLocalPriorities] = useState(() => ensureArray(appliedPriorities));
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    useEffect(() => {
      setLocalStatuses(ensureArray(appliedStatuses));
      setLocalPriorities(ensureArray(appliedPriorities));
    }, [appliedStatuses, appliedPriorities]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const statusSelectOptions = useMemo(() => toOptions(statusOptions), [statusOptions]);
    const prioritySelectOptions = useMemo(() => toOptions(priorityOptions), [priorityOptions]);

    const currentOptions = useMemo(() => {
      let options = activeTab === 'status' ? statusSelectOptions : prioritySelectOptions;
      if (searchText.trim()) {
        const q = searchText.toLowerCase().trim();
        options = options.filter(
          (o) =>
            String(o.label).toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q),
        );
      }
      return options;
    }, [activeTab, statusSelectOptions, prioritySelectOptions, searchText]);

    const selectedValues = activeTab === 'status' ? localStatuses : localPriorities;

    const handleToggle = useCallback(
      (value) => {
        if (activeTab === 'status') {
          setLocalStatuses((previous) => {
            const next = ensureArray(previous);
            return next.includes(value) ? next.filter((v) => v !== value) : [...next, value];
          });
        } else {
          setLocalPriorities((previous) => {
            const next = ensureArray(previous);
            return next.includes(value) ? next.filter((v) => v !== value) : [...next, value];
          });
        }
      },
      [activeTab],
    );

    const handleClear = useCallback(() => {
      setLocalStatuses([]);
      setLocalPriorities([]);
      setSearchText('');
    }, []);

    const emitFilters = useCallback(() => {
      onFiltersChange?.({
        statuses: [...localStatuses],
        priorities: [...localPriorities],
      });
    }, [localStatuses, localPriorities, onFiltersChange]);

    const handlePopoverClose = useCallback(() => {
      emitFilters();
    }, [emitFilters]);

    const previousOpenRef = useRef(open);
    useEffect(() => {
      if (previousOpenRef.current && !open) {
        handlePopoverClose();
      }
      previousOpenRef.current = open;
    }, [open, handlePopoverClose]);

    useImperativeHandle(ref, () => ({
      handleClose: handlePopoverClose,
    }));

    if (!open) return null;

    return (
      <Filter.Root
        ref={popoverRef}
        align='end'
        side='bottom'
        sideOffset={8}
        showArrow={false}
        onInteractOutside={handlePopoverClose}
        onEscapeKeyDown={handlePopoverClose}
        className='w-auto'
      >
        <Filter.Header title='FILTERS' onClear={handleClear} />
        <Filter.Body>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='border-r-0 p-2'>
                {FILTER_TABS.map((tab) => {
                  const count =
                    tab.value === 'status' ? localStatuses.length : localPriorities.length;
                  const showCount = count > 0;
                  return (
                    <TabMenuVertical.Trigger
                      className='flex w-full items-center justify-between'
                      key={tab.value}
                      value={tab.value}
                    >
                      {tab.label}
                      {showCount ? (
                        <Badge.Root
                          size='medium'
                          variant='filled'
                          className='shrink-0 rounded-full bg-black'
                        >
                          {count}
                        </Badge.Root>
                      ) : (
                        <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                      )}
                    </TabMenuVertical.Trigger>
                  );
                })}
              </TabMenuVertical.List>
            </TabMenuVertical.Root>
          </Filter.Sidebar>

          <Filter.Content width='300px'>
            <Filter.List
              options={currentOptions}
              selectedValues={selectedValues}
              onToggle={handleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              emptyMessage={activeTab === 'status' ? 'No status options' : 'No priority options'}
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

MyTaskFilterDropdown.displayName = 'MyTaskFilterDropdown';

export default MyTaskFilterDropdown;
