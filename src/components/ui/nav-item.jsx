import React from 'react';
import { cn } from '@/utils/cn';
import { RiArrowRightSLine } from 'react-icons/ri';

function NavItem({
  children,
  className,
  leftIcon,
  rightContent,
  isActive,
  onClick,
  isOpen = true,
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative hover:cursor-pointer w-full rounded-[8px] gap-3 py-[8px] h-full flex items-center',
        isOpen ? 'px-[12px] justify-between' : 'px-0 justify-center',
        isActive ? 'bg-bg-weak-100 text-text-main-900' : 'bg-transparent text-text-sub-500',
        className,
      )}
      title={isOpen ? undefined : children}
    >
      {isActive && (
        <div
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full',
            'bg-primary-base',
          )}
          aria-hidden='true'
        />
      )}
      <div className={cn('flex items-center', isOpen ? 'justify-start gap-2' : 'justify-center')}>
        {leftIcon && (
          <div
            className={` ${isActive ? 'text-[var(--color-primary-base)]' : 'text-[var(--color-text-sub-500)]'}`}
          >
            {leftIcon}
          </div>
        )}
        <div className='overflow-hidden text-ellipsis whitespace-nowrap'>{isOpen && children}</div>
      </div>
      {isOpen &&
        (rightContent == null
          ? isActive && (
              <div
                className={`${isActive ? 'text-[var(--color-primary-base)]' : 'text-[var(--color-text-sub-500)]'}`}
              />
            )
          : rightContent)}
    </div>
  );
}

export default NavItem;
