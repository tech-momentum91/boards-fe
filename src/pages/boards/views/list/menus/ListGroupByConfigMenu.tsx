import { useEffect, useRef } from 'react';
import { RiDeleteBinLine } from 'react-icons/ri';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';
import useAnchoredMenuPosition from '../../../hooks/useAnchoredMenuPosition';

const GROUP_ORDER_OPTIONS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

export default function ListGroupByConfigMenu({
  anchorRef,
  options = [],
  groupBy,
  onGroupByChange,
  onClear,
  onClose,
}) {
  const menuRef = useRef(null);
  const { top, left, maxHeight } = useAnchoredMenuPosition(anchorRef, menuRef);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current?.contains(event.target) ||
        anchorRef?.current?.contains(event.target) ||
        event.target.closest?.(
          [
            '[data-radix-select-content]',
            '[data-radix-select-viewport]',
            '[data-radix-popper-content-wrapper]',
            '[role="listbox"]',
          ].join(', '),
        )
      ) {
        return;
      }

      onClose?.();
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [anchorRef, onClose]);

  if (!groupBy?.columnKey) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className='fixed z-50 w-[360px] overflow-hidden rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-3 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      style={{
        top,
        left,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
    >
      <p className='mb-2 text-xs font-medium text-text-soft-400'>Group by</p>

      <div className='flex items-center gap-2'>
        <Select.Root
          value={groupBy.columnKey}
          onValueChange={(columnKey) =>
            onGroupByChange?.({
              ...groupBy,
              columnKey,
            })
          }
          size='small'
        >
          <Select.Trigger className='min-w-0 flex-1'>
            <Select.Value placeholder='Select field' />
          </Select.Trigger>
          <Select.Content>
            {options.map((option) => {
              const Icon = option.icon;

              return (
                <Select.Item key={option.key} value={option.key}>
                  <span className='flex items-center gap-2'>
                    <Icon size={16} className='shrink-0 text-icon-sub-500' />
                    {option.label}
                  </span>
                </Select.Item>
              );
            })}
          </Select.Content>
        </Select.Root>

        <Select.Root
          value={groupBy.direction ?? 'asc'}
          onValueChange={(direction) =>
            onGroupByChange?.({
              ...groupBy,
              direction,
            })
          }
          size='small'
        >
          <Select.Trigger className='w-[132px] shrink-0'>
            <Select.Value placeholder='Order' />
          </Select.Trigger>
          <Select.Content>
            {GROUP_ORDER_OPTIONS.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        <button
          type='button'
          aria-label='Clear grouping'
          onClick={() => {
            onClear?.();
            onClose?.();
          }}
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg border border-stroke-soft-200 bg-bg-white-0 text-icon-sub-500 transition hover:bg-bg-weak-50',
          )}
        >
          <RiDeleteBinLine size={18} />
        </button>
      </div>
    </div>
  );
}
