import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiTimeLine, RiPriceTag3Line, RiStickyNoteLine } from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as Textarea from '@/components/ui/textarea';
import * as Badge from '@/components/ui/badge';
import FieldRow from '@/components/ui/field-row';
import BookingEventDetailDrawerSkeleton from '@/components/bookings/booking-event-detail-drawer-skeleton';
import {
  closeBookingDetail,
  clearBookingDetail,
  fetchBookingDetail,
  updateSpaceBookingScoped,
  selectBookingDetail,
  openBookingDetail,
  deleteBookingThunk,
} from '@/redux/bookingSlice';
import { formatBookingScheduleLabel } from '@/utils/date-utils';
import {
  getBookingStatusBadgeColor,
  getColorGradientStyles,
  RecurrenceType,
  formatRecurrencePattern,
  BOOKING_EDIT_SCOPE,
  isScheduleOrSpaceEditable,
} from '@/components/bookings/constants';
import { cn } from '@/lib/utils';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import { useSocket } from '@/hooks/use-socket';
import { useBookingTimeEditor } from '@/hooks/use-booking-time-editor';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import BookingRecurrenceEditPopoverContent from '@/components/bookings/booking-recurrence-edit-popover';
import BookingTimeEditPopoverContent from '@/components/bookings/booking-time-edit-popover';
import BookingRecurringConflictsModal from '@/components/bookings/booking-recurring-conflicts-modal';
import DeleteBookingModal from '@/components/bookings/delete-booking-modal';
import * as Popover from '@/components/ui/popover';
import BookingSpaceDetailsSection from '@/components/bookings/booking-space-details-section';
import BookingClientDetailsSection from '@/components/bookings/booking-client-details-section';
import BookingEditScopeBanner from '@/components/bookings/booking-edit-scope-banner';
import BookingDetailHeader from '@/components/bookings/booking-detail-header';
import BookingCommentsPanel from '@/components/bookings/booking-comments-panel';

