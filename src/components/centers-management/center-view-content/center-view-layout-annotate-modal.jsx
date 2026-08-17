import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiLayoutGridLine } from 'react-icons/ri';

import { FloorPlanEditor } from '@/components/floor-plan-editor';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import { fetchSpacesWithLayoutCoordinates } from '@/redux/spaceSlice';
import {
  clearLayoutCoordinate,
  fetchLayoutDetail,
  saveLayoutCoordinates,
} from '@/redux/layoutSlice';
import {
  getLayoutAnnotationStorageKey,
  readLayoutAnnotationsFromStorage,
  writeLayoutAnnotationsToStorage,
} from '@/utils/layout-annotation-storage';
import {
  buildAnnotationSpaceFromListRow,
  findSpaceRowForAssociation,
  mergeLocalAnnotationsWithLayoutDetail,
} from '@/utils/layout-annotation-space';
import { cn } from '@/utils/cn';
import { annotationToLayoutCoordinate } from '@/utils/layout-coordinate-payload';

function isRasterLayoutFile(f) {
  if (!f) return false;
  const type = (f.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp)$/i.test(f.name || '');
}

const SHAPE_COORD_KEYS = [
  'type',
  'x',
  'y',
  'width',
  'height',
  'points',
  'bezierPoints',
  'closed',
  'id',
  'label',
  'visible',
  'locked',
];

function toCleanShapeCoord(ann) {
  const result = {};
  for (const key of SHAPE_COORD_KEYS) {
    if (ann[key] !== undefined) result[key] = ann[key];
  }
  return result;
}

/**
 * Full-screen-friendly modal: floor plan preview + Konva annotation editor.
 * Opens after the user completes floor + file selection in Add Layout.
 */
