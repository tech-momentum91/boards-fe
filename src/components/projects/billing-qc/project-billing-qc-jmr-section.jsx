import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiDownloadLine, RiLayoutColumnLine, RiLinkM, RiSearch2Line } from 'react-icons/ri';
import AumMultiGroupByDropdown from '@/components/aum/asset/aum-multi-group-by-dropdown';
import ProjectBillingQcCertifyGmrModal from '@/components/projects/billing-qc/project-billing-qc-certify-gmr-modal';
import {
  BILLING_QC_DEFAULT_GROUP_BY_RULES,
  BILLING_QC_GROUP_BY_FIELD_IDS,
  BILLING_QC_GROUP_BY_OPTIONS,
  regroupBillingQcJmrAreas,
} from '@/components/projects/billing-qc/project-billing-qc-group-by';
import ProjectBillingQcJmrTable from '@/components/projects/billing-qc/project-billing-qc-jmr-table';
import ProjectSnagCreateDrawer from '@/components/projects/snags/project-snag-create-drawer';
import {
  areErItemDimensionsEmpty,
  computeErItemQtyFromDimensions,
} from '@/components/boq/shared/boq-er-estimation-areas-utils';
import {
  certifyGmr,
  createSnagFromJmrItem,
  getBillingQcJmrDetail,
  markJmrAreaComplete,
  markJmrCategoryComplete,
  recordSnagOnJmrItem,
  updateJmrItem,
} from '@/api/projectBillingQc';
import { mapFilesToAttachmentRows } from '@/components/projects/shared/project-attachment-upload-utils';
import { buildProjectTaskUploadFilesFormData } from '@/components/projects/tasks/project-task-helpers';
import { parseProjectFloors } from '@/components/projects/shared';
import { updateProjectTask } from '@/redux/projectSlice';
import { useDispatch } from 'react-redux';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useColumnConfig } from '@/hooks/use-column-config';
import {
  PROJECT_DETAIL_BILLING_QC_JMR_COLUMNS,
  buildProjectDetailBillingQcFloorFilters,
  getStoredProjectDetailBillingQcJmrColumnConfig,
  saveStoredProjectDetailBillingQcJmrColumnConfig,
} from '@/components/projects/constants';
import {
  buildBillingQcJmrSnagInitialValues,
  fetchInteriorProductCategories,
} from '@/components/projects/snags/project-snag-helpers';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'certified', label: 'Certified' },
];

