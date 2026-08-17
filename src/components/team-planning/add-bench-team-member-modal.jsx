import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RiUserAddLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Badge from '@/components/ui/badge';
import { closeBenchMemberModal, createBenchTeamMember } from '@/redux/teamPlanningSlice';
import { fetchRolesWithType } from '@/redux/teamManagementSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { flattenRolesFromGrouped, normalizeRoleEntry } from '@/utils/user-utils';

const DEFAULT_AVATAR =
  'https://png.pngtree.com/png-vector/20231019/ourmid/pngtree-user-profile-avatar-png-image_10211467.png';

const schema = z.object({
  firstName: z.string().min(1, 'First Name is required'),
  lastName: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  email: z
    .string()
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: 'Please enter a valid email address',
    }),
  dateOfJoining: z.string().min(1, 'Date of Joining is required'),
  status: z.string().min(1, 'Status is required'),
});

const STATUS_OPTIONS = [{ value: 'Active', label: 'Active', color: 'green' }];

const AddBenchTeamMemberModal = ({ centers = [], onSaved }) => {
  const dispatch = useDispatch();
  const { isOpen, isSaving, error, context } = useSelector(
    (state) => state.teamPlanning.benchMemberModal,
  );
  const rolesWithType = useSelector((state) => state.teamManagement.rolesWithType);
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      role: '',
      email: '',
      dateOfJoining: '',
      status: 'Active',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    dispatch(fetchRolesWithType({}));
    reset({
      firstName: '',
      lastName: '',
      role: '',
      email: '',
      dateOfJoining: context?.planning_month ? String(context.planning_month).slice(0, 10) : '',
      status: 'Active',
    });
    setSelectedImage(null);
  }, [isOpen, context?.planning_month, dispatch, reset]);

  const roleOptions = useMemo(() => {
    const raw = rolesWithType?.data;
    const flat = flattenRolesFromGrouped(raw) || [];
    return flat
      .map((entry) => normalizeRoleEntry(entry))
      .filter((entry) => entry?.name)
      .map((entry) => ({ value: entry.name, label: entry.name }));
  }, [rolesWithType?.data]);

  const centerIds = useMemo(() => {
    if (context?.centers?.length) return context.centers;
    return (centers || []).map((center) => center.id).filter(Boolean);
  }, [centers, context?.centers]);

  const onOpenChange = (open) => {
    if (!open) dispatch(closeBenchMemberModal());
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      showErrorToast('Please upload a PNG or JPEG image');
      return;
    }
    setSelectedImage(file);
  };

  const onSubmit = async (values) => {
    if (centerIds.length === 0) {
      showErrorToast('Select at least one center before adding a team member');
      return;
    }

    try {
      await dispatch(
        createBenchTeamMember({
          first_name: values.firstName.trim(),
          last_name: (values.lastName || '').trim(),
          role: values.role,
          email: (values.email || '').trim(),
          date_of_joining: values.dateOfJoining,
          status: values.status,
          centers: centerIds,
          center: centerIds[0],
          image: selectedImage || undefined,
        }),
      ).unwrap();
      showSuccessToast('Team member added');
      dispatch(closeBenchMemberModal());
      onSaved?.();
    } catch (error_) {
      showErrorToast(
        typeof error_ === 'string' ? error_ : error_?.message || 'Failed to add team member',
      );
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[520px]'>
        <Modal.Header
          icon={RiUserAddLine}
          title='Add Team Member'
          description='Fill out below details to add new team member.'
        />
        <Modal.Body>
          <form
            id='add-bench-team-member-form'
            onSubmit={handleSubmit(onSubmit)}
            className='flex w-full flex-col gap-4'
          >
            <div className='flex gap-5'>
              <div className='size-20 shrink-0 overflow-hidden rounded-full ring-1 ring-stroke-soft-200'>
                <img
                  src={selectedImage ? URL.createObjectURL(selectedImage) : DEFAULT_AVATAR}
                  className='size-full object-cover'
                  alt=''
                />
              </div>
              <div className='flex flex-col gap-3'>
                <div className='flex flex-col gap-1'>
                  <span className='text-label-sm text-text-strong-950'>Upload Image</span>
                  <span className='text-paragraph-xs text-text-sub-500'>
                    Min 400x400px, PNG or JPEG
                  </span>
                </div>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/png,image/jpeg'
                    className='hidden'
                    onChange={handleImageUpload}
                  />
                  Upload
                </Button.Root>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='flex flex-col gap-1.5'>
                <Label.Root>
                  First Name <Label.Asterisk />
                </Label.Root>
                <Controller
                  name='firstName'
                  control={control}
                  render={({ field }) => (
                    <Input.Root size='small' hasError={Boolean(errors.firstName)}>
                      <Input.Wrapper>
                        <Input.Input {...field} placeholder='First name' />
                      </Input.Wrapper>
                    </Input.Root>
                  )}
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label.Root>Last Name</Label.Root>
                <Controller
                  name='lastName'
                  control={control}
                  render={({ field }) => (
                    <Input.Root size='small'>
                      <Input.Wrapper>
                        <Input.Input {...field} placeholder='Last name' />
                      </Input.Wrapper>
                    </Input.Root>
                  )}
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label.Root>
                  Role <Label.Asterisk />
                </Label.Root>
                <Controller
                  name='role'
                  control={control}
                  render={({ field }) => (
                    <Select.Root value={field.value || undefined} onValueChange={field.onChange}>
                      <Select.Trigger size='small' className='w-full'>
                        <Select.Value placeholder='Select' />
                      </Select.Trigger>
                      <Select.Content>
                        {roleOptions.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  )}
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label.Root>Email</Label.Root>
                <Controller
                  name='email'
                  control={control}
                  render={({ field }) => (
                    <Input.Root size='small' hasError={Boolean(errors.email)}>
                      <Input.Wrapper>
                        <Input.Input {...field} placeholder='Enter email address' />
                      </Input.Wrapper>
                    </Input.Root>
                  )}
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label.Root>
                  Date of Joining <Label.Asterisk />
                </Label.Root>
                <Controller
                  name='dateOfJoining'
                  control={control}
                  render={({ field }) => (
                    <Input.Root size='small' hasError={Boolean(errors.dateOfJoining)}>
                      <Input.Wrapper>
                        <Input.Input {...field} type='date' placeholder='DD / MM / YYYY' />
                      </Input.Wrapper>
                    </Input.Root>
                  )}
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label.Root>
                  Status <Label.Asterisk />
                </Label.Root>
                <Controller
                  name='status'
                  control={control}
                  render={({ field }) => (
                    <Select.Root value={field.value} onValueChange={field.onChange}>
                      <Select.Trigger size='small' className='w-full'>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        {STATUS_OPTIONS.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            <Badge.Root size='small' variant='light' color={option.color}>
                              {option.label}
                            </Badge.Root>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  )}
                />
              </div>
            </div>

            {error ? (
              <p className='text-paragraph-xs text-error-base'>
                {typeof error === 'string' ? error : 'Something went wrong'}
              </p>
            ) : null}
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            onClick={() => dispatch(closeBenchMemberModal())}
            disabled={isSaving}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='submit'
            form='add-bench-team-member-form'
            disabled={!isValid || isSaving || centerIds.length === 0}
          >
            {isSaving ? 'Adding…' : 'Add'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default AddBenchTeamMemberModal;
