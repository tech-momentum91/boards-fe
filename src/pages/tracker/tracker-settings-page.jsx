import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RiSearchLine, RiAddLine, RiDeleteBinLine } from 'react-icons/ri';
import * as CompactButton from '@/components/ui/compact-button';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Table from '@/components/ui/table';
import * as Select from '@/components/ui/select';
import * as Badge from '@/components/ui/badge';
import apiClient from '@/api';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import TrackerSettingsModal from '@/components/tracker/tracker-settings-modal';
import { getSettingsTrackerListThunk } from '@/redux/settingsTrackerSlice';
import { useDebounce } from '@/hooks/use-debounce';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const VIEW_TYPE_OPTIONS = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Annually', label: 'Annually' },
];

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active', color: 'green' },
  { value: 'Inactive', label: 'Inactive', color: 'gray' },
];

const PAGE_SIZE = 20;

const extractCenterIds = (centersPayload) => {
  if (!Array.isArray(centersPayload)) return [];

  // API shape: [{ center: "CTR-01", disabled: 0 }]
  if (centersPayload.every((item) => item && typeof item === 'object' && 'center' in item)) {
    return centersPayload.map((row) => row.center).filter(Boolean);
  }

  // Alternate shape: [{ center_id, center_name }]
  if (centersPayload.every((item) => item && typeof item === 'object' && 'center_id' in item)) {
    return centersPayload.map((center) => center.center_id).filter(Boolean);
  }

  // Legacy API shape fallback: [{ zone_name: [centerIds...] }]
  return centersPayload.flatMap((zoneItem) => {
    if (!zoneItem || typeof zoneItem !== 'object') return [];
    const ids = Object.values(zoneItem)[0];
    return Array.isArray(ids) ? ids : [];
  });
};

const mapTrackerToRow = (item, index = 0) => ({
  id: item?.name || item?.tracker_id || item?.id || `tracker-${index}`,
  name: item?.tracker_name || item?.name || '',
  centerIds: extractCenterIds(item?.centers),
  viewType: item?.view_type || 'Daily',
  tasks: item?.total_tasks ?? item?.tasks ?? 0,
  status: item?.status || 'Active',
  _raw: item,
});

/**
 * Body for PUT `/resource/Tracker Master/{name}` — matches Tracker Master doc fields.
 */
const buildTrackerUpdatePayload = (row, allCenters = []) => {
  const normalizedCenters = Array.isArray(allCenters) ? allCenters : [];
  const selectedIds = Array.isArray(row?.centerIds) ? row.centerIds.filter(Boolean) : [];

  const applyToAllCenters =
    normalizedCenters.length > 0 && selectedIds.length === normalizedCenters.length ? 1 : 0;

  const centers = selectedIds.map((centerId) => ({ center: centerId, disabled: 0 }));

  return {
    apply_to_all_centers: applyToAllCenters,
    centers,
    view_type: row?.viewType || 'Daily',
    status: row?.status || 'Active',
  };
};

