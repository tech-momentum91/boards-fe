import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { RiCheckDoubleFill, RiArrowLeftSLine } from 'react-icons/ri';
import LoginCardHeader from '@/components/login-card-header';
import AuthLayout from '@/components/auth-layout';
import LoginHeadSub from '@/components/login-head-sub';
import LoginIcon from '@/components/login-icon';
import * as Button from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { logOutService } from '@/services/auth-service';
import { logoutSuccess } from '@/redux/authSlice';

const NAVIGATION_DELAY = 1500;

function PasswordSuccess() {
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  const dispatch = useDispatch();

  const handleNavigate = async () => {
    try {
      await logOutService();
    } catch {
      // Silently handle logout errors
    } finally {
      authLogout();
      dispatch(logoutSuccess());
      setTimeout(() => {
        navigate('/login');
      }, NAVIGATION_DELAY);
    }
  };

  return (
    <AuthLayout>
      <LoginCardHeader />
      <div className='w-[500px] gap-[24px] h-full bg-white flex flex-col items-start justify-center'>
        <div className='w-full flex gap-[24px] flex-col items-center justify-center px-[32px]'>
          <LoginIcon>
            <RiCheckDoubleFill
              className='text-[var(--color-primary-base)]'
              width={28}
              height={28}
            />
          </LoginIcon>
          <LoginHeadSub
            heading='Password updated successfully'
            subHeading='Your password has been changed.'
          />

          <div className='w-full flex items-center justify-start'>
            <Button.Root
              onClick={handleNavigate}
              type='button'
              size='medium'
              className='w-full bg-[var(--color-primary-base)]'
            >
              <RiArrowLeftSLine />
              Back to login
            </Button.Root>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

export default PasswordSuccess;
