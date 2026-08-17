import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageNodeView } from '@/components/tiptap-node/image-node/image-node';

/**
 * Block image with {@link ImageNodeView} — includes a corner remove control when the editor is editable.
 */
export const ImageWithRemove = Image.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      onRemoveImage: undefined,
      onRemoveImageError: undefined,
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

export default ImageWithRemove;
