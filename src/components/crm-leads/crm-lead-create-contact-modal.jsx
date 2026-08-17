import React, { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RiUserAddLine } from 'react-icons/ri';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import { PhoneInputController } from '@/components/ui/phone-input';

const hasPhoneNumber = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  if (raw.includes('-')) return Boolean(raw.split('-').slice(1).join('-').trim());
  return /\d{7,}/.test(raw);
};

const createContactSchema = z
  .object({
    first_name: z.string().trim().min(1, 'First name is required'),
    last_name: z.string().optional(),
    email: z.union([z.literal(''), z.string().trim().email('Invalid email address')]),
    mobile_number: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasEmail = Boolean(String(data.email || '').trim());
    const hasPhone = hasPhoneNumber(data.mobile_number);
    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either Email ID or Phone must be filled',
        path: ['email'],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either Email ID or Phone must be filled',
        path: ['mobile_number'],
      });
    }
  });

const splitNameFromQuery = (searchQuery = '') => {
  const nameParts = String(searchQuery || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' '),
  };
};

/**
 * Compact modal to create a CRM Contact from the Leads listview Contact cell.
 * Fields: First name (required), Last name (optional), Email ID, Phone —
 * at least one of Email or Phone is required.
 */
const CrmLeadCreateContactModal = ({
  open,
  onOpenChange,
  searchQuery = '',
  onSubmit,
  onRetryLink,
  createdContactId = '',
  isSubmitting = false,
}) => {
  const wasOpenRef = useRef(false);
  const isRetryMode = Boolean(String(createdContactId || '').trim());

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      mobile_number: '',
    },
  });

  // Reset form only when the modal opens (not on searchQuery churn while open).
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    const { first_name, last_name } = splitNameFromQuery(searchQuery);
    reset({
      first_name,
      last_name,
      email: '',
      mobile_number: '',
    });
  }, [open, searchQuery, reset]);

  const handleClose = () => {
    if (isSubmitting) return;
    onOpenChange?.(false);
  };

  const handleFormSubmit = async (data) => {
    if (isRetryMode) return;
    await onSubmit?.({
      first_name: data.first_name.trim(),
      last_name: String(data.last_name || '').trim(),
      email: String(data.email || '').trim(),
      mobile_number: hasPhoneNumber(data.mobile_number)
        ? String(data.mobile_number).trim()
        : undefined,
    });
  };

  return (
    <Modal.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <Modal.Content className='max-w-[450px]' showClose>
        <Modal.Header
          icon={RiUserAddLine}
          title='Create new contact'
          description={
            isRetryMode
              ? `Contact ${createdContactId} was created but not linked. Retry linking it to this lead.`
              : 'Add contact details to create and link to this lead.'
          }
        />

        <Modal.Body>
          <form
            id='crm-lead-create-contact-form'
            onSubmit={handleSubmit(handleFormSubmit)}
            className='flex flex-col gap-4'
          >
            <div className='flex flex-col gap-1'>
              <Label.Root htmlFor='lead-create-contact-first-name'>
                First name
                <Label.Asterisk />
              </Label.Root>
              <Controller
                name='first_name'
                control={control}
                render={({ field }) => (
                  <Input.Root hasError={Boolean(errors.first_name)} size='medium'>
                    <Input.Wrapper>
                      <Input.Input
                        id='lead-create-contact-first-name'
                        {...field}
                        placeholder='Enter first name'
                        disabled={isSubmitting || isRetryMode}
                        autoFocus={!isRetryMode}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
              {errors.first_name && (
                <span className='text-paragraph-xs text-error-base'>
                  {errors.first_name.message}
                </span>
              )}
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root htmlFor='lead-create-contact-last-name'>Last name</Label.Root>
              <Controller
                name='last_name'
                control={control}
                render={({ field }) => (
                  <Input.Root hasError={Boolean(errors.last_name)} size='medium'>
                    <Input.Wrapper>
                      <Input.Input
                        id='lead-create-contact-last-name'
                        {...field}
                        placeholder='Enter last name'
                        disabled={isSubmitting || isRetryMode}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
              {errors.last_name && (
                <span className='text-paragraph-xs text-error-base'>
                  {errors.last_name.message}
                </span>
              )}
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root htmlFor='lead-create-contact-email'>Email ID</Label.Root>
              <Controller
                name='email'
                control={control}
                render={({ field }) => (
                  <Input.Root hasError={Boolean(errors.email)} size='medium'>
                    <Input.Wrapper>
                      <Input.Input
                        id='lead-create-contact-email'
                        type='email'
                        {...field}
                        placeholder='name@example.com'
                        disabled={isSubmitting || isRetryMode}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
              {errors.email && (
                <span className='text-paragraph-xs text-error-base'>{errors.email.message}</span>
              )}
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root htmlFor='lead-create-contact-phone'>Phone</Label.Root>
              <Controller
                name='mobile_number'
                control={control}
                render={({ field }) => (
                  <PhoneInputController
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    placeholder='0000000000'
                    size='medium'
                    error={Boolean(errors.mobile_number)}
                    disabled={isSubmitting || isRetryMode}
                  />
                )}
              />
              {errors.mobile_number && (
                <span className='text-paragraph-xs text-error-base'>
                  {errors.mobile_number.message}
                </span>
              )}
            </div>
          </form>
        </Modal.Body>

        <Modal.Footer>
          <div className='flex w-full items-center justify-end gap-3'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button.Root>
            {isRetryMode ? (
              <Button.Root
                type='button'
                variant='primary'
                size='small'
                disabled={isSubmitting}
                onClick={() => onRetryLink?.(createdContactId)}
              >
                {isSubmitting ? 'Linking...' : 'Retry link'}
              </Button.Root>
            ) : (
              <Button.Root
                type='submit'
                form='crm-lead-create-contact-form'
                variant='primary'
                size='small'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create contact'}
              </Button.Root>
            )}
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CrmLeadCreateContactModal;
