import React from 'react';
import {
  CheckCheck,
  Circle as CircleIcon,
  Crosshair,
  Hand,
  MapPin,
  MousePointer2,
  Pentagon,
  PenTool,
  Redo2,
  Spline,
  Square,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';
import * as Tooltip from '@/components/ui/tooltip';

import { GlassPanel } from './glass-panel.jsx';
import { TOOL_IDS } from '../../types/index.js';
import { RiDownloadLine } from 'react-icons/ri';

/**
 * Figma-like floating toolbar (bottom center).
 *
 * @param {object} props
 */
export function DefaultFloorPlanToolbar({
  activeToolId,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDelete,
  hasSelection,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onRecenter,
  readOnly,
  draftPoints,
  draftKind,
  draftClosed,
  onFinishPath,
  className,
  enabledToolIds = null,
  showUndoRedoDelete = true,
  toolButtonsDisabled,
  trailingActions = null,
  panelClassName,
}) {
  const toolsDisabled = toolButtonsDisabled ?? readOnly;

  const tools = [
    { id: TOOL_IDS.SELECT, label: 'Select', shortcut: 'V', Icon: MousePointer2 },
    { id: TOOL_IDS.HAND, label: 'Hand', shortcut: 'H', Icon: Hand },
    { id: TOOL_IDS.POINT, label: 'Dot', shortcut: 'D', Icon: MapPin },
    { id: TOOL_IDS.PEN, label: 'Pen', shortcut: 'N', Icon: PenTool },
    { id: TOOL_IDS.RECTANGLE, label: 'Rectangle', shortcut: 'R', Icon: Square },
    { id: TOOL_IDS.CIRCLE, label: 'Circle', shortcut: 'C', Icon: CircleIcon },
    { id: TOOL_IDS.POLYGON, label: 'Polygon', shortcut: 'P', Icon: Pentagon },
    { id: TOOL_IDS.POLYLINE, label: 'Polyline', shortcut: 'L', Icon: Spline },
  ];

  const visibleTools =
    Array.isArray(enabledToolIds) && enabledToolIds.length > 0
      ? tools.filter((t) => enabledToolIds.includes(t.id))
      : tools;

  const canFinishPath =
    Array.isArray(draftPoints) &&
    ((draftKind === 'polygon' && draftPoints.length >= 8) ||
      (draftKind === 'polyline' && draftClosed) ||
      (draftKind === 'pen' && draftPoints.length >= 8));

  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 justify-center px-2 w-full',
        className,
      )}
    >
      <GlassPanel
        className={cn(
          'pointer-events-auto flex flex-wrap items-center gap-1 px-2 py-2',
          panelClassName,
        )}
      >
        {visibleTools.map(({ id, label, Icon, shortcut }) => (
          <Tooltip.Root key={id}>
            <Tooltip.Trigger asChild>
              <Button.Root
                key={id}
                type='button'
                size='small'
                variant={activeToolId === id ? 'primary' : 'neutral'}
                mode={activeToolId === id ? 'filled' : 'stroke'}
                disabled={toolsDisabled}
                title={shortcut ? `${label} (${shortcut})` : label}
                aria-label={shortcut ? `${label} (${shortcut})` : label}
                aria-pressed={activeToolId === id}
                onClick={() => onToolChange(id)}
              >
                <Icon className='size-4 shrink-0' aria-hidden />
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>{label}</p>
            </Tooltip.Content>
          </Tooltip.Root>
        ))}

        {canFinishPath && (
          <>
            <div className='mx-1 h-6 w-px shrink-0 bg-stroke-soft-200' aria-hidden />
            <Button.Root
              type='button'
              size='small'
              variant='primary'
              mode='filled'
              className='gap-1.5'
              onClick={onFinishPath}
              title='Finish path (Enter)'
              aria-label='Finish path'
            >
              <CheckCheck className='size-4 shrink-0' aria-hidden />
              Finish
            </Button.Root>
          </>
        )}

        {showUndoRedoDelete ? (
          <>
            <div className='mx-1 h-6 w-px shrink-0 bg-stroke-soft-200' aria-hidden />

            <Button.Root
              type='button'
              size='small'
              variant='neutral'
              mode='stroke'
              disabled={toolsDisabled || !canUndo}
              onPointerDown={(e) => {
                e.preventDefault();
                if (!toolsDisabled && canUndo) onUndo();
              }}
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
              disabled={toolsDisabled || !canRedo}
              onPointerDown={(e) => {
                e.preventDefault();
                if (!toolsDisabled && canRedo) onRedo();
              }}
              aria-label='Redo'
              title='Redo (⌘⇧Z)'
            >
              <Redo2 className='size-4' aria-hidden />
            </Button.Root>
            <Button.Root
              type='button'
              size='small'
              variant='error'
              mode='stroke'
              disabled={toolsDisabled || !hasSelection}
              onClick={onDelete}
              aria-label='Delete'
              title='Delete'
            >
              <Trash2 className='size-4' aria-hidden />
            </Button.Root>
          </>
        ) : null}

        <div className='mx-1 h-6 w-px shrink-0 bg-stroke-soft-200' aria-hidden />

        <Button.Root
          type='button'
          size='small'
          variant='neutral'
          mode='stroke'
          onClick={onZoomOut}
          aria-label='Zoom out'
          title='Zoom out'
        >
          <ZoomOut className='size-4' aria-hidden />
        </Button.Root>
        <span className='min-w-[3.25rem] tabular-nums text-center text-paragraph-xs text-text-sub-600'>
          {zoomPercent}%
        </span>
        <Button.Root
          type='button'
          size='small'
          variant='neutral'
          mode='stroke'
          onClick={onZoomIn}
          aria-label='Zoom in'
          title='Zoom in'
        >
          <ZoomIn className='size-4' aria-hidden />
        </Button.Root>
        {/* <Button.Root
          type='button'
          size='small'
          variant='neutral'
          mode='stroke'
          onClick={onRecenter}
          aria-label='Recenter'
          title='Fit to view'
        >
          <Crosshair className='size-4' aria-hidden />
        </Button.Root> */}

        {trailingActions ? (
          <>
            <div className='mx-1 h-6 w-px shrink-0 bg-stroke-soft-200' aria-hidden />
            <div className='flex flex-wrap items-center gap-1'>{trailingActions}</div>
          </>
        ) : null}
      </GlassPanel>
    </div>
  );
}
