import React, { useCallback } from 'react';

import * as LinkButton from '@/components/ui/link-button';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

import { releaseNoteAnchorId } from '@/components/release-note/utils';

/**
 * @param {{
 *   quickLinks: Array<{ id: string, label: string }>,
 *   activeNoteId?: string | null,
 *   onNavigate?: (noteId: string) => void,
 *   isDisabled?: boolean,
 * }} props
 */
const ReleaseNoteQuickLinks = ({
  quickLinks = [],
  activeNoteId = null,
  onNavigate,
  isDisabled = false,
}) => {
  const scrollToId = useCallback(
    (id) => {
      onNavigate?.(id);
      // eslint-disable-next-line unicorn/prefer-query-selector -- id is a sanitized anchor string
      const el = document.getElementById(releaseNoteAnchorId(id));
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [onNavigate],
  );

  if (quickLinks.length === 0) return null;

  return (
    <nav className='flex w-full min-w-0 flex-col gap-2' aria-label='On this page'>
      <span className='paragraph-sm font-semibold text-text-main-900'>On this page</span>
      <ul className='flex min-w-0 flex-col gap-0.5'>
        {quickLinks.map((link) => {
          const isActive = activeNoteId != null && link.id === activeNoteId;

          return (
            <li key={link.id} className='min-w-0'>
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger asChild>
                  <LinkButton.Root
                    type='button'
                    variant='gray'
                    size='small'
                    className={cn(
                      'h-auto w-full min-w-0 justify-start whitespace-normal border-l-2 py-1 pl-2 text-left text-paragraph-sm transition-colors',
                      'decoration-transparent underline-offset-2 hover:underline',
                      isActive
                        ? 'border-primary-base font-semibold text-primary-base'
                        : 'border-transparent text-text-sub-600 hover:text-text-main-900',
                    )}
                    disabled={isDisabled}
                    onClick={() => scrollToId(link.id)}
                    aria-current={isActive ? 'location' : undefined}
                  >
                    <span className='block max-w-full overflow-hidden text-left text-ellipsis whitespace-nowrap'>
                      {link.label}
                    </span>
                  </LinkButton.Root>
                </Tooltip.Trigger>
                <Tooltip.Content side='left' align='center' className='max-w-sm'>
                  <p className='break-words text-left'>{link.label}</p>
                </Tooltip.Content>
              </Tooltip.Root>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default ReleaseNoteQuickLinks;
