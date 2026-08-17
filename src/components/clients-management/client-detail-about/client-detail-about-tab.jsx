import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  selectActiveSidebarItem,
  selectPrimaryAddressObj,
  selectBillingAddressObj,
  selectEditAddressModal,
  selectEditContactModal,
  selectAddContactModal,
  closeEditAddressModal,
  closeEditContactModal,
  selectClientDetail,
  getClientDetailThunk,
} from '@/redux/clientDetailSlice';
import ClientDetailAboutSidebar from '@/components/clients-management/client-detail-about/client-detail-about-sidebar';
import ClientDetailAboutInfo from '@/components/clients-management/client-detail-about/client-detail-about-info';
import ClientDetailAboutContacts from '@/components/clients-management/client-detail-about/client-detail-about-contacts';
import ClientDetailAboutAddresses from '@/components/clients-management/client-detail-about/client-detail-about-addresses';
import ClientDetailAboutStatutory from '@/components/clients-management/client-detail-about/client-detail-about-statutory';
import ClientDetailAboutBank from '@/components/clients-management/client-detail-about/client-detail-about-bank';
import ClientAddBankModal from '@/components/clients-management/client-add-bank-modal';
import ClientAddContactModal from '@/components/clients-management/client-add-contact-modal';
import ClientEditAddressModal from '@/components/clients-management/client-edit-address-modal';
import ClientEditContactModal from '@/components/clients-management/client-edit-contact-modal';
import ClientDetailOverview from './client-detail-overview';
import ClientDetailMarketInsights from './client-detail-market-insights';
import ClientDetailNewsSignal from './client-detail-news-signal';
import ClientDetailFunding from './client-detail-funding';

const ClientDetailAboutTab = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const activeSidebarItem = useSelector(selectActiveSidebarItem);
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;
  const clientId = client?.name || id;
  const primaryAddressObject = useSelector(selectPrimaryAddressObj);
  const billingAddressObject = useSelector(selectBillingAddressObj);
  const editAddressModal = useSelector(selectEditAddressModal);
  const editContactModal = useSelector(selectEditContactModal);
  const addContactModal = useSelector(selectAddContactModal);

  const handleBankSuccess = async () => {
    if (clientId) {
      await dispatch(getClientDetailThunk(clientId));
    }
  };

  const handleAddressSuccess = async () => {
    if (clientId) {
      await dispatch(getClientDetailThunk(clientId));
    }
  };

  const handleContactSuccess = async () => {
    if (clientId) {
      await dispatch(getClientDetailThunk(clientId));
    }
  };

  return (
    <div className='flex flex-1 overflow-hidden'>
      {/* Sidebar */}
      <div className='h-full shrink-0'>
        <ClientDetailAboutSidebar />
      </div>

      {/* Content Area */}
      <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6'>
        {activeSidebarItem === 'basic' && (
          <>
            <ClientDetailAboutInfo />
            <ClientDetailAboutContacts />
            <ClientDetailAboutAddresses />
          </>
        )}
        {activeSidebarItem === 'statutory' && <ClientDetailAboutStatutory />}
        {activeSidebarItem === 'bank' && <ClientDetailAboutBank />}
        {activeSidebarItem === 'company-foundation' && <ClientDetailOverview />}
        {activeSidebarItem === 'market-position-offerings' && <ClientDetailMarketInsights />}
        {activeSidebarItem === 'digital-presence-signal' && <ClientDetailNewsSignal />}
        {activeSidebarItem === 'financial-investment-performance' && <ClientDetailFunding />}
      </div>
      <ClientAddBankModal clientId={clientId} onSuccess={handleBankSuccess} />
      <ClientAddContactModal clientId={clientId} onSuccess={handleContactSuccess} />

      {/* Edit Address Modal */}
      {(editAddressModal.addressType === 'primary'
        ? primaryAddressObject
        : billingAddressObject) && (
        <ClientEditAddressModal
          open={editAddressModal.isOpen}
          onOpenChange={(open) => {
            if (!open) {
              dispatch(closeEditAddressModal());
            }
          }}
          primaryAddress={primaryAddressObject}
          billingAddress={billingAddressObject}
          addressType={editAddressModal.addressType || 'primary'}
          clientId={clientId}
          onSuccess={handleAddressSuccess}
        />
      )}

      {/* Edit Contact Modal */}
      {editContactModal.contact && (
        <ClientEditContactModal
          open={editContactModal.isOpen}
          onOpenChange={(open) => {
            if (!open) {
              dispatch(closeEditContactModal());
            }
          }}
          contact={editContactModal.contact}
          clientId={clientId}
          onSuccess={handleContactSuccess}
        />
      )}
    </div>
  );
};

export default ClientDetailAboutTab;
