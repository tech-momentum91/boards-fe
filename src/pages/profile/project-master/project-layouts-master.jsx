import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiAddLine, RiArrowRightSLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import * as Button from '@/components/ui/button';
import GroupByToolbarControl from '@/components/ui/group-by-toolbar-control';
import * as Input from '@/components/ui/input';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useDebounce } from '@/hooks/use-debounce';
import {
  clearProjectLayoutMasterDetail,
  deleteProjectTaskMaster,
  fetchProjectLayoutMasterDetail,
  fetchProjectLayoutMasterList,
  updateProjectLayoutMasterField,
} from '@/redux/projectMasterSlice';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import {
  buildProjectLayoutFieldFormData,
  buildTaskMasterListFilters,
  getLayoutRowFieldValue,
  groupTaskMasterRows,
  layoutFieldValuesEqual,
  TASK_MASTER_FILTER_ALL,
} from '@/pages/profile/project-master/project-master-helpers';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import ProjectLayoutCreateDrawer from '@/pages/profile/project-master/project-layout-create-drawer';
import ProjectLayoutTable from '@/pages/profile/project-master/project-layout-table';
import ProjectLayoutViewDrawer from '@/pages/profile/project-master/project-layout-view-drawer';
import ProjectMasterFilterPopover, {
  ProjectMasterGroupValueFilter,
} from '@/pages/profile/project-master/project-master-list-filters';
import ProjectMasterGroupTable from '@/pages/profile/project-master/project-master-group-table';
import ProjectMasterStatusConfigTab from '@/pages/profile/project-master/project-master-status-config-tab';
import { PROJECT_MASTER_STATUS_FIELD_KEYS } from '@/pages/profile/project-master/project-master-status-config';
import {
  PROJECT_LAYOUT_COLUMNS,
  PROJECT_LAYOUT_MASTER_FILTER_SECTIONS,
  PROJECT_LAYOUT_MASTER_GROUP_BY_OPTIONS,
  PROJECT_LAYOUT_TABS,
  getStoredProjectLayoutColumnConfig,
  saveStoredProjectLayoutColumnConfig,
} from '@/pages/profile/project-master/project-master.constants';
import { useProjectMasterList } from '@/pages/profile/project-master/use-project-master-list';

