import React, { useCallback, useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RiCalendarLine,
  RiHomeOfficeFill,
  RiShieldCheckFill,
  RiUserFill,
  RiUserLine,
} from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Checkbox from '@/components/ui/checkbox';
import { Datepicker } from '@/components/ui/datepicker';
import ErrorText from '@/components/ui/error-text';
import {
  closeAddCoworkerModal,
  selectAddCoworkerModal,
  selectCoworkerMutationState,
} from '@/redux/coworkerSlice';
import { coworkerSchema, defaultCoworkerValues } from '@/schemas/coworker-schema';
import * as Label from '@/components/ui/label';
import SearchableDepartmentSelect from '@/components/clients-management/client-detail-coworkers/searchable-department-select';
import SearchableReportingManagerSelect from '@/components/clients-management/client-detail-coworkers/searchable-reporting-manager-select';
import { withCurrentCenterOption } from '@/utils/coworker-centers';

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Others', label: 'Others' },
];

const WORK_MODE_OPTIONS = [
  { value: 'Full-Time Office', label: 'Full-Time Office' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'Remote-First', label: 'Remote-First' },
  { value: 'Visitor Only', label: 'Visitor Only' },
];

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

const ACCESS_OPTIONS = [
  { value: 'Admin', label: 'Admin' },
  { value: 'User', label: 'User' },
];

