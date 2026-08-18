import type { ReactNode } from 'react';

interface LoginHeadSubProps {
  heading?: ReactNode;
  subHeading?: ReactNode;
}

function LoginHeadSub({ heading, subHeading }: LoginHeadSubProps) {
  return (
    <div className='w-full space-y-[4px]  flex flex-col items-start justify-start '>
      <div className='text-center items-center w-full justify-center'>
        <span className='text-2xl text-[var(--color-text-main-900)]'>{heading}</span>
      </div>

      <div className='text-center items-center w-full justify-center'>
        <span className='text-[var(--color-text-sub-500)]'>{subHeading}</span>
      </div>
    </div>
  );
}

export default LoginHeadSub;
