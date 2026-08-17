/**
 * Booking Calendar Container
 * Business logic container that composes the reusable Calendar components
 * Handles Redux state, data fetching, and booking-specific logic
 */

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RiAddLine } from 'react-icons/ri';
import { parse, addDays, format } from 'date-fns';
import * as Schedule from '@/components/ui/schedule';
import * as Button from '@/components/ui/button';
import BookingToolbar from '@/components/bookings/booking-toolbar';
import { BookingEventCard } from '@/components/bookings/booking-event-renderer';
import { BookingResourceRenderer } from '@/components/bookings/booking-resource-renderer';
import BookingEventDetailDrawer from '@/components/bookings/booking-event-detail-drawer';
import BookingEventPopover from '@/components/bookings/booking-event-popover';
import BookingCreateDrawer from '@/components/bookings/booking-create-drawer';
import {
  fetchCalendarResources,
  openBookingPopover,
  closeBookingPopover,
  openBookingDetail,
  openBookingDetailWithScope,
  openBookingForm,
  fetchCenters,
  fetchBookingsForCalendar,
  fetchClients,
  reloadCalendar,
} from '@/redux/bookingSlice';
import {
  transformBookingsForSchedule,
  BOOKING_CALENDAR_UPDATE_INTERVAL_MS,
  BOOKING_CALENDAR_TIMELINE_DAYS,
} from '@/components/bookings/constants';
import { extractErrorMessage } from '@/utils/error-utils';
import { hasModulePermission } from '@/utils/user-role-utils';
import { SPACE_TYPE } from '@/schemas/space-schema';

