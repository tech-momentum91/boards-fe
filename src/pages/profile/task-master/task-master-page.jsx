import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  RiAccountCircleLine,
  RiArrowRightSLine,
  RiBuildingLine,
  RiFileList2Line,
  RiShakeHandsLine,
  RiUserReceivedLine,
  RiUserSharedLine,
} from 'react-icons/ri';

import { cn } from '@/utils/cn';
import { hasModulePermission } from '@/utils/user-role-utils';
import ClientTaskMaster from '@/pages/profile/client-task-master';
import CrmTaskMaster from '@/pages/profile/crm-task-master';
import CpTaskMaster from '@/pages/profile/cp-task-master';
import VendorOnboarding from '@/pages/profile/vendor-onboarding';
import PartnerMaster from '@/pages/profile/partner-master';
import CenterMaster from '@/pages/profile/center-master';

const TASK_MASTER_ROOT = '/settings/task-master';

const TASK_MASTER_CARDS = [
  {
    id: 'client',
    path: `${TASK_MASTER_ROOT}/client`,
    title: 'Client Task Master',
    description: 'Create and manage task statuses',
    icon: RiUserSharedLine,
    permissionValues: ['client'],
  },
  {
    id: 'crm',
    path: `${TASK_MASTER_ROOT}/crm`,
    title: 'CRM Tasks Master',
    description: 'Create and manage CRM statuses',
    icon: RiAccountCircleLine,
    permissionValues: ['crm'],
  },
  {
    id: 'cp',
    path: `${TASK_MASTER_ROOT}/cp`,
    title: 'CP Tasks Master',
    description: 'Create and manage operations statuses',
    icon: RiFileList2Line,
    permissionValues: ['cp'],
  },
  {
    id: 'vendor',
    path: `${TASK_MASTER_ROOT}/vendor`,
    title: 'Vendor Onboarding',
    description: 'Create and manage vendor onboarding tasks',
    icon: RiUserReceivedLine,
    permissionValues: ['vendor'],
  },
  {
    id: 'partner',
    path: `${TASK_MASTER_ROOT}/partner`,
    title: 'Partner Tasks Master',
    description: 'Create and manage booking statuses',
    icon: RiShakeHandsLine,
    permissionValues: ['partner'],
  },
  {
    id: 'center',
    path: `${TASK_MASTER_ROOT}/center`,
    title: 'Center Tasks Master',
    description: 'Create and manage agreement statuses',
    icon: RiBuildingLine,
    permissionValues: ['center'],
  },
];

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

function TaskMasterBreadcrumb({ sectionLabel, onBackClick }) {
  return (
    <div className='mb-5 flex items-center gap-2 border-b border-stroke-soft-200 pb-2'>
      <button type='button' onClick={onBackClick} className='text-label-sm text-text-sub-500'>
        Task Master
      </button>
      <RiArrowRightSLine className='size-4 text-text-sub-500' />
      <span className='text-label-sm text-text-strong-950'>{sectionLabel}</span>
    </div>
  );
}

function TaskMasterLanding({ cards, onNavigate }) {
  return (
    <section className='flex w-full flex-col gap-5'>
      <div className='flex flex-col gap-1.5'>
        <h1 className='text-title-h6 text-text-strong-950'>Task Master</h1>
        <p className='text-paragraph-sm text-text-sub-500'>
          Configure all system level task from here.
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

function useTaskMasterPermissionMap() {
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);

  return useMemo(() => {
    const hasCrmTaskWritePermission = hasModulePermission(userSideBarPerm, 'Task Master', 'write');
    const hasCrmTaskMasterPermission =
      hasModulePermission(userSideBarPerm, 'Lead CRM Task Master', 'read') ||
      hasModulePermission(userSideBarPerm, 'Lead CRM Task Master', 'write');

    return {
      client: hasCrmTaskWritePermission,
      crm: hasCrmTaskMasterPermission,
      cp: hasCrmTaskMasterPermission,
      vendor: true,
      partner: hasCrmTaskWritePermission,
      center: hasCrmTaskWritePermission,
    };
  }, [userSideBarPerm]);
}

export default function TaskMasterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const permissionMap = useTaskMasterPermissionMap();

  const visibleCards = useMemo(
    () =>
      TASK_MASTER_CARDS.filter((card) =>
        card.permissionValues.some((value) => permissionMap[value]),
      ),
    [permissionMap],
  );

  const handleBackClick = () => navigate(TASK_MASTER_ROOT);

  const isClientRoute = location.pathname.startsWith(`${TASK_MASTER_ROOT}/client`);
  const isCrmRoute = location.pathname.startsWith(`${TASK_MASTER_ROOT}/crm`);
  const isCpRoute = location.pathname.startsWith(`${TASK_MASTER_ROOT}/cp`);
  const isVendorRoute = location.pathname.startsWith(`${TASK_MASTER_ROOT}/vendor`);
  const isPartnerRoute = location.pathname.startsWith(`${TASK_MASTER_ROOT}/partner`);
  const isCenterRoute = location.pathname.startsWith(`${TASK_MASTER_ROOT}/center`);
  const isSubRoute =
    isClientRoute || isCrmRoute || isCpRoute || isVendorRoute || isPartnerRoute || isCenterRoute;

  return (
    <div
      className={cn('flex w-full flex-col', isSubRoute ? 'justify-center pb-7' : 'justify-center')}
    >
      {isClientRoute ? (
        <>
          <TaskMasterBreadcrumb sectionLabel='Client' onBackClick={handleBackClick} />
          <ClientTaskMaster />
        </>
      ) : isCrmRoute ? (
        <>
          <TaskMasterBreadcrumb sectionLabel='CRM' onBackClick={handleBackClick} />
          <CrmTaskMaster />
        </>
      ) : isCpRoute ? (
        <>
          <TaskMasterBreadcrumb sectionLabel='CP' onBackClick={handleBackClick} />
          <CpTaskMaster />
        </>
      ) : isVendorRoute ? (
        <>
          <TaskMasterBreadcrumb sectionLabel='Vendor Onboarding' onBackClick={handleBackClick} />
          <VendorOnboarding />
        </>
      ) : isPartnerRoute ? (
        <>
          <TaskMasterBreadcrumb sectionLabel='Partner' onBackClick={handleBackClick} />
          <PartnerMaster />
        </>
      ) : isCenterRoute ? (
        <>
          <TaskMasterBreadcrumb sectionLabel='Center' onBackClick={handleBackClick} />
          <CenterMaster />
        </>
      ) : (
        <TaskMasterLanding cards={visibleCards} onNavigate={navigate} />
      )}
    </div>
  );
}
