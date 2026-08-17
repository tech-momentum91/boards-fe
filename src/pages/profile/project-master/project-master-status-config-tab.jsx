import React from 'react';
import { useSelector } from 'react-redux';
import { StatusModuleFieldConfigurator } from '@/pages/profile/dynamic-status-master-page';
import { useStatusModules } from '@/hooks/use-status-modules';
import {
  PROJECTS_STATUS_MODULE_ID,
  PROJECT_MASTER_STATUS_LABELS,
} from '@/pages/profile/project-master/project-master-status-config';
import { isSuperAdminRole } from '@/utils/user-role-utils';

export default function ProjectMasterStatusConfigTab({ fieldKey, configKey = 'tasks' }) {
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canManage = isSuperAdminRole(userSideBarPerm);
  const { modules, isLoading } = useStatusModules({ enabled: canManage });
  const projectsModule = modules.find((module) => module.id === PROJECTS_STATUS_MODULE_ID);
  const labels = PROJECT_MASTER_STATUS_LABELS[configKey] || {};

  if (!canManage) {
    return (
      <p className='text-paragraph-sm text-text-sub-600 py-8 text-center'>
        Only Super Admin can manage Status Master.
      </p>
    );
  }

  if (isLoading) {
    return (
      <p className='text-paragraph-sm text-text-sub-600 py-8 text-center'>
        Loading status configuration…
      </p>
    );
  }

  if (!projectsModule || !fieldKey) {
    return (
      <p className='text-paragraph-sm text-text-sub-600 py-8 text-center'>
        Status configuration is unavailable.
      </p>
    );
  }

  return (
    <div className='flex w-full flex-col gap-4'>
      {labels.title ? (
        <div className='flex w-full items-start gap-3'>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <p className='text-label-sm text-text-strong-950'>{labels.title}</p>
            {labels.subtitle ? (
              <p className='text-paragraph-xs text-text-sub-500'>{labels.subtitle}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <StatusModuleFieldConfigurator
        module={projectsModule}
        modules={modules}
        initialFieldKey={fieldKey}
        singleFieldMode
        embedded
      />
    </div>
  );
}
