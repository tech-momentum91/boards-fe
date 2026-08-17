import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiErrorWarningFill, RiAlertFill } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import * as Hint from '@/components/ui/hint';
import { z } from 'zod';

const removeOpexSchema = z.object({
  confirmText: z
    .string()
    .min(1, 'Please type REMOVE to confirm')
    .refine((value) => value === 'REMOVE', {
      message: 'Please type REMOVE to confirm',
    }),
});

const RemoveOpexModal = ({
  isOpen,
  isLoading = false,
  opexData,
  handleOpenChange,
  handleRemove,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(removeOpexSchema),
    defaultValues: {
      confirmText: '',
    },
  });

  const confirmText = watch('confirmText');
  const isConfirmValid = confirmText === 'REMOVE';

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = () => {
    if (opexData) {
      handleRemove(opexData);
    }
    reset();
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[400px]' showClose={false}>
        <Modal.Header
          variant='center'
          className='px-8 pt-8 pb-4 gap-4'
          icon={<RiAlertFill className='w-8 h-8 fill-warning-base' />}
          title='Remove Opex?'
          description='Are you sure you want to proceed? This action cannot be undone.'
        />
        <Modal.Body className='px-8 pb-8 pt-4'>
          <form
            id='remove-opex-form'
            onSubmit={handleSubmit(onSubmit)}
            className='w-full flex flex-col gap-4'
          >
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                To confirm, type &quot;REMOVE&quot; below.
                <Label.Asterisk />
              </Label.Root>
              <Input.Root size='medium' className='w-full' hasError={Boolean(errors.confirmText)}>
                <Input.Wrapper>
                  <Input.Input
                    type='text'
                    placeholder='e.g. REMOVE'
                    {...register('confirmText')}
                    disabled={isLoading}
                    autoComplete='off'
                  />
                </Input.Wrapper>
              </Input.Root>
              {errors.confirmText && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.confirmText.message}
                </Hint.Root>
              )}
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer className='px-8 py-6 bg-bg-white-0 border-t border-stroke-soft-200/80 flex justify-end items-center gap-3 rounded-b-xl'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='medium'
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button.Root>

          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='medium'
            onClick={handleSubmit(onSubmit)}
            disabled={!isConfirmValid || isLoading}
          >
            {isLoading ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                Removing...
              </span>
            ) : (
              'Confirm'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default RemoveOpexModal;
