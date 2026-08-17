import React from 'react';
import { RiArrowDownSLine, RiDeleteBin6Line } from 'react-icons/ri';
import ProjectPoScopePaymentMilestonesEditor from '@/pages/profile/project-master/project-po-scope-payment-milestones-editor';
import { cn } from '@/utils/cn';

function hasTemplateContent(content) {
  if (content == null) return false;
  const trimmed = String(content).trim();
  if (!trimmed) return false;
  // Ignore empty TipTap / editor shells
  return trimmed.replaceAll(/<[^>]*>/g, '').trim().length > 0;
}

export default function ProjectPoScopePaymentTermsTemplateRow({
  template,
  isExpanded,
  onToggle,
  onDelete,
  onUpdateMilestone,
  onAddMilestone,
  onDeleteMilestone,
}) {
  const milestones = template.milestones ?? [];
  const showDescription = hasTemplateContent(template.content);

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-10 border bg-bg-weak-50 transition-colors',
        isExpanded
          ? 'border-stroke-sub-300 shadow-regular-sm'
          : 'border-stroke-soft-200 shadow-regular-xs',
      )}
    >
      {/* Accordion header — Figma 34900:252350 */}
      <div
        className={cn(
          'flex items-center justify-between bg-bg-weak-50 pr-2.5',
          isExpanded && 'shadow-regular-xs',
        )}
      >
        <button
          type='button'
          onClick={() => onToggle(template.id)}
          aria-expanded={isExpanded}
          className='flex h-9 min-w-0 flex-1 items-center gap-2 overflow-hidden py-3 pl-2.5 pr-5 text-left'
        >
          <RiArrowDownSLine
            className={cn(
              'size-5 shrink-0 text-text-sub-500 transition-transform duration-200',
              !isExpanded && '-rotate-90',
            )}
          />
          <span className='min-w-0 flex-1 truncate text-label-sm text-text-sub-500'>
            {template.name || 'Untitled Template'}
          </span>
        </button>

        <button
          type='button'
          onClick={(event) => {
            event.stopPropagation();
            onDelete(template);
          }}
          aria-label={`Delete ${template.name || 'template'}`}
          className={cn(
            'shrink-0 text-text-soft-400 transition hover:text-red-base',
            isExpanded
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          )}
        >
          <RiDeleteBin6Line className='size-5' />
        </button>
      </div>

      {isExpanded ? (
        <div className='flex flex-col gap-4 bg-bg-white-0 p-4'>
          <ProjectPoScopePaymentMilestonesEditor
            milestones={milestones}
            variant='listing'
            onUpdateMilestone={(milestoneId, field, value) =>
              onUpdateMilestone(template.id, milestoneId, field, value)
            }
            onAddMilestone={() => onAddMilestone(template.id)}
            onDeleteMilestone={(milestoneId) => onDeleteMilestone(template.id, milestoneId)}
          />

          {showDescription ? (
            <div
              className='text-label-sm leading-5 text-text-sub-500 [&_p]:m-0'
              dangerouslySetInnerHTML={{ __html: template.content }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
