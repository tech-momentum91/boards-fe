import React, { useEffect, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowUpSLine,
} from 'react-icons/ri';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { getProjectStageBadgeClass, getTaskCompletionBadgeClass } from './constants';

const CategorySection = ({ category, expanded, onToggle, onRemoveProject }) => {
  const projects = category.projects || [];

  return (
    <div className='border-b border-stroke-soft-200 last:border-b-0'>
      <button
        type='button'
        onClick={onToggle}
        className='flex w-full items-center gap-1 px-2.5 py-2 text-left'
      >
        <span className='min-w-0 truncate text-label-xs font-medium text-text-soft-400'>
          {category.label}
        </span>
        {expanded ? (
          <RiArrowUpSLine className='size-[18px] shrink-0 text-text-soft-400' />
        ) : (
          <RiArrowDownSLine className='size-[18px] shrink-0 text-text-soft-400' />
        )}
      </button>

      {expanded ? (
        <div className='flex flex-col gap-1.5 px-2.5 pb-3'>
          {projects.length === 0 ? (
            <p className='py-1 text-center text-label-xs text-text-soft-400'>No projects</p>
          ) : (
            projects.map((project) => (
              <PriorityProjectCard
                key={`${category.id}-${project.client}`}
                project={project}
                onRemove={() => onRemoveProject?.(project, category.id)}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

const PriorityProjectCard = ({ project, onRemove }) => {
  const [isHovered, setIsHovered] = useState(false);
  const completionPct = Number(project.completion_percentage) || 0;
  const stage = project.project_stage;

  return (
    <div
      className='group relative rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 shadow-[0px_1px_1px_rgba(228,229,231,0.24)]'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className='flex items-center justify-between gap-2'>
        <span className='min-w-0 truncate text-label-sm font-medium text-text-sub-500'>
          {project.client_name}
        </span>
        {stage ? (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-label-xs font-medium',
              getProjectStageBadgeClass(),
            )}
          >
            {stage}
          </span>
        ) : null}
      </div>

      <div className='mt-1.5 flex items-center gap-1.5'>
        <span
          className={cn(
            'shrink-0 rounded-full px-[5px] py-0.5 text-[11px] font-medium uppercase tracking-[0.22px]',
            getTaskCompletionBadgeClass(completionPct),
          )}
        >
          {Math.round(completionPct)}%
        </span>
        {project.meta_label ? (
          <span className='min-w-0 truncate text-label-xs text-text-soft-400'>
            · {project.meta_label}
          </span>
        ) : null}
      </div>

      {isHovered ? (
        <button
          type='button'
          onClick={onRemove}
          className='absolute inset-0 flex items-center justify-center rounded-lg bg-bg-white-0/90 text-label-xs font-medium text-[#AF1D38] transition'
        >
          Remove
        </button>
      ) : null}
    </div>
  );
};

const WeeklyPriorityPanel = ({
  categories = [],
  isLoading = false,
  onAdd,
  onRemoveProject,
  collapsed: collapsedProp,
  onCollapsedChange,
}) => {
  const [collapsedInternal, setCollapsedInternal] = useState(false);
  const collapsed = collapsedProp ?? collapsedInternal;
  const setCollapsed = onCollapsedChange || setCollapsedInternal;
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    setExpandedCategories((previous) => {
      const next = {};
      categories.forEach((category, index) => {
        next[category.id] = previous[category.id] ?? index === 0;
      });
      return next;
    });
  }, [categories]);

  if (collapsed) {
    return (
      <div className='flex h-full w-10 shrink-0 flex-col items-center rounded-tr-xl border-l border-stroke-soft-200 bg-bg-weak-100 py-3'>
        <CompactButton.Root
          type='button'
          variant='ghost'
          size='medium'
          className='size-7'
          aria-label="Expand This Week's Priority"
          onClick={() => setCollapsed(false)}
        >
          <CompactButton.Icon as={RiArrowLeftSLine} />
        </CompactButton.Root>
        <span
          className='mt-4 text-label-xs font-medium uppercase tracking-[1px] text-text-sub-500'
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          This Week&apos;s Priority
        </span>
      </div>
    );
  }

  return (
    <aside className='flex h-full w-[240px] shrink-0 flex-col rounded-tr-xl border-l border-t border-stroke-soft-200 bg-bg-weak-100'>
      <div className='flex items-center gap-1.5 border-b border-stroke-soft-200 px-2.5 py-3'>
        <CompactButton.Root
          type='button'
          variant='stroke'
          size='medium'
          className='size-7'
          aria-label="Collapse This Week's Priority"
          onClick={() => setCollapsed(true)}
        >
          <CompactButton.Icon as={RiArrowRightSLine} />
        </CompactButton.Root>
        <span className='text-label-xs font-medium uppercase tracking-[0.48px] text-text-soft-400'>
          This Week&apos;s Priority
        </span>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        {isLoading && categories.length === 0 ? (
          <p className='px-3 py-6 text-center text-label-xs text-text-soft-400'>Loading…</p>
        ) : null}
        {!isLoading && categories.length === 0 ? (
          <p className='px-3 py-6 text-center text-label-xs text-text-soft-400'>
            No priorities set
          </p>
        ) : null}
        {categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            expanded={Boolean(expandedCategories[category.id])}
            onToggle={() =>
              setExpandedCategories((previous) => ({
                ...previous,
                [category.id]: !previous[category.id],
              }))
            }
            onRemoveProject={onRemoveProject}
          />
        ))}
      </div>

      <div className='border-t border-stroke-soft-200 p-2.5'>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type='button'
              onClick={onAdd}
              className='flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-stroke-soft-200 bg-bg-white-0 px-1.5 py-1.5 text-label-sm font-medium text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] transition hover:bg-bg-weak-50'
            >
              <RiAddLine className='size-5 text-text-sub-500' />
              Add
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content variant='dark' size='xsmall'>
            Set Project Priority
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    </aside>
  );
};

export default WeeklyPriorityPanel;
