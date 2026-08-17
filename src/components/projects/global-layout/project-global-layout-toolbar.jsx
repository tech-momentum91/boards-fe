import React, { useState } from 'react';
import { Hand, MousePointer2, ZoomIn, ZoomOut } from 'lucide-react';
import { RiArrowDownSLine, RiArrowLeftLine, RiArrowRightLine, RiMapPinFill } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import { GlassPanel } from '@/components/floor-plan-editor/react/ui/glass-panel.jsx';
import { TOOL_IDS } from '@/components/floor-plan-editor/types/index.js';
import {
  PROJECT_GLOBAL_LAYOUT_ALL_TASKS_FILTER,
  buildProjectGlobalLayoutTaskFilterOptions,
} from '@/components/projects/global-layout/project-global-layout-task-icons';
import { cn } from '@/utils/cn';

function ToolButton({ active, label, onClick, children }) {
  return (
    <Button.Root
      type='button'
      size='small'
      variant={active ? 'primary' : 'neutral'}
      mode={active ? 'filled' : 'stroke'}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
    >
      {children}
    </Button.Root>
  );
}

export default function ProjectGlobalLayoutToolbar({
  activeToolId,
  setActiveTool,
  placementTaskType = '',
  onPlacementTaskTypeChange,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  floorNavigation = null,
}) {
  const [markerMenuOpen, setMarkerMenuOpen] = useState(false);
  const markerOptions = buildProjectGlobalLayoutTaskFilterOptions([]);
  const selectedMarkerConfig = placementTaskType
    ? (markerOptions.find((option) => option.taskType === placementTaskType) ??
      PROJECT_GLOBAL_LAYOUT_ALL_TASKS_FILTER)
    : PROJECT_GLOBAL_LAYOUT_ALL_TASKS_FILTER;
  const SelectedMarkerIcon = selectedMarkerConfig.icon;
  const DefaultMarkerIcon = RiMapPinFill;
  const isMarkerActive = activeToolId === TOOL_IDS.POINT;

  const handleMarkerTypeSelect = (taskType) => {
    onPlacementTaskTypeChange?.(taskType);
    setActiveTool?.(TOOL_IDS.POINT);
    setMarkerMenuOpen(false);
  };

  const currentPage = floorNavigation?.currentPage ?? 1;
  const totalPages = floorNavigation?.totalPages ?? 1;
  const canGoPrev = Boolean(floorNavigation?.canGoPrev);
  const canGoNext = Boolean(floorNavigation?.canGoNext);

  return (
    <div className='pointer-events-none absolute bottom-4 left-1/2 z-20 flex w-full max-w-[min(100%,960px)] -translate-x-1/2 justify-center px-2'>
      <GlassPanel className='pointer-events-auto flex flex-wrap items-center gap-1 px-2 py-2'>
        <ToolButton
          active={activeToolId === TOOL_IDS.HAND}
          label='Hand'
          onClick={() => setActiveTool?.(TOOL_IDS.HAND)}
        >
          <Hand className='size-4 shrink-0' aria-hidden />
        </ToolButton>

        <ToolButton
          active={activeToolId === TOOL_IDS.SELECT}
          label='Select'
          onClick={() => setActiveTool?.(TOOL_IDS.SELECT)}
        >
          <MousePointer2 className='size-4 shrink-0' aria-hidden />
        </ToolButton>

        <Popover.Root open={markerMenuOpen} onOpenChange={setMarkerMenuOpen}>
          <div className='flex items-center'>
            <Button.Root
              type='button'
              size='small'
              variant={isMarkerActive ? 'primary' : 'neutral'}
              mode={isMarkerActive ? 'filled' : 'stroke'}
              aria-label={`Place ${selectedMarkerConfig.label} marker`}
              aria-pressed={isMarkerActive}
              className='rounded-r-none border-r-0 pr-2'
              onClick={() => {
                if (!placementTaskType && markerOptions[0]?.taskType) {
                  onPlacementTaskTypeChange?.(markerOptions[0].taskType);
                }
                setActiveTool?.(TOOL_IDS.POINT);
              }}
            >
              {placementTaskType ? (
                <SelectedMarkerIcon
                  className='size-4 shrink-0'
                  style={{ color: isMarkerActive ? undefined : selectedMarkerConfig.color }}
                  aria-hidden
                />
              ) : (
                <DefaultMarkerIcon className='size-4 shrink-0 text-text-sub-500' aria-hidden />
              )}
            </Button.Root>
            <Popover.Trigger asChild>
              <Button.Root
                type='button'
                size='small'
                variant={isMarkerActive ? 'primary' : 'neutral'}
                mode={isMarkerActive ? 'filled' : 'stroke'}
                aria-label='Choose task marker type'
                className='rounded-l-none px-1.5'
              >
                <RiArrowDownSLine className='size-3.5 shrink-0' aria-hidden />
              </Button.Root>
            </Popover.Trigger>
          </div>
          <Popover.Content align='center' side='top' className='w-[240px] p-2'>
            {markerOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.taskType}
                  type='button'
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-paragraph-sm transition hover:bg-bg-weak-50',
                    placementTaskType === option.taskType && 'bg-bg-weak-50 text-text-main-900',
                  )}
                  onClick={() => handleMarkerTypeSelect(option.taskType)}
                >
                  <Icon className='size-4 shrink-0' style={{ color: option.color }} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </Popover.Content>
        </Popover.Root>

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

        {floorNavigation ? (
          <>
            <div className='mx-1 h-6 w-px shrink-0 bg-stroke-soft-200' aria-hidden />
            <Button.Root
              type='button'
              size='small'
              variant='neutral'
              mode='stroke'
              aria-label='Previous floor'
              disabled={!canGoPrev}
              onClick={floorNavigation.onPrev}
            >
              <RiArrowLeftLine className='size-4' aria-hidden />
            </Button.Root>
            <span className='min-w-[4.5rem] text-center text-paragraph-xs text-text-sub-600'>
              {currentPage}/{totalPages} floor
            </span>
            <Button.Root
              type='button'
              size='small'
              variant='neutral'
              mode='stroke'
              aria-label='Next floor'
              disabled={!canGoNext}
              onClick={floorNavigation.onNext}
            >
              <RiArrowRightLine className='size-4' aria-hidden />
            </Button.Root>
          </>
        ) : null}
      </GlassPanel>
    </div>
  );
}
