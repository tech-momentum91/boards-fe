import React, { memo, useMemo } from 'react';
import { RiAddLine, RiArrowDownSLine, RiInformationLine } from 'react-icons/ri';

import {
  getProjectBoqVersionStatusLabel,
  PROJECT_BOQ_VERSION_STATUS,
  PROJECT_BOQ_VERSION_STATUS_OPTIONS,
} from '@/components/boq/constants';
import { BOQ_ER_PROCUREMENT_BLOCKED_TOOLTIP } from '@/components/boq/shared/boq-er-utils';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Dropdown from '@/components/ui/dropdown';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const VERSION_STATUS_DOT_COLORS = {
  [PROJECT_BOQ_VERSION_STATUS.DRAFT]: 'bg-[#868c98]',
  [PROJECT_BOQ_VERSION_STATUS.INTERNAL_REVIEW]: 'bg-[#375dfb]',
  [PROJECT_BOQ_VERSION_STATUS.SEND_TO_CLIENT]: 'bg-[#f17b2c]',
  [PROJECT_BOQ_VERSION_STATUS.CLIENT_APPROVED]: 'bg-[#1daf61]',
  [PROJECT_BOQ_VERSION_STATUS.REVISION_REQUIRED]: 'bg-[#df1c41]',
  [PROJECT_BOQ_VERSION_STATUS.INITIATE_TO_PROCUREMENT]: 'bg-[#525866]',
  [PROJECT_BOQ_VERSION_STATUS.LOCKED]: 'bg-[#525866]',
};

const VersionStatusDot = ({ status }) => (
  <span className='flex size-5 shrink-0 items-center justify-center' aria-hidden>
    <span
      className={cn(
        'size-2 rounded-full',
        VERSION_STATUS_DOT_COLORS[status] ??
          VERSION_STATUS_DOT_COLORS[PROJECT_BOQ_VERSION_STATUS.DRAFT],
      )}
    />
  </span>
);

const ProcurementStatusBlockedHint = () => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <span
        role='img'
        aria-label={BOQ_ER_PROCUREMENT_BLOCKED_TOOLTIP}
        className='ml-auto inline-flex size-5 shrink-0 items-center justify-center text-text-soft-400'
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <RiInformationLine className='size-4' aria-hidden />
      </span>
    </Tooltip.Trigger>
    <Tooltip.Content size='xsmall' variant='dark' side='bottom' className='z-[80] max-w-[220px]'>
      {BOQ_ER_PROCUREMENT_BLOCKED_TOOLTIP}
    </Tooltip.Content>
  </Tooltip.Root>
);

