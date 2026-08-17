import React, { useEffect, useCallback, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { RiUserAddLine, RiAddLine, RiErrorWarningFill } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import * as Hint from '@/components/ui/hint';
import { fetchTeamForCenterThunk, createAssociatedTeamMemberThunk } from '@/redux/centerSlice';
import {
  fetchRolesWithType,
  fetchCoreTeamData,
  fetchSupportTeamData,
} from '@/redux/teamManagementSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { filterGroupedRolesOnlyCenterReqField, normalizeRoleEntry } from '@/utils/user-utils';

const schema = z.object({
  role: z.string().min(1, 'Role is required'),
  team_member: z.string().min(1, 'Team member is required'),
});

const getSupportTeamDefaultDates = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return {
    from_date: from.toISOString().slice(0, 10),
    to_date: to.toISOString().slice(0, 10),
  };
};

const AddCenterTeamMemberModal = ({
  isOpen,
  onOpenChange,
  centerId,
  scope = 'core_team',
  onOpenAddNewMember,
}) => {
  const dispatch = useDispatch();
  const [roleList, setRoleList] = useState({});

  const group = scope === 'core_team' ? 'core' : 'support';
  const isCoreTeam = scope === 'core_team';

  const coreTeamData = useSelector((state) => state.teamManagement?.coreTeamData?.data ?? []);
  const supportTeamData = useSelector((state) => state.teamManagement?.supportTeamData?.data ?? []);
  const coreLoading = useSelector(
    (state) => state.teamManagement?.coreTeamData?.isLoading ?? false,
  );
  const supportLoading = useSelector(
    (state) => state.teamManagement?.supportTeamData?.isLoading ?? false,
  );
  const createLoading = useSelector(
    (state) => state.center?.teamAssociated?.createAssociatedTeamMember?.isLoading ?? false,
  );

  const teamMemberOptions = isCoreTeam ? coreTeamData : supportTeamData;
  const teamMemberListLoading = isCoreTeam ? coreLoading : supportLoading;

  const fetchRoles = useCallback(async () => {
    try {
      const response = await dispatch(fetchRolesWithType({ group })).unwrap();
      setRoleList(filterGroupedRolesOnlyCenterReqField(response?.message ?? {}));
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to fetch roles.' });
    }
  }, [dispatch, group]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      if (isCoreTeam) {
        await dispatch(fetchCoreTeamData({ keyword: '', page: 1, page_size: 100 })).unwrap();
      } else {
        const { from_date, to_date } = getSupportTeamDefaultDates();
        await dispatch(
          fetchSupportTeamData({
            page: 1,
            page_size: 100,
            from_date,
            to_date,
            status: 'Active',
          }),
        ).unwrap();
      }
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to fetch team members.' });
    }
  }, [dispatch, isCoreTeam]);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      fetchTeamMembers();
    }
  }, [isOpen, fetchRoles, fetchTeamMembers]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      role: '',
      team_member: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset({ role: '', team_member: '' });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data) => {
    if (!centerId) return;
    try {
      const selectedItem = teamMemberOptions.find(
        (item) =>
          (isCoreTeam
            ? (item.email ?? item.team_member_id)
            : (item.team_member_id ?? item.employee_id)) === data.team_member,
      );
      if (!selectedItem) {
        showErrorToast('Selected team member not found.');
        return;
      }
      const team_member_id = isCoreTeam
        ? (selectedItem.email ?? selectedItem.team_member_id)
        : (selectedItem.team_member_id ?? selectedItem.employee_id);

      await dispatch(
        createAssociatedTeamMemberThunk({
          center: centerId,
          role: data.role,
          team_member_id,
          team_type: isCoreTeam ? 'User' : 'Employee',
        }),
      ).unwrap();

      showSuccessToast('Team member added to center successfully.');
      onOpenChange(false);
      reset();

      await dispatch(
        fetchTeamForCenterThunk({
          center: centerId,
          scope: scope === 'core_team' ? 'core_team' : 'support_team',
          order_by: 'creation',
        }),
      ).unwrap();
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to add team member to center. Please try again.',
      });
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    reset();
  };

  const handleAddNewMember = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onOpenAddNewMember?.();
  };

  const getTeamMemberValue = (item) => {
    if (!item) return '';
    return isCoreTeam
      ? (item.email ?? item.team_member_id)
      : (item.team_member_id ?? item.employee_id);
  };

  const getTeamMemberLabel = (item) => {
    if (!item) return '';
    const name =
      item.name ?? ([item.first_name, item.last_name].filter(Boolean).join(' ') || item.email);
    return name || item.email || item.team_member_id || item.employee_id || 'Unknown';
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiUserAddLine}
          title='Add Team Member'
          description='Select a role and an existing team member, or add a new member'
        />
        <Modal.Body>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col gap-4'>
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Role
                <Label.Asterisk />
              </Label.Root>
              <Controller
                name='role'
                control={control}
                render={({ field }) => (
                  <Select.Root
                    value={field.value}
                    onValueChange={field.onChange}
                    hasError={Boolean(errors.role)}
                    disabled={createLoading}
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value placeholder='Select role' />
                    </Select.Trigger>
                    <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                      {Object.entries(roleList).map(([team_type, role_name], index) => {
                        const rolesRaw = Array.isArray(role_name)
                          ? role_name
                          : role_name && typeof role_name === 'object'
                            ? Object.values(role_name).flatMap((v) => (Array.isArray(v) ? v : []))
                            : [];
                        const roles = rolesRaw
                          .map((item) => normalizeRoleEntry(item))
                          .filter((e) => e.name);
                        return (
                          <div key={team_type || String(index)}>
                            <span className='subheading-2xs px-1 pt-1 text-[var(--color-text-soft-400)]'>
                              {team_type}
                            </span>
                            {roles.map((entry, roleIdx) => (
                              <Select.Item
                                key={`${team_type}-${entry.name}-${roleIdx}`}
                                value={entry.name}
                                className='paragraph-small'
                              >
                                {entry.name}
                              </Select.Item>
                            ))}
                          </div>
                        );
                      })}
                    </Select.Content>
                  </Select.Root>
                )}
              />
              {errors.role && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.role.message}
                </Hint.Root>
              )}
            </div>

            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Team Member
                <Label.Asterisk />
              </Label.Root>
              <Controller
                name='team_member'
                control={control}
                render={({ field }) => (
                  <Select.Root
                    value={field.value}
                    onValueChange={field.onChange}
                    hasError={Boolean(errors.team_member)}
                    disabled={createLoading || teamMemberListLoading}
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value placeholder='Select team member' />
                    </Select.Trigger>
                    <Select.Content className='min-w-[var(--radix-select-trigger-width)] p-0'>
                      <Select.ScrollUpButton />
                      <Select.Viewport className='p-1'>
                        {(Array.isArray(teamMemberOptions) ? teamMemberOptions : []).map((item) => {
                          const value = getTeamMemberValue(item);
                          if (!value) return null;
                          return (
                            <Select.Item key={value} value={value}>
                              {getTeamMemberLabel(item)}
                            </Select.Item>
                          );
                        })}
                      </Select.Viewport>
                      <Select.ScrollDownButton />
                      <div className='border-t bg-white w-full border-stroke-soft-200 p-2'>
                        <Button.Root
                          variant='neutral'
                          mode='stroke'
                          size='small'
                          onClick={handleAddNewMember}
                          className='gap-2 w-full'
                        >
                          <Button.Icon as={RiAddLine} />
                          Add new member
                        </Button.Root>
                      </div>
                    </Select.Content>
                  </Select.Root>
                )}
              />
              {errors.team_member && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.team_member.message}
                </Hint.Root>
              )}
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            onClick={handleCancel}
            disabled={createLoading}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='submit'
            onClick={handleSubmit(onSubmit)}
            variant='primary'
            mode='filled'
            disabled={createLoading || teamMemberListLoading}
          >
            {createLoading ? 'Adding...' : 'Add'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default AddCenterTeamMemberModal;
