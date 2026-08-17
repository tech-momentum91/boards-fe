import React, { useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { RiFileTextLine } from 'react-icons/ri';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import * as Badge from '@/components/ui/badge';
import * as Label from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Input from '@/components/ui/input';
import { GST_STATUS_OPTIONS } from '@/components/clients-management/constants';
import {
  selectLocalChanges,
  getFieldValue,
  setLocalChange,
  selectClientDetail,
  updateClientField,
  getClientDetailThunk,
} from '@/redux/clientDetailSlice';
import { showErrorToast } from '@/utils/error-utils';
import { validateClientField } from '@/schemas/client-schema';

const ClientDetailAboutStatutory = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;
  const localChanges = useSelector(selectLocalChanges);
  const [fieldErrors, setFieldErrors] = useState({});

  const updateQueueRef = useRef(Promise.resolve());

  const gstStatus = getFieldValue(client, localChanges, 'custom_gst_status');

  const runSingleUpdate = useCallback(
    (fieldName, value) => {
      const currentClientId = client?.name || client?.id || id;
      if (!currentClientId) return Promise.resolve();

      return dispatch(
        updateClientField({ clientId: currentClientId, fieldname: fieldName, value }),
      ).then((result) => {
        if (result.type === 'clientDetail/updateClientField/rejected') {
          dispatch(setLocalChange({ fieldName, value: null }));
          showErrorToast(result.payload, {
            defaultMessage: 'Failed to update client field. Please try again.',
          });
          return;
        }
        if (result.type === 'clientDetail/updateClientField/fulfilled' && id) {
          return dispatch(getClientDetailThunk(currentClientId));
        }
      });
    },
    [client, id, dispatch],
  );

  const commitBatchFields = useCallback(
    (fields) => {
      if (!client && !id) return;
      const currentClientId = client?.name || client?.id || id;

      fields.forEach(({ name, value }) => {
        dispatch(setLocalChange({ fieldName: name, value }));
      });

      fields.forEach(({ name, value }) => {
        updateQueueRef.current = updateQueueRef.current
          .catch(() => {})
          .then(() => runSingleUpdate(name, value));
      });
    },
    [client, id, dispatch, runSingleUpdate],
  );

  const handleFieldChange = useCallback(
    (fieldName, value) => {
      if (!client && !id) return;

      const currentClientId = client?.name || client?.id || id;
      const currentValue = client?.[fieldName] || '';
      const currentNormalized = String(currentValue || '');
      const newNormalized = String(value ?? '');

      if (currentNormalized === newNormalized) {
        return;
      }

      dispatch(setLocalChange({ fieldName, value }));

      updateQueueRef.current = updateQueueRef.current
        .catch(() => {})
        .then(() => runSingleUpdate(fieldName, value));
    },
    [client, id, dispatch, runSingleUpdate],
  );

  const handleGstStatusChange = useCallback(
    (value) => {
      const gstinValue = getFieldValue(client, localChanges, 'gstin');
      const gstinTrimmed = String(gstinValue ?? '')
        .trim()
        .toUpperCase();

      dispatch(setLocalChange({ fieldName: 'custom_gst_status', value }));

      if (value === 'Unregistered') {
        setFieldErrors((previous) => ({ ...previous, gstin: '' }));
        commitBatchFields([
          { name: 'custom_gst_status', value },
          { name: 'gstin', value: null },
        ]);
        return;
      }

      if (value === 'Registered' || value === 'Composition') {
        const gstinError = validateClientField('gstin', gstinTrimmed, {
          gstStatus: value,
          custom_gst_status: value,
        });
        if (gstinError) {
          setFieldErrors((previous) => ({ ...previous, gstin: gstinError }));
          return;
        }
        setFieldErrors((previous) => ({ ...previous, gstin: '' }));
        commitBatchFields([
          { name: 'custom_gst_status', value },
          { name: 'gstin', value: gstinTrimmed || null },
        ]);
      } else {
        handleFieldChange('custom_gst_status', value);
      }
    },
    [client, localChanges, dispatch, commitBatchFields, handleFieldChange],
  );

  const handleGstinBlur = useCallback(
    (e) => {
      const value = e.target.value.trim().toUpperCase();
      const status = getFieldValue(client, localChanges, 'custom_gst_status');

      const error = validateClientField('gstin', value, {
        gstStatus: status,
        custom_gst_status: status,
      });
      if (error) {
        setFieldErrors((previous) => ({ ...previous, gstin: error }));
        return;
      }
      setFieldErrors((previous) => ({ ...previous, gstin: '' }));
      dispatch(setLocalChange({ fieldName: 'gstin', value }));

      if (status === 'Registered' || status === 'Composition') {
        commitBatchFields([
          { name: 'custom_gst_status', value: status },
          { name: 'gstin', value },
        ]);
      } else {
        handleFieldChange('gstin', value);
      }
    },
    [client, localChanges, commitBatchFields, handleFieldChange, dispatch],
  );

  const gstStatusBadgeColor =
    gstStatus === 'Registered' || gstStatus === 'Composition' ? 'green' : 'gray';

  return (
    <div className='flex flex-col gap-5 py-5'>
      <div className='flex items-center gap-2'>
        <RiFileTextLine className='size-5 text-text-sub-500 shrink-0' />
        <h3 className='text-label-md text-neutral-500'>Statutory & Compliance Details</h3>
      </div>
      <div className='flex flex-col gap-5'>
        {/* First Grid Section */}
        <div className='grid grid-cols-2 gap-x-12 gap-y-4'>
          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>
              Registration Number
            </label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root
                key={`registration-number-${client?.name || id || 'default'}`}
                variant='borderless'
                size='xsmall'
                className='-ml-2'
                hasError={Boolean(fieldErrors.custom_organization_registration_number)}
              >
                <Input.Wrapper>
                  <Input.Input
                    value={
                      getFieldValue(
                        client,
                        localChanges,
                        'custom_organization_registration_number',
                      ) || ''
                    }
                    onChange={(e) => {
                      dispatch(
                        setLocalChange({
                          fieldName: 'custom_organization_registration_number',
                          value: e.target.value,
                        }),
                      );
                      if (fieldErrors.custom_organization_registration_number) {
                        setFieldErrors((previous) => ({
                          ...previous,
                          custom_organization_registration_number: '',
                        }));
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      const error = validateClientField(
                        'custom_organization_registration_number',
                        value,
                      );
                      if (error) {
                        setFieldErrors((previous) => ({
                          ...previous,
                          custom_organization_registration_number: error,
                        }));
                        return;
                      }
                      setFieldErrors((previous) => ({
                        ...previous,
                        custom_organization_registration_number: '',
                      }));
                      handleFieldChange('custom_organization_registration_number', value);
                    }}
                    placeholder='Enter registration number'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
            {fieldErrors.custom_organization_registration_number && (
              <span className='text-paragraph-xs text-error-base'>
                {fieldErrors.custom_organization_registration_number}
              </span>
            )}
          </div>

          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>PAN Number</label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root
                key={`pan-${client?.name || id || 'default'}`}
                variant='borderless'
                size='xsmall'
                className='-ml-2'
                hasError={Boolean(fieldErrors.pan)}
              >
                <Input.Wrapper>
                  <Input.Input
                    value={getFieldValue(client, localChanges, 'pan') || ''}
                    onChange={(e) => {
                      dispatch(
                        setLocalChange({ fieldName: 'pan', value: e.target.value.toUpperCase() }),
                      );
                      if (fieldErrors.pan) setFieldErrors((previous) => ({ ...previous, pan: '' }));
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim().toUpperCase();
                      const error = validateClientField('pan', value, {
                        gstStatus,
                        custom_gst_status: gstStatus,
                      });
                      if (error) {
                        setFieldErrors((previous) => ({ ...previous, pan: error }));
                        return;
                      }
                      setFieldErrors((previous) => ({ ...previous, pan: '' }));
                      handleFieldChange('pan', value);
                    }}
                    placeholder='Enter PAN number'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
            {fieldErrors.pan && (
              <span className='text-paragraph-xs text-error-base'>{fieldErrors.pan}</span>
            )}
          </div>

          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>TAN Number</label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root
                key={`tan-${client?.name || id || 'default'}`}
                variant='borderless'
                size='xsmall'
                className='-ml-2'
                hasError={Boolean(fieldErrors.custom_tan_number)}
              >
                <Input.Wrapper>
                  <Input.Input
                    value={getFieldValue(client, localChanges, 'custom_tan_number') || ''}
                    onChange={(e) => {
                      dispatch(
                        setLocalChange({
                          fieldName: 'custom_tan_number',
                          value: e.target.value.toUpperCase(),
                        }),
                      );
                      if (fieldErrors.custom_tan_number) {
                        setFieldErrors((previous) => ({ ...previous, custom_tan_number: '' }));
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim().toUpperCase();
                      const error = validateClientField('custom_tan_number', value, {
                        gstStatus,
                        custom_gst_status: gstStatus,
                      });
                      if (error) {
                        setFieldErrors((previous) => ({ ...previous, custom_tan_number: error }));
                        return;
                      }
                      setFieldErrors((previous) => ({ ...previous, custom_tan_number: '' }));
                      handleFieldChange('custom_tan_number', value);
                    }}
                    placeholder='Enter TAN number'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
            {fieldErrors.custom_tan_number && (
              <span className='text-paragraph-xs text-error-base'>
                {fieldErrors.custom_tan_number}
              </span>
            )}
          </div>

          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>GST Status</label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <SearchableSelect
                variant='borderless'
                value={gstStatus}
                onValueChange={handleGstStatusChange}
                size='xsmall'
                options={GST_STATUS_OPTIONS}
                placeholder='Select'
                searchPlaceholder='Search GST status...'
                showArrow={false}
                isolateSearchKeyboard
                renderTrigger={({ selectedLabel }) =>
                  selectedLabel ? (
                    <Badge.Root
                      size='small'
                      variant='light'
                      color={gstStatusBadgeColor}
                      className='rounded-md'
                    >
                      {selectedLabel}
                    </Badge.Root>
                  ) : (
                    <span className='text-label-sm text-text-main-900'>Select</span>
                  )
                }
              />
            </EditableFieldWrapper>
          </div>

          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>
              GSTIN
              {(gstStatus === 'Registered' || gstStatus === 'Composition') && <Label.Asterisk />}
            </label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root
                key={`gstin-${client?.name || id || 'default'}`}
                variant='borderless'
                size='xsmall'
                className='-ml-2'
                hasError={Boolean(fieldErrors.gstin)}
              >
                <Input.Wrapper>
                  <Input.Input
                    value={getFieldValue(client, localChanges, 'gstin') || ''}
                    onChange={(e) => {
                      dispatch(
                        setLocalChange({ fieldName: 'gstin', value: e.target.value.toUpperCase() }),
                      );
                      if (fieldErrors.gstin)
                        setFieldErrors((previous) => ({ ...previous, gstin: '' }));
                    }}
                    onBlur={handleGstinBlur}
                    placeholder='Enter GSTIN'
                    disabled={gstStatus !== 'Registered'}
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
            {fieldErrors.gstin && (
              <span className='text-paragraph-xs text-error-base'>{fieldErrors.gstin}</span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className='border-t border-stroke-soft-200' />

        {/* Second Grid Section */}
        <div className='grid grid-cols-2 gap-x-12 gap-y-4'>
          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>
              MSME Registered
            </label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root
                key={`msme-${client?.name || id || 'default'}`}
                variant='borderless'
                size='xsmall'
                className='-ml-2'
              >
                <Input.Wrapper>
                  <Input.Input
                    value={
                      getFieldValue(client, localChanges, 'custom__msme_registered_number') || ''
                    }
                    onChange={(e) => {
                      dispatch(
                        setLocalChange({
                          fieldName: 'custom__msme_registered_number',
                          value: e.target.value,
                        }),
                      );
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      handleFieldChange('custom__msme_registered_number', value);
                    }}
                    placeholder='Enter MSME registration number'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
          </div>

          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>PF Available</label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root
                key={`pf-${client?.name || id || 'default'}`}
                variant='borderless'
                size='xsmall'
                className='-ml-2'
              >
                <Input.Wrapper>
                  <Input.Input
                    value={
                      getFieldValue(client, localChanges, 'custom_provident_fund_number') || ''
                    }
                    onChange={(e) => {
                      dispatch(
                        setLocalChange({
                          fieldName: 'custom_provident_fund_number',
                          value: e.target.value,
                        }),
                      );
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      handleFieldChange('custom_provident_fund_number', value);
                    }}
                    placeholder='Enter PF registration number'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
          </div>

          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>ESI Available</label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root
                key={`esi-${client?.name || id || 'default'}`}
                variant='borderless'
                size='xsmall'
                className='-ml-2'
              >
                <Input.Wrapper>
                  <Input.Input
                    value={getFieldValue(client, localChanges, 'custom_esi_number') || ''}
                    onChange={(e) => {
                      dispatch(
                        setLocalChange({ fieldName: 'custom_esi_number', value: e.target.value }),
                      );
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      handleFieldChange('custom_esi_number', value);
                    }}
                    placeholder='Enter ESI registration number'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
          </div>

          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>
              Professional Tax
            </label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root
                key={`professional-tax-${client?.name || id || 'default'}`}
                variant='borderless'
                size='xsmall'
                className='-ml-2'
              >
                <Input.Wrapper>
                  <Input.Input
                    value={
                      getFieldValue(client, localChanges, 'custom_professional_tax_number') || ''
                    }
                    onChange={(e) => {
                      dispatch(
                        setLocalChange({
                          fieldName: 'custom_professional_tax_number',
                          value: e.target.value,
                        }),
                      );
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      handleFieldChange('custom_professional_tax_number', value);
                    }}
                    placeholder='Enter professional tax number'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailAboutStatutory;
