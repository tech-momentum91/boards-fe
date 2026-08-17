import React from 'react';
import { RiDeleteBinLine } from 'react-icons/ri';

function stopRowClick(event) {
  event.stopPropagation();
}

export default function ProjectMasterTableDeleteButton({ onClick, ariaLabel = 'Delete' }) {
  return (
    <div onClick={stopRowClick} className='flex justify-end'>
      <button
        type='button'
        className='flex size-8 items-center justify-center rounded-md text-text-soft-400 transition hover:bg-bg-weak-50 hover:text-red-base'
        onClick={onClick}
        aria-label={ariaLabel}
      >
        <RiDeleteBinLine className='size-4' />
      </button>
    </div>
  );
}
