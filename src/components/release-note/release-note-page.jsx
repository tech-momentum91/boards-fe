import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiArticleLine, RiSearchLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';

import PageLayout from '@/components/page-layout';
import ReleaseNoteFormDrawer from '@/components/release-note/release-note-form-drawer';
import ReleaseNoteFilterPopover from '@/components/release-note/release-note-filter-popover';
import ReleaseNoteListCard from '@/components/release-note/release-note-list-card';
import ReleaseNoteListSkeleton from '@/components/release-note/release-note-list-skeleton';
import ReleaseNoteTimeline from '@/components/release-note/release-note-timeline';
import ReleaseNoteQuickLinks from '@/components/release-note/release-note-quick-links';
import { computeReleaseNoteFilterCount } from '@/components/release-note/utils';
import {
  RELEASE_NOTE_FILTER_SESSION_KEY,
  RELEASE_NOTE_APPLIED_FILTER_DEFAULTS,
  mergeStoredReleaseNoteFilters,
} from '@/components/release-note/constants';
import { getSupportModuleOptions } from '@/components/support/support-module-options';
import { buildReleaseNoteListviewFilters } from '@/api/releaseNote';
import * as Button from '@/components/ui/button';
import * as Filter from '@/components/ui/filter';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import * as Tooltip from '@/components/ui/tooltip';
import { MONTH_OPTIONS } from '@/constants/constants';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { useReleaseNoteScrollSpy } from '@/hooks/use-release-note-scroll-spy';
import {
  fetchReleaseNoteListview,
  fetchReleaseNoteModuleFilters,
  selectReleaseNoteList,
  selectReleaseNoteModuleFilterOptions,
} from '@/redux/releaseNoteSlice';
import { showErrorToast } from '@/utils/error-utils';
import { isSuperAdminRole } from '@/utils/user-role-utils';
import * as ButtonGroup from '@/components/ui/button-group';
import { cn } from '@/utils/cn';

const yearOptions = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => String(y - i));
})();

const monthValueOptions = MONTH_OPTIONS.map((label, index) => ({
  value: String(index + 1),
  label,
}));

