import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowLeftSLine, RiMailFill, RiErrorWarningFill } from 'react-icons/ri';
import AuthLayout from '@/components/auth-layout';
import LoginCardHeader from '@/components/login-card-header';
import LoginHeadSub from '@/components/login-head-sub';
import LoginIcon from '@/components/login-icon';
import * as Button from '@/components/ui/button';
import * as LinkButton from '@/components/ui/link-button';
import * as Hint from '@/components/ui/hint';
import { resetPasswordMail, setError } from '@/redux/authSlice';

// Timer constants
const TIMER_KEY = 'reset_password_timer';
const TIMER_DURATION = 30;

function EmailSent() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { emailSent } = useSelector((state) => state.auth);

  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);

  // ---------------- TIMER LOGIC ----------------
  useEffect(() => {
    const calculateRemainingTime = () => {
      const savedTime = localStorage.getItem(TIMER_KEY);
      if (!savedTime) {
        localStorage.setItem(TIMER_KEY, Date.now().toString());
        return TIMER_DURATION;
      }
      const diff = Math.floor((Date.now() - Number(savedTime)) / 1000);
      const remaining = TIMER_DURATION - diff;
      return remaining > 0 ? remaining : 0;
    };

    // Initialize timer
    setTimeLeft(calculateRemainingTime());

    const interval = setInterval(() => {
      setTimeLeft(calculateRemainingTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleResendLink = async () => {
    const email = localStorage.getItem('user-email');
    if (!email) {
      return;
    }

    try {
      const response = await dispatch(resetPasswordMail(email));

      // console.log('response.payload.response.status', response.payload.response.status);
      if (response.payload.response.status === 429) {
        dispatch(
          setError({
            message: 'You have reached the maximum number of requests. Please try again later',
          }),
        );
        return;
      }

      // If action was fulfilled (successful), reset the timer
      if (response.type.endsWith('/fulfilled')) {
        localStorage.setItem(TIMER_KEY, Date.now().toString());
        setTimeLeft(TIMER_DURATION);
        // Clear any previous errors on success
        dispatch(setError({ message: null }));
      }
    } catch {
      // Handle error - could show toast notification here
      dispatch(setError({ message: 'Failed to send reset email. Please try again.' }));
    }
  };

  return (
    <AuthLayout>
      <LoginCardHeader />
      <div className='w-[500px] px-[32px] gap-[24px] h-full bg-white flex flex-col items-start justify-center'>
        <div className='w-full flex gap-[24px] flex-col px-[32px] items-center justify-center '>
          <LoginIcon>
            <RiMailFill className='text-[var(--color-text-sub-500)]' width={28} height={28} />
          </LoginIcon>
          <LoginHeadSub
            heading='Check your inbox'
            subHeading='We’ve sent a password reset link to your email.'
          />

          <div className='bg-[var(--color-stroke-soft-200)] h-[1px] w-full' />

          <div className='w-full flex items-center justify-start'>
            <Button.Root
              type='button'
              onClick={() => navigate('/login')}
              size='medium'
              className='w-full bg-[var(--color-primary-base)]'
            >
              <RiArrowLeftSLine />
              Back to login
            </Button.Root>
          </div>

          <div className='w-full text-sm flex items-center justify-center'>
            <span className='text-[var(--color-text-sub-500)]'>
              Can not find the email?{' '}
              <LinkButton.Root
                underline={true}
                variant='primary'
                size='medium'
                disabled={timeLeft > 0 || emailSent.isLoading}
                onClick={handleResendLink}
              >
                {emailSent.isLoading
                  ? 'Sending...'
                  : timeLeft > 0
                    ? `Resend link in ${timeLeft} seconds`
                    : 'Resend link'}
              </LinkButton.Root>
            </span>
          </div>

          {emailSent.error && (
            <Hint.Root hasError>
              <Hint.Icon as={RiErrorWarningFill} />
              {emailSent.error}
            </Hint.Root>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

export default EmailSent;
