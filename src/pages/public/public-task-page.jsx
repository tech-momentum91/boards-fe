import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  RiAttachment2,
  RiCalendarLine,
  RiFlagLine,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiUserLine,
} from 'react-icons/ri';
import * as Avatar from '@/components/ui/avatar';
import * as Badge from '@/components/ui/badge';
import AttachmentList from '@/components/ui/attachment-list';
import CircularProgress, { resolveBadgeColor } from '@/components/ui/circular-progress';
import ErrorStateCard from '@/components/ui/error-state-card';
import FieldRow from '@/components/ui/field-row';
import * as Tag from '@/components/ui/tag';
import CommentsTimeline from '@/components/ui/comments-timeline';
import BoardCommentItem from '@/pages/boards/comments/BoardCommentItem';
import { getPriorityColor } from '@/components/clients-management/constants';
import { useAuth } from '@/contexts/auth-context';
import {
  buildBoardTaskSearchPath,
  getBoardSearchStatusColor,
  getBoardSearchStatusProgress,
} from '@/pages/boards/utils/boards-global-search-utils';
import { getPublicTask } from '@/services/task-share-service';
import { getAssigneeDisplayName, getAssigneeFirstNameInitial } from '@/utils/task-utils';

function formatDateLabel(value) {
  if (!value) {
    return '—';
  }

  try {
    const date = typeof value === 'string' ? parseISO(String(value).replace(' ', 'T')) : value;
    if (Number.isNaN(date?.getTime?.() ?? Number.NaN)) {
      return String(value);
    }
    return format(date, 'MMM d, yyyy');
  } catch {
    return String(value);
  }
}

function StatusDisplay({ task }) {
  const color = getBoardSearchStatusColor(task);
  const percentage = getBoardSearchStatusProgress(task);
  const label = task.statusTitle || task.status || 'Status';
  const bgColor = resolveBadgeColor(task.statusColor) || color;

  return (
    <span
      className='inline-flex h-6 max-w-full items-center gap-1.5 rounded-md px-2 text-xs font-medium uppercase tracking-[0.48px] text-white'
      style={{ backgroundColor: bgColor }}
    >
      <CircularProgress
        percentage={percentage}
        color='#FFFFFF'
        size={15}
        variant='sector'
        aria-label={`${label} status`}
      />
      <span className='truncate'>{label}</span>
    </span>
  );
}

function AssigneeAvatars({ assignees = [] }) {
  if (assignees.length === 0) {
    return <span className='text-paragraph-sm text-text-soft-400'>No assignee</span>;
  }

  return (
    <div className='flex items-center -space-x-1.5'>
      {assignees.slice(0, 5).map((assignee, index) => {
        const name = getAssigneeDisplayName(assignee);
        const image = assignee?.user_image || assignee?.image || '';
        const key = assignee?.user || assignee?.email || name || index;

        if (image) {
          return (
            <Avatar.Root key={key} size={24} className='overflow-hidden ring-2 ring-bg-white-0'>
              <Avatar.Image src={image} alt={name || 'Assignee'} />
            </Avatar.Root>
          );
        }

        return (
          <span
            key={key}
            className='flex size-6 items-center justify-center rounded-full bg-blue-light text-[10px] font-medium text-blue-darker ring-2 ring-bg-white-0'
          >
            {getAssigneeFirstNameInitial(assignee)}
          </span>
        );
      })}
    </div>
  );
}

function PublicTaskContent({ task, comments, assigneeDetails, priorityColor }) {
  return (
    <div className='flex h-full min-h-0 w-full flex-1 bg-bg-white-0'>
      <div className='flex w-[min(422px,42%)] shrink-0 flex-col overflow-y-auto border-r border-stroke-soft-200'>
        <div className='flex flex-col gap-6 px-6 pb-6 pt-5'>
          <div className='flex flex-col gap-1'>
            <StatusDisplay task={task} />
            <h1 className='p-1 text-title-h5 text-text-main-900'>{task.title || 'Untitled'}</h1>
            {task.description ? (
              <p className='whitespace-pre-wrap px-1 text-paragraph-md text-text-sub-500'>
                {task.description}
              </p>
            ) : (
              <div className='flex items-center gap-1.5 px-2 py-1.5 text-text-soft-400'>
                <RiStickyNoteLine className='size-5' />
                <span className='text-paragraph-md'>No description</span>
              </div>
            )}
          </div>

          <div className='divide-y divide-stroke-soft-200 overflow-hidden rounded-xl border border-stroke-soft-200 bg-white'>
            <FieldRow icon={RiUserLine} label='Assignee'>
              <AssigneeAvatars assignees={assigneeDetails} />
            </FieldRow>
            <FieldRow icon={RiCalendarLine} label='Start Date'>
              <span className='text-paragraph-sm text-text-sub-500'>
                {formatDateLabel(task.startDate)}
              </span>
            </FieldRow>
            <FieldRow icon={RiCalendarLine} label='Due Date'>
              <span className='text-paragraph-sm text-text-sub-500'>
                {formatDateLabel(task.dueDate)}
              </span>
            </FieldRow>
            <FieldRow icon={RiFlagLine} label='Priority'>
              {task.priority ? (
                <Badge.Root variant='light' color={priorityColor || 'gray'} className='uppercase'>
                  {task.priority}
                </Badge.Root>
              ) : (
                <span className='text-paragraph-sm text-text-soft-400'>—</span>
              )}
            </FieldRow>

            {task.customFields &&
              Object.entries(task.customFields)
                .filter(([fieldKey]) => !String(fieldKey).startsWith('_'))
                .map(([fieldKey, fieldValue]) => (
                  <FieldRow key={fieldKey} label={fieldKey}>
                    <span className='text-paragraph-sm text-text-sub-500'>
                      {fieldValue == null || fieldValue === ''
                        ? '—'
                        : typeof fieldValue === 'object'
                          ? JSON.stringify(fieldValue)
                          : String(fieldValue)}
                    </span>
                  </FieldRow>
                ))}
          </div>

          <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-1.5 text-text-soft-400'>
              <RiPriceTag3Line className='size-5' />
              <span className='text-label-sm'>Tags</span>
            </div>
            {task.tags?.length ? (
              <div className='flex flex-wrap gap-1.5'>
                {task.tags.map((tag) => (
                  <Tag.Root key={tag}>{tag}</Tag.Root>
                ))}
              </div>
            ) : (
              <span className='text-paragraph-sm text-text-soft-400'>No tags</span>
            )}
          </div>

          <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-1.5 text-text-soft-400'>
              <RiAttachment2 className='size-5' />
              <span className='text-label-sm'>Attachments</span>
            </div>
            <AttachmentList
              attachments={task.attachments ?? []}
              disabled
              emptyStateMessage='No attachments'
              emptyStateDescription=''
            />
          </div>
        </div>
      </div>

      <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
        <div className='border-b border-stroke-soft-200 px-6 py-3'>
          <h2 className='text-label-sm text-text-main-900'>Comments</h2>
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto'>
          <CommentsTimeline
            comments={comments}
            history={[]}
            loading={false}
            collapsedItemCount={3}
            renderComment={(comment) => <BoardCommentItem comment={comment} reactionsReadOnly />}
            emptyStateTitle='There are no comments here yet.'
          />
        </div>
      </div>
    </div>
  );
}

