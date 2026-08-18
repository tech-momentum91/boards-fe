import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiUserLine } from 'react-icons/ri';
import TaskAssigneeCell from './TaskAssigneeCell';
import TaskCustomFieldCell from './TaskCustomFieldCell';
import TaskDueDateCell from './TaskDueDateCell';
import TaskErpFieldCell from './TaskErpFieldCell';
import TaskPriorityCell from './TaskPriorityCell';
import TaskStatusCell from './TaskStatusCell';
import TaskTagsCell from './TaskTagsCell';
import TaskTitleCell from './TaskTitleCell';
import { getTaskErpFieldValue, isErpColumn } from '../utils/erp-column-utils';
import { getTaskSystemListRedirectLink } from '../utils/system-link-utils';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import * as Tooltip from '@/components/ui/tooltip';
import { searchUsers, selectUserSearch } from '@/redux/userSlice';
import { cn } from '@/utils/cn';
import { formatDDMMYY } from '@/utils/date-utils';
import { getAssigneeDisplayName, getAssigneeFirstNameInitial } from '@/utils/task-utils';

function TaskReadOnlyTextCell({ value, emptyLabel = '—' }) {
  const hasValue = value != null && String(value).trim() !== '';

  return (
    <div className='flex h-full min-h-11 w-full items-center px-3'>
      <span
        className={cn('truncate text-sm', hasValue ? 'text-text-sub-500' : 'text-text-soft-400')}
      >
        {hasValue ? value : emptyLabel}
      </span>
    </div>
  );
}

function resolveCreatedByMeta(createdBy, createdByDetails, assigneeDetails = [], users = []) {
  if (!createdBy) {
    return null;
  }

  const createdById = String(createdBy);
  let meta = { value: createdById, email: createdById, user: createdById };

  if (createdByDetails && typeof createdByDetails === 'object') {
    meta = { ...meta, ...createdByDetails };
  }

  const fromAssignees = (assigneeDetails ?? []).find((entry) => {
    if (typeof entry === 'string') {
      return String(entry) === createdById;
    }

    return [entry?.user, entry?.email, entry?.value, entry?.assignee, entry?.name].some(
      (value) => value != null && String(value) === createdById,
    );
  });

  if (fromAssignees && typeof fromAssignees === 'object') {
    meta = { ...meta, ...fromAssignees };
  }

  const fromUsers = (users ?? []).find(
    (user) =>
      String(user?.value ?? '') === createdById ||
      String(user?.email ?? '') === createdById ||
      String(user?.user ?? '') === createdById ||
      String(user?.name ?? '') === createdById,
  );

  if (fromUsers) {
    meta = { ...meta, ...fromUsers };
  }

  return meta;
}

const createdByUserCache = new Map();
const requestedCreatedByIds = new Set();

function TaskCreatedByCell({
  createdBy = '',
  createdByDetails = null,
  assigneeDetails = [],
  compact = false,
}) {
  const dispatch = useDispatch();
  const userSearch = useSelector(selectUserSearch);
  const [resolvedUser, setResolvedUser] = useState(() => {
    const createdById = String(createdBy ?? '').trim();
    return createdById ? (createdByUserCache.get(createdById) ?? null) : null;
  });

  useEffect(() => {
    const createdById = String(createdBy ?? '').trim();
    if (!createdById) {
      setResolvedUser(null);
      return;
    }

    const cached = createdByUserCache.get(createdById);
    if (cached) {
      setResolvedUser(cached);
      return;
    }

    const fromSearch = (userSearch?.data ?? []).find(
      (user) =>
        String(user?.value ?? '') === createdById ||
        String(user?.email ?? '') === createdById ||
        String(user?.user ?? '') === createdById ||
        String(user?.name ?? '') === createdById,
    );

    if (fromSearch?.image || fromSearch?.user_image || fromSearch?.full_name) {
      createdByUserCache.set(createdById, fromSearch);
      setResolvedUser(fromSearch);
      return;
    }

    if (requestedCreatedByIds.has(createdById)) {
      return;
    }

    requestedCreatedByIds.add(createdById);
    dispatch(
      searchUsers({
        names: [createdById],
        limit: 1,
        updateSearchData: false,
      }),
    )
      .unwrap()
      .then((payload) => {
        const user = payload?.users?.[0] ?? null;
        if (user) {
          createdByUserCache.set(createdById, user);
          setResolvedUser(user);
        }
      })
      .catch(() => {
        requestedCreatedByIds.delete(createdById);
      });
  }, [createdBy, dispatch, userSearch?.data]);

  const meta = useMemo(
    () =>
      resolveCreatedByMeta(createdBy, createdByDetails, assigneeDetails, [
        ...(resolvedUser ? [resolvedUser] : []),
        ...(userSearch?.data ?? []),
      ]),
    [assigneeDetails, createdBy, createdByDetails, resolvedUser, userSearch?.data],
  );

  if (!createdBy || !meta) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center',
          compact ? 'justify-center px-1' : 'min-h-11 px-3',
        )}
      >
        {compact ? null : <RiUserLine size={18} className='text-icon-soft-400' />}
      </div>
    );
  }

  const displayName = getAssigneeDisplayName(meta);

  return (
    <div
      className={cn(
        'flex h-full w-full items-center',
        compact ? 'justify-center px-1' : 'min-h-11 px-3',
      )}
    >
      <Tooltip.Root size='xsmall'>
        <Tooltip.Trigger asChild>
          <span className='inline-flex'>
            <CrmAccountAvatar
              name={displayName}
              initials={getAssigneeFirstNameInitial(meta)}
              image={meta.image || meta.user_image}
              index={0}
              size={compact ? 20 : 24}
              showNativeTitle={false}
            />
          </span>
        </Tooltip.Trigger>
        {displayName ? (
          <Tooltip.Content size='xsmall' side='bottom'>
            {displayName}
          </Tooltip.Content>
        ) : null}
      </Tooltip.Root>
    </div>
  );
}

