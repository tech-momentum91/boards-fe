import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import useAnchoredMenuPosition from '../../../hooks/useAnchoredMenuPosition';
import useHoverSubmenuController from '../../../hooks/useHoverSubmenuController';
import {
  getCalculateMenuConfig,
  getDefaultCalculateSelection,
} from '../utils/task-list-calculate-utils';

const SUBMENU_MIN_WIDTH = 196;
const VIEWPORT_PADDING = 8;
const SUBMENU_GAP = 4;

function shouldOpenSubmenuToLeft(anchorRect, submenuWidth = SUBMENU_MIN_WIDTH) {
  if (!anchorRect) {
    return false;
  }

  return anchorRect.right + SUBMENU_GAP + submenuWidth > window.innerWidth - VIEWPORT_PADDING;
}

function CalculateNestedGroupItem({
  group,
  value,
  isActive,
  itemHandlers,
  panelHandlers,
  onSelect,
}) {
  const itemRef = useRef(null);
  const panelRef = useRef(null);
  const [openToLeft, setOpenToLeft] = useState(false);

  useLayoutEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const updatePlacement = () => {
      const itemRect = itemRef.current?.getBoundingClientRect();
      const panelWidth = panelRef.current?.offsetWidth ?? SUBMENU_MIN_WIDTH;
      setOpenToLeft(shouldOpenSubmenuToLeft(itemRect, panelWidth));
    };

    updatePlacement();
    requestAnimationFrame(updatePlacement);

    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);

    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isActive]);

  return (
    <div className='relative'>
      <button
        ref={itemRef}
        type='button'
        {...itemHandlers}
        className={cn(
          'flex w-full items-center justify-between px-3 py-2 text-left text-sm text-text-main-900 transition hover:bg-bg-weak-50',
          isActive && 'bg-bg-weak-50',
        )}
      >
        <span>{group.label}</span>
        <RiArrowRightSLine size={16} className='shrink-0 text-icon-sub-500' />
      </button>

      {isActive ? (
        <div
          ref={panelRef}
          {...panelHandlers}
          className={cn(
            'absolute top-0 z-30 min-w-[196px] rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-1 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]',
            openToLeft ? 'right-full mr-1' : 'left-full ml-1',
          )}
        >
          {group.options.map((option) => (
            <button
              key={option.type}
              type='button'
              onClick={() => onSelect(option)}
              className={cn(
                'flex w-full px-3 py-2 text-left text-sm text-text-main-900 transition hover:bg-bg-weak-50',
                value?.type === option.type && 'bg-bg-weak-50',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CalculateTypeSelect({ column, value, onChange }) {
  const config = useMemo(() => getCalculateMenuConfig(column), [column]);
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const { closeSubmenu, getItemHandlers, getPanelHandlers, isOpen } = useHoverSubmenuController();

  const selectedLabel = value?.label ?? getDefaultCalculateSelection(column).label;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (containerRef.current?.contains(event.target)) {
        return;
      }

      setOpen(false);
      closeSubmenu();
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [closeSubmenu, open]);

  const handleSelect = (option) => {
    onChange?.(option);
    setOpen(false);
    closeSubmenu();
  };

  return (
    <div ref={containerRef} className='relative'>
      <button
        type='button'
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 text-left text-sm text-text-main-900 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] transition hover:bg-bg-weak-50',
          open && 'border-primary-base ring-1 ring-primary-base',
        )}
      >
        <span className='truncate'>{selectedLabel}</span>
        <RiArrowDownSLine
          size={18}
          className={cn('shrink-0 text-primary-base transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div className='absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-visible rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-1 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'>
          {config.nested
            ? config.groups.map((group) => (
                <CalculateNestedGroupItem
                  key={group.key}
                  group={group}
                  value={value}
                  isActive={isOpen(group.key)}
                  itemHandlers={getItemHandlers(group.key)}
                  panelHandlers={getPanelHandlers(group.key)}
                  onSelect={handleSelect}
                />
              ))
            : config.options.map((option) => (
                <button
                  key={option.type}
                  type='button'
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'flex w-full px-3 py-2 text-left text-sm text-text-main-900 transition hover:bg-bg-weak-50',
                    value?.type === option.type && 'bg-bg-weak-50',
                  )}
                >
                  {option.label}
                </button>
              ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ListColumnCalculateMenu({
  anchorRef,
  column,
  initialCalculation = null,
  onCalculate,
  onClose,
}) {
  const menuRef = useRef(null);
  const { top, left, maxHeight } = useAnchoredMenuPosition(anchorRef, menuRef);
  const [selection, setSelection] = useState(
    () =>
      initialCalculation ?? {
        type: getDefaultCalculateSelection(column).type,
        label: getDefaultCalculateSelection(column).label,
      },
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current?.contains(event.target) || anchorRef?.current?.contains(event.target)) {
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

  return (
    <div
      ref={menuRef}
      className='fixed z-50 w-[280px] overflow-visible rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-3 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      style={{
        top,
        left,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
    >
      <p className='mb-2 text-xs font-medium uppercase tracking-[0.48px] text-text-soft-400'>
        Calculate
      </p>

      <CalculateTypeSelect column={column} value={selection} onChange={setSelection} />

      <button
        type='button'
        onClick={() => {
          onCalculate?.(selection);
          onClose?.();
        }}
        className='mt-3 flex h-10 w-full items-center justify-center rounded-lg bg-primary-base text-sm font-medium text-text-white-0 transition hover:bg-primary-dark'
      >
        Calculate
      </button>
    </div>
  );
}
