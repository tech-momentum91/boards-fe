import React from 'react';
import * as Icons from 'lucide-react';
import AIActionItem from './AIActionItem';

export default function AIActionSection({ sectionData, centerId, onCloseModal }) {
  const IconComponent =
    sectionData.icon && Icons[sectionData.icon] ? Icons[sectionData.icon] : Icons.Box;

  // Determine top border color (teal, red, orange, yellow)
  const borderColor = sectionData.border_color || 'teal';
  const borderClass =
    {
      teal: 'border-t-teal-500',
      red: 'border-t-error-base',
      orange: 'border-t-warning-base',
      yellow: 'border-t-yellow-400',
    }[borderColor] || 'border-t-teal-500';

  if (!sectionData.actions || sectionData.actions.length === 0) {
    return null;
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 border-t-4 ${borderClass} overflow-hidden`}
    >
      {/* Header */}
      <div className='px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-700'>
            <IconComponent size={20} strokeWidth={2.5} />
          </div>
          <h3 className='text-lg font-semibold text-slate-800 tracking-tight'>
            {sectionData.title || 'Action Section'}
          </h3>
        </div>
      </div>

      {/* Action Items List */}
      <div className='p-5 bg-slate-50/30'>
        {sectionData.actions.map((action, index) => (
          <AIActionItem
            key={action.id || index}
            action={action}
            centerId={centerId}
            onCloseModal={onCloseModal}
          />
        ))}
      </div>
    </div>
  );
}
