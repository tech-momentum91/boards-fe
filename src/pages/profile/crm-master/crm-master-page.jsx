import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  RiAccountCircleLine,
  RiArrowRightSLine,
  RiFileList2Line,
  RiPriceTag3Line,
  RiUserSettingsLine,
} from 'react-icons/ri';

import { cn } from '@/utils/cn';
import { hasModulePermission } from '@/utils/user-role-utils';
import CrmTaskMaster from '@/pages/profile/crm-task-master';
import CrmSetup from '@/pages/profile/crm-setup';
import CrmStatusMaster from '@/pages/profile/crm-status-master';
import CpTaskMaster from '@/pages/profile/cp-task-master';

const CRM_MASTER_ROOT = '/settings/crm';

const CRM_MASTER_CARDS = [
  {
    id: 'tasks',
    path: `${CRM_MASTER_ROOT}/tasks`,
    title: 'CRM Tasks Master',
    description: 'Create and manage CRM task templates',
    icon: RiAccountCircleLine,
    permissionValues: ['tasks'],
  },
  {
    id: 'setup',
    path: `${CRM_MASTER_ROOT}/setup`,
    title: 'CRM Setup',
    description: 'Configure CRM drop reasons and lead settings',
    icon: RiUserSettingsLine,
    permissionValues: ['setup'],
  },
  {
    id: 'pipeline',
    path: `${CRM_MASTER_ROOT}/pipeline`,
    title: 'Pipeline',
    description: 'Create and manage CRM pipeline stages and statuses',
    icon: RiPriceTag3Line,
    permissionValues: ['pipeline'],
  },
  {
    id: 'cp-tasks',
    path: `${CRM_MASTER_ROOT}/cp-tasks`,
    title: 'CP Tasks Master',
    description: 'Create and manage channel partner tasks',
    icon: RiFileList2Line,
    permissionValues: ['cp-tasks'],
  },
];

function SettingsCard({ title, description, icon: Icon, onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='group flex min-h-[74px] w-full items-center justify-between rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-[17px] text-left transition hover:border-primary-base hover:shadow-regular-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-base'
    >
      <span className='flex min-w-0 items-center gap-4'>
        <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-weak-50 text-text-sub-500 group-hover:text-primary-base'>
          <Icon className='size-6' />
        </span>
        <span className='flex min-w-0 flex-col gap-1'>
          <span className='text-label-sm text-text-strong-950'>{title}</span>
          <span className='text-paragraph-xs text-text-sub-500'>{description}</span>
        </span>
      </span>
      <RiArrowRightSLine className='size-5 shrink-0 text-text-soft-400 group-hover:text-primary-base' />
    </button>
  );
}

function CrmMasterBreadcrumb({ sectionLabel, onBackClick }) {
  return (
    <div className='mb-5 flex items-center gap-2 border-b border-stroke-soft-200 pb-2'>
      <button type='button' onClick={onBackClick} className='text-label-sm text-text-sub-500'>
        CRM
      </button>
      <RiArrowRightSLine className='size-4 text-text-sub-500' />
      <span className='text-label-sm text-text-strong-950'>{sectionLabel}</span>
    </div>
  );
}

function CrmMasterLanding({ cards, onNavigate }) {
  return (
    <section className='flex w-full flex-col gap-5'>
      <div className='flex flex-col gap-1.5'>
        <h1 className='text-title-h6 text-text-strong-950'>CRM</h1>
        <p className='text-paragraph-sm text-text-sub-500'>
          Configure CRM tasks, setup, and channel partner workflows.
        </p>
      </div>

      <div className='grid w-full grid-cols-1 gap-4 lg:grid-cols-2'>
        {cards.map((card) => (
          <SettingsCard
            key={card.id}
            title={card.title}
            description={card.description}
            icon={card.icon}
            onClick={() => onNavigate(card.path)}
          />
        ))}
      </div>
    </section>
  );
}

function useCrmMasterPermissionMap() {
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);

  return useMemo(() => {
    const hasCrmStatusMasterPermission =
      hasModulePermission(userSideBarPerm, 'CRM Status Master', 'read') ||
      hasModulePermission(userSideBarPerm, 'CRM Status Master', 'write');
    const hasCrmTaskMasterPermission =
      hasModulePermission(userSideBarPerm, 'Lead CRM Task Master', 'read') ||
      hasModulePermission(userSideBarPerm, 'Lead CRM Task Master', 'write');

    return {
      tasks: hasCrmTaskMasterPermission,
      setup: hasCrmStatusMasterPermission,
      pipeline: hasCrmStatusMasterPermission,
      'cp-tasks': hasCrmTaskMasterPermission,
    };
  }, [userSideBarPerm]);
}

export default function CrmMasterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const permissionMap = useCrmMasterPermissionMap();

  const visibleCards = useMemo(
    () =>
      CRM_MASTER_CARDS.filter((card) =>
        card.permissionValues.some((value) => permissionMap[value]),
      ),
    [permissionMap],
  );

  const handleBackClick = () => navigate(CRM_MASTER_ROOT);

  const isTasksRoute = location.pathname.startsWith(`${CRM_MASTER_ROOT}/tasks`);
  const isSetupRoute = location.pathname.startsWith(`${CRM_MASTER_ROOT}/setup`);
  const isPipelineRoute = location.pathname.startsWith(`${CRM_MASTER_ROOT}/pipeline`);
  const isCpTasksRoute = location.pathname.startsWith(`${CRM_MASTER_ROOT}/cp-tasks`);
  const isSubRoute = isTasksRoute || isSetupRoute || isPipelineRoute || isCpTasksRoute;

  return (
    <div
      className={cn('flex w-full flex-col', isSubRoute ? 'justify-center pb-7' : 'justify-center')}
    >
      {isTasksRoute ? (
        <>
          <CrmMasterBreadcrumb sectionLabel='CRM Tasks Master' onBackClick={handleBackClick} />
          <CrmTaskMaster />
        </>
      ) : isSetupRoute ? (
        <>
          <CrmMasterBreadcrumb sectionLabel='CRM Setup' onBackClick={handleBackClick} />
          <CrmSetup />
        </>
      ) : isPipelineRoute ? (
        <>
          <CrmMasterBreadcrumb sectionLabel='Pipeline' onBackClick={handleBackClick} />
          <CrmStatusMaster />
        </>
      ) : isCpTasksRoute ? (
        <>
          <CrmMasterBreadcrumb sectionLabel='CP Tasks Master' onBackClick={handleBackClick} />
          <CpTaskMaster />
        </>
      ) : (
        <CrmMasterLanding cards={visibleCards} onNavigate={navigate} />
      )}
    </div>
  );
}
