import React from 'react';
import { cn, toAbsoluteAttachmentUrl } from '@/lib/utils';

/**
 * Avatar style configs: light bg + darker text + inset shadow (matches design spec).
 * Each entry: bg, text, shadow (inset).
 */
const AVATAR_STYLES = [
  {
    bg: 'bg-teal-100',
    text: 'text-teal-800',
    shadow: 'shadow-[inset_0px_-8px_16px_0px_rgba(44,189,242,0.24)]',
  },
  {
    bg: 'bg-neutral-100',
    text: 'text-neutral-800',
    shadow: 'shadow-[inset_0px_-8px_16px_0px_rgba(197,199,201,0.48)]',
  },
  {
    bg: 'bg-red-100',
    text: 'text-red-800',
    shadow: 'shadow-[inset_0px_-8px_16px_0px_rgba(233,53,53,0.24)]',
  },
  {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    shadow: 'shadow-[inset_0px_-8px_16px_0px_rgba(110,63,243,0.24)]',
  },
  {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    shadow: 'shadow-[inset_0px_-8px_16px_0px_rgba(59,130,246,0.28)]',
  },
  {
    bg: 'bg-green-100',
    text: 'text-green-800',
    shadow: 'shadow-[inset_0px_-8px_16px_0px_rgba(34,197,94,0.24)]',
  },
  {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    shadow: 'shadow-[inset_0px_-8px_16px_0px_rgba(249,115,22,0.24)]',
  },
  {
    bg: 'bg-pink-100',
    text: 'text-pink-800',
    shadow: 'shadow-[inset_0px_-8px_16px_0px_rgba(236,72,153,0.24)]',
  },
  {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    shadow: 'shadow-[inset_0px_-8px_16px_0px_rgba(234,179,8,0.28)]',
  },
  {
    bg: 'bg-sky-100',
    text: 'text-sky-800',
    shadow: 'shadow-[inset_0px_-8px_16px_0px_rgba(14,165,233,0.24)]',
  },
];

/** Simple hash from string to index for stable color per name */
function hashToIndex(string_) {
  if (!string_ || typeof string_ !== 'string') return 0;
  let h = 0;
  for (let i = 0; i < string_.length; i++) {
    h = (h << 5) - h + string_.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getInitials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] || '?').toUpperCase();
  return (parts[0][0] + parts.at(-1)[0]).toUpperCase();
}

export function getAvatarStyle(nameOrIndex) {
  const index =
    typeof nameOrIndex === 'number' ? nameOrIndex : hashToIndex(String(nameOrIndex ?? ''));
  return AVATAR_STYLES[index % AVATAR_STYLES.length];
}

/** Weak/sales-owner style: single grey + inset shadow (no random color). */
const WEAK_STYLE = {
  bg: 'bg-bg-weak-100',
  text: 'text-text-main-900',
  shadow: 'shadow-[inset_0px_-8px_16px_0px_rgba(197,199,201,0.48)]',
};

/**
 * Colored avatar circle with image (when available) or initials and inset shadow (design spec).
 * Use name for stable color, or pass index for list position.
 * variant="weak" | "salesOwner": fixed grey style (bg-bg-weak-100 + inset shadow), no random color.
 */
export function CrmAccountAvatar({
  name,
  index,
  initials: initialsProperty,
  image,
  size = 24,
  className,
  variant,
  showNativeTitle = true,
}) {
  const [imgError, setImgError] = React.useState(false);
  const resolvedImage = React.useMemo(
    () => (image ? toAbsoluteAttachmentUrl(String(image)) : ''),
    [image],
  );
  React.useEffect(() => {
    setImgError(false);
  }, [resolvedImage]);
  const useWeak = variant === 'weak' || variant === 'salesOwner';
  const style = useWeak ? WEAK_STYLE : getAvatarStyle(typeof index === 'number' ? index : name);
  const initials = initialsProperty ?? getInitials(name);
  const showImage = Boolean(resolvedImage) && !imgError;

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-medium leading-4',
        !showImage && style.bg,
        !showImage && style.shadow,
        !showImage && style.text,
        className,
      )}
      style={{ width: size, height: size }}
      {...(showNativeTitle && name != null && String(name).trim() !== ''
        ? { title: String(name) }
        : {})}
    >
      {showImage ? (
        <img
          src={resolvedImage}
          alt={name || ''}
          className='size-full object-cover'
          onError={() => setImgError(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}

export default CrmAccountAvatar;
