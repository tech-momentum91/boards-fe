import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiEyeCloseLine,
  RiEyeLine,
  RiLockLine,
  RiMenuUnfoldLine,
  RiPencilLine,
} from 'react-icons/ri';
import upperFirst from 'lodash/upperFirst';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import * as Textarea from '@/components/ui/textarea';
import * as CompactButton from '@/components/ui/compact-button';
import { toast } from '@/components/ui/toast';
import * as AlertToast from '@/components/ui/toast-alert';
import Sidebar from '@/pages/boards/sidebar/Sidebar';
import { useAuth } from '@/contexts/auth-context';
import {
  deleteFileByUrl,
  getProfile,
  resetPasswordProfile,
  saveProfile,
  uploadProfileImageUser,
} from '@/redux/profileSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { toAbsoluteAttachmentUrl } from '@/lib/utils';
import { buildBoardsNavigationPath } from '@/pages/boards/utils/boards-navigation';
import useBoardsSidebarCollapsed from '@/pages/boards/hooks/useBoardsSidebarCollapsed';
import BoardsSidebarShell from '@/pages/boards/layout/BoardsSidebarShell';

const PASSWORD_CRITERIA = {
  MIN_LENGTH: 8,
};

const profileSchema = z.object({
  fullName: z.string().min(1, 'Full Name is required'),
  emailAddress: z
    .string()
    .min(1, 'Email Address is required')
    .email('Please enter a valid email address'),
  biography: z.string().optional(),
});

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

