import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowLeftSLine, RiBuildingLine } from 'react-icons/ri';

import PageLayout from '@/components/page-layout';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Avatar from '@/components/ui/avatar';
import {
  fetchCpContactDetail,
  clearCpContactDetail,
  selectCpContactDetail,
  selectCpContactDetailLoading,
  selectCpContactDetailError,
  clearCpContactLeads,
} from '@/redux/cpContactSlices';
import CpContactAboutSidebar from './cp-contact-about-sidebar';
import CpContactAboutContent from './cp-contact-about-content';
import CpContactTasksSection from './cp-contact-tasks-section';
import CpContactLeadsTab from './cp-contact-leads-tab';
import CpContactActivities from '@/components/cp-contact-activities/cp-contact-activities';
import CpContactCpAccountTab from './cp-contact-cp-account-tab';
import CpContactAccountsSection from './cp-contact-accounts-section';
import CpContactDetailTabs from './cp-contact-detail-tabs';
import ComingSoonMessage from '@/components/coming-soon-message';
import { CP_CONTACT_DETAIL_TAB_READ_MODULE } from './constants-cp-contacts';
import {
  useCanReadDetailTab,
  useClampActiveTabToPermitted,
} from '@/hooks/use-detail-tab-permissions';
import { updateCpContactById, getCpAccountByCpContact } from '@/services/cp-contacts-service';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const CP_CONTACT_VALID_TABS = Object.freeze([
  'about',
  'cpAccount',
  'tasks',
  'account',
  'leads',
  'proposals',
  'activities',
]);

function joinFullName(firstName, lastName) {
  return [String(firstName ?? '').trim(), String(lastName ?? '').trim()].filter(Boolean).join(' ');
}

