import React, { useEffect, useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Checkbox from '@/components/ui/checkbox';
import { RiContactsBook2Line } from 'react-icons/ri';
import { PhoneInputController } from '@/components/ui/phone-input';
import ErrorText from '@/components/ui/error-text';
import {
  addLandlordContactSchema,
  defaultAddLandlordContactValues,
} from '@/schemas/landlord-schemas';
import {
  addLandlordContactThunk,
  updateLandlordContactThunk,
  selectAddLandlordContactModal,
  selectUpdateLandlordContactModal,
  clearAddLandlordContactModalFeedback,
  clearUpdateLandlordContactModalFeedback,
  fetchDepartmentListThunk,
  selectDepartmentList,
} from '@/redux/landlordSlice';
import { showSuccessToast, showErrorToast } from '@/utils/error-utils';
import { getDepartmentOptions } from '@/components/landlords-management/constants';

const getEditDefaultValues = (contact) => {
  if (!contact) return defaultAddLandlordContactValues;
  const departmentValue =
    contact.department?.department_name ??
    (typeof contact.department === 'string' ? contact.department : '') ??
    '';
  return {
    first_name: contact.first_name ?? '',
    last_name: contact.last_name ?? '',
    email: contact.contact_email ?? '',
    mobile_no: contact.mobile_number ?? '',
    department: departmentValue,
    is_primary_contact: contact.is_primary === 1 || contact.is_primary === true,
  };
};

const AddLandlordContactModal = ({
  landlordId,
  contact: editingContact,
  onSuccess,
  isOpen,
  onOpenChange,
}) => {
  const dispatch = useDispatch();
  const addLandlordContactModal = useSelector(selectAddLandlordContactModal);
  const updateLandlordContactModal = useSelector(selectUpdateLandlordContactModal);
  const isEditMode = Boolean(editingContact?.name);
  const addState = addLandlordContactModal;
  const updateState = updateLandlordContactModal;
  const isLoading = isEditMode ? updateState.isLoading : addState.isLoading;
  const message = isEditMode ? updateState.message : addState.message;
  const error = isEditMode ? updateState.error : addState.error;
  const previousLoadingRef = useRef(false);

  const departmentList = useSelector(selectDepartmentList);
  const DEPARTMENT_OPTIONS = useMemo(() => getDepartmentOptions(departmentList), [departmentList]);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchDepartmentListThunk());
    }
  }, [isOpen, dispatch]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addLandlordContactSchema),
    defaultValues: defaultAddLandlordContactValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      reset(isEditMode ? getEditDefaultValues(editingContact) : defaultAddLandlordContactValues);
    }
  }, [isOpen, isEditMode, editingContact, reset]);

  useEffect(() => {
    if (previousLoadingRef.current && !isLoading) {
      if (message) {
        const messageText =
          typeof message === 'string'
            ? message
            : (message?.message ??
              (isEditMode ? 'Contact updated successfully.' : 'Contact added successfully.'));
        showSuccessToast(messageText);
        if (isEditMode) {
          dispatch(clearUpdateLandlordContactModalFeedback());
        } else {
          dispatch(clearAddLandlordContactModalFeedback());
        }
        onOpenChange?.(false);
        reset(defaultAddLandlordContactValues);
        onSuccess?.();
      } else if (error) {
        showErrorToast(error, {
          defaultMessage: isEditMode ? 'Failed to update contact.' : 'Failed to add contact.',
        });
        if (isEditMode) {
          dispatch(clearUpdateLandlordContactModalFeedback());
        } else {
          dispatch(clearAddLandlordContactModalFeedback());
        }
      }
    }
    previousLoadingRef.current = isLoading;
  }, [isLoading, message, error, isEditMode, dispatch, onOpenChange, reset, onSuccess]);

  const handleClose = () => {
    onOpenChange?.(false);
    reset(defaultAddLandlordContactValues);
  };

  const onSubmit = (formData) => {
    if (isEditMode) {
      if (!editingContact?.name) return;
      const payload = {
        contact_id: editingContact.name,
        fields: {
          first_name: formData.first_name?.trim() ?? '',
          last_name: formData.last_name?.trim() ?? '',
          mobile_number: formData.mobile_no ?? '',
          contact_email: formData.email?.trim() ?? '',
          department: formData.department ?? '',
          is_primary: formData.is_primary_contact ? 1 : 0,
        },
      };
      dispatch(updateLandlordContactThunk(payload));
    } else {
      if (!landlordId) return;
      const payload = {
        landlord: landlordId,
        first_name: formData.first_name?.trim() ?? '',
        last_name: formData.last_name?.trim() ?? '',
        mobile_number: formData.mobile_no ?? '',
        contact_email: formData.email?.trim() ?? '',
        department: formData.department ?? '',
        is_primary: formData.is_primary_contact ? 1 : 0,
      };
      dispatch(addLandlordContactThunk(payload));
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='w-full max-w-[450px]'>
        <Modal.Header
          icon={RiContactsBook2Line}
          title={isEditMode ? 'Edit Contact' : 'Add Contact'}
          description={
            isEditMode ? 'Update contact details.' : 'Enter below details to add new contact.'
          }
        />
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col'>
          <Modal.Body>
            <div className='w-full flex flex-col gap-4'>
              <div className='w-full grid grid-cols-2 gap-4'>
                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    First Name
                    <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='first_name'
                    control={control}
                    render={({ field }) => (
                      <Input.Root size='small' hasError={Boolean(errors.first_name)}>
                        <Input.Wrapper>
                          <Input.Input {...field} placeholder='First name' />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.first_name && <ErrorText>{errors.first_name.message}</ErrorText>}
                </div>
                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Last Name
                    <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='last_name'
                    control={control}
                    render={({ field }) => (
                      <Input.Root size='small' hasError={Boolean(errors.last_name)}>
                        <Input.Wrapper>
                          <Input.Input {...field} placeholder='Last name' />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.last_name && <ErrorText>{errors.last_name.message}</ErrorText>}
                </div>
              </div>

              <div className='w-full flex flex-col gap-1'>
                <Label.Root>
                  Email
                  <Label.Asterisk />
                </Label.Root>
                <Controller
                  name='email'
                  control={control}
                  render={({ field }) => (
                    <Input.Root size='small' hasError={Boolean(errors.email)}>
                      <Input.Wrapper>
                        <Input.Input {...field} type='email' placeholder='Enter email address' />
                      </Input.Wrapper>
                    </Input.Root>
                  )}
                />
                {errors.email && <ErrorText>{errors.email.message}</ErrorText>}
              </div>

              <div className='w-full flex flex-col gap-1'>
                <Label.Root>
                  Mobile
                  <Label.Asterisk />
                </Label.Root>
                <Controller
                  name='mobile_no'
                  control={control}
                  render={({ field, fieldState }) => (
                    <PhoneInputController
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error}
                      size='small'
                      placeholder='9876500011'
                      maxLength={10}
                    />
                  )}
                />
                {errors.mobile_no && <ErrorText>{errors.mobile_no.message}</ErrorText>}
              </div>

              <div className='w-full flex flex-col gap-1'>
                <Label.Root>Department</Label.Root>
                <Controller
                  name='department'
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={DEPARTMENT_OPTIONS}
                      size='small'
                      placeholder={departmentList.isLoading ? 'Loading...' : 'Select department'}
                      searchPlaceholder='Search department...'
                      disabled={departmentList.isLoading}
                      showArrow
                      isolateSearchKeyboard
                    />
                  )}
                />
              </div>

              {!(
                isEditMode &&
                (editingContact?.is_primary === 1 || editingContact?.is_primary === true)
              ) && (
                <div className='w-full flex items-center gap-2'>
                  <Controller
                    name='is_primary_contact'
                    control={control}
                    render={({ field }) => (
                      <Checkbox.Root
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    )}
                  />
                  <span className='paragraph-small text-[var(--color-text-soft-500)]'>
                    Set as SPOC
                  </span>
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer className='w-full flex items-center justify-end'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='submit'
              variant='primary'
              mode='filled'
              size='xsmall'
              className='w-18'
              disabled={isLoading}
            >
              {isLoading
                ? isEditMode
                  ? 'Updating...'
                  : 'Adding...'
                : isEditMode
                  ? 'Update'
                  : 'Add'}
            </Button.Root>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

export default AddLandlordContactModal;
