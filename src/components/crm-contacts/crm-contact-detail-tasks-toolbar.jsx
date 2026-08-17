import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { RiAddLine, RiTaskLine, RiLayoutColumnLine } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Switch from '@/components/ui/switch';
import CircularProgress from '@/components/ui/circular-progress';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import CrmContactTasksTable from '@/components/crm-contacts/crm-contact-tasks-table';
import {
  DEFAULT_TASK_COLUMN_WIDTHS,
  CONTACT_TASKS_COLUMN_STORAGE_KEY,
  CONTACT_TASKS_RESIZE_ENABLED_KEY,
} from './constants';
import CrmContactTaskViewDrawer from './crm-contact-task-view-drawer';
import CrmContactCreateTaskDrawer from './crm-contact-create-task-drawer';

const getMockTasksForContact = (contact) => {
  const baseTasks = [
    {
      id: 'task-1',
      task: 'Verify company details',
      assignee: ['Courtney Henry', 'Jerome Bell', 'Ralph Edwards'],
      type: 'Call',
      lifecycle_stage: 'SQL',
      lifecycle_stage_status: 'SQL',
      due_date: '12th Dec 25',
      tags: [
        'Amenities',
        'Services',
        'Parking',
        'Security',
        'Wifi',
        'Wifi',
        'Wifi',
        'Wifi',
        'Wifi',
        'Wifi',
        'Wifi',
        'Wifi',
        'Wifi',
      ],
      priority: 'Medium',
      status: 'Ongoing',
      description: 'Verify primary and billing company details with the client.',
      attachments: 2,
      created_by: 'Guy Hawkins',
      created_at: '10th Dec 25, 09:15:00',
      last_updated: '11th Dec 25, 14:30:00',
    },
    {
      id: 'task-2',
      task: 'Check lease requirement timeline',
      assignee: ['Courtney Henry', 'Jerome Bell'],
      type: 'Meeting',
      lifecycle_stage: 'SQL',
      lifecycle_stage_status: 'SQL',
      due_date: '16th Dec 25',
      tags: ['Training', 'Compliance'],
      priority: 'Low',
      status: 'Pending',
      description: 'Discuss lease requirement timelines and key compliance items.',
      attachments: 1,
      created_by: 'Courtney Henry',
      created_at: '11th Dec 25, 10:00:00',
      last_updated: '12th Dec 25, 12:45:00',
    },
    {
      id: 'task-3',
      task: 'Assign Relationship Owner Assign Relationship Owner Assign Relationship Owner',
      assignee: ['Guy Hawkins', 'Ralph Edwards'],
      type: 'Task',
      lifecycle_stage: 'SQL',
      lifecycle_stage_status: 'SQL',
      due_date: '16th Dec 25',
      tags: ['IT', 'Network'],
      priority: 'Low',
      status: 'Pending',
      description: 'Assign a long-term relationship owner for this account.',
      attachments: 0,
      created_by: 'Darrell Steward',
      created_at: '11th Dec 25, 11:30:00',
      last_updated: '11th Dec 25, 11:30:00',
    },
    {
      id: 'task-4',
      task: 'Schedule Introduction Call',
      assignee: ['Courtney Henry', 'Jerome Bell'],
      type: 'Call',
      lifecycle_stage: '-',
      lifecycle_stage_status: '-',
      due_date: '10th Dec 25',
      tags: ['KYC', 'Documentation'],
      priority: 'Low',
      status: 'Completed',
      description: 'Introductory KYC call with key stakeholders.',
      attachments: 3,
      created_by: 'Courtney Henry',
      created_at: '9th Dec 25, 16:00:00',
      last_updated: '10th Dec 25, 17:10:00',
      comments: [],
      history: [],
    },
  ];

  if (!contact?.name) return baseTasks;

  return baseTasks.map((task, index) =>
    index === 0
      ? {
          ...task,
          task: `${task.task} for ${contact.name}`,
        }
      : task,
  );
};

