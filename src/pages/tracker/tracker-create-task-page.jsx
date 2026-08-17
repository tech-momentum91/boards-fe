import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import UserAbsentSvg from '@/components/ui/user-absent-svg';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import * as Table from '@/components/ui/table';
import * as CompactButton from '@/components/ui/compact-button';
import * as Modal from '@/components/ui/modal';
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiDeleteBinLine,
  RiPencilLine,
  RiSearchLine,
} from 'react-icons/ri';
import CreateTrackerTaskDrawer from '@/components/tracker/create-tracker-task-drawer';
import {
  createSettingsTrackerTaskThunk,
  deleteTrackerTaskThunk,
  getSettingsTrackerTaskListThunk,
} from '@/redux/settingsTrackerSlice';
import { useNavigate, useParams } from 'react-router-dom';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '@/utils/error-utils';
import { centerTrackerTaskHasVisibleChecklists } from '@/utils/center-tracker-task-payload';
import { useDebounce } from '@/hooks/use-debounce';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';

const PAGE_SIZE = 20;

const trackerSettingsAssigneeRole = (raw) => {
  if (!raw) return '';
  let list = raw;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return String(list).trim();
    }
  }
  if (!Array.isArray(list)) return '';
  const first = list.find(
    (entry) =>
      String(entry?.assignee_type ?? '').toLowerCase() === 'role' &&
      String(entry?.assignee ?? '').trim(),
  );
  return String(first?.assignee ?? '').trim();
};

const EmptyTaskState = ({ onAddTask }) => (
  <div className='w-full p-12 gap-3 flex-col flex items-center justify-center'>
    <UserAbsentSvg />
    <span className='text-[var(--color-text-main-900)] label-large'>No Tasks Yet</span>
    <span className='label-small text-[var(--color-text-sub-500)]'>
      Create a new task to get started with your daily schedule.
    </span>
    <Button.Root size='xsmall' className='gap-1' onClick={onAddTask}>
      <Button.Icon as={RiAddLine} />
      Add Task
    </Button.Root>
  </div>
);

/** One checklist chip + remaining count with tooltip (same pattern as center tracker). */
const ChecklistItemsCell = ({ items = [] }) => {
  if (items.length === 0) {
    return <span className='paragraph-small text-[var(--color-text-soft-400)]'>—</span>;
  }

  return (
    <div className='flex min-w-0 items-center gap-1.5 overflow-hidden'>
      <Badge.Root
        size='small'
        variant='stroke'
        color='gray'
        className='min-w-0 max-w-[180px] justify-start overflow-hidden normal-case'
        title={items[0]}
      >
        <span className='min-w-0 truncate'>{items[0]}</span>
      </Badge.Root>
      {items.length > 1 && (
        <Tooltip.Root size='xsmall'>
          <Tooltip.Trigger asChild>
            <Badge.Root
              size='small'
              variant='stroke'
              color='gray'
              className='shrink-0 cursor-default normal-case'
            >
              +{items.length - 1}
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content side='bottom' className='max-w-[280px]'>
            <ul className='list-disc list-inside space-y-1 text-left paragraph-small'>
              {items.slice(1).map((remaining) => (
                <li className='paragraph-xsmall' key={remaining}>
                  {remaining}
                </li>
              ))}
            </ul>
          </Tooltip.Content>
        </Tooltip.Root>
      )}
    </div>
  );
};

