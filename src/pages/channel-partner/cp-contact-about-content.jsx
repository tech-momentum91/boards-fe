import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCenterAccess } from '@/redux/centerSlice';
import {
  RiLinksLine,
  RiLinkedinBoxLine,
  RiInstagramLine,
  RiFacebookCircleLine,
  RiExternalLinkLine,
  RiCalendarLine,
  RiSearchLine,
} from 'react-icons/ri';
import * as Avatar from '@/components/ui/avatar';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Label from '@/components/ui/label';
import * as Badge from '@/components/ui/badge';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import { Datepicker } from '@/components/ui/datepicker';
import { PhoneInputController } from '@/components/ui/phone-input';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import {
  amountToEditString,
  buildCpContactTableUpdatePayload,
  formatAmount,
  normalizeAmountSaveValue,
} from './cp-contact-field-utils';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { MultiSelect } from '@/components/ui/multi-select';
import { INDIA_CITY_OPTIONS } from '@/components/crm-leads/constants';
import { getCpContactsList, updateCpContactById } from '@/services/cp-contacts-service';
import { getCpAccountsList } from '@/services/cp-accounts-service';
import { getCpContactOptions } from '@/api/crmContacts';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { fetchCpContactDetail } from '@/redux/cpContactSlices';
import { parseToDate } from '@/utils/date-utils';
import { format } from 'date-fns';
import apiClient from '@/api/axios';
import { getSalesTeamUserList } from '@/api/crmAccounts';
import { useDebounce } from '@/hooks/use-debounce';

// Match CP Account detail placeholder style.
const EMPTY_PLACEHOLDER = '--';
const LINK_OPTIONS_PAGE_SIZE = 500;
const LINK_OPTIONS_SEARCH_DEBOUNCE_MS = 300;

const CRM_STAGES_API =
  '/method/devx.devx_crm.doctype.crm_status_master.crm_status_master.get_crm_stages';

function unwrapFrappeMessage(response) {
  return response?.data?.message ?? response?.data;
}

/** Map contact-options API rows to { value, label }. */
function normalizeCrmSelectOptions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (item == null) return null;
      if (typeof item === 'string') {
        const s = item.trim();
        return s ? { value: s, label: s } : null;
      }
      const value = String(item.value ?? item.name ?? '').trim();
      const label = String(item.label ?? item.designation ?? item.department ?? value).trim();
      if (!value && !label) return null;
      const v = value || label;
      return { value: v, label: label || v };
    })
    .filter(Boolean);
}

/** Keep a saved value visible if it is missing from the master list (legacy / custom values). */
function withCurrentOptionIfMissing(baseOptions, currentValue) {
  const v = String(currentValue ?? '').trim();
  if (!v) return baseOptions;
  const has = baseOptions.some((o) => String(o?.value ?? '') === v);
  if (has) return baseOptions;
  return [...baseOptions, { value: v, label: v }];
}

const LOST_REASON_OPTIONS = [
  { value: 'No Response', label: 'No Response' },
  { value: 'Budget Issue', label: 'Budget Issue' },
  { value: 'Moved to Competitor', label: 'Moved to Competitor' },
  { value: 'Not Interested', label: 'Not Interested' },
  { value: 'Other', label: 'Other' },
];

function formatDobWithAge(dobInput, ageInput) {
  const date = parseToDate(dobInput);
  const dob = date ? format(date, 'do MMM yyyy') : dobInput ? String(dobInput) : '';
  const ageRaw = ageInput == null ? '' : String(ageInput);
  const age = ageRaw ? (/\byears?\b/i.test(ageRaw) ? ageRaw : `${ageRaw} Years`) : '';
  if (dob && age) return `${dob} (${age})`;
  return dob || age || '';
}

function joinFullName(firstName, lastName) {
  return [String(firstName ?? '').trim(), String(lastName ?? '').trim()].filter(Boolean).join(' ');
}

