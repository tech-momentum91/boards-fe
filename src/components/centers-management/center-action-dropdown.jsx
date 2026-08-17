import React, { useState } from 'react';
import { RiMore2Fill, RiEyeLine, RiEditLine, RiDeleteBinLine } from 'react-icons/ri';
import * as Dropdown from '@/components/ui/dropdown';
import { cn } from '@/utils/cn';

const CenterActionDropdown = ({ center, onView, onEdit, onDelete, permissions = {} }) => {
  const [open, setOpen] = useState(false);

  const handleAction = (action, callback) => {
    setOpen(false);
    if (callback) {
      callback(center);
    }
  };

  const canEdit = permissions.canEdit !== false;
  const canDelete = permissions.canDelete !== false;

  return (
    <Dropdown.Root open={open} onOpenChange={setOpen}>
      <Dropdown.Trigger asChild>
        <button
          type='button'
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-full text-text-sub-500 transition-colors',
            'hover:bg-bg-weak-50 hover:text-text-strong-950',
            'focus:outline-none focus:ring-2 focus:ring-primary-base focus:ring-offset-2',
            'cursor-pointer',
            open && 'bg-bg-weak-50 text-text-strong-950',
          )}
          aria-label='Open center actions'
        >
          <RiMore2Fill className='size-5' />
        </button>
      </Dropdown.Trigger>

      <Dropdown.Content
        align='end'
        sideOffset={4}
        className='w-[200px]'
        onClick={(e) => e.stopPropagation()}
      >
        <Dropdown.Item
          onClick={() => handleAction('view', onView)}
          className={cn(
            'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 paragraph-small text-text-strong-950',
            'hover:bg-bg-weak-50 focus:bg-bg-weak-50 focus:outline-none',
          )}
        >
          <RiEyeLine className='size-4 text-text-sub-500' />
          <span>View Details</span>
        </Dropdown.Item>

        {canEdit && (
          <Dropdown.Item
            onClick={() => handleAction('edit', onEdit)}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 paragraph-small text-text-strong-950',
              'hover:bg-bg-weak-50 focus:bg-bg-weak-50 focus:outline-none',
            )}
          >
            <RiEditLine className='size-4 text-text-sub-500' />
            <span>Edit Center</span>
          </Dropdown.Item>
        )}

        {canDelete && (
          <>
            <div className=' h-px bg-stroke-soft-200' />
            <Dropdown.Item
              onClick={() => handleAction('delete', onDelete)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 paragraph-small text-error-base',
                'hover:bg-error-lighter focus:bg-error-lighter focus:outline-none',
              )}
            >
              <RiDeleteBinLine className='size-4' />
              <span>Delete</span>
            </Dropdown.Item>
          </>
        )}
      </Dropdown.Content>
    </Dropdown.Root>
  );
};

export default CenterActionDropdown;
