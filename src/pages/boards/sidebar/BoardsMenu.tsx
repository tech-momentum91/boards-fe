import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RiAddLine, RiArchiveLine, RiEyeLine } from 'react-icons/ri';
import useAnchoredMenuPosition from '../hooks/useAnchoredMenuPosition';

const Toggle = ({ checked, onChange }) => (
  <button
    type='button'
    onClick={(e) => {
      e.stopPropagation();
      onChange();
    }}
    className='relative h-5 w-8 shrink-0'
  >
    <span
      className={`absolute inset-x-[2px] top-[2px] h-4 rounded-full transition-colors ${
        checked ? 'bg-primary-base border-primary-darker' : 'bg-bg-soft-200 border-neutral-300'
      } border`}
    />
    <span
      className={`absolute top-1 size-3 rounded-full bg-bg-white-0 transition-all ${
        checked ? 'left-4' : 'left-1'
      }`}
    />
  </button>
);

const MenuItem = ({ icon: Icon, label, rightContent, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-bg-weak-50'
  >
    <span className='flex size-5 items-center justify-center text-icon-sub-500'>
      <Icon size={18} />
    </span>

    <span className='flex-1 text-label-sm text-text-main-900'>{label}</span>

    {rightContent}
  </button>
);

export default function BoardsMenu({
  anchorRef,
  onClose,
  onCreateBoard,
  showAllBoards,
  onToggleShowAllBoards,
  showArchived,
  onToggleShowArchived,
}) {
  const menuRef = useRef(null);
  const { top, left, maxHeight } = useAnchoredMenuPosition(anchorRef, menuRef);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target) && !anchorRef?.current?.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorRef, onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className='fixed z-[200] w-64 overflow-y-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      style={{
        top,
        left,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
    >
      <MenuItem
        icon={RiAddLine}
        label='Create Board'
        onClick={() => {
          onCreateBoard?.();
          onClose?.();
        }}
      />

      <div className='my-1 h-px bg-stroke-soft-200' />

      <MenuItem
        icon={RiEyeLine}
        label='Show All Boards'
        rightContent={<Toggle checked={showAllBoards} onChange={onToggleShowAllBoards} />}
      />

      <MenuItem
        icon={RiArchiveLine}
        label='Show Archived'
        rightContent={<Toggle checked={showArchived} onChange={onToggleShowArchived} />}
      />
    </div>,
    document.body,
  );
}
