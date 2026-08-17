import React, { useMemo, useState } from 'react';
import { RiAlertLine } from 'react-icons/ri';

import ProjectFloorVersionSyncAction from '@/components/projects/shared/project-floor-version-sync-action';
import { cn } from '@/utils/cn';

function getFloorVersionWarningMessage(warningReason) {
  if (warningReason === 'floor_version_updated') {
    return 'The floor layout has been locked at a newer version.';
  }
  if (warningReason === 'area_updated') {
    return 'A layout area was updated. Review the latest floor layout.';
  }
  return 'The floor layout has been updated. Please review and sync.';
}

export default function ProjectFloorVersionWarningAction({
  showWarning = false,
  canAcknowledge = false,
  floorVersionOptions = [],
  warningReason = '',
  onAcknowledge,
  isAcknowledging = false,
  className,
  compact = false,
}) {
  const [selectedVersion, setSelectedVersion] = useState('');

  const defaultVersion = useMemo(() => {
    if (!Array.isArray(floorVersionOptions) || floorVersionOptions.length === 0) return '';
    const latest = floorVersionOptions.find((option) => option?.is_latest);
    if (latest?.value != null) return String(latest.value);
    const last = floorVersionOptions[floorVersionOptions.length - 1];
    return last?.value != null ? String(last.value) : '';
  }, [floorVersionOptions]);

  if (!showWarning) return null;

  if (compact) {
    return (
      <ProjectFloorVersionSyncAction
        showWarning={showWarning}
        canAcknowledge={canAcknowledge}
        floorVersionOptions={floorVersionOptions}
        warningReason={warningReason}
        onAcknowledge={onAcknowledge}
        isAcknowledging={isAcknowledging}
        className={className}
      />
    );
  }

  const message = getFloorVersionWarningMessage(warningReason);
  const syncVersion = selectedVersion || defaultVersion;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-error-lighter bg-error-lighter/30 px-3 py-2',
        className,
      )}
    >
      <RiAlertLine className='size-4 shrink-0 text-error-base' />
      <p className='min-w-0 flex-1 text-paragraph-xs text-text-sub-600'>{message}</p>
      <ProjectFloorVersionSyncAction
        showWarning={showWarning}
        canAcknowledge={canAcknowledge}
        floorVersionOptions={floorVersionOptions}
        warningReason={warningReason}
        onAcknowledge={(version) => {
          setSelectedVersion(version != null ? String(version) : syncVersion);
          onAcknowledge?.(version ?? (syncVersion ? Number(syncVersion) : undefined));
        }}
        isAcknowledging={isAcknowledging}
      />
    </div>
  );
}
