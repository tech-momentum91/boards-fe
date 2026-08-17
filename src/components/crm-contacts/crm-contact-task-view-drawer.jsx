import React, { useState } from 'react';
import {
  RiCloseLine,
  RiAddLine,
  RiFlagLine,
  RiCalendarLine,
  RiUserLine,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiAttachment2,
  RiUploadLine,
  RiChat2Line,
  RiCheckLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as LinkButton from '@/components/ui/link-button';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Select from '@/components/ui/select';
import * as Input from '@/components/ui/input';
import * as Textarea from '@/components/ui/textarea';
import * as Tag from '@/components/ui/tag';
import FieldRow from '@/components/ui/field-row';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import AttachmentList from '@/components/ui/attachment-list';
import { Datepicker } from '@/components/ui/datepicker';
import CrmComment from '@/components/crm-tasks/crm-comment';

const STATUS_OPTIONS = ['Pending', 'Ongoing', 'Completed'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];
const TYPE_OPTIONS = ['Call', 'Meeting', 'Task'];

const getStatusColor = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return 'green';
  if (s === 'ongoing') return 'blue';
  return 'orange';
};

const getPriorityColor = (priority) => {
  const p = String(priority || '').toLowerCase();
  if (p === 'low') return 'green';
  if (p === 'medium') return 'orange';
  if (p === 'high') return 'red';
  return 'gray';
};

