import React, { memo } from 'react';
import { RiCloseLine } from 'react-icons/ri';

import BoqErEstimationAreasPanel from '@/components/boq/shared/boq-er-estimation-areas-panel';
import {
  buildErAreasForFloor,
  buildErFloorQuantityLabel,
  buildQuantityByFloorFromEstimationRecords,
  hasIncompleteMeasurementLineItems,
  matchErAreaFromLayoutAnnotation,
  mergeEstimationRecord,
} from '@/components/boq/shared/boq-er-estimation-areas-utils';
import { buildBoqTemplateQuantityLabel } from '@/components/boq/boq-templates/components/boq-template-products-utils';
import BoqErEstimationFloorPanel from '@/components/boq/shared/boq-er-estimation-floor-panel';
import BoqErEstimationFloorTabs from '@/components/boq/shared/boq-er-estimation-floor-tabs';
import BoqErEstimationProductPanel from '@/components/boq/shared/boq-er-estimation-product-panel';
import {
  BOQ_ER_LINE_ITEM_UPDATED_TOAST,
  BOQ_ER_VIEW_MODES,
} from '@/components/boq/shared/boq-er-estimation-constants';
import { BOQ_ER_STATUS, isBoqErReadOnly } from '@/components/boq/shared/boq-er-utils';
import ProjectGlobalLayoutTaskViewHost from '@/components/projects/global-layout/project-global-layout-task-view-host';
import {
  addBoqEstimationRecordItem,
  deleteBoqEstimationRecordItem,
  duplicateBoqEstimationRecordItem,
  initBoqEstimationDraft,
  updateBoqEstimationRecordItem,
} from '@/api/projectBoqs';
import { getProjectFloorLayoutBundle } from '@/api/projectLayout';
import { deleteProjectTask } from '@/api/projectTasks';
import { normalizeProjectFloorLayoutBundle } from '@/components/projects/global-layout/project-global-layout-helpers';
import * as CompactButton from '@/components/ui/compact-button';
import * as Modal from '@/components/ui/modal';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

const normalizeFloors = (projectFloors = []) =>
  projectFloors
    .map((floor) =>
      typeof floor === 'string' ? floor : floor.label || floor.name || floor.floor || '',
    )
    .map((floor) => String(floor).trim())
    .filter(Boolean);

