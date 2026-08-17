import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiAddLine, RiBuildingLine, RiCloseLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Avatar from '@/components/ui/avatar';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import {
  closeProjectTeamModal,
  fetchProjectTeamAllocations,
  saveProjectTeamAllocations,
} from '@/redux/teamPlanningSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';
import { formatPlanningMonthLabel, formatPlanningDayLabel } from './constants';

const DEFAULT_AVATAR =
  'https://www.clipartmax.com/png/middle/258-2582267_circled-user-male-skin-type-1-2-icon-male-user-icon.png';

const toPercentString = (value) => {
  if (value === '' || value == null) return '';
  return String(value);
};

const MemberAllocationRow = ({ member, onChange, onRemove }) => (
  <div className='flex items-center justify-between gap-3 rounded-lg border border-stroke-soft-200 px-3 py-2.5'>
    <div className='flex min-w-0 items-center gap-2'>
      <Avatar.Root size='32'>
        <Avatar.Image src={member.image || DEFAULT_AVATAR} alt={member.name} />
      </Avatar.Root>
      <span className='truncate text-label-sm font-medium text-text-strong-950'>{member.name}</span>
    </div>
    <div className='flex shrink-0 items-center gap-1'>
      <div className='relative w-[72px]'>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Input
              type='number'
              min='0'
              value={member.allocation_percentage}
              onChange={(event) =>
                onChange({ ...member, allocation_percentage: event.target.value })
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
      {onRemove ? (
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
      ) : null}
    </div>
  </div>
);

const ProjectTeamAllocationModal = ({ onSaved }) => {
  const dispatch = useDispatch();
  const { projectTeamModal } = useSelector((state) => state.teamPlanning);
  const { isOpen, isLoading, isSaving, context, data, error } = projectTeamModal;
  const [assignedMembers, setAssignedMembers] = useState([]);
  const [pendingOtherId, setPendingOtherId] = useState('');

  useEffect(() => {
    if (!isOpen || !context?.client || !context?.center) return;
    const request = dispatch(
      fetchProjectTeamAllocations({
        client: context.client,
        role_type_label: context.role_type_label,
        center: context.center,
        centers: context.centers,
        planning_month: context.planning_month,
        planning_week_start: context.planning_week_start,
        view_mode: context.view_mode || 'monthly_capacity',
      }),
    );
    return () => {
      request?.abort?.();
    };
  }, [dispatch, isOpen, context]);

  useEffect(() => {
    if (!data) return;
    setAssignedMembers(
      (data.assigned_members || []).map((member) => ({
        ...member,
        allocation_percentage: toPercentString(member.allocation_percentage),
      })),
    );
    setPendingOtherId('');
  }, [data]);

  const otherMemberOptions = useMemo(() => {
    const assignedIds = new Set(
      assignedMembers.map((member) => `${member.team_type}::${member.member_id}`),
    );
    return (data?.other_members || []).filter(
      (member) => !assignedIds.has(`${member.team_type}::${member.member_id}`),
    );
  }, [assignedMembers, data?.other_members]);

  const totalAllocation = useMemo(
    () =>
      assignedMembers.reduce((sum, member) => sum + (Number(member.allocation_percentage) || 0), 0),
    [assignedMembers],
  );

  const isOverloaded = totalAllocation > 100;
  const title = context?.role_type_label || data?.role_type_label || 'Team';
  const isWeekly = (context?.view_mode || data?.view_mode) === 'weekly_allocation';
  const planningPeriodLabel = isWeekly
    ? formatPlanningDayLabel(
        context?.planning_week_start || data?.planning_week_start || context?.planning_month,
      )
    : formatPlanningMonthLabel(context?.planning_month || data?.planning_month);
  const subtitle = [planningPeriodLabel, `${data?.member_count ?? assignedMembers.length} Members`]
    .filter(Boolean)
    .join(' · ');

  const handleClose = () => {
    dispatch(closeProjectTeamModal());
    setAssignedMembers([]);
    setPendingOtherId('');
  };

  const handleAddOtherMember = () => {
    if (!pendingOtherId) return;
    const member = otherMemberOptions.find(
      (item) => `${item.team_type}::${item.member_id}` === pendingOtherId,
    );
    if (!member) return;
    setAssignedMembers((previous) => [...previous, { ...member, allocation_percentage: '0' }]);
    setPendingOtherId('');
  };

  const handleSave = async () => {
    if (!context?.client || !context?.center) {
      showErrorToast('Project and center are required');
      return;
    }

    try {
      await dispatch(
        saveProjectTeamAllocations({
          client: context.client,
          role_type_label: context.role_type_label,
          center: context.center,
          planning_month: context.planning_month,
          planning_week_start: context.planning_week_start,
          view_mode: context.view_mode || 'monthly_capacity',
          allocations: assignedMembers.map((member) => ({
            member_id: member.member_id,
            team_type: member.team_type,
            allocation_percentage: Number(member.allocation_percentage) || 0,
          })),
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
      <Modal.Content className='max-w-[520px]' showClose>
        <Modal.Header
          title={title}
          description={subtitle}
          icon={
            <div className='flex size-10 items-center justify-center rounded-full bg-bg-weak-100 text-text-sub-600'>
              <RiBuildingLine className='size-5' />
            </div>
          }
        />

        <Modal.Body className='space-y-5'>
          {isLoading ? (
            <div className='py-8 text-center text-text-soft-400'>Loading allocations...</div>
          ) : (
            <>
              {context?.client_name ? (
                <p className='text-paragraph-xs text-text-soft-400'>{context.client_name}</p>
              ) : null}

              <div className='space-y-3'>
                <span className='text-subheading-xs uppercase text-text-soft-400'>
                  Assigned Members
                </span>
                <div className='space-y-2'>
                  {assignedMembers.length > 0 ? (
                    assignedMembers.map((member) => (
                      <MemberAllocationRow
                        key={`${member.team_type}::${member.member_id}`}
                        member={member}
                        onChange={(nextMember) =>
                          setAssignedMembers((previous) =>
                            previous.map((item) =>
                              item.member_id === member.member_id &&
                              item.team_type === member.team_type
                                ? nextMember
                                : item,
                            ),
                          )
                        }
                        onRemove={() =>
                          setAssignedMembers((previous) =>
                            previous.filter(
                              (item) =>
                                !(
                                  item.member_id === member.member_id &&
                                  item.team_type === member.team_type
                                ),
                            ),
                          )
                        }
                      />
                    ))
                  ) : (
                    <p className='rounded-lg border border-dashed border-stroke-soft-200 px-3 py-4 text-center text-paragraph-sm text-text-soft-400'>
                      No members allocated to this project yet.
                    </p>
                  )}
                </div>
              </div>

              <div className='space-y-3'>
                <span className='text-subheading-xs uppercase text-text-soft-400'>
                  Other Members
                </span>
                {otherMemberOptions.length > 0 ? (
                  <div className='flex items-center gap-2'>
                    <Select.Root
                      value={pendingOtherId || undefined}
                      onValueChange={setPendingOtherId}
                      size='small'
                    >
                      <Select.Trigger className='flex-1'>
                        <Select.Value placeholder='Select member' />
                      </Select.Trigger>
                      <Select.Content>
                        {otherMemberOptions.map((member) => (
                          <Select.Item
                            key={`${member.team_type}::${member.member_id}`}
                            value={`${member.team_type}::${member.member_id}`}
                          >
                            {member.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='small'
                      type='button'
                      onClick={handleAddOtherMember}
                      disabled={!pendingOtherId}
                    >
                      Add
                    </Button.Root>
                  </div>
                ) : null}
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  type='button'
                  className='w-full border-dashed'
                  onClick={handleAddOtherMember}
                  disabled={!pendingOtherId}
                >
                  <Button.Icon as={RiAddLine} />
                  Add Member
                </Button.Root>
              </div>

              <div
                className={cn(
                  'flex items-center justify-between rounded-lg px-4 py-2.5',
                  isOverloaded ? 'bg-[#FDEDF0]' : 'bg-[#E6F4EE]',
                )}
              >
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

              {error ? <p className='text-paragraph-sm text-error-base'>{error}</p> : null}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
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

export default ProjectTeamAllocationModal;