function PublicTaskShell({ children }) {
  return (
    <div className='flex h-dvh min-w-0 overflow-hidden bg-bg-white-0'>{children}</div>
  );
}

export default function PublicTaskPage() {
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const key = searchParams.get('key');
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, refreshSession } = useAuth();

  const [isTaskLoading, setIsTaskLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  // Public routes skip ProtectedRoute, so hydrate the same session sidebar/profile
  // path the rest of the app uses before rendering any app chrome.
  useEffect(() => {
    refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- match ProtectedRoute: once on mount
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!taskId || !key) {
        setError('This link is invalid or has expired.');
        setIsTaskLoading(false);
        return;
      }

      setIsTaskLoading(true);
      setError(null);

      const result = await getPublicTask({ taskId, key });
      if (cancelled) {
        return;
      }

      if (result.error) {
        setError(result.error);
        setPayload(null);
        setIsTaskLoading(false);
        return;
      }

      setPayload(result.data);
      setIsTaskLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [key, taskId]);

  useEffect(() => {
    if (!isAuthenticated || authLoading || isTaskLoading || !payload?.viewerIsMember) {
      return;
    }

    const path = buildBoardTaskSearchPath({
      id: payload.task?.id || taskId,
      listId: payload.listId || payload.task?.listId,
      spaceId: payload.spaceId || payload.task?.spaceId,
      folderId: payload.folderId || payload.task?.folderId,
    });
    navigate(path, { replace: true });
  }, [authLoading, isAuthenticated, isTaskLoading, navigate, payload, taskId]);

  const task = payload?.task;
  const comments = payload?.comments ?? [];
  const assigneeDetails = useMemo(() => {
    if (Array.isArray(task?.assigneeDetails) && task.assigneeDetails.length > 0) {
      return task.assigneeDetails;
    }
    return (task?.assignees ?? []).map((user) => (typeof user === 'string' ? { user } : user));
  }, [task]);

  const priorityColor = getPriorityColor(task?.priority);
  const isBootstrapping = authLoading || isTaskLoading;
  const isRedirectingMember = Boolean(payload?.viewerIsMember && isAuthenticated);

  if (isBootstrapping || isRedirectingMember) {
    return (
      <PublicTaskShell>
        <div className='flex h-full w-full flex-1 items-center justify-center'>
          <div className='size-8 animate-spin rounded-full border-4 border-primary-base border-t-transparent' />
        </div>
      </PublicTaskShell>
    );
  }

  if (error || !task) {
    return (
      <PublicTaskShell>
        <div className='flex h-full w-full flex-1 items-center justify-center px-6'>
          <ErrorStateCard
            title='This link is invalid or has expired.'
            message='Ask the task owner to share a new public link.'
          />
        </div>
      </PublicTaskShell>
    );
  }

  return (
    <PublicTaskShell>
      <div className='flex h-full min-h-0 w-full flex-1 flex-col'>
        <div className='flex shrink-0 items-center justify-between border-b border-stroke-soft-200 px-6 py-3'>
          <p className='text-label-sm text-text-main-900'>{task.title || 'Task'}</p>
          <Badge.Root variant='light' color='gray' className='uppercase'>
            View only
          </Badge.Root>
        </div>

        <PublicTaskContent
          task={task}
          comments={comments}
          assigneeDetails={assigneeDetails}
          priorityColor={priorityColor}
        />
      </div>
    </PublicTaskShell>
  );
}
