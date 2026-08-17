import React, { useEffect, useRef, useState } from 'react';
import { RiStickyNoteLine } from 'react-icons/ri';

import { updateProductFields } from '@/api/products';
import * as Textarea from '@/components/ui/textarea';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

export default function ProductDetailDescription({
  productId,
  description = '',
  onProductUpdated,
  onDescriptionSaved,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(description);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef(null);

  const trimmedDescription = String(description || '').trim();
  const hasDescription = Boolean(trimmedDescription);

  useEffect(() => {
    setDraft(description || '');
    setIsEditing(false);
  }, [description, productId]);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const nextValue = draft.trim();
    if (nextValue === trimmedDescription) {
      setIsEditing(false);
      return;
    }

    if (!productId) {
      showErrorToast('Product not found.');
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateProductFields(productId, { description: nextValue });
      onProductUpdated?.(result.product);
      onDescriptionSaved?.(result.product, nextValue);
      showSuccessToast(nextValue ? 'Description updated' : 'Description removed');
      setIsEditing(false);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to save description.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <Textarea.Root
        ref={textareaRef}
        size='medium'
        value={draft}
        disabled={isSaving}
        placeholder='Type here...'
        rows={4}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={handleSave}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setDraft(description || '');
            setIsEditing(false);
          }
        }}
      />
    );
  }

  if (hasDescription) {
    return (
      <button
        type='button'
        onClick={() => setIsEditing(true)}
        className='w-full cursor-pointer rounded-lg border border-transparent py-1.5 pl-2 pr-1.5 text-left hover:border-stroke-sub-300'
      >
        <p className='text-label-sm font-medium text-text-soft-400'>{trimmedDescription}</p>
      </button>
    );
  }

  return (
    <button
      type='button'
      onClick={() => setIsEditing(true)}
      className='flex w-full cursor-pointer items-center gap-1.5 rounded-lg border border-transparent py-1.5 pl-2 pr-1.5 text-left hover:border-stroke-sub-300'
    >
      <RiStickyNoteLine className='size-5 shrink-0 text-text-soft-400' aria-hidden />
      <span className='text-paragraph-md text-text-soft-400'>Add description</span>
    </button>
  );
}
