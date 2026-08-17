import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import BookingEventDetailDrawer from '@/components/bookings/booking-event-detail-drawer';
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiBox2Line,
  RiBuilding2Fill,
  RiBuilding2Line,
  RiFileFill,
  RiFileList2Line,
  RiFileTextFill,
  RiFileTextLine,
  RiImage2Line,
  RiInformationFill,
  RiInformationLine,
  RiLayoutColumnLine,
  RiLayoutMasonryLine,
  RiMoneyRupeeCircleFill,
  RiMoneyRupeeCircleLine,
  RiTimeFill,
  RiTimeLine,
  RiUploadLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiImageLine,
  RiFileLine,
  RiStackLine,
  RiStackFill,
  RiLayoutMasonryFill,
} from 'react-icons/ri';

import { openBookingDetail } from '@/redux/bookingSlice';

import apiClient from '@/api/axios';
import { getStatusOptions } from '@/api/dynamic-status';
import PageLayout from '@/components/page-layout';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import { StatusColorPill } from '@/components/ui/status-color-pill';
import * as Input from '@/components/ui/input';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Textarea from '@/components/ui/textarea';
import * as Switch from '@/components/ui/switch';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as CompactButton from '@/components/ui/compact-button';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import OccupancyHistoryTable, {
  convertSortingToOrderBy,
} from '@/components/space-management/occupancy-history-table';
import OccupancyHistoryToolbar from '@/components/space-management/occupancy-history-toolbar';
import {
  buildOccupancyApiFiltersFromApplied,
  mergeStoredOccupancyHistoryFilters,
  OCCUPANCY_HISTORY_FILTER_PERSIST_INCLUDE_KEYS,
  OCCUPANCY_HISTORY_FILTER_PERSIST_POSITIVE_NUMBER_STRING_KEYS,
  OCCUPANCY_HISTORY_FILTER_SESSION_KEY,
  SPACE_DETAIL_MAIN_TAB_READ_MODULE,
} from '@/components/space-management/constants';
import { ActualCarpetAreaField } from '@/components/space-management/layout/co-working';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import AllocatedSpaceModal from '@/components/space-management/allocate-space-modal';
import {
  SPACE_DETAIL_OCCUPANCY_TABLE_ID,
  getSpaceTypeBadge,
  getSpaceDetailStats,
  normalizeSpaceTypeKey,
  DeleteSpaceModal,
} from '@/components/space-management';
import {
  useCanReadDetailTab,
  useClampActiveTabToPermitted,
} from '@/hooks/use-detail-tab-permissions';
import SpaceDetailAboutSidebar from '@/components/space-management/space-detail-about-sidebar';
import SpaceOccupiedClientDrawer from '@/components/space-management/space-occupied-client-drawer';
import {
  fetchSpaceDetail,
  selectSpaceInDetail,
  updateSpaceField,
  fetchAllocatedSpaceListview,
  selectAllocatedSpaceListview,
  fetchClientListForSpaceDetailThunk,
  selectSpaceDetailClientList,
  deleteSpaceThunk,
} from '@/redux/spaceSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { hasModulePermission } from '@/utils/user-role-utils';
import { formatFileSize, getFileExtension } from '@/utils/file-utils';
import { formatDisplayDateTime } from '@/utils/date-utils';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import * as Tooltip from '@/components/ui/tooltip';
import { EmptyImageState, EmptyPlanFileState } from '@/components/ui/empty-state-svgs';
import { useWidgetVisibility } from '@/hooks/use-widget-visibility';
import WidgetVisibilityDropdown from '@/components/ui/widget-visibility-dropdown';
import { fetchFloors } from '@/redux/ticketManagementSlice';
import { floor } from 'lodash';
import SpaceBookingTable from '@/components/space-management/space-booking-table';
import SpaceBookingToolbar from '@/components/space-management/space-booking-toolbar';
import SpaceDetailLayoutTab from '@/components/space-management/space-detail-layout-tab';
import SpaceDetailSubSpaceTab from '@/components/space-management/space-detail-sub-space-tab';
import BookingCreateDrawer from '@/components/bookings/booking-create-drawer';

const StatItem = ({ icon: Icon, label, value, iconColor, bgColor }) => {
  return (
    <div className='flex items-center gap-3 px-6 min-w-0'>
      <div
        className={'flex  p-2.5  items-center justify-center rounded-full bg-bg-weak-50 '}
        style={{ backgroundColor: bgColor }}
      >
        <Icon style={{ fill: iconColor }} size={20} />
      </div>
      <div className='min-w-0'>
        <div className='text-[10px] text-wrap font-semibold uppercase tracking-wider text-text-soft-400'>
          {label}
        </div>
        <div className='text-paragraph-sm font-medium text-text-strong-950 truncate'>{value}</div>
      </div>
    </div>
  );
};

const DividerY = () => <div className='w-px self-stretch bg-stroke-soft-200' aria-hidden='true' />;

const DetailGrid = ({ items = [] }) => {
  return (
    <div className='grid grid-cols-2 gap-x-12 gap-y-4.5'>
      {items.map((item) => (
        <div key={item.label} className='flex flex-col gap-1'>
          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>{item.label}</div>
          <div className='text-paragraph-sm text-text-strong-950'>
            <EditableFieldWrapper editable={item.editable ?? false} iconClassName='mr-2'>
              {item.value ?? '--'}
            </EditableFieldWrapper>
          </div>
        </div>
      ))}
    </div>
  );
};

// const PlaceholderCard = ({ icon: Icon, label }) => {
//   return (
//     <div className='rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-3'>
//       <div className='h-24 rounded-lg bg-bg-white-0 border border-stroke-soft-200 flex items-center justify-center'>
//         <Icon className='size-5 text-text-soft-400' />
//       </div>
//       <div className='mt-3'>
//         <div className='text-paragraph-sm text-text-strong-950'>{label}</div>
//         <div className='text-paragraph-xs text-text-sub-600'>—</div>
//       </div>
//     </div>
//   );
// };

const SpaceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const spaceInDetail = useSelector(selectSpaceInDetail);
  const [occupancySorting, setOccupancySorting] = useState([]);
  const [occupancyLimitStart, setOccupancyLimitStart] = useState(0);

  const canDelete = useMemo(
    () => hasModulePermission(userSideBarPerm, 'Space', 'delete'),
    [userSideBarPerm],
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const spaceDetailClientList = useSelector(selectSpaceDetailClientList);
  const clientsList = spaceDetailClientList?.data ?? [];

  const allocatedSpaceListview = useSelector(selectAllocatedSpaceListview);
  const space = spaceInDetail.data;
  const centerid = space?.centerId;
  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);
  const [isLoadingDynamicStatuses, setIsLoadingDynamicStatuses] = useState(false);
  const [isAllocateSpaceModalOpen, setIsAllocateSpaceModalOpen] = useState(false);

  // Widget visibility management for stats strip (state bar)
  const { widgetVisibility, toggleWidget, hideAllWidgets, WIDGET_KEYS } =
    useWidgetVisibility('space-detail-widgets');
  const [isWidgetVisibilityOpen, setIsWidgetVisibilityOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    dispatch(fetchSpaceDetail(id));
    dispatch(fetchClientListForSpaceDetailThunk({ pageSize: 999 }));
  }, [dispatch, id]);

  // Fetch allocated space listview when space ID is available
  useEffect(() => {
    if (id && space?.id) {
      setOccupancyLimitStart(0);
      const orderBy = convertSortingToOrderBy(occupancySorting);
      dispatch(
        fetchAllocatedSpaceListview({
          space_id: id,
          keyword: '',
          limit_page_length: 20,
          limit_start: 0,
          order_by: orderBy,
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id, space?.id]);

  // Fetch dynamic status options for Space.status (active only)
  useEffect(() => {
    if (!id) return;
    const fetchStatuses = async () => {
      setIsLoadingDynamicStatuses(true);
      try {
        const options = await getStatusOptions({ doctype: 'Space', field: 'status' });
        setDynamicStatusOptions(options);
      } catch {
        setDynamicStatusOptions([]);
      } finally {
        setIsLoadingDynamicStatuses(false);
      }
    };
    fetchStatuses();
  }, [id]);

  const { shared } = useSelector((state) => state.booking);

  // Event handlers
  const handleRowSelect = useCallback(
    (booking) => {
      dispatch(openBookingDetail(booking));
    },
    [dispatch],
  );

  // Use space detail data

  const original = space?._original || {};

  const [localChanges, setLocalChanges] = useState({});
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isUploadingPlans, setIsUploadingPlans] = useState(false);

  const photoInputRef = useRef(null);
  const planInputRef = useRef(null);

  useEffect(() => {
    // Reset local edits when switching spaces
    setLocalChanges({});
  }, [space?.id]);

  const [floors, setFloors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!centerid) {
          setFloors([]);
          return;
        }
        const isParking = normalizeSpaceTypeKey(space?.spaceType) === 'parking';
        const response = await dispatch(
          fetchFloors(isParking ? { center: centerid, has_parking: 1 } : centerid),
        ).unwrap();
        setFloors(response?.options || []);
      } catch (error) {
        console.error('Failed to fetch floors:', error);
      }
    };
    fetchData();
  }, [centerid, space?.spaceType, dispatch]);

  const getFieldValue = (fieldName) => {
    const localValue = localChanges?.[fieldName];
    if (localValue !== undefined && localValue !== null) return localValue;
    return original?.[fieldName] ?? '';
  };

  const setLocalChange = (fieldName, value) => {
    setLocalChanges((previous) => ({ ...previous, [fieldName]: value }));
  };

  const handleSpaceFieldChange = async (fieldName, value) => {
    if (!space?.id) return;

    const currentValue = original?.[fieldName];
    const currentNormalized = String(currentValue ?? '');
    const newNormalized = String(value ?? '');

    // Only update if value actually changed
    if (currentNormalized === newNormalized) return;

    // Optimistic local update
    setLocalChange(fieldName, value);

    const updatePayload = { [fieldName]: value === undefined ? null : value };
    // Non-bookable Resource: keep total_rate_of_space in sync with pax × rate
    if (
      String(space?.spaceType || '').trim() === 'Resource' &&
      (getFieldValue('bookable') === 'No' || (fieldName === 'bookable' && value === 'No')) &&
      (fieldName === 'pax' || fieldName === 'expected_per_seat_rate')
    ) {
      const pax = Number(fieldName === 'pax' ? value : getFieldValue('pax') || 0);
      const rate = Number(
        fieldName === 'expected_per_seat_rate'
          ? value
          : getFieldValue('expected_per_seat_rate') || 0,
      );
      if (Number.isFinite(pax) && Number.isFinite(rate)) {
        updatePayload.total_rate_of_space = Math.round(pax * rate);
        setLocalChange('total_rate_of_space', updatePayload.total_rate_of_space);
      }
    }

    try {
      const updateResult = await dispatch(
        updateSpaceField({ spaceId: space.id, payload: updatePayload }),
      );

      if (updateResult.type === 'space/updateSpaceField/rejected') {
        // Revert on error
        setLocalChange(fieldName, null);
        if (updatePayload.total_rate_of_space != null) {
          setLocalChange('total_rate_of_space', null);
        }
        showErrorToast(updateResult.payload, {
          defaultMessage: 'Failed to update space. Please try again.',
        });
        return;
      }

      // Refetch space detail for latest values
      await dispatch(fetchSpaceDetail(space.id));

      // Clear local override so UI reflects canonical backend value
      setLocalChanges((previous) => {
        const next = { ...previous };
        delete next[fieldName];
        delete next.total_rate_of_space;
        return next;
      });
    } catch (error) {
      console.error('Failed to update space:', error);
      setLocalChange(fieldName, null);
      if (updatePayload.total_rate_of_space != null) {
        setLocalChange('total_rate_of_space', null);
      }
      showErrorToast(error?.payload || error, {
        defaultMessage: 'Failed to update space. Please try again.',
      });
    }
  };

  const uploadFilesToFrappe = async (files) => {
    const fileArray = [...(files || [])];
    if (fileArray.length === 0) return [];

    // Match the 10MB limit used elsewhere in the app
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const tooLarge = fileArray.filter((f) => f.size > MAX_FILE_SIZE).map((f) => f.name);
    if (tooLarge.length > 0) {
      throw new Error(`The following file(s) exceed the 10 MB limit: ${tooLarge.join(', ')}`);
    }

    const uploadPromises = fileArray.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      // Attach to Space doc for traceability, but we still store the URL in child tables
      formData.append('doctype', 'Space');
      formData.append('docname', String(space?.id || id || ''));
      formData.append('is_private', 0);

      const response = await apiClient.post('/method/upload_file', formData);
      const message = response?.data?.message || response?.data || {};
      const fileUrl = message?.file_url || message?.fileUrl || message?.file_url;
      if (!fileUrl) {
        throw new Error('Upload succeeded but no file URL was returned.');
      }
      return fileUrl;
    });

    return Promise.all(uploadPromises);
  };

  const appendChildRows = async ({ field, doctype, urlField, urls }) => {
    if (!space?.id) return;
    if (!urls || urls.length === 0) return;

    const existingRows = Array.isArray(original?.[field]) ? original[field] : [];
    const nextRows = [
      ...existingRows.map((row) => ({ ...row })),
      ...urls.map((url) => ({ doctype, [urlField]: url })),
    ];

    const updateResult = await dispatch(
      updateSpaceField({
        spaceId: space.id,
        payload: { [field]: nextRows },
      }),
    );

    if (updateResult.type === 'space/updateSpaceField/rejected') {
      throw updateResult.payload || new Error('Failed to update space.');
    }

    await dispatch(fetchSpaceDetail(space.id));
  };

  const handleUploadPhotos = async (files) => {
    if (!space?.id) return;
    setIsUploadingPhotos(true);
    try {
      const urls = await uploadFilesToFrappe(files);
      await appendChildRows({
        field: 'photos',
        doctype: 'Space Photos',
        urlField: 'photo',
        urls,
      });
      showSuccessToast('Photos uploaded successfully.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to upload photos. Please try again.' });
    } finally {
      setIsUploadingPhotos(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (photoItem) => {
    if (!space?.id || !photoItem?.name) return;

    try {
      const existingRows = Array.isArray(original?.photos) ? original.photos : [];
      const updatedRows = existingRows.filter((row) => row.name !== photoItem.name);

      const updateResult = await dispatch(
        updateSpaceField({
          spaceId: space.id,
          payload: { photos: updatedRows },
        }),
      );

      if (updateResult.type === 'space/updateSpaceField/rejected') {
        throw updateResult.payload || new Error('Failed to delete photo.');
      }

      await dispatch(fetchSpaceDetail(space.id));
      showSuccessToast('Photo deleted successfully.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to delete photo. Please try again.' });
    }
  };

  const handleUploadPlanFiles = async (files) => {
    if (!space?.id) return;
    setIsUploadingPlans(true);
    try {
      const urls = await uploadFilesToFrappe(files);
      await appendChildRows({
        field: 'plan_file',
        doctype: 'Space Plan File',
        urlField: 'plan_files',
        urls,
      });
      showSuccessToast('Plan files uploaded successfully.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to upload plan files. Please try again.' });
    } finally {
      setIsUploadingPlans(false);
      if (planInputRef.current) planInputRef.current.value = '';
    }
  };

  const handleDeletePlanFile = async (planItem) => {
    if (!space?.id || !planItem?.name) return;

    try {
      const existingRows = Array.isArray(original?.plan_file) ? original.plan_file : [];
      const updatedRows = existingRows.filter((row) => row.name !== planItem.name);

      const updateResult = await dispatch(
        updateSpaceField({
          spaceId: space.id,
          payload: { plan_file: updatedRows },
        }),
      );

      if (updateResult.type === 'space/updateSpaceField/rejected') {
        throw updateResult.payload || new Error('Failed to delete plan file.');
      }

      await dispatch(fetchSpaceDetail(space.id));
      showSuccessToast('Plan file deleted successfully.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to delete plan file. Please try again.' });
    }
  };

  const title = space?.spaceName || 'Space Details';
  const status = space?.status;
  const centerName = space?.center || '—';
  const spaceTypeBadge = getSpaceTypeBadge(space?.spaceType);
  const headerStatusColor =
    space?.statusColor ||
    dynamicStatusOptions.find((o) => o.value === (status || '').trim())?.color ||
    null;
  const isResourceType = String(space?.spaceType || '').trim() === 'Resource';

  const [activeTab, setActiveTab] = useState('about');
  const [aboutTab, setAboutTab] = useState('basic');

  const canReadSpaceTab = useCanReadDetailTab(SPACE_DETAIL_MAIN_TAB_READ_MODULE);
  const bookingsVsOccupancySlot =
    getFieldValue('bookable') !== 'No' && isResourceType ? 'bookings' : 'occupancy';
  const permittedMainTabIds = useMemo(() => {
    return [
      'about',
      bookingsVsOccupancySlot,
      'finance',
      'lease',
      'assets',
      'layout',
      'sub-space',
    ].filter((id) => canReadSpaceTab(id));
  }, [canReadSpaceTab, bookingsVsOccupancySlot]);
  useClampActiveTabToPermitted(activeTab, setActiveTab, permittedMainTabIds);

  // When resource bookable toggles, switch to the related tab for this space id
  useEffect(() => {
    if (!isResourceType) return;
    if (activeTab === 'bookings' || activeTab === 'occupancy') {
      setActiveTab(bookingsVsOccupancySlot);
    }
  }, [bookingsVsOccupancySlot, isResourceType]);

  const spaceTypeKey = normalizeSpaceTypeKey(space?.spaceType);
  const stats = useMemo(() => getSpaceDetailStats(space), [space]);

  // Use API data for occupancy rows and columns
  const occupancyRows = allocatedSpaceListview.data || [];

  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [occupancySearch, setOccupancySearch] = useState('');
  const debouncedOccupancySearch = useDebounce(occupancySearch, 300);
  const [occupancyGroupBy, setOccupancyGroupBy] = useState('');
  const [occupancyGroupOrder, setOccupancyGroupOrder] = useState('asc');

  const occupancyFilterStorageKey = id ? `${OCCUPANCY_HISTORY_FILTER_SESSION_KEY}-${id}` : null;
  const [occupancyAppliedFilters, setOccupancyAppliedFilters] = usePersistedFilters({
    storageKey: occupancyFilterStorageKey,
    defaultFilters: mergeStoredOccupancyHistoryFilters({}),
    persistIncludeKeys: OCCUPANCY_HISTORY_FILTER_PERSIST_INCLUDE_KEYS,
    persistTrimStringArrays: true,
    persistPositiveNumberStringKeys: OCCUPANCY_HISTORY_FILTER_PERSIST_POSITIVE_NUMBER_STRING_KEYS,
  });
  const [isClientDrawerOpen, setIsClientDrawerOpen] = useState(false);
  const [selectedClientIndex, setSelectedClientIndex] = useState(0);
  const occupancyTableRef = useRef(null);
  const bookingTableRef = useRef(null);
  const [bookingDateRange, setBookingDateRange] = useState({ from: null, to: null });
  const [bookingClientFilter, setBookingClientFilter] = useState('all');

  const occupancyFilterOptions = allocatedSpaceListview.filterOptions || {};
  const occupancyColumnMaxLimits = useMemo(
    () => ({
      totalCredits: occupancyFilterOptions.column_max_limits?.total_credits ?? 0,
      pricePerSeat: occupancyFilterOptions.column_max_limits?.price_per_seat ?? 0,
      totalPrice: occupancyFilterOptions.column_max_limits?.total_price ?? 0,
    }),
    [
      occupancyFilterOptions.column_max_limits?.total_credits,
      occupancyFilterOptions.column_max_limits?.price_per_seat,
      occupancyFilterOptions.column_max_limits?.total_price,
    ],
  );

  const occupancyColumnMaxLimitsRef = useRef(occupancyColumnMaxLimits);
  useEffect(() => {
    occupancyColumnMaxLimitsRef.current = occupancyColumnMaxLimits;
  }, [occupancyColumnMaxLimits]);

  const occupancyClientOptions = useMemo(
    () =>
      (occupancyFilterOptions.client_name || []).map((name) => ({
        value: name,
        label: name,
      })),
    [occupancyFilterOptions.client_name],
  );

  const lastOccupancyApiCallRef = useRef('');

  useEffect(() => {
    lastOccupancyApiCallRef.current = '';
  }, [id]);

  const fetchOccupancyList = useCallback(
    ({
      limitStart = 0,
      keyword = debouncedOccupancySearch,
      filters = occupancyAppliedFilters,
      orderBy = convertSortingToOrderBy(occupancySorting),
      groupBy = occupancyGroupBy,
      groupOrder = occupancyGroupOrder,
      skipDedupe = false,
    } = {}) => {
      if (!id || !space?.id) return;
      const apiFilters = buildOccupancyApiFiltersFromApplied(
        filters,
        occupancyColumnMaxLimitsRef.current,
      );
      const resolvedKeyword = keyword.trim();
      const resolvedOrderBy = orderBy;
      const resolvedGroupBy = groupBy ? String(groupBy).trim() : '';

      if (limitStart === 0 && !skipDedupe) {
        const callKey = `${id}-${resolvedKeyword}-${JSON.stringify(apiFilters)}-${resolvedOrderBy}-${resolvedGroupBy}-${groupOrder}`;
        if (lastOccupancyApiCallRef.current === callKey) return;
        lastOccupancyApiCallRef.current = callKey;
      }

      dispatch(
        fetchAllocatedSpaceListview({
          space_id: id,
          keyword: resolvedKeyword,
          filters: apiFilters,
          limit_page_length: 20,
          limit_start: limitStart,
          order_by: resolvedOrderBy,
          group_by: resolvedGroupBy,
          group_order: groupOrder || 'asc',
        }),
      );
    },
    [
      dispatch,
      id,
      space?.id,
      debouncedOccupancySearch,
      occupancyAppliedFilters,
      occupancySorting,
      occupancyGroupBy,
      occupancyGroupOrder,
    ],
  );

  useEffect(() => {
    if (!id || !space?.id) return;
    setOccupancyLimitStart(0);
    fetchOccupancyList({ limitStart: 0 });
  }, [
    id,
    space?.id,
    debouncedOccupancySearch,
    occupancyAppliedFilters,
    occupancySorting,
    occupancyGroupBy,
    occupancyGroupOrder,
    fetchOccupancyList,
  ]);

  const previousModalOpen = useRef(isAllocateSpaceModalOpen);
  useEffect(() => {
    if (previousModalOpen.current && !isAllocateSpaceModalOpen && id && space?.id) {
      setOccupancyLimitStart(0);
      setOccupancySorting([]);
      lastOccupancyApiCallRef.current = '';
      fetchOccupancyList({ limitStart: 0, orderBy: 'creation desc', skipDedupe: true });
    }
    previousModalOpen.current = isAllocateSpaceModalOpen;
  }, [id, space?.id, isAllocateSpaceModalOpen, fetchOccupancyList]);

  const openClientDrawerAtIndex = (index) => {
    if (index < 0 || index >= occupancyRows.length) return;
    setSelectedClientIndex(index);
    setIsClientDrawerOpen(true);
  };

  const handleOccupancySortingChange = useCallback((newSorting) => {
    setOccupancySorting(newSorting);
    setOccupancyLimitStart(0);
  }, []);

  const handleOccupancyLoadMore = useCallback(() => {
    if (
      !id ||
      !space?.id ||
      allocatedSpaceListview.isGrouped ||
      allocatedSpaceListview.isFetchingMore ||
      !allocatedSpaceListview.hasMore
    )
      return;
    const nextStart = occupancyLimitStart + 20;
    setOccupancyLimitStart(nextStart);
    fetchOccupancyList({ limitStart: nextStart });
  }, [
    id,
    space?.id,
    occupancyLimitStart,
    fetchOccupancyList,
    allocatedSpaceListview.isFetchingMore,
    allocatedSpaceListview.hasMore,
  ]);

  const handleAllocateSpace = () => {
    if (isAllocateSpaceModalOpen) {
      setIsAllocateSpaceModalOpen(false);
      return;
    }
    setIsAllocateSpaceModalOpen(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!space?.id) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteSpaceThunk(space.id)).unwrap();
      showSuccessToast('Space removed successfully.');
      setIsDeleteModalOpen(false);
      navigate('/spaces');
    } catch (error) {
      showErrorToast(error?.payload || error, {
        defaultMessage: 'Failed to remove space. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [dispatch, space?.id, navigate]);

  return (
    <PageLayout showDefaultHeader={false}>
      <div className='flex h-full w-full flex-col'>
        {/* Header */}
        <div className='pt-5 pb-[14px] pl-6 border-b pr-8 w-full border-stroke-soft-200 bg-bg-white-0'>
          <div className='flex items-center justify-between gap-3 w-full'>
            <div className='flex items-center gap-4 '>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                aria-label='Back'
                onClick={() => navigate(-1)}
              >
                <Button.Icon as={RiArrowLeftSLine} size={20} />
              </Button.Root>

              <div className='min-w-0 flex flex-col gap-1.5'>
                <div className='text-label-md text-text-strong-950 truncate'>{title}</div>
                <div className=' flex items-center gap-2 min-w-0'>
                  <span className='text-paragraph-sm text-text-sub-600 truncate'>
                    {space?.center}
                  </span>
                  <span className='text-text-soft-400'>•</span>
                  <StatusColorPill value={status || '—'} color={headerStatusColor} />
                  <span className='text-text-soft-400'>•</span>
                  <span className='text-paragraph-sm text-text-sub-600 truncate'>
                    {space?.floor}
                  </span>
                </div>
              </div>
            </div>

            <div className='flex items-center gap-3 '>
              {(!isResourceType || getFieldValue('bookable') === 'No') && (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='small'
                      className='gap-1 '
                      onClick={handleAllocateSpace}
                      disabled={space?.status === 'Occupied' || space?.status === 'Locked'}
                    >
                      <Button.Icon as={RiAddLine} />
                      Allocate Client
                    </Button.Root>
                  </Tooltip.Trigger>
                  {(space?.status === 'Occupied' || space?.status === 'Locked') && (
                    <Tooltip.Content>
                      <p>Only available for vacant spaces.</p>
                    </Tooltip.Content>
                  )}
                </Tooltip.Root>
              )}

              {canDelete && (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      onClick={() => setIsDeleteModalOpen(true)}
                      disabled={isDeleting}
                      className='shrink-0 flex items-center justify-center gap-1.5'
                    >
                      <Button.Icon as={RiDeleteBinLine} />
                      <span>Delete</span>
                    </Button.Root>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>Delete this space. This action cannot be undone.</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              )}

              <WidgetVisibilityDropdown
                open={isWidgetVisibilityOpen}
                onOpenChange={setIsWidgetVisibilityOpen}
                widgetVisibility={widgetVisibility}
                onToggleWidget={toggleWidget}
                onHideAll={hideAllWidgets}
                tooltipContent={<p>Widget Visibility</p>}
                size='small'
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className='flex-1 w-full border-stroke-soft-200 overflow-hidden flex flex-col min-h-0'>
          {/* Stats strip (fixed height) */}
          {widgetVisibility[WIDGET_KEYS.STATS] && (
            <div className='py-4 border-stroke-soft-200 bg-bg-white-0 overflow-hidden shrink-0'>
              <div className='flex items-stretch'>
                {stats.map((s, index) => (
                  <React.Fragment key={s.key}>
                    <div className='flex-1 min-w-0'>
                      <StatItem
                        icon={s.icon || RiMoneyRupeeCircleLine}
                        label={s.label}
                        value={s.value}
                        iconColor={s.iconColor}
                        bgColor={s.bgColor}
                      />
                    </div>
                    {index < stats.length - 1 ? <DividerY /> : null}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Main tabs (fills remaining height) */}
          <div className='flex-1 min-h-0'>
            <TabMenuHorizontal.Root
              value={activeTab}
              onValueChange={setActiveTab}
              className='flex flex-col h-full min-h-0'
            >
              <TabMenuHorizontal.List wrapperClassName='w-full shrink-0' className='px-4'>
                {permittedMainTabIds.includes('about') ? (
                  <TabMenuHorizontal.Trigger value='about'>
                    <TabMenuHorizontal.Icon
                      as={activeTab === 'about' ? RiInformationFill : RiInformationLine}
                    />
                    About Space
                  </TabMenuHorizontal.Trigger>
                ) : null}
                {bookingsVsOccupancySlot === 'bookings' &&
                permittedMainTabIds.includes('bookings') ? (
                  <TabMenuHorizontal.Trigger value='bookings'>
                    <TabMenuHorizontal.Icon
                      as={activeTab === 'bookings' ? RiTimeFill : RiTimeLine}
                    />
                    Booking History
                  </TabMenuHorizontal.Trigger>
                ) : null}
                {bookingsVsOccupancySlot === 'occupancy' &&
                permittedMainTabIds.includes('occupancy') ? (
                  <TabMenuHorizontal.Trigger value='occupancy'>
                    <TabMenuHorizontal.Icon
                      as={activeTab === 'occupancy' ? RiTimeFill : RiTimeLine}
                    />
                    Occupancy History
                  </TabMenuHorizontal.Trigger>
                ) : null}
                {permittedMainTabIds.includes('finance') ? (
                  <TabMenuHorizontal.Trigger value='finance'>
                    <TabMenuHorizontal.Icon
                      as={activeTab === 'finance' ? RiMoneyRupeeCircleFill : RiMoneyRupeeCircleLine}
                    />
                    Finance
                  </TabMenuHorizontal.Trigger>
                ) : null}
                {permittedMainTabIds.includes('lease') ? (
                  <TabMenuHorizontal.Trigger value='lease'>
                    <TabMenuHorizontal.Icon
                      as={activeTab === 'lease' ? RiFileTextFill : RiFileTextLine}
                    />
                    Lease & Agreement
                  </TabMenuHorizontal.Trigger>
                ) : null}
                {permittedMainTabIds.includes('assets') ? (
                  <TabMenuHorizontal.Trigger value='assets'>
                    <TabMenuHorizontal.Icon
                      as={activeTab === 'assets' ? RiBuilding2Fill : RiBuilding2Line}
                    />
                    Manage Assets
                  </TabMenuHorizontal.Trigger>
                ) : null}

                {permittedMainTabIds.includes('layout') ? (
                  <TabMenuHorizontal.Trigger value='layout'>
                    <TabMenuHorizontal.Icon
                      as={activeTab === 'layout' ? RiLayoutMasonryFill : RiLayoutMasonryLine}
                    />
                    Layout
                  </TabMenuHorizontal.Trigger>
                ) : null}

                {permittedMainTabIds.includes('sub-space') ? (
                  <TabMenuHorizontal.Trigger value='sub-space'>
                    <TabMenuHorizontal.Icon
                      as={activeTab === 'sub-space' ? RiStackFill : RiStackLine}
                    />
                    Sub Space
                  </TabMenuHorizontal.Trigger>
                ) : null}
              </TabMenuHorizontal.List>

              {/* About */}
              <TabMenuHorizontal.Content value='about' className='flex-1 min-h-0'>
                <div className='flex h-full min-h-0'>
                  <SpaceDetailAboutSidebar value={aboutTab} onValueChange={setAboutTab} />

                  <div className='flex-1 min-h-0 overflow-y-auto py-4 px-6'>
                    {spaceInDetail.isLoading ? (
                      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-text-sub-600'>
                        Loading space details...
                      </div>
                    ) : space ? (
                      aboutTab === 'basic' ? (
                        <div className='flex h-full flex-col gap-8'>
                          {/*
                            Mapping notes:
                            - We read/write using backend fieldnames via `space._original`.
                            - We still show some display helpers (badges) using the transformed fields.
                          */}
                          <DetailGrid
                            items={[
                              {
                                label: 'Space Name',
                                value: (
                                  <Input.Root
                                    // key={`${space?.id || 'space'}-inventory_name-${getFieldValue('inventory_name') || ''}`}
                                    variant='borderless'
                                    size='xsmall'
                                    className='-ml-2'
                                  >
                                    <Input.Wrapper>
                                      <Input.Input
                                        value={getFieldValue('inventory_name') || ''}
                                        placeholder='Enter space name'
                                        onChange={(e) =>
                                          setLocalChange('inventory_name', e.target.value)
                                        }
                                        onBlur={(e) =>
                                          handleSpaceFieldChange(
                                            'inventory_name',
                                            e.target.value.trim(),
                                          )
                                        }
                                        // disabled={!canWrite}
                                        className='text-label-sm text-text-main-900'
                                      />
                                    </Input.Wrapper>
                                  </Input.Root>
                                ),
                                editable: true,
                              },
                              {
                                label: 'Floor',
                                value: floors ? (
                                  <SearchableSelect
                                    variant='borderless'
                                    value={getFieldValue('floor') || ''}
                                    onValueChange={(value) =>
                                      handleSpaceFieldChange('floor', value)
                                    }
                                    size='xsmall'
                                    options={floors}
                                    placeholder='Select Floor'
                                    searchPlaceholder='Search floor...'
                                    triggerClassName='w-full -ml-2 text-left'
                                    showArrow={false}
                                    emptyMessage='No Floors Available'
                                    noResultsMessage='No floors found'
                                  />
                                ) : (
                                  <span>{getFieldValue('floor') || '--'}</span>
                                ),
                                editable: true,
                              },
                              {
                                label: 'Status',
                                value: (
                                  <Select.Root
                                    variant='borderless'
                                    value={getFieldValue('status') || ''}
                                    onValueChange={(value) =>
                                      handleSpaceFieldChange('status', value)
                                    }
                                    size='xsmall'
                                    disabled={
                                      isLoadingDynamicStatuses || dynamicStatusOptions.length === 0
                                    }
                                  >
                                    <Select.Trigger className='w-full -ml-2' showArrow={false}>
                                      {(() => {
                                        const currentValue = (getFieldValue('status') || '').trim();
                                        const selected = dynamicStatusOptions.find(
                                          (o) => o.value === currentValue,
                                        );
                                        if (!selected) {
                                          return <Select.Value placeholder='Select Status' />;
                                        }

                                        return (
                                          <>
                                            <StatusColorPill
                                              value={selected.label}
                                              color={selected.color}
                                              className='max-w-full'
                                            />
                                            <span className='hidden'>
                                              <Select.Value />
                                            </span>
                                          </>
                                        );
                                      })()}
                                    </Select.Trigger>
                                    <Select.Content>
                                      {dynamicStatusOptions.length > 0 ? (
                                        dynamicStatusOptions.map((opt) => (
                                          <Select.Item key={opt.value} value={opt.value}>
                                            <StatusColorPill value={opt.label} color={opt.color} />
                                          </Select.Item>
                                        ))
                                      ) : (
                                        <div className='p-2 text-paragraph-sm text-text-sub-600 text-center'>
                                          No Status Options
                                        </div>
                                      )}
                                    </Select.Content>
                                  </Select.Root>
                                ),
                                editable: true,
                              },
                              {
                                label: 'Space Type',
                                value: (
                                  <Badge.Root
                                    size='small'
                                    variant='light'
                                    color={spaceTypeBadge.color}
                                    className='whitespace-nowrap flex-1 items-center justify-center '
                                  >
                                    {spaceTypeBadge.label}
                                  </Badge.Root>
                                ),
                              },
                              ...(spaceTypeKey === 'parking'
                                ? [
                                    {
                                      label: 'Parking Type',
                                      value: (
                                        <span className='text-label-sm text-text-main-900'>
                                          {getFieldValue('parking_type') || '--'}
                                        </span>
                                      ),
                                    },
                                    {
                                      label: 'Vehicle Type',
                                      value: (
                                        <span className='text-label-sm text-text-main-900'>
                                          {getFieldValue('vehicle_type') || '--'}
                                        </span>
                                      ),
                                    },
                                    {
                                      label: 'Assignment Type',
                                      value: (
                                        <span className='text-label-sm text-text-main-900'>
                                          {getFieldValue('assigning_type') || '--'}
                                        </span>
                                      ),
                                    },
                                  ]
                                : []),

                              // {
                              //   label: 'Code',
                              //   value: (
                              //     <Input.Root
                              //       key={`${space?.id || 'space'}-code-${getFieldValue('code') || ''}`}
                              //       variant='borderless'
                              //       size='xsmall'
                              //       className='-ml-2'
                              //     >
                              //       <Input.Wrapper>
                              //         <Input.Input
                              //           value={getFieldValue('code') || ''}
                              //           placeholder='Enter code'
                              //           onChange={(e) => setLocalChange('code', e.target.value)}
                              //           onBlur={(e) =>
                              //             handleSpaceFieldChange('code', e.target.value.trim())
                              //           }
                              //           className='text-label-sm text-text-main-900'
                              //         />
                              //       </Input.Wrapper>
                              //     </Input.Root>
                              //   ),
                              // },
                              // {
                              //   label: 'Center',
                              //   value: (
                              //     <Input.Root
                              //       key={`${space?.id || 'space'}-center-${getFieldValue('center') || ''}`}
                              //       variant='borderless'
                              //       size='xsmall'
                              //       className='-ml-2'
                              //     >
                              //       <Input.Wrapper>
                              //         <Input.Input
                              //           value={getFieldValue('center') || ''}
                              //           placeholder='Center ID'
                              //           onChange={(e) => setLocalChange('center', e.target.value)}
                              //           onBlur={(e) =>
                              //             handleSpaceFieldChange('center', e.target.value.trim())
                              //           }
                              //           className='text-label-sm text-text-main-900'
                              //         />
                              //       </Input.Wrapper>
                              //     </Input.Root>
                              //   ),
                              // },
                              // {
                              //   label: 'Floor',
                              //   value: (
                              //     <Input.Root
                              //       key={`${space?.id || 'space'}-floor-${getFieldValue('floor') || ''}`}
                              //       variant='borderless'
                              //       size='xsmall'
                              //       className='-ml-2'
                              //     >
                              //       <Input.Wrapper>
                              //         <Input.Input
                              //           value={getFieldValue('floor') || ''}
                              //           placeholder='Enter floor'
                              //           readOnly
                              //           className='text-label-sm text-text-main-900'
                              //         />
                              //       </Input.Wrapper>
                              //     </Input.Root>
                              //   ),
                              // },
                              // Conditional fields based on space type
                              ...(spaceTypeKey === 'resource'
                                ? getFieldValue('bookable') === 'No'
                                  ? [
                                      {
                                        label: 'Resource Type',
                                        value: (
                                          <Input.Root
                                            key={`${space?.id || 'space'}-resource_type-${getFieldValue('resource_type') || ''}`}
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                value={getFieldValue('resource_type') || ''}
                                                placeholder='Enter resource type'
                                                readOnly
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                      },
                                      {
                                        label: 'Agreement Carpet Area',
                                        value: (
                                          <Input.Root
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('agreement_carpet_area') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('agreement_carpet_area', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'agreement_carpet_area',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Actual Carpet Area',
                                        value: (
                                          <ActualCarpetAreaField
                                            size='xsmall'
                                            className='-ml-2'
                                            inputClassName='text-label-sm text-text-main-900'
                                            sqftValue={getFieldValue('actual_carpet_area') ?? ''}
                                            agreementArea={getFieldValue('agreement_carpet_area')}
                                            onSqftChange={(value) =>
                                              setLocalChange('actual_carpet_area', value)
                                            }
                                            onSqftBlur={(value) =>
                                              handleSpaceFieldChange(
                                                'actual_carpet_area',
                                                String(value ?? '').trim(),
                                              )
                                            }
                                          />
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Expected Carpet Rate',
                                        value: (
                                          <Input.Root
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('expected_carpet_rate') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('expected_carpet_rate', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'expected_carpet_rate',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'PAX (Max Capacity)',
                                        value: (
                                          <Input.Root
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('pax') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('pax', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'pax',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Expected Per Seat Rate',
                                        value: (
                                          <Input.Root
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={
                                                  getFieldValue('expected_per_seat_rate') ?? ''
                                                }
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('expected_per_seat_rate', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'expected_per_seat_rate',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Credit Per Seat',
                                        value: (
                                          <Input.Root
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('credit_per_seat') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('credit_per_seat', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'credit_per_seat',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      (() => {
                                        const raw =
                                          Number(getFieldValue('pax') || 0) *
                                          Number(getFieldValue('expected_per_seat_rate') || 0);
                                        const total = Number.isFinite(raw)
                                          ? Math.round(raw)
                                          : Number.NaN;
                                        return {
                                          label: 'Total Rate of Space',
                                          value: `₹${Number.isFinite(total) ? total.toLocaleString('en-IN') : '--'}`,
                                        };
                                      })(),
                                      {
                                        label: 'Bookable',
                                        value: (
                                          <div className='-ml-2 flex items-center gap-2'>
                                            <Switch.Root
                                              checked={
                                                getFieldValue('bookable') === 'Yes' ||
                                                getFieldValue('bookable') === true
                                              }
                                              onCheckedChange={(checked) => {
                                                handleSpaceFieldChange(
                                                  'bookable',
                                                  checked ? 'Yes' : 'No',
                                                );
                                              }}
                                            />
                                            <span className='text-paragraph-sm text-text-strong-950'>
                                              {getFieldValue('bookable') === 'Yes'
                                                ? 'Yes'
                                                : getFieldValue('bookable') === 'No'
                                                  ? 'No'
                                                  : '--'}
                                            </span>
                                          </div>
                                        ),
                                        editable: true,
                                      },
                                    ]
                                  : [
                                      // Resource type fields (bookable on — unchanged)
                                      {
                                        label: 'PAX (Max Capacity)',
                                        value: (
                                          <Input.Root
                                            // key={`${space?.id || 'space'}-pax-${getFieldValue('pax') || ''}`}
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('pax') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('pax', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'pax',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                // disabled={!canWrite}
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Credit Per Hour',
                                        value: (
                                          <Input.Root
                                            // key={`${space?.id || 'space'}-credit_per_hour-${getFieldValue('credit_per_hour') || ''}`}
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('credit_per_hour') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('credit_per_hour', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'credit_per_hour',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                // disabled={!canWrite}
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Bookable',
                                        value: (
                                          <div className='-ml-2 flex items-center gap-2'>
                                            <Switch.Root
                                              checked={
                                                getFieldValue('bookable') === 'Yes' ||
                                                getFieldValue('bookable') === true
                                              }
                                              onCheckedChange={(checked) => {
                                                handleSpaceFieldChange(
                                                  'bookable',
                                                  checked ? 'Yes' : 'No',
                                                );
                                              }}
                                            />
                                            <span className='text-paragraph-sm text-text-strong-950'>
                                              {getFieldValue('bookable') === 'Yes'
                                                ? 'Yes'
                                                : getFieldValue('bookable') === 'No'
                                                  ? 'No'
                                                  : '--'}
                                            </span>
                                          </div>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Resource Type',
                                        value: (
                                          <Input.Root
                                            key={`${space?.id || 'space'}-resource_type-${getFieldValue('resource_type') || ''}`}
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                value={getFieldValue('resource_type') || ''}
                                                placeholder='Enter resource type'
                                                readOnly
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                      },
                                    ]
                                : [
                                    ...(spaceTypeKey === 'coworking'
                                      ? [
                                          {
                                            label: 'Co-working Space Type',
                                            value: (
                                              <Input.Root
                                                key={`${space?.id || 'space'}-coworking_inventory_type-${getFieldValue('coworking_inventory_type') || ''}`}
                                                variant='borderless'
                                                size='xsmall'
                                                className='-ml-2'
                                              >
                                                <Input.Wrapper>
                                                  <Input.Input
                                                    value={
                                                      getFieldValue('coworking_inventory_type') ||
                                                      ''
                                                    }
                                                    placeholder='Dedicated Desk / Hot Desk'
                                                    readOnly
                                                    className='text-label-sm text-text-main-900'
                                                  />
                                                </Input.Wrapper>
                                              </Input.Root>
                                            ),
                                          },
                                          {
                                            label: 'Agreement Carpet Area',
                                            value: (
                                              <Input.Root
                                                variant='borderless'
                                                size='xsmall'
                                                className='-ml-2'
                                              >
                                                <Input.Wrapper>
                                                  <Input.Input
                                                    type='numeric'
                                                    value={
                                                      getFieldValue('agreement_carpet_area') ?? ''
                                                    }
                                                    placeholder='0'
                                                    min='0'
                                                    onChange={(e) => {
                                                      const { value } = e.target;
                                                      if (
                                                        value === '' ||
                                                        (!Number.isNaN(value) &&
                                                          Number.parseFloat(value) >= 0)
                                                      ) {
                                                        setLocalChange(
                                                          'agreement_carpet_area',
                                                          value,
                                                        );
                                                      }
                                                    }}
                                                    onBlur={(e) =>
                                                      handleSpaceFieldChange(
                                                        'agreement_carpet_area',
                                                        e.target.value.trim(),
                                                      )
                                                    }
                                                    className='text-label-sm text-text-main-900'
                                                  />
                                                </Input.Wrapper>
                                              </Input.Root>
                                            ),
                                            editable: true,
                                          },
                                          {
                                            label: 'Actual Carpet Area',
                                            value: (
                                              <ActualCarpetAreaField
                                                size='xsmall'
                                                // variant='borderless'
                                                className='-ml-2'
                                                inputClassName='text-label-sm text-text-main-900'
                                                sqftValue={
                                                  getFieldValue('actual_carpet_area') ?? ''
                                                }
                                                agreementArea={getFieldValue(
                                                  'agreement_carpet_area',
                                                )}
                                                onSqftChange={(value) =>
                                                  setLocalChange('actual_carpet_area', value)
                                                }
                                                onSqftBlur={(value) =>
                                                  handleSpaceFieldChange(
                                                    'actual_carpet_area',
                                                    String(value ?? '').trim(),
                                                  )
                                                }
                                              />
                                            ),
                                            editable: true,
                                          },
                                          {
                                            label: 'Expected Carpet Rate',
                                            value: (
                                              <Input.Root
                                                variant='borderless'
                                                size='xsmall'
                                                className='-ml-2'
                                              >
                                                <Input.Wrapper>
                                                  <Input.Input
                                                    type='numeric'
                                                    value={
                                                      getFieldValue('expected_carpet_rate') ?? ''
                                                    }
                                                    placeholder='0'
                                                    min='0'
                                                    onChange={(e) => {
                                                      const { value } = e.target;
                                                      if (
                                                        value === '' ||
                                                        (!Number.isNaN(value) &&
                                                          Number.parseFloat(value) >= 0)
                                                      ) {
                                                        setLocalChange(
                                                          'expected_carpet_rate',
                                                          value,
                                                        );
                                                      }
                                                    }}
                                                    onBlur={(e) =>
                                                      handleSpaceFieldChange(
                                                        'expected_carpet_rate',
                                                        e.target.value.trim(),
                                                      )
                                                    }
                                                    className='text-label-sm text-text-main-900'
                                                  />
                                                </Input.Wrapper>
                                              </Input.Root>
                                            ),
                                            editable: true,
                                          },
                                        ]
                                      : []),
                                    ...(spaceTypeKey === 'parking'
                                      ? [
                                          {
                                            label: 'Total parkings',
                                            value: (
                                              <Input.Root
                                                variant='borderless'
                                                size='xsmall'
                                                className='-ml-2'
                                              >
                                                <Input.Wrapper>
                                                  <Input.Input
                                                    type='numeric'
                                                    value={getFieldValue('total_seats') ?? ''}
                                                    placeholder='0'
                                                    readOnly
                                                    className='text-label-sm text-text-main-900'
                                                  />
                                                </Input.Wrapper>
                                              </Input.Root>
                                            ),
                                            editable: false,
                                          },
                                          {
                                            label: 'Available Parkings',
                                            value: (
                                              <Input.Root
                                                variant='borderless'
                                                size='xsmall'
                                                className='-ml-2'
                                              >
                                                <Input.Wrapper>
                                                  <Input.Input
                                                    type='numeric'
                                                    value={getFieldValue('available_seats') ?? ''}
                                                    placeholder='0'
                                                    readOnly
                                                    className='text-label-sm text-text-main-900'
                                                  />
                                                </Input.Wrapper>
                                              </Input.Root>
                                            ),
                                          },
                                          {
                                            label: 'Expected Per Parking Rate',
                                            value: (
                                              <Input.Root
                                                variant='borderless'
                                                size='xsmall'
                                                className='-ml-2'
                                              >
                                                <Input.Wrapper>
                                                  <Input.Input
                                                    type='numeric'
                                                    readOnly={
                                                      (getFieldValue('assigning_type') ?? '') ===
                                                      'FCFS'
                                                    }
                                                    value={
                                                      getFieldValue('expected_per_seat_rate') ?? ''
                                                    }
                                                    placeholder='0'
                                                    min='0'
                                                    onChange={(e) => {
                                                      const { value } = e.target;
                                                      if (
                                                        value === '' ||
                                                        (!Number.isNaN(Number(value)) &&
                                                          Number.parseFloat(value) >= 0)
                                                      ) {
                                                        setLocalChange(
                                                          'expected_per_seat_rate',
                                                          value,
                                                        );
                                                      }
                                                    }}
                                                    onBlur={(e) =>
                                                      handleSpaceFieldChange(
                                                        'expected_per_seat_rate',
                                                        e.target.value.trim(),
                                                      )
                                                    }
                                                    className='text-label-sm text-text-main-900'
                                                  />
                                                </Input.Wrapper>
                                              </Input.Root>
                                            ),
                                            editable: true,
                                          },
                                          (() => {
                                            const raw =
                                              Number(getFieldValue('total_seats') || 0) *
                                              Number(getFieldValue('expected_per_seat_rate') || 0);
                                            const total = Number.isFinite(raw)
                                              ? Math.round(raw)
                                              : Number.NaN;
                                            return {
                                              label: 'Total Rate of Parking',
                                              value: `₹${Number.isFinite(total) ? total.toLocaleString('en-IN') : '--'}`,
                                            };
                                          })(),
                                        ]
                                      : []),
                                    // Managed Office and Co-working fields
                                    // Check if it's a Bare Shell managed office
                                    ...(spaceTypeKey === 'managed' &&
                                    getFieldValue('managed_office_type') === 'Bare Shell'
                                      ? [
                                          // For Bare Shell: Show Managed Office Type, Credit Per Seat, Total sellable Carpet Area
                                          {
                                            label: 'Managed Office Type',
                                            value: (
                                              <Input.Root
                                                key={`${space?.id || 'space'}-managed_office_type-${getFieldValue('managed_office_type') || ''}`}
                                                variant='borderless'
                                                size='xsmall'
                                                className='-ml-2'
                                              >
                                                <Input.Wrapper>
                                                  <Input.Input
                                                    value={
                                                      getFieldValue('managed_office_type') || ''
                                                    }
                                                    placeholder='Bare Shell'
                                                    readOnly
                                                    className='text-label-sm text-text-main-900'
                                                  />
                                                </Input.Wrapper>
                                              </Input.Root>
                                            ),
                                          },
                                          {
                                            label: 'Credit Per Seat',
                                            value: (
                                              <Input.Root
                                                // key={`${space?.id || 'space'}-credit_per_seat-${getFieldValue('credit_per_seat') || ''}`}
                                                variant='borderless'
                                                size='xsmall'
                                                className='-ml-2'
                                              >
                                                <Input.Wrapper>
                                                  <Input.Input
                                                    type='numeric'
                                                    value={getFieldValue('credit_per_seat') ?? ''}
                                                    placeholder='0'
                                                    min='0'
                                                    onChange={(e) => {
                                                      const { value } = e.target;
                                                      if (
                                                        value === '' ||
                                                        (!Number.isNaN(value) &&
                                                          Number.parseFloat(value) >= 0)
                                                      ) {
                                                        setLocalChange('credit_per_seat', value);
                                                      }
                                                    }}
                                                    onBlur={(e) =>
                                                      handleSpaceFieldChange(
                                                        'credit_per_seat',
                                                        e.target.value.trim(),
                                                      )
                                                    }
                                                    // disabled={!canWrite}
                                                    className='text-label-sm text-text-main-900'
                                                  />
                                                </Input.Wrapper>
                                              </Input.Root>
                                            ),
                                            editable: true,
                                          },
                                          {
                                            label: 'Agreement Carpet Area',
                                            value: (
                                              <Input.Root
                                                // key={`${space?.id || 'space'}-agreement_carpet_area-${getFieldValue('agreement_carpet_area') || ''}`}
                                                variant='borderless'
                                                size='xsmall'
                                                className='-ml-2'
                                              >
                                                <Input.Wrapper>
                                                  <Input.Input
                                                    type='numeric'
                                                    value={
                                                      getFieldValue('agreement_carpet_area') ?? ''
                                                    }
                                                    placeholder='0'
                                                    min='0'
                                                    onChange={(e) => {
                                                      const { value } = e.target;
                                                      if (
                                                        value === '' ||
                                                        (!Number.isNaN(value) &&
                                                          Number.parseFloat(value) >= 0)
                                                      ) {
                                                        setLocalChange(
                                                          'agreement_carpet_area',
                                                          value,
                                                        );
                                                      }
                                                    }}
                                                    onBlur={(e) =>
                                                      handleSpaceFieldChange(
                                                        'agreement_carpet_area',
                                                        e.target.value.trim(),
                                                      )
                                                    }
                                                    // disabled={!canWrite}
                                                    className='text-label-sm text-text-main-900'
                                                  />
                                                </Input.Wrapper>
                                              </Input.Root>
                                            ),
                                            editable: true,
                                          },
                                          {
                                            label: 'Actual Carpet Area',
                                            value: (
                                              <ActualCarpetAreaField
                                                size='xsmall'
                                                className='-ml-2'
                                                inputClassName='text-label-sm text-text-main-900'
                                                sqftValue={
                                                  getFieldValue('actual_carpet_area') ?? ''
                                                }
                                                agreementArea={getFieldValue(
                                                  'agreement_carpet_area',
                                                )}
                                                onSqftChange={(value) =>
                                                  setLocalChange('actual_carpet_area', value)
                                                }
                                                onSqftBlur={(value) =>
                                                  handleSpaceFieldChange(
                                                    'actual_carpet_area',
                                                    String(value ?? '').trim(),
                                                  )
                                                }
                                              />
                                            ),
                                            editable: true,
                                          },
                                        ]
                                      : spaceTypeKey === 'purerental' || spaceTypeKey === 'parking'
                                        ? []
                                        : [
                                            // For other types: Show Total Sellable Seats, Expected Per Seat Rate, Total Rate of Space, Credit Per Seat
                                            (() => {
                                              // Backend now uses total_seats for all space types (replaced total_sellable_seats and no_of_seats)
                                              const seatsField = 'total_seats';
                                              const seatsLabel = 'Total Sellable Seats';
                                              return {
                                                label: seatsLabel,
                                                value: (
                                                  <Input.Root
                                                    // key={`${space?.id || 'space'}-${seatsField}-${getFieldValue(seatsField) || ''}`}
                                                    variant='borderless'
                                                    size='xsmall'
                                                    className='-ml-2'
                                                  >
                                                    <Input.Wrapper>
                                                      <Input.Input
                                                        type='numeric'
                                                        value={getFieldValue(seatsField) ?? ''}
                                                        placeholder='0'
                                                        min='0'
                                                        onChange={(e) => {
                                                          const { value } = e.target;
                                                          if (
                                                            value === '' ||
                                                            (!Number.isNaN(value) &&
                                                              Number.parseFloat(value) >= 0)
                                                          ) {
                                                            setLocalChange(seatsField, value);
                                                          }
                                                        }}
                                                        onBlur={(e) =>
                                                          handleSpaceFieldChange(
                                                            seatsField,
                                                            e.target.value.trim(),
                                                          )
                                                        }
                                                        // disabled={!canWrite}
                                                        className='text-label-sm text-text-main-900'
                                                      />
                                                    </Input.Wrapper>
                                                  </Input.Root>
                                                ),
                                                editable: true,
                                              };
                                            })(),
                                            (() => {
                                              const rateField = 'expected_per_seat_rate';
                                              return {
                                                label: 'Expected Per Seat Rate',
                                                value: (
                                                  <Input.Root
                                                    // key={`${space?.id || 'space'}-${rateField}-${getFieldValue(rateField) || ''}`}
                                                    variant='borderless'
                                                    size='xsmall'
                                                    className='-ml-2'
                                                  >
                                                    <Input.Wrapper>
                                                      <Input.Input
                                                        type='numeric'
                                                        value={getFieldValue(rateField) ?? ''}
                                                        placeholder='0'
                                                        min='0'
                                                        onChange={(e) => {
                                                          const { value } = e.target;
                                                          if (
                                                            value === '' ||
                                                            (!Number.isNaN(value) &&
                                                              Number.parseFloat(value) >= 0)
                                                          ) {
                                                            setLocalChange(rateField, value);
                                                          }
                                                        }}
                                                        onBlur={(e) =>
                                                          handleSpaceFieldChange(
                                                            rateField,
                                                            e.target.value.trim(),
                                                          )
                                                        }
                                                        // disabled={!canWrite}
                                                        className='text-label-sm text-text-main-900'
                                                      />
                                                    </Input.Wrapper>
                                                  </Input.Root>
                                                ),
                                                editable: true,
                                              };
                                            })(),
                                            (() => {
                                              // Backend now uses total_seats for all space types (replaced total_sellable_seats and no_of_seats)
                                              const seatsField = 'total_seats';
                                              const rateField = 'expected_per_seat_rate';
                                              const raw =
                                                Number(getFieldValue(seatsField) || 0) *
                                                Number(getFieldValue(rateField) || 0);
                                              const total = Number.isFinite(raw)
                                                ? Math.round(raw)
                                                : Number.NaN;
                                              return {
                                                label: 'Total Rate of Space',
                                                value: `₹${Number.isFinite(total) ? total.toLocaleString('en-IN') : '--'}`,
                                              };
                                            })(),
                                            {
                                              label: 'Credit Per Seat',
                                              value: (
                                                <Input.Root
                                                  // key={`${space?.id || 'space'}-credit_per_seat-${getFieldValue('credit_per_seat') || ''}`}
                                                  variant='borderless'
                                                  size='xsmall'
                                                  className='-ml-2'
                                                >
                                                  <Input.Wrapper>
                                                    <Input.Input
                                                      type='numeric'
                                                      value={getFieldValue('credit_per_seat') ?? ''}
                                                      placeholder='0'
                                                      min='0'
                                                      onChange={(e) => {
                                                        const { value } = e.target;
                                                        if (
                                                          value === '' ||
                                                          (!Number.isNaN(value) &&
                                                            Number.parseFloat(value) >= 0)
                                                        ) {
                                                          setLocalChange('credit_per_seat', value);
                                                        }
                                                      }}
                                                      onBlur={(e) =>
                                                        handleSpaceFieldChange(
                                                          'credit_per_seat',
                                                          e.target.value.trim(),
                                                        )
                                                      }
                                                      // disabled={!canWrite}
                                                      className='text-label-sm text-text-main-900'
                                                    />
                                                  </Input.Wrapper>
                                                </Input.Root>
                                              ),
                                              editable: true,
                                            },
                                          ]),
                                  ]),
                              ...(spaceTypeKey === 'purerental'
                                ? [
                                    {
                                      label: 'Pure Rental Type',
                                      value: (
                                        <Input.Root
                                          key={`${space?.id || 'space'}-pure_rental_type-${getFieldValue('pure_rental_type') || ''}`}
                                          variant='borderless'
                                          size='xsmall'
                                          className='-ml-2'
                                        >
                                          <Input.Wrapper>
                                            <Input.Input
                                              value={getFieldValue('pure_rental_type') || ''}
                                              placeholder='Furnished / Unfurnished'
                                              readOnly
                                              className='text-label-sm text-text-main-900'
                                            />
                                          </Input.Wrapper>
                                        </Input.Root>
                                      ),
                                    },
                                    {
                                      label: 'Agreement Carpet Area',
                                      value: (
                                        <Input.Root size='xsmall' className='-ml-2'>
                                          <Input.Wrapper>
                                            <Input.Input
                                              type='numeric'
                                              value={getFieldValue('agreement_carpet_area') ?? ''}
                                              placeholder='0'
                                              min='0'
                                              onChange={(e) => {
                                                const { value } = e.target;
                                                if (
                                                  value === '' ||
                                                  (!Number.isNaN(value) &&
                                                    Number.parseFloat(value) >= 0)
                                                ) {
                                                  setLocalChange('agreement_carpet_area', value);
                                                }
                                              }}
                                              onBlur={(e) =>
                                                handleSpaceFieldChange(
                                                  'agreement_carpet_area',
                                                  e.target.value.trim(),
                                                )
                                              }
                                              className='text-label-sm text-text-main-900'
                                            />
                                            <Input.Affix>sq.ft.</Input.Affix>
                                          </Input.Wrapper>
                                        </Input.Root>
                                      ),
                                      editable: true,
                                    },
                                    {
                                      label: 'Actual Carpet Area',
                                      value: (
                                        <ActualCarpetAreaField
                                          size='xsmall'
                                          className='-ml-2'
                                          inputClassName='text-label-sm text-text-main-900'
                                          sqftValue={getFieldValue('actual_carpet_area') ?? ''}
                                          agreementArea={getFieldValue('agreement_carpet_area')}
                                          onSqftChange={(value) =>
                                            setLocalChange('actual_carpet_area', value)
                                          }
                                          onSqftBlur={(value) =>
                                            handleSpaceFieldChange(
                                              'actual_carpet_area',
                                              String(value ?? '').trim(),
                                            )
                                          }
                                        />
                                      ),
                                      editable: true,
                                    },
                                    {
                                      label: 'Expected Carpet Rate (sq.ft.)',
                                      value: (
                                        <Input.Root
                                          // key={`${space?.id || 'space'}-expected_carpet_rate-${getFieldValue('expected_carpet_rate') || ''}`}
                                          variant='borderless'
                                          size='xsmall'
                                          className='-ml-2'
                                        >
                                          <Input.Wrapper>
                                            <Input.Input
                                              type='numeric'
                                              value={getFieldValue('expected_carpet_rate') ?? ''}
                                              placeholder='0'
                                              min='0'
                                              onChange={(e) => {
                                                const { value } = e.target;
                                                if (
                                                  value === '' ||
                                                  (!Number.isNaN(value) &&
                                                    Number.parseFloat(value) >= 0)
                                                ) {
                                                  setLocalChange('expected_carpet_rate', value);
                                                }
                                              }}
                                              onBlur={(e) =>
                                                handleSpaceFieldChange(
                                                  'expected_carpet_rate',
                                                  e.target.value.trim(),
                                                )
                                              }
                                              // disabled={!canWrite}
                                              className='text-label-sm text-text-main-900'
                                            />
                                          </Input.Wrapper>
                                        </Input.Root>
                                      ),
                                      editable: true,
                                    },
                                    (() => {
                                      const raw =
                                        Number(getFieldValue('agreement_carpet_area') || 0) *
                                        Number(getFieldValue('expected_carpet_rate') || 0);
                                      const total = Number.isFinite(raw)
                                        ? Math.round(raw)
                                        : Number.NaN;
                                      return {
                                        label: 'Total Rate of Space',
                                        value: `₹${Number.isFinite(total) ? total.toLocaleString('en-IN') : '--'}`,
                                      };
                                    })(),
                                  ]
                                : []),
                            ]}
                          />

                          {spaceTypeKey === 'managed' &&
                          getFieldValue('managed_office_type') !== 'Bare Shell' ? (
                            <div className='border-t border-stroke-soft-200 pt-6'>
                              <div className='flex items-center gap-2 mb-5'>
                                <RiBuilding2Line className='size-5 text-text-sub-600' />
                                <div className='label-medium text-text-sub-500'>
                                  Managed Office Details
                                </div>
                              </div>

                              {getFieldValue('managed_office_type') === 'Fitted Out' ? (
                                <div>
                                  <DetailGrid
                                    items={[
                                      {
                                        label: 'Managed Office Type',
                                        value: (
                                          <Select.Root
                                            variant='borderless'
                                            value={getFieldValue('managed_office_type') || ''}
                                            // onValueChange={(value) =>
                                            //   handleSpaceFieldChange('managed_office_type', value)
                                            // }
                                            size='xsmall'
                                            disabled
                                          >
                                            <Select.Trigger
                                              className='w-full -ml-2'
                                              showArrow={false}
                                            >
                                              <Select.Value placeholder='Select' />
                                            </Select.Trigger>
                                            <Select.Content>
                                              {['Fitted Out', 'Bare Shell'].map((v) => (
                                                <Select.Item key={v} value={v}>
                                                  {v}
                                                </Select.Item>
                                              ))}
                                            </Select.Content>
                                          </Select.Root>
                                        ),
                                        // editable: true,
                                      },
                                      {
                                        label: 'Agreement Carpet Area',
                                        value: (
                                          <Input.Root
                                            // key={`${space?.id || 'space'}-agreement_carpet_area-${getFieldValue('agreement_carpet_area') || ''}`}
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('agreement_carpet_area') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('agreement_carpet_area', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'agreement_carpet_area',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                // disabled={!canWrite}
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Actual Carpet Area',
                                        value: (
                                          <ActualCarpetAreaField
                                            size='xsmall'
                                            variant='default'
                                            className='-ml-2'
                                            inputClassName='text-label-sm text-text-main-900'
                                            sqftValue={getFieldValue('actual_carpet_area') ?? ''}
                                            agreementArea={getFieldValue('agreement_carpet_area')}
                                            onSqftChange={(value) =>
                                              setLocalChange('actual_carpet_area', value)
                                            }
                                            onSqftBlur={(value) =>
                                              handleSpaceFieldChange(
                                                'actual_carpet_area',
                                                String(value ?? '').trim(),
                                              )
                                            }
                                          />
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Expected Carpet Rate',
                                        value: (
                                          <Input.Root
                                            // key={`${space?.id || 'space'}-expected_carpet_rate-${getFieldValue('expected_carpet_rate') || ''}`}
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('expected_carpet_rate') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('expected_carpet_rate', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'expected_carpet_rate',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                // disabled={!canWrite}
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'No. of Workstations',
                                        value: (
                                          <Input.Root
                                            // key={`${space?.id || 'space'}-no_of_workstations-${getFieldValue('no_of_workstations') || ''}`}
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('no_of_workstations') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('no_of_workstations', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'no_of_workstations',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                // disabled={!canWrite}
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                      },
                                      {
                                        label: 'Director Cabins',
                                        value: (
                                          <Input.Root
                                            // key={`${space?.id || 'space'}-director_cabin-${getFieldValue('director_cabin') || ''}`}
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('director_cabin') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('director_cabin', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'director_cabin',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                // disabled={!canWrite}
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Manager Cabins',
                                        value: (
                                          <Input.Root
                                            // key={`${space?.id || 'space'}-manager_cabins-${getFieldValue('manager_cabins') || ''}`}
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('manager_cabins') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('manager_cabins', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'manager_cabins',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                // disabled={!canWrite}
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Meeting Rooms',
                                        value: (
                                          <Input.Root
                                            // key={`${space?.id || 'space'}-meeting_rooms-${getFieldValue('meeting_rooms') || ''}`}
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('meeting_rooms') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('meeting_rooms', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'meeting_rooms',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                // disabled={!canWrite}
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Conference Rooms',
                                        value: (
                                          <Input.Root
                                            // key={`${space?.id || 'space'}-conference_rooms-${getFieldValue('conference_rooms') || ''}`}
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('conference_rooms') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('conference_rooms', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'conference_rooms',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                // disabled={!canWrite}
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Phone Booths',
                                        value: (
                                          <Input.Root
                                            // key={`${space?.id || 'space'}-phonebooths-${getFieldValue('phonebooths') || ''}`}
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('phonebooths') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('phonebooths', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'phonebooths',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                // disabled={!canWrite}
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Breakout Zones',
                                        value: (
                                          <Input.Root
                                            // key={`${space?.id || 'space'}-breakout_zones-${getFieldValue('breakout_zones') || ''}`}
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='numeric'
                                                value={getFieldValue('breakout_zones') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('breakout_zones', value);
                                                  }
                                                }}
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'breakout_zones',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                // disabled={!canWrite}
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                      },
                                    ]}
                                  />
                                </div>
                              ) : (
                                <div>
                                  <DetailGrid
                                    items={[
                                      {
                                        label: 'Managed Office Type',
                                        value: (
                                          <Select.Root
                                            variant='borderless'
                                            value={getFieldValue('managed_office_type') || ''}
                                            onValueChange={(value) =>
                                              handleSpaceFieldChange('managed_office_type', value)
                                            }
                                            size='xsmall'
                                            disabled
                                          >
                                            <Select.Trigger
                                              className='w-full -ml-2'
                                              showArrow={false}
                                            >
                                              <Select.Value placeholder='Select' />
                                            </Select.Trigger>
                                            <Select.Content>
                                              {['Fitted Out', 'Bare Shell'].map((v) => (
                                                <Select.Item key={v} value={v}>
                                                  {v}
                                                </Select.Item>
                                              ))}
                                            </Select.Content>
                                          </Select.Root>
                                        ),
                                        editable: false,
                                      },
                                      {
                                        label: 'Agreement Carpet Area',
                                        value: (
                                          <Input.Root
                                            variant='borderless'
                                            size='xsmall'
                                            className='-ml-2'
                                          >
                                            <Input.Wrapper>
                                              <Input.Input
                                                type='number'
                                                value={getFieldValue('agreement_carpet_area') ?? ''}
                                                placeholder='0'
                                                min='0'
                                                onBlur={(e) =>
                                                  handleSpaceFieldChange(
                                                    'agreement_carpet_area',
                                                    e.target.value.trim(),
                                                  )
                                                }
                                                onChange={(e) => {
                                                  const { value } = e.target;
                                                  if (
                                                    value === '' ||
                                                    (!Number.isNaN(value) &&
                                                      Number.parseFloat(value) >= 0)
                                                  ) {
                                                    setLocalChange('agreement_carpet_area', value);
                                                  }
                                                }}
                                                className='text-label-sm text-text-main-900'
                                              />
                                            </Input.Wrapper>
                                          </Input.Root>
                                        ),
                                        editable: true,
                                      },
                                      {
                                        label: 'Actual Carpet Area',
                                        value: (
                                          <ActualCarpetAreaField
                                            size='xsmall'
                                            className='-ml-2'
                                            inputClassName='text-label-sm text-text-main-900'
                                            sqftValue={getFieldValue('actual_carpet_area') ?? ''}
                                            agreementArea={getFieldValue('agreement_carpet_area')}
                                            onSqftChange={(value) =>
                                              setLocalChange('actual_carpet_area', value)
                                            }
                                            onSqftBlur={(value) =>
                                              handleSpaceFieldChange(
                                                'actual_carpet_area',
                                                String(value ?? '').trim(),
                                              )
                                            }
                                          />
                                        ),
                                        editable: true,
                                      },
                                    ]}
                                  />
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className='flex flex-col gap-3 '>
                          <div className={'flex items-center justify-between'}>
                            <div className='text-label-sm flex items-center gap-2 label-medium text-text-strong-950'>
                              <RiImageLine className='text-[var(--color-text-sub-500)]' />
                              Photos
                            </div>
                            <input
                              ref={photoInputRef}
                              type='file'
                              accept='image/*'
                              multiple
                              className='hidden'
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handleUploadPhotos(e.target.files);
                                }
                              }}
                            />
                            {space?.photos?.length > 0 && (
                              <Button.Root
                                variant='neutral'
                                mode='stroke'
                                size='xsmall'
                                className='gap-1'
                                onClick={() => {
                                  if (photoInputRef.current) photoInputRef.current.click();
                                }}
                                disabled={isUploadingPhotos}
                              >
                                <Button.Icon as={RiAddLine} />
                                {isUploadingPhotos ? 'Uploading…' : 'Upload'}
                              </Button.Root>
                            )}
                          </div>
                          <div
                            className={`flex items-center ${space?.photos?.length > 0 ? 'justify-start' : 'justify-center'} w-full`}
                          >
                            <div className='flex  gap-2 max-w-[1080px] overflow-x-auto'>
                              {Array.isArray(space?.photos) && space.photos.length > 0 ? (
                                space.photos.map((photoItem, i) => {
                                  const url = photoItem?.photo || '';
                                  if (!url) return null;
                                  return (
                                    <div
                                      key={photoItem.name || i}
                                      className='relative aspect-square flex-1 w-[100px] h-[100px] rounded-lg border border-stroke-soft-200 bg-bg-weak-50 overflow-hidden group'
                                    >
                                      <a
                                        href={url}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='absolute inset-0 flex items-center justify-center'
                                        title='Open image'
                                      >
                                        <img
                                          src={url}
                                          alt='Space photo'
                                          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
                                        />
                                      </a>
                                      {/* Delete button in top right corner */}
                                      <button
                                        type='button'
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleDeletePhoto(photoItem);
                                        }}
                                        className='absolute right-1 top-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white rounded-lg p-1 shadow-regular-xs border border-stroke-soft-200 hover:bg-bg-weak-50'
                                        aria-label='Delete photo'
                                      >
                                        <RiDeleteBinLine className='size-3 text-error-base' />
                                      </button>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className='w-full flex  flex-col gap-3 items-center justify-center'>
                                  <EmptyImageState className='w-10 rounded-full h-10 object-contain' />
                                  <span className='label-small text-[var(--color-text-main-900)]'>
                                    No Photos available
                                  </span>
                                  <span className='paragraph-xsmall text-[var(--color-text-sub-500)]'>
                                    Add photos to keep a visual record.
                                  </span>
                                  <Button.Root
                                    variant='neutral'
                                    mode='stroke'
                                    size='xsmall'
                                    className='gap-2'
                                    onClick={() => {
                                      if (photoInputRef.current) photoInputRef.current.click();
                                    }}
                                    disabled={isUploadingPhotos}
                                  >
                                    <Button.Icon size={16} as={RiUploadLine} />
                                    {isUploadingPhotos ? 'Uploading…' : 'Upload'}
                                  </Button.Root>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className='border-t border-stroke-soft-200 pt-4' />

                          <div className='flex items-center  justify-between'>
                            <div className='text-label-sm flex items-center gap-2 label-medium text-text-strong-950'>
                              <RiFileLine className='text-[var(--color-text-sub-500)]' />
                              Plan Files
                            </div>
                            <input
                              ref={planInputRef}
                              type='file'
                              accept='image/*,.pdf'
                              multiple
                              className='hidden'
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handleUploadPlanFiles(e.target.files);
                                }
                              }}
                            />
                            {space?.planFile?.length > 0 && (
                              <Button.Root
                                variant='neutral'
                                mode='stroke'
                                size='xsmall'
                                className='gap-1'
                                onClick={() => {
                                  if (planInputRef.current) planInputRef.current.click();
                                }}
                                disabled={isUploadingPlans}
                              >
                                <Button.Icon as={RiAddLine} />
                                {isUploadingPlans ? 'Uploading…' : 'Upload'}
                              </Button.Root>
                            )}
                          </div>
                          <div className='w-full flex items-center '>
                            {space?.planFile &&
                            Array.isArray(space.planFile) &&
                            space.planFile.length > 0 ? (
                              <div className='flex gap-4 overflow-x-auto pb-1 pr-2 snap-x snap-mandatory w-full'>
                                {space.planFile.map((planItem, i) => {
                                  // Get the plan file URL
                                  const fileUrl = planItem.plan_files || '';

                                  // Extract filename from URL - remove query params if any
                                  const urlWithoutParams = fileUrl.split('?')[0];
                                  const fullFilename = urlWithoutParams.split('/').pop() || '';
                                  // Remove the hash prefix if present (e.g., "9FBIJ75N_File_Format_Icons_1.02eeead2eeead.png")
                                  const filename = fullFilename.includes('_')
                                    ? fullFilename.split('_').slice(1).join('_')
                                    : fullFilename || `Plan_${i + 1}`;

                                  const extension = getFileExtension(filename);
                                  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
                                    urlWithoutParams,
                                  );
                                  const hasDate = Boolean(planItem.creation);

                                  return (
                                    <div
                                      key={planItem.name || i}
                                      className='w-[220px] shrink-0 snap-start'
                                    >
                                      <div className='group relative flex h-full flex-col overflow-hidden rounded-[10px] border border-stroke-soft-200 bg-bg-weak-100'>
                                        <div className='relative flex size-[176px] w-full items-center justify-center bg-bg-weak-100'>
                                          {/* Delete button in top right corner */}
                                          <div className='absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100'>
                                            <CompactButton.Root
                                              size='large'
                                              variant='ghost'
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDeletePlanFile(planItem);
                                              }}
                                              aria-label={`Delete ${filename}`}
                                              className='bg-white/90 hover:bg-white text-error-base'
                                            >
                                              <CompactButton.Icon as={RiDeleteBinLine} />
                                            </CompactButton.Root>
                                          </div>

                                          {/* Preview */}
                                          {isImage && fileUrl ? (
                                            <img
                                              src={fileUrl}
                                              alt={filename}
                                              className='h-full w-full object-cover'
                                              loading='lazy'
                                            />
                                          ) : (
                                            <div className='flex flex-col items-center justify-center gap-2 px-3 text-center text-text-sub-500'>
                                              <div className='flex size-10 items-center justify-center rounded-lg border border-stroke-soft-200 bg-white shadow-sm'>
                                                <RiFileList2Line className='size-5 text-text-sub-500' />
                                              </div>
                                              <span className='text-paragraph-xs text-text-sub-500'>
                                                Preview unavailable
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div className='border-t border-stroke-soft-200 bg-white px-4 py-3 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
                                          <div className='flex items-center gap-2 min-w-0'>
                                            <FileFormatIcon.Root
                                              format={extension || 'FILE'}
                                              size='small'
                                              color='purple'
                                            />
                                            <div className='flex flex-col flex-1 min-w-0'>
                                              <a
                                                href={fileUrl}
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                className='label-small text-text-main-900 truncate hover:underline'
                                                title={filename}
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {filename}
                                              </a>
                                              <div className='mt-1 flex items-center gap-2 text-paragraph-xs text-text-sub-500'>
                                                <span>--</span>
                                              </div>
                                              {hasDate && (
                                                <div className='mt-1 flex items-center gap-2 text-paragraph-xs text-text-sub-500'>
                                                  <span>
                                                    {formatDisplayDateTime(planItem.creation)}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className='w-full flex flex-col gap-3 items-center justify-center'>
                                <EmptyPlanFileState className='w-10 rounded-full h-10 object-contain' />
                                <span className='label-small text-[var(--color-text-main-900)]'>
                                  No plan files available
                                </span>
                                <span className='paragraph-xsmall text-[var(--color-text-sub-500)]'>
                                  Add plan files to keep a visual record.
                                </span>
                                <Button.Root
                                  variant='neutral'
                                  mode='stroke'
                                  size='xsmall'
                                  className='gap-2'
                                  onClick={() => {
                                    if (planInputRef.current) planInputRef.current.click();
                                  }}
                                  disabled={isUploadingPlans}
                                >
                                  <Button.Icon size={20} as={RiUploadLine} />
                                  {isUploadingPlans ? 'Uploading…' : 'Upload'}
                                </Button.Root>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    ) : (
                      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-text-sub-600'>
                        No space found.
                      </div>
                    )}
                  </div>
                </div>
              </TabMenuHorizontal.Content>

              {/* Occupancy */}
              <TabMenuHorizontal.Content
                value='occupancy'
                className='py-6  px-6 pb-10 overflow-y-auto'
              >
                <div className='flex items-center gap-2'>
                  <RiTimeLine className='size-5 text-text-sub-600' />
                  <div className='label-medium text-text-sub-500'>Occupancy History</div>
                </div>

                <OccupancyHistoryToolbar
                  search={occupancySearch}
                  onSearchChange={setOccupancySearch}
                  groupBy={occupancyGroupBy}
                  onGroupByChange={setOccupancyGroupBy}
                  groupOrder={occupancyGroupOrder}
                  onGroupOrderChange={setOccupancyGroupOrder}
                  appliedFilters={occupancyAppliedFilters}
                  onFiltersChange={setOccupancyAppliedFilters}
                  clientOptions={occupancyClientOptions}
                  columnMaxLimits={occupancyColumnMaxLimits}
                  columnManagerAction={
                    <ColumnManagerDropdown
                      open={isColumnManagerOpen}
                      onOpenChange={setIsColumnManagerOpen}
                      config={
                        occupancyTableRef.current?.columnConfigHook || {
                          columns: [],
                          visibleColumns: [],
                        }
                      }
                      tooltipContent={<p>Column Manager</p>}
                      trigger={
                        <Button.Root
                          variant='neutral'
                          mode='stroke'
                          size='small'
                          aria-label='Columns'
                        >
                          <Button.Icon as={RiLayoutColumnLine} />
                        </Button.Root>
                      }
                    />
                  }
                  allocateClientAction={
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <Button.Root
                          size='small'
                          className='gap-1'
                          onClick={handleAllocateSpace}
                          disabled={space?.status === 'Occupied' || space?.status === 'Locked'}
                        >
                          <Button.Icon as={RiAddLine} />
                          Allocate Client
                        </Button.Root>
                      </Tooltip.Trigger>
                      {space?.status === 'Occupied' || space?.status === 'Locked' ? (
                        <Tooltip.Content>
                          <p>Only available for vacant spaces.</p>
                        </Tooltip.Content>
                      ) : null}
                    </Tooltip.Root>
                  }
                />

                <OccupancyHistoryTable
                  ref={occupancyTableRef}
                  data={occupancyRows}
                  spaceId={id}
                  isPureRentalSpace={spaceTypeKey === 'purerental'}
                  isParkingSpace={spaceTypeKey === 'parking'}
                  centerName={space?.center || ''}
                  groupBy={occupancyGroupBy}
                  groupOrder={occupancyGroupOrder}
                  isApiGrouped={allocatedSpaceListview.isGrouped}
                  onRowClick={(row, index) => {
                    openClientDrawerAtIndex(index);
                  }}
                  onSortingChange={handleOccupancySortingChange}
                  sorting={occupancySorting}
                  isLoading={allocatedSpaceListview.isLoading}
                  isFetchingMore={allocatedSpaceListview.isFetchingMore}
                  hasMore={allocatedSpaceListview.hasMore}
                  onLoadMore={handleOccupancyLoadMore}
                />
              </TabMenuHorizontal.Content>

              {/* Booking History for Resource type */}
              <TabMenuHorizontal.Content value='bookings' className='py-6 px-6 pb-10'>
                <div className='flex items-center justify-between'>
                  <SpaceBookingToolbar
                    tableRef={bookingTableRef}
                    dateRange={bookingDateRange}
                    onDateRangeChange={setBookingDateRange}
                    clients={clientsList}
                    clientFilter={bookingClientFilter}
                    onClientFilterChange={setBookingClientFilter}
                    space={space}
                  />
                </div>

                <div className='mt-5'>
                  <SpaceBookingTable
                    ref={bookingTableRef}
                    spaceId={id}
                    dateRange={bookingDateRange}
                    clientFilter={bookingClientFilter}
                    onRowSelect={handleRowSelect}
                  />
                </div>
              </TabMenuHorizontal.Content>

              {permittedMainTabIds.includes('layout') ? (
                <TabMenuHorizontal.Content
                  value='layout'
                  className='flex h-full min-h-0 flex-1 flex-col overflow-hidden py-0'
                >
                  <SpaceDetailLayoutTab
                    isActive={activeTab === 'layout'}
                    centerId={centerid}
                    floorValue={getFieldValue('floor') || space?.floor || ''}
                    layoutCoordinateRaw={original?.layout_coordinate}
                    spaceName={space?.spaceName}
                  />
                </TabMenuHorizontal.Content>
              ) : null}

              {permittedMainTabIds.includes('sub-space') ? (
                <TabMenuHorizontal.Content
                  value='sub-space'
                  className='flex min-h-0 flex-1 flex-col overflow-y-auto'
                >
                  <SpaceDetailSubSpaceTab
                    spaceOriginal={original}
                    isLoading={spaceInDetail.isLoading}
                  />
                </TabMenuHorizontal.Content>
              ) : null}

              {/* Placeholders */}
              {['finance', 'lease', 'assets'].map((key) => (
                <TabMenuHorizontal.Content key={key} value={key} className='py-6 pb-10'>
                  <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-text-sub-600'>
                    This section will be implemented next.
                  </div>
                </TabMenuHorizontal.Content>
              ))}
            </TabMenuHorizontal.Root>
          </div>
        </div>
      </div>

      <SpaceOccupiedClientDrawer
        open={isClientDrawerOpen}
        onOpenChange={setIsClientDrawerOpen}
        rows={occupancyRows}
        selectedIndex={selectedClientIndex}
        onSelectedIndexChange={(nextIndex) => setSelectedClientIndex(nextIndex)}
        spaceData={space}
        clientsList={clientsList}
        onUpdateRow={async (index, patch) => {
          // After updating a row, refetch the allocated space data to get latest from API
          if (id && space?.id) {
            setOccupancyLimitStart(0);
            lastOccupancyApiCallRef.current = '';
            await fetchOccupancyList({ limitStart: 0, skipDedupe: true });
          }
        }}
      />

      {
        <AllocatedSpaceModal
          isOpen={isAllocateSpaceModalOpen}
          onOpenChange={setIsAllocateSpaceModalOpen}
          clientsList={clientsList}
          spaceData={space}
        />
      }

      <DeleteSpaceModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      <BookingCreateDrawer />
      {/* open Booking Event Detail Drawer */}
      {shared.selectedBooking.isOpen && <BookingEventDetailDrawer />}
    </PageLayout>
  );
};

export default SpaceDetailPage;
