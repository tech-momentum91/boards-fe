import type { HTMLAttributes, ReactNode } from 'react';
import { RiErrorWarningFill } from 'react-icons/ri';

import { cn } from '@/utils/cn';

interface ErrorTextProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
  className?: string;
}

function ErrorText({ children, className, ...rest }: ErrorTextProps) {
  if (!children) return null;

  return (
    <p
      className={cn(
        'mt-1 inline-flex items-center gap-1 text-paragraph-xs text-error-base',
        className,
      )}
      {...rest}
    >
      <RiErrorWarningFill size={12} className='shrink-0 self-start mt-0.5' aria-hidden='true' />
      <span>{children}</span>
    </p>
  );
}

ErrorText.displayName = 'ErrorText';

export default ErrorText;
