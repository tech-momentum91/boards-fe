import { Link } from 'react-router-dom';
import { RiExternalLinkLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import { getTaskSystemLinkButtonLabel, getTaskSystemLinkLabel } from '../utils/system-link-utils';

export default function TaskSystemLink({ systemLink, variant = 'inline', className, onNavigate }) {
  if (!systemLink?.route) {
    return null;
  }

  const label = getTaskSystemLinkLabel(systemLink);
  const buttonLabel = getTaskSystemLinkButtonLabel(systemLink);

  if (variant === 'button') {
    return (
      <Link
        to={systemLink.route}
        onClick={(event) => {
          event.stopPropagation();
          onNavigate?.();
        }}
        className={cn(
          'inline-flex w-fit max-w-full items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1.5 text-xs font-medium text-text-sub-500 transition hover:bg-bg-weak-50 hover:text-text-main-900',
          className,
        )}
      >
        <RiExternalLinkLine size={14} className='shrink-0' />
        <span className='truncate'>{buttonLabel}</span>
      </Link>
    );
  }

  return (
    <Link
      to={systemLink.route}
      onClick={(event) => {
        event.stopPropagation();
        onNavigate?.();
      }}
      title={`Open ${label}`}
      aria-label={`Open ${label}`}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded text-icon-soft-400 transition hover:bg-bg-weak-100 hover:text-primary-base',
        variant === 'compact' ? 'size-6' : 'size-7',
        className,
      )}
    >
      <RiExternalLinkLine size={variant === 'compact' ? 14 : 16} />
    </Link>
  );
}
