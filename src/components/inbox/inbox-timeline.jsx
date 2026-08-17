import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import EmptyIllustration from '@/components/ui/empty-illustration';
import * as LinkButton from '@/components/ui/link-button';
import InboxItem from '@/components/inbox/inbox-item';
import InboxInput from '@/components/inbox/inbox-input';
import InboxHistoryItem from '@/components/inbox/inbox-history-item';
import { useMentionSearch } from '@/hooks/use-mention-search';
import Vector1Icon from '@/components/ui/vector-1-icon';

/**
 * Inbox Timeline – same as comments timeline, without reply.
 * Renders a unified timeline of comments and history/activity items for inbox notification detail.
 *
 * @param {Object} props
 * @param {Array} props.comments - Array of comment objects
 * @param {Array} props.history - Array of history/activity objects
 * @param {Function} props.renderComment - Function to render a comment item (comment, index) => ReactNode
 * @param {Function} props.renderHistoryItem - Function to render a history item (historyItem, isLast) => ReactNode
 * @param {boolean} props.loading - Whether data is loading
 * @param {string} props.emptyStateTitle - Title for empty state
 * @param {string} props.emptyStateDescription - Description for empty state
 * @param {number} props.collapsedItemCount - Number of history items to show when collapsed (default: 3)
 */
