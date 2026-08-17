import React from 'react';
import {
  RiUserLocationFill,
  RiBuildingLine,
  RiHammerLine,
  RiCalendarEventLine,
  RiFileList3Line,
} from 'react-icons/ri';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import VmsToolbar from '@/components/vms/vms-toolbar';
import VmsVisitorsTable from '@/components/vms/vms-visitors-table';
import VmsSpaceInquiriesTable from '@/components/vms/vms-space-inquiries-table';
import VmsVendorsTable from '@/components/vms/vms-vendors-table';
import VmsEventParticipantsTable from '@/components/vms/vms-event-participants-table';
import { VMS_EMPTY_STATES } from '@/components/vms/constants';

export const VMS_TAB_OPTIONS = [
  { value: 'all', label: 'All', icon: RiFileList3Line },
  { value: 'visitors', label: 'Visitors', icon: RiUserLocationFill },
  { value: 'space-inquiries', label: 'Space Inquiries', icon: RiBuildingLine },
  { value: 'vendors', label: 'Vendors', icon: RiHammerLine },
  { value: 'event-participants', label: 'Event Participants', icon: RiCalendarEventLine },
];

const NoCentersEmptyCard = () => {
  const { title, description } = VMS_EMPTY_STATES.no_centers;
  return (
    <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
      <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{title}</h3>
      <p className='text-sm text-text-sub-600'>{description}</p>
    </div>
  );
};

