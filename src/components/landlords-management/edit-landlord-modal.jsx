import React, { useState, useEffect } from 'react';
import {
  RiUserLine,
  RiErrorWarningFill,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiInformationLine,
} from 'react-icons/ri';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Hint from '@/components/ui/hint';
import { StatusColorPill } from '@/components/ui/status-color-pill';
import { editLandlordSchema } from '@/schemas/landlord-schemas';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { updateLandlordThunk, getLandlordListThunk } from '@/redux/landlordSlice';
import { getStatusOptions } from '@/api/dynamic-status';

// Country list with codes and flag emojis
const COUNTRIES = [
  { value: '+1', label: 'US', flag: '🇺🇸' },
  { value: '+91', label: 'IN', flag: '🇮🇳' },
  { value: '+44', label: 'GB', flag: '🇬🇧' },
  { value: '+86', label: 'CN', flag: '🇨🇳' },
  { value: '+81', label: 'JP', flag: '🇯🇵' },
  { value: '+49', label: 'DE', flag: '🇩🇪' },
  { value: '+33', label: 'FR', flag: '🇫🇷' },
  { value: '+39', label: 'IT', flag: '🇮🇹' },
  { value: '+34', label: 'ES', flag: '🇪🇸' },
  { value: '+61', label: 'AU', flag: '🇦🇺' },
  { value: '+971', label: 'AE', flag: '🇦🇪' },
  { value: '+65', label: 'SG', flag: '🇸🇬' },
];

// Helper function to parse contact number and extract country code
const parseContactNumber = (contactNumber) => {
  if (!contactNumber) return { countryCode: '+91', number: '' };

  // Remove any existing hyphens for parsing
  const cleanedNumber = contactNumber.replaceAll('-', '');

  // Try to find a matching country code at the start
  const matchedCountry = COUNTRIES.find((country) => cleanedNumber.startsWith(country.value));
  if (matchedCountry) {
    return {
      countryCode: matchedCountry.value,
      number: cleanedNumber.replace(matchedCountry.value, '').trim(),
    };
  }

  // Default to +91 if no match found
  return { countryCode: '+91', number: cleanedNumber };
};

// Helper function to split SPOC name into first and last name
const splitSPOCName = (spocName) => {
  if (!spocName) return { firstName: '', lastName: '' };
  const parts = spocName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const lastName = parts.at(-1);
  const firstName = parts.slice(0, -1).join(' ');
  return { firstName, lastName };
};

