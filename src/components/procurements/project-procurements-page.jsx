import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  fetchProjectProcurementsFilterOptions,
  fetchProjectProcurementsList,
} from '@/api/projectProcurements';
import {
  buildProjectProcurementCityFilterOptions,
  buildProjectProcurementListOrderBy,
  PROJECT_PROCUREMENTS_LIST_DEFAULT_SORTING,
} from '@/components/procurements/constants';
import { useProjectProcurementsColumnConfig } from '@/components/procurements/project-procurements-column-config';
import ProjectProcurementsStatCards from '@/components/procurements/project-procurements-stat-cards';
import ProjectProcurementsTable from '@/components/procurements/project-procurements-table';
import ProjectProcurementsToolbar from '@/components/procurements/project-procurements-toolbar';
import { fetchProjectStageOptionsPage } from '@/components/projects/project-stage-status-helpers';
import { showErrorToast } from '@/utils/error-utils';

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE = 20;
const STAGE_PAGE_SIZE = 20;
const ALL_STAGES_OPTION = { value: 'all', label: 'All Stages' };

function mergeStageOptions(previous, nextPage) {
  const seen = new Set(previous.map((opt) => String(opt.value)));
  const merged = [...previous];
  for (const opt of nextPage) {
    const key = String(opt.value);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(opt);
  }
  return merged;
}

export default function ProjectProcurementsPage({ fiscalYearStart }) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [stageOptions, setStageOptions] = useState([]);
  const [stageSearch, setStageSearch] = useState('');
  const [debouncedStageSearch, setDebouncedStageSearch] = useState('');
  const [stageHasMore, setStageHasMore] = useState(false);
  const [stageIsLoadingMore, setStageIsLoadingMore] = useState(false);
  const [cityFilter, setCityFilter] = useState('all');
  const [sorting, setSorting] = useState(PROJECT_PROCUREMENTS_LIST_DEFAULT_SORTING);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cityFilterOptions, setCityFilterOptions] = useState(() =>
    buildProjectProcurementCityFilterOptions(),
  );

  const columnConfig = useProjectProcurementsColumnConfig();
  const fetchRequestIdRef = useRef(0);
  const stageFetchRequestIdRef = useRef(0);
  const stageOptionsRef = useRef([]);
  stageOptionsRef.current = stageOptions;

  const stageFilterOptions = useMemo(() => [ALL_STAGES_OPTION, ...stageOptions], [stageOptions]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchValue]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedStageSearch(stageSearch.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [stageSearch]);

  useEffect(() => {
    let cancelled = false;

    fetchProjectProcurementsFilterOptions()
      .then((options) => {
        if (cancelled) return;
        setCityFilterOptions(buildProjectProcurementCityFilterOptions(options?.cities));
      })
      .catch(() => {
        if (!cancelled) {
          setCityFilterOptions(buildProjectProcurementCityFilterOptions());
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadStageOptions = useCallback(
    async ({ append = false } = {}) => {
      const requestId = stageFetchRequestIdRef.current + 1;
      stageFetchRequestIdRef.current = requestId;

      if (append) {
        setStageIsLoadingMore(true);
      }

      try {
        const limitStart = append ? stageOptionsRef.current.length : 0;
        const result = await fetchProjectStageOptionsPage({
          limitStart,
          limitPageLength: STAGE_PAGE_SIZE,
          search: debouncedStageSearch,
        });

        if (requestId !== stageFetchRequestIdRef.current) return;

        setStageOptions((previous) =>
          append ? mergeStageOptions(previous, result.options) : result.options,
        );
        setStageHasMore(Boolean(result.hasMore));
      } catch {
        if (requestId !== stageFetchRequestIdRef.current) return;
        if (!append) {
          setStageOptions([]);
          setStageHasMore(false);
        }
      } finally {
        if (requestId === stageFetchRequestIdRef.current) {
          setStageIsLoadingMore(false);
        }
      }
    },
    [debouncedStageSearch],
  );

  useEffect(() => {
    loadStageOptions({ append: false });
  }, [debouncedStageSearch]); // eslint-disable-line react-hooks/exhaustive-deps -- reset on search only

  const handleStageLoadMore = useCallback(() => {
    if (stageIsLoadingMore || !stageHasMore) return;
    loadStageOptions({ append: true });
  }, [loadStageOptions, stageHasMore, stageIsLoadingMore]);

  const handleStageSearchQueryChange = useCallback((query) => {
    setStageSearch(query);
  }, []);

  const apiFilters = useMemo(
    () => ({
      project_stage: stageFilter,
      city: cityFilter,
    }),
    [cityFilter, stageFilter],
  );

  const loadRows = useCallback(
    async ({ nextPage = 1, append = false } = {}) => {
      const requestId = fetchRequestIdRef.current + 1;
      fetchRequestIdRef.current = requestId;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const result = await fetchProjectProcurementsList({
          keyword: debouncedSearch,
          filters: apiFilters,
          fiscalYearStart,
          page: nextPage,
          pageSize: PAGE_SIZE,
          orderBy: buildProjectProcurementListOrderBy(sorting),
        });

        if (requestId !== fetchRequestIdRef.current) return;

        const nextRows = result.rows || [];
        setRows((previous) => (append ? [...previous, ...nextRows] : nextRows));
        setPage(result.page || nextPage);
        setHasMore(Boolean(result.hasMore));
      } catch (error) {
        if (requestId !== fetchRequestIdRef.current) return;
        if (!append) setRows([]);
        showErrorToast(error, { defaultMessage: 'Failed to load project procurements.' });
      } finally {
        if (requestId === fetchRequestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [apiFilters, debouncedSearch, fiscalYearStart, sorting],
  );

  useEffect(() => {
    loadRows({ nextPage: 1, append: false });
  }, [loadRows]);

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    loadRows({ nextPage: page + 1, append: true });
  }, [hasMore, isLoading, isLoadingMore, loadRows, page]);

  const handleRowClick = useCallback(
    (row) => {
      const projectId = row?.id || row?.project || row?.name;
      if (!projectId) return;
      navigate(`/procurements/project-procurements/${encodeURIComponent(projectId)}`);
    },
    [navigate],
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-5 px-8 pb-8 pt-5'>
      <ProjectProcurementsStatCards fiscalYearStart={fiscalYearStart} filters={apiFilters} />

      <ProjectProcurementsToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        stageFilter={stageFilter}
        onStageFilterChange={setStageFilter}
        stageFilterOptions={stageFilterOptions}
        onStageSearchQueryChange={handleStageSearchQueryChange}
        onStageLoadMore={handleStageLoadMore}
        stageHasMore={stageHasMore}
        stageIsLoadingMore={stageIsLoadingMore}
        cityFilter={cityFilter}
        onCityFilterChange={setCityFilter}
        cityFilterOptions={cityFilterOptions}
        columnConfig={columnConfig}
      />

      <div className='flex min-h-0 flex-1 flex-col'>
        <ProjectProcurementsTable
          rows={rows}
          columnConfig={columnConfig.columns}
          sorting={sorting}
          onSortingChange={setSorting}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          enableScrollPagination
        />
      </div>
    </div>
  );
}
