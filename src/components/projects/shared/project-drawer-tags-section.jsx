import React, { useEffect, useRef, useState } from 'react';
import { RiAddLine, RiCheckLine, RiCloseLine, RiPriceTag3Line } from 'react-icons/ri';
import { mergeUniqueTags, parseCommaSeparatedTags } from '@/components/projects/shared/tag-utils';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import * as Tag from '@/components/ui/tag';

export default function ProjectDrawerTagsSection({ tags = [], onTagsChange, resetKey }) {
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setIsAddingTag(false);
    setNewTag('');
  }, [resetKey]);

  const cancelAddTag = () => {
    setIsAddingTag(false);
    setNewTag('');
  };

  const confirmAddTag = () => {
    const parsedTags = parseCommaSeparatedTags(newTag);
    if (parsedTags.length === 0) return;

    const existing = Array.isArray(tags) ? tags : [];
    const merged = mergeUniqueTags(existing, parsedTags);

    if (merged.length === existing.length) {
      cancelAddTag();
      return;
    }

    onTagsChange?.(merged);
    cancelAddTag();
  };

  const removeTag = (tagToRemove) => {
    const existing = Array.isArray(tags) ? tags : [];
    onTagsChange?.(existing.filter((tag) => tag !== tagToRemove));
  };

  return (
    <section className='mt-6'>
      <div className='mb-3 flex items-center gap-2 text-label-md text-text-sub-500'>
        <RiPriceTag3Line className='size-5 text-text-soft-400' />
        Tags
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        {(tags ?? []).map((tag) => (
          <Tag.Root key={tag} variant='stroke' className='h-5 rounded-full px-2'>
            {tag}
            <Tag.DismissButton type='button' onClick={() => removeTag(tag)} />
          </Tag.Root>
        ))}
      </div>
      {isAddingTag ? (
        <div className='mt-2 flex items-center gap-2'>
          <Input.Root size='xsmall' variant='borderless' className='max-w-[220px] flex-1'>
            <Input.Wrapper>
              <Input.Input
                ref={inputRef}
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    confirmAddTag();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelAddTag();
                  }
                }}
                placeholder='Add tag(s), comma separated'
              />
            </Input.Wrapper>
          </Input.Root>
          <Button.Root
            type='button'
            variant='neutral'
            mode='ghost'
            size='xsmall'
            onClick={cancelAddTag}
            aria-label='Discard tag'
          >
            <Button.Icon as={RiCloseLine} />
          </Button.Root>
          <Button.Root
            type='button'
            variant='neutral'
            mode='ghost'
            size='xsmall'
            onClick={confirmAddTag}
            disabled={!newTag.trim()}
            aria-label='Add tag'
          >
            <Button.Icon as={RiCheckLine} />
          </Button.Root>
        </div>
      ) : (
        <LinkButton.Root
          variant='primary'
          size='small'
          underline
          type='button'
          className='mt-2 w-fit gap-1'
          onClick={() => {
            setIsAddingTag(true);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          <LinkButton.Icon as={RiAddLine} />
          Add New Tag
        </LinkButton.Root>
      )}
    </section>
  );
}
