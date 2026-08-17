import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector } from 'react-redux';
import { RiErrorWarningFill, RiAlertFill } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Hint from '@/components/ui/hint';
import { removeUserSchema } from '@/schemas/users-schemas';

const RemoveUserModal = ({
  isOpen,
  selectedUser,
  handleOpenChange,
  onDeleteUser,
  isDeleting = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(removeUserSchema),
    defaultValues: {
      replacementUser: '',
      actionType: '',
    },
  });

  const selectedReplacementUser = watch('replacementUser');
  const actionType = watch('actionType');
  const replacementUsers = useSelector((state) => state.profile.removeUser.replacementUsers.data);
  const isLoadingReplacementUsers = useSelector(
    (state) => state.profile.removeUser.replacementUsers.isLoading,
  );
  const isFormValid = selectedReplacementUser && actionType === 'REMOVE';

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = () => {
    if (selectedUser) {
      onDeleteUser(selectedUser, selectedReplacementUser);
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
          title='Remove User?'
          description="Reassign this role to another user before removing this user. The other user's role will be updated."
        />
        <Modal.Body className='px-8 pb-8 pt-4'>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col gap-4'>
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Assign User
                <Label.Asterisk />
              </Label.Root>
              <Select.Root
                value={selectedReplacementUser}
                onValueChange={(value) => setValue('replacementUser', value)}
                hasError={Boolean(errors.replacementUser)}
                disabled={isLoadingReplacementUsers}
              >
                <Select.Trigger className='w-full'>
                  <Select.Value
                    placeholder={isLoadingReplacementUsers ? 'Loading users...' : 'Select'}
                  />
                </Select.Trigger>
                <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                  {replacementUsers
                    ?.filter((user) => user.email !== selectedUser?.email)
                    .map((user) => (
                      <Select.Item key={user.email} value={user.email}>
                        <span className='flex whitespace-nowrap items-center gap-1 paragraph-small text-[var(--color-text-main-900)] '>
                          {user.name || user.full_name}{' '}
                          <span className='paragraph-xsmall whitespace-nowrap text-[var(--color-text-soft-400)]'>
                            ({user.email})
                          </span>
                        </span>
                      </Select.Item>
                    ))}
                </Select.Content>
              </Select.Root>
              {errors.replacementUser && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.replacementUser.message}
                </Hint.Root>
              )}
            </div>

            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                To confirm, type &quot;REMOVE&quot; below.
                <Label.Asterisk />
              </Label.Root>
              <Input.Root
                size='medium'
                className='w-full  autoComplete="off"'
                hasError={Boolean(errors.actionType)}
              >
                <Input.Wrapper>
                  <Input.Input type='text' placeholder='e.g. REMOVE' {...register('actionType')} />
                </Input.Wrapper>
              </Input.Root>
              {errors.actionType && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.actionType.message}
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
            disabled={isDeleting}
          >
            Cancel
          </Button.Root>

          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='medium'
            onClick={handleSubmit(onSubmit)}
            disabled={!isFormValid || isDeleting || isLoadingReplacementUsers}
          >
            Confirm
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default RemoveUserModal;
