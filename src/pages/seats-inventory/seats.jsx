import React from 'react';
import PageLayout from '@/components/page-layout';
import ComingSoonMessage from '@/components/coming-soon-message';
import { RiListCheck3 } from 'react-icons/ri';

const Seats = () => {
  return (
    <PageLayout
      pageTitle='Seats'
      pageIcon={<RiListCheck3 size={24} />}
      pageDescription='Seats management and insights will be available soon.'
    >
      <ComingSoonMessage />
    </PageLayout>
  );
};

export default Seats;
