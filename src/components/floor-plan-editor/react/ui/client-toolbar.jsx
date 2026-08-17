import React from 'react';
import { Crosshair, MapPin, MousePointer2, Redo2, Undo2, ZoomIn, ZoomOut } from 'lucide-react';

import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

import { GlassPanel } from './glass-panel.jsx';
import { TOOL_IDS } from '../../types/index.js';

/**
 * Simplified client-view toolbar.
 * Renders: Select, Dot, Undo, Redo, Zoom Out, zoom %, Zoom In, Recenter.
 *
 * @param {object} props
 * @param {string} props.activeToolId
 * @param {(id: string) => void} props.onToolChange
 * @param {number} props.zoomPercent
 * @param {() => void} props.onZoomIn
 * @param {() => void} props.onZoomOut
 * @param {() => void} props.onRecenter
 * @param {boolean} [props.canUndo]
 * @param {() => void} [props.onUndo]
 * @param {boolean} [props.canRedo]
 * @param {() => void} [props.onRedo]
 * @param {string} [props.className]
 * @param {React.ReactNode} [props.trailingActions]
 *   Contextual buttons (e.g., Save changes, Close) rendered after a divider on
 *   the right side of the toolbar. Caller is responsible for visibility logic.
 */
export function ClientFloorPlanToolbar({
  activeToolId,
  onToolChange,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onRecenter,
  canUndo = false,
  onUndo,
  canRedo = false,
  onRedo,
  className,
  trailingActions = null,
}) {
  const tools = [{ id: TOOL_IDS.SELECT, label: 'Select', shortcut: 'V', Icon: MousePointer2 }];

  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 justify-center px-2 w-full',
        className,
      )}
    >
      <GlassPanel className='pointer-events-auto flex flex-wrap items-center gap-1 px-2 py-2'>
        {tools.map(({ id, label, Icon, shortcut }) => (
          <Tooltip.Root key={id}>
            <Tooltip.Trigger asChild>
              <Button.Root
                type='button'
                size='small'
                variant={activeToolId === id ? 'primary' : 'neutral'}
                mode={activeToolId === id ? 'filled' : 'stroke'}
                title={`${label} (${shortcut})`}
                aria-label={`${label} (${shortcut})`}
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

        <div className='mx-1 h-6 w-px shrink-0 bg-stroke-soft-200' aria-hidden />

        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button.Root
              type='button'
              size='small'
              variant='neutral'
              mode='stroke'
              onClick={onUndo}
              disabled={!canUndo}
              aria-label='Undo'
              title='Undo (Ctrl+Z)'
            >
              <Undo2 className='size-4' aria-hidden />
            </Button.Root>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Undo</p>
          </Tooltip.Content>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button.Root
              type='button'
              size='small'
              variant='neutral'
              mode='stroke'
              onClick={onRedo}
              disabled={!canRedo}
              aria-label='Redo'
              title='Redo (Ctrl+Shift+Z)'
            >
              <Redo2 className='size-4' aria-hidden />
            </Button.Root>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Redo</p>
          </Tooltip.Content>
        </Tooltip.Root>

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

        <span className='min-w-[3.25rem] text-center tabular-nums text-paragraph-xs text-text-sub-600'>
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
