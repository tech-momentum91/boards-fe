import React, { useEffect, useMemo, useState } from 'react';
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowUpSLine,
  RiBuilding2Line,
  RiBuildingLine,
  RiStackLine,
} from 'react-icons/ri';

import SpaceLayoutFloorPlan from '@/components/space-management/space-layout-floor-plan';
import SpaceLayoutStatsBar from '@/components/space-management/space-layout-stats-bar';
import * as Badge from '@/components/ui/badge';
import * as CompactButton from '@/components/ui/compact-button';
import {
  computeCenterLayoutStats,
  getLayoutFloorLabel,
  resolveLayoutListFloorSection,
} from '@/utils/space-layout-list-utils';
import { getLayoutImagePathFromRecord } from '@/utils/layout-image-path';

/**
 * One center block in layout view — stats, single floor plan, prev/next floor nav, hover details.
 *
 * @param {{
 *   centerId: string,
 *   centerName: string,
 *   floors: Array<{
 *     key: string,
 *     floor: object,
 *     spaces: object[],
 *     spaceCount: number,
 *   }>,
 *   defaultExpanded?: boolean,
 * }} props
 */
export default function SpaceLayoutCenterCard({
  centerName,
  floors = [],
  defaultExpanded = false,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [floorIndex, setFloorIndex] = useState(0);

  const safeFloors = useMemo(() => (Array.isArray(floors) ? floors : []), [floors]);
  const totalFloors = safeFloors.length;
  const floorKeys = useMemo(
    () => safeFloors.map((entry) => resolveLayoutListFloorSection(entry).key || '').join('|'),
    [safeFloors],
  );

  const currentFloorSection = safeFloors[floorIndex] ?? safeFloors[0] ?? null;
  const currentFloor = useMemo(
    () => resolveLayoutListFloorSection(currentFloorSection),
    [currentFloorSection],
  );

  useEffect(() => {
    if (floorIndex >= totalFloors && totalFloors > 0) {
      setFloorIndex(totalFloors - 1);
    }
  }, [floorIndex, totalFloors]);

  useEffect(() => {
    setFloorIndex(0);
  }, [centerName, floorKeys]);

  const stats = useMemo(() => computeCenterLayoutStats(safeFloors), [safeFloors]);

  const floorLabel = useMemo(() => getLayoutFloorLabel(currentFloor.floor), [currentFloor.floor]);

  const layoutImagePath = useMemo(() => {
    const floor = currentFloor.floor || {};
    return (
      floor.layout_image_url || floor.layout_image || getLayoutImagePathFromRecord(floor) || ''
    );
  }, [currentFloor.floor]);

  const spaces = Array.isArray(currentFloor.spaces) ? currentFloor.spaces : [];

  const availableCount = useMemo(
    () =>
      spaces.filter(
        (space) =>
          String(space?.status || '')
            .trim()
            .toLowerCase() === 'available',
      ).length,
    [spaces],
  );

  const canGoPrev = floorIndex > 0;
  const canGoNext = floorIndex < totalFloors - 1;

  if (totalFloors === 0) return null;

  return (
    <article className='overflow-hidden  rounded-2xl border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'>
      <div
        onClick={() => setIsExpanded((previous) => !previous)}
        className='flex w-full items-center justify-between py-[10px] pl-4 pr-3 gap-3 border-b border-stroke-soft-200  text-left transition hover:bg-bg-weak-50'
        aria-expanded={isExpanded}
      >
        <div className='flex min-w-0 items-center gap-3 '>
          <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-bg-weak-50 text-text-sub-600'>
            <RiBuildingLine className='size-5' aria-hidden />
          </span>
          <span className='truncate label-small text-text-sub-500'>{centerName}</span>
        </div>
        {isExpanded ? (
          <RiArrowUpSLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
        ) : (
          <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
        )}
      </div>

      {isExpanded ? (
        <div className='flex flex-col gap-3  p-5 '>
          <SpaceLayoutStatsBar stats={stats} />

          <div
            className='h-[min(70vh,720px)] min-h-[420px] overflow-hidden rounded-xl  border border-stroke-soft-200'
            style={{
              backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          >
            <SpaceLayoutFloorPlan
              layoutImagePath={layoutImagePath}
              spaces={spaces}
              className='h-full min-h-0'
            />
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2 text-text-strong-950'>
                <RiStackLine className='size-4 shrink-0 text-text-sub-600' aria-hidden />
                <span className='label-medium font-medium'>{floorLabel}</span>
              </div>
              {availableCount > 0 ? (
                <Badge.Root color='green' variant='light' className='uppercase tracking-wide'>
                  {availableCount} space{availableCount > 1 ? 's' : ''} available
                </Badge.Root>
              ) : null}
            </div>

            {totalFloors > 1 ? (
              <div className='flex items-center'>
                <CompactButton.Root
                  type='button'
                  variant='stroke'
                  size='large'
                  disabled={!canGoPrev}
                  aria-label='Previous floor'
                  onClick={() => setFloorIndex((previous) => Math.max(0, previous - 1))}
                >
                  <CompactButton.Icon as={RiArrowLeftSLine} />
                </CompactButton.Root>
                <span className='min-w-[3rem] text-center text-label-sm font-medium text-text-sub-600'>
                  {floorIndex + 1}/{totalFloors}
                </span>
                <CompactButton.Root
                  type='button'
                  variant='stroke'
                  size='large'
                  disabled={!canGoNext}
                  aria-label='Next floor'
                  onClick={() =>
                    setFloorIndex((previous) => Math.min(totalFloors - 1, previous + 1))
                  }
                >
                  <CompactButton.Icon as={RiArrowRightSLine} />
                </CompactButton.Root>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
