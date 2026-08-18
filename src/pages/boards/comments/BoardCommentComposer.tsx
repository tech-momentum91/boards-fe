import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EditorContent, ReactRenderer, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { Extension } from '@tiptap/core';
import { Suggestion } from '@tiptap/suggestion';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import {
  RiAddLine,
  RiAttachment2,
  RiCloseLine,
  RiListUnordered,
  RiSendPlaneLine,
} from 'react-icons/ri';
import * as Avatar from '@/components/ui/avatar';
import * as CompactButton from '@/components/ui/compact-button';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { showErrorToast } from '@/utils/error-utils';
import BoardEntityTag from './board-entity-tag-extension';
import BoardEntityTagPicker from './BoardEntityTagPicker';
import { isBlankEditorHtml } from './board-comment-utils';
import './board-entity-tag.css';

const MentionList = React.forwardRef(({ items = [], command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = (index) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  };

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

  if (items.length === 0) {
    return (
      <div className='min-w-[280px] max-h-[250px] overflow-y-auto rounded-2xl bg-bg-white-0 p-1.5 shadow-regular-md ring-1 ring-stroke-soft-200'>
        <div className='px-3 py-2 text-center text-sm text-text-soft-400'>No users found</div>
      </div>
    );
  }

  return (
    <div className='min-w-[280px] max-h-[250px] overflow-y-auto rounded-2xl bg-bg-white-0 p-1.5 shadow-regular-md ring-1 ring-stroke-soft-200'>
      <div className='space-y-1'>
        {items.map((item, index) => {
          const name = item.label || item.name || item.email || item.id || 'User';
          const role =
            item.user_role || (item.roles && item.roles.length > 0 ? item.roles[0] : item.role);
          return (
            <button
              key={item.id || `${name}-${index}`}
              type='button'
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectItem(index)}
              className={cn(
                'flex w-full cursor-pointer select-none items-center gap-2 rounded-lg p-2 text-left',
                'hover:bg-bg-weak-50',
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
                <span className='text-paragraph-sm text-text-main-900'>{name}</span>
                {role ? <span className='text-label-xs text-text-soft-400'>{role}</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
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

function createMentionSuggestion(onSearchMentions) {
  return {
    char: '@',
    items: async ({ query }) => {
      if (!onSearchMentions) return [];
      const results = await onSearchMentions(query || '');
      return (results || []).map(normalizeMentionItem).filter(Boolean);
    },
    render: () => {
      let reactRenderer;
      let popup;

      return {
        onStart: (props) => {
          reactRenderer = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

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
          reactRenderer?.updateProps(props);
          if (!props.clientRect) return;
          popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect });
        },
        onKeyDown: (props) => {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide();
            return true;
          }
          return reactRenderer?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          popup?.[0]?.destroy();
          reactRenderer?.destroy();
        },
      };
    },
  };
}

function EntitySlashPickerHost({ editor, range, query, sidebarTree, currentListId, command }) {
  return (
    <BoardEntityTagPicker
      sidebarTree={sidebarTree}
      currentListId={currentListId}
      query={query}
      onQueryChange={() => {}}
      onSelect={(entity) => {
        command({ entity, range, editor });
      }}
    />
  );
}

function createEntitySlashExtension({
  sidebarTree,
  currentListId,
  sidebarTreeRef,
  currentListIdRef,
}) {
  return Extension.create({
    name: 'boardEntitySlash',

    addOptions() {
      return {
        suggestion: {
          char: '/',
          allowSpaces: true,
          startOfLine: false,
          items: () => [],
          render: () => {
            let reactRenderer;
            let popup;

            return {
              onStart: (props) => {
                reactRenderer = new ReactRenderer(EntitySlashPickerHost, {
                  props: {
                    ...props,
                    sidebarTree: sidebarTreeRef?.current ?? sidebarTree,
                    currentListId: currentListIdRef?.current ?? currentListId,
                    command: ({ entity }) => {
                      props.command({ entity });
                    },
                  },
                  editor: props.editor,
                });

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
                reactRenderer?.updateProps({
                  ...props,
                  sidebarTree: sidebarTreeRef?.current ?? sidebarTree,
                  currentListId: currentListIdRef?.current ?? currentListId,
                  command: ({ entity }) => {
                    props.command({ entity });
                  },
                });
                if (!props.clientRect) return;
                popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect });
              },
              onKeyDown: (props) => {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide();
                  return true;
                }
                return false;
              },
              onExit: () => {
                popup?.[0]?.destroy();
                reactRenderer?.destroy();
              },
            };
          },
          command: ({ editor, range, props }) => {
            const entity = props?.entity;
            if (!entity) {
              return;
            }

            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertBoardEntityTag({
                entityType: entity.type,
                entityId: entity.id,
                label: entity.label,
                href: entity.href,
              })
              .insertContent(' ')
              .run();
          },
        },
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ];
    },
  });
}

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.msi',
  '.vbs',
  '.jar',
  '.app',
  '.deb',
  '.rpm',
  '.dmg',
  '.scr',
  '.pif',
  '.com',
  '.lnk',
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function getExt(name) {
  const i = (name ?? '').lastIndexOf('.');
  return i === -1 ? '' : name.slice(i).toLowerCase();
}

const BoardCommentComposer = forwardRef(
  (
    {
      onSubmit,
      isSubmitting = false,
      disabled = false,
      placeholder = 'Add a comment...',
      onSearchMentions,
      sidebarTree = [],
      currentListId = null,
      className,
    },
    ref,
  ) => {
    const [content, setContent] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [plusOpen, setPlusOpen] = useState(false);
    const [pendingFiles, setPendingFiles] = useState([]);
    const fileInputRef = useRef(null);
    const sidebarTreeRef = useRef(sidebarTree);
    const currentListIdRef = useRef(currentListId);
    const handleSubmitRef = useRef(null);

    useEffect(() => {
      sidebarTreeRef.current = sidebarTree;
    }, [sidebarTree]);

    useEffect(() => {
      currentListIdRef.current = currentListId;
    }, [currentListId]);

    const mentionSuggestion = useMemo(
      () => createMentionSuggestion(onSearchMentions),
      [onSearchMentions],
    );

    const entitySlashExtension = useMemo(
      () =>
        createEntitySlashExtension({
          sidebarTree,
          currentListId,
          sidebarTreeRef,
          currentListIdRef,
        }),
      // Extension reads live values via refs; recreate once.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          paragraph: {
            HTMLAttributes: {
              class: 'paragraph-small',
            },
          },
        }),
        Mention.configure({
          HTMLAttributes: {
            class: 'mention',
            'data-mention': 'true',
          },
          renderText({ options, node }) {
            return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
          },
          suggestion: mentionSuggestion,
        }),
        BoardEntityTag,
        entitySlashExtension,
      ],
      content: '',
      editorProps: {
        attributes: {
          class: cn(
            'min-h-8 max-h-20 w-full overflow-y-auto rounded-none bg-transparent outline-none',
            'text-sm text-text-main-900',
            '[&_.mention]:text-primary-base',
            '[&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1',
            '[&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1',
            '[&_li]:my-0.5',
          ),
        },
        handleKeyDown: (_view, event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            handleSubmitRef.current?.();
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        setContent(currentEditor.getHTML());
      },
    });

    const hasText = !isBlankEditorHtml(content);

    const handleFileInput = (e) => {
      const files = [...(e.target.files ?? [])];
      e.target.value = '';

      const validFiles = files.filter((f) => {
        const ext = getExt(f.name);
        if (BLOCKED_EXTENSIONS.has(ext)) {
          showErrorToast(`File type '${ext}' is not allowed.`);
          return false;
        }
        if (f.size > MAX_FILE_SIZE) {
          showErrorToast(`'${f.name}' exceeds the 50 MB limit.`);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        setPendingFiles((prev) => [...prev, ...validFiles]);
      }
    };

    const removePendingFile = (index) => {
      setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
      if (!hasText || disabled || isSubmitting || !editor) {
        return;
      }

      const filesToSubmit = [...pendingFiles];

      try {
        await onSubmit?.(editor.getHTML(), filesToSubmit);
        editor.commands.clearContent(true);
        setContent('');
        setIsFocused(false);
        setPlusOpen(false);
        setPendingFiles([]);
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to submit comment. Please try again.',
          position: 'bottom-right',
        });
      }
    };

    handleSubmitRef.current = handleSubmit;

    useImperativeHandle(ref, () => ({
      focus: () => editor?.commands.focus(),
      clear: () => {
        editor?.commands.clearContent(true);
        setContent('');
        setPendingFiles([]);
      },
    }));

    const insertEntity = (entity) => {
      if (!editor || !entity) {
        return;
      }

      editor
        .chain()
        .focus()
        .insertBoardEntityTag({
          entityType: entity.type,
          entityId: entity.id,
          label: entity.label,
          href: entity.href,
        })
        .insertContent(' ')
        .run();
      setPlusOpen(false);
    };

    const isEmpty = editor?.isEmpty ?? true;

    return (
      <div
        className={cn(
          'rounded-[10px] border bg-white transition-shadow',
          isFocused ? 'border-primary-base shadow-regular-xs' : 'border-stroke-soft-200',
          className,
        )}
      >
        <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-3 py-1'>
          <CompactButton.Root
            variant={editor?.isActive('bold') ? 'primary' : 'white'}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            type='button'
            disabled={disabled}
          >
            B
          </CompactButton.Root>
          <CompactButton.Root
            variant={editor?.isActive('italic') ? 'primary' : 'white'}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            type='button'
            disabled={disabled}
          >
            I
          </CompactButton.Root>
          <CompactButton.Root
            variant={editor?.isActive('underline') ? 'primary' : 'white'}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            type='button'
            disabled={disabled}
          >
            U
          </CompactButton.Root>
          <CompactButton.Root
            variant={editor?.isActive('bulletList') ? 'primary' : 'white'}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            type='button'
            disabled={disabled}
            aria-label='Bullet list'
          >
            <RiListUnordered size={14} />
          </CompactButton.Root>
          <CompactButton.Root
            variant='white'
            onClick={() => editor?.chain().focus().insertContent('@').run()}
            type='button'
            disabled={disabled}
          >
            @
          </CompactButton.Root>

          <CompactButton.Root
            variant='white'
            type='button'
            disabled={disabled}
            aria-label='Attach files'
            onClick={() => fileInputRef.current?.click()}
          >
            <RiAttachment2 size={16} />
          </CompactButton.Root>

          <input
            ref={fileInputRef}
            type='file'
            multiple
            className='sr-only'
            aria-hidden
            tabIndex={-1}
            onChange={handleFileInput}
          />

          <Popover.Root open={plusOpen} onOpenChange={setPlusOpen}>
            <Popover.Trigger asChild>
              <CompactButton.Root
                variant={plusOpen ? 'primary' : 'white'}
                type='button'
                disabled={disabled}
                aria-label='Tag board, folder, list, or task'
              >
                <RiAddLine size={16} />
              </CompactButton.Root>
            </Popover.Trigger>
            <Popover.Content
              align='start'
              side='top'
              showArrow={false}
              className='w-auto overflow-visible border-0 bg-transparent p-0 shadow-none'
            >
              <BoardEntityTagPicker
                sidebarTree={sidebarTree}
                currentListId={currentListId}
                onSelect={insertEntity}
              />
            </Popover.Content>
          </Popover.Root>
        </div>

        <div className='px-3 pt-1.5'>
          <div className='relative'>
            {isEmpty ? (
              <div className='pointer-events-none absolute inset-x-0 top-0 text-sm leading-5 text-text-soft-400'>
                {placeholder}
              </div>
            ) : null}
            <EditorContent
              editor={editor}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={cn(
                'min-h-8 max-h-20 w-full overflow-y-auto',
                '[&>div]:outline-none',
                '[&_.ProseMirror]:min-h-8 [&_.ProseMirror]:outline-none',
                '[&_.paragraph-small]:m-0 [&_.paragraph-small]:leading-5',
              )}
            />
          </div>
        </div>

        {pendingFiles.length > 0 ? (
          <div className='flex flex-wrap gap-1.5 border-t border-stroke-soft-200 px-3 py-2'>
            {pendingFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className='flex items-center gap-1 rounded-md bg-bg-weak-100 px-2 py-1 text-paragraph-xs text-text-main-900'
              >
                <span className='max-w-[120px] truncate'>{file.name}</span>
                <button
                  type='button'
                  onClick={() => removePendingFile(index)}
                  className='ml-0.5 text-text-sub-500 hover:text-text-main-900'
                  aria-label={`Remove ${file.name}`}
                >
                  <RiCloseLine size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className='flex items-center justify-end gap-2 px-3 py-1'>
          <button
            type='button'
            aria-label='Send comment'
            disabled={!hasText || disabled || isSubmitting}
            onClick={handleSubmit}
            className={cn(
              'flex size-7 items-center justify-center rounded-full transition-colors',
              hasText && !disabled && !isSubmitting
                ? 'bg-primary-base text-white hover:bg-primary-darker'
                : 'bg-bg-weak-100 text-icon-disabled-300',
            )}
          >
            <RiSendPlaneLine size={16} />
          </button>
        </div>
      </div>
    );
  },
);

BoardCommentComposer.displayName = 'BoardCommentComposer';

export default BoardCommentComposer;
