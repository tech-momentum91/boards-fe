import React, { useMemo } from 'react';

import AllocatedSpaceModal from '@/components/space-management/allocate-space-modal';
import { mapMergedLayoutSpaceToAllocateModalSpaceData } from '@/utils/layout-annotation-space';

const ALLOCATE_HEADER_DESCRIPTION = 'Add below details to allocate a client.';

/**
 * Opens the shared allocate flow from the layout floor plan (client search, lease, credits).
 *
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   mergedSpace: object | null,
 *   centerApiId: string,
 *   blockFloorId: string,
 *   clientsList: unknown[],
 *   onAllocateSuccess?: () => void,
 *   lockedCustomerId?: string,
 *   layoutSubSpaceId?: string,
 * }} props
 */
export default function LayoutAnnotationAllocateClientModal({
  open,
  onOpenChange,
  mergedSpace,
  centerApiId,
  blockFloorId,
  clientsList,
  onAllocateSuccess,
  lockedCustomerId,
  layoutSubSpaceId = '',
}) {
  const spaceData = useMemo(
    () => mapMergedLayoutSpaceToAllocateModalSpaceData(mergedSpace, centerApiId, blockFloorId),
    [mergedSpace, centerApiId, blockFloorId],
  );

  if (!spaceData) return null;

  return (
    <AllocatedSpaceModal
      isOpen={open}
      onOpenChange={onOpenChange}
      clientsList={clientsList}
      spaceData={spaceData}
      headerDescription={ALLOCATE_HEADER_DESCRIPTION}
      onAllocateSuccess={onAllocateSuccess}
      lockedCustomerId={lockedCustomerId}
      layoutSubSpaceId={layoutSubSpaceId}
      skipSeatSelection
    />
  );
}
