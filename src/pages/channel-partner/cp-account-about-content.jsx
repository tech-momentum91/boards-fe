import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCenterAccess } from '@/redux/centerSlice';
import {
  RiLinksLine,
  RiLinkedinBoxLine,
  RiInstagramLine,
  RiFacebookCircleLine,
  RiExternalLinkLine,
  RiContactsBook2Line,
  RiAddLine,
  RiSearchLine,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Avatar from '@/components/ui/avatar';
import * as AvatarGroup from '@/components/ui/avatar-group';
import * as Tooltip from '@/components/ui/tooltip';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import DetailGrid from '@/components/ui/detail-grid';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { getSalesTeamUserList, getIndustryTypeList } from '@/api/crmAccounts';
import CpAccountAddressSection from './cp-account-address-section';
import CpAccountEditAddressModal from './cp-account-edit-address-modal';
import {
  pickCpPrimaryAddressRow,
  pickCpBillingAddressRow,
  mapCpAddressRowToModalShape,
} from './cp-account-address-utils';
import { CP_CONTACTS_AVATAR_DISPLAY_COUNT } from './constants';
import emptyStateBank from '@/assets/images/emptystates.png';
import { updateCpAccountById, getCpAccountsList } from '@/services/cp-accounts-service';
import CpAccountAboutBank from './cp-account-about-bank';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { fetchCpAccountDetail } from '@/redux/cpAccountSlices';
import { validateClientField } from '@/schemas/client-schema';
import AccountResearchPanels from '@/components/shared/account-research-panels';
import { ACCOUNT_RESEARCH_SIDEBAR_KEYS } from '@/utils/scraped-research';
import {
  buildOperationalLocationPayload,
  deriveOperationalStatesDisplay,
  getOperationalCitiesFromRow,
} from './cp-operational-location-utils';
import { CpOperationalCityField, CpOperationalStateDisplay } from './cp-operational-city-field';
import { useDebounce } from '@/hooks/use-debounce';

// Match Space detail page placeholder style.
const EMPTY_PLACEHOLDER = '--';
const LINK_OPTIONS_PAGE_SIZE = 500;
const LINK_OPTIONS_SEARCH_DEBOUNCE_MS = 300;

const CP_GST_STATUS_OPTIONS = ['None', 'Registered', 'Unregistered', 'Composition'];

function normalizeCpGstStatus(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const hit = CP_GST_STATUS_OPTIONS.find((v) => v.toLowerCase() === s.toLowerCase());
  return hit || '';
}

function gstStatusRequiresGstin(status) {
  return status === 'Registered' || status === 'Composition';
}

const isEmpty = (v) => v == null || (typeof v === 'string' && v.trim() === '');

const SalesOwnerDisplay = ({ name }) => (
  <div className='flex items-center gap-2 py-0.5'>
    {name ? (
      <CrmAccountAvatar name={name} variant='weak' size={28} />
    ) : (
      <span className='text-label-sm text-text-main-900 font-medium'>--</span>
    )}
  </div>
);

/**
 * Renders About CP Account content based on section: basic | statutory | bank.
 * Uses DetailGrid (same pattern as Space detail page) with items array.
 */
const CpAccountAboutContent = ({
  section,
  account,
  onAddBank,
  onUpdateBank,
  onDeleteBank,
  onFieldDraftChange,
}) => {
  const dispatch = useDispatch();
  const [localChanges, setLocalChanges] = useState({});
  const [statutoryGstinError, setStatutoryGstinError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [salesTeamUserList, setSalesTeamUserList] = useState([]);
  const [salesTeamUserListLoading, setSalesTeamUserListLoading] = useState(false);
  const [salesOwnerSearchQuery, setSalesOwnerSearchQuery] = useState('');
  const debouncedSalesOwnerSearch = useDebounce(
    salesOwnerSearchQuery,
    LINK_OPTIONS_SEARCH_DEBOUNCE_MS,
  );
  const [industryGroups, setIndustryGroups] = useState([]);
  const [industryOptionsLoading, setIndustryOptionsLoading] = useState(false);
  const [cpAccountOptions, setCpAccountOptions] = useState([]);
  const [cpAccountOptionsLoading, setCpAccountOptionsLoading] = useState(false);
  const [cpAccountSearchQuery, setCpAccountSearchQuery] = useState('');
  const debouncedCpAccountSearch = useDebounce(
    cpAccountSearchQuery,
    LINK_OPTIONS_SEARCH_DEBOUNCE_MS,
  );

  const centerAccess = useSelector(selectCenterAccess);
  const centers = useMemo(
    () => (Array.isArray(centerAccess?.selectedCenters) ? centerAccess.selectedCenters : []),
    [centerAccess?.selectedCenters],
  );

  useEffect(() => {
    setLocalChanges({});
    setStatutoryGstinError('');
  }, [account?.id]);

  useEffect(() => {
    if (centers.length === 0) {
      setCpAccountOptions([]);
      return;
    }
    let isMounted = true;
    setCpAccountOptionsLoading(true);
    getCpAccountsList({
      centers,
      type: 'all',
      search: debouncedCpAccountSearch.trim(),
    })
      .then((result) => {
        if (result?.error || !isMounted) {
          if (isMounted) setCpAccountOptions([]);
          return;
        }
        const list = result.data ?? [];
        const options = list.map((a) => ({
          value: a.id,
          label: a.legalName || a.brandName || a.id || '–',
        }));
        if (isMounted) setCpAccountOptions(options);
      })
      .catch(() => {
        if (isMounted) setCpAccountOptions([]);
      })
      .finally(() => {
        if (isMounted) setCpAccountOptionsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [centers, debouncedCpAccountSearch]);

  useEffect(() => {
    let isMounted = true;
    setIndustryOptionsLoading(true);
    getIndustryTypeList({ grouped: true, scope: 'cp' })
      .then((options) => {
        if (!isMounted) return;
        const groups = Array.isArray(options?.industry_type)
          ? options.industry_type.filter(
              (group) => Array.isArray(group?.industry_name) && group.industry_name.length > 0,
            )
          : [];
        setIndustryGroups(groups);
      })
      .catch(() => {
        if (isMounted) setIndustryGroups([]);
      })
      .finally(() => {
        if (isMounted) setIndustryOptionsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const industryLabelByValue = useMemo(() => {
    const map = new Map();
    for (const group of industryGroups) {
      for (const n of group.industry_name || []) {
        if (n?.value != null) map.set(n.value, n.label ?? n.value);
      }
    }
    return map;
  }, [industryGroups]);

  const flattenedIndustryOptions = useMemo(() => {
    return industryGroups.flatMap((group) => {
      const parentLabel = group.label;
      const list = Array.isArray(group.industry_name) ? group.industry_name : [];
      return list.map((opt) => ({
        value: opt.value,
        label: opt.label,
        groupLabel: parentLabel,
      }));
    });
  }, [industryGroups]);

  const [editAddressOpen, setEditAddressOpen] = useState(false);
  const [editAddressType, setEditAddressType] = useState('primary');

  const primaryAddressRow = useMemo(
    () => pickCpPrimaryAddressRow(account?.addresses),
    [account?.addresses],
  );
  const billingAddressRow = useMemo(
    () => pickCpBillingAddressRow(account?.addresses),
    [account?.addresses],
  );

  const primaryAddressForModal = useMemo(
    () => mapCpAddressRowToModalShape(primaryAddressRow),
    [primaryAddressRow],
  );
  const billingAddressForModal = useMemo(
    () => mapCpAddressRowToModalShape(billingAddressRow),
    [billingAddressRow],
  );

  const handleEditCpAddress = useCallback((type) => {
    setEditAddressType(type || 'primary');
    setEditAddressOpen(true);
  }, []);

  const handleCpAddressEditSuccess = useCallback(async () => {
    const id = account?.id;
    if (id) {
      await dispatch(fetchCpAccountDetail(id));
    }
  }, [account?.id, dispatch]);

  useEffect(() => {
    let isMounted = true;
    setSalesTeamUserListLoading(true);
    getSalesTeamUserList({
      keyword: debouncedSalesOwnerSearch.trim() || undefined,
      pageSize: LINK_OPTIONS_PAGE_SIZE,
    })
      .then((list) => {
        const raw = Array.isArray(list) ? list : (list?.results ?? list?.message ?? []);
        const array = Array.isArray(raw) ? raw : [];
        const options = array
          .map((item) => ({
            value: item.value ?? item.id ?? item.email ?? item.name ?? '',
            label: item.label ?? item.full_name ?? item.name ?? item.value ?? '–',
          }))
          .filter((o) => o.value);
        if (isMounted) setSalesTeamUserList(options);
      })
      .catch(() => {
        if (isMounted) setSalesTeamUserList([]);
      })
      .finally(() => {
        if (isMounted) setSalesTeamUserListLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [debouncedSalesOwnerSearch]);

  const salesOwnerSelectOptions = useMemo(() => {
    if (salesTeamUserList.length === 0) return [];
    const eff = String(
      localChanges?.salesOwner !== undefined && localChanges?.salesOwner !== null
        ? localChanges.salesOwner
        : (account?.salesOwner ?? ''),
    ).trim();
    let base = [...salesTeamUserList];
    if (eff && !base.some((o) => o.value === eff)) {
      base = [{ value: eff, label: account?.salesOwner || eff }, ...base];
    }
    return [{ value: '__none__', label: '—' }, ...base];
  }, [salesTeamUserList, account?.salesOwner, localChanges?.salesOwner]);

  const parentCompanySelectOptions = useMemo(() => {
    if (!account) return [];
    const filtered = cpAccountOptions.filter((opt) => opt.value !== account.id);
    const eff = String(
      localChanges?.parentCompany !== undefined && localChanges?.parentCompany !== null
        ? localChanges.parentCompany
        : (account.parentCompany ?? ''),
    ).trim();
    if (!eff) return filtered;
    if (filtered.some((o) => o.value === eff)) return filtered;
    const found = cpAccountOptions.find((o) => o.value === eff);
    return found ? [found, ...filtered] : [{ value: eff, label: eff }, ...filtered];
  }, [cpAccountOptions, account, localChanges?.parentCompany]);

  const associateCompanySelectOptions = useMemo(() => {
    if (!account) return [];
    const filtered = cpAccountOptions.filter((opt) => opt.value !== account.id);
    const eff = String(
      localChanges?.associateCompany !== undefined && localChanges?.associateCompany !== null
        ? localChanges.associateCompany
        : (account.associateCompany ?? ''),
    ).trim();
    if (!eff) return filtered;
    if (filtered.some((o) => o.value === eff)) return filtered;
    const found = cpAccountOptions.find((o) => o.value === eff);
    return found ? [found, ...filtered] : [{ value: eff, label: eff }, ...filtered];
  }, [cpAccountOptions, account, localChanges?.associateCompany]);

  const effectiveOperationalCities = useMemo(() => {
    if (localChanges?.operationalCities !== undefined) {
      return Array.isArray(localChanges.operationalCities) ? localChanges.operationalCities : [];
    }
    return getOperationalCitiesFromRow(account);
  }, [localChanges?.operationalCities, account]);

  const effectiveOperationalState = useMemo(() => {
    if (localChanges?.operationalState !== undefined) {
      return String(localChanges.operationalState ?? '').trim();
    }
    return (
      String(account?.operationalState ?? '').trim() ||
      deriveOperationalStatesDisplay(effectiveOperationalCities)
    );
  }, [localChanges?.operationalState, account?.operationalState, effectiveOperationalCities]);

  if (!account) return null;

  const getFieldValue = (fieldName) => {
    const localValue = localChanges?.[fieldName];
    if (localValue !== undefined && localValue !== null) return localValue;
    return account?.[fieldName] ?? '';
  };

  const setLocalChange = (fieldName, value) => {
    setLocalChanges((previous) => ({ ...previous, [fieldName]: value }));
  };

  const handleAccountFieldChange = async (fieldName, value) => {
    const accountId = account?.id;
    if (!accountId) return;

    const currentValue = account?.[fieldName];
    const currentNormalized = String(currentValue ?? '');
    const newNormalized = String(value ?? '');

    if (currentNormalized === newNormalized) return;

    setLocalChange(fieldName, value);
    setIsSaving(true);
    try {
      const result = await updateCpAccountById(accountId, { [fieldName]: value });
      if (result?.error) {
        setLocalChange(fieldName, null);
        showErrorToast(result.error, {
          defaultMessage: 'Failed to update CP account. Please try again.',
        });
        return;
      }
      showSuccessToast('Updated successfully.');
      setLocalChanges((previous) => {
        const next = { ...previous };
        delete next[fieldName];
        return next;
      });
      await dispatch(fetchCpAccountDetail(accountId));
    } catch (error) {
      setLocalChange(fieldName, null);
      showErrorToast(error, {
        defaultMessage: 'Failed to update CP account. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOperationalLocationChange = async (nextCities) => {
    const accountId = account?.id;
    if (!accountId) return;

    const prevCities = getOperationalCitiesFromRow(account);
    const prevKey = prevCities.join('\x1F');
    const nextKey = (nextCities ?? []).join('\x1F');
    if (prevKey === nextKey) return;

    setLocalChange('operationalCities', nextCities ?? []);
    setLocalChange('operationalState', deriveOperationalStatesDisplay(nextCities));
    setIsSaving(true);
    try {
      const result = await updateCpAccountById(accountId, {
        operationalLocation: buildOperationalLocationPayload(nextCities),
      });
      if (result?.error) {
        setLocalChange('operationalCities', null);
        setLocalChange('operationalState', null);
        showErrorToast(result.error, {
          defaultMessage: 'Failed to update operational cities. Please try again.',
        });
        return;
      }
      showSuccessToast('Updated successfully.');
      setLocalChanges((previous) => {
        const next = { ...previous };
        delete next.operationalCities;
        delete next.operationalState;
        return next;
      });
      await dispatch(fetchCpAccountDetail(accountId));
    } catch (error) {
      setLocalChange('operationalCities', null);
      setLocalChange('operationalState', null);
      showErrorToast(error, {
        defaultMessage: 'Failed to update operational cities. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCpGstStatusChange = async (value) => {
    const accountId = account?.id;
    if (!accountId) return;

    const prior = normalizeCpGstStatus(getFieldValue('gstStatus') ?? account?.gstStatus ?? '');
    if (prior === value) return;

    const clearGstin = !gstStatusRequiresGstin(value);
    const payload = clearGstin ? { gstStatus: value, gstin: '' } : { gstStatus: value };

    setLocalChange('gstStatus', value);
    if (clearGstin) {
      setLocalChange('gstin', '');
      setStatutoryGstinError('');
    } else {
      const gstinVal = String(getFieldValue('gstin') ?? account?.gstin ?? '')
        .trim()
        .toUpperCase();
      const err = validateClientField('gstin', gstinVal, {
        gstStatus: value,
        custom_gst_status: value,
      });
      setStatutoryGstinError(err || '');
    }

    setIsSaving(true);
    try {
      const result = await updateCpAccountById(accountId, payload);
      if (result?.error) {
        setLocalChange('gstStatus', null);
        if (clearGstin) setLocalChange('gstin', null);
        showErrorToast(result.error, {
          defaultMessage: 'Failed to update CP account. Please try again.',
        });
        return;
      }
      showSuccessToast('Updated successfully.');
      setLocalChanges((previous) => {
        const next = { ...previous };
        delete next.gstStatus;
        if (clearGstin) delete next.gstin;
        return next;
      });
      await dispatch(fetchCpAccountDetail(accountId));
    } catch (error) {
      setLocalChange('gstStatus', null);
      if (clearGstin) setLocalChange('gstin', null);
      showErrorToast(error, {
        defaultMessage: 'Failed to update CP account. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const displayWebsite = account.website
    ? account.website.startsWith('http')
      ? account.website
      : `https://${account.website}`
    : '';
  const cpContacts = account.contacts ?? [];
  const contactAvatars = cpContacts.slice(0, CP_CONTACTS_AVATAR_DISPLAY_COUNT).map((c) => {
    const base = c.initials || c.name || c.email || '';
    const parts = String(base).trim().split(/\s+/).filter(Boolean);
    const chars = parts.map((p) => p[0]).join('');
    const initials = (chars || base || '–').slice(0, 2).toUpperCase();
    return { ...c, initials };
  });
  const contactOverflowCount = Math.max(0, cpContacts.length - CP_CONTACTS_AVATAR_DISPLAY_COUNT);

  if (section === 'basic') {
    const basicItems = [
      {
        label: 'Name',
        value: (
          <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
            <Input.Wrapper>
              <Input.Input
                value={getFieldValue('legalName') || ''}
                placeholder='Enter legal name'
                onChange={(e) => setLocalChange('legalName', e.target.value)}
                onBlur={(e) => handleAccountFieldChange('legalName', e.target.value.trim())}
                disabled={isSaving}
                className='text-label-sm text-text-main-900'
              />
            </Input.Wrapper>
          </Input.Root>
        ),
        editable: true,
      },

      {
        label: 'Sales Owner',
        value: (() => {
          const effectiveSalesOwner = String(
            getFieldValue('salesOwner') ?? account?.salesOwner ?? '',
          ).trim();
          const hasSalesOwner = effectiveSalesOwner.length > 0;
          const displayName =
            salesTeamUserList.find((o) => o.value === effectiveSalesOwner)?.label ??
            (hasSalesOwner ? account?.salesOwner : '');
          return (
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={hasSalesOwner ? effectiveSalesOwner : ''}
              valueSentinel='__none__'
              onValueChange={(v) => handleAccountFieldChange('salesOwner', v)}
              options={salesOwnerSelectOptions}
              disabled={isSaving || salesTeamUserListLoading}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage='No sales owners found'
              emptyMessage={
                salesTeamUserListLoading
                  ? 'Loading...'
                  : salesTeamUserList.length === 0
                    ? 'No options'
                    : 'No sales owners available'
              }
              onSearchQueryChange={setSalesOwnerSearchQuery}
              triggerClassName='w-full -ml-2 h-auto py-0'
              renderTrigger={() => <SalesOwnerDisplay name={displayName} />}
            />
          );
        })(),
        editable: true,
      },
      {
        label: 'CP Contacts',
        value:
          cpContacts.length > 0 ? (
            <AvatarGroup.Root size={24}>
              {contactAvatars.map((c, i) => (
                <Tooltip.Root size='xsmall' key={c.id || i}>
                  <Tooltip.Trigger asChild>
                    <span className='inline-flex'>
                      <CrmAccountAvatar name={c.name || c.email || c.id} index={i} size={24} />
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content size='xsmall' side='bottom'>
                    {c.name || c.email || '–'}
                  </Tooltip.Content>
                </Tooltip.Root>
              ))}
              {contactOverflowCount > 0 && (
                <AvatarGroup.Overflow size={24}>+{contactOverflowCount}</AvatarGroup.Overflow>
              )}
            </AvatarGroup.Root>
          ) : null,
        editable: false,
      },
      {
        label: 'Year of Est.',
        value: (
          <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
            <Input.Wrapper>
              <Input.Input
                value={getFieldValue('yearOfEstablishment') || ''}
                placeholder='Enter year'
                inputMode='numeric'
                maxLength={4}
                onChange={(e) => {
                  const digits = e.target.value.replaceAll(/\D/g, '').slice(0, 4);
                  setLocalChange('yearOfEstablishment', digits);
                }}
                onBlur={(e) =>
                  handleAccountFieldChange(
                    'yearOfEstablishment',
                    e.target.value.replaceAll(/\D/g, '').slice(0, 4).trim(),
                  )
                }
                disabled={isSaving}
                className='text-label-sm text-text-main-900'
              />
            </Input.Wrapper>
          </Input.Root>
        ),
        editable: true,
      },
      {
        label: 'Industry',
        value: (
          <SearchableSelect
            variant='borderless'
            value={getFieldValue('industry') ?? account?.industry ?? ''}
            onValueChange={(value) => handleAccountFieldChange('industry', value)}
            size='xsmall'
            matchTriggerWidth={false}
            disabled={isSaving || industryOptionsLoading}
            options={flattenedIndustryOptions}
            placeholder='--'
            searchPlaceholder='Search industry...'
            noResultsMessage='No industries found'
            emptyMessage='No industries available'
            triggerClassName='w-full -ml-2 h-auto py-0'
            renderTrigger={() => (
              <span className='text-label-sm text-text-main-900'>
                {industryLabelByValue.get(getFieldValue('industry') ?? account?.industry) ??
                  getFieldValue('industry') ??
                  account?.industry ??
                  '--'}
              </span>
            )}
            renderOptionLabel={(opt) => (
              <div className='flex flex-col items-start gap-0.5'>
                <span className='text-paragraph-xs font-medium text-text-soft-400'>
                  {opt.groupLabel}
                </span>
                <span className='paragraph-small text-text-strong-950 leading-snug whitespace-normal break-words text-left'>
                  {opt.label}
                </span>
              </div>
            )}
          />
        ),
        editable: true,
      },
      {
        label: 'Parent Company',
        value: (
          <SearchableSelect
            variant='borderless'
            size='xsmall'
            matchTriggerWidth={false}
            showArrow={false}
            value={getFieldValue('parentCompany') ?? account?.parentCompany ?? ''}
            onValueChange={(v) => handleAccountFieldChange('parentCompany', v)}
            options={parentCompanySelectOptions}
            disabled={isSaving || cpAccountOptionsLoading}
            placeholder='--'
            searchPlaceholder='Search...'
            noResultsMessage='No parent companies found'
            emptyMessage={
              cpAccountOptionsLoading
                ? 'Loading...'
                : parentCompanySelectOptions.length === 0
                  ? 'No options'
                  : 'No parent companies available'
            }
            onSearchQueryChange={setCpAccountSearchQuery}
            triggerClassName='w-full -ml-2 h-auto py-0'
          />
        ),
        editable: true,
      },
      {
        label: 'Associate Company',
        value: (
          <SearchableSelect
            variant='borderless'
            size='xsmall'
            matchTriggerWidth={false}
            showArrow={false}
            value={getFieldValue('associateCompany') ?? account?.associateCompany ?? ''}
            onValueChange={(v) => handleAccountFieldChange('associateCompany', v)}
            options={associateCompanySelectOptions}
            disabled={isSaving || cpAccountOptionsLoading}
            placeholder='--'
            searchPlaceholder='Search...'
            noResultsMessage='No associate companies found'
            emptyMessage={
              cpAccountOptionsLoading
                ? 'Loading...'
                : associateCompanySelectOptions.length === 0
                  ? 'No options'
                  : 'No associate companies available'
            }
            onSearchQueryChange={setCpAccountSearchQuery}
            triggerClassName='w-full -ml-2 h-auto py-0'
          />
        ),
        editable: true,
      },
      {
        label: 'Website',
        value: (
          <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
            <Input.Wrapper>
              <Input.Input
                value={getFieldValue('website') || ''}
                placeholder='Enter website'
                onChange={(e) => {
                  const value = e.target.value;
                  setLocalChange('website', value);
                  onFieldDraftChange?.('website', value);
                }}
                onBlur={(e) => handleAccountFieldChange('website', e.target.value.trim())}
                disabled={isSaving}
                className='text-label-sm text-text-main-900'
              />
            </Input.Wrapper>
          </Input.Root>
        ),
        editable: true,
      },
      {
        label: 'Employees Head Count',
        value: (
          <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
            <Input.Wrapper>
              <Input.Input
                value={getFieldValue('noOfEmployees') || ''}
                placeholder='0'
                onChange={(e) => setLocalChange('noOfEmployees', e.target.value)}
                onBlur={(e) => handleAccountFieldChange('noOfEmployees', e.target.value.trim())}
                disabled={isSaving}
                className='text-label-sm text-text-main-900'
              />
            </Input.Wrapper>
          </Input.Root>
        ),
        editable: true,
      },
      {
        label: 'RERA Number',
        value: (
          <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
            <Input.Wrapper>
              <Input.Input
                value={getFieldValue('reraNumber') || ''}
                placeholder='Enter RERA ID'
                onChange={(e) => setLocalChange('reraNumber', e.target.value)}
                onBlur={(e) => handleAccountFieldChange('reraNumber', e.target.value.trim())}
                disabled={isSaving}
                className='text-label-sm text-text-main-900'
              />
            </Input.Wrapper>
          </Input.Root>
        ),
        editable: true,
      },
      {
        label: 'Operational City',
        value: (
          <CpOperationalCityField
            selectedCities={effectiveOperationalCities}
            onChange={handleOperationalLocationChange}
            disabled={isSaving}
          />
        ),
        editable: true,
      },
      {
        label: 'Operational State',
        value: (
          <CpOperationalStateDisplay
            operationalState={effectiveOperationalState}
            selectedCities={effectiveOperationalCities}
          />
        ),
        editable: false,
      },
    ];

    return (
      <>
        <div className='flex flex-col gap-8'>
          <DetailGrid items={basicItems} emptyPlaceholder={EMPTY_PLACEHOLDER} />

          <CpAccountAddressSection
            primaryAddress={
              primaryAddressRow ? primaryAddressRow.display || account.primaryAddress : ''
            }
            billingAddress={
              billingAddressRow ? billingAddressRow.display || account.billingAddress : ''
            }
            onEditAddress={handleEditCpAddress}
            canEditPrimary={Boolean(primaryAddressForModal?.name)}
            canEditBilling={Boolean(billingAddressForModal?.name)}
            canAddPrimary={!primaryAddressForModal}
            canAddBilling={!billingAddressForModal}
          />

          <div className='border-t border-stroke-soft-200' role='separator' />

          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-2'>
              <RiLinksLine className='size-5 text-text-sub-500 shrink-0' />
              <span className='text-base font-medium leading-6 text-text-sub-500'>
                Social Links
              </span>
            </div>
            <div className='flex flex-col gap-3'>
              <div className='flex items-center gap-2 rounded-lg bg-bg-weak-100 px-2.5 py-2'>
                <RiLinkedinBoxLine className='size-5 text-text-sub-500 shrink-0' />
                <Input.Root variant='borderless' size='xsmall' className='flex-1 min-w-0'>
                  <Input.Wrapper>
                    <Input.Input
                      value={getFieldValue('linkedin') || ''}
                      placeholder='LinkedIn URL'
                      onChange={(e) => setLocalChange('linkedin', e.target.value)}
                      onBlur={(e) => handleAccountFieldChange('linkedin', e.target.value.trim())}
                      disabled={isSaving}
                      className='paragraph-small text-text-sub-500 min-w-0'
                    />
                  </Input.Wrapper>
                </Input.Root>
                {getFieldValue('linkedin') ? (
                  <a
                    href={
                      String(getFieldValue('linkedin')).startsWith('http')
                        ? String(getFieldValue('linkedin'))
                        : `https://${String(getFieldValue('linkedin'))}`
                    }
                    target='_blank'
                    rel='noopener noreferrer'
                    className='shrink-0 inline-flex items-center justify-center p-1 text-primary-base hover:text-primary-dark'
                    aria-label='Open LinkedIn link'
                    title='Open link'
                  >
                    <RiExternalLinkLine size={16} />
                  </a>
                ) : null}
              </div>
              <div className='flex items-center gap-2 rounded-lg bg-bg-weak-100 px-2.5 py-2'>
                <RiInstagramLine className='size-5 text-text-sub-500 shrink-0' />
                <Input.Root variant='borderless' size='xsmall' className='flex-1 min-w-0'>
                  <Input.Wrapper>
                    <Input.Input
                      value={getFieldValue('instagram') || ''}
                      placeholder='Instagram URL'
                      onChange={(e) => setLocalChange('instagram', e.target.value)}
                      onBlur={(e) => handleAccountFieldChange('instagram', e.target.value.trim())}
                      disabled={isSaving}
                      className='paragraph-small text-text-sub-500 min-w-0'
                    />
                  </Input.Wrapper>
                </Input.Root>
                {getFieldValue('instagram') ? (
                  <a
                    href={
                      String(getFieldValue('instagram')).startsWith('http')
                        ? String(getFieldValue('instagram'))
                        : `https://${String(getFieldValue('instagram'))}`
                    }
                    target='_blank'
                    rel='noopener noreferrer'
                    className='shrink-0 inline-flex items-center justify-center p-1 text-primary-base hover:text-primary-dark'
                    aria-label='Open Instagram link'
                    title='Open link'
                  >
                    <RiExternalLinkLine size={16} />
                  </a>
                ) : null}
              </div>
              <div className='flex items-center gap-2 rounded-lg bg-bg-weak-100 px-2.5 py-2'>
                <RiFacebookCircleLine className='size-5 text-text-sub-500 shrink-0' />
                <Input.Root variant='borderless' size='xsmall' className='flex-1 min-w-0'>
                  <Input.Wrapper>
                    <Input.Input
                      value={getFieldValue('facebook') || ''}
                      placeholder='Facebook URL'
                      onChange={(e) => setLocalChange('facebook', e.target.value)}
                      onBlur={(e) => handleAccountFieldChange('facebook', e.target.value.trim())}
                      disabled={isSaving}
                      className='paragraph-small text-text-sub-500 min-w-0'
                    />
                  </Input.Wrapper>
                </Input.Root>
                {getFieldValue('facebook') ? (
                  <a
                    href={
                      String(getFieldValue('facebook')).startsWith('http')
                        ? String(getFieldValue('facebook'))
                        : `https://${String(getFieldValue('facebook'))}`
                    }
                    target='_blank'
                    rel='noopener noreferrer'
                    className='shrink-0 inline-flex items-center justify-center p-1 text-primary-base hover:text-primary-dark'
                    aria-label='Open Facebook link'
                    title='Open link'
                  >
                    <RiExternalLinkLine size={16} />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {(() => {
          const isAddingAddress =
            (editAddressType === 'primary' && !primaryAddressForModal) ||
            (editAddressType === 'billing' && !billingAddressForModal);
          const addressRowForType =
            editAddressType === 'primary' ? primaryAddressForModal : billingAddressForModal;
          if (!addressRowForType && !isAddingAddress) return null;
          return (
            <CpAccountEditAddressModal
              open={editAddressOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setEditAddressOpen(false);
                }
              }}
              primaryAddress={primaryAddressForModal}
              billingAddress={billingAddressForModal}
              addressType={editAddressType || 'primary'}
              isAdding={isAddingAddress}
              cpAccountName={account.id}
              onSuccess={handleCpAddressEditSuccess}
            />
          );
        })()}
      </>
    );
  }

  if (section === 'statutory') {
    const gstStatusRaw = getFieldValue('gstStatus') ?? account?.gstStatus ?? '';
    const gstStatusNormalized = normalizeCpGstStatus(gstStatusRaw);
    const gstStatusSelectValue = CP_GST_STATUS_OPTIONS.includes(gstStatusNormalized)
      ? gstStatusNormalized
      : '';
    const gstinRequired = gstStatusRequiresGstin(gstStatusSelectValue);

    const statutoryItems1 = [
      {
        label: 'Registration Number',
        value: (
          <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
            <Input.Wrapper>
              <Input.Input
                value={getFieldValue('registrationNumber') || ''}
                placeholder='Enter registration number'
                onChange={(e) => setLocalChange('registrationNumber', e.target.value)}
                onBlur={(e) =>
                  handleAccountFieldChange('registrationNumber', e.target.value.trim())
                }
                disabled={isSaving}
                className='text-label-sm text-text-main-900'
              />
            </Input.Wrapper>
          </Input.Root>
        ),
        editable: true,
      },
      {
        label: 'PAN Number',
        value: (
          <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
            <Input.Wrapper>
              <Input.Input
                value={getFieldValue('panNumber') || ''}
                placeholder='Enter PAN'
                onChange={(e) => setLocalChange('panNumber', e.target.value)}
                onBlur={(e) => handleAccountFieldChange('panNumber', e.target.value.trim())}
                disabled={isSaving}
                className='text-label-sm text-text-main-900'
              />
            </Input.Wrapper>
          </Input.Root>
        ),
        editable: true,
      },
      {
        label: 'TAN Number',
        value: (
          <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
            <Input.Wrapper>
              <Input.Input
                value={getFieldValue('tanNumber') || ''}
                placeholder='Enter TAN'
                onChange={(e) => setLocalChange('tanNumber', e.target.value)}
                onBlur={(e) => handleAccountFieldChange('tanNumber', e.target.value.trim())}
                disabled={isSaving}
                className='text-label-sm text-text-main-900'
              />
            </Input.Wrapper>
          </Input.Root>
        ),
        editable: true,
      },
      {
        label: 'GST Status',
        value: (
          <SearchableSelect
            variant='borderless'
            value={gstStatusSelectValue}
            onValueChange={(v) => handleCpGstStatusChange(v)}
            size='xsmall'
            matchTriggerWidth={false}
            disabled={isSaving}
            showArrow={false}
            options={CP_GST_STATUS_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
            placeholder='--'
            triggerClassName='w-full -ml-2 h-auto py-0 text-left'
            renderTrigger={() => (
              <span className='text-label-sm text-text-main-900'>
                {gstStatusSelectValue ||
                  (String(gstStatusRaw).trim() ? String(gstStatusRaw).trim() : '--')}
              </span>
            )}
          />
        ),
        editable: true,
      },
      {
        label: gstinRequired ? 'GSTIN *' : 'GSTIN',
        value: (
          <div className='flex flex-col gap-1'>
            <Input.Root
              variant='borderless'
              size='xsmall'
              className='-ml-2'
              hasError={Boolean(statutoryGstinError)}
            >
              <Input.Wrapper>
                <Input.Input
                  value={getFieldValue('gstin') || ''}
                  placeholder={gstinRequired ? 'Enter GSTIN (required)' : 'Enter GSTIN'}
                  onChange={(e) => {
                    setLocalChange('gstin', e.target.value.toUpperCase());
                    if (statutoryGstinError) setStatutoryGstinError('');
                  }}
                  onBlur={(e) => {
                    const trimmed = e.target.value.trim().toUpperCase();
                    const status = normalizeCpGstStatus(
                      getFieldValue('gstStatus') ?? account?.gstStatus ?? '',
                    );
                    if (!gstStatusRequiresGstin(status)) {
                      setStatutoryGstinError('');
                      void handleAccountFieldChange('gstin', trimmed);
                      return;
                    }
                    const err = validateClientField('gstin', trimmed, {
                      gstStatus: status,
                      custom_gst_status: status,
                    });
                    if (err) {
                      setStatutoryGstinError(err);
                      return;
                    }
                    setStatutoryGstinError('');
                    void handleAccountFieldChange('gstin', trimmed);
                  }}
                  disabled={isSaving || !gstinRequired}
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
            {statutoryGstinError ? (
              <span className='text-paragraph-xs text-error-base'>{statutoryGstinError}</span>
            ) : null}
          </div>
        ),
        editable: true,
      },
    ];
    const statutoryItems2 = [
      {
        label: 'MSME Registered',
        value: (
          <SearchableSelect
            variant='borderless'
            value={getFieldValue('msmeRegistered') ?? account?.msmeRegistered ?? ''}
            onValueChange={(value) => {
              setLocalChange('msmeRegistered', value);
              handleAccountFieldChange('msmeRegistered', value);
            }}
            size='xsmall'
            matchTriggerWidth={false}
            disabled={isSaving}
            showArrow={false}
            options={[
              { value: 'Yes', label: 'Yes' },
              { value: 'No', label: 'No' },
            ]}
            placeholder='--'
            triggerClassName='w-full -ml-2 h-auto py-0 text-left'
            renderTrigger={() => (
              <span className='text-label-sm text-text-main-900'>
                {getFieldValue('msmeRegistered') || account?.msmeRegistered || '--'}
              </span>
            )}
          />
        ),
        editable: true,
      },
      {
        label: 'PF Available',
        value: (
          <SearchableSelect
            variant='borderless'
            value={getFieldValue('pfAvailable') ?? account?.pfAvailable ?? ''}
            onValueChange={(value) => {
              setLocalChange('pfAvailable', value);
              handleAccountFieldChange('pfAvailable', value);
            }}
            size='xsmall'
            matchTriggerWidth={false}
            disabled={isSaving}
            showArrow={false}
            options={[
              { value: 'Yes', label: 'Yes' },
              { value: 'No', label: 'No' },
            ]}
            placeholder='--'
            triggerClassName='w-full -ml-2 h-auto py-0 text-left'
            renderTrigger={() => (
              <span className='text-label-sm text-text-main-900'>
                {getFieldValue('pfAvailable') || account?.pfAvailable || '--'}
              </span>
            )}
          />
        ),
        editable: true,
      },
      {
        label: 'ESI Available',
        value: (
          <SearchableSelect
            variant='borderless'
            value={getFieldValue('esiAvailable') ?? account?.esiAvailable ?? ''}
            onValueChange={(value) => {
              setLocalChange('esiAvailable', value);
              handleAccountFieldChange('esiAvailable', value);
            }}
            size='xsmall'
            matchTriggerWidth={false}
            disabled={isSaving}
            showArrow={false}
            options={[
              { value: 'Yes', label: 'Yes' },
              { value: 'No', label: 'No' },
            ]}
            placeholder='--'
            triggerClassName='w-full -ml-2 h-auto py-0 text-left'
            renderTrigger={() => (
              <span className='text-label-sm text-text-main-900'>
                {getFieldValue('esiAvailable') || account?.esiAvailable || '--'}
              </span>
            )}
          />
        ),
        editable: true,
      },
      {
        label: 'Professional Tax',
        value: (
          <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
            <Input.Wrapper>
              <Input.Input
                value={getFieldValue('professionalTax') || ''}
                placeholder='Enter professional tax details'
                onChange={(e) => setLocalChange('professionalTax', e.target.value)}
                onBlur={(e) => handleAccountFieldChange('professionalTax', e.target.value.trim())}
                disabled={isSaving}
                className='text-label-sm text-text-main-900'
              />
            </Input.Wrapper>
          </Input.Root>
        ),
        editable: true,
      },
    ];

    return (
      <div className='flex flex-col w-full'>
        <div className='flex items-center gap-2 h-8 mb-4'>
          <RiContactsBook2Line className='size-5 text-text-sub-500 shrink-0' />
          <span className='text-base font-medium leading-6 text-text-sub-500'>
            Statutory & Compliance Details
          </span>
        </div>
        <div className='flex flex-col gap-5'>
          <DetailGrid items={statutoryItems1} emptyPlaceholder={EMPTY_PLACEHOLDER} />
          <div className='border-t border-stroke-soft-200' role='separator' />
          <DetailGrid items={statutoryItems2} emptyPlaceholder={EMPTY_PLACEHOLDER} />
        </div>
      </div>
    );
  }

  if (section === 'bank') {
    return (
      <CpAccountAboutBank
        account={account}
        banks={account?.custom_bank_details || account?.bankDetails || []}
        onAddBank={onAddBank}
        onUpdateBank={onUpdateBank}
        onDeleteBank={onDeleteBank}
      />
    );
  }

  if (ACCOUNT_RESEARCH_SIDEBAR_KEYS.includes(section)) {
    return <AccountResearchPanels activeSidebarItem={section} account={account} />;
  }

  return null;
};

export default CpAccountAboutContent;
