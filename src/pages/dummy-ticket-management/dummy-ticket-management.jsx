import React from 'react';
import { RiSettings2Line } from 'react-icons/ri';
import PageLayout from '@/components/page-layout';
import ComingSoonMessage from '@/components/coming-soon-message';

const Centers = () => {
  return (
    <PageLayout
      pageTitle='Tickets'
      pageIcon={<RiSettings2Line size={24} />}
      pageDescription='Manage, prioritize, and resolve support requests all in one place.'
    >
      <ComingSoonMessage />
    </PageLayout>
  );
};

export default Centers;
