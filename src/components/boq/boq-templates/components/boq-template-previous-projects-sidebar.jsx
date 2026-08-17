import React from 'react';

import { formatBoqPreviousProjectItemCount } from '@/components/boq/boq-templates/components/boq-template-previous-projects-utils';
import { cn } from '@/utils/cn';

const MetadataDot = () => (
  <span className='size-1 shrink-0 rounded-full bg-text-sub-500' aria-hidden />
);

const ProjectMeta = ({ client, city, itemCount }) => (
  <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
    <span className='flex items-center gap-1.5 whitespace-nowrap text-paragraph-xs text-text-sub-500'>
      {client}
      <MetadataDot />
    </span>
    {city ? (
      <span className='whitespace-nowrap text-paragraph-xs text-text-sub-500'>{city}</span>
    ) : null}
    <span className='whitespace-nowrap text-paragraph-xs text-text-sub-500'>
      {formatBoqPreviousProjectItemCount(itemCount)}
    </span>
  </div>
);

const ProjectItem = ({ project, isActive, onSelect }) => (
  <button
    type='button'
    onClick={() => onSelect(project.id)}
    className={cn(
      'flex w-full flex-col gap-1 rounded-[10px] py-2 pl-3 pr-2 text-left transition-colors',
      isActive ? 'bg-bg-weak-100' : 'bg-bg-white-0 hover:bg-bg-weak-50',
    )}
    aria-current={isActive ? 'true' : undefined}
  >
    <span
      className={cn(
        'truncate text-label-sm font-medium',
        isActive ? 'text-text-main-900' : 'text-text-sub-500',
      )}
      title={project.name}
    >
      {project.name}
    </span>
    <ProjectMeta client={project.client} city={project.city} itemCount={project.itemCount} />
  </button>
);

const BoqTemplatePreviousProjectsSidebar = ({
  projects = [],
  selectedProjectId,
  onSelectProject,
  isLoading = false,
}) => {
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
      <div className='flex flex-col gap-1 px-3 pb-3'>
        <div className='flex h-6 shrink-0 items-center px-2'>
          <span className='text-[11px] font-medium uppercase tracking-[0.22px] text-text-soft-400'>
            all projects
          </span>
        </div>

        {isLoading ? (
          <p className='px-2 py-4 text-paragraph-xs text-text-sub-500'>Loading projects…</p>
        ) : projects.length === 0 ? (
          <p className='px-2 py-4 text-paragraph-xs text-text-sub-500'>No projects found.</p>
        ) : (
          <div className='flex flex-col gap-1.5'>
            {projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                isActive={selectedProjectId === project.id}
                onSelect={onSelectProject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoqTemplatePreviousProjectsSidebar;
