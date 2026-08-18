import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowLeftSLine, RiErrorWarningFill, RiMailLine } from 'react-icons/ri';
import * as Label from '@/components/ui/label';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Hint from '@/components/ui/hint';
import * as LinkButton from '@/components/ui/link-button';
import LoginHeadSub from '@/components/login-head-sub';
import LoginCardHeader from '@/components/login-card-header';
import AuthLayout from '@/components/auth-layout';
import { resetPasswordMail, setError, clearError, clearEmailSentError } from '@/redux/authSlice';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';

const resetPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

const NOT_FOUND_STATUS = 404;
const TIMER_KEY = 'reset_password_timer';

function ResetPassword() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { emailSent } = useSelector((state) => state.auth);
  useEffect(() => {
    dispatch(clearError());
    // Clear error when component unmounts (navigating away)
    return () => {
      dispatch(clearEmailSentError());
    };
  }, [dispatch]);

  const onSubmit = async (data) => {
    try {
      const response = await dispatch(resetPasswordMail(data.email));

      if (response.meta.requestStatus === 'fulfilled') {
        // Reset timer and save email before navigating
        localStorage.setItem(TIMER_KEY, Date.now().toString());
        localStorage.setItem('user-email', data.email);
        navigate('/email-sent');
        return;
      }

      // Handle specific error cases
      if (response.payload?.status === NOT_FOUND_STATUS) {
        const errorMessage = 'Email not found';
        dispatch(setError({ message: errorMessage }));
        showErrorToast(errorMessage);
        return;
      }

      if (response.payload?.response?.status === 429) {
        const errorMessage =
          'You have reached the maximum number of requests. Please try again later';
        dispatch(setError({ message: errorMessage }));
        showErrorToast(errorMessage);
        return;
      }

      // Handle other errors
      if (response.meta.requestStatus === 'rejected') {
        const errorMessage = extractErrorMessage(response.payload || response.error);
        dispatch(setError({ message: errorMessage }));
        showErrorToast(errorMessage);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(setError({ message: errorMessage }));
      showErrorToast(errorMessage);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  return (
    <AuthLayout>
      <LoginCardHeader />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className='w-[500px] px-[32px] gap-[24px] h-full bg-white flex flex-col items-start justify-center'
      >
        <div className='w-full flex gap-[24px] flex-col items-center justify-center px-[32px]'>
          <LoginHeadSub
            heading='Reset Password'
            subHeading="Enter your email and we'll send you a link to reset your password if already have an account with us"
          />

          <div className='bg-[var(--color-stroke-soft-200)] h-[1px] w-full' />

          <div className='w-full flex flex-col items-start justify-start gap-[12px]'>
            <div className='w-full item-start space-y-[4px]'>
              <Label.Root className='text-[var(--color-text-main-900)]'>Email Address</Label.Root>
              <Input.Root size='medium' className='w-full' hasError={Boolean(errors.email)}>
                <Input.Wrapper>
                  <Input.Icon as={RiMailLine} />
                  <Input.Input
                    type='text'
                    placeholder='Please enter email address.'
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
          </div>

          <div className='w-full flex items-center justify-center'>
            <Button.Root
              type='submit'
              disabled={emailSent.isLoading}
              size='medium'
              className='w-full bg-[var(--color-primary-base)]'
            >
              {emailSent.isLoading ? 'Loading...' : 'Reset Password'}
            </Button.Root>
          </div>

          <div>
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

export default ResetPassword;
