import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine, RiSearchLine } from 'react-icons/ri';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { useDebounce } from '@/hooks/use-debounce';
import { searchModuleRecords } from '@/services/system-list-service';
import { getErpModuleLabel } from '../constants/list-custom-fields-constants';
import { parseErpColumnKey } from '../utils/erp-column-utils';
import { getTaskSystemLink } from '../utils/system-link-utils';

const CLEAR_VALUE = '__erp_clear__';

function stopRowInteraction(event) {
  event.stopPropagation();
}

export default function TaskErpFieldCell({
  column,
  task,
  value = '',
  disabled = false,
  compact = false,
  onLinkUpdate,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const parsedKey = parseErpColumnKey(column?.key);
  const moduleId = column?.moduleId || parsedKey?.moduleId;
  const fieldId = column?.fieldId || parsedKey?.fieldId;
  const systemLink = getTaskSystemLink(task);
  const isLinkedToModule = systemLink?.moduleId === moduleId;
  const selectedDocname = isLinkedToModule ? systemLink.docname : '';
  const isInteractive = Boolean(onLinkUpdate) && !disabled;
  const isBusy = disabled || isSaving;

  useEffect(() => {
    if (!open || !moduleId) {
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);

    searchModuleRecords(moduleId, { query: debouncedSearch }).then((result) => {
      if (cancelled) {
        return;
      }

      setOptions(result.data ?? []);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, moduleId, open]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const listOptions = useMemo(() => {
    const clearItem = { id: CLEAR_VALUE, label: '—' };
    const base = [clearItem, ...options];

    if (selectedDocname && value && !base.some((option) => option.id === selectedDocname)) {
      return [clearItem, { id: selectedDocname, label: value }, ...options];
    }

    return base;
  }, [options, selectedDocname, value]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (!isInteractive) {
        return;
      }

      setOpen(nextOpen);
    },
    [isInteractive],
  );

  const handleSelect = async (docname) => {
    if (!onLinkUpdate || !moduleId || !task?.id || isBusy) {
      setOpen(false);
      return;
    }

    if (docname === CLEAR_VALUE) {
      setIsSaving(true);
      try {
        await onLinkUpdate(task.id, { moduleId, docname: null, fieldId });
      } finally {
        setIsSaving(false);
        setOpen(false);
      }
      return;
    }

    if (docname === selectedDocname) {
      setOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await onLinkUpdate(task.id, { moduleId, docname, fieldId });
    } finally {
      setIsSaving(false);
      setOpen(false);
    }
  };

  const placeholder = `Search ${getErpModuleLabel(moduleId)}`;
  const display = value ? String(value) : '';

  return (
    <div
      className={cn('flex h-full w-full items-center', compact ? 'h-8' : 'min-h-11')}
      onClick={stopRowInteraction}
      onMouseDown={stopRowInteraction}
      onPointerDown={stopRowInteraction}
      data-prevent-row-click
    >
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <button
            type='button'
            role='combobox'
            disabled={isBusy || !isInteractive}
            aria-expanded={open}
            data-prevent-row-click
            onClick={stopRowInteraction}
            onMouseDown={stopRowInteraction}
            onPointerDown={stopRowInteraction}
            className={cn(
              'flex h-full w-full items-center gap-1 px-2 text-left text-sm transition-colors',
              'hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-inset',
              (isBusy || !isInteractive) && 'cursor-not-allowed opacity-60',
              display ? 'text-text-main-900' : 'text-text-soft-400',
            )}
          >
            <span className='min-w-0 flex-1 truncate'>{display || (compact ? '' : '—')}</span>
            {display || !compact ? (
              <RiArrowDownSLine
                size={14}
                className={cn(
                  'shrink-0 text-icon-soft-400 transition-transform',
                  open && 'rotate-180',
                )}
              />
            ) : null}
          </button>
        </Popover.Trigger>
        <Popover.Content
          align='start'
          sideOffset={4}
          showArrow={false}
          className='w-64 overflow-hidden p-0'
          data-prevent-row-click
          onClick={stopRowInteraction}
          onMouseDown={stopRowInteraction}
          onPointerDown={stopRowInteraction}
        >
          <div className='border-b border-stroke-soft-200 p-2'>
            <div className='flex items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-1.5 pl-2 pr-1.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] focus-within:border-stroke-soft-200'>
              <RiSearchLine size={16} className='shrink-0 text-icon-sub-500' />
              <input
                type='text'
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={placeholder}
                autoFocus
                onClick={stopRowInteraction}
                onMouseDown={stopRowInteraction}
                onKeyDown={stopRowInteraction}
                className='min-w-0 flex-1 bg-transparent text-sm leading-5 tracking-[-0.084px] text-text-main-900 outline-none ring-0 placeholder:text-text-soft-400 focus:outline-none focus:ring-0'
              />
            </div>
          </div>

          <div className='max-h-52 overflow-y-auto p-1'>
            {isLoading || isSaving ? (
              <div className='px-2 py-3 text-sm text-text-sub-500'>
                {isSaving ? 'Saving...' : 'Loading...'}
              </div>
            ) : listOptions.length === 0 ? (
              <div className='px-2 py-3 text-sm text-text-sub-500'>No records found.</div>
            ) : (
              listOptions.map((option) => {
                const isSelected = selectedDocname === option.id && option.id !== CLEAR_VALUE;

                return (
                  <button
                    key={option.id}
                    type='button'
                    data-prevent-row-click
                    onClick={(event) => {
                      stopRowInteraction(event);
                      handleSelect(option.id);
                    }}
                    onMouseDown={stopRowInteraction}
                    onPointerDown={stopRowInteraction}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-bg-weak-50',
                      isSelected && 'bg-bg-weak-50',
                      option.id === CLEAR_VALUE ? 'text-text-soft-400' : 'text-text-main-900',
                    )}
                  >
                    <span className='min-w-0 flex-1 truncate'>{option.label}</span>
                    {isSelected ? (
                      <RiCheckLine size={16} className='shrink-0 text-text-sub-500' />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
