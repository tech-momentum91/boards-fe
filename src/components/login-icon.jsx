import React from 'react';

function LoginIcon({ children }) {
  return (
    <span
      className='rounded-full p-[16px] flex items-center justify-center'
      style={{
        background:
          'linear-gradient(180deg, rgba(228, 229, 231, 0.48) 0%, rgba(247, 248, 248, 0.00) 100%, rgba(228, 229, 231, 0.00) 100%)',
        border: '0px solid #E4E5E7',
      }}
    >
      <span
        className='rounded-full p-3 flex items-center justify-center'
        style={{
          background: 'white',
          border: '0px solid #E4E5E7',
        }}
      >
        {children}
      </span>
    </span>
  );
}

export default LoginIcon;
