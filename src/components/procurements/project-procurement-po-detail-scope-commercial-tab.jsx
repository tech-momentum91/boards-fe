import React, { useState } from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';

import { cn } from '@/utils/cn';

function ScopeTermRow({ term, expanded, onToggle }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[10px] border border-stroke-soft-200 bg-[#fbfbfb]',
        'shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]',
      )}
    >
      <div className='flex h-11 items-center justify-between'>
        <button
          type='button'
          onClick={onToggle}
          className='flex h-full min-w-0 flex-1 items-center gap-2 py-3 pl-2.5 pr-5 text-left'
          aria-expanded={expanded}
        >
          <span className='flex size-5 shrink-0 items-center justify-center text-text-sub-500'>
            <RiArrowDownSLine
              className={cn('size-5 transition-transform', expanded ? '' : '-rotate-90')}
            />
          </span>
          <span className='truncate text-paragraph-sm font-medium text-text-sub-500'>
            {term.label}
          </span>
        </button>

        <div className='flex shrink-0 items-center justify-end p-3'>
          <div
            className={cn(
              'inline-flex max-w-full items-center gap-1.5 rounded-lg border border-stroke-soft-200',
              'bg-bg-white-0 py-1.5 pl-2 pr-1.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]',
            )}
          >
            <span className='truncate text-paragraph-sm tracking-[-0.084px] text-text-main-900'>
              {term.value}
            </span>
            <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-500' />
          </div>
        </div>
      </div>

      {expanded && term.description ? (
        <div className='border-t border-stroke-soft-200 px-3 py-3'>
          <p className='text-paragraph-sm tracking-[-0.084px] text-text-sub-500'>
            {term.description}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function ProjectProcurementPoDetailScopeCommercialTab({ terms = [] }) {
  const [expandedTerms, setExpandedTerms] = useState({});

  const toggleTerm = (termId) => {
    setExpandedTerms((current) => ({ ...current, [termId]: !current[termId] }));
  };

  return (
    <div className='flex flex-col gap-2 px-6 py-5'>
      {terms.map((term) => (
        <ScopeTermRow
          key={term.id}
          term={term}
          expanded={Boolean(expandedTerms[term.id])}
          onToggle={() => toggleTerm(term.id)}
        />
      ))}
    </div>
  );
}
