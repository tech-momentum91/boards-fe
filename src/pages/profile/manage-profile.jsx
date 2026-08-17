import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiSettings2Line,
  RiArticleLine,
  RiErrorWarningFill,
  RiArrowRightSLine,
  RiLockLine,
  RiEyeLine,
  RiEyeCloseLine,
  RiHeadphoneLine,
  RiCheckboxCircleFill,
  RiPencilLine,
  RiCheckLine,
  RiCloseLine,
} from 'react-icons/ri';
import PageLayout from '@/components/page-layout';
import CardLayout from '@/components/card-layout';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import { toast } from '@/components/ui/toast';
import * as AlertToast from '@/components/ui/toast-alert';
import {
  resetPasswordProfile,
  saveProfile,
  uploadProfileImageUser,
  deleteFileByUrl,
  getProfile,
} from '@/redux/profileSlice';
import { extractErrorMessage } from '@/utils/error-utils';
import BillingCategoriesPage from '@/pages/profile/billing-categories-page';
import ClientEngagement from '@/pages/profile/client-engagement';
import ClientExit from '@/pages/profile/client-exit';
import ClientOnboarding from '@/pages/profile/client-onboarding';
import ClientTaskMaster from '@/pages/profile/client-task-master';
import ClinetOpex from '@/pages/profile/client-opex';
import CompanyProfile from '@/pages/profile/company-profile';
import CpTaskMaster from '@/pages/profile/cp-task-master';
import CrmTaskMaster from '@/pages/profile/crm-task-master';
import CenterMaster from '@/pages/profile/center-master';
import PartnerMaster from '@/pages/profile/partner-master';
import ProjectsMaster from '@/pages/profile/projects-master';
import PrivacySecurityProfile from '@/pages/profile/privacy-security-profile';
import RolesPermissionProfile from '@/pages/profile/roles-permission-profile';
import DynamicStatusMasterPage from '@/pages/profile/dynamic-status-master-page';
import UsersProfile from '@/pages/profile/users-profile';
import CrmSetup from '@/pages/profile/crm-setup';
import VendorOnboarding from '@/pages/profile/vendor-onboarding';
import TrackerCreateTaskPage from '@/pages/tracker/tracker-create-task-page';
import TrackerSettingsPage from '@/pages/tracker/tracker-settings-page';
import SettingsEmergencyContactsPage from '@/pages/profile/settings-emergency-contacts-page';
import FinanceSettings from '@/pages/profile/finance-settings';
import KnowledgeCenterPage from '@/pages/profile/knowledge-center-page';
import CategoriesMasterPage from '@/pages/profile/categories-master-page';
import TaskMaster from '@/pages/profile/task-master';
import CrmMaster from '@/pages/profile/crm-master';
import DashboardsMasterPage from '@/pages/profile/dashboards-master-page';
import DashboardMasterViewPage from '@/pages/dashboard/dashboard-master-view-page';
import { getRole } from '@/utils/user-role-utils';
import { getVisibleSettingsItems } from '@/utils/sidebarPerm';
import { cn } from '@/utils/cn';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { upperFirst, cloneDeep } from 'lodash';

const PASSWORD_CRITERIA = {
  MIN_LENGTH: 8,
  STRONG_LENGTH: 12,
  GOOD_LENGTH: 10,
  WEAK_THRESHOLD: 30,
  FAIR_THRESHOLD: 60,
  CRITERIA_WEIGHT: 20,
  STRONG_BONUS: 20,
  GOOD_BONUS: 10,
  MAX_GOOD_STRENGTH: 65,
};

const profileSchema = z.object({
  fullName: z.string().min(1, 'Full Name is required'),
  emailAddress: z
    .string()
    .min(1, 'Email Address is required')
    .email('Please enter a valid email address'),
  biography: z.string().optional(),
});

// Reserved for future use
// const contactSchema = z.object({
//   emailAddress: z
//     .string()
//     .min(1, 'Email Address is required')
//     .email('Please enter a valid email address'),
//   phoneNumber: z.string().optional(),
//   address: z.string().optional(),
// });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(1, 'New password is required')
      .min(
        PASSWORD_CRITERIA.MIN_LENGTH,
        `Password must be at least ${PASSWORD_CRITERIA.MIN_LENGTH} characters`,
      ),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

