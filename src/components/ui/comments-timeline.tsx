import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import EmptyIllustration from '@/components/ui/empty-illustration';
import * as LinkButton from '@/components/ui/link-button';

/**
 * Reusable Comments Timeline Component
 * Renders a unified timeline of comments and history/activity items
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
 * @param {'asc'|'desc'} props.sortDirection - Timeline sort by date; asc = oldest first (comments default), desc = newest first (activity feeds)
 */
type TimelineRecord = Record<string, unknown> & {
  creation?: string;
  created_at?: string;
  timestamp?: string | number;
  name?: string | number;
  id?: string | number;
};

type CommentsTimelineProps = {
  comments?: TimelineRecord[];
  history?: TimelineRecord[];
  renderComment?: (comment: TimelineRecord, index: number) => ReactNode;
  renderHistoryItem?: (historyItem: TimelineRecord, isLast: boolean) => ReactNode;
  loading?: boolean;
  emptyStateTitle?: ReactNode;
  emptyStateDescription?: ReactNode;
  collapsedItemCount?: number;
  sortDirection?: 'asc' | 'desc';
};

const CommentsTimeline = ({
  comments = [],
  history = [],
  renderComment,
  renderHistoryItem,
  loading = false,
  emptyStateTitle = 'There are no comments here yet.',
  emptyStateDescription = '',
  collapsedItemCount = 3,
  sortDirection = 'asc',
}: CommentsTimelineProps) => {
  // Track collapsed state for each history group by group ID
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);

  const newestFirst = sortDirection === 'desc';

  // Combine comments and history into a single unified timeline sorted by creation date
  const timelineItems = useMemo(() => {
    const allItems = [
      ...comments.map((comment) => ({
        ...comment,
        type: 'comment',
        sortDate: new Date(comment.creation || comment.created_at || comment.timestamp || 0),
      })),
      ...history.map((historyItem) => ({
        ...historyItem,
        type: 'history',
        sortDate: new Date(
          historyItem.creation || historyItem.created_at || historyItem.timestamp || 0,
        ),
      })),
    ];

    return allItems.sort((a, b) =>
      newestFirst
        ? b.sortDate.getTime() - a.sortDate.getTime()
        : a.sortDate.getTime() - b.sortDate.getTime(),
    );
  }, [comments, history, newestFirst]);

  // Auto-scroll: bottom for oldest-first comment threads, top for newest-first activity feeds
  useEffect(() => {
    if (!loading && timelineContainerRef.current && timelineItems.length > 0) {
      setTimeout(() => {
        if (timelineContainerRef.current) {
          timelineContainerRef.current.scrollTop = newestFirst
            ? 0
            : timelineContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [timelineItems, loading, newestFirst]);

  // Toggle collapse state for a specific group
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((previous) => ({
      ...previous,
      [groupId]: !previous[groupId],
    }));
  };

  const hasContent = timelineItems.length > 0;

  // Group consecutive history items together for timeline rendering
  const renderTimeline = () => {
    const elements = [];
    let currentHistoryGroup: { item: TimelineRecord & { type: string; sortDate: Date }; index: number }[] = [];
    let groupId = 0;

    timelineItems.forEach((item, index) => {
      if (item.type === 'history') {
        if (currentHistoryGroup.length === 0) {
        }
        currentHistoryGroup.push({ item, index });
      } else {
        // If we have a pending history group, render it first
        if (currentHistoryGroup.length > 0) {
          const currentGroupId = `group-${groupId}`;
          // Default collapsed unless user already toggled
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
              newestFirst={newestFirst}
            />,
          );
          currentHistoryGroup = [];
          groupId++;
        }
        // Render comment
        if (renderComment) {
          elements.push(
            <React.Fragment key={item.name || item.id || `comment-${index}`}>
              {renderComment(item, index)}
            </React.Fragment>,
          );
        }
      }
    });

    // Handle remaining history group at the end
    if (currentHistoryGroup.length > 0) {
      const currentGroupId = `group-${groupId}`;
      // Default collapsed unless user already toggled
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
          newestFirst={newestFirst}
        />,
      );
    }

    return elements;
  };

  return (
    <div ref={timelineContainerRef} className='flex-1 min-h-0 min-w-0 overflow-y-auto'>
      {loading ? (
        <div className='flex items-center justify-center py-8'>
          <div className='text-sm text-text-sub-600'>Loading...</div>
        </div>
      ) : hasContent ? (
        <div className='min-w-0 px-6 py-5 space-y-5'>{renderTimeline()}</div>
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

// Component to render a group of consecutive history items with timeline line
type HistoryGroupItem = {
  item: TimelineRecord & { type?: string; sortDate?: Date; name?: unknown; id?: unknown };
  index: number;
};

type HistoryGroupProps = {
  groupId: string;
  items: HistoryGroupItem[];
  isCollapsed: boolean;
  onToggle: () => void;
  renderHistoryItem?: (historyItem: TimelineRecord, isLast: boolean) => ReactNode;
  collapsedItemCount?: number;
  newestFirst?: boolean;
};

const HistoryGroup = ({
  groupId: _groupId,
  items,
  isCollapsed,
  onToggle,
  renderHistoryItem,
  collapsedItemCount = 3,
  newestFirst = false,
}: HistoryGroupProps) => {
  const hasMoreItems = items.length > collapsedItemCount;
  const displayedItems = isCollapsed
    ? newestFirst
      ? items.slice(0, collapsedItemCount)
      : items.slice(-collapsedItemCount)
    : items;
  const hiddenCount = items.length - collapsedItemCount;

  const shouldShowLine = displayedItems.length > 1 || hasMoreItems;

  return (
    <div className='relative flex flex-col gap-5'>
      {/* Vertical Timeline Line - connects all history items and button if present */}
      {shouldShowLine && (
        <div
          className={`absolute left-[2.5px] top-[11px] w-px bg-stroke-soft-200 z-0 ${
            hasMoreItems ? 'bottom-0' : displayedItems.length === 1 ? 'h-0 hidden' : ''
          }`}
          style={
            hasMoreItems || displayedItems.length === 1
              ? undefined
              : { height: `${(displayedItems.length - 1) * 40}px` }
          }
        />
      )}

      {/* History Items */}
      {displayedItems.map(({ item, index }) => {
        const isLast = index === displayedItems.length - 1 && !hasMoreItems;
        return (
          <React.Fragment key={String(item.name ?? item.id ?? `history-${index}`)}>
            {renderHistoryItem ? renderHistoryItem(item, isLast) : null}
          </React.Fragment>
        );
      })}

      {/* Collapse/Expand Button - shown when there are more than collapsedItemCount items */}
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

export default CommentsTimeline;
