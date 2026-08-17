import React, { memo } from 'react';
import { RiSearchLine } from 'react-icons/ri';

import CenterSetupPopover from '@/components/aum/maintenance-scheduler/center-setup-popover';
import { MS_TOOLBAR_COPY } from '@/components/aum/maintenance-scheduler/maintenance-scheduler-helper';
import * as Input from '@/components/ui/input';

const MaintenanceSchedulerToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    selectedCenter,
    onCenterChange,
    onMasterSetupClick,
    onExitMasterSetup,
    isMasterSetupMode = false,
    centerOptions = [],
    isSaving = false,
    isGeneratingChecks = false,
  }) => {
    const searchId = React.useId();

    return (
      <div className='flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='w-full min-w-0 shrink-0 lg:max-w-[276px]'>
          <Input.Root size='medium'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                id={searchId}
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={MS_TOOLBAR_COPY.searchPlaceholder}
                autoComplete='off'
                aria-label={MS_TOOLBAR_COPY.searchAriaLabel}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex shrink-0 items-center justify-end'>
          <CenterSetupPopover
            selectedCenter={selectedCenter}
            centerOptions={centerOptions}
            onCenterChange={onCenterChange}
            onMasterSetupClick={onMasterSetupClick}
            onExitMasterSetup={onExitMasterSetup}
            isMasterSetupMode={isMasterSetupMode}
          />
          {isSaving ? (
            <span className='text-label-xs text-text-sub-500' aria-live='polite'>
              Saving...
            </span>
          ) : isGeneratingChecks ? (
            <span className='text-label-xs text-text-sub-500' aria-live='polite'>
              Generating preventive checks...
            </span>
          ) : null}
        </div>
      </div>
    );
  },
);

MaintenanceSchedulerToolbar.displayName = 'MaintenanceSchedulerToolbar';

export default MaintenanceSchedulerToolbar;
