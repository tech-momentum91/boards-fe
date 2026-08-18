import { Link } from 'react-router-dom';
import { RiLockLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';

export default function BoardNoAccessPage() {
  return (
    <div className='flex h-dvh min-h-[60vh] w-full items-center justify-center bg-bg-weak-50 p-6'>
      <div className='flex max-w-md flex-col items-center rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-10 text-center shadow-regular-xs'>
        <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-bg-weak-100'>
          <RiLockLine className='size-6 text-icon-sub-500' />
        </div>
        <h1 className='mb-2 text-lg font-semibold text-text-main-900'>No access</h1>
        <p className='mb-6 text-sm text-text-sub-500'>
          You don&apos;t have permission to view this board, folder, list, or task.
        </p>
        <Button.Root asChild variant='primary' mode='filled'>
          <Link to='/boards'>Back to Boards</Link>
        </Button.Root>
      </div>
    </div>
  );
}