function formatInr(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹ 0';
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

function applyLocalJmrItemPatch(areas, itemId, patch) {
  return (Array.isArray(areas) ? areas : []).map((area) => ({
    ...area,
    categories: (area.categories ?? []).map((category) => ({
      ...category,
      items: (category.items ?? []).map((item) => {
        if (item.id !== itemId) return item;

        const next = { ...item, ...patch };
        if (patch.same_as_vendor === true) {
          next.length = Number(item.vendor_length) || 0;
          next.breadth = Number(item.vendor_breadth) || 0;
          next.height = Number(item.vendor_height) || 0;
          next.qty = Number(item.vendor_qty) || 0;
          next.same_as_vendor = true;
        } else if (
          ['length', 'breadth', 'height'].some((field) => field in patch) &&
          !areErItemDimensionsEmpty(next)
        ) {
          next.qty = computeErItemQtyFromDimensions(next.length, next.breadth, next.height);
        }

        const qty = Number(next.qty) || 0;
        const poRate = Number(next.po_rate_value ?? item.po_rate_value) || 0;
        const vendorAmount = Number(next.vendor_amount_value ?? item.vendor_amount_value) || 0;
        const amountValue = qty * poRate;
        next.amount_value = amountValue;
        next.amount = formatInr(amountValue);
        next.difference_value = amountValue - vendorAmount;
        next.difference = formatInr(amountValue - vendorAmount);
        return next;
      }),
    })),
  }));
}

export default function ProjectBillingQcJmrSection({ vendorId, projectId, projectDetail }) {
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [groupByRules, setGroupByRules] = useState(BILLING_QC_DEFAULT_GROUP_BY_RULES);
  const [categories, setCategories] = useState([]);
  const [isSnagDrawerOpen, setIsSnagDrawerOpen] = useState(false);
  const [snagInitialValues, setSnagInitialValues] = useState(null);
  const [snagInitialAttachments, setSnagInitialAttachments] = useState([]);
  const [activeSnagItemId, setActiveSnagItemId] = useState(null);
  const [activeSnagCount, setActiveSnagCount] = useState(0);
  const [itemSnagCounts, setItemSnagCounts] = useState({});
  const [completedCategoryIds, setCompletedCategoryIds] = useState(() => new Set());
  const [completedAreaIds, setCompletedAreaIds] = useState(() => new Set());
  const [isCertifyModalOpen, setIsCertifyModalOpen] = useState(false);
  const [seedAreas, setSeedAreas] = useState([]);
  const [mrStatus, setMrStatus] = useState(null);
  const [mrItemCount, setMrItemCount] = useState(0);
  const [gmrCertified, setGmrCertified] = useState(false);
  const [certification, setCertification] = useState(null);

  const columnConfig = useColumnConfig(
    'project-detail-billing-qc-jmr',
    PROJECT_DETAIL_BILLING_QC_JMR_COLUMNS,
    saveStoredProjectDetailBillingQcJmrColumnConfig,
    getStoredProjectDetailBillingQcJmrColumnConfig,
    { autoSave: true, debounce: 200, pinnedColumnId: 'subarea' },
  );

  const projectFloors = useMemo(() => parseProjectFloors(projectDetail), [projectDetail]);

  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;

    getBillingQcJmrDetail(vendorId)
      .then((response) => {
        if (cancelled) return;
        setSeedAreas(Array.isArray(response?.areas) ? response.areas : []);
        setMrStatus(response?.mrStatus ?? null);
        setMrItemCount(response?.mrItemCount ?? 0);
        setGmrCertified(Boolean(response?.gmrCertified));
        setCertification(response?.certification ?? null);
        const completedCategories = new Set();
        const completedAreas = new Set();
        (response?.areas ?? []).forEach((area) => {
          if (area.completed || area.isCompleted) completedAreas.add(area.id);
          (area.categories ?? []).forEach((category) => {
            if (category.completed) completedCategories.add(category.id);
          });
        });
        setCompletedCategoryIds(completedCategories);
        setCompletedAreaIds(completedAreas);
      })
      .catch((error) => showErrorToast(extractErrorMessage(error)));

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  useEffect(() => {
    fetchInteriorProductCategories()
      .then((rows) => setCategories(rows))
      .catch((error) => showErrorToast(extractErrorMessage(error)));
  }, []);

  const areaFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Areas' },
      ...(Array.isArray(seedAreas) ? seedAreas : []).map((area) => {
        const floorLabel = String(
          area?.floor_badge ?? area?.floorLabel ?? area?.floor ?? '',
        ).trim();
        return {
          value: area.id,
          label: floorLabel ? `${area.name} (${floorLabel})` : area.name,
        };
      }),
    ],
    [seedAreas],
  );
  const floorFilters = useMemo(
    () => buildProjectDetailBillingQcFloorFilters(seedAreas),
    [seedAreas],
  );

  const emptyStateMessage = useMemo(() => {
    if (mrStatus === 'draft' && mrItemCount > 0) {
      return `Vendor has not submitted MR yet (${mrItemCount} draft line${mrItemCount === 1 ? '' : 's'} seeded from PO). Ask the vendor to review measurements in Vendor Portal → Work Orders → MR tab → Submit.`;
    }
    if (mrStatus === 'draft') {
      return 'Waiting for vendor measurement submission. MR lines will appear here after the vendor submits from Vendor Portal → Work Orders.';
    }
    return 'No JMR records found.';
  }, [mrItemCount, mrStatus]);

  const areas = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sourceAreas = Array.isArray(seedAreas) ? seedAreas : [];

    return sourceAreas
      .filter((area) => areaFilter === 'all' || area.id === areaFilter)
      .filter((area) => floorFilter === 'all' || area.floor === floorFilter)
      .map((area) => {
        const sourceCategories = area.categories ?? [];
        const categories = sourceCategories
          .map((category) => ({
            ...category,
            isCompleted: completedCategoryIds.has(category.id) || Boolean(category.completed),
            items: (category.items ?? [])
              .filter((item) => {
                if (!query) return true;
                return [item.subarea, item.po_item, item.description, item.uom]
                  .filter(Boolean)
                  .some((value) => String(value).toLowerCase().includes(query));
              })
              .map((item) => ({
                ...item,
                snags_count: itemSnagCounts[item.id] ?? item.snags_count ?? 0,
              })),
          }))
          .filter((category) => !query || category.items.length > 0);

        const isAreaCompleted =
          sourceCategories.length === 0
            ? completedAreaIds.has(area.id) || Boolean(area.completed)
            : sourceCategories.every(
                (category) => completedCategoryIds.has(category.id) || Boolean(category.completed),
              );

        return {
          ...area,
          isCompleted: isAreaCompleted,
          categories,
        };
      })
      .filter((area) => {
        if (query) return area.categories.length > 0;
        return true;
      });
  }, [
    areaFilter,
    completedAreaIds,
    completedCategoryIds,
    floorFilter,
    itemSnagCounts,
    searchQuery,
    seedAreas,
  ]);

  const groupedAreas = useMemo(
    () => regroupBillingQcJmrAreas(areas, groupByRules),
    [areas, groupByRules],
  );

  const allAreasCompleted = useMemo(() => {
    const sourceAreas = Array.isArray(seedAreas) ? seedAreas : [];
    if (sourceAreas.length === 0) return false;

    return sourceAreas.every((area) => {
      const categories = area.categories ?? [];
      if (categories.length === 0) {
        return completedAreaIds.has(area.id);
      }
      return categories.every((category) => completedCategoryIds.has(category.id));
    });
  }, [completedAreaIds, completedCategoryIds, seedAreas]);

  const isGmrCertified = useMemo(() => {
    if (gmrCertified) return true;
    const sourceAreas = Array.isArray(seedAreas) ? seedAreas : [];
    const categories = sourceAreas.flatMap((area) => area.categories ?? []);
    return categories.length > 0 && categories.every((category) => Boolean(category.gmrCertified));
  }, [gmrCertified, seedAreas]);

  const openSnagDrawerForItem = useCallback(
    async ({ item, area, category, attachments = [] }) => {
      if (!projectId) {
        showErrorToast('Project is required to create a snag');
        return;
      }

      const itemId = item?.id ?? null;
      setActiveSnagItemId(itemId);
      setActiveSnagCount(itemSnagCounts[itemId] ?? item?.snags_count ?? 0);
      setSnagInitialAttachments(attachments);

      const fallbackInitialValues = buildBillingQcJmrSnagInitialValues({
        item,
        area,
        category,
        categories,
      });

      if (vendorId && itemId) {
        try {
          const response = await createSnagFromJmrItem(vendorId, itemId);
          const apiInitialValues = response?.initialValues ?? {};
          setSnagInitialValues({
            ...fallbackInitialValues,
            ...apiInitialValues,
            category: fallbackInitialValues.category || apiInitialValues.category || '',
            status: 'Yet to Start',
          });
        } catch {
          setSnagInitialValues(fallbackInitialValues);
        }
      } else {
        setSnagInitialValues(fallbackInitialValues);
      }

      setIsSnagDrawerOpen(true);
    },
    [categories, itemSnagCounts, projectId, vendorId],
  );

  const handleSnagClick = useCallback(
    ({ item, area, category }) => openSnagDrawerForItem({ item, area, category }),
    [openSnagDrawerForItem],
  );

  const handleSnagDrawerOpenChange = useCallback((nextOpen) => {
    setIsSnagDrawerOpen(nextOpen);
    if (!nextOpen) {
      setSnagInitialValues(null);
      setSnagInitialAttachments([]);
      setActiveSnagItemId(null);
      setActiveSnagCount(0);
    }
  }, []);

  const handleSnagCreated = useCallback(
    async (result) => {
      if (!activeSnagItemId) return;

      const taskId = result?.task_id ?? result?.name ?? null;
      let nextCount = activeSnagCount + 1;

      if (vendorId) {
        try {
          const response = await recordSnagOnJmrItem(vendorId, activeSnagItemId, taskId);
          if (Number.isFinite(Number(response?.snags_count))) {
            nextCount = Number(response.snags_count);
          }

          // Reload so Photo column shows snag attachment thumbnails.
          const refreshed = await getBillingQcJmrDetail(vendorId);
          if (Array.isArray(refreshed?.areas)) {
            setSeedAreas(refreshed.areas);
          }
        } catch (error) {
          showErrorToast(extractErrorMessage(error));
        }
      }

      setItemSnagCounts((previous) => ({
        ...previous,
        [activeSnagItemId]: nextCount,
      }));
    },
    [activeSnagCount, activeSnagItemId, vendorId],
  );

  const handleMarkCategoryComplete = useCallback(
    (categoryId) => {
      setCompletedCategoryIds((previous) => new Set([...previous, categoryId]));
      if (!vendorId) return;
      markJmrCategoryComplete(vendorId, categoryId, true).catch((error) =>
        showErrorToast(extractErrorMessage(error)),
      );
    },
    [vendorId],
  );

  const handleMarkAreaComplete = useCallback(
    (areaId) => {
      setCompletedAreaIds((previous) => new Set([...previous, areaId]));
      if (!vendorId) return;
      markJmrAreaComplete(vendorId, areaId, true).catch((error) =>
        showErrorToast(extractErrorMessage(error)),
      );
    },
    [vendorId],
  );

  const handleCertifyGmr = useCallback(
    async (sectionState) => {
      if (!vendorId) return;
      try {
        await certifyGmr(vendorId, {
          purchase_signature: sectionState.purchase?.signatureDataUrl,
          execution_signature: sectionState.execution?.signatureDataUrl,
          vendor_signature: sectionState.vendor?.signatureDataUrl,
          purchase_photo: sectionState.purchase?.photoUrl,
          execution_photo: sectionState.execution?.photoUrl,
          vendor_photo: sectionState.vendor?.photoUrl,
        });
        showSuccessToast('GMR certified successfully.');
        setIsCertifyModalOpen(false);
        const refreshed = await getBillingQcJmrDetail(vendorId);
        setSeedAreas(Array.isArray(refreshed?.areas) ? refreshed.areas : []);
        setGmrCertified(Boolean(refreshed?.gmrCertified ?? true));
        setCertification(refreshed?.certification ?? null);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [vendorId],
  );

  const persistJmrItem = useCallback(
    async (item, payload) => {
      if (!vendorId || !item?.id) return;
      setSeedAreas((previous) => applyLocalJmrItemPatch(previous, item.id, payload));
      try {
        const response = await updateJmrItem(vendorId, item.id, payload);
        if (Array.isArray(response?.areas)) {
          setSeedAreas(response.areas);
        }
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
        try {
          const refreshed = await getBillingQcJmrDetail(vendorId);
          setSeedAreas(Array.isArray(refreshed?.areas) ? refreshed.areas : []);
        } catch {
          // Keep optimistic state if reload also fails.
        }
      }
    },
    [vendorId],
  );

  const handleFieldCommit = useCallback(
    (item, patch) => {
      persistJmrItem(item, patch);
    },
    [persistJmrItem],
  );

  const handleSameAsVendorChange = useCallback(
    (item, checked) => {
      persistJmrItem(item, { same_as_vendor: checked });
    },
    [persistJmrItem],
  );

  const handlePhotoChange = useCallback(
    async (item, files, context = {}) => {
      const fileList = (Array.isArray(files) ? files : [files]).filter(
        (file) => file instanceof File,
      );
      if (fileList.length === 0) return;

      const { validFiles, errorMessage } = mapFilesToAttachmentRows(fileList);
      if (errorMessage) {
        showErrorToast(errorMessage);
      }
      if (validFiles.length === 0) return;

      const existingTaskIds = Array.isArray(item?.snag_tasks)
        ? item.snag_tasks.filter(Boolean)
        : String(item?.snag_tasks ?? '')
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean);
      const existingTaskId = existingTaskIds[existingTaskIds.length - 1] ?? null;

      // Existing snag: append photos to that snag's attachments.
      if (existingTaskId) {
        try {
          await dispatch(
            updateProjectTask(buildProjectTaskUploadFilesFormData(existingTaskId, validFiles)),
          ).unwrap();

          const existingPhotos = Array.isArray(item.photos)
            ? item.photos.filter(Boolean)
            : item.photo
              ? [item.photo]
              : [];
          const localPreviewUrls = validFiles
            .map((row) => (row.file ? URL.createObjectURL(row.file) : null))
            .filter(Boolean);
          const nextPhotos = [...existingPhotos, ...localPreviewUrls];

          setSeedAreas((previous) =>
            applyLocalJmrItemPatch(previous, item.id, {
              has_photo: true,
              photo: nextPhotos[0] ?? '',
              photos: nextPhotos,
            }),
          );

          if (vendorId) {
            const refreshed = await getBillingQcJmrDetail(vendorId);
            setSeedAreas(Array.isArray(refreshed?.areas) ? refreshed.areas : []);
          }

          showSuccessToast(
            validFiles.length === 1
              ? 'Photo added to snag attachments'
              : 'Photos added to snag attachments',
          );
        } catch (error) {
          showErrorToast(extractErrorMessage(error));
          throw error;
        }
        return;
      }

      // No snag yet: open Create Snag with these files as attachments.
      await openSnagDrawerForItem({
        item,
        area: context.area,
        category: context.category,
        attachments: validFiles,
      });
    },
    [dispatch, openSnagDrawerForItem, vendorId],
  );

  return (
    <>
      <div className='flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden'>
        <div className='flex shrink-0 flex-col gap-3'>
          <div className='flex w-full min-w-0 items-center justify-between gap-3'>
            <div className='w-[370px] shrink-0'>
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

            <div className='flex min-w-0 flex-1 items-center justify-end gap-3'>
              <div className='shrink-0'>
                <SearchableSelect
                  variant='compact'
                  size='xsmall'
                  value={areaFilter}
                  onValueChange={setAreaFilter}
                  options={areaFilterOptions}
                  placeholder='All Areas'
                  searchPlaceholder='Search areas...'
                  emptyMessage='No areas available'
                  noResultsMessage='No areas found'
                  showArrow
                  triggerClassName='w-[120px]'
                  contentClassName='min-w-[280px] max-w-[min(100vw-2rem,400px)]'
                />
              </div>

              <div className='shrink-0'>
                <Select.Root
                  variant='compact'
                  size='xsmall'
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <Select.Trigger className='w-[120px]'>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {STATUS_FILTER_OPTIONS.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <AumMultiGroupByDropdown
                rules={groupByRules}
                onChange={setGroupByRules}
                fieldOptions={BILLING_QC_GROUP_BY_OPTIONS}
                starterField={BILLING_QC_GROUP_BY_FIELD_IDS.AREA}
              />

              <ColumnManagerDropdown
                open={isColumnManagerOpen}
                onOpenChange={setIsColumnManagerOpen}
                config={columnConfig}
                pinnedColumnId='subarea'
                tooltipContent={<p>Manage columns</p>}
                trigger={
                  <Button.Root
                    variant='neutral'
                    mode='stroke'
                    size='xsmall'
                    className='shrink-0'
                    aria-label='Manage columns'
                  >
                    <Button.Icon as={RiLayoutColumnLine} />
                  </Button.Root>
                }
              />

              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='shrink-0'
                aria-label='Download'
              >
                <Button.Icon as={RiDownloadLine} />
              </Button.Root>

              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='shrink-0'
                aria-label='Copy link'
              >
                <Button.Icon as={RiLinkM} />
              </Button.Root>

              <Button.Root
                variant='primary'
                mode='filled'
                size='xsmall'
                className='shrink-0'
                disabled={!allAreasCompleted}
                onClick={() => setIsCertifyModalOpen(true)}
              >
                {isGmrCertified ? 'GMR Certified' : 'Certify GMR'}
              </Button.Root>
            </div>
          </div>

          <ButtonGroup.Root size='xsmall' className='w-fit shrink-0'>
            {floorFilters.map((filter) => {
              const isActive = floorFilter === filter.id;
              return (
                <ButtonGroup.Item
                  key={filter.id}
                  data-state={isActive ? 'on' : 'off'}
                  onClick={() => setFloorFilter(filter.id)}
                  className={cn(
                    isActive &&
                      'z-[1] bg-primary-alpha-10 text-primary-base ring-primary-base hover:bg-primary-alpha-10',
                  )}
                >
                  {filter.label}
                </ButtonGroup.Item>
              );
            })}
          </ButtonGroup.Root>

          <div className='h-px w-full bg-[#E8E9ED] opacity-30' />
        </div>

        <div className='min-h-0 flex-1 overflow-auto'>
          <div className='min-w-max pb-6'>
            <ProjectBillingQcJmrTable
              areas={groupedAreas}
              columnConfig={columnConfig.columns}
              onSnagClick={handleSnagClick}
              onPhotoChange={handlePhotoChange}
              onMarkCategoryComplete={handleMarkCategoryComplete}
              onMarkAreaComplete={handleMarkAreaComplete}
              onFieldCommit={handleFieldCommit}
              onSameAsVendorChange={handleSameAsVendorChange}
              emptyStateMessage={emptyStateMessage}
            />
          </div>
        </div>
      </div>

      <ProjectBillingQcCertifyGmrModal
        open={isCertifyModalOpen}
        onOpenChange={setIsCertifyModalOpen}
        onCertify={handleCertifyGmr}
        certification={certification}
      />

      <ProjectSnagCreateDrawer
        open={isSnagDrawerOpen}
        onOpenChange={handleSnagDrawerOpenChange}
        projectId={projectId}
        categories={categories}
        projectFloors={projectFloors}
        initialValues={snagInitialValues}
        initialAttachments={snagInitialAttachments}
        onCreated={handleSnagCreated}
      />
    </>
  );
}
