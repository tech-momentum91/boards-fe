import React from 'react';
import { RiStickyNoteLine } from 'react-icons/ri';
import BookingComments from '@/components/bookings/booking-comments';
import { fetchBookingDetail } from '@/redux/bookingSlice';

const BookingCommentsPanel = ({ booking, selectedBookingId, dispatch }) => {
  return (
    <div className='flex flex-1 flex-col h-full overflow-y-auto'>
      <div className='border-b border-stroke-soft-200 px-6 py-3.5'>
        <div className='flex items-center gap-2'>
          <RiStickyNoteLine size={20} className='text-text-sub-500' />
          <span className='label-small text-text-sub-500'>Comments</span>
        </div>
      </div>
      {booking && (
        <BookingComments
          bookingId={booking.name || booking.id}
          loading={false}
          onRefreshData={() => {
            const currentBookingId = booking?.name || booking?.id || selectedBookingId;
            if (currentBookingId) {
              dispatch(fetchBookingDetail(currentBookingId));
            }
          }}
        />
      )}
    </div>
  );
};

export default BookingCommentsPanel;
