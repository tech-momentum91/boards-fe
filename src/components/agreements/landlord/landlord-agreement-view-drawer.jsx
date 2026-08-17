import React from 'react';
import AgreementViewDrawer from '@/components/agreements/agreement-view-drawer';

const LandlordAgreementViewDrawer = (props) => {
  return <AgreementViewDrawer {...props} mode='landlord' />;
};

export default LandlordAgreementViewDrawer;
