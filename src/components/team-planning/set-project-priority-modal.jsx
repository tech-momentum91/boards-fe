import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiSearchLine, RiSettings3Line } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Checkbox from '@/components/ui/checkbox';
import {
  closeWeeklyPriorityModal,
  fetchWeeklyPriorityProjects,
  saveWeeklyPriorities,
} from '@/redux/teamPlanningSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';
import {
  getProjectStageBadgeClass,
  getTaskCompletionBarClass,
  WEEKLY_PRIORITY_TASK_CATEGORIES,
} from './constants';

const CATEGORY_ICONS = {
  '3D Works': '3D',
  'GFC Works': 'GFC',
  'BOQ Works': 'BOQ',
  Graphics: 'GFX',
  Selections: 'SEL',
};

const PriorityProjectCard = ({ project, checked, onToggle }) => {
  const completionPct = Number(project.completion_percentage) || 0;
  const barWidth = Math.max(0, Math.min(100, completionPct));

  return (
    <button
      type='button'
      onClick={onToggle}
      className={cn(
        'relative flex w-full flex-col gap-2 rounded-lg border px-3 py-3 text-left transition',
        checked
          ? 'border-primary-base bg-[#F3FBF8]'
          : 'border-stroke-soft-200 bg-bg-white-0 hover:bg-bg-weak-50',
      )}
    >
      <div className='absolute right-3 top-3'>
        <div
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role='presentation'
        >
          <Checkbox.Root checked={checked} onCheckedChange={onToggle} size='medium' />
        </div>
      </div>

      <div className='flex items-start justify-between gap-8 pr-8'>
        <span className='min-w-0 truncate text-label-sm font-medium text-text-strong-950'>
          {project.client_name}
        </span>
        {project.project_stage ? (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-label-xs font-medium',
              getProjectStageBadgeClass(),
            )}
          >
            {project.project_stage}
          </span>
        ) : null}
      </div>

      {project.meta_label ? (
        <span className='text-label-xs text-text-soft-400'>{project.meta_label}</span>
      ) : null}

      <div className='flex items-center gap-2'>
        <div className='h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[rgba(226,228,233,0.8)]'>
          <div
            className={cn(
              'h-full rounded-full transition-all',
              getTaskCompletionBarClass(completionPct),
            )}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <span className='shrink-0 text-label-xs font-medium text-text-sub-500'>
          {Math.round(completionPct)}%
        </span>
      </div>
    </button>
  );
};

