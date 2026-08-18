import type { ReactNode } from 'react';

type CardLayoutProps = {
  cardTitle: string;
  cardDescription: string;
  children?: ReactNode;
};

export default function CardLayout({ cardTitle, cardDescription, children }: CardLayoutProps) {
  return (
    <div className='flex w-full min-h-full flex-col items-start justify-between gap-5'>
      <div className='flex flex-col items-start justify-center'>
        <span className='text-label-sm text-text-main-900'>{cardTitle}</span>
        <span className='text-paragraph-xs text-text-sub-500'>{cardDescription}</span>
      </div>
      {children}
    </div>
  );
}
