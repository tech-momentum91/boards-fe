import React, { memo, useCallback, useEffect, useState } from 'react';

import BoqErEstimationFloorControls from '@/components/boq/shared/boq-er-estimation-floor-controls';
import BoqErEstimationLayoutView from '@/components/boq/shared/boq-er-estimation-layout-view';
import BoqErEstimationTaskGalleryView from '@/components/boq/shared/boq-er-estimation-task-gallery-view';
import {
  BOQ_ER_VIEW_MODE_TASK_TYPE,
  BOQ_ER_VIEW_MODES,
} from '@/components/boq/shared/boq-er-estimation-constants';

const BoqErEstimationFloorPanel = ({
  floors = [],
  activeFloorIndex = 0,
  activeFloorLabel = '',
  onFloorChange,
  viewMode = BOQ_ER_VIEW_MODES.THREED,
  onViewModeChange,
  floorLayout = null,
  isFloorLayoutLoading = false,
  onLayoutAreaSelect,
  onTaskMarkerClick: onTaskMarkerClickProp,
  onViewTask,
  onDeleteTask,
}) => {
  const [selectedGalleryTask, setSelectedGalleryTask] = useState(null);

  const isLayout = viewMode === BOQ_ER_VIEW_MODES.LAYOUT;
  const isMarkerGalleryMode =
    viewMode === BOQ_ER_VIEW_MODES.THREED || viewMode === BOQ_ER_VIEW_MODES.GFC;
  const taskTypeFilter = BOQ_ER_VIEW_MODE_TASK_TYPE[viewMode] ?? '';

  useEffect(() => {
    setSelectedGalleryTask(null);
  }, [activeFloorIndex, activeFloorLabel, viewMode]);

  const handleTaskMarkerClick = useCallback(
    (task) => {
      if (isMarkerGalleryMode) {
        setSelectedGalleryTask(task);
        return;
      }
      onTaskMarkerClickProp?.(task);
    },
    [isMarkerGalleryMode, onTaskMarkerClickProp],
  );

  const handleBackToLayout = useCallback(() => {
    setSelectedGalleryTask(null);
  }, []);

  const handleFloorChange = useCallback(
    (index) => {
      setSelectedGalleryTask(null);
      onFloorChange?.(index);
    },
    [onFloorChange],
  );

  const handleViewModeChange = useCallback(
    (nextMode) => {
      setSelectedGalleryTask(null);
      onViewModeChange?.(nextMode);
    },
    [onViewModeChange],
  );

  let mainContent = null;

  if (isMarkerGalleryMode && selectedGalleryTask) {
    mainContent = (
      <BoqErEstimationTaskGalleryView
        className='h-full'
        task={selectedGalleryTask}
        onBack={handleBackToLayout}
        emptyLabel={
          viewMode === BOQ_ER_VIEW_MODES.GFC
            ? 'No GFC images for this task.'
            : 'No 3D images for this task.'
        }
      />
    );
  } else if (isLayout || isMarkerGalleryMode) {
    mainContent = (
      <BoqErEstimationLayoutView
        className='h-full'
        floorLayout={floorLayout}
        isLoading={isFloorLayoutLoading}
        floorLabel={activeFloorLabel}
        taskTypeFilter={isMarkerGalleryMode ? taskTypeFilter : ''}
        openGalleryOnMarkerClick={isMarkerGalleryMode}
        onLayoutAreaSelect={isLayout ? onLayoutAreaSelect : undefined}
        onTaskMarkerClick={handleTaskMarkerClick}
        onViewTask={onViewTask}
        onDeleteTask={onDeleteTask}
      />
    );
  }

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bg-weak-100'>
      <div className='relative min-h-0 flex-1 overflow-hidden'>{mainContent}</div>

      <BoqErEstimationFloorControls
        floors={floors}
        activeFloorIndex={activeFloorIndex}
        onFloorChange={handleFloorChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
    </div>
  );
};

export default memo(BoqErEstimationFloorPanel);
