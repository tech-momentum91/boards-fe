'use client';

import { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';

import { Button } from '@/components/tiptap-ui-primitive/button';
import { CloseIcon } from '@/components/tiptap-icons/close-icon';
import { cn } from '@/utils/cn';
import { isValidPosition } from '@/lib/tiptap-utils';

import '@/components/tiptap-node/image-node/image-node.scss';

/**
 * Block image view with remove control (editable editors only).
 */
export function ImageNodeView(props) {
  const { node, editor, selected, deleteNode, getPos } = props;
  const { src, alt, title } = node.attrs;
  const [isRemoving, setIsRemoving] = useState(false);

  const removeNodeFromEditor = () => {
    if (typeof deleteNode === 'function') {
      deleteNode();
      return;
    }
    const pos = typeof getPos === 'function' ? getPos() : null;
    if (!isValidPosition(pos)) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .run();
  };

  const handleRemove = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isRemoving) return;

    const onRemoveImage = props?.extension?.options?.onRemoveImage;
    const onRemoveImageError = props?.extension?.options?.onRemoveImageError;

    if (typeof onRemoveImage === 'function' && src) {
      setIsRemoving(true);
      try {
        await onRemoveImage(src);
      } catch (error) {
        onRemoveImageError?.(error);
        setIsRemoving(false);
        return;
      }
      setIsRemoving(false);
    }

    removeNodeFromEditor();
  };

  return (
    <NodeViewWrapper
      className={cn('tiptap-image-with-remove', selected && 'tiptap-image-with-remove--selected')}
      data-drag-handle
    >
      <img src={src} alt={alt || ''} title={title || ''} draggable={false} />
      {editor.isEditable ? (
        <Button
          type='button'
          variant='ghost'
          className='tiptap-image-with-remove__dismiss'
          aria-label='Remove image'
          tooltip='Remove image'
          onClick={handleRemove}
          onMouseDown={(e) => e.preventDefault()}
          disabled={isRemoving}
        >
          <CloseIcon className='tiptap-image-with-remove__dismiss-icon' size='sm' />
        </Button>
      ) : null}
    </NodeViewWrapper>
  );
}
