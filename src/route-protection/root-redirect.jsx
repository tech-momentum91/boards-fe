import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';

const RootRedirect = () => {
  const { isAuthenticated, loading, refreshSession } = useAuth();

  // Trigger session check when component mounts
  // Only check if we haven't checked yet
  useEffect(() => {
    refreshSession();
  }, []); // Empty deps - only run once on mount

  // Show loader while checking authentication
  if (loading) {
    return (
      <div className='h-screen w-full flex items-center justify-center bg-[var(--color-bg-weak-50)]'>
        <div className='flex flex-col items-center gap-4'>
          <div className='w-8 h-8 border-4 border-[var(--color-primary-base)] border-t-transparent rounded-full animate-spin' />
          <p className='text-[var(--color-text-sub-500)]'>Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to='/boards' replace /> : <Navigate to='/login' replace />;
};

export default RootRedirect;
