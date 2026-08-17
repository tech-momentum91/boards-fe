import React from 'react';
import { useSelector } from 'react-redux';
import { RiSettings2Line } from 'react-icons/ri';

import PageLayout from '@/components/page-layout';
import { getAumModulePermissions } from '@/utils/aum-permission-utils';

/**
 * Route guard for AUM — sidebar key is "AUM" but role permissions use Asset In/Out/etc.
 */
const WithAumModulePermission = (WrappedComponent) => {
  const ComponentWithPermission = (props) => {
    const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);

    const isPermissionsLoaded = userSideBarPerm?.data?.message?.role !== undefined;

    const modulePermissions = React.useMemo(() => {
      if (!isPermissionsLoaded) return null;
      return getAumModulePermissions(userSideBarPerm);
    }, [userSideBarPerm, isPermissionsLoaded]);

    if (!isPermissionsLoaded) {
      return (
        <PageLayout
          pageTitle='Loading...'
          pageIcon={<RiSettings2Line size={24} />}
          pageDescription='Loading permissions...'
        >
          <div className='flex h-full items-center justify-center'>
            <div className='flex flex-col items-center gap-4'>
              <div className='h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary-base)] border-t-transparent' />
              <p className='text-[var(--color-text-sub-500)]'>Loading permissions...</p>
            </div>
          </div>
        </PageLayout>
      );
    }

    if (!modulePermissions) {
      return (
        <PageLayout
          pageTitle='Access Denied'
          pageIcon={<RiSettings2Line size={24} />}
          pageDescription="You don't have permission to access this page"
        >
          <div className='flex h-full items-center justify-center px-8'>
            <div className='flex max-w-md flex-col items-center gap-6 text-center'>
              <div className='rounded-full bg-error-lighter/30 p-4'>
                <svg
                  className='h-12 w-12 text-error-base'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                  />
                </svg>
              </div>
              <div className='flex flex-col gap-2'>
                <h1 className='text-2xl font-semibold text-text-strong-950'>Access Denied</h1>
                <p className='text-paragraph-md text-text-sub-500'>
                  You don&apos;t have permission to access this page. Please contact your
                  administrator if you believe this is an error.
                </p>
              </div>
            </div>
          </div>
        </PageLayout>
      );
    }

    return <WrappedComponent {...props} />;
  };

  ComponentWithPermission.displayName = `WithAumModulePermission(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return ComponentWithPermission;
};

export default WithAumModulePermission;
