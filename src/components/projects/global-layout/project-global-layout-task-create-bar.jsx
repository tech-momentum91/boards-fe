import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiCalendarLine, RiUserLine } from 'react-icons/ri';

import { buildGlobalLayoutAreaSelectOptions } from '@/components/projects/global-layout/project-global-layout-task-create-helpers';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import * as Button from '@/components/ui/button';
import { Datepicker } from '@/components/ui/datepicker';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';

export default function ProjectGlobalLayoutTaskCreateBar({
  floor,
  projectId,
  defaultAreaId = '',
  taskType = '',
  isSaving = false,
  onCancel,
  onSave,
  className,
}) {
  const areaOptions = useMemo(
    () => buildGlobalLayoutAreaSelectOptions(floor?.areas),
    [floor?.areas],
  );

  const defaultArea = useMemo(() => {
    const match = areaOptions.find((option) => option.value === defaultAreaId);
    return match ?? areaOptions[0] ?? null;
  }, [areaOptions, defaultAreaId]);

  const [subject, setSubject] = useState(defaultArea?.label ?? '');
  const [areaId, setAreaId] = useState(defaultArea?.value ?? '');
  const [assignees, setAssignees] = useState([]);
  const [dueDate, setDueDate] = useState(null);
  const subjectInputRef = useRef(null);

  useEffect(() => {
    setSubject(defaultArea?.label ?? '');
    setAreaId(defaultArea?.value ?? '');
    setAssignees([]);
    setDueDate(null);
    subjectInputRef.current?.focus();
  }, [defaultArea?.label, defaultArea?.value, taskType]);

  const selectedArea = areaOptions.find((option) => option.value === areaId) ?? defaultArea;

  const handleSave = useCallback(() => {
    const trimmedSubject = String(subject ?? '').trim();
    if (!trimmedSubject || !areaId || isSaving) return;

    onSave?.({
      subject: trimmedSubject,
      areaId,
      areaType: selectedArea?.areaType ?? '',
      floor: String(floor?.floor ?? '').trim(),
      taskType: String(taskType ?? 'Project Tasks').trim(),
      assignees,
      dueDate,
    });
  }, [
    areaId,
    assignees,
    dueDate,
    floor?.floor,
    isSaving,
    onSave,
    selectedArea?.areaType,
    subject,
    taskType,
  ]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' || event.shiftKey || isSaving) return;

      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'textarea' || target?.isContentEditable) return;
      if (tag === 'input') return;
      if (target?.closest('[role="listbox"]') || target?.closest('[data-radix-select-viewport]')) {
        return;
      }

      const trimmedSubject = String(subject ?? '').trim();
      if (!trimmedSubject || !areaId) return;

      event.preventDefault();
      event.stopPropagation();
      handleSave();
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [areaId, handleSave, isSaving, subject]);

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSave();
  };

  return (
    <form
      className={cn(
        'pointer-events-auto flex w-[min(920px,calc(100vw-1.5rem))] items-center gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3 shadow-regular-md',
        className,
      )}
      onSubmit={handleSubmit}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Input.Root size='small' className='max-w-[200px]'>
        <Input.Wrapper>
          <Input.Input
            ref={subjectInputRef}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder='Subject'
            disabled={isSaving}
          />
        </Input.Wrapper>
      </Input.Root>

      <Select.Root
        value={areaId}
        onValueChange={setAreaId}
        disabled={isSaving || areaOptions.length === 0}
      >
        <Select.Trigger className='h-8 min-w-[140px] max-w-[180px]'>
          <Select.Value placeholder='Area' />
        </Select.Trigger>
        <Select.Content>
          {areaOptions.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>

      <div className='flex shrink-0 items-center border border-stroke-soft-400 hover:bg-white rounded-full [&_button]:w-auto [&_button]:min-w-0 [&_button]:justify-center [&_button]:px-2'>
        <AssigneeMultiSelect
          value={assignees}
          onChange={(values) => setAssignees(Array.isArray(values) ? values : [])}
          disabled={isSaving}
          placeholder={<RiUserLine className='size-4 text-text-soft-400' aria-hidden />}
          triggerAriaLabel='Assignee'
          size='xsmall'
          variant='borderless'
          maxVisibleAvatars={2}
          projectId={projectId}
        />
      </div>

      <Datepicker
        value={dueDate ?? undefined}
        onChange={setDueDate}
        disabled={isSaving}
        placeholder=''
        iconOnlyWhenEmpty
        triggerAriaLabel='Due date'
        size='xsmall'
        variant='borderless'
        prefixIcon={<RiCalendarLine className='size-4 text-text-soft-400' aria-hidden />}
        className='w-auto min-w-0 shrink-0 px-1.5 border rounded-full'
      />

      {/* <div className='ml-auto flex items-center gap-2'> */}
      <Button.Root
        type='button'
        variant='neutral'
        mode='stroke'
        size='xsmall'
        disabled={isSaving}
        onClick={onCancel}
      >
        Cancel
      </Button.Root>
      <Button.Root
        type='submit'
        variant='primary'
        mode='filled'
        size='xsmall'
        disabled={isSaving || !String(subject ?? '').trim() || !areaId}
      >
        {isSaving ? 'Saving…' : 'Save'}
      </Button.Root>
    </form>
  );
}