const ManageProfile = () => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.profile);
  const fileInputRef = useRef(null);
  const profileData = useSelector((state) => state.profile.profileData);

  const { userSideBarPerm } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch: watchProfile,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profileData?.full_name ?? '',
      emailAddress: profileData?.email ?? '',
      biography: profileData?.biography ?? '',
    },
  });

  const currentRole = getRole(userSideBarPerm);
  const visibleSettingsItems = useMemo(
    () => getVisibleSettingsItems(userSideBarPerm),
    [userSideBarPerm],
  );
  const visibleSettingsValuesSet = useMemo(
    () => new Set(visibleSettingsItems.map((item) => item.value)),
    [visibleSettingsItems],
  );
  const settingsRouteByValue = useMemo(
    () =>
      visibleSettingsItems.reduce((accumulator, item) => {
        accumulator[item.value] = item.route;
        return accumulator;
      }, {}),
    [visibleSettingsItems],
  );
  const settingsValueByRoute = useMemo(
    () =>
      visibleSettingsItems.reduce((accumulator, item) => {
        accumulator[item.route] = item.value;
        return accumulator;
      }, {}),
    [visibleSettingsItems],
  );

  useEffect(() => {
    if (profileData) {
      reset({
        fullName: profileData.full_name,
        emailAddress: profileData.email,
        biography: profileData.bio,
      });
    }
  }, [profileData, reset]);

  useEffect(() => {}, []);

  // Contact form - reserved for future use
  // const {
  //   register: registerContact,
  //   handleSubmit: handleSubmitContact,
  //   formState: { errors: contactErrors },
  //   reset: resetContact,
  // } = useForm({
  //   resolver: zodResolver(contactSchema),
  //   defaultValues: {
  //     emailAddress: '',
  //     phoneNumber: '',
  //     address: '',
  //   },
  // });

  // Password form
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch,
    reset: resetPassword,
    formState: { errors: passwordErrors, isValid: isPasswordFormValid },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');
  const fullNameValue = watchProfile('fullName');

  const passwordValidation = useMemo(() => {
    const passwordValue = newPassword || '';
    return {
      hasUppercase: /[A-Z]/.test(passwordValue),
      hasLowercase: /[a-z]/.test(passwordValue),
      hasNumber: /\d/.test(passwordValue),
      hasSpecialChar: /[!"#$%&()*,.:<>?@^{|}]/.test(passwordValue),
      hasMinLength: passwordValue.length >= PASSWORD_CRITERIA.MIN_LENGTH,
    };
  }, [newPassword]);

  // Password strength calculation - reserved for future use
  // const passwordStrength = useMemo(() => {
  //   if (!newPassword || newPassword.length === 0) {
  //     return { strength: 0, label: '', color: '' };
  //   }
  //
  //   const criteria = [
  //     passwordValidation.hasUppercase,
  //     passwordValidation.hasLowercase,
  //     passwordValidation.hasNumber,
  //     passwordValidation.hasSpecialChar,
  //     passwordValidation.hasMinLength,
  //   ];
  //   const metCriteria = criteria.filter(Boolean).length;
  //   const allCriteriaMet = metCriteria === 5;
  //
  //   let strength = metCriteria * PASSWORD_CRITERIA.CRITERIA_WEIGHT;
  //
  //   if (newPassword.length >= PASSWORD_CRITERIA.STRONG_LENGTH) {
  //     strength += PASSWORD_CRITERIA.STRONG_BONUS;
  //   } else if (newPassword.length >= PASSWORD_CRITERIA.GOOD_LENGTH) {
  //     strength += PASSWORD_CRITERIA.GOOD_BONUS;
  //   }
  //
  //   if (allCriteriaMet) {
  //     return {
  //       strength: 100,
  //       label: 'Strong',
  //       color: 'var(--color-success-base)',
  //     };
  //   }
  //
  //   if (strength < PASSWORD_CRITERIA.WEAK_THRESHOLD) {
  //     return {
  //       strength,
  //       label: 'Weak',
  //       color: 'var(--color-error-base)',
  //     };
  //   }
  //
  //   if (strength < PASSWORD_CRITERIA.FAIR_THRESHOLD) {
  //     return {
  //       strength,
  //       label: 'Fair',
  //       color: 'var(--color-warning-base)',
  //     };
  //   }
  //
  //   return {
  //     strength: Math.min(strength, PASSWORD_CRITERIA.MAX_GOOD_STRENGTH),
  //     label: 'Good',
  //     color: 'var(--color-warning-base)',
  //   };
  // }, [newPassword, passwordValidation]);

  const isFormValid =
    isPasswordFormValid &&
    passwordValidation.hasLowercase &&
    passwordValidation.hasUppercase &&
    passwordValidation.hasNumber &&
    passwordValidation.hasSpecialChar &&
    passwordValidation.hasMinLength;

  const onSubmitPassword = useCallback(
    (data) => {
      dispatch(resetPasswordProfile(data))
        .then((response) => {
          if (response.error) {
            toast.custom(
              (t) => (
                <AlertToast.Root
                  t={t}
                  status='error'
                  variant='lighter'
                  message={extractErrorMessage(response, 'Failed to update password.')}
                />
              ),
              {
                position: 'top-right',
              },
            );
          } else {
            toast.custom((t) => (
              <AlertToast.Root
                t={t}
                status='success'
                variant='lighter'
                message='Password updated successfully.'
              />
            ));
          }
        })
        .catch(() => {
          // Error handled by Redux
        });

      resetPassword();
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    },
    [dispatch, resetPassword],
  );

  const handleDiscardPassword = () => {
    resetPassword({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const onSubmit = (data) => {
    const nameParts = data.fullName.trim().split(' ').filter(Boolean);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ');

    const formData = {
      first_name: firstName,
      last_name: lastName,
      email: data.emailAddress,
      bio: data.biography,
    };

    dispatch(saveProfile(formData)).catch(() => {
      // Error handled by Redux
    });
  };

  const handleUploadProfileImage = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doctype', 'User');
    formData.append('doc_name', profileData.email);

    dispatch(uploadProfileImageUser(formData))
      .then(() => {
        // Profile image uploaded successfully
      })
      .catch(() => {
        // Error handled by Redux
      });
  };

  // Check if user has uploaded a custom image (not the default logo)
  // profile_image will be a URL string from the API if an image exists
  const hasCustomImage = Boolean(
    profileData?.profile_image && profileData.profile_image.trim() !== '',
  );

  // Get initials: first letter of first name + last letter of last name
  const getProfileInitials = () => {
    const fullName = profileData?.full_name || '';
    if (!fullName) return '';

    const nameParts = fullName.trim().split(' ').filter(Boolean);
    if (nameParts.length === 0) return '';
    const firstName = nameParts[0];
    const lastName = nameParts.length == 1 ? '' : nameParts.at(-1);

    // Use lodash upperFirst to capitalize first letter, then get the first character
    const firstLetter = upperFirst(firstName)[0] || '';
    const lastLetter = lastName ? upperFirst(lastName)[0] || '' : '';

    return firstLetter + lastLetter;
  };

  const handleRemoveProfileImage = () => {
    if (!profileData?.profile_image) {
      return;
    }

    dispatch(deleteFileByUrl(profileData.profile_image))
      .then(() => {
        // File deleted successfully, refresh profile data
        if (profileData.email) {
          dispatch(getProfile(profileData.email));
        }
      })
      .catch(() => {
        // Error handled by Redux
      });
  };

  const handleDiscard = () => {
    reset();
  };

  const navigate = useNavigate();
  const location = useLocation();
  const { dashboardId } = useParams();

  const activeTab = useMemo(() => {
    const startingPathName =
      cloneDeep(location.pathname)?.split('/')?.splice(0, 3)?.join('/') || '';
    return (
      settingsValueByRoute[location.pathname] || settingsValueByRoute[startingPathName] || 'profile'
    );
  }, [location.pathname, settingsValueByRoute]);

  const isPoScopeTermsRoute = location.pathname.startsWith(
    '/settings/projects-master/po-scope-terms',
  );

  // Handle tab change
  const handleTabChange = (value) => {
    const route = settingsRouteByValue[value] || '/settings';
    navigate(route);
  };

  const visibleSettingsTabs = visibleSettingsItems;

  const renderTabContent = (value) => {
    switch (value) {
      case 'profile':
        return (
          <div className='w-full flex flex-col gap-6'>
            <div className='w-full flex flex-col '>
              <CardLayout cardTitle='Profile' cardDescription='Your personal information'>
                {/*logo */}
                <div className='w-full flex items-center justify-between '>
                  <div className='w-full flex items-center gap-3'>
                    <div className='relative w-[80px] h-[80px]'>
                      <span className='w-full h-full rounded-full flex items-center justify-center overflow-hidden bg-[var(--color-bg-weak-50)]'>
                        {hasCustomImage ? (
                          <img
                            src={profileData.profile_image}
                            alt='profile'
                            className='w-full object-cover h-full rounded-full'
                          />
                        ) : (
                          <span className='text-[var(--color-text-main-900)] label-large font-medium'>
                            {getProfileInitials()}
                          </span>
                        )}
                      </span>
                      <button
                        type='button'
                        aria-label='Edit profile image'
                        className='absolute bottom-0 bg-white right-0 w-7 h-7 rounded-full bg-[var(--color-bg-main-0)] shadow-sm border border-[var(--color-stroke-soft-200)] flex items-center justify-center'
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <RiPencilLine className='text-green-500' />
                      </button>
                    </div>

                    <div className='flex gap-[8px] flex-col items-start justify-start'>
                      <span className='text-[var(--color-text-main-900)] label-medium'>
                        Upload Image
                      </span>
                      <span className='text-[var(--color-text-sub-500)] paragraph-small'>
                        Min 400x400px, PNG or JPEG
                      </span>
                    </div>
                  </div>

                  <div className='flex gap-2'>
                    {hasCustomImage && (
                      <Button.Root
                        variant='error'
                        mode='stroke'
                        size='small'
                        type='button'
                        onClick={handleRemoveProfileImage}
                      >
                        Remove
                      </Button.Root>
                    )}
                  </div>

                  <input
                    type='file'
                    ref={fileInputRef}
                    accept='image/png,image/jpeg'
                    className='hidden'
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadProfileImage(file);
                      }
                    }}
                  />
                </div>
              </CardLayout>

              <div className='w-full flex gap-[20px] flex-col items-start justify-start'>
                <form id='profile-form' onSubmit={handleSubmit(onSubmit)} className=' w-full pt-5'>
                  <div className='items-start justify-start flex  gap-6'>
                    {/* Full Name */}
                    <div className='w-1/2 flex flex-col gap-2'>
                      <Label.Root>
                        Full Name
                        <Label.Asterisk />
                      </Label.Root>
                      <div className='flex items-stretch gap-1'>
                        <Input.Root
                          size='medium'
                          className='w-full'
                          hasError={Boolean(errors.fullName)}
                        >
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              placeholder='Enter your full name'
                              {...register('fullName')}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                        {fullNameValue === profileData?.full_name ? (
                          ''
                        ) : (
                          <div className='flex items-stretch gap-2'>
                            <Button.Root
                              type='button'
                              variant='neutral'
                              mode='ghost'
                              size='medium'
                              onClick={handleSubmit(onSubmit)}
                              disabled={
                                isLoading ||
                                !fullNameValue?.trim() ||
                                fullNameValue === profileData?.full_name
                              }
                              className={`h-10 w-10 ${
                                fullNameValue === profileData?.full_name
                                  ? 'bg-[var(--color-success-base)]'
                                  : 'bg-[var(--color-success-lighter)]'
                              }`}
                            >
                              <Button.Icon as={RiCheckLine} className='text-green-500' />
                            </Button.Root>

                            <Button.Root
                              type='button'
                              variant='neutral'
                              mode='ghost'
                              size='medium'
                              onClick={handleDiscard}
                              disabled={fullNameValue === profileData?.full_name}
                              className={`h-10 w-10 ${
                                fullNameValue === profileData?.full_name
                                  ? 'bg-[var(--color-error-base)]'
                                  : 'bg-[var(--color-error-lighter)]'
                              }`}
                            >
                              <Button.Icon as={RiCloseLine} className='text-red-500' />
                            </Button.Root>
                          </div>
                        )}
                      </div>
                      {errors.fullName && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiErrorWarningFill} />
                          {errors.fullName.message}
                        </Hint.Root>
                      )}
                    </div>

                    {/* Designation */}
                    <div className='w-1/2 flex flex-col gap-2'>
                      <Label.Root>
                        Email Address
                        <Label.Asterisk />
                      </Label.Root>

                      <Input.Root
                        size='medium'
                        className='w-full'
                        hasError={Boolean(errors.emailAddress)}
                      >
                        <Input.Wrapper>
                          <Input.Input
                            type='text'
                            disabled={true}
                            placeholder='Enter your email address'
                            {...register('emailAddress')}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                      {errors.emailAddress && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiErrorWarningFill} />
                          {errors.emailAddress.message}
                        </Hint.Root>
                      )}
                    </div>

                    {/* Error message from API */}
                    {error && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {error}
                      </Hint.Root>
                    )}
                  </div>
                </form>
              </div>
            </div>

            <div className='h-[1px] w-full bg-[var(--color-stroke-soft-200)]' />

            {/*Change Password */}
            <div className='w-full flex items-start justify-start'>
              <CardLayout
                cardTitle='Change Password'
                cardDescription='Update password for enhanced account security.'
              >
                <div className='w-full flex items-start justify-end -mt-14'>
                  {!isChangePasswordOpen && (
                    <Button.Root
                      size='medium'
                      type='button'
                      className='px-[10px] py-[10px]'
                      onClick={() => setIsChangePasswordOpen(true)}
                    >
                      Change Password
                    </Button.Root>
                  )}
                </div>

                {isChangePasswordOpen && (
                  <>
                    {/* form */}
                    <div className='w-full flex flex-col gap-8 mt-8'>
                      <form
                        onSubmit={handleSubmitPassword(onSubmitPassword)}
                        className='w-full flex  gap-4'
                      >
                        <div className='w-full  flex flex-col gap-1'>
                          <Label.Root>
                            Current Password
                            <Label.Asterisk />
                          </Label.Root>
                          <Input.Root
                            size='medium'
                            className='w-full'
                            hasError={Boolean(passwordErrors.currentPassword)}
                          >
                            <Input.Wrapper>
                              <Input.Icon as={RiLockLine} />
                              <Input.Input
                                type={showCurrentPassword ? 'text' : 'password'}
                                placeholder='Enter current password'
                                {...registerPassword('currentPassword')}
                              />
                              <Input.Icon
                                as={showCurrentPassword ? RiEyeLine : RiEyeCloseLine}
                                className='cursor-pointer'
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                          {passwordErrors.currentPassword && (
                            <Hint.Root hasError>
                              <Hint.Icon as={RiErrorWarningFill} />
                              {passwordErrors.currentPassword.message}
                            </Hint.Root>
                          )}
                        </div>

                        <div className='w-full flex flex-col gap-1'>
                          <Label.Root>
                            New Password
                            <Label.Asterisk />
                          </Label.Root>
                          <Input.Root
                            size='medium'
                            className='w-full'
                            hasError={Boolean(passwordErrors.newPassword)}
                          >
                            <Input.Wrapper>
                              <Input.Icon as={RiLockLine} />
                              <Input.Input
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder='Enter new password'
                                {...registerPassword('newPassword')}
                              />
                              <Input.Icon
                                as={showNewPassword ? RiEyeLine : RiEyeCloseLine}
                                className='cursor-pointer'
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                          {passwordErrors.newPassword && (
                            <Hint.Root hasError>
                              <Hint.Icon as={RiErrorWarningFill} />
                              {passwordErrors.newPassword.message}
                            </Hint.Root>
                          )}
                        </div>

                        {/* Password criteria checklist */}

                        <div className='w-full flex flex-col gap-1'>
                          <Label.Root>
                            Confirm New Password
                            <Label.Asterisk />
                          </Label.Root>
                          <Input.Root
                            size='medium'
                            className='w-full'
                            hasError={Boolean(passwordErrors.confirmPassword)}
                          >
                            <Input.Wrapper>
                              <Input.Icon as={RiLockLine} />
                              <Input.Input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder='Enter confirm new password'
                                {...registerPassword('confirmPassword')}
                              />
                              <Input.Icon
                                as={showConfirmPassword ? RiEyeLine : RiEyeCloseLine}
                                className='cursor-pointer'
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                          {passwordErrors.confirmPassword && (
                            <Hint.Root hasError>
                              <Hint.Icon as={RiErrorWarningFill} />
                              {passwordErrors.confirmPassword.message}
                            </Hint.Root>
                          )}
                        </div>
                      </form>

                      {newPassword.length > 0 && (
                        <div className='w-full paragraph-small flex flex-col gap-2 items-start justify-start'>
                          <span className='w-full text-[var(--color-text-sub-500)]'>
                            Must contain at least:
                          </span>
                          {[
                            { key: 'hasUppercase', label: 'At least 1 uppercase' },
                            { key: 'hasLowercase', label: 'At least 1 lowercase' },
                            { key: 'hasNumber', label: 'At least 1 number' },
                            {
                              key: 'hasSpecialChar',
                              label: 'At least 1 special character',
                            },
                            {
                              key: 'hasMinLength',
                              label: `At least ${PASSWORD_CRITERIA.MIN_LENGTH} characters`,
                            },
                          ].map(({ key, label }) => (
                            <p
                              key={key}
                              className='w-full flex items-center gap-1 justify-start text-[var(--color-text-soft-400)]'
                            >
                              <RiCheckboxCircleFill
                                className={
                                  passwordValidation[key]
                                    ? 'text-[var(--color-success-base)]'
                                    : 'text-[var(--color-text-soft-400)]'
                                }
                              />
                              {label}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/*buttons */}
                    <div className='flex gap-4'>
                      <Button.Root
                        size='medium'
                        className='w-full'
                        type='button'
                        onClick={handleSubmitPassword(onSubmitPassword)}
                        disabled={!isFormValid}
                      >
                        Change Password
                      </Button.Root>
                      <Button.Root
                        size='medium'
                        variant='neutral'
                        mode='stroke'
                        className='w-full'
                        type='button'
                        onClick={handleDiscardPassword}
                      >
                        Discard
                      </Button.Root>
                    </div>
                  </>
                )}
              </CardLayout>
            </div>

            {/* <div className='h-[1px] w-full bg-[var(--color-stroke-soft-200)]' /> */}

            {currentRole !== 'Super Admin' && (
              <CardLayout
                cardTitle='Delete Account'
                cardDescription='Manage the process of deleting account'
              >
                <div className='w-full items-center rounded-[8px] p-2 flex gap-1 bg-[var(--color-error-lighter)]'>
                  <span className='text-[var(--color-error-base)]'>
                    <RiErrorWarningFill className='size-5' />
                  </span>
                  <span className=' paragraph-xsmall text-[var(--color-text-main-900)]'>
                    This action cannot be undone.
                  </span>
                </div>

                <span className='paragraph-small text-[var(--color-text-sub-500)]'>
                  To delete your account, please contact our support team. Deleting your account
                  will permanently remove all associated data.
                </span>

                <Button.Root
                  size='medium'
                  variant='neutral'
                  mode='stroke'
                  className='gap-2'
                  type='button'
                >
                  <Button.Icon as={RiHeadphoneLine} />
                  Contact Support
                </Button.Root>
              </CardLayout>
            )}
          </div>
        );
      case 'company-profile':
        return (
          <div className='w-full flex flex-col gap-6'>
            <CompanyProfile />
          </div>
        );
      case 'users':
        return (
          <div className='w-full flex flex-col gap-6'>
            <UsersProfile />
          </div>
        );
      case 'categories-master':
        return (
          <div className='w-full h-full flex flex-col gap-6'>
            <CategoriesMasterPage />
          </div>
        );
      case 'task-master':
        return visibleSettingsValuesSet.has('task-master') ? (
          <div className='flex w-full flex-col items-center gap-6'>
            <TaskMaster />
          </div>
        ) : null;
      case 'crm':
        return visibleSettingsValuesSet.has('crm') ? (
          <div className='flex w-full flex-col items-center gap-6'>
            <CrmMaster />
          </div>
        ) : null;
      case 'dashboards':
        return visibleSettingsValuesSet.has('dashboards') ? (
          dashboardId ? (
            <div className='flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden'>
              <DashboardMasterViewPage mode='setup' embedded />
            </div>
          ) : (
            <div className='flex h-full min-h-0 w-full min-w-0 flex-col gap-6 overflow-x-hidden'>
              <DashboardsMasterPage />
            </div>
          )
        ) : null;
      case 'roles-permissions':
        return (
          <div className='w-full flex flex-col gap-6 items-center'>
            <RolesPermissionProfile currentRole={currentRole} />
          </div>
        );
      case 'privacy-security':
        return (
          <div className='w-full flex gap-[6px] items-center'>
            <PrivacySecurityProfile />
          </div>
        );
      case 'opex-categories':
        return (
          <div className='flex h-full min-h-0 w-full flex-col items-center'>
            <ClinetOpex />
          </div>
        );
      case 'billing-categories':
        return (
          <div className='flex h-full min-h-0 w-full flex-col items-center'>
            <BillingCategoriesPage />
          </div>
        );
      case 'crm-task-master':
        return visibleSettingsValuesSet.has('crm-task-master') ? (
          <div className='w-full flex flex-col gap-6 items-center'>
            <CrmTaskMaster />
          </div>
        ) : null;
      case 'client-onboarding':
        return (
          <div className='w-full flex flex-col gap-6 items-center'>
            <ClientOnboarding />
          </div>
        );
      case 'client-engagement':
        return (
          <div className='w-full flex flex-col gap-6 items-center'>
            <ClientEngagement />
          </div>
        );
      case 'client-exit':
        return (
          <div className='w-full flex flex-col gap-6 items-center'>
            <ClientExit />
          </div>
        );
      case 'client-task-master':
        return (
          <div className='w-full flex flex-col gap-6 items-center'>
            <ClientTaskMaster />
          </div>
        );
      case 'status-master':
        return visibleSettingsValuesSet.has('status-master') ? (
          <div className='w-full flex flex-col gap-6 items-center'>
            <DynamicStatusMasterPage />
          </div>
        ) : null;
      case 'crm-setup':
        return visibleSettingsValuesSet.has('crm-setup') ? (
          <div className='w-full flex flex-col gap-6 items-center'>
            <CrmSetup />
          </div>
        ) : null;
      case 'cp-task-master':
        return visibleSettingsValuesSet.has('cp-task-master') ? (
          <div className='w-full flex flex-col gap-6 items-center'>
            <CpTaskMaster />
          </div>
        ) : null;
      case 'projects-master':
        return visibleSettingsValuesSet.has('projects-master') ? (
          <div
            className={cn(
              'flex w-full flex-col',
              isPoScopeTermsRoute ? 'h-full min-h-0' : 'items-center gap-6',
            )}
          >
            <ProjectsMaster />
          </div>
        ) : null;
      case 'vendor-onboarding':
        return (
          <div className='w-full flex flex-col gap-6 items-center'>
            <VendorOnboarding />
          </div>
        );
      case 'partner-master':
        return visibleSettingsValuesSet.has('partner-master') ? (
          <div className='w-full flex flex-col gap-6 items-center'>
            <PartnerMaster />
          </div>
        ) : null;
      case 'emergency-contacts':
        return visibleSettingsValuesSet.has('emergency-contacts') ? (
          <div className='w-full flex flex-col gap-6'>
            <SettingsEmergencyContactsPage />
          </div>
        ) : null;
      case 'finance-settings':
        return visibleSettingsValuesSet.has('finance-settings') ? (
          <div className='w-full flex flex-col gap-6'>
            <FinanceSettings />
          </div>
        ) : null;
      case 'center-master':
        return visibleSettingsValuesSet.has('center-master') ? (
          <div className='w-full flex flex-col gap-6 items-center'>
            <CenterMaster />
          </div>
        ) : null;
      case 'tracker-settings':
        return visibleSettingsValuesSet.has('tracker-settings') ? (
          <div className='w-full flex flex-col gap-6 items-center'>
            {location.pathname.startsWith('/settings/tracker-settings/create-task/') ? (
              <TrackerCreateTaskPage />
            ) : (
              <TrackerSettingsPage />
            )}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  // const handleDiscardContact = () => {
  //   resetContact();
  // };
  if (location.pathname.startsWith('/settings/knowledge-center')) {
    return (
      <PageLayout
        pageTitle='Knowledge Center'
        pageIcon={<RiArticleLine size={24} />}
        pageDescription='Access help articles, guides, Q&A, media, case studies, and call recordings.'
        contentAreaClassName='overflow-hidden p-6'
      >
        <KnowledgeCenterPage />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      pageTitle='Settings Page'
      pageIcon={<RiSettings2Line width={24} height={24} />}
      pageDescription='Manage your preferences and configure various options.'
      contentAreaClassName='overflow-hidden'
    >
      {profileData?.isLoading ? (
        <div className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden'>
          <TabMenuVertical.Root
            value={activeTab}
            onValueChange={handleTabChange}
            className='flex min-h-0 w-full flex-1 gap-6'
          >
            <div className='flex h-full min-h-0 w-[240px] shrink-0 flex-col overflow-y-auto border-r border-stroke-soft-200 bg-bg-white-0 p-2 pl-7'>
              <TabMenuVertical.List className='w-full space-y-2 border-0 p-0'>
                {visibleSettingsTabs.map((tab) => (
                  <TabMenuVertical.Trigger
                    key={tab.value}
                    value={tab.value}
                    className='flex items-center justify-between w-full'
                    disabled={tab.disabledWhileLoading}
                  >
                    <div className='flex items-center gap-1.5'>
                      <TabMenuVertical.Icon as={tab.icon} width={24} height={24} />
                      {tab.title}
                    </div>
                    <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} width={24} height={24} />
                  </TabMenuVertical.Trigger>
                ))}
              </TabMenuVertical.List>
            </div>

            <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pb-7 pr-7'>
              <div className='w-full'>
                <div className='mt-6'>
                  <div className='w-full flex flex-col gap-6'>
                    {/* Profile Card Skeleton */}
                    <div className='w-full flex flex-col'>
                      <CardLayout cardTitle='Profile' cardDescription='Your personal information'>
                        <div className='w-full flex items-center justify-between'>
                          <div className='w-full flex items-center gap-3'>
                            {/* Avatar Skeleton */}
                            <div className='w-[80px] h-[80px] rounded-full bg-[var(--color-bg-weak-50)] animate-pulse' />
                            <div className='flex gap-[8px] flex-col items-start justify-start'>
                              <div className='h-5 w-24 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                              <div className='h-4 w-40 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                            </div>
                          </div>
                          {/* Button Skeleton */}
                          <div className='h-9 w-20 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                        </div>
                      </CardLayout>

                      {/* Form Fields Skeleton */}
                      <div className='w-full flex gap-[20px] flex-col items-start justify-start pt-5'>
                        <div className='items-start justify-start flex gap-6 w-full'>
                          {/* Full Name Field Skeleton */}
                          <div className='w-1/2 flex flex-col gap-2'>
                            <div className='h-4 w-20 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                            <div className='h-10 w-full bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                          </div>
                          {/* Email Field Skeleton */}
                          <div className='w-1/2 flex flex-col gap-2'>
                            <div className='h-4 w-24 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                            <div className='h-10 w-full bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                          </div>
                        </div>

                        {/* Buttons Skeleton */}
                        <div className='flex gap-[16px]'>
                          <div className='h-10 w-32 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                          <div className='h-10 w-24 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className='h-[1px] w-full bg-[var(--color-stroke-soft-200)]' />

                    {/* Change Password Card Skeleton */}
                    <div className='w-full flex items-start justify-start'>
                      <CardLayout
                        cardTitle='Change Password'
                        cardDescription='Update password for enhanced account security.'
                      >
                        <div className='w-full flex gap-5 items-center justify-center flex-col'>
                          <div className='w-full flex gap-4'>
                            {/* Password Fields Skeleton */}
                            {[1, 2, 3].map((i) => (
                              <div key={i} className='w-full flex flex-col gap-1'>
                                <div className='h-4 w-32 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                                <div className='h-10 w-full bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                              </div>
                            ))}
                          </div>

                          {/* Password Criteria Skeleton */}
                          <div className='w-full flex flex-col gap-2 items-start justify-start mt-4'>
                            <div className='h-4 w-40 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className='h-4 w-48 bg-[var(--color-bg-weak-50)] rounded animate-pulse'
                              />
                            ))}
                          </div>
                        </div>

                        {/* Buttons Skeleton */}
                        <div className='flex gap-4 mt-6'>
                          <div className='h-10 w-full bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                          <div className='h-10 w-full bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                        </div>
                      </CardLayout>
                    </div>

                    {/* Divider */}
                    <div className='h-[1px] w-full bg-[var(--color-stroke-soft-200)]' />

                    {/* Delete Account Card Skeleton */}
                    <CardLayout
                      cardTitle='Delete Account'
                      cardDescription='Manage the process of deleting account'
                    >
                      <div className='w-full items-center rounded-[8px] p-2 flex gap-1 bg-[var(--color-error-lighter)]'>
                        <div className='w-5 h-5 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                        <div className='h-4 w-48 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                      </div>
                      <div className='h-4 w-full bg-[var(--color-bg-weak-50)] rounded animate-pulse mt-4' />
                      <div className='h-10 w-40 bg-[var(--color-bg-weak-50)] rounded animate-pulse mt-4' />
                    </CardLayout>
                  </div>
                </div>
              </div>
            </div>
          </TabMenuVertical.Root>
        </div>
      ) : (
        <div className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden'>
          <TabMenuVertical.Root
            value={activeTab}
            onValueChange={handleTabChange}
            className='flex min-h-0 w-full flex-1 gap-6'
          >
            <div className='flex h-full min-h-0 w-[240px] shrink-0 flex-col overflow-y-auto border-r border-stroke-soft-200 bg-bg-white-0 p-2 pl-7'>
              <TabMenuVertical.List className='w-full space-y-2 border-0 p-0'>
                {/* <h4 className='text-subheading-xs text-text-soft-400 mb-2 px-2 py-1 uppercase'>
                SELECT MENU
              </h4> */}
                {visibleSettingsTabs.map((tab) => (
                  <TabMenuVertical.Trigger
                    key={tab.value}
                    value={tab.value}
                    className='flex items-center justify-between w-full'
                  >
                    <div className='flex items-center gap-1.5'>
                      <TabMenuVertical.Icon as={tab.icon} width={24} height={24} />
                      {tab.title}
                    </div>
                    <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} width={24} height={24} />
                  </TabMenuVertical.Trigger>
                ))}
              </TabMenuVertical.List>
            </div>

            <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pb-7 pr-7'>
              {visibleSettingsTabs.map((tab) => {
                const content = renderTabContent(tab.value);
                if (!content) {
                  return null;
                }
                const skipContentTopMargin =
                  tab.value === 'categories-master' ||
                  tab.value === 'task-master' ||
                  tab.value === 'crm' ||
                  (tab.value === 'projects-master' && isPoScopeTermsRoute);
                return (
                  <TabMenuVertical.Content key={tab.value} value={tab.value} className='h-full'>
                    <div
                      className={cn(
                        'min-h-0 h-full',
                        skipContentTopMargin || (tab.value === 'dashboards' && dashboardId)
                          ? ''
                          : 'mt-6',
                      )}
                    >
                      {content}
                    </div>
                  </TabMenuVertical.Content>
                );
              })}
            </div>
          </TabMenuVertical.Root>
        </div>
      )}
    </PageLayout>
  );
};

export default ManageProfile;
