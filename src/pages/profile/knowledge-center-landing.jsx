import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiArrowRightSLine,
  RiFileTextLine,
  RiLiveLine,
  RiPhoneLine,
  RiQuestionLine,
} from 'react-icons/ri';

import {
  KNOWLEDGE_CENTER_CALL_RECORDINGS,
  KNOWLEDGE_CENTER_CASE_STUDIES,
  KNOWLEDGE_CENTER_MEDIA,
  KNOWLEDGE_CENTER_QA,
} from '@/pages/profile/knowledge-center-paths';
import { cn } from '@/utils/cn';

/** Landing hub cards — set `path` when the section route exists. */
const LANDING_CARDS = [
  {
    path: KNOWLEDGE_CENTER_QA,
    title: 'Q&A',
    description: 'Frequently asked questions and solutions',
    icon: RiQuestionLine,
  },
  {
    path: KNOWLEDGE_CENTER_CASE_STUDIES,
    title: 'Case Studies',
    description: 'Client success stories with challenge, solution, and outcomes',
    icon: RiFileTextLine,
  },
  {
    path: KNOWLEDGE_CENTER_CALL_RECORDINGS,
    title: 'Call Recordings',
    description: 'Upload and manage client call recordings',
    icon: RiPhoneLine,
  },
  {
    path: KNOWLEDGE_CENTER_MEDIA,
    title: 'Center Media',
    description: 'Photos, videos, layouts, and other center assets',
    icon: RiLiveLine,
  },
];

/**
 * Default Knowledge Center landing (`/settings/knowledge-center`).
 */
export default function KnowledgeCenterLanding() {
  const navigate = useNavigate();

  const handleCardNavigate = useCallback(
    (path) => {
      if (path) navigate(path);
    },
    [navigate],
  );

  return (
    <>
      <div className='w-full flex flex-col gap-2 mt-6'>
        <h2 className='text-title-xl text-text-main-900'>Knowledge Center</h2>
        <p className='paragraph-small text-text-sub-500'>
          Manage help articles, guides, and internal documentation
        </p>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        {LANDING_CARDS.map((card) => {
          const hasRoute = Boolean(card.path);
          return (
            <button
              key={card.path ?? card.title}
              type='button'
              disabled={!hasRoute}
              onClick={() => handleCardNavigate(card.path)}
              aria-label={hasRoute ? `Open ${card.title}` : `${card.title} (coming soon)`}
              className={cn(
                'h-[74px] rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-3 flex items-center justify-between text-left transition-colors',
                hasRoute ? 'hover:bg-bg-weak-50' : 'opacity-60 cursor-not-allowed',
              )}
            >
              <div className='flex items-center gap-4 min-w-0'>
                <div className='size-10 rounded-lg bg-bg-weak-50 flex items-center justify-center shrink-0'>
                  <card.icon className='size-6 text-text-sub-500' />
                </div>
                <div className='min-w-0'>
                  <p className='label-small text-text-main-900'>{card.title}</p>
                  <p className='paragraph-xsmall text-text-sub-500 truncate'>{card.description}</p>
                </div>
              </div>
              <RiArrowRightSLine className='size-4 text-text-soft-400 shrink-0' aria-hidden />
            </button>
          );
        })}
      </div>
    </>
  );
}
