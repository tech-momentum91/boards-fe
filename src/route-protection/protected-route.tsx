import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import * as Button from '@/components/ui/button';
import { RiAlertFill } from 'react-icons/ri';
import { popPostLoginRedirectPath } from '@/utils/auth-utils';

type ButtonRootProps = ComponentProps<'button'> & {
  variant?: string;
  size?: string;
  mode?: string;
};

const ButtonRoot = Button.Root as unknown as (props: ButtonRootProps) => ReactNode;

/**
 * ProtectedRoute component for handling route authentication
 *
 * Features:
 * - Checks session on mount and reload (handled by AuthContext)
 * - Shows loading state while verifying authentication
 * - Redirects to /login if auth required but user not authenticated
 * - Shows error message if session API fails on protected pages
 * - Redirects to /dashboard if user authenticated but trying to access login
 */
interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

const ProtectedRoute = ({ children, requireAuth = true }: ProtectedRouteProps) => {
  const { isAuthenticated, loading: authLoading, sessionApiError, refreshSession } = useAuth();
  const location = useLocation();

  // Trigger session check when component mounts (only for routes that use ProtectedRoute)
  // Only check if we haven't checked yet to avoid unnecessary API calls
  useEffect(() => {
    // Only trigger check if we haven't checked yet
    // sessionApiSucceeded will be false if we haven't checked, or if the check failed
    // We still want to check even if it failed (to retry), but not if it succeeded
    // Actually, we should check on every protected route mount to ensure session is valid
    // But checkAuth has a guard to prevent multiple simultaneous calls
    refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once per route mount

  if (authLoading) {
    return (
      <div className='h-screen w-full flex items-center justify-center bg-(--color-bg-weak-50)'>
        <div className='flex flex-col items-center gap-4'>
          <div className='w-8 h-8 border-4 border-(--color-primary-base) border-t-transparent rounded-full animate-spin' />
          <p className='text-(--color-text-sub-500)'>
            Verifying session...
          </p>
        </div>
      </div>
    );
  }

  // If session API failed on a protected page, show error message
  if (requireAuth && sessionApiError) {
    return (
      <div className='h-screen w-full flex items-center justify-center bg-(--color-bg-weak-50)'>
        <div className='flex flex-col items-center gap-4 max-w-md mx-auto px-4'>
          <div className='text-6xl mb-2'>
            <RiAlertFill className='text-error-base' />
          </div>
          <h1 className='text-2xl font-semibold text-(--color-text-base)'>Something went wrong</h1>
          <p className='text-(--color-text-sub-500) text-center'>
            We couldn&apos;t verify your session. Please try again after some time.
          </p>
          <ButtonRoot variant='primary' size='medium' onClick={() => window.location.reload()}>
            Retry
          </ButtonRoot>
        </div>
      </div>
    );
  }

  // If route requires authentication and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  // If route is login page and user is already authenticated
  if (!requireAuth && isAuthenticated) {
    const redirectPath = popPostLoginRedirectPath();
    return <Navigate to={redirectPath || '/boards'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
