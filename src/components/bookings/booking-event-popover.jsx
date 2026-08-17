/**
 * Booking Event Popover
 * Shows a compact preview of booking details when clicking on an event
 * Includes an expand button to open full details in drawer
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  RiCalendarLine,
  RiChat4Line,
  RiPriceTag3Line,
  RiCodeView,
  RiPencilLine,
  RiDeleteBinLine,
  RiArrowDownSLine,
} from 'react-icons/ri';
import * as Popover from '@/components/ui/popover';
import * as Dropdown from '@/components/ui/dropdown';
import * as Badge from '@/components/ui/badge';
import * as CompactButton from '@/components/ui/compact-button';
import * as Button from '@/components/ui/button';
import FieldRow from '@/components/ui/field-row';
import DeleteBookingModal from '@/components/bookings/delete-booking-modal';
import BookingSpaceDetailsSection from '@/components/bookings/booking-space-details-section';
import BookingClientDetailsSection from '@/components/bookings/booking-client-details-section';
import { formatCalendarEventSchedule } from '@/utils/date-utils';
import {
  RecurrenceType,
  getBookingStatusBadgeStyles,
  isScheduleOrSpaceEditable,
  formatRecurrencePattern,
} from '@/components/bookings/constants';
import { closeBookingPopover, deleteBookingThunk } from '@/redux/bookingSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

/**
 * BookingEventPopover Component
 * @param {Object} props
 * @param {Object} props.booking - The booking data
 * @param {Object} props.resource - The resource data
 * @param {boolean} props.open - Whether the popover is open
 * @param {function} props.onOpenChange - Handler for open state changes
 * @param {function} props.onExpand - Handler for expand button click
 * @param {function} props.onEdit - Handler for edit button click
 * @param {function} props.onEditWithScope - Handler for edit with scope (scope: 'THIS_ONLY' | 'THIS_AND_FOLLOWING' | 'ALL')
 * @param {function} props.onDelete - Handler for delete button click
 * @param {React.ReactNode} props.children - Trigger element
 */
