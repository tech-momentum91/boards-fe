'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';

// --- Tiptap Core Extensions ---
import { StarterKit } from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Selection } from '@tiptap/extensions';

// --- UI Primitives ---
import { Button } from '@/components/tiptap-ui-primitive/button';
import { Spacer } from '@/components/tiptap-ui-primitive/spacer';
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '@/components/tiptap-ui-primitive/toolbar';

// --- Tiptap Node ---
import { ImageWithRemove } from '@/components/tiptap-node/image-node/custom-image-extension';
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension';
import { HorizontalRule } from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension';
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss';
import '@/components/tiptap-node/code-block-node/code-block-node.scss';
import '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/heading-node/heading-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';

// --- Tiptap UI ---
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu';
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button';
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu';
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button';
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button';
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from '@/components/tiptap-ui/color-highlight-popover';
import { LinkPopover, LinkContent, LinkButton } from '@/components/tiptap-ui/link-popover';
import { MarkButton } from '@/components/tiptap-ui/mark-button';
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button';
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button';

// --- Icons ---
import { ArrowLeftIcon } from '@/components/tiptap-icons/arrow-left-icon';
import { HighlighterIcon } from '@/components/tiptap-icons/highlighter-icon';
import { LinkIcon } from '@/components/tiptap-icons/link-icon';

// --- Hooks ---
import { useIsBreakpoint } from '@/hooks/use-is-breakpoint';
import { useWindowSize } from '@/hooks/use-window-size';
import { useCursorVisibility } from '@/hooks/use-cursor-visibility';

// --- Components ---
import { ThemeToggle } from '@/components/tiptap-templates/simple/theme-toggle';

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from '@/lib/tiptap-utils';

// --- Styles ---
import '@/components/tiptap-templates/simple/simple-editor.scss';

import { cn } from '@/utils/cn';
import content from '@/components/tiptap-templates/simple/data/content.json';

const EMBED_EMPTY_DOC = '<p></p>';

const getEmbedInitialContent = (value) => {
  if (value == null || (typeof value === 'string' && !value.trim())) {
    return EMBED_EMPTY_DOC;
  }
  return typeof value === 'string' ? value : EMBED_EMPTY_DOC;
};

const imageToolbar = (embed) => (
  <ToolbarGroup>
    <ImageUploadButton text={embed ? 'Image' : 'Add'} />
  </ToolbarGroup>
);

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
  showThemeToggle = true,
  embed = false,
}) => {
  return (
    <>
      <Spacer />
      <ToolbarGroup>
        <UndoRedoButton action='undo' />
        <UndoRedoButton action='redo' />
      </ToolbarGroup>
      <ToolbarSeparator />
      {embed ? (
        <>
          {imageToolbar(true)}
          <ToolbarSeparator />
        </>
      ) : null}
      <ToolbarGroup>
        <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
        <ListDropdownMenu modal={false} types={['bulletList', 'orderedList', 'taskList']} />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type='bold' />
        <MarkButton type='italic' />
        <MarkButton type='strike' />
        <MarkButton type='code' />
        <MarkButton type='underline' />
        {isMobile ? (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        ) : (
          <ColorHighlightPopover />
        )}
        {isMobile ? <LinkButton onClick={onLinkClick} /> : <LinkPopover />}
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type='superscript' />
        <MarkButton type='subscript' />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <TextAlignButton align='left' />
        <TextAlignButton align='center' />
        <TextAlignButton align='right' />
        <TextAlignButton align='justify' />
      </ToolbarGroup>
      {embed ? null : (
        <>
          <ToolbarSeparator />
          {imageToolbar(false)}
        </>
      )}
      <Spacer />
      {isMobile && <ToolbarSeparator />}
      {showThemeToggle ? (
        <ToolbarGroup>
          <ThemeToggle />
        </ToolbarGroup>
      ) : null}
    </>
  );
};

const MobileToolbarContent = ({ type, onBack }) => (
  <>
    <ToolbarGroup>
      <Button variant='ghost' onClick={onBack}>
        <ArrowLeftIcon className='tiptap-button-icon' />
        {type === 'highlighter' ? (
          <HighlighterIcon className='tiptap-button-icon' />
        ) : (
          <LinkIcon className='tiptap-button-icon' />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === 'highlighter' ? <ColorHighlightPopoverContent /> : <LinkContent />}
  </>
);

/**
 * @param {object} [props]
 * @param {boolean} [props.embed] — Use embedded layout (drawer/form) instead of full-page demo
 * @param {string} [props.value] — HTML string (controlled via parent remount key, not on every change)
 * @param {(html: string) => void} [props.onChange] — Emits updated HTML
 * @param {boolean} [props.hasError] — Form error state (styling in parent; optional a11y)
 * @param {string} [props.className] — Extra class on the outer wrapper
 * @param {(file: File, onProgress?: (event: { progress: number }) => void, signal?: AbortSignal) => Promise<string>} [props.imageUploadHandler]
 * @param {(src: string) => Promise<void>} [props.imageDeleteHandler]
 */
export function SimpleEditor({
  embed = false,
  value,
  onChange,
  hasError = false,
  className,
  imageUploadHandler,
  imageDeleteHandler,
} = {}) {
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = useState('main');
  const toolbarRef = useRef(null);
  const isFormMode = Boolean(onChange) || embed;
  const pinToolbarToEditor = embed;

  const initialContent = isFormMode ? getEmbedInitialContent(value) : content;

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
        'aria-label': embed
          ? 'Release description, rich text'
          : 'Main content area, start typing to enter text.',
        class: 'simple-editor',
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      ImageWithRemove.configure({
        onRemoveImage: imageDeleteHandler,
      }),
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: 'image/*',
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: imageUploadHandler ?? handleImageUpload,
        onError: () => {
          // Upload failed — replace handleImageUpload in tiptap-utils to surface toasts
        },
      }),
    ],
    content: initialContent,
    onUpdate: isFormMode
      ? ({ editor: e }) => {
          onChange?.(e.getHTML());
        }
      : undefined,
  });

  const rect = useCursorVisibility({
    editor,
    overlayHeight: pinToolbarToEditor
      ? 0
      : (toolbarRef.current?.getBoundingClientRect().height ?? 0),
  });

  useEffect(() => {
    if (!isMobile && mobileView !== 'main') {
      setMobileView('main');
    }
  }, [isMobile, mobileView]);

  const body = (
    <div className='simple-editor-wrapper'>
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={
            isMobile && !pinToolbarToEditor
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : undefined
          }
        >
          {mobileView === 'main' ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView('highlighter')}
              onLinkClick={() => setMobileView('link')}
              isMobile={isMobile}
              showThemeToggle={!embed}
              embed={embed}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === 'highlighter' ? 'highlighter' : 'link'}
              onBack={() => setMobileView('main')}
            />
          )}
        </Toolbar>

        <EditorContent editor={editor} role='presentation' className='simple-editor-content ' />
      </EditorContext.Provider>
    </div>
  );

  if (isFormMode) {
    return (
      <div
        className={cn(
          'tiptap-embed',
          hasError && 'ring-1 ring-inset ring-error-base rounded-lg',
          className,
        )}
      >
        {body}
      </div>
    );
  }

  return body;
}
