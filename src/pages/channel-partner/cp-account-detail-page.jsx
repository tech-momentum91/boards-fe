import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiArrowLeftSLine,
  RiGlobalLine,
  RiOrganizationChart,
  RiInformation2Fill,
  RiAccountCircle2Line,
  RiTaskLine,
  RiBuildingLine,
  RiMoneyDollarCircleLine,
  RiFileList2Line,
  RiHistoryLine,
} from 'react-icons/ri';

import PageLayout from '@/components/page-layout';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Avatar from '@/components/ui/avatar';
import * as Input from '@/components/ui/input';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  addCpAccountBank,
  deleteCpAccountBank,
  updateCpAccountBank,
  updateCpAccountById,
} from '@/services/cp-accounts-service';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  fetchCpAccountDetail,
  clearCpAccountDetail,
  selectCpAccountDetail,
  selectCpAccountDetailLoading,
  selectCpAccountDetailError,
  fetchCpAccountDetailFilterOptions,
  setCpAccountDetailAppliedFilters,
  clearCpAccountDetailFilters,
  selectCpAccountDetailAppliedFilters,
  selectCpAccountDetailFilterOptions,
  selectCpAccountDetailFilterOptionsLoading,
  selectCpAccountDetailFilterCount,
  setCpAccountDetail,
  fetchCpAccountTypeOptions,
  selectCpAccountTypeOptions,
} from '@/redux/cpAccountSlices';
import CpAccountAboutSidebar from './cp-account-about-sidebar';
import CpAccountAboutContent from './cp-account-about-content';
import CpAccountContactsSection from './cp-account-contacts-section';
import CpAccountTasksSection from './cp-account-tasks-section';
import CpAccountActivities from '@/components/cp-account-activities/cp-account-activities';
import CpAccountLeadsSection from './cp-account-leads-section';
import CpAccountCrmAccountsSection from './cp-account-crm-accounts-section';
import CrmAccountActivities from '@/components/crm-accounts/crm-account-activities/crm-account-activities';
import ComingSoonMessage from '@/components/coming-soon-message';
import FetchDataButton from '@/components/shared/fetch-data-button';
import { scrapeAndStoreAccountData } from '@/services/scraper-service';
import { mergeScrapedContentIntoAccount } from '@/utils/scraped-research';
import {
  CP_ACCOUNT_DETAIL_COLUMNS_DEFAULT,
  CP_ACCOUNT_DETAIL_TAB_READ_MODULE,
  CP_TYPE_BADGE_COLORS,
  CP_TYPE_DEFAULT_BADGE_COLOR,
} from './constants';
import {
  useCanReadDetailTab,
  useClampActiveTabToPermitted,
  useSyncDetailTabSearchParams,
} from '@/hooks/use-detail-tab-permissions';

const TypeBadge = ({ type, label }) => {
  const display = label || type;
  const color = CP_TYPE_BADGE_COLORS[display] ?? CP_TYPE_DEFAULT_BADGE_COLOR;
  return (
    <Badge.Root
      variant='light'
      color={color}
      size='small'
      className='h-auto min-h-4 max-w-none whitespace-nowrap py-0.5'
    >
      {display}
    </Badge.Root>
  );
};

function resolveCpTypeOption(type, typeOptions) {
  if (!type) return null;
  return (typeOptions || []).find((o) => o.value === type || o.label === type) || null;
}

function resolveCpTypeLabel(type, typeOptions) {
  return resolveCpTypeOption(type, typeOptions)?.label || type || '';
}

function resolveCpTypeSelectValue(type, typeOptions) {
  return resolveCpTypeOption(type, typeOptions)?.value || type || '';
}

const CP_ACCOUNT_VALID_TABS = Object.freeze([
  'about',
  'cpcontacts',
  'tasks',
  'accounts',
  'contacts',
  'leads',
  'proposals',
  'activities',
]);

const CpAccountDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const account = useSelector(selectCpAccountDetail);
  const isLoading = useSelector(selectCpAccountDetailLoading);
  const error = useSelector(selectCpAccountDetailError);
  const appliedFilters = useSelector(selectCpAccountDetailAppliedFilters);
  const filterOptions = useSelector(selectCpAccountDetailFilterOptions);
  const filterOptionsLoading = useSelector(selectCpAccountDetailFilterOptionsLoading);
  const filterCount = useSelector(selectCpAccountDetailFilterCount);
  const typeOptions = useSelector(selectCpAccountTypeOptions);
  const [activeTab, setActiveTab] = useState('about');
  const [aboutSidebar, setAboutSidebar] = useState('basic');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterCountLocal, setFilterCountLocal] = useState(0);
  const filterDropdownRef = useRef(null);
  const [detailColumns, setDetailColumns] = useState(() =>
    CP_ACCOUNT_DETAIL_COLUMNS_DEFAULT.map((c) => ({ ...c })),
  );
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [headerLocalChanges, setHeaderLocalChanges] = useState({});
  const [isHeaderSaving, setIsHeaderSaving] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const canReadCpAccountTab = useCanReadDetailTab(CP_ACCOUNT_DETAIL_TAB_READ_MODULE);
  const permittedTabIds = useMemo(
    () => CP_ACCOUNT_VALID_TABS.filter((tabId) => canReadCpAccountTab(tabId)),
    [canReadCpAccountTab],
  );
  useClampActiveTabToPermitted(activeTab, setActiveTab, permittedTabIds);
  useSyncDetailTabSearchParams({
    validTabs: CP_ACCOUNT_VALID_TABS,
    defaultTabKey: 'about',
    permittedIds: permittedTabIds,
    searchParams,
    setSearchParams,
    setActiveTab,
    searchParamKey: 'tabs',
  });

  const handleTabChange = useCallback(
    (nextTab) => {
      setActiveTab(nextTab);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextTab === 'about') next.delete('tabs');
          else next.set('tabs', nextTab);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    setHeaderLocalChanges({});
  }, [account?.id]);

  useEffect(() => {
    if (typeOptions.length === 0) dispatch(fetchCpAccountTypeOptions());
  }, [dispatch, typeOptions.length]);

  const getHeaderFieldValue = (fieldName) => {
    const local = headerLocalChanges?.[fieldName];
    if (local !== undefined && local !== null) return local;
    return account?.[fieldName] ?? '';
  };

  const setHeaderLocalChange = (fieldName, value) => {
    setHeaderLocalChanges((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleHeaderFieldChange = async (fieldName, value) => {
    const accountId = account?.id;
    if (!accountId) return;
    const current = String(account?.[fieldName] ?? '');
    const next = String(value ?? '');
    if (current === next) return;

    setHeaderLocalChange(fieldName, value);
    setIsHeaderSaving(true);
    try {
      const result = await updateCpAccountById(accountId, { [fieldName]: value });
      if (result?.error) {
        setHeaderLocalChange(fieldName, null);
        showErrorToast(result.error, { defaultMessage: 'Failed to update.' });
        return;
      }
      showSuccessToast('Updated successfully.');
      setHeaderLocalChanges((prev) => {
        const nextState = { ...prev };
        delete nextState[fieldName];
        return nextState;
      });
      await dispatch(fetchCpAccountDetail(accountId));
    } catch (error_) {
      setHeaderLocalChange(fieldName, null);
      showErrorToast(error_?.message, { defaultMessage: 'Failed to update.' });
    } finally {
      setIsHeaderSaving(false);
    }
  };

  useEffect(() => {
    if (id) {
      dispatch(fetchCpAccountDetail(id));
    }
    return () => {
      dispatch(clearCpAccountDetail());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (id) {
      dispatch(fetchCpAccountDetailFilterOptions(id));
    }
  }, [dispatch, id]);

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handleAddBank = async (accountName, bankData) => {
    if (!accountName) return;
    const result = await addCpAccountBank(accountName, {
      bank_name: bankData.bank_name,
      bank_account_number: bankData.bank_account_number,
      account_type: bankData.account_type,
      ifsc_code: bankData.ifsc_code,
      is_primary: bankData.is_primary ?? false,
    });
    if (result?.error) {
      throw new Error(result.error);
    }
    await dispatch(fetchCpAccountDetail(accountName));
  };

  const handleUpdateBank = async (accountName, bankRowName, updates) => {
    if (!accountName || !bankRowName) return;
    const result = await updateCpAccountBank(accountName, bankRowName, updates);
    if (result?.error) {
      throw new Error(result.error);
    }
    await dispatch(fetchCpAccountDetail(accountName));
  };

  const handleDeleteBank = async (accountName, bankRowName) => {
    if (!accountName || !bankRowName) return;
    const result = await deleteCpAccountBank(accountName, bankRowName);
    if (result?.error) {
      throw new Error(result.error);
    }
    await dispatch(fetchCpAccountDetail(accountName));
  };

  const handleFiltersChange = (filters) => {
    dispatch(setCpAccountDetailAppliedFilters(filters));
  };

  const handleClearFilters = (e) => {
    e?.stopPropagation?.();
    dispatch(clearCpAccountDetailFilters());
    setFilterCountLocal(0);
    setIsFilterOpen(false);
  };

  const handleDetailColumnsReorder = (oldIndex, newIndex) => {
    setDetailColumns((prev) => {
      const next = [...prev];
      const [removed] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, removed);
      return next;
    });
  };

  const handleDetailColumnToggle = (columnId) => {
    setDetailColumns((prev) =>
      prev.map((c) => (c.id === columnId ? { ...c, visible: !c.visible } : c)),
    );
  };

  const handleDetailHideAllColumns = () => {
    setDetailColumns((prev) => prev.map((c) => ({ ...c, visible: false })));
  };

  const handleDetailShowAllColumns = () => {
    setDetailColumns((prev) => prev.map((c) => ({ ...c, visible: true })));
  };

  const headerWebsite = getHeaderFieldValue('website');
  const displayWebsite = headerWebsite
    ? headerWebsite.startsWith('http')
      ? headerWebsite
      : `https://${headerWebsite}`
    : '';
  const isWebsiteMissing = !String(headerWebsite ?? '').trim();

  const handleFetchData = useCallback(async () => {
    const accountId = account?.id;
    if (!accountId || isFetchingData || isWebsiteMissing) return;
    setIsFetchingData(true);
    try {
      const scrapeResult = await scrapeAndStoreAccountData({
        entityId: accountId,
        entityDoctype: 'CP Account',
      });
      const refreshed = await dispatch(fetchCpAccountDetail(accountId)).unwrap();
      dispatch(setCpAccountDetail(mergeScrapedContentIntoAccount(refreshed, scrapeResult)));
      showSuccessToast(scrapeResult?.message || 'Data fetched and updated successfully');
    } catch (error_) {
      showErrorToast(error_, { defaultMessage: 'Failed to fetch data' });
    } finally {
      setIsFetchingData(false);
    }
  }, [account?.id, dispatch, isFetchingData, isWebsiteMissing]);

  const getSalesOwnerInitials = (name) => {
    if (!name) return '–';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '–';
    const chars = parts.map((p) => p[0]).join('');
    return chars.slice(0, 2).toUpperCase();
  };

  const headerTypeRaw = getHeaderFieldValue('type');
  const headerType = resolveCpTypeSelectValue(headerTypeRaw, typeOptions);
  const headerTypeLabel = resolveCpTypeLabel(headerTypeRaw, typeOptions);

  return (
    <PageLayout showDefaultHeader={false}>
      <div className='flex h-full w-full flex-col'>
        {/* Header */}
        <div className='pt-5 pb-[14px] pl-6 border-b pr-8 w-full border-stroke-soft-200 bg-bg-white-0'>
          <div className='flex items-center justify-between gap-3 w-full'>
            <div className='flex items-center gap-4 min-w-0'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                aria-label='Back to CP Accounts'
                onClick={handleBack}
              >
                <Button.Icon as={RiArrowLeftSLine} size={20} />
              </Button.Root>
              <div className='min-w-0 flex flex-col gap-1.5'>
                <Input.Root variant='borderless' size='xsmall' className='max-w-[320px] -ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={getHeaderFieldValue('brandName') || ''}
                      placeholder='CP Account'
                      onChange={(e) => setHeaderLocalChange('brandName', e.target.value)}
                      onBlur={(e) => handleHeaderFieldChange('brandName', e.target.value.trim())}
                      disabled={isHeaderSaving}
                      className='text-label-md text-text-strong-950 font-medium'
                    />
                  </Input.Wrapper>
                </Input.Root>
                <div className='flex items-center gap-2 min-w-0 flex-wrap'>
                  {headerWebsite ? (
                    <span className='inline-flex items-center gap-1.5 text-paragraph-sm text-text-sub-600 min-w-0'>
                      <RiGlobalLine className='size-4 shrink-0' />
                      <a
                        href={headerWebsite}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='truncate hover:underline text-paragraph-sm text-text-sub-600'
                      >
                        {account?.website}
                      </a>
                    </span>
                  ) : null}
                  {headerWebsite ? <span className='text-text-soft-400'>•</span> : null}
                  <SearchableSelect
                    variant='borderless'
                    size='xsmall'
                    matchTriggerWidth={false}
                    showArrow={false}
                    value={headerType}
                    onValueChange={(nextValue) => {
                      if (nextValue !== headerType) {
                        handleHeaderFieldChange('type', nextValue);
                      }
                    }}
                    options={typeOptions}
                    disabled={isHeaderSaving}
                    placeholder='—'
                    searchPlaceholder='Search type...'
                    noResultsMessage='No types found'
                    emptyMessage='No types available'
                    triggerClassName='!h-auto !min-h-0 py-0'
                    contentClassName='min-w-[160px]'
                    renderTrigger={() =>
                      headerType ? (
                        <TypeBadge type={headerType} label={headerTypeLabel} />
                      ) : (
                        <span className='paragraph-small text-text-sub-600'>—</span>
                      )
                    }
                    renderOptionLabel={(opt) => <TypeBadge type={opt.value} label={opt.label} />}
                  />
                </div>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <FetchDataButton
                isWebsiteMissing={isWebsiteMissing}
                isFetchingData={isFetchingData}
                onFetchData={handleFetchData}
              />
              <Button.Root variant='neutral' mode='stroke' size='small' className='gap-1.5'>
                <Button.Icon as={RiOrganizationChart} size={20} />
                View Org. Chart
              </Button.Root>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className='flex-1 w-full border-stroke-soft-200 overflow-hidden flex flex-col min-h-0'>
          <TabMenuHorizontal.Root
            value={activeTab}
            onValueChange={handleTabChange}
            className='flex flex-col h-full min-h-0'
          >
            <TabMenuHorizontal.List wrapperClassName='w-full shrink-0' className='px-4'>
              {permittedTabIds.includes('about') ? (
                <TabMenuHorizontal.Trigger value='about'>
                  <TabMenuHorizontal.Icon as={RiInformation2Fill} />
                  About CP Account
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedTabIds.includes('cpcontacts') ? (
                <TabMenuHorizontal.Trigger value='cpcontacts'>
                  <TabMenuHorizontal.Icon as={RiAccountCircle2Line} />
                  CP Contacts
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedTabIds.includes('tasks') ? (
                <TabMenuHorizontal.Trigger value='tasks'>
                  <TabMenuHorizontal.Icon as={RiTaskLine} />
                  Tasks
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedTabIds.includes('accounts') ? (
                <TabMenuHorizontal.Trigger value='accounts'>
                  <TabMenuHorizontal.Icon as={RiBuildingLine} />
                  Accounts
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedTabIds.includes('contacts') ? (
                <TabMenuHorizontal.Trigger value='contacts'>
                  <TabMenuHorizontal.Icon as={RiAccountCircle2Line} />
                  Contacts
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedTabIds.includes('leads') ? (
                <TabMenuHorizontal.Trigger value='leads'>
                  <TabMenuHorizontal.Icon as={RiMoneyDollarCircleLine} />
                  Leads
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedTabIds.includes('proposals') ? (
                <TabMenuHorizontal.Trigger value='proposals'>
                  <TabMenuHorizontal.Icon as={RiFileList2Line} />
                  Proposals
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedTabIds.includes('activities') ? (
                <TabMenuHorizontal.Trigger value='activities'>
                  <TabMenuHorizontal.Icon as={RiHistoryLine} />
                  Activities
                </TabMenuHorizontal.Trigger>
              ) : null}
            </TabMenuHorizontal.List>

            {/* About CP Account Tab */}
            <TabMenuHorizontal.Content value='about' className='flex-1 min-h-0'>
              <div className='flex h-full min-h-0'>
                <CpAccountAboutSidebar
                  value={aboutSidebar}
                  onValueChange={setAboutSidebar}
                  account={account}
                />
                <div className='flex-1 min-h-0 overflow-y-auto py-4 px-6'>
                  {isLoading && !account ? (
                    <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-text-sub-600'>
                      Loading account details...
                    </div>
                  ) : error && !account ? (
                    <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-error-base'>
                      {error}
                    </div>
                  ) : (
                    <CpAccountAboutContent
                      section={aboutSidebar}
                      account={account}
                      onAddBank={handleAddBank}
                      onUpdateBank={handleUpdateBank}
                      onDeleteBank={handleDeleteBank}
                      onFieldDraftChange={setHeaderLocalChange}
                    />
                  )}
                </div>
              </div>
            </TabMenuHorizontal.Content>

            {/* CP Contacts Tab */}
            <TabMenuHorizontal.Content value='cpcontacts' className='flex-1 min-h-0'>
              <CpAccountContactsSection account={account} />
            </TabMenuHorizontal.Content>
            <TabMenuHorizontal.Content value='tasks' className='flex-1 min-h-0'>
              <CpAccountTasksSection account={account} />
            </TabMenuHorizontal.Content>
            <TabMenuHorizontal.Content value='accounts' className='flex-1 min-h-0 overflow-y-auto'>
              <CpAccountCrmAccountsSection cpAccountId={id} />
            </TabMenuHorizontal.Content>
            <TabMenuHorizontal.Content value='contacts' className='flex-1 min-h-0 overflow-y-auto'>
              <CpAccountCrmAccountsSection cpAccountId={id} mode='contacts' />
            </TabMenuHorizontal.Content>
            <TabMenuHorizontal.Content value='leads' className='flex-1 min-h-0'>
              <CpAccountLeadsSection account={account} />
            </TabMenuHorizontal.Content>
            <TabMenuHorizontal.Content
              value='proposals'
              className='flex-1 min-h-0 overflow-y-auto p-6'
            >
              <ComingSoonMessage />
            </TabMenuHorizontal.Content>
            {/* Activities Tab - CP Account activities (CRM-style feed) */}
            <TabMenuHorizontal.Content
              value='activities'
              className='flex-1 min-h-0 flex flex-col overflow-hidden'
            >
              <div className='flex flex-1 flex-col min-h-0 overflow-hidden bg-bg-white-0'>
                <CpAccountActivities cpAccountId={id} />
              </div>
            </TabMenuHorizontal.Content>
          </TabMenuHorizontal.Root>
        </div>
      </div>
    </PageLayout>
  );
};

export default CpAccountDetailPage;
