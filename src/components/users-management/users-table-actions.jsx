import React from 'react';
import { useDispatch } from 'react-redux';
import { RiPencilLine, RiDeleteBinLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import { setEditUserModalOpen, setRemoveUserModalOpen } from '@/redux/profileSlice';

export const ActionCell = ({ row }) => {
  const dispatch = useDispatch();

  return (
    <div className='flex items-center gap-1'>
      <Button.Root
        variant='neutral'
        mode='ghost'
        size='xsmall'
        onClick={() => dispatch(setEditUserModalOpen(row.original))}
        className='hover:bg-bg-weak-100'
      >
        <Button.Icon as={RiPencilLine} />
      </Button.Root>
      <Button.Root
        variant='neutral'
        mode='ghost'
        size='xsmall'
        onClick={() => dispatch(setRemoveUserModalOpen(row.original))}
        className='hover:bg-bg-weak-100'
      >
        <Button.Icon as={RiDeleteBinLine} />
      </Button.Root>
    </div>
  );
};