const BookingCalendar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { calendarView, shared } = useSelector((state) => state.booking);
  const { userSideBarPerm } = useSelector((state) => state.auth);

  const { selectedDate } = calendarView.settings;
  const viewDate = useMemo(() => {
    if (typeof selectedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return parse(selectedDate, 'yyyy-MM-dd', new Date());
    }

    const d = new Date(selectedDate);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [selectedDate]);

  const centerIds = calendarView.filters.centerIds;
  const calendarScope = calendarView.filters.calendarScope;
  const readOnlyCalendar = Boolean(calendarView.bookings.readOnlyCalendar);
  const centerFilterKey = useMemo(() => {
    const c = !centerIds?.length ? 'all' : [...centerIds].sort().join(',');
    return `${calendarScope || 'my_centers'}|${c}`;
  }, [centerIds, calendarScope]);

  const canAddSpace = useMemo(
    () => hasModulePermission(userSideBarPerm, 'Space', 'write'),
    [userSideBarPerm],
  );

  /** Center id to pre-fill on /spaces when My centers has no bookable resources (subset, single, or “all” → first permitted). */
  const defaultCenterForAddResource = useMemo(() => {
    if (calendarScope !== 'my_centers') return null;
    if (centerIds?.length >= 1) return centerIds[0];
    const centers = shared.centers?.data || [];
    const first = centers[0];
    return first?.value ?? first?.name ?? null;
  }, [calendarScope, centerIds, shared.centers?.data]);

  const handleAddResourceClick = useCallback(() => {
    const params = new URLSearchParams();
    params.set('createSpace', '1');
    params.set('spaceType', SPACE_TYPE.RESOURCE);
    if (defaultCenterForAddResource) {
      params.set('center', defaultCenterForAddResource);
    }
    navigate(`/spaces?${params.toString()}`);
  }, [navigate, defaultCenterForAddResource]);

  const emptyStateAction = useMemo(() => {
    if (!canAddSpace || calendarScope !== 'my_centers') return null;
    return (
      <Button.Root
        variant='neutral'
        mode='stroke'
        size='small'
        type='button'
        className='gap-1'
        onClick={handleAddResourceClick}
      >
        <Button.Icon as={RiAddLine} />
        Add resource
      </Button.Root>
    );
  }, [canAddSpace, calendarScope, handleAddResourceClick]);
  const activeClient = calendarView.filters.client;
  const activeResourceType = calendarView.filters.resourceType;
  const resourcesList = calendarView.resources.data;
  const { reloadKey } = calendarView.settings;
  const isSilentRefresh = calendarView.settings.isSilentRefresh || false;
  const calendarStartDate = useMemo(() => format(viewDate, 'yyyy-MM-dd'), [viewDate]);
  const calendarEndDate = useMemo(
    () => format(addDays(viewDate, BOOKING_CALENDAR_TIMELINE_DAYS - 1), 'yyyy-MM-dd'),
    [viewDate],
  );

  // Track initial load to prevent showing loader on background refreshes
  const hasLoadedInitialDataRef = useRef(false);
  const lastResourcesParamsRef = useRef(null);
  const lastBookingsParamsRef = useRef(null);
  const lastReloadKeyRef = useRef(reloadKey);

  // Resources request finished (including 0 rows when a resource-type filter matches nothing)
  const resourcesLoadFinished = useMemo(
    () =>
      calendarView.resources.status === 'succeeded' || calendarView.resources.status === 'failed',
    [calendarView.resources.status],
  );
  const haveResources = useMemo(() => resourcesList.length > 0, [resourcesList.length]);

  // Fetch initial data (centers and clients) - only once on mount
  useEffect(() => {
    dispatch(fetchCenters());
    dispatch(fetchClients());
  }, [dispatch]);

  // Fetch resources (all centers when centerIds is null; otherwise selected centers only)
  useEffect(() => {
    const filterKey = `${centerFilterKey}-${activeResourceType || 'all'}`;
    if (lastResourcesParamsRef.current === filterKey) return;

    lastResourcesParamsRef.current = filterKey;
    dispatch(
      fetchCalendarResources({
        filters: {
          calendarScope,
          ...(centerIds?.length ? { centerIds } : {}),
          resource_type: activeResourceType,
        },
      }),
    );
  }, [dispatch, centerFilterKey, centerIds, activeResourceType, calendarScope]);

  // Main effect to fetch bookings - optimized with dependency tracking
  useEffect(() => {
    if (!selectedDate || !resourcesLoadFinished) return;

    const fetchParams = {
      start_date: calendarStartDate,
      end_date: calendarEndDate,
      client: activeClient,
      resource_type: activeResourceType,
      center_ids: centerIds?.length ? centerIds : undefined,
      calendar_scope: calendarScope,
    };
    const paramsKey = JSON.stringify(fetchParams);
    const reloadKeyChanged = lastReloadKeyRef.current !== reloadKey;

    // Always fetch if reloadKey changed (for silent refresh after booking creation)
    // Otherwise, skip if same params
    if (!reloadKeyChanged && lastBookingsParamsRef.current === paramsKey) return;

    lastBookingsParamsRef.current = paramsKey;
    lastReloadKeyRef.current = reloadKey;
    dispatch(
      fetchBookingsForCalendar({
        start_date: calendarStartDate,
        end_date: calendarEndDate,
        client: activeClient,
        resource_type: activeResourceType,
        center_ids: centerIds?.length ? centerIds : undefined,
        calendar_scope: calendarScope,
      }),
    );
  }, [
    dispatch,
    centerIds,
    centerFilterKey,
    selectedDate,
    calendarStartDate,
    calendarEndDate,
    resourcesLoadFinished,
    activeClient,
    activeResourceType,
    reloadKey,
    calendarScope,
  ]);

  // Track when initial data has loaded
  useEffect(() => {
    const bookingsReady = calendarView.bookings.status === 'succeeded';
    if (bookingsReady && resourcesLoadFinished && !hasLoadedInitialDataRef.current) {
      hasLoadedInitialDataRef.current = true;
    }
  }, [calendarView.bookings.status, resourcesLoadFinished]);

  // Reset initial load flag when key filters change significantly (center or date)
  const previousCenterKeyRef = useRef(centerFilterKey);
  const previousDateRef = useRef(selectedDate);

  useEffect(() => {
    const centerChanged = previousCenterKeyRef.current !== centerFilterKey;
    const dateChanged = previousDateRef.current !== selectedDate;

    if ((centerChanged || dateChanged) && hasLoadedInitialDataRef.current) {
      // Reset initial load flag when filters change significantly
      hasLoadedInitialDataRef.current = false;
    }

    previousCenterKeyRef.current = centerFilterKey;
    previousDateRef.current = selectedDate;
  }, [centerFilterKey, selectedDate]);

  // Loading and error states - only show loading on initial load, not on silent refreshes
  const isLoading = useMemo(() => {
    // Don't show loading if it's a silent refresh or we've already loaded initial data
    if (isSilentRefresh || hasLoadedInitialDataRef.current) {
      return false;
    }
    return calendarView.bookings.isLoading || calendarView.resources.isLoading;
  }, [isSilentRefresh, calendarView.bookings.isLoading, calendarView.resources.isLoading]);

  const hasError = calendarView.bookings.error || calendarView.resources.error;
  const error = calendarView.bookings.error || calendarView.resources.error;

  // Silent auto-refresh based on update interval
  useEffect(() => {
    if (!selectedDate || !resourcesLoadFinished || !haveResources) return;

    const intervalId = setInterval(() => {
      dispatch(reloadCalendar({ silent: true }));
    }, BOOKING_CALENDAR_UPDATE_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [dispatch, selectedDate, resourcesLoadFinished, haveResources]);

  // Event handlers
  const handleEventClick = (event) => {
    if (readOnlyCalendar) return;
    dispatch(openBookingPopover(event));
  };

  const handlePopoverExpand = () => {
    // Close popover and open full drawer (no edit scope; drawer will show banner for recurring)
    dispatch(closeBookingPopover());
    dispatch(openBookingDetail(shared.selectedBooking.data));
  };

  const handleEditWithScope = (scope) => {
    const bookingData = shared.selectedBooking.data;
    dispatch(closeBookingPopover());
    // Open drawer after popover/dropdown close so the dropdown item click isn't treated as outside click by the drawer
    requestAnimationFrame(() => {
      dispatch(openBookingDetailWithScope({ booking: bookingData, editScope: scope }));
    });
  };

  const handlePopoverOpenChange = (open) => {
    if (!open) {
      dispatch(closeBookingPopover());
    }
  };

  const handleSlotClick = (slotData) => {
    dispatch(closeBookingPopover());

    const resource = resourcesList.find((r) => r.id === slotData.resourceId);
    dispatch(
      openBookingForm({
        mode: 'create',
        initialData: {
          space: {
            spaceId: slotData.resourceId,
            centerId: resource?.centerId ?? '',
            resourceTypeId: resource?.resourceTypeId ?? '',
          },
          dateTime: {
            date: new Date(slotData.start).toISOString(),
            startTime: new Date(slotData.start).toISOString(),
            endTime: new Date(slotData.end).toISOString(),
          },
        },
      }),
    );
  };

  const handleRetry = () => {
    dispatch(reloadCalendar());
  };

  // Determine layout
  const isTimelineLayout = calendarView.settings.layout === 'time-x-resources-y';

  // Helper to get resource for a booking
  const getResourceForBooking = (bookingId) => {
    const bookingEntry = calendarView.bookings.data?.spaces
      ?.flatMap((space) => space.bookings || [])
      ?.find((b) => (b.id || b.name) === bookingId);

    if (!bookingEntry) return undefined;

    // Prefer explicit resourceId if present; otherwise fall back to space_id
    const resourceId = bookingEntry.resourceId || bookingEntry.space_id;
    if (!resourceId) return undefined;

    return calendarView.resources.data.find((r) => r.id === resourceId);
  };

  // Render event with popover wrapper
  const renderEventWithPopover = (event, isPast) => {
    const isActive =
      !readOnlyCalendar &&
      shared.selectedBooking.popoverOpen &&
      shared.selectedBooking.data?.id === event.id;
    const resource = getResourceForBooking(event.id);

    if (readOnlyCalendar) {
      return <BookingEventCard event={event} isPast={isPast} readOnly onClick={undefined} />;
    }

    return (
      <BookingEventPopover
        booking={shared.selectedBooking.data?.id === event.id ? shared.selectedBooking.data : event}
        resource={resource}
        open={isActive}
        onOpenChange={handlePopoverOpenChange}
        onExpand={handlePopoverExpand}
        onEditWithScope={handleEditWithScope}
      >
        <BookingEventCard
          event={event}
          isPast={isPast}
          isActive={isActive}
          onClick={handleEventClick}
        />
      </BookingEventPopover>
    );
  };

  return (
    <>
      <Schedule.Root
        layout={calendarView.settings.layout}
        updateInterval={BOOKING_CALENDAR_UPDATE_INTERVAL_MS}
        viewDate={viewDate}
        startHour={calendarView.settings.startHour}
        endHour={calendarView.settings.endHour}
        showCurrentTime={true}
        enableDragToCreate={!readOnlyCalendar}
        pastBufferMs={24 * 60 * 60 * 1000}
        onEventClick={handleEventClick}
        onSlotMouseUp={readOnlyCalendar ? undefined : handleSlotClick}
        onSlotClick={readOnlyCalendar ? undefined : handleSlotClick}
        eventTransformer={transformBookingsForSchedule}
        timelineDays={BOOKING_CALENDAR_TIMELINE_DAYS}
      >
        {/* Header with booking-specific toolbar */}
        <Schedule.Header>
          <BookingToolbar />
        </Schedule.Header>

        {/* Schedule Body with state handling */}
        <Schedule.Body>
          {isLoading ? (
            <Schedule.LoadingState />
          ) : hasError ? (
            <Schedule.ErrorState
              error={extractErrorMessage(error, 'An error occurred while loading the schedule.')}
              onRetry={handleRetry}
            />
          ) : resourcesList.length === 0 ? (
            <Schedule.EmptyState
              title={
                activeResourceType ? 'No resources match this filter' : 'No resources available'
              }
              description={
                calendarScope === 'my_centers'
                  ? activeResourceType
                    ? 'Choose another resource type or clear the filter. You can also add a bookable resource for your center.'
                    : 'There are no bookable resources for your selected centers yet. Add a resource to start scheduling.'
                  : activeResourceType
                    ? 'Choose another resource type or clear the filter to see all resources.'
                    : 'There are no resources configured for booking in this view.'
              }
              action={emptyStateAction}
            />
          ) : (
            <>
              {/* Render appropriate layout */}
              {isTimelineLayout ? (
                <Schedule.TimelineGrid
                  resources={resourcesList}
                  events={calendarView.bookings.data?.spaces || []}
                  renderEvent={renderEventWithPopover}
                  renderResourceHeader={(resource) => (
                    <BookingResourceRenderer resource={resource} variant='vertical' />
                  )}
                />
              ) : (
                <Schedule.TimeGrid
                  resources={resourcesList}
                  events={calendarView.bookings.data?.spaces || []}
                  renderEvent={renderEventWithPopover}
                  renderResourceHeader={(resource) => (
                    <BookingResourceRenderer resource={resource} variant='horizontal' />
                  )}
                />
              )}
            </>
          )}
        </Schedule.Body>
      </Schedule.Root>

      {/* Modals and Drawers - outside the calendar */}
      {shared.selectedBooking.isOpen && <BookingEventDetailDrawer />}
      <BookingCreateDrawer />
    </>
  );
};

export default BookingCalendar;
