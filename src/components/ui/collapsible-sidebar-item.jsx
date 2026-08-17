import React from 'react';
import { RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';
import * as Tooltip from '@/components/ui/tooltip';
import NavItem from './nav-item';

const CollapsibleSidebarItem = ({
  label,
  icon,
  children = [],
  collapsed,
  handleCollapse,
  isDrawerOpen,
  handleNavigate,
  isPathActive,
  tooltipContent,
  parentPath,
}) => {
  // When sidebar is collapsed, show parent as single NavItem that navigates to parent path
  const isParentActive =
    (parentPath && isPathActive(parentPath)) ||
    children.some((c) => c.path && isPathActive(c.path));

  const handleParentClick = () => {
    if (parentPath) handleNavigate(parentPath);
    if (collapsed) handleCollapse(); // expand dropdown when clicking parent
  };

  if (!isDrawerOpen) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className='w-full'>
            <NavItem
              isOpen={false}
              isActive={parentPath ? isPathActive(parentPath) : false}
              onClick={() => parentPath && handleNavigate(parentPath)}
              leftIcon={icon}
            >
              {label}
            </NavItem>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>{tooltipContent || label}</Tooltip.Content>
      </Tooltip.Root>
    );
  }

  return (
    <div className='w-full'>
      <div
        className={`w-full hover:cursor-pointer flex items-center justify-between p-2 rounded-lg px-3 ${
          isParentActive ? 'bg-bg-weak-100' : 'hover:bg-bg-weak-100'
        }`}
      >
        <div
          onClick={handleParentClick}
          className='flex flex-1 relative items-center gap-2 min-w-0'
        >
          {parentPath && isPathActive(parentPath) && (
            <div
              className='absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary-base'
              aria-hidden='true'
            />
          )}

          {icon}

          <span className={isParentActive ? 'text-primary-base' : 'text-text-sub-500'}>
            {label}
          </span>
        </div>

        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            handleCollapse();
          }}
          className='shrink-0 rounded hover:bg-bg-weak-100 text-text-sub-500 hover:text-primary-base'
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <RiArrowRightSLine className='text-primary-base' size={16} />
          ) : (
            <RiArrowDownSLine className='text-primary-base' size={16} />
          )}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all pt-1 gap-3 duration-400 ease-in-out
        ${collapsed ? 'max-h-0 opacity-0' : 'max-h-auto opacity-100'}
        `}
      >
        {children.map((item) => {
          const isActive = item.path ? isPathActive(item.path) : false;
          const itemKey = item.key ?? item.label;
          return (
            <div
              key={itemKey}
              onClick={() => item.path && handleNavigate(item.path)}
              className={`
                flex pl-7 p-2 relative hover:cursor-pointer rounded-lg label-small items-center
                ${isActive ? 'text-primary-base ' : 'text-text-sub-500'}
                ${!item.path ? 'cursor-default opacity-70' : ''}
              `}
            >
              {isActive && (
                <div
                  className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary-base'
                  aria-hidden='true'
                />
              )}
              {item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CollapsibleSidebarItem;
