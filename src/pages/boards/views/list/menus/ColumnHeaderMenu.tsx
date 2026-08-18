import { useEffect, useRef } from 'react';
import {
  RiArrowUpDownLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalculatorLine,
  RiEyeOffLine,
  RiStackLine,
} from 'react-icons/ri';
import { cn } from '@/utils/cn';
import useAnchoredMenuPosition from '../../../hooks/useAnchoredMenuPosition';

function MenuItem({ icon: Icon, label, onClick, disabled = false }) {
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-bg-weak-50',
      )}
    >
      <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
        <Icon size={18} />
      </span>
      <span className='flex-1 text-sm leading-5 tracking-[-0.084px] text-text-main-900'>
        {label}
      </span>
    </button>
  );
}

const Divider = () => <div className='h-px w-full bg-stroke-soft-200' />;

export default function ColumnHeaderMenu({
  anchorRef,
  column,
  onClose,
  onSort,
  onGroup,
  onCalculate,
  onMoveLeft,
  onMoveRight,
  onHideColumn,
  canSort = false,
  canGroup = false,
  canCalculate = false,
  isGroupedByColumn = false,
  canMoveLeft = false,
  canMoveRight = false,
}) {
  const menuRef = useRef(null);
  const { top, left, maxHeight } = useAnchoredMenuPosition(anchorRef, menuRef);

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

  const handleAction = (callback) => {
    callback?.();
    onClose?.();
  };

  return (
    <div
      ref={menuRef}
      role='menu'
      aria-label={column?.label ? `${column.label} column menu` : 'Column menu'}
      className='fixed z-50 flex w-64 flex-col gap-1 overflow-y-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      style={{
        top,
        left,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
    >
      {canSort ? (
        <>
          <MenuItem icon={RiArrowUpDownLine} label='Sort' onClick={() => handleAction(onSort)} />
          <Divider />
        </>
      ) : null}

      {canGroup ? (
        <>
          <MenuItem
            icon={RiStackLine}
            label={isGroupedByColumn ? 'Remove grouping' : 'Group'}
            onClick={() => handleAction(onGroup)}
          />
          <Divider />
        </>
      ) : null}

      {canCalculate ? (
        <>
          <MenuItem
            icon={RiCalculatorLine}
            label='Calculate'
            onClick={() => handleAction(onCalculate)}
          />
          <Divider />
        </>
      ) : null}

      <MenuItem
        icon={RiArrowLeftSLine}
        label='Move to left'
        disabled={!canMoveLeft}
        onClick={() => canMoveLeft && handleAction(onMoveLeft)}
      />
      <MenuItem
        icon={RiArrowRightSLine}
        label='Move to right'
        disabled={!canMoveRight}
        onClick={() => canMoveRight && handleAction(onMoveRight)}
      />
      <MenuItem
        icon={RiEyeOffLine}
        label='Hide column'
        onClick={() => handleAction(onHideColumn)}
      />
    </div>
  );
}
