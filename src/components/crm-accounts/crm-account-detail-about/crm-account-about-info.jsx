import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { RiSearchLine } from 'react-icons/ri';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Select from '@/components/ui/select';
import { Datepicker } from '@/components/ui/datepicker';
import { parseToDate } from '@/utils/date-utils';
import * as Tooltip from '@/components/ui/tooltip';
import { Country, State, City } from 'country-state-city';
import {
  getCustomerGroupList,
  getIndustryTypeList,
  getSalesTeamUserList,
  getCrmAccountList,
  getCrmAccountContacts,
} from '@/api/crmAccounts';
import {
  getCpAccountOptions,
  getCpContactLinkOptions,
  getCpContactsForCpAccount,
  getCrmContactList,
} from '@/api/crmLeads';
import { getCrmContact, updateCrmContact } from '@/api/crmContacts';
import { getCpContactById } from '@/services/cp-contacts-service';
import { CrmAccountAvatar } from '../crm-account-avatar';
import { useCrmLeadSizeOptions } from '@/hooks/use-crm-lead-size-options';
import {
  mergeCurrentLinkOptions,
  useDebouncedLinkOptions,
} from '@/hooks/use-debounced-link-options';
import { buildLinkSelectOptions, findCityLocationInIndia } from '@/components/crm-leads/constants';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const FieldLabel = ({ children }) => (
  <label className='text-paragraph-sm opacity-72 text-text-sub-500'>{children}</label>
);

const FieldValue = ({ children, className = '' }) => (
  <span className={`text-label-sm text-text-main-900 ${className}`}>{children || '--'}</span>
);

