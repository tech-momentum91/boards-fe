import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiCloseLine } from 'react-icons/ri';

import {
  copyTextToClipboard,
  createProposalShareLink,
  disableProposalShareLink,
  formatShareLinkError,
  listProposalShareLinks,
  resolvePublicProposalShareUrl,
  updateProposalShareLinkExpiry,
} from '@/api/crmProposalShare';
import * as Button from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/datetimepicker';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

function pickActiveLink(links) {
  return links.find((link) => link.enabled && !link.expired) ?? null;
}

function parseExpiryDate(iso) {
  if (!iso) return undefined;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default function ProposalSharePopover({
  children,
  proposalId,
  activeVersionId = null,
  readOnly = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expiresAt, setExpiresAt] = useState(undefined);

  const activeLink = useMemo(() => pickActiveLink(links), [links]);
  const shareUrl = useMemo(
    () => resolvePublicProposalShareUrl(activeLink, proposalId),
    [activeLink, proposalId],
  );

  const refreshLinks = useCallback(async () => {
    if (!proposalId) return;
    setLoading(true);
    try {
      const rows = await listProposalShareLinks(proposalId);
      setLinks(rows);
      const current = pickActiveLink(rows);
      setExpiresAt(parseExpiryDate(current?.expires_on));
    } catch (error) {
      showErrorToast(formatShareLinkError(error));
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    if (!open || !proposalId) return;
    refreshLinks();
  }, [open, proposalId, refreshLinks]);

  const handleCreateLink = async () => {
    if (!proposalId || readOnly || creating) return;
    setCreating(true);
    try {
      const created = await createProposalShareLink(proposalId, {
        proposalVersion: activeVersionId,
      });
      await refreshLinks();
      const createdUrl = resolvePublicProposalShareUrl(created, proposalId);
      if (createdUrl) {
        await copyTextToClipboard(createdUrl);
        showSuccessToast('Link created and copied');
      } else {
        showSuccessToast('Share link created');
      }
    } catch (error) {
      showErrorToast(formatShareLinkError(error));
    } finally {
      setCreating(false);
    }
  };

  const applyExpiry = useCallback(
    async (nextDate) => {
      if (!proposalId || readOnly || !activeLink) return;
      const nextIso = nextDate ? nextDate.toISOString() : null;
      const currentIso = activeLink.expires_on
        ? new Date(activeLink.expires_on).toISOString()
        : null;
      if (nextIso === currentIso) return;

      setBusy(true);
      try {
        await updateProposalShareLinkExpiry(activeLink.name, nextIso);
        showSuccessToast(nextIso ? 'Link expiry updated' : 'Expiry removed');
        await refreshLinks();
      } catch (error) {
        showErrorToast(formatShareLinkError(error));
      } finally {
        setBusy(false);
      }
    },
    [proposalId, readOnly, activeLink, refreshLinks],
  );

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await copyTextToClipboard(shareUrl);
      showSuccessToast('Link copied');
    } catch {
      showErrorToast('Could not copy link');
    }
  };

  const handleDisable = async () => {
    if (!activeLink || readOnly) return;
    setBusy(true);
    try {
      await disableProposalShareLink(activeLink.name);
      showSuccessToast('Link disabled');
      setExpiresAt(undefined);
      await refreshLinks();
    } catch (error) {
      showErrorToast(formatShareLinkError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleExpiryChange = async (date) => {
    setExpiresAt(date);
    await applyExpiry(date);
  };

  const handleClearExpiry = async () => {
    setExpiresAt(undefined);
    await applyExpiry(null);
  };

  const hasExpiry = Boolean(activeLink?.expires_on || expiresAt);

  const urlLabel = (() => {
    if (loading) return 'Loading…';
    if (creating) return 'Creating link…';
    if (shareUrl) return shareUrl;
    return 'No active link';
  })();

  const showLinkSettings = !readOnly && activeLink && !loading && !creating;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        {children}
      </Popover.Trigger>
      <Popover.Content
        align='end'
        side='bottom'
        sideOffset={8}
        showArrow={false}
        className='w-[400px] overflow-hidden rounded-2xl p-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className='flex items-center gap-3 border-b border-stroke-soft-200 px-5 py-4'>
          <p className='flex-1 text-label-lg text-text-main-900'>Share Proposal</p>
          <Popover.Close
            unstyled
            className='flex size-6 items-center justify-center rounded-md text-icon-sub-500 hover:bg-bg-weak-50'
            aria-label='Close'
          >
            <RiCloseLine className='size-5' />
          </Popover.Close>
        </div>

        <div className='flex flex-col gap-4 p-5'>
          <div className='flex items-center gap-2 rounded-lg bg-bg-weak-100 py-2 pl-3 pr-2'>
            <p
              className={cn(
                'min-w-0 flex-1 truncate text-paragraph-small',
                shareUrl ? 'text-text-main-900' : 'text-text-soft-400',
              )}
              title={shareUrl || undefined}
            >
              {urlLabel}
            </p>
            {shareUrl ? (
              <button
                type='button'
                className={cn(
                  'shrink-0 text-label-xs font-medium text-primary-base',
                  (loading || creating) && 'pointer-events-none opacity-50',
                )}
                disabled={loading || creating}
                onClick={handleCopy}
              >
                Copy link
              </button>
            ) : null}
          </div>

          {!readOnly && !loading && !activeLink ? (
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              className='w-full'
              disabled={creating || busy}
              onClick={handleCreateLink}
            >
              {creating ? 'Creating…' : 'Create link'}
            </Button.Root>
          ) : null}

          {showLinkSettings ? (
            <div className='space-y-3'>
              <div>
                <p className='mb-2 text-label-sm font-semibold text-text-main-900'>Link expires</p>
                <DateTimePicker
                  value={expiresAt}
                  onChange={handleExpiryChange}
                  placeholder='No expiry'
                  disabled={busy}
                  minDate={new Date()}
                />
                <p className='mt-1.5 text-[11px] leading-4 text-text-soft-400'>
                  Leave empty for no expiry. Disable anytime.
                </p>
                {hasExpiry ? (
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='xsmall'
                    className='mt-2'
                    disabled={busy}
                    onClick={handleClearExpiry}
                  >
                    Remove expiry
                  </Button.Root>
                ) : null}
              </div>

              <Button.Root
                type='button'
                variant='error'
                mode='stroke'
                size='small'
                className='w-full'
                disabled={busy}
                onClick={handleDisable}
              >
                Disable link
              </Button.Root>
            </div>
          ) : null}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
