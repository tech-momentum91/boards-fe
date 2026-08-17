import React, { useMemo } from 'react';
import { RiEditLine } from 'react-icons/ri';

import ReleaseNoteHtmlContent from '@/components/release-note/release-note-html-content';
import {
  normalizeReleaseNoteModules,
  normalizeReleaseNoteTypes,
  releaseNoteAnchorId,
  resolveReleaseTypePresentation,
} from '@/components/release-note/utils';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';

/**
 * @param {{
 *   note: {
 *     id: string,
 *     title?: string,
 *     description?: string,
 *     release_date?: string,
 *     modules?: string[],
 *     type?: string[],
 *     release_type?: string,
 *     is_published?: boolean,
 *   },
 *   canEdit?: boolean,
 *   onEdit?: (note: object) => void,
 * }} props
 */
const ReleaseNoteListCard = ({ note, canEdit = false, onEdit }) => {
  const anchorId = useMemo(() => releaseNoteAnchorId(note?.id), [note?.id]);

  const uniqueReleaseTypeLabels = useMemo(() => {
    const raw = normalizeReleaseNoteTypes(note?.type ?? note?.release_type);
    return [...new Set(raw.map((t) => resolveReleaseTypePresentation(t).label))];
  }, [note?.type, note?.release_type]);

  const uniqueModules = useMemo(() => {
    const list = normalizeReleaseNoteModules(note?.modules);
    return [...new Set(list)];
  }, [note?.modules]);

  const showMeta = uniqueReleaseTypeLabels.length > 0 || uniqueModules.length > 0;

  return (
    <article id={anchorId} className='scroll-mt-24 flex w-full flex-col gap-4'>
      <div className='flex w-full flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <span className='title-h5 text-text-main-900'>{note?.title ?? 'Untitled'}</span>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          {canEdit ? (
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              className='gap-1.5 '
              onClick={() => onEdit?.(note)}
              aria-label='Edit release note'
            >
              <Button.Icon as={RiEditLine} />
            </Button.Root>
          ) : null}
        </div>
      </div>

      {showMeta ? (
        <div className='flex flex-col gap-3'>
          {uniqueReleaseTypeLabels.length > 0 ? (
            <div className='flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3'>
              <span className='shrink-0 text-label-xs font-medium text-text-sub-600'>Types</span>
              <div className='flex min-w-0 flex-wrap gap-1.5'>
                {uniqueReleaseTypeLabels.map((label) => {
                  const { color, Icon } = resolveReleaseTypePresentation(label);
                  return (
                    <Badge.Root
                      key={`${anchorId}-type-${label}`}
                      variant='light'
                      color={color}
                      size='medium'
                      className='rounded-lg ring-1 ring-inset ring-stroke-soft-200 px-2 py-1'
                    >
                      <Badge.Icon as={Icon} />
                      {label}
                    </Badge.Root>
                  );
                })}
              </div>
            </div>
          ) : null}

          {uniqueModules.length > 0 ? (
            <div className='flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3'>
              <span className='shrink-0 text-label-xs font-medium text-text-sub-600'>Modules</span>
              <div className='flex min-w-0 flex-wrap gap-1.5'>
                {uniqueModules.map((item) => (
                  <Badge.Root
                    key={`${anchorId}-module-${item}`}
                    variant='light'
                    color='sky'
                    size='medium'
                    className='rounded-full'
                  >
                    {item}
                  </Badge.Root>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <ReleaseNoteHtmlContent html={note?.description ?? ''} />
    </article>
  );
};

export default ReleaseNoteListCard;
