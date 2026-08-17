import React from 'react';
import * as Button from '@/components/ui/button';
import { RiPencilLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';

const EditableFieldWrapper = ({ children, editable = false, className, iconClassName }) => {
  if (!editable) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn('relative group/field', className)}>
      {children}
      <div className='absolute top-1/2 -translate-y-1/2 right-0 opacity-0 group-hover/field:opacity-100 transition-opacity duration-200 z-10 pointer-events-none'>
        <Button.Root
          variant='neutral'
          mode='ghost'
          size='small'
          className={cn('pointer-events-none', iconClassName)}
        >
          <Button.Icon as={RiPencilLine} />
        </Button.Root>
      </div>
    </div>
  );
};

export default EditableFieldWrapper;