type ProfileFormValues = z.infer<typeof profileSchema>;
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function BoardsProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user: authUser, login: authLogin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isLoading, error } = useSelector(
    (state: {
      profile: {
        profileData: { isLoading?: boolean; error?: unknown };
      };
    }) => ({
      isLoading: state.profile.profileData.isLoading ?? false,
      error: state.profile.profileData.error,
    }),
  );
  const profileData = useSelector(
    (state: {
      profile: {
        profileData: {
          full_name?: string;
          email?: string;
          bio?: string;
          profile_image?: string;
        };
      };
    }) => state.profile.profileData,
  );

  const [, setSidebarTree] = useState([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const { isSidebarCollapsed, toggleSidebar } = useBoardsSidebarCollapsed();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profileData?.full_name ?? '',
      emailAddress: profileData?.email ?? '',
      biography: profileData?.bio ?? '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch,
    reset: resetPassword,
    formState: { errors: passwordErrors, isValid: isPasswordFormValid },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');

  const syncAuthProfile = useCallback(
    (updates: { full_name?: string; email?: string; user_image?: string }) => {
      if (!authUser) {
        return;
      }

      const email = updates.email ?? authUser.email;
      authLogin(
        {
          ...authUser,
          full_name: updates.full_name ?? authUser.full_name,
          email,
          user_image: updates.user_image ?? authUser.user_image,
        },
        email,
      );
    },
    [authLogin, authUser],
  );

  const passwordValidation = useMemo(() => {
    const passwordValue = newPassword ?? '';
    return {
      hasUppercase: /[A-Z]/.test(passwordValue),
      hasLowercase: /[a-z]/.test(passwordValue),
      hasNumber: /\d/.test(passwordValue),
      hasSpecialChar: /[!"#$%&()*,.:<>?@^{|}]/.test(passwordValue),
      hasMinLength: passwordValue.length >= PASSWORD_CRITERIA.MIN_LENGTH,
    };
  }, [newPassword]);

  const isFormValid =
    isPasswordFormValid &&
    passwordValidation.hasLowercase &&
    passwordValidation.hasUppercase &&
    passwordValidation.hasNumber &&
    passwordValidation.hasSpecialChar &&
    passwordValidation.hasMinLength;

  useEffect(() => {
    const email = profileData?.email || authUser?.email;
    if (!email) {
      return;
    }

    void dispatch(getProfile(email) as never);
  }, [authUser?.email, dispatch, profileData?.email]);

  useEffect(() => {
    if (profileData) {
      reset({
        fullName: profileData.full_name ?? '',
        emailAddress: profileData.email ?? '',
        biography: profileData.bio ?? '',
      });
    }
  }, [profileData, reset]);

  const getProfileInitials = useCallback(() => {
    const fullName = profileData?.full_name ?? '';
    if (!fullName) return '';

    const nameParts = fullName.trim().split(' ').filter(Boolean);
    if (nameParts.length === 0) return '';

    const firstName = nameParts[0];
    const lastName = nameParts.length === 1 ? '' : nameParts.at(-1);
    const firstLetter = upperFirst(firstName)[0] ?? '';
    const lastLetter = lastName ? (upperFirst(lastName)[0] ?? '') : '';

    return `${firstLetter}${lastLetter}`;
  }, [profileData?.full_name]);

  const profileImageUrl = useMemo(
    () => toAbsoluteAttachmentUrl(profileData?.profile_image || ''),
    [profileData?.profile_image],
  );
  const hasCustomImage = Boolean(profileImageUrl.trim());

  const onSubmit = (data: ProfileFormValues) => {
    const nameParts = data.fullName.trim().split(' ').filter(Boolean);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ');

    void dispatch(
      saveProfile({
        first_name: firstName,
        last_name: lastName,
        email: data.emailAddress,
        bio: data.biography ?? '',
      }) as never,
    ).then((response: { error?: unknown }) => {
      if (response?.error) {
        return;
      }
      syncAuthProfile({
        full_name: data.fullName.trim(),
        email: data.emailAddress,
      });
      showSuccessToast('Profile updated successfully.');
    });
  };

  const handleUploadProfileImage = (file: File) => {
    if (!profileData?.email) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('doctype', 'User');
    formData.append('doc_name', profileData.email);

    void dispatch(uploadProfileImageUser(formData) as never).then(
      (response: { error?: unknown; payload?: { message?: { file_url?: string } } }) => {
        if (response?.error) {
          showErrorToast(response.error, { defaultMessage: 'Failed to update profile image.' });
          return;
        }
        const fileUrl = response.payload?.message?.file_url;
        if (fileUrl) {
          syncAuthProfile({ user_image: fileUrl });
        }
        showSuccessToast('Profile image updated.');
      },
    );
  };

  const handleRemoveProfileImage = () => {
    if (!profileData?.profile_image || !profileData.email) {
      return;
    }

    void dispatch(deleteFileByUrl(profileData.profile_image) as never).then(
      (response: { error?: unknown }) => {
        if (response?.error) {
          showErrorToast(response.error, { defaultMessage: 'Failed to remove profile image.' });
          return;
        }
        syncAuthProfile({ user_image: '' });
        void dispatch(getProfile(profileData.email) as never);
        showSuccessToast('Profile image removed.');
      },
    );
  };

  const handleDiscard = () => {
    reset({
      fullName: profileData?.full_name ?? '',
      emailAddress: profileData?.email ?? '',
      biography: profileData?.bio ?? '',
    });
  };

  const onSubmitPassword = useCallback(
    (data: ChangePasswordFormValues) => {
      void dispatch(resetPasswordProfile(data) as never).then((response: { error?: unknown }) => {
        if (response?.error) {
          toast.custom(
            (t) => (
              <AlertToast.Root
                t={t}
                status='error'
                variant='lighter'
                message={extractErrorMessage(response, 'Failed to update password.')}
              />
            ),
            { position: 'top-right' },
          );
          return;
        }

        toast.custom((t) => (
          <AlertToast.Root
            t={t}
            status='success'
            variant='lighter'
            message='Password updated successfully.'
          />
        ));
        resetPassword();
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setIsChangePasswordOpen(false);
      });
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
    setIsChangePasswordOpen(false);
  };

  const handleSelectItem = useCallback(
    (item: { id?: string; type?: string }) => {
      navigate(buildBoardsNavigationPath(item));
    },
    [navigate],
  );

  return (
    <div className='flex h-dvh min-w-0 overflow-hidden'>
      <div className='flex h-full min-w-0 flex-1'>
        <BoardsSidebarShell collapsed={isSidebarCollapsed}>
          <Sidebar
            activeId={null}
            expandedIds={expandedIds}
            onExpandedIdsChange={setExpandedIds}
            onSelectItem={handleSelectItem}
            onTreeLoaded={setSidebarTree}
          />
        </BoardsSidebarShell>

        <main className='min-w-0 flex-1 overflow-y-auto bg-bg-weak-50'>
          <div className='mx-auto flex w-full max-w-[920px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10'>
            <header className='flex items-start gap-3'>
              {isSidebarCollapsed ? (
                <CompactButton.Root
                  variant='secondary'
                  size='medium'
                  type='button'
                  className='mt-0.5 shrink-0 rounded-full'
                  onClick={toggleSidebar}
                  aria-label='Expand sidebar'
                >
                  <CompactButton.Icon as={RiMenuUnfoldLine} />
                </CompactButton.Root>
              ) : null}
              <div>
                <h1 className='text-title-h5 text-text-strong-950'>Profile settings</h1>
                <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                  Manage your personal details and account security.
                </p>
              </div>
            </header>

            <section className='overflow-hidden rounded-2xl bg-bg-white-0 ring-1 ring-stroke-soft-200 shadow-regular-xs'>
              <div className='border-b border-stroke-soft-200 px-5 py-4 sm:px-6'>
                <h2 className='text-label-md text-text-strong-950'>Personal information</h2>
                <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                  Update your photo and personal details.
                </p>
              </div>

              <div className='flex flex-col gap-4 border-b border-stroke-soft-200 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6'>
                <div className='flex items-center gap-4'>
                  <div className='relative size-20 shrink-0'>
                    <span className='flex size-full items-center justify-center overflow-hidden rounded-full bg-bg-weak-50 ring-1 ring-stroke-soft-200'>
                      {hasCustomImage ? (
                        <img
                          src={profileImageUrl}
                          alt={`${profileData.full_name ?? 'User'} profile`}
                          className='size-full object-cover'
                        />
                      ) : (
                        <span className='text-label-lg font-medium text-text-main-900'>
                          {getProfileInitials()}
                        </span>
                      )}
                    </span>
                    <button
                      type='button'
                      aria-label='Upload profile image'
                      disabled={isLoading}
                      className='absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 shadow-sm transition hover:bg-bg-weak-50 disabled:pointer-events-none disabled:opacity-50'
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <RiPencilLine className='text-success-base' />
                    </button>
                  </div>
                  <div>
                    <p className='text-label-sm text-text-main-900'>Profile photo</p>
                    <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                      PNG or JPEG, at least 400 × 400 px.
                    </p>
                  </div>
                </div>

                {hasCustomImage ? (
                  <Button.Root
                    variant='error'
                    mode='stroke'
                    size='small'
                    type='button'
                    disabled={isLoading}
                    onClick={handleRemoveProfileImage}
                  >
                    Remove photo
                  </Button.Root>
                ) : null}

                <input
                  type='file'
                  ref={fileInputRef}
                  accept='image/png,image/jpeg'
                  className='hidden'
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      handleUploadProfileImage(file);
                    }
                    event.target.value = '';
                  }}
                />
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className='grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-6'>
                  <div className='flex flex-col gap-2'>
                    <Label.Root>
                      Full Name
                      <Label.Asterisk />
                    </Label.Root>
                    <Input.Root size='medium' className='w-full' hasError={Boolean(errors.fullName)}>
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          autoComplete='name'
                          placeholder='Enter your full name'
                          {...register('fullName')}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                    {errors.fullName ? (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.fullName.message}
                      </Hint.Root>
                    ) : null}
                  </div>

                  <div className='flex flex-col gap-2'>
                    <Label.Root>Email Address</Label.Root>
                    <Input.Root size='medium' className='w-full'>
                      <Input.Wrapper>
                        <Input.Input type='email' disabled {...register('emailAddress')} />
                      </Input.Wrapper>
                    </Input.Root>
                    <p className='text-paragraph-xs text-text-sub-500'>
                      Your sign-in email cannot be changed here.
                    </p>
                  </div>

                  <div className='flex flex-col gap-2 sm:col-span-2'>
                    <Label.Root>Biography</Label.Root>
                    <Textarea.Root
                      simple
                      rows={4}
                      className='min-h-24'
                      placeholder='Tell your team a little about yourself'
                      {...register('biography')}
                    />
                  </div>

                  {error ? (
                    <Hint.Root hasError className='sm:col-span-2'>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {String(error)}
                    </Hint.Root>
                  ) : null}
                </div>

                <div className='flex items-center justify-end gap-3 border-t border-stroke-soft-200 bg-bg-weak-50 px-5 py-4 sm:px-6'>
                  <Button.Root
                    size='small'
                    variant='neutral'
                    mode='stroke'
                    type='button'
                    disabled={!isDirty || isLoading}
                    onClick={handleDiscard}
                  >
                    Discard
                  </Button.Root>
                  <Button.Root size='small' type='submit' disabled={!isDirty || isLoading}>
                    {isLoading ? 'Saving…' : 'Save changes'}
                  </Button.Root>
                </div>
              </form>
            </section>

            <section className='overflow-hidden rounded-2xl bg-bg-white-0 ring-1 ring-stroke-soft-200 shadow-regular-xs'>
              <div className='flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6'>
                <div>
                  <h2 className='text-label-md text-text-strong-950'>Password</h2>
                  <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                    Use a strong, unique password to protect your account.
                  </p>
                </div>
                {!isChangePasswordOpen ? (
                  <Button.Root
                    size='small'
                    type='button'
                    onClick={() => setIsChangePasswordOpen(true)}
                  >
                    Change password
                  </Button.Root>
                ) : null}
              </div>

              {isChangePasswordOpen ? (
                <form
                  onSubmit={handleSubmitPassword(onSubmitPassword)}
                  className='border-t border-stroke-soft-200'
                >
                  <div className='grid gap-5 px-5 py-6 sm:px-6 lg:grid-cols-3'>
                    {[
                      {
                        key: 'currentPassword' as const,
                        label: 'Current Password',
                        placeholder: 'Enter current password',
                        visible: showCurrentPassword,
                        toggle: () => setShowCurrentPassword((value) => !value),
                      },
                      {
                        key: 'newPassword' as const,
                        label: 'New Password',
                        placeholder: 'Enter new password',
                        visible: showNewPassword,
                        toggle: () => setShowNewPassword((value) => !value),
                      },
                      {
                        key: 'confirmPassword' as const,
                        label: 'Confirm New Password',
                        placeholder: 'Confirm new password',
                        visible: showConfirmPassword,
                        toggle: () => setShowConfirmPassword((value) => !value),
                      },
                    ].map((field) => (
                      <div key={field.key} className='flex min-w-0 flex-col gap-2'>
                        <Label.Root>
                          {field.label}
                          <Label.Asterisk />
                        </Label.Root>
                        <Input.Root
                          size='medium'
                          className='w-full'
                          hasError={Boolean(passwordErrors[field.key])}
                        >
                          <Input.Wrapper>
                            <Input.Icon as={RiLockLine} />
                            <Input.Input
                              type={field.visible ? 'text' : 'password'}
                              autoComplete={
                                field.key === 'currentPassword' ? 'current-password' : 'new-password'
                              }
                              placeholder={field.placeholder}
                              {...registerPassword(field.key)}
                            />
                            <button
                              type='button'
                              aria-label={field.visible ? `Hide ${field.label}` : `Show ${field.label}`}
                              onClick={field.toggle}
                              className='flex size-5 shrink-0 items-center justify-center text-text-sub-500'
                            >
                              {field.visible ? <RiEyeLine /> : <RiEyeCloseLine />}
                            </button>
                          </Input.Wrapper>
                        </Input.Root>
                        {passwordErrors[field.key] ? (
                          <Hint.Root hasError>
                            <Hint.Icon as={RiErrorWarningFill} />
                            {passwordErrors[field.key]?.message}
                          </Hint.Root>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {(newPassword?.length ?? 0) > 0 ? (
                    <div className='mx-5 mb-6 rounded-xl bg-bg-weak-50 p-4 sm:mx-6'>
                      <p className='mb-3 text-label-xs text-text-sub-500'>Password requirements</p>
                      <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                        {[
                          { key: 'hasUppercase', label: 'One uppercase letter' },
                          { key: 'hasLowercase', label: 'One lowercase letter' },
                          { key: 'hasNumber', label: 'One number' },
                          { key: 'hasSpecialChar', label: 'One special character' },
                          {
                            key: 'hasMinLength',
                            label: `${PASSWORD_CRITERIA.MIN_LENGTH} or more characters`,
                          },
                        ].map(({ key, label }) => {
                          const isMet =
                            passwordValidation[key as keyof typeof passwordValidation];
                          return (
                            <p
                              key={key}
                              className={`flex items-center gap-2 text-paragraph-sm ${
                                isMet ? 'text-success-base' : 'text-text-soft-400'
                              }`}
                            >
                              <RiCheckboxCircleFill className='shrink-0' />
                              {label}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className='flex items-center justify-end gap-3 border-t border-stroke-soft-200 bg-bg-weak-50 px-5 py-4 sm:px-6'>
                    <Button.Root
                      size='small'
                      variant='neutral'
                      mode='stroke'
                      type='button'
                      onClick={handleDiscardPassword}
                    >
                      Cancel
                    </Button.Root>
                    <Button.Root size='small' type='submit' disabled={!isFormValid || isLoading}>
                      Update password
                    </Button.Root>
                  </div>
                </form>
              ) : null}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
