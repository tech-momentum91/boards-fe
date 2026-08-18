import { RiLinkM } from 'react-icons/ri';
import * as LinkButton from '@/components/ui/link-button';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

export default function CopyLinkButton({
  link,
  disabled = false,
  className,
  title = 'Copy Link',
  successMessage = 'Link copied to clipboard.',
  errorMessage = 'Could not copy link.',
  onCopied,
  onCopy,
}) {
  const handleClick = async (event) => {
    if (disabled) {
      return;
    }

    if (onCopy) {
      await onCopy(event);
      return;
    }

    const resolvedLink = typeof link === 'function' ? link() : link;
    if (!resolvedLink) {
      showErrorToast(errorMessage);
      return;
    }

    try {
      await navigator.clipboard.writeText(resolvedLink);
      showSuccessToast(successMessage);
      onCopied?.();
    } catch {
      showErrorToast(errorMessage);
    }
  };

  return (
    <LinkButton.Root
      type='button'
      variant='primary'
      size='small'
      underline
      disabled={disabled}
      className={className}
      onClick={handleClick}
      title={title}
      aria-label={title}
    >
      <LinkButton.Icon as={RiLinkM} />
      Copy Link
    </LinkButton.Root>
  );
}
