import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  RiArrowDownLine,
  RiArrowUpDownFill,
  RiArrowUpLine,
  RiBug2Line,
  RiGalleryView2,
  RiHeadphoneLine,
  RiInformationFill,
  RiListUnordered,
  RiSearchLine,
  RiSparkling2Fill,
  RiThumbUpFill,
} from 'react-icons/ri';

import PageLayout from '@/components/page-layout';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Filter from '@/components/ui/filter';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import * as Tooltip from '@/components/ui/tooltip';
import * as Banner from '@/components/ui/banner';
import SupportFeedbackList from '@/components/support/support-feedback-list';
import SupportFeedbackTable from '@/components/support/support-feedback-table';
import SupportFeedbackViewDrawer from '@/components/support/support-feedback-view-drawer';
import SubmitReportDrawer from '@/components/support/submit-report-drawer';
import SupportFeedbackFilterDropdown from '@/components/support/support-feedback-filter-dropdown';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import {
  SUPPORT_FEEDBACK_DEFAULT_STATUS,
  SUPPORT_FEEDBACK_FILTER,
  SUPPORT_FEEDBACK_STATUS_OPTIONS,
  SUPPORT_FEEDBACK_FILTER_SESSION_KEY,
  SUPPORT_FEEDBACK_APPLIED_FILTER_DEFAULTS,
  mergeStoredSupportFeedbackFilters,
} from '@/components/support/support-feedback-constants';
import { getSupportModuleOptions } from '@/components/support/support-module-options';
import {
  buildSupportIssuesListviewFilters,
  buildSupportListviewOrderBy,
  getSupportIssuesListview,
  deleteSupportIssue,
  mapApiSupportStatusToUi,
  mapApiSupportTypeToUiFilter,
  SUPPORT_LISTVIEW_SORT_MODE,
  updateSupportIssueStatus,
  updateSupportIssueType,
} from '@/api/support';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { cn } from '@/utils/cn';
import { showErrorToast } from '@/utils/error-utils';
import { isSuperAdminOrAdminRole } from '@/utils/user-role-utils';

const ISSUE_PAGE_SIZE = 20;
const SUPPORT_TAB_MAP = {
  [SUPPORT_FEEDBACK_FILTER.bug]: 'Bug',
  [SUPPORT_FEEDBACK_FILTER.feature]: 'Feature',
};

const mapIssueRowToFeedbackItem = (row) => {
  const {
    id,
    subject,
    description,
    status,
    modules: rawModules,
    module: singleModule,
    raised_by,
    raised_by_name,
    upvote_count,
    user_upvoted,
    is_owner,
    created_at,
    modified_at,
    comment_count,
  } = row;

  let modules = [];
  if (Array.isArray(rawModules)) {
    modules = rawModules;
  } else if (singleModule != null && singleModule !== '') {
    modules = [String(singleModule)];
  }
  const moduleLabel = modules.length > 0 ? modules.join(', ') : '—';
  return {
    id,
    title: subject || 'Untitled issue',
    description: description || '',
    status: mapApiSupportStatusToUi(status ?? SUPPORT_FEEDBACK_DEFAULT_STATUS),
    type: mapApiSupportTypeToUiFilter(row),
    modules,
    module: moduleLabel,
    email: raised_by || '',
    raisedByName: raised_by_name || raised_by || 'Unknown',
    upvoteCount: upvote_count ?? 0,
    userUpvoted: Boolean(user_upvoted),
    isOwner: Boolean(is_owner),
    createdAt: created_at || '',
    modifiedAt: modified_at || '',
    photos: [],
    commentCount: comment_count ?? 0,
  };
};

const LIST_VIEW_CARD = 'card';
const LIST_VIEW_TABLE = 'table';

const SUPPORT_SORT_OPTIONS = [
  { value: SUPPORT_LISTVIEW_SORT_MODE.MOST_UPVOTED, label: 'Most Upvoted' },
  { value: SUPPORT_LISTVIEW_SORT_MODE.LATEST_CREATED, label: 'Latest Created' },
];

