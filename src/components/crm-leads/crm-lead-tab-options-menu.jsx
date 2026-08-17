import { useEffect, useRef, useState } from 'react';
import { RiEyeOffLine, RiPushpin2Fill, RiPushpin2Line } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import useAnchoredMenuPosition from '@/pages/boards/hooks/useAnchoredMenuPosition';

const MenuItem = ({ icon: Icon, label, onClick, disabled = false }) => (
  <button
    type='button'
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors',
      disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-bg-weak-50',
    )}
  >
    <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
      <Icon size={18} />
    </span>
    <span className='flex-1 text-sm leading-5 tracking-[-0.084px] text-text-main-900'>{label}</span>
  </button>
);

/**
 * Context menu for CRM lead pipeline/stage tabs — Pin and Hide only.
 */
export default function CrmLeadTabOptionsMenu({
  anchorRef,
  tab,
  isPinned = false,
  canHide = true,
  onClose,
  onTogglePin,
  onHide,
  isMutating = false,
}) {
  const menuRef = useRef(null);
  const [label] = useState(() => tab?.label ?? '');
  const { top, left, maxHeight } = useAnchoredMenuPosition(anchorRef, menuRef);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current?.contains(event.target) || anchorRef?.current?.contains(event.target)) {
        return;
      }
      onClose?.();
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [anchorRef, onClose]);

  const handleAction = async (action) => {
    if (isMutating) return;
    await action?.();
    onClose?.();
  };

  return (
    <div
      ref={menuRef}
      className='fixed z-50 flex w-56 flex-col gap-1 overflow-y-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      style={{
        top,
        left,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
      role='menu'
      aria-label={`${label} tab options`}
    >
      <MenuItem
        icon={isPinned ? RiPushpin2Fill : RiPushpin2Line}
        label={isPinned ? 'Unpin' : 'Pin'}
        disabled={isMutating}
        onClick={() => handleAction(onTogglePin)}
      />
      <MenuItem
        icon={RiEyeOffLine}
        label='Hide'
        disabled={isMutating || !canHide}
        onClick={() => handleAction(onHide)}
      />
    </div>
  );
}