const ProjectBoqVersionStatusGroup = memo(
  ({
    versions = [],
    version,
    onVersionChange,
    versionStatus,
    onVersionStatusChange,
    isVersionLocked = false,
    isStatusLocked = isVersionLocked,
    isStatusChangeDisabled = false,
    isProcurementStatusBlocked = false,
    isViewingCurrentVersion = true,
    onCreateVersion,
    isCreatingVersion = false,
  }) => {
    const selectedVersion = useMemo(
      () => versions.find((item) => item.id === version) ?? versions[0] ?? null,
      [version, versions],
    );
    const statusLabel = useMemo(
      () => getProjectBoqVersionStatusLabel(versionStatus),
      [versionStatus],
    );
    const canChangeStatus = !isStatusChangeDisabled && !isStatusLocked;
    const showCreateVersion = Boolean(onCreateVersion);
    const isCreateVersionDisabled =
      isVersionLocked || isCreatingVersion || !isViewingCurrentVersion;

    return (
      <ButtonGroup.Root
        size='xsmall'
        className='shrink-0 overflow-hidden rounded-lg shadow-regular-sm'
      >
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <ButtonGroup.Item
              asChild
              className='h-8 gap-1.5 pl-4 pr-2 font-medium text-text-sub-500 hover:text-text-sub-500'
            >
              <button type='button'>
                <span className='text-label-sm'>
                  {selectedVersion?.triggerLabel ?? 'Current version'}
                </span>
                <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
              </button>
            </ButtonGroup.Item>
          </Dropdown.Trigger>

          <Dropdown.Content align='end' className='w-[300px] gap-1 p-2'>
            <p className='px-2 py-1 text-subheading-2xs uppercase tracking-[0.22px] text-text-soft-400'>
              Versions
            </p>

            <div className='flex flex-col gap-1 pb-2'>
              {versions.length === 0 ? (
                <p className='px-2 py-1 text-paragraph-xs text-text-soft-400'>No versions found</p>
              ) : (
                versions.map((versionOption) => {
                  const isSelected = versionOption.id === version;
                  return (
                    <Dropdown.Item
                      key={versionOption.id}
                      className={cn(
                        'flex items-center gap-2 rounded-lg p-1.5',
                        isSelected ? 'bg-bg-weak-100' : 'bg-transparent',
                      )}
                      onSelect={() => onVersionChange?.(versionOption.id)}
                    >
                      <div className='flex min-w-0 flex-1 items-center gap-1'>
                        <span className='text-paragraph-sm text-text-main-900'>
                          {versionOption.label}
                        </span>
                        {versionOption.liveBadge ? (
                          <span className='text-[10px] leading-[18px] text-text-main-900'>
                            {versionOption.liveBadge}
                          </span>
                        ) : versionOption.date ? (
                          <span className='text-[10px] leading-[18px] text-text-main-900'>
                            {versionOption.date}
                          </span>
                        ) : null}
                      </div>
                      <span className='shrink-0 text-paragraph-xs text-text-sub-500'>
                        {getProjectBoqVersionStatusLabel(versionOption.status)}
                      </span>
                    </Dropdown.Item>
                  );
                })
              )}
            </div>

            {showCreateVersion ? (
              <>
                <Dropdown.Separator className='mx-0 my-1' />
                <Dropdown.Item
                  className='flex items-center gap-2 rounded-lg p-1.5'
                  disabled={isCreateVersionDisabled}
                  onSelect={(event) => {
                    if (isCreateVersionDisabled) {
                      event.preventDefault();
                      return;
                    }
                    onCreateVersion?.();
                  }}
                >
                  <RiAddLine className='size-4 shrink-0 text-text-sub-500' aria-hidden />
                  <span className='text-paragraph-sm font-medium text-text-main-900'>
                    Create new version
                  </span>
                </Dropdown.Item>
              </>
            ) : null}
          </Dropdown.Content>
        </Dropdown.Root>

        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <ButtonGroup.Item
              asChild
              disabled={!canChangeStatus}
              className={cn(
                'h-8 gap-1.5 p-2 font-medium text-text-sub-500 hover:text-text-sub-500',
                !canChangeStatus && 'cursor-not-allowed opacity-60',
              )}
            >
              <button type='button' disabled={!canChangeStatus}>
                <VersionStatusDot status={versionStatus} />
                <span className='text-label-sm'>{statusLabel}</span>
                {canChangeStatus ? (
                  <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
                ) : null}
              </button>
            </ButtonGroup.Item>
          </Dropdown.Trigger>

          {canChangeStatus ? (
            <Tooltip.Provider>
              <Dropdown.Content align='end' className='w-[260px] gap-1 p-2'>
                <p className='px-2 py-1 text-subheading-2xs uppercase tracking-[0.22px] text-text-soft-400'>
                  Status of this version
                </p>

                <div className='flex flex-col gap-1 pb-2'>
                  {PROJECT_BOQ_VERSION_STATUS_OPTIONS.map((option) => {
                    const isSelected = option.value === versionStatus;
                    const isProcurementOption =
                      option.value === PROJECT_BOQ_VERSION_STATUS.INITIATE_TO_PROCUREMENT;
                    const isOptionDisabled =
                      isProcurementOption && isProcurementStatusBlocked && !isSelected;

                    return (
                      <Dropdown.Item
                        key={option.value}
                        disabled={isOptionDisabled}
                        className={cn(
                          'flex items-center gap-2 rounded-lg p-1.5',
                          isSelected ? 'bg-bg-weak-100' : 'bg-bg-white-0',
                          isOptionDisabled && 'cursor-not-allowed opacity-60',
                        )}
                        onSelect={(event) => {
                          if (isOptionDisabled) {
                            event.preventDefault();
                            return;
                          }
                          onVersionStatusChange?.(option.value);
                        }}
                      >
                        <span className='text-paragraph-sm text-text-main-900'>{option.label}</span>
                        {isOptionDisabled ? <ProcurementStatusBlockedHint /> : null}
                      </Dropdown.Item>
                    );
                  })}
                </div>
              </Dropdown.Content>
            </Tooltip.Provider>
          ) : null}
        </Dropdown.Root>
      </ButtonGroup.Root>
    );
  },
);

ProjectBoqVersionStatusGroup.displayName = 'ProjectBoqVersionStatusGroup';

export default ProjectBoqVersionStatusGroup;