const parseSafeDate = (dateString) => {
  if (!dateString) return undefined;
  if (dateString.includes('-')) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
  }
  const cleaned = String(dateString)
    .replace(/(\d+)(st|nd|rd|th)/, '$1')
    .replace(/ (\d{2})$/, ' 20$1');
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const CrmContactTaskViewDrawer = ({
  open,
  onOpenChange,
  task,
  onTaskUpdate,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious = false,
  hasNext = false,
}) => {
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const fileInputRef = React.useRef(null);

  if (!open || !task) return null;

  const handleFieldChange = (field, value) => {
    if (onTaskUpdate && task.id) {
      onTaskUpdate(task.id, field, value);
    }
  };

  const handleFileInputChange = (event) => {
    const files = [...event.target.files];
    const newAttachments = files.map((file) => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      id: Math.random().toString(36).slice(2, 11),
      date: new Date().toISOString(),
    }));

    handleFieldChange('attachments', [
      ...(Array.isArray(task?.attachments) ? task.attachments : []),
      ...newAttachments,
    ]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddTag = () => {
    const value = newTagValue.trim();
    if (value) {
      const currentTags = task.tags || [];
      if (!currentTags.includes(value)) {
        handleFieldChange('tags', [...currentTags, value]);
      }
    }
    setNewTagValue('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (indexOrTag) => {
    const currentTags = task.tags || [];
    if (typeof indexOrTag === 'number') {
      handleFieldChange(
        'tags',
        currentTags.filter((_, i) => i !== indexOrTag),
      );
    } else {
      handleFieldChange(
        'tags',
        currentTags.filter((t) => t !== indexOrTag),
      );
    }
  };

  const handleRemoveAttachment = (attId) => {
    const currentAtts = task.attachments || [];
    handleFieldChange(
      'attachments',
      currentAtts.filter((a) => a.id !== attId),
    );
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[1200px]'>
        <Drawer.Header
          className='px-6 py-3 border-b border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-center justify-between w-full'>
            <Drawer.Title className='label-medium text-text-main-900 hidden'>
              Task Details
            </Drawer.Title>
            <div className='flex-1' />
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-1'>
                <ButtonGroup.Root size='xsmall'>
                  <ButtonGroup.Item
                    onClick={onNavigatePrevious}
                    disabled={!hasPrevious}
                    aria-label='Previous task'
                  >
                    <ButtonGroup.Icon as={RiArrowLeftSLine} />
                  </ButtonGroup.Item>
                  <ButtonGroup.Item
                    onClick={onNavigateNext}
                    disabled={!hasNext}
                    aria-label='Next task'
                  >
                    <ButtonGroup.Icon as={RiArrowRightSLine} />
                  </ButtonGroup.Item>
                </ButtonGroup.Root>
              </div>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                onClick={() => onOpenChange(false)}
                className='shrink-0'
              >
                <Button.Icon as={RiCloseLine} className='shrink-0' />
              </Button.Root>
            </div>
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex-1 p-0 overflow-hidden flex flex-col min-h-0'>
          <div className='flex flex-1 min-h-0'>
            {/* LEFT SIDE - Details Panel (scrolls independently like ticket-view-drawer) */}
            <div className='w-[420px] shrink-0 border-r border-stroke-soft-200 overflow-y-auto min-h-0'>
              <div className='px-6 pt-5 pb-6 flex flex-col gap-6'>
                {/* Editable Title */}
                <div>
                  <Textarea.Root
                    variant='borderless'
                    simple
                    value={task.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    className='field-sizing-content text-title-h5 text-text-main-900 font-semibold p-1'
                    rows={1}
                    placeholder='Task Title'
                  />
                </div>

                {/* Fields Table */}
                <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                  {/* Status — match ticket-view-drawer: Badge small (default), text-nowrap only */}
                  <FieldRow icon={RiPriceTag3Line} label='Status' editable={true}>
                    <Select.Root
                      variant='borderless'
                      value={task.status}
                      onValueChange={(value) => handleFieldChange('status', value)}
                      size='xsmall'
                    >
                      <Select.Trigger className='w-full' showArrow={false}>
                        <Select.Value asChild>
                          <Badge.Root
                            variant='light'
                            color={getStatusColor(task.status)}
                            size='small'
                            className='text-nowrap'
                          >
                            {task.status || 'Not Set'}
                          </Badge.Root>
                        </Select.Value>
                      </Select.Trigger>
                      <Select.Content>
                        {STATUS_OPTIONS.map((opt) => (
                          <Select.Item key={opt} value={opt}>
                            <Badge.Root
                              variant='light'
                              color={getStatusColor(opt)}
                              size='small'
                              className='text-nowrap'
                            >
                              {opt}
                            </Badge.Root>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FieldRow>

                  {/* Assignee Field (Inline Editable matching Tasks Table) */}
                  <FieldRow icon={RiUserLine} label='Assignee' editable={true}>
                    <AssigneeMultiSelect
                      value={
                        Array.isArray(task.assignees)
                          ? task.assignees
                          : task.assignees
                            ? [task.assignees]
                            : []
                      }
                      onChange={(values) => {
                        handleFieldChange('assignees', values.length > 0 ? values : '');
                      }}
                      placeholder='Select assignees'
                      size='xsmall'
                      maxVisibleAvatars={3}
                    />
                  </FieldRow>

                  {/* Type — match ticket-view-drawer: Badge small, text-nowrap only */}
                  <FieldRow icon={RiPriceTag3Line} label='Type' editable={true}>
                    <Select.Root
                      variant='borderless'
                      value={task.type}
                      onValueChange={(value) => handleFieldChange('type', value)}
                      size='xsmall'
                    >
                      <Select.Trigger className='w-full' showArrow={false}>
                        <Select.Value asChild>
                          <Badge.Root
                            variant='stroke'
                            color='gray'
                            size='small'
                            className='text-nowrap text-text-sub-600 bg-bg-white-0 border-stroke-soft-200'
                          >
                            {task.type || 'Not Set'}
                          </Badge.Root>
                        </Select.Value>
                      </Select.Trigger>
                      <Select.Content>
                        {TYPE_OPTIONS.map((opt) => (
                          <Select.Item key={opt} value={opt}>
                            <Badge.Root
                              variant='stroke'
                              color='gray'
                              size='small'
                              className='text-nowrap text-text-sub-600 bg-bg-white-0 border-stroke-soft-200'
                            >
                              {opt}
                            </Badge.Root>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FieldRow>

                  {/* Due Date Field */}
                  <FieldRow icon={RiCalendarLine} label='Due Date' editable={true}>
                    <Datepicker
                      value={parseSafeDate(task.dueDate)}
                      onChange={(date) => {
                        if (date) {
                          const day = date.getDate();
                          const getOrdinal = (n) => {
                            if (n > 3 && n < 21) return 'th';
                            switch (n % 10) {
                              case 1:
                                return 'st';
                              case 2:
                                return 'nd';
                              case 3:
                                return 'rd';
                              default:
                                return 'th';
                            }
                          };
                          const month = date.toLocaleString('default', { month: 'short' });
                          const year = String(date.getFullYear()).slice(2);
                          handleFieldChange('dueDate', `${day}${getOrdinal(day)} ${month} ${year}`);
                        } else {
                          handleFieldChange('dueDate', '');
                        }
                      }}
                      placeholder='Select a date'
                      variant='borderless'
                      size='xsmall'
                    />
                  </FieldRow>

                  {/* Priority — match ticket-view-drawer: Badge small (default), text-nowrap only */}
                  <FieldRow icon={RiFlagLine} label='Priority' editable={true}>
                    <Select.Root
                      variant='borderless'
                      value={task.priority}
                      onValueChange={(value) => handleFieldChange('priority', value)}
                      size='xsmall'
                    >
                      <Select.Trigger className='w-full' showArrow={false}>
                        <Select.Value asChild>
                          <Badge.Root
                            variant='light'
                            color={getPriorityColor(task.priority)}
                            size='small'
                            className='text-nowrap'
                          >
                            {task.priority || 'Not Set'}
                          </Badge.Root>
                        </Select.Value>
                      </Select.Trigger>
                      <Select.Content>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <Select.Item key={opt} value={opt}>
                            <Badge.Root
                              variant='light'
                              color={getPriorityColor(opt)}
                              size='small'
                              className='text-nowrap'
                            >
                              {opt}
                            </Badge.Root>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FieldRow>
                </div>

                {/* Editable Description */}
                <div className='flex flex-col gap-2 pt-2'>
                  <div className='flex items-center gap-2'>
                    <RiStickyNoteLine size={20} className='text-neutral-400' />
                    <span className='label-small text-text-sub-500'>Description</span>
                  </div>
                  <Textarea.Root
                    variant='borderless'
                    simple
                    value={task.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    className='w-full field-sizing-content'
                    placeholder='Enter description'
                    rows={4}
                  />
                </div>

                {/* Tags — match crm-task-view-drawer + image: icon + title, green "+ Add Tag", chips with X */}
                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    <RiPriceTag3Line size={20} className='text-neutral-400' />
                    <span className='label-small text-text-sub-500'>Tags</span>
                  </div>

                  <div className='w-full'>
                    {isAddingTag ? (
                      <div className='flex items-center gap-2'>
                        <Input.Root className='flex-1' size='xsmall'>
                          <Input.Wrapper>
                            <Input.Input
                              placeholder='Enter tag'
                              value={newTagValue}
                              onChange={(e) => setNewTagValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddTag();
                                }
                              }}
                              autoFocus
                            />
                          </Input.Wrapper>
                        </Input.Root>
                        <Button.Root
                          variant='neutral'
                          mode='ghost'
                          size='xsmall'
                          className='bg-error-lighter text-error-dark'
                          onClick={() => {
                            setIsAddingTag(false);
                            setNewTagValue('');
                          }}
                        >
                          <Button.Icon as={RiCloseLine} />
                        </Button.Root>
                        <Button.Root
                          variant='neutral'
                          mode='ghost'
                          size='xsmall'
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTag();
                          }}
                          className='bg-primary-lighter text-primary-dark'
                          onClick={handleAddTag}
                        >
                          <Button.Icon as={RiCheckLine} />
                        </Button.Root>
                      </div>
                    ) : (
                      <LinkButton.Root
                        variant='primary'
                        size='small'
                        onClick={() => setIsAddingTag(true)}
                      >
                        <LinkButton.Icon as={RiAddLine} />
                        Add Tag
                      </LinkButton.Root>
                    )}
                  </div>

                  {(task.tags?.length ?? 0) > 0 && (
                    <div className='flex flex-wrap gap-2'>
                      {task.tags.map((tag, index) => {
                        const tagDisplay =
                          typeof tag === 'string' ? tag : (tag?.name ?? tag?.label ?? String(tag));
                        return (
                          <Badge.Root
                            key={tagDisplay ? `${tagDisplay}-${index}` : `tag-${index}`}
                            size='small'
                            variant='stroke'
                            className='rounded-md bg-bg-weak-100 text-text-main-900 font-normal'
                          >
                            {tagDisplay}
                            <Tag.DismissButton onClick={() => handleRemoveTag(index)} />
                          </Badge.Root>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Attachments */}
                <div className='flex flex-col gap-3 pt-2 pb-6'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2 text-text-sub-500'>
                      <RiAttachment2 size={20} className='text-neutral-400' />
                      <span className='label-small'>Attachments</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <input
                        ref={fileInputRef}
                        type='file'
                        multiple
                        className='hidden'
                        onChange={handleFileInputChange}
                        accept='*/*'
                      />
                      <Button.Root
                        type='button'
                        variant='neutral'
                        mode='stroke'
                        size='xsmall'
                        className='gap-1'
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Button.Icon as={RiUploadLine} className='p-0.5' />
                        <span>Upload Files</span>
                      </Button.Root>
                    </div>
                  </div>

                  {/* If there are attachments, display them via standard AttachmentList */}
                  {task.attachments && task.attachments.length > 0 && (
                    <AttachmentList
                      attachments={task.attachments}
                      onRemove={(attId) => handleRemoveAttachment(attId)}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE - Comments (internal division + scroll inside, match ticket-view-drawer) */}
            <div className='flex flex-1 flex-col min-h-0 h-full overflow-hidden bg-white border-l border-stroke-soft-200'>
              <div className='px-6 py-4 flex items-center gap-2 border-b border-stroke-soft-200 shrink-0 bg-white'>
                <RiChat2Line size={18} className='text-text-sub-500' />
                <span className='label-small text-text-sub-600'>Comments</span>
              </div>

              {/* Scroll lives inside this content area only */}
              <div className='flex-1 min-h-0 flex flex-col overflow-hidden'>
                <CrmComment
                  taskId={task.id}
                  commentsData={{
                    comments: task.comments || [],
                    history: task.history || [],
                  }}
                  onAddComment={async (tId, content, attachments, parentCommentId) => {
                    const parentComment = parentCommentId
                      ? (task.comments || []).find((c) => c.id === parentCommentId)
                      : null;

                    const newComment = {
                      id: Date.now().toString(),
                      content,
                      creation: new Date().toISOString(),
                      user: { name: 'Current User' },
                      attachments: attachments || [],
                      ...(parentComment && {
                        parent_comment: parentComment,
                        custom_parent_comment: parentComment.id,
                      }),
                    };
                    const updatedComments = [...(task.comments || []), newComment];
                    handleFieldChange('comments', updatedComments);
                  }}
                  commentDoctype='ACL Task Comment'
                  onCommentsMutated={() => {
                    // In a real app, this would refetch comments from the backend
                    // For now, just notify parent (in this case, it's mock data)
                  }}
                />
              </div>
            </div>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CrmContactTaskViewDrawer;