/** Same avatar stack + tooltip behaviour as accounts table: 3 visible, then +N; light tooltip with avatar + name */
function ContactsAvatars({ list }) {
  const visible = list.slice(0, 3);
  const extra = list.length - visible.length;

  const renderContactsList = (contactsToShow) => (
    <div className='flex flex-col gap-3'>
      <span className='text-label-xs text-text-sub-500 font-medium'>Related contacts</span>
      {contactsToShow.map((contact, index) => {
        const name = contact?.full_name || contact?.name || '—';
        return (
          <div
            key={contact?.name ? `${contact.name}-${index}` : index}
            className='flex items-center gap-2 min-w-0'
          >
            <CrmAccountAvatar name={name} index={index} size={32} className='shrink-0' />
            <div className='flex flex-col min-w-0'>
              <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                {name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className='flex items-center'>
      {extra === 0 ? (
        <Tooltip.Root delayDuration={0}>
          <Tooltip.Trigger asChild>
            <span className='inline-flex items-center'>
              {visible.map((contact, i) => (
                <span
                  key={contact?.name ?? i}
                  className='inline-block ring-2 ring-white rounded-full'
                  style={{ marginLeft: i === 0 ? 0 : -8, zIndex: i }}
                >
                  <CrmAccountAvatar
                    name={contact?.full_name || contact?.name}
                    index={i}
                    size={24}
                  />
                </span>
              ))}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content side='top' variant='light' size='medium' className='max-w-[280px] p-3'>
            {renderContactsList(list)}
          </Tooltip.Content>
        </Tooltip.Root>
      ) : (
        <>
          {visible.map((contact, i) => {
            const name = contact?.full_name || contact?.name;
            return (
              <Tooltip.Root key={contact?.name ?? i}>
                <Tooltip.Trigger asChild>
                  <span
                    className='inline-block ring-2 ring-white rounded-full'
                    style={{ marginLeft: i === 0 ? 0 : -8, zIndex: i }}
                  >
                    <CrmAccountAvatar name={name} index={i} size={24} />
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content
                  side='top'
                  variant='light'
                  size='medium'
                  className='max-w-[280px] p-3'
                >
                  <div className='flex items-center gap-2 min-w-0'>
                    <CrmAccountAvatar name={name} index={i} size={32} className='shrink-0' />
                    <div className='flex flex-col min-w-0'>
                      <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                        {name || '—'}
                      </span>
                    </div>
                  </div>
                </Tooltip.Content>
              </Tooltip.Root>
            );
          })}
          <Tooltip.Root delayDuration={0}>
            <Tooltip.Trigger asChild>
              <span
                className='inline-block ring-2 ring-white rounded-full cursor-default'
                style={{ marginLeft: -8, zIndex: visible.length }}
              >
                <CrmAccountAvatar
                  name={`+${extra}`}
                  index={0}
                  initials={`+${extra}`}
                  size={24}
                  className='bg-neutral-200 text-neutral-700 shadow-[inset_0px_-8px_16px_0px_rgba(197,199,201,0.48)]'
                />
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content side='top' variant='light' size='medium' className='max-w-[280px] p-3'>
              {renderContactsList(list)}
            </Tooltip.Content>
          </Tooltip.Root>
        </>
      )}
    </div>
  );
}

const CrmAccountAboutInfo = ({ account, onFieldChange, onAddressUpdate }) => {
  const leadSizeOptions = useCrmLeadSizeOptions();
  const employeeHeadCountOptions = useMemo(
    () =>
      buildLinkSelectOptions(leadSizeOptions, account?.no_of_employees, account?.no_of_employees),
    [account?.no_of_employees, leadSizeOptions],
  );
  const [typeOfOrgOptions, setTypeOfOrgOptions] = useState([]);
  const [industryGroups, setIndustryGroups] = useState([]);
  const [industryOptionsLoading, setIndustryOptionsLoading] = useState(false);
  const [industrySearchQuery, setIndustrySearchQuery] = useState('');
  const industrySearchInputRef = useRef(null);
  const [contacts, setContacts] = useState([]);

  const fetchSalesOwnerOptions = useCallback(
    ({ keyword, pageSize }) => getSalesTeamUserList({ keyword, pageSize }),
    [],
  );
  const {
    options: salesOwnerOptions,
    setSearchQuery: setSalesOwnerSearchQuery,
    loadingMessage: salesOwnerLoadingMessage,
  } = useDebouncedLinkOptions(fetchSalesOwnerOptions);

  const fetchCrmAccountOptions = useCallback(
    ({ keyword, pageSize }) => getCrmAccountList({ keyword, pageSize }),
    [],
  );
  const {
    options: crmAccountOptions,
    setSearchQuery: setCrmAccountSearchQuery,
    loadingMessage: crmAccountLoadingMessage,
  } = useDebouncedLinkOptions(fetchCrmAccountOptions);

  const fetchCpAccountOptions = useCallback(
    ({ keyword, pageSize }) => getCpAccountOptions({ keyword, pageSize }),
    [],
  );
  const {
    options: cpAccountOptions,
    setSearchQuery: setCpAccountSearchQuery,
    loadingMessage: cpAccountLoadingMessage,
  } = useDebouncedLinkOptions(fetchCpAccountOptions);

  const cpAccountId = String(account?.cp_account ?? '').trim();
  const fetchCpContactOptions = useCallback(
    ({ keyword, pageSize }) =>
      cpAccountId
        ? getCpContactsForCpAccount(cpAccountId, { keyword, pageSize })
        : getCpContactLinkOptions({ keyword, pageSize }),
    [cpAccountId],
  );
  const {
    options: cpContactOptions,
    setSearchQuery: setCpContactSearchQuery,
    loadingMessage: cpContactLoadingMessage,
  } = useDebouncedLinkOptions(fetchCpContactOptions, { deps: [cpAccountId] });

  const fetchCrmContactOptions = useCallback(
    ({ keyword, pageSize }) => getCrmContactList({ keyword, pageSize }),
    [],
  );
  const {
    options: crmContactOptions,
    setSearchQuery: setCrmContactSearchQuery,
    loadingMessage: crmContactLoadingMessage,
  } = useDebouncedLinkOptions(fetchCrmContactOptions);

  useEffect(() => {
    getCustomerGroupList()
      .then(setTypeOfOrgOptions)
      .catch(() => setTypeOfOrgOptions([]));
  }, []);

  useEffect(() => {
    setCpContactSearchQuery('');
  }, [cpAccountId, setCpContactSearchQuery]);

  const crmContactSelectOptions = useMemo(() => {
    const linked = (Array.isArray(contacts) ? contacts : [])
      .map((contact) => {
        const value = String(contact?.name ?? '').trim();
        if (!value) return null;
        return {
          value,
          label: String(contact?.full_name || contact?.name || value).trim() || value,
        };
      })
      .filter(Boolean);
    return mergeCurrentLinkOptions(
      [...linked, ...crmContactOptions],
      linked.map((c) => c.value),
    );
  }, [contacts, crmContactOptions]);

  const salesOwnerSelectOptions = useMemo(
    () => mergeCurrentLinkOptions(salesOwnerOptions, account?.sales_owner),
    [salesOwnerOptions, account?.sales_owner],
  );

  const crmAccountSelectOptions = useMemo(() => {
    const current = [account?.parent_company, account?.associate_company].filter(Boolean);
    return mergeCurrentLinkOptions(crmAccountOptions, current);
  }, [crmAccountOptions, account?.parent_company, account?.associate_company]);

  const cpAccountSelectOptions = useMemo(
    () =>
      mergeCurrentLinkOptions(cpAccountOptions, account?.cp_account, {
        noneItem: { value: '__none__', label: '—' },
      }),
    [cpAccountOptions, account?.cp_account],
  );

  const cpContactSelectOptions = useMemo(
    () =>
      mergeCurrentLinkOptions(cpContactOptions, account?.cp_contact, {
        noneItem: { value: '__none__', label: '—' },
      }),
    [cpContactOptions, account?.cp_contact],
  );

  useEffect(() => {
    let isMounted = true;
    setIndustryOptionsLoading(true);
    getIndustryTypeList({ grouped: true, scope: 'crm' })
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

  const filteredIndustryGroups = useMemo(() => {
    const q = industrySearchQuery.trim().toLowerCase();
    if (!q) return industryGroups;
    return industryGroups
      .map((group) => {
        const names = Array.isArray(group.industry_name) ? group.industry_name : [];
        const groupMatch = String(group.label ?? '')
          .toLowerCase()
          .includes(q);
        const filteredNames = groupMatch
          ? names
          : names.filter(
              (opt) =>
                String(opt.label ?? '')
                  .toLowerCase()
                  .includes(q) ||
                String(opt.value ?? '')
                  .toLowerCase()
                  .includes(q),
            );
        if (filteredNames.length === 0) return null;
        return { ...group, industry_name: filteredNames };
      })
      .filter(Boolean);
  }, [industryGroups, industrySearchQuery]);

  useEffect(() => {
    if (!account?.name) {
      setContacts([]);
      return;
    }
    getCrmAccountContacts(account.name)
      .then(setContacts)
      .catch(() => setContacts([]));
  }, [account?.name]);

  const handleChange = (field, value) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const handleCrmContactChange = async (nextContactIds) => {
    const currentIds = contacts.map((c) => c.name);
    const toUnlink = currentIds.filter((id) => !nextContactIds.includes(id));
    const toLink = nextContactIds.filter((id) => !currentIds.includes(id));

    try {
      for (const contactId of toUnlink) {
        await updateCrmContact(contactId, { associate_account: '' });
      }

      for (const contactId of toLink) {
        await updateCrmContact(contactId, { associate_account: account.name });
      }

      const leadIdToPrefill = toLink[0] || nextContactIds[0];
      if (leadIdToPrefill) {
        const contactDetail = await getCrmContact(leadIdToPrefill);
        if (contactDetail) {
          if (contactDetail.sales_owner) {
            handleChange('sales_owner', contactDetail.sales_owner);
          }
          if (contactDetail.cp_account) {
            handleChange('cp_account', contactDetail.cp_account);
          }
          if (contactDetail.cp_contact) {
            handleChange('cp_contact', contactDetail.cp_contact);
          }
          if (contactDetail.city) {
            const location = findCityLocationInIndia(contactDetail.city);
            if (location && onAddressUpdate) {
              const countryName =
                Country.getCountryByCode(location.country)?.name || location.country;
              const stateName =
                State.getStateByCodeAndCountry(location.state, location.country)?.name ||
                location.state;
              await onAddressUpdate('primary', {
                address_line1: account?.primary_address?.address_line1 || '',
                address_line2: account?.primary_address?.address_line2 || '',
                city: location.city,
                state: stateName,
                country: countryName,
                pin_code: account?.primary_address?.pin_code || '',
              });
            }
          }
          if (contactDetail.linkedin) {
            handleChange('linkedin', contactDetail.linkedin);
          }
          if (contactDetail.facebook) {
            handleChange('facebook', contactDetail.facebook);
          }
          if (contactDetail.instagram) {
            handleChange('instagram', contactDetail.instagram);
          }
        }
      }

      if (account?.name) {
        const updated = await getCrmAccountContacts(account.name);
        setContacts(updated);
      }
      showSuccessToast('CRM Contact updated successfully');
    } catch (error) {
      console.error('Failed to update CRM contact link', error);
      showErrorToast('Failed to update CRM Contact');
    }
  };

  return (
    <div className='flex flex-col gap-5 py-5'>
      {/* Row 1: Account Name */}
      <div className='flex gap-3'>
        <div className='flex flex-1 flex-col gap-1'>
          <FieldLabel>Account Name</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={account?.legal_name || ''}
                  onChange={(e) => handleChange('legal_name', e.target.value)}
                  placeholder='Enter account name'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>
      </div>

      {/* Row 2: Sales Owner + CRM Contact — Sales Owner: show name, value = email */}
      <div className='flex gap-3'>
        <div className='flex flex-1 flex-col gap-1'>
          <FieldLabel>Sales Owner</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <Tooltip.Root delayDuration={0}>
              <Tooltip.Trigger asChild>
                <div className='inline-flex w-full min-w-0'>
                  <SearchableSelect
                    id='sales_owner'
                    value={account?.sales_owner || undefined}
                    onValueChange={(value) => handleChange('sales_owner', value)}
                    options={salesOwnerSelectOptions}
                    variant='borderless'
                    size='xsmall'
                    matchTriggerWidth={false}
                    triggerClassName='w-full -ml-2'
                    placeholder='Select Sales owner'
                    searchPlaceholder='Search sales owner...'
                    emptyMessage={salesOwnerLoadingMessage || 'No sales owners available'}
                    noResultsMessage={salesOwnerLoadingMessage || 'No sales owners found'}
                    onSearchQueryChange={setSalesOwnerSearchQuery}
                    renderTrigger={({ selectedLabel }) => {
                      if (!selectedLabel)
                        return (
                          <span className='paragraph-small text-text-sub-500'>
                            Select Sales owner
                          </span>
                        );
                      return (
                        <div className='flex items-center gap-2 py-0.5'>
                          <CrmAccountAvatar name={selectedLabel} size={28} />
                        </div>
                      );
                    }}
                  />
                </div>
              </Tooltip.Trigger>
              {account?.sales_owner ? (
                <Tooltip.Content
                  side='top'
                  variant='light'
                  size='medium'
                  className='max-w-[280px] p-3'
                >
                  <div className='flex min-w-0 items-center gap-2'>
                    <CrmAccountAvatar
                      name={
                        salesOwnerSelectOptions?.find((o) => o.value === account?.sales_owner)
                          ?.label ?? account?.sales_owner
                      }
                      size={32}
                      className='shrink-0'
                    />
                    <div className='flex min-w-0 flex-col'>
                      <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                        {salesOwnerSelectOptions?.find((o) => o.value === account?.sales_owner)
                          ?.label ?? account?.sales_owner}
                      </span>
                    </div>
                  </div>
                </Tooltip.Content>
              ) : null}
            </Tooltip.Root>
          </EditableFieldWrapper>
        </div>
        <div className='flex flex-1 flex-col gap-1'>
          <FieldLabel>CRM Contact</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <SearchableSelect
              id='crm_contact'
              multiple={true}
              value={contacts.map((c) => c.name)}
              onValueChange={handleCrmContactChange}
              options={crmContactSelectOptions}
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              triggerClassName='w-full -ml-2'
              placeholder='Select CRM contact'
              searchPlaceholder='Search CRM contact...'
              emptyMessage={crmContactLoadingMessage || 'No CRM contacts available'}
              noResultsMessage={crmContactLoadingMessage || 'No CRM contacts found'}
              onSearchQueryChange={setCrmContactSearchQuery}
              renderTrigger={({ selectedOptions, placeholder }) => {
                if (!selectedOptions || selectedOptions.length === 0) {
                  return <span className='paragraph-small text-text-sub-600'>{placeholder}</span>;
                }
                const formattedList = selectedOptions.map((opt) => ({
                  name: opt.value,
                  full_name: opt.label,
                }));
                return <ContactsAvatars list={formattedList} />;
              }}
            />
          </EditableFieldWrapper>
        </div>
      </div>

      {/* Row 2b: CP Account + CP Contact */}
      <div className='flex gap-3'>
        <div className='flex flex-1 flex-col gap-1'>
          <FieldLabel>CP Account</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={account?.cp_account ?? ''}
              valueSentinel='__none__'
              onValueChange={(v) => handleChange('cp_account', v === '__none__' ? '' : v)}
              options={cpAccountSelectOptions}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage={cpAccountLoadingMessage || 'No CP accounts found'}
              emptyMessage={cpAccountLoadingMessage || 'No CP accounts available'}
              onSearchQueryChange={setCpAccountSearchQuery}
              triggerClassName='-ml-2 w-full'
            />
          </EditableFieldWrapper>
        </div>
        <div className='flex flex-1 flex-col gap-1'>
          <FieldLabel>CP Contact</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={account?.cp_contact ?? ''}
              valueSentinel='__none__'
              onValueChange={(v) => {
                const next = v === '__none__' ? '' : v;
                handleChange('cp_contact', next);
                if (!account?.cp_account && next) {
                  getCpContactById(next)
                    .then((res) => {
                      const acc = res?.data?.cpAccountId;
                      if (acc) handleChange('cp_account', acc);
                    })
                    .catch(() => {});
                }
              }}
              options={cpContactSelectOptions}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage={cpContactLoadingMessage || 'No CP contacts found'}
              emptyMessage={cpContactLoadingMessage || 'No CP contacts available'}
              onSearchQueryChange={setCpContactSearchQuery}
              triggerClassName='-ml-2 w-full'
            />
          </EditableFieldWrapper>
        </div>
      </div>

      {/* Row 3: Year of Est. + Type of Organization */}
      <div className='flex gap-3'>
        <div className='flex flex-1 flex-col gap-1'>
          <FieldLabel>Year of Est.</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <Datepicker
              variant='neutral'
              mode='stroke'
              size='xsmall'
              value={
                account?.year_of_establishment
                  ? parseToDate(account.year_of_establishment)
                  : undefined
              }
              onChange={(date) =>
                handleChange('year_of_establishment', date ? format(date, 'yyyy-MM-dd') : '')
              }
              placeholder='DD-MM-YY'
              className='-ml-2 text-label-sm text-text-main-900'
              max={new Date()}
            />
          </EditableFieldWrapper>
        </div>
        <div className='flex flex-1 flex-col gap-1'>
          <FieldLabel>Type of Organization</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <SearchableSelect
              id='type_of_organization'
              value={account?.type_of_organization || undefined}
              onValueChange={(value) => handleChange('type_of_organization', value)}
              options={typeOfOrgOptions}
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              triggerClassName='w-full -ml-2'
              placeholder='Select Type of organization'
              searchPlaceholder='Search...'
              emptyMessage='No organizations available'
              noResultsMessage='No organizations found'
            />
          </EditableFieldWrapper>
        </div>
      </div>

      {/* Row 4: Industry + Parent Company */}
      <div className='flex gap-3'>
        <div className='flex flex-1 flex-col gap-1'>
          <FieldLabel>Industry</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <Select.Root
              variant='borderless'
              value={account?.industry ?? ''}
              onValueChange={(value) => handleChange('industry', value)}
              size='xsmall'
              matchTriggerWidth={false}
              disabled={industryOptionsLoading}
              onOpenChange={(open) => {
                if (!open) setIndustrySearchQuery('');
              }}
            >
              <Select.Trigger className='w-full -ml-2 h-auto py-0' showArrow={false}>
                <span className='text-label-sm text-text-main-900'>
                  {industryLabelByValue.get(account?.industry) ?? account?.industry ?? '--'}
                </span>
              </Select.Trigger>
              <Select.Content
                layout='searchable'
                className='max-h-[300px] min-w-[var(--radix-select-trigger-width)] p-0'
                onOpenAutoFocus={(e) => {
                  e.preventDefault();
                  requestAnimationFrame(() => industrySearchInputRef.current?.focus());
                }}
              >
                <div className='flex min-h-0 flex-1 flex-col'>
                  <div className='shrink-0 border-b border-stroke-soft-200 p-2'>
                    <Input.Root size='small'>
                      <Input.Wrapper>
                        <Input.Icon as={RiSearchLine} />
                        <Input.Input
                          ref={industrySearchInputRef}
                          placeholder='Search industry...'
                          value={industrySearchQuery}
                          onChange={(e) => setIndustrySearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.nativeEvent?.stopImmediatePropagation) {
                              e.nativeEvent.stopImmediatePropagation();
                            }
                          }}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </div>
                  <div
                    className='flex min-h-0 max-h-[236px] flex-col overflow-y-auto p-2'
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {industryGroups.length > 0 ? (
                      filteredIndustryGroups.length > 0 ? (
                        filteredIndustryGroups.map((group) => (
                          <Select.Group key={group.value} className='py-1'>
                            <Select.GroupLabel className='block px-2 pb-1 pt-2 text-paragraph-xs font-medium text-text-soft-400'>
                              {group.label}
                            </Select.GroupLabel>
                            {(Array.isArray(group.industry_name) ? group.industry_name : []).map(
                              (opt) => (
                                <Select.Item
                                  key={`${group.value}-${opt.value}`}
                                  value={opt.value}
                                  className='paragraph-small'
                                >
                                  {opt.label}
                                </Select.Item>
                              ),
                            )}
                          </Select.Group>
                        ))
                      ) : (
                        <div className='px-4 py-8 text-center text-paragraph-sm text-text-soft-400'>
                          {industrySearchQuery.trim()
                            ? 'No industries found'
                            : 'No industries available'}
                        </div>
                      )
                    ) : (
                      <div className='p-2 text-paragraph-sm text-text-sub-600'>No options</div>
                    )}
                  </div>
                </div>
              </Select.Content>
            </Select.Root>
          </EditableFieldWrapper>
        </div>
        <div className='flex flex-1 flex-col gap-1'>
          <FieldLabel>Parent Company</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <SearchableSelect
              id='parent_company'
              value={account?.parent_company || undefined}
              onValueChange={(value) => handleChange('parent_company', value)}
              options={crmAccountSelectOptions}
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              triggerClassName='w-full -ml-2'
              placeholder='Enter Parent company'
              searchPlaceholder='Search...'
              emptyMessage={crmAccountLoadingMessage || 'No companies available'}
              noResultsMessage={crmAccountLoadingMessage || 'No companies found'}
              onSearchQueryChange={setCrmAccountSearchQuery}
            />
          </EditableFieldWrapper>
        </div>
      </div>

      {/* Row 5: Associate Company + Website */}
      <div className='flex gap-3'>
        <div className='flex flex-1 flex-col gap-1'>
          <FieldLabel>Associate Company</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <SearchableSelect
              id='associate_company'
              value={account?.associate_company || undefined}
              onValueChange={(value) => handleChange('associate_company', value)}
              options={crmAccountSelectOptions}
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              triggerClassName='w-full -ml-2'
              placeholder='Enter Associate company'
              searchPlaceholder='Search...'
              emptyMessage={crmAccountLoadingMessage || 'No companies available'}
              noResultsMessage={crmAccountLoadingMessage || 'No companies found'}
              onSearchQueryChange={setCrmAccountSearchQuery}
            />
          </EditableFieldWrapper>
        </div>
        <div className='flex flex-1 flex-col gap-1'>
          <FieldLabel>Website</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={account?.website || ''}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder='Enter website URL'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>
      </div>

      {/* Row 6: Employees Head Count */}
      <div className='flex gap-3'>
        <div className='flex flex-1 flex-col gap-1'>
          <FieldLabel>Employees Head Count</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <SearchableSelect
              id='no_of_employees'
              value={account?.no_of_employees || undefined}
              onValueChange={(value) => handleChange('no_of_employees', value)}
              options={employeeHeadCountOptions}
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              triggerClassName='w-full -ml-2'
              placeholder='Select'
              searchPlaceholder='Search...'
              emptyMessage='No options available'
              noResultsMessage='No results found'
            />
          </EditableFieldWrapper>
        </div>
        <div className='flex flex-1 flex-col gap-1' />
      </div>
    </div>
  );
};

export default CrmAccountAboutInfo;