const BoqErEstimationModal = ({
  open,
  onOpenChange,
  onErQuantitiesCommit,
  product = null,
  boqCode = '',
  projectId = '',
  erStatus = BOQ_ER_STATUS.START,
  onErStatusChange,
  erStatusDisabled = false,
  projectFloors = [],
  projectAreas = [],
}) => {
  const floors = React.useMemo(() => normalizeFloors(projectFloors), [projectFloors]);

  const [activeFloorIndex, setActiveFloorIndex] = React.useState(0);
  const [viewMode, setViewMode] = React.useState(BOQ_ER_VIEW_MODES.THREED);
  const [modalErStatus, setModalErStatus] = React.useState(erStatus);
  const [estimationRecords, setEstimationRecords] = React.useState([]);
  const [isLoadingAreas, setIsLoadingAreas] = React.useState(false);
  const [isAddingItem, setIsAddingItem] = React.useState(false);
  const [savingItemId, setSavingItemId] = React.useState(null);
  const [actingItemId, setActingItemId] = React.useState(null);
  const [floorLayout, setFloorLayout] = React.useState(null);
  const [isFloorLayoutLoading, setIsFloorLayoutLoading] = React.useState(false);
  const [focusedAreaId, setFocusedAreaId] = React.useState(null);
  const [focusNonce, setFocusNonce] = React.useState(0);
  const [viewTask, setViewTask] = React.useState(null);

  const activeFloor = floors[activeFloorIndex] ?? floors[0] ?? '';

  const areas = React.useMemo(
    () => buildErAreasForFloor(estimationRecords, activeFloor, product, projectAreas),
    [activeFloor, estimationRecords, product, projectAreas],
  );

  const activeFloorQuantityLabel = React.useMemo(
    () => buildErFloorQuantityLabel(activeFloor, estimationRecords, product),
    [activeFloor, estimationRecords, product],
  );

  const commitErQuantitiesToProductTable = React.useCallback(() => {
    if (!product?.id || typeof onErQuantitiesCommit !== 'function') return;
    // Avoid overwriting the table with zeros if the modal closes before ER records load.
    if (!Array.isArray(estimationRecords) || estimationRecords.length === 0) return;
    const quantityByFloor = buildQuantityByFloorFromEstimationRecords(
      estimationRecords,
      floors,
      product,
    );
    onErQuantitiesCommit({
      productId: product.id,
      quantityByFloor,
      quantity: buildBoqTemplateQuantityLabel(quantityByFloor),
    });
  }, [estimationRecords, floors, onErQuantitiesCommit, product]);

  const handleOpenChange = React.useCallback(
    (nextOpen) => {
      if (!nextOpen && open) {
        commitErQuantitiesToProductTable();
      }
      onOpenChange?.(nextOpen);
    },
    [commitErQuantitiesToProductTable, onOpenChange, open],
  );

  // Reset local UI state when opening a different product (not on every status change —
  // status updates go through handleErStatusChange which reloads records itself).
  React.useEffect(() => {
    if (!open) return;
    setActiveFloorIndex(0);
    setViewMode(BOQ_ER_VIEW_MODES.LAYOUT);
    setModalErStatus(erStatus);
    setEstimationRecords([]);
    setSavingItemId(null);
    setActingItemId(null);
    setFloorLayout(null);
    setIsFloorLayoutLoading(false);
    setFocusedAreaId(null);
    setFocusNonce(0);
    setViewTask(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- erStatus synced below
  }, [open, product?.id]);

  React.useEffect(() => {
    if (!open) return;
    setModalErStatus(erStatus);
  }, [open, erStatus]);

  React.useEffect(() => {
    if (!open || !product?.id || !boqCode || floors.length === 0) return undefined;

    let cancelled = false;

    const initializeEstimationRecords = async () => {
      setIsLoadingAreas(true);
      try {
        const result = await initBoqEstimationDraft(boqCode, {
          rowName: product.id,
          erStatus: erStatus || BOQ_ER_STATUS.DRAFT,
          floors,
        });
        if (!cancelled) {
          setEstimationRecords(Array.isArray(result?.records) ? result.records : []);
        }
      } catch (error) {
        if (!cancelled) {
          showErrorToast(error, {
            defaultMessage: 'Failed to initialize BOQ estimation records.',
          });
          setEstimationRecords([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAreas(false);
        }
      }
    };

    initializeEstimationRecords();

    return () => {
      cancelled = true;
    };
    // Intentionally omit erStatus — status changes go through handleErStatusChange
    // to avoid concurrent init calls that deadlock Project BOQ Item updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- erStatus handled separately
  }, [open, product?.id, boqCode, floors]);

  React.useEffect(() => {
    const project = String(projectId ?? '').trim();
    const floor = String(activeFloor ?? '').trim();

    if (!open || !project || !floor) {
      setFloorLayout(null);
      setIsFloorLayoutLoading(false);
      return undefined;
    }

    let cancelled = false;
    setFloorLayout(null);
    setIsFloorLayoutLoading(true);

    getProjectFloorLayoutBundle({ project, floor })
      .then((message) => {
        if (cancelled) return;
        const bundle = normalizeProjectFloorLayoutBundle(message);
        setFloorLayout(bundle.floor);
      })
      .catch(() => {
        if (!cancelled) {
          setFloorLayout(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsFloorLayoutLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeFloor, open, projectId]);

  const handleErStatusChange = React.useCallback(
    async (nextStatus) => {
      if (erStatusDisabled) return;

      setModalErStatus(nextStatus);
      onErStatusChange?.(nextStatus);

      if (!product?.id || !boqCode || floors.length === 0) return;

      setIsLoadingAreas(true);
      try {
        const result = await initBoqEstimationDraft(boqCode, {
          rowName: product.id,
          erStatus: nextStatus,
          floors,
        });
        setEstimationRecords(Array.isArray(result?.records) ? result.records : []);
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to update BOQ estimation records.',
        });
      } finally {
        setIsLoadingAreas(false);
      }
    },
    [boqCode, erStatusDisabled, floors, onErStatusChange, product?.id],
  );

  const reloadFloorLayout = React.useCallback(async () => {
    const project = String(projectId ?? '').trim();
    const floor = String(activeFloor ?? '').trim();
    if (!project || !floor) return;

    try {
      const message = await getProjectFloorLayoutBundle({ project, floor });
      const bundle = normalizeProjectFloorLayoutBundle(message);
      setFloorLayout(bundle.floor);
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to refresh floor layout.',
      });
    }
  }, [activeFloor, projectId]);

  const handleFloorChange = React.useCallback(
    (nextIndex) => {
      setFocusedAreaId(null);
      setFocusNonce(0);
      setViewTask(null);
      setActiveFloorIndex(Math.max(0, Math.min(nextIndex, floors.length - 1)));
    },
    [floors.length],
  );

  const handleLayoutAreaSelect = React.useCallback(
    (annotation) => {
      const matchedArea = matchErAreaFromLayoutAnnotation(areas, annotation);
      if (!matchedArea?.id) return;

      setFocusedAreaId(matchedArea.id);
      setFocusNonce((current) => current + 1);
    },
    [areas],
  );

  const handleViewTask = React.useCallback((task) => {
    if (!task) return;
    setViewTask(task);
  }, []);

  const handleDeleteTask = React.useCallback(
    async (task) => {
      const taskId = String(task?.task_id ?? task?.name ?? '').trim();
      if (!taskId) {
        showErrorToast(null, { defaultMessage: 'Task ID is required' });
        return false;
      }

      try {
        const result = await deleteProjectTask(taskId);
        showSuccessToast(result?.message ?? 'Task deleted successfully');

        if (String(viewTask?.task_id ?? viewTask?.name ?? '').trim() === taskId) {
          setViewTask(null);
        }

        await reloadFloorLayout();
        return true;
      } catch (error) {
        showErrorToast(extractErrorMessage(error, 'Failed to delete task'));
        return false;
      }
    },
    [reloadFloorLayout, viewTask],
  );

  const isErReadOnly = isBoqErReadOnly(modalErStatus);

  const handleAddItem = React.useCallback(
    async (area) => {
      if (isBoqErReadOnly(modalErStatus) || !product?.id || !boqCode || !area?.areaLabel) return;

      if (hasIncompleteMeasurementLineItems(area.items)) {
        showErrorToast('Complete the existing line item before adding another.');
        return;
      }

      setIsAddingItem(true);
      try {
        const result = await addBoqEstimationRecordItem(boqCode, {
          rowName: product.id,
          floor: area.floor || activeFloor,
          areaLabel: area.areaLabel || area.name,
          areaType: '',
        });

        if (result?.record) {
          setEstimationRecords((current) => mergeEstimationRecord(current, result.record));
          showSuccessToast(BOQ_ER_LINE_ITEM_UPDATED_TOAST);
        }
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to add estimation item.',
        });
      } finally {
        setIsAddingItem(false);
      }
    },
    [activeFloor, boqCode, modalErStatus, product?.id],
  );

  const handleItemLinePersist = React.useCallback(
    async (payload) => {
      if (isBoqErReadOnly(modalErStatus) || !boqCode || !payload?.recordName || !payload?.itemName)
        return;

      setSavingItemId(payload.itemName);
      try {
        const result = await updateBoqEstimationRecordItem(boqCode, payload);

        if (result?.record) {
          setEstimationRecords((current) => mergeEstimationRecord(current, result.record));
          showSuccessToast(BOQ_ER_LINE_ITEM_UPDATED_TOAST);
        }
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to save estimation item.',
        });
      } finally {
        setSavingItemId(null);
      }
    },
    [boqCode, modalErStatus],
  );

  const handleDuplicateItem = React.useCallback(
    async (item) => {
      if (isBoqErReadOnly(modalErStatus) || !boqCode || !item?.recordName || !item?.id) return;

      setActingItemId(item.id);
      try {
        const result = await duplicateBoqEstimationRecordItem(boqCode, {
          recordName: item.recordName,
          itemName: item.id,
        });

        if (result?.record) {
          setEstimationRecords((current) => mergeEstimationRecord(current, result.record));
        }
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to duplicate estimation item.',
        });
      } finally {
        setActingItemId(null);
      }
    },
    [boqCode, modalErStatus],
  );

  const handleDeleteItem = React.useCallback(
    async (item) => {
      if (isBoqErReadOnly(modalErStatus) || !boqCode || !item?.recordName || !item?.id) return;

      setActingItemId(item.id);
      try {
        const result = await deleteBoqEstimationRecordItem(boqCode, {
          recordName: item.recordName,
          itemName: item.id,
        });

        if (result?.record) {
          setEstimationRecords((current) => mergeEstimationRecord(current, result.record));
        }
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to delete estimation item.',
        });
      } finally {
        setActingItemId(null);
      }
    },
    [boqCode, modalErStatus],
  );

  if (!product) return null;

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content
        className='flex h-[95dvh] max-h-[95dvh] w-full max-w-[100vw] flex-col overflow-hidden rounded-none p-0'
        showClose={false}
        overlayClassName='p-0'
      >
        <div className='flex h-full min-h-0 w-full flex-1 overflow-hidden'>
          <BoqErEstimationFloorPanel
            floors={floors}
            activeFloorIndex={activeFloorIndex}
            activeFloorLabel={activeFloor}
            onFloorChange={handleFloorChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            floorLayout={floorLayout}
            isFloorLayoutLoading={isFloorLayoutLoading}
            onLayoutAreaSelect={handleLayoutAreaSelect}
            onViewTask={handleViewTask}
            onDeleteTask={handleDeleteTask}
          />

          <div className='relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-stroke-soft-200 bg-bg-white-0'>
            <Modal.Close asChild>
              <CompactButton.Root
                variant='ghost'
                size='medium'
                className='absolute right-3 top-3 z-10'
                aria-label='Close estimation modal'
              >
                <CompactButton.Icon as={RiCloseLine} />
              </CompactButton.Root>
            </Modal.Close>

            <div className='min-h-0 flex-1 overflow-y-auto'>
              <BoqErEstimationProductPanel
                product={product}
                quantityLabel={activeFloorQuantityLabel}
                erStatus={modalErStatus}
                onErStatusChange={handleErStatusChange}
                erStatusDisabled={erStatusDisabled}
              />

              {floors.length > 0 ? (
                <BoqErEstimationFloorTabs
                  floors={floors}
                  activeFloorIndex={activeFloorIndex}
                  onFloorChange={handleFloorChange}
                />
              ) : (
                <div className='border-b border-t border-stroke-soft-200 px-8 py-3 text-[14px] text-text-soft-400'>
                  No floors found for this project.
                </div>
              )}

              <BoqErEstimationAreasPanel
                areas={areas}
                isLoading={isLoadingAreas}
                isAddingItem={isAddingItem}
                savingItemId={savingItemId}
                actingItemId={actingItemId}
                focusedAreaId={focusedAreaId}
                focusNonce={focusNonce}
                readOnly={isErReadOnly}
                onAddItem={isErReadOnly ? undefined : handleAddItem}
                onItemLinePersist={isErReadOnly ? undefined : handleItemLinePersist}
                onDuplicateItem={isErReadOnly ? undefined : handleDuplicateItem}
                onDeleteItem={isErReadOnly ? undefined : handleDeleteItem}
              />
            </div>
          </div>
        </div>
      </Modal.Content>

      <ProjectGlobalLayoutTaskViewHost
        task={viewTask}
        projectId={projectId}
        projectFloors={projectFloors}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setViewTask(null);
        }}
        onUpdated={reloadFloorLayout}
      />
    </Modal.Root>
  );
};

export default memo(BoqErEstimationModal);
