import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import * as Button from '@/components/ui/button';
import { RiAlertFill } from 'react-icons/ri';
import {
  clearPostLoginRedirectPath,
  getLoginPathWithNext,
  pathFromLocationLike,
  resolvePostLoginRedirectPath,
  setPostLoginRedirectPath,
} from '@/utils/auth-utils';

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
 * - Remembers the attempted URL (`?next=` + sessionStorage) so login returns there
 * - Shows error message if session API fails on protected pages
 * - Redirects authenticated users away from the login page to the return URL (or /boards)
 */
interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

const ProtectedRoute = ({ children, requireAuth = true }: ProtectedRouteProps) => {
  const { isAuthenticated, loading: authLoading, sessionApiError, refreshSession } = useAuth();
  const location = useLocation();
  // Capture the post-login destination once — pop/clear must not run on every render
  // (authLogin + loginSuccess cause multiple re-renders / Strict Mode double-invoke).
  const postLoginRedirectRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (requireAuth && !isAuthenticated) {
      const fullPath = pathFromLocationLike(location);
      if (fullPath) setPostLoginRedirectPath(fullPath);
    }
  }, [authLoading, requireAuth, isAuthenticated, location]);

  if (authLoading) {
    return (
      <div className='h-screen w-full flex items-center justify-center bg-(--color-bg-weak-50)'>
        <div className='flex flex-col items-center gap-4'>
          <div className='w-8 h-8 border-4 border-(--color-primary-base) border-t-transparent rounded-full animate-spin' />
          <p className='text-(--color-text-sub-500)'>Verifying session...</p>
        </div>
      </div>
    );
  }

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

  if (requireAuth && !isAuthenticated) {
    const fullPath = pathFromLocationLike(location);
    if (fullPath) setPostLoginRedirectPath(fullPath);
    return (
      <Navigate
        to={getLoginPathWithNext(fullPath, location.pathname)}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!requireAuth && isAuthenticated) {
    if (postLoginRedirectRef.current === undefined) {
      postLoginRedirectRef.current =
        resolvePostLoginRedirectPath({
          search: location.search,
          stateFrom: location.state?.from,
        }) || '/boards';
      clearPostLoginRedirectPath();
    }
    return <Navigate to={postLoginRedirectRef.current || '/boards'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
