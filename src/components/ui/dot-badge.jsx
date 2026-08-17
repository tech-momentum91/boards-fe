import React from 'react';
import { cva } from 'class-variance-authority';

const dotBadgeVariants = cva('', {
  variants: {
    color: {
      green: 'text-primary-base',
      red: 'text-red-600',
      yellow: 'text-yellow-500',
      gray: 'text-gray-400',
      blue: 'text-blue-600',
    },
  },
  defaultVariants: {
    color: 'green',
  },
});

const DotBadge = ({ color = 'green', size = 24, className = '', ...rest }) => {
  const root = dotBadgeVariants({ color });

  return (
    <svg
      {...rest}
      width={size}
      height={size}
      className={`${root} ${className}`}
      viewBox='0 0 16 16'
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
    >
      <circle cx='9' cy='8' r='5.5' stroke={color} />
      <circle cx='9' cy='8' r='4' fill={color} />
    </svg>
  );
};

export default DotBadge;
