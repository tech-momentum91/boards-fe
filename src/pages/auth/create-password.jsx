import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IoCheckmarkCircle } from 'react-icons/io5';
import {
  RiErrorWarningFill,
  RiEyeCloseLine,
  RiLockLine,
  RiEyeLine,
  RiArrowLeftSLine,
} from 'react-icons/ri';
import * as Label from '@/components/ui/label';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import * as Hint from '@/components/ui/hint';
import LoginCardHeader from '@/components/login-card-header';
import LoginHeadSub from '@/components/login-head-sub';
import AuthLayout from '@/components/auth-layout';
import { createPasswordThunk, setError, clearError } from '@/redux/authSlice';

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

const createPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .min(
        PASSWORD_CRITERIA.MIN_LENGTH,
        `Password must be at least ${PASSWORD_CRITERIA.MIN_LENGTH} characters`,
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const SUCCESS_STATUS = 200;

function CreatePassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { error } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const onSubmit = (data) => {
    dispatch(createPasswordThunk({ new_password: data.password, key: searchParams.get('key') }))
      .then((response) => {
        if (response.payload.status === SUCCESS_STATUS) {
          navigate('/password-success');
        } else {
          dispatch(setError({ message: response.payload.data.message }));
        }
      })
      .catch(() => {
        // Error handled by Redux
      });
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordValidation = useMemo(() => {
    const passwordValue = password || '';
    return {
      hasUppercase: /[A-Z]/.test(passwordValue),
      hasLowercase: /[a-z]/.test(passwordValue),
      hasNumber: /\d/.test(passwordValue),
      hasSpecialChar: /[!"#$%&()*,.:<>?@^{|}]/.test(passwordValue),
      hasMinLength: passwordValue.length >= PASSWORD_CRITERIA.MIN_LENGTH,
    };
  }, [password]);

  const passwordStrength = useMemo(() => {
    if (!password || password.length === 0) {
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

    if (password.length >= PASSWORD_CRITERIA.STRONG_LENGTH) {
      strength += PASSWORD_CRITERIA.STRONG_BONUS;
    } else if (password.length >= PASSWORD_CRITERIA.GOOD_LENGTH) {
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
  }, [password, passwordValidation]);

  return (
    <AuthLayout>
      <LoginCardHeader />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className='w-[500px] px-[32px] gap-[24px] h-full bg-white flex flex-col items-start justify-center'
      >
        <div className='w-full flex gap-[24px] flex-col items-center justify-center px-[32px]'>
          <LoginHeadSub
            heading='Create New Password'
            subHeading='Please, enter your new password below.'
          />

          {error && (
            <Hint.Root hasError>
              <Hint.Icon as={RiErrorWarningFill} />
              {error}
            </Hint.Root>
          )}

          <div className='bg-[var(--color-stroke-soft-200)] h-[1px] w-full' />

          <div className='w-full flex flex-col items-start justify-start gap-[12px]'>
            <div className='w-full item-start space-y-[4px]'>
              <Label.Root className='text-[var(--color-text-main-900)]'>New Password</Label.Root>

              <Input.Root size='medium' className='w-full' hasError={Boolean(errors.password)}>
                <Input.Wrapper>
                  <Input.Icon as={RiLockLine} />
                  <Input.Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder='* * * * * * * *'
                    {...register('password')}
                  />
                  <Input.Icon
                    as={showPassword ? RiEyeLine : RiEyeCloseLine}
                    className='cursor-pointer'
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </Input.Wrapper>
              </Input.Root>
              {errors.password && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.password.message}
                </Hint.Root>
              )}
            </div>

            <div className='w-full item-start space-y-[4px]'>
              <Label.Root className='text-[var(--color-text-main-900)]'>
                Confirm Password
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
                    placeholder='* * * * * * * *'
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
          </div>

          {/* password strength checker */}

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

          <div className='w-full flex flex-col gap-[8px] items-center justify-start'>
            <p className=' w-full text-[var(--color-text-sub-500)]'>Must contain at least: </p>

            {[
              { key: 'hasUppercase', label: 'At least 1 uppercase' },
              { key: 'hasLowercase', label: 'At least 1 lowercase' },
              { key: 'hasNumber', label: 'At least 1 number' },
              { key: 'hasSpecialChar', label: 'At least 1 special character' },
              { key: 'hasMinLength', label: `At least ${PASSWORD_CRITERIA.MIN_LENGTH} characters` },
            ].map(({ key, label }) => (
              <p
                key={key}
                className='text-sm w-full flex items-center gap-1 justify-start text-[var(--color-text-soft-400)]'
              >
                <IoCheckmarkCircle
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

          <div className='w-full flex items-center justify-start'>
            <Button.Root
              type='submit'
              size='medium'
              disabled={
                !passwordValidation.hasLowercase ||
                !passwordValidation.hasUppercase ||
                !passwordValidation.hasNumber ||
                !passwordValidation.hasSpecialChar ||
                !passwordValidation.hasMinLength
              }
              className='w-full bg-[var(--color-primary-base)]'
            >
              Reset Password
            </Button.Root>
          </div>

          <div className='w-full flex items-center justify-center'>
            <LinkButton.Root
              type='button'
              onClick={() => navigate('/login')}
              underline={true}
              variant='gray'
              size='medium'
            >
              <span>
                <RiArrowLeftSLine />
              </span>{' '}
              Back to login
            </LinkButton.Root>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}

export default CreatePassword;
