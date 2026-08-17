import React from 'react';
import { RiBuildingLine, RiGroupLine, RiRuler2Line } from 'react-icons/ri';

import { buildProjectDetailHeader } from '@/components/projects/list/project-helpers';
import * as Badge from '@/components/ui/badge';

export default function ProjectGlobalLayoutHeader({
  project = null,
  isLoading = false,
  membersAction = null,
  onViewMembers,
}) {
  const header = buildProjectDetailHeader(project);

  return (
    <div className='flex shrink-0 items-center justify-between border-b border-stroke-soft-200 px-6 py-5'>
      <div className='flex min-w-0 items-center gap-4'>
        <div className='flex min-w-0 flex-col gap-1'>
          <h1 className='truncate text-title-h7 text-text-main-900'>
            {isLoading ? 'Loading project…' : header.title}
          </h1>
          <div className='flex flex-wrap items-center gap-2 text-paragraph-sm text-text-sub-500'>
            <Badge.Root
              variant='light'
              color={header.stageColor}
              size='small'
              className='uppercase'
            >
              {isLoading ? '—' : header.stageBadge}
            </Badge.Root>
            <span className='text-text-soft-400'>•</span>
            <span className='inline-flex items-center gap-1'>
              <RiBuildingLine className='size-4 shrink-0' />
              {isLoading ? '—' : header.locationLabel}
            </span>
            <span className='text-text-soft-400'>•</span>
            <span className='inline-flex items-center gap-1'>
              <RiRuler2Line className='size-4 shrink-0' />
              {isLoading ? '—' : header.carpetArea}
            </span>
            <span className='text-text-soft-400'>•</span>
            <span className='inline-flex items-center gap-1'>
              <RiGroupLine className='size-4 shrink-0' />
              {isLoading ? '—' : header.membersLabel}
            </span>
            {membersAction ?? (
              <button
                type='button'
                className='text-label-sm text-primary-base underline disabled:opacity-50'
                disabled={isLoading || !project}
                onClick={() => onViewMembers?.()}
              >
                View All
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