export default function TaskFieldCell({
  column,
  task,
  disabled = false,
  forceTitleEditing = false,
  onCancelTitleEditing,
  onTitleUpdate,
  onAssigneeUpdate,
  onDueDateUpdate,
  onStatusUpdate,
  onPriorityUpdate,
  onCustomFieldUpdate,
  statusGroups = [],
  allStatusGroups = [],
  isStatusLoading = false,
  isTableLayout = false,
  onTitleExpand,
  erpValuesByLink = {},
  onErpLinkUpdate,
}) {
  const compact = isTableLayout;

  if (isErpColumn(column)) {
    return (
      <TaskErpFieldCell
        column={column}
        task={task}
        value={getTaskErpFieldValue(task, column, erpValuesByLink)}
        disabled={disabled}
        compact={compact}
        onLinkUpdate={onErpLinkUpdate}
      />
    );
  }

  switch (column.key) {
    case 'title':
      return (
        <TaskTitleCell
          taskId={task.id}
          title={task.title}
          systemLink={getTaskSystemListRedirectLink(task)}
          status={task.status}
          statusGroups={statusGroups}
          allStatusGroups={allStatusGroups}
          isStatusLoading={isStatusLoading}
          onStatusUpdate={onStatusUpdate}
          showStatusIcon
          onUpdate={onTitleUpdate}
          disabled={disabled}
          forceEditing={forceTitleEditing}
          onCancelForceEditing={onCancelTitleEditing}
          isTableLayout={isTableLayout}
          onExpand={onTitleExpand}
        />
      );
    case 'assignee':
      return (
        <TaskAssigneeCell
          taskId={task.id}
          assignees={task.assignees ?? (task.assignee ? [task.assignee] : [])}
          assigneeDetails={task.assigneeDetails ?? []}
          onUpdate={onAssigneeUpdate}
          disabled={disabled}
          compact={compact}
        />
      );
    case 'dueDate':
      return (
        <TaskDueDateCell
          taskId={task.id}
          dueDate={task.dueDate}
          onUpdate={onDueDateUpdate}
          disabled={disabled}
          compact={compact}
        />
      );
    case 'status':
      return (
        <TaskStatusCell
          taskId={task.id}
          status={task.status}
          statusGroups={statusGroups}
          allStatusGroups={allStatusGroups}
          isStatusLoading={isStatusLoading}
          onUpdate={onStatusUpdate}
          disabled={disabled}
          compact={compact}
        />
      );
    case 'priority':
      return (
        <TaskPriorityCell
          taskId={task.id}
          priority={task.priority}
          onUpdate={onPriorityUpdate}
          disabled={disabled}
          compact={compact}
        />
      );
    case 'tags':
      return <TaskTagsCell tags={task.tags} compact={compact} />;
    case 'createdBy':
      return (
        <TaskCreatedByCell
          createdBy={task.createdBy ?? ''}
          createdByDetails={task.createdByDetails ?? null}
          assigneeDetails={task.assigneeDetails ?? []}
          compact={compact}
        />
      );
    case 'dateCreated': {
      const dateCreated = task.dateCreated ?? task.creation ?? '';
      return (
        <TaskReadOnlyTextCell
          value={dateCreated ? formatDDMMYY(dateCreated) : ''}
          emptyLabel={compact ? '' : '—'}
        />
      );
    }
    case 'dateUpdated': {
      const dateUpdated = task.dateUpdated ?? task.modified ?? '';
      return (
        <TaskReadOnlyTextCell
          value={dateUpdated ? formatDDMMYY(dateUpdated) : ''}
          emptyLabel={compact ? '' : '—'}
        />
      );
    }
    case 'comments': {
      const count = Number(task.commentCount ?? 0);
      const displayCount = Number.isFinite(count) ? count : 0;
      return <TaskReadOnlyTextCell value={String(displayCount)} emptyLabel='0' />;
    }
    case 'latestComment': {
      const latest = String(task.latestComment ?? '').trim();
      return <TaskReadOnlyTextCell value={latest} emptyLabel={compact ? '' : '—'} />;
    }
    default:
      return (
        <TaskCustomFieldCell
          column={column}
          value={task.customFields?.[column.key]}
          disabled={disabled}
          taskId={task.id}
          hideEmptyPlaceholder={compact}
          onUpdate={(value) => onCustomFieldUpdate?.(task.id, column.key, value)}
        />
      );
  }
}