export default function ProjectLayoutsMaster({ onLayoutsClick }) {
  const dispatch = useDispatch();
  const { list, detail } = useSelector((state) => state.projectMaster.layouts);
  const isDeleting = useSelector((state) => state.projectMaster.delete.isLoading);
  const { data: layoutList, isLoading: isListLoading } = list;
  const listLayouts = layoutList?.results ?? [];
  const openLayout = detail.data;

  const [activeTab, setActiveTab] = useState('Layouts');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState('layout_type');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [groupValueFilter, setGroupValueFilter] = useState(TASK_MASTER_FILTER_ALL);
  const [activeFilterSection, setActiveFilterSection] = useState('status');
  const [selectedFilters, setSelectedFilters] = useState({ status: [], priority: [] });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const columnConfig = useColumnConfig(
    'project-layout-master',
    PROJECT_LAYOUT_COLUMNS,
    saveStoredProjectLayoutColumnConfig,
    getStoredProjectLayoutColumnConfig,
    { autoSave: true, debounce: 200 },
  );

  const getListFilters = useCallback(
    () => ({
      keyword: debouncedSearchTerm,
      filters: buildTaskMasterListFilters({
        groupBy,
        groupValueFilter,
        selectedFilters,
      }),
    }),
    [debouncedSearchTerm, groupBy, groupValueFilter, selectedFilters],
  );

  const { loadList, paginationProps } = useProjectMasterList({
    dispatch,
    fetchListThunk: fetchProjectLayoutMasterList,
    getFilters: getListFilters,
    isActive: activeTab === 'Layouts',
    reloadDeps: [debouncedSearchTerm, groupBy, groupValueFilter, selectedFilters, groupOrder],
  });

  const layoutGroups = useMemo(
    () => groupTaskMasterRows(listLayouts, groupBy, groupOrder),
    [groupBy, groupOrder, listLayouts],
  );

  useEffect(() => {
    setGroupValueFilter(TASK_MASTER_FILTER_ALL);
  }, [groupBy]);

  const loadLayoutDetail = useCallback(
    async (layoutId) => {
      await dispatch(fetchProjectLayoutMasterDetail(layoutId)).unwrap();
    },
    [dispatch],
  );

  const handleOpenLayout = useCallback(
    async (layout) => {
      const layoutId = layout?.name ?? layout?.id;
      if (!layoutId) return;

      try {
        await loadLayoutDetail(layoutId);
        setIsViewDrawerOpen(true);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [loadLayoutDetail],
  );

  const handleFieldUpdate = useCallback(
    async (layoutId, fieldName, value) => {
      const layout = listLayouts.find((row) => row.name === layoutId);
      if (!layoutId || !layout) return;

      const originalValue = getLayoutRowFieldValue(layout, fieldName);
      if (layoutFieldValuesEqual(fieldName, originalValue, value)) return;

      try {
        await dispatch(
          updateProjectLayoutMasterField(
            buildProjectLayoutFieldFormData(layoutId, fieldName, value),
          ),
        ).unwrap();
        await loadList();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, listLayouts, loadList],
  );

  const handleRefreshLayout = useCallback(async () => {
    const layoutId = openLayout?.name;
    if (!layoutId) return;

    try {
      await loadLayoutDetail(layoutId);
      await loadList();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [loadLayoutDetail, loadList, openLayout?.name]);

  const handleLayoutChange = useCallback(
    async (layoutId) => {
      if (!layoutId) return;
      try {
        await loadLayoutDetail(layoutId);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [loadLayoutDetail],
  );

  const handleCloseDrawer = useCallback(() => {
    setIsViewDrawerOpen(false);
    dispatch(clearProjectLayoutMasterDetail());
  }, [dispatch]);

  const handleLayoutCreated = useCallback(() => {
    setActiveTab('Layouts');
    loadList();
  }, [loadList]);

  const handleRequestDeleteLayout = useCallback((layout) => {
    const id = layout?.name ?? layout?.id;
    if (!id) return;

    setPendingDelete({
      id,
      label: layout.task_name || id,
    });
  }, []);

  const handleConfirmDeleteLayout = useCallback(async () => {
    const layoutId = pendingDelete?.id;
    if (!layoutId) return;

    try {
      await dispatch(deleteProjectTaskMaster(layoutId)).unwrap();
      showSuccessToast('Layout deleted successfully');
      if (openLayout?.name === layoutId) {
        handleCloseDrawer();
      }
      setPendingDelete(null);
      await loadList();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [dispatch, handleCloseDrawer, loadList, openLayout?.name, pendingDelete?.id]);

  return (
    <div className='flex w-full flex-col'>
      <div className='flex items-center gap-2 border-b border-stroke-soft-200 pb-2'>
        <div onClick={onLayoutsClick} className='text-label-sm text-text-sub-500'>
          Projects Master
        </div>
        <RiArrowRightSLine className='size-4 text-text-sub-500' />
        <div>Layouts</div>
      </div>

      <section className='flex flex-col gap-5'>
        <TabMenuHorizontal.Root value={activeTab} onValueChange={setActiveTab}>
          <TabMenuHorizontal.List
            wrapperClassName='border-b border-stroke-soft-200'
            className='border-none'
          >
            {PROJECT_LAYOUT_TABS.map((tab) => (
              <TabMenuHorizontal.Trigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabMenuHorizontal.Trigger>
            ))}
          </TabMenuHorizontal.List>
        </TabMenuHorizontal.Root>

        {activeTab === 'Layouts' ? (
          <>
            <div className='flex flex-col gap-3'>
              <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                <Input.Root size='xsmall' className='w-full sm:w-[276px]'>
                  <Input.Wrapper>
                    <Input.Icon as={RiSearchLine} />
                    <Input.Input
                      placeholder='Search here...'
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </Input.Wrapper>
                </Input.Root>

                <div className='flex flex-wrap items-center justify-end gap-3'>
                  <GroupByToolbarControl
                    options={PROJECT_LAYOUT_MASTER_GROUP_BY_OPTIONS}
                    groupBy={groupBy}
                    onGroupByChange={setGroupBy}
                    groupOrder={groupOrder}
                    onGroupOrderChange={setGroupOrder}
                    size='xsmall'
                  />
                  <ProjectMasterGroupValueFilter
                    groupBy={groupBy}
                    value={groupValueFilter}
                    onChange={setGroupValueFilter}
                  />
                  <ProjectMasterFilterPopover
                    filterSections={PROJECT_LAYOUT_MASTER_FILTER_SECTIONS}
                    selectedFilters={selectedFilters}
                    onSelectedFiltersChange={setSelectedFilters}
                    activeSection={activeFilterSection}
                    onActiveSectionChange={setActiveFilterSection}
                    ariaLabel='Filter project layouts'
                  />
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
                        aria-label='Manage columns'
                      >
                        <Button.Icon as={RiLayoutColumnLine} />
                      </Button.Root>
                    }
                  />
                  <Button.Root
                    size='xsmall'
                    className='gap-2 px-4'
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Button.Icon as={RiAddLine} />
                    Add Layout
                  </Button.Root>
                </div>
              </div>
            </div>

            <PaginatedTableLayout grouped {...paginationProps}>
              {isListLoading ? (
                <div className='flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
                  Loading layouts…
                </div>
              ) : layoutGroups.some((group) => group.rows.length > 0) ? (
                layoutGroups.map((group) =>
                  group.rows.length > 0 ? (
                    <ProjectMasterGroupTable
                      key={group.id}
                      group={group.id}
                      groupBy={groupBy}
                      showGroupHeader={Boolean(groupBy)}
                    >
                      <ProjectLayoutTable
                        layouts={group.rows}
                        onFieldUpdate={handleFieldUpdate}
                        onOpenLayout={handleOpenLayout}
                        onDelete={handleRequestDeleteLayout}
                        columnConfig={columnConfig.columns}
                      />
                    </ProjectMasterGroupTable>
                  ) : null,
                )
              ) : (
                <div className='flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
                  <p className='text-label-md text-text-strong-950'>No layouts found</p>
                  <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                    Create a layout or adjust the search filter.
                  </p>
                </div>
              )}
            </PaginatedTableLayout>
          </>
        ) : (
          <ProjectMasterStatusConfigTab
            fieldKey={PROJECT_MASTER_STATUS_FIELD_KEYS.layouts}
            configKey='layouts'
          />
        )}

        <ProjectLayoutCreateDrawer
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onCreated={handleLayoutCreated}
        />

        <ProjectLayoutViewDrawer
          isOpen={isViewDrawerOpen}
          onClose={handleCloseDrawer}
          layout={openLayout}
          onRefresh={handleRefreshLayout}
          layouts={listLayouts}
          onLayoutChange={handleLayoutChange}
        />

        <DeleteConfirmModal
          isOpen={Boolean(pendingDelete)}
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
          title='Delete layout?'
          description={
            pendingDelete?.label
              ? `Are you sure you want to delete "${pendingDelete.label}"? This action cannot be undone.`
              : 'Are you sure you want to delete this layout? This action cannot be undone.'
          }
          item={pendingDelete}
          onConfirm={handleConfirmDeleteLayout}
          isLoading={isDeleting}
        />
      </section>
    </div>
  );
}
