import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import * as Avatar from '@/components/ui/avatar';
import CommentReactionsBar from '@/pages/boards/components/comment-reactions-bar';
import { cn, getInitials } from '@/lib/utils';
import { safeDisplayDateTime } from '@/utils/date-utils';
import { getSidebarTree } from '@/services/boards-service';
import {
  deleteBoardCommentAttachment,
  listBoardCommentAttachments,
  normalizeBoardAttachment,
  uploadBoardCommentAttachment,
} from '@/services/tasks-service';
import { useBoardAttachments } from '@/pages/boards/attachments/useBoardAttachments';
import BoardAttachmentList from '@/pages/boards/attachments/BoardAttachmentList';
import {
  BOARD_ENTITY_TAG_CLASS,
  BOARD_NO_ACCESS_PATH,
  escapeHtml,
  getEntityTagIconSvg,
  resolveBoardEntityNavigation,
  sanitizeBoardCommentHtml,
} from './board-comment-utils';
import './board-entity-tag.css';

export default function BoardCommentItem({
  comment,
  onToggleReaction,
  reactionsReadOnly = false,
  sidebarTree = null,
  currentUser = null,
}) {
  const navigate = useNavigate();
  const { profileData } = useSelector((state) => state.profile);
  const [isNavigating, setIsNavigating] = useState(false);

  const {
    content,
    creation,
    user,
    commented_by,
    reactions = [],
    attachments: rawAttachments = [],
  } = comment || {};

  const seedAttachments = useMemo(
    () => rawAttachments.map(normalizeBoardAttachment),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comment?.name],
  );

  // skip=true: data already arrives via get_comments so no extra list request needed.
  // We seed the hook's state from rawAttachments instead.
  const attachmentHook = useBoardAttachments(
    comment?.name ?? null,
    {
      listFn: listBoardCommentAttachments,
      uploadFn: uploadBoardCommentAttachment,
      deleteFn: deleteBoardCommentAttachment,
    },
    true,
  );

  // Seed initial attachment data from the get_comments payload.
  // Re-seeds when switching to a different comment (comment.name changes).
  const { seed } = attachmentHook;
  useEffect(() => {
    seed(seedAttachments);
    // seed is stable (useCallback with no deps); seedAttachments key is comment?.name
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comment?.name]);

  const isCommentAuthor = Boolean(
    currentUser && (comment?.user?.name === currentUser || comment?.commented_by === currentUser),
  );

  const displayName = (user?.name || commented_by || '').trim() || 'Comment';

  const handleEntityClick = useCallback(
    async (event) => {
      const anchor = event.target?.closest?.(`a.${BOARD_ENTITY_TAG_CLASS}`);
      if (!anchor) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (isNavigating) {
        return;
      }

      const entityType = anchor.getAttribute('data-entity-type');
      const entityId = anchor.getAttribute('data-entity-id');

      setIsNavigating(true);
      try {
        let tree = Array.isArray(sidebarTree) && sidebarTree.length > 0 ? sidebarTree : null;
        if (!tree) {
          const treeResult = await getSidebarTree({ includeArchived: false, includeHidden: false });
          if (treeResult?.error) {
            // Never trust stored `href` from comment HTML — it may be attacker-controlled.
            navigate(BOARD_NO_ACCESS_PATH);
            return;
          }
          tree = Array.isArray(treeResult?.data) ? treeResult.data : [];
        }

        if (tree.length === 0) {
          navigate(BOARD_NO_ACCESS_PATH);
          return;
        }

        const path = await resolveBoardEntityNavigation({
          entityType,
          entityId,
          sidebarTree: tree,
        });
        navigate(path);
      } catch {
        navigate(BOARD_NO_ACCESS_PATH);
      } finally {
        setIsNavigating(false);
      }
    },
    [isNavigating, navigate, sidebarTree],
  );

  const renderContent = (htmlContent) => {
    let sanitizedContent = sanitizeBoardCommentHtml(htmlContent);

    const mentionSpanRegex = /(<span[^>]*data-mention=["']true["'][^>]*>)([^<]*)(<\/span>)/gi;
    sanitizedContent = sanitizedContent.replaceAll(
      mentionSpanRegex,
      (fullMatch, openTag, innerText, closeTag) => {
        const idMatch = openTag.match(/data-id=["']([^"']+)["']/i);
        const mentionEmail = (idMatch?.[1] || '').toLowerCase();
        const currentEmail = (profileData?.email || '').toLowerCase();
        const isCurrentUserMention = mentionEmail && mentionEmail === currentEmail;
        const fontWeightStyle = isCurrentUserMention
          ? 'font-weight: 600; background-color: var(--color-primary-lighter); padding-bottom: 2px;'
          : '';
        const styledInner = `<span style="color: var(--color-primary-base); ${fontWeightStyle}">${innerText}</span>`;
        return `${openTag}${styledInner}${closeTag}`;
      },
    );

    // Decorate entity tags with type icon + labeled span (rebuild safe attrs only).
    const entityTagRegex =
      /<a([^>]*\bclass=["'][^"']*\bboard-entity-tag\b[^"']*["'][^>]*)>([\S\s]*?)<\/a>/gi;
    sanitizedContent = sanitizedContent.replaceAll(entityTagRegex, (_fullMatch, attrs, inner) => {
      const typeMatch = attrs.match(/data-entity-type=["']([^"']+)["']/i);
      const idMatch = attrs.match(/data-entity-id=["']([^"']+)["']/i);
      const labelMatch = attrs.match(/data-label=["']([^"']*)["']/i);
      const entityType = typeMatch?.[1] || 'task';
      const entityId = idMatch?.[1] || '';
      const label =
        labelMatch?.[1] ||
        String(inner)
          .replaceAll(/<[^>]+>/g, '')
          .trim() ||
        'Untitled';

      if (!entityId) {
        return escapeHtml(label);
      }

      const icon = getEntityTagIconSvg(entityType);
      const safeLabel = escapeHtml(label);
      const safeType = escapeHtml(entityType);
      const safeId = escapeHtml(entityId);
      const safeLabelAttr = escapeHtml(label);

      return `<a class="${BOARD_ENTITY_TAG_CLASS}" data-entity-type="${safeType}" data-entity-id="${safeId}" data-label="${safeLabelAttr}" href="#">${icon}<span class="board-entity-tag__label">${safeLabel}</span></a>`;
    });

    return (
      <div
        role='presentation'
        onClick={handleEntityClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            handleEntityClick(event);
          }
        }}
        className={cn(
          'comment-entity-tags paragraph-small text-text-main-900',
          '[&>p]:mb-1 [&>p:last-child]:mb-0',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1',
          '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1',
          '[&_li]:my-0.5',
          '[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-1',
          '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-1',
          '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-0.5',
          '[&_strong]:font-semibold',
          '[&_em]:italic',
          '[&_code]:rounded [&_code]:bg-bg-weak-100 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs',
          '[&_pre]:rounded-lg [&_pre]:bg-bg-weak-100 [&_pre]:p-3 [&_pre]:my-1 [&_pre]:overflow-x-auto',
          '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
          '[&_hr]:my-2 [&_hr]:border-stroke-soft-200',
          '[&_a]:text-primary-base [&_a]:underline',
          isNavigating && 'pointer-events-none opacity-80',
        )}
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    );
  };

  return (
    <div className='group relative overflow-hidden rounded-[10px] border border-stroke-soft-200 bg-bg-weak-100'>
      <div className='flex items-center justify-between bg-bg-weak-100 px-4 py-2.5'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <Avatar.Root size='20' color='gray' className='shrink-0'>
            {user?.image ? (
              <Avatar.Image
                src={user.image}
                alt={displayName}
                onError={(event) => {
                  if (event?.target) {
                    event.target.style.display = 'none';
                  }
                }}
              />
            ) : (
              getInitials(displayName) || 'U'
            )}
          </Avatar.Root>
          <span className='truncate text-sm font-normal leading-[20px] tracking-[-0.084px] text-text-sub-500'>
            {displayName}
          </span>
        </div>
        <span className='shrink-0 whitespace-nowrap text-xs font-normal leading-[16px] text-text-sub-500'>
          {creation ? safeDisplayDateTime(creation) : ''}
        </span>
      </div>

      <div className='-mx-px space-y-3 rounded-[10px] border-l border-r border-t border-stroke-soft-200 bg-white p-4'>
        <div className='mb-0'>{renderContent(content)}</div>

        {attachmentHook.attachments.length > 0 || attachmentHook.uploadQueue.length > 0 ? (
          <BoardAttachmentList
            hook={attachmentHook}
            canDelete={isCommentAuthor}
            canUpload={false}
            showUploader={false}
          />
        ) : null}

        <CommentReactionsBar
          reactions={reactions}
          onToggleReaction={
            onToggleReaction ? (emoji) => onToggleReaction(comment, emoji) : undefined
          }
          readOnly={reactionsReadOnly || !onToggleReaction}
        />
      </div>
    </div>
  );
}
