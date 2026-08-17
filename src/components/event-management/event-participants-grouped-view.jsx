import React from 'react';
import { RiArrowDownSLine, RiArrowUpSLine, RiBuildingLine } from 'react-icons/ri';
import { ParticipantTextCellWithTooltip } from '@/components/event-management/event-participants-utils';

const EventParticipantsGroupedView = ({
  groupBy = '',
  filteredGroups,
  expandedGroups,
  onToggleGroup,
  DataTableComponent,
  visibleColumns,
  fieldOverrides,
  editingCell,
  editBuffer,
  setEditBuffer,
  beginEditExpectedSeats,
  beginEditRemarks,
  commitExpectedSeatsFromInput,
  commitRemarksFromInput,
  hasMoreParticipants,
  sentinelRef,
  isLoadingMore,
}) => {
  const showCenterGroupIcon = groupBy === 'Center';

  return (
    <div className='flex flex-col gap-5'>
      {filteredGroups.map((group) => {
        const isExpanded = expandedGroups[group.id] !== false;
        return (
          <div key={group.id} className='flex flex-col gap-1'>
            <button
              type='button'
              onClick={() => onToggleGroup(group.id)}
              className='label-small flex w-full cursor-pointer items-center gap-2 text-left font-medium text-text-sub-500 transition-opacity hover:opacity-80'
            >
              <span className='flex min-w-0 items-center gap-2'>
                {showCenterGroupIcon ? (
                  <RiBuildingLine className='shrink-0 text-text-sub-500' size={20} aria-hidden />
                ) : null}
                <ParticipantTextCellWithTooltip
                  text={group.center}
                  strong
                  className='max-w-[320px] truncate'
                />
              </span>
              {isExpanded ? (
                <RiArrowUpSLine size={16} className='shrink-0 text-text-soft-400' />
              ) : (
                <RiArrowDownSLine size={16} className='shrink-0 text-text-soft-400' />
              )}
            </button>

            {isExpanded ? (
              <div className='w-full'>
                <div className='w-full overflow-x-auto'>
                  <DataTableComponent
                    group={group}
                    rows={group.rows}
                    visibleColumns={visibleColumns}
                    fieldOverrides={fieldOverrides}
                    editingCell={editingCell}
                    editBuffer={editBuffer}
                    setEditBuffer={setEditBuffer}
                    beginEditExpectedSeats={beginEditExpectedSeats}
                    beginEditRemarks={beginEditRemarks}
                    commitExpectedSeatsFromInput={commitExpectedSeatsFromInput}
                    commitRemarksFromInput={commitRemarksFromInput}
                    emptyMessage='No participants in this group.'
                  />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      {hasMoreParticipants ? (
        <div ref={sentinelRef} data-scroll-sentinel className='h-1 w-full' />
      ) : null}
      {isLoadingMore ? (
        <div className='flex items-center justify-center gap-2 py-8'>
          <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
          <span className='paragraph-small text-text-sub-600'>Loading more groups...</span>
        </div>
      ) : null}
    </div>
  );
};

export default EventParticipantsGroupedView;
