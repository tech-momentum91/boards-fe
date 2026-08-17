import React, { useMemo, useState, lazy, Suspense, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO, addMinutes } from 'date-fns';
import { RiTimeLine, RiUserLine } from 'react-icons/ri';
import {
  saveBooking,
  fetchCenters,
  fetchDrawerResources,
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
import apiClient from '@/api/axios';

const BookingTitleDescriptionSection = lazy(
  () => import('@/components/bookings/booking-form-sections/booking-title-description-section'),
);
const BookingSpaceDetailsSection = lazy(
  () => import('@/components/bookings/booking-form-sections/booking-space-details-section'),
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

const ClientDetailBookingCreateDrawer = ({ isOpen, onClose, clientId, clientName }) => {
  const dispatch = useDispatch();

  const centers = useSelector((state) => state.booking.shared.centers.data || []);
  const expandedCentersData = useSelector(
    (state) => state.booking.createDrawer.expandedCenters.data || [],
  );
  const expandedCentersStatus = useSelector(
    (state) => state.booking.createDrawer.expandedCenters.status,
  );
  const resourceTypesForCenterState = useSelector(selectResourceTypesForCenter);
  const resources = useSelector((state) => state.booking.createDrawer.resources.data || []);
  const resourcesLoading = useSelector((state) => state.booking.createDrawer.resources.isLoading);
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
      client_id: clientId || '',
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasTimeValidationErrors = Boolean(errors?.start_datetime || errors?.end_datetime);

  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isRecurringConflictsModalOpen, setIsRecurringConflictsModalOpen] = useState(false);
  const [recurringConflictsModalMode, setRecurringConflictsModalMode] = useState('view');
  const [assignedCenters, setAssignedCenters] = useState([]);
  const [assignedCentersLoading, setAssignedCentersLoading] = useState(false);

  const lastFetchParamsRef = useRef(null);
  const lastConflictParamsRef = useRef(null);
  const conflictDebounceRef = useRef(null);
  const lastOneTimeParamsRef = useRef(null);
  const oneTimeDebounceRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const hasInitializedRef = useRef(false);

  const filteredResources = useMemo(() => {
    if (!watchedCenterId || !watchedResourceTypeId) return [];
    return resources.filter(
      (r) => r.centerId === watchedCenterId && r.resourceTypeId === watchedResourceTypeId,
    );
  }, [resources, watchedCenterId, watchedResourceTypeId]);

  const centersForSelect = useMemo(() => {
    if (!bookForAnyCenter) return assignedCenters;
    if (expandedCentersStatus === 'succeeded' && expandedCentersData.length > 0) {
      return expandedCentersData;
    }
    return centers;
  }, [bookForAnyCenter, assignedCenters, expandedCentersData, expandedCentersStatus, centers]);

  const permittedCenterIds = useMemo(
    () => new Set(assignedCenters.map((c) => c.value).filter(Boolean)),
    [assignedCenters],
  );

  const handleBookForAnyCenterChange = useCallback(
    (nextBookForAnyCenter) => {
      if (nextBookForAnyCenter) return;
      if (assignedCentersLoading) return;
      const cid = getValues('center_id') || '';
      if (!cid || permittedCenterIds.has(cid)) return;
      setValue('center_id', '', { shouldValidate: false });
      setValue('resource_type_id', '', { shouldValidate: false });
      setValue('space_id', '', { shouldValidate: false });
      setValue('client_id', clientId || '', { shouldValidate: false });
    },
    [assignedCentersLoading, clientId, getValues, permittedCenterIds, setValue],
  );

  const selectedResource = useMemo(
    () => resources.find((r) => r.id === watchedSpaceId),
    [resources, watchedSpaceId],
  );

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

  // Fetch centers on open
  useEffect(() => {
    if (!isOpen) return;
    if (centers.length === 0) dispatch(fetchCenters());
  }, [isOpen, dispatch, centers.length]);

  useEffect(() => {
    if (!isOpen) return;
    dispatch(fetchResourceTypesForCenter(watchedCenterId || ''));
  }, [isOpen, watchedCenterId, dispatch]);

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

  useEffect(() => {
    if (!isOpen || !bookForAnyCenter) return;
    if (expandedCentersStatus !== 'idle') return;
    dispatch(fetchBookingExpandedCenters());
  }, [isOpen, bookForAnyCenter, expandedCentersStatus, dispatch]);

  useEffect(() => {
    if (!isOpen || bookForAnyCenter || !clientId) {
      if (!isOpen) {
        setAssignedCenters([]);
        setAssignedCentersLoading(false);
      }
      return () => {};
    }

    let cancelled = false;
    setAssignedCentersLoading(true);

    apiClient
      .get('/method/devx.api.client_management.get_centers_with_client_groups', {
        params: { active_only: 1 },
      })
      .then((response) => {
        if (cancelled) return;
        const message = response?.data?.message ?? response?.data;
        const groups = message?.groups || [];
        const filtered = groups
          .filter((g) => (g.clients || []).some((c) => c.id === clientId))
          .map((g) => ({
            value: g.center,
            label: g.center_name || g.center,
          }));
        setAssignedCenters(filtered);
      })
      .catch(() => {
        if (!cancelled) setAssignedCenters([]);
      })
      .finally(() => {
        if (!cancelled) setAssignedCentersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, bookForAnyCenter, clientId]);

  // Fetch space list when center + resource type change
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

  // Reset form when drawer opens - prefill client_id, title with client name, and auto-select first center
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      return;
    }

    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    reset({
      title: clientName || '',
      description: '',
      comment: '',
      center_id: '',
      book_for_any_center: false,
      resource_type_id: '',
      space_id: '',
      client_id: clientId || '',
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
  }, [isOpen, reset, clientId, clientName]);

  useEffect(() => {
    if (clientId) setValue('client_id', clientId, { shouldValidate: false });
  }, [clientId, setValue]);

  // Keep center_id in sync with selectable list (assigned vs expanded / default centers)
  useEffect(() => {
    if (!isOpen) return;
    if (!bookForAnyCenter && assignedCentersLoading) return;

    const ids = centersForSelect.map((c) => c.value);
    const current = watchedCenterId || '';

    if (ids.length === 0) {
      if (current) {
        setValue('center_id', '', { shouldValidate: false });
        setValue('space_id', '', { shouldValidate: false });
      }
      return;
    }

    const ok = current && ids.includes(current);
    if (!ok) {
      const next = ids[0];
      setValue('center_id', next, { shouldValidate: false });
      setValue('space_id', '', { shouldValidate: false });
      fetchResourcesWithFilters(next, watchedResourceTypeId);
    }
  }, [
    isOpen,
    bookForAnyCenter,
    assignedCentersLoading,
    centersForSelect,
    watchedCenterId,
    watchedResourceTypeId,
    setValue,
    fetchResourcesWithFilters,
  ]);

  // Auto-open description if it has value
  const descriptionValue = watch('description');
  useEffect(() => {
    if (descriptionValue) setIsDescriptionOpen(true);
  }, [descriptionValue]);

  // Auto-open comment if it has value
  const commentValue = watch('comment');
  useEffect(() => {
    if (commentValue) setIsCommentOpen(true);
  }, [commentValue]);

  useEffect(() => {
    if (!watchedAllDay) return;
    setValue('recurrence_type', RecurrenceType.ONE_TIME);
    setValue('days_of_week', '');
  }, [watchedAllDay, setValue]);

  // Clear conflict check when relevant fields change (one-time)
  useEffect(() => {
    if (!isOpen) return;
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

  // One-time booking conflict check
  useEffect(() => {
    if (!isOpen) return;
    if (watchedRecurrenceType !== RecurrenceType.ONE_TIME) return;
    if (!watchedSpaceId || !watchedStartDatetime) return;
    if (!watchedAllDay && (!watchedStartDatetime || !watchedEndDatetime)) return;

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
    if (lastOneTimeParamsRef.current === key) return;
    lastOneTimeParamsRef.current = key;

    if (oneTimeDebounceRef.current) clearTimeout(oneTimeDebounceRef.current);
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
    if (!isOpen) return;
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
    if (!isOpen) return;
    if (watchedRecurrenceType === RecurrenceType.ONE_TIME) return;
    if (!watchedSpaceId || !watchedStartDatetime || !watchedRecurrenceType) return;

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

    if (!recurrenceEndDate && !(occurrence > 0)) return;
    if (watchedRecurrenceType === RecurrenceType.WEEKLY && !watchedDaysOfWeek) return;
    if (
      (watchedRecurrenceType === RecurrenceType.MONTHLY ||
        watchedRecurrenceType === RecurrenceType.QUARTERLY) &&
      !watchedRecurringDate
    )
      return;
    if (
      watchedRecurrenceType === RecurrenceType.ANNUALLY &&
      (!watchedRecurringDate || !watchedRecurringMonth)
    )
      return;

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
    if (lastConflictParamsRef.current === paramsKey) return;
    lastConflictParamsRef.current = paramsKey;

    if (conflictDebounceRef.current) clearTimeout(conflictDebounceRef.current);
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
    setIsSubmitting(true);
    const result = await dispatch(
      saveBooking({
        endpoint: pending.endpoint,
        payload: pending.payload,
        ignoreConflictedDates: true,
      }),
    );
    setIsSubmitting(false);
    if (saveBooking.fulfilled.match(result)) {
      if (pendingSaveRef.current === pending) pendingSaveRef.current = null;
      setIsRecurringConflictsModalOpen(false);
      showSuccessToast('Booking created successfully.');
      onClose();
    } else if (saveBooking.rejected.match(result)) {
      showErrorToast(result.payload, { defaultMessage: 'Failed to create booking' });
    }
  }, [dispatch, onClose]);

  const handleFormSubmit = useCallback(
    async (data) => {
      try {
        setIsSubmitting(true);
        const isOneTime = data.recurrence_type === RecurrenceType.ONE_TIME;
        const colorGradient = getRandomColorGradient();

        const startParsed = parseISO(data.start_datetime);
        const endParsed = parseISO(data.end_datetime);
        const basePayload = {
          booking_title: data.title || '',
          description: data.description || '',
          client: clientId,
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
            setIsSubmitting(false);
            setRecurringConflictsModalMode('confirm');
            setIsRecurringConflictsModalOpen(true);
            return;
          }
        }

        const result = await dispatch(saveBooking({ endpoint, payload }));

        setIsSubmitting(false);
        if (saveBooking.fulfilled.match(result)) {
          pendingSaveRef.current = null;
          showSuccessToast('Booking created successfully.');
          onClose();
        } else if (saveBooking.rejected.match(result)) {
          pendingSaveRef.current = null;
          showErrorToast(result.payload, { defaultMessage: 'Failed to create booking' });
        }
      } catch (error) {
        setIsSubmitting(false);
        pendingSaveRef.current = null;
        console.error('Failed to create booking:', error);
        showErrorToast(error, { defaultMessage: 'Failed to create booking' });
      }
    },
    [dispatch, clientId, conflictCheck?.conflicts?.length, onClose],
  );

  const handleClose = (open) => {
    if (open === false && !isSubmitting) {
      onClose();
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
                  centers={centersForSelect}
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
                  clearSpaceOnCenterOrTypeChange
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
                  disabled={isSubmitting || conflictCheck?.isChecking}
                >
                  {isSubmitting
                    ? 'Creating...'
                    : conflictCheck?.isChecking
                      ? 'Checking...'
                      : 'Save'}
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

export default ClientDetailBookingCreateDrawer;