/** First token → firstName; rest → lastName (matches common CRM “full name” editing). */
function splitFullName(full) {
  const s = String(full ?? '').trim();
  if (!s) return { firstName: '', lastName: '' };
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

const FieldLabel = ({ children }) => (
  <label className='text-paragraph-sm opacity-72 text-text-sub-500 font-normal'>{children}</label>
);

const FieldValue = ({ children, className = '' }) => (
  <span className={`text-label-sm text-text-main-900 font-medium ${className}`}>
    {children || '--'}
  </span>
);

const SalesOwnerDisplay = ({ name }) => (
  <div className='flex items-center gap-2 py-0.5'>
    {name ? (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className='inline-flex items-center'>
            <CrmAccountAvatar name={name} variant='weak' size={28} showNativeTitle={false} />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content side='top' align='center' sideOffset={4}>
          {name}
        </Tooltip.Content>
      </Tooltip.Root>
    ) : (
      <FieldValue>--</FieldValue>
    )}
  </div>
);

/**
 * Renders About CP Contact content. Single section: Basic Details (editable like CP Account About).
 */
const CpContactAboutContent = ({ section, contact }) => {
  const dispatch = useDispatch();
  const [localChanges, setLocalChanges] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLifecycleEditOpen, setIsLifecycleEditOpen] = useState(false);
  const [lifecycleStages, setLifecycleStages] = useState([]);
  const [lifecycleStagesLoading, setLifecycleStagesLoading] = useState(false);
  const [draftLifecycleStage, setDraftLifecycleStage] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [draftLostReason, setDraftLostReason] = useState('');
  const [salesTeamUserList, setSalesTeamUserList] = useState([]);
  const [salesTeamUserListLoading, setSalesTeamUserListLoading] = useState(false);
  const [salesOwnerSearchQuery, setSalesOwnerSearchQuery] = useState('');
  const debouncedSalesOwnerSearch = useDebounce(
    salesOwnerSearchQuery,
    LINK_OPTIONS_SEARCH_DEBOUNCE_MS,
  );
  const [cpAccountOptions, setCpAccountOptions] = useState([]);
  const [cpAccountsLoading, setCpAccountsLoading] = useState(false);
  const [cpAccountSearchQuery, setCpAccountSearchQuery] = useState('');
  const debouncedCpAccountSearch = useDebounce(
    cpAccountSearchQuery,
    LINK_OPTIONS_SEARCH_DEBOUNCE_MS,
  );
  const [crmDesignationOptions, setCrmDesignationOptions] = useState([]);
  const [crmDepartmentOptions, setCrmDepartmentOptions] = useState([]);
  const [crmFieldOptionsLoading, setCrmFieldOptionsLoading] = useState(false);
  const [reportingManagerOptions, setReportingManagerOptions] = useState([]);
  const [reportingManagerLoading, setReportingManagerLoading] = useState(false);
  const [reportingManagerSearchQuery, setReportingManagerSearchQuery] = useState('');
  const debouncedReportingManagerSearch = useDebounce(
    reportingManagerSearchQuery,
    LINK_OPTIONS_SEARCH_DEBOUNCE_MS,
  );
  const reportingManagerSearchInputRef = useRef(null);

  const centerAccess = useSelector(selectCenterAccess);
  const centers = useMemo(
    () => (Array.isArray(centerAccess?.selectedCenters) ? centerAccess.selectedCenters : []),
    [centerAccess?.selectedCenters],
  );

  useEffect(() => {
    setLocalChanges({});
    setIsLifecycleEditOpen(false);
    setDraftLifecycleStage('');
    setDraftStatus('');
    setDraftLostReason('');
  }, [contact?.id]);

  const lifecycleStage = contact?.lifecycleStage ?? '';

  const stageOptions = useMemo(() => {
    if (Array.isArray(lifecycleStages) && lifecycleStages.length > 0) {
      return lifecycleStages.map((s) => ({ value: s.name, label: s.stage || s.name }));
    }
    return [];
  }, [lifecycleStages]);

  const stageStatusOptions = useMemo(() => {
    const stageName = draftLifecycleStage || lifecycleStage;
    const selected = lifecycleStages.find((s) => s.name === stageName);
    const list = selected?.crm_stage_status ?? [];
    return Array.isArray(list)
      ? list
          .map((s) =>
            s?.status
              ? { value: (s.name || s.status || '').trim(), label: (s.status || '').trim() }
              : null,
          )
          .filter(Boolean)
      : [];
  }, [lifecycleStages, draftLifecycleStage, lifecycleStage]);

  const needsLostReason = useMemo(() => {
    const v = (draftStatus || '').toString().trim().toLowerCase();
    return v.includes('drop') || v === 'dropped' || v === 'lost';
  }, [draftStatus]);

  useEffect(() => {
    // Load CRM stages for lifecycle edit popover
    let isMounted = true;
    setLifecycleStagesLoading(true);
    apiClient
      .get(CRM_STAGES_API)
      .then((response) => {
        const message = unwrapFrappeMessage(response);
        const list = Array.isArray(message) ? message : (message?.results ?? []);
        if (isMounted) setLifecycleStages(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (isMounted) setLifecycleStages([]);
      })
      .finally(() => {
        if (isMounted) setLifecycleStagesLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setSalesTeamUserListLoading(true);
    getSalesTeamUserList({
      keyword: debouncedSalesOwnerSearch.trim() || undefined,
      pageSize: LINK_OPTIONS_PAGE_SIZE,
    })
      .then((list) => {
        const raw = Array.isArray(list) ? list : (list?.results ?? list?.message ?? []);
        const arr = Array.isArray(raw) ? raw : [];
        const options = arr
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

  useEffect(() => {
    if (centers.length === 0) {
      setCpAccountOptions([]);
      return;
    }
    let isMounted = true;
    setCpAccountsLoading(true);
    getCpAccountsList({
      centers,
      type: 'all',
      search: debouncedCpAccountSearch.trim(),
    })
      .then((result) => {
        if (result.error || !isMounted) {
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
        if (isMounted) setCpAccountsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [centers, debouncedCpAccountSearch]);

  useEffect(() => {
    let isMounted = true;
    setCrmFieldOptionsLoading(true);
    getCpContactOptions()
      .then((opts) => {
        if (!isMounted) return;
        setCrmDesignationOptions(normalizeCrmSelectOptions(opts?.designation));
        setCrmDepartmentOptions(normalizeCrmSelectOptions(opts?.department));
      })
      .catch(() => {
        if (isMounted) {
          setCrmDesignationOptions([]);
          setCrmDepartmentOptions([]);
        }
      })
      .finally(() => {
        if (isMounted) setCrmFieldOptionsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedCpAccountId = localChanges.associateAccount ?? contact?.cpAccountId ?? '';

  useEffect(() => {
    if (!contact?.id || !selectedCpAccountId) {
      setReportingManagerOptions([]);
      return;
    }

    let isMounted = true;
    setReportingManagerLoading(true);
    getCpContactsList({
      centers,
      cpAccount: [selectedCpAccountId],
      search: debouncedReportingManagerSearch.trim(),
    })
      .then((result) => {
        if (!isMounted) return;
        if (result.error) {
          setReportingManagerOptions([]);
          return;
        }

        const options = (result.data ?? [])
          .filter((item) => String(item.id ?? '') !== String(contact.id))
          .map((item) => {
            const value = String(item.id ?? '').trim();
            const label = String(item.name ?? value).trim();
            return value ? { value, label: label || value } : null;
          })
          .filter(Boolean);
        setReportingManagerOptions(options);
      })
      .catch(() => {
        if (isMounted) setReportingManagerOptions([]);
      })
      .finally(() => {
        if (isMounted) setReportingManagerLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [centers, contact?.id, selectedCpAccountId, debouncedReportingManagerSearch]);

  if (!contact) return null;

  const getFieldValue = (fieldName) => {
    const localValue = localChanges?.[fieldName];
    if (localValue !== undefined && localValue !== null) return localValue;
    if (fieldName === 'associateAccount') return contact?.cpAccountId ?? '';
    if (fieldName === 'fullName') return joinFullName(contact?.firstName, contact?.lastName);
    return contact?.[fieldName] ?? '';
  };

  const setLocalChange = (fieldName, value) => {
    setLocalChanges((previous) => ({ ...previous, [fieldName]: value }));
  };

  const getAmountFieldInputValue = (fieldName) => {
    const localValue = localChanges?.[fieldName];
    if (localValue !== undefined && localValue !== null) return String(localValue);
    const raw = contact?.[fieldName];
    const valueStr = amountToEditString(raw);
    if (valueStr === '') return '';
    return formatAmount(raw);
  };

  const handleContactFieldChange = async (fieldName, value) => {
    const contactId = contact?.id;
    if (!contactId) return;

    const currentValue =
      fieldName === 'associateAccount' ? contact?.cpAccountId : contact?.[fieldName];

    if (Array.isArray(value) || Array.isArray(currentValue)) {
      const curArr = Array.isArray(currentValue) ? currentValue : [];
      const newArr = Array.isArray(value) ? value : [];
      if (
        curArr.length === newArr.length &&
        [...curArr].sort().every((v, i) => v === [...newArr].sort()[i])
      )
        return;
    } else if (fieldName === 'openLeadsAmount' || fieldName === 'wonAmount') {
      const currentStr = amountToEditString(currentValue);
      const newStr = normalizeAmountSaveValue(value);
      if (currentStr === newStr) return;
    } else {
      const currentNormalized = String(currentValue ?? '');
      const newNormalized = String(value ?? '');
      if (currentNormalized === newNormalized) return;
    }

    const updatePayload =
      fieldName === 'openLeadsAmount' || fieldName === 'wonAmount'
        ? buildCpContactTableUpdatePayload(fieldName, value)
        : { [fieldName]: value };

    setLocalChange(fieldName, value);
    setIsSaving(true);
    try {
      const result = await updateCpContactById(contactId, updatePayload);
      if (result?.error) {
        setLocalChange(fieldName, null);
        showErrorToast(result.error, {
          defaultMessage: 'Failed to update CP contact. Please try again.',
        });
        return;
      }
      showSuccessToast('Updated successfully.');
      setLocalChanges((previous) => {
        const next = { ...previous };
        delete next[fieldName];
        return next;
      });
      await dispatch(fetchCpContactDetail(contactId));
    } catch (error) {
      setLocalChange(fieldName, null);
      showErrorToast(error, {
        defaultMessage: 'Failed to update CP contact. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFullNameBlur = async (rawValue) => {
    const contactId = contact?.id;
    if (!contactId) return;
    const full = String(rawValue ?? '').trim();
    const { firstName, lastName } = splitFullName(full);
    const curFirst = String(contact?.firstName ?? '').trim();
    const curLast = String(contact?.lastName ?? '').trim();
    if (firstName === curFirst && lastName === curLast) {
      setLocalChanges((prev) => {
        if (prev.fullName === undefined) return prev;
        const next = { ...prev };
        delete next.fullName;
        return next;
      });
      return;
    }
    setLocalChange('fullName', full);
    setIsSaving(true);
    try {
      const result = await updateCpContactById(contactId, { firstName, lastName });
      if (result?.error) {
        setLocalChange('fullName', null);
        showErrorToast(result.error, {
          defaultMessage: 'Failed to update CP contact. Please try again.',
        });
        return;
      }
      showSuccessToast('Updated successfully.');
      setLocalChanges((previous) => {
        const next = { ...previous };
        delete next.fullName;
        return next;
      });
      await dispatch(fetchCpContactDetail(contactId));
    } catch (error) {
      setLocalChange('fullName', null);
      showErrorToast(error, {
        defaultMessage: 'Failed to update CP contact. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const socialLinks = contact?.socialLinks ?? {};
  const designationOptions = withCurrentOptionIfMissing(
    crmDesignationOptions,
    String(getFieldValue('designation') ?? '').trim(),
  );
  const departmentOptions = withCurrentOptionIfMissing(
    crmDepartmentOptions,
    String(getFieldValue('department') ?? '').trim(),
  );
  const currentReportingManager = String(getFieldValue('reportingManager') ?? '').trim();
  const reportingManagerSelectOptions = reportingManagerOptions.some(
    (option) => String(option.value) === currentReportingManager,
  )
    ? reportingManagerOptions
    : currentReportingManager
      ? [
          ...reportingManagerOptions,
          {
            value: currentReportingManager,
            label: contact?.reportingManagerName || currentReportingManager,
          },
        ]
      : reportingManagerOptions;

  const rmSearchQ = reportingManagerSearchQuery.trim().toLowerCase();
  const filteredReportingManagerOptions = rmSearchQ
    ? reportingManagerSelectOptions.filter(
        (opt) =>
          String(opt.label ?? '')
            .toLowerCase()
            .includes(rmSearchQ) ||
          String(opt.value ?? '')
            .toLowerCase()
            .includes(rmSearchQ),
      )
    : reportingManagerSelectOptions;

  const currentAssociateAccountId = String(
    getFieldValue('associateAccount') ?? contact?.cpAccountId ?? '',
  ).trim();
  const associateCpAccountSelectOptions = cpAccountOptions.some(
    (o) => String(o.value) === currentAssociateAccountId,
  )
    ? cpAccountOptions
    : currentAssociateAccountId
      ? [
          ...cpAccountOptions,
          {
            value: currentAssociateAccountId,
            label: contact?.cpAccount || currentAssociateAccountId,
          },
        ]
      : cpAccountOptions;

  const cpContactSalesOwnerSelectOptions = [
    { value: '__none__', label: '—' },
    ...salesTeamUserList,
  ];

  const ageValue = getFieldValue('age');

  const persistLifecycleStage = async (nextStage) => {
    const contactId = contact?.id;
    if (!contactId) return;
    setIsSaving(true);
    try {
      const result = await updateCpContactById(contactId, { lifecycleStage: nextStage });
      if (result?.error) {
        showErrorToast(result.error, { defaultMessage: 'Failed to update lifecycle stage.' });
        return;
      }
      showSuccessToast('Updated successfully.');
      await dispatch(fetchCpContactDetail(contactId));
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to update lifecycle stage.' });
    } finally {
      setIsSaving(false);
    }
  };

  const persistStatusAndReason = async ({ status, lostReason }) => {
    const contactId = contact?.id;
    if (!contactId) return;
    setIsSaving(true);
    try {
      const result = await updateCpContactById(contactId, {
        status,
        lostReason,
      });
      if (result?.error) {
        showErrorToast(result.error, { defaultMessage: 'Failed to update status.' });
        return;
      }
      showSuccessToast('Updated successfully.');
      await dispatch(fetchCpContactDetail(contactId));
      setIsLifecycleEditOpen(false);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to update status.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (section === 'basic') {
    const getSocialValue = (key) => {
      const local = localChanges?.socialLinks?.[key];
      if (local !== undefined && local !== null) return local;
      return socialLinks?.[key] ?? '';
    };

    const setSocialLocal = (key, value) => {
      setLocalChanges((prev) => ({
        ...prev,
        socialLinks: { ...prev.socialLinks, [key]: value },
      }));
    };

    const handleSocialChange = async (key, value) => {
      const contactId = contact?.id;
      if (!contactId) return;
      const current = socialLinks?.[key] ?? '';
      if (String(value ?? '').trim() === String(current ?? '').trim()) return;
      setSocialLocal(key, value);
      setIsSaving(true);
      try {
        const result = await updateCpContactById(contactId, { [key]: (value ?? '').trim() });
        if (result?.error) {
          setLocalChanges((prev) => {
            const next = { ...prev };
            if (next.socialLinks) {
              next.socialLinks = { ...next.socialLinks };
              delete next.socialLinks[key];
            }
            return next;
          });
          showErrorToast(result.error, { defaultMessage: 'Failed to update.' });
          return;
        }
        showSuccessToast('Updated successfully.');
        setLocalChanges((prev) => {
          const next = { ...prev };
          if (next.socialLinks) {
            next.socialLinks = { ...next.socialLinks };
            delete next.socialLinks[key];
          }
          return next;
        });
        await dispatch(fetchCpContactDetail(contactId));
      } catch (error) {
        setLocalChanges((prev) => {
          const next = { ...prev };
          if (next.socialLinks) {
            next.socialLinks = { ...next.socialLinks };
            delete next.socialLinks[key];
          }
          return next;
        });
        showErrorToast(error, { defaultMessage: 'Failed to update.' });
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className='flex flex-col gap-8'>
        <div className='flex flex-col gap-6 py-6'>
          <div className='grid grid-cols-2 gap-x-12 gap-y-6'>
            {/* Single full name (stored as firstName + lastName on the server). */}
            <div className='col-span-2 flex flex-col gap-1.5'>
              <FieldLabel>Name</FieldLabel>
              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={getFieldValue('fullName')}
                      placeholder='Enter name'
                      onChange={(e) => setLocalChange('fullName', e.target.value)}
                      onBlur={(e) => handleFullNameBlur(e.target.value)}
                      disabled={isSaving}
                      className='text-label-sm text-text-main-900 font-medium'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            {/* Row 2: Email + Date of Birth */}
            <div className='flex flex-col gap-1.5'>
              <FieldLabel>Email</FieldLabel>
              <FieldValue>{contact?.email || EMPTY_PLACEHOLDER}</FieldValue>
            </div>
            <div className='flex flex-col gap-1.5'>
              <FieldLabel>Date of Birth</FieldLabel>
              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                <div className='flex items-center gap-2 min-w-0'>
                  <Datepicker
                    value={
                      parseToDate(getFieldValue('dateOfBirth') ?? contact?.dateOfBirth) ?? undefined
                    }
                    onChange={(date) => {
                      const value = date ? format(date, 'yyyy-MM-dd') : '';
                      setLocalChange('dateOfBirth', value);
                      handleContactFieldChange('dateOfBirth', value);
                    }}
                    disabled={isSaving}
                    placeholder='DD / MM / YYYY'
                    variant='stroke'
                    suffixIcon={<RiCalendarLine className='text-text-sub-400' />}
                    size='xsmall'
                    className='-ml-2 min-w-0 text-label-sm text-text-main-900'
                  />
                </div>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1.5'>
              <FieldLabel>Age</FieldLabel>
              <FieldValue>
                {ageValue
                  ? String(ageValue).includes('Year')
                    ? ageValue
                    : `${ageValue} Years`
                  : '--'}
              </FieldValue>
            </div>

            {/* Row 4: Mobile Number + Alt. Mobile Number */}
            <div className='flex flex-col gap-1.5'>
              <FieldLabel>Mobile Number</FieldLabel>
              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                <div className='-ml-2'>
                  <PhoneInputController
                    value={getFieldValue('mobileNumber') || ''}
                    onChange={(formattedValue) => setLocalChange('mobileNumber', formattedValue)}
                    inputProps={{
                      onBlur: (e) =>
                        handleContactFieldChange('mobileNumber', e?.target?.value?.trim?.() ?? ''),
                    }}
                    placeholder='Enter mobile number'
                    size='xsmall'
                    variant='borderless'
                    disabled={isSaving}
                  />
                </div>
              </EditableFieldWrapper>
            </div>
            <div className='flex flex-col gap-1.5'>
              <FieldLabel>Alt. Mobile Number</FieldLabel>
              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                <div className='-ml-2'>
                  <PhoneInputController
                    value={getFieldValue('altMobileNumber') || ''}
                    onChange={(formattedValue) => setLocalChange('altMobileNumber', formattedValue)}
                    inputProps={{
                      onBlur: (e) =>
                        handleContactFieldChange(
                          'altMobileNumber',
                          e?.target?.value?.trim?.() ?? '',
                        ),
                    }}
                    placeholder='Enter alt. mobile number'
                    size='xsmall'
                    variant='borderless'
                    disabled={isSaving}
                  />
                </div>
              </EditableFieldWrapper>
            </div>

            {/* Row 5: Associate CP Account + Sales Owner */}
            <div className='flex flex-col gap-1.5'>
              <FieldLabel>Associate CP Account</FieldLabel>
              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                <SearchableSelect
                  variant='borderless'
                  size='xsmall'
                  matchTriggerWidth={false}
                  showArrow={false}
                  value={getFieldValue('associateAccount') || contact?.cpAccountId || ''}
                  onValueChange={(v) => handleContactFieldChange('associateAccount', v)}
                  options={associateCpAccountSelectOptions}
                  disabled={isSaving || cpAccountsLoading}
                  placeholder='--'
                  searchPlaceholder='Search...'
                  noResultsMessage='No CP accounts found'
                  emptyMessage={
                    cpAccountsLoading
                      ? 'Loading...'
                      : associateCpAccountSelectOptions.length === 0
                        ? 'No CP accounts'
                        : 'No CP accounts available'
                  }
                  onSearchQueryChange={setCpAccountSearchQuery}
                  triggerClassName='w-full -ml-2 h-auto py-0'
                  renderTrigger={() => (
                    <FieldValue>
                      {cpAccountOptions?.find(
                        (o) =>
                          o.value === (getFieldValue('associateAccount') || contact?.cpAccountId),
                      )?.label ??
                        contact?.cpAccount ??
                        getFieldValue('associateAccount') ??
                        contact?.cpAccountId}
                    </FieldValue>
                  )}
                />
              </EditableFieldWrapper>
            </div>
            <div className='flex flex-col gap-1.5'>
              <FieldLabel>Sales Owner</FieldLabel>
              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                {(() => {
                  const effectiveSo = String(
                    getFieldValue('salesOwner') ?? contact?.salesOwner ?? '',
                  ).trim();
                  const hasSalesOwner = effectiveSo.length > 0;
                  const displayName =
                    salesTeamUserList.find(
                      (o) => o.value === (getFieldValue('salesOwner') ?? contact?.salesOwner),
                    )?.label ??
                    contact?.salesOwnerName ??
                    contact?.salesOwner;
                  return (
                    <SearchableSelect
                      variant='borderless'
                      size='xsmall'
                      matchTriggerWidth={false}
                      showArrow={false}
                      value={hasSalesOwner ? effectiveSo : ''}
                      valueSentinel='__none__'
                      onValueChange={(v) => handleContactFieldChange('salesOwner', v)}
                      options={cpContactSalesOwnerSelectOptions}
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
                })()}
              </EditableFieldWrapper>
            </div>
            <div className='flex flex-col gap-1.5'>
              <FieldLabel>Reporting Manager</FieldLabel>
              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                <SearchableSelect
                  value={getFieldValue('reportingManager') || ''}
                  valueSentinel='__none__'
                  onValueChange={(value) => handleContactFieldChange('reportingManager', value)}
                  size='xsmall'
                  variant='borderless'
                  disabled={isSaving || reportingManagerLoading || !selectedCpAccountId}
                  matchTriggerWidth={false}
                  options={[{ value: '__none__', label: '--' }, ...reportingManagerSelectOptions]}
                  placeholder='Select reporting manager'
                  searchPlaceholder='Search reporting manager...'
                  noResultsMessage='No reporting managers found'
                  emptyMessage={
                    reportingManagerLoading
                      ? 'Loading...'
                      : reportingManagerSelectOptions.length === 0
                        ? 'No options'
                        : 'No reporting managers available'
                  }
                  onSearchQueryChange={setReportingManagerSearchQuery}
                  triggerClassName='w-full -ml-2 h-auto py-0 text-left'
                  renderTrigger={() => (
                    <SalesOwnerDisplay
                      name={
                        reportingManagerSelectOptions.find(
                          (opt) => opt.value === (getFieldValue('reportingManager') || ''),
                        )?.label ||
                        contact?.reportingManagerName ||
                        ''
                      }
                    />
                  )}
                />
              </EditableFieldWrapper>
            </div>

            {/* Row 6: Designation + Department */}
            <div className='flex flex-col gap-1.5'>
              <FieldLabel>Designation</FieldLabel>
              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                <SearchableSelect
                  variant='borderless'
                  size='xsmall'
                  matchTriggerWidth={false}
                  showArrow={false}
                  value={String(getFieldValue('designation') ?? '').trim()}
                  valueSentinel='__none__'
                  onValueChange={(v) => handleContactFieldChange('designation', v)}
                  options={designationOptions}
                  disabled={isSaving || crmFieldOptionsLoading}
                  placeholder='--'
                  searchPlaceholder='Search...'
                  noResultsMessage='No designations found'
                  emptyMessage='No designations available'
                  triggerClassName='w-full -ml-2 h-auto py-0'
                  renderTrigger={() => (
                    <FieldValue>{getFieldValue('designation') || '--'}</FieldValue>
                  )}
                />
              </EditableFieldWrapper>
            </div>
            <div className='flex flex-col gap-1.5'>
              <FieldLabel>Department</FieldLabel>
              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                <SearchableSelect
                  variant='borderless'
                  size='xsmall'
                  matchTriggerWidth={false}
                  showArrow={false}
                  value={String(getFieldValue('department') ?? '').trim()}
                  valueSentinel='__none__'
                  onValueChange={(v) => handleContactFieldChange('department', v)}
                  options={departmentOptions}
                  disabled={isSaving || crmFieldOptionsLoading}
                  placeholder='--'
                  searchPlaceholder='Search...'
                  noResultsMessage='No departments found'
                  emptyMessage='No departments available'
                  triggerClassName='w-full -ml-2 h-auto py-0'
                  renderTrigger={() => (
                    <FieldValue>{getFieldValue('department') || '--'}</FieldValue>
                  )}
                />
              </EditableFieldWrapper>
            </div>

            {/* Row 7: City + Primary Contact */}
            <div className='flex flex-col gap-1.5'>
              <FieldLabel>City</FieldLabel>
              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                <div className='-ml-2'>
                  <MultiSelect
                    value={(() => {
                      const val = getFieldValue('city') ?? contact?.city;
                      if (Array.isArray(val)) return val;
                      if (typeof val === 'string' && val)
                        return val
                          .split(',')
                          .map((c) => c.trim())
                          .filter(Boolean);
                      return [];
                    })()}
                    onValueChange={(selected) => {
                      setLocalChange('city', selected);
                    }}
                    onBlur={(selected) => {
                      const prev = contact?.city ?? [];
                      const prevArr = Array.isArray(prev)
                        ? prev
                        : typeof prev === 'string'
                          ? prev
                              .split(',')
                              .map((c) => c.trim())
                              .filter(Boolean)
                          : [];
                      const same =
                        prevArr.length === selected.length &&
                        [...prevArr].sort().every((v, i) => v === [...selected].sort()[i]);
                      if (!same) {
                        handleContactFieldChange('city', selected);
                      }
                    }}
                    commitOnBlur
                    options={INDIA_CITY_OPTIONS}
                    placeholder='Select cities'
                    searchPlaceholder='Search cities...'
                    size='small'
                    enableSearch
                    enableVirtualization
                    className='!shadow-none !ring-0 !border-0 !bg-transparent !min-h-0 !py-0 !px-0'
                  />
                </div>
              </EditableFieldWrapper>
            </div>
            <div className='flex flex-col gap-1.5'>
              <FieldLabel>Primary Contact</FieldLabel>
              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                <SearchableSelect
                  value={
                    (getFieldValue('primaryContact') ?? contact?.primaryContact) ? 'true' : 'false'
                  }
                  onValueChange={(val) => {
                    const normalized = val === 'true';
                    setLocalChange('primaryContact', normalized);
                    handleContactFieldChange('primaryContact', normalized);
                  }}
                  size='xsmall'
                  variant='borderless'
                  disabled={isSaving}
                  matchTriggerWidth={false}
                  showArrow={false}
                  options={[
                    { value: 'true', label: 'Yes' },
                    { value: 'false', label: 'No' },
                  ]}
                  placeholder='Select'
                  triggerClassName='w-full -ml-2 h-auto py-0'
                  renderTrigger={() => (
                    <FieldValue>
                      {(getFieldValue('primaryContact') ?? contact?.primaryContact) ? 'Yes' : 'No'}
                    </FieldValue>
                  )}
                />
              </EditableFieldWrapper>
            </div>

            {/* Row 8: Open Leads Amount + Won Amount */}
            <div className='flex flex-col gap-1.5'>
              <FieldLabel>Open Leads Amount (₹)</FieldLabel>
              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={getAmountFieldInputValue('openLeadsAmount')}
                      placeholder='—'
                      onChange={(e) => setLocalChange('openLeadsAmount', e.target.value)}
                      onBlur={(e) =>
                        handleContactFieldChange(
                          'openLeadsAmount',
                          normalizeAmountSaveValue(e.target.value),
                        )
                      }
                      disabled={isSaving}
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>
            <div className='flex flex-col gap-1.5'>
              <FieldLabel>Won Amount (₹)</FieldLabel>
              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={getAmountFieldInputValue('wonAmount')}
                      placeholder='—'
                      onChange={(e) => setLocalChange('wonAmount', e.target.value)}
                      onBlur={(e) =>
                        handleContactFieldChange(
                          'wonAmount',
                          normalizeAmountSaveValue(e.target.value),
                        )
                      }
                      disabled={isSaving}
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className='border-t border-stroke-soft-200 pt-6' role='separator' />
        <div className='flex flex-col gap-3'>
          <div className='flex items-center gap-2'>
            <RiLinksLine className='size-5 text-text-sub-500 shrink-0' />
            <span className='text-base font-medium leading-6 text-text-sub-500'>Social Links</span>
          </div>
          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-2 rounded-lg bg-bg-weak-100 px-2.5 py-2'>
              <RiLinkedinBoxLine className='size-5 text-text-sub-500 shrink-0' />
              <Input.Root variant='borderless' size='xsmall' className='flex-1 min-w-0'>
                <Input.Wrapper>
                  <Input.Input
                    value={getSocialValue('linkedin')}
                    placeholder='LinkedIn URL'
                    onChange={(e) => setSocialLocal('linkedin', e.target.value)}
                    onBlur={(e) => handleSocialChange('linkedin', e.target.value.trim())}
                    disabled={isSaving}
                    className='paragraph-small text-text-sub-500 min-w-0'
                  />
                </Input.Wrapper>
              </Input.Root>
              {getSocialValue('linkedin') ? (
                <a
                  href={
                    String(getSocialValue('linkedin')).startsWith('http')
                      ? String(getSocialValue('linkedin'))
                      : `https://${String(getSocialValue('linkedin'))}`
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
                    value={getSocialValue('instagram')}
                    placeholder='Instagram URL'
                    onChange={(e) => setSocialLocal('instagram', e.target.value)}
                    onBlur={(e) => handleSocialChange('instagram', e.target.value.trim())}
                    disabled={isSaving}
                    className='paragraph-small text-text-sub-500 min-w-0'
                  />
                </Input.Wrapper>
              </Input.Root>
              {getSocialValue('instagram') ? (
                <a
                  href={
                    String(getSocialValue('instagram')).startsWith('http')
                      ? String(getSocialValue('instagram'))
                      : `https://${String(getSocialValue('instagram'))}`
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
                    value={getSocialValue('facebook')}
                    placeholder='Facebook URL'
                    onChange={(e) => setSocialLocal('facebook', e.target.value)}
                    onBlur={(e) => handleSocialChange('facebook', e.target.value.trim())}
                    disabled={isSaving}
                    className='paragraph-small text-text-sub-500 min-w-0'
                  />
                </Input.Wrapper>
              </Input.Root>
              {getSocialValue('facebook') ? (
                <a
                  href={
                    String(getSocialValue('facebook')).startsWith('http')
                      ? String(getSocialValue('facebook'))
                      : `https://${String(getSocialValue('facebook'))}`
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
    );
  }

  return null;
};

export default CpContactAboutContent;
