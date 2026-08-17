import React, { useState, useEffect, useMemo, useCallback } from 'react';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import * as Input from '@/components/ui/input';
import * as Badge from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiSelect } from '@/components/ui/multi-select';
import { CityCombobox } from '@/components/crm-leads/city-combobox';
import { getCrmAccountList, getCrmAccountContacts } from '@/api/crmAccounts';
import {
  getCpAccountOptions,
  getCpContactLinkOptions,
  getCpContactsForCpAccount,
  getCrmLeadOptions,
  getSalesOwnerList,
  getLeadLinkedContactIds,
} from '@/api/crmLeads';
import { getCrmContact } from '@/api/crmContacts';
import { getCpContactById } from '@/services/cp-contacts-service';
import {
  formatNumberInrForInput,
  SELECT_NONE_VALUE,
  TRUEPULSE_SERVICE_OPTIONS,
  getServiceName,
  getServiceDisplayLabel,
  getInfoCallStatusBadgeColor,
} from '@/components/crm-leads/constants';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import * as Tooltip from '@/components/ui/tooltip';
import {
  mergeCurrentLinkOptions,
  useDebouncedLinkOptions,
} from '@/hooks/use-debounced-link-options';

const FieldLabel = ({ children, required }) => (
  <label className='text-paragraph-sm text-text-sub-500 opacity-72'>
    {children}
    {required && <span className='text-error-base ml-0.5'>*</span>}
  </label>
);

const InfoCallStatusBadge = ({ status }) => {
  const label = String(status || '').trim() || '—';
  return (
    <Badge.Root
      variant='light'
      color={getInfoCallStatusBadgeColor(status)}
      size='medium'
      className='normal-case'
    >
      {label}
    </Badge.Root>
  );
};

