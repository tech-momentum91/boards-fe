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
import * as Select from '@/components/ui/select';
import * as Label from '@/components/ui/label';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import { MONTH_RANGE_OPTIONS } from '@/components/pnl/constants';

const normalizeMonthValue = (value) => {
  if (!value) return '';
  // Backward compatibility for previous P&L month values
  if (value === 'All' || value === 'Last 12 months') return 'last_12';
  return value; // '', last_3/6/9/12
};

const PnlFilter = React.forwardRef(
  (
    {
      open = false,
      filters = {},
      onFilterChange,
      onClearFilters,
      onInteractOutside,
      onEscapeKeyDown,
    },
    ref,
  ) => {
    const [localMonth, setLocalMonth] = useState('');
    const monthOptions = useMemo(() => MONTH_RANGE_OPTIONS, []);
    const [activeSection, setActiveSection] = useState('month');
    const prevOpenRef = useRef(false);

    // When the popover opens, sync staged month from applied filters (snapshot for this session).
    useEffect(() => {
      const justOpened = open && !prevOpenRef.current;
      prevOpenRef.current = open;
      if (!justOpened) return;

      const raw = filters.month || '';
      if (raw === 'All' || raw === 'Last 12 months') {
        setLocalMonth('last_12');
      } else {
        setLocalMonth(raw);
      }
    }, [open, filters.month]);

    const handleClose = useCallback(() => {
      const next = normalizeMonthValue(localMonth);
      const applied = normalizeMonthValue(filters.month || '');
      if (next === applied) return;
      onFilterChange?.({ month: next });
    }, [localMonth, filters.month, onFilterChange]);

    useImperativeHandle(ref, () => ({ handleClose }), [handleClose]);

    const handleClearAll = () => {
      setLocalMonth('');
      onClearFilters?.();
    };

    return (
      <Filter.Root onInteractOutside={onInteractOutside} onEscapeKeyDown={onEscapeKeyDown}>
        <Filter.Header onClear={handleClearAll} />
        <Filter.Body>
          <Filter.Sidebar width='200px'>
            <TabMenuVertical.Root value={activeSection} onValueChange={setActiveSection}>
              <TabMenuVertical.List className='p-2 border-r-0'>
                <TabMenuVertical.Trigger
                  className='w-full flex items-center justify-between'
                  value='month'
                >
                  Month
                  {normalizeMonthValue(localMonth) ? (
                    <Badge.Root
                      size='medium'
                      variant='filled'
                      className='shrink-0 rounded-full bg-black text-white'
                    >
                      1
                    </Badge.Root>
                  ) : (
                    <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                  )}
                </TabMenuVertical.Trigger>
              </TabMenuVertical.List>
            </TabMenuVertical.Root>
          </Filter.Sidebar>
          <Filter.Content width='340px'>
            {activeSection === 'month' ? (
              <div className='p-4 flex flex-col gap-2'>
                <Label.Root>Month</Label.Root>
                <Select.Root value={localMonth || undefined} onValueChange={setLocalMonth}>
                  <Select.Trigger>
                    <Select.Value placeholder='Select Month' />
                  </Select.Trigger>
                  <Select.Content>
                    {monthOptions.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        {opt.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
            ) : null}
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

PnlFilter.displayName = 'PnlFilter';

export default PnlFilter;
