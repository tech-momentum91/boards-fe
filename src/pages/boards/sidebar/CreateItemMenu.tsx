import { FolderPlus, List } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import useAnchoredMenuPosition, {
  useAnchoredSubmenuPosition,
} from '../hooks/useAnchoredMenuPosition';

const MenuItem = ({ icon: Icon, title, description, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors hover:bg-bg-weak-50'
  >
    <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
      <Icon size={16} strokeWidth={1.75} />
    </span>

    <div className='flex min-w-0 flex-1 flex-col gap-1'>
      <span className='text-sm leading-5 tracking-[-0.084px] text-text-main-900'>{title}</span>
      <span className='text-xs leading-4 text-text-soft-400'>{description}</span>
    </div>
  </button>
);

export default function CreateItemMenu({
  anchorRef,
  fallbackAnchorRef = null,
  parentMenuRef = null,
  panelRef = null,
  panelHoverHandlers = {},
  onClose,
  onCreateFolder,
  onCreateList,
}) {
  const menuRef = useRef(null);
  const isSubmenu = Boolean(parentMenuRef);
  const anchoredPosition = useAnchoredMenuPosition(anchorRef, menuRef, fallbackAnchorRef);
  const submenuPosition = useAnchoredSubmenuPosition(anchorRef, menuRef, parentMenuRef);

  const { top, left, maxHeight } = isSubmenu
    ? { ...submenuPosition, maxHeight: undefined }
    : anchoredPosition;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current?.contains(event.target) ||
        anchorRef?.current?.contains(event.target) ||
        parentMenuRef?.current?.contains(event.target)
      ) {
        return;
      }

      onClose?.();
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorRef, onClose, parentMenuRef]);

  return createPortal(
    <div
      ref={(node) => {
        menuRef.current = node;
        if (panelRef) {
          panelRef.current = node;
        }
      }}
      {...panelHoverHandlers}
      className={cn(
        'fixed flex w-64 flex-col gap-1 overflow-y-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]',
        isSubmenu ? 'z-[210]' : 'z-[200]',
      )}
      style={{
        top,
        left,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
    >
      <div className='px-2 pb-1 pt-2'>
        <span className='text-xs font-medium uppercase tracking-tight text-text-soft-400'>
          Create
        </span>
      </div>

      <MenuItem
        icon={FolderPlus}
        title='Folder'
        description='Group lists & more.'
        onClick={onCreateFolder}
      />

      <MenuItem
        icon={List}
        title='List'
        description='Track tasks, projects, people & more.'
        onClick={onCreateList}
      />
    </div>,
    document.body,
  );
}