function loadTaskWidthOverrides() {
  try {
    const raw = localStorage.getItem(CONTACT_TASKS_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveTaskWidthOverrides(overrides) {
  try {
    localStorage.setItem(CONTACT_TASKS_COLUMN_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function loadTaskResizeEnabled() {
  try {
    const raw = localStorage.getItem(CONTACT_TASKS_RESIZE_ENABLED_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

function saveTaskResizeEnabled(enabled) {
  try {
    localStorage.setItem(CONTACT_TASKS_RESIZE_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
}

const CrmContactDetailTasksToolbar = ({ contact }) => {
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState(() => getMockTasksForContact(contact));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [columnConfig, setColumnConfig] = useState(null);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState(() => loadTaskWidthOverrides());
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(() => loadTaskResizeEnabled());
  const tableRef = useRef(null);

  const columnWidths = useMemo(
    () => ({ ...DEFAULT_TASK_COLUMN_WIDTHS, ...columnWidthOverrides }),
    [columnWidthOverrides],
  );

  const handleColumnResize = useCallback((columnId, width) => {
    setColumnWidthOverrides((previous) => {
      const next = { ...previous, [columnId]: width };
      saveTaskWidthOverrides(next);
      return next;
    });
  }, []);

  const handleResizeEnabledChange = useCallback((enabled) => {
    setResizeColumnsEnabled(enabled);
    saveTaskResizeEnabled(enabled);
  }, []);

  const handleResetColumnSizes = useCallback(() => {
    setColumnWidthOverrides({});
    saveTaskWidthOverrides({});
  }, []);

  useEffect(() => {
    setTasks(getMockTasksForContact(contact));
  }, [contact]);

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const needle = search.toLowerCase();
    return tasks.filter((task) => {
      const haystack = [
        task.task,
        task.type,
        task.lifecycle_stage,
        task.lifecycle_stage_status,
        task.priority,
        ...(Array.isArray(task.tags) ? task.tags : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [tasks, search]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (task) => String(task.status).toLowerCase() === 'completed',
  ).length;
  const completionPercent = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const selectedTaskIndex =
    selectedTask == null ? -1 : filteredTasks.findIndex((t) => t.id === selectedTask.id);
  const hasPrevious = selectedTaskIndex > 0;
  const hasNext = selectedTaskIndex >= 0 && selectedTaskIndex < filteredTasks.length - 1;
  const handleNavigatePrevious = () => {
    if (hasPrevious) setSelectedTask(filteredTasks[selectedTaskIndex - 1]);
  };
  const handleNavigateNext = () => {
    if (hasNext) setSelectedTask(filteredTasks[selectedTaskIndex + 1]);
  };

  return (
    <div className='flex-1 flex flex-col min-h-0 bg-white'>
      <div className='flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4'>
        {/* Toolbar Section */}
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-2'>
              <RiTaskLine className='size-4 shrink-0 text-text-sub-500' />
              <span className='text-label-sm text-text-sub-500'>Tasks</span>
            </div>

            <div className='inline-flex items-center justify-center gap-2 overflow-hidden rounded-md border-l border-away-dark/20 bg-away-light px-2 py-0.5'>
              <CircularProgress percentage={completionPercent} color='yellow' size={18} />
              <span className='text-label-sm font-normal text-away-dark'>{completionPercent}%</span>
              <span className='h-4 w-px shrink-0 bg-away-dark/30' aria-hidden />
              <span className='text-label-sm font-normal text-away-dark'>
                {completedTasks}/{totalTasks} Completed
              </span>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <Input.Root size='small' className='w-[220px]'>
              <Input.Wrapper>
                <Input.Input
                  placeholder='Search tasks...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>

            <ColumnManagerDropdown
              open={isColumnManagerOpen}
              onOpenChange={setIsColumnManagerOpen}
              config={columnConfig ?? tableRef.current?.columnConfigHook}
              tooltipContent={<p>Manage columns</p>}
              trigger={
                <Button.Root variant='neutral' mode='stroke' size='small'>
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
              footer={
                <div className='w-full flex flex-col items-center gap-3'>
                  <div className='w-full flex items-center justify-between gap-2'>
                    <span className='text-paragraph-sm text-text-main-900'>Resize columns</span>
                    <Switch.Root
                      checked={resizeColumnsEnabled}
                      onCheckedChange={handleResizeEnabledChange}
                      className='h-5 w-8'
                    />
                  </div>
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='small'
                    className='w-full'
                    onClick={handleResetColumnSizes}
                  >
                    Reset column sizes
                  </Button.Root>
                </div>
              }
            />

            {/* Add Task */}
            <button
              type='button'
              onClick={() => setIsCreateDrawerOpen(true)}
              className='inline-flex items-center gap-2 rounded-lg bg-primary-base px-3 py-2 text-label-sm font-medium text-white hover:bg-primary-darker transition-colors'
            >
              <RiAddLine className='size-4' />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className='flex-1 overflow-auto rounded-xl '>
          <CrmContactTasksTable
            ref={tableRef}
            rows={filteredTasks}
            isLoading={false}
            columnWidths={columnWidths}
            onColumnResize={handleColumnResize}
            resizeEnabled={resizeColumnsEnabled}
            onRowClick={(task) => {
              setSelectedTask(task);
              setIsDrawerOpen(true);
            }}
            onColumnConfigChange={setColumnConfig}
            onAssigneeChange={(taskId, assignees) => {
              setTasks((previous) =>
                previous.map((task) =>
                  task.id === taskId ? { ...task, assignee: assignees } : task,
                ),
              );
            }}
          />
        </div>
      </div>

      <CrmContactTaskViewDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        task={
          selectedTask
            ? {
                id: selectedTask.id,
                title: selectedTask.task,
                status: selectedTask.status,
                assignees: selectedTask.assignee || [],
                type: selectedTask.type,
                dueDate: selectedTask.due_date,
                priority: selectedTask.priority,
                description: selectedTask.description,
                tags: selectedTask.tags || [],
                attachments: selectedTask.attachments || [],
                comments: selectedTask.comments || [],
                history: selectedTask.history || [],
              }
            : undefined
        }
        onTaskUpdate={(taskId, fieldName, value) => {
          setTasks((previous) =>
            previous.map((t) => {
              if (t.id === taskId) {
                let tableField = fieldName;
                if (fieldName === 'title') tableField = 'task';
                if (fieldName === 'assignees') tableField = 'assignee';
                if (fieldName === 'dueDate') tableField = 'due_date';

                // Skip history generation for comments, history, or attachments updates
                if (
                  fieldName === 'comments' ||
                  fieldName === 'history' ||
                  fieldName === 'attachments'
                ) {
                  return { ...t, [tableField]: value };
                }

                // Map field name for display in history
                const displayField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

                const newHistoryItem = {
                  id: Date.now().toString(),
                  owner: 'Current User', // Mock owner
                  action: `changed ${displayField} to ${Array.isArray(value) ? value.join(', ') : value}`,
                  creation: new Date().toISOString(),
                };

                const updatedHistory = [newHistoryItem, ...(t.history || [])];

                return { ...t, [tableField]: value, history: updatedHistory };
              }
              return t;
            }),
          );
          if (selectedTask && selectedTask.id === taskId) {
            let tableField = fieldName;
            if (fieldName === 'title') tableField = 'task';
            if (fieldName === 'assignees') tableField = 'assignee';
            if (fieldName === 'dueDate') tableField = 'due_date';

            if (
              fieldName === 'comments' ||
              fieldName === 'history' ||
              fieldName === 'attachments'
            ) {
              setSelectedTask((previous) => ({ ...previous, [tableField]: value }));
              return;
            }

            const displayField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
            const newHistoryItem = {
              id: Date.now().toString(),
              owner: 'Current User',
              action: `changed ${displayField} to ${Array.isArray(value) ? value.join(', ') : value}`,
              creation: new Date().toISOString(),
            };

            setSelectedTask((previous) => ({
              ...previous,
              [tableField]: value,
              history: [newHistoryItem, ...(previous.history || [])],
            }));
          }
        }}
      />

      <CrmContactCreateTaskDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSubmit={() => true}
      />
    </div>
  );
};

export default CrmContactDetailTasksToolbar;
