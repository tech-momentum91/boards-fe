import React, { useEffect, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import * as Checkbox from '@/components/ui/checkbox';
import { RiContactsBook2Line } from 'react-icons/ri';
import { PhoneInputController } from '@/components/ui/phone-input';
import ErrorText from '@/components/ui/error-text';
import { addVendorContactSchema, defaultAddVendorContactValues } from '@/schemas/vendor-schemas';
import {
  addVendorContactThunk,
  updateVendorContactThunk,
  selectAddVendorContactModal,
  selectUpdateVendorContactModal,
  clearAddVendorContactModalFeedback,
  clearUpdateVendorContactModalFeedback,
} from '@/redux/vendorSlice';
import { showSuccessToast, showErrorToast } from '@/utils/error-utils';

const getEditDefaultValues = (contact) => {
  if (!contact) return defaultAddVendorContactValues;

  return {
    first_name: contact.first_name ?? '',
    last_name: contact.last_name ?? '',
    email: contact.email ?? '', // ✅ fixed
    mobile_no: contact.mobile_no ?? '', // ✅ fixed
    is_primary_contact: contact.is_primary_contact === 1 || contact.is_primary_contact === true,
  };
};

const AddVendorContactModal = ({
  vendorId,
  contact: editingContact,
  onSuccess,
  isOpen,
  onOpenChange,
}) => {
  const dispatch = useDispatch();
  const addVendorModal = useSelector(selectAddVendorContactModal);
  const updateVendorModal = useSelector(selectUpdateVendorContactModal);
  const isEditMode = Boolean(editingContact?.name);
  const addState = addVendorModal;
  const updateState = updateVendorModal;
  const isLoading = isEditMode ? updateState.isLoading : addState.isLoading;
  const message = isEditMode ? updateState.message : addState.message;
  const error = isEditMode ? updateState.error : addState.error;
  const previousLoadingRef = useRef(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addVendorContactSchema),
    defaultValues: defaultAddVendorContactValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      reset(isEditMode ? getEditDefaultValues(editingContact) : defaultAddVendorContactValues);
    }
  }, [isOpen, isEditMode, editingContact, reset]);

  useEffect(() => {
    if (previousLoadingRef.current && !isLoading) {
      if (message) {
        showSuccessToast(
          typeof message === 'string'
            ? message
            : isEditMode
              ? 'Contact updated successfully.'
              : 'Contact added successfully.',
        );
        if (isEditMode) {
          dispatch(clearUpdateVendorContactModalFeedback());
        } else {
          dispatch(clearAddVendorContactModalFeedback());
        }
        onOpenChange?.(false);
        reset(defaultAddVendorContactValues);
        onSuccess?.();
      } else if (error) {
        showErrorToast(error, {
          defaultMessage: isEditMode ? 'Failed to update contact.' : 'Failed to add contact.',
        });
        if (isEditMode) {
          dispatch(clearUpdateVendorContactModalFeedback());
        } else {
          dispatch(clearAddVendorContactModalFeedback());
        }
      }
    }
    previousLoadingRef.current = isLoading;
  }, [isLoading, message, error, isEditMode, dispatch, onOpenChange, reset, onSuccess]);

  const handleClose = () => {
    onOpenChange?.(false);
    reset(defaultAddVendorContactValues);
  };

  const onSubmit = async (formData) => {
    if (!vendorId && !isEditMode) return;

    try {
      if (isEditMode) {
        if (isEditMode) {
          if (!editingContact?.name) return;

          const result = await dispatch(
            updateVendorContactThunk({
              vendor_id: vendorId,
              contact_id: editingContact.name,
              fields: {
                first_name: formData.first_name,
                last_name: formData.last_name,
                mobile_no: formData.mobile_no,
                email: formData.email,
                is_primary_contact: formData.is_primary_contact,
              },
            }),
          );

          if (updateVendorContactThunk.rejected.match(result)) throw new Error(result.payload);
        }
      } else {
        const payload = {
          vendor: vendorId,
          first_name: formData.first_name?.trim() ?? '',
          last_name: formData.last_name?.trim() ?? '',
          mobile_no: formData.mobile_no ?? '',
          email: formData.email?.trim() ?? '',
          is_primary_contact: formData.is_primary_contact ? 1 : 0,
        };
        const result = await dispatch(addVendorContactThunk(payload));
        if (addVendorContactThunk.rejected.match(result)) throw new Error(result.payload);
      }
      onSuccess?.();
      onOpenChange?.(false);
      reset(defaultAddVendorContactValues);
    } catch {
      return;
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='w-full max-w-[450px]'>
        <Modal.Header
          icon={RiContactsBook2Line}
          title={isEditMode ? 'Edit Vendor Contact' : 'Add Vendor Contact'}
          description={
            isEditMode
              ? 'Update vendor contact details.'
              : 'Enter below details to add new contact.'
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

              {!(
                isEditMode &&
                (editingContact?.is_primary_contact === 1 ||
                  editingContact?.is_primary_contact === true)
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
          <Modal.Footer className='w-full flex items-center justify-end gap-2'>
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
              disabled={isLoading}
            >
              {isEditMode ? 'Update' : 'Add'}
            </Button.Root>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

export default AddVendorContactModal;
