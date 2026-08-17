import React, { useEffect } from 'react';

import apiClient from '@/api/axios';
import * as LinkButton from '@/components/ui/link-button';
import devxLogo from '@/assets/svgs/Layer.svg';
import maintenanceBackgroundPattern from '@/assets/images/maintenance-background-pattern.png';
import maintenanceIllustration from '@/assets/images/Layer 1.png';

const DEFAULT_WEBSITE_URL = 'https://devx.work';

const WEBSITE_URL =
  (import.meta.env.VITE_WEBSITE_URL || DEFAULT_WEBSITE_URL).trim() || DEFAULT_WEBSITE_URL;

const DASHBOARD_HEALTH_CHECK = '/method/frappe.auth.get_logged_user';

function Maintenance() {
  useEffect(() => {
    apiClient.get(DASHBOARD_HEALTH_CHECK).then(
      () => {
        window.location.href = '/dashboard';
      },
      (error) => {
        const status = error.response?.status;
        if (status === 503) return;
        if (error.response) window.location.href = '/dashboard';
      },
    );
  }, []);

  return (
    <div className='relative h-screen overflow-hidden bg-bg-white-0'>
      <div
        aria-hidden
        data-node-id='30990:356350'
        className='pointer-events-none absolute left-1/2 top-[calc(50%-77px)] h-[440px] w-full max-w-[1140px] -translate-x-1/2 -translate-y-1/2'
      >
        <div className='absolute inset-x-0 inset-y-[-0.11%]'>
          <img
            src={maintenanceBackgroundPattern}
            alt=''
            className='block size-full max-w-none object-cover'
            width={1140}
            height={440}
          />
        </div>
      </div>

      <div className='relative z-10 mx-auto flex h-full w-full max-w-[633px] flex-col items-center px-6 py-8'>
        <img src={devxLogo} alt='DevX' className='h-11 w-auto shrink-0' width={150} height={45} />

        <div className='flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-5 text-center'>
          <img
            src={maintenanceIllustration}
            alt=''
            className='max-h-[min(38vh,279px)] w-full max-w-[431px] shrink object-contain mb-15 mt-5'
            width={431}
            height={279}
          />
          <div className='flex w-full flex-col items-center gap-5'>
            <h1 className='text-[30px] font-semibold leading-[38px] text-text-strong-950'>
              We&apos;ll Be Back Soon
            </h1>
            <p className='text-lg font-medium leading-7 text-text-sub-500'>
              System is down for scheduled maintenance and expect to back online in a few minutes.
            </p>
          </div>
        </div>

        <p className='shrink-0 text-center text-paragraph-md font-medium text-text-soft-400'>
          In meantime checkout our{' '}
          <LinkButton.Root asChild variant='primary' size='medium' underline>
            <a href={WEBSITE_URL} target='_blank' rel='noopener noreferrer'>
              website
            </a>
          </LinkButton.Root>
        </p>
      </div>
    </div>
  );
}

export default Maintenance;
