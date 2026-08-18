import { RiFolderLine, RiLayoutGridLine, RiListCheck3 } from 'react-icons/ri';

const iconByType = {
  space: RiLayoutGridLine,
  folder: RiFolderLine,
  board: RiLayoutGridLine,
};

export function BoardListContentSkeleton() {
  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <div className='flex h-12 shrink-0 items-center gap-3 border-b border-stroke-soft-200 px-6'>
        <div className='h-8 w-48 animate-pulse rounded-lg bg-bg-weak-50' />
        <div className='ml-auto h-8 w-24 animate-pulse rounded-lg bg-bg-weak-50' />
      </div>
      <div className='flex-1 overflow-auto p-6'>
        <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className='border-b border-stroke-soft-200 px-4 py-3 last:border-b-0'>
              <div className='h-5 animate-pulse rounded bg-bg-weak-50' />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BoardContentPlaceholder({ item }) {
  const Icon = iconByType[item?.type] ?? RiLayoutGridLine;
  const title = item?.label ?? 'Boards';
  const description =
    item?.type === 'folder'
      ? 'Select a list from the sidebar to view its tasks.'
      : item?.type === 'space'
        ? 'Select a list from this board to view tasks.'
        : 'Select a list from the sidebar to get started.';

  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-3 bg-bg-white-0 p-8 text-center'>
      <span className='flex size-12 items-center justify-center rounded-2xl bg-bg-weak-100 text-icon-sub-500'>
        {item?.type === 'list' ? <RiListCheck3 size={24} /> : <Icon size={24} />}
      </span>
      <div className='max-w-sm space-y-1'>
        <h2 className='text-lg font-medium text-text-main-900'>{title}</h2>
        <p className='text-sm text-text-soft-400'>{description}</p>
      </div>
    </div>
  );
}
