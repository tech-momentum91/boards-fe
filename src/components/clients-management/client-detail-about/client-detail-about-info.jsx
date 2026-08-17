import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import FieldRow from '@/components/ui/field-row';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import * as Input from '@/components/ui/input';
import * as Tag from '@/components/ui/tag';
import * as Tooltip from '@/components/ui/tooltip';
import * as Checkbox from '@/components/ui/checkbox';
import {
  ORGANIZATION_TYPE_OPTIONS,
  COMPANY_SECTOR_OPTIONS,
  CLIENT_STATUS_OPTIONS,
  getClientStatusBadgeVariant,
} from '@/components/clients-management/constants';
import {
  selectLocalChanges,
  getFieldValue,
  setLocalChange,
  selectClientDetail,
  updateClientField,
  getClientDetailThunk,
} from '@/redux/clientDetailSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { parseToDate } from '@/utils/date-utils';
import { format } from 'date-fns';
import { Datepicker } from '@/components/ui/datepicker';
import { validateClientField } from '@/schemas/client-schema';
import { RiBuildingLine, RiSearchLine } from 'react-icons/ri';
import { fetchCentersForClient } from '@/redux/ticketManagementSlice';

const ClientDetailAboutInfo = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;
  const localChanges = useSelector(selectLocalChanges);
  const [fieldErrors, setFieldErrors] = useState({});

  const centers = useSelector((state) => state.ticketManagement?.centers?.data || []);
  const [centerSearchQuery, setCenterSearchQuery] = useState('');
  const [centerSelectOpen, setCenterSelectOpen] = useState(false);
  const [pendingCenters, setPendingCenters] = useState([]);
  const [centerSnapshot, setCenterSnapshot] = useState([]);
  const pendingCentersRef = useRef([]);
  const centerSnapshotRef = useRef([]);

  const centerOptions = useMemo(() => {
    return (centers || []).map((c) => ({
      value:
        c.value || c.name || c.center || c.center_id || c.id || (typeof c === 'string' ? c : ''),
      label:
        c.label ||
        c.center_name ||
        c.centerName ||
        c.name ||
        c.center ||
        (typeof c === 'string' ? c : ''),
    }));
  }, [centers]);

  const filteredCenters = useMemo(() => {
    if (!centerSearchQuery.trim()) return centerOptions;
    const query = centerSearchQuery.toLowerCase();
    return centerOptions.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [centerOptions, centerSearchQuery]);

  const selectedCenters = useMemo(() => {
    // IMPORTANT: `getFieldValue` stringifies arrays/objects; for center assignment we need raw arrays.
    const rawAssignment =
      localChanges?.custom_center_assignment ?? client?.custom_center_assignment ?? null;

    if (Array.isArray(rawAssignment) && rawAssignment.length > 0) {
      return rawAssignment.map((r) => r?.center).filter(Boolean);
    }

    // Fallback for older payloads that stored it directly
    const raw = localChanges?.custom_center ?? client?.custom_center ?? null;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string')
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return [];
  }, [client, localChanges]);

  const displayCenters = centerSelectOpen ? pendingCenters : selectedCenters;
  const effectivePendingCenters =
    centerSelectOpen && pendingCenters.length === 0 ? selectedCenters : pendingCenters;

  const handleFieldChange = async (fieldName, value, successMessage) => {
    if (!client && !id) return;

    const currentClientId = client?.name || client?.id || id;
    const currentValue = client?.[fieldName] || '';
    const normalize = (v) => {
      if (Array.isArray(v)) return JSON.stringify(v);
      if (v && typeof v === 'object') return JSON.stringify(v);
      return String(v ?? '');
    };
    const currentNormalized = normalize(currentValue);
    const newNormalized = normalize(value);

    // Only update if value actually changed
    if (currentNormalized === newNormalized) {
      return;
    }

    // Update local state immediately for smooth UX
    dispatch(setLocalChange({ fieldName, value }));

    try {
      const updateResult = await dispatch(
        updateClientField({ clientId: currentClientId, fieldname: fieldName, value }),
      );

      if (updateResult.type === 'clientDetail/updateClientField/rejected') {
        // Revert local change on error
        dispatch(setLocalChange({ fieldName, value: null }));
        showErrorToast(updateResult.payload, {
          defaultMessage: 'Failed to update client field. Please try again.',
        });
        return;
      }

      // Refetch client detail to get updated data
      if (updateResult.type === 'clientDetail/updateClientField/fulfilled' && id) {
        await dispatch(getClientDetailThunk(currentClientId));
        if (successMessage) {
          showSuccessToast(successMessage);
        }
      }
    } catch (error) {
      console.error('Failed to update client field:', error);
      // Revert local change on error
      dispatch(setLocalChange({ fieldName, value: null }));
      showErrorToast(error.payload, {
        defaultMessage: 'Failed to update client field. Please try again.',
      });
    }
  };

  const commitCenters = useCallback(() => {
    const prev = Array.isArray(centerSnapshotRef.current) ? centerSnapshotRef.current : [];
    const next = Array.isArray(pendingCentersRef.current) ? pendingCentersRef.current : [];
    const changed = JSON.stringify(prev) !== JSON.stringify(next);
    if (changed) {
      const assignmentPayload = next.map((center) => ({ center }));
      handleFieldChange(
        'custom_center_assignment',
        assignmentPayload,
        'Center updated successfully.',
      );
    }
    setCenterSnapshot([]);
    centerSnapshotRef.current = [];
  }, []);

  useEffect(() => {
    pendingCentersRef.current = Array.isArray(pendingCenters) ? pendingCenters : [];
  }, [pendingCenters]);

  useEffect(() => {
    centerSnapshotRef.current = Array.isArray(centerSnapshot) ? centerSnapshot : [];
  }, [centerSnapshot]);

  useEffect(() => {
    // Fetch centers once when component mounts (for the searchable dropdown list)
    dispatch(fetchCentersForClient());
  }, [dispatch]);

  return (
    <div className='flex flex-col gap-5 py-5'>
      <div className='flex flex-col gap-5'>
        <div className='flex gap-3'>
          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>Name</label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root
                key={`display-name-${client?.name || id || 'default'}`}
                variant='borderless'
                size='xsmall'
                className='-ml-2'
                hasError={Boolean(fieldErrors.customer_name)}
              >
                <Input.Wrapper>
                  <Input.Input
                    value={getFieldValue(client, localChanges, 'customer_name') || ''}
                    onChange={(e) => {
                      dispatch(
                        setLocalChange({ fieldName: 'customer_name', value: e.target.value }),
                      );
                      if (fieldErrors.customer_name)
                        setFieldErrors((previous) => ({ ...previous, customer_name: '' }));
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      const error = validateClientField('customer_name', value);
                      if (error) {
                        setFieldErrors((previous) => ({ ...previous, customer_name: error }));
                        return;
                      }
                      setFieldErrors((previous) => ({ ...previous, customer_name: '' }));
                      handleFieldChange('customer_name', value);
                    }}
                    placeholder='Enter name'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
            {fieldErrors.customer_name && (
              <span className='text-paragraph-xs text-error-base'>{fieldErrors.customer_name}</span>
            )}
          </div>
          <div className='flex flex-1 flex-col gap-2'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>Status</label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              {(() => {
                const clientStatus = getFieldValue(client, localChanges, 'custom_status');
                const clientStatusBadge = getClientStatusBadgeVariant(clientStatus);
                return (
                  <Select.Root
                    variant='borderless'
                    value={clientStatus}
                    onValueChange={(value) => handleFieldChange('custom_status', value)}
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full -ml-2' showArrow={false}>
                      <Select.Value placeholder='Select' asChild>
                        <Badge.Root
                          variant='light'
                          color={clientStatusBadge.color ?? 'gray'}
                          className='text-nowrap'
                        >
                          {clientStatusBadge.label === '-' ? '--' : clientStatusBadge.label}
                        </Badge.Root>
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content>
                      {CLIENT_STATUS_OPTIONS.map((option) => {
                        const optionBadge = getClientStatusBadgeVariant(option.value);
                        return (
                          <Select.Item key={option.value} value={option.value}>
                            <Badge.Root
                              variant='light'
                              color={optionBadge.color ?? 'gray'}
                              className='text-nowrap'
                            >
                              {option.label}
                            </Badge.Root>
                          </Select.Item>
                        );
                      })}
                    </Select.Content>
                  </Select.Root>
                );
              })()}
            </EditableFieldWrapper>
          </div>
        </div>

        <div className='flex gap-3'>
          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>Legal Name</label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root
                key={`legal-name-${client?.custom_legal_name || id || 'default'}`}
                variant='borderless'
                size='xsmall'
                className='-ml-2'
                hasError={Boolean(fieldErrors.custom_legal_name)}
              >
                <Input.Wrapper>
                  <Input.Input
                    value={getFieldValue(client, localChanges, 'custom_legal_name') || ''}
                    onChange={(e) => {
                      dispatch(
                        setLocalChange({ fieldName: 'custom_legal_name', value: e.target.value }),
                      );
                      if (fieldErrors.custom_legal_name)
                        setFieldErrors((previous) => ({ ...previous, custom_legal_name: '' }));
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      const error = validateClientField('custom_legal_name', value);
                      if (error) {
                        setFieldErrors((previous) => ({ ...previous, custom_legal_name: error }));
                        return;
                      }
                      setFieldErrors((previous) => ({ ...previous, custom_legal_name: '' }));
                      handleFieldChange('custom_legal_name', value);
                    }}
                    placeholder='Enter legal name'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
            {fieldErrors.custom_legal_name && (
              <span className='text-paragraph-xs text-error-base'>
                {fieldErrors.custom_legal_name}
              </span>
            )}
          </div>
          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>Type of Org</label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Select.Root
                variant='borderless'
                value={getFieldValue(client, localChanges, 'customer_group')}
                onValueChange={(value) => {
                  const error = validateClientField('customer_group', value);
                  if (error) {
                    setFieldErrors((previous) => ({ ...previous, customer_group: error }));
                    return;
                  }
                  setFieldErrors((previous) => ({ ...previous, customer_group: '' }));
                  handleFieldChange('customer_group', value);
                }}
                size='xsmall'
                matchTriggerWidth={false}
                hasError={Boolean(fieldErrors.customer_group)}
              >
                <Select.Trigger className='w-full -ml-2' showArrow={false}>
                  <Select.Value placeholder='Select' />
                </Select.Trigger>
                <Select.Content>
                  {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </EditableFieldWrapper>
            {fieldErrors.customer_group && (
              <span className='text-paragraph-xs text-error-base'>
                {fieldErrors.customer_group}
              </span>
            )}
          </div>
        </div>

        <div className='flex gap-3'>
          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>Company Sector</label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Select.Root
                variant='borderless'
                value={getFieldValue(client, localChanges, 'industry')}
                onValueChange={(value) => handleFieldChange('industry', value)}
                size='xsmall'
              >
                <Select.Trigger className='w-full -ml-2' showArrow={false}>
                  <Select.Value placeholder='Select' />
                </Select.Trigger>
                <Select.Content>
                  {COMPANY_SECTOR_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </EditableFieldWrapper>
          </div>
          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>Est Year</label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Datepicker
                size='xsmall'
                value={
                  getFieldValue(client, localChanges, 'custom_year_of_establishment')
                    ? parseToDate(
                        getFieldValue(client, localChanges, 'custom_year_of_establishment'),
                      )
                    : undefined
                }
                onChange={(date) => {
                  if (date) {
                    const formattedDate = format(date, 'yyyy-MM-dd');
                    dispatch(
                      setLocalChange({
                        fieldName: 'custom_year_of_establishment',
                        value: formattedDate,
                      }),
                    );
                    const error = validateClientField(
                      'custom_year_of_establishment',
                      formattedDate,
                    );
                    if (error) {
                      setFieldErrors((previous) => ({
                        ...previous,
                        custom_year_of_establishment: error,
                      }));
                      return;
                    }
                    setFieldErrors((previous) => ({
                      ...previous,
                      custom_year_of_establishment: '',
                    }));
                    handleFieldChange('custom_year_of_establishment', formattedDate);
                  } else {
                    dispatch(
                      setLocalChange({ fieldName: 'custom_year_of_establishment', value: null }),
                    );
                    setFieldErrors((previous) => ({
                      ...previous,
                      custom_year_of_establishment: '',
                    }));
                    handleFieldChange('custom_year_of_establishment', '');
                  }
                }}
                hasError={Boolean(fieldErrors.custom_year_of_establishment)}
                placeholder='Select date'
                className='-ml-2'
                max={new Date()}
              />
            </EditableFieldWrapper>
            {fieldErrors.custom_year_of_establishment && (
              <span className='text-paragraph-xs text-error-base'>
                {fieldErrors.custom_year_of_establishment}
              </span>
            )}
          </div>
        </div>

        <div className='flex gap-3'>
          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>Website</label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Input.Root
                key={`website-${client?.name || id || 'default'}`}
                variant='borderless'
                size='xsmall'
                className='-ml-2'
                hasError={Boolean(fieldErrors.website)}
              >
                <Input.Wrapper>
                  <Input.Input
                    value={getFieldValue(client, localChanges, 'website') || ''}
                    onChange={(e) => {
                      dispatch(setLocalChange({ fieldName: 'website', value: e.target.value }));
                      if (fieldErrors.website)
                        setFieldErrors((previous) => ({ ...previous, website: '' }));
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      const error = validateClientField('website', value);
                      if (error) {
                        setFieldErrors((previous) => ({ ...previous, website: error }));
                        return;
                      }
                      setFieldErrors((previous) => ({ ...previous, website: '' }));
                      handleFieldChange('website', value);
                    }}
                    placeholder='Enter website URL'
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
            {fieldErrors.website && (
              <span className='text-paragraph-xs text-error-base'>{fieldErrors.website}</span>
            )}
          </div>
          <div className='flex flex-1 flex-col gap-1'>
            <label className='text-paragraph-sm opacity-72 text-text-sub-500'>Center</label>
            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
              <Select.Root
                variant='borderless'
                size='xsmall'
                open={centerSelectOpen}
                onOpenChange={(open) => {
                  setCenterSelectOpen(open);
                  if (open) {
                    // Snapshot selection for blur/close commit
                    const snapshot = selectedCenters;
                    setCenterSnapshot(snapshot);
                    setPendingCenters(snapshot);
                    return;
                  }
                  // Close: clear search + commit selection
                  setCenterSearchQuery('');
                  commitCenters();
                }}
              >
                <Select.Trigger className='w-full -ml-2' showArrow={true}>
                  <div className='flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden'>
                    {(() => {
                      const selectedCount = displayCenters.length;
                      if (selectedCount === 0) {
                        return <span className='text-text-soft-400'>Select Center</span>;
                      }

                      const firstValue = displayCenters[0];
                      const firstLabel =
                        centerOptions.find((opt) => opt.value === firstValue)?.label || firstValue;
                      const remainingCenters = displayCenters.slice(1);
                      const remainingLabels = remainingCenters
                        .map(
                          (centerValue) =>
                            centerOptions.find((opt) => opt.value === centerValue)?.label ||
                            centerValue,
                        )
                        .filter(Boolean);

                      return (
                        <>
                          <Tag.Root variant='gray' className='shrink-0 max-w-[180px]'>
                            <span className='truncate block'>{firstLabel}</span>
                          </Tag.Root>
                          {selectedCount > 1 && (
                            <Tooltip.Root size='xsmall'>
                              <Tooltip.Trigger asChild>
                                <span className='text-paragraph-xs text-text-soft-400 shrink-0 whitespace-nowrap cursor-pointer'>
                                  +{selectedCount - 1}
                                </span>
                              </Tooltip.Trigger>
                              <Tooltip.Content
                                size='small'
                                variant='light'
                                side='top'
                                className='max-w-xs'
                              >
                                <div className='flex flex-col gap-1'>
                                  <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                                    Additional Centers ({selectedCount - 1})
                                  </span>
                                  <div className='flex flex-col gap-1'>
                                    {remainingLabels.map((centerLabel, index) => (
                                      <div
                                        key={`${centerLabel}-${index}`}
                                        className='text-paragraph-sm text-text-sub-600'
                                      >
                                        {centerLabel}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </Tooltip.Content>
                            </Tooltip.Root>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </Select.Trigger>

                <Select.Content
                  layout='searchable'
                  className='min-w-[var(--radix-select-trigger-width)] max-h-[300px] p-0 overflow-hidden border border-stroke-soft-200'
                >
                  <div className='flex flex-col'>
                    <div className='p-2 border-b border-stroke-soft-200'>
                      <Input.Root size='small'>
                        <Input.Wrapper>
                          <Input.Icon as={RiSearchLine} />
                          <Input.Input
                            placeholder='Search center...'
                            value={centerSearchQuery}
                            onChange={(e) => setCenterSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    </div>
                    <div
                      className='flex max-h-[236px] flex-col overflow-y-auto p-2 gap-1'
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {filteredCenters.length > 0 ? (
                        filteredCenters.map((item, idx) => {
                          const isSelected = effectivePendingCenters.includes(item.value);
                          return (
                            <div
                              key={item.value || idx}
                              className='flex items-center gap-2 p-2 hover:bg-bg-weak-100 rounded-md cursor-pointer group'
                              onClick={() => {
                                const current =
                                  centerSelectOpen && pendingCenters.length === 0
                                    ? selectedCenters
                                    : pendingCenters;
                                const next = isSelected
                                  ? current.filter((v) => v !== item.value)
                                  : [...current, item.value];
                                setPendingCenters(next);
                                dispatch(
                                  setLocalChange({
                                    fieldName: 'custom_center_assignment',
                                    value: next.map((center) => ({ center })),
                                  }),
                                );
                              }}
                            >
                              <Checkbox.Root
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const current =
                                    centerSelectOpen && pendingCenters.length === 0
                                      ? selectedCenters
                                      : pendingCenters;
                                  const next = checked
                                    ? [...current, item.value]
                                    : current.filter((v) => v !== item.value);
                                  setPendingCenters(next);
                                  dispatch(
                                    setLocalChange({
                                      fieldName: 'custom_center_assignment',
                                      value: next.map((center) => ({ center })),
                                    }),
                                  );
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className='paragraph-small flex items-center gap-2 text-text-main-900'>
                                <RiBuildingLine size={16} className='text-primary-base' />
                                {item.label}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className='px-4 py-8 text-center text-paragraph-sm text-text-soft-400'>
                          {centerSearchQuery.trim() ? 'No centers found' : 'No centers available'}
                        </div>
                      )}
                    </div>
                  </div>
                </Select.Content>
              </Select.Root>
            </EditableFieldWrapper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailAboutInfo;
