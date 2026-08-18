import * as Badge from '@/components/ui/badge';

function getTagLabel(tag) {
  if (typeof tag === 'string') {
    return tag;
  }

  return tag?.label || tag?.name || tag?.tag || '';
}

export default function TaskTagsCell({ tags = [], compact = false }) {
  const normalizedTags = (Array.isArray(tags) ? tags : []).map(getTagLabel).filter(Boolean);

  if (normalizedTags.length === 0) {
    return compact ? null : <span className='text-paragraph-sm text-text-sub-400'>—</span>;
  }

  return (
    <div className='flex min-w-0 flex-wrap gap-2'>
      {normalizedTags.slice(0, 3).map((tag, index) => (
        <Badge.Root
          key={`${tag}-${index}`}
          variant='stroke'
          color='gray'
          size='small'
          className='whitespace-nowrap bg-bg-white-0 normal-case text-text-sub-500 ring-stroke-soft-200'
        >
          {tag}
        </Badge.Root>
      ))}

      {normalizedTags.length > 3 ? (
        <Badge.Root
          variant='stroke'
          color='gray'
          size='small'
          className='whitespace-nowrap bg-bg-white-0 normal-case text-text-sub-500 ring-stroke-soft-200'
        >
          +{normalizedTags.length - 3}
        </Badge.Root>
      ) : null}
    </div>
  );
}
