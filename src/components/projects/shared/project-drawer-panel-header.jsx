import React from 'react';

export default function ProjectDrawerPanelHeader({ icon: Icon, label }) {
  return (
    <div className='flex shrink-0 items-center gap-2 border-b border-stroke-soft-200 px-6 py-4'>
      <Icon size={18} className='text-text-sub-500' />
      <span className='label-small text-text-sub-600'>{label}</span>
    </div>
  );
}