const ClientDetailAddCoworkersModel = ({
  onSubmit,
  departmentOptions = [],
  assignedCenterOptions = [],
  isLoadingAssignedCenters = false,
  clientId = '',
}) => {
  const dispatch = useDispatch();
  const addCoworkerModal = useSelector(selectAddCoworkerModal);
  const coworkerMutations = useSelector(selectCoworkerMutationState);
  const isOpen = addCoworkerModal?.isOpen === true;
  const modalMode = addCoworkerModal?.mode || 'create';
  const modalPayload = addCoworkerModal?.coworker;
  const isReadOnly = modalMode === 'view';
  const isAccessTypeLocked = modalMode === 'edit';
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(coworkerSchema),
    defaultValues: defaultCoworkerValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const accessType = watch('accessType');
  const isAdminAccess = accessType === 'Admin';
  const isMutationLoading = Boolean(coworkerMutations?.isCreating || coworkerMutations?.isUpdating);
  const isFieldDisabled = isSubmitting || isReadOnly || isMutationLoading;

  const resolvedDepartmentOptions = useMemo(() => {
    const base = [...departmentOptions];
    const currentDepartment = String(
      modalPayload?.formValues?.department ??
        modalPayload?.record?.department ??
        modalPayload?.department ??
        '',
    ).trim();
    if (currentDepartment && !base.some((opt) => opt.value === currentDepartment)) {
      base.unshift({ value: currentDepartment, label: currentDepartment });
    }
    return base;
  }, [departmentOptions, modalPayload]);

  const resolvedAssignedCenterOptions = useMemo(() => {
    const currentCenter = String(
      modalPayload?.formValues?.assignedCenter ??
        modalPayload?.record?.assigned_center ??
        modalPayload?.record?.center ??
        '',
    ).trim();
    return withCurrentCenterOption(assignedCenterOptions, currentCenter);
  }, [assignedCenterOptions, modalPayload]);

  useEffect(() => {
    if (!isOpen) return;
    const raw = modalPayload?.formValues ?? modalPayload?.record ?? modalPayload ?? {};
    const nameParts = String(raw.fullName || '')
      .trim()
      .split(/\s+/u)
      .filter(Boolean);
    const firstFromFull = nameParts[0] || '';
    const lastFromFull = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    reset({
      ...defaultCoworkerValues,
      ...raw,
      firstName: raw.firstName || raw.first_name || firstFromFull,
      lastName: raw.lastName || raw.last_name || lastFromFull,
    });
  }, [isOpen, modalPayload, reset]);

  useEffect(() => {
    if (!isOpen || modalMode !== 'create' || resolvedAssignedCenterOptions.length === 0) return;
    setValue('assignedCenter', resolvedAssignedCenterOptions[0].value, { shouldValidate: true });
  }, [isOpen, modalMode, resolvedAssignedCenterOptions, setValue]);

  useEffect(() => {
    if (isAdminAccess) {
      setValue('allowBooking', true, { shouldValidate: true });
      setValue('allowVisitorInvites', true, { shouldValidate: true });
      setValue('allowTicketCreation', true, { shouldValidate: true });
    }
  }, [isAdminAccess, setValue]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    dispatch(closeAddCoworkerModal());
    reset(defaultCoworkerValues);
  }, [dispatch, isSubmitting, reset]);

  const handleFormSubmit = useCallback(
    async (values) => {
      if (!isReadOnly) {
        const didSucceed = await onSubmit?.(values, addCoworkerModal);
        if (didSucceed === false) return;
      }
      handleClose();
    },
    [addCoworkerModal, handleClose, isReadOnly, onSubmit],
  );

  const modalTitle =
    modalMode === 'edit'
      ? 'Edit Coworker'
      : modalMode === 'view'
        ? 'Coworker Details'
        : 'Add Coworker';

  const submitLabel = modalMode === 'edit' ? 'Save Changes' : 'Add Coworker';

  const modalDescription =
    modalMode === 'view'
      ? 'View coworker profile and access details.'
      : 'Add coworker profile and access details.';

  const handleCloseLabel = modalMode === 'view' ? 'Close' : 'Cancel';

  const handleCloseAndReset = useCallback(() => {
    handleClose();
  }, [handleClose]);

  return (
    <Modal.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleCloseAndReset();
        }
      }}
    >
      <Modal.Content className=' max-w-[760px]' showClose={true}>
        <Modal.Header title={modalTitle} description={modalDescription} />

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Modal.Body className='flex flex-col gap-6 max-h-[600px] overflow-y-auto'>
            <section className='flex flex-col gap-3 '>
              <div className='flex items-center gap-2'>
                <RiUserFill className='text-primary-base' />
                <span className='label-small text-primary-base'>BASIC DETAILS</span>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    First Name <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='firstName'
                    control={control}
                    render={({ field }) => (
                      <Input.Root hasError={Boolean(errors.firstName)} size='small'>
                        <Input.Wrapper>
                          <Input.Input
                            {...field}
                            placeholder='Enter First name'
                            disabled={isFieldDisabled}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.firstName && <ErrorText>{errors.firstName.message}</ErrorText>}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Last Name <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='lastName'
                    control={control}
                    render={({ field }) => (
                      <Input.Root hasError={Boolean(errors.lastName)} size='small'>
                        <Input.Wrapper>
                          <Input.Input
                            {...field}
                            placeholder='Enter Last name'
                            disabled={isFieldDisabled}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.lastName && <ErrorText>{errors.lastName.message}</ErrorText>}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Email <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='email'
                    control={control}
                    render={({ field }) => (
                      <Input.Root hasError={Boolean(errors.email)} size='small'>
                        <Input.Wrapper>
                          <Input.Input
                            {...field}
                            type='email'
                            placeholder='Enter email'
                            disabled={isFieldDisabled}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.email && <ErrorText>{errors.email.message}</ErrorText>}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Phone <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='phone'
                    control={control}
                    render={({ field }) => (
                      <Input.Root hasError={Boolean(errors.phone)} size='small'>
                        <Input.Wrapper>
                          <Input.Input
                            {...field}
                            type='tel'
                            placeholder='Enter 10-digit phone'
                            maxLength={10}
                            disabled={isFieldDisabled}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.phone && <ErrorText>{errors.phone.message}</ErrorText>}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>Date of birth</Label.Root>
                  <Controller
                    name='dateOfBirth'
                    control={control}
                    render={({ field }) => (
                      <Datepicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder='Select date'
                        size='small'
                        variant='outlined'
                        prefixIcon={<RiCalendarLine />}
                        disabled={isFieldDisabled}
                      />
                    )}
                  />
                </div>

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>Employee ID</Label.Root>
                  <Controller
                    name='employeeId'
                    control={control}
                    render={({ field }) => (
                      <Input.Root size='small'>
                        <Input.Wrapper>
                          <Input.Input
                            {...field}
                            placeholder='Enter employee ID'
                            disabled={isFieldDisabled}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                </div>

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Gender <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='gender'
                    control={control}
                    render={({ field }) => (
                      <Select.Root
                        value={field.value}
                        onValueChange={field.onChange}
                        size='small'
                        hasError={Boolean(errors.gender)}
                        disabled={isFieldDisabled}
                      >
                        <Select.Trigger className='w-full'>
                          <Select.Value placeholder='Select gender' />
                        </Select.Trigger>
                        <Select.Content>
                          {GENDER_OPTIONS.map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                              {option.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                  {errors.gender && <ErrorText>{errors.gender.message}</ErrorText>}
                </div>
              </div>
            </section>

            <section className='flex flex-col gap-3'>
              <div className='flex items-center gap-2'>
                <RiHomeOfficeFill className='text-primary-base' />
                <span className='label-small text-primary-base'>WORK DETAILS</span>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Department <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='department'
                    control={control}
                    render={({ field }) => (
                      <SearchableDepartmentSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={resolvedDepartmentOptions}
                        hasError={Boolean(errors.department)}
                        disabled={isFieldDisabled}
                        placeholder='Enter or select department'
                      />
                    )}
                  />
                  {errors.department && <ErrorText>{errors.department.message}</ErrorText>}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Designation <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='designation'
                    control={control}
                    render={({ field }) => (
                      <Input.Root hasError={Boolean(errors.designation)} size='small'>
                        <Input.Wrapper>
                          <Input.Input
                            {...field}
                            placeholder='Enter designation'
                            disabled={isFieldDisabled}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                  {errors.designation && <ErrorText>{errors.designation.message}</ErrorText>}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>Reporting Manager</Label.Root>
                  <Controller
                    name='reportingManager'
                    control={control}
                    render={({ field }) => (
                      <SearchableReportingManagerSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        clientId={clientId}
                        hasError={Boolean(errors.reportingManager)}
                        disabled={isFieldDisabled}
                        placeholder='Select manager'
                      />
                    )}
                  />
                  {errors.reportingManager && (
                    <ErrorText>{errors.reportingManager.message}</ErrorText>
                  )}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Work Mode <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='workMode'
                    control={control}
                    render={({ field }) => (
                      <Select.Root
                        value={field.value}
                        onValueChange={field.onChange}
                        size='small'
                        hasError={Boolean(errors.workMode)}
                        disabled={isFieldDisabled}
                      >
                        <Select.Trigger className='w-full'>
                          <Select.Value placeholder='Select work mode' />
                        </Select.Trigger>
                        <Select.Content>
                          {WORK_MODE_OPTIONS.map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                              {option.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                  {errors.workMode && <ErrorText>{errors.workMode.message}</ErrorText>}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Assigned Center <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='assignedCenter'
                    control={control}
                    render={({ field }) => (
                      <Select.Root
                        value={field.value}
                        onValueChange={field.onChange}
                        size='small'
                        hasError={Boolean(errors.assignedCenter)}
                        disabled={isFieldDisabled || isLoadingAssignedCenters}
                      >
                        <Select.Trigger className='w-full'>
                          <Select.Value
                            placeholder={
                              isLoadingAssignedCenters ? 'Loading centers…' : 'Select center'
                            }
                          />
                        </Select.Trigger>
                        <Select.Content>
                          {resolvedAssignedCenterOptions.length > 0 ? (
                            resolvedAssignedCenterOptions.map((option) => (
                              <Select.Item key={option.value} value={option.value}>
                                {option.label}
                              </Select.Item>
                            ))
                          ) : (
                            <div className='px-3 py-2 text-paragraph-sm text-text-sub-500'>
                              {isLoadingAssignedCenters
                                ? 'Loading centers…'
                                : 'No centers assigned to this client'}
                            </div>
                          )}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                  {errors.assignedCenter && <ErrorText>{errors.assignedCenter.message}</ErrorText>}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Status <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='status'
                    control={control}
                    render={({ field }) => (
                      <Select.Root
                        value={field.value}
                        onValueChange={field.onChange}
                        size='small'
                        hasError={Boolean(errors.status)}
                        disabled={isFieldDisabled}
                      >
                        <Select.Trigger className='w-full'>
                          <Select.Value placeholder='Select status' />
                        </Select.Trigger>
                        <Select.Content>
                          {STATUS_OPTIONS.map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                              {option.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                  {errors.status && <ErrorText>{errors.status.message}</ErrorText>}
                </div>
              </div>
            </section>

            <section className='flex flex-col gap-3'>
              <div className='flex items-center gap-1'>
                <RiShieldCheckFill className='text-primary-base' />
                <span className='label-small text-primary-base'>ACCESS DETAILS</span>
              </div>
              <div className='flex flex-col gap-4'>
                <div className='flex flex-col gap-1.5'>
                  <Label.Root>
                    Access Type <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='accessType'
                    control={control}
                    render={({ field }) => (
                      <Select.Root
                        value={field.value}
                        onValueChange={field.onChange}
                        size='small'
                        hasError={Boolean(errors.accessType)}
                        disabled={isFieldDisabled || isAccessTypeLocked}
                      >
                        <Select.Trigger className='w-1/2'>
                          <Select.Value placeholder='Select access type' />
                        </Select.Trigger>
                        <Select.Content>
                          {ACCESS_OPTIONS.map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                              {option.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                  {errors.accessType && <ErrorText>{errors.accessType.message}</ErrorText>}
                </div>

                <div className='flex flex-col gap-2 rounded-lg '>
                  <Controller
                    name='allowBooking'
                    control={control}
                    render={({ field }) => (
                      <label className='flex items-center gap-2 text-paragraph-sm text-text-main-900'>
                        <Checkbox.Root
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          disabled={isFieldDisabled || isAdminAccess}
                        />
                        Allow Booking
                      </label>
                    )}
                  />
                  <Controller
                    name='allowVisitorInvites'
                    control={control}
                    render={({ field }) => (
                      <label className='flex items-center gap-2 text-paragraph-sm text-text-main-900'>
                        <Checkbox.Root
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          disabled={isFieldDisabled || isAdminAccess}
                        />
                        Allow Visitor Invites
                      </label>
                    )}
                  />
                  <Controller
                    name='allowTicketCreation'
                    control={control}
                    render={({ field }) => (
                      <label className='flex items-center gap-2 text-paragraph-sm text-text-main-900'>
                        <Checkbox.Root
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          disabled={isFieldDisabled || isAdminAccess}
                        />
                        Allow Ticket Creation
                      </label>
                    )}
                  />
                </div>
              </div>
            </section>
          </Modal.Body>

          <Modal.Footer>
            <div className='flex w-full items-center justify-end gap-3'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                onClick={handleCloseAndReset}
                disabled={isSubmitting}
              >
                {handleCloseLabel}
              </Button.Root>
              {!isReadOnly ? (
                <Button.Root
                  type='submit'
                  variant='primary'
                  mode='filled'
                  size='medium'
                  disabled={isFieldDisabled}
                >
                  {isMutationLoading ? 'Saving…' : submitLabel}
                </Button.Root>
              ) : null}
            </div>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

export default ClientDetailAddCoworkersModel;