const InboxTimeline = ({
  comments = [],
  history = [],
  renderComment,
  renderHistoryItem,
  loading = false,
  emptyStateTitle = 'There are no updates here yet.',
  emptyStateDescription = '',
  collapsedItemCount = 3,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const timelineContainerRef = useRef(null);

  // Build comment tree: supports nested replies of any depth.
  const timelineItems = useMemo(() => {
    const toStr = (v) => (v != null && v !== '' ? String(v) : null);
    const getBaseKey = (c) => toStr(c?.id ?? c?.name ?? null);
    const getParentKey = (c) =>
      toStr(c?.parent_comment?.id ?? c?.parent_comment?.name ?? c?.parent_comment_id ?? null);
    const getDate = (c) => new Date(c?.creation || c?.created_at || c?.timestamp || 0);

    // Assign stable unique keys so duplicate id/name (e.g. quick successive replies) don't drop comments.
    const keyCount = new Map();
    const commentsWithKeys = comments.map((c, index) => {
      const base = getBaseKey(c);
      const count = base ? (keyCount.get(base) ?? 0) : 0;
      if (base) keyCount.set(base, count + 1);
      const key = base ? (count === 0 ? base : `${base}-${count}`) : `comment-${index}`;
      return { key, comment: c };
    });

    const nodesByKey = new Map();
    commentsWithKeys.forEach(({ key, comment: c }) => {
      if (!key) return;
      if (nodesByKey.has(key)) {
        nodesByKey.get(key).comment = c;
      } else {
        nodesByKey.set(key, { key, comment: c, children: [] });
      }
    });

    const rootKeys = new Set(nodesByKey.keys());
    nodesByKey.forEach((node) => {
      const childKey = node.key;
      const parentBase = getParentKey(node.comment);
      if (!childKey || !parentBase) return;
      const nodeBase = getBaseKey(node.comment);
      if (parentBase === nodeBase) return;
      // Find parent: match by id or name (string-normalized) so reply-to-reply works for newly added comments
      const parentNode = [...nodesByKey.values()].find((n) => {
        const nId = toStr(n.comment?.id);
        const nName = toStr(n.comment?.name);
        return nId === parentBase || nName === parentBase;
      });
      if (parentNode) {
        parentNode.children.push(node);
        rootKeys.delete(childKey);
      }
    });

    const sortTree = (node) => {
      node.children.sort((a, b) => getDate(a.comment) - getDate(b.comment));
      node.children.forEach(sortTree);
    };

    const roots = [...rootKeys].map((k) => nodesByKey.get(k));
    roots.sort((a, b) => getDate(a.comment) - getDate(b.comment));
    roots.forEach(sortTree);

    const commentGroups = roots.map((root) => ({
      type: 'comment',
      root,
      sortDate: getDate(root.comment),
    }));

    const historyItems = history.map((historyItem) => ({
      ...historyItem,
      type: 'history',
      sortDate: new Date(
        historyItem.creation || historyItem.created_at || historyItem.timestamp || 0,
      ),
    }));

    return [...commentGroups, ...historyItems].sort((a, b) => a.sortDate - b.sortDate);
  }, [comments, history]);

  useEffect(() => {
    if (!loading && timelineContainerRef.current && timelineItems.length > 0) {
      setTimeout(() => {
        if (timelineContainerRef.current) {
          timelineContainerRef.current.scrollTop = timelineContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [timelineItems, loading]);

  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroups((previous) => ({
      ...previous,
      [groupId]: !previous[groupId],
    }));
  };

  const hasContent = timelineItems.length > 0;

  const renderTimeline = () => {
    const elements = [];
    let currentHistoryGroup = [];
    let groupId = 0;

    timelineItems.forEach((item, index) => {
      if (item.type === 'history') {
        currentHistoryGroup.push({ item, index });
      } else if (item.type === 'comment') {
        if (currentHistoryGroup.length > 0) {
          const currentGroupId = `group-${groupId}`;
          const isCollapsed = collapsedGroups[currentGroupId] ?? true;
          elements.push(
            <HistoryGroup
              key={currentGroupId}
              groupId={currentGroupId}
              items={currentHistoryGroup}
              isCollapsed={isCollapsed}
              onToggle={() => toggleGroupCollapse(currentGroupId)}
              renderHistoryItem={renderHistoryItem}
              collapsedItemCount={collapsedItemCount}
            />,
          );
          currentHistoryGroup = [];
          groupId++;
        }
        const { root } = item;
        const parent = root.comment;
        // Use same key as tree (id ?? name) so keys are unique and consistent with nodesByKey.
        const parentKey = root.key ?? parent?.id ?? parent?.name ?? `comment-${index}`;
        if (renderComment) {
          const renderNested = (nodes, ancestorKey) => {
            if (!nodes?.length) return null;
            return (
              <div className='relative ml-8 flex flex-col pl-5 border-stroke-soft-200'>
                {nodes.map((node, nodeIndex) => {
                  const nodeComment = node.comment;
                  const nodeKey =
                    node.key ??
                    nodeComment?.id ??
                    nodeComment?.name ??
                    `${ancestorKey}-child-${nodeIndex}`;
                  const hasChild = Boolean(node.children?.length);
                  const isFirst = nodeIndex === 0;

                  return (
                    <div key={nodeKey} className={`relative ${isFirst ? '' : 'pt-2'}`}>
                      <div className='relative flex flex-col'>
                        <Vector1Icon
                          className='absolute left-[-21px] top-[-1px] h-[51px] w-[15px] select-none pointer-events-none object-fill text-[color:var(--color-stroke-soft-200)]'
                          preserveAspectRatio='none'
                        />

                        <div className='mt-2 -ml-3'>
                          {renderComment(nodeComment, nodeIndex, { canReply: !hasChild })}
                        </div>
                      </div>

                      {hasChild ? renderNested(node.children, nodeKey) : null}
                    </div>
                  );
                })}
              </div>
            );
          };

          const canReplyToParent = !root.children?.length;

          elements.push(
            <div key={parentKey} className='relative flex flex-col z-10'>
              <div className='relative flex items-start gap-2.5'>
                <div className='shrink-0 w-1.5 h-4 flex items-center justify-center'>
                  <div className='w-1.5 h-1.5 rounded-full bg-stroke-soft-200' />
                </div>
                <div className='flex-1 min-w-0'>
                  {renderComment(parent, index, { canReply: canReplyToParent })}
                </div>
              </div>
              {root.children?.length ? renderNested(root.children, parentKey) : null}
            </div>,
          );
        }
      }
    });

    if (currentHistoryGroup.length > 0) {
      const currentGroupId = `group-${groupId}`;
      const isCollapsed = collapsedGroups[currentGroupId] ?? true;
      elements.push(
        <HistoryGroup
          key={currentGroupId}
          groupId={currentGroupId}
          items={currentHistoryGroup}
          isCollapsed={isCollapsed}
          onToggle={() => toggleGroupCollapse(currentGroupId)}
          renderHistoryItem={renderHistoryItem}
          collapsedItemCount={collapsedItemCount}
        />,
      );
    }

    return elements;
  };

  return (
    <div ref={timelineContainerRef} className='flex-1 overflow-y-auto'>
      {loading ? (
        <div className='flex items-center justify-center py-8'>
          <div className='text-sm text-text-sub-600'>Loading...</div>
        </div>
      ) : hasContent ? (
        <div className='relative px-6 py-5'>
          <div
            className='absolute left-[26.5px] top-0 bottom-0 w-px bg-stroke-soft-200 z-0'
            aria-hidden
          />
          <div className='relative z-10 space-y-5'>{renderTimeline()}</div>
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center gap-5 py-12 px-4 h-full'>
          <EmptyIllustration className='shrink-0' />
          <div className='flex flex-col items-center gap-1'>
            <p className='text-sm leading-5 text-text-soft-400 text-center'>{emptyStateTitle}</p>
            {emptyStateDescription && (
              <p className='text-xs leading-4 text-text-soft-400 text-center'>
                {emptyStateDescription}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryGroup = ({
  groupId,
  items,
  isCollapsed,
  onToggle,
  renderHistoryItem,
  collapsedItemCount = 3,
}) => {
  const hasMoreItems = items.length > collapsedItemCount;
  const displayedItems = isCollapsed ? items.slice(-collapsedItemCount) : items;
  const hiddenCount = items.length - collapsedItemCount;

  return (
    <div className='relative flex flex-col gap-5 z-10'>
      {displayedItems.map(({ item, index }) => {
        const isLast = index === displayedItems.length - 1 && !hasMoreItems;
        return (
          <React.Fragment key={item.name || item.id || `history-${index}`}>
            {renderHistoryItem ? renderHistoryItem(item, isLast) : null}
          </React.Fragment>
        );
      })}
      {hasMoreItems && (
        <div className='relative flex items-start gap-2.5 py-0 z-10'>
          <div className='shrink-0 w-1.5 h-4 flex items-center justify-center'>
            <div className='w-1.5 h-1.5 rounded-full bg-stroke-soft-200' />
          </div>
          <LinkButton.Root onClick={onToggle} size='small' variant='primary'>
            {isCollapsed ? (
              <>
                Show {hiddenCount} older {hiddenCount === 1 ? 'activity' : 'activities'}{' '}
                <RiArrowDownSLine className='w-4 h-4' />
              </>
            ) : (
              <>
                Hide older activities <RiArrowUpSLine className='w-4 h-4' />
              </>
            )}
          </LinkButton.Root>
        </div>
      )}
    </div>
  );
};

/**
 * Inbox timeline with reply – like TicketComments.
 * Renders InboxTimeline + CommentInput with reply target state (onReply sets reply target).
 *
 * @param {Object} props
 * @param {string} props.notificationId - Inbox notification id (for onAddComment)
 * @param {Array} props.comments - Array of comment objects
 * @param {Array} props.history - Array of history/activity objects
 * @param {Function} props.onAddComment - (notificationId, content, attachments, isVisibleToClient, parentCommentId) => Promise
 * @param {boolean} props.loading - Whether data is loading
 * @param {string} props.emptyStateTitle - Title for empty state
 * @param {number} props.collapsedItemCount - Number of history items to show when collapsed (default: 3)
 */
const InboxTimelineWithReply = ({
  notificationId,
  comments = [],
  history = [],
  onAddComment,
  loading = false,
  emptyStateTitle = 'There are no updates here yet.',
  collapsedItemCount = 3,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const replySectionRef = useRef(null);
  const {
    searchMentions,
    users: mentionUsers,
    hasMore,
    loadingMore,
    loadMore,
  } = useMentionSearch();

  // When user clicks Reply, scroll reply input into view so it shows like the design
  useEffect(() => {
    if (replyTarget && replySectionRef.current) {
      replySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [replyTarget]);

  const handleAddComment = async (
    content,
    attachments = [],
    isVisibleToClient = false,
    parentCommentId = null,
  ) => {
    if (!content.trim() && attachments.length === 0) return;
    setIsSubmitting(true);
    try {
      await onAddComment?.(
        notificationId,
        content,
        attachments,
        isVisibleToClient,
        parentCommentId,
      );
      setReplyTarget(null);
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Match only when both have the same non-empty id or name (avoid undefined === undefined matching all)
  const isSameComment = (a, b) => {
    if (!a || !b) return false;
    const idA = a.id ?? a.name;
    const idB = b.id ?? b.name;
    return idA != null && idB != null && String(idA) === String(idB);
  };

  return (
    <div className='flex flex-col h-full'>
      <InboxTimeline
        comments={comments}
        history={history}
        loading={loading}
        renderComment={(comment, index, options) => (
          <div ref={isSameComment(replyTarget, comment) ? replySectionRef : undefined}>
            <InboxItem
              comment={comment}
              onReply={options?.canReply ? (c) => setReplyTarget(c) : undefined}
              parentCommentPreview={options?.parentComment ?? null}
              inlineReplyInput={
                isSameComment(replyTarget, comment) ? (
                  <InboxInput
                    replyTo={replyTarget}
                    onCancelReply={() => setReplyTarget(null)}
                    onSubmit={(content, attachments, isVisibleToClient, parentCommentId) =>
                      handleAddComment(content, attachments, isVisibleToClient, parentCommentId)
                    }
                    isSubmitting={isSubmitting}
                    onSearchMentions={searchMentions}
                    mentionUsers={mentionUsers}
                    hasMoreMentions={hasMore}
                    loadingMoreMentions={loadingMore}
                    onLoadMoreMentions={loadMore}
                  />
                ) : null
              }
            />
          </div>
        )}
        renderHistoryItem={(historyItem, isLast) => (
          <InboxHistoryItem historyItem={historyItem} isLast={isLast} />
        )}
        emptyStateTitle={emptyStateTitle}
        collapsedItemCount={collapsedItemCount}
      />
    </div>
  );
};

export default InboxTimeline;
export { InboxTimelineWithReply };