function splitFullName(full) {
  const s = String(full ?? '').trim();
  if (!s) return { firstName: '', lastName: '' };
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function getSalesOwnerInitials(name) {
  if (!name) return '–';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '–';
  const chars = parts.map((p) => p[0]).join('');
  return chars.slice(0, 2).toUpperCase();
}

const CpContactDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const contact = useSelector(selectCpContactDetail);
  const isLoading = useSelector(selectCpContactDetailLoading);
  const error = useSelector(selectCpContactDetailError);
  const pendingTabRef = useRef(null);
  const cpAccountFetchIdRef = useRef(0);
  const cpAccountLoadedForIdRef = useRef(null);
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tabs') || 'about');
  const [aboutSidebar, setAboutSidebar] = useState('basic');
  const [cpAccountVisited, setCpAccountVisited] = useState(
    () => (searchParams.get('tabs') || 'about') === 'cpAccount',
  );
  const [cpAccount, setCpAccount] = useState(null);
  const [cpAccountLoading, setCpAccountLoading] = useState(false);
  const [cpAccountError, setCpAccountError] = useState(null);

  const canReadCpContactTab = useCanReadDetailTab(CP_CONTACT_DETAIL_TAB_READ_MODULE);
  const permittedTabIds = useMemo(
    () => CP_CONTACT_VALID_TABS.filter((tabId) => canReadCpContactTab(tabId)),
    [canReadCpContactTab],
  );
  useClampActiveTabToPermitted(activeTab, setActiveTab, permittedTabIds);

  useEffect(() => {
    if (activeTab === 'cpAccount') {
      setCpAccountVisited(true);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!id) {
      setCpAccount(null);
      setCpAccountError(null);
      setCpAccountLoading(false);
      return undefined;
    }

    if (activeTab !== 'cpAccount') {
      return undefined;
    }

    if (cpAccountLoadedForIdRef.current === id) {
      return undefined;
    }

    const fetchId = ++cpAccountFetchIdRef.current;
    setCpAccountLoading(true);
    setCpAccountError(null);

    getCpAccountByCpContact(id)
      .then((result) => {
        if (fetchId !== cpAccountFetchIdRef.current) return;
        if (result.error) {
          setCpAccountError(result.error);
          setCpAccount(null);
        } else {
          cpAccountLoadedForIdRef.current = id;
          setCpAccount(result.data ?? null);
          setCpAccountError(null);
        }
      })
      .catch((error_) => {
        if (fetchId !== cpAccountFetchIdRef.current) return;
        setCpAccountError(error_?.message || 'Failed to load CP account.');
        setCpAccount(null);
      })
      .finally(() => {
        if (fetchId === cpAccountFetchIdRef.current) {
          setCpAccountLoading(false);
        }
      });

    return undefined;
  }, [activeTab, id]);

  useEffect(() => {
    if (permittedTabIds.length === 0) return;

    const raw = searchParams.get('tabs');
    const urlTab = raw || 'about';
    if (!CP_CONTACT_VALID_TABS.includes(urlTab)) return;

    const resolved = permittedTabIds.includes(urlTab) ? urlTab : permittedTabIds[0];
    const pending = pendingTabRef.current;

    if (pending != null) {
      const pendingMatchesUrl =
        (pending === 'about' && raw == null) || (pending !== 'about' && raw === pending);
      if (pendingMatchesUrl) {
        pendingTabRef.current = null;
      } else if (permittedTabIds.includes(pending)) {
        setActiveTab((current) => (current === pending ? current : pending));
        return;
      }
    }

    setActiveTab((current) => (current === resolved ? current : resolved));

    const urlMatches =
      (resolved === 'about' && raw == null) || (resolved !== 'about' && raw === resolved);
    if (urlMatches) return;

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (resolved === 'about') next.delete('tabs');
        else next.set('tabs', resolved);
        return next;
      },
      { replace: true },
    );
  }, [searchParams, permittedTabIds, setSearchParams]);

  const handleBack = useCallback(() => navigate(-1), [navigate]);
  const handleTabChange = useCallback(
    (nextTab) => {
      pendingTabRef.current = nextTab;
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
    if (id) {
      dispatch(fetchCpContactDetail(id));
    }
    return () => {
      dispatch(clearCpContactDetail());
      dispatch(clearCpContactLeads());
      cpAccountFetchIdRef.current += 1;
      cpAccountLoadedForIdRef.current = null;
      setCpAccount(null);
      setCpAccountError(null);
      setCpAccountLoading(false);
    };
  }, [dispatch, id]);

  const lifecycleStage = contact?.lifecycleStage ?? contact?.status ?? '';

  const hasContact = contact != null;
  const showNoContactState = !id || (!isLoading && !hasContact);

  const headerResolvedName = useMemo(() => {
    if (!contact) return '';
    const fromParts = joinFullName(contact.firstName, contact.lastName);
    if (fromParts) return fromParts;
    return String(contact.name ?? '').trim();
  }, [contact]);

  const [nameDraft, setNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    if (!contact) {
      setNameDraft('');
      return;
    }
    setNameDraft(headerResolvedName);
  }, [contact?.id, headerResolvedName]);

  const handleNameBlur = useCallback(async () => {
    if (!id || !contact) return;
    const full = nameDraft.trim();
    const { firstName, lastName } = splitFullName(full);
    const curFirst = String(contact.firstName ?? '').trim();
    const curLast = String(contact.lastName ?? '').trim();
    if (firstName === curFirst && lastName === curLast) return;

    setIsSavingName(true);
    try {
      const result = await updateCpContactById(id, { firstName, lastName });
      if (result?.error) {
        showErrorToast(result.error, { defaultMessage: 'Failed to update name.' });
        setNameDraft(headerResolvedName);
        return;
      }
      showSuccessToast('Updated successfully.');
      await dispatch(fetchCpContactDetail(id));
    } catch (error_) {
      showErrorToast(error_, { defaultMessage: 'Failed to update name.' });
      setNameDraft(headerResolvedName);
    } finally {
      setIsSavingName(false);
    }
  }, [id, contact, nameDraft, headerResolvedName, dispatch]);

  const headerAvatarInitials = useMemo(() => {
    const src = (nameDraft ?? '').trim() || headerResolvedName;
    const fromName = src ? getSalesOwnerInitials(src) : '';
    if (fromName && fromName !== '–') return fromName;
    return contact?.initials || contact?.name?.slice(0, 2)?.toUpperCase() || '–';
  }, [nameDraft, headerResolvedName, contact?.initials, contact?.name]);

  if (showNoContactState) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex h-full w-full flex-col items-center justify-center p-6'>
          <ComingSoonMessage />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showDefaultHeader={false} contentAreaClassName='!overflow-hidden'>
      <div className='flex h-full min-h-0 w-full flex-col'>
        <div className='shrink-0 pt-5 pb-[14px] pl-6 border-b pr-8 w-full border-stroke-soft-200 bg-bg-white-0'>
          <div className='flex items-center justify-between gap-3 w-full'>
            <div className='flex items-center gap-4 min-w-0'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                aria-label='Back to CP Contacts'
                onClick={handleBack}
              >
                <Button.Icon as={RiArrowLeftSLine} size={20} />
              </Button.Root>
              <Avatar.Root size={40} color='gray' className='shrink-0'>
                <span className='text-sm font-medium text-text-main-900'>
                  {headerAvatarInitials}
                </span>
              </Avatar.Root>
              <div className='min-w-0 flex flex-col gap-1.5 flex-1'>
                <Input.Root
                  variant='borderless'
                  size='xsmall'
                  className='max-w-[min(100%,480px)] -ml-2'
                >
                  <Input.Wrapper>
                    <Input.Input
                      value={nameDraft}
                      placeholder='CP Contact'
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={handleNameBlur}
                      disabled={isSavingName || !contact}
                      aria-label='Contact name'
                      className='text-label-md text-text-strong-950 font-medium'
                    />
                  </Input.Wrapper>
                </Input.Root>
                <div className='flex items-center gap-2 min-w-0'>
                  <span className='inline-flex items-center gap-1.5 text-paragraph-sm text-text-sub-600 truncate'>
                    {contact?.email ?? '–'}
                  </span>
                  <span className='text-text-soft-400'>•</span>
                  <span className='text-paragraph-sm text-text-sub-600 truncate'>
                    {contact?.associateAccount ?? contact?.cpAccount ?? '–'}
                  </span>
                  {contact?.salesOwner && (
                    <>
                      <span className='text-text-soft-400'>•</span>
                      <span className='inline-flex items-center gap-1.5 text-paragraph-sm text-text-sub-600 truncate'>
                        <Avatar.Root size={24} color='gray'>
                          <span className='text-[10px] font-medium text-text-main-900'>
                            {getSalesOwnerInitials(contact.salesOwner)}
                          </span>
                        </Avatar.Root>
                        <span className='truncate max-w-[140px]'>{contact.salesOwner}</span>
                      </span>
                    </>
                  )}
                  {lifecycleStage && (
                    <>
                      <span className='text-text-soft-400'>•</span>
                      <Badge.Root size='small' variant='light' color='purple'>
                        {lifecycleStage}
                      </Badge.Root>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                className='gap-1.5'
                onClick={() => {
                  const accountId = contact?.cpAccountId ?? contact?.cp_account;
                  if (accountId) navigate(`/channel-partner/accounts/${accountId}`);
                }}
              >
                <Button.Icon as={RiBuildingLine} size={20} />
                View Account
              </Button.Root>
            </div>
          </div>
        </div>

        <div className='flex min-h-0 flex-1 flex-col overflow-hidden border-stroke-soft-200'>
          <CpContactDetailTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            permittedTabIds={permittedTabIds}
          />

          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            {activeTab === 'about' && (
              <div className='flex h-full min-h-0'>
                <CpContactAboutSidebar value={aboutSidebar} onValueChange={setAboutSidebar} />
                <div className='flex-1 min-h-0 overflow-y-auto py-4 px-6'>
                  {isLoading && !contact ? (
                    <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-text-sub-600'>
                      Loading contact details...
                    </div>
                  ) : error && !contact ? (
                    <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-error-base'>
                      {error}
                    </div>
                  ) : (
                    <CpContactAboutContent section={aboutSidebar} contact={contact} />
                  )}
                </div>
              </div>
            )}

            {cpAccountVisited && (
              <div
                className={
                  activeTab === 'cpAccount'
                    ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
                    : 'hidden'
                }
              >
                <CpContactCpAccountTab
                  account={cpAccount}
                  loading={cpAccountLoading}
                  error={cpAccountError}
                />
              </div>
            )}

            {activeTab === 'tasks' && <CpContactTasksSection contact={contact} />}

            {activeTab === 'account' && <CpContactAccountsSection cpContactId={id} />}

            {activeTab === 'leads' && (
              <div className='flex min-h-0 flex-1 flex-col overflow-hidden p-6'>
                <CpContactLeadsTab cpContactId={id} contact={contact} />
              </div>
            )}

            {activeTab === 'proposals' && (
              <div className='flex min-h-[60vh] flex-col items-center justify-center overflow-y-auto p-6'>
                <ComingSoonMessage />
              </div>
            )}

            {activeTab === 'activities' && (
              <div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-white-0'>
                <CpContactActivities cpContactId={id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default CpContactDetailPage;
