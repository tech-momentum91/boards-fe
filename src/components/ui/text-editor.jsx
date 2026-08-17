import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { EditorContent, ReactRenderer, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import * as Avatar from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import * as CompactButton from '@/components/ui/compact-button';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';

const MentionList = React.forwardRef(
  ({ items = [], command, onLoadMore, mentionStateRef }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollContainerRef = useRef(null);
    const [scrollContainerEl, setScrollContainerEl] = useState(null);

    useEffect(() => {
      setScrollContainerEl(scrollContainerRef.current);
    }, []);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = (index) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    };

    const { hasMore, loadingMore } = mentionStateRef?.current || {};

    const { renderSentinel } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore,
      isLoading: loadingMore,
      threshold: 200,
      scrollContainer: scrollContainerEl,
      enabled: Boolean(onLoadMore),
    });

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex((previous) => (previous - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex((previous) => (previous + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    return (
      <div
        ref={scrollContainerRef}
        className='min-w-[320px] max-w-[360px] max-h-[250px] overflow-y-auto rounded-2xl bg-bg-white-0 shadow-regular-md ring-1 ring-stroke-soft-200 p-1.5'
      >
        <div className='space-y-1'>
          {items.length === 0 && !loadingMore ? (
            <div className='px-3 py-2 text-sm text-text-soft-400 text-center'>No users found</div>
          ) : (
            <>
              {items.map((item, index) => {
                const name = item.label || item.name || item.email || item.id || 'User';
                const role =
                  item.user_role ||
                  (item.roles && item.roles.length > 0 ? item.roles[0] : item.role);
                return (
                  <button
                    key={item.id || `${name}-${index}`}
                    type='button'
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => selectItem(index)}
                    className={cn(
                      'group/item relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg p-2',
                      'text-paragraph-sm text-text-strong-950 outline-none',
                      'transition duration-200 ease-out',
                      'bg-bg-white-0 hover:bg-bg-weak-50',
                      index === selectedIndex && 'bg-bg-weak-50',
                    )}
                  >
                    <Avatar.Root size={32} color='gray'>
                      {item.image ? (
                        <Avatar.Image src={item.image} alt={name} />
                      ) : (
                        <span className='text-label-xs'>
                          {(name && name.charAt(0).toUpperCase()) || 'U'}
                        </span>
                      )}
                    </Avatar.Root>
                    <div className='flex flex-1 flex-col'>
                      <span className='text-paragraph-sm text-text-main-900 text-start'>
                        {name}
                      </span>
                      {role && (
                        <span className='text-label-xs text-text-soft-400 text-start'>{role}</span>
                      )}
                    </div>
                  </button>
                );
              })}
              {loadingMore && (
                <div className='px-3 py-2 text-sm text-text-soft-400 text-center'>
                  Loading more...
                </div>
              )}
              {renderSentinel()}
            </>
          )}
        </div>
      </div>
    );
  },
);

MentionList.displayName = 'MentionList';

const normalizeMentionItem = (item) => {
  if (!item) return null;
  const id = item.id || item.value || item.name || item.email || item.label;
  const label = item.label || item.full_name || item.name || item.email || item.value || 'User';
  return {
    id,
    label,
    name: item.name || item.full_name || label,
    email: item.email,
    image: item.image || item.avatar || item.user_image || null,
    user_role: item.user_role || (item.roles && item.roles[0]) || null,
  };
};

const createMentionSuggestion = ({
  getLatestProps,
  lastResultsRef,
  mentionStateRef,
  reactRendererRef,
  mentionOpenRef,
}) => {
  return {
    char: '@',
    items: async ({ query }) => {
      const latestProps = getLatestProps();
      if (!latestProps.onSearchMentions) return [];

      if (latestProps.mentionUsers) {
        const results = await latestProps.onSearchMentions(query || '');
        lastResultsRef.current = results || [];
        return (results || []).map(normalizeMentionItem).filter(Boolean);
      }

      const results = await latestProps.onSearchMentions(query || '');
      return (results || []).map(normalizeMentionItem).filter(Boolean);
    },
    render: () => {
      let reactRenderer;
      let popup;

      return {
        onStart: (props) => {
          if (mentionOpenRef) mentionOpenRef.current = true;
          const latestProps = getLatestProps();
          const items =
            lastResultsRef.current.length > 0
              ? lastResultsRef.current
              : latestProps.mentionUsers || [];

          reactRenderer = new ReactRenderer(MentionList, {
            props: {
              ...props,
              items: items.map(normalizeMentionItem).filter(Boolean),
              onLoadMore: latestProps.onLoadMoreMentions,
              mentionStateRef,
            },
            editor: props.editor,
          });

          reactRendererRef.current = reactRenderer;

          if (!props.clientRect) return;

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: reactRenderer.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            maxWidth: 'none',
            theme: 'mention',
            offset: [0, 8],
          });
        },
        onUpdate: (props) => {
          const latestProps = getLatestProps();
          const items =
            lastResultsRef.current.length > 0
              ? lastResultsRef.current
              : latestProps.mentionUsers || [];

          reactRenderer.updateProps({
            ...props,
            items: items.map(normalizeMentionItem).filter(Boolean),
            onLoadMore: latestProps.onLoadMoreMentions,
            mentionStateRef,
          });

          if (!props.clientRect) return;

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect,
          });
        },
        onKeyDown: (props) => {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide();
            return true;
          }
          return reactRenderer?.ref?.onKeyDown(props);
        },
        onExit: () => {
          if (mentionOpenRef) mentionOpenRef.current = false;
          lastResultsRef.current = [];
          reactRendererRef.current = null;
          popup?.[0]?.destroy();
          reactRenderer?.destroy();
        },
      };
    },
  };
};

