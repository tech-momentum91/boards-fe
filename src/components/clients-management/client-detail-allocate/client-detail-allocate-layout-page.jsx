import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  RiArrowLeftLine,
  RiBuildingLine,
  RiLayoutGridLine,
  RiLayoutMasonryLine,
} from 'react-icons/ri';

import CenterViewLayout from '@/components/centers-management/center-view-layout';
import LayoutCollapsibleCenterSection from '@/components/layout/layout-collapsible-center-section';
import * as Button from '@/components/ui/button';
import {
  fetchAllocatedFloorLayoutsThunk,
  selectAllocatedFloorLayouts,
} from '@/redux/clientDetailSlice';
import { groupAllocatedFloorLayoutsByCenter } from '@/utils/layout-allocated-floor-rows';

/**
 * Client allocated-space layout list. Choosing a layout opens the full-page editor
 * (`client-allocate-layout-editor-page.jsx`).
 *
 * Layouts are grouped by center; each center section is collapsible.
 *
 * Opened from Allocate Space tab via `?tab=allocate&allocateLayout=1`.
 */
const ClientDetailAllocateLayoutPage = ({ clientDisplayName, customerId, onBack }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id: clientRouteId } = useParams();
  const allocatedFloorLayouts = useSelector(selectAllocatedFloorLayouts);
  const [collapsedCenters, setCollapsedCenters] = useState(() => new Set());

  useEffect(() => {
    if (!customerId) return;
    dispatch(fetchAllocatedFloorLayoutsThunk({ customer: customerId }));
  }, [customerId, dispatch]);

  const layoutGroups = useMemo(
    () => groupAllocatedFloorLayoutsByCenter(allocatedFloorLayouts?.data),
    [allocatedFloorLayouts?.data],
  );

  const openEditor = (layout) => {
    const center = String(layout?.center ?? '').trim();
    const blockFloorId = String(layout?.block_floor_id ?? '').trim();
    const clientSeg = String(clientRouteId ?? '').trim();
    if (!clientSeg || !center || !blockFloorId) return;
    const layoutImageFromList = String(
      layout?.layout_image ?? layout?.image ?? layout?.thumbnail ?? '',
    ).trim();
    navigate(
      `/clients/${encodeURIComponent(clientSeg)}/allocate-layout/${encodeURIComponent(center)}/${encodeURIComponent(blockFloorId)}`,
      layoutImageFromList ? { state: { layoutImageFromList } } : undefined,
    );
  };

  const toggleCenter = (key) => {
    setCollapsedCenters((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isLoading = Boolean(allocatedFloorLayouts?.isLoading);
  const error = allocatedFloorLayouts?.error;
  const hasGroups = layoutGroups.length > 0;

  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex min-w-0 flex-1 flex-col overflow-y-auto bg-white px-6 py-5'>
        <div className='mb-5 flex items-center justify-between gap-4'>
          <div className='flex min-w-0 items-center gap-3'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='ghost'
              size='small'
              className='shrink-0'
              onClick={onBack}
              aria-label='Back to allocated space'
            >
              <Button.Icon as={RiArrowLeftLine} />
            </Button.Root>
            <div className='flex min-w-0 items-center gap-2'>
              <RiLayoutMasonryLine className='size-5 shrink-0 text-text-sub-500' />
              <div className='min-w-0'>
                <h2 className='label-medium truncate text-text-sub-500'>Layout</h2>
                {clientDisplayName ? (
                  <p className='truncate text-paragraph-xs text-text-soft-400'>
                    {clientDisplayName}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {isLoading || error || !hasGroups ? (
          <CenterViewLayout
            layouts={[]}
            isLoading={isLoading}
            error={error}
            onLayoutClick={(layout) => openEditor(layout)}
          />
        ) : (
          <div className='flex flex-col gap-6'>
            {layoutGroups.map((group) => {
              const key = group.center || group.centerName;
              const isCollapsed = collapsedCenters.has(key);
              return (
                <LayoutCollapsibleCenterSection
                  key={key}
                  title={group.centerName}
                  subtitle={group.center || undefined}
                  icon={RiBuildingLine}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleCenter(key)}
                >
                  <CenterViewLayout
                    layouts={group.layouts}
                    onLayoutClick={(layout) => openEditor(layout)}
                  />
                </LayoutCollapsibleCenterSection>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetailAllocateLayoutPage;