const BookingEventDetailDrawer = () => {
  const dispatch = useDispatch();
  const { shared, calendarView, listView } = useSelector((state) => state.booking);
  const detail = useSelector(selectBookingDetail);
  const conflictCheck = useSelector((state) => state.booking.createDrawer.conflictCheck);

  // Get the booking ID from selectedBooking
  const selectedBookingId = shared.selectedBooking.data?.name || shared.selectedBooking.data?.id;

  // Use detailed booking data from API if available, otherwise use selectedBooking data
  const booking = detail.data || shared.selectedBooking.data;
  const recurringBookingRef = booking?.recurring_booking_ref;
  const isRecurringSeriesBooking = Boolean(
    booking?.isRecurring || booking?.is_recurrence || recurringBookingRef,
  );

  const resource =
    calendarView.resources.data.find((r) => r.id === booking?.space_id) ||
    listView.resources.data.find((r) => r.id === booking?.space_id);
  const center = shared.centers.data.find(
    (c) => c.value === booking?.center || c.id === booking?.center,
  );
  const client = shared.clients.data.find(
    (c) => c.value === booking?.client || c.id === booking?.client,
  );

  // Use list view bookings for navigation (flat array structure)
  const { bookings } = listView;

  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [localChanges, setLocalChanges] = useState({});
  const [isRecurrencePopoverOpen, setIsRecurrencePopoverOpen] = useState(false);
  const [drawerEditScope, setDrawerEditScope] = useState(BOOKING_EDIT_SCOPE.THIS_ONLY);
  const [isEditScopeBannerDismissed, setIsEditScopeBannerDismissed] = useState(false);
  const [timeConflictsModal, setTimeConflictsModal] = useState(null); // null | 'view' | 'confirm'
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const lastFetchedBookingIdRef = useRef(null);
  const previousBookingIdRef = useRef(null);
  const fetchPromiseRef = useRef(null);
  const isSavingRef = useRef(false);

  const setIsSaving = useCallback((value) => {
    isSavingRef.current = value;
  }, []);

  // Memoize booking matching check to avoid recalculating on every render
  const bookingMatches = useMemo(() => {
    if (!booking || !selectedBookingId) return false;
    return String(booking.name || booking.id || '') === String(selectedBookingId || '');
  }, [booking?.name, booking?.id, selectedBookingId]);

  // Determine if we should show loading skeleton
  const isDataReady = detail.status === 'succeeded' && booking && bookingMatches;

  // Track first successful load per booking to avoid skeleton during background refetches
  useEffect(() => {
    if (isDataReady) {
      setHasLoadedInitialData(true);
    }
  }, [isDataReady]);

  // Reset initial-load flag and banner dismissed state when switching bookings or closing the drawer
  useEffect(() => {
    if (!shared.selectedBooking.isOpen) {
      setHasLoadedInitialData(false);
      setIsEditScopeBannerDismissed(false);
      previousBookingIdRef.current = null;
      return;
    }

    if (previousBookingIdRef.current !== selectedBookingId) {
      setHasLoadedInitialData(false);
      setIsEditScopeBannerDismissed(false);
      previousBookingIdRef.current = selectedBookingId;
    }
  }, [shared.selectedBooking.isOpen, selectedBookingId]);

  // Sync Redux edit scope into local state when drawer opens via Edit dropdown (so banner shows correct selection)
  useEffect(() => {
    if (!shared.selectedBooking.isOpen) return;
    const scopeFromRedux = shared.selectedBooking.editScope ?? null;
    if (scopeFromRedux != null) {
      setDrawerEditScope(scopeFromRedux);
    }
  }, [shared.selectedBooking.isOpen, selectedBookingId, shared.selectedBooking.editScope]);

  // Show loading skeleton only on the first load for a booking
  const isLoading =
    shared.selectedBooking.isOpen && selectedBookingId && !hasLoadedInitialData && !isDataReady;

  // Get current booking index for navigation
  const currentBookingIndex = useMemo(() => {
    if (!selectedBookingId || !bookings.data || bookings.data.length === 0) return -1;
    return bookings.data.findIndex((b) => (b.name || b.id) === selectedBookingId);
  }, [selectedBookingId, bookings.data]);

  const hasPrevious = currentBookingIndex > 0;
  const hasNext = currentBookingIndex >= 0 && currentBookingIndex < bookings.data.length - 1;

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (!hasPrevious) return;
    const previousBooking = bookings.data[currentBookingIndex - 1];
    if (previousBooking) {
      dispatch(openBookingDetail(previousBooking));
    }
  }, [hasPrevious, currentBookingIndex, bookings.data, dispatch]);

  const handleNext = useCallback(() => {
    if (!hasNext) return;
    const nextBooking = bookings.data[currentBookingIndex + 1];
    if (nextBooking) {
      dispatch(openBookingDetail(nextBooking));
    }
  }, [hasNext, currentBookingIndex, bookings.data, dispatch]);

  const handleClose = () => {
    dispatch(closeBookingDetail());
    setTimeout(() => {
      dispatch(clearBookingDetail());
      setLocalChanges({});
      setDrawerEditScope(BOOKING_EDIT_SCOPE.THIS_ONLY);
      setIsEditScopeBannerDismissed(false);
      setTimeConflictsModal(null);
    }, 300);
  };

  // Handle delete booking
  const handleDeleteClick = useCallback(() => {
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(
    async (deleteScope) => {
      if (!booking || !selectedBookingId) return;

      const currentBookingId = booking?.name || booking?.id || selectedBookingId;
      setIsDeleting(true);

      try {
        await dispatch(
          deleteBookingThunk({
            bookingId: currentBookingId,
            deleteScope,
          }),
        ).unwrap();

        showSuccessToast('Booking cancelled successfully');
        setIsDeleteModalOpen(false);
        handleClose();
      } catch (error) {
        console.error('Failed to cancel booking:', error);
        showErrorToast(error, {
          defaultMessage: 'Failed to cancel booking. Please try again.',
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [booking, selectedBookingId, dispatch, handleClose],
  );

  // Fetch booking details when drawer opens or bookingId changes
  useEffect(() => {
    if (!shared.selectedBooking.isOpen || !selectedBookingId) {
      lastFetchedBookingIdRef.current = null;
      fetchPromiseRef.current = null;
      return;
    }

    if (lastFetchedBookingIdRef.current !== selectedBookingId && !fetchPromiseRef.current) {
      const currentBookingId = selectedBookingId;
      lastFetchedBookingIdRef.current = currentBookingId;

      const detailPromise = dispatch(fetchBookingDetail(currentBookingId));
      fetchPromiseRef.current = detailPromise;

      fetchPromiseRef.current.finally(() => {
        if (lastFetchedBookingIdRef.current === currentBookingId) {
          fetchPromiseRef.current = null;
        }
      });
    }

    return () => {
      if (lastFetchedBookingIdRef.current !== selectedBookingId) {
        fetchPromiseRef.current = null;
      }
    };
  }, [shared.selectedBooking.isOpen, selectedBookingId, dispatch]);

  // Socket integration for real-time updates
  const { subscribe, isAuthenticated: socketAuthenticated } = useSocket();

  useEffect(() => {
    if (!shared.selectedBooking.isOpen || !selectedBookingId || !socketAuthenticated) return;

    const currentBookingId = booking?.name || booking?.id || selectedBookingId;
    if (!currentBookingId) return;

    const unsubscribeUpdate = subscribe(
      'Space Booking',
      'doc_update',
      (data) => {
        if (!data || !data.doctype || data.doctype !== 'Space Booking') return;
        const bookingData = data.doc || data;
        if (!bookingData || !bookingData.name) return;
        if (String(bookingData.name) !== String(currentBookingId)) return;
        dispatch(fetchBookingDetail(currentBookingId));
      },
      currentBookingId,
    );

    return () => {
      if (typeof unsubscribeUpdate === 'function') {
        unsubscribeUpdate();
      }
    };
  }, [
    shared.selectedBooking.isOpen,
    selectedBookingId,
    booking,
    socketAuthenticated,
    subscribe,
    dispatch,
  ]);

  // Get field value with local changes priority
  const getFieldValue = useCallback(
    (fieldName) =>
      Object.prototype.hasOwnProperty.call(localChanges, fieldName)
        ? localChanges[fieldName]
        : booking?.[fieldName],
    [booking, localChanges],
  );

  // Get original field value (ignoring local changes)
  const getOriginalFieldValue = useCallback((fieldName) => booking?.[fieldName], [booking]);

  // Generic field change handler with API update
  const handleFieldChange = useCallback(
    async (fieldName, value, options = {}) => {
      if (!booking || !selectedBookingId) return;

      const currentBookingId = booking?.name || booking?.id || selectedBookingId;
      const currentValue = getOriginalFieldValue(fieldName);

      // Normalize values for comparison
      const normalizeForCompare = (value_) => {
        if (value_ === null || value_ === undefined) return '';
        if (Array.isArray(value_)) return value_.join(',');
        return String(value_);
      };

      const currentNormalized = normalizeForCompare(currentValue);
      const newNormalized = normalizeForCompare(value);

      // Only update if value actually changed (skip when full payload e.g. recurrence with options.forceUpdate)
      if (!options.forceUpdate && currentNormalized === newNormalized) {
        return;
      }

      // Prevent concurrent saves
      if (isSavingRef.current) return;
      setIsSaving(true);

      // Update local state immediately for smooth UX
      setLocalChanges((previous) => ({
        ...previous,
        [fieldName]: value,
      }));

      // Build API payload
      const payload = options.payload || { [fieldName]: value };
      const scope = options.scope || drawerEditScope;
      // Frontend edit scopes now match backend constants, so we can pass them through directly.
      const apiScope = isRecurringSeriesBooking
        ? scope || BOOKING_EDIT_SCOPE.THIS_ONLY
        : 'THIS_ONLY';

      try {
        await dispatch(
          updateSpaceBookingScoped({
            bookingId: currentBookingId,
            scope: apiScope,
            updates: payload,
          }),
        ).unwrap();

        if (!options.silent) {
          showSuccessToast(options.successMessage || 'Booking updated successfully');
        }

        dispatch(fetchBookingDetail(currentBookingId));
      } catch (error) {
        console.error('Failed to update booking field:', error);
        if (!options.silent) {
          showErrorToast(error, {
            defaultMessage: options.errorMessage || 'Failed to update booking',
          });
        }
        setLocalChanges((previous) => {
          const updated = { ...previous };
          delete updated[fieldName];
          return updated;
        });
      } finally {
        setIsSaving(false);
      }
    },
    [
      booking,
      selectedBookingId,
      dispatch,
      getOriginalFieldValue,
      drawerEditScope,
      isRecurringSeriesBooking,
      recurringBookingRef,
      setIsSaving,
    ],
  );

  // Computed values
  const bookingTitle = getFieldValue('booking_title') || getFieldValue('title') || '';
  const bookingStatus = booking?.status || '';
  // Get recurrence data - check multiple possible locations
  const recurrence =
    booking?.recurrence ||
    booking?.originalData?.recurrence ||
    booking?.originalData?.data?.recurrence ||
    booking?.data?.recurrence;

  // Determine if we should show recurrence and what label to use
  // Check for recurring_booking_ref as well
  const recurrenceType = recurrence?.recurrence || recurrence?.type;

  const hasRecurrenceType =
    Boolean(recurrenceType) && recurrenceType !== RecurrenceType.ONE_TIME
      ? true
      : Boolean(booking?.recurring_booking_ref);

  const shouldShowRecurrence =
    hasRecurrenceType ||
    booking?.isRecurring ||
    booking?.is_recurrence ||
    Boolean(booking?.recurring_booking_ref);

  const recurrenceLabel = (() => {
    if (hasRecurrenceType && recurrence) {
      return formatRecurrencePattern(recurrence);
    }
    if (booking?.recurring_booking_ref && !recurrence) {
      return 'Recurring';
    }
    return booking?.isRecurring || booking?.is_recurrence ? 'Recurring' : '';
  })();

  const scheduleDisplayText = formatBookingScheduleLabel(booking);

  const showEditScopeBanner = Boolean(shouldShowRecurrence) && !isEditScopeBannerDismissed;

  // Gradient styles for header background based on booking color_gradient
  const gradientStyles = useMemo(
    () => getColorGradientStyles(booking?.color_gradient),
    [booking?.color_gradient],
  );

  const { timeEditor, handleTimeSaveWithIgnore } = useBookingTimeEditor({
    booking,
    selectedBookingId,
    recurrence,
    shouldShowRecurrence,
    effectiveEditScope: drawerEditScope,
    conflictCheck,
    handleFieldChange,
  });

  // Handle recurrence edit save (options.ignoreConflictedDates when user confirms from conflicts modal)
  const handleSpaceSave = useCallback(
    async ({ space_id, resource_type }) => {
      await handleFieldChange('space_id', space_id, {
        payload: { space_id, resource_type },
        forceUpdate: true,
        successMessage: 'Space updated successfully',
      });
    },
    [handleFieldChange],
  );

  const handleRecurrenceSave = useCallback(
    (recurrenceData, options = {}) => {
      if (!booking || !selectedBookingId) return;

      // Build updates payload to match backend expectations for recurrence updates.
      const payload = {
        booking_title: booking.booking_title,
        space_id: booking.space_id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        all_day: typeof booking.all_day === 'number' ? booking.all_day : booking.all_day ? 1 : 0,
        recurrence: recurrenceData.recurrence,
        recurrence_end_date: recurrenceData.recurrence_end_date || '',
        occurrence: recurrenceData.occurrence || 0,
        week_days: recurrenceData.week_days || '',
      };
      if (recurrenceData.recurring_date != null)
        payload.recurring_date = recurrenceData.recurring_date;
      if (recurrenceData.recurring_month != null)
        payload.recurring_month = recurrenceData.recurring_month;

      if (options.ignoreConflictedDates) {
        payload.ignore_conflicted_dates = 1;
      }

      handleFieldChange('recurrence', recurrenceData.recurrence, {
        payload,
        successMessage: 'Recurrence updated successfully',
        forceUpdate: true,
      });

      setIsRecurrencePopoverOpen(false);
    },
    [booking, selectedBookingId, handleFieldChange],
  );

  if (!booking) return null;

  return (
    <Drawer.Root open={shared.selectedBooking.isOpen} onOpenChange={handleClose}>
      <Drawer.Content className='max-w-[1200px]'>
        <BookingDetailHeader
          isLoading={isLoading}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onPrevious={handlePrevious}
          onNext={handleNext}
          canDelete={isScheduleOrSpaceEditable(bookingStatus)}
          onDelete={handleDeleteClick}
          onClose={handleClose}
        />

        <Drawer.Body className='flex-1 p-0 overflow-y-auto'>
          {isLoading ? (
            <BookingEventDetailDrawerSkeleton />
          ) : (
            <div className='flex h-full flex-col'>
              {showEditScopeBanner && (
                <BookingEditScopeBanner
                  scope={drawerEditScope}
                  onScopeChange={setDrawerEditScope}
                  onDismiss={() => setIsEditScopeBannerDismissed(true)}
                />
              )}

              <div className='flex flex-1 min-h-0'>
                {/* Left Panel - Booking Details */}
                <div className='w-[480px] border-r border-stroke-soft-200 overflow-y-auto relative'>
                  <div
                    className={cn(
                      'pointer-events-none absolute inset-x-0 top-0 h-[140px]',
                      'bg-linear-to-b',
                      gradientStyles.gradient,
                    )}
                    aria-hidden='true'
                  />
                  <div
                    className='pointer-events-none absolute inset-x-0 top-0 h-[140px] bg-linear-to-b from-transparent to-white'
                    aria-hidden='true'
                  />

                  <div className='flex flex-col relative z-1'>
                    <div className='px-6 pt-[60px] pb-0 flex flex-col gap-6'>
                      <div className='flex flex-col gap-1'>
                        <EditableFieldWrapper editable={true}>
                          <Textarea.Root
                            variant='borderless'
                            simple
                            value={bookingTitle}
                            onChange={(e) => {
                              const { value } = e.target;
                              setLocalChanges((previous) => ({
                                ...previous,
                                booking_title: value,
                              }));
                            }}
                            onBlur={(e) => {
                              const value = e.target.value.trim();
                              if (value !== getOriginalFieldValue('booking_title')) {
                                handleFieldChange('booking_title', value, {
                                  successMessage: 'Title updated successfully',
                                });
                              }
                            }}
                            rows={1}
                            placeholder='Enter booking title'
                            className='field-sizing-content text-title-h5 text-text-main-900 p-1 bg-transparent'
                          />
                        </EditableFieldWrapper>
                      </div>

                      <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                        <FieldRow icon={RiPriceTag3Line} label='Status' editable={false}>
                          <div className='flex items-center min-h-8'>
                            <Badge.Root
                              variant='light'
                              color={getBookingStatusBadgeColor(bookingStatus)}
                              className='text-nowrap'
                            >
                              {bookingStatus ? String(bookingStatus).toUpperCase() : '--'}
                            </Badge.Root>
                          </div>
                        </FieldRow>

                        <FieldRow
                          icon={RiTimeLine}
                          label='Schedule'
                          editable={timeEditor.isTimeEditable}
                        >
                          <Popover.Root
                            open={timeEditor.isTimePopoverOpen && timeEditor.isTimeEditable}
                          >
                            <Popover.Anchor asChild>
                              <div
                                className={cn(
                                  'rounded-lg py-1 w-full transition-colors',
                                  timeEditor.isTimeEditable &&
                                    'cursor-pointer hover:bg-bg-weak-200',
                                )}
                                onClick={timeEditor.handleTimeClick}
                                role={timeEditor.isTimeEditable ? 'button' : undefined}
                                tabIndex={timeEditor.isTimeEditable ? 0 : undefined}
                                onKeyDown={(e) => {
                                  if (
                                    timeEditor.isTimeEditable &&
                                    (e.key === 'Enter' || e.key === ' ')
                                  ) {
                                    e.preventDefault();
                                    timeEditor.handleTimeClick();
                                  }
                                }}
                              >
                                <span className='text-paragraph-sm text-text-main-900'>
                                  {scheduleDisplayText || '--'}
                                </span>
                              </div>
                            </Popover.Anchor>

                            {timeEditor.isTimeEditing && timeEditor.isTimeEditable && (
                              <BookingTimeEditPopoverContent
                                {...timeEditor}
                                oneTimeConflictMessage={conflictCheck?.oneTime?.message}
                                shouldShowRecurrence={shouldShowRecurrence}
                                onViewAllConflicts={() => setTimeConflictsModal('view')}
                                onSave={() => {
                                  if (
                                    shouldShowRecurrence &&
                                    timeEditor.timeEditConflicts.length > 0
                                  ) {
                                    setTimeConflictsModal('confirm');
                                  } else {
                                    timeEditor.onSave();
                                  }
                                }}
                              />
                            )}
                          </Popover.Root>
                        </FieldRow>

                        {shouldShowRecurrence && drawerEditScope !== 'this_booking' && (
                          <FieldRow icon={RiPriceTag3Line} label='Recurrence' editable={true}>
                            <Popover.Root
                              open={isRecurrencePopoverOpen}
                              onOpenChange={setIsRecurrencePopoverOpen}
                            >
                              <Popover.Anchor asChild>
                                <div
                                  className={cn(
                                    'rounded-lg py-1 w-full transition-colors cursor-pointer hover:bg-bg-weak-200',
                                  )}
                                  role='button'
                                  tabIndex={0}
                                  onClick={() => setIsRecurrencePopoverOpen(true)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setIsRecurrencePopoverOpen(true);
                                    }
                                  }}
                                >
                                  <p className='text-paragraph-sm text-text-main-900'>
                                    {recurrenceLabel}
                                  </p>
                                </div>
                              </Popover.Anchor>
                              <BookingRecurrenceEditPopoverContent
                                recurrence={recurrence}
                                bookingDate={booking?.booking_date}
                                bookingEndDate={booking?.booking_end_date || booking?.booking_date}
                                recurringRef={booking?.recurring_booking_ref || recurrence?.name}
                                spaceId={booking?.space_id}
                                startTime={booking?.start_time}
                                endTime={booking?.end_time}
                                onSave={handleRecurrenceSave}
                                onCancel={() => setIsRecurrencePopoverOpen(false)}
                                isOpen={isRecurrencePopoverOpen}
                              />
                            </Popover.Root>
                          </FieldRow>
                        )}
                      </div>

                      <BookingSpaceDetailsSection
                        booking={booking}
                        resource={resource}
                        center={center}
                        spaceEditable={isScheduleOrSpaceEditable(bookingStatus)}
                        centerId={booking?.center}
                        onSpaceSave={handleSpaceSave}
                      />
                      <BookingClientDetailsSection booking={booking} client={client} />

                      <div className='flex flex-col gap-3 pb-6'>
                        <div className='flex items-center gap-2'>
                          <RiStickyNoteLine size={20} className='text-text-sub-500' />
                          <span className='label-small text-text-sub-500'>Description</span>
                        </div>
                        <Textarea.Root
                          variant='borderless'
                          simple
                          value={getFieldValue('description') || ''}
                          onChange={(e) => {
                            const { value } = e.target;
                            setLocalChanges((previous) => ({
                              ...previous,
                              description: value,
                            }));
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (value !== getOriginalFieldValue('description')) {
                              handleFieldChange('description', value, {
                                successMessage: 'Description updated successfully',
                              });
                            }
                          }}
                          className='w-full field-sizing-content'
                          placeholder='Enter description'
                          rows={1}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Comments */}
                <BookingCommentsPanel
                  booking={booking}
                  selectedBookingId={selectedBookingId}
                  dispatch={dispatch}
                />
              </div>
            </div>
          )}
        </Drawer.Body>
      </Drawer.Content>

      <BookingRecurringConflictsModal
        isOpen={timeConflictsModal !== null}
        onClose={() => setTimeConflictsModal(null)}
        onContinue={
          timeConflictsModal === 'confirm'
            ? () => {
                handleTimeSaveWithIgnore?.();
                setTimeConflictsModal(null);
              }
            : undefined
        }
        conflicts={timeEditor.timeEditConflicts}
        mode={timeConflictsModal ?? 'view'}
        isSubmitting={false}
      />

      <DeleteBookingModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        isRecurring={shouldShowRecurrence}
      />
    </Drawer.Root>
  );
};

export default BookingEventDetailDrawer;
