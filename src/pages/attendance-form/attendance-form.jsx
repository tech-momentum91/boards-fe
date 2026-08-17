import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Checkbox from '@/components/ui/checkbox';
import * as FileUpload from '@/components/ui/file-upload';
import * as Hint from '@/components/ui/hint';
import logo from '@/assets/svgs/Layer.svg';
import { AttendanceDateTimePicker } from './attendance-date-time-picker';
import {
  RiAlertLine,
  RiCheckboxFill,
  RiCheckLine,
  RiCircleLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiFileWarningLine,
  RiTelegram2Fill,
  RiUpload2Line,
} from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import {
  createNewStaffThunk,
  getEmployeeListThunk,
  getPublicCenterListThunk,
  submitAttendaceThunk,
  addAttendancePhotoThunk,
  getSupportRolesThunk,
} from '@/redux/attendanceSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import attendanceFormTranslations from '@/locales/attendance-form.json';
import { STAFF_TYPE_OPTIONS, CHECKLIST_ITEMS } from './constant';

const getInitialChecklist = () =>
  CHECKLIST_ITEMS.map((label) => ({ label, checked: false, status: null }));

const attendanceFormSchema = z
  .object({
    dateTime: z.coerce.date(),
    staffType: z.enum(['CURRENT', 'NEW', 'NEW_TRAINEE', 'RELIEVER']),
    language: z.enum(['en', 'hi']).default('hi'),

    selectedCenter: z.string().min(1, { message: 'centerRequired' }),
    role: z.string().optional(),

    // Current staff fields
    currentStaffId: z.string().optional(),
    shift: z.string().refine((val) => val === 'Shift 1' || val === 'Shift 2', {
      message: 'shiftRequired',
    }),

    // Reliever staff fields
    relieverAadhar: z.string().optional(),
    relieverPhone: z.string().optional(),
    relieverFirstName: z.string().optional(),
    relieverLastName: z.string().optional(),
    relievedStaffId: z.string().optional(),

    // New staff / trainee fields
    newAadhar: z.string().optional(),
    newPhone: z.string().optional(),
    newFirstName: z.string().optional(),
    newLastName: z.string().optional(),

    comment: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const requireField = (condition, path, message) => {
      if (!condition) return;
      const value = data?.[path];
      if (typeof value !== 'string' || value.trim().length === 0) {
        ctx.addIssue({
          path: [path],
          message,
          code: z.ZodIssueCode.custom,
        });
      }
    };

    const isNew = data.staffType === 'NEW' || data.staffType === 'NEW_TRAINEE';
    const isReliever = data.staffType === 'RELIEVER';
    const isCurrent = data.staffType === 'CURRENT';

    requireField(isNew, 'newAadhar', 'aadharRequired');
    requireField(isNew, 'newPhone', 'mobileRequired');
    requireField(isNew, 'newFirstName', 'firstNameRequired');
    requireField(isNew, 'newLastName', 'lastNameRequired');

    requireField(isReliever, 'relieverAadhar', 'aadharRequired');
    requireField(isReliever, 'relieverPhone', 'mobileRequired');
    requireField(isReliever, 'relieverFirstName', 'firstNameRequired');
    requireField(isReliever, 'relieverLastName', 'lastNameRequired');
    requireField(isCurrent, 'currentStaffId', 'staffRequired');
    requireField(isNew, 'role', 'roleRequired');
    requireField(isReliever, 'role', 'roleRequired');
    requireField(isReliever, 'relievedStaffId', 'staffRequired');
  });

const isChecklistComplete = (checklist) => {
  return checklist.every((item) => item.status === 'Pass' || item.status === 'Fail');
};