const SupportPage = () => {
  const profileData = useSelector((state) => state.profile?.profileData);
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const viewerEmail = useMemo(() => {
    return profileData?.email || '';
  }, [profileData]);
  const moduleOptions = useMemo(() => getSupportModuleOptions(userSideBarPerm), [userSideBarPerm]);
  /** Admin / Super Admin: table layout + editable issue status */
  const canModerateSupport = useMemo(
    () => isSuperAdminOrAdminRole(userSideBarPerm),
    [userSideBarPerm],
  );
  const [listViewMode, setListViewMode] = useState(LIST_VIEW_CARD);
  const [filterType, setFilterType] = useState(SUPPORT_FEEDBACK_FILTER.bug);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const isDebouncing = searchQuery !== debouncedSearchQuery;
  const [listFilters, setListFilters] = usePersistedFilters({
    storageKey: SUPPORT_FEEDBACK_FILTER_SESSION_KEY,
    defaultFilters: mergeStoredSupportFeedbackFilters({}),
    persistIncludeKeys: ['module', 'status'],
    persistTrimStringArrays: true,
  });
  const [filterCount, setFilterCount] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [listState, setListState] = useState({
    rows: [],
    status: 'loading',
    error: null,
    page: 1,
    limit: ISSUE_PAGE_SIZE,
    pages: 1,
    total: 0,
    hasMore: true,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortField, setSortField] = useState(SUPPORT_LISTVIEW_SORT_MODE.LATEST_CREATED);
  const [sortDirection, setSortDirection] = useState('desc');
  const [isSortPopoverOpen, setIsSortPopoverOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitReportOpen, setSubmitReportOpen] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState('');
  const [updatingTypeId, setUpdatingTypeId] = useState('');
  const [deletingIssueId, setDeletingIssueId] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteIssueId, setPendingDeleteIssueId] = useState('');
  const requestIdRef = useRef(0);
  const skipListViewModeFetchRef = useRef(true);
  const fetchSupportIssuesRef = useRef(null);
  const supportDetailMutatedRef = useRef(false);
  const statusOptions = useMemo(
    () =>
      SUPPORT_FEEDBACK_STATUS_OPTIONS.map((statusOption) => ({
        label: statusOption.label,
        value: statusOption.value,
      })),
    [],
  );

  useEffect(() => {
    if (isFilterOpen) return;
    setFilterCount(
      (Array.isArray(listFilters.module) ? listFilters.module.length : 0) +
        (Array.isArray(listFilters.status) ? listFilters.status.length : 0),
    );
  }, [listFilters, isFilterOpen]);

  const apiFilters = useMemo(() => buildSupportIssuesListviewFilters(listFilters), [listFilters]);

  const fetchSupportIssues = useCallback(
    async ({ page = 1, append = false } = {}) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setListState((previous) => ({
          ...previous,
          status: 'loading',
          error: null,
        }));
      }

      try {
        const response = await getSupportIssuesListview({
          keyword: debouncedSearchQuery.trim(),
          tab: SUPPORT_TAB_MAP[filterType] || SUPPORT_TAB_MAP[SUPPORT_FEEDBACK_FILTER.bug],
          filters: apiFilters,
          page,
          limitPageLength: ISSUE_PAGE_SIZE,
          orderBy: buildSupportListviewOrderBy(sortField, sortDirection),
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        const mappedRows = response.results.map(mapIssueRowToFeedbackItem);

        setListState((previous) => {
          const nextRows = append ? [...previous.rows, ...mappedRows] : mappedRows;
          const dedupedRows = nextRows.filter((item, index, allItems) => {
            return allItems.findIndex((entry) => entry.id === item.id) === index;
          });
          return {
            rows: dedupedRows,
            status: 'succeeded',
            error: null,
            page: response.page,
            limit: response.limit,
            pages: response.pages,
            total: response.total,
            hasMore: response.page < response.pages,
          };
        });

        setSelected((current) => {
          if (!current) return current;
          const refreshed = mappedRows.find((row) => row.id === current.id);
          return refreshed ?? current;
        });
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setListState((previous) => ({
          ...previous,
          status: 'failed',
          error: error?.message || 'Failed to load support reports.',
        }));
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoadingMore(false);
        }
      }
    },
    [apiFilters, debouncedSearchQuery, filterType, sortField, sortDirection],
  );

  fetchSupportIssuesRef.current = fetchSupportIssues;

  useEffect(() => {
    fetchSupportIssues({ page: 1, append: false });
  }, [fetchSupportIssues]);

  useEffect(() => {
    if (skipListViewModeFetchRef.current) {
      skipListViewModeFetchRef.current = false;
      return;
    }
    fetchSupportIssuesRef.current?.({ page: 1, append: false });
  }, [listViewMode]);

  useEffect(() => {
    if (!canModerateSupport && listViewMode === LIST_VIEW_TABLE) {
      setListViewMode(LIST_VIEW_CARD);
    }
  }, [canModerateSupport, listViewMode]);

  const handleClearFilters = useCallback(
    (event) => {
      event.stopPropagation();
      setListFilters({ ...SUPPORT_FEEDBACK_APPLIED_FILTER_DEFAULTS });
      setFilterCount(0);
      setIsFilterOpen(false);
    },
    [setListFilters],
  );

  const openDrawer = useCallback((item) => {
    setSubmitReportOpen(false);
    setSelected(item);
    setDrawerOpen(true);
  }, []);

  const markSupportDetailMutated = useCallback(() => {
    supportDetailMutatedRef.current = true;
  }, []);

  const handleDrawerOpenChange = useCallback((open) => {
    setDrawerOpen(open);
    if (!open) {
      const shouldSyncList = supportDetailMutatedRef.current;
      supportDetailMutatedRef.current = false;
      setSelected(null);

      if (shouldSyncList) {
        fetchSupportIssuesRef.current?.({ page: 1, append: false });
      }
    }
  }, []);

  const handleReportSubmitted = useCallback(() => {
    fetchSupportIssues({ page: 1, append: false });
  }, [fetchSupportIssues]);

  const handleStatusChange = useCallback(
    async (issueId, nextStatus) => {
      if (!canModerateSupport) return;
      if (!issueId || !nextStatus) return;

      const previousRows = listState.rows;
      const previousSelected = selected;

      setUpdatingStatusId(issueId);
      setListState((previous) => ({
        ...previous,
        rows: previous.rows.map((row) =>
          row.id === issueId
            ? {
                ...row,
                status: nextStatus,
              }
            : row,
        ),
      }));
      setSelected((current) =>
        current?.id === issueId
          ? {
              ...current,
              status: nextStatus,
            }
          : current,
      );

      try {
        await updateSupportIssueStatus(issueId, nextStatus);
        if (drawerOpen) {
          markSupportDetailMutated();
        }
      } catch (error) {
        setListState((previous) => ({
          ...previous,
          rows: previousRows,
        }));
        setSelected(previousSelected);
        showErrorToast(error, { defaultMessage: 'Failed to update status.' });
      } finally {
        setUpdatingStatusId('');
      }
    },
    [canModerateSupport, listState.rows, selected, drawerOpen, markSupportDetailMutated],
  );

  const handleTypeChange = useCallback(
    async (issueId, nextTypeUi) => {
      if (!canModerateSupport) return;
      if (!issueId || !nextTypeUi) return;

      const previousRows = listState.rows;
      const previousSelected = selected;

      setUpdatingTypeId(issueId);
      setListState((previous) => ({
        ...previous,
        rows: previous.rows.map((row) =>
          row.id === issueId
            ? {
                ...row,
                type: nextTypeUi,
              }
            : row,
        ),
      }));
      setSelected((current) =>
        current?.id === issueId
          ? {
              ...current,
              type: nextTypeUi,
            }
          : current,
      );

      try {
        await updateSupportIssueType(issueId, nextTypeUi);
        if (drawerOpen) {
          markSupportDetailMutated();
        }
      } catch (error) {
        setListState((previous) => ({
          ...previous,
          rows: previousRows,
        }));
        setSelected(previousSelected);
        showErrorToast(error, { defaultMessage: 'Failed to update issue type.' });
      } finally {
        setUpdatingTypeId('');
      }
    },
    [canModerateSupport, listState.rows, selected, drawerOpen, markSupportDetailMutated],
  );

  const handleRequestDeleteIssue = useCallback(
    (issueId) => {
      if (!canModerateSupport || !issueId) return;
      setPendingDeleteIssueId(issueId);
      setDeleteConfirmOpen(true);
    },
    [canModerateSupport],
  );

  const handleConfirmDeleteIssue = useCallback(async () => {
    if (!pendingDeleteIssueId) return;

    setDeletingIssueId(pendingDeleteIssueId);
    try {
      await deleteSupportIssue(pendingDeleteIssueId);
      setDeleteConfirmOpen(false);
      setPendingDeleteIssueId('');
      setDrawerOpen(false);
      setSelected(null);
      supportDetailMutatedRef.current = false;
      await fetchSupportIssues({ page: 1, append: false });
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to delete issue.' });
    } finally {
      setDeletingIssueId('');
    }
  }, [fetchSupportIssues, pendingDeleteIssueId]);

  const handleDeleteModalOpenChange = useCallback(
    (open) => {
      setDeleteConfirmOpen(open);
      if (!open && !deletingIssueId) {
        setPendingDeleteIssueId('');
      }
    },
    [deletingIssueId],
  );

  const handleLoadMore = useCallback(() => {
    if (listState.status === 'loading' || isLoadingMore || !listState.hasMore) return;
    fetchSupportIssues({ page: listState.page + 1, append: true });
  }, [fetchSupportIssues, isLoadingMore, listState.hasMore, listState.page, listState.status]);

  const listForDisplay = listState.rows;

  const sortOptionLabel = useMemo(
    () => SUPPORT_SORT_OPTIONS.find((o) => o.value === sortField)?.label ?? 'Latest Created',
    [sortField],
  );
  const isDefaultSort =
    sortField === SUPPORT_LISTVIEW_SORT_MODE.LATEST_CREATED && sortDirection === 'desc';

  const listSharedProps = {
    items: listForDisplay,
    onOpen: openDrawer,
    onStatusChange: handleStatusChange,
    statusOptions,
    updatingStatusId,
    onLoadMore: handleLoadMore,
    hasMore: listState.hasMore,
    isLoadingMore,
    canChangeStatus: canModerateSupport,
  };

  const renderSupportListSection = () => {
    const showLoadingShell =
      (listState.status === 'loading' || isDebouncing) && listForDisplay.length === 0;
    if (showLoadingShell) {
      return (
        <div className='rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-6 py-16 text-center'>
          <p className='text-label-sm text-text-sub-600'>Loading reports...</p>
        </div>
      );
    }
    if (listForDisplay.length === 0) {
      const emptyCopy =
        debouncedSearchQuery.trim().length === 0 && filterCount === 0 ? (
          <>
            <p className='text-label-sm text-text-sub-600'>Nothing here yet</p>
            <p className='mt-2 text-paragraph-sm text-text-sub-600'>
              Switch between Bug and Feature, or submit a report to populate this list.
            </p>
          </>
        ) : (
          <>
            <p className='text-label-sm text-text-sub-600'>No matching reports</p>
            <p className='mt-2 text-paragraph-sm text-text-sub-600'>
              Try a different search, clear filters, or switch Bug / Feature.
            </p>
          </>
        );
      return (
        <div className='rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-6 py-16 text-center'>
          {emptyCopy}
        </div>
      );
    }
    if (listViewMode === LIST_VIEW_TABLE) {
      return <SupportFeedbackTable {...listSharedProps} />;
    }
    return <SupportFeedbackList {...listSharedProps} />;
  };

  return (
    <PageLayout
      pageTitle='Support'
      pageIcon={<RiHeadphoneLine size={24} />}
      pageDescription='Browse bugs and features raised by your team, and vote for what matters most.'
    >
      <div className='flex flex-col gap-6 px-8 py-5'>
        <Banner.Root variant='lighter' size='small' status='information'>
          <Banner.Content>
            {/* <div className='w-full flex items-center'> */}
            <Banner.Icon as={RiInformationFill} />
            <span className='text-paragraph-sm text-text-main-900'>
              If you believe your issue has already been submitted here, please consider upvoting it
              using the provided icon.
            </span>
            <Banner.Icon as={RiThumbUpFill} />
            {/* </div> */}
          </Banner.Content>
        </Banner.Root>

        <header className='flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <Input.Root size='xsmall' className='w-full min-w-0 lg:max-w-[372px]'>
            <Input.Wrapper>
              <Input.Icon>
                <RiSearchLine />
              </Input.Icon>
              <Input.Input
                placeholder='Search by title, description or author'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label='Search support reports'
              />
            </Input.Wrapper>
          </Input.Root>

          <div className='flex min-w-0 shrink-0 flex-wrap items-center gap-2 sm:gap-3'>
            <Popover.Root open={isSortPopoverOpen} onOpenChange={setIsSortPopoverOpen}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Popover.Trigger asChild>
                    <Button.Root
                      type='button'
                      variant={isDefaultSort ? 'neutral' : 'primary'}
                      mode={isDefaultSort ? 'stroke' : 'lighter'}
                      size='small'
                      className={cn(
                        'gap-2 flex min-w-0 max-w-[min(100%,220px)] items-center justify-center',
                        isDefaultSort ? '' : 'ring-1 ring-primary-base',
                      )}
                      aria-label='Sort list'
                    >
                      <Button.Icon as={RiArrowUpDownFill} className='shrink-0' />
                      <span className='label-small truncate'>{sortOptionLabel}</span>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <span
                            className='shrink-0 cursor-pointer flex items-center justify-center'
                            onClick={(e) => {
                              e.stopPropagation();
                              setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                            }}
                          >
                            {sortDirection === 'asc' ? (
                              <RiArrowUpLine size={20} />
                            ) : (
                              <RiArrowDownLine size={20} />
                            )}
                          </span>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          <span className='paragraph-xsmall'>
                            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                          </span>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Button.Root>
                  </Popover.Trigger>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <span className='paragraph-xsmall'>Sort</span>
                </Tooltip.Content>
              </Tooltip.Root>
              <Popover.Content align='left' className='w-[300px] p-3'>
                <div className='flex w-full flex-col gap-2'>
                  <div className='flex w-full items-center justify-between'>
                    <span className='text-subheading-2xs text-text-soft-400'>SORT</span>
                    <LinkButton.Root
                      variant='primary'
                      size='small'
                      onClick={() => {
                        setSortField(SUPPORT_LISTVIEW_SORT_MODE.LATEST_CREATED);
                        setSortDirection('desc');
                        setIsSortPopoverOpen(false);
                      }}
                    >
                      Clear
                    </LinkButton.Root>
                  </div>

                  <Select.Root
                    value={sortField || ''}
                    onValueChange={(value) => {
                      setSortField(value);
                      setIsSortPopoverOpen(false);
                    }}
                    size='small'
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value placeholder='Sort by' />
                    </Select.Trigger>
                    <Select.Content>
                      {SUPPORT_SORT_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>

                  <ButtonGroup.Root>
                    <ButtonGroup.Item
                      type='button'
                      data-state={sortDirection === 'asc' ? 'on' : 'off'}
                      onClick={() => setSortDirection('asc')}
                      className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                    >
                      <ButtonGroup.Icon
                        data-state={sortDirection === 'asc' ? 'on' : 'off'}
                        className='data-[state=on]:text-primary-base '
                        as={RiArrowUpLine}
                      />
                      Ascending
                    </ButtonGroup.Item>
                    <ButtonGroup.Item
                      type='button'
                      data-state={sortDirection === 'desc' ? 'on' : 'off'}
                      onClick={() => setSortDirection('desc')}
                      className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1  data-[state=on]:ring-primary-base'
                    >
                      <ButtonGroup.Icon
                        data-state={sortDirection === 'desc' ? 'on' : 'off'}
                        className='data-[state=on]:text-primary-base '
                        as={RiArrowDownLine}
                      />
                      Descending
                    </ButtonGroup.Item>
                  </ButtonGroup.Root>
                </div>
              </Popover.Content>
            </Popover.Root>

            {canModerateSupport ? (
              <div className='flex items-center'>
                <ButtonGroup.Root size='xsmall'>
                  <ButtonGroup.Item
                    type='button'
                    aria-label='Card view'
                    aria-pressed={listViewMode === LIST_VIEW_CARD}
                    data-state={listViewMode === LIST_VIEW_CARD ? 'on' : 'off'}
                    className='data-[state=on]:bg-primary-lighter data-[state=on]:border-primary-base data-[state=on]:z-1 data-[state=on]:border-1'
                    onClick={() => setListViewMode(LIST_VIEW_CARD)}
                  >
                    <ButtonGroup.Icon as={RiGalleryView2} />
                  </ButtonGroup.Item>
                  <ButtonGroup.Item
                    type='button'
                    aria-label='Table view'
                    aria-pressed={listViewMode === LIST_VIEW_TABLE}
                    data-state={listViewMode === LIST_VIEW_TABLE ? 'on' : 'off'}
                    className='data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                    onClick={() => setListViewMode(LIST_VIEW_TABLE)}
                  >
                    <ButtonGroup.Icon as={RiListUnordered} />
                  </ButtonGroup.Item>
                </ButtonGroup.Root>
              </div>
            ) : null}

            <ButtonGroup.Root size='xsmall' className='w-full sm:w-auto'>
              <ButtonGroup.Item
                className='flex-1 min-w-[120px] sm:flex-none data-[state=on]:bg-primary-lighter data-[state=on]:border-primary-base data-[state=on]:z-1 data-[state=on]:border-1'
                data-state={filterType === SUPPORT_FEEDBACK_FILTER.bug ? 'on' : 'off'}
                onClick={() => setFilterType(SUPPORT_FEEDBACK_FILTER.bug)}
                type='button'
              >
                BUG
              </ButtonGroup.Item>
              <ButtonGroup.Item
                className='flex-1 min-w-[120px] sm:flex-none data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                data-state={filterType === SUPPORT_FEEDBACK_FILTER.feature ? 'on' : 'off'}
                onClick={() => setFilterType(SUPPORT_FEEDBACK_FILTER.feature)}
                type='button'
              >
                FEATURE
              </ButtonGroup.Item>
            </ButtonGroup.Root>

            <Popover.Root
              open={isFilterOpen}
              onOpenChange={(open) => {
                const wasOpen = isFilterOpen;
                setIsFilterOpen(open);
                if (wasOpen && !open && filterDropdownRef.current) {
                  filterDropdownRef.current.handleClose();
                }
              }}
            >
              <Filter.TriggerButton
                size='xsmall'
                filterCount={filterCount}
                onClear={handleClearFilters}
                tooltipContent='Filter'
                ariaLabel='Filter support reports'
              />
              <SupportFeedbackFilterDropdown
                ref={filterDropdownRef}
                open={isFilterOpen}
                setFilterCount={setFilterCount}
                onFiltersChange={setListFilters}
                appliedFilters={listFilters}
                moduleOptions={moduleOptions}
              />
            </Popover.Root>

            <Button.Root
              onClick={() => {
                setDrawerOpen(false);
                setSelected(null);
                setSubmitReportOpen(true);
              }}
              variant='primary'
              mode='filled'
              size='xsmall'
              className={`gap-2 ${filterType === SUPPORT_FEEDBACK_FILTER.bug ? 'bg-error-base text-white hover:bg-error-base' : 'bg-primary-base text-white hover:bg-primary-base'}`}
            >
              <Button.Icon
                as={filterType === SUPPORT_FEEDBACK_FILTER.bug ? RiBug2Line : RiSparkling2Fill}
              />
              {filterType === SUPPORT_FEEDBACK_FILTER.bug ? 'Report Bug' : 'Suggest Feature'}
            </Button.Root>
          </div>
        </header>

        {renderSupportListSection()}

        {listState.error ? (
          <p className='rounded-xl border border-error-base/30 bg-error-lighter/30 p-3 text-label-sm text-error-darker'>
            {listState.error}
          </p>
        ) : null}
      </div>

      <SupportFeedbackViewDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        item={selected}
        viewerEmail={viewerEmail}
        onDetailMutated={markSupportDetailMutated}
        canChangeStatus={canModerateSupport}
        canChangeType={canModerateSupport}
        statusOptions={statusOptions}
        onStatusChange={handleStatusChange}
        onTypeChange={handleTypeChange}
        updatingStatusId={updatingStatusId}
        updatingTypeId={updatingTypeId}
        canDelete={canModerateSupport}
        onDelete={handleRequestDeleteIssue}
        deletingId={deletingIssueId}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onOpenChange={handleDeleteModalOpenChange}
        title='Delete Report?'
        description='Are you sure you want to delete this report? This action cannot be undone.'
        onConfirm={handleConfirmDeleteIssue}
        isLoading={Boolean(deletingIssueId)}
        confirmLabel='Delete'
        loadingLabel='Deleting...'
      />

      <SubmitReportDrawer
        open={submitReportOpen}
        onOpenChange={setSubmitReportOpen}
        onSubmitted={handleReportSubmitted}
        defaultReportType={filterType}
        moduleOptions={moduleOptions}
      />
    </PageLayout>
  );
};

export default SupportPage;
