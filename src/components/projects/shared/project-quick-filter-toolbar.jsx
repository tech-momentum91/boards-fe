import React, { useMemo } from 'react';
import { RiCheckboxCircleLine } from 'react-icons/ri';
import * as Avatar from '@/components/ui/avatar';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/auth-context';
import { getAssigneeFirstNameInitial } from '@/utils/task-utils';
import { cn } from '@/utils/cn';

export function rowMatchesAssigneeFilter(row, assigneeFilterValues) {
  if (assigneeFilterValues.length === 0) return true;

  const filterSet = new Set(
    assigneeFilterValues.map((value) => String(value).trim()).filter(Boolean),
  );
  const rowKeys = (row.assignees ?? []).flatMap((assignee) =>
    [assignee.id, assignee.value, assignee.email, assignee.name]
      .filter(Boolean)
      .map((value) => String(value).trim()),
  );

  return rowKeys.some((key) => filterSet.has(key));
}

export function isCompletedQuickFilterActive(selectedFilters, completedStatus) {
  return selectedFilters?.status?.length === 1 && selectedFilters.status[0] === completedStatus;
}

export function isMyItemsQuickFilterActive(selectedFilters, currentUserEmail) {
  return (
    Boolean(currentUserEmail) &&
    selectedFilters?.assignee?.length === 1 &&
    selectedFilters.assignee[0] === currentUserEmail
  );
}

export function toggleCompletedQuickFilter(setSelectedFilters, completedStatus) {
  setSelectedFilters((prev) => ({
    ...prev,
    status:
      prev.status?.length === 1 && prev.status[0] === completedStatus ? [] : [completedStatus],
  }));
}

export function toggleMyItemsQuickFilter(setSelectedFilters, currentUserEmail) {
  if (!currentUserEmail) return;

  setSelectedFilters((prev) => ({
    ...prev,
    assignee:
      prev.assignee?.length === 1 && prev.assignee[0] === currentUserEmail
        ? []
        : [currentUserEmail],
  }));
}

export default function ProjectQuickFilterToolbar({
  selectedFilters,
  setSelectedFilters,
  completedStatus,
  entityLabel = 'tasks',
  size = 'xsmall',
}) {
  const { user: currentUser } = useAuth();
  const currentUserEmail = currentUser?.email ?? '';

  const isCompletedFilterActive = useMemo(
    () => isCompletedQuickFilterActive(selectedFilters, completedStatus),
    [completedStatus, selectedFilters],
  );

  const isMyItemsFilterActive = useMemo(
    () => isMyItemsQuickFilterActive(selectedFilters, currentUserEmail),
    [currentUserEmail, selectedFilters],
  );

  const currentUserInitial = useMemo(
    () =>
      getAssigneeFirstNameInitial({
        full_name: currentUser?.full_name,
        email: currentUserEmail,
      }),
    [currentUser?.full_name, currentUserEmail],
  );

  const completedLabel = `completed ${entityLabel}`;
  const myItemsLabel = `my ${entityLabel}`;

  return (
    <>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size={size}
            aria-pressed={isCompletedFilterActive}
            aria-label={
              isCompletedFilterActive ? `Show all ${entityLabel}` : `Show ${completedLabel}`
            }
            className={cn(isCompletedFilterActive && 'border-primary-base bg-primary-alpha-10')}
            onClick={() => toggleCompletedQuickFilter(setSelectedFilters, completedStatus)}
          >
            <Button.Icon as={RiCheckboxCircleLine} />
          </Button.Root>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{isCompletedFilterActive ? `Show all ${entityLabel}` : `Show ${completedLabel}`}</p>
        </Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type='button'
            aria-pressed={isMyItemsFilterActive}
            aria-label={isMyItemsFilterActive ? `Show all ${entityLabel}` : `Show ${myItemsLabel}`}
            disabled={!currentUserEmail}
            onClick={() => toggleMyItemsQuickFilter(setSelectedFilters, currentUserEmail)}
            className={cn(
              'rounded-full transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-50',
              isMyItemsFilterActive && 'ring-2 ring-primary-base',
            )}
          >
            <Avatar.Root size='24' color='blue'>
              {currentUser?.user_image ? (
                <Avatar.Image src={currentUser.user_image} alt='' />
              ) : (
                currentUserInitial
              )}
            </Avatar.Root>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>
            {isMyItemsFilterActive
              ? `Show all ${entityLabel}`
              : `Show ${entityLabel} assigned to me`}
          </p>
        </Tooltip.Content>
      </Tooltip.Root>
    </>
  );
}
