import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { RiDownloadLine } from 'react-icons/ri';

import emptyStateImage from '@/assets/images/empty-state.png';
import { CLIENT_DETAIL_EMPTY_STATES } from '@/components/clients-management/constants';

import { ClientViewFloorPlanEditor } from '@/components/floor-plan-editor/react/client-viewer';
import * as Button from '@/components/ui/button';
import ClientLayoutHeaderFilters from '@/pages/clients/client-layout-header-filters';
import ClientLayoutPageLayout from '@/pages/clients/client-layout-page-layout';
import {
  clearClientFloorLayoutDetail,
  fetchAllocatedFloorLayoutsThunk,
  fetchClientFloorLayoutCoordinatesThunk,
  getClientDetailThunk,
  selectAllocatedFloorLayouts,
  selectClientDetail,
  selectClientFloorLayoutDetail,
} from '@/redux/clientDetailSlice';
import {
  clearCoworkerListState,
  getCoworkerListThunk,
  selectCoworkerListState,
} from '@/redux/coworkerSlice';
import { buildClientViewSpaceAnnotations } from '@/utils/client-floor-layout-annotations';
import {
  CLIENT_LAYOUT_FILTER_ALL,
  buildClientLayoutCoworkerFilterOptionsFromRows,
  buildClientLayoutDepartmentFilterOptions,
  buildClientLayoutDetailApiFilters,
} from '@/utils/client-layout-coworker-filters';
import {
  collectLayoutImageSrcCandidates,
  getLayoutImagePathFromRecord,
} from '@/utils/layout-image-path';
import {
  canAccessClientCoworkerLayout,
  hasClientCoworkerWritePermission,
} from '@/utils/user-role-utils';

/**
 * Client allocate layout: same shell as center `layout-annotation-page.jsx` (PageLayout + FloorPlanEditor).
 * Data from `get_client_floor_layout_coordinates` only (view/preview; read-only).
 *
 * Route: `/clients/:id/allocate-layout/:centerId/:blockFloorId`
 */
const ClientAllocateLayoutEditorPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: clientRouteId = '', centerId = '', blockFloorId = '' } = useParams();

  const customer_id = String(clientRouteId || '').trim();
  const center_id = String(centerId || '').trim();
  const block_floor_id = String(blockFloorId || '').trim();

  const detail = useSelector(selectClientFloorLayoutDetail);
  const clientDetail = useSelector(selectClientDetail);
  const allocatedFloorLayouts = useSelector(selectAllocatedFloorLayouts);
  const coworkerList = useSelector(selectCoworkerListState);
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canAccessClientLayout = useMemo(
    () => canAccessClientCoworkerLayout(userSideBarPerm),
    [userSideBarPerm],
  );
  const canWriteClientLayout = useMemo(
    () => hasClientCoworkerWritePermission(userSideBarPerm),
    [userSideBarPerm],
  );
  const stageRef = useRef(null);

  const [layoutImage, setLayoutImage] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [imageLoadError, setImageLoadError] = useState(null);

  const [coworkerSearchInput, setCoworkerSearchInput] = useState('');
  const [filterWorkType, setFilterWorkType] = useState(CLIENT_LAYOUT_FILTER_ALL);
  const [filterCoworkerRef, setFilterCoworkerRef] = useState(CLIENT_LAYOUT_FILTER_ALL);
  const [filterDepartment, setFilterDepartment] = useState(CLIENT_LAYOUT_FILTER_ALL);

  /** Stable JSON key for the filter payload sent to `get_client_floor_layout_coordinates`. */
  const layoutApiFilters = useMemo(
    () =>
      buildClientLayoutDetailApiFilters({
        workType: filterWorkType,
        department: filterDepartment,
        coworkerRef: filterCoworkerRef,
      }),
    [filterWorkType, filterDepartment, filterCoworkerRef],
  );

  useEffect(() => {
    if (!customer_id) return undefined;
    dispatch(fetchAllocatedFloorLayoutsThunk({ customer: customer_id }));
  }, [dispatch, customer_id]);

  useEffect(() => {
    if (!customer_id) return;
    dispatch(getClientDetailThunk(customer_id));
  }, [customer_id, dispatch]);

  /**
   * Fetch the full co-worker list for this client once; powers the search
   * popover + dropdown options regardless of who is currently placed on the
   * floor plan.
   */
  useEffect(() => {
    if (!customer_id) return undefined;
    dispatch(
      getCoworkerListThunk({
        client_id: customer_id,
        page: 1,
        limitPageLength: 200,
        orderBy: 'modified desc',
        append: false,
      }),
    );
    return () => {
      dispatch(clearCoworkerListState());
    };
  }, [dispatch, customer_id]);

  useEffect(() => {
    if (!center_id || !customer_id || !block_floor_id) return;
    dispatch(
      fetchClientFloorLayoutCoordinatesThunk({
        center_id,
        customer_id,
        block_floor_id,
        filters: layoutApiFilters,
      }),
    );
  }, [dispatch, center_id, customer_id, block_floor_id, layoutApiFilters]);

  /**
   * Clear cached layout only when the route itself changes (or on unmount) so
   * data stays mounted while the user toggles filters and the canvas avoids a
   * flicker on every refetch.
   */
  useEffect(() => {
    return () => {
      dispatch(clearClientFloorLayoutDetail());
    };
  }, [dispatch, center_id, customer_id, block_floor_id]);

  const payload = detail?.data && typeof detail.data === 'object' ? detail.data : null;

  const layoutRecord = payload?.floor_detail ?? {};

  const listImageFromNav = useMemo(() => {
    const raw = location.state?.layoutImageFromList;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [location.state]);

  const listImageFromAllocatedApi = useMemo(() => {
    const rows = Array.isArray(allocatedFloorLayouts?.data) ? allocatedFloorLayouts.data : [];
    const row = rows.find((r) => {
      const c = String(r?.center ?? '').trim();
      const bf = String(r?.block_floor_id ?? r?.allocated_floor ?? '').trim();
      return c === center_id && bf === block_floor_id;
    });
    return String(row?.layout_image ?? '').trim();
  }, [allocatedFloorLayouts?.data, center_id, block_floor_id]);

  const imagePathRaw = useMemo(() => {
    const fromDetailApi = getLayoutImagePathFromRecord(layoutRecord);
    if (fromDetailApi) return fromDetailApi;
    if (listImageFromNav) return listImageFromNav;
    if (listImageFromAllocatedApi) return listImageFromAllocatedApi;
    return '';
  }, [layoutRecord, listImageFromNav, listImageFromAllocatedApi]);

  const floorLabel =
    layoutRecord?.block_floor_id ?? payload?.block_floor_id ?? block_floor_id ?? '';

  const pageDisplayId =
    payload?.floor_ref ?? layoutRecord?.name ?? block_floor_id ?? center_id ?? '';

  useEffect(() => {
    if (!imagePathRaw.trim()) {
      setLayoutImage(null);
      setImageLoadError(null);
      return undefined;
    }

    let cancelled = false;
    setImageLoadError(null);

    const candidates = collectLayoutImageSrcCandidates(imagePathRaw);

    const attempt = (index) => {
      if (cancelled || index >= candidates.length) {
        if (!cancelled) {
          setLayoutImage(null);
          setImageLoadError(
            `Could not load image. Tried ${candidates.length || 0} URL variant(s). Check that the file exists and you are logged in.`,
          );
        }
        return;
      }

      const src = candidates[index];
      const img = new window.Image();

      function handleLoad() {
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
        if (cancelled) return;
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setLayoutImage(img);
          setImageLoadError(null);
        } else {
          attempt(index + 1);
        }
      }

      function handleError() {
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
        if (!cancelled) attempt(index + 1);
      }

      img.addEventListener('load', handleLoad);
      img.addEventListener('error', handleError);
      img.src = src;
    };

    attempt(0);

    return () => {
      cancelled = true;
    };
  }, [imagePathRaw]);

  useEffect(() => {
    if (!payload?.spaces) {
      setAnnotations([]);
      return;
    }
    setAnnotations(buildClientViewSpaceAnnotations(payload.spaces));
  }, [payload]);

  useEffect(() => {
    setCoworkerSearchInput('');
    setFilterWorkType(CLIENT_LAYOUT_FILTER_ALL);
    setFilterCoworkerRef(CLIENT_LAYOUT_FILTER_ALL);
    setFilterDepartment(CLIENT_LAYOUT_FILTER_ALL);
  }, [center_id, customer_id, block_floor_id]);

  const coworkerFilterOptions = useMemo(
    () => buildClientLayoutCoworkerFilterOptionsFromRows(coworkerList?.rows),
    [coworkerList?.rows],
  );

  const departmentFilterOptions = useMemo(
    () => buildClientLayoutDepartmentFilterOptions(clientDetail?.data),
    [clientDetail?.data],
  );

  /** Coworker picked from the search popover should drive the same filter as the dropdown. */
  const handleSearchPick = useCallback((ref) => {
    setFilterCoworkerRef(String(ref || '').trim() || CLIENT_LAYOUT_FILTER_ALL);
  }, []);

  /**
   * Keep the search input text in sync with the coworker dropdown selection so
   * both controls reflect the same active coworker filter.
   */
  const handleCoworkerRefChange = useCallback(
    (next) => {
      setFilterCoworkerRef(next);
      if (next === CLIENT_LAYOUT_FILTER_ALL) {
        setCoworkerSearchInput('');
        return;
      }
      const match = coworkerFilterOptions.find((opt) => opt.value === next);
      setCoworkerSearchInput(match?.label || '');
    },
    [coworkerFilterOptions],
  );

  /** Coworker to highlight on the canvas (= currently-selected coworker filter). */
  const highlightCoworkerRef =
    filterCoworkerRef && filterCoworkerRef !== CLIENT_LAYOUT_FILTER_ALL ? filterCoworkerRef : '';

  /** Any active filter dims the rest of the layout so the matching sub-spaces stand out. */
  const isFilterActive = Boolean(layoutApiFilters);

  const downloadURI = useCallback((uri, name) => {
    const link = document.createElement('a');
    link.download = name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleExportLayout = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) {
      alert('Stage not ready');
      return;
    }
    const uri = stage.toDataURL({ pixelRatio: 2 });
    if (!uri || uri === 'data:,') {
      alert('Export failed');
      return;
    }
    downloadURI(uri, 'client-floor-layout.png');
  }, [downloadURI]);

  const handleBack = useCallback(() => {
    navigate(`/clients/${encodeURIComponent(customer_id)}?tab=allocate&allocateLayout=1`);
  }, [navigate, customer_id]);

  const layoutKey = String(payload?.floor_ref ?? layoutRecord?.name ?? block_floor_id ?? 'floor');

  /** Full-page loader only before we have any API payload; background refetch keeps the editor mounted. */
  const showBlockingLayoutSpinner = Boolean(detail?.isLoading && !payload);

  let editorContent;
  if (!canAccessClientLayout) {
    const emptyState = CLIENT_DETAIL_EMPTY_STATES.clientLayout;
    editorContent = (
      <div className='flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
        <img
          className='mb-4 max-w-[200px] object-contain'
          src={emptyStateImage}
          alt=''
          aria-hidden
        />
        <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{emptyState.title}</h3>
        <p className='max-w-md text-sm text-text-sub-600'>{emptyState.description}</p>
      </div>
    );
  } else if (!center_id || !customer_id || !block_floor_id) {
    editorContent = (
      <div className='flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-6 text-center text-paragraph-sm text-text-sub-600'>
        Invalid layout link. Open the layout again from the client Allocate tab.
      </div>
    );
  } else if (showBlockingLayoutSpinner) {
    editorContent = (
      <div className='flex min-h-[320px] items-center justify-center rounded-xl border border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        Loading layout...
      </div>
    );
  } else if (detail?.error && !payload) {
    editorContent = (
      <div className='flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-error-lighter bg-bg-weak-50 px-6 text-paragraph-sm text-error-base'>
        {String(detail.error)}
      </div>
    );
  } else if (!payload && !detail?.isLoading) {
    editorContent = (
      <div className='flex min-h-[320px] items-center justify-center rounded-xl border border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        No layout data.
      </div>
    );
  } else if (payload && !imagePathRaw) {
    editorContent = (
      <div className='flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-6 text-center text-paragraph-sm text-text-sub-600'>
        <p className='font-medium text-text-strong-950'>Layout image not found</p>
        <p className='max-w-md'>
          No layout image path for this floor. Open the layout from the Allocate tab list (the list
          API provides the image), or upload a layout image on the center Floors tab.
        </p>
      </div>
    );
  } else if (imageLoadError && !layoutImage) {
    editorContent = (
      <div className='flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-error-lighter bg-bg-weak-50 px-6 text-center text-paragraph-sm text-text-sub-600'>
        <p className='font-medium text-error-base'>Could not load floor plan image</p>
        <p className='max-w-lg text-paragraph-sm'>{imageLoadError}</p>
        <p className='max-w-lg break-all text-paragraph-xs text-text-soft-400'>
          Path from app: {imagePathRaw}
        </p>
      </div>
    );
  } else if (!layoutImage) {
    editorContent = (
      <div className='flex min-h-[320px] items-center justify-center rounded-xl border border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        Loading floor plan image…
      </div>
    );
  } else if (layoutImage.naturalWidth > 0 && layoutImage.naturalHeight > 0) {
    editorContent = (
      <ClientViewFloorPlanEditor
        stageRef={stageRef}
        key={layoutKey}
        layoutId={layoutKey}
        className='min-h-[min(70vh,800px)]'
        image={{
          url: layoutImage.src,
          width: layoutImage.naturalWidth,
          height: layoutImage.naturalHeight,
          raster: layoutImage,
        }}
        spaceAnnotations={annotations}
        customerId={customer_id}
        centerId={center_id}
        blockFloorId={block_floor_id}
        highlightCoworkerRef={highlightCoworkerRef}
        canWriteClientLayout={canWriteClientLayout}
        filterActive={isFilterActive}
        fitContentOnMount
      />
    );
  } else {
    editorContent = (
      <div className='flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-6 text-center text-paragraph-sm text-text-sub-600'>
        <p className='font-medium text-text-strong-950'>Layout image not available</p>
        <p className='max-w-md'>
          Upload a layout image on the center floor row, or try again when the API returns
          layout_image.
        </p>
      </div>
    );
  }

  const shellTitle = pageDisplayId ? `Layout ${pageDisplayId}` : 'Floor layout';
  const shellSubtitle =
    floorLabel && payload ? `Floor ${floorLabel} · Client view` : 'Allocated spaces';

  return (
    <ClientLayoutPageLayout
      title={shellTitle}
      subtitle={shellSubtitle}
      onBack={handleBack}
      headerFilters={
        <ClientLayoutHeaderFilters
          searchInput={coworkerSearchInput}
          onSearchInputChange={setCoworkerSearchInput}
          onSearchPick={handleSearchPick}
          workType={filterWorkType}
          onWorkTypeChange={setFilterWorkType}
          coworkerRef={filterCoworkerRef}
          onCoworkerRefChange={handleCoworkerRefChange}
          department={filterDepartment}
          onDepartmentChange={setFilterDepartment}
          coworkerOptions={coworkerFilterOptions}
          departmentOptions={departmentFilterOptions}
        />
      }
      // headerActions={
      //   <Button.Root
      //     type='button'
      //     variant='neutral'
      //     mode='stroke'
      //     size='small'
      //     className='shrink-0 gap-1'
      //     disabled={!layoutImage}
      //     onClick={handleExportLayout}
      //   >
      //     <Button.Icon as={RiDownloadLine} />
      //     Export
      //   </Button.Root>
      // }
    >
      <div className='flex w-full min-h-0 flex-1 flex-col p-4'>{editorContent}</div>
    </ClientLayoutPageLayout>
  );
};

export default ClientAllocateLayoutEditorPage;