const TextEditor = ({
  value = '',
  onChange,
  placeholder = 'Write a comment...',
  className,
  editorClassName,
  toolbarClassName,
  onFocus,
  onBlur,
  onKeyDown,
  enableMentions = false,
  onSearchMentions,
  mentionUsers,
  hasMoreMentions,
  loadingMoreMentions,
  onLoadMoreMentions,
  inboxToolbar = false,
  showFormattingToolbar = true,
  showMentionInToolbar = true,
  editorInstanceRef,
}) => {
  const editorRef = useRef(null);
  const isInternalUpdateRef = useRef(false);
  // Tracks whether the @mention popup is open, so Enter selects a mention
  // instead of submitting/inserting a newline.
  const mentionOpenRef = useRef(false);
  const isInboxMode = inboxToolbar === true;
  const showFormatting = isInboxMode ? false : showFormattingToolbar;
  const showMentionButton = isInboxMode ? false : showMentionInToolbar;

  const latestPropsRef = useRef({
    onSearchMentions,
    mentionUsers,
    hasMoreMentions,
    loadingMoreMentions,
    onLoadMoreMentions,
  });

  const lastResultsRef = useRef([]);
  const reactRendererRef = useRef(null);

  const mentionStateRef = useRef({ hasMore: false, loadingMore: false });

  useEffect(() => {
    latestPropsRef.current = {
      onSearchMentions,
      mentionUsers,
      hasMoreMentions,
      loadingMoreMentions,
      onLoadMoreMentions,
    };
  }, [onSearchMentions, mentionUsers, hasMoreMentions, loadingMoreMentions, onLoadMoreMentions]);

  useEffect(() => {
    lastResultsRef.current = mentionUsers || [];
    if (reactRendererRef.current) {
      const latestProps = latestPropsRef.current;
      reactRendererRef.current.updateProps({
        items: (mentionUsers || []).map(normalizeMentionItem).filter(Boolean),
        onLoadMore: latestProps.onLoadMoreMentions,
        mentionStateRef,
      });
    }
  }, [mentionUsers]);

  useEffect(() => {
    mentionStateRef.current = {
      hasMore: hasMoreMentions,
      loadingMore: loadingMoreMentions,
    };
  }, [hasMoreMentions, loadingMoreMentions]);

  const suggestionConfig = useMemo(
    () =>
      enableMentions
        ? createMentionSuggestion({
            getLatestProps: () => latestPropsRef.current,
            lastResultsRef,
            mentionStateRef,
            reactRendererRef,
            mentionOpenRef,
          })
        : null,
    [enableMentions],
  );

  // Re-create the editor when enableMentions changes to ensure extensions are updated
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          paragraph: {
            HTMLAttributes: {
              class: 'paragraph-small',
            },
          },
          ...(showFormatting ? {} : { bold: false, italic: false }),
        }),
        ...(enableMentions
          ? [
              Mention.configure({
                HTMLAttributes: {
                  class: 'mention',
                  'data-mention': 'true',
                },
                renderText({ options, node }) {
                  return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
                },
                suggestion: suggestionConfig,
              }),
            ]
          : []),
      ],
      content: value || '',
      editorProps: {
        attributes: {
          class: cn(
            'min-h-16 max-h-40 w-full overflow-y-auto rounded-none bg-transparent outline-none',
            'text-sm text-text-main-900',
            editorClassName,
          ),
        },
        // Let TipTap handle keys normally, except when mention popup is open
        handleKeyDown: (_, event) => {
          if (event.key === 'Enter' && !event.shiftKey && mentionOpenRef.current) {
            return false; // Let Mention extension handle Enter for selection
          }
          return false;
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        if (!currentEditor || currentEditor.isDestroyed) return;
        try {
          isInternalUpdateRef.current = true;
          onChange?.(currentEditor.getHTML());
        } catch {
          // Editor can be torn down mid-update during drawer/route transitions.
        } finally {
          queueMicrotask(() => {
            isInternalUpdateRef.current = false;
          });
        }
      },
    },
    [enableMentions],
  ); // Add enableMentions as a dependency to re-create the editor when it changes

  useEffect(() => {
    editorRef.current = editor;
    if (editorInstanceRef && typeof editorInstanceRef === 'object') {
      editorInstanceRef.current = editor;
    }

    // Add native keydown listener directly to editor element
    if (editor && !editor.isDestroyed) {
      const editorElement = editor.options.element;
      if (!editorElement) return undefined;

      const handleNativeKeyDown = (event) => {
        // While the @mention popup is open, let the suggestion plugin handle Enter
        if (event.key === 'Enter' && !event.shiftKey && mentionOpenRef.current) {
          return;
        }
        // Call our consumer's onKeyDown
        onKeyDown?.(event);
      };
      editorElement.addEventListener('keydown', handleNativeKeyDown, true); // Use capture phase

      return () => {
        editorElement.removeEventListener('keydown', handleNativeKeyDown, true);
      };
    }

    return undefined;
  }, [editor, editorInstanceRef, onKeyDown]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || isInternalUpdateRef.current) return;

    try {
      const current = editor.getHTML();
      if (value !== undefined && value !== current) {
        editor.commands.setContent(value || '', { emitUpdate: false });
      }
    } catch {
      // Ignore sync errors while the editor is being recreated/unmounted.
    }
  }, [editor, value]);

  const isEmpty = editor?.isEmpty ?? true;

  const showToolbar = showFormatting || (enableMentions && showMentionButton);

  return (
    <div className={cn('space-y-2', className)}>
      {showToolbar && (
        <div className={cn('flex items-center gap-2', toolbarClassName)}>
          {showFormatting && (
            <>
              <CompactButton.Root
                variant={editor?.isActive('bold') ? 'primary' : 'white'}
                onClick={() => editor?.chain().focus().toggleBold().run()}
                type='button'
              >
                B
              </CompactButton.Root>
              <CompactButton.Root
                variant={editor?.isActive('italic') ? 'primary' : 'white'}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                type='button'
              >
                I
              </CompactButton.Root>
              <CompactButton.Root
                variant={editor?.isActive('underline') ? 'primary' : 'white'}
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                type='button'
              >
                U
              </CompactButton.Root>
            </>
          )}
          {enableMentions && showMentionButton && (
            <CompactButton.Root
              variant='white'
              onClick={() => editor?.chain().focus().insertContent('@').run()}
              type='button'
            >
              @
            </CompactButton.Root>
          )}
        </div>
      )}
      <div className='relative'>
        {isEmpty && (
          <div className='pointer-events-none absolute left-0 top-0 px-px pt-0.5 text-sm text-text-soft-400'>
            {placeholder}
          </div>
        )}
        <EditorContent
          editor={editor}
          onFocus={onFocus}
          onBlur={onBlur}
          className={cn(
            'min-h-16 max-h-40 w-full overflow-y-auto',
            '[&>div]:outline-none',
            '[&_.paragraph-small]:m-0',
          )}
        />
      </div>
    </div>
  );
};

export default TextEditor;
