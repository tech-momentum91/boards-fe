import { useEffect, useRef } from 'react';
import { RiEditBoxLine, RiListCheck } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import useAnchoredMenuPosition from '../../hooks/useAnchoredMenuPosition';

const MenuItem = ({ icon: Icon, title, description, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors hover:bg-bg-weak-100'
  >
    <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
      <Icon size={20} />
    </span>

    <div className='flex min-w-0 flex-1 flex-col gap-1'>
      <span className='text-sm leading-5 tracking-[-0.084px] text-text-main-900'>{title}</span>
      <span className='text-xs leading-4 text-text-soft-400'>{description}</span>
    </div>
  </button>
);

export default function CreateTaskMenu({
  anchorRef,
  onClose,
  onCreateCustomList,
  onCreateSystemList,
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

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorRef, onClose]);

  const handleCustomList = () => {
    onCreateCustomList?.();
    onClose?.();
  };

  const handleSystemList = () => {
    onCreateSystemList?.();
    onClose?.();
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-50 flex w-64 flex-col gap-1 overflow-y-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]',
      )}
      style={{
        top,
        left,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
    >
      <div className='px-2 pb-0.5 pt-2'>
        <span className='text-[11px] font-medium uppercase leading-3 tracking-[0.22px] text-text-soft-400'>
          Create
        </span>
      </div>

      <MenuItem
        icon={RiEditBoxLine}
        title='Single Task'
        description='Create one task from scratch.'
        onClick={handleCustomList}
      />

      <MenuItem
        icon={RiListCheck}
        title='Bulk Tasks'
        description='Create tasks from system modules and fields.'
        onClick={handleSystemList}
      />
    </div>
  );
}