export const BookingEventPopover = ({
  booking,
  resource,
  open,
  onOpenChange,
  onExpand,
  onEdit,
  onEditWithScope,
  onDelete,
  children,
}) => {
  const dispatch = useDispatch();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dialog focus / Radix trigger can call onOpenChange(true) while cancel modal is open — keep Redux + UI closed.
  useEffect(() => {
    if (isDeleteModalOpen) {
      dispatch(closeBookingPopover());
    }
  }, [isDeleteModalOpen, dispatch]);

  const handleRootOpenChange = useCallback(
    (nextOpen) => {
      if (isDeleteModalOpen && nextOpen) {
        return;
      }
      onOpenChange?.(nextOpen);
    },
    [isDeleteModalOpen, onOpenChange],
  );

  /** Popover must stay unmounted while cancel modal is open (ignore stale/trigger-driven "open"). */
  const popoverRootOpen = Boolean(open && !isDeleteModalOpen);

  const handleDeleteConfirm = useCallback(
    async (deleteScope) => {
      if (!booking) return;

      const bookingId = booking.name || booking.id;
      if (!bookingId) return;

      setIsDeleting(true);

      try {
        await dispatch(
          deleteBookingThunk({
            bookingId,
            deleteScope,
          }),
        ).unwrap();

        showSuccessToast('Booking deleted successfully');
        setIsDeleteModalOpen(false);
        onOpenChange?.(false);
        // Call the original onDelete callback if provided (for parent cleanup)
        onDelete?.();
      } catch (error) {
        console.error('Failed to delete booking:', error);
        showErrorToast(error, {
          defaultMessage: 'Failed to delete booking. Please try again.',
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [booking, dispatch, onOpenChange, onDelete],
  );

  if (!booking) return children;

  const handleExpand = (e) => {
    e.stopPropagation();
    onExpand?.();
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onExpand?.();
  };

  const handleEditWithScope = (e, scope) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    onEditWithScope?.(scope);
    // Do not call onOpenChange(false) here - calendar's handleEditWithScope already closes the popover; calling it causes a second closeBookingPopover and can race with the drawer open
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    dispatch(closeBookingPopover());
    onOpenChange?.(false);
    setIsDeleteModalOpen(true);
  };

  // Check if booking is upcoming (to show footer actions)
  const bookingStatus = booking.status || 'Upcoming';
  const canEditScheduleOrSpace = isScheduleOrSpaceEditable(bookingStatus);

  const scheduleLabel = formatCalendarEventSchedule(booking);

  // Get recurrence data - check multiple possible locations
  // 1. Direct on booking (for events that have recurrence)
  // 2. In originalData (for saved bookings that store full data)
  // 3. In originalData.data (for form data structure)
  const recurrence =
    booking.recurrence ||
    booking.originalData?.recurrence ||
    booking.originalData?.data?.recurrence ||
    booking.data?.recurrence;

  // Determine if we should show recurrence and what label to use
  // Check both the recurrence type and the isRecurring flag, and recurring_booking_ref
  const recurrenceType = recurrence?.recurrence || recurrence?.type;
  const hasRecurrenceType =
    (recurrenceType && recurrenceType !== RecurrenceType.ONE_TIME) ||
    Boolean(booking.recurring_booking_ref);
  const shouldShowRecurrence =
    hasRecurrenceType ||
    booking.isRecurring ||
    booking.is_recurrence ||
    Boolean(booking.recurring_booking_ref);

  const recurrenceLabel =
    hasRecurrenceType && recurrence
      ? formatRecurrencePattern(recurrence)
      : booking.isRecurring || booking.is_recurrence || booking.recurring_booking_ref
        ? 'Recurring' // Fallback if we have isRecurring/recurring_booking_ref but no full recurrence data
        : '';

  return (
    <>
      <Popover.Root open={popoverRootOpen} onOpenChange={handleRootOpenChange}>
        <Popover.Trigger asChild>{children}</Popover.Trigger>
        <Popover.Content
          className='p-0'
          align='center'
          side='right'
          sideOffset={8}
          showArrow={true}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className='w-[412px] p-6 flex flex-col gap-4 relative'>
            {/* Expand Button - Top Right */}

            <CompactButton.Root
              variant='ghost'
              onClick={handleExpand}
              className='absolute top-4 right-4'
            >
              <CompactButton.Icon as={RiCodeView} className='-rotate-45' />
            </CompactButton.Root>

            {/* Title */}
            <div className='pr-8'>
              <h3 className='title-h5 text-text-main-900'>
                {booking.booking_title || booking.title}
              </h3>
            </div>

            {/* Booking Details Card */}
            <div className='border border-stroke-soft-200 rounded-xl overflow-hidden'>
              {/* Status Row */}
              <div className='border-b border-stroke-soft-200 last:border-b-0'>
                <FieldRow icon={RiPriceTag3Line} label='Status'>
                  {(() => {
                    const status = booking.status || 'Upcoming';
                    const statusStyles = getBookingStatusBadgeStyles(status);
                    return (
                      <Badge.Root
                        variant='light'
                        color={statusStyles.badgeColor}
                        size='small'
                        className='px-2 py-0.5'
                      >
                        {status}
                      </Badge.Root>
                    );
                  })()}
                </FieldRow>
              </div>

              {/* Schedule (single-day or multi-day / all-day) */}
              <div className='border-b border-stroke-soft-200 last:border-b-0'>
                <FieldRow icon={RiCalendarLine} label='Schedule'>
                  <p className='text-paragraph-sm text-text-main-900 whitespace-normal break-words'>
                    {scheduleLabel || '—'}
                  </p>
                </FieldRow>
              </div>

              {/* Recurrence Row - Only show if booking is recurring */}
              {shouldShowRecurrence && (
                <div className='border-b border-stroke-soft-200 last:border-b-0'>
                  <FieldRow icon={RiPriceTag3Line} label='Recurrence'>
                    <p className='text-paragraph-sm text-text-main-900'>{recurrenceLabel}</p>
                  </FieldRow>
                </div>
              )}
            </div>

            {/* Space Details Section */}
            <BookingSpaceDetailsSection booking={booking} resource={resource} />

            {/* Client Details Section */}
            <BookingClientDetailsSection booking={booking} client={undefined} />

            {/* Comment Section */}
            {booking.description && (
              <div className='flex flex-col gap-3'>
                <div className='flex items-center gap-2'>
                  <RiChat4Line className='size-5 text-text-sub-500' />
                  <h4 className='text-label-md text-text-sub-500'>Comment</h4>
                </div>
                <p className='text-paragraph-sm text-text-sub-500'>{booking.description}</p>
              </div>
            )}

            {/* Footer — edit/delete when booking allows schedule/space edits */}
            {canEditScheduleOrSpace && (
              <div className='border-t border-stroke-soft-200 pt-4 -mx-6 px-6 mt-2'>
                <div className='flex items-center justify-end gap-2'>
                  {shouldShowRecurrence && onEditWithScope ? (
                    <Dropdown.Root>
                      <Dropdown.Trigger asChild>
                        <Button.Root
                          variant='neutral'
                          mode='stroke'
                          size='xsmall'
                          className='gap-1.5'
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button.Icon as={RiPencilLine} size={16} />
                          <span>Edit</span>
                          <Button.Icon as={RiArrowDownSLine} />
                        </Button.Root>
                      </Dropdown.Trigger>
                      <Dropdown.Content align='end' sideOffset={4} className='w-[240px]'>
                        <Dropdown.Item
                          onClick={(e) => handleEditWithScope(e, 'THIS_ONLY')}
                          className='cursor-pointer'
                        >
                          This booking
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={(e) => handleEditWithScope(e, 'THIS_AND_FOLLOWING')}
                          className='cursor-pointer'
                        >
                          This & All following bookings
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={(e) => handleEditWithScope(e, 'ALL')}
                          className='cursor-pointer'
                        >
                          All bookings in the series
                        </Dropdown.Item>
                      </Dropdown.Content>
                    </Dropdown.Root>
                  ) : (
                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      onClick={handleEdit}
                      className='gap-1.5'
                    >
                      <Button.Icon as={RiPencilLine} />
                      <span>Edit</span>
                    </Button.Root>
                  )}
                  <Button.Root
                    variant='neutral'
                    mode='stroke'
                    size='xsmall'
                    onClick={handleDelete}
                    className='gap-1.5'
                  >
                    <Button.Icon as={RiDeleteBinLine} />
                    <span>Cancel Booking</span>
                  </Button.Root>
                </div>
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Root>

      {/* Outside Popover.Root so Radix popover state cannot interact with modal focus / radio updates */}
      <DeleteBookingModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        isRecurring={shouldShowRecurrence}
      />
    </>
  );
};

export default BookingEventPopover;
