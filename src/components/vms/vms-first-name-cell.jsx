import React from 'react';
import * as Avatar from '@/components/ui/avatar';
import { getInitials, resolveFileUrl } from '@/lib/utils';

/**
 * List row: avatar from `custom_visitor_photo` when present, else initials.
 * @param {'first'|'full'} nameVariant - show first name only (visitors) or full name (space / vendors).
 */
export function VmsFirstNameCell({ row, nameVariant = 'first' }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const first = (row.original.first_name || '').trim();
  const lastName = (row.original.last_name || '').trim();
  const fullName = [first, lastName].filter(Boolean).join(' ').trim() || '--';
  const initials = getInitials(fullName) || '--';
  const photoPath = row.original.custom_visitor_photo;
  const photoUrl = photoPath ? resolveFileUrl(photoPath) : '';

  React.useEffect(() => {
    setImgFailed(false);
  }, [photoPath, row.original.name]);

  const displayText = nameVariant === 'full' ? fullName : first || '--';

  return (
    <div className='flex items-center gap-1'>
      <Avatar.Root size='24' color='gray' className='shrink-0'>
        {photoUrl && !imgFailed ? (
          <Avatar.Image src={photoUrl} alt='' onError={() => setImgFailed(true)} />
        ) : (
          <span className='text-label-xs'>{initials}</span>
        )}
      </Avatar.Root>
      <span className='paragraph-small text-text-strong-950 text-nowrap font-medium'>
        {displayText}
      </span>
    </div>
  );
}
