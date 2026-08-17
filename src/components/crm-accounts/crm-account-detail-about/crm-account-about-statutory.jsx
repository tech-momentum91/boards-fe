import React, { useState, useCallback } from 'react';
import { RiFileTextLine } from 'react-icons/ri';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import * as Badge from '@/components/ui/badge';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import * as Input from '@/components/ui/input';
import { validateClientField } from '@/schemas/client-schema';

const GST_STATUS_OPTIONS = [
  { value: 'Registered', label: 'Registered' },
  { value: 'Unregistered', label: 'Unregistered' },
  { value: 'Composition', label: 'Composition' },
];

const FieldLabel = ({ children }) => (
  <label className='text-paragraph-sm opacity-72 text-text-sub-500'>{children}</label>
);

const FieldError = ({ message }) =>
  message ? <span className='text-paragraph-xs text-error-base'>{message}</span> : null;

const CrmAccountAboutStatutory = ({ account, onFieldChange }) => {
  const [localData, setLocalData] = useState({
    registration_number: account?.registration_number || '',
    pan_number: account?.pan_number || '',
    tan_number: account?.tan_number || '',
    gst_status: account?.gst_status || '',
    gstin: account?.gstin || '',
    msme_number: account?.msme_number || '',
    pf_number: account?.pf_number || '',
    esi_number: account?.esi_number || '',
    professional_tax: account?.professional_tax || '',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const gstStatus = localData.gst_status;
  const gstStatusBadgeColor =
    gstStatus === 'Registered' || gstStatus === 'Composition' ? 'green' : 'gray';

  const commitChange = useCallback(
    (field, value) => {
      setLocalData((previous) => ({ ...previous, [field]: value }));
      if (onFieldChange) onFieldChange(field, value);
    },
    [onFieldChange],
  );

  const clearError = useCallback((field) => {
    setFieldErrors((previous) => ({ ...previous, [field]: '' }));
  }, []);

  // ── GST Status change ──────────────────────────────────────────────────────
  const handleGstStatusChange = useCallback(
    (value) => {
      if (value === 'Unregistered') {
        clearError('gstin');
        setLocalData((previous) => ({ ...previous, gst_status: value, gstin: '' }));
        if (onFieldChange) {
          onFieldChange('gst_status', value);
          onFieldChange('gstin', '');
        }
        return;
      }

      if (value === 'Registered' || value === 'Composition') {
        const gstinTrimmed = localData.gstin.trim().toUpperCase();
        const error = validateClientField('gstin', gstinTrimmed, {
          gstStatus: value,
          custom_gst_status: value,
        });
        if (error) {
          setFieldErrors((previous) => ({ ...previous, gstin: error }));
        } else {
          clearError('gstin');
        }
      }

      setLocalData((previous) => ({ ...previous, gst_status: value }));
      if (onFieldChange) onFieldChange('gst_status', value);
    },
    [localData.gstin, onFieldChange, clearError],
  );

  // ── GSTIN blur ─────────────────────────────────────────────────────────────
  const handleGstinBlur = useCallback(
    (e) => {
      const value = e.target.value.trim().toUpperCase();
      const error = validateClientField('gstin', value, {
        gstStatus,
        custom_gst_status: gstStatus,
      });
      if (error) {
        setFieldErrors((previous) => ({ ...previous, gstin: error }));
        return;
      }
      clearError('gstin');
      commitChange('gstin', value);
    },
    [gstStatus, commitChange, clearError],
  );

  // ── PAN blur ───────────────────────────────────────────────────────────────
  const handlePanBlur = useCallback(
    (e) => {
      const value = e.target.value.trim().toUpperCase();
      const error = validateClientField('pan', value, {
        gstStatus,
        custom_gst_status: gstStatus,
      });
      if (error) {
        setFieldErrors((previous) => ({ ...previous, pan_number: error }));
        return;
      }
      clearError('pan_number');
      commitChange('pan_number', value);
    },
    [gstStatus, commitChange, clearError],
  );

  // ── TAN blur ───────────────────────────────────────────────────────────────
  const handleTanBlur = useCallback(
    (e) => {
      const value = e.target.value.trim().toUpperCase();
      const error = validateClientField('custom_tan_number', value, {
        gstStatus,
        custom_gst_status: gstStatus,
      });
      if (error) {
        setFieldErrors((previous) => ({ ...previous, tan_number: error }));
        return;
      }
      clearError('tan_number');
      commitChange('tan_number', value);
    },
    [gstStatus, commitChange, clearError],
  );

  return (
    <div className='flex flex-col gap-5 py-5'>
      <div className='flex items-center gap-2'>
        <RiFileTextLine className='size-5 text-text-sub-500 shrink-0' />
        <h3 className='text-label-md text-neutral-500'>Statutory & Compliance Details</h3>
      </div>

      <div className='flex flex-col gap-5'>
        <div className='grid grid-cols-2 gap-x-12 gap-y-4'>
          {/* Registration Number */}
          <div className='flex flex-1 flex-col gap-1'>
            <FieldLabel>Registration Number</FieldLabel>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                <Input.Wrapper>
                  <Input.Input
                    value={localData.registration_number}
                    onChange={(e) =>
                      setLocalData((previous) => ({
                        ...previous,
                        registration_number: e.target.value,
                      }))
                    }
                    onBlur={(e) => commitChange('registration_number', e.target.value.trim())}
                    placeholder='Enter registration number'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
          </div>

          {/* PAN Number */}
          <div className='flex flex-1 flex-col gap-1'>
            <FieldLabel>PAN Number</FieldLabel>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root
                variant='borderless'
                size='xsmall'
                className='-ml-2'
                hasError={Boolean(fieldErrors.pan_number)}
              >
                <Input.Wrapper>
                  <Input.Input
                    value={localData.pan_number}
                    onChange={(e) => {
                      setLocalData((previous) => ({
                        ...previous,
                        pan_number: e.target.value.toUpperCase(),
                      }));
                      if (fieldErrors.pan_number) clearError('pan_number');
                    }}
                    onBlur={handlePanBlur}
                    placeholder='Enter PAN number'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
            <FieldError message={fieldErrors.pan_number} />
          </div>

          {/* TAN Number */}
          <div className='flex flex-1 flex-col gap-1'>
            <FieldLabel>TAN Number</FieldLabel>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root
                variant='borderless'
                size='xsmall'
                className='-ml-2'
                hasError={Boolean(fieldErrors.tan_number)}
              >
                <Input.Wrapper>
                  <Input.Input
                    value={localData.tan_number}
                    onChange={(e) => {
                      setLocalData((previous) => ({
                        ...previous,
                        tan_number: e.target.value.toUpperCase(),
                      }));
                      if (fieldErrors.tan_number) clearError('tan_number');
                    }}
                    onBlur={handleTanBlur}
                    placeholder='Enter TAN number'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
            <FieldError message={fieldErrors.tan_number} />
          </div>

          {/* GST Status */}
          <div className='flex flex-1 flex-col gap-1'>
            <FieldLabel>GST Status</FieldLabel>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Select.Root
                variant='borderless'
                value={gstStatus}
                onValueChange={handleGstStatusChange}
                size='xsmall'
                matchTriggerWidth={false}
              >
                <Select.Trigger className='w-full -ml-2' showArrow={false}>
                  <Select.Value placeholder='Select'>
                    {gstStatus ? (
                      <Badge.Root
                        size='small'
                        variant='light'
                        color={gstStatusBadgeColor}
                        className='rounded-md'
                      >
                        {gstStatus}
                      </Badge.Root>
                    ) : (
                      <span className='text-label-sm text-text-main-900'>Select</span>
                    )}
                  </Select.Value>
                </Select.Trigger>
                <Select.Content>
                  {GST_STATUS_OPTIONS.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </EditableFieldWrapper>
          </div>

          {/* GSTIN */}
          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>
              GSTIN
              {(gstStatus === 'Registered' || gstStatus === 'Composition') && <Label.Asterisk />}
            </label>
            <EditableFieldWrapper
              editable={gstStatus === 'Registered' || gstStatus === 'Composition'}
              iconClassName='mr-2'
            >
              <Input.Root
                variant='borderless'
                size='xsmall'
                className='-ml-2'
                hasError={Boolean(fieldErrors.gstin)}
              >
                <Input.Wrapper>
                  <Input.Input
                    value={localData.gstin}
                    onChange={(e) => {
                      setLocalData((previous) => ({
                        ...previous,
                        gstin: e.target.value.toUpperCase(),
                      }));
                      if (fieldErrors.gstin) clearError('gstin');
                    }}
                    onBlur={handleGstinBlur}
                    placeholder='Enter GSTIN'
                    disabled={gstStatus !== 'Registered' && gstStatus !== 'Composition'}
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
            <FieldError message={fieldErrors.gstin} />
          </div>
        </div>

        <div className='border-t border-stroke-soft-200' />

        <div className='grid grid-cols-2 gap-x-12 gap-y-4'>
          {/* MSME Registered */}
          <div className='flex flex-1 flex-col gap-1'>
            <FieldLabel>MSME Registered</FieldLabel>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                <Input.Wrapper>
                  <Input.Input
                    value={localData.msme_number}
                    onChange={(e) =>
                      setLocalData((previous) => ({
                        ...previous,
                        msme_number: e.target.value,
                      }))
                    }
                    onBlur={(e) => commitChange('msme_number', e.target.value.trim())}
                    placeholder='Enter MSME registration number'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
          </div>

          {/* PF Available */}
          <div className='flex flex-1 flex-col gap-1'>
            <FieldLabel>PF Available</FieldLabel>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                <Input.Wrapper>
                  <Input.Input
                    value={localData.pf_number}
                    onChange={(e) =>
                      setLocalData((previous) => ({
                        ...previous,
                        pf_number: e.target.value,
                      }))
                    }
                    onBlur={(e) => commitChange('pf_number', e.target.value.trim())}
                    placeholder='Enter PF registration number'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
          </div>

          {/* ESI Available */}
          <div className='flex flex-1 flex-col gap-1'>
            <FieldLabel>ESI Available</FieldLabel>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                <Input.Wrapper>
                  <Input.Input
                    value={localData.esi_number}
                    onChange={(e) =>
                      setLocalData((previous) => ({
                        ...previous,
                        esi_number: e.target.value,
                      }))
                    }
                    onBlur={(e) => commitChange('esi_number', e.target.value.trim())}
                    placeholder='Enter ESI registration number'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
          </div>

          {/* Professional Tax */}
          <div className='flex flex-1 flex-col gap-1'>
            <FieldLabel>Professional Tax</FieldLabel>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                <Input.Wrapper>
                  <Input.Input
                    value={localData.professional_tax}
                    onChange={(e) =>
                      setLocalData((previous) => ({
                        ...previous,
                        professional_tax: e.target.value,
                      }))
                    }
                    onBlur={(e) => commitChange('professional_tax', e.target.value.trim())}
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

export default CrmAccountAboutStatutory;
