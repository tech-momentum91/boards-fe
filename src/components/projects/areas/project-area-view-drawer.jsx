import React, { useEffect, useMemo, useState } from 'react';
import {
  RiCloseLine,
  RiCollageLine,
  RiDeleteBinLine,
  RiPaletteLine,
  RiRuler2Line,
  RiStackLine,
  RiStickyNoteLine,
} from 'react-icons/ri';
import { getLayoutAreas, getProjectLayoutAreaTypeOptions } from '@/api/projectLayout';
import ProjectAreaTypeSelect from '@/components/projects/areas/project-area-type-select';
import {
  buildProjectAreaLayoutPreview,
  buildProjectAreaLayoutPreviewFromFloors,
} from '@/components/projects/areas/project-areas-list-helpers';
import ProjectDrawerPanelHeader from '@/components/projects/shared/project-drawer-panel-header';
import ProjectViewLayoutPanel from '@/components/projects/shared/project-view-layout-panel';
import { PROJECT_LAYOUT_AREA_COLORS } from '@/components/projects/layouts/project-layout-annotation-helpers';
import { getProjectFloorSelectOptions } from '@/components/projects/shared';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { InlineEditableRichEditor } from '@/components/event-management/inline-editable-fields';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

function areaStatusColor(status) {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'active') return 'green';
  if (normalized === 'inactive') return 'gray';
  return 'gray';
}

