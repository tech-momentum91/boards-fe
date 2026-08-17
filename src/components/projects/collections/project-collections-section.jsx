import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiAddLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiLayoutColumnLine,
  RiSearch2Line,
  RiSettings3Line,
} from 'react-icons/ri';
import {
  getProjectCollections,
  saveProjectCollectionPlan,
  updateProjectCollectionMilestone,
} from '@/api/projectCollections';
import ProjectCollectionSetupPlanModal from '@/components/projects/collections/project-collection-setup-plan-modal';
import ProjectCollectionViewDrawer from '@/components/projects/collections/project-collection-view-drawer';
import ProjectCollectionsStats from '@/components/projects/collections/project-collections-stats';
import ProjectDetailCollectionsSplitTable from '@/components/projects/collections/project-detail-collections-split-table';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Filter from '@/components/ui/filter';
import GroupByToolbarControl from '@/components/ui/group-by-toolbar-control';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import { useColumnConfig } from '@/hooks/use-column-config';
import {
  PROJECT_DETAIL_COLLECTION_COLUMNS,
  PROJECT_DETAIL_COLLECTION_FILTER_OPTIONS,
  PROJECT_DETAIL_COLLECTION_FILTER_SECTIONS,
  PROJECT_DETAIL_COLLECTION_GROUP_BY_OPTIONS,
  PROJECT_DETAIL_COLLECTION_STATUS_META,
  getStoredProjectDetailCollectionColumnConfig,
  saveStoredProjectDetailCollectionColumnConfig,
} from '@/components/projects/constants';
import { cn } from '@/utils/cn';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

function emptyCollectionFilters() {
  return PROJECT_DETAIL_COLLECTION_FILTER_SECTIONS.reduce((acc, section) => {
    acc[section.id] = [];
    return acc;
  }, {});
}

function collectionGroupKey(row, groupBy) {
  if (!groupBy) return 'all';
  const value = row?.[groupBy];
  if (groupBy === 'status') {
    return (
      PROJECT_DETAIL_COLLECTION_STATUS_META[value]?.label ??
      String(value || 'Unassigned').toUpperCase()
    );
  }
  return String(value || '').trim() || 'Unassigned';
}

function compareGroupLabels(left, right, order = 'asc') {
  const result = String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  return order === 'desc' ? -result : result;
}