const ReleaseNotePage = () => {
  const dispatch = useDispatch();
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const listState = useSelector(selectReleaseNoteList);
  const moduleOptions = useSelector(selectReleaseNoteModuleFilterOptions);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedKeyword = useDebounce(searchTerm, 400);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  /** Snapshot of note when opening edit — stable until drawer closes */
  const [noteToEdit, setNoteToEdit] = useState(null);
  const [appliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: RELEASE_NOTE_FILTER_SESSION_KEY,
    defaultFilters: mergeStoredReleaseNoteFilters({}),
    persistIncludeKeys: ['modules', 'published', 'draft'],
    persistTrimStringArrays: true,
  });
  const [filterCount, setFilterCount] = useState(() =>
    computeReleaseNoteFilterCount(RELEASE_NOTE_APPLIED_FILTER_DEFAULTS),
  );
  const filterDropdownRef = useRef(null);
  const listScrollRef = useRef(null);

  const [yearValue, setYearValue] = useState(() => String(new Date().getFullYear()));
  const [monthValue, setMonthValue] = useState(() => String(new Date().getMonth() + 1));

  const isSuperAdmin = useMemo(() => isSuperAdminRole(userSideBarPerm), [userSideBarPerm]);

  const monthStr = useMemo(
    () => `${yearValue}-${String(Number(monthValue)).padStart(2, '0')}`,
    [yearValue, monthValue],
  );

  const filterTuples = useMemo(
    () =>
      buildReleaseNoteListviewFilters({
        published: appliedFilters.published,
        draft: appliedFilters.draft,
        modules: appliedFilters.modules,
      }),
    [appliedFilters],
  );

  useEffect(() => {
    setFilterCount(computeReleaseNoteFilterCount(appliedFilters));
  }, [appliedFilters]);

  /** Non–super-admins cannot toggle status; keep Published-only query. */
  useEffect(() => {
    if (!isSuperAdmin) {
      setAppliedFilters((previous) =>
        previous.published && !previous.draft
          ? previous
          : { ...previous, published: true, draft: false },
      );
    }
  }, [isSuperAdmin]);

  const runFetch = useCallback(() => {
    const payload = {
      keyword: debouncedKeyword.trim(),
      filters: filterTuples,
      month: monthStr,
    };
    return dispatch(fetchReleaseNoteListview(payload))
      .unwrap()
      .catch((error) => {
        showErrorToast(error, {
          defaultMessage: 'Could not load release notes. Please try again.',
        });
      });
  }, [dispatch, debouncedKeyword, filterTuples, monthStr]);

  useEffect(() => {
    void runFetch();
  }, [runFetch]);

  useEffect(() => {
    void dispatch(fetchReleaseNoteModuleFilters())
      .unwrap()
      .catch((error) => {
        showErrorToast(error, {
          defaultMessage: 'Could not load release note module filters.',
        });
      });
  }, [dispatch]);

  const handleAfterSave = useCallback(async () => {
    await runFetch();
    await dispatch(fetchReleaseNoteModuleFilters())
      .unwrap()
      .catch(() => undefined);
  }, [dispatch, runFetch]);

  const handleClearFilters = useCallback((e) => {
    e?.stopPropagation?.();
    setAppliedFilters((previous) => ({ ...previous, modules: [] }));
  }, []);

  const handleAddReleaseNote = useCallback(() => {
    if (!isSuperAdmin) return;
    setNoteToEdit(null);
    setIsFormDrawerOpen(true);
  }, [isSuperAdmin]);

  const handleEditReleaseNote = useCallback(
    (note) => {
      if (!isSuperAdmin) return;
      setNoteToEdit(note ? { ...note } : null);
      setIsFormDrawerOpen(true);
    },
    [isSuperAdmin],
  );

  const handleFormDrawerOpenChange = useCallback((next) => {
    if (!next) setNoteToEdit(null);
    setIsFormDrawerOpen(next);
  }, []);

  const isListLoading =
    listState?.status === 'loading' ||
    (listState?.status === 'idle' && listState?.data == null && !listState?.error);
  const listFailed = listState?.status === 'failed';
  const results = listState?.data?.results ?? [];
  const quickLinks = listState?.data?.quick_links ?? [];
  const hasResults = results.length > 0;

  const scrollSpyIdsFingerprint = results.map((n) => n?.id ?? '').join('|');
  const [activeNoteId, setActiveNoteId] = useReleaseNoteScrollSpy(
    listScrollRef,
    scrollSpyIdsFingerprint,
  );

  const handleQuickLinkNavigate = useCallback(
    (id) => {
      setActiveNoteId(id);
    },
    [setActiveNoteId],
  );

  /** Toolbar segments: Published-only, Draft-only, or both (from filter popover). */
  const publishedSegmentOn =
    (appliedFilters.published && !appliedFilters.draft) ||
    (appliedFilters.published && appliedFilters.draft);
  const draftSegmentOn = appliedFilters.draft && !appliedFilters.published;

  let listBody;
  if (isListLoading) {
    listBody = <ReleaseNoteListSkeleton />;
  } else if (listFailed) {
    listBody = (
      <div className='flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 p-8 text-center'>
        <p className='text-paragraph-sm text-text-sub-600'>Couldn&apos;t load release notes.</p>
        <Button.Root
          type='button'
          variant='primary'
          mode='stroke'
          size='small'
          onClick={() => void runFetch()}
        >
          Try again
        </Button.Root>
      </div>
    );
  } else if (hasResults) {
    listBody = (
      <ReleaseNoteTimeline
        notes={results}
        renderCard={(note) => (
          <ReleaseNoteListCard note={note} canEdit={isSuperAdmin} onEdit={handleEditReleaseNote} />
        )}
      />
    );
  } else {
    listBody = (
      <div className='rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-6 py-12 text-center'>
        <p className='text-paragraph-sm text-text-sub-600'>
          No release notes for this month with the current filters.
        </p>
      </div>
    );
  }

  return (
    <PageLayout
      pageTitle='Release notes'
      pageIcon={<RiArticleLine size={28} />}
      pageDescription='View product updates and publish new releases for your team.'
    >
      <ReleaseNoteFormDrawer
        key={noteToEdit?.id ?? 'create'}
        open={isFormDrawerOpen}
        onOpenChange={handleFormDrawerOpenChange}
        onAfterSave={handleAfterSave}
        editNote={noteToEdit}
      />

      <div className='flex min-h-0 flex-1 flex-col gap-6 px-8 py-5'>
        {/* Left: search + year/month + Published / Draft (super admin only) */}

        <div className='w-full flex items-center justify-between'>
          <div className='flex  items-center gap-2'>
            <Input.Root size='xsmall' className='w-full  max-w-[372px]'>
              <Input.Wrapper>
                <Input.Icon>
                  <RiSearchLine />
                </Input.Icon>
                <Input.Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder='Search release notes'
                  aria-label='Search release notes'
                />
              </Input.Wrapper>
            </Input.Root>

            <div className='flex shrink-0 items-center gap-2'>
              <Select.Root
                value={yearValue}
                onValueChange={setYearValue}
                size='xsmall'
                variant='compact'
                matchTriggerWidth={false}
              >
                <Select.Trigger className='min-w-[88px]' aria-label='Filter by year'>
                  <Select.Value placeholder='Year' />
                </Select.Trigger>
                <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                  {yearOptions.map((y) => (
                    <Select.Item key={y} value={y}>
                      {y}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Select.Root
                value={monthValue}
                onValueChange={setMonthValue}
                size='xsmall'
                variant='compact'
                matchTriggerWidth={false}
              >
                <Select.Trigger className='min-w-[120px]' aria-label='Filter by month'>
                  <Select.Value placeholder='Month' />
                </Select.Trigger>
                <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                  {monthValueOptions.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            {isSuperAdmin ? (
              <ButtonGroup.Root size='xsmall' className='shrink-0'>
                <ButtonGroup.Item
                  type='button'
                  data-state={publishedSegmentOn ? 'on' : 'off'}
                  className='data-[state=on]:z-[1] data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:ring-primary-base'
                  onClick={() =>
                    setAppliedFilters((previous) => ({
                      ...previous,
                      published: true,
                      draft: false,
                    }))
                  }
                >
                  Published
                </ButtonGroup.Item>
                <ButtonGroup.Item
                  type='button'
                  data-state={draftSegmentOn ? 'on' : 'off'}
                  className='data-[state=on]:z-[1] data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:ring-primary-base'
                  onClick={() =>
                    setAppliedFilters((previous) => ({
                      ...previous,
                      published: false,
                      draft: true,
                    }))
                  }
                >
                  Draft
                </ButtonGroup.Item>
              </ButtonGroup.Root>
            ) : null}
          </div>

          {/* Right: filter + Add (super admin only) */}

          <div className='flex items-center gap-2'>
            <Popover.Root
              open={isFilterOpen}
              onOpenChange={(open) => {
                const wasOpen = isFilterOpen;
                if (wasOpen && !open) {
                  filterDropdownRef.current?.handleClose?.();
                }
                setIsFilterOpen(open);
              }}
            >
              <Filter.TriggerButton
                size='xsmall'
                filterCount={filterCount}
                onClear={handleClearFilters}
                tooltipContent='Filter release notes'
                ariaLabel='Filter release notes'
              />
              <ReleaseNoteFilterPopover
                ref={filterDropdownRef}
                open={isFilterOpen}
                appliedFilters={appliedFilters}
                onFiltersChange={setAppliedFilters}
                setFilterCount={setFilterCount}
                moduleOptions={moduleOptions}
              />
            </Popover.Root>

            {isSuperAdmin ? (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Button.Root
                    variant='primary'
                    mode='filled'
                    size='xsmall'
                    className='gap-2'
                    onClick={handleAddReleaseNote}
                    aria-label='Add release note'
                  >
                    <Button.Icon as={RiAddLine} />
                    Add Release
                  </Button.Root>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>Add a new release note</p>
                </Tooltip.Content>
              </Tooltip.Root>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            'flex min-h-0 w-full flex-1 gap-0 py-0',
            (isListLoading || listFailed) && 'min-h-[320px]',
          )}
        >
          <div
            ref={listScrollRef}
            className='flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pr-4 [scrollbar-gutter:stable]'
            role='region'
            aria-label='Release notes list'
          >
            {listBody}
          </div>

          <aside className='flex w-[min(22%,280px)] shrink-0 flex-col border-l border-stroke-soft-200 pl-4'>
            <div className='sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1'>
              <ReleaseNoteQuickLinks
                quickLinks={quickLinks}
                activeNoteId={activeNoteId}
                onNavigate={handleQuickLinkNavigate}
                isDisabled={isListLoading || listFailed}
              />
            </div>
          </aside>
        </div>
      </div>
    </PageLayout>
  );
};

export default ReleaseNotePage;
