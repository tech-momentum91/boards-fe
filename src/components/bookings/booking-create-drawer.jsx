import React, { useMemo, useState, lazy, Suspense, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO, addMinutes } from 'date-fns';
import { RiTimeLine } from 'react-icons/ri';
import {
  closeBookingForm,
  saveBooking,
  fetchCenters,
  fetchDrawerResources,
  fetchBookingFormClients,
  fetchBookingExpandedCenters,
  checkSpaceAvailability,
  validateRecurringConflicts,
  clearConflictCheck,
} from '@/redux/bookingSlice';
import {
  RecurrenceType,
  RecurrenceEndType,
  getRandomColorGradient,
} from '@/components/bookings/constants';
import { formatIsoDatetimeToApiTime } from '@/utils/date-utils';
import { fetchResourceTypesForCenter, selectResourceTypesForCenter } from '@/redux/commonSlice';
import { bookingSchema } from '@/schemas/booking-schema';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import BookingCreateDrawerFormSkeleton from '@/components/bookings/booking-create-drawer-form-skeleton';

// Lazy load form sections
const BookingTitleDescriptionSection = lazy(
  () => import('@/components/bookings/booking-form-sections/booking-title-description-section'),
);
const BookingSpaceDetailsSection = lazy(
  () => import('@/components/bookings/booking-form-sections/booking-space-details-section'),
);
const BookingClientDetailsSection = lazy(
  () => import('@/components/bookings/booking-form-sections/booking-client-details-section'),
);
const BookingDateTimeSection = lazy(
  () => import('@/components/bookings/booking-form-sections/booking-date-time-section'),
);
const BookingCommentsSection = lazy(
  () => import('@/components/bookings/booking-form-sections/booking-comments-section'),
);
const BookingRecurringConflictsModal = lazy(
  () => import('@/components/bookings/booking-recurring-conflicts-modal'),
);

