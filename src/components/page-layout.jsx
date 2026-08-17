import React from 'react';
import Sidebar from '@/components/sidebar';
import DevxAiChatSidebar from '@/components/devx-ai-chat-sidebar';
import { cn } from '@/utils/cn';

const PageLayout = ({
  children,
  pageTitle,
  pageIcon,
  pageDescription,
  sidebarInitialOpen = true,
  showSidebar = true,
  showAiChatSidebar = true,
  headerActions = null,
  showDefaultHeader = true,
  borderDivClassName = '',
  /** Merged onto the main content slot below the header (e.g. `overflow-hidden` for nested panes). */
  contentAreaClassName = '',
  showHeaderActions = false,
}) => {
  return (
    <div className='w-dvw h-dvh flex min-w-0'>
      {/* Modular Sidebar Component */}
      {showSidebar && (
        <Sidebar
          key={sidebarInitialOpen ? 'sidebar-open' : 'sidebar-closed'}
          initialOpen={sidebarInitialOpen}
        />
      )}

      {/* Main Content Area */}
      <div className='flex min-w-0 min-h-0 h-full flex-1 flex-col overflow-y-auto transition-all duration-200 ease-out'>
        {showDefaultHeader && (
          <div className='w-full flex items-center justify-between px-7 py-5 gap-4'>
            <div className='flex items-center gap-[14px]'>
              {pageIcon && (
                <div className='p-[12px] text-(--color-text-sub-500) bg-bg-weak-100 rounded-[96px] flex items-center justify-center'>
                  {pageIcon}
                </div>
              )}

              <div className='flex flex-col items-start justify-start'>
                {pageTitle && <span className='label-large text-text-main-900'>{pageTitle}</span>}
                {pageDescription && (
                  <span className='paragraph-small text-(--color-text-sub-500)'>
                    {pageDescription}
                  </span>
                )}
              </div>
            </div>

            {headerActions && showHeaderActions ? (
              <div className='flex items-center gap-3 shrink-0'>{headerActions}</div>
            ) : null}
          </div>
        )}
        <div
          className={cn('w-[calc(100%-64px)] h-px bg-stroke-soft-200 mx-8', borderDivClassName)}
        />

        <div
          className={cn(
            'flex w-full min-h-0 flex-1 flex-col overflow-y-auto',
            contentAreaClassName,
          )}
        >
          {children}
        </div>
      </div>

      {showAiChatSidebar ? <DevxAiChatSidebar /> : null}
    </div>
  );
};

export default PageLayout;
