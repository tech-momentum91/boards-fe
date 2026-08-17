import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  RiCheckboxCircleFill,
  RiLockLine,
  RiEyeLine,
  RiEyeCloseLine,
  RiErrorWarningFill,
} from 'react-icons/ri';
import CardLayout from '@/components/card-layout';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Button from '@/components/ui/button';
import * as Hint from '@/components/ui/hint';

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

const PrivacySecurityProfile = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading] = useState(false); // You can connect this to actual loading state

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
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

  const passwordStrength = useMemo(() => {
    if (!newPassword || newPassword.length === 0) {
      return { strength: 0, label: '', color: '' };
    }

    const criteria = [
      passwordValidation.hasUppercase,
      passwordValidation.hasLowercase,
      passwordValidation.hasNumber,
      passwordValidation.hasSpecialChar,
      passwordValidation.hasMinLength,
    ];
    const metCriteria = criteria.filter(Boolean).length;
    const allCriteriaMet = metCriteria === 5;

    let strength = metCriteria * PASSWORD_CRITERIA.CRITERIA_WEIGHT;

    if (newPassword.length >= PASSWORD_CRITERIA.STRONG_LENGTH) {
      strength += PASSWORD_CRITERIA.STRONG_BONUS;
    } else if (newPassword.length >= PASSWORD_CRITERIA.GOOD_LENGTH) {
      strength += PASSWORD_CRITERIA.GOOD_BONUS;
    }

    if (allCriteriaMet) {
      return {
        strength: 100,
        label: 'Strong',
        color: 'var(--color-success-base)',
      };
    }

    if (strength < PASSWORD_CRITERIA.WEAK_THRESHOLD) {
      return {
        strength,
        label: 'Weak',
        color: 'var(--color-error-base)',
      };
    }

    if (strength < PASSWORD_CRITERIA.FAIR_THRESHOLD) {
      return {
        strength,
        label: 'Fair',
        color: 'var(--color-warning-base)',
      };
    }

    return {
      strength: Math.min(strength, PASSWORD_CRITERIA.MAX_GOOD_STRENGTH),
      label: 'Good',
      color: 'var(--color-warning-base)',
    };
  }, [newPassword, passwordValidation]);

  const isFormValid =
    isValid &&
    passwordValidation.hasLowercase &&
    passwordValidation.hasUppercase &&
    passwordValidation.hasNumber &&
    passwordValidation.hasSpecialChar &&
    passwordValidation.hasMinLength;

  const onSubmit = useCallback(() => {
    // TODO: Implement password change API call
  }, []);

  const handleDiscard = () => {
    reset();
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <CardLayout
      cardTitle='Change Password'
      cardDescription='Update password for enhanced account security.'
    >
      {isLoading ? (
        <div className='w-full flex items-center justify-center flex-col'>
          <div className='w-1/3 flex flex-col gap-4'>
            {/* Password Fields Skeleton */}
            {[1, 2, 3].map((i) => (
              <div key={i} className='w-full flex flex-col gap-1'>
                <div className='h-4 w-32 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                <div className='h-10 w-full bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
              </div>
            ))}
            {/* Password Strength Bar Skeleton */}
            <div className='w-full flex flex-col gap-2 items-start justify-start'>
              <div className='h-4 w-16 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
              <div className='w-full h-2 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
            </div>
            {/* Password Criteria Skeleton */}
            <div className='w-full flex flex-col gap-2 items-start justify-start'>
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
          <div className='flex gap-4 mt-6 w-1/3'>
            <div className='h-10 w-full bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
            <div className='h-10 w-full bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
          </div>
        </div>
      ) : (
        <>
          {/* form */}
          <div className='w-full flex items-center justify-center flex-col'>
            <form onSubmit={handleSubmit(onSubmit)} className='w-1/3 flex flex-col gap-4'>
              <div className='w-full flex flex-col gap-1'>
                <Label.Root>
                  Current Password
                  <Label.Asterisk />
                </Label.Root>
                <Input.Root
                  size='medium'
                  className='w-full'
                  hasError={Boolean(errors.currentPassword)}
                >
                  <Input.Wrapper>
                    <Input.Icon as={RiLockLine} />
                    <Input.Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder='Enter current password'
                      {...register('currentPassword')}
                    />
                    <Input.Icon
                      as={showCurrentPassword ? RiEyeLine : RiEyeCloseLine}
                      className='cursor-pointer'
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {errors.currentPassword && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.currentPassword.message}
                  </Hint.Root>
                )}
              </div>

              <div className='w-full flex flex-col gap-1'>
                <Label.Root>
                  New Password
                  <Label.Asterisk />
                </Label.Root>
                <Input.Root size='medium' className='w-full' hasError={Boolean(errors.newPassword)}>
                  <Input.Wrapper>
                    <Input.Icon as={RiLockLine} />
                    <Input.Input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder='Enter new password'
                      {...register('newPassword')}
                    />
                    <Input.Icon
                      as={showNewPassword ? RiEyeLine : RiEyeCloseLine}
                      className='cursor-pointer'
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {errors.newPassword && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.newPassword.message}
                  </Hint.Root>
                )}
              </div>

              {/* Password strength checker */}
              {newPassword && (
                <div className='w-full flex flex-col gap-2 items-start justify-start'>
                  <div className='w-full flex items-center justify-between'>
                    <span className='text-sm font-medium' style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className='w-full h-2 bg-[var(--color-stroke-soft-200)] rounded-full overflow-hidden'>
                    <div
                      className='h-full transition-all duration-300 ease-out rounded-full'
                      style={{
                        width: `${passwordStrength.strength}%`,
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Password criteria checklist */}

              <div className='w-full flex flex-col gap-1'>
                <Label.Root>
                  Confirm New Password
                  <Label.Asterisk />
                </Label.Root>
                <Input.Root
                  size='medium'
                  className='w-full'
                  hasError={Boolean(errors.confirmPassword)}
                >
                  <Input.Wrapper>
                    <Input.Icon as={RiLockLine} />
                    <Input.Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder='Enter confirm new password'
                      {...register('confirmPassword')}
                    />
                    <Input.Icon
                      as={showConfirmPassword ? RiEyeLine : RiEyeCloseLine}
                      className='cursor-pointer'
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {errors.confirmPassword && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.confirmPassword.message}
                  </Hint.Root>
                )}
              </div>

              <div className='w-full flex flex-col gap-2 items-start justify-start'>
                <p className='w-full text-sm text-[var(--color-text-sub-500)]'>
                  Must contain at least:
                </p>
                {[
                  { key: 'hasUppercase', label: 'At least 1 uppercase' },
                  { key: 'hasLowercase', label: 'At least 1 lowercase' },
                  { key: 'hasNumber', label: 'At least 1 number' },
                  { key: 'hasSpecialChar', label: 'At least 1 special character' },
                  {
                    key: 'hasMinLength',
                    label: `At least ${PASSWORD_CRITERIA.MIN_LENGTH} characters`,
                  },
                ].map(({ key, label }) => (
                  <p
                    key={key}
                    className='text-sm w-full flex items-center gap-1 justify-start text-[var(--color-text-soft-400)]'
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
            </form>
          </div>

          {/*buttons */}
          <div className='flex gap-4'>
            <Button.Root
              size='medium'
              variant='neutral'
              mode='stroke'
              className='w-full'
              type='button'
              onClick={handleDiscard}
            >
              Discard
            </Button.Root>

            <Button.Root
              size='medium'
              className='w-full'
              type='button'
              onClick={handleSubmit(onSubmit)}
              disabled={!isFormValid}
            >
              Change Password
            </Button.Root>
          </div>
        </>
      )}
    </CardLayout>
  );
};

export default PrivacySecurityProfile;
