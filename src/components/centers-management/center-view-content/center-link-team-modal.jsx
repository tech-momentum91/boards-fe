import React, { useEffect, useCallback, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { RiUserAddLine, RiErrorWarningFill, RiAddLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import * as Hint from '@/components/ui/hint';
import {
  fetchRolesWithType,
  fetchCoreTeamData,
  fetchSupportTeamData,
} from '@/redux/teamManagementSlice';
import {
  buildTeamListviewFilters,
  DEFAULT_TEAM_APPLIED_FILTERS,
} from '@/components/team-management/constants';
import { fetchRoleTeamMemberListThunk } from '@/redux/centerSlice';
import { showErrorToast } from '@/utils/error-utils';
import { filterGroupedRolesOnlyCenterReqField, normalizeRoleEntry } from '@/utils/user-utils';
import { isRoleMaxLimitReached, getRoleMaxLimit } from '@/utils/center-configuration-storage';

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

const CenterLinkTeamModal = ({
  isOpen,
  onOpenChange,
  scope = 'core_team',
  onSubmit: onSubmitProperty,
  isLoading = false,
  centerId,
  onOpenAddNewMember,
  onMaxLimitReached,
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

  // const teamMemberOptions = isCoreTeam ? coreTeamData : supportTeamData;
  const [teamMemberOptions, setTeamMemberOptions] = useState([]);
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
      const freshApiFilters = buildTeamListviewFilters(DEFAULT_TEAM_APPLIED_FILTERS, {
        fixedCenter: centerId,
        includeStatus: isCoreTeam,
      });
      if (isCoreTeam) {
        await dispatch(
          fetchCoreTeamData({ keyword: '', filters: freshApiFilters, page: 1, page_size: 100 }),
        ).unwrap();
      } else {
        const { from_date, to_date } = getSupportTeamDefaultDates();
        await dispatch(
          fetchSupportTeamData({
            page: 1,
            page_size: 100,
            filters: freshApiFilters,
            from_date,
            to_date,
            status: 'Active',
          }),
        ).unwrap();
      }
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to fetch team members.' });
    }
  }, [dispatch, isCoreTeam, centerId]);

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
    setValue,
    reset,
    getValues,
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

  const loadRoleTeamMembers = useCallback(
    async (role) => {
      if (!role || !centerId) {
        setTeamMemberOptions([]);
        return;
      }
      try {
        const queryRole =
          role === 'CRM (Account Manager)' || role === 'CRM(Account Manager)' ? 'CRM' : role;
        const response = await dispatch(
          fetchRoleTeamMemberListThunk({ role: queryRole, center: centerId }),
        ).unwrap();
        setTeamMemberOptions(response?.message?.members ?? []);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to fetch team members.' });
        setTeamMemberOptions([]);
      }
    },
    [dispatch, centerId],
  );

  const onSubmit = (data) => {
    const team_member_id = data.team_member;
    const maxCount = getRoleMaxLimit(centerId, data.role);
    if (isRoleMaxLimitReached(centerId, data.role, coreTeamData, supportTeamData)) {
      onMaxLimitReached?.({
        role: data.role,
        team_member_id,
        team_member: data.team_member,
        maxCount,
      });
      onOpenChange(false);
      reset();
      return;
    }
    onSubmitProperty?.({ role: data.role, team_member_id, team_member: data.team_member });
    onOpenChange(false);
    reset();
  };

  const handleCancel = () => {
    onOpenChange(false);
    reset();
  };

  const getTeamMemberValue = (item) => {
    if (!item) return '';
    return item?.team_member_id ?? item?.email ?? item?.employee_id ?? '';
  };

  const getTeamMemberLabel = (item) => {
    if (!item) return '';
    return item?.name ?? item?.email ?? '';
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiUserAddLine}
          title='Link Team Member'
          description='Select a role and team member'
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
                    size='small'
                    onValueChange={(value) => {
                      field.onChange(value);
                      setValue('team_member', '');
                      loadRoleTeamMembers(value);
                    }}
                    hasError={Boolean(errors.role)}
                    disabled={isLoading}
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
                    size='small'
                    onValueChange={field.onChange}
                    hasError={Boolean(errors.team_member)}
                    disabled={isLoading || teamMemberListLoading}
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value placeholder='Select team member' />
                    </Select.Trigger>
                    <Select.Content className='relative min-w-[var(--radix-select-trigger-width)]'>
                      {(Array.isArray(teamMemberOptions) ? teamMemberOptions : []).map((item) => {
                        const value = getTeamMemberValue(item);
                        if (!value) return null;
                        return (
                          <Select.Item key={value} value={value}>
                            {getTeamMemberLabel(item)}
                          </Select.Item>
                        );
                      })}

                      <div className='sticky z-10 bg-white bottom-0 w-full'>
                        <Button.Root
                          variant='neutral'
                          mode='stroke'
                          size='xsmall'
                          className='w-full flex items-center justify-center gap-2'
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenAddNewMember?.(getValues('role') ?? '');
                          }}
                        >
                          <Button.Icon as={RiAddLine} />
                          Add New Member
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
            size='small'
            className='flex-1'
            variant='neutral'
            mode='stroke'
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button.Root>
          <Button.Root
            size='small'
            type='submit'
            className='flex-1'
            onClick={handleSubmit(onSubmit)}
            variant='primary'
            mode='filled'
            disabled={isLoading || teamMemberListLoading}
          >
            {isLoading ? 'Linking...' : 'Link'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CenterLinkTeamModal;
