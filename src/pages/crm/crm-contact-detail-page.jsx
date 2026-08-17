import { useParams, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCrmContactOptions,
  getCrmContact,
  updateCrmContact,
  buildCrmContactSingleFieldPayload,
  updateCrmContactSocialLinks,
} from '@/api/crmContacts';
import CrmContactHeader from '@/components/crm-contacts/crm-contact-detail-header';
import CrmContactDetailTabContent from '@/components/crm-contacts/crm-contact-detail-tab-content';
import PageLayout from '@/components/page-layout';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';

const SOCIAL_KEY_TO_PLATFORM = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

const CrmContactDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const contactId = decodeURIComponent(id || '');

  const [contact, setContact] = useState(null);
  const [contactOptions, setContactOptions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchContact = useCallback(async () => {
    if (!contactId) {
      setContact(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCrmContact(contactId);
      setContact(data);
    } catch (error_) {
      setError(error_);
      showErrorToast('Failed to load contact');
      setContact(null);
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  useEffect(() => {
    getCrmContactOptions()
      .then((options) => setContactOptions(options && typeof options === 'object' ? options : {}))
      .catch(() => setContactOptions({}));
  }, []);

  const contactRef = useRef(contact);
  contactRef.current = contact;

  const debouncedSave = useDebouncedCallback(async (field, value) => {
    const currentContact = contactRef.current;
    if (!currentContact?.name) return;

    if (['linkedin', 'instagram', 'facebook'].includes(field)) {
      const platform = SOCIAL_KEY_TO_PLATFORM[field];
      setIsSaving(true);
      try {
        await updateCrmContactSocialLinks(currentContact.name, [{ platform, link: value || '' }]);
        showSuccessToast('Social link updated');
        await fetchContact();
      } catch {
        showErrorToast('Failed to save social link');
        setContact((previous) =>
          previous ? { ...previous, [field]: currentContact[field] } : null,
        );
      } finally {
        setIsSaving(false);
      }
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildCrmContactSingleFieldPayload(field, value);
      await updateCrmContact(currentContact.name, payload);
      showSuccessToast('Saved');
    } catch {
      showErrorToast('Failed to save');
      setContact((previous) => (previous ? { ...previous, [field]: currentContact[field] } : null));
    } finally {
      setIsSaving(false);
    }
  }, 1000);

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handleFieldChange = useCallback(
    (field, value) => {
      if (!contact?.name) return;
      setContact((previous) => {
        if (!previous) return null;
        const next = { ...previous, [field]: value };
        if (field === 'first_name' || field === 'last_name') {
          const first = field === 'first_name' ? value : previous.first_name || '';
          const last = field === 'last_name' ? value : previous.last_name || '';
          next.full_name = [first, last].filter(Boolean).join(' ') || previous.full_name;
        }
        return next;
      });
      debouncedSave(field, value);
    },
    [contact, debouncedSave],
  );

  if (isLoading && !contact) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex h-full flex-col items-center justify-center'>
          <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
        </div>
      </PageLayout>
    );
  }

  if (error && !contact) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex h-full flex-col items-center justify-center gap-2'>
          <p className='text-text-sub-600'>Failed to load contact.</p>
          <button
            type='button'
            onClick={() => fetchContact()}
            className='text-primary-base hover:underline'
          >
            Retry
          </button>
        </div>
      </PageLayout>
    );
  }

  if (!contact) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex h-full flex-col items-center justify-center'>
          <p className='text-text-sub-600'>Contact not found.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showDefaultHeader={false}>
      <div className='flex h-full flex-col'>
        <CrmContactHeader contact={contact} onBack={handleBack} />
        <CrmContactDetailTabContent
          contact={contact}
          onFieldChange={handleFieldChange}
          onContactUpdated={fetchContact}
          contactOptions={contactOptions}
        />
      </div>
    </PageLayout>
  );
};

export default CrmContactDetailPage;
