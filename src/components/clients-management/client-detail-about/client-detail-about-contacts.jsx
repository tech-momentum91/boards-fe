import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  selectContacts,
  openEditContactModal,
  openAddContactModal,
  selectClientDetail,
  deleteClientContactThunk,
  getClientDetailThunk,
} from '@/redux/clientDetailSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { CLIENT_DETAIL_EMPTY_STATES } from '@/components/clients-management/constants';
import ContactCards from '@/components/ui/contact-cards';

const ClientDetailAboutContacts = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const contacts = useSelector(selectContacts);
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;
  const clientId = client?.name || id;

  const handleAddContact = () => {
    dispatch(openAddContactModal());
  };

  const handleEditContact = (originalContact) => {
    dispatch(openEditContactModal(originalContact));
  };

  const handleDeleteContact = async (contact) => {
    if (!contact?.originalContact?.name || !clientId) {
      showErrorToast('Unable to delete contact');
      return;
    }

    try {
      const result = await dispatch(
        deleteClientContactThunk({
          customer: clientId,
          contact: contact.originalContact.name,
        }),
      );

      if (deleteClientContactThunk.rejected.match(result)) {
        showErrorToast(result.payload, {
          defaultMessage: 'Failed to delete contact. Please try again.',
        });
        throw new Error('Delete failed');
      }

      showSuccessToast('Contact deleted successfully');
      if (clientId) {
        await dispatch(getClientDetailThunk(clientId));
      }
    } catch (error) {
      if (error?.message !== 'Delete failed') {
        showErrorToast(error, {
          defaultMessage: 'Failed to delete contact. Please try again.',
        });
      }
      throw error;
    }
  };

  return (
    <ContactCards
      contacts={contacts}
      onAddContact={handleAddContact}
      onEditContact={handleEditContact}
      onDeleteContact={handleDeleteContact}
      emptyState={CLIENT_DETAIL_EMPTY_STATES.contacts}
      showActions={true}
    />
  );
};

export default ClientDetailAboutContacts;