const SetProjectPriorityModal = ({ onSaved, headerScope }) => {
  const dispatch = useDispatch();
  const { weeklyPriorityModal } = useSelector((state) => state.teamPlanning);
  const { isOpen, isLoading, isSaving, context, data, error } = weeklyPriorityModal;
  const [searchValue, setSearchValue] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeCategory, setActiveCategory] = useState(WEEKLY_PRIORITY_TASK_CATEGORIES[0].id);
  const [selectedClients, setSelectedClients] = useState(new Set());

  useEffect(() => {
    if (!isOpen) return;
    setSearchValue('');
    setLocationFilter('all');
    setStatusFilter('all');
    setActiveCategory(context?.task_category || WEEKLY_PRIORITY_TASK_CATEGORIES[0].id);
    setSelectedClients(new Set());
  }, [isOpen, context?.task_category]);

  useEffect(() => {
    if (!isOpen || !context?.planning_week_start) return;
    dispatch(
      fetchWeeklyPriorityProjects({
        planning_week_start: context.planning_week_start,
        task_category: activeCategory,
        keyword: searchValue,
        location: locationFilter,
        status: statusFilter,
        filters: headerScope || {},
      }),
    );
  }, [
    dispatch,
    isOpen,
    context?.planning_week_start,
    activeCategory,
    searchValue,
    locationFilter,
    statusFilter,
    headerScope,
  ]);

  useEffect(() => {
    if (!data) return;
    setSelectedClients(new Set(data.selected_clients || []));
  }, [data]);

  const projects = data?.projects || [];
  const locations = data?.locations || [];
  const statuses = data?.statuses || [];
  const selectedCount = selectedClients.size;

  const locationOptions = useMemo(
    () => [
      { value: 'all', label: 'All Locations' },
      ...locations.map((item) => ({ value: item, label: item })),
    ],
    [locations],
  );

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: 'All Status' },
      ...statuses.map((item) => ({ value: item, label: item })),
    ],
    [statuses],
  );

  const handleClose = () => {
    dispatch(closeWeeklyPriorityModal());
  };

  const handleToggleProject = (clientId) => {
    setSelectedClients((previous) => {
      const next = new Set(previous);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await dispatch(
        saveWeeklyPriorities({
          planning_week_start: context?.planning_week_start,
          task_category: activeCategory,
          clients: [...selectedClients],
          filters: headerScope || {},
        }),
      ).unwrap();
      showSuccessToast('Weekly priorities saved successfully');
      handleClose();
      onSaved?.();
    } catch (saveError) {
      showErrorToast(saveError || 'Failed to save weekly priorities');
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Modal.Content
        className='flex max-h-[min(90vh,760px)] w-[min(960px,calc(100vw-48px))] max-w-none flex-col overflow-hidden'
        showClose
      >
        <Modal.Header
          title='Set Project Priority'
          description={`${data?.total_count ?? projects.length} Projects`}
          icon={
            <div className='flex size-10 items-center justify-center rounded-full bg-bg-weak-100 text-text-sub-600'>
              <RiSettings3Line className='size-5' />
            </div>
          }
        />

        <div className='border-b border-stroke-soft-200 px-6 py-3'>
          <div className='flex items-center gap-3'>
            <Input.Root className='min-w-0 flex-1'>
              <Input.Wrapper>
                <Input.Icon>
                  <RiSearchLine />
                </Input.Icon>
                <Input.Input
                  placeholder='Search by name, role'
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>
            <Select.Root value={locationFilter} onValueChange={setLocationFilter} size='small'>
              <Select.Trigger className='w-[140px]'>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {locationOptions.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Select.Root value={statusFilter} onValueChange={setStatusFilter} size='small'>
              <Select.Trigger className='w-[130px]'>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {statusOptions.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        </div>

        <Modal.Body className='flex min-h-0 flex-1 overflow-hidden p-0'>
          {isLoading ? (
            <div className='flex flex-1 items-center justify-center py-16 text-text-soft-400'>
              Loading projects...
            </div>
          ) : (
            <div className='flex min-h-0 w-full flex-1'>
              <div className='w-[220px] shrink-0 border-r border-stroke-soft-200 bg-bg-weak-100 p-4'>
                <span className='text-subheading-xs uppercase text-text-soft-400'>Tasks</span>
                <div className='mt-3 flex flex-col gap-1'>
                  {WEEKLY_PRIORITY_TASK_CATEGORIES.map((category) => {
                    const isActive = activeCategory === category.id;
                    const selectedInCategory = isActive && selectedCount > 0 ? selectedCount : null;
                    return (
                      <button
                        key={category.id}
                        type='button'
                        onClick={() => setActiveCategory(category.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition',
                          isActive
                            ? 'bg-bg-white-0 text-text-strong-950 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                            : 'text-text-sub-500 hover:bg-bg-white-0/70',
                        )}
                      >
                        <div className='flex min-w-0 items-center gap-2'>
                          <span className='flex size-6 shrink-0 items-center justify-center rounded-md bg-bg-weak-100 text-[10px] font-semibold text-text-sub-500'>
                            {CATEGORY_ICONS[category.id] || category.label.slice(0, 3)}
                          </span>
                          <span className='truncate text-label-sm font-medium'>
                            {category.label}
                          </span>
                        </div>
                        {selectedInCategory ? (
                          <span className='shrink-0 rounded-full bg-bg-weak-100 px-2 py-0.5 text-label-xs text-text-sub-500'>
                            {selectedInCategory}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className='min-h-0 flex-1 overflow-y-auto p-4'>
                <div className='mb-4 flex items-center justify-between gap-2'>
                  <span className='text-label-sm font-medium text-text-strong-950'>
                    {
                      WEEKLY_PRIORITY_TASK_CATEGORIES.find((item) => item.id === activeCategory)
                        ?.label
                    }
                  </span>
                  <span className='text-label-xs text-text-soft-400'>
                    {projects.length} Projects
                  </span>
                </div>

                {projects.length === 0 ? (
                  <p className='rounded-lg border border-dashed border-stroke-soft-200 px-3 py-10 text-center text-paragraph-sm text-text-soft-400'>
                    No projects found for this category.
                  </p>
                ) : (
                  <div className='grid grid-cols-2 gap-3'>
                    {projects.map((project) => (
                      <PriorityProjectCard
                        key={project.client}
                        project={project}
                        checked={selectedClients.has(project.client)}
                        onToggle={() => handleToggleProject(project.client)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>

        {error ? <p className='px-6 pb-2 text-paragraph-sm text-error-base'>{error}</p> : null}

        <Modal.Footer className='shrink-0'>
          <Button.Root variant='neutral' mode='stroke' type='button' onClick={handleClose}>
            Cancel
          </Button.Root>
          <Button.Root
            variant='primary'
            mode='filled'
            type='button'
            disabled={isSaving || isLoading}
            onClick={handleSave}
          >
            {isSaving
              ? 'Saving...'
              : `Save ${selectedCount} Project${selectedCount === 1 ? '' : 's'}`}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default SetProjectPriorityModal;