const CrmLeadAboutBasic = ({
  lead,
  onFieldChange,
  onBatchFieldChange,
  isSaving,
  isSavingContacts = false,
  leadOptions = {},
}) => {
  const [pipelineScopedOptions, setPipelineScopedOptions] = useState({
    lead_relevance: [],
    lead_size: [],
    product: [],
    lost_reason: [],
  });

  const fetchCrmAccountOptions = useCallback(
    ({ keyword, pageSize }) => getCrmAccountList({ keyword, pageSize }),
    [],
  );
  const {
    options: accountOptions,
    setSearchQuery: setAccountSearchQuery,
    loadingMessage: accountLoadingMessage,
  } = useDebouncedLinkOptions(fetchCrmAccountOptions);

  const accountId = String(lead?.account || '').trim();
  const fetchCrmContactOptions = useCallback(
    async ({ keyword, pageSize }) => {
      if (!accountId) return [];
      const list = await getCrmAccountContacts(accountId, { keyword, pageSize });
      return (list || []).map((c) => ({
        value: c.name || c.value,
        label: c.full_name || c.label || c.name || c.value || '—',
      }));
    },
    [accountId],
  );
  const {
    options: contactOptions,
    setSearchQuery: setContactSearchQuery,
    loadingMessage: contactLoadingMessage,
  } = useDebouncedLinkOptions(fetchCrmContactOptions, {
    enabled: Boolean(accountId),
    deps: [accountId],
  });

  const fetchCpAccountOptions = useCallback(
    ({ keyword, pageSize }) => getCpAccountOptions({ keyword, pageSize }),
    [],
  );
  const {
    options: cpAccountOptions,
    setSearchQuery: setCpAccountSearchQuery,
    loadingMessage: cpAccountLoadingMessage,
  } = useDebouncedLinkOptions(fetchCpAccountOptions);

  const cpAccountId = String(lead?.cp_account ?? '').trim();
  const fetchCpContactOptions = useCallback(
    async ({ keyword, pageSize }) => {
      const list = cpAccountId
        ? await getCpContactsForCpAccount(cpAccountId, { keyword, pageSize })
        : await getCpContactLinkOptions({ keyword, pageSize });
      return (list || []).map((c) => ({
        value: c.value ?? c.name,
        label: c.label ?? c.full_name ?? c.name ?? c.value ?? '—',
      }));
    },
    [cpAccountId],
  );
  const {
    options: cpContactOptions,
    setSearchQuery: setCpContactSearchQuery,
    loadingMessage: cpContactLoadingMessage,
  } = useDebouncedLinkOptions(fetchCpContactOptions, { deps: [cpAccountId] });

  const fetchSalesOwnerOptions = useCallback(
    ({ keyword, pageSize }) => getSalesOwnerList({ keyword, pageSize }),
    [],
  );
  const {
    options: salesOwnerOptions,
    setSearchQuery: setSalesOwnerSearchQuery,
    loadingMessage: salesOwnerLoadingMessage,
  } = useDebouncedLinkOptions(fetchSalesOwnerOptions);

  useEffect(() => {
    setContactSearchQuery('');
  }, [accountId, setContactSearchQuery]);

  useEffect(() => {
    setCpContactSearchQuery('');
  }, [cpAccountId, setCpContactSearchQuery]);

  useEffect(() => {
    const pipeline = (lead?.pipeline || '').trim();
    if (!pipeline) {
      setPipelineScopedOptions({
        lead_relevance: [],
        lead_size: [],
        product: [],
        lost_reason: [],
      });
      return;
    }

    let cancelled = false;
    getCrmLeadOptions(undefined, pipeline)
      .then((options) => {
        if (cancelled) return;
        setPipelineScopedOptions({
          lead_relevance: Array.isArray(options.lead_relevance) ? options.lead_relevance : [],
          lead_size: Array.isArray(options.lead_size) ? options.lead_size : [],
          product: Array.isArray(options.product) ? options.product : [],
          lost_reason: Array.isArray(options.lost_reason) ? options.lost_reason : [],
        });
      })
      .catch(() => {
        if (!cancelled) {
          setPipelineScopedOptions({
            lead_relevance: [],
            lead_size: [],
            product: [],
            lost_reason: [],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lead?.pipeline]);

  // Account select clears contact; contact→account autofill must not.
  const applyAccountChange = (value, { clearContact = true } = {}) => {
    const next = value && value !== SELECT_NONE_VALUE ? value : '';
    if (clearContact) {
      if (onBatchFieldChange) {
        onBatchFieldChange({ account: next, contact: '', contacts: [] });
        return;
      }
      onFieldChange?.('contacts', []);
      onFieldChange?.('contact', '');
      onFieldChange?.('account', next);
      return;
    }
    // Keep contact; field path preserves defer + primary-lead check.
    onFieldChange?.('account', next);
  };

  const handleChange = (field, value) => {
    if (field === 'account') {
      applyAccountChange(value, { clearContact: true });
      return;
    }
    if (field === 'product' && value && leadOptions.product_to_pipeline_map) {
      const mappedPipeline = leadOptions.product_to_pipeline_map[value];
      if (mappedPipeline) {
        if (onBatchFieldChange) {
          onBatchFieldChange({
            product: value,
            pipeline: mappedPipeline,
          });
          return;
        } else {
          onFieldChange?.('product', value);
          onFieldChange?.('pipeline', mappedPipeline);
          return;
        }
      }
    }
    onFieldChange?.(field, value);
  };

  const serviceOptions = useMemo(() => {
    const val = lead?.service_id;
    if (val && !TRUEPULSE_SERVICE_OPTIONS.some((o) => o.value === String(val))) {
      return [
        { value: String(val), label: getServiceDisplayLabel(val) },
        ...TRUEPULSE_SERVICE_OPTIONS,
      ];
    }
    return TRUEPULSE_SERVICE_OPTIONS;
  }, [lead?.service_id]);

  const handleServiceChange = (value) => {
    const updates = { service_id: value };
    const sName = getServiceName(value);
    if (sName) {
      updates.service_name = sName;
    }
    if (onBatchFieldChange) {
      onBatchFieldChange(updates);
    } else {
      handleChange('service_id', value);
      if (updates.service_name) {
        handleChange('service_name', updates.service_name);
      }
    }
  };

  // Drive Select from lead; use option canonical value when present so Radix matches Select.Item.
  // Otherwise keep lead value so orphan row + merge logic stay in sync (loading / type mismatch).
  const accountStr = lead?.account != null ? String(lead.account).trim() : '';
  const accountMatch = accountStr
    ? accountOptions.find((o) => String(o.value) === accountStr)
    : undefined;
  const accountValue = accountStr ? (accountMatch ? accountMatch.value : lead.account) : undefined;

  const selectedContactIds = useMemo(() => getLeadLinkedContactIds(lead), [lead]);

  const accountSelectOptions = useMemo(
    () =>
      mergeCurrentLinkOptions(accountOptions, lead?.account, {
        noneItem: { value: '__none__', label: '—' },
      }),
    [accountOptions, lead?.account],
  );

  const contactSelectOptions = useMemo(
    () => mergeCurrentLinkOptions(contactOptions, selectedContactIds),
    [contactOptions, selectedContactIds],
  );

  const buildContactsChildRows = useCallback(
    (selectedIds) => {
      const ids = [
        ...new Set(
          (Array.isArray(selectedIds) ? selectedIds : [])
            .map((id) => String(id ?? '').trim())
            .filter(Boolean),
        ),
      ];
      const prevPrimary = String(lead?.contact || '').trim();
      const primary = ids.includes(prevPrimary) ? prevPrimary : ids[0] || '';
      return ids.map((id) => ({ contact: id, is_primary: id === primary ? 1 : 0 }));
    },
    [lead?.contact],
  );

  const handleContactsMultiChange = useCallback(
    (selectedIds) => {
      const contacts = buildContactsChildRows(selectedIds);
      if (onBatchFieldChange) {
        onBatchFieldChange({ contacts });
      } else {
        onFieldChange?.('contacts', contacts);
      }
      const primary = contacts.find((row) => Number(row.is_primary) === 1)?.contact || '';
      if (!lead?.account && primary) {
        getCrmContact(primary)
          .then((doc) => {
            const accountId = String(doc?.associate_account || doc?.account || '').trim();
            if (accountId) onFieldChange?.('account', accountId);
          })
          .catch(() => {});
      }
    },
    [buildContactsChildRows, onBatchFieldChange, onFieldChange, lead?.account],
  );
  const cpAccountSelectOptions = useMemo(
    () =>
      mergeCurrentLinkOptions(cpAccountOptions, lead?.cp_account, {
        noneItem: { value: '__none__', label: '—' },
      }),
    [cpAccountOptions, lead?.cp_account],
  );

  const cpContactSelectOptions = useMemo(
    () =>
      mergeCurrentLinkOptions(cpContactOptions, lead?.cp_contact, {
        noneItem: { value: '__none__', label: '—' },
      }),
    [cpContactOptions, lead?.cp_contact],
  );

  const leadSizeSelectOptions = useMemo(() => {
    const noneItem = { value: SELECT_NONE_VALUE, label: '—' };
    const sizeOpts = pipelineScopedOptions.lead_size || [];
    let all = [noneItem, ...sizeOpts];
    const rawLs = lead?.lead_size;
    if (rawLs && String(rawLs).trim() && !all.some((o) => o.value === rawLs)) {
      all = [noneItem, { value: rawLs, label: rawLs }, ...sizeOpts];
    }
    return all;
  }, [pipelineScopedOptions.lead_size, lead?.lead_size]);

  const leadOfSelectOptions = useMemo(() => {
    const noneItem = { value: '__none__', label: '—' };
    const leadOfs = leadOptions.lead_of || [];
    let all = [noneItem, ...leadOfs];
    const rawValue = lead?.lead_of;
    if (rawValue && String(rawValue).trim() && !all.some((o) => o.value === rawValue)) {
      all = [noneItem, { value: rawValue, label: rawValue }, ...leadOfs];
    }
    return all;
  }, [leadOptions.lead_of, lead?.lead_of]);

  const pipelineSelectOptions = useMemo(() => {
    const noneItem = { value: '__none__', label: '—' };
    const pipelines = leadOptions.pipelines || [];
    let all = [noneItem, ...pipelines];
    const rawPl = lead?.pipeline;
    if (rawPl && String(rawPl).trim() && !all.some((o) => o.value === rawPl)) {
      all = [noneItem, { value: rawPl, label: rawPl }, ...pipelines];
    }
    return all;
  }, [leadOptions.pipelines, lead?.pipeline]);

  const productSelectOptions = useMemo(() => {
    const noneItem = { value: '__none__', label: '—' };
    const products = leadOptions.product || [];
    let all = [noneItem, ...products];
    const rawPr = lead?.product;
    if (rawPr && String(rawPr).trim() && !all.some((o) => o.value === rawPr)) {
      all = [noneItem, { value: rawPr, label: rawPr }, ...products];
    }
    return all;
  }, [leadOptions.product, lead?.product]);

  const insideSalesSelectOptions = useMemo(() => {
    const noneItem = { value: '__none__', label: '—' };
    const opts = leadOptions.inside_sales || [];
    const hasCurrent = lead?.inside_sales && !opts.some((o) => o.value === lead.inside_sales);
    const baseOpts = hasCurrent
      ? [{ value: lead.inside_sales, label: lead.inside_sales }, ...opts]
      : opts;
    return [noneItem, ...baseOpts];
  }, [leadOptions.inside_sales, lead?.inside_sales]);

  const salesOwnerSelectOptions = useMemo(
    () =>
      mergeCurrentLinkOptions(salesOwnerOptions, lead?.sales_owner, {
        noneItem: { value: '__none__', label: '—' },
      }),
    [salesOwnerOptions, lead?.sales_owner],
  );

  const needUrgencySelectOptions = useMemo(() => {
    const noneItem = { value: '__none__', label: '—' };
    const needUrgencyOpts = leadOptions.need_urgency || [];
    let all = [noneItem, ...needUrgencyOpts];
    const rawNu = lead?.need_urgency;
    if (rawNu && String(rawNu).trim() && !all.some((o) => o.value === rawNu)) {
      all = [noneItem, { value: rawNu, label: rawNu }, ...needUrgencyOpts];
    }
    return all;
  }, [leadOptions.need_urgency, lead?.need_urgency]);

  const infoCallStatusSelectOptions = useMemo(() => {
    const noneItem = { value: '__none__', label: '—' };
    const statusOpts = leadOptions.info_call_status || [];
    let all = [noneItem, ...statusOpts];
    const rawIcs = lead?.info_call_status;
    if (rawIcs && String(rawIcs).trim() && !all.some((o) => o.value === rawIcs)) {
      all = [noneItem, { value: rawIcs, label: rawIcs }, ...statusOpts];
    }
    return all;
  }, [leadOptions.info_call_status, lead?.info_call_status]);

  const leadRelevanceSelectOptions = useMemo(() => {
    const noneItem = { value: '__none__', label: '—' };
    const relevanceOpts = pipelineScopedOptions.lead_relevance || [];
    let all = [noneItem, ...relevanceOpts];
    const rawLr = lead?.lead_relevance;
    if (rawLr && String(rawLr).trim() && !all.some((o) => o.value === rawLr)) {
      all = [noneItem, { value: rawLr, label: rawLr }, ...relevanceOpts];
    }
    return all;
  }, [pipelineScopedOptions.lead_relevance, lead?.lead_relevance]);

  const dropReasonSelectOptions = useMemo(() => {
    const noneItem = { value: '__none__', label: '—' };
    const rawOpts = Array.isArray(pipelineScopedOptions.lost_reason)
      ? pipelineScopedOptions.lost_reason
      : [];
    const normalized = rawOpts.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
    const raw = lead?.lost_reason;
    const hasCurrent =
      raw && String(raw).trim() && !normalized.some((o) => String(o.value) === String(raw));
    const baseOpts = hasCurrent ? [{ value: raw, label: raw }, ...normalized] : normalized;
    return [noneItem, ...baseOpts];
  }, [pipelineScopedOptions.lost_reason, lead?.lost_reason]);

  const lostReasonStr = lead?.lost_reason != null ? String(lead.lost_reason).trim() : '';
  const lostReasonMatch = lostReasonStr
    ? dropReasonSelectOptions.find(
        (o) =>
          o.value !== '__none__' &&
          (String(o.value) === lostReasonStr || String(o.label) === lostReasonStr),
      )
    : undefined;
  const lostReasonValue = lostReasonStr
    ? lostReasonMatch
      ? lostReasonMatch.value
      : lead.lost_reason
    : '';

  return (
    <div className='flex flex-col gap-5 py-5'>
      <div className='grid grid-cols-2 gap-x-6 gap-y-5'>
        <div className='flex flex-col gap-1'>
          <FieldLabel>Lead Name</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={lead?.lead_name || ''}
                  onChange={(e) => handleChange('lead_name', e.target.value)}
                  placeholder='Enter lead name'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Account</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={accountValue ?? ''}
              valueSentinel='__none__'
              onValueChange={(v) => {
                const next = (v ?? '').toString().trim();
                const prev = (lead?.account ?? '').toString().trim();
                if (prev !== next) {
                  applyAccountChange(v, { clearContact: true });
                }
              }}
              options={accountSelectOptions}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage={accountLoadingMessage || 'No accounts found'}
              emptyMessage={accountLoadingMessage || 'No accounts available'}
              onSearchQueryChange={setAccountSearchQuery}
              triggerClassName='-ml-2 w-full'
            />
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Contact</FieldLabel>
          <EditableFieldWrapper editable={!isSavingContacts} iconClassName='mr-2'>
            <MultiSelect
              variant='borderless'
              size='xsmall'
              value={selectedContactIds}
              onValueChange={handleContactsMultiChange}
              commitOnBlur
              options={contactSelectOptions}
              placeholder={accountStr ? 'Select' : 'Select account first'}
              searchPlaceholder='Search...'
              emptyMessage={
                contactLoadingMessage ||
                (accountStr ? 'No contacts available' : 'Select account first')
              }
              noResultsMessage={contactLoadingMessage || 'No contacts found'}
              onSearchQueryChange={setContactSearchQuery}
              disabled={isSavingContacts || !accountStr}
              maxDisplayItems={2}
              sortSelectedFirst
              countLabel='Contact'
              className='-ml-2 w-full'
            />
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>CP Account</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={lead?.cp_account ?? ''}
              valueSentinel='__none__'
              onValueChange={(v) => handleChange('cp_account', v)}
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

        <div className='flex flex-col gap-1'>
          <FieldLabel>CP Contact</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={lead?.cp_contact ?? ''}
              valueSentinel='__none__'
              onValueChange={(v) => {
                handleChange('cp_contact', v);
                if (!lead?.cp_account && v) {
                  getCpContactById(v)
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

        <div className='flex flex-col gap-1'>
          <FieldLabel>Company Legal Name</FieldLabel>
          <EditableFieldWrapper editable={false} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={lead?.company_legal_name || ''}
                  disabled
                  readOnly
                  placeholder='—'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Lead Of</FieldLabel>
          <EditableFieldWrapper editable={false} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              disabled
              value={lead?.lead_of ?? ''}
              valueSentinel='__none__'
              onValueChange={(v) => handleChange('lead_of', v === '__none__' ? '' : v)}
              options={leadOfSelectOptions}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage='No options found'
              emptyMessage='No options available'
              triggerClassName='-ml-2 w-full'
            />
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel required>Pipeline</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={lead?.pipeline ?? ''}
              valueSentinel='__none__'
              onValueChange={(v) => handleChange('pipeline', v)}
              options={pipelineSelectOptions}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage='No pipelines found'
              emptyMessage='No pipelines available'
              triggerClassName='-ml-2 w-full'
            />
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Lead Size</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={lead?.lead_size ?? ''}
              valueSentinel={SELECT_NONE_VALUE}
              onValueChange={(v) => handleChange('lead_size', v)}
              options={leadSizeSelectOptions}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage='No lead sizes found'
              emptyMessage='No lead sizes available'
              triggerClassName='-ml-2 w-full'
            />
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>City</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <CityCombobox
              value={lead?.city || ''}
              onChange={(v) => handleChange('city', v)}
              placeholder='Select'
              className='-ml-2'
              size='xsmall'
              variant='borderless'
            />
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Info Call Status</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={lead?.info_call_status ?? ''}
              valueSentinel='__none__'
              onValueChange={(v) => handleChange('info_call_status', v)}
              options={infoCallStatusSelectOptions}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage='No info call statuses found'
              emptyMessage='No info call statuses available'
              triggerClassName='-ml-2 w-full'
              renderTrigger={({ selectedLabel, value: selectedValue }) =>
                selectedValue ? (
                  <InfoCallStatusBadge status={selectedLabel || selectedValue} />
                ) : (
                  <span className='text-paragraph-sm text-text-soft-400'>Select</span>
                )
              }
              renderOptionLabel={(opt) => <InfoCallStatusBadge status={opt?.label || opt?.value} />}
            />
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>No of Seats</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  type='text'
                  inputMode='numeric'
                  value={lead?.no_of_seats ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value.replaceAll(/\D/g, '');
                    handleChange('no_of_seats', raw === '' ? '' : Number(raw));
                  }}
                  placeholder='Enter'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Product</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={lead?.product ?? ''}
              valueSentinel='__none__'
              onValueChange={(v) => handleChange('product', v)}
              options={productSelectOptions}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage='No products found'
              emptyMessage='No products available'
              triggerClassName='-ml-2 w-full'
            />
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Est. Monthly Value</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper className='relative'>
                <span className='absolute left-0 top-1/2 -translate-y-1/2 text-paragraph-sm text-text-sub-500 select-none'>
                  ₹
                </span>
                <Input.Input
                  type='text'
                  inputMode='decimal'
                  value={formatNumberInrForInput(lead?.est_monthly_value)}
                  onChange={(e) =>
                    handleChange('est_monthly_value', e.target.value.replaceAll(/[^\d.]/g, ''))
                  }
                  placeholder='0'
                  className='pl-2 text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Est. Lifetime Value</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper className='relative'>
                <span className='absolute left-0 top-1/2 -translate-y-1/2 text-paragraph-sm text-text-sub-500 select-none'>
                  ₹
                </span>
                <Input.Input
                  type='text'
                  inputMode='decimal'
                  value={formatNumberInrForInput(lead?.est_lifetime_value)}
                  onChange={(e) =>
                    handleChange('est_lifetime_value', e.target.value.replaceAll(/[^\d.]/g, ''))
                  }
                  placeholder='0'
                  className='pl-2 text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Inside Sales</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={lead?.inside_sales ?? ''}
              valueSentinel='__none__'
              onValueChange={(v) => handleChange('inside_sales', v)}
              options={insideSalesSelectOptions}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage='No inside sales found'
              emptyMessage='No inside sales available'
              triggerClassName='-ml-2 w-full'
            />
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Sales Owner</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Tooltip.Root delayDuration={0}>
              <Tooltip.Trigger asChild>
                <div className='inline-flex w-full min-w-0'>
                  <SearchableSelect
                    variant='borderless'
                    size='xsmall'
                    matchTriggerWidth={false}
                    showArrow={false}
                    value={lead?.sales_owner ?? ''}
                    valueSentinel='__none__'
                    onValueChange={(v) => handleChange('sales_owner', v)}
                    options={salesOwnerSelectOptions}
                    placeholder='Select'
                    searchPlaceholder='Search...'
                    noResultsMessage={salesOwnerLoadingMessage || 'No sales owners found'}
                    emptyMessage={salesOwnerLoadingMessage || 'No sales owners available'}
                    onSearchQueryChange={setSalesOwnerSearchQuery}
                    triggerClassName='-ml-2 w-full'
                    renderTrigger={({ selectedLabel }) => {
                      if (!selectedLabel)
                        return <span className='text-paragraph-sm text-text-sub-500'>Select</span>;
                      return (
                        <div className='flex items-center gap-2 py-0.5'>
                          <CrmAccountAvatar name={selectedLabel} size={28} />
                        </div>
                      );
                    }}
                  />
                </div>
              </Tooltip.Trigger>
              {lead?.sales_owner ? (
                <Tooltip.Content
                  side='top'
                  variant='light'
                  size='medium'
                  className='max-w-[280px] p-3'
                >
                  <div className='flex min-w-0 items-center gap-2'>
                    <CrmAccountAvatar
                      name={
                        salesOwnerSelectOptions?.find((o) => o.value === lead?.sales_owner)
                          ?.label ?? lead?.sales_owner
                      }
                      size={32}
                      className='shrink-0'
                    />
                    <div className='flex min-w-0 flex-col'>
                      <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                        {salesOwnerSelectOptions?.find((o) => o.value === lead?.sales_owner)
                          ?.label ?? lead?.sales_owner}
                      </span>
                    </div>
                  </div>
                </Tooltip.Content>
              ) : null}
            </Tooltip.Root>
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Need Urgency</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={lead?.need_urgency ?? ''}
              valueSentinel='__none__'
              onValueChange={(v) => handleChange('need_urgency', v)}
              options={needUrgencySelectOptions}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage='No need urgency options found'
              emptyMessage='No need urgency options available'
              triggerClassName='-ml-2 w-full'
            />
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Lead Relevance</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={lead?.lead_relevance ?? ''}
              valueSentinel='__none__'
              onValueChange={(v) => handleChange('lead_relevance', v)}
              options={leadRelevanceSelectOptions}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage='No lead relevance options found'
              emptyMessage='No lead relevance options available'
              triggerClassName='-ml-2 w-full'
            />
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Service ID</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              className='-ml-2'
              value={lead?.service_id || ''}
              options={serviceOptions}
              onChange={handleServiceChange}
              disabled={isSaving}
            />
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>External ID</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={lead?.external_id || ''}
                  onChange={(e) => handleChange('external_id', e.target.value)}
                  placeholder='Enter'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Drop Reason</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={lostReasonValue}
              valueSentinel='__none__'
              onValueChange={(v) => handleChange('lost_reason', v)}
              options={dropReasonSelectOptions}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage='No drop reasons found'
              emptyMessage='No drop reasons available'
              triggerClassName='-ml-2 w-full'
            />
          </EditableFieldWrapper>
        </div>
      </div>
    </div>
  );
};

export default CrmLeadAboutBasic;