const TrackerSettingsPage = () => {
  const dispatch = useDispatch();
  const centerAccess = useSelector(selectCenterAccess);
  const trackerListState = useSelector((state) => state.settingsTracker.getSettingsTrackerList);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [rows, setRows] = useState([]);
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const [savingRowId, setSavingRowId] = useState(null);
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [centerAccess.status, dispatch]);

  useEffect(() => {
    dispatch(
      getSettingsTrackerListThunk({
        keyword: debouncedSearch.trim(),
        page: 1,
        limit_page_length: PAGE_SIZE,
      }),
    );
  }, [dispatch, debouncedSearch]);

  useEffect(() => {
    const mapped = (trackerListState.data || []).map((item, index) => mapTrackerToRow(item, index));
    setRows(mapped);
  }, [trackerListState.data]);

  const handleLoadMore = useCallback(() => {
    if (!trackerListState.hasMore || trackerListState.isLoadingMore || trackerListState.isLoading) {
      return;
    }
    dispatch(
      getSettingsTrackerListThunk({
        keyword: debouncedSearch.trim(),
        page: (trackerListState.page || 1) + 1,
        limit_page_length: trackerListState.pageSize || PAGE_SIZE,
        append: true,
      }),
    );
  }, [dispatch, trackerListState, debouncedSearch]);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: handleLoadMore,
    hasMore: trackerListState.hasMore,
    isLoading: trackerListState.isLoading || trackerListState.isLoadingMore,
    threshold: 200,
    enabled: true,
  });

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleAddRow = () => {
    setIsTrackerModalOpen(true);
  };

  const handleDeleteRow = async (id) => {
    // console.log('id tracker delete', id);
  };

  const updateRow = (id, changes) => {
    setRows((previous) => previous.map((row) => (row.id === id ? { ...row, ...changes } : row)));
  };

  const refreshTrackerList = useCallback(
    () =>
      dispatch(
        getSettingsTrackerListThunk({
          keyword: debouncedSearch.trim(),
          page: 1,
          limit_page_length: PAGE_SIZE,
        }),
      ),
    [dispatch, debouncedSearch],
  );

  const saveTrackerRow = useCallback(
    async (nextRow, successMessage) => {
      const trackerDocName = nextRow?.id;
      if (!trackerDocName) {
        showErrorToast('Missing tracker identifier');
        return false;
      }

      const payload = buildTrackerUpdatePayload(nextRow, centerAccess.data);
      const path = `/resource/Tracker Master/${encodeURIComponent(String(trackerDocName))}`;

      setSavingRowId(nextRow.id);
      try {
        await apiClient.put(path, payload);
        await refreshTrackerList();
        showSuccessToast(successMessage);
        return true;
      } catch (error) {
        showErrorToast(error);
        return false;
      } finally {
        setSavingRowId(null);
      }
    },
    [centerAccess.data, refreshTrackerList],
  );

  const handleCentersChange = useCallback(
    async (row, nextSelected) => {
      // Check if centers actually changed before calling API
      const currentIds = (row.centerIds || []).sort().join(',');
      const nextIds = (nextSelected || []).sort().join(',');
      if (currentIds === nextIds) {
        return;
      }

      const previousCenterIds = row.centerIds;
      const nextRow = { ...row, centerIds: nextSelected };

      updateRow(row.id, { centerIds: nextSelected });
      const didSave = await saveTrackerRow(nextRow, 'Tracker centers updated successfully.');
      if (!didSave) {
        updateRow(row.id, { centerIds: previousCenterIds });
      }
    },
    [saveTrackerRow],
  );

  const handleStatusChange = useCallback(
    async (row, value) => {
      // Check if status actually changed before calling API
      if (row.status === value) {
        return;
      }

      const previousStatus = row.status;
      const nextRow = { ...row, status: value };

      updateRow(row.id, { status: value });
      const didSave = await saveTrackerRow(nextRow, 'Tracker status updated successfully.');
      if (!didSave) {
        updateRow(row.id, { status: previousStatus });
      }
    },
    [saveTrackerRow],
  );

  const filteredRows = useMemo(() => rows, [rows]);

  const getStatusColor = (status) => {
    const match = STATUS_OPTIONS.find(
      (option) => option.value.toLowerCase() === String(status).toLowerCase(),
    );
    return match?.color || 'gray';
  };

  return (
    <div className='w-full flex flex-col gap-6'>
      {/* Toolbar */}
      <div className='flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <Input.Root size='xsmall' className='w-full sm:w-[372px]'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine />
            </Input.Icon>
            <Input.Input placeholder='Search' value={searchTerm} onChange={handleSearchChange} />
          </Input.Wrapper>
        </Input.Root>

        <div className='flex items-center justify-end gap-3'>
          <Button.Root size='xsmall' className='gap-1' onClick={handleAddRow}>
            <Button.Icon as={RiAddLine} size={12} />
            Add
          </Button.Root>
        </div>
      </div>

      {/* Trackers Table */}
      <div className='w-full'>
        <Table.Root variant='compact'>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head>Center</Table.Head>
              <Table.Head>View Type</Table.Head>
              <Table.Head>Tasks</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head className='w-[56px] text-right' />
            </Table.Row>
          </Table.Header>

          <Table.Body spacing={8}>
            {filteredRows.map((row, index, array) => (
              // eslint-disable-next-line react/no-array-index-key
              <React.Fragment key={row.id}>
                <Table.Row>
                  {/* Name */}
                  <Table.Cell className='flex items-center justify-start'>
                    <button
                      type='button'
                      className='w-full text-left label-small text-text-strong-950 truncate hover:text-primary-base'
                      onClick={() => navigate(`/settings/tracker-settings/create-task/${row.id}`)}
                    >
                      {row.name || 'Untitled tracker'}
                    </button>
                  </Table.Cell>

                  {/* Center - zone-wise centers from All Centers */}
                  <Table.Cell className='min-w-[260px]'>
                    <CenterAccessDropdown
                      centers={centerAccess.data}
                      selectedCenters={row.centerIds}
                      onChange={(nextSelected) => handleCentersChange(row, nextSelected)}
                      isLoading={centerAccess.status === 'loading'}
                      buttonMode='ghost'
                      renderSelectedSummary={({ selectedCenters, normalizedCenters }) => {
                        const selected = normalizedCenters.filter((center) =>
                          selectedCenters.includes(center.id),
                        );

                        if (selected.length === 0) {
                          return (
                            <span className='truncate text-label-sm text-text-soft-400'>
                              Select centers
                            </span>
                          );
                        }

                        const visible = selected.slice(0, 2);
                        const extraCount = selected.length - visible.length;

                        const getCode = (center) =>
                          center.center_code || getCityCodeFromCenter(center);

                        function getCityCodeFromCenter(center) {
                          if (center.city) return center.city.slice(0, 3).toUpperCase();
                          return '';
                        }

                        return (
                          <div className='flex items-center gap-1 overflow-hidden'>
                            {visible.map((center) => (
                              <Badge.Root
                                key={center.id}
                                variant='stroke'
                                color='gray'
                                size='medium'
                                className='bg-bg-white-0 ring-stroke-soft-200 text-text-sub-600 whitespace-nowrap normal-case'
                              >
                                {center.label}{' '}
                                {getCode(center) && (
                                  <span className='text-text-soft-400'>({getCode(center)})</span>
                                )}
                              </Badge.Root>
                            ))}
                            {extraCount > 0 && (
                              <Badge.Root
                                variant='stroke'
                                color='gray'
                                size='small'
                                className='bg-bg-white-0 ring-stroke-soft-200 text-text-sub-600 whitespace-nowrap'
                              >
                                +{extraCount}
                              </Badge.Root>
                            )}
                          </div>
                        );
                      }}
                    />
                  </Table.Cell>

                  {/* View Type - read only */}
                  <Table.Cell className='min-w-[140px]'>
                    <span className='paragraph-small text-[var(--color-text-sub-500)]'>
                      {row.viewType}
                    </span>
                  </Table.Cell>

                  {/* Tasks - read only */}
                  <Table.Cell className='min-w-[80px]'>
                    <span className='paragraph-small text-[var(--color-text-sub-500)]'>
                      {row.tasks}
                    </span>
                  </Table.Cell>

                  {/* Status */}
                  <Table.Cell className='min-w-[140px]'>
                    <Select.Root
                      variant='borderless'
                      size='xsmall'
                      value={row.status}
                      onValueChange={(value) => {
                        handleStatusChange(row, value);
                      }}
                      disabled={savingRowId === row.id}
                    >
                      <Select.Trigger className='w-full' showArrow={false}>
                        <Select.Value>
                          <Badge.Root
                            variant='light'
                            color={getStatusColor(row.status)}
                            className='text-nowrap'
                          >
                            {row.status}
                          </Badge.Root>
                        </Select.Value>
                      </Select.Trigger>
                      <Select.Content>
                        {STATUS_OPTIONS.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            <Badge.Root
                              variant='light'
                              color={option.color}
                              className='text-nowrap'
                            >
                              {option.label}
                            </Badge.Root>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Table.Cell>

                  {/* Actions */}
                  <Table.Cell className='w-[56px] text-right'>
                    {/* Delete button commented out for now */}
                    {/* <CompactButton.Root
                      type='button'
                      variant='neutral'
                      mode='ghost'
                      size='small'
                      aria-label='Delete tracker'
                      onClick={() => handleDeleteRow(row.id)}
                    >
                      <CompactButton.Icon as={RiDeleteBinLine} />
                    </CompactButton.Root> */}
                  </Table.Cell>
                </Table.Row>

                {index < array.length - 1 && <Table.RowDivider />}
              </React.Fragment>
            ))}

            <Table.Row ref={sentinelRef} data-scroll-sentinel>
              <Table.Cell colSpan={6} className='h-1 p-0' />
            </Table.Row>
            {trackerListState.isLoadingMore && (
              <Table.Row>
                <Table.Cell
                  colSpan={6}
                  className='py-3 text-center text-paragraph-sm text-text-sub-600'
                >
                  Loading more trackers...
                </Table.Cell>
              </Table.Row>
            )}
            {filteredRows.length === 0 && !trackerListState.isLoading && (
              <Table.Row>
                <Table.Cell colSpan={6}>
                  <div className='py-8 text-center text-paragraph-sm text-text-sub-600'>
                    No trackers found. Click &quot;Add&quot; to create one.
                  </div>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </div>

      <TrackerSettingsModal open={isTrackerModalOpen} onOpenChange={setIsTrackerModalOpen} />
    </div>
  );
};

export default TrackerSettingsPage;
