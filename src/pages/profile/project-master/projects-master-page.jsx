import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  RiArrowRightSLine,
  RiBriefcaseLine,
  RiFileList3Line,
  RiFileTextLine,
  RiHotelBedLine,
  RiLayout6Line,
  RiShoppingCartLine,
  RiTaskLine,
} from 'react-icons/ri';
import { cn } from '@/utils/cn';
import ProjectDocumentsMaster from './project-documents-master';
import ProjectLayoutsMaster from './project-layouts-master';
import ProjectOrderSelectionMaster from './project-order-selection-master';
import ProjectPoScopeTermsMaster from './project-po-scope-terms-master';
import ProjectTasksMaster from './project-tasks-master';

function SettingsCard({ title, description, icon: Icon, onClick, disabled = false }) {
  return (
    <button
      type='button'
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'group flex min-h-[74px] w-full items-center justify-between rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-[17px] text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-base',
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'hover:border-primary-base hover:shadow-regular-xs',
      )}
    >
      <span className='flex min-w-0 items-center gap-4'>
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-weak-50 text-text-sub-500',
            !disabled && 'group-hover:text-primary-base',
          )}
        >
          <Icon className='size-6' />
        </span>
        <span className='flex min-w-0 flex-col gap-1'>
          <span className='text-label-sm text-text-strong-950'>{title}</span>
          <span className='text-paragraph-xs text-text-sub-500'>{description}</span>
        </span>
      </span>
      <RiArrowRightSLine
        className={cn(
          'size-5 shrink-0 text-text-soft-400',
          !disabled && 'group-hover:text-primary-base',
        )}
      />
    </button>
  );
}

function ProjectsLanding() {
  const navigate = useNavigate();

  return (
    <section className='flex w-full flex-col gap-5'>
      <div className='flex flex-col gap-1.5'>
        <h1 className='text-title-h6 text-text-strong-950'>Projects Master</h1>
        <p className='text-paragraph-sm text-text-sub-500'>
          Manage all projects configurations in one place
        </p>
      </div>

      <div className='grid w-full grid-cols-1 gap-4 lg:grid-cols-2'>
        <SettingsCard
          title='Projects'
          description='Stages, layout statuses, and per-tab task statuses.'
          icon={RiBriefcaseLine}
          onClick={() => navigate('/settings/status-master/projects')}
        />
        <SettingsCard
          title='Tasks'
          description='Create and manage project tasks.'
          icon={RiTaskLine}
          onClick={() => navigate('/settings/projects-master/tasks')}
        />
        <SettingsCard
          title='Layouts'
          description='Create and manage project layouts.'
          icon={RiLayout6Line}
          onClick={() => navigate('/settings/projects-master/layouts')}
        />
        <SettingsCard
          title='Documentation'
          description='Create and manage project documents and statuses.'
          icon={RiFileTextLine}
          onClick={() => navigate('/settings/projects-master/documents')}
        />
        <SettingsCard
          title='PO Scope & Terms'
          description='Create and manage purchase order scope order & terms.'
          icon={RiFileList3Line}
          onClick={() => navigate('/settings/projects-master/po-scope-terms')}
        />
        <SettingsCard
          title='Interior Product Category'
          description='Create and manage interior product category and sub category.'
          icon={RiHotelBedLine}
          disabled
        />
        <SettingsCard
          title='Order & Selection'
          description='Create and manage order category and item selection master.'
          icon={RiShoppingCartLine}
          onClick={() => navigate('/settings/projects-master/order-selection')}
        />
      </div>
    </section>
  );
}

export default function ProjectsMasterPage() {
  const location = useLocation();
  const isTasksRoute = location.pathname.startsWith('/settings/projects-master/tasks');
  const isLayoutsRoute = location.pathname.startsWith('/settings/projects-master/layouts');
  const isDocumentsRoute = location.pathname.startsWith('/settings/projects-master/documents');
  const isOrderSelectionRoute = location.pathname.startsWith(
    '/settings/projects-master/order-selection',
  );
  const isPoScopeTermsRoute = location.pathname.startsWith(
    '/settings/projects-master/po-scope-terms',
  );

  const navigate = useNavigate();
  const handleProjectsMasterClick = () => {
    navigate('/settings/projects-master');
  };
  return (
    <div
      className={cn(
        'flex w-full',
        isPoScopeTermsRoute
          ? 'h-full min-h-0 flex-1 self-stretch'
          : isTasksRoute || isLayoutsRoute || isDocumentsRoute || isOrderSelectionRoute
            ? 'justify-center pb-7'
            : 'justify-center',
      )}
    >
      {isTasksRoute ? (
        <ProjectTasksMaster onTasksClick={handleProjectsMasterClick} />
      ) : isLayoutsRoute ? (
        <ProjectLayoutsMaster onLayoutsClick={handleProjectsMasterClick} />
      ) : isDocumentsRoute ? (
        <ProjectDocumentsMaster onDocumentsClick={handleProjectsMasterClick} />
      ) : isOrderSelectionRoute ? (
        <ProjectOrderSelectionMaster onOrderSelectionClick={handleProjectsMasterClick} />
      ) : isPoScopeTermsRoute ? (
        <ProjectPoScopeTermsMaster onBackClick={handleProjectsMasterClick} />
      ) : (
        <ProjectsLanding />
      )}
    </div>
  );
}
