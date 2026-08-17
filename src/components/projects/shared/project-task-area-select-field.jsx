import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiStackLine } from 'react-icons/ri';

import { getProjectFloorLayoutBundle } from '@/api/projectLayout';
import ProjectAreaPickLayoutPanel from '@/components/projects/shared/project-area-pick-layout-panel';
import {
  buildLayoutPreviewLayoutFromFloor,
  resolveProjectFloorLayoutBundle,
} from '@/components/projects/shared/project-layout-areas-helpers';
import * as CompactButton from '@/components/ui/compact-button';
import * as Popover from '@/components/ui/popover';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useProjectAreas } from '@/hooks/use-project-areas';
import { cn } from '@/utils/cn';
import { extractErrorMessage, showInfoToast } from '@/utils/error-utils';

function formatFloorLabel(floor) {
  const value = String(floor ?? '').trim();
  if (!value) return 'Floor';
  if (/^floor\b/i.test(value)) return value;
  return `Floor ${value}`;
}

/**
 * Inline task table area field — floor-scoped options with layout popover picker.
 */
export default function ProjectTaskAreaSelectField({
  projectId,
  floor,
  value,
  onValueChange,
  layoutBundles = null,
  layoutTaskType = 'Project Tasks',
  size = 'xsmall',
  variant = 'compact',
  showArrow: showArrowProp,
  placeholder,
  searchPlaceholder = 'Search areas…',
  contentClassName,
  triggerClassName,
  disabled = false,
  className,
}) {
  const [isLayoutPopoverOpen, setIsLayoutPopoverOpen] = useState(false);
  const [layoutBundle, setLayoutBundle] = useState(null);
  const [isLayoutLoading, setIsLayoutLoading] = useState(false);
  const [layoutError, setLayoutError] = useState(null);

  const normalizedFloor = String(floor ?? '').trim();
  const showArrow = showArrowProp ?? variant !== 'borderless';
  const { areaOptions, isLoading: isAreasLoading } = useProjectAreas(
    projectId,
    normalizedFloor,
    value,
    {
      fetchByFloor: true,
    },
  );

  const cachedLayoutBundle = useMemo(
    () => resolveProjectFloorLayoutBundle(layoutBundles, normalizedFloor),
    [layoutBundles, normalizedFloor],
  );

  const previewLayout = useMemo(() => {
    const source = layoutBundle ?? cachedLayoutBundle;
    return buildLayoutPreviewLayoutFromFloor(source);
  }, [cachedLayoutBundle, layoutBundle]);

  const canOpenLayout = Boolean(
    normalizedFloor && (previewLayout?.layout_image || cachedLayoutBundle),
  );

  useEffect(() => {
    if (!isLayoutPopoverOpen) {
      setLayoutBundle(null);
      setLayoutError(null);
      setIsLayoutLoading(false);
    }
  }, [isLayoutPopoverOpen]);

  useEffect(() => {
    if (!isLayoutPopoverOpen || !normalizedFloor) return undefined;

    if (cachedLayoutBundle) {
      setLayoutBundle(cachedLayoutBundle);
      setLayoutError(null);
      setIsLayoutLoading(false);
      return undefined;
    }

    const normalizedProjectId = String(projectId ?? '').trim();
    if (!normalizedProjectId) {
      setLayoutError('Project is required to load layout.');
      return undefined;
    }

    let cancelled = false;
    setIsLayoutLoading(true);
    setLayoutError(null);
    setLayoutBundle(null);

    getProjectFloorLayoutBundle({
      project: normalizedProjectId,
      floor: normalizedFloor,
      task_type: layoutTaskType,
    })
      .then((result) => {
        if (cancelled) return;
        const bundle = result?.layout_bundle ?? result ?? null;
        setLayoutBundle(bundle);
      })
      .catch((error) => {
        if (cancelled) return;
        setLayoutBundle(null);
        setLayoutError(extractErrorMessage(error, 'Failed to load floor layout'));
      })
      .finally(() => {
        if (!cancelled) setIsLayoutLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cachedLayoutBundle, isLayoutPopoverOpen, layoutTaskType, normalizedFloor, projectId]);

  const handleBeforeOpen = useCallback(() => {
    if (!normalizedFloor) {
      showInfoToast('Select a floor first');
      return false;
    }
    return true;
  }, [normalizedFloor]);

  const handleOpenLayout = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!normalizedFloor) {
        showInfoToast('Select a floor first');
        return;
      }
      setIsLayoutPopoverOpen(true);
    },
    [normalizedFloor],
  );

  const handleAreaPick = useCallback(
    (areaId) => {
      onValueChange?.(areaId);
      setIsLayoutPopoverOpen(false);
    },
    [onValueChange],
  );

  const layoutPopover = (
    <Popover.Root open={isLayoutPopoverOpen} onOpenChange={setIsLayoutPopoverOpen}>
      <Popover.Anchor asChild>
        <CompactButton.Root
          type='button'
          variant='stroke'
          size='medium'
          aria-label='Pick area from floor layout'
          title={
            !normalizedFloor
              ? 'Select a floor first'
              : canOpenLayout
                ? 'Pick area from layout'
                : 'No layout for this floor'
          }
          disabled={disabled || isAreasLoading}
          onClick={handleOpenLayout}
        >
          <CompactButton.Icon as={RiStackLine} />
        </CompactButton.Root>
      </Popover.Anchor>

      <Popover.Content
        side='right'
        sideOffset={8}
        collisionPadding={16}
        showArrow
        className='z-[60] w-[min(92vw,440px)] overflow-hidden p-0'
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <ProjectAreaPickLayoutPanel
          layout={previewLayout}
          selectedAreaId={value}
          onAreaPick={handleAreaPick}
          isLoading={isLayoutLoading}
          error={layoutError}
        />

        <div className='flex items-center gap-2 border-t border-stroke-soft-200 bg-bg-white-0 px-4 py-2.5'>
          <RiStackLine className='size-4 shrink-0 text-text-soft-400' aria-hidden />
          <span className='text-label-sm font-medium text-text-strong-950'>
            {formatFloorLabel(normalizedFloor)}
          </span>
          <span className='text-paragraph-xs text-text-soft-400'>Click on area to select</span>
        </div>
      </Popover.Content>
    </Popover.Root>
  );

  return (
    <SearchableSelect
      className={className}
      size={size}
      variant={variant}
      showArrow={showArrow}
      value={value}
      onValueChange={onValueChange}
      options={areaOptions}
      placeholder={
        placeholder ??
        (!normalizedFloor ? 'Select floor first' : isAreasLoading ? 'Loading…' : 'Select')
      }
      searchPlaceholder={searchPlaceholder}
      contentClassName={contentClassName}
      triggerClassName={cn(triggerClassName)}
      disabled={disabled || isAreasLoading}
      onBeforeOpen={handleBeforeOpen}
      searchSuffix={layoutPopover}
      emptyMessage={!normalizedFloor ? 'Select a floor first' : 'No areas available'}
    />
  );
}
