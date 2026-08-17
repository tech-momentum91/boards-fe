import React, { memo, useCallback, useState } from 'react';
import { RiPencilLine } from 'react-icons/ri';

import { useProposalFloorPlanLayout } from '@/components/ui/proposal-builder/proposal-template/hooks/use-proposal-floor-plan-layout';
import ProposalPage6FloorPlanCanvas from '@/components/ui/proposal-builder/proposal-template/sections/proposal-page-6-floor-plan-canvas';
import ProposalPage6FloorPlanEditorModal from '@/components/ui/proposal-builder/proposal-template/sections/proposal-page-6-floor-plan-editor-modal';

function inventoryIdentity(inventory) {
  if (!Array.isArray(inventory) || inventory.length === 0) return '';
  return inventory
    .map((row) => {
      const center = String(row?.center_id || row?.center || '').trim();
      const floor = String(row?.floor || '').trim();
      const space = String(row?.space || row?.space_id || row?.name || '').trim();
      return `${center}|${floor}|${space}`;
    })
    .join(';');
}

/**
 * Floor plan for proposal page 6 — system highlights + optional user-drawn regions.
 */
function ProposalPage6FloorPlan({
  inventory = [],
  embeddedLayoutDetail = null,
  skipLiveLayoutFetch = false,
  fallbackSrc = '/proposal-template/page-6/floor-plan-composition.png',
  customAnnotations = [],
  customAnnotationMeta = null,
  editorSettings = null,
  readOnly = false,
  onFloorPlanSave,
  className = '',
}) {
  const [editorOpen, setEditorOpen] = useState(false);

  const {
    canRender,
    hasFloorImage,
    imageProp,
    annotations,
    viewport,
    layoutDetail,
    floorGroup,
    layoutImagePath,
  } = useProposalFloorPlanLayout(
    inventory,
    embeddedLayoutDetail,
    customAnnotations,
    customAnnotationMeta,
    editorSettings,
    { skipLiveLayoutFetch },
  );

  const handleOpenEditor = useCallback(() => {
    if (readOnly || !hasFloorImage) return;
    setEditorOpen(true);
  }, [hasFloorImage, readOnly]);

  const showDrawOverlay = !readOnly && hasFloorImage && Boolean(onFloorPlanSave);

  const floorPlanVisual = canRender ? (
    <ProposalPage6FloorPlanCanvas
      className={className}
      image={imageProp.raster}
      annotations={annotations}
      viewport={viewport}
    />
  ) : (
    <img
      className={`proposal-page-6__floor-plan-composition ${className}`.trim()}
      src={fallbackSrc}
      alt='Floor plan'
      draggable={false}
    />
  );

  return (
    <>
      <div className='proposal-page-6__floor-plan-interactive'>
        {floorPlanVisual}
        {showDrawOverlay ? (
          <div className='proposal-page-6__floor-plan-draw-overlay'>
            <button
              type='button'
              className='proposal-page-6__floor-plan-draw-btn'
              aria-label='Draw floor plan highlights'
              onClick={handleOpenEditor}
            >
              <RiPencilLine className='size-6' aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      <ProposalPage6FloorPlanEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        imageProp={imageProp}
        layoutDetail={layoutDetail}
        initialAnnotations={customAnnotations}
        initialEditorSettings={editorSettings}
        floorGroup={floorGroup}
        layoutImagePath={layoutImagePath}
        onSave={onFloorPlanSave}
      />
    </>
  );
}

function areFloorPlanPropsEqual(prev, next) {
  return (
    prev.readOnly === next.readOnly &&
    prev.className === next.className &&
    prev.fallbackSrc === next.fallbackSrc &&
    prev.embeddedLayoutDetail === next.embeddedLayoutDetail &&
    prev.skipLiveLayoutFetch === next.skipLiveLayoutFetch &&
    prev.onFloorPlanSave === next.onFloorPlanSave &&
    prev.customAnnotationMeta === next.customAnnotationMeta &&
    prev.editorSettings === next.editorSettings &&
    prev.customAnnotations === next.customAnnotations &&
    inventoryIdentity(prev.inventory) === inventoryIdentity(next.inventory)
  );
}

export default memo(ProposalPage6FloorPlan, areFloorPlanPropsEqual);
