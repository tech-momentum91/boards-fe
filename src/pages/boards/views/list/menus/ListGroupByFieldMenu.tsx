import { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import useAnchoredMenuPosition from '../../../hooks/useAnchoredMenuPosition';

function GroupFieldMenuItem({ icon: Icon, label, onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-bg-weak-50'
    >
      <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
        <Icon size={18} />
      </span>
      <span className='flex-1 truncate text-sm leading-5 tracking-[-0.084px] text-text-main-900'>
        {label}
      </span>
    </button>
  );
}

export default function ListGroupByFieldMenu({ anchorRef, options = [], onSelect, onClose }) {
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

  return (
    <div
      ref={menuRef}
      role='menu'
      aria-label='Group by field'
      className={cn(
        'fixed z-50 flex w-64 flex-col gap-0.5 overflow-y-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]',
      )}
      style={{
        top,
        left,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
    >
      {options.map((option) => (
        <GroupFieldMenuItem
          key={option.key}
          icon={option.icon}
          label={option.label}
          onClick={() => onSelect?.(option.key)}
        />
      ))}
    </div>
  );
}
