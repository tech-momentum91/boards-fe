import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageLayout from '@/components/page-layout';
import BookingCalendar from '@/components/bookings/booking-calendar';
import BookingList from '@/components/bookings/booking-list';
import { RiCalendarLine } from 'react-icons/ri';
import WithModulePermission from '@/route-protection/with-module-permission';

const Bookings = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current view from URL
  const isListView = location.pathname === '/bookings/list';

  // Redirect /bookings to /bookings/calendar (default)
  useEffect(() => {
    if (location.pathname === '/bookings') {
      navigate('/bookings/calendar', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <PageLayout
      contentAreaClassName='overflow-hidden'
      pageTitle='Bookings'
      pageIcon={<RiCalendarLine size={24} />}
      pageDescription='Manage and view all bookings for your resources'
      showDefaultHeader={true}
      borderDivClassName='w-full mx-0'
    >
      <div className='w-full h-full p-6 bg-bg-weak-100'>
        <div className='bg-bg-white-0 w-full h-full border border-stroke-soft-200 rounded-2xl overflow-hidden'>
          {isListView ? <BookingList /> : <BookingCalendar />}
        </div>
      </div>
    </PageLayout>
  );
};

export default WithModulePermission(Bookings, 'Space Booking');
