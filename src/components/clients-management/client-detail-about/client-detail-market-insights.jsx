import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  RiSearchEyeLine,
  RiArrowUpCircleLine,
  RiGlobalLine,
  RiUserHeartLine,
} from 'react-icons/ri';
import {
  selectClientDetail,
  selectLocalChanges,
  getFieldValue,
  setLocalChange,
  updateClientField,
  getClientDetailThunk,
} from '@/redux/clientDetailSlice';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import * as Input from '@/components/ui/input';
import * as Textarea from '@/components/ui/textarea';
import { showErrorToast } from '@/utils/error-utils';
import { validateClientField } from '@/schemas/client-schema';
import { cn } from '@/utils/cn';
import {
  MARKET_COMPETITIVE_FIELDS,
  GROWTH_TRACTION_FIELDS,
  DIGITAL_PRESENCE_FIELDS,
  INTENT_BEHAVIOR_FIELDS,
  PRODUCT_SERVICES_FIELDS,
} from './client-market-insights-fields';

const EditableOverviewField = ({
  label,
  fieldKey,
  data,
  localChanges,
  fieldErrors,
  setFieldErrors,
  onBlur,
  multiline,
  fullWidth,
}) => {
  const dispatch = useDispatch();
  const value = getFieldValue(data, localChanges, fieldKey) || '';

  const handleChange = (e) => {
    dispatch(setLocalChange({ fieldName: fieldKey, value: e.target.value }));
    if (fieldErrors[fieldKey]) setFieldErrors((previous) => ({ ...previous, [fieldKey]: '' }));
  };

  const handleBlur = (e) => {
    const val = e.target.value.trim();
    const error = validateClientField(fieldKey, val);
    if (error) {
      setFieldErrors((previous) => ({ ...previous, [fieldKey]: error }));
      return;
    }
    setFieldErrors((previous) => ({ ...previous, [fieldKey]: '' }));
    onBlur(fieldKey, val);
  };

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'col-span-1 sm:col-span-2')}>
      <label className='text-paragraph-sm text-text-sub-500 opacity-72'>{label}</label>
      <EditableFieldWrapper
        editable={true}
        iconClassName={cn('mr-2', multiline && 'top-1 bottom-auto translate-y-0 pt-1')}
      >
        {multiline ? (
          <Textarea.Root
            variant='borderless'
            size='xsmall'
            className='-ml-2 min-h-[40px] resize-y text-label-sm font-semibold text-text-main-900/90 leading-relaxed'
            hasError={Boolean(fieldErrors[fieldKey])}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        ) : (
          <Input.Root
            variant='borderless'
            size='xsmall'
            className='-ml-2'
            hasError={Boolean(fieldErrors[fieldKey])}
          >
            <Input.Wrapper>
              <Input.Input
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={`Enter ${label.toLowerCase()}`}
                className='text-label-sm font-semibold text-text-main-900'
              />
            </Input.Wrapper>
          </Input.Root>
        )}
      </EditableFieldWrapper>
      {fieldErrors[fieldKey] && (
        <span className='text-paragraph-xs text-error-base'>{fieldErrors[fieldKey]}</span>
      )}
    </div>
  );
};

const DetailSection = ({ title, icon: Icon, children }) => (
  <div className='flex flex-col gap-5 py-6 border-b border-stroke-soft-200 last:border-0'>
    <div className='flex items-center gap-2 px-1'>
      {Icon && <Icon size={20} className='text-text-soft-400' />}
      <span className='text-title-h6 font-semibold text-text-main-900'>{title}</span>
    </div>
    <div className='px-1'>{children}</div>
  </div>
);

const shouldShowMarketInsightsField = (field, data, localChanges) => {
  if (!field.hideWhenNull) return true;
  const value = getFieldValue(data, localChanges, field.key);
  return value != null && String(value).trim() !== '';
};

const FieldGrid = ({
  fields,
  data = {},
  localChanges = {},
  fieldErrors,
  setFieldErrors,
  onBlur,
}) => (
  <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-x-8 gap-y-6'>
    {fields
      .filter((field) => shouldShowMarketInsightsField(field, data, localChanges))
      .map((field) => (
        <EditableOverviewField
          key={field.key}
          label={field.label}
          fieldKey={field.key}
          data={data}
          localChanges={localChanges}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          onBlur={onBlur}
          multiline={field.multiline}
          fullWidth={field.fullWidth}
        />
      ))}
  </div>
);

const ClientDetailMarketInsights = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;
  const localChanges = useSelector(selectLocalChanges);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleFieldChange = async (fieldName, value) => {
    if (!client && !id) return;

    const currentClientId = client?.name || client?.id || id;
    const currentValue = client?.[fieldName] || '';
    const currentNormalized = String(currentValue || '');
    const newNormalized = String(value || '');

    if (currentNormalized === newNormalized) return;

    dispatch(setLocalChange({ fieldName, value }));

    try {
      const updateResult = await dispatch(
        updateClientField({ clientId: currentClientId, fieldname: fieldName, value }),
      );

      if (updateResult.type === 'clientDetail/updateClientField/rejected') {
        dispatch(setLocalChange({ fieldName, value: null }));
        showErrorToast(updateResult.payload, {
          defaultMessage: 'Failed to update field. Please try again.',
        });
        return;
      }

      if (updateResult.type === 'clientDetail/updateClientField/fulfilled' && id) {
        await dispatch(getClientDetailThunk(currentClientId));
      }
    } catch (error) {
      console.error('Failed to update field:', error);
      dispatch(setLocalChange({ fieldName, value: null }));
      showErrorToast(error.payload, {
        defaultMessage: 'Failed to update field. Please try again.',
      });
    }
  };

  return (
    <div className='flex flex-col'>
      <DetailSection title='Products & Services' icon={RiSearchEyeLine}>
        <FieldGrid
          fields={PRODUCT_SERVICES_FIELDS}
          data={client}
          localChanges={localChanges}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          onBlur={handleFieldChange}
        />
      </DetailSection>

      <DetailSection title='Competitive Landscape' icon={RiSearchEyeLine}>
        <FieldGrid
          fields={MARKET_COMPETITIVE_FIELDS}
          data={client}
          localChanges={localChanges}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          onBlur={handleFieldChange}
        />
      </DetailSection>

      {/* <DetailSection title='Growth & Traction' icon={RiArrowUpCircleLine}>
        <FieldGrid
          fields={GROWTH_TRACTION_FIELDS}
          data={client}
          localChanges={localChanges}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          onBlur={handleFieldChange}
        />
      </DetailSection> */}

      {/* <DetailSection title='Digital Presence' icon={RiGlobalLine}>
        <FieldGrid
          fields={DIGITAL_PRESENCE_FIELDS}
          data={client}
          localChanges={localChanges}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          onBlur={handleFieldChange}
        />
      </DetailSection>

      <DetailSection title='Intent & Behavior' icon={RiUserHeartLine}>
        <FieldGrid
          fields={INTENT_BEHAVIOR_FIELDS}
          data={client}
          localChanges={localChanges}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          onBlur={handleFieldChange}
        />
      </DetailSection> */}
    </div>
  );
};

export default ClientDetailMarketInsights;
