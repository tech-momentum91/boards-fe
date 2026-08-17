import React from 'react';
import { cn } from '@/utils/cn';

const ContentDivider = ({ className, children }) => {
  return <div className={cn('py-2 px-6 bg-bg-weak-100', className)}>{children}</div>;
};

export default ContentDivider;