const TrackerCreateTaskPage = ({ source = 'settings' }) => {
  const params = useParams();

  const dispatch = useDispatch();
  const { id: trackerId } = useParams();
  const trackerTaskListState = useSelector(
    (state) => state.settingsTracker.getSettingsTrackerTaskList,
  );

  const createTrackerTaskState = useSelector(
    (state) => state.settingsTracker.createSettingsTrackerTask,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('create'); // 'create' | 'edit'
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  const [tasks, setTasks] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    if (!trackerId) return;
    dispatch(
      getSettingsTrackerTaskListThunk({
        tracker_id: trackerId,
        keyword: debouncedSearch.trim(),
        page: 1,
        limit_page_length: PAGE_SIZE,
      }),
    );
  }, [dispatch, trackerId, debouncedSearch]);

  const handleLoadMore = useCallback(() => {
    if (
      !trackerTaskListState.hasMore ||
      trackerTaskListState.isLoadingMore ||
      trackerTaskListState.isLoading
    ) {
      return;
    }
    dispatch(
      getSettingsTrackerTaskListThunk({
        tracker_id: trackerId,
        keyword: debouncedSearch.trim(),
        page: (trackerTaskListState.page || 1) + 1,
        limit_page_length: trackerTaskListState.pageSize || PAGE_SIZE,
        append: true,
      }),
    );
  }, [dispatch, trackerId, debouncedSearch, trackerTaskListState]);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: handleLoadMore,
    hasMore: trackerTaskListState.hasMore,
    isLoading: trackerTaskListState.isLoading || trackerTaskListState.isLoadingMore,
    threshold: 200,
    enabled: Boolean(trackerTaskListState.data?.length) || trackerTaskListState.hasMore,
  });

  const refreshTaskList = useCallback(
    () =>
      dispatch(
        getSettingsTrackerTaskListThunk({
          tracker_id: trackerId,
          keyword: debouncedSearch.trim(),
          page: 1,
          limit_page_length: PAGE_SIZE,
        }),
      ),
    [dispatch, trackerId, debouncedSearch],
  );

  useEffect(() => {
    const toChecklistStrings = (raw) => {
      if (!Array.isArray(raw)) return [];
      return raw
        .map((item) =>
          typeof item === 'string' ? item : (item?.checklist_title ?? item?.title ?? ''),
        )
        .filter(Boolean);
    };

    const visible = (trackerTaskListState.data || []).filter((task) =>
      centerTrackerTaskHasVisibleChecklists(task?.checklist_items ?? task?.checklists),
    );
    const mappedTasks = visible
      .filter((task) => task?.name || task?.task_id)
      .map((task) => ({
        id: task.name || task.task_id,
        task_name: task?.task_name || task?.task_id || '',
        description: task?.description || '',
        checklist_items: toChecklistStrings(task?.checklist_items || task?.checklists || []),
        assignee_role: trackerSettingsAssigneeRole(task?.assignees),
        assignees: task?.assignees,
      }));
    setTasks(mappedTasks);
  }, [trackerTaskListState.data]);

  const editingTask = useMemo(
    () => tasks.find((t) => t.id === editingTaskId) ?? null,
    [tasks, editingTaskId],
  );

  const drawerInitialValues = useMemo(
    () =>
      editingTask
        ? {
            docName: editingTask.id,
            taskTitle: editingTask.task_name ?? '',
            description: editingTask.description ?? '',
            checklistItems: editingTask.checklist_items ?? [],
            assigneeRole: editingTask.assignee_role ?? '',
            assignees: editingTask.assignees,
          }
        : undefined,
    [editingTask],
  );

  const hasTasks = tasks.length > 0;
  const showEmpty = !trackerTaskListState.isLoading && !hasTasks;

  const handleDeleteTrackerTask = async (task_id) => {
    try {
      await dispatch(deleteTrackerTaskThunk(task_id)).unwrap();

      await refreshTaskList();

      setDeleteTaskId(null);

      showSuccessToast('Task deleted successfully.');
    } catch (error) {
      showErrorToast(error);
      // console.log('error delete tracker task', error);
    }
  };

  const openCreateDrawer = () => {
    setDrawerMode('create');
    setEditingTaskId(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (taskId) => {
    setDrawerMode('edit');
    setEditingTaskId(taskId);
    setDrawerOpen(true);
  };

  return (
    <div className='w-full flex-col gap-5 flex'>
      <div className='w-full flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <CompactButton.Root onClick={() => navigate(-1)}>
            <CompactButton.Icon as={RiArrowLeftSLine} />
          </CompactButton.Root>
          <div className='text-[var(--color-text-sub-500)] label-medium'>{params.id}</div>
        </div>
        <div className='flex gap-4 items-center'>
          <Input.Root size='xsmall' className='w-[200px]'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} className='w-4 h-4' />
              <Input.Input
                placeholder='Enter task name'
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </Input.Wrapper>
          </Input.Root>
          <Button.Root size='xsmall' className='gap-1' onClick={openCreateDrawer}>
            <Button.Icon as={RiAddLine} />
            Add Task
          </Button.Root>
        </div>
      </div>

      <div className='w-full'>
        {showEmpty ? (
          <EmptyTaskState onAddTask={openCreateDrawer} />
        ) : (
          <Table.Root variant='compact'>
            <Table.Header>
              <Table.Row>
                <Table.Head>Task Name</Table.Head>
                <Table.Head>Description</Table.Head>
                <Table.Head>Role</Table.Head>
                <Table.Head>Checklist Items</Table.Head>
                <Table.Head className='w-[56px] text-right' />
              </Table.Row>
            </Table.Header>

            <Table.Body spacing={8}>
              {tasks.map((task, index, array) => (
                <React.Fragment key={task.id}>
                  <Table.Row>
                    <Table.Cell className='min-w-[220px]'>
                      <span className='label-small text-[var(--color-text-sub-500)]'>
                        {task.task_name}
                      </span>
                    </Table.Cell>
                    <Table.Cell className='min-w-[260px]'>
                      <span className='paragraph-small text-[var(--color-text-sub-500)]'>
                        {task.description}
                      </span>
                    </Table.Cell>
                    <Table.Cell className='min-w-[160px]'>
                      <span className='paragraph-small text-[var(--color-text-sub-500)]'>
                        {task.assignee_role || '—'}
                      </span>
                    </Table.Cell>
                    <Table.Cell className='min-w-[200px] max-w-[280px]'>
                      <ChecklistItemsCell items={task?.checklist_items ?? []} />
                    </Table.Cell>
                    <Table.Cell className='w-[56px] text-right'>
                      <div className='flex gap-1 items-center justify-end'>
                        <CompactButton.Root
                          size='xsmall'
                          variant='neutral'
                          mode='stroke'
                          onClick={() => openEditDrawer(task.id)}
                        >
                          <CompactButton.Icon as={RiPencilLine} />
                        </CompactButton.Root>

                        <CompactButton.Root
                          size='xsmall'
                          variant='neutral'
                          mode='stroke'
                          onClick={() => setDeleteTaskId(task.id)}
                        >
                          <CompactButton.Icon as={RiDeleteBinLine} />
                        </CompactButton.Root>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                  {index < array.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}
              <Table.Row ref={sentinelRef} data-scroll-sentinel>
                <Table.Cell colSpan={5} className='h-1 p-0' />
              </Table.Row>
              {trackerTaskListState.isLoadingMore && (
                <Table.Row>
                  <Table.Cell
                    colSpan={5}
                    className='py-3 text-center text-paragraph-sm text-text-sub-600'
                  >
                    Loading more tasks...
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        )}
        {trackerTaskListState.isLoading && (
          <div className='py-6 text-center text-paragraph-sm text-text-sub-600'>
            Loading tasks...
          </div>
        )}
      </div>
      <CreateTrackerTaskDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        source={source === 'settings' ? 'tracker-settings' : 'tracker-task'}
        isSubmitting={createTrackerTaskState.isLoading}
        mode={drawerMode}
        initialValues={drawerInitialValues}
        onSubmit={async (data) => {
          const roleName = String(data.assigneeRole ?? '').trim();
          const nextTask = {
            task_name: data.taskTitle,
            description: data.description ?? '',
            checklist_items: data.checklistItems ?? [],
            assignee_role: roleName,
            assignees: roleName ? [{ assignee_type: 'Role', assignee: roleName }] : [],
          };

          if (drawerMode === 'edit' && editingTaskId) {
            // Refresh from server to pick up any backend rename
            if (trackerId) {
              await dispatch(
                getSettingsTrackerTaskListThunk({
                  tracker_id: trackerId,
                  keyword: debouncedSearch.trim(),
                  page: 1,
                  limit_page_length: 20,
                }),
              );
            } else {
              setTasks((prev) =>
                prev.map((t) => (t.id === editingTaskId ? { ...t, ...nextTask } : t)),
              );
            }
            return true;
          }

          if (!trackerId) return false;

          const payload = {
            tracker: trackerId,
            task_name: nextTask.task_name,
            description: nextTask.description,
            checklists: (nextTask.checklist_items || []).map((item) => ({
              checklist_title: item,
            })),
            assignees: [{ assignee_type: 'Role', assignee: roleName }],
          };

          try {
            await dispatch(createSettingsTrackerTaskThunk(payload)).unwrap();
            await refreshTaskList();
            showSuccessToast('Task created successfully.');
            return true;
          } catch (error) {
            showErrorToast(
              extractErrorMessage(error, 'Could not create task. Task name may already exist.'),
            );
            return false;
          }
        }}
      />

      <Modal.Root open={Boolean(deleteTaskId)} onOpenChange={(o) => !o && setDeleteTaskId(null)}>
        <Modal.Content className='max-w-[440px]'>
          <Modal.Header
            title='Remove task?'
            description='This will permanently remove the task from your list.'
          />
          <Modal.Body>
            <div className='paragraph-small text-text-sub-600'>You can’t undo this action.</div>
          </Modal.Body>
          <Modal.Footer className='justify-end'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={() => setDeleteTaskId(null)}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              size='xsmall'
              onClick={() => {
                handleDeleteTrackerTask(deleteTaskId);
              }}
            >
              Remove
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
};

export default TrackerCreateTaskPage;
