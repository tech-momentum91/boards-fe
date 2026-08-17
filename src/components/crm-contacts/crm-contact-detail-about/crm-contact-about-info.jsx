import React, { useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { RiCalendarLine } from 'react-icons/ri';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Datepicker } from '@/components/ui/datepicker';
import { PhoneInputController } from '@/components/ui/phone-input';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import * as Tooltip from '@/components/ui/tooltip';
import { DESIGNATION_OPTIONS, DEPARTMENT_OPTIONS } from '../constants';
import { CityCombobox } from '@/components/crm-leads/city-combobox';
import {
  getCpAccountOptions,
  getCpContactLinkOptions,
  getCpContactsForCpAccount,
  getSalesOwnerList,
} from '@/api/crmLeads';
import { getCrmAccountList } from '@/api/crmAccounts';
import { getCpContactById } from '@/services/cp-contacts-service';
import {
  mergeCurrentLinkOptions,
  useDebouncedLinkOptions,
} from '@/hooks/use-debounced-link-options';

const parseDob = (dob) => {
  if (!dob) return undefined;
  const d = dob instanceof Date ? dob : new Date(dob);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

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
      <>
        <CrmAccountAvatar name={name} size={28} />
      </>
    ) : (
      <FieldValue>--</FieldValue>
    )}
  </div>
);