const CenterViewLayoutAnnotateModal = ({
  open,
  onOpenChange,
  floor = '',
  file = null,
  sourceUrl = '',
  layoutId = '',
  layoutName = '',
  initialAnnotations = [],
  centerName = '',
  onSave,
}) => {
  const dispatch = useDispatch();
  const spacesData = useSelector((state) => state.space?.spaceListData?.data ?? []);
  const isSavingLayoutCoordinates = useSelector(
    (state) =>
      Boolean(state.layout?.saveLayoutCoordinates?.isLoading) ||
      Boolean(state.layout?.clearLayoutCoordinate?.isLoading),
  );

  const [layoutImage, setLayoutImage] = useState(null);
  const [layoutAnnotations, setLayoutAnnotations] = useState([]);
  const [associateModalOpen, setAssociateModalOpen] = useState(false);
  const [selectedAnnotationForSave, setSelectedAnnotationForSave] = useState(null);
  const [selectedSpaceRef, setSelectedSpaceRef] = useState('');
  const imageIdentity = useMemo(() => {
    if (file) return file;
    if (!layoutId && !sourceUrl) return null;
    return { name: layoutId || sourceUrl, size: 0, lastModified: 0 };
  }, [file, layoutId, sourceUrl]);

  const persistedAnnotationsForSession = useMemo(() => {
    if (!open || !imageIdentity) return [];
    if (layoutId) {
      return Array.isArray(initialAnnotations) ? initialAnnotations : [];
    }
    const key = getLayoutAnnotationStorageKey(centerName, floor, imageIdentity);
    if (!key) return [];
    const payload = readLayoutAnnotationsFromStorage(key);
    if (payload?.annotations?.length) return payload.annotations;
    return Array.isArray(initialAnnotations) ? initialAnnotations : [];
  }, [open, imageIdentity, centerName, floor, initialAnnotations, layoutId]);

  useEffect(() => {
    if (!associateModalOpen) return;
    const floorValue = String(floor ?? '').trim();
    if (!floorValue) return;
    dispatch(
      fetchSpacesWithLayoutCoordinates({
        floor: floorValue,
      }),
    );
  }, [associateModalOpen, dispatch, floor]);

  useEffect(() => {
    if (!open || (!file && !sourceUrl) || (file && !isRasterLayoutFile(file))) {
      setLayoutImage(null);
      setLayoutAnnotations([]);
      return undefined;
    }

    const url = file ? URL.createObjectURL(file) : sourceUrl;
    const img = new Image();
    const onLoad = () => {
      if (img.naturalWidth > 0) setLayoutImage(img);
    };
    img.addEventListener('load', onLoad);
    img.addEventListener('error', () => setLayoutImage(null));
    img.src = url;

    return () => {
      img.removeEventListener('load', onLoad);
      if (file) URL.revokeObjectURL(url);
      setLayoutImage(null);
      setLayoutAnnotations([]);
    };
  }, [open, file, sourceUrl]);

  const handleSaveLayout = useCallback(() => {
    if (!floor || !imageIdentity) return;
    const key = getLayoutAnnotationStorageKey(centerName, floor, imageIdentity);
    if (key) {
      writeLayoutAnnotationsToStorage(key, layoutAnnotations);
    }
    onSave?.({ floor, file, layoutId, annotations: layoutAnnotations });
    onOpenChange(false);
  }, [centerName, floor, imageIdentity, layoutAnnotations, onOpenChange, onSave, file, layoutId]);

  const canSave = Boolean(floor && imageIdentity && layoutImage);
  const fileKey = imageIdentity
    ? `${imageIdentity.name}-${imageIdentity.size}-${imageIdentity.lastModified}`
    : 'layout';
  const annotationVersionKey = useMemo(
    () =>
      Array.isArray(persistedAnnotationsForSession)
        ? persistedAnnotationsForSession.map((a) => a?.id || '').join('|')
        : '',
    [persistedAnnotationsForSession],
  );

  const floorSummary = useMemo(() => {
    if (!floor) return '';
    return floor;
  }, [floor]);

  const spaceOptions = useMemo(() => {
    const list = Array.isArray(spacesData) ? spacesData : [];
    return list
      .map((item) => {
        const value = item?.id || item?.name || '';
        const label = item?.spaceName || item?.inventory_name || item?.name || '';
        if (!value || !label) return null;
        return { value: String(value), label: String(label) };
      })
      .filter(Boolean);
  }, [spacesData]);

  const handleSaveShapeAssociation = useCallback(async () => {
    if (!layoutId || !selectedAnnotationForSave || !selectedSpaceRef) return;

    const targetAnn = selectedAnnotationForSave;
    const selectedRef = selectedSpaceRef;
    const row = findSpaceRowForAssociation(spacesData, selectedRef);
    const normalizedSpace = row ? buildAnnotationSpaceFromListRow(row) : null;

    setLayoutAnnotations((prev) =>
      prev.map((a) =>
        a.id === targetAnn.id
          ? { ...a, space_ref: selectedRef, space: normalizedSpace ?? a.space }
          : a,
      ),
    );

    const layoutCoordinate = annotationToLayoutCoordinate(
      toCleanShapeCoord(selectedAnnotationForSave),
    );
    if (!layoutCoordinate) return;

    const previousSpace = String(targetAnn.space_ref || '').trim();
    const nextSpace = String(selectedRef).trim();
    if (previousSpace && previousSpace !== nextSpace) {
      await dispatch(
        clearLayoutCoordinate({
          spaceId: previousSpace,
          floorRef: String(layoutId).trim(),
        }),
      );
    }

    const action = await dispatch(
      saveLayoutCoordinates({
        floorRef: layoutId,
        items: [{ space_id: nextSpace, layout_coordinate: layoutCoordinate }],
      }),
    );
    if (saveLayoutCoordinates.fulfilled.match(action)) {
      setLayoutAnnotations((prev) =>
        prev.map((a) =>
          a.id === targetAnn.id
            ? {
                ...a,
                hasCoordinateOnServer: true,
                space_ref: selectedRef,
                space: normalizedSpace ?? a.space,
              }
            : a,
        ),
      );
      const detailAction = await dispatch(fetchLayoutDetail({ floorRef: layoutId }));
      if (fetchLayoutDetail.fulfilled.match(detailAction)) {
        setLayoutAnnotations((prev) =>
          mergeLocalAnnotationsWithLayoutDetail(prev, detailAction.payload),
        );
      }
      setAssociateModalOpen(false);
      setSelectedAnnotationForSave(null);
      setSelectedSpaceRef('');
    } else {
      setLayoutAnnotations((prev) => prev.map((a) => (a.id === targetAnn.id ? targetAnn : a)));
    }
  }, [dispatch, layoutId, selectedAnnotationForSave, selectedSpaceRef, spacesData]);

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className={cn(
          'flex max-h-[min(96vh,1200px)] max-w-[min(100vw-1rem,80rem)] flex-col overflow-hidden',
        )}
      >
        <Modal.Header
          title='Annotate layout'
          description='Mark spaces, paths, and points on the floor plan. Coordinates are saved relative to the image (see docs/layout-annotation.md).'
          icon={RiLayoutGridLine}
        />
        <Modal.Body className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-2'>
          <div className='flex flex-wrap items-center gap-x-6 gap-y-1 text-paragraph-sm'>
            <span className='text-text-sub-600'>
              Floor: <span className='font-medium text-text-strong-950'>{floorSummary || '—'}</span>
            </span>
            <span className='text-text-sub-600'>
              File:{' '}
              <span className='font-medium text-text-strong-950' title={layoutName || file?.name}>
                {layoutName || file?.name || layoutId || '—'}
              </span>
            </span>
          </div>

          {layoutImage ? (
            <div
              className='flex min-h-[min(60vh,720px)] min-h-0 flex-col gap-2'
              aria-label='Annotation canvas'
            >
              <FloorPlanEditor
                key={`${fileKey}-${floor}-${centerName}-${annotationVersionKey}`}
                layoutId={layoutId}
                image={{
                  url: layoutImage.src,
                  width: layoutImage.naturalWidth,
                  height: layoutImage.naturalHeight,
                  raster: layoutImage,
                }}
                defaultAnnotations={persistedAnnotationsForSession}
                onAnnotationsChange={setLayoutAnnotations}
                resetKey={`${fileKey}-${floor}-${centerName}-${annotationVersionKey}`}
                topSlot={(ctx) =>
                  ctx.activeToolId === 'select' && ctx.primarySelectedAnnotation ? (
                    <Button.Root
                      type='button'
                      size='small'
                      variant='primary'
                      mode={ctx.primarySelectedAnnotation?.space_ref ? 'stroke' : 'filled'}
                      disabled={isSavingLayoutCoordinates}
                      className='gap-1.5'
                      onClick={() => {
                        setSelectedAnnotationForSave(ctx.primarySelectedAnnotation);
                        setSelectedSpaceRef(ctx.primarySelectedAnnotation?.space_ref || '');
                        setAssociateModalOpen(true);
                      }}
                    >
                      {ctx.primarySelectedAnnotation?.space_ref
                        ? 'Edit association'
                        : 'Associate space'}
                    </Button.Root>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className='flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
              {open && (file || sourceUrl) && (file ? isRasterLayoutFile(file) : true)
                ? 'Loading image preview…'
                : 'No image to annotate.'}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className='flex-shrink-0 justify-end gap-2 sm:justify-between'>
          <Modal.Close asChild>
            <Button.Root
              className='w-full sm:max-w-[200px]'
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
            >
              Cancel
            </Button.Root>
          </Modal.Close>
          <Button.Root
            type='button'
            className='w-full sm:max-w-[200px]'
            variant='primary'
            mode='filled'
            size='small'
            disabled={!canSave}
            onClick={handleSaveLayout}
          >
            Save layout
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>

      <Modal.Root
        open={associateModalOpen}
        onOpenChange={(nextOpen) => {
          setAssociateModalOpen(nextOpen);
          if (!nextOpen) {
            setSelectedAnnotationForSave(null);
            setSelectedSpaceRef('');
          }
        }}
      >
        <Modal.Content className='max-w-[560px]'>
          <Modal.Header
            title='Associate Space'
            description='Associate an existing space or create a new one.'
          />
          <Modal.Body className='flex flex-col gap-3 pt-2'>
            <Label.Root>
              Space
              <Label.Asterisk className='text-red-500' />
            </Label.Root>
            <Select.Root value={selectedSpaceRef} onValueChange={setSelectedSpaceRef}>
              <Select.Trigger className='w-full'>
                <Select.Value placeholder='Select' />
              </Select.Trigger>
              <Select.Content>
                {spaceOptions.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Modal.Body>
          <Modal.Footer className='justify-end gap-2 sm:justify-between'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='w-full'
              disabled={isSavingLayoutCoordinates}
              onClick={() => setAssociateModalOpen(false)}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              className='w-full'
              disabled={!selectedSpaceRef || isSavingLayoutCoordinates}
              onClick={handleSaveShapeAssociation}
            >
              {isSavingLayoutCoordinates ? 'Saving...' : 'Save'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Modal.Root>
  );
};

export default CenterViewLayoutAnnotateModal;
