import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiAddLine, RiCloseLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Avatar from '@/components/ui/avatar';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import * as Input from '@/components/ui/input';
import {
  closeAllocationModal,
  fetchAllocationModalData,
  fetchCenterClients,
  saveUserCenterAllocations,
} from '@/redux/teamPlanningSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';
import {
  CLIENT_STATUS_FILTER_OPTIONS,
  formatPlanningMonthLabel,
  formatPlanningDayLabel,
} from './constants';

const DEFAULT_AVATAR =
  'https://www.clipartmax.com/png/middle/258-2582267_circled-user-male-skin-type-1-2-icon-male-user-icon.png';

const emptyOtherRow = () => ({ client: '', allocation_percentage: '' });

const toPercentString = (value) => {
  if (value === '' || value == null) return '';
  return String(value);
};

const AssignedProjectRow = ({ project, onChange }) => (
  <div className='flex items-center justify-between gap-3 rounded-lg border border-stroke-soft-200 px-3 py-2.5'>
    <div className='flex min-w-0 items-center gap-2'>
      <span className='truncate text-label-sm font-medium text-text-strong-950'>
        {project.client_name}
      </span>
      {project.status_badge ? (
        <Badge.Root size='small' variant='light' color='green'>
          {project.status_badge}
        </Badge.Root>
      ) : null}
    </div>
    <div className='relative w-[72px] shrink-0'>
      <Input.Root size='small'>
        <Input.Wrapper>
          <Input.Input
            type='number'
            min='0'
            value={project.allocation_percentage}
            onChange={(event) =>
              onChange({ ...project, allocation_percentage: event.target.value })
            }
            placeholder='0'
            className='pr-6'
          />
        </Input.Wrapper>
      </Input.Root>
      <span className='pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-label-xs text-text-soft-400'>
        %
      </span>
    </div>
  </div>
);