export default function ProjectAreaViewDrawer({
  open,
  onOpenChange,
  area,
  projectId,
  isLoading = false,
  onFieldUpdate,
  onDelete,
  isDeleting = false,
  projectFloors = [],
}) {
  const [titleDraft, setTitleDraft] = useState('');
  const [areaTypeOptions, setAreaTypeOptions] = useState([]);
  const [layoutFloors, setLayoutFloors] = useState([]);
  const [isLayoutLoading, setIsLayoutLoading] = useState(false);

  useEffect(() => {
    if (!area) return;
    setTitleDraft(area.area_label ?? area.title ?? '');
  }, [area?.id, area?.area_label, area?.title]);

  useEffect(() => {
    if (!open) {
      setLayoutFloors([]);
      setIsLayoutLoading(false);
      return undefined;
    }

    let cancelled = false;

    getProjectLayoutAreaTypeOptions()
      .then((options) => {
        if (!cancelled) setAreaTypeOptions(options);
      })
      .catch((error) => {
        if (!cancelled) {
          showErrorToast(extractErrorMessage(error, 'Failed to load area types'));
          setAreaTypeOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    const normalizedProject = String(projectId ?? area?.project ?? '').trim();
    if (!open || !normalizedProject) {
      setLayoutFloors([]);
      return undefined;
    }

    let cancelled = false;
    setIsLayoutLoading(true);

    getLayoutAreas({ project: normalizedProject })
      .then((response) => {
        if (cancelled) return;
        const floors = Array.isArray(response?.floors) ? response.floors : [];
        setLayoutFloors(floors);
      })
      .catch((error) => {
        if (!cancelled) {
          showErrorToast(extractErrorMessage(error, 'Failed to load floor layouts'));
          setLayoutFloors([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLayoutLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [area?.floor, area?.id, area?.project, open, projectId]);

  const floorOptions = useMemo(
    () => getProjectFloorSelectOptions(projectFloors, area?.floor),
    [area?.floor, projectFloors],
  );

  const layoutPreview = useMemo(() => {
    if (!area) return null;

    const fromDetail = buildProjectAreaLayoutPreview(area);
    if (fromDetail) return fromDetail;

    return buildProjectAreaLayoutPreviewFromFloors(area, layoutFloors);
  }, [area, layoutFloors]);

  const layoutPanelKey = useMemo(() => {
    const areaId = String(area?.area_id ?? area?.id ?? '').trim();
    const layoutId = String(layoutPreview?.layout_id ?? layoutPreview?.id ?? '').trim();
    return `${areaId}-${layoutId}-${layoutPreview?.layout_image ?? ''}`;
  }, [area?.area_id, area?.id, layoutPreview]);

  const selectedAreaColor = useMemo(() => {
    const areaId = String(area?.area_id ?? area?.id ?? '').trim();
    if (!areaId || !layoutPreview?.areas) return area?.color ?? '#2563eb';

    const match = layoutPreview.areas.find(
      (entry) => String(entry?.area_id ?? entry?.name ?? '').trim() === areaId,
    );

    return match?.color ?? area?.color ?? '#2563eb';
  }, [area, layoutPreview?.areas]);

  if (!open) return null;

  const commitTitle = () => {
    if (!area?.id) return;
    onFieldUpdate?.(area.id, 'area_label', titleDraft);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='h-full w-full max-w-[1200px] overflow-hidden p-0'>
        <div className='flex h-full flex-col'>
          <div className='flex items-center justify-end border-b border-stroke-soft-200 px-6 py-3'>
            <div className='flex items-center gap-2'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='flex flex-row gap-3'
                disabled={!area?.id || isLoading || isDeleting}
                onClick={() => onDelete?.(area.id)}
              >
                <Button.Icon as={RiDeleteBinLine} />
                {isDeleting ? 'Removing...' : 'Remove'}
              </Button.Root>
              <Drawer.Close asChild>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  aria-label='Close area view drawer'
                >
                  <Button.Icon as={RiCloseLine} />
                </Button.Root>
              </Drawer.Close>
            </div>
          </div>

          {!area ? (
            <div className='flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-500'>
              {isLoading ? 'Loading area…' : 'Area not found'}
            </div>
          ) : (
            <div className='grid min-h-0 flex-1 grid-cols-[minmax(360px,422px)_minmax(0,1fr)]'>
              <div className='min-w-0 overflow-y-auto border-r border-stroke-soft-200 px-6 py-5'>
                {area.status ? (
                  <Badge.Root
                    variant='light'
                    color={areaStatusColor(area.status)}
                    size='small'
                    className='max-w-[200px]'
                  >
                    {area.status}
                  </Badge.Root>
                ) : null}

                <div className='mt-4 flex items-center gap-2'>
                  <Input.Root size='medium' variant='borderless' className='flex-1'>
                    <Input.Wrapper>
                      <Input.Input
                        value={titleDraft}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        onBlur={commitTitle}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                        }}
                        className='text-title-h5'
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>

                <div className='mt-4 overflow-hidden rounded-xl border border-stroke-soft-200 divide-y divide-stroke-soft-200'>
                  <FieldRow icon={RiStackLine} label='Floor'>
                    <Select.Root
                      value={area.floor || undefined}
                      size='xsmall'
                      variant='borderless'
                      disabled
                    >
                      <Select.Trigger className='h-8 min-w-[120px]'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {floorOptions.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FieldRow>
                  <FieldRow icon={RiCollageLine} label='Area Type'>
                    <ProjectAreaTypeSelect
                      value={area.area_type || ''}
                      onValueChange={(value) => onFieldUpdate?.(area.id, 'area_type', value)}
                      options={areaTypeOptions}
                      onOptionsChange={setAreaTypeOptions}
                      placeholder='Select'
                      size='xsmall'
                      variant='borderless'
                      triggerClassName='w-full'
                      commitOnBlurOnly
                    />
                  </FieldRow>
                  <FieldRow icon={RiRuler2Line} label='Carpet Area'>
                    <Input.Root size='xsmall' variant='borderless' className='w-full min-w-0'>
                      <Input.Wrapper>
                        <Input.Input
                          key={`${area.id}-carpet-${area.carpet_area}`}
                          defaultValue={area.carpet_area ?? ''}
                          placeholder='—'
                          onBlur={(event) =>
                            onFieldUpdate?.(area.id, 'carpet_area', event.currentTarget.value)
                          }
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </FieldRow>
                  {/* <FieldRow icon={RiCollageLine} label='On Layout'>
                    <Badge.Root
                      variant='light'
                      color={area.on_layout ? 'green' : 'gray'}
                      className='text-nowrap'
                    >
                      {area.on_layout ? 'Yes' : 'No'}
                    </Badge.Root>
                  </FieldRow> */}
                  {/* <FieldRow icon={RiPaletteLine} label='Color'>
                    <div className='flex flex-wrap gap-1.5'>
                      {PROJECT_LAYOUT_AREA_COLORS.map((color) => (
                        <button
                          key={color}
                          type='button'
                          onClick={() => onFieldUpdate?.(area.id, 'color', color)}
                          className={cn(
                            'size-6 rounded-full border-2 transition',
                            area.color === color
                              ? 'border-text-main-900 ring-2 ring-stroke-soft-200'
                              : 'border-transparent',
                          )}
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                  </FieldRow> */}
                </div>

                <section className='mt-6'>
                  <div className='mb-3 flex items-center gap-2 text-label-md text-text-sub-500'>
                    <RiStickyNoteLine className='size-5 text-text-soft-400' />
                    Description
                  </div>
                  <InlineEditableRichEditor
                    value={area.description ?? ''}
                    onSave={(value) => onFieldUpdate?.(area.id, 'description', value)}
                  />
                </section>
              </div>

              <div className='flex min-h-0 flex-1 flex-col'>
                <ProjectDrawerPanelHeader icon={RiStackLine} label='Layout' />
                {isLayoutLoading && !layoutPreview ? (
                  <div className='flex flex-1 items-center justify-center px-6 text-paragraph-sm text-text-sub-500'>
                    Loading layout…
                  </div>
                ) : layoutPreview ? (
                  <ProjectViewLayoutPanel
                    key={layoutPanelKey}
                    layout={layoutPreview}
                    selectedAreaId={area.area_id ?? area.id}
                    floorLabel={area.floor ?? layoutPreview.floor ?? ''}
                    markerColor={selectedAreaColor}
                  />
                ) : (
                  <div className='flex flex-1 items-center justify-center px-6 text-center text-paragraph-sm text-text-sub-500'>
                    {area.floor
                      ? 'No floor layout is available for this area.'
                      : 'This area is not assigned to a floor.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
