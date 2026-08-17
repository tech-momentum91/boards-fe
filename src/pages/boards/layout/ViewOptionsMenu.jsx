import { useEffect, useRef, useState } from 'react';
import {
  RiDeleteBin6Line,
  RiFileCopyLine,
  RiPencilLine,
  RiPushpin2Fill,
  RiPushpin2Line,
} from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import { cn } from '@/utils/cn';
import useAnchoredMenuPosition from '../hooks/useAnchoredMenuPosition';

const MenuItem = ({ icon: Icon, label, onClick, disabled = false, destructive = false }) => (
  <button
    type='button'
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors',
      disabled
        ? 'cursor-not-allowed opacity-50'
        : destructive
          ? 'hover:bg-error-lighter'
          : 'hover:bg-bg-weak-50',
    )}
  >
    <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
      <Icon size={18} />
    </span>
    <span
      className={cn(
        'flex-1 text-sm leading-5 tracking-[-0.084px]',
        destructive ? 'text-error-base' : 'text-text-main-900',
      )}
    >
      {label}
    </span>
  </button>
);

const Divider = () => <div className='h-px w-full bg-stroke-soft-200' />;

export default function ViewOptionsMenu({
  anchorRef,
  view,
  onClose,
  onRename,
  onTogglePin,
  onDuplicate,
  onDelete,
  isMutating = false,
}) {
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(view?.title ?? '');
  const { top, left, maxHeight } = useAnchoredMenuPosition(anchorRef, menuRef);

  useEffect(() => {
    setRenameValue(view?.title ?? '');
    setIsRenaming(false);
  }, [view?.id, view?.title]);

  useEffect(() => {
    if (!isRenaming) {
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isRenaming]);

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

  const handleAction = async (action) => {
    if (isMutating) {
      return;
    }

    await action?.();
    onClose?.();
  };

  const handleRenameSubmit = async (event) => {
    event?.preventDefault?.();

    const trimmedTitle = renameValue.trim();

    if (!trimmedTitle || !view?.id) {
      return;
    }

    if (trimmedTitle === view?.title) {
      setIsRenaming(false);
      return;
    }

    await onRename?.(view.id, trimmedTitle);
    onClose?.();
  };

  const handleRenameStart = () => {
    setRenameValue(view?.title ?? '');
    setIsRenaming(true);
  };

  return (
    <div
      ref={menuRef}
      className='fixed z-50 flex w-64 flex-col gap-1 overflow-y-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      style={{
        top,
        left,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
    >
      {isRenaming ? (
        <form onSubmit={handleRenameSubmit} className='flex flex-col gap-2 px-1 py-1'>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Input
                ref={inputRef}
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                placeholder='View name'
                disabled={isMutating}
              />
            </Input.Wrapper>
          </Input.Root>

          <div className='flex items-center justify-end gap-2'>
            <button
              type='button'
              onClick={() => setIsRenaming(false)}
              disabled={isMutating}
              className='rounded-lg px-2 py-1 text-xs font-medium text-text-sub-500 hover:bg-bg-weak-50'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isMutating || !renameValue.trim()}
              className='rounded-lg bg-primary-base px-2 py-1 text-xs font-medium text-text-white-0 disabled:opacity-50'
            >
              Save
            </button>
          </div>
        </form>
      ) : (
        <>
          <MenuItem
            icon={RiPencilLine}
            label='Rename'
            disabled={isMutating}
            onClick={handleRenameStart}
          />
          <MenuItem
            icon={view?.favorite ? RiPushpin2Fill : RiPushpin2Line}
            label={view?.favorite ? 'Unpin' : 'Pin'}
            disabled={isMutating}
            onClick={() => handleAction(onTogglePin)}
          />

          <Divider />

          <MenuItem
            icon={RiFileCopyLine}
            label='Duplicate'
            disabled={isMutating}
            onClick={() => handleAction(onDuplicate)}
          />
          <MenuItem
            icon={RiDeleteBin6Line}
            label='Delete'
            disabled={isMutating || view?.isDefault}
            destructive
            onClick={() => handleAction(onDelete)}
          />
        </>
      )}
    </div>
  );
}
