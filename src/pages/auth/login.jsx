import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiErrorWarningFill,
  RiEyeCloseLine,
  RiEyeLine,
  RiLockLine,
  RiMailLine,
} from 'react-icons/ri';
import * as LinkButton from '@/components/ui/link-button';
import * as Label from '@/components/ui/label';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Hint from '@/components/ui/hint';
import LoginCardHeader from '@/components/login-card-header';
import AuthLayout from '@/components/auth-layout';
import { useAuth } from '@/contexts/auth-context';
import { loginService } from '@/services/auth-service';
import { loginSuccess, setError, clearError } from '@/redux/authSlice';
import { getProfile } from '@/redux/profileSlice';
import { showErrorToast } from '@/utils/error-utils';
import { SESSION_EXPIRED_TOAST_KEY } from '@/utils/auth-utils';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .refine((value) => {
      if (value === 'administrator') return true;
      return z.string().email().safeParse(value).success;
    }, 'Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required'),
});

function Login() {
  const dispatch = useDispatch();
  const { error } = useSelector((state) => state.auth);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Clear error when component mounts
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    const shouldShowSessionExpiredToast = sessionStorage.getItem(SESSION_EXPIRED_TOAST_KEY) === '1';
    if (!shouldShowSessionExpiredToast) return;

    showErrorToast('Session expired. Please log in again.');
    sessionStorage.removeItem(SESSION_EXPIRED_TOAST_KEY);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onChange', // Validate on change to show errors in real-time
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    dispatch(clearError());

    try {
      const response = await loginService(data.email, data.password);
      // console.log('response in login', response);

      if (response.error) {
        if (response.error.includes('SecurityException')) {
          dispatch(
            setError({ message: 'Your account has been locked and will resume after 60 seconds' }),
          );
          return;
        } else {
          dispatch(setError({ message: response.error }));
          return;
        }
      }

      if (response.data) {
        const userData = await dispatch(getProfile(data.email)).unwrap();

        // console.log('userData in login', userData);

        if (userData?.error) {
          dispatch(setError({ message: userData.error }));
          return;
        }

        // Update auth context
        authLogin(userData?.data || userData, data.email);
        // Update Redux store
        dispatch(loginSuccess(userData?.data || userData));
      }
    } catch {
      // console.log('error in login', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthLayout>
      <LoginCardHeader />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className='w-[500px] px-[32px] gap-[24px] h-full bg-white flex flex-col items-start justify-center'
      >
        <div className='w-full flex gap-[24px] flex-col items-start justify-center px-[32px]'>
          <div className='w-full space-y-[4px] flex flex-col items-start justify-start'>
            <div className='items-start w-full justify-center'>
              <span className='text-2xl text-[var(--color-text-main-900)]'>
                Login to your account
              </span>
            </div>

            <div className='items-center w-full justify-center'>
              <span className='text-[var(--color-text-sub-500)]'>Enter your details to login</span>
            </div>
          </div>

          <div className='bg-[var(--color-stroke-soft-200)] h-[1px] w-full' />

          <div className='w-full flex flex-col items-start justify-start gap-[20px]'>
            <div className='w-full item-start space-y-[4px]'>
              <Label.Root className=' text-[var(--color-text-main-900)]'>Email Address</Label.Root>
              <Input.Root size='medium' className='w-full' hasError={Boolean(errors.email)}>
                <Input.Wrapper>
                  <Input.Icon as={RiMailLine} />
                  <Input.Input
                    type='email'
                    placeholder='Please enter email address.'
                    tabIndex={1}
                    autoFocus
                    {...register('email')}
                  />
                </Input.Wrapper>
              </Input.Root>
              {errors.email && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.email.message}
                </Hint.Root>
              )}
            </div>

            <div className='w-full item-start space-y-[4px]'>
              <div className='w-full flex items-center justify-between'>
                <Label.Root>Password</Label.Root>
                <LinkButton.Root
                  type='button'
                  onClick={() => navigate('/reset-password')}
                  underline={true}
                  variant='gray'
                  size='medium'
                  tabIndex={4}
                >
                  Forgot Password?
                </LinkButton.Root>
              </div>
              <Input.Root
                size='medium'
                className='w-full '
                hasError={Boolean(errors.password) || Boolean(error)}
              >
                <Input.Wrapper>
                  <Input.Icon as={RiLockLine} />
                  <Input.Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Please enter password.'
                    tabIndex={2}
                    {...register('password')}
                  />
                  <Input.Icon
                    as={showPassword ? RiEyeLine : RiEyeCloseLine}
                    className='cursor-pointer'
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </Input.Wrapper>
              </Input.Root>
              {errors.password ? (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.password.message}
                </Hint.Root>
              ) : error ? (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {error}
                </Hint.Root>
              ) : null}
            </div>
          </div>

          <div className='w-full flex items-center justify-center'>
            <Button.Root
              type='submit'
              size='medium'
              disabled={isLoading}
              className='w-full bg-[var(--color-primary-base)]'
              tabIndex={3}
            >
              Login
            </Button.Root>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}

export default Login;
