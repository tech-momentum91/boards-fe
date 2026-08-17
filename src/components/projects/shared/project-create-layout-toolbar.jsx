import React from 'react';
import { Hand, MapPin, ZoomIn, ZoomOut } from 'lucide-react';

import { GlassPanel } from '@/components/floor-plan-editor/react/ui/glass-panel.jsx';
import { TOOL_IDS } from '@/components/floor-plan-editor/types/index.js';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';

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
 * Hand + marker + zoom toolbar for project task create layout panel.
 *
 * @param {{
 *   activeToolId: string,
 *   setActiveTool: (toolId: string) => void,
 *   markerColor: string,
 *   zoomPercent: number,
 *   onZoomIn: () => void,
 *   onZoomOut: () => void,
 *   showMarkerTool?: boolean,
 * }} props
 */
export default function ProjectCreateLayoutToolbar({
  activeToolId,
  setActiveTool,
  markerColor,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  showMarkerTool = true,
}) {
  const isMarkerActive = activeToolId === TOOL_IDS.POINT;

  return (
    <div className='pointer-events-none absolute bottom-4 left-1/2 z-30 flex w-full -translate-x-1/2 justify-center px-2'>
      <GlassPanel className='pointer-events-auto flex flex-wrap items-center gap-1 px-2 py-2'>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <ToolButton
              active={activeToolId === TOOL_IDS.HAND}
              label='Hand (H)'
              onClick={() => setActiveTool(TOOL_IDS.HAND)}
            >
              <Hand className='size-4 shrink-0' aria-hidden />
            </ToolButton>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Hand</p>
          </Tooltip.Content>
        </Tooltip.Root>

        {showMarkerTool ? (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <ToolButton
                active={isMarkerActive}
                label='Marker (D)'
                onClick={() => setActiveTool(TOOL_IDS.POINT)}
              >
                <MapPin className='size-4 shrink-0' style={{ color: markerColor }} aria-hidden />
              </ToolButton>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Marker</p>
            </Tooltip.Content>
          </Tooltip.Root>
        ) : null}

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
