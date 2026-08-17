import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiLayoutColumnLine,
  RiSearch2Line,
} from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { editProjectLayoutArea, getProjectLayoutAreaTypeOptions } from '@/api/projectLayout';
import ProjectAreaCreateDrawer from '@/components/projects/areas/project-area-create-drawer';
import ProjectDetailAreasTable from '@/components/projects/areas/project-detail-areas-table';
import ProjectAreaViewDrawer from '@/components/projects/areas/project-area-view-drawer';
import {
  buildAreaUpdatePayload,
  buildProjectAreasListParams,
  collectProjectAreasFilterOptions,
  getProjectAreaRowFieldValue,
  mapEditedAreaResponseToRow,
  mapProjectAreaDetailToRow,
  mapProjectAreasListviewToGroups,
  patchProjectAreaRow,
  projectAreaFieldValuesEqual,
  projectAreasGroupBadgeColor,
} from '@/components/projects/areas/project-areas-list-helpers';
import ProjectQuickFilterToolbar from '@/components/projects/shared/project-quick-filter-toolbar';
import { parseProjectFloors } from '@/components/projects/shared';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Filter from '@/components/ui/filter';
import GroupByToolbarControl from '@/components/ui/group-by-toolbar-control';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useDebounce } from '@/hooks/use-debounce';
import {
  PROJECT_DETAIL_AREAS_COLUMNS,
  PROJECT_DETAIL_AREAS_FILTER_SECTIONS,
  PROJECT_DETAIL_AREAS_GROUP_BY_OPTIONS,
  PROJECT_DETAIL_COMPLETED_QUICK_FILTER_STATUS,
  getStoredProjectDetailAreasColumnConfig,
  saveStoredProjectDetailAreasColumnConfig,
} from '@/components/projects/constants';
import {
  clearProjectAreaDetail,
  clearProjectAreasCache,
  deleteProjectLayoutAreaThunk,
  fetchProjectAreaDetail,
  fetchProjectAreasListview,
  fetchProjectDetail,
  patchProjectAreaDetailField,
  selectProjectAreaDetail,
  selectProjectAreaDetailLoading,
  selectProjectAreasListview,
  selectProjectAreasListviewLoading,
  selectProjectDetail,
} from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