const EditLandlordModal = ({ isLoading: externalLoading, handleOpenChange, handleSave }) => {
  // Fetch data from landlordSlice
  const { isOpen, selectedLandlord } = useSelector((state) => state.landlord.editLandlordDrawer);
  const landlordListData = useSelector((state) => state.landlord.landlordListData);
  const landlords = Array.isArray(landlordListData?.data) ? landlordListData.data : [];

  const [isLoading, setIsLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [isSPOCDetailsOpen, setIsSPOCDetailsOpen] = useState(true);
  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control,
  } = useForm({
    resolver: zodResolver(editLandlordSchema),
    defaultValues: {
      landlord: '',
      status: 'Active',
      first_name: '',
      last_name: '',
      spoc_contact_number: '',
      spoc_email: '',
    },
  });

  const selectedStatus = watch('status');
  const selectedLandlordValue = watch('landlord');

  const dispatch = useDispatch();

  // Fetch landlord list when modal opens
  useEffect(() => {
    if (isOpen) {
      dispatch(
        getLandlordListThunk({
          keyword: '',
          filters: [],
          type: 'centerSpaces',
        }),
      );
    }
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const opts = await getStatusOptions({ doctype: 'Landlord', field: 'status' });
        if (!cancelled) {
          setDynamicStatusOptions(
            (Array.isArray(opts) ? opts : []).map((o) => ({
              value: o.value,
              label: o.label || o.value,
              color: o.color,
            })),
          );
        }
      } catch {
        if (!cancelled) setDynamicStatusOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Populate form when landlord data changes
  useEffect(() => {
    if (selectedLandlord && isOpen) {
      const landlordData = selectedLandlord.landlord_master || selectedLandlord;
      const landlordId = String(selectedLandlord?.landlord || selectedLandlord?.name || '').trim();

      // Parse SPOC contact number
      const { countryCode: parsedCode, number } = parseContactNumber(
        landlordData.contact_number || landlordData.spoc_contact_number,
      );
      setCountryCode(parsedCode);

      // Split SPOC name into first and last name
      const { firstName, lastName } = splitSPOCName(landlordData.spoc);

      // Extract status as-is from configured values
      const landlordStatus = landlordData.status || 'Active';

      reset({
        landlord: landlordId || landlordData.name || '',
        status: landlordStatus,
        first_name: firstName,
        last_name: lastName,
        spoc_contact_number: number || '',
        spoc_email: landlordData.email_address || landlordData.spoc_email || '',
      });
    }
  }, [selectedLandlord, isOpen, reset, setValue]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setCountryCode('+91');
      setIsSPOCDetailsOpen(true);
    }
  }, [isOpen, reset]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const mobileNumber = `${countryCode}-${data.spoc_contact_number}`;

      const payload = {
        status: data.status,
        contact: [
          {
            first_name: data.first_name,
            last_name: data.last_name,
            contact_email: data.spoc_email,
            mobile_number: mobileNumber,
            is_primary: 1,
          },
        ],
      };

      const landlordId = String(selectedLandlord?.landlord || selectedLandlord?.name || '').trim();

      if (!landlordId) {
        throw new Error('Landlord ID is required for update');
      }

      await dispatch(updateLandlordThunk({ landlord_id: landlordId, payload })).unwrap();

      if (handleSave) await handleSave();

      showSuccessToast('Landlord updated successfully.');
      reset();
      setCountryCode('+91');
      handleOpenChange?.(false);
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      showErrorToast(errorMessage, {
        defaultMessage: 'Failed to update landlord. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loading = isLoading || externalLoading;

  // Get landlord name for display
  const landlordData = selectedLandlord?.landlord_master || selectedLandlord;
  const landlordName = landlordData?.landlord_name || '';

  return (
    <Modal.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[450px]'>
        <Modal.Header
          icon={RiUserLine}
          title='Edit Landlord'
          description='Edit below landlord details.'
        />
        <Modal.Body>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col gap-4'>
            {/* Landlord (read-only) */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Landlord
                <Label.Asterisk />
              </Label.Root>
              <Controller
                name='landlord'
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onValueChange={() => {}} // Disabled - cannot change
                    disabled={true}
                    options={
                      Array.isArray(landlords)
                        ? landlords.map((landlord) => ({
                            value: landlord.name,
                            label: landlord.landlord_name,
                          }))
                        : []
                    }
                    placeholder='Select landlord'
                    searchPlaceholder='Search landlord...'
                    showArrow
                    isolateSearchKeyboard
                  />
                )}
              />
            </div>

            {/* Status */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Status
                <Label.Asterisk />
              </Label.Root>
              <Controller
                name='status'
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    hasError={Boolean(errors.status)}
                    disabled={loading}
                    options={
                      dynamicStatusOptions.length > 0
                        ? dynamicStatusOptions
                        : [{ value: selectedStatus || 'Active', label: selectedStatus || 'Active' }]
                    }
                    placeholder='Select status'
                    searchPlaceholder='Search status...'
                    showArrow
                    isolateSearchKeyboard
                    renderTrigger={() =>
                      selectedStatus ? (
                        <StatusColorPill
                          value={
                            dynamicStatusOptions.find((opt) => opt.value === selectedStatus)
                              ?.label || selectedStatus
                          }
                          color={
                            dynamicStatusOptions.find((opt) => opt.value === selectedStatus)?.color
                          }
                        />
                      ) : (
                        'Select status'
                      )
                    }
                    renderOptionLabel={(opt) => (
                      <StatusColorPill value={opt.label} color={opt.color} />
                    )}
                  />
                )}
              />
              {errors.status && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.status.message}
                </Hint.Root>
              )}
            </div>

            {/* SPOC Details - Collapsible Section */}
            <div className='w-full flex flex-col gap-2'>
              <button
                type='button'
                onClick={() => setIsSPOCDetailsOpen(!isSPOCDetailsOpen)}
                className='flex items-center justify-between w-full p-2 rounded-lg hover:bg-bg-weak-50 transition-colors'
              >
                <div className='flex items-center gap-2'>
                  <RiInformationLine className='size-4 text-text-sub-500' />
                  <Label.Root className='mb-0'>SPOC Details</Label.Root>
                </div>
                {isSPOCDetailsOpen ? (
                  <RiArrowUpSLine className='size-4 text-text-sub-500' />
                ) : (
                  <RiArrowDownSLine className='size-4 text-text-sub-500' />
                )}
              </button>

              {isSPOCDetailsOpen && (
                <div className='flex flex-col gap-4'>
                  {/* First Name */}
                  <div className='w-full flex flex-col gap-2'>
                    <Label.Root>
                      First Name
                      <Label.Asterisk />
                    </Label.Root>
                    <Input.Root
                      size='medium'
                      className='w-full'
                      hasError={Boolean(errors.first_name)}
                    >
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          placeholder='Enter first name'
                          {...register('first_name')}
                          disabled={loading}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                    {errors.first_name && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.first_name.message}
                      </Hint.Root>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className='w-full flex flex-col gap-2'>
                    <Label.Root>
                      Last Name
                      <Label.Asterisk />
                    </Label.Root>
                    <Input.Root
                      size='medium'
                      className='w-full'
                      hasError={Boolean(errors.last_name)}
                    >
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          placeholder='Enter last name'
                          {...register('last_name')}
                          disabled={loading}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                    {errors.last_name && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.last_name.message}
                      </Hint.Root>
                    )}
                  </div>

                  {/* SPOC Contact Number */}
                  <div className='w-full flex flex-col gap-2'>
                    <Label.Root>
                      SPOC Contact Number
                      <Label.Asterisk />
                    </Label.Root>
                    <Input.Root
                      size='medium'
                      className='w-full'
                      hasError={Boolean(errors.spoc_contact_number)}
                    >
                      <SearchableSelect
                        variant='compactForInput'
                        value={countryCode}
                        onValueChange={(value) => {
                          setCountryCode(value);
                          setValue('spoc_contact_number', '');
                        }}
                        options={COUNTRIES}
                        placeholder='Select'
                        searchPlaceholder='Search...'
                        isolateSearchKeyboard
                        renderTrigger={({ selectedOption }) => {
                          const opt =
                            selectedOption || COUNTRIES.find((c) => c.value === countryCode);
                          return (
                            <span className='flex items-center gap-1.5'>
                              <span>{opt?.flag || '🇮🇳'}</span>
                              <span>{opt?.value || countryCode}</span>
                            </span>
                          );
                        }}
                        renderOptionLabel={(opt) => (
                          <span className='flex items-center gap-1.5'>
                            <span>{opt.flag}</span>
                            <span>
                              {opt.label} {opt.value}
                            </span>
                          </span>
                        )}
                      />
                      <Input.Wrapper>
                        <Input.Input
                          type='tel'
                          placeholder='Enter contact number'
                          maxLength={10}
                          {...register('spoc_contact_number', {
                            onChange: (e) => {
                              // Only allow numeric input and limit to 10 digits
                              const numericValue = [...e.target.value]
                                .filter((char) => /\d/.test(char))
                                .join('');
                              const value = numericValue.slice(0, 10);
                              setValue('spoc_contact_number', value, { shouldValidate: true });
                            },
                          })}
                          disabled={loading}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                    {errors.spoc_contact_number && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.spoc_contact_number.message}
                      </Hint.Root>
                    )}
                  </div>

                  {/* Email */}
                  <div className='w-full flex flex-col gap-2'>
                    <Label.Root>
                      Email
                      <Label.Asterisk />
                    </Label.Root>
                    <Input.Root
                      size='medium'
                      className='w-full'
                      hasError={Boolean(errors.spoc_email)}
                    >
                      <Input.Wrapper>
                        <Input.Input
                          type='email'
                          placeholder='Enter email address'
                          {...register('spoc_email')}
                          disabled={loading}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                    {errors.spoc_email && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.spoc_email.message}
                      </Hint.Root>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close asChild>
            <Button.Root
              variant='neutral'
              className='w-full'
              mode='stroke'
              size='small'
              disabled={loading}
            >
              Cancel
            </Button.Root>
          </Modal.Close>
          <Button.Root
            onClick={handleSubmit(onSubmit)}
            variant='primary'
            mode='filled'
            size='small'
            disabled={loading}
            type='button'
            className='w-full'
          >
            {loading ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                Updating...
              </span>
            ) : (
              'Update'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default EditLandlordModal;
