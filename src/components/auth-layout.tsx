import type { ReactNode } from 'react';
import loginImage from '@/assets/images/login-img.jpeg';

interface AuthLayoutProps {
  children?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
}

function AuthLayout({
  children,
  imageSrc: imageSource = loginImage,
  imageAlt = 'login',
}: AuthLayoutProps) {
  return (
    <div className='h-screen bg-[var(--color-bg-weak-50)] w-full flex flex-col items-center'>
      <div className='w-full h-full flex rounded-[24px] justify-center items-center'>
        <div className='w-full h-full flex rounded-[24px] bg-white items-center'>
          <div className='w-1/2 h-full p-10 relative  flex flex-col items-center justify-center'>
            {children}
          </div>

          <div className='w-1/2 flex h-full '>
            <img src={imageSource} alt={imageAlt} className='object-fit w-full h-full' />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
