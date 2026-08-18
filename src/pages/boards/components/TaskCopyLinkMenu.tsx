import { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { RiDeleteBin6Line, RiLinkM, RiGlobalLine } from 'react-icons/ri';
import * as Dropdown from '@/components/ui/dropdown';
import * as LinkButton from '@/components/ui/link-button';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  createTaskShareLink,
  disableTaskShareLink,
  getTaskShareLink,
} from '@/services/task-share-service';

function formatExpiryLabel(expiresOn) {
  if (!expiresOn) {
    return '';
  }

  try {
    const date = typeof expiresOn === 'string' ? parseISO(expiresOn.replace(' ', 'T')) : expiresOn;
    if (Number.isNaN(date?.getTime?.() ?? Number.NaN)) {
      return '';
    }
    return `Expires ${format(date, 'MMM d, yyyy')}`;
  } catch {
    return '';
  }
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

export default function TaskCopyLinkMenu({ taskId, disabled = false }) {
  const [shareLink, setShareLink] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadShareLink = useCallback(async () => {
    if (!taskId) {
      setShareLink(null);
      return;
    }

    const result = await getTaskShareLink(taskId);
    if (result.error) {
      setShareLink(null);
      return;
    }

    setShareLink(result.data);
  }, [taskId]);

  useEffect(() => {
    loadShareLink();
  }, [loadShareLink]);

  const handleCopyLink = async (event) => {
    event.preventDefault();
    try {
      await copyText(window.location.href);
      showSuccessToast('Task link copied to clipboard');
    } catch {
      showErrorToast('Could not copy task link');
    }
  };

  const handlePublicLink = async (event) => {
    event.preventDefault();
    if (!taskId || isBusy) {
      return;
    }

    setIsBusy(true);
    try {
      let link = shareLink;
      if (!link?.url) {
        const result = await createTaskShareLink(taskId);
        if (result.error) {
          showErrorToast(result.error);
          return;
        }
        link = result.data;
        setShareLink(link);
      }

      if (!link?.url) {
        showErrorToast('Could not copy public link');
        return;
      }

      await copyText(link.url);
      showSuccessToast('Public link copied to clipboard');
    } catch {
      showErrorToast('Could not copy public link');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemovePublicLink = async (event) => {
    event.preventDefault();
    if (!taskId || isBusy) {
      return;
    }

    setIsBusy(true);
    try {
      const result = await disableTaskShareLink(taskId);
      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      setShareLink(null);
      showSuccessToast('Public link removed');
    } catch {
      showErrorToast('Could not remove public link');
    } finally {
      setIsBusy(false);
    }
  };

  const expiryLabel = formatExpiryLabel(shareLink?.expiresOn);

  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild disabled={disabled || isBusy}>
        <LinkButton.Root
          type='button'
          variant='primary'
          size='small'
          underline
          disabled={disabled || isBusy}
          title='Copy link'
          aria-label='Copy link'
        >
          <LinkButton.Icon as={RiLinkM} />
          Copy Link
        </LinkButton.Root>
      </Dropdown.Trigger>

      <Dropdown.Content align='end' className='w-[240px]'>
        <Dropdown.Item onSelect={handleCopyLink} disabled={isBusy}>
          <Dropdown.ItemIcon as={RiLinkM} />
          Copy link
        </Dropdown.Item>

        <Dropdown.Item onSelect={handlePublicLink} disabled={isBusy}>
          <Dropdown.ItemIcon as={RiGlobalLine} />
          <span className='flex min-w-0 flex-1 flex-col items-start gap-0.5'>
            <span>Public link</span>
            {expiryLabel ? (
              <span className='text-paragraph-xs text-text-soft-400'>{expiryLabel}</span>
            ) : null}
          </span>
        </Dropdown.Item>

        {shareLink?.url ? (
          <>
            <Dropdown.Separator />
            <Dropdown.Item
              onSelect={handleRemovePublicLink}
              disabled={isBusy}
              className='text-error-base data-[highlighted]:text-error-base'
            >
              <Dropdown.ItemIcon as={RiDeleteBin6Line} className='text-error-base' />
              Remove public link
            </Dropdown.Item>
          </>
        ) : null}
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