function downloadCollectionCsv(rows = []) {
  const headers = [
    'Milestone',
    'BOQ Type',
    'BOQ Code',
    'Invoice No.',
    'Exp. Inv. Date',
    'Actual Inv. Date',
    'Exp. Pay Date',
    'Actual Payment Date',
    'Payment Commitment Date',
    'Net Receivable',
    'Received',
    'Pay %',
    'BOQ Ref. Val.',
    'Inv. (with GST)',
    'TDS %',
    'TDS Amt.',
    'Balance',
    'Status',
    'Remarks',
  ];
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.milestone,
        row.boq_type,
        row.boq_code,
        row.invoice_no,
        row.expected_invoice_date,
        row.actual_invoice_date,
        row.expected_payment_date,
        row.actual_payment_date,
        row.payment_commitment_date,
        row.net_receivable,
        row.received,
        row.pay_percent,
        row.boq_ref_value,
        row.invoice_with_gst,
        row.tds_percent,
        row.tds_amount,
        row.balance,
        row.status_label || row.status,
        row.remarks,
      ]
        .map(escape)
        .join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'project-collections.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function CollectionGroupTable({
  groupLabel,
  rows,
  columnConfig,
  onRowClick,
  onUpdateMilestone,
  showGroupHeader,
}) {
  return (
    <div className='flex flex-col gap-2'>
      {showGroupHeader ? (
        <div className='flex items-center gap-1'>
          <Badge.Root variant='light' color='gray' size='small' className='uppercase'>
            {groupLabel}
          </Badge.Root>
          <span className='text-paragraph-xs text-text-soft-400'>{rows.length}</span>
        </div>
      ) : null}
      <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
        <div className='overflow-x-auto'>
          <ProjectDetailCollectionsSplitTable
            rows={rows}
            columnConfig={columnConfig}
            onRowClick={onRowClick}
            onUpdateMilestone={onUpdateMilestone}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProjectCollectionsSection({ projectId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [selectedFilters, setSelectedFilters] = useState(emptyCollectionFilters);
  const [activeFilterSection, setActiveFilterSection] = useState(
    PROJECT_DETAIL_COLLECTION_FILTER_SECTIONS[0]?.id ?? 'boq_type',
  );
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isSetupPlanOpen, setIsSetupPlanOpen] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [rows, setRows] = useState([]);

  const columnConfig = useColumnConfig(
    'project-detail-collection',
    PROJECT_DETAIL_COLLECTION_COLUMNS,
    saveStoredProjectDetailCollectionColumnConfig,
    getStoredProjectDetailCollectionColumnConfig,
    { autoSave: true, debounce: 200, pinnedColumnId: 'milestone' },
  );

  const loadCollections = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const payload = await getProjectCollections(projectId);
      setStats(payload?.stats ?? null);
      setPlans(Array.isArray(payload?.plans) ? payload.plans : []);
      setRows(Array.isArray(payload?.results) ? payload.results : []);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to load project collections' });
      setStats(null);
      setPlans([]);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const totalFilterCount = useMemo(
    () =>
      Object.values(selectedFilters).reduce(
        (count, values) => count + (Array.isArray(values) ? values.length : 0),
        0,
      ),
    [selectedFilters],
  );

  const clearAllFilters = useCallback(() => {
    setSelectedFilters(emptyCollectionFilters());
  }, []);

  const toggleFilterOption = useCallback((sectionId, option) => {
    if (option?.disabled) return;
    setSelectedFilters((previous) => {
      const current = previous[sectionId] ?? [];
      const next = current.includes(option.value)
        ? current.filter((value) => value !== option.value)
        : [...current, option.value];
      return { ...previous, [sectionId]: next };
    });
  }, []);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      for (const section of PROJECT_DETAIL_COLLECTION_FILTER_SECTIONS) {
        const selected = selectedFilters[section.id] ?? [];
        if (selected.length === 0) continue;
        const value = String(row?.[section.id] ?? '');
        if (!selected.includes(value)) return false;
      }
      if (!query) return true;
      return [row.milestone, row.invoice_no, row.boq_type, row.status, row.boq_code, row.boq_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [rows, searchQuery, selectedFilters]);

  const visibleGroups = useMemo(() => {
    if (!groupBy) {
      return filteredRows.length > 0 ? [{ id: 'all', label: 'All', rows: filteredRows }] : [];
    }
    const buckets = new Map();
    for (const row of filteredRows) {
      const key = collectionGroupKey(row, groupBy);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(row);
    }
    return [...buckets.entries()]
      .sort(([left], [right]) => compareGroupLabels(left, right, groupOrder))
      .map(([label, groupRows]) => ({ id: label, label, rows: groupRows }));
  }, [filteredRows, groupBy, groupOrder]);

  const selectedCollection = useMemo(
    () => filteredRows.find((row) => row.id === selectedCollectionId) ?? null,
    [filteredRows, selectedCollectionId],
  );

  const activeSectionOptions = PROJECT_DETAIL_COLLECTION_FILTER_OPTIONS[activeFilterSection] ?? [];

  const handleRowClick = useCallback((row) => {
    setSelectedCollectionId(row.id);
    setIsViewDrawerOpen(true);
  }, []);

  const handleMilestoneUpdate = useCallback(
    async (row, changes) => {
      if (!projectId || !row?.id || !changes || Object.keys(changes).length === 0) return;
      try {
        const updated = await updateProjectCollectionMilestone({
          project: projectId,
          collection_boq: row.collection_boq,
          project_boq: row.project_boq,
          milestone_id: row.id,
          ...changes,
        });
        if (updated && typeof updated === 'object' && updated.id) {
          setRows((previous) =>
            previous.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
          );
        } else {
          await loadCollections();
        }
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update milestone' });
      }
    },
    [loadCollections, projectId],
  );

  const handleViewDrawerOpenChange = useCallback((open) => {
    setIsViewDrawerOpen(open);
    if (!open) setSelectedCollectionId(null);
  }, []);

  const openCollectionConfigModal = useCallback(() => {
    setIsSetupPlanOpen(true);
  }, []);

  const handleSavePlan = useCallback(
    async (forms) => {
      const planForms = Array.isArray(forms) ? forms : forms ? [forms] : [];
      if (!projectId || planForms.length === 0) {
        showErrorToast('No collection BOQ plans to save');
        return;
      }

      setIsSavingPlan(true);
      try {
        for (const form of planForms) {
          if (!form?.collection_boq && !form?.project_boq) continue;
          await saveProjectCollectionPlan({
            project: projectId,
            collection_boq: form.collection_boq,
            project_boq: form.project_boq,
            gst: form.gst,
            tds: form.tds,
            milestones: form.milestones,
          });
        }
        showSuccessToast('Collection plans saved.');
        setIsSetupPlanOpen(false);
        await loadCollections();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to save collection plans' });
      } finally {
        setIsSavingPlan(false);
      }
    },
    [loadCollections, projectId],
  );

  return (
    <>
      <div className='flex flex-col gap-5'>
        <ProjectCollectionsStats stats={stats} />

        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='w-full max-w-[300px] min-w-[220px]'>
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

          <div className='flex flex-wrap items-center gap-3'>
            {projectId ? (
              <ProjectFollowersPopover
                projectId={projectId}
                scopeMode='project'
                section='collections'
                referenceDoctype='Project'
                referenceName={projectId}
                activityLabel='collections tab'
              />
            ) : null}

            <GroupByToolbarControl
              options={PROJECT_DETAIL_COLLECTION_GROUP_BY_OPTIONS}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              groupOrder={groupOrder}
              onGroupOrderChange={setGroupOrder}
              size='xsmall'
            />

            <Popover.Root>
              <Filter.TriggerButton
                filterCount={totalFilterCount}
                tooltipContent='Filters'
                ariaLabel='Filter collections'
                size='xsmall'
                onClear={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  clearAllFilters();
                }}
              />
              <Filter.Root align='end' sideOffset={8} showArrow={false} className='w-[480px]'>
                <Filter.Header onClear={clearAllFilters} />
                <Filter.Body className='h-[220px]'>
                  <Filter.Sidebar width='120px' className='p-2'>
                    {PROJECT_DETAIL_COLLECTION_FILTER_SECTIONS.map((section) => (
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
                  <Filter.Content width='360px' className='p-2'>
                    <div className='flex flex-col gap-1 overflow-y-auto'>
                      {activeSectionOptions.map((option) => {
                        const checked = (selectedFilters[activeFilterSection] ?? []).includes(
                          option.value,
                        );
                        return (
                          <button
                            key={option.value}
                            type='button'
                            onClick={() => toggleFilterOption(activeFilterSection, option)}
                            className={cn(
                              'flex items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm transition',
                              'text-text-main-900 hover:bg-bg-weak-50',
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
                      })}
                    </div>
                  </Filter.Content>
                </Filter.Body>
              </Filter.Root>
            </Popover.Root>

            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              aria-label='Download'
              onClick={() => downloadCollectionCsv(filteredRows)}
              disabled={filteredRows.length === 0}
            >
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
                  aria-label='Manage columns'
                >
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
            />

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='ghost'
                  size='xsmall'
                  className='bg-bg-weak-100'
                  aria-label='Set up collection plan'
                  onClick={openCollectionConfigModal}
                >
                  <Button.Icon as={RiSettings3Line} />
                </Button.Root>
              </Tooltip.Trigger>
              <Tooltip.Content>Set up collection plan</Tooltip.Content>
            </Tooltip.Root>

            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='xsmall'
              onClick={openCollectionConfigModal}
            >
              <Button.Icon as={RiAddLine} />
              Add
            </Button.Root>
          </div>
        </div>

        {isLoading ? (
          <div className='flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
            Loading collections…
          </div>
        ) : visibleGroups.length > 0 ? (
          <div className='flex flex-col gap-5 pb-4'>
            {visibleGroups.map((group) => (
              <CollectionGroupTable
                key={group.id}
                groupLabel={group.label}
                rows={group.rows}
                columnConfig={columnConfig.columns}
                onRowClick={handleRowClick}
                onUpdateMilestone={handleMilestoneUpdate}
                showGroupHeader={Boolean(groupBy)}
              />
            ))}
          </div>
        ) : (
          <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
            <p className='text-label-md text-text-strong-950'>No collection records found</p>
            <p className='mt-1 max-w-md text-paragraph-sm text-text-sub-500'>
              {plans.length > 0
                ? 'Configure milestones for synced Client BOQs using Setup Collection Plan. Only Initiate to Procurement BOQs appear here — Draft Client BOQs do not.'
                : 'Client BOQs move here after status is Initiate to Procurement.'}
            </p>
          </div>
        )}
      </div>

      <ProjectCollectionSetupPlanModal
        open={isSetupPlanOpen}
        onOpenChange={setIsSetupPlanOpen}
        plans={plans}
        onSave={handleSavePlan}
        isSaving={isSavingPlan}
      />

      <ProjectCollectionViewDrawer
        open={isViewDrawerOpen}
        onOpenChange={handleViewDrawerOpenChange}
        collection={selectedCollection}
        projectId={projectId}
        onUpdateMilestone={handleMilestoneUpdate}
      />
    </>
  );
}