const OtherProjectRow = ({ row, clients, usedClientIds, onChange, onRemove }) => {
  const availableClients = clients.filter(
    (client) => client.id === row.client || !usedClientIds.has(client.id),
  );

  return (
    <div className='flex items-center gap-2'>
      <Select.Root
        value={row.client || undefined}
        onValueChange={(value) => onChange({ ...row, client: value })}
      >
        <Select.Trigger className='flex-1' size='small'>
          <Select.Value placeholder='Select' />
        </Select.Trigger>
        <Select.Content>
          {availableClients.map((client) => (
            <Select.Item key={client.id} value={client.id}>
              {client.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>

      <div className='relative w-[72px] shrink-0'>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Input
              type='number'
              min='0'
              value={row.allocation_percentage}
              onChange={(event) => onChange({ ...row, allocation_percentage: event.target.value })}
              placeholder='0'
              className='pr-6'
            />
          </Input.Wrapper>
        </Input.Root>
        <span className='pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-label-xs text-text-soft-400'>
          %
        </span>
      </div>

      <Button.Root
        variant='neutral'
        mode='ghost'
        size='small'
        type='button'
        onClick={onRemove}
        className='shrink-0'
      >
        <Button.Icon as={RiCloseLine} />
      </Button.Root>
    </div>
  );
};

const AddAllocationModal = ({ onSaved }) => {
  const dispatch = useDispatch();
  const { allocationModal } = useSelector((state) => state.teamPlanning);
  const {
    isOpen,
    isLoading,
    isSaving,
    context,
    data,
    centerClients,
    clientsLoading,
    clientsError,
    error,
  } = allocationModal;
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [otherRows, setOtherRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const scopeCenterIds = useMemo(() => {
    const fromContext = (context?.centers || [])
      .map((center) => (typeof center === 'string' ? center : center?.id))
      .filter(Boolean);
    if (fromContext.length > 0) return fromContext;
    if (context?.center?.id) return [context.center.id];
    if (Array.isArray(context?.member?.centers) && context.member.centers.length > 0) {
      return [...context.member.centers];
    }
    return Array.isArray(data?.scope_centers) ? [...data.scope_centers] : [];
  }, [context?.centers, context?.center?.id, context?.member?.centers, data?.scope_centers]);

  const scopeCentersKey = scopeCenterIds.join(',');
  const defaultCenterId = scopeCenterIds[0] || context?.center?.id || data?.center?.id || '';

  useEffect(() => {
    if (!isOpen || !context?.member?.member_id) return;
    setStatusFilter('all');
    setAssignedProjects([]);
    setOtherRows([]);
    dispatch(
      fetchAllocationModalData({
        member_id: context.member.member_id,
        team_type: context.member.team_type,
        center: defaultCenterId || undefined,
        planning_month: context.planning_month,
        planning_week_start: context.planning_week_start,
        view_mode: context.view_mode || 'monthly_capacity',
        centers: scopeCenterIds,
      }),
    );
    // scopeCentersKey stabilizes array identity for the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable key
  }, [
    dispatch,
    isOpen,
    context?.member?.member_id,
    context?.member?.team_type,
    context?.planning_month,
    context?.planning_week_start,
    context?.view_mode,
    defaultCenterId,
    scopeCentersKey,
  ]);

  const assignedClientIds = useMemo(
    () => assignedProjects.map((project) => project.client).filter(Boolean),
    [assignedProjects],
  );
  const assignedClientsKey = assignedClientIds.join(',');

  useEffect(() => {
    if (!isOpen || scopeCenterIds.length === 0) return;
    dispatch(
      fetchCenterClients({
        center: scopeCenterIds[0],
        centers: scopeCenterIds,
        exclude: assignedClientIds,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable keys
  }, [dispatch, isOpen, scopeCentersKey, assignedClientsKey]);

  useEffect(() => {
    if (!data) return;

    setAssignedProjects(
      (data.assigned_projects || []).map((project) => ({
        ...project,
        allocation_percentage: toPercentString(project.allocation_percentage),
      })),
    );
    setOtherRows([]);
  }, [data]);

  const member = data?.member || context?.member;
  const isWeekly = (context?.view_mode || data?.view_mode) === 'weekly_allocation';
  const planningPeriodLabel = isWeekly
    ? formatPlanningDayLabel(
        context?.planning_week_start || data?.planning_week_start || context?.planning_month,
      )
    : formatPlanningMonthLabel(context?.planning_month || data?.planning_month);
  const memberSubtitle = [planningPeriodLabel, member?.designation || member?.role_type_label]
    .filter(Boolean)
    .join(' · ');

  const visibleAssignedProjects = useMemo(() => {
    if (statusFilter === 'all') return assignedProjects;
    return assignedProjects.filter((project) => project.client_center_status === statusFilter);
  }, [assignedProjects, statusFilter]);

  const totalAllocation = useMemo(() => {
    const assignedTotal = assignedProjects.reduce(
      (sum, project) => sum + (Number(project.allocation_percentage) || 0),
      0,
    );
    const otherTotal = otherRows.reduce(
      (sum, row) => sum + (Number(row.allocation_percentage) || 0),
      0,
    );
    return assignedTotal + otherTotal;
  }, [assignedProjects, otherRows]);

  const isOverloaded = totalAllocation > 100;
  const hasHiddenAssignedProjects =
    statusFilter !== 'all' && visibleAssignedProjects.length !== assignedProjects.length;

  const usedOtherClientIds = useMemo(() => {
    const used = new Set(assignedClientIds);
    otherRows.forEach((row) => {
      if (row.client) used.add(row.client);
    });
    return used;
  }, [assignedClientIds, otherRows]);

  const handleClose = () => {
    dispatch(closeAllocationModal());
    setAssignedProjects([]);
    setOtherRows([]);
    setStatusFilter('all');
  };

  const handleAddOtherRow = () => {
    setOtherRows((previous) => [...previous, emptyOtherRow()]);
  };

  const handleSave = async () => {
    const payloadRows = [
      ...assignedProjects
        .filter((project) => project.client && Number(project.allocation_percentage) > 0)
        .map((project) => ({
          client: project.client,
          allocation_percentage: Number(project.allocation_percentage),
          center: project.center || undefined,
        })),
      ...otherRows
        .filter((row) => row.client && Number(row.allocation_percentage) > 0)
        .map((row) => ({
          client: row.client,
          allocation_percentage: Number(row.allocation_percentage),
        })),
    ];

    try {
      await dispatch(
        saveUserCenterAllocations({
          member_id: context.member.member_id,
          team_type: context.member.team_type,
          center: defaultCenterId || undefined,
          centers: scopeCenterIds,
          planning_month: context.planning_month,
          planning_week_start: context.planning_week_start,
          view_mode: context.view_mode || 'monthly_capacity',
          allocations: payloadRows,
        }),
      ).unwrap();
      showSuccessToast('Allocations saved successfully');
      handleClose();
      onSaved?.();
    } catch (saveError) {
      showErrorToast(saveError || 'Failed to save allocations');
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Modal.Content
        className='flex max-h-[min(90vh,720px)] max-w-[520px] flex-col overflow-hidden'
        showClose
      >
        <Modal.Header
          title={member?.name || 'Allocate projects'}
          description={memberSubtitle}
          icon={
            <Avatar.Root size='40'>
              <Avatar.Image src={member?.image || DEFAULT_AVATAR} alt={member?.name} />
            </Avatar.Root>
          }
        />

        <Modal.Body className='flex min-h-0 flex-1 flex-col gap-5 overflow-hidden'>
          {isLoading ? (
            <div className='py-8 text-center text-text-soft-400'>Loading allocations...</div>
          ) : (
            <>
              <div className='min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-0.5'>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between gap-3'>
                    <span className='text-subheading-xs uppercase text-text-soft-400'>
                      Assigned Projects
                    </span>
                    <Select.Root value={statusFilter} onValueChange={setStatusFilter} size='small'>
                      <Select.Trigger className='w-[130px]'>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        {CLIENT_STATUS_FILTER_OPTIONS.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </div>

                  <div className='space-y-2'>
                    {visibleAssignedProjects.length > 0 ? (
                      visibleAssignedProjects.map((project) => (
                        <AssignedProjectRow
                          key={project.client}
                          project={project}
                          onChange={(nextProject) =>
                            setAssignedProjects((previous) =>
                              previous.map((item) =>
                                item.client === project.client ? nextProject : item,
                              ),
                            )
                          }
                        />
                      ))
                    ) : (
                      <p className='rounded-lg border border-dashed border-stroke-soft-200 px-3 py-4 text-center text-paragraph-sm text-text-soft-400'>
                        No projects assigned to this user.
                      </p>
                    )}
                  </div>
                </div>

                <div className='space-y-3'>
                  <span className='text-subheading-xs uppercase text-text-soft-400'>
                    Other Projects
                  </span>

                  {otherRows.length > 0 ? (
                    <div className='space-y-2'>
                      {otherRows.map((row, index) => (
                        <OtherProjectRow
                          key={`other-${index}`}
                          row={row}
                          clients={centerClients}
                          usedClientIds={usedOtherClientIds}
                          onChange={(nextRow) =>
                            setOtherRows((previous) =>
                              previous.map((item, itemIndex) =>
                                itemIndex === index ? nextRow : item,
                              ),
                            )
                          }
                          onRemove={() =>
                            setOtherRows((previous) =>
                              previous.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                        />
                      ))}
                    </div>
                  ) : null}

                  {clientsError ? (
                    <p className='text-paragraph-sm text-error-base'>{clientsError}</p>
                  ) : null}

                  {clientsLoading ? (
                    <p className='text-paragraph-xs text-text-soft-400'>Loading projects...</p>
                  ) : null}

                  <Button.Root
                    variant='neutral'
                    mode='stroke'
                    size='small'
                    type='button'
                    className='w-full border-dashed'
                    onClick={handleAddOtherRow}
                    disabled={Boolean(clientsError) && centerClients.length === 0}
                  >
                    <Button.Icon as={RiAddLine} />
                    Add Project
                  </Button.Root>
                </div>
              </div>

              <div
                className={cn(
                  'flex shrink-0 flex-col gap-1 rounded-lg px-4 py-2.5',
                  isOverloaded ? 'bg-[#FDEDF0]' : 'bg-[#E6F4EE]',
                )}
              >
                <div className='flex items-center justify-between'>
                  <span
                    className={cn(
                      'text-subheading-xs uppercase',
                      isOverloaded ? 'text-[#710E21]' : 'text-[#0B4627]',
                    )}
                  >
                    Total Allocation
                  </span>
                  <span
                    className={cn(
                      'text-label-sm font-semibold',
                      isOverloaded ? 'text-[#AF1D38]' : 'text-[#166534]',
                    )}
                  >
                    {totalAllocation}%
                  </span>
                </div>
                {isOverloaded ? (
                  <p className='text-paragraph-xs text-[#710E21]'>
                    Overloaded — total exceeds 100%. You can still save; the member will show as
                    overloaded.
                  </p>
                ) : null}
                {hasHiddenAssignedProjects ? (
                  <p
                    className={cn(
                      'text-paragraph-xs',
                      isOverloaded ? 'text-[#710E21]' : 'text-[#0B4627]',
                    )}
                  >
                    Total includes projects hidden by the status filter.
                  </p>
                ) : null}
              </div>

              {error ? <p className='shrink-0 text-paragraph-sm text-error-base'>{error}</p> : null}
            </>
          )}
        </Modal.Body>

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
            {isSaving ? 'Saving...' : 'Save Allocation'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default AddAllocationModal;
