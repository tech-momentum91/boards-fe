import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiSearchLine } from 'react-icons/ri';
import devxAiMark from '@/assets/svgs/devx-ai-mark.svg';
import { setDevxAiChatOpen, setGlobalSearchOpen } from '@/redux/uiSlice';
import { hasModulePermission } from '@/utils/user-role-utils';
import { cn } from '@/utils/cn';

/**
 * Search field + DevX AI trigger (Figma Text Input [1.0], node 10:3411).
 * Left zone opens the command palette; right icon opens the AI sidebar.
 */
const GlobalSearchInputButton = () => {
  const dispatch = useDispatch();
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const canAccessChatbot = hasModulePermission(
    userSideBarPerm,
    'Chatbot Doctype Registry',
    'create',
  );

  const openCommandPalette = () => {
    dispatch(setGlobalSearchOpen(true));
  };

  const openDevxAi = (event) => {
    event.stopPropagation();
    event.preventDefault();
    dispatch(setDevxAiChatOpen(true));
  };

  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0',
        'py-[7px] pl-[10px] pr-2 shadow-[0_1px_2px_0_rgba(228,229,231,0.24)]',
      )}
    >
      <button
        type='button'
        onClick={openCommandPalette}
        className='flex min-w-0 flex-1 items-center gap-2 text-left'
        aria-label='Open global search'
      >
        <RiSearchLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
        <span className='paragraph-small min-w-0 flex-1 text-text-soft-400'>Search anything</span>
        <span className='shrink-0 text-[12px] text-text-soft-400' aria-hidden>
          ⌘K
        </span>
      </button>
      {canAccessChatbot && (
        <button
          type='button'
          onClick={openDevxAi}
          className={cn(
            'shrink-0 rounded p-1 transition',
            'hover:bg-bg-weak-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/30',
          )}
          aria-label='Open DevX AI'
        >
          <img
            src={devxAiMark}
            alt=''
            className='h-[14px] w-[15px] object-contain'
            width={15}
            height={14}
          />
        </button>
      )}
    </div>
  );
};

export default GlobalSearchInputButton;