function AreasGroupTable({
  group,
  rows,
  onOpenArea,
  onFieldUpdate,
  columnConfig,
  areaTypeOptions,
  onAreaTypeOptionsChange,
  hideFloorColumn,
  showGroupHeader = true,
  isCollapsed = false,
  onToggleCollapse,
}) {
  return (
    <div className='flex flex-col gap-2'>
      {showGroupHeader ? (
        <button
          type='button'
          onClick={onToggleCollapse}
          className='flex w-fit items-center gap-1 text-left'
          aria-expanded={!isCollapsed}
        >
          <Badge.Root
            variant='light'
            color={projectAreasGroupBadgeColor(group)}
            size='small'
            className='uppercase'
          >
            {group}
          </Badge.Root>
          {isCollapsed ? (
            <RiArrowRightSLine className='size-4 text-text-soft-400' />
          ) : (
            <RiArrowDownSLine className='size-4 text-text-soft-400' />
          )}
          <span className='text-paragraph-xs text-text-sub-500'>({rows.length})</span>
        </button>
      ) : null}

      {!isCollapsed ? (
        <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
          <div className='overflow-x-auto'>
            <ProjectDetailAreasTable
              rows={rows}
              groupId={group}
              columnConfig={columnConfig}
              onRowClick={onOpenArea}
              onFieldUpdate={onFieldUpdate}
              areaTypeOptions={areaTypeOptions}
              onAreaTypeOptionsChange={onAreaTypeOptionsChange}
              hideFloorColumn={hideFloorColumn}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ProjectAreasSection({ projectId }) {
  const dispatch = useDispatch();
  const areasListview = useSelector(selectProjectAreasListview);
  const isListLoading = useSelector(selectProjectAreasListviewLoading);
  const areaDetailData = useSelector(selectProjectAreaDetail);
  const isDetailLoading = useSelector(selectProjectAreaDetailLoading);
  const projectDetailData = useSelector(selectProjectDetail);

  const [areaGroups, setAreaGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('floor');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [activeFilterSection, setActiveFilterSection] = useState('floor');
  const [selectedFilters, setSelectedFilters] = useState({
    floor: [],
    area_type: [],
    status: [],
  });
  const [selectedAreaKey, setSelectedAreaKey] = useState(null);
  const [deletingAreaId, setDeletingAreaId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [areaTypeOptions, setAreaTypeOptions] = useState([]);
  const areaUpdateRequestIdRef = useRef({});
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const projectFloors = useMemo(() => parseProjectFloors(projectDetailData), [projectDetailData]);

  const flatAreaRows = useMemo(
    () => areaGroups.flatMap((group) => group.rows.map((row) => ({ ...row, groupId: group.id }))),
    [areaGroups],
  );

  const areasFilterOptions = useMemo(
    () => collectProjectAreasFilterOptions(areasListview, projectFloors),
    [areasListview, projectFloors],
  );

  const columnConfig = useColumnConfig(
    'project-detail-areas',
    PROJECT_DETAIL_AREAS_COLUMNS,
    saveStoredProjectDetailAreasColumnConfig,
    getStoredProjectDetailAreasColumnConfig,
    { autoSave: true, debounce: 200 },
  );

  const loadAreas = useCallback(async () => {
    if (!projectId) return;

    try {
      await dispatch(
        fetchProjectAreasListview(
          buildProjectAreasListParams({
            projectId,
            keyword: debouncedSearchQuery,
            groupBy,
            selectedFilters,
          }),
        ),
      ).unwrap();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [debouncedSearchQuery, dispatch, groupBy, projectId, selectedFilters]);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  useEffect(() => {
    if (!projectId) return;

    dispatch(fetchProjectDetail(projectId)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, projectId]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    setAreaGroups(mapProjectAreasListviewToGroups(areasListview));
    setCollapsedGroups({});
  }, [areasListview]);

  const totalFilterCount = useMemo(
    () =>
      Object.values(selectedFilters).reduce(
        (count, values) => count + (Array.isArray(values) ? values.length : 0),
        0,
      ),
    [selectedFilters],
  );

  const visibleAreaGroups = useMemo(() => {
    const floorFilters = selectedFilters.floor ?? [];
    const areaTypeFilters = selectedFilters.area_type ?? [];
    const statusFilters = selectedFilters.status ?? [];

    return areaGroups
      .map((group) => ({
        ...group,
        rows: group.rows.filter((row) => {
          if (floorFilters.length > 1 && !floorFilters.includes(row.floor)) return false;
          if (areaTypeFilters.length > 1 && !areaTypeFilters.includes(row.area_type)) return false;
          if (statusFilters.length > 1 && !statusFilters.includes(row.status)) return false;
          return true;
        }),
      }))
      .filter((group) => group.rows.length > 0);
  }, [areaGroups, selectedFilters]);

  const listSelectedArea = useMemo(() => {
    if (!selectedAreaKey?.rowId) return null;
    return flatAreaRows.find(
      (row) => row.id === selectedAreaKey.rowId && row.groupId === selectedAreaKey.groupId,
    );
  }, [flatAreaRows, selectedAreaKey]);

  const selectedArea = useMemo(() => {
    if (!selectedAreaKey?.rowId) return null;
    const areaId = selectedAreaKey.rowId;

    if (areaDetailData?.area_id === areaId || areaDetailData?.name === areaId) {
      return mapProjectAreaDetailToRow(areaDetailData, listSelectedArea);
    }

    return listSelectedArea;
  }, [areaDetailData, listSelectedArea, selectedAreaKey?.rowId]);

  const getAreaRowForUpdate = useCallback(
    (areaId, fieldName) => {
      const listRow = flatAreaRows.find((row) => row.id === areaId) ?? listSelectedArea;
      if (!listRow) return null;

      if (
        fieldName === 'description' &&
        selectedAreaKey?.rowId === areaId &&
        (areaDetailData?.area_id === areaId || areaDetailData?.name === areaId)
      ) {
        return mapProjectAreaDetailToRow(areaDetailData, listRow);
      }

      return listRow;
    },
    [areaDetailData, flatAreaRows, listSelectedArea, selectedAreaKey?.rowId],
  );

  const handleFieldUpdate = useCallback(
    async (areaId, fieldName, value) => {
      const area = getAreaRowForUpdate(areaId, fieldName);
      if (!areaId || !area) return;

      const originalValue = getProjectAreaRowFieldValue(area, fieldName);
      if (projectAreaFieldValuesEqual(fieldName, originalValue, value)) return;

      const payload = buildAreaUpdatePayload(areaId, fieldName, value, area);
      if (!payload) return;

      const requestKey = `${areaId}:${fieldName}`;
      const requestId = (areaUpdateRequestIdRef.current[requestKey] ?? 0) + 1;
      areaUpdateRequestIdRef.current[requestKey] = requestId;

      try {
        const result = await editProjectLayoutArea(payload);
        if (areaUpdateRequestIdRef.current[requestKey] !== requestId) return;

        showSuccessToast(result?.message ?? 'Area updated successfully');

        const updatedRow =
          mapEditedAreaResponseToRow(result?.area, area) ??
          patchProjectAreaRow(area, fieldName, value);

        setAreaGroups((previous) =>
          previous.map((group) => ({
            ...group,
            rows: group.rows.map((row) => (row.id === areaId ? updatedRow : row)),
          })),
        );

        if (fieldName === 'description' && selectedAreaKey?.rowId === areaId) {
          dispatch(patchProjectAreaDetailField({ fieldName, value }));
        } else if (selectedAreaKey?.rowId === areaId) {
          await dispatch(fetchProjectAreaDetail(areaId)).unwrap();
        }

        dispatch(clearProjectAreasCache());
      } catch (error) {
        if (areaUpdateRequestIdRef.current[requestKey] !== requestId) return;
        showErrorToast(extractErrorMessage(error, 'Failed to update area'));
      }
    },
    [dispatch, getAreaRowForUpdate, selectedAreaKey?.rowId],
  );

  useEffect(() => {
    const areaId = selectedAreaKey?.rowId;
    if (!areaId) return;

    dispatch(fetchProjectAreaDetail(areaId)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, selectedAreaKey?.rowId]);

  const activeSectionOptions = areasFilterOptions[activeFilterSection] ?? [];

  const toggleFilterOption = (section, option) => {
    setSelectedFilters((previous) => {
      const current = previous[section] ?? [];
      const nextValues = current.includes(option.value)
        ? current.filter((value) => value !== option.value)
        : [...current, option.value];
      return { ...previous, [section]: nextValues };
    });
  };

  const clearAllFilters = () => {
    setSelectedFilters({ floor: [], area_type: [], status: [] });
  };

  const openAreaDrawer = (groupId, rowId) => {
    setSelectedAreaKey({ groupId, rowId });
  };

  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroups((previous) => ({
      ...previous,
      [groupId]: !previous[groupId],
    }));
  };

  const handleCreated = useCallback(async () => {
    dispatch(clearProjectAreasCache());
    await loadAreas();
  }, [dispatch, loadAreas]);

  const handleDeleteArea = useCallback(
    async (areaId) => {
      if (!areaId) return;

      try {
        setDeletingAreaId(areaId);
        const result = await dispatch(deleteProjectLayoutAreaThunk(areaId)).unwrap();
        showSuccessToast(result?.message ?? 'Area deleted successfully');
        setSelectedAreaKey(null);
        dispatch(clearProjectAreaDetail());
        dispatch(clearProjectAreasCache());
        await loadAreas();
      } catch (error) {
        showErrorToast(extractErrorMessage(error, 'Failed to delete area'));
      } finally {
        setDeletingAreaId(null);
      }
    },
    [dispatch, loadAreas],
  );

  return (
    <>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between gap-3'>
          <div className='w-full max-w-[372px]'>
            <Input.Root size='xsmall'>
              <Input.Wrapper>
                <Input.Icon as={RiSearch2Line} />
                <Input.Input
                  placeholder='Search here...'
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='flex items-center gap-3'>
            <GroupByToolbarControl
              options={PROJECT_DETAIL_AREAS_GROUP_BY_OPTIONS}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              groupOrder={groupOrder}
              onGroupOrderChange={setGroupOrder}
              size='xsmall'
            />
            <ProjectQuickFilterToolbar
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
              completedStatus={PROJECT_DETAIL_COMPLETED_QUICK_FILTER_STATUS.areas}
              entityLabel='areas'
            />
            <Popover.Root>
              <Filter.TriggerButton
                filterCount={totalFilterCount}
                tooltipContent='Filters'
                ariaLabel='Filter areas'
                size='xsmall'
                onClear={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  clearAllFilters();
                }}
              />
              <Filter.Root align='end' sideOffset={8} showArrow={false} className='w-[520px]'>
                <Filter.Header onClear={clearAllFilters} />
                <Filter.Body className='h-[220px]'>
                  <Filter.Sidebar width='120px' className='p-2'>
                    {PROJECT_DETAIL_AREAS_FILTER_SECTIONS.map((section) => (
                      <Filter.SidebarItem
                        key={section.id}
                        isActive={activeFilterSection === section.id}
                        onClick={() => setActiveFilterSection(section.id)}
                        count={selectedFilters[section.id]?.length ?? 0}
                        icon={RiArrowRightSLine}
                      >
                        {section.label}
                      </Filter.SidebarItem>
                    ))}
                  </Filter.Sidebar>
                  <Filter.Content width='400px' className='p-2'>
                    <div className='flex flex-col gap-1 overflow-y-auto'>
                      {activeSectionOptions.length > 0 ? (
                        activeSectionOptions.map((option) => {
                          const checked = (selectedFilters[activeFilterSection] ?? []).includes(
                            option.value,
                          );
                          return (
                            <button
                              key={option.value}
                              type='button'
                              onClick={() => toggleFilterOption(activeFilterSection, option)}
                              className={cn(
                                'flex items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm text-text-main-900 transition hover:bg-bg-weak-50',
                              )}
                            >
                              <Checkbox.Root
                                size='medium'
                                checked={checked}
                                onCheckedChange={() =>
                                  toggleFilterOption(activeFilterSection, option)
                                }
                                onClick={(event) => event.stopPropagation()}
                              />
                              <span>{option.label}</span>
                            </button>
                          );
                        })
                      ) : (
                        <p className='px-2 py-4 text-paragraph-sm text-text-sub-500'>
                          No options available
                        </p>
                      )}
                    </div>
                  </Filter.Content>
                </Filter.Body>
              </Filter.Root>
            </Popover.Root>
            <Button.Root variant='neutral' mode='stroke' size='xsmall'>
              <Button.Icon as={RiDownloadLine} />
            </Button.Root>
            <ColumnManagerDropdown
              open={isColumnManagerOpen}
              onOpenChange={setIsColumnManagerOpen}
              config={columnConfig}
              tooltipContent={<p>Manage columns</p>}
              trigger={
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  aria-label='Manage area columns'
                >
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
            />
            <Button.Root
              variant='primary'
              mode='filled'
              size='xsmall'
              onClick={() => setIsCreateOpen(true)}
            >
              <Button.Icon as={RiAddLine} />
              Add Area
            </Button.Root>
          </div>
        </div>

        <div className='flex flex-col gap-5 pb-4'>
          {isListLoading ? (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
              Loading areas…
            </div>
          ) : visibleAreaGroups.length > 0 ? (
            visibleAreaGroups.map((group) => (
              <AreasGroupTable
                key={group.id}
                group={group.id}
                rows={group.rows}
                columnConfig={columnConfig.columns}
                onOpenArea={openAreaDrawer}
                onFieldUpdate={handleFieldUpdate}
                areaTypeOptions={areaTypeOptions}
                onAreaTypeOptionsChange={setAreaTypeOptions}
                hideFloorColumn={groupBy === 'floor'}
                showGroupHeader={Boolean(groupBy)}
                isCollapsed={Boolean(collapsedGroups[group.id])}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
              />
            ))
          ) : (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
              <p className='text-label-md text-text-strong-950'>No areas found</p>
              <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                Adjust filters or add a new area.
              </p>
            </div>
          )}
        </div>
      </div>

      <ProjectAreaCreateDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        projectId={projectId}
        projectFloors={projectFloors}
        onCreated={handleCreated}
      />

      <ProjectAreaViewDrawer
        open={Boolean(selectedAreaKey)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedAreaKey(null);
            dispatch(clearProjectAreaDetail());
          }
        }}
        area={selectedArea}
        projectId={projectId}
        isLoading={isDetailLoading}
        onFieldUpdate={handleFieldUpdate}
        onDelete={handleDeleteArea}
        isDeleting={deletingAreaId === selectedArea?.id}
        projectFloors={projectFloors}
      />
    </>
  );
}