const CrmContactAboutInfo = ({ contact = {}, onFieldChange, contactOptions = {} }) => {
  const fetchSalesOwnerOptions = useCallback(
    ({ keyword, pageSize }) => getSalesOwnerList({ keyword, pageSize }),
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

  const cpAccountId = String(contact?.cp_account ?? '').trim();
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

  useEffect(() => {
    setCpContactSearchQuery('');
  }, [cpAccountId, setCpContactSearchQuery]);

  const salesOwnerSelectOptions = useMemo(
    () => mergeCurrentLinkOptions(salesOwnerOptions, contact?.sales_owner),
    [salesOwnerOptions, contact?.sales_owner],
  );

  const associateAccountValue = contact?.associate_account || contact?.account || '';
  const accountSelectOptions = useMemo(
    () => mergeCurrentLinkOptions(crmAccountOptions, associateAccountValue),
    [crmAccountOptions, associateAccountValue],
  );

  const cpAccountSelectOptions = useMemo(
    () =>
      mergeCurrentLinkOptions(cpAccountOptions, contact?.cp_account, {
        noneItem: { value: '__none__', label: '—' },
      }),
    [cpAccountOptions, contact?.cp_account],
  );

  const cpContactSelectOptions = useMemo(
    () =>
      mergeCurrentLinkOptions(cpContactOptions, contact?.cp_contact, {
        noneItem: { value: '__none__', label: '—' },
      }),
    [cpContactOptions, contact?.cp_contact],
  );

  const handleChange = (field, value) => {
    onFieldChange?.(field, value);
  };

  const designationOptions =
    contactOptions?.designation?.length > 0 ? contactOptions.designation : null;
  const departmentOptions =
    contactOptions?.department?.length > 0 ? contactOptions.department : null;

  const salesOwnerLabel =
    salesOwnerSelectOptions.find((o) => o.value === contact?.sales_owner)?.label ??
    contact?.sales_owner;

  return (
    <div className='flex flex-col gap-6 py-6'>
      <div className='grid grid-cols-2 gap-x-12 gap-y-6'>
        {/* Row 1: First Name + Last Name */}
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>First Name</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={contact?.first_name || ''}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  placeholder='Enter first name'
                  className='text-label-sm text-text-main-900 font-medium'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>Last Name</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={contact?.last_name || ''}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  placeholder='Enter last name'
                  className='text-label-sm text-text-main-900 font-medium'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        {/* Row 2: Department + Designation */}
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>Department</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={contact?.department || ''}
              onValueChange={(value) => handleChange('department', value)}
              options={departmentOptions || DEPARTMENT_OPTIONS}
              placeholder='Select department'
              searchPlaceholder='Search...'
              noResultsMessage='No departments found'
              emptyMessage='No departments available'
              triggerClassName='w-full -ml-2'
            />
          </EditableFieldWrapper>
        </div>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>Designation</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={contact?.designation || ''}
              onValueChange={(value) => handleChange('designation', value)}
              options={designationOptions || DESIGNATION_OPTIONS}
              placeholder='Select designation'
              searchPlaceholder='Search...'
              noResultsMessage='No designations found'
              emptyMessage='No designations available'
              triggerClassName='w-full -ml-2'
            />
          </EditableFieldWrapper>
        </div>

        {/* Row 3: Email + Date of Birth */}
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>Email</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  type='email'
                  value={contact?.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder='Enter email address'
                  className='text-label-sm text-text-main-900 font-medium'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>Date of Birth</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <Datepicker
              value={parseDob(contact?.dob)}
              onChange={(date) => handleChange('dob', date ? format(date, 'yyyy-MM-dd') : '')}
              placeholder='--'
              variant='borderless'
              suffixIcon={<RiCalendarLine className='text-text-sub-400' />}
              size='xsmall'
              className='-ml-2 text-label-sm text-text-main-900'
            />
          </EditableFieldWrapper>
        </div>

        {/* Row 4: Contact + Alternate Contact */}
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>Contact</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <div className='-ml-2'>
              <PhoneInputController
                value={contact?.mobile_number || ''}
                onChange={(formattedValue) => handleChange('mobile_number', formattedValue)}
                placeholder='Enter mobile number'
                size='xsmall'
                variant='borderless'
              />
            </div>
          </EditableFieldWrapper>
        </div>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>Alternate Contact</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <div className='-ml-2'>
              <PhoneInputController
                value={contact?.alt_mobile_number || ''}
                onChange={(formattedValue) => handleChange('alt_mobile_number', formattedValue)}
                placeholder='Enter alt. mobile number'
                size='xsmall'
                variant='borderless'
              />
            </div>
          </EditableFieldWrapper>
        </div>

        {/* Row 5: City + Sales Owner */}
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>City</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <div className='-ml-2'>
              <CityCombobox
                value={contact?.city || ''}
                onChange={(v) => handleChange('city', v)}
                placeholder='Search city...'
              />
            </div>
          </EditableFieldWrapper>
        </div>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>Sales Owner</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <Tooltip.Root delayDuration={0}>
              <Tooltip.Trigger asChild>
                <div className='inline-flex w-full min-w-0'>
                  <SearchableSelect
                    variant='borderless'
                    size='xsmall'
                    matchTriggerWidth={false}
                    showArrow={false}
                    value={contact?.sales_owner || ''}
                    onValueChange={(value) => handleChange('sales_owner', value)}
                    options={salesOwnerSelectOptions}
                    searchPlaceholder='Search...'
                    noResultsMessage={salesOwnerLoadingMessage || 'No sales owners found'}
                    emptyMessage={salesOwnerLoadingMessage || 'No sales owners available'}
                    onSearchQueryChange={setSalesOwnerSearchQuery}
                    triggerClassName='w-full -ml-2 h-auto py-0'
                    renderTrigger={() => <SalesOwnerDisplay name={salesOwnerLabel} />}
                  />
                </div>
              </Tooltip.Trigger>
              {contact?.sales_owner ? (
                <Tooltip.Content
                  side='top'
                  variant='light'
                  size='medium'
                  className='max-w-[280px] p-3'
                >
                  <div className='flex min-w-0 items-center gap-2'>
                    <CrmAccountAvatar name={salesOwnerLabel} size={32} className='shrink-0' />
                    <div className='flex min-w-0 flex-col'>
                      <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                        {salesOwnerLabel}
                      </span>
                    </div>
                  </div>
                </Tooltip.Content>
              ) : null}
            </Tooltip.Root>
          </EditableFieldWrapper>
        </div>

        {/* Row 6: Associate Account + CP Account */}
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>Associate Account</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={associateAccountValue}
              onValueChange={(value) => handleChange('associate_account', value)}
              options={accountSelectOptions}
              searchPlaceholder='Search...'
              noResultsMessage={crmAccountLoadingMessage || 'No accounts found'}
              emptyMessage={crmAccountLoadingMessage || 'No accounts available'}
              onSearchQueryChange={setCrmAccountSearchQuery}
              triggerClassName='w-full -ml-2 h-auto py-0'
              renderTrigger={() => (
                <FieldValue>
                  {accountSelectOptions.find((o) => o.value === associateAccountValue)?.label ??
                    associateAccountValue}
                </FieldValue>
              )}
            />
          </EditableFieldWrapper>
        </div>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>CP Account</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={contact?.cp_account ?? ''}
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

        {/* Row 7: CP Contact */}
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>CP Contact</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={contact?.cp_contact ?? ''}
              valueSentinel='__none__'
              onValueChange={(v) => {
                const next = v === '__none__' ? '' : v;
                handleChange('cp_contact', next);
                if (!contact?.cp_account && next) {
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
    </div>
  );
};

export default CrmContactAboutInfo;
