import commingSoon from '@/assets/images/commingSoon.png';

export default function ComingSoonMessage() {
  return (
    <div className='flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center px-6 py-16'>
      <img src={commingSoon} alt='Coming soon' className='mb-6 max-w-full' />
      <p className='mb-2 text-center text-2xl font-medium leading-8 text-text-main-900'>
        Coming soon!
      </p>
      <p className='text-sm font-normal leading-5 text-text-sub-500'>
        We will be updating this very soon.
      </p>
    </div>
  );
}