const VmsStatusTabs = ({
  value = 'visitors',
  noCenters = false,
  counts = {},
  onValueChange,
  searchValue,
  onSearchChange,
  onInvite,
  onRowClick,
  // Table refs
  allTableRef,
  visitorsTableRef,
  spaceInquiriesTableRef,
  vendorsTableRef,
  eventParticipantsTableRef,
  // Group by (tab-specific)
  groupByVisitors = '',
  groupBySpace = '',
  groupByVendors = '',
  groupOrder = 'asc',
  onGroupByChange,
  onGroupOrderChange,
  dateRange,
  onDateRangeChange,
  visitorsAppliedFilters,
  onVisitorsFiltersChange,
  spaceAppliedFilters,
  onSpaceFiltersChange,
  vendorsAppliedFilters,
  onVendorsFiltersChange,
  visitorsFilterCount = 0,
  spaceFilterCount = 0,
  vendorsFilterCount = 0,
  // All
  all = [],
  isAllLoading = false,
  allError = null,
  allApiColumns = [],
  onAllColumnsChange,
  allColumnConfigHook,
  onAllColumnConfigHookChange,
  allHasMore = false,
  allIsLoadingMore = false,
  onAllLoadMore,
  onAllRetry,
  allSorting = [],
  onAllSortingChange,
  // Visitors
  visitors = [],
  visitorsGroups = [],
  isVisitorsGrouped = false,
  isVisitorsLoading = false,
  visitorsError = null,
  visitorsApiColumns = [],
  onVisitorsColumnsChange,
  visitorsColumnConfigHook,
  onVisitorsColumnConfigHookChange,
  visitorsHasMore = false,
  visitorsIsLoadingMore = false,
  onVisitorsLoadMore,
  onVisitorsRetry,
  visitorsSorting = [],
  onVisitorsSortingChange,
  // Space inquiries
  spaceInquiries = [],
  spaceInquiriesGroups = [],
  isSpaceInquiriesGrouped = false,
  isSpaceInquiriesLoading = false,
  spaceInquiriesError = null,
  spaceInquiriesApiColumns = [],
  onSpaceInquiriesColumnsChange,
  spaceInquiriesColumnConfigHook,
  onSpaceInquiriesColumnConfigHookChange,
  spaceInquiriesHasMore = false,
  spaceInquiriesIsLoadingMore = false,
  onSpaceInquiriesLoadMore,
  onSpaceInquiriesRetry,
  spaceSorting = [],
  onSpaceSortingChange,
  // Vendors
  vendors = [],
  vendorsGroups = [],
  isVendorsGrouped = false,
  isVendorsLoading = false,
  vendorsError = null,
  vendorsApiColumns = [],
  onVendorsColumnsChange,
  vendorsColumnConfigHook,
  onVendorsColumnConfigHookChange,
  vendorsHasMore = false,
  vendorsIsLoadingMore = false,
  onVendorsLoadMore,
  onVendorsRetry,
  vendorsSorting = [],
  onVendorsSortingChange,
  // Event participants (static)
  eventParticipants = [],
  isEventParticipantsLoading = false,
  eventParticipantsColumnConfigHook,
  onEventParticipantsColumnConfigHookChange,
}) => {
  return (
    <TabMenuHorizontal.Root value={value} onValueChange={onValueChange}>
      <TabMenuHorizontal.List className='gap-6' wrapperClassName='w-full'>
        {VMS_TAB_OPTIONS.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.value] ?? 0;

          return (
            <TabMenuHorizontal.Trigger
              key={tab.value}
              value={tab.value}
              className='h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
            >
              <TabMenuHorizontal.Icon as={Icon} className='size-4' />
              <span>{tab.label}</span>
              <span className='inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-semibold bg-bg-weak-100 text-text-sub-600 transition-colors duration-200 group-data-[state=active]/tab-item:bg-primary-base group-data-[state=active]/tab-item:text-text-white-0'>
                {count}
              </span>
            </TabMenuHorizontal.Trigger>
          );
        })}
      </TabMenuHorizontal.List>

      <TabMenuHorizontal.Content value='all' className='flex flex-col gap-4 pt-4'>
        <VmsToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onInvite={onInvite}
          columnConfigHook={allColumnConfigHook}
          tableRef={allTableRef}
          groupBy=''
          groupOrder={groupOrder}
          onGroupByChange={onGroupByChange}
          onGroupOrderChange={onGroupOrderChange}
          activeTab='all'
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          appliedFilters={null}
          onFiltersChange={null}
          filterCount={0}
        />
        {noCenters ? (
          <NoCentersEmptyCard />
        ) : (
          <VmsVisitorsTable
            ref={allTableRef}
            rows={all}
            isLoading={isAllLoading}
            error={allError}
            onRetry={onAllRetry}
            onRowClick={onRowClick}
            tableId='vms-all-table'
            variant='compact'
            apiColumns={allApiColumns}
            onColumnsChange={onAllColumnsChange}
            onColumnConfigHookChange={onAllColumnConfigHookChange}
            hasMore={allHasMore}
            isLoadingMore={allIsLoadingMore}
            onLoadMore={onAllLoadMore}
            sorting={allSorting}
            onSortingChange={onAllSortingChange}
          />
        )}
      </TabMenuHorizontal.Content>

      <TabMenuHorizontal.Content value='visitors' className='flex flex-col gap-4 pt-4'>
        <VmsToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onInvite={onInvite}
          columnConfigHook={visitorsColumnConfigHook}
          tableRef={visitorsTableRef}
          groupBy={groupByVisitors}
          groupOrder={groupOrder}
          onGroupByChange={onGroupByChange}
          onGroupOrderChange={onGroupOrderChange}
          activeTab='visitors'
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          appliedFilters={visitorsAppliedFilters}
          onFiltersChange={onVisitorsFiltersChange}
          filterCount={visitorsFilterCount}
        />
        {noCenters ? (
          <NoCentersEmptyCard />
        ) : (
          <VmsVisitorsTable
            ref={visitorsTableRef}
            rows={visitors}
            groups={visitorsGroups}
            isGrouped={isVisitorsGrouped}
            isLoading={isVisitorsLoading}
            error={visitorsError}
            onRetry={onVisitorsRetry}
            onRowClick={onRowClick}
            tableId='vms-visitors-table'
            variant='compact'
            apiColumns={visitorsApiColumns}
            onColumnsChange={onVisitorsColumnsChange}
            onColumnConfigHookChange={onVisitorsColumnConfigHookChange}
            hasMore={visitorsHasMore}
            isLoadingMore={visitorsIsLoadingMore}
            onLoadMore={onVisitorsLoadMore}
            sorting={visitorsSorting}
            onSortingChange={onVisitorsSortingChange}
          />
        )}
      </TabMenuHorizontal.Content>

      <TabMenuHorizontal.Content value='space-inquiries' className='flex flex-col gap-4 pt-4'>
        <VmsToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onInvite={onInvite}
          columnConfigHook={spaceInquiriesColumnConfigHook}
          tableRef={spaceInquiriesTableRef}
          groupBy={groupBySpace}
          groupOrder={groupOrder}
          onGroupByChange={onGroupByChange}
          onGroupOrderChange={onGroupOrderChange}
          activeTab='space-inquiries'
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          appliedFilters={spaceAppliedFilters}
          onFiltersChange={onSpaceFiltersChange}
          filterCount={spaceFilterCount}
        />
        {noCenters ? (
          <NoCentersEmptyCard />
        ) : (
          <VmsSpaceInquiriesTable
            ref={spaceInquiriesTableRef}
            rows={spaceInquiries}
            groups={spaceInquiriesGroups}
            isGrouped={isSpaceInquiriesGrouped}
            isLoading={isSpaceInquiriesLoading}
            error={spaceInquiriesError}
            onRetry={onSpaceInquiriesRetry}
            onRowClick={onRowClick}
            tableId='vms-space-inquiries-table'
            variant='compact'
            apiColumns={spaceInquiriesApiColumns}
            onColumnsChange={onSpaceInquiriesColumnsChange}
            onColumnConfigHookChange={onSpaceInquiriesColumnConfigHookChange}
            hasMore={spaceInquiriesHasMore}
            isLoadingMore={spaceInquiriesIsLoadingMore}
            onLoadMore={onSpaceInquiriesLoadMore}
            sorting={spaceSorting}
            onSortingChange={onSpaceSortingChange}
          />
        )}
      </TabMenuHorizontal.Content>

      <TabMenuHorizontal.Content value='vendors' className='flex flex-col gap-4 pt-4'>
        <VmsToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onInvite={onInvite}
          columnConfigHook={vendorsColumnConfigHook}
          tableRef={vendorsTableRef}
          groupBy={groupByVendors}
          groupOrder={groupOrder}
          onGroupByChange={onGroupByChange}
          onGroupOrderChange={onGroupOrderChange}
          activeTab='vendors'
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          appliedFilters={vendorsAppliedFilters}
          onFiltersChange={onVendorsFiltersChange}
          filterCount={vendorsFilterCount}
        />
        {noCenters ? (
          <NoCentersEmptyCard />
        ) : (
          <VmsVendorsTable
            ref={vendorsTableRef}
            rows={vendors}
            groups={vendorsGroups}
            isGrouped={isVendorsGrouped}
            isLoading={isVendorsLoading}
            error={vendorsError}
            onRetry={onVendorsRetry}
            onRowClick={onRowClick}
            tableId='vms-vendors-table'
            variant='compact'
            apiColumns={vendorsApiColumns}
            onColumnsChange={onVendorsColumnsChange}
            onColumnConfigHookChange={onVendorsColumnConfigHookChange}
            hasMore={vendorsHasMore}
            isLoadingMore={vendorsIsLoadingMore}
            onLoadMore={onVendorsLoadMore}
            sorting={vendorsSorting}
            onSortingChange={onVendorsSortingChange}
          />
        )}
      </TabMenuHorizontal.Content>

      <TabMenuHorizontal.Content value='event-participants' className='flex flex-col gap-4 pt-4'>
        <VmsToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onInvite={onInvite}
          columnConfigHook={eventParticipantsColumnConfigHook}
          tableRef={eventParticipantsTableRef}
          groupBy=''
          groupOrder={groupOrder}
          onGroupByChange={onGroupByChange}
          onGroupOrderChange={onGroupOrderChange}
          activeTab='event-participants'
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
        />
        <VmsEventParticipantsTable
          ref={eventParticipantsTableRef}
          rows={eventParticipants}
          isLoading={isEventParticipantsLoading}
          onRowClick={onRowClick}
          tableId='vms-event-participants-table'
          variant='compact'
          onColumnConfigHookChange={onEventParticipantsColumnConfigHookChange}
        />
      </TabMenuHorizontal.Content>
    </TabMenuHorizontal.Root>
  );
};

export default VmsStatusTabs;
