import React, { memo } from 'react';

function KnowledgeCenterQaCard({ row, onOpen }) {
  const answerText =
    typeof row.answer === 'string' ? row.answer.trim() : String(row.answer ?? '').trim();
  return (
    <button
      type='button'
      onClick={() => onOpen(row)}
      className='min-h-[112px] rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3 text-left hover:bg-bg-weak-50 transition-colors flex flex-col gap-1.5 overflow-hidden'
    >
      <p className='label-small text-text-main-900 line-clamp-2 shrink-0 wrap-break-word'>
        {row.question || row.name}
      </p>
      {answerText ? (
        <p className='paragraph-xsmall text-text-sub-500 line-clamp-3 min-h-0 shrink wrap-break-word'>
          {answerText}
        </p>
      ) : (
        <p className='paragraph-xsmall text-text-soft-400 line-clamp-1'>No answer yet</p>
      )}
      <div className='flex items-center gap-1 flex-wrap mt-auto pt-0.5 min-w-0'>
        <div className='flex items-center gap-1 min-w-0 overflow-hidden'>
          <span className='paragraph-xsmall text-text-sub-500 truncate capitalize'>
            {[row.center_name, row.city, row.client].filter(Boolean).join(' • ')}
          </span>
        </div>
      </div>
    </button>
  );
}

export default memo(KnowledgeCenterQaCard);
