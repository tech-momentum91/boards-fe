import React, { useEffect, useMemo, useState } from 'react';
import {
  RiStore2Line,
  RiErrorWarningFill,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiInformationLine,
} from 'react-icons/ri';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Hint from '@/components/ui/hint';
import * as Badge from '@/components/ui/badge';
import { editVendorSchema } from '@/schemas/vendor-schemas';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { updateVendorThunk, setEditVendorDrawer } from '@/redux/vendorSlice';
import { VENDOR_STATUS_OPTIONS } from './constants';
import { toStatusFilterOptions, useStatusOptions } from '@/hooks/use-status-options';

// Local helper — no dependency on ticket-management
const getStatusVariant = (status) => {
  if (!status) return 'disabled';
  return (
    { Active: 'green', active: 'green', Inactive: 'red', inactive: 'red' }[status] || 'disabled'
  );
};

const EditVendorModal = ({ isLoading: externalLoading, handleOpenChange, handleSave }) => {
  // ✅ Correct Redux key: editVendorDrawer (not editVendorModal)
  const { isOpen, selectedVendor } = useSelector((state) => state.vendor.editVendorDrawer);
  const dispatch = useDispatch();
  const { options: vendorStatusMasterOptions } = useStatusOptions({
    doctype: 'Supplier',
    field: 'custom_vendor_status',
    enabled: isOpen,
  });
  const vendorStatusSelectOptions = useMemo(() => {
    const fromConfig = toStatusFilterOptions(vendorStatusMasterOptions);
    return fromConfig.length > 0 ? fromConfig : VENDOR_STATUS_OPTIONS;
  }, [vendorStatusMasterOptions]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSPOCDetailsOpen, setIsSPOCDetailsOpen] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control,
  } = useForm({
    resolver: zodResolver(editVendorSchema),
    defaultValues: {
      vendor_name: '',
      status: 'Active',
      spoc_name: '',
      spoc_email: '',
      spoc_phone: '',
    },
  });

  const selectedStatus = watch('status');

  // Populate form when selectedVendor changes
  useEffect(() => {
    if (selectedVendor && isOpen) {
      const spoc =
        (selectedVendor.contacts || []).find((c) => c.is_spoc) ||
        selectedVendor.contacts?.[0] ||
        {};

      reset({
        vendor_name: selectedVendor.vendor_name || '',
        status: selectedVendor.status || 'Active',
        spoc_name: spoc.name || '',
        spoc_email: spoc.email || '',
        spoc_phone: spoc.phone || '',
      });
    }
  }, [selectedVendor, isOpen, reset]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setIsSPOCDetailsOpen(true);
    }
  }, [isOpen, reset]);

  const onClose = () => {
    dispatch(setEditVendorDrawer(false));
    handleOpenChange?.(false);
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const payload = {
        status: data.status,
        spoc_contact: {
          name: data.spoc_name || '',
          email: data.spoc_email || '',
          phone: data.spoc_phone || '',
        },
      };

      const vendorId = String(selectedVendor?.name || selectedVendor?.id || '').trim();
      if (!vendorId) throw new Error('Vendor ID is required for update');

      await dispatch(updateVendorThunk({ vendor_id: vendorId, payload })).unwrap();

      if (handleSave) await handleSave();

      showSuccessToast('Vendor updated successfully.');
      onClose();
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      showErrorToast(errorMessage, {
        defaultMessage: 'Failed to update vendor. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loading = isLoading || externalLoading;

  return (
    <Modal.Root open={isOpen} onOpenChange={onClose}>
      <Modal.Content className='max-w-[450px]'>
        <Modal.Header
          icon={RiStore2Line}
          title='Edit Vendor'
          description='Edit below vendor details.'
        />
        <Modal.Body>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col gap-4'>
            {/* Vendor Name (read-only) */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>Vendor Name</Label.Root>
              <Input.Root size='medium' className='w-full'>
                <Input.Wrapper>
                  <Input.Input value={selectedVendor?.vendor_name || ''} disabled readOnly />
                </Input.Wrapper>
              </Input.Root>
            </div>

            {/* Status */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Status <Label.Asterisk />
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
                    options={vendorStatusSelectOptions}
                    placeholder='Select status'
                    triggerClassName='w-full'
                    renderTrigger={() =>
                      selectedStatus ? (
                        <Badge.Root
                          variant='light'
                          color={getStatusVariant(selectedStatus)}
                          size='small'
                        >
                          {selectedStatus}
                        </Badge.Root>
                      ) : null
                    }
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

            {/* SPOC Details — Collapsible */}
            <div className='w-full flex flex-col gap-2'>
              <button
                type='button'
                onClick={() => setIsSPOCDetailsOpen((previous) => !previous)}
                className='flex items-center justify-between w-full p-2 rounded-lg hover:bg-bg-weak-50 transition-colors'
              >
                <div className='flex items-center gap-2'>
                  <RiInformationLine className='size-4 text-text-sub-500' />
                  <Label.Root className='mb-0 cursor-pointer'>SPOC Details</Label.Root>
                </div>
                {isSPOCDetailsOpen ? (
                  <RiArrowUpSLine className='size-4 text-text-sub-500' />
                ) : (
                  <RiArrowDownSLine className='size-4 text-text-sub-500' />
                )}
              </button>

              {isSPOCDetailsOpen && (
                <div className='flex flex-col gap-4 pl-6'>
                  {/* SPOC Name */}
                  <div className='w-full flex flex-col gap-2'>
                    <Label.Root>
                      Name <Label.Asterisk />
                    </Label.Root>
                    <Input.Root
                      size='medium'
                      className='w-full'
                      hasError={Boolean(errors.spoc_name)}
                    >
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          placeholder='Enter SPOC name'
                          {...register('spoc_name')}
                          disabled={loading}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                    {errors.spoc_name && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.spoc_name.message}
                      </Hint.Root>
                    )}
                  </div>

                  {/* SPOC Phone */}
                  <div className='w-full flex flex-col gap-2'>
                    <Label.Root>
                      Phone <Label.Asterisk />
                    </Label.Root>
                    <Input.Root
                      size='medium'
                      className='w-full'
                      hasError={Boolean(errors.spoc_phone)}
                    >
                      <Input.Wrapper>
                        <Input.Input
                          type='tel'
                          placeholder='Enter contact number'
                          maxLength={10}
                          {...register('spoc_phone', {
                            onChange: (e) => {
                              const numeric = e.target.value.replaceAll(/\D/g, '').slice(0, 10);
                              setValue('spoc_phone', numeric, { shouldValidate: true });
                            },
                          })}
                          disabled={loading}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                    {errors.spoc_phone && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.spoc_phone.message}
                      </Hint.Root>
                    )}
                  </div>

                  {/* SPOC Email */}
                  <div className='w-full flex flex-col gap-2'>
                    <Label.Root>
                      Email <Label.Asterisk />
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
          <Button.Root
            variant='neutral'
            className='w-full'
            mode='stroke'
            size='small'
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button.Root>
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

export default EditVendorModal;
