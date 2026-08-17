import React from 'react';
import {
  Circle,
  MousePointer2,
  PenTool,
  Redo2,
  Square,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import * as Button from '@/components/ui/button';
import { GlassPanel } from '@/components/floor-plan-editor/react/ui/glass-panel.jsx';
import { TOOL_IDS } from '@/components/floor-plan-editor/types/index.js';

/** Shared pin colors for Global Layout / task create panels (not used on Floor Layout toolbar). */
export const PROJECT_LAYOUT_MARKER_COLORS = [
  { id: 'orange', label: 'Orange', value: '#F17B2C' },
  { id: 'green', label: 'Green', value: '#079455' },
  { id: 'red', label: 'Red', value: '#DF1C41' },
  { id: 'purple', label: 'Purple', value: '#6E3FF3' },
];

function ToolButton({ active, label, onClick, children, disabled = false }) {
  return (
    <Button.Root
      type='button'
      size='small'
      variant={active ? 'primary' : 'neutral'}
      mode={active ? 'filled' : 'stroke'}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
    >
      {children}
    </Button.Root>
  );
}

/**
 * Floor layout toolbar — area draw/select only (no task marker pins; those live on Global Layout).
 */
export default function ProjectLayoutFloorToolbar({
  activeToolId,
  setActiveTool,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  readOnly,
  draftPoints,
  draftKind,
  draftClosed,
  onFinishPath,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) {
  const canFinishPath =
    Array.isArray(draftPoints) &&
    ((draftKind === 'polygon' && draftPoints.length >= 8) ||
      (draftKind === 'polyline' && draftClosed) ||
      (draftKind === 'pen' && draftPoints.length >= 8));

  return (
    <div className='pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-2 pb-[max(0px,env(safe-area-inset-bottom))]'>
      <GlassPanel className='pointer-events-auto flex flex-wrap items-center gap-1 px-2 py-2'>
        <ToolButton
          active={activeToolId === TOOL_IDS.SELECT}
          label='Select'
          disabled={readOnly}
          onClick={() => setActiveTool?.(TOOL_IDS.SELECT)}
        >
          <MousePointer2 className='size-4 shrink-0' aria-hidden />
        </ToolButton>

        <ToolButton
          active={activeToolId === TOOL_IDS.PEN}
          label='Pen'
          disabled={readOnly}
          onClick={() => setActiveTool?.(TOOL_IDS.PEN)}
        >
          <PenTool className='size-4 shrink-0' aria-hidden />
        </ToolButton>

        <ToolButton
          active={activeToolId === TOOL_IDS.RECTANGLE}
          label='Rectangle'
          disabled={readOnly}
          onClick={() => setActiveTool?.(TOOL_IDS.RECTANGLE)}
        >
          <Square className='size-4 shrink-0' aria-hidden />
        </ToolButton>

        <ToolButton
          active={activeToolId === TOOL_IDS.CIRCLE}
          label='Circle'
          disabled={readOnly}
          onClick={() => setActiveTool?.(TOOL_IDS.CIRCLE)}
        >
          <Circle className='size-4 shrink-0' aria-hidden />
        </ToolButton>

        {canFinishPath ? (
          <>
            <div className='mx-1 h-6 w-px shrink-0 bg-stroke-soft-200' aria-hidden />
            <Button.Root
              type='button'
              size='small'
              variant='primary'
              mode='filled'
              onClick={onFinishPath}
            >
              Finish
            </Button.Root>
          </>
        ) : null}

        <div className='mx-1 h-6 w-px shrink-0 bg-stroke-soft-200' aria-hidden />

        <Button.Root
          type='button'
          size='small'
          variant='neutral'
          mode='stroke'
          disabled={readOnly || !canUndo}
          onClick={onUndo}
          aria-label='Undo'
          title='Undo (⌘Z)'
        >
          <Undo2 className='size-4' aria-hidden />
        </Button.Root>
        <Button.Root
          type='button'
          size='small'
          variant='neutral'
          mode='stroke'
          disabled={readOnly || !canRedo}
          onClick={onRedo}
          aria-label='Redo'
          title='Redo (⌘⇧Z)'
        >
          <Redo2 className='size-4' aria-hidden />
        </Button.Root>

        <div className='mx-1 h-6 w-px shrink-0 bg-stroke-soft-200' aria-hidden />

        <Button.Root
          type='button'
          size='small'
          variant='neutral'
          mode='stroke'
          aria-label='Zoom out'
          onClick={onZoomOut}
        >
          <ZoomOut className='size-4' aria-hidden />
        </Button.Root>
        <span className='min-w-[3.25rem] text-center tabular-nums text-paragraph-xs text-text-sub-600'>
          {zoomPercent}%
        </span>
        <Button.Root
          type='button'
          size='small'
          variant='neutral'
          mode='stroke'
          aria-label='Zoom in'
          onClick={onZoomIn}
        >
          <ZoomIn className='size-4' aria-hidden />
        </Button.Root>
      </GlassPanel>
    </div>
  );
}
