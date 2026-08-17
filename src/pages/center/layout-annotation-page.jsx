import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  TOOL_IDS,
  findAssociatedSpaceRegionAt,
  isNormalizedPointInAssociatedSpaceShape,
} from '@/components/floor-plan-editor';
import * as Tooltip from '@/components/ui/tooltip';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import { RiAlertFill } from 'react-icons/ri';
import { getCenterDetailsThunk } from '@/redux/centerSlice';
import {
  clearLayoutCoordinate,
  clearLayoutDetail,
  deleteSubSpace,
  fetchLayoutDetail,
  saveLayoutCoordinates,
  saveSubSpaceLayoutCoordinate,
  createSubSpace,
  batchSaveDesksCoworkerCoordinates,
  clearDeskCoworkerCoordinate,
} from '@/redux/layoutSlice';
import {
  fetchSpacesWithLayoutCoordinates,
  createSpace,
  fetchClientListForSpaceDetailThunk,
  selectSpaceDetailClientList,
} from '@/redux/spaceSlice';
import {
  SERVER_SUBSPACE_PIN_SOURCE,
  buildAnnotationSpaceFromListRow,
  findSpaceRowForAssociation,
  flattenLayoutShapesToAnnotations,
  flattenSubSpacePinAnnotations,
  flattenDeskCoworkerMarkersFromLayoutDetail,
  enrichDeskCoworkerMarkerFromDeskRow,
  serializeDeskCoworkerStateFromAnnotations,
  serializeDeskCoworkerStateFromLayoutDetail,
  findServerSubSpacePinContainingNormalizedPoint,
  findCoworkingSubSpaceTargetAtPoint,
  getDesksForSubSpaceFromLayoutDetail,
  countPlacedDesksInSubSpace,
  getCoworkingSubSpaceMarkerCapacity,
  pickNextUnplacedDeskId,
  mergeSpaceWithClientsForPopover,
  findLayoutShapeMergedSpace,
  isLayoutCoworkingDeskMarkerType,
  isLayoutCoworkingSpace,
  isLayoutManagedOfficeSpace,
  layoutCoworkingParentHasDeskMarkerTargets,
  normalizeCoworkingInventoryType,
  validateCoworkingMarkerPlacement,
  getSubSpaceRowsForParentSpace,
  DESK_COWORKER_MARKER,
} from '@/utils/layout-annotation-space';
import { annotationToLayoutCoordinate } from '@/utils/layout-coordinate-payload';
import { hasModulePermission, isAdminRole } from '@/utils/user-role-utils';
import { toast } from '@/components/ui/toast';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  buildLayoutAnnotationCreateSpaceFormData,
  extractCreatedSpaceNameFromCreateSpaceResult,
} from '@/utils/layout-annotation-create-space-form-data';
import {
  SUBSPACE_LAYOUT_PENDING_SOURCE,
  annotationToCreateSubSpaceBoundingBox,
  annotationToSubSpaceApiLayoutCoordinate,
  findContainingParentSpaceForUnassociatedChild,
  getShapeInteriorProbeNormalized,
  isTopLevelLayoutSpaceBoundaryCandidate,
  layoutSpaceBoundaryOverlapsAny,
} from '@/utils/layout-annotation-subspace';
import { resolveSubSpaceAreaTypeFromDefineForm } from '@/utils/layout-annotation-define-subspace-form';

import LayoutAnnotationAllocateClientModal from '@/pages/center/layout-annotation-allocate-client-modal';
import LayoutAnnotationAssociateSpaceModal from '@/pages/center/layout-annotation-associate-space-modal';
import LayoutAnnotationDefineSubSpaceModal from '@/pages/center/layout-annotation-define-sub-space-modal';
import LayoutAnnotationFloorPlanSection from '@/pages/center/layout-annotation-floor-plan-section';
import LayoutAnnotationHeaderFilters from '@/pages/center/layout-annotation-header-filters';
import LayoutAnnotationPageLayout from '@/pages/center/layout-annotation-page-layout';
import {
  LAYOUT_FILTER_ALL,
  buildLayoutAnnotationClientFilterOptions,
  buildLayoutAnnotationClientFilterOptionsFromApiClients,
  buildLayoutDetailApiFilters,
  buildLayoutSpaceNameSelectOptions,
  countAvailableLayoutSpaces,
  fetchLayoutSpaceNameFilterOptions,
  hasActiveLayoutDetailFilters,
  serializeLayoutDetailFiltersKey,
} from '@/utils/layout-annotation-filter-utils';
import {
  CENTER_SUBSPACE_MARKER,
  getFloorRefFromDetail,
  getLayoutImagePath,
  stripEphemeralAnnotations,
  toAssetUrl,
  toCleanCoord,
} from '@/pages/center/layout-annotation-page-utils';

function subSpacePinGeometrySig(a) {
  if (!a || a.source !== SERVER_SUBSPACE_PIN_SOURCE) return '';
  if (a.type === 'rectangle') {
    return `r:${a.x},${a.y},${a.width},${a.height}`;
  }
  if (a.type === 'polygon' && Array.isArray(a.points)) {
    return `p:${a.points.join(',')}`;
  }
  if (a.type === 'point') {
    return `pt:${a.x},${a.y}`;
  }
  if (a.type === 'circle') {
    return `c:${a.x},${a.y},${a.radiusX},${a.radiusY}`;
  }
  return String(a.id || '');
}

const CENTER_LAYOUTS_VIEW_QUERY = 'layouts';

const LayoutAnnotationPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id: centerId = '', floorRef = '' } = useParams();

  const stageRef = useRef(null);
  const subSpacePersistTimersRef = useRef(new Map());
  const layoutDetailDataRef = useRef(null);

  const layoutDetailData = useSelector((state) => state.layout?.layoutDetail?.data);
  const isLayoutDetailLoading = useSelector((state) => state.layout?.layoutDetail?.isLoading);
  const layoutDetailError = useSelector((state) => state.layout?.layoutDetail?.error);
  const layoutDetailFiltersKey = useSelector((state) => state.layout?.layoutDetail?.filtersKey);

  useEffect(() => {
    layoutDetailDataRef.current = layoutDetailData ?? null;
  }, [layoutDetailData]);

  const resolvedDetailFloorRef = useMemo(
    () => getFloorRefFromDetail(layoutDetailData),
    [layoutDetailData],
  );

  const isSavingSubSpaceLayout = useSelector(
    (state) =>
      Boolean(state.layout?.saveSubSpaceLayoutCoordinate?.isLoading) ||
      Boolean(state.layout?.createSubSpace?.isLoading),
  );
  const isSavingLayoutCoordinates = useSelector(
    (state) =>
      Boolean(state.layout?.saveLayoutCoordinates?.isLoading) ||
      Boolean(state.layout?.clearLayoutCoordinate?.isLoading),
  );
  const isDeletingSubSpace = useSelector((state) =>
    Boolean(state.layout?.deleteSubSpace?.isLoading),
  );
  const isCreateSpaceLoading = useSelector((state) =>
    Boolean(state.space?.createSpaceDrawer?.isLoading),
  );
  const spacesData = useSelector((state) => state.space?.spaceListData?.data ?? []);
  const centerDetailsData = useSelector((state) => state.center?.centerDetails?.data);
  const spaceDetailClientList = useSelector(selectSpaceDetailClientList);
  const allocateClientsList = spaceDetailClientList?.data ?? [];
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const isSuperAdmin = useMemo(() => isAdminRole(userSideBarPerm), [userSideBarPerm]);
  const canReadCenter = useMemo(
    () => hasModulePermission(userSideBarPerm, 'Center', 'read'),
    [userSideBarPerm],
  );
  const canWriteSpace = useMemo(
    () => hasModulePermission(userSideBarPerm, 'Space', 'write'),
    [userSideBarPerm],
  );
  /** Desk / coworker point markers in sub-space views. */
  const canMarkDesks = canReadCenter && canWriteSpace;

  const centerForApi = useMemo(
    () => String(centerDetailsData?.name || centerId || '').trim(),
    [centerDetailsData, centerId],
  );

  const blockFloorId = useMemo(
    () =>
      String(
        layoutDetailData?.floor_detail?.block_floor_id ??
          layoutDetailData?.floor_detail?.floor ??
          '',
      ).trim(),
    [layoutDetailData],
  );

  const layoutToolbarToolIds = useMemo(() => {
    if (isSuperAdmin) {
      return [
        TOOL_IDS.SELECT,
        TOOL_IDS.HAND,
        TOOL_IDS.POINT,
        TOOL_IDS.PEN,
        TOOL_IDS.RECTANGLE,
        TOOL_IDS.CIRCLE,
      ];
    }
    return [TOOL_IDS.SELECT, TOOL_IDS.HAND, TOOL_IDS.PEN, TOOL_IDS.RECTANGLE, TOOL_IDS.CIRCLE];
  }, [isSuperAdmin]);

  const [selectedAnnotationForSave, setSelectedAnnotationForSave] = useState(null);
  const [selectedSpaceRef, setSelectedSpaceRef] = useState('');
  const [associateSpaceRowOverride, setAssociateSpaceRowOverride] = useState(null);
  const [associateModalOpen, setAssociateModalOpen] = useState(false);
  const [removeAssociationTarget, setRemoveAssociationTarget] = useState(null);
  const [deleteSubSpaceTarget, setDeleteSubSpaceTarget] = useState(null);
  const [subSpaceCanvasSession, setSubSpaceCanvasSession] = useState(null);
  const [defineSubSpaceOpen, setDefineSubSpaceOpen] = useState(false);
  const [defineSubSpaceDraft, setDefineSubSpaceDraft] = useState(null);
  const [defineSubSpaceParentTitle, setDefineSubSpaceParentTitle] = useState('');
  const [layoutImage, setLayoutImage] = useState(null);
  const [allocateClientOpen, setAllocateClientOpen] = useState(false);
  const [allocateClientAnn, setAllocateClientAnn] = useState(null);
  const [localAnnotations, setLocalAnnotations] = useState([]);
  const [savedAnnotations, setSavedAnnotations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDeskMarkers, setIsSavingDeskMarkers] = useState(false);
  const [canvasFilterClientId, setCanvasFilterClientId] = useState(LAYOUT_FILTER_ALL);
  const [canvasFilterSpaceRef, setCanvasFilterSpaceRef] = useState(LAYOUT_FILTER_ALL);
  const [canvasFilterSpaceTypes, setCanvasFilterSpaceTypes] = useState([]);
  const [canvasFilterOccupancy, setCanvasFilterOccupancy] = useState(LAYOUT_FILTER_ALL);
  const [canvasFilterAgreementDate, setCanvasFilterAgreementDate] = useState(null);
  const [layoutSpaceFilterOptions, setLayoutSpaceFilterOptions] = useState(() =>
    buildLayoutSpaceNameSelectOptions([]),
  );
  const [isLayoutSpaceFilterLoading, setIsLayoutSpaceFilterLoading] = useState(false);
  const [spaceFilterSearchQuery, setSpaceFilterSearchQuery] = useState('');
  const [debouncedSpaceFilterSearch, setDebouncedSpaceFilterSearch] = useState('');
  /** Unfiltered layout detail — keeps full filter dropdown options while canvas uses filtered API data. */
  const [layoutDetailForFilterOptions, setLayoutDetailForFilterOptions] = useState(null);
  const seededLayoutIdRef = useRef(null);
  /** Tracks which filter payload is currently painted on the canvas (avoids blur/flicker mid-fetch). */
  const [paintedLayoutDetailSeedKey, setPaintedLayoutDetailSeedKey] = useState('');
  const prevLayoutApiFiltersRef = useRef(undefined);
  const layoutApiFiltersRef = useRef(undefined);
  const localAnnotationsRef = useRef(localAnnotations);
  localAnnotationsRef.current = localAnnotations;
  const subSpaceCanvasSessionRef = useRef(null);
  const defineSubSpaceModalOpenRef = useRef(false);
  const defineSubSpaceDraftRef = useRef(null);
  /** `'canvas-zoom'` | `'associate-add'` | `'none'` — controls clearing sub-space session when modal closes. */
  const subSpaceEntrySourceRef = useRef('none');
  subSpaceCanvasSessionRef.current = subSpaceCanvasSession;
  defineSubSpaceModalOpenRef.current = defineSubSpaceOpen;
  defineSubSpaceDraftRef.current = defineSubSpaceDraft;
  const savedAnnotationsRef = useRef(savedAnnotations);
  savedAnnotationsRef.current = savedAnnotations;
  const lastPlacementAnchorRef = useRef(null);

  const isDirty = useMemo(() => {
    const localShapes = stripEphemeralAnnotations(localAnnotations);
    const savedShapes = stripEphemeralAnnotations(savedAnnotations);
    if (localShapes.length !== savedShapes.length) return true;
    const savedMap = new Map(savedShapes.map((a) => [a.id, JSON.stringify(toCleanCoord(a))]));
    for (const ann of localShapes) {
      const savedStr = savedMap.get(ann.id);
      if (savedStr === undefined) return true;
      if (JSON.stringify(toCleanCoord(ann)) !== savedStr) return true;
    }
    return false;
  }, [localAnnotations, savedAnnotations]);

  const isDeskCoworkerLayoutDirty = useMemo(() => {
    if (!subSpaceCanvasSession || subSpaceCanvasSession.mode !== 'edit') return false;
    const ref = String(subSpaceCanvasSession.parentSpaceRef || '').trim();
    if (!ref) return false;
    return (
      serializeDeskCoworkerStateFromAnnotations(localAnnotations, ref) !==
      serializeDeskCoworkerStateFromLayoutDetail(layoutDetailData, ref)
    );
  }, [subSpaceCanvasSession, localAnnotations, layoutDetailData]);

  useEffect(() => {
    seededLayoutIdRef.current = null;
    setLocalAnnotations([]);
    setSavedAnnotations([]);
    setLayoutImage(null);
    setSelectedAnnotationForSave(null);
    setSelectedSpaceRef('');
    setAssociateSpaceRowOverride(null);
    setAssociateModalOpen(false);
    setSubSpaceCanvasSession(null);
    setDefineSubSpaceOpen(false);
    setDefineSubSpaceDraft(null);
    setDefineSubSpaceParentTitle('');
    defineSubSpaceModalOpenRef.current = false;
    subSpaceEntrySourceRef.current = 'none';
    setAllocateClientOpen(false);
    setAllocateClientAnn(null);
    setLayoutDetailForFilterOptions(null);
    setCanvasFilterClientId(LAYOUT_FILTER_ALL);
    setCanvasFilterSpaceRef(LAYOUT_FILTER_ALL);
    setCanvasFilterSpaceTypes([]);
    setCanvasFilterOccupancy(LAYOUT_FILTER_ALL);
    setCanvasFilterAgreementDate(null);
    setSpaceFilterSearchQuery('');
    setDebouncedSpaceFilterSearch('');
    prevLayoutApiFiltersRef.current = undefined;
  }, [floorRef]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSpaceFilterSearch(spaceFilterSearchQuery);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [spaceFilterSearchQuery]);

  const handleCanvasFilterSpaceTypesChange = useCallback((nextTypes) => {
    setCanvasFilterSpaceTypes(Array.isArray(nextTypes) ? nextTypes : []);
    setCanvasFilterSpaceRef(LAYOUT_FILTER_ALL);
    setSpaceFilterSearchQuery('');
  }, []);

  useEffect(() => {
    if (!centerForApi || !blockFloorId || canvasFilterSpaceTypes.length === 0) {
      setLayoutSpaceFilterOptions(buildLayoutSpaceNameSelectOptions([]));
      setIsLayoutSpaceFilterLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLayoutSpaceFilterLoading(true);

    fetchLayoutSpaceNameFilterOptions({
      center: centerForApi,
      floor: blockFloorId,
      spaceTypes: canvasFilterSpaceTypes,
      keyword: debouncedSpaceFilterSearch,
    })
      .then((options) => {
        if (cancelled) return;
        setLayoutSpaceFilterOptions(options);
      })
      .catch(() => {
        if (cancelled) return;
        setLayoutSpaceFilterOptions(buildLayoutSpaceNameSelectOptions([]));
      })
      .finally(() => {
        if (!cancelled) setIsLayoutSpaceFilterLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [centerForApi, blockFloorId, canvasFilterSpaceTypes, debouncedSpaceFilterSearch]);

  useEffect(() => {
    if (canvasFilterSpaceRef === LAYOUT_FILTER_ALL) return;
    const stillValid = layoutSpaceFilterOptions.some(
      (option) => String(option.value) === String(canvasFilterSpaceRef),
    );
    if (!stillValid) {
      setCanvasFilterSpaceRef(LAYOUT_FILTER_ALL);
    }
  }, [canvasFilterSpaceRef, layoutSpaceFilterOptions]);

  const layoutCanvasFilters = useMemo(
    () => ({
      clientId: canvasFilterClientId,
      spaceRef: canvasFilterSpaceRef,
      spaceTypes: canvasFilterSpaceTypes,
      occupancy: canvasFilterOccupancy,
      agreementDateFilterType: canvasFilterAgreementDate?.type ?? '',
      fromDate: canvasFilterAgreementDate?.fromDate ?? '',
      toDate: canvasFilterAgreementDate?.toDate ?? '',
    }),
    [
      canvasFilterClientId,
      canvasFilterSpaceRef,
      canvasFilterSpaceTypes,
      canvasFilterOccupancy,
      canvasFilterAgreementDate,
    ],
  );

  const layoutApiFilters = useMemo(
    () => buildLayoutDetailApiFilters(layoutCanvasFilters),
    [layoutCanvasFilters],
  );

  layoutApiFiltersRef.current = layoutApiFilters;

  const expectedLayoutDetailFiltersKey = useMemo(
    () => serializeLayoutDetailFiltersKey(layoutApiFilters),
    [layoutApiFilters],
  );

  const isLayoutDetailInSync = layoutDetailFiltersKey === expectedLayoutDetailFiltersKey;

  const layoutDetailSeedKey = useMemo(
    () => `${floorRef}|${expectedLayoutDetailFiltersKey}`,
    [floorRef, expectedLayoutDetailFiltersKey],
  );

  useEffect(() => {
    if (!floorRef) return;
    dispatch(clearLayoutDetail());
    seededLayoutIdRef.current = null;
    setPaintedLayoutDetailSeedKey('');
  }, [dispatch, floorRef]);

  useEffect(() => {
    if (!floorRef) return;
    dispatch(fetchLayoutDetail({ floorRef, filters: layoutApiFilters }));
  }, [dispatch, floorRef, layoutApiFilters]);

  useEffect(() => {
    if (prevLayoutApiFiltersRef.current === undefined) {
      prevLayoutApiFiltersRef.current = layoutDetailSeedKey;
      return;
    }
    if (prevLayoutApiFiltersRef.current !== layoutDetailSeedKey) {
      prevLayoutApiFiltersRef.current = layoutDetailSeedKey;
      setSubSpaceCanvasSession(null);
      subSpaceEntrySourceRef.current = 'none';
      seededLayoutIdRef.current = null;
      // Keep paintedLayoutDetailSeedKey until the new response is seeded — prevents
      // intermediate blur/remount while stale annotations are still on screen.
    }
  }, [layoutDetailSeedKey]);

  useEffect(() => {
    if (!centerId) return;
    dispatch(getCenterDetailsThunk(centerId));
  }, [dispatch, centerId]);

  useEffect(() => {
    if (!centerForApi) return;
    dispatch(
      fetchClientListForSpaceDetailThunk({
        pageSize: 999,
        center: centerForApi,
      }),
    );
  }, [dispatch, centerForApi]);

  useEffect(() => {
    if (!associateModalOpen) return;
    const floorValue = String(
      layoutDetailData?.floor_detail?.block_floor_id ?? layoutDetailData?.floor_detail?.floor ?? '',
    ).trim();
    if (!floorValue) return;
    dispatch(
      fetchSpacesWithLayoutCoordinates({
        floor: floorValue,
      }),
    );
  }, [associateModalOpen, dispatch, layoutDetailData]);

  const centerDisplayTitle = useMemo(
    () =>
      String(centerDetailsData?.center_name || centerDetailsData?.name || centerId || '').trim(),
    [centerDetailsData, centerId],
  );

  const layoutShapeAnnotations = useMemo(
    () => flattenLayoutShapesToAnnotations(layoutDetailData),
    [layoutDetailData],
  );

  const availableSpaceCount = useMemo(
    () => countAvailableLayoutSpaces(layoutShapeAnnotations),
    [layoutShapeAnnotations],
  );

  const subSpacePinAnnotations = useMemo(
    () => flattenSubSpacePinAnnotations(layoutDetailData),
    [layoutDetailData],
  );

  const deskCoworkerAnnotations = useMemo(
    () => flattenDeskCoworkerMarkersFromLayoutDetail(layoutDetailData),
    [layoutDetailData],
  );

  const initialAnnotations = useMemo(
    () => [...layoutShapeAnnotations, ...subSpacePinAnnotations, ...deskCoworkerAnnotations],
    [layoutShapeAnnotations, subSpacePinAnnotations, deskCoworkerAnnotations],
  );

  useEffect(() => {
    if (!layoutDetailData || !floorRef) return;
    if (resolvedDetailFloorRef !== floorRef) return;
    if (!isLayoutDetailInSync) return;
    if (!hasActiveLayoutDetailFilters(layoutCanvasFilters)) {
      setLayoutDetailForFilterOptions(layoutDetailData);
    }
  }, [
    layoutDetailData,
    layoutCanvasFilters,
    floorRef,
    resolvedDetailFloorRef,
    isLayoutDetailInSync,
  ]);

  const filterOptionsShapeAnnotations = useMemo(() => {
    const detail = layoutDetailForFilterOptions ?? layoutDetailData;
    if (!detail) return [];
    return flattenLayoutShapesToAnnotations(detail);
  }, [layoutDetailForFilterOptions, layoutDetailData]);

  const layoutClientFilterOptions = useMemo(() => {
    const fromApi = buildLayoutAnnotationClientFilterOptionsFromApiClients(allocateClientsList);
    if (fromApi.length > 1) return fromApi;
    return buildLayoutAnnotationClientFilterOptions(filterOptionsShapeAnnotations);
  }, [allocateClientsList, filterOptionsShapeAnnotations]);

  useEffect(() => {
    if (isLayoutDetailLoading) return;
    if (!layoutDetailData || !floorRef) return;
    if (resolvedDetailFloorRef !== floorRef) return;
    if (!isLayoutDetailInSync) return;
    if (seededLayoutIdRef.current === layoutDetailSeedKey) return;
    seededLayoutIdRef.current = layoutDetailSeedKey;
    setPaintedLayoutDetailSeedKey(layoutDetailSeedKey);
    setLocalAnnotations(initialAnnotations);
    setSavedAnnotations(layoutShapeAnnotations);
  }, [
    isLayoutDetailLoading,
    layoutDetailData,
    floorRef,
    initialAnnotations,
    layoutShapeAnnotations,
    resolvedDetailFloorRef,
    layoutDetailSeedKey,
    isLayoutDetailInSync,
  ]);

  /** True only when canvas annotations match the currently selected header filters. */
  const annotationsMatchActiveFilters = paintedLayoutDetailSeedKey === layoutDetailSeedKey;

  const layoutRecord =
    layoutDetailData?.floor_detail ?? layoutDetailData?.layout ?? layoutDetailData;
  const imageUrl = toAssetUrl(getLayoutImagePath(layoutRecord));
  const floorLabel =
    layoutRecord?.block_floor_id ||
    (layoutRecord?.floor != null ? `Floor ${layoutRecord.floor}` : '');

  const hasStaleLayoutDetail = Boolean(
    floorRef && layoutDetailData && resolvedDetailFloorRef && resolvedDetailFloorRef !== floorRef,
  );

  const layoutDetailMatchesRoute =
    Boolean(layoutDetailData) &&
    Boolean(floorRef) &&
    resolvedDetailFloorRef === floorRef &&
    !hasStaleLayoutDetail;

  const showBlockingLayoutSpinner =
    !layoutDetailError &&
    Boolean(floorRef) &&
    (hasStaleLayoutDetail || (isLayoutDetailLoading && !layoutDetailData));

  const mergedAllocateSpace = useMemo(() => {
    if (!allocateClientAnn) return null;
    const merged = mergeSpaceWithClientsForPopover(
      allocateClientAnn.space,
      allocateClientAnn.clients,
    );
    if (!merged) return null;
    const ref = String(allocateClientAnn.space_ref ?? '').trim();
    if (!ref) return merged;
    return {
      ...merged,
      space_ref: ref,
      id: ref,
      name: String(merged.name ?? merged.inventory_name ?? ref).trim() || ref,
      clients: allocateClientAnn.clients ?? merged.clients ?? [],
    };
  }, [allocateClientAnn]);

  const handleAllocateClientFromAnnotation = useCallback(
    (ann) => {
      if (!ann || !ann.space_ref) return;
      setAllocateClientAnn(ann);
      setAllocateClientOpen(true);
      dispatch(
        fetchClientListForSpaceDetailThunk({
          pageSize: 999,
          ...(centerForApi ? { center: centerForApi } : {}),
        }),
      );
    },
    [dispatch, centerForApi],
  );

  /** Rebuild canvas from `get_layout_detail` while preserving in-progress / session-only annotations. */
  const refreshLayoutAnnotationsAfterServerChange = useCallback(async () => {
    if (!floorRef) return false;
    try {
      const detail = await dispatch(
        fetchLayoutDetail({ floorRef, filters: layoutApiFiltersRef.current }),
      ).unwrap();
      const shapes = flattenLayoutShapesToAnnotations(detail);
      const pins = flattenSubSpacePinAnnotations(detail);
      const serverDesksAll = flattenDeskCoworkerMarkersFromLayoutDetail(detail);
      const prev = localAnnotationsRef.current;
      const session = subSpaceCanvasSessionRef.current;
      const parentRef = String(session?.parentSpaceRef || '').trim();
      const inDeskEdit = session?.mode === 'edit' && parentRef;
      const localDesksInSession = inDeskEdit
        ? prev.filter(
            (a) =>
              a.source === DESK_COWORKER_MARKER &&
              String(a.parent_space_ref || '').trim() === parentRef,
          )
        : [];
      const serverDesksOther = inDeskEdit
        ? serverDesksAll.filter((d) => String(d.parent_space_ref || '').trim() !== parentRef)
        : serverDesksAll;
      const mergedDesks = [...serverDesksOther, ...localDesksInSession];
      const ephemeral = prev.filter(
        (a) => a.source === SUBSPACE_LAYOUT_PENDING_SOURCE || a.source === CENTER_SUBSPACE_MARKER,
      );
      setLocalAnnotations([...shapes, ...pins, ...mergedDesks, ...ephemeral]);
      setSavedAnnotations(flattenLayoutShapesToAnnotations(detail));
      if (centerId) dispatch(getCenterDetailsThunk(centerId));
      return true;
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Could not refresh layout. Reload the page to see the latest data.',
      });
      return false;
    }
  }, [dispatch, floorRef, centerId]);

  const handleAllocateModalOpenChange = useCallback((open) => {
    setAllocateClientOpen(open);
    if (!open) {
      setAllocateClientAnn(null);
    }
  }, []);

  const handleAllocateSuccess = useCallback(async () => {
    await refreshLayoutAnnotationsAfterServerChange();
  }, [refreshLayoutAnnotationsAfterServerChange]);

  const associateModalInitialSpaceRow = useMemo(() => {
    if (!associateModalOpen) return null;
    const s = selectedAnnotationForSave?.space;
    return s && typeof s === 'object' ? s : null;
  }, [associateModalOpen, selectedAnnotationForSave]);

  useEffect(() => {
    if (hasStaleLayoutDetail) {
      setLayoutImage(null);
      return undefined;
    }
    if (!imageUrl) {
      setLayoutImage(null);
      return undefined;
    }

    let cancelled = false;

    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    const src = apiBase && imageUrl.startsWith(apiBase) ? imageUrl.slice(apiBase.length) : imageUrl;

    const img = new window.Image();
    img.addEventListener('load', () => {
      if (!cancelled) setLayoutImage(img);
    });
    img.addEventListener('error', () => {
      if (!cancelled) setLayoutImage(null);
    });
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [imageUrl, hasStaleLayoutDetail]);

  const closeAssociateModalState = useCallback(() => {
    setAssociateModalOpen(false);
    setSelectedAnnotationForSave(null);
    setSelectedSpaceRef('');
    setAssociateSpaceRowOverride(null);
  }, []);

  const persistLayoutAssociationForAnnotation = useCallback(
    async (targetAnn, nextSpaceId, normalizedSpace) => {
      const nextSpace = String(nextSpaceId || '').trim();
      const layoutCoordinate = annotationToLayoutCoordinate(toCleanCoord(targetAnn));
      if (!layoutCoordinate) {
        setLocalAnnotations((prev) => prev.map((a) => (a.id === targetAnn.id ? targetAnn : a)));
        return false;
      }

      const previousSpace = String(targetAnn.space_ref || '').trim();
      if (previousSpace && previousSpace !== nextSpace) {
        await dispatch(
          clearLayoutCoordinate({ spaceId: previousSpace, floorRef: String(floorRef).trim() }),
        );
      }

      const action = await dispatch(
        saveLayoutCoordinates({
          floorRef,
          items: [{ space_id: nextSpace, layout_coordinate: layoutCoordinate }],
        }),
      );

      if (saveLayoutCoordinates.fulfilled.match(action)) {
        const patch = (a) =>
          a.id === targetAnn.id
            ? {
                ...a,
                hasCoordinateOnServer: true,
                space_ref: nextSpace,
                space: normalizedSpace ?? a.space,
              }
            : a;
        setLocalAnnotations((prev) => prev.map(patch));
        setSavedAnnotations((prev) => {
          const exists = prev.some((a) => a.id === targetAnn.id);
          if (exists) return prev.map(patch);
          return [
            ...prev,
            {
              ...targetAnn,
              hasCoordinateOnServer: true,
              space_ref: nextSpace,
              space: normalizedSpace ?? targetAnn.space,
            },
          ];
        });
        await refreshLayoutAnnotationsAfterServerChange();
        return true;
      }
      setLocalAnnotations((prev) => prev.map((a) => (a.id === targetAnn.id ? targetAnn : a)));
      return false;
    },
    [dispatch, floorRef, refreshLayoutAnnotationsAfterServerChange],
  );

  const resolveAssociationRow = useCallback(
    (selectedRef) => {
      const row =
        (associateSpaceRowOverride &&
        String(associateSpaceRowOverride.name ?? associateSpaceRowOverride.id ?? '').trim() ===
          String(selectedRef).trim()
          ? associateSpaceRowOverride
          : null) || findSpaceRowForAssociation(spacesData, selectedRef);
      return row ? buildAnnotationSpaceFromListRow(row) : null;
    },
    [associateSpaceRowOverride, spacesData],
  );

  const handleAssociateModalSubmit = useCallback(
    async (payload) => {
      if (!floorRef || !selectedAnnotationForSave) return;

      const targetAnn = selectedAnnotationForSave;

      if (payload.mode === 'existing') {
        if (!selectedSpaceRef) return;
        const selectedRef = selectedSpaceRef;
        const normalizedSpace = resolveAssociationRow(selectedRef);

        setLocalAnnotations((prev) =>
          prev.map((a) =>
            a.id === targetAnn.id
              ? { ...a, space_ref: selectedRef, space: normalizedSpace ?? a.space }
              : a,
          ),
        );
        closeAssociateModalState();
        await persistLayoutAssociationForAnnotation(targetAnn, selectedRef, normalizedSpace);
        return;
      }

      const layoutCoordinate = annotationToLayoutCoordinate(toCleanCoord(targetAnn));
      const centerForApi = String(centerDetailsData?.name || centerId || '').trim();
      const centerName = String(centerDetailsData?.center_name || '').trim();

      try {
        const formData = buildLayoutAnnotationCreateSpaceFormData({
          centerId: centerForApi,
          centerName,
          blockFloorId,
          inventoryName: payload.inventoryName,
          inventoryType: payload.inventoryType,
          layoutCoordinate,
          managedOfficeType: payload.managedOfficeType,
          managedOfficeTotalSeats: payload.managedOfficeTotalSeats,
          creditPerSeat: payload.creditPerSeat,
          expectedPerSeatRate: payload.expectedPerSeatRate,
          totalRateOfSpace: payload.totalRateOfSpace,
          coworkingSpaceType: payload.coworkingSpaceType,
          coworkingTotalSeats: payload.coworkingTotalSeats,
          resourceType: payload.resourceType,
          resourcePax: payload.resourcePax,
          commonAreaType: payload.commonAreaType,
        });

        const result = await dispatch(createSpace(formData)).unwrap();
        let resolvedSpaceId = extractCreatedSpaceNameFromCreateSpaceResult(result);
        if (!resolvedSpaceId && blockFloorId) {
          const fetchAction = await dispatch(
            fetchSpacesWithLayoutCoordinates({ floor: blockFloorId }),
          );
          if (fetchSpacesWithLayoutCoordinates.fulfilled.match(fetchAction)) {
            const rows = fetchAction.payload?.data ?? [];
            const want = String(payload.inventoryName ?? '')
              .trim()
              .toLowerCase();
            const match = rows.find(
              (r) =>
                String(r.inventory_name ?? r.spaceName ?? '')
                  .trim()
                  .toLowerCase() === want,
            );
            if (match) {
              resolvedSpaceId = String(match.name ?? match.id ?? '').trim();
            }
          }
        }
        if (!resolvedSpaceId) {
          showErrorToast(new Error('Missing space id'), {
            defaultMessage:
              'Space may have been created but we could not read its id from the server response. Refresh the layout page or associate this shape via Existing space.',
          });
          if (blockFloorId) {
            dispatch(fetchSpacesWithLayoutCoordinates({ floor: blockFloorId }));
          }
          return;
        }
        const spaceId = resolvedSpaceId;

        const totalSeats = (() => {
          if (payload.inventoryType === 'Co-working Space') {
            return Math.max(1, Number(payload.coworkingTotalSeats) || 1);
          }
          if (payload.inventoryType === 'Resource') {
            return Math.max(1, Number(payload.resourcePax) || 1);
          }
          if (payload.inventoryType === 'Managed Office') {
            return Math.max(1, Number(payload.managedOfficeTotalSeats) || 1);
          }
          return 0;
        })();

        const syntheticRow = {
          name: spaceId,
          id: spaceId,
          inventory_name: payload.inventoryName,
          inventory_type: payload.inventoryType,
          total_seats: totalSeats,
          managed_office_type: payload.managedOfficeType,
          coworking_inventory_type: payload.coworkingSpaceType,
          resource_type: payload.resourceType,
          credit_per_seat: payload.creditPerSeat,
          expected_per_seat_rate: payload.expectedPerSeatRate,
          total_rate_of_space: payload.totalRateOfSpace,
        };

        const normalizedSpace = buildAnnotationSpaceFromListRow(syntheticRow);

        setLocalAnnotations((prev) =>
          prev.map((a) =>
            a.id === targetAnn.id
              ? { ...a, space_ref: spaceId, space: normalizedSpace ?? a.space }
              : a,
          ),
        );
        closeAssociateModalState();

        const ok = await persistLayoutAssociationForAnnotation(targetAnn, spaceId, normalizedSpace);
        if (ok) {
          showSuccessToast('Space created and linked to this shape.');
          if (blockFloorId) {
            dispatch(fetchSpacesWithLayoutCoordinates({ floor: blockFloorId }));
          }
        } else {
          showErrorToast(new Error('Layout save failed'), {
            defaultMessage:
              'The space was created but saving the layout coordinate failed. Try saving again from the toolbar.',
          });
        }
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to create space. Please try again.' });
      }
    },
    [
      floorRef,
      selectedAnnotationForSave,
      selectedSpaceRef,
      resolveAssociationRow,
      closeAssociateModalState,
      persistLayoutAssociationForAnnotation,
      centerDetailsData,
      centerId,
      blockFloorId,
      dispatch,
    ],
  );

  const saveChanges = useCallback(async () => {
    if (isSaving || !floorRef) return;
    const rawCurrent = localAnnotationsRef.current;
    const current = stripEphemeralAnnotations(rawCurrent);
    const saved = savedAnnotationsRef.current;

    const savedById = new Map(saved.map((a) => [a.id, a]));
    const currentIds = new Set(current.map((a) => a.id));

    const toCreate = current.filter((a) => {
      if (!a.space_ref) return false;
      const prev = savedById.get(a.id);
      return !prev || !prev.hasCoordinateOnServer;
    });
    const toUpdate = current.filter((a) => {
      if (!a.space_ref || !savedById.has(a.id)) return false;
      const prev = savedById.get(a.id);
      if (!prev?.hasCoordinateOnServer) return false;
      return JSON.stringify(toCleanCoord(a)) !== JSON.stringify(toCleanCoord(prev));
    });
    const toDelete = saved.filter(
      (a) => !currentIds.has(a.id) && a.hasCoordinateOnServer && a.space_ref,
    );

    if (toCreate.length === 0 && toUpdate.length === 0 && toDelete.length === 0) return;

    setIsSaving(true);
    try {
      let newAnnotations = [...rawCurrent];

      const saveItems = [...toCreate, ...toUpdate]
        .map((ann) => {
          const lc = annotationToLayoutCoordinate(toCleanCoord(ann));
          const sid = String(ann.space_ref || '').trim();
          return lc && sid ? { space_id: sid, layout_coordinate: lc } : null;
        })
        .filter(Boolean);

      if (saveItems.length > 0) {
        const action = await dispatch(saveLayoutCoordinates({ floorRef, items: saveItems }));
        if (saveLayoutCoordinates.fulfilled.match(action)) {
          const markIds = new Set([...toCreate, ...toUpdate].map((a) => a.id));
          newAnnotations = newAnnotations.map((a) =>
            markIds.has(a.id) ? { ...a, hasCoordinateOnServer: true } : a,
          );
        }
      }

      await Promise.all(
        toDelete.map((ann) =>
          dispatch(
            clearLayoutCoordinate({
              spaceId: String(ann.space_ref).trim(),
              floorRef: String(floorRef).trim(),
            }),
          ),
        ),
      );

      setLocalAnnotations(newAnnotations);
      setSavedAnnotations(stripEphemeralAnnotations(newAnnotations));

      if (centerId && (toCreate.length > 0 || toDelete.length > 0)) {
        dispatch(getCenterDetailsThunk(centerId));
      }
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, floorRef, centerId, dispatch]);

  const handleRenameAnnotation = useCallback(() => {}, []);

  const handleRemoveAssociation = useCallback((annotation) => {
    if (!annotation?.space_ref) return;
    setRemoveAssociationTarget(annotation);
  }, []);

  const handleConfirmRemoveAssociation = useCallback(async () => {
    const targetAnn = removeAssociationTarget;
    if (!targetAnn?.space_ref) {
      setRemoveAssociationTarget(null);
      return;
    }

    const spaceId = String(targetAnn.space_ref).trim();
    const floorRefTrim = String(floorRef).trim();
    if (!floorRefTrim) {
      showErrorToast('Floor reference not found. Refresh and try again.');
      return;
    }

    if (!targetAnn.hasCoordinateOnServer) {
      setLocalAnnotations((prev) =>
        prev.map((a) => (a.id === targetAnn.id ? { ...a, space_ref: '', space: null } : a)),
      );
      setSavedAnnotations((prev) =>
        prev.map((a) => (a.id === targetAnn.id ? { ...a, space_ref: '', space: null } : a)),
      );
      setRemoveAssociationTarget(null);
      return;
    }

    const action = await dispatch(clearLayoutCoordinate({ spaceId, floorRef: floorRefTrim }));
    if (!clearLayoutCoordinate.fulfilled.match(action)) {
      showErrorToast(action.payload, { defaultMessage: 'Failed to remove association.' });
      return;
    }

    setLocalAnnotations((prev) =>
      prev.map((a) => (a.id === targetAnn.id ? { ...a, space_ref: '', space: null } : a)),
    );
    setSavedAnnotations((prev) =>
      prev.map((a) => (a.id === targetAnn.id ? { ...a, space_ref: '', space: null } : a)),
    );
    if (centerId) dispatch(getCenterDetailsThunk(centerId));
    showSuccessToast('Association removed successfully.');
    setRemoveAssociationTarget(null);
  }, [centerId, dispatch, floorRef, removeAssociationTarget]);

  const handleRequestDeleteSubSpace = useCallback((annotation) => {
    if (!annotation) return;
    setDeleteSubSpaceTarget(annotation);
  }, []);

  const refreshLayoutAfterSubSpaceDelete = useCallback(async () => {
    const detail = await dispatch(
      fetchLayoutDetail({ floorRef, filters: layoutApiFiltersRef.current }),
    ).unwrap();
    const shapes = flattenLayoutShapesToAnnotations(detail);
    const pins = flattenSubSpacePinAnnotations(detail);
    const desks = flattenDeskCoworkerMarkersFromLayoutDetail(detail);
    const dots = localAnnotationsRef.current.filter((a) => a.source === CENTER_SUBSPACE_MARKER);
    setLocalAnnotations([...shapes, ...pins, ...desks, ...dots]);
    setSavedAnnotations(shapes);
    if (centerId) dispatch(getCenterDetailsThunk(centerId));
  }, [centerId, dispatch, floorRef]);

  const handleConfirmDeleteSubSpace = useCallback(async () => {
    const targetAnn = deleteSubSpaceTarget;
    if (!targetAnn) return;

    const session = subSpaceCanvasSessionRef.current;
    const spaceId = String(targetAnn.space_ref || session?.parentSpaceRef || '').trim();
    const subSpaceId = String(
      targetAnn.sub_space_id || targetAnn.sub_space_meta?.sub_space_id || '',
    ).trim();

    if (!spaceId || !subSpaceId) {
      showErrorToast('Missing sub-space details. Refresh and try again.');
      return;
    }

    const action = await dispatch(deleteSubSpace({ space_id: spaceId, sub_space_id: subSpaceId }));
    if (!deleteSubSpace.fulfilled.match(action)) {
      showErrorToast(action.payload, { defaultMessage: 'Failed to delete sub-space.' });
      return;
    }

    try {
      await refreshLayoutAfterSubSpaceDelete();
      showSuccessToast('Sub-space deleted successfully.');
      setDeleteSubSpaceTarget(null);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Sub-space deleted but failed to refresh layout.' });
      setDeleteSubSpaceTarget(null);
    }
  }, [deleteSubSpaceTarget, dispatch, refreshLayoutAfterSubSpaceDelete]);

  const handleRequestDeleteSelected = useCallback(
    (annotation) => {
      if (!annotation || !isSuperAdmin) return false;
      const session = subSpaceCanvasSessionRef.current;
      if (
        annotation.source === SERVER_SUBSPACE_PIN_SOURCE &&
        session?.mode === 'edit' &&
        isLayoutManagedOfficeSpace(session.inventoryType)
      ) {
        setDeleteSubSpaceTarget(annotation);
        return true;
      }
      return false;
    },
    [isSuperAdmin],
  );

  const handleReorderAnnotations = useCallback(() => {}, []);

  const handleRemoveDeskCoworkerMarker = useCallback((markerId) => {
    if (!markerId) return;
    setLocalAnnotations((prev) => prev.filter((a) => a.id !== markerId));
  }, []);

  const handleSaveDeskCoworkerMarkers = useCallback(async () => {
    const session = subSpaceCanvasSessionRef.current;
    if (!session || session.mode !== 'edit' || !floorRef) return;
    const spaceId = String(session.parentSpaceRef || '').trim();
    if (!spaceId) return;

    const localSerialized = serializeDeskCoworkerStateFromAnnotations(
      localAnnotationsRef.current,
      spaceId,
    );
    const serverSerialized = serializeDeskCoworkerStateFromLayoutDetail(
      layoutDetailDataRef.current,
      spaceId,
    );
    if (localSerialized === serverSerialized) {
      toast.info('No desk position changes to save.');
      return;
    }

    setIsSavingDeskMarkers(true);
    try {
      const mapped = localAnnotationsRef.current;
      const localDesks = mapped.filter(
        (a) =>
          a.source === DESK_COWORKER_MARKER &&
          String(a.parent_space_ref || '').trim() === spaceId &&
          String(a.desk_id || '').trim(),
      );
      const localByDesk = new Map(localDesks.map((d) => [String(d.desk_id).trim(), d]));
      const serverDesks = flattenDeskCoworkerMarkersFromLayoutDetail(
        layoutDetailDataRef.current,
      ).filter((s) => String(s.parent_space_ref || '').trim() === spaceId);

      const clearPayloads = [];
      for (const s of serverDesks) {
        const did = String(s.desk_id).trim();
        const ssid = String(s.sub_space_id || '').trim();
        const loc = localByDesk.get(did);
        if (!loc) {
          clearPayloads.push({ space_id: spaceId, sub_space_id: ssid, desk_id: did });
          continue;
        }
        if (String(loc.sub_space_id || '').trim() !== ssid) {
          clearPayloads.push({ space_id: spaceId, sub_space_id: ssid, desk_id: did });
        }
      }

      for (const p of clearPayloads) {
        const action = await dispatch(clearDeskCoworkerCoordinate(p));
        if (clearDeskCoworkerCoordinate.rejected.match(action)) {
          showErrorToast(action.payload, { defaultMessage: 'Failed to clear a desk position.' });
          return;
        }
      }

      const bySub = new Map();
      for (const m of localDesks) {
        const ssid = String(m.sub_space_id || '').trim();
        if (!ssid) continue;
        if (!bySub.has(ssid)) bySub.set(ssid, []);
        bySub.get(ssid).push({
          desk_id: String(m.desk_id).trim(),
          desk_coordinate: { x: Number(m.x), y: Number(m.y) },
        });
      }
      const items = [...bySub.entries()].map(([sub_space_id, desk_coordinates]) => ({
        space_id: spaceId,
        sub_space_id,
        desk_coordinates,
      }));

      if (items.length > 0) {
        const batchAction = await dispatch(batchSaveDesksCoworkerCoordinates({ items }));
        if (batchSaveDesksCoworkerCoordinates.rejected.match(batchAction)) {
          showErrorToast(batchAction.payload, {
            defaultMessage: 'Failed to save desk positions.',
          });
          return;
        }
      }

      try {
        const detail = await dispatch(
          fetchLayoutDetail({ floorRef, filters: layoutApiFiltersRef.current }),
        ).unwrap();
        const shapes = flattenLayoutShapesToAnnotations(detail);
        const pins = flattenSubSpacePinAnnotations(detail);
        const desks = flattenDeskCoworkerMarkersFromLayoutDetail(detail);
        const pendingLayouts = localAnnotationsRef.current.filter(
          (a) => a.source === SUBSPACE_LAYOUT_PENDING_SOURCE,
        );
        const centerMarkers = localAnnotationsRef.current.filter(
          (a) => a.source === CENTER_SUBSPACE_MARKER,
        );
        setLocalAnnotations([...shapes, ...pins, ...desks, ...pendingLayouts, ...centerMarkers]);
        showSuccessToast('Desk positions saved.');
        if (centerId) dispatch(getCenterDetailsThunk(centerId));
      } catch {
        showErrorToast(null, {
          defaultMessage: 'Saved desk positions but failed to refresh layout. Reload the page.',
        });
      }
    } finally {
      setIsSavingDeskMarkers(false);
    }
  }, [dispatch, floorRef, centerId]);

  const handleBeforeAnnotationAdd = useCallback(
    ({ type, nx, ny, clientX, clientY, annotation }) => {
      if (!isSuperAdmin && !canWriteSpace) return false;

      const session = subSpaceCanvasSessionRef.current;
      if (session) {
        if (type === 'point') {
          if (!canMarkDesks) return false;
          const isManagedOffice = isLayoutManagedOfficeSpace(session.inventoryType);
          const isCoworking = isLayoutCoworkingSpace(session.inventoryType);
          if (session.mode !== 'edit' && !isManagedOffice) return false;

          const parentAnn = localAnnotationsRef.current.find(
            (a) => a.id === session.parentAnnotationId,
          );
          if (!parentAnn) return false;
          if (!isNormalizedPointInAssociatedSpaceShape(nx, ny, parentAnn)) return false;
          const pr = String(session.parentSpaceRef || '').trim();

          const pin = isCoworking
            ? findCoworkingSubSpaceTargetAtPoint(
                layoutDetailDataRef.current,
                localAnnotationsRef.current,
                pr,
                nx,
                ny,
              )
            : findServerSubSpacePinContainingNormalizedPoint(
                localAnnotationsRef.current,
                pr,
                nx,
                ny,
              );
          if (!pin) {
            if (isCoworking) {
              showErrorToast(
                new Error('Place the marker inside a sub-space area on this co-working space.'),
              );
            } else {
              showErrorToast(new Error('Place the marker inside a sub-space area.'));
            }
            return false;
          }

          const subId = String(pin.sub_space_id || '').trim();

          if (isCoworking) {
            const parentSpace =
              parentAnn?.space ?? findLayoutShapeMergedSpace(layoutDetailDataRef.current, pr);
            const placementError = validateCoworkingMarkerPlacement(
              layoutDetailDataRef.current,
              localAnnotationsRef.current,
              pr,
              subId,
              pin,
              parentSpace,
            );
            if (placementError) {
              showErrorToast(placementError);
              return false;
            }
            const detail = layoutDetailDataRef.current;
            const deskRows = getDesksForSubSpaceFromLayoutDetail(detail, pr, subId);
            if (deskRows.length > 0) {
              const nextDesk = pickNextUnplacedDeskId(
                detail,
                localAnnotationsRef.current,
                pr,
                subId,
              );
              if (!nextDesk) {
                showErrorToast(
                  new Error('All desks for this co-working space already have a location.'),
                );
                return false;
              }
            }
            return true;
          }

          const detail = layoutDetailDataRef.current;
          const cap = getCoworkingSubSpaceMarkerCapacity(detail, pr, subId, pin);
          if (!cap) {
            showErrorToast(new Error('This sub-space has no seats configured.'));
            return false;
          }
          const placed = countPlacedDesksInSubSpace(detail, localAnnotationsRef.current, pr, subId);
          if (placed >= cap) {
            showErrorToast(
              new Error(
                `All ${cap} seat${cap === 1 ? '' : 's'} for this sub-space are already marked.`,
              ),
            );
            return false;
          }
          const deskRows = getDesksForSubSpaceFromLayoutDetail(detail, pr, subId);
          if (deskRows.length > 0) {
            const nextDesk = pickNextUnplacedDeskId(detail, localAnnotationsRef.current, pr, subId);
            if (!nextDesk) {
              showErrorToast(new Error('All desks for this sub-space already have a location.'));
              return false;
            }
          }
          return true;
        }
        const parentAnn = localAnnotationsRef.current.find(
          (a) => a.id === session.parentAnnotationId,
        );
        if (!parentAnn) return false;

        const probePoint = annotation
          ? getShapeInteriorProbeNormalized(annotation)
          : { x: nx, y: ny };
        const px = Number(probePoint?.x ?? nx);
        const py = Number(probePoint?.y ?? ny);
        if (!isNormalizedPointInAssociatedSpaceShape(px, py, parentAnn)) {
          if (annotation) {
            showErrorToast(new Error('Draw inside the highlighted parent space.'));
          }
          return false;
        }
        return true;
      }

      if (annotation) {
        const sessionForShape = subSpaceCanvasSessionRef.current;
        if (sessionForShape) {
          const parentAnn = localAnnotationsRef.current.find(
            (a) => a.id === sessionForShape.parentAnnotationId,
          );
          if (!parentAnn) return false;
          const probe = getShapeInteriorProbeNormalized(annotation);
          if (!probe || !isNormalizedPointInAssociatedSpaceShape(probe.x, probe.y, parentAnn)) {
            showErrorToast(new Error('Draw inside the highlighted parent space.'));
            return false;
          }
          return true;
        }

        if (
          isTopLevelLayoutSpaceBoundaryCandidate(annotation) &&
          layoutSpaceBoundaryOverlapsAny(annotation, localAnnotationsRef.current)
        ) {
          showErrorToast(
            new Error('This shape overlaps an existing space. Draw in an empty area.'),
          );
          return false;
        }
        return true;
      }

      if (type !== 'point') return true;
      const region = findAssociatedSpaceRegionAt(nx, ny, localAnnotationsRef.current);
      if (!region) {
        lastPlacementAnchorRef.current = null;
        return false;
      }
      const parentRef = String(region.space_ref || '').trim();
      lastPlacementAnchorRef.current = {
        clientX: typeof clientX === 'number' ? clientX : 0,
        clientY: typeof clientY === 'number' ? clientY : 0,
      };
      return true;
    },
    [isSuperAdmin, canWriteSpace, canMarkDesks],
  );

  const exitSubSpaceCanvasMode = useCallback(() => {
    subSpacePersistTimersRef.current.forEach((t) => window.clearTimeout(t));
    subSpacePersistTimersRef.current.clear();
    subSpaceEntrySourceRef.current = 'none';
    setSubSpaceCanvasSession(null);
  }, []);

  const beginSubSpaceCanvasZoom = useCallback(
    (ann, options) => {
      if (!canWriteSpace || !ann?.space_ref) return;
      const requestedMode = options?.mode === 'edit' ? 'edit' : 'create';
      subSpaceEntrySourceRef.current = 'canvas-zoom';
      const coworkingInventoryType = normalizeCoworkingInventoryType(
        ann.space?.coworking_inventory_type ?? ann.space?.details?.coworking_inventory_type ?? '',
      );
      const inventoryType = String(ann.space?.inventory_type ?? '').trim();
      const parentRef = String(ann.space_ref).trim();
      const hasExistingSubSpaces = layoutCoworkingParentHasDeskMarkerTargets(
        layoutDetailDataRef.current,
        parentRef,
      );
      const usesDeskMarkerWorkflow =
        isLayoutCoworkingSpace(inventoryType) &&
        isLayoutCoworkingDeskMarkerType(coworkingInventoryType);
      const resolvedMode =
        requestedMode === 'edit' ||
        (isLayoutCoworkingSpace(inventoryType) && (hasExistingSubSpaces || usesDeskMarkerWorkflow))
          ? 'edit'
          : requestedMode;

      setSubSpaceCanvasSession({
        mode: resolvedMode,
        parentAnnotationId: ann.id,
        parentSpaceRef: String(ann.space_ref).trim(),
        title: String(ann.space?.inventory_name ?? ann.space_ref ?? 'Space').trim(),
        inventoryType,
        coworkingInventoryType,
        request: { annotationId: ann.id, requestId: Date.now() },
      });
    },
    [canWriteSpace],
  );

  const handleDefineSubSpaceModalOpenChange = useCallback((open) => {
    setDefineSubSpaceOpen(open);
    defineSubSpaceModalOpenRef.current = open;
    if (!open) {
      const id = defineSubSpaceDraftRef.current?.id;
      const wasAssociateAdd = subSpaceEntrySourceRef.current === 'associate-add';
      setDefineSubSpaceDraft(null);
      setDefineSubSpaceParentTitle('');
      if (id) {
        setLocalAnnotations((prev) => prev.filter((a) => a.id !== id));
      }
      if (wasAssociateAdd) {
        subSpaceEntrySourceRef.current = 'none';
        setSubSpaceCanvasSession(null);
      }
    }
  }, []);

  const handleDefineSubSpaceSubmit = useCallback(
    async (form) => {
      const draft = defineSubSpaceDraftRef.current;
      const session = subSpaceCanvasSessionRef.current;
      if (!draft || !session || !floorRef) return;

      const shapeCoord = annotationToSubSpaceApiLayoutCoordinate(draft);
      if (!shapeCoord) {
        showErrorToast('Could not read shape geometry.');
        return;
      }

      const spaceId = String(session.parentSpaceRef).trim();
      if (!spaceId) {
        showErrorToast('Parent space is not set.');
        return;
      }

      const finishAfterSave = async (rowId) => {
        const draftId = draft.id;
        const pendingDots = localAnnotationsRef.current.filter(
          (a) => a.source === CENTER_SUBSPACE_MARKER,
        );
        const wasAssociateAdd = subSpaceEntrySourceRef.current === 'associate-add';
        setDefineSubSpaceOpen(false);
        defineSubSpaceModalOpenRef.current = false;
        setDefineSubSpaceDraft(null);
        setDefineSubSpaceParentTitle('');
        if (wasAssociateAdd) {
          subSpaceEntrySourceRef.current = 'none';
          setSubSpaceCanvasSession(null);
        }

        try {
          const detail = await dispatch(
            fetchLayoutDetail({ floorRef, filters: layoutApiFiltersRef.current }),
          ).unwrap();
          const shapes = flattenLayoutShapesToAnnotations(detail);
          const pins = flattenSubSpacePinAnnotations(detail);
          const desks = flattenDeskCoworkerMarkersFromLayoutDetail(detail);
          setLocalAnnotations(
            [...shapes, ...pins, ...desks, ...pendingDots].filter((a) => a.id !== draftId),
          );
          setSavedAnnotations(shapes);
          if (centerId) dispatch(getCenterDetailsThunk(centerId));
          showSuccessToast('Sub-space saved.');

          const activeSession = subSpaceCanvasSessionRef.current;
          if (activeSession && !wasAssociateAdd) {
            setSubSpaceCanvasSession((prev) =>
              prev
                ? {
                    ...prev,
                    mode: 'edit',
                    request: { annotationId: prev.parentAnnotationId, requestId: Date.now() },
                  }
                : prev,
            );
          }
        } catch {
          showErrorToast('Saved but failed to refresh layout. Reload the page.');
        }

        return rowId;
      };

      try {
        let rowId = '';

        if (form.mode === 'existing') {
          rowId = String(form.subSpaceRowId ?? '').trim();
          if (!rowId) {
            showErrorToast('Selected sub-space is missing an identifier.');
            return;
          }
        } else {
          const bbox = annotationToCreateSubSpaceBoundingBox(draft);
          if (!bbox) {
            showErrorToast('Could not read shape geometry.');
            return;
          }

          const deskCount =
            form.subSpaceType === 'Production Area'
              ? Math.max(1, Math.floor(Number(form.productionSeatCount ?? 1)))
              : 0;

          const subSpaceAreaType = resolveSubSpaceAreaTypeFromDefineForm(form);

          const createAction = await dispatch(
            createSubSpace({
              space_id: spaceId,
              sub_space_name: String(form.subSpaceName).trim(),
              sub_space_type: form.subSpaceType,
              sub_space_coordinate: bbox,
              desk_count: deskCount,
              ...(subSpaceAreaType != null ? { sub_space_area_type: subSpaceAreaType } : {}),
            }),
          );

          if (!createSubSpace.fulfilled.match(createAction)) {
            const msg =
              typeof createAction.payload === 'string'
                ? createAction.payload
                : 'Could not create sub-space.';
            showErrorToast(msg);
            return;
          }

          const created = createAction.payload;
          rowId = String(
            created?.sub_space?.sub_space_row_id ?? created?.sub_space_row_id ?? '',
          ).trim();
          if (!rowId) {
            showErrorToast('Server did not return sub_space_row_id.');
            return;
          }
        }

        const saveAction = await dispatch(
          saveSubSpaceLayoutCoordinate({
            space_id: spaceId,
            sub_space_row_id: rowId,
            sub_space_coordinate: shapeCoord,
          }),
        );

        if (!saveSubSpaceLayoutCoordinate.fulfilled.match(saveAction)) {
          const msg =
            typeof saveAction.payload === 'string'
              ? saveAction.payload
              : form.mode === 'existing'
                ? 'Could not link sub-space to this shape.'
                : 'Sub-space was created but layout could not be saved.';
          showErrorToast(msg);
          return;
        }

        await finishAfterSave(rowId);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to save sub-space.' });
      }
    },
    [dispatch, floorRef, centerId],
  );

  const handleAnnotationsChange = useCallback(
    (nextAnnotations, meta) => {
      if (meta?.kind === 'undo' || meta?.kind === 'redo') {
        setLocalAnnotations(nextAnnotations);
        return true;
      }

      if (!isSuperAdmin && !canWriteSpace) {
        setLocalAnnotations(nextAnnotations);
        return true;
      }

      let mapped = nextAnnotations;

      if (canMarkDesks || isSuperAdmin) {
        mapped = nextAnnotations.map((a) => {
          if (a.type !== 'point' || a.source) return a;
          const s = subSpaceCanvasSessionRef.current;
          if (s && (s.mode === 'edit' || isLayoutManagedOfficeSpace(s.inventoryType))) {
            return { ...a, source: DESK_COWORKER_MARKER };
          }
          if (isSuperAdmin) {
            return { ...a, source: CENTER_SUBSPACE_MARKER };
          }
          return a;
        });
      }

      if (isSuperAdmin && !subSpaceCanvasSessionRef.current) {
        const prevTop = localAnnotationsRef.current;
        const prevTopIds = new Set(prevTop.map((a) => a.id));
        const addedTopLevel = mapped.filter((a) => !prevTopIds.has(a.id));
        for (const item of addedTopLevel) {
          if (!isTopLevelLayoutSpaceBoundaryCandidate(item)) continue;
          if (layoutSpaceBoundaryOverlapsAny(item, prevTop)) {
            showErrorToast(
              new Error('This shape overlaps an existing space. Draw in an empty area.'),
            );
            setLocalAnnotations(prevTop);
            return false;
          }
        }

        const prevById = new Map(prevTop.map((a) => [a.id, a]));
        for (const item of mapped) {
          if (!isTopLevelLayoutSpaceBoundaryCandidate(item)) continue;
          const previous = prevById.get(item.id);
          if (!previous) continue;
          if (JSON.stringify(toCleanCoord(item)) === JSON.stringify(toCleanCoord(previous))) {
            continue;
          }
          if (layoutSpaceBoundaryOverlapsAny(item, mapped, { excludeId: item.id })) {
            showErrorToast(
              new Error('This shape overlaps an existing space. Adjust within empty space.'),
            );
            setLocalAnnotations(prevTop);
            return false;
          }
        }
      }

      const session = subSpaceCanvasSessionRef.current;
      if (canWriteSpace && session && !defineSubSpaceModalOpenRef.current) {
        const prev = localAnnotationsRef.current;
        const allPrevIds = new Set(prev.map((a) => a.id));
        const added = mapped.filter((a) => !allPrevIds.has(a.id));
        const parentAnn = prev.find((a) => a.id === session.parentAnnotationId);
        const parentRef = String(session.parentSpaceRef || '').trim();

        for (const item of added) {
          if (item.type === 'point') continue;
          if (!['rectangle', 'circle', 'pen'].includes(item.type)) continue;
          if (item.source === SUBSPACE_LAYOUT_PENDING_SOURCE) continue;
          if (!parentAnn) {
            showErrorToast('Parent space not found.');
            setLocalAnnotations(prev);
            return false;
          }
          const probe = getShapeInteriorProbeNormalized(item);
          if (!probe || !isNormalizedPointInAssociatedSpaceShape(probe.x, probe.y, parentAnn)) {
            showErrorToast('Draw inside the highlighted parent space.');
            setLocalAnnotations(prev);
            return false;
          }
          const tagged = {
            ...item,
            source: SUBSPACE_LAYOUT_PENDING_SOURCE,
            locked: true,
            allowBoundsResize: true,
            hideFromLayers: true,
          };
          mapped = mapped.map((a) => (a.id === item.id ? tagged : a));
          setDefineSubSpaceDraft(tagged);
          setDefineSubSpaceParentTitle(session.title || '');
          defineSubSpaceModalOpenRef.current = true;
          setDefineSubSpaceOpen(true);
          break;
        }
      }

      const subSession = subSpaceCanvasSessionRef.current;
      const subSessionIsManagedOffice = isLayoutManagedOfficeSpace(subSession?.inventoryType);
      const subSessionIsCoworking = isLayoutCoworkingSpace(subSession?.inventoryType);
      const subSessionAllowsDeskMarkers =
        canMarkDesks &&
        subSession &&
        (subSessionIsManagedOffice || (subSession.mode === 'edit' && subSessionIsCoworking));

      if (subSessionAllowsDeskMarkers) {
        const spaceId = String(subSession.parentSpaceRef || '').trim();
        if (spaceId) {
          const prevPins = localAnnotationsRef.current;
          if (subSession.mode === 'edit') {
            for (const a of mapped) {
              if (a.source !== SERVER_SUBSPACE_PIN_SOURCE) continue;
              if (String(a.space_ref || '').trim() !== spaceId) continue;
              const old = prevPins.find((p) => p.id === a.id);
              if (!old) continue;
              if (subSpacePinGeometrySig(old) === subSpacePinGeometrySig(a)) continue;
              const meta = a.sub_space_meta ?? {};
              const rowId = String(meta.sub_space_row_id ?? meta.name ?? '').trim();
              if (!rowId) continue;
              const timers = subSpacePersistTimersRef.current;
              const existing = timers.get(a.id);
              if (existing) window.clearTimeout(existing);
              timers.set(
                a.id,
                window.setTimeout(() => {
                  timers.delete(a.id);
                  const coord = annotationToSubSpaceApiLayoutCoordinate(a);
                  if (!coord) return;
                  dispatch(
                    saveSubSpaceLayoutCoordinate({
                      space_id: spaceId,
                      sub_space_row_id: rowId,
                      sub_space_coordinate: coord,
                    }),
                  ).then((action) => {
                    if (saveSubSpaceLayoutCoordinate.rejected.match(action)) {
                      showErrorToast(action.payload, {
                        defaultMessage: 'Failed to save sub-space layout.',
                      });
                    }
                  });
                }, 450),
              );
            }
          }

          const detailForDesks = layoutDetailDataRef.current;
          const newDeskPoints = mapped.filter(
            (a) =>
              a.type === 'point' &&
              a.source === DESK_COWORKER_MARKER &&
              !a.desk_id &&
              !prevPins.some((p) => p.id === a.id),
          );
          for (const m of newDeskPoints) {
            const pin = subSessionIsCoworking
              ? findCoworkingSubSpaceTargetAtPoint(detailForDesks, mapped, spaceId, m.x, m.y)
              : findServerSubSpacePinContainingNormalizedPoint(mapped, spaceId, m.x, m.y);
            if (!pin) {
              showErrorToast(
                subSessionIsCoworking
                  ? 'Place the marker inside the co-working space.'
                  : 'Place the marker inside a sub-space.',
              );
              setLocalAnnotations(prevPins);
              return false;
            }
            const ssid = String(pin.sub_space_id || '').trim();
            if (!ssid) {
              showErrorToast('Sub-space is missing an id. Reload the layout and try again.');
              setLocalAnnotations(prevPins);
              return false;
            }

            if (subSessionIsCoworking) {
              const parentAnn = prevPins.find((a) => a.id === subSession.parentAnnotationId);
              const parentSpace =
                parentAnn?.space ?? findLayoutShapeMergedSpace(detailForDesks, spaceId);
              const placementError = validateCoworkingMarkerPlacement(
                detailForDesks,
                mapped,
                spaceId,
                ssid,
                pin,
                parentSpace,
              );
              if (placementError) {
                showErrorToast(placementError);
                setLocalAnnotations(prevPins);
                return false;
              }
            }

            const deskId = pickNextUnplacedDeskId(detailForDesks, mapped, spaceId, ssid);
            if (!deskId) {
              const configuredDesks = getDesksForSubSpaceFromLayoutDetail(
                detailForDesks,
                spaceId,
                ssid,
              );
              showErrorToast(
                configuredDesks.length === 0
                  ? subSessionIsCoworking
                    ? 'No desks are configured for this co-working space.'
                    : 'No desks are configured for this sub-space.'
                  : subSessionIsCoworking
                    ? 'All desks for this co-working space already have a location.'
                    : 'All desks for this sub-space already have a location.',
              );
              setLocalAnnotations(prevPins);
              return false;
            }
            const deskRow =
              getDesksForSubSpaceFromLayoutDetail(detailForDesks, spaceId, ssid).find(
                (desk) => String(desk?.desk_id ?? '').trim() === deskId,
              ) ?? null;
            mapped = mapped.map((a) =>
              a.id === m.id
                ? enrichDeskCoworkerMarkerFromDeskRow(
                    {
                      ...a,
                      id: `desk-coworker-${deskId}`,
                      desk_id: deskId,
                      sub_space_id: ssid,
                      parent_space_ref: spaceId,
                      hasCoordinateOnServer: false,
                    },
                    deskRow,
                  )
                : a,
            );
          }

          if (subSession.mode === 'edit') {
            for (const a of mapped) {
              if (a.source !== DESK_COWORKER_MARKER) continue;
              if (String(a.parent_space_ref || '').trim() !== spaceId) continue;
              if (!a.desk_id) continue;

              if (subSessionIsCoworking) {
                const pinCheck = findCoworkingSubSpaceTargetAtPoint(
                  detailForDesks,
                  mapped,
                  spaceId,
                  a.x,
                  a.y,
                );
                const deskSubSpaceId = String(a.sub_space_id || '').trim();
                if (!pinCheck || String(pinCheck.sub_space_id || '').trim() !== deskSubSpaceId) {
                  showErrorToast('Keep desk markers inside their sub-space.');
                  setLocalAnnotations(prevPins);
                  return false;
                }
                continue;
              }

              const pinCheck = findServerSubSpacePinContainingNormalizedPoint(
                mapped,
                spaceId,
                a.x,
                a.y,
              );
              const deskSubSpaceId = String(a.sub_space_id || '').trim();
              if (!pinCheck || String(pinCheck.sub_space_id || '').trim() !== deskSubSpaceId) {
                showErrorToast('Keep desk markers inside their sub-space.');
                setLocalAnnotations(prevPins);
                return false;
              }
            }
          }
        }
      }

      const prevIds = new Set(
        localAnnotationsRef.current
          .filter((a) => a.source === CENTER_SUBSPACE_MARKER)
          .map((a) => a.id),
      );
      const newMarkers = isSuperAdmin
        ? mapped.filter(
            (a) => a.type === 'point' && a.source === CENTER_SUBSPACE_MARKER && !prevIds.has(a.id),
          )
        : [];

      if (newMarkers.length > 0) {
        for (const m of newMarkers) {
          const region = findAssociatedSpaceRegionAt(m.x, m.y, mapped);
          const label =
            region?.label ||
            region?.space?.inventory_name ||
            region?.space?.name ||
            region?.space_ref ||
            '';
          mapped = mapped.map((a) =>
            a.id === m.id && region
              ? {
                  ...a,
                  parent_space_ref: region.space_ref,
                  space_label: String(label).trim(),
                }
              : a,
          );
        }
      }

      lastPlacementAnchorRef.current = null;

      setLocalAnnotations(mapped);

      const draftId = defineSubSpaceDraftRef.current?.id;
      if (draftId && defineSubSpaceModalOpenRef.current) {
        const updatedDraft = mapped.find(
          (a) => a.id === draftId && a.source === SUBSPACE_LAYOUT_PENDING_SOURCE,
        );
        if (updatedDraft) {
          setDefineSubSpaceDraft(updatedDraft);
        }
      }

      return true;
    },
    [isSuperAdmin, canWriteSpace, canMarkDesks, dispatch],
  );

  const handleClickAssociateNew = useCallback(
    (ann) => {
      if (!canWriteSpace || !ann) return;

      const drawableTypes = ['rectangle', 'circle', 'pen'];
      const isDrawable = drawableTypes.includes(ann.type);
      const isUnassociated = !String(ann.space_ref || '').trim();

      let parent = null;
      if (isDrawable && isUnassociated) {
        const list = localAnnotationsRef.current;
        const cand = findContainingParentSpaceForUnassociatedChild(ann, list);
        if (cand) {
          const probe = getShapeInteriorProbeNormalized(ann);
          if (probe) {
            const top = findAssociatedSpaceRegionAt(probe.x, probe.y, list);
            if (top && top.id === cand.id) parent = cand;
          }
        }
      }

      if (parent) {
        const tagged = {
          ...ann,
          source: SUBSPACE_LAYOUT_PENDING_SOURCE,
          locked: true,
          allowBoundsResize: true,
          hideFromLayers: true,
        };
        subSpaceEntrySourceRef.current = 'associate-add';
        setLocalAnnotations((prev) => prev.map((a) => (a.id === ann.id ? tagged : a)));
        setSubSpaceCanvasSession({
          mode: 'create',
          parentAnnotationId: parent.id,
          parentSpaceRef: String(parent.space_ref).trim(),
          title: String(parent.space?.inventory_name ?? parent.space_ref ?? 'Space').trim(),
          inventoryType: String(parent.space?.inventory_type ?? '').trim(),
          request: null,
        });
        setDefineSubSpaceDraft(tagged);
        setDefineSubSpaceParentTitle(
          String(parent.space?.inventory_name ?? parent.space_ref ?? '').trim(),
        );
        defineSubSpaceModalOpenRef.current = true;
        setDefineSubSpaceOpen(true);
        return;
      }

      setSelectedAnnotationForSave(ann);
      setSelectedSpaceRef('');
      setAssociateModalOpen(true);
    },
    [canWriteSpace],
  );

  const handleClickAssociateEdit = useCallback((ann) => {
    setSelectedAnnotationForSave(ann);
    setSelectedSpaceRef(ann.space_ref || '');
    setAssociateModalOpen(true);
  }, []);

  useEffect(() => {
    if (!isDirty || isSaving) return undefined;
    const timer = setInterval(() => {
      saveChanges();
    }, 30_000);
    return () => clearInterval(timer);
  }, [isDirty, isSaving, saveChanges]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleBack = useCallback(() => {
    if (isDirty) {
      const leave = window.confirm('You have unsaved changes. Leave this layout anyway?');
      if (!leave) return;
    }
    const cid = String(centerId || '').trim();
    if (!cid) {
      navigate(-1);
      return;
    }
    navigate(`/centers/${encodeURIComponent(cid)}?tab=space&view=${CENTER_LAYOUTS_VIEW_QUERY}`);
  }, [centerId, isDirty, navigate]);

  const headerFloorLabel = useMemo(() => String(floorLabel || '').trim(), [floorLabel]);

  return (
    <Tooltip.Provider delayDuration={200}>
      <LayoutAnnotationPageLayout
        centerTitle={centerDisplayTitle}
        floorLabel={layoutDetailMatchesRoute ? headerFloorLabel : floorRef || ''}
        availableSpaceCount={layoutDetailMatchesRoute ? availableSpaceCount : null}
        onBack={handleBack}
        headerFilters={
          <LayoutAnnotationHeaderFilters
            clientOptions={layoutClientFilterOptions}
            spaceOptions={layoutSpaceFilterOptions}
            clientId={canvasFilterClientId}
            spaceRef={canvasFilterSpaceRef}
            spaceTypes={canvasFilterSpaceTypes}
            occupancy={canvasFilterOccupancy}
            onClientIdChange={setCanvasFilterClientId}
            onSpaceRefChange={setCanvasFilterSpaceRef}
            onSpaceTypesChange={handleCanvasFilterSpaceTypesChange}
            onOccupancyChange={setCanvasFilterOccupancy}
            agreementDateFilter={canvasFilterAgreementDate}
            onAgreementDateFilterChange={setCanvasFilterAgreementDate}
            spaceOptionsLoading={isLayoutSpaceFilterLoading}
            onSpaceSearchQueryChange={setSpaceFilterSearchQuery}
          />
        }
      >
        <LayoutAnnotationFloorPlanSection
          stageRef={stageRef}
          showBlockingLayoutSpinner={showBlockingLayoutSpinner}
          layoutDetailError={layoutDetailError}
          layoutImage={layoutImage}
          floorRef={floorRef}
          imageUrl={imageUrl}
          localAnnotations={localAnnotations}
          onAnnotationsChange={handleAnnotationsChange}
          onRenameAnnotation={handleRenameAnnotation}
          onReorderAnnotations={handleReorderAnnotations}
          layoutToolbarToolIds={layoutToolbarToolIds}
          isSuperAdmin={isSuperAdmin}
          canWriteSpace={canWriteSpace}
          canMarkDesks={canMarkDesks}
          onBeforeAnnotationAdd={handleBeforeAnnotationAdd}
          onClickAssociateNew={handleClickAssociateNew}
          onClickAssociateEdit={handleClickAssociateEdit}
          onRemoveAssociation={handleRemoveAssociation}
          onDeleteSubSpace={isSuperAdmin ? handleRequestDeleteSubSpace : undefined}
          onRequestDeleteSelected={isSuperAdmin ? handleRequestDeleteSelected : undefined}
          isSavingLayoutCoordinates={isSavingLayoutCoordinates}
          isDeletingSubSpace={isDeletingSubSpace}
          subSpaceCanvasSession={subSpaceCanvasSession}
          onExitSubSpaceCanvasMode={exitSubSpaceCanvasMode}
          onBeginSubSpaceCanvasZoom={beginSubSpaceCanvasZoom}
          onAllocateClientFromAnnotation={handleAllocateClientFromAnnotation}
          layoutDetailData={layoutDetailData}
          onSaveDeskCoworkerMarkers={
            canMarkDesks &&
            subSpaceCanvasSession?.mode === 'edit' &&
            (isLayoutManagedOfficeSpace(subSpaceCanvasSession?.inventoryType ?? '') ||
              isLayoutCoworkingSpace(subSpaceCanvasSession?.inventoryType ?? ''))
              ? handleSaveDeskCoworkerMarkers
              : undefined
          }
          isSavingDeskCoworkerMarkers={isSavingDeskMarkers}
          isDeskCoworkerSaveDisabled={!isDeskCoworkerLayoutDirty}
          onRemoveDeskCoworkerMarker={canMarkDesks ? handleRemoveDeskCoworkerMarker : undefined}
          layoutCanvasFilters={layoutCanvasFilters}
          annotationsMatchActiveFilters={annotationsMatchActiveFilters}
          isLayoutDirty={isDirty}
          isSavingLayout={isSaving}
          onSaveLayoutChanges={saveChanges}
          historyResetKey={floorRef}
        />

        {canWriteSpace ? (
          <LayoutAnnotationDefineSubSpaceModal
            open={defineSubSpaceOpen}
            onOpenChange={handleDefineSubSpaceModalOpenChange}
            parentSpaceId={subSpaceCanvasSession?.parentSpaceRef ?? ''}
            parentSpaceTitle={defineSubSpaceParentTitle}
            isSaving={isSavingSubSpaceLayout}
            onSubmit={handleDefineSubSpaceSubmit}
          />
        ) : null}

        <LayoutAnnotationAssociateSpaceModal
          open={associateModalOpen}
          onOpenChange={(nextOpen) => {
            setAssociateModalOpen(nextOpen);
            if (!nextOpen) {
              setSelectedAnnotationForSave(null);
              setSelectedSpaceRef('');
              setAssociateSpaceRowOverride(null);
            }
          }}
          selectedSpaceRef={selectedSpaceRef}
          onSelectedSpaceRefChange={setSelectedSpaceRef}
          isSavingLayoutCoordinates={isSavingLayoutCoordinates}
          isCreateSpaceLoading={isCreateSpaceLoading}
          onSave={handleAssociateModalSubmit}
          centerId={centerId}
          blockFloorId={blockFloorId}
          floorRef={floorRef}
          initialAssociateSpaceRow={associateModalInitialSpaceRow}
          onAssociateSpaceRowOverrideChange={setAssociateSpaceRowOverride}
        />

        {allocateClientOpen && mergedAllocateSpace ? (
          <LayoutAnnotationAllocateClientModal
            open={allocateClientOpen}
            onOpenChange={handleAllocateModalOpenChange}
            mergedSpace={mergedAllocateSpace}
            centerApiId={centerForApi}
            blockFloorId={blockFloorId}
            clientsList={allocateClientsList}
            onAllocateSuccess={handleAllocateSuccess}
          />
        ) : null}

        <Modal.Root
          open={Boolean(removeAssociationTarget)}
          onOpenChange={(open) => {
            if (!open) setRemoveAssociationTarget(null);
          }}
        >
          <Modal.Content className='max-w-[450px]'>
            <Modal.Header
              variant='default'
              icon={
                <span className='rounded-lg bg-warning-base/10 p-2'>
                  <RiAlertFill size={24} className='text-warning-base' />
                </span>
              }
              title='Remove association?'
              description={`Are you sure you want to remove the association for ${
                removeAssociationTarget?.space?.inventory_name ||
                removeAssociationTarget?.label ||
                removeAssociationTarget?.space_ref ||
                'this space'
              }? The shape will remain on the layout but will no longer be linked to the space.`}
            />
            <Modal.Footer>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                className='w-full'
                disabled={isSavingLayoutCoordinates}
                onClick={() => setRemoveAssociationTarget(null)}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='button'
                variant='primary'
                mode='filled'
                size='small'
                className='w-full'
                disabled={isSavingLayoutCoordinates}
                onClick={() => void handleConfirmRemoveAssociation()}
              >
                {isSavingLayoutCoordinates ? 'Removing…' : 'Confirm'}
              </Button.Root>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>

        <Modal.Root
          open={Boolean(deleteSubSpaceTarget)}
          onOpenChange={(open) => {
            if (!open && !isDeletingSubSpace) setDeleteSubSpaceTarget(null);
          }}
        >
          <Modal.Content className='max-w-[450px]'>
            <Modal.Header
              variant='default'
              icon={
                <span className='rounded-lg bg-warning-base/10 p-2'>
                  <RiAlertFill size={24} className='text-warning-base' />
                </span>
              }
              title='Delete sub-space?'
              description={`Are you sure you want to delete ${
                deleteSubSpaceTarget?.sub_space_meta?.sub_space_name ||
                deleteSubSpaceTarget?.label ||
                deleteSubSpaceTarget?.sub_space_id ||
                'this sub-space'
              }? This action cannot be undone.`}
            />
            <Modal.Footer>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                className='w-full'
                disabled={isDeletingSubSpace}
                onClick={() => setDeleteSubSpaceTarget(null)}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='button'
                variant='primary'
                mode='filled'
                size='small'
                className='w-full'
                disabled={isDeletingSubSpace}
                onClick={() => void handleConfirmDeleteSubSpace()}
              >
                {isDeletingSubSpace ? 'Deleting…' : 'Confirm'}
              </Button.Root>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      </LayoutAnnotationPageLayout>
    </Tooltip.Provider>
  );
};

export default LayoutAnnotationPage;