const BookingCreateDrawer = () => {
  const dispatch = useDispatch();

  const {
    isOpen,
    data: initialBookingData,
    isSubmitting: isReduxSubmitting,
  } = useSelector((state) => state.booking.createDrawer.form);

  const centers = useSelector((state) => state.booking.shared.centers.data || []);
  const bookingFormClientsData = useSelector(
    (state) => state.booking.createDrawer.bookingFormClients.data || [],
  );
  const bookingFormClientsStatus = useSelector(
    (state) => state.booking.createDrawer.bookingFormClients.status,
  );
  const expandedCentersData = useSelector(
    (state) => state.booking.createDrawer.expandedCenters.data || [],
  );
  const expandedCentersStatus = useSelector(
    (state) => state.booking.createDrawer.expandedCenters.status,
  );
  const resourceTypesForCenterState = useSelector(selectResourceTypesForCenter);
  const resources = useSelector((state) => state.booking.createDrawer.resources.data || []);
  const resourcesLoading = useSelector((state) => state.booking.createDrawer.resources.isLoading);
  const centersLoading = useSelector((state) => state.booking.shared.centers?.isLoading ?? false);
  const calendarResources = useSelector((state) => state.booking.calendarView.resources.data || []);
  const conflictCheck = useSelector((state) => state.booking.createDrawer.conflictCheck);

  const {
    control,
    handleSubmit: formHandleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      title: '',
      description: '',
      comment: '',
      center_id: '',
      book_for_any_center: false,
      resource_type_id: '',
      space_id: '',
      client_id: '',
      start_datetime: new Date().toISOString(),
      end_datetime: addMinutes(new Date(), 30).toISOString(),
      all_day: false,
      recurrence_type: RecurrenceType.ONE_TIME,
      days_of_week: '',
      recurrence_end_type: RecurrenceEndType.AFTER_OCCURRENCES,
      recurrence_end_date: '',
      recurrence_occurrences: undefined,
      recurring_date: undefined,
      recurring_month: undefined,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const watchedCenterId = watch('center_id');
  const bookForAnyCenter = watch('book_for_any_center');
  const watchedResourceTypeId = watch('resource_type_id');
  const watchedSpaceId = watch('space_id');
  const watchedClientId = watch('client_id');
  const watchedStartDatetime = watch('start_datetime');
  const watchedEndDatetime = watch('end_datetime');
  const watchedAllDay = watch('all_day');
  const watchedRecurrenceType = watch('recurrence_type');
  const watchedRecurrenceEndType = watch('recurrence_end_type');
  const watchedRecurrenceEndDate = watch('recurrence_end_date');
  const watchedRecurrenceOccurrences = watch('recurrence_occurrences');
  const watchedDaysOfWeek = watch('days_of_week');
  const watchedRecurringDate = watch('recurring_date');
  const watchedRecurringMonth = watch('recurring_month');

  const centerResourceTypes = useMemo(() => {
    if (!watchedCenterId) return [];
    if (resourceTypesForCenterState.forCenterId !== watchedCenterId) return [];
    return resourceTypesForCenterState.data || [];
  }, [watchedCenterId, resourceTypesForCenterState.forCenterId, resourceTypesForCenterState.data]);

  const centerResourceTypesLoading =
    Boolean(watchedCenterId) &&
    resourceTypesForCenterState.lastRequestedCenter === watchedCenterId &&
    resourceTypesForCenterState.status === 'loading';

  const isSubmitting = isReduxSubmitting;
  const hasTimeValidationErrors = Boolean(errors?.start_datetime || errors?.end_datetime);

  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isRecurringConflictsModalOpen, setIsRecurringConflictsModalOpen] = useState(false);
  const [recurringConflictsModalMode, setRecurringConflictsModalMode] = useState('view');
  const [initialDataFullyApplied, setInitialDataFullyApplied] = useState(false);

  const lastFetchParamsRef = useRef(null);
  const lastConflictParamsRef = useRef(null);
  const conflictDebounceRef = useRef(null);
  const lastOneTimeParamsRef = useRef(null);
  const oneTimeDebounceRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const hasInitializedNoDataRef = useRef(false);
  const hasAppliedInitialDataRef = useRef(false);
  const hasResetForInitialDataRef = useRef(false);
  const hasSetInitialCenterRef = useRef(false);
  const hasSetInitialResourceTypeRef = useRef(false);
  const hasSetInitialSpaceRef = useRef(false);
  const hasSetOtherInitialFieldsRef = useRef(false);
  const initialDataFullyAppliedRef = useRef(false);

  const filteredResources = useMemo(() => {
    if (!watchedCenterId || !watchedResourceTypeId) return [];
    return resources.filter(
      (r) => r.centerId === watchedCenterId && r.resourceTypeId === watchedResourceTypeId,
    );
  }, [resources, watchedCenterId, watchedResourceTypeId]);

  const hasInitialSpaceData = Boolean(
    initialBookingData?.space?.spaceId ||
    initialBookingData?.space?.centerId ||
    initialBookingData?.space?.resourceTypeId,
  );
  const space = initialBookingData?.space;
  const loadingBlocks =
    (space?.centerId && (centersLoading || !watchedCenterId)) ||
    (space?.resourceTypeId && (centerResourceTypesLoading || !watchedResourceTypeId)) ||
    (space?.spaceId && (resourcesLoading || !watchedSpaceId));
  const isInitialDataLoading =
    hasInitialSpaceData && !initialDataFullyAppliedRef.current && loadingBlocks;

  const selectedResource = useMemo(
    () => resources.find((r) => r.id === watchedSpaceId),
    [resources, watchedSpaceId],
  );

  const centersForDropdown = useMemo(() => {
    if (!bookForAnyCenter) return centers;
    if (expandedCentersStatus === 'succeeded' && expandedCentersData.length > 0) {
      return expandedCentersData;
    }
    return centers;
  }, [bookForAnyCenter, centers, expandedCentersData, expandedCentersStatus]);

  const permittedCenterIds = useMemo(
    () => new Set(centers.map((c) => c.value).filter(Boolean)),
    [centers],
  );

  const handleBookForAnyCenterChange = useCallback(
    (nextBookForAnyCenter) => {
      if (nextBookForAnyCenter) return;
      const cid = getValues('center_id') || '';
      if (!cid || permittedCenterIds.has(cid)) return;
      setValue('center_id', '', { shouldValidate: false });
      setValue('resource_type_id', '', { shouldValidate: false });
      setValue('space_id', '', { shouldValidate: false });
      setValue('client_id', '', { shouldValidate: false });
      // Calendar/open initial-data still has space.centerId in Redux while the form no longer matches it;
      // otherwise loadingBlocks stays true forever (waiting for watchedCenterId === initial center).
      initialDataFullyAppliedRef.current = true;
      setInitialDataFullyApplied(true);
    },
    [getValues, permittedCenterIds, setInitialDataFullyApplied, setValue],
  );

  const selectedClient = useMemo(
    () => bookingFormClientsData.find((c) => c.value === watchedClientId),
    [bookingFormClientsData, watchedClientId],
  );

  // Function to fetch resources with specific filters
  const fetchResourcesWithFilters = useCallback(
    (centerId, resourceTypeId) => {
      const filters = {};
      if (centerId) filters.center = centerId;
      if (resourceTypeId) filters.resourceTypes = [resourceTypeId];
      if (bookForAnyCenter) filters.bookForAnyCenter = true;

      const filterKey = JSON.stringify(filters);

      if (lastFetchParamsRef.current !== filterKey) {
        lastFetchParamsRef.current = filterKey;
        dispatch(fetchDrawerResources({ filters }));
      }
    },
    [bookForAnyCenter, dispatch],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (centers.length === 0) dispatch(fetchCenters());
  }, [isOpen, dispatch, centers.length]);

  useEffect(() => {
    if (!isOpen) return;
    dispatch(fetchResourceTypesForCenter(watchedCenterId || ''));
  }, [isOpen, watchedCenterId, dispatch]);

  useEffect(() => {
    if (!isOpen || !bookForAnyCenter) return;
    if (expandedCentersStatus !== 'idle') return;
    dispatch(fetchBookingExpandedCenters());
  }, [isOpen, bookForAnyCenter, expandedCentersStatus, dispatch]);

  useEffect(() => {
    if (!isOpen) return;
    if (bookForAnyCenter) {
      dispatch(fetchBookingFormClients({ centerId: null, unrestricted: true }));
      return;
    }
    if (watchedCenterId) {
      dispatch(fetchBookingFormClients({ centerId: watchedCenterId, unrestricted: false }));
    }
  }, [isOpen, bookForAnyCenter, watchedCenterId, dispatch]);

  useEffect(() => {
    if (!watchedClientId) return;
    if (bookingFormClientsStatus === 'loading') return;
    const ok = bookingFormClientsData.some((c) => c.value === watchedClientId);
    if (!ok) setValue('client_id', '', { shouldValidate: false });
  }, [bookingFormClientsData, bookingFormClientsStatus, watchedClientId, setValue]);

  // Fetch space list only when form has center + resource type (user or initial-data flow sets them)
  useEffect(() => {
    if (!isOpen) {
      lastFetchParamsRef.current = null;
      lastConflictParamsRef.current = null;
      lastOneTimeParamsRef.current = null;
      return;
    }
    const centerId = watchedCenterId || '';
    const resourceTypeId = watchedResourceTypeId || '';
    const filters = {};
    if (centerId) filters.center = centerId;
    if (resourceTypeId) filters.resourceTypes = [resourceTypeId];
    if (bookForAnyCenter) filters.bookForAnyCenter = true;
    const filterKey = JSON.stringify(filters);
    if (lastFetchParamsRef.current === filterKey) return;
    lastFetchParamsRef.current = filterKey;
    const run = () => dispatch(fetchDrawerResources({ filters }));
    const t = setTimeout(run, 100);
    return () => clearTimeout(t);
  }, [isOpen, bookForAnyCenter, dispatch, watchedCenterId, watchedResourceTypeId]);

  // Reset form when drawer opens. With initial data: reset form once so we don't keep stale
  // center/type/space from a previous booking (which would trigger section to clear space when
  // Step 2 sets the new type). Without initial data: reset once as before.
  useEffect(() => {
    if (!isOpen) {
      hasInitializedNoDataRef.current = false;
      hasAppliedInitialDataRef.current = false;
      hasResetForInitialDataRef.current = false;
      hasSetInitialCenterRef.current = false;
      hasSetInitialResourceTypeRef.current = false;
      hasSetInitialSpaceRef.current = false;
      hasSetOtherInitialFieldsRef.current = false;
      initialDataFullyAppliedRef.current = false;
      setInitialDataFullyApplied(false);
      return;
    }

    const space = initialBookingData?.space;
    const hasInitialData = space?.spaceId || space?.centerId || space?.resourceTypeId;

    if (!hasInitialData) {
      const singleCenterId =
        centers.length === 1 && centers[0]?.value ? String(centers[0].value) : '';

      if (!hasInitializedNoDataRef.current) {
        hasInitializedNoDataRef.current = true;
        reset({
          title: '',
          description: '',
          comment: '',
          center_id: singleCenterId,
          book_for_any_center: false,
          resource_type_id: '',
          space_id: '',
          client_id: '',
          start_datetime: new Date().toISOString(),
          end_datetime: addMinutes(new Date(), 30).toISOString(),
          all_day: false,
          recurrence_type: RecurrenceType.ONE_TIME,
          days_of_week: '',
          recurrence_end_type: RecurrenceEndType.AFTER_OCCURRENCES,
          recurrence_end_date: '',
          recurrence_occurrences: undefined,
          recurring_date: undefined,
          recurring_month: undefined,
        });
        setIsDescriptionOpen(false);
        setIsCommentOpen(false);
        return;
      }

      // Centers finished loading after first reset (length was 0): pre-fill the lone center
      if (singleCenterId && !getValues('center_id')) {
        setValue('center_id', singleCenterId, { shouldValidate: false });
        fetchResourcesWithFilters(singleCenterId, getValues('resource_type_id') || '');
      }
      return;
    }

    // With initial data: reset form once per open so center/type/space start empty; then
    // Step 1/2/3 and other effects will populate. This avoids stale form state that would
    // trigger the section to clear space when we set the new resource type.
    if (!hasResetForInitialDataRef.current) {
      hasResetForInitialDataRef.current = true;
      hasSetOtherInitialFieldsRef.current = false;
      hasSetInitialCenterRef.current = false;
      hasSetInitialResourceTypeRef.current = false;
      hasSetInitialSpaceRef.current = false;
      initialDataFullyAppliedRef.current = false;
      setInitialDataFullyApplied(false);
      reset({
        title: '',
        description: '',
        comment: '',
        center_id: '',
        book_for_any_center: false,
        resource_type_id: '',
        space_id: '',
        client_id: '',
        start_datetime: new Date().toISOString(),
        end_datetime: addMinutes(new Date(), 30).toISOString(),
        all_day: false,
        recurrence_type: RecurrenceType.ONE_TIME,
        days_of_week: '',
        recurrence_end_type: RecurrenceEndType.AFTER_OCCURRENCES,
        recurrence_end_date: '',
        recurrence_occurrences: undefined,
        recurring_date: undefined,
        recurring_month: undefined,
      });
      setIsDescriptionOpen(false);
      setIsCommentOpen(false);
    }
    hasAppliedInitialDataRef.current = true;
  }, [
    isOpen,
    initialBookingData,
    centers,
    reset,
    setIsDescriptionOpen,
    setIsCommentOpen,
    getValues,
    setValue,
    fetchResourcesWithFilters,
  ]);

  // Initial data: set title, date, time, client, etc. once (not center/type/space)
  useEffect(() => {
    if (
      !isOpen ||
      !hasInitialSpaceData ||
      !hasAppliedInitialDataRef.current ||
      hasSetOtherInitialFieldsRef.current
    )
      return;
    hasSetOtherInitialFieldsRef.current = true;
    const dt = initialBookingData?.dateTime;
    setValue('client_id', initialBookingData?.client?.clientId || '');
    setValue('all_day', dt?.allDay || false);
    setValue('recurrence_type', initialBookingData?.recurrence?.type || RecurrenceType.ONE_TIME);
    setValue('days_of_week', initialBookingData?.recurrence?.daysOfWeek || '');
    setValue(
      'recurrence_end_type',
      initialBookingData?.recurrence?.endType || RecurrenceEndType.AFTER_OCCURRENCES,
    );
    setValue('recurrence_end_date', initialBookingData?.recurrence?.endDate || '');
    setValue('recurrence_occurrences', initialBookingData?.recurrence?.occurrences ?? undefined);
    setValue('recurring_date', initialBookingData?.recurrence?.dayOfMonth ?? undefined);
    setValue('recurring_month', initialBookingData?.recurrence?.monthOfYear ?? undefined);
    setValue('description', initialBookingData?.description || '');
    setValue('comment', initialBookingData?.comment || '');
    setIsDescriptionOpen(Boolean(initialBookingData?.description));
    setIsCommentOpen(Boolean(initialBookingData?.comment));
    const title = initialBookingData?.title || '';
    if (title) setValue('title', title);

    let startIso = new Date().toISOString();
    const startFromPicker = dt?.startTime ? new Date(dt.startTime) : null;
    if (startFromPicker && !Number.isNaN(startFromPicker.getTime())) {
      startIso = startFromPicker.toISOString();
    } else if (dt?.date) {
      const dayOnly = new Date(dt.date);
      if (!Number.isNaN(dayOnly.getTime())) startIso = dayOnly.toISOString();
    }

    let endIso = addMinutes(parseISO(startIso), 30).toISOString();
    const endFromPicker = dt?.endTime ? new Date(dt.endTime) : null;
    if (endFromPicker && !Number.isNaN(endFromPicker.getTime())) {
      endIso = endFromPicker.toISOString();
    }

    setValue('start_datetime', startIso, { shouldValidate: false });
    setValue('end_datetime', endIso, { shouldValidate: false });
  }, [
    isOpen,
    hasInitialSpaceData,
    initialBookingData,
    setValue,
    setIsDescriptionOpen,
    setIsCommentOpen,
  ]);

  // Step 1: Set center only after centers are fetched (so option exists in dropdown)
  useEffect(() => {
    if (!isOpen) return;
    if (!space?.centerId) return;
    if (centers.length === 0) return;
    if (hasSetInitialCenterRef.current) return;
    const centerExists = centersForDropdown.some((c) => c.value === space.centerId);
    if (!centerExists) return;
    hasSetInitialCenterRef.current = true;
    setValue('center_id', space.centerId, { shouldValidate: false });
  }, [isOpen, space?.centerId, centers, centersForDropdown, setValue]);

  // Step 2: Set resource type only after resource types are fetched and center is set
  useEffect(() => {
    if (!isOpen) return;
    if (!space?.resourceTypeId) return;
    if (centerResourceTypesLoading) return;
    if (centerResourceTypes.length === 0) return;
    if (watchedCenterId !== space?.centerId) return;
    if (hasSetInitialResourceTypeRef.current) return;
    const typeExists = centerResourceTypes.some((rt) => rt.value === space.resourceTypeId);
    if (!typeExists) return;
    hasSetInitialResourceTypeRef.current = true;
    setValue('resource_type_id', space.resourceTypeId, { shouldValidate: false });
    if (!space?.spaceId) {
      initialDataFullyAppliedRef.current = true;
      setInitialDataFullyApplied(true);
    }
  }, [
    isOpen,
    space?.centerId,
    space?.resourceTypeId,
    space?.spaceId,
    centerResourceTypes,
    centerResourceTypesLoading,
    watchedCenterId,
    setValue,
  ]);

  useEffect(() => {
    if (!watchedResourceTypeId || !watchedCenterId) return;
    if (centerResourceTypesLoading) return;
    const ok = centerResourceTypes.some((rt) => rt.value === watchedResourceTypeId);
    if (!ok) {
      setValue('resource_type_id', '', { shouldValidate: false });
      setValue('space_id', '', { shouldValidate: false });
    }
  }, [
    centerResourceTypes,
    centerResourceTypesLoading,
    watchedResourceTypeId,
    watchedCenterId,
    setValue,
  ]);

  // Step 3: Set space only after space list is fetched for current center+type and space is in list.
  // Do NOT set initialDataFullyApplied here — a separate effect does that only after watchedSpaceId
  // matches, so clearSpaceOnCenterOrTypeChange stays false until the form has the space and we avoid
  // clearing space_id on a stray center/type onValueChange.
  useEffect(() => {
    if (!isOpen) return;
    if (!space?.spaceId) return;
    if (resourcesLoading) return;
    if (!watchedCenterId || !watchedResourceTypeId) return;
    if (hasSetInitialSpaceRef.current) return;
    const found = filteredResources.some((r) => r.id === space.spaceId);
    if (!found) return;
    hasSetInitialSpaceRef.current = true;
    setValue('space_id', space.spaceId, { shouldValidate: false });
    if (!initialBookingData?.title) {
      const name = filteredResources.find((r) => r.id === space.spaceId)?.name;
      if (name) setValue('title', name);
    }
  }, [
    isOpen,
    space?.spaceId,
    resourcesLoading,
    watchedCenterId,
    watchedResourceTypeId,
    filteredResources,
    initialBookingData?.title,
    setValue,
  ]);

  // Mark initial data fully applied only when the form actually shows the initial space (watchedSpaceId
  // matches). Never set when we have a target spaceId but form still shows empty (avoids race where
  // we'd set the flag and then center/type would clear space_id).
  useEffect(() => {
    if (!isOpen || !hasInitialSpaceData) return;
    const initialSpaceData = initialBookingData?.space;
    const targetSpaceId = initialSpaceData?.spaceId;
    if (targetSpaceId) {
      // Only mark applied when the form actually has the space selected
      if (watchedSpaceId === targetSpaceId) {
        initialDataFullyAppliedRef.current = true;
        setInitialDataFullyApplied(true);
      }
      return;
    }
    // No initial spaceId; fully applied once center + type in form match initial data
    if (
      initialSpaceData?.centerId &&
      initialSpaceData?.resourceTypeId &&
      watchedCenterId === initialSpaceData.centerId &&
      watchedResourceTypeId === initialSpaceData.resourceTypeId
    ) {
      initialDataFullyAppliedRef.current = true;
      setInitialDataFullyApplied(true);
    }
  }, [
    isOpen,
    hasInitialSpaceData,
    initialBookingData?.space,
    watchedSpaceId,
    watchedCenterId,
    watchedResourceTypeId,
  ]);

  // Auto-open description if it has value
  const descriptionValue = watch('description');
  useEffect(() => {
    if (descriptionValue) {
      setIsDescriptionOpen(true);
    }
  }, [descriptionValue]);

  // Auto-open comment if it has value
  const commentValue = watch('comment');
  useEffect(() => {
    if (commentValue) {
      setIsCommentOpen(true);
    }
  }, [commentValue]);

  // When All Day is on, force one-time recurrence (day span is set in BookingDateTimeSection)
  useEffect(() => {
    if (!watchedAllDay) return;
    setValue('recurrence_type', RecurrenceType.ONE_TIME);
    setValue('days_of_week', '');
  }, [watchedAllDay, setValue]);

  // Clear conflict check when relevant fields change (one-time)
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (watchedRecurrenceType === RecurrenceType.ONE_TIME) {
      dispatch(clearConflictCheck());
    }
  }, [
    isOpen,
    dispatch,
    watchedSpaceId,
    watchedStartDatetime,
    watchedEndDatetime,
    watchedRecurrenceType,
  ]);

  // One-time booking conflict check (time-based)
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (watchedRecurrenceType !== RecurrenceType.ONE_TIME) {
      return;
    }

    if (!watchedSpaceId || !watchedStartDatetime) {
      return;
    }

    if (!watchedAllDay && (!watchedStartDatetime || !watchedEndDatetime)) {
      return;
    }

    const bookingDate = format(parseISO(watchedStartDatetime), 'yyyy-MM-dd');
    const endBookingDate = format(
      parseISO(watchedEndDatetime || watchedStartDatetime),
      'yyyy-MM-dd',
    );

    const startTime24 = formatIsoDatetimeToApiTime(watchedStartDatetime);
    const endTime24 = formatIsoDatetimeToApiTime(watchedEndDatetime);
    if (!startTime24 || !endTime24) {
      return;
    }

    const payload = {
      space_id: watchedSpaceId,
      booking_date: bookingDate,
      end_booking_date: endBookingDate,
      start_time: startTime24,
      end_time: endTime24,
    };

    const key = JSON.stringify(payload);
    if (lastOneTimeParamsRef.current === key) {
      return;
    }
    lastOneTimeParamsRef.current = key;

    if (oneTimeDebounceRef.current) {
      clearTimeout(oneTimeDebounceRef.current);
    }

    oneTimeDebounceRef.current = setTimeout(() => {
      dispatch(checkSpaceAvailability(payload));
    }, 400);
  }, [
    isOpen,
    dispatch,
    watchedSpaceId,
    watchedStartDatetime,
    watchedEndDatetime,
    watchedAllDay,
    watchedRecurrenceType,
  ]);

  // Clear conflict check when relevant fields change (recurring)
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (watchedRecurrenceType !== RecurrenceType.ONE_TIME) {
      dispatch(clearConflictCheck());
    }
  }, [
    isOpen,
    dispatch,
    watchedSpaceId,
    watchedStartDatetime,
    watchedEndDatetime,
    watchedRecurrenceType,
    watchedRecurrenceEndType,
    watchedRecurrenceEndDate,
    watchedRecurrenceOccurrences,
    watchedDaysOfWeek,
    watchedRecurringDate,
    watchedRecurringMonth,
  ]);

  // Validate recurring conflicts when key fields change
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (watchedRecurrenceType === RecurrenceType.ONE_TIME) {
      return;
    }

    if (!watchedSpaceId || !watchedStartDatetime || !watchedRecurrenceType) {
      return;
    }

    const bookingDate = format(parseISO(watchedStartDatetime), 'yyyy-MM-dd');
    const endBookingDate = format(
      parseISO(watchedEndDatetime || watchedStartDatetime),
      'yyyy-MM-dd',
    );

    let occurrence = 0;
    let recurrenceEndDate = '';

    if (watchedRecurrenceEndType === RecurrenceEndType.ON_DATE && watchedRecurrenceEndDate) {
      recurrenceEndDate = format(new Date(watchedRecurrenceEndDate), 'yyyy-MM-dd');
      occurrence = 0;
    } else if (
      watchedRecurrenceEndType === RecurrenceEndType.AFTER_OCCURRENCES &&
      watchedRecurrenceOccurrences
    ) {
      occurrence = watchedRecurrenceOccurrences;
      recurrenceEndDate = '';
    }

    // Do not call API without a recurrence end condition (end date or occurrence count)
    if (!recurrenceEndDate && !(occurrence > 0)) {
      return;
    }

    if (watchedRecurrenceType === RecurrenceType.WEEKLY && !watchedDaysOfWeek) {
      return;
    }

    if (
      (watchedRecurrenceType === RecurrenceType.MONTHLY ||
        watchedRecurrenceType === RecurrenceType.QUARTERLY) &&
      !watchedRecurringDate
    ) {
      return;
    }

    if (
      watchedRecurrenceType === RecurrenceType.ANNUALLY &&
      (!watchedRecurringDate || !watchedRecurringMonth)
    ) {
      return;
    }

    const startTime24 = watchedAllDay ? '' : formatIsoDatetimeToApiTime(watchedStartDatetime);
    const endTime24 = watchedAllDay ? '' : formatIsoDatetimeToApiTime(watchedEndDatetime);

    const payload = {
      space_id: watchedSpaceId,
      recurrence: watchedRecurrenceType,
      occurrence: occurrence || 0,
      booking_date: bookingDate,
      end_booking_date: endBookingDate,
      recurrence_end_date: recurrenceEndDate || '',
      week_days: watchedDaysOfWeek || '',
      recurring_date: watchedRecurringDate || null,
      recurring_month: watchedRecurringMonth || null,
      start_time: startTime24,
      end_time: endTime24,
    };

    const paramsKey = JSON.stringify(payload);

    if (lastConflictParamsRef.current === paramsKey) {
      return;
    }

    lastConflictParamsRef.current = paramsKey;

    if (conflictDebounceRef.current) {
      clearTimeout(conflictDebounceRef.current);
    }

    conflictDebounceRef.current = setTimeout(() => {
      dispatch(validateRecurringConflicts(payload));
    }, 400);
  }, [
    isOpen,
    dispatch,
    watchedSpaceId,
    watchedStartDatetime,
    watchedEndDatetime,
    watchedAllDay,
    watchedRecurrenceType,
    watchedRecurrenceEndType,
    watchedRecurrenceEndDate,
    watchedRecurrenceOccurrences,
    watchedDaysOfWeek,
    watchedRecurringDate,
    watchedRecurringMonth,
  ]);

  const handleContinueFromConflictsModal = useCallback(async () => {
    const pending = pendingSaveRef.current;
    if (!pending) return;
    const result = await dispatch(
      saveBooking({
        endpoint: pending.endpoint,
        payload: pending.payload,
        ignoreConflictedDates: true,
      }),
    );
    if (saveBooking.fulfilled.match(result)) {
      if (pendingSaveRef.current === pending) {
        pendingSaveRef.current = null;
      }
      setIsRecurringConflictsModalOpen(false);
      showSuccessToast('Booking created successfully.');
    } else if (saveBooking.rejected.match(result)) {
      showErrorToast(result.payload, {
        defaultMessage: 'Failed to create booking',
      });
      // Keep modal and drawer open
    }
  }, [dispatch]);

  // Form submission handler
  const handleFormSubmit = useCallback(
    async (data) => {
      try {
        const isOneTime = data.recurrence_type === RecurrenceType.ONE_TIME;

        // Generate random color gradient for new booking
        const colorGradient = getRandomColorGradient();

        const startParsed = parseISO(data.start_datetime);
        const endParsed = parseISO(data.end_datetime);
        const basePayload = {
          booking_title: data.title || '',
          description: data.description || '',
          client: data.client_id,
          center: data.center_id,
          resource_type: data.resource_type_id,
          space_id: data.space_id,
          booking_date: format(startParsed, 'yyyy-MM-dd'),
          booking_end_date: format(endParsed, 'yyyy-MM-dd'),
          all_day: data.all_day ? 1 : 0,
          color_gradient: colorGradient,
          start_time: formatIsoDatetimeToApiTime(data.start_datetime),
          end_time: formatIsoDatetimeToApiTime(data.end_datetime),
        };

        let endpoint = '/resource/Space Booking';
        let payload = { ...basePayload };

        if (isOneTime && data.book_for_any_center) {
          endpoint =
            '/method/devx.booking.doctype.space_booking.space_booking.create_space_booking';
          payload = { ...basePayload, book_for_any_center: 1 };
        }

        if (!isOneTime) {
          endpoint = '/resource/Recurring Space Booking';

          payload = {
            ...basePayload,
            recurrence_type: data.recurrence_type,
            recurrence: data.recurrence_type,
            days_of_week: data.days_of_week || '',
          };

          if (data.recurrence_end_type === RecurrenceEndType.ON_DATE && data.recurrence_end_date) {
            payload.recurrence_end_date = format(new Date(data.recurrence_end_date), 'yyyy-MM-dd');
            payload.occurrence = 0;
          } else if (
            data.recurrence_end_type === RecurrenceEndType.AFTER_OCCURRENCES &&
            data.recurrence_occurrences
          ) {
            payload.recurrence_end_date = '';
            payload.occurrence = data.recurrence_occurrences;
          } else {
            payload.recurrence_end_date = '';
            payload.occurrence = 0;
          }

          if (
            (data.recurrence_type === RecurrenceType.MONTHLY ||
              data.recurrence_type === RecurrenceType.QUARTERLY ||
              data.recurrence_type === RecurrenceType.ANNUALLY) &&
            data.recurring_date
          ) {
            payload.recurring_date = data.recurring_date;
          }

          if (data.recurrence_type === RecurrenceType.ANNUALLY && data.recurring_month) {
            payload.recurring_month = data.recurring_month;
          }

          if (data.recurrence_type === RecurrenceType.WEEKLY && payload.days_of_week) {
            payload.week_days = payload.days_of_week;
          }

          if (data.book_for_any_center) {
            endpoint =
              '/method/devx.booking.doctype.recurring_space_booking.recurring_space_booking.create_recurring_space_booking';
            payload = { ...payload, book_for_any_center: 1 };
          }
        }

        if (!isOneTime) {
          pendingSaveRef.current = { endpoint, payload };
          const hasConflicts = (conflictCheck?.conflicts?.length ?? 0) > 0;
          if (hasConflicts) {
            setRecurringConflictsModalMode('confirm');
            setIsRecurringConflictsModalOpen(true);
            return;
          }
        }

        const result = await dispatch(saveBooking({ endpoint, payload }));

        if (saveBooking.fulfilled.match(result)) {
          pendingSaveRef.current = null;
          showSuccessToast('Booking created successfully.');
        } else if (saveBooking.rejected.match(result)) {
          pendingSaveRef.current = null;
          showErrorToast(result.payload, {
            defaultMessage: 'Failed to create booking',
          });
        }
      } catch (error) {
        pendingSaveRef.current = null;
        console.error('Failed to create booking:', error);
        showErrorToast(error, {
          defaultMessage: 'Failed to create booking',
        });
      }
    },
    [dispatch, conflictCheck?.conflicts?.length],
  );

  const handleClose = (open) => {
    // Only handle closing (when open is false)
    if (open === false && !isSubmitting) {
      dispatch(closeBookingForm());
    }
  };

  const handleCenterChange = (centerId) => {
    fetchResourcesWithFilters(centerId, watchedResourceTypeId);
  };

  const handleResourceTypeChange = (resourceTypeId) => {
    fetchResourcesWithFilters(watchedCenterId, resourceTypeId);
  };

  const handleViewAllConflicts = () => {
    setRecurringConflictsModalMode('view');
    setIsRecurringConflictsModalOpen(true);
  };

  return (
    <>
      <Drawer.Root open={isOpen} onOpenChange={(open) => handleClose(open)}>
        <Drawer.Content className='w-[600px] flex flex-col h-full overflow-hidden'>
          <Drawer.Header className='sticky top-0 z-10 bg-white'>
            <div className='flex items-center justify-between gap-4 px-6 py-5'>
              <div className='rounded-full border border-stroke-soft-200 p-2.5'>
                <RiTimeLine size={24} />
              </div>
              <div className='flex flex-col gap-1'>
                <Drawer.Title className='label-medium text-text-main-900'>
                  Create New Booking
                </Drawer.Title>
                <p className='paragraph-small text-text-sub-500'>
                  Enter below details to create new booking
                </p>
              </div>
            </div>
          </Drawer.Header>

          <form
            onSubmit={formHandleSubmit(handleFormSubmit)}
            className='flex flex-col flex-1 min-h-0 overflow-hidden'
          >
            <Drawer.Body className='flex flex-col gap-5 px-6 pb-6 pt-4 flex-1 overflow-y-auto overscroll-y-contain'>
              {isInitialDataLoading ? (
                <div
                  className='flex flex-1 items-center justify-center min-h-[200px]'
                  aria-busy='true'
                >
                  <div className='flex flex-col items-center gap-3 text-text-sub-500'>
                    <span className='text-label-sm'>
                      Loading center, resource type and space...
                    </span>
                  </div>
                </div>
              ) : (
                <Suspense fallback={<BookingCreateDrawerFormSkeleton />}>
                  <BookingTitleDescriptionSection
                    control={control}
                    errors={errors}
                    isSubmitted={isSubmitted}
                    isDescriptionOpen={isDescriptionOpen}
                    onDescriptionToggle={() => setIsDescriptionOpen(true)}
                  />

                  <BookingSpaceDetailsSection
                    control={control}
                    errors={errors}
                    isSubmitted={isSubmitted}
                    setValue={setValue}
                    centers={centersForDropdown}
                    onBookForAnyCenterChange={handleBookForAnyCenterChange}
                    resourceTypes={centerResourceTypes}
                    resourceTypesLoading={centerResourceTypesLoading}
                    filteredResources={filteredResources}
                    resourcesLoading={resourcesLoading}
                    selectedResource={selectedResource}
                    watchedCenterId={watchedCenterId}
                    watchedResourceTypeId={watchedResourceTypeId}
                    onCenterChange={handleCenterChange}
                    onResourceTypeChange={handleResourceTypeChange}
                    clearSpaceOnCenterOrTypeChange={!hasInitialSpaceData || initialDataFullyApplied}
                  />

                  <BookingClientDetailsSection
                    control={control}
                    errors={errors}
                    isSubmitted={isSubmitted}
                    clients={bookingFormClientsData}
                    selectedClient={selectedClient}
                    clientsLoading={bookingFormClientsStatus === 'loading'}
                  />

                  <BookingDateTimeSection
                    control={control}
                    errors={errors}
                    isSubmitted={isSubmitted}
                    setValue={setValue}
                    trigger={trigger}
                    watchedAllDay={watchedAllDay}
                    watchedRecurrenceType={watchedRecurrenceType}
                    watchedRecurrenceEndType={watchedRecurrenceEndType}
                    watchedSpaceId={watchedSpaceId}
                    isSubmitting={isSubmitting}
                    hasTimeValidationErrors={hasTimeValidationErrors}
                    conflictCheck={conflictCheck}
                    onViewAllConflicts={handleViewAllConflicts}
                  />

                  <BookingCommentsSection
                    control={control}
                    errors={errors}
                    isSubmitted={isSubmitted}
                    isCommentOpen={isCommentOpen}
                    onCommentToggle={() => setIsCommentOpen(true)}
                  />
                </Suspense>
              )}
            </Drawer.Body>

            <Drawer.Footer className='flex flex-col gap-3 p-6 border-t mt-auto shrink-0 bg-white'>
              <div className='flex gap-3 justify-end'>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  onClick={() => handleClose(false)}
                  type='button'
                >
                  Cancel
                </Button.Root>

                <Button.Root
                  variant='primary'
                  mode='filled'
                  size='small'
                  type='submit'
                  disabled={isSubmitting || isInitialDataLoading}
                >
                  {isSubmitting ? 'Creating...' : 'Save'}
                </Button.Root>
              </div>
            </Drawer.Footer>
          </form>
        </Drawer.Content>
      </Drawer.Root>

      <Suspense fallback={null}>
        <BookingRecurringConflictsModal
          isOpen={isRecurringConflictsModalOpen}
          onClose={() => !isSubmitting && setIsRecurringConflictsModalOpen(false)}
          onContinue={handleContinueFromConflictsModal}
          conflicts={conflictCheck?.conflicts || []}
          mode={recurringConflictsModalMode}
          isSubmitting={isSubmitting}
        />
      </Suspense>
    </>
  );
};

export default BookingCreateDrawer;
