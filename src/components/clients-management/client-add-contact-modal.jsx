import React, { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiContactsBook2Line,
  RiMailLine,
  RiPhoneLine,
  RiBuilding4Line,
  RiPriceTag3Line,
} from 'react-icons/ri';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Checkbox from '@/components/ui/checkbox';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import { PhoneInputController } from '@/components/ui/phone-input';
import {
  closeAddContactModal,
  addClientContactThunk,
  getClientDetailThunk,
  selectAddContactModal,
} from '@/redux/clientDetailSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { contactEditSchema, defaultContactEditValues } from '@/schemas/client-schema';
import { DEPARTMENT_OPTIONS } from '@/components/clients-management/constants';

const ClientAddContactModal = ({ clientId, onSuccess }) => {
  const dispatch = useDispatch();
  const addContactModal = useSelector(selectAddContactModal);
  const { isOpen } = addContactModal;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(contactEditSchema),
    defaultValues: defaultContactEditValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  // Watch department to show/hide other_department field
  const department = useWatch({ control, name: 'department' });
  const showOtherDepartment = department === 'Other';

  useEffect(() => {
    if (isOpen) {
      reset(defaultContactEditValues);
    }
  }, [isOpen, reset]);

  const handleClose = () => {
    if (!isSubmitting) {
      dispatch(closeAddContactModal());
      reset(defaultContactEditValues);
    }
  };

  const onSubmit = async (formValues) => {
    if (!clientId) {
      showErrorToast('Client ID is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // mobile_no is already formatted as "countryCode-number" from PhoneInput
      const formattedMobileNo = formValues.mobile_no || '';

      const result = await dispatch(
        addClientContactThunk({
          customer: clientId,
          first_name: formValues.first_name || '',
          last_name: formValues.last_name || '',
          contact_name: [formValues.first_name, formValues.last_name]
            .filter(Boolean)
            .join(' ')
            .trim(),
          email: formValues.email || '',
          mobile_no: formattedMobileNo,
          department: formValues.department || '',
          other_department: formValues.other_department || '',
          is_primary_contact: formValues.is_primary_contact || false,
        }),
      );

      if (addClientContactThunk.fulfilled.match(result)) {
        showSuccessToast('Contact added successfully.');
        handleClose();
        // Refresh client details
        if (clientId) {
          await dispatch(getClientDetailThunk(clientId));
        }
        onSuccess?.();
      } else {
        const errorMessage = result.payload || result.error?.message || 'Failed to add contact';
        showErrorToast(errorMessage, {
          defaultMessage: 'Failed to add contact',
        });
      }
    } catch (error) {
      console.error('Failed to add contact:', error);
      showErrorToast(error?.message || String(error), {
        defaultMessage: 'Failed to add contact',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          handleClose();
        }
      }}
    >
      <Modal.Content className='max-w-[560px]' showClose={true}>
        <Modal.Header
          icon={RiContactsBook2Line}
          title='Add Contact'
          description='Add a new contact for this client.'
        />

        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col'>
          <Modal.Body className='flex flex-col gap-6'>
            <div className='flex flex-col gap-3'>
              <h3 className='text-label-md text-neutral-500'>Contact Information</h3>
              <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                <FieldRow icon={RiPriceTag3Line} label='First Name' required>
                  <Controller
                    name='first_name'
                    control={control}
                    render={({ field }) => (
                      <Input.Root
                        hasError={Boolean(errors.first_name)}
                        size='xsmall'
                        variant='borderless'
                      >
                        <Input.Wrapper>
                          <Input.Input
                            {...field}
                            placeholder='Type here...'
                            disabled={isSubmitting}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.first_name && <ErrorText>{errors.first_name.message}</ErrorText>}
                </FieldRow>

                <FieldRow icon={RiPriceTag3Line} label='Last Name' required>
                  <Controller
                    name='last_name'
                    control={control}
                    render={({ field }) => (
                      <Input.Root
                        hasError={Boolean(errors.last_name)}
                        size='xsmall'
                        variant='borderless'
                      >
                        <Input.Wrapper>
                          <Input.Input
                            {...field}
                            placeholder='Type here...'
                            disabled={isSubmitting}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.last_name && <ErrorText>{errors.last_name.message}</ErrorText>}
                </FieldRow>

                <FieldRow icon={RiMailLine} label='Email' required>
                  <Controller
                    name='email'
                    control={control}
                    render={({ field }) => (
                      <Input.Root
                        hasError={Boolean(errors.email)}
                        size='xsmall'
                        variant='borderless'
                      >
                        <Input.Wrapper>
                          <Input.Input
                            {...field}
                            type='email'
                            placeholder='Type here...'
                            disabled={isSubmitting}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.email && <ErrorText>{errors.email.message}</ErrorText>}
                </FieldRow>

                <FieldRow icon={RiPhoneLine} label='Mobile' required>
                  <Controller
                    name='mobile_no'
                    control={control}
                    render={({ field, fieldState }) => (
                      <PhoneInputController
                        value={field.value}
                        onChange={(formattedValue) => {
                          // PhoneInputController passes the formatted value as a string
                          field.onChange(formattedValue);
                        }}
                        error={fieldState.error}
                        size='xsmall'
                        variant='borderless'
                        placeholder='9876500011'
                        maxLength={10}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                  {errors.mobile_no && <ErrorText>{errors.mobile_no.message}</ErrorText>}
                </FieldRow>

                <FieldRow icon={RiBuilding4Line} label='Department'>
                  <Controller
                    name='department'
                    control={control}
                    render={({ field }) => (
                      <Select.Root
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Clear other_department if department is not "Other"
                          if (value !== 'Other') {
                            setValue('other_department', '');
                          }
                        }}
                        variant='borderless'
                        size='xsmall'
                        hasError={Boolean(errors.department)}
                        disabled={isSubmitting}
                      >
                        <Select.Trigger className='w-full'>
                          <Select.Value placeholder='Select department' />
                        </Select.Trigger>
                        <Select.Content>
                          {DEPARTMENT_OPTIONS.map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                              {option.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                  {errors.department && <ErrorText>{errors.department.message}</ErrorText>}
                </FieldRow>

                {/* Show other_department field only when "Other" is selected */}
                {showOtherDepartment && (
                  <FieldRow icon={RiBuilding4Line} label='Specify Department' required>
                    <Controller
                      name='other_department'
                      control={control}
                      render={({ field }) => (
                        <Input.Root
                          hasError={Boolean(errors.other_department)}
                          size='xsmall'
                          variant='borderless'
                        >
                          <Input.Wrapper>
                            <Input.Input
                              {...field}
                              placeholder='Enter department name'
                              disabled={isSubmitting}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                    {errors.other_department && (
                      <ErrorText>{errors.other_department.message}</ErrorText>
                    )}
                  </FieldRow>
                )}
              </div>
            </div>

            <div className='flex gap-2 items-center'>
              <Controller
                name='is_primary_contact'
                control={control}
                render={({ field }) => (
                  <Checkbox.Root
                    id='is_primary_contact'
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                )}
              />
              <label
                htmlFor='is_primary_contact'
                className='text-paragraph-small text-text-sub-500 cursor-pointer'
              >
                Set as SPOC
              </label>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <div className='flex items-center justify-end gap-3 w-full'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button.Root>
              <Button.Root type='submit' size='medium' disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Contact'}
              </Button.Root>
            </div>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

export default ClientAddContactModal;
