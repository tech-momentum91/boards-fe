import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '@/components/page-layout';
import CrmAccountDetailHeader from '@/components/crm-accounts/crm-account-detail-header';
import CrmAccountDetailTabContent from '@/components/crm-accounts/crm-account-detail-tab-content';
import {
  getCrmAccount,
  updateCrmAccount,
  buildSingleFieldPayload,
  updateCrmAccountAddress,
  updateCrmAccountSocialLinks,
  addCrmAccountBank,
  updateCrmAccountBank,
  deleteCrmAccountBank,
} from '@/api/crmAccounts';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { scrapeAndStoreAccountData } from '@/services/scraper-service';
import { mergeScrapedContentIntoAccount } from '@/utils/scraped-research';

const SOCIAL_KEY_TO_PLATFORM = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
};
const COMPOSITE_FIELDS = ['primary_address', 'billing_address', 'banks'];

const CrmAccountDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const accountId = decodeURIComponent(id || '');

  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [error, setError] = useState(null);

  const fetchAccount = useCallback(async () => {
    if (!accountId) {
      setAccount(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCrmAccount(accountId);
      setAccount(data);
    } catch (error_) {
      setError(error_);
      showErrorToast('Failed to load account');
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const isWebsiteMissing = !String(account?.website ?? '').trim();

  const handleFetchData = useCallback(async () => {
    if (!accountId || isFetchingData || isWebsiteMissing) return;
    setIsFetchingData(true);
    try {
      const scrapeResult = await scrapeAndStoreAccountData({
        entityId: accountId,
        entityDoctype: 'CRM Account',
      });
      const data = await getCrmAccount(accountId);
      setAccount(mergeScrapedContentIntoAccount(data, scrapeResult));
      showSuccessToast(scrapeResult?.message || 'Data fetched and updated successfully');
    } catch (error_) {
      showErrorToast(error_, { defaultMessage: 'Failed to fetch data' });
    } finally {
      setIsFetchingData(false);
    }
  }, [accountId, fetchAccount, isFetchingData, isWebsiteMissing]);

  const accountRef = useRef(account);
  accountRef.current = account;

  const debouncedSave = useDebouncedCallback(async (field, value) => {
    const currentAccount = accountRef.current;
    if (!currentAccount?.name) return;
    if (COMPOSITE_FIELDS.includes(field)) return;

    if (['linkedin', 'instagram', 'facebook'].includes(field)) {
      const platform = SOCIAL_KEY_TO_PLATFORM[field];
      setIsSaving(true);
      try {
        await updateCrmAccountSocialLinks(currentAccount.name, [{ platform, link: value || '' }]);
        showSuccessToast('Social link updated');
        await fetchAccount();
      } catch {
        showErrorToast('Failed to save social link');
        setAccount((previous) =>
          previous ? { ...previous, [field]: currentAccount[field] } : null,
        );
      } finally {
        setIsSaving(false);
      }
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildSingleFieldPayload(field, value);
      await updateCrmAccount(currentAccount.name, payload);
      showSuccessToast('Saved');
    } catch {
      showErrorToast('Failed to save');
      setAccount((previous) => (previous ? { ...previous, [field]: currentAccount[field] } : null));
    } finally {
      setIsSaving(false);
    }
  }, 1000);

  const handleFieldChange = useCallback(
    (field, value) => {
      if (!account?.name) return;
      if (COMPOSITE_FIELDS.includes(field)) return;

      setAccount((previous) => (previous ? { ...previous, [field]: value } : null));
      debouncedSave(field, value);
    },
    [account, debouncedSave],
  );

  const handleAddressUpdate = useCallback(
    async (addressType, addressData) => {
      if (!account?.name) return;
      setIsSaving(true);
      try {
        await updateCrmAccountAddress(account.name, addressType, addressData);
        showSuccessToast('Address updated');
        await fetchAccount();
      } catch {
        showErrorToast('Failed to save address');
      } finally {
        setIsSaving(false);
      }
    },
    [account?.name, fetchAccount],
  );

  /**
   * Address modal save: write fields then addresses, refetch after any success so
   * partial failures still reconcile UI with the server.
   */
  const handleAddressModalSave = useCallback(
    async ({ primary, billing, ...fields }) => {
      if (!account?.name) return;
      setIsSaving(true);
      let anySucceeded = false;
      const failures = [];

      try {
        const fieldEntries = Object.entries(fields).filter(([, value]) => value !== undefined);
        for (const [field, value] of fieldEntries) {
          try {
            await updateCrmAccount(account.name, buildSingleFieldPayload(field, value));
            anySucceeded = true;
          } catch {
            failures.push(field);
          }
        }
        if (primary) {
          try {
            await updateCrmAccountAddress(account.name, 'primary', primary);
            anySucceeded = true;
          } catch {
            failures.push('primary');
          }
        }
        if (billing) {
          try {
            await updateCrmAccountAddress(account.name, 'billing', billing);
            anySucceeded = true;
          } catch {
            failures.push('billing');
          }
        }

        if (anySucceeded) {
          await fetchAccount();
        }

        if (failures.length > 0) {
          showErrorToast(
            anySucceeded
              ? 'Some changes were saved, but others failed. Please try again.'
              : 'Failed to save address',
          );
        } else {
          showSuccessToast('Address updated');
        }
      } finally {
        setIsSaving(false);
      }
    },
    [account?.name, fetchAccount],
  );

  const handleAddBank = useCallback(
    async (accountName, bankData) => {
      setIsSaving(true);
      try {
        await addCrmAccountBank(accountName, {
          bank_name: bankData.bank_name,
          bank_account_number: bankData.bank_account_number,
          account_type: bankData.account_type,
          ifsc_code: bankData.ifsc_code,
          is_primary: bankData.is_primary ?? false,
        });
        showSuccessToast('Bank added');
        await fetchAccount();
      } catch {
        showErrorToast('Failed to add bank');
      } finally {
        setIsSaving(false);
      }
    },
    [fetchAccount],
  );

  const handleUpdateBank = useCallback(
    async (accountName, bankRowName, updates) => {
      setIsSaving(true);
      try {
        await updateCrmAccountBank(accountName, bankRowName, updates);
        showSuccessToast('Bank updated');
        await fetchAccount();
      } catch {
        showErrorToast('Failed to update bank');
      } finally {
        setIsSaving(false);
      }
    },
    [fetchAccount],
  );

  const handleDeleteBank = useCallback(
    async (accountName, bankRowName) => {
      setIsSaving(true);
      try {
        await deleteCrmAccountBank(accountName, bankRowName);
        showSuccessToast('Bank removed');
        await fetchAccount();
      } catch {
        showErrorToast('Failed to remove bank');
      } finally {
        setIsSaving(false);
      }
    },
    [fetchAccount],
  );

  if (isLoading && !account) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex h-full flex-col items-center justify-center'>
          <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
        </div>
      </PageLayout>
    );
  }

  if (error && !account) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex h-full flex-col items-center justify-center gap-2'>
          <p className='text-text-sub-600'>Failed to load account.</p>
          <button
            type='button'
            onClick={() => fetchAccount()}
            className='text-primary-base hover:underline'
          >
            Retry
          </button>
        </div>
      </PageLayout>
    );
  }

  if (!account) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex h-full flex-col items-center justify-center'>
          <p className='text-text-sub-600'>Account not found.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showDefaultHeader={false}>
      <div className='flex h-full flex-col'>
        <CrmAccountDetailHeader
          account={account}
          onBack={handleBack}
          isWebsiteMissing={isWebsiteMissing}
          onFetchData={handleFetchData}
          isFetchingData={isFetchingData}
        />
        <CrmAccountDetailTabContent
          account={account}
          onFieldChange={handleFieldChange}
          onAddressUpdate={handleAddressUpdate}
          onAddressModalSave={handleAddressModalSave}
          onAddBank={handleAddBank}
          onUpdateBank={handleUpdateBank}
          onDeleteBank={handleDeleteBank}
        />
      </div>
    </PageLayout>
  );
};

export default CrmAccountDetailPage;
