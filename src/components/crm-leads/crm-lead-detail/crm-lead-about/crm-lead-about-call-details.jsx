import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { RiFileTextLine } from 'react-icons/ri';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import * as Input from '@/components/ui/input';
import * as Badge from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Datepicker } from '@/components/ui/datepicker';
import { parseToDate } from '@/utils/date-utils';
import { CityCombobox } from '@/components/crm-leads/city-combobox';
import { resolveApiOrigin } from '@/api/api-origin';
import {
  TRUEPULSE_SERVICE_OPTIONS,
  getServiceName,
  getServiceDisplayLabel,
  getInfoCallStatusBadgeColor,
} from '@/components/crm-leads/constants';

const FieldLabel = ({ children }) => (
  <label className='text-paragraph-sm text-text-sub-500 opacity-72'>{children}</label>
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

const CrmLeadAboutCallDetails = ({
  lead,
  onFieldChange,
  onBatchFieldChange,
  isSaving,
  leadOptions = {},
}) => {
  const apiOrigin = resolveApiOrigin();

  const handleChange = (field, value) => {
    onFieldChange?.(field, value);
  };

  const isTruePulse = useMemo(() => {
    return Boolean(
      lead?.true_pulse_data_bridge_id ||
      lead?.agent_name ||
      lead?.agent_phone ||
      lead?.call_start_time ||
      lead?.call_end_time ||
      lead?.tracking_number ||
      lead?.call_flow ||
      String(lead?.lead_source || '')
        .toLowerCase()
        .includes('truepulse'),
    );
  }, [lead]);

  const isDelacon = useMemo(() => {
    return Boolean(
      lead?.info_termination_point ||
      lead?.city_from_delacon ||
      lead?.landing_page_delacon ||
      lead?.delacon_sales_fr_tat ||
      lead?.sales_fr_tat ||
      lead?.adwords_info_conversions ||
      lead?.adwords_info_clicks ||
      lead?.adwords_info_cost ||
      lead?.adwords_info_cpc ||
      String(lead?.lead_source || '')
        .toLowerCase()
        .includes('delacon'),
    );
  }, [lead]);

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

  const infoCallStatusSelectOptions = useMemo(() => {
    const statuses = leadOptions.info_call_status || [];
    const rawIcs = lead?.info_call_status;
    if (rawIcs && String(rawIcs).trim() && !statuses.some((o) => o.value === rawIcs)) {
      return [{ value: rawIcs, label: rawIcs }, ...statuses];
    }
    return statuses;
  }, [leadOptions.info_call_status, lead?.info_call_status]);

  if (!isTruePulse && !isDelacon) {
    return (
      <div className='flex flex-col items-center justify-center py-16 text-center h-full'>
        <div className='flex h-12 w-12 items-center justify-center rounded-full bg-bg-weak-100 mb-4'>
          <RiFileTextLine className='h-6 w-6 text-text-sub-400' />
        </div>
        <h3 className='text-label-md font-semibold text-text-main-900'>No call details</h3>
        <p className='text-paragraph-sm text-text-sub-500 max-w-[320px] mt-1'>
          This lead does not have any Delacon or TruePulse call details associated with it.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-5 py-5'>
      <div className='grid grid-cols-2 gap-x-6 gap-y-5'>
        {isDelacon && (
          <>
            <span className='col-span-2 text-label-md font-semibold text-text-main-900 border-b border-stroke-soft-200 pb-2'>
              Delacon Call Details
            </span>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Info Date</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Datepicker
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  value={lead?.info_date ? parseToDate(lead.info_date) : undefined}
                  onChange={(date) =>
                    handleChange('info_date', date ? format(date, 'yyyy-MM-dd') : '')
                  }
                  placeholder='DD-MM-YY'
                  className='-ml-2 text-label-sm text-text-main-900'
                />
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Info Termination Point</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.info_termination_point || ''}
                      onChange={(e) => handleChange('info_termination_point', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
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
                  renderOptionLabel={(opt) => (
                    <InfoCallStatusBadge status={opt?.label || opt?.value} />
                  )}
                />
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>City</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <CityCombobox
                  value={lead?.city_from_delacon || ''}
                  onChange={(v) => handleChange('city_from_delacon', v)}
                  placeholder='Select'
                  className='-ml-2'
                />
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Adwords Info Conversions</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.adwords_info_conversions || ''}
                      onChange={(e) => handleChange('adwords_info_conversions', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Adwords Info CPC</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.adwords_info_cpc || ''}
                      onChange={(e) => handleChange('adwords_info_cpc', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Adwords Info Cost</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.adwords_info_cost || ''}
                      onChange={(e) => handleChange('adwords_info_cost', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Info Caller</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.info_caller || ''}
                      onChange={(e) => handleChange('info_caller', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Adwords Info Clicks</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.adwords_info_clicks || ''}
                      onChange={(e) => handleChange('adwords_info_clicks', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Call Recordings</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.call_recordings || ''}
                      onChange={(e) => handleChange('call_recordings', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
              {lead?.call_recordings &&
                (lead.call_recordings.startsWith('http') || lead.call_recordings.includes('/')) && (
                  <div className='mt-1 flex flex-col gap-1'>
                    <a
                      href={`${apiOrigin}/api/method/devx.devx_crm.api.crm_lead.play_recording?url=${encodeURIComponent(lead.call_recordings)}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-xs text-blue-600 hover:underline font-medium'
                    >
                      Listen / Download Recording
                    </a>
                    <audio
                      controls
                      src={`${apiOrigin}/api/method/devx.devx_crm.api.crm_lead.play_recording?url=${encodeURIComponent(lead.call_recordings)}`}
                      className='mt-1 w-full max-w-[240px] h-7'
                    />
                  </div>
                )}
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Landing Page</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.landing_page_delacon || ''}
                      onChange={(e) => handleChange('landing_page_delacon', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Web Info Page Called From</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.web_info_page_called_from || ''}
                      onChange={(e) => handleChange('web_info_page_called_from', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Web Info Search Engine</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.web_info_search_engine || ''}
                      onChange={(e) => handleChange('web_info_search_engine', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Web Info Search Type</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.web_info_search_type || ''}
                      onChange={(e) => handleChange('web_info_search_type', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Inside Sales FR TAT</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.inside_sales_fr_tat || ''}
                      onChange={(e) => handleChange('inside_sales_fr_tat', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Sales FR TAT</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.sales_fr_tat || ''}
                      onChange={(e) => handleChange('sales_fr_tat', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>
          </>
        )}

        {isTruePulse && (
          <>
            <span className='col-span-2 text-label-md font-semibold text-text-main-900 border-b border-stroke-soft-200 pb-2 mt-4'>
              TruePulse Call Details
            </span>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Call ID</FieldLabel>
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
              <FieldLabel>True Pulse Data Bridge ID</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.true_pulse_data_bridge_id || ''}
                      onChange={(e) => handleChange('true_pulse_data_bridge_id', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
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
              <FieldLabel>Caller Number</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.info_caller || ''}
                      onChange={(e) => handleChange('info_caller', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Tracking Number</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.tracking_number || ''}
                      onChange={(e) => handleChange('tracking_number', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Call Recording Link</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.call_recordings || ''}
                      onChange={(e) => handleChange('call_recordings', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
              {lead?.call_recordings &&
                (lead.call_recordings.startsWith('http') || lead.call_recordings.includes('/')) && (
                  <div className='mt-1 flex flex-col gap-1'>
                    <a
                      href={`${apiOrigin}/api/method/devx.devx_crm.api.crm_lead.play_recording?url=${encodeURIComponent(lead.call_recordings)}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-xs text-blue-600 hover:underline font-medium'
                    >
                      Listen / Download Recording
                    </a>
                    <audio
                      controls
                      src={`${apiOrigin}/api/method/devx.devx_crm.api.crm_lead.play_recording?url=${encodeURIComponent(lead.call_recordings)}`}
                      className='mt-1 w-full max-w-[240px] h-7'
                    />
                  </div>
                )}
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Call Status</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <SearchableSelect
                  variant='borderless'
                  size='xsmall'
                  matchTriggerWidth={false}
                  showArrow={false}
                  value={lead?.info_call_status ?? ''}
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
                  renderOptionLabel={(opt) => (
                    <InfoCallStatusBadge status={opt?.label || opt?.value} />
                  )}
                />
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Call Type</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.call_type || ''}
                      onChange={(e) => handleChange('call_type', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Call Duration (seconds)</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.call_duration || ''}
                      onChange={(e) => handleChange('call_duration', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Agent Name</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.agent_name || ''}
                      onChange={(e) => handleChange('agent_name', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Agent Phone</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.agent_phone || ''}
                      onChange={(e) => handleChange('agent_phone', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Call Start Time</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.call_start_time || ''}
                      onChange={(e) => handleChange('call_start_time', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Call End Time</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.call_end_time || ''}
                      onChange={(e) => handleChange('call_end_time', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Page Called From</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.page_called_from || ''}
                      onChange={(e) => handleChange('page_called_from', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Referrer</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.referrer || ''}
                      onChange={(e) => handleChange('referrer', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>IP Address</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.ip_address || ''}
                      onChange={(e) => handleChange('ip_address', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Device</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.device || ''}
                      onChange={(e) => handleChange('device', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Browser</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.browser || ''}
                      onChange={(e) => handleChange('browser', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>

            <div className='flex flex-col gap-1'>
              <FieldLabel>Call Flow</FieldLabel>
              <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
                <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                  <Input.Wrapper>
                    <Input.Input
                      value={lead?.call_flow || ''}
                      onChange={(e) => handleChange('call_flow', e.target.value)}
                      placeholder='Enter'
                      className='text-label-sm text-text-main-900'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </EditableFieldWrapper>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CrmLeadAboutCallDetails;
