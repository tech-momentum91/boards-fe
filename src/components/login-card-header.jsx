import React from 'react';
import logo from '@/assets/svgs/Layer.svg';
import NeedHelp from '@/components/need-help';
function LoginCardHeader() {
  return (
    <div className='w-full justify-between flex pt-[24px]'>
      <img src={logo} alt='logo' />

      <NeedHelp />
    </div>
  );
}
export default LoginCardHeader;