const AttendanceForm = () => {
  const dispatch = useDispatch();

  const publicCenter = useSelector((state) => state.attendance.publicCenterList);

  const publicCenterListData = publicCenter?.data;
  const publicCenterListLoading = publicCenter?.isLoading;

  const employeeList = useSelector((state) => state.attendance.employeeList?.data);
  const supportRoles = useSelector((state) => state.attendance.supportRoles);
  // console.log('employeeList', employeeList);

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    getValues,
  } = useForm({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      dateTime: new Date(),
      staffType: 'CURRENT',
      language: 'hi',
      selectedCenter: '',
      role: '',
      currentStaffId: '',
      shift: '',
      relieverAadhar: '',
      relieverPhone: '',
      relieverFirstName: '',
      relieverLastName: '',
      relievedStaffId: '',
      newAadhar: '',
      newPhone: '',
      newFirstName: '',
      newLastName: '',
      comment: '',
    },
  });

  const dateTime = watch('dateTime');
  const staffType = watch('staffType');
  const language = watch('language');
  const selectedCenter = watch('selectedCenter');
  const role = watch('role');

  // Current staff fields
  const currentStaffId = watch('currentStaffId');
  const shift = watch('shift');
  const [photos, setPhotos] = useState([]); // { file, url }
  const [checklist, setChecklist] = useState(getInitialChecklist());

  // Reliever staff fields
  const relieverAadhar = watch('relieverAadhar');
  const relieverPhone = watch('relieverPhone');
  const relieverFirstName = watch('relieverFirstName');
  const relieverLastName = watch('relieverLastName');
  const relievedStaffId = watch('relievedStaffId');

  // New staff / trainee fields
  const newAadhar = watch('newAadhar');
  const newPhone = watch('newPhone');
  const newFirstName = watch('newFirstName');
  const newLastName = watch('newLastName');
  const [newProfileImage, setNewProfileImage] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoInputRef = useRef(null);
  const profileInputRef = useRef(null);

  const t = useCallback(
    (key) => {
      const dict = attendanceFormTranslations?.[language] || attendanceFormTranslations?.en || {};
      return dict[key] || key;
    },
    [language],
  );

  const supportRoleOptions = useMemo(() => {
    const raw = supportRoles?.data;
    if (!raw || typeof raw !== 'object') return [];
    const result = [];
    Object.entries(raw).forEach(([group, roles]) => {
      (Array.isArray(roles) ? roles : []).forEach((r) => {
        result.push({
          value: r,
          label: `${r}`,
        });
      });
    });
    return result;
  }, [supportRoles]);
  const comment = watch('comment');

  // Cleanup photo URLs on unmount

  const fetchPublicCenterList = async () => {
    try {
      await dispatch(getPublicCenterListThunk()).unwrap();
    } catch (error) {
      showErrorToast(error, { defaultMessage: t('Failed to fetch centers.') });
    }
  };

  const fetchEmplopyeeList = useCallback(async () => {
    try {
      await dispatch(getEmployeeListThunk(selectedCenter)).unwrap();
    } catch (error) {
      showErrorToast(error, { defaultMessage: t('Failed to fetch employee list.') });
    }
  }, [dispatch, selectedCenter]);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [photos]);

  useEffect(() => {
    fetchPublicCenterList();
  }, []);

  useEffect(() => {
    if (selectedCenter) {
      fetchEmplopyeeList();
    }
  }, [selectedCenter, fetchEmplopyeeList]);

  useEffect(() => {
    if (staffType !== 'NEW' && staffType !== 'NEW_TRAINEE' && staffType !== 'RELIEVER') {
      return;
    }

    const hasData =
      supportRoles?.data && typeof supportRoles.data === 'object'
        ? Object.keys(supportRoles.data).length > 0
        : false;

    // Only fetch once when there's no data, not currently loading, and no prior error
    if (!hasData && !supportRoles?.isLoading && !supportRoles?.error) {
      dispatch(getSupportRolesThunk())
        .unwrap()
        .catch((error) => {
          showErrorToast(error, { defaultMessage: t('Failed to fetch support roles.') });
        });
    }
  }, [staffType, supportRoles?.data, supportRoles?.isLoading, supportRoles?.error, dispatch]);

  const handlePhotoChange = (event) => {
    const files = [...(event.target.files || [])];
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, 5 - photos.length);
    const selected = files.slice(0, remainingSlots).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPhotos((previous) => [...previous, ...selected]);
  };

  const handleRemovePhoto = (index) => {
    setPhotos((previous) => {
      const next = [...previous];
      const [removed] = next.splice(index, 1);
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return next;
    });
  };

  const handleChecklistToggleChecked = (index, checked) => {
    setChecklist((previous) =>
      previous.map((item, i) => (i === index ? { ...item, checked: Boolean(checked) } : item)),
    );
  };

  const handleChecklistStatus = (index, status) => {
    setChecklist((prev) => prev.map((item, i) => (i === index ? { ...item, status } : item)));
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setNewProfileImage(file);
  };

  const handlePhotoUploadClick = () => {
    photoInputRef.current?.click();
  };

  const handleProfileUploadClick = () => {
    profileInputRef.current?.click();
  };

  const handleCurrentStaffChange = (value) => {
    setValue('currentStaffId', value);
    const selected =
      Array.isArray(employeeList) && employeeList.length > 0
        ? employeeList.find((opt) => opt.team_member_id === value)
        : null;

    if (selected?.role) {
      setValue('role', selected.role);
    }
  };

  const resetForm = useCallback(
    (options = {}) => {
      const { keepStaffType = false } = options;
      photos.forEach((p) => {
        if (p?.url) URL.revokeObjectURL(p.url);
      });
      const nextStaffType = keepStaffType ? getValues('staffType') : 'CURRENT';
      const nextLanguage = getValues('language') || 'hi';
      reset({
        dateTime: new Date(),
        staffType: nextStaffType,
        language: nextLanguage,
        selectedCenter: '',
        role: '',
        currentStaffId: '',
        shift: '',
        relieverAadhar: '',
        relieverPhone: '',
        relieverFirstName: '',
        relieverLastName: '',
        relievedStaffId: '',
        newAadhar: '',
        newPhone: '',
        newFirstName: '',
        newLastName: '',
        comment: '',
      });
      setPhotos([]);
      setChecklist(getInitialChecklist());
      setNewProfileImage(null);
    },
    [photos, getValues, reset],
  );

  const handleStaffTypeChange = useCallback(
    (value) => {
      const nextLanguage = getValues('language') || 'hi';
      reset({
        dateTime: new Date(),
        staffType: value,
        language: nextLanguage,
        selectedCenter: '',
        role: '',
        currentStaffId: '',
        shift: '',
        relieverAadhar: '',
        relieverPhone: '',
        relieverFirstName: '',
        relieverLastName: '',
        relievedStaffId: '',
        newAadhar: '',
        newPhone: '',
        newFirstName: '',
        newLastName: '',
        comment: '',
      });
      setPhotos((prev) => {
        prev.forEach((p) => {
          if (p?.url) URL.revokeObjectURL(p.url);
        });
        return [];
      });
      setChecklist(getInitialChecklist());
      setNewProfileImage(null);
    },
    [getValues, reset],
  );

  const uploadAttendancePhotos = useCallback(
    async (attendanceId) => {
      if (!attendanceId || !Array.isArray(photos) || photos.length === 0) {
        return;
      }

      for (const p of photos) {
        if (!(p?.file instanceof File)) continue;

        const formData = new FormData();
        formData.append('attendance_id', attendanceId);
        formData.append('image_file', p.file);

        try {
          await dispatch(addAttendancePhotoThunk(formData)).unwrap();
        } catch (error) {
          showErrorToast(error, { defaultMessage: t('Failed to upload attendance photo.') });
        }
      }
    },
    [photos, dispatch],
  );

  const handleCreateNewEmployee = useCallback(
    (data) => {
      const employmentType = 'Trainee Staff';

      const createPayload = {
        staffType: data.staffType,
        selectedCenter: data.selectedCenter,
        centerId: data.selectedCenter,
        role: data.role,
        newAadhar: data.newAadhar,
        aadharNumber: data.newAadhar,
        newFirstName: data.newFirstName,
        firstName: data.newFirstName,
        newLastName: data.newLastName,
        lastName: data.newLastName,
        newPhone: data.newPhone,
        mobileNumber: data.newPhone,
        image: newProfileImage,
        comment: data.comment,
        employmentType,
        shift: data.shift,
      };
      return dispatch(createNewStaffThunk(createPayload))
        .unwrap()
        .then((response) => {
          const message = response?.message ?? response;
          const employeeId = message?.employee_id;
          if (!employeeId) {
            showSuccessToast(t('attendanceSubmitted'));
            resetForm();
            return null;
          }
          const attendancePayload = {
            dateTime: data.dateTime,
            center: data.selectedCenter,
            role: data.role,
            staffType: data.staffType,
            currentStaff: null,
            reliever: null,
            comment: data.comment,
            shift: data.shift,
            newStaff: {
              employeeId,
              checklist,
            },
          };
          return dispatch(submitAttendaceThunk(attendancePayload)).unwrap();
        })
        .then((attendanceResponse) => {
          if (!attendanceResponse) return null;
          const message = attendanceResponse?.message ?? attendanceResponse;
          const attendanceId = message?.attendance_id;
          if (!attendanceId) return null;
          return uploadAttendancePhotos(attendanceId);
        })
        .then(() => {
          showSuccessToast(t('attendanceSubmitted'));
          resetForm();
        })
        .catch((error) => {
          showErrorToast(t(error));
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    },
    [newProfileImage, checklist, uploadAttendancePhotos, dispatch, resetForm],
  );

  const handleCreateRelieverEmployee = useCallback(
    (data) => {
      const employmentType = 'Reliever Staff';

      const createPayload = {
        staffType: 'RELIEVER',
        selectedCenter: data.selectedCenter,
        centerId: data.selectedCenter,
        role: data.role,
        aadharNumber: data.relieverAadhar,
        firstName: data.relieverFirstName,
        lastName: data.relieverLastName,
        mobileNumber: data.relieverPhone,
        employmentType,
        // Pass the employee being replaced; slice maps this into custom_replacing_employee
        employee_id: data.relievedStaffId,
        shift: data.shift,
      };

      return dispatch(createNewStaffThunk(createPayload))
        .unwrap()
        .then((response) => {
          const message = response?.message ?? response;
          const employeeId = message?.employee_id;
          if (!employeeId) {
            showSuccessToast(t('attendanceSubmitted'));
            resetForm();
            return null;
          }

          const attendancePayload = {
            dateTime: data.dateTime,
            center: data.selectedCenter,
            role: data.role,
            staffType: 'RELIEVER',
            comment: data.comment,
            employmentType,
            customReplacingEmployee: data.relievedStaffId || null,
            currentStaff: null,
            newStaff: null,
            shift: data.shift,
            reliever: {
              employeeId,
              checklist,
            },
          };

          return dispatch(submitAttendaceThunk(attendancePayload)).unwrap();
        })
        .then((attendanceResponse) => {
          if (!attendanceResponse) return null;
          const message = attendanceResponse?.message ?? attendanceResponse;
          const attendanceId = message?.attendance_id;
          if (!attendanceId) return null;
          return uploadAttendancePhotos(attendanceId);
        })
        .then(() => {
          showSuccessToast(t('attendanceSubmitted'));
          resetForm();
        })
        .catch((error) => {
          showErrorToast(error, {
            defaultMessage: t('Create reliever employee or attendance failed.'),
          });
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    },
    [checklist, dispatch, resetForm, uploadAttendancePhotos],
  );

  const onSubmit = (data) => {
    if (!isChecklistComplete(checklist)) {
      showErrorToast(new Error(t('Please mark Pass or Fail for all checklist items.')));
      return;
    }
    if (!photos || photos.length === 0) {
      showErrorToast(new Error(t('hygienePhotosRequired')));
      return;
    }
    const employmentType =
      data.staffType === 'NEW' || data.staffType === 'NEW_TRAINEE'
        ? 'Trainee Staff'
        : data.staffType === 'RELIEVER'
          ? 'Reliever Staff'
          : null;

    if ((data.staffType === 'NEW' || data.staffType === 'NEW_TRAINEE') && !newProfileImage) {
      showErrorToast(new Error(t('profilePhotoRequired')));
      return;
    }

    if (data.staffType === 'NEW' || data.staffType === 'NEW_TRAINEE') {
      setIsSubmitting(true);
      handleCreateNewEmployee(data);
      return;
    }

    if (data.staffType === 'RELIEVER') {
      setIsSubmitting(true);
      handleCreateRelieverEmployee(data);
      return;
    }

    setIsSubmitting(true);

    // Current staff or reliever: submit attendance only
    const payload = {
      dateTime: data.dateTime,
      center: data.selectedCenter,
      role: data.role,
      staffType: data.staffType,
      comment: data.comment,
      employmentType,
      customReplacingEmployee: data.staffType === 'RELIEVER' ? data.relievedStaffId : null,
      currentStaff:
        data.staffType === 'CURRENT'
          ? {
              currentStaffId: data.currentStaffId,
              photos,
              checklist,
            }
          : null,
      reliever:
        data.staffType === 'RELIEVER'
          ? {
              relieverAadhar: data.relieverAadhar,
              relieverPhone: data.relieverPhone,
              relieverFirstName: data.relieverFirstName,
              relieverLastName: data.relieverLastName,
              relievedStaffId: data.relievedStaffId,
              checklist,
            }
          : null,
      newStaff: null,
      shift: data.shift,
    };
    dispatch(submitAttendaceThunk(payload))
      .unwrap()
      .then((attendanceResponse) => {
        const message = attendanceResponse?.message ?? attendanceResponse;
        const attendanceId = message?.attendance_id;

        if (!attendanceId) return null;

        // Upload photos for CURRENT (Present) and RELIEVER (when any photos exist)
        if (data.staffType === 'CURRENT' || data.staffType === 'RELIEVER') {
          return uploadAttendancePhotos(attendanceId);
        }

        return null;
      })
      .then(() => {
        showSuccessToast(t('attendanceSubmitted'));
        resetForm();
      })
      .catch((error) => {
        showErrorToast(new Error(t(error)), { defaultMessage: t('Attendance submit failed.') });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const onInvalid = () => {
    showErrorToast(new Error(t('Please fill required fields.')));
  };

  return (
    <>
      {isSubmitting && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg'>
            <div className='w-8 h-8 border-4 border-primary-base border-t-transparent rounded-full animate-spin' />
            <span className='text-paragraph-sm text-text-main-900'>{t('Submitting...')}</span>
          </div>
        </div>
      )}

      <div className='w-full h-auto  flex items-center justify-center'>
        <div className='w-[400px] h-auto border-1 border-stroke-soft-200 rounded-lg  flex-col flex p-4  gap-4'>
          <div className='w-full py-3 flex items-center justify-between'>
            <img src={logo} alt='logo' />

            <ButtonGroup.Root>
              <ButtonGroup.Item
                data-state={language === 'hi' ? 'on' : 'off'}
                onClick={() => setValue('language', 'hi')}
                className=' data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
              >
                {t('hindi')}
              </ButtonGroup.Item>
              <ButtonGroup.Item
                data-state={language === 'en' ? 'on' : 'off'}
                onClick={() => setValue('language', 'en')}
                className=' data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
              >
                {t('english')}
              </ButtonGroup.Item>
            </ButtonGroup.Root>
          </div>

          <form
            className='w-full flex flex-col gap-4'
            onSubmit={handleFormSubmit(onSubmit, onInvalid)}
          >
            {/* Date */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                {t('date')}
                <Label.Asterisk />
              </Label.Root>
              <AttendanceDateTimePicker
                value={dateTime}
                onChange={(value) => setValue('dateTime', value)}
                placeholder={t('Select date')}
                mode='date_time'
              />
            </div>

            {/* Support Staff type */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                {t('supportStaff')}
                <Label.Asterisk />
              </Label.Root>
              <Select.Root size='small' value={staffType} onValueChange={handleStaffTypeChange}>
                <Select.Trigger className='w-full'>
                  <Select.Value placeholder={t('Select type')} />
                </Select.Trigger>
                <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                  {STAFF_TYPE_OPTIONS.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {t(opt.label)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            {/* Center */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                {t('center')}
                <Label.Asterisk />
              </Label.Root>
              <Select.Root
                size='small'
                value={selectedCenter}
                onValueChange={(value) => setValue('selectedCenter', value)}
                disabled={publicCenterListLoading}
              >
                <Select.Trigger className='w-full'>
                  <Select.Value
                    placeholder={
                      publicCenterListLoading ? t('Loading centers...') : t('Select center')
                    }
                  />
                </Select.Trigger>
                <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                  {Array.isArray(publicCenterListData) &&
                    publicCenterListData.map((item, index) => {
                      const value = item?.name;
                      const label = item?.center_name;
                      if (!value) return null;
                      return (
                        <Select.Item key={value || index} value={value}>
                          {label}
                        </Select.Item>
                      );
                    })}
                </Select.Content>
              </Select.Root>
              {errors.selectedCenter && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningLine} />
                  {t(errors.selectedCenter.message)}
                </Hint.Root>
              )}
            </div>

            {/* Role */}
            {staffType !== 'CURRENT' && (
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  {t('role')}
                  <Label.Asterisk />
                </Label.Root>
                {staffType === 'NEW' || staffType === 'NEW_TRAINEE' || staffType === 'RELIEVER' ? (
                  <Select.Root
                    size='small'
                    value={role}
                    onValueChange={(value) => setValue('role', value)}
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value placeholder={t('Select role')} />
                    </Select.Trigger>
                    <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                      {supportRoleOptions.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                    {errors.role && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningLine} />
                        {t(errors.role.message)}
                      </Hint.Root>
                    )}
                  </Select.Root>
                ) : (
                  <Input.Root size='small' className='w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder={t('Enter role')}
                        value={role}
                        onChange={(e) => setValue('role', e.target.value)}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                )}
              </div>
            )}

            {/* Shift */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                {t('selectShift')}
                <Label.Asterisk />
              </Label.Root>

              <Select.Root
                size='small'
                value={shift}
                onValueChange={(value) => setValue('shift', value)}
              >
                <Select.Trigger className='w-full'>
                  <Select.Value placeholder={t('selectShift')} />
                </Select.Trigger>

                <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                  <Select.Item value='Shift 1'>{t('shift1')}</Select.Item>
                  <Select.Item value='Shift 2'>{t('shift2')}</Select.Item>
                </Select.Content>
                {errors.shift && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningLine} />
                    {t(errors.shift.message)}
                  </Hint.Root>
                )}
              </Select.Root>
            </div>

            {/* Current Staff fields */}
            {staffType === 'CURRENT' && (
              <>
                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    {t('selectStaffName')}
                    <Label.Asterisk />
                  </Label.Root>
                  <Select.Root
                    size='small'
                    value={currentStaffId}
                    onValueChange={handleCurrentStaffChange}
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value placeholder={t('Select staff')} />
                    </Select.Trigger>
                    <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                      {employeeList.map((opt) => (
                        <Select.Item key={opt.team_member_id} value={opt.team_member_id}>
                          <span className='paragraph-small text-[var(--color-text-main-900)]'>
                            {opt?.name}{' '}
                            <span className='paragraph-xsmall text-[var(--color-text-soft-400)]'>
                              ({opt?.role})
                            </span>
                          </span>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  {errors.currentStaffId && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningLine} />
                      {t(errors.currentStaffId.message)}
                    </Hint.Root>
                  )}
                </div>

                <>
                  <div className='w-full flex flex-col gap-2'>
                    <Label.Root>
                      {t('Hygiene Photos')}
                      <Label.Asterisk />
                    </Label.Root>
                    <input
                      ref={photoInputRef}
                      type='file'
                      accept='image/*'
                      capture='environment'
                      multiple
                      className='hidden'
                      onChange={handlePhotoChange}
                    />
                    <Button.Root
                      variant='neutral'
                      type='button'
                      mode='stroke'
                      size='xsmall'
                      className='flex gap-2'
                      onClick={handlePhotoUploadClick}
                    >
                      <Button.Icon as={RiUpload2Line} />
                      {t('Upload/ Capture Photos')}
                    </Button.Root>
                    {photos.length > 0 && (
                      <div className='flex  flex-wrap gap-2 mt-1'>
                        {photos.map((p, index) => (
                          <div
                            key={index}
                            className='relative w-16 h-16 rounded-lg overflow-hidden'
                          >
                            <img
                              src={p.url}
                              alt={`Captured ${index + 1}`}
                              className='w-full h-full object-cover'
                            />
                            <button
                              type='button'
                              className='absolute top-0 right-0 bg-white text-black text-[15px] z-10 rounded-full '
                              onClick={() => handleRemovePhoto(index)}
                            >
                              <RiCloseLine />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className='w-full flex flex-col gap-2'>
                    <Label.Root>{t('checklist')}</Label.Root>
                    <div className='flex flex-col gap-2'>
                      {checklist.map((item, index) => (
                        <div key={item.label} className='flex items-center justify-between gap-2'>
                          <div className='flex items-center gap-2 '>
                            {item.status == 'Pass' ? (
                              <RiCheckLine className='text-success-base' />
                            ) : item.status == 'Fail' ? (
                              <RiErrorWarningLine className='text-warning-base' />
                            ) : (
                              <RiCircleLine />
                            )}
                            <span className='text-paragraph-sm text-text-main-900'>
                              {t(item.label)}
                            </span>
                          </div>
                          <div className='flex items-center gap-1'>
                            <Button.Root
                              type='button'
                              size='xsmall'
                              variant={item.status === 'Pass' ? 'primary' : 'neutral'}
                              mode={item.status === 'Pass' ? 'lighter' : 'stroke'}
                              onClick={() => handleChecklistStatus(index, 'Pass')}
                            >
                              {t('Pass')}
                            </Button.Root>
                            <Button.Root
                              type='button'
                              size='xsmall'
                              variant={item.status === 'Fail' ? 'error' : 'neutral'}
                              mode={item.status === 'Fail' ? 'lighter' : 'stroke'}
                              onClick={() => handleChecklistStatus(index, 'Fail')}
                            >
                              {t('Fail')}
                            </Button.Root>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              </>
            )}

            {/* Reliever Staff fields */}
            {staffType === 'RELIEVER' && (
              <>
                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    {t('Enter Aadhar')}
                    <Label.Asterisk />
                  </Label.Root>
                  <Input.Root
                    size='small'
                    className='w-full'
                    hasError={Boolean(errors.relieverAadhar)}
                  >
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder={t('Enter Aadhar')}
                        {...register('relieverAadhar')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.relieverAadhar && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningLine} />
                      {t(errors.relieverAadhar.message)}
                    </Hint.Root>
                  )}
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    {t('Enter Phone No.')}
                    <Label.Asterisk />
                  </Label.Root>
                  <Input.Root
                    size='small'
                    className='w-full'
                    hasError={Boolean(errors.relieverPhone)}
                  >
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder={t('Enter phone number')}
                        {...register('relieverPhone')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.relieverPhone && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningLine} />
                      {t(errors.relieverPhone.message)}
                    </Hint.Root>
                  )}
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    {t('firstName')}
                    <Label.Asterisk />
                  </Label.Root>
                  <Input.Root
                    size='small'
                    className='w-full'
                    hasError={Boolean(errors.relieverFirstName)}
                  >
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder={t('Enter first name')}
                        {...register('relieverFirstName')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.relieverFirstName && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningLine} />
                      {t(errors.relieverFirstName.message)}
                    </Hint.Root>
                  )}
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    {t('lastName')}
                    <Label.Asterisk />
                  </Label.Root>
                  <Input.Root
                    size='small'
                    className='w-full'
                    hasError={Boolean(errors.relieverLastName)}
                  >
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder={t('Enter last name')}
                        {...register('relieverLastName')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.relieverLastName && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningLine} />
                      {t(errors.relieverLastName.message)}
                    </Hint.Root>
                  )}
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>{t('Select staff to relieve')}</Label.Root>
                  <Select.Root
                    size='small'
                    value={relievedStaffId}
                    onValueChange={(value) => setValue('relievedStaffId', value)}
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value placeholder={t('Select staff')} />
                    </Select.Trigger>
                    <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                      {employeeList.map((opt) => (
                        <Select.Item key={opt.team_member_id} value={opt.team_member_id}>
                          <span className='paragraph-small text-[var(--color-text-main-900)]'>
                            {opt?.name}{' '}
                            <span className='paragraph-xsmall text-[var(--color-text-soft-400)]'>
                              ({opt?.role})
                            </span>
                          </span>
                        </Select.Item>
                      ))}
                    </Select.Content>
                    {errors.relievedStaffId && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningLine} />
                        {t(errors.relievedStaffId.message)}
                      </Hint.Root>
                    )}
                  </Select.Root>
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    {t('Hygiene Photos')}
                    <Label.Asterisk />
                  </Label.Root>
                  <input
                    ref={photoInputRef}
                    type='file'
                    accept='image/*'
                    capture='environment'
                    multiple
                    className='hidden'
                    onChange={handlePhotoChange}
                  />
                  <Button.Root
                    variant='neutral'
                    type='button'
                    mode='stroke'
                    size='xsmall'
                    className='flex gap-2'
                    onClick={handlePhotoUploadClick}
                  >
                    <Button.Icon as={RiUpload2Line} />
                    {t('Upload/ Capture Photos')}
                  </Button.Root>
                  {photos.length > 0 && (
                    <div className='flex  flex-wrap gap-2 mt-1'>
                      {photos.map((p, index) => (
                        <div key={index} className='relative w-16 h-16 rounded-lg overflow-hidden'>
                          <img
                            src={p.url}
                            alt={`Captured ${index + 1}`}
                            className='w-full h-full object-cover'
                          />
                          <button
                            type='button'
                            className='absolute top-0 right-0 bg-white text-black text-[15px] z-10 rounded-full '
                            onClick={() => handleRemovePhoto(index)}
                          >
                            <RiCloseLine />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>{t('checklist')}</Label.Root>
                  <div className='flex flex-col gap-2'>
                    {checklist.map((item, index) => (
                      <div key={item.label} className='flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2 '>
                          {item.status == 'Pass' ? (
                            <RiCheckLine className='text-success-base' />
                          ) : item.status == 'Fail' ? (
                            <RiErrorWarningLine className='text-warning-base' />
                          ) : (
                            <RiCircleLine />
                          )}
                          <span className='text-paragraph-sm text-text-main-900'>
                            {t(item.label)}
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <Button.Root
                            type='button'
                            size='xsmall'
                            variant={item.status === 'Pass' ? 'primary' : 'neutral'}
                            mode={item.status === 'Pass' ? 'lighter' : 'stroke'}
                            onClick={() => handleChecklistStatus(index, 'Pass')}
                          >
                            {t('Pass')}
                          </Button.Root>
                          <Button.Root
                            type='button'
                            size='xsmall'
                            variant={item.status === 'Fail' ? 'error' : 'neutral'}
                            mode={item.status === 'Fail' ? 'lighter' : 'stroke'}
                            onClick={() => handleChecklistStatus(index, 'Fail')}
                          >
                            {t('Fail')}
                          </Button.Root>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* New Staff / New Trainee fields */}
            {(staffType === 'NEW' || staffType === 'NEW_TRAINEE') && (
              <>
                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    {t('aadharNumber')}
                    <Label.Asterisk />
                  </Label.Root>
                  <Input.Root size='small' className='w-full' hasError={Boolean(errors.newAadhar)}>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder={t('Enter Aadhar number')}
                        {...register('newAadhar')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.newAadhar && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningLine} />
                      {t(errors.newAadhar.message)}
                    </Hint.Root>
                  )}
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    {t('User Profile Picture')}
                    <Label.Asterisk />
                  </Label.Root>
                  <input
                    ref={profileInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={handleProfileImageChange}
                  />
                  <Button.Root
                    variant='neutral'
                    type='button'
                    mode='stroke'
                    size='xsmall'
                    className='flex gap-2'
                    onClick={handleProfileUploadClick}
                  >
                    <Button.Icon as={RiUpload2Line} />
                    {t('Upload Profile Photo')}
                  </Button.Root>
                  {newProfileImage && (
                    <span className='text-paragraph-xs text-text-sub-600'>
                      {newProfileImage.name}
                    </span>
                  )}
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    {t('firstName')}
                    <Label.Asterisk />
                  </Label.Root>
                  <Input.Root
                    size='small'
                    className='w-full'
                    hasError={Boolean(errors.newFirstName)}
                  >
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder={t('Enter first name')}
                        {...register('newFirstName')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.newFirstName && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningLine} />
                      {t(errors.newFirstName.message)}
                    </Hint.Root>
                  )}
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    {t('lastName')}
                    <Label.Asterisk />
                  </Label.Root>
                  <Input.Root
                    size='small'
                    className='w-full'
                    hasError={Boolean(errors.newLastName)}
                  >
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder={t('Enter last name')}
                        {...register('newLastName')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.newLastName && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningLine} />
                      {t(errors.newLastName.message)}
                    </Hint.Root>
                  )}
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    {t('mobileNumber')}
                    <Label.Asterisk />
                  </Label.Root>
                  <Input.Root size='small' className='w-full' hasError={Boolean(errors.newPhone)}>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        placeholder={t('Enter mobile number')}
                        {...register('newPhone')}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.newPhone && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningLine} />
                      {t(errors.newPhone.message)}
                    </Hint.Root>
                  )}
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    {t('Hygiene Photos')}
                    <Label.Asterisk />
                  </Label.Root>
                  <input
                    ref={photoInputRef}
                    type='file'
                    accept='image/*'
                    capture='environment'
                    multiple
                    className='hidden'
                    onChange={handlePhotoChange}
                  />
                  <Button.Root
                    variant='neutral'
                    type='button'
                    mode='stroke'
                    size='xsmall'
                    className='flex gap-2'
                    onClick={handlePhotoUploadClick}
                  >
                    <Button.Icon as={RiUpload2Line} />
                    {t('Upload/ Capture Photos')}
                  </Button.Root>
                  {photos.length > 0 && (
                    <div className='flex  flex-wrap gap-2 mt-1'>
                      {photos.map((p, index) => (
                        <div key={index} className='relative w-16 h-16 rounded-lg overflow-hidden'>
                          <img
                            src={p.url}
                            alt={`Captured ${index + 1}`}
                            className='w-full h-full object-cover'
                          />
                          <button
                            type='button'
                            className='absolute top-0 right-0 bg-white text-black text-[15px] z-10 rounded-full '
                            onClick={() => handleRemovePhoto(index)}
                          >
                            <RiCloseLine />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>{t('checklist')}</Label.Root>
                  <div className='flex flex-col gap-2'>
                    {checklist.map((item, index) => (
                      <div key={item.label} className='flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2 '>
                          {item.status == 'Pass' ? (
                            <RiCheckLine className='text-success-base' />
                          ) : item.status == 'Fail' ? (
                            <RiErrorWarningLine className='text-warning-base' />
                          ) : (
                            <RiCircleLine />
                          )}
                          <span className='text-paragraph-sm text-text-main-900'>
                            {t(item.label)}
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <Button.Root
                            type='button'
                            size='xsmall'
                            variant={item.status === 'Pass' ? 'primary' : 'neutral'}
                            mode={item.status === 'Pass' ? 'lighter' : 'stroke'}
                            onClick={() => handleChecklistStatus(index, 'Pass')}
                          >
                            {t('Pass')}
                          </Button.Root>
                          <Button.Root
                            type='button'
                            size='xsmall'
                            variant={item.status === 'Fail' ? 'error' : 'neutral'}
                            mode={item.status === 'Fail' ? 'lighter' : 'stroke'}
                            onClick={() => handleChecklistStatus(index, 'Fail')}
                          >
                            {t('Fail')}
                          </Button.Root>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className='w-full flex flex-col gap-2'>
              <Label.Root>{t('comment')}</Label.Root>
              <Input.Root size='small' className='w-full'>
                <Input.Wrapper>
                  <textarea
                    className='w-full resize-none p-1 border-none bg-transparent outline-none text-paragraph-sm text-text-main-900'
                    rows={3}
                    placeholder={t('Enter comment')}
                    {...register('comment')}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            <Button.Root
              className='flex gap-2 items-center justify-center'
              type='submit'
              disabled={isSubmitting}
            >
              <Button.Icon as={RiTelegram2Fill} />
              {isSubmitting ? t('Submitting...') : t('submit')}
            </Button.Root>
          </form>
        </div>
      </div>
    </>
  );
};

export default AttendanceForm;
