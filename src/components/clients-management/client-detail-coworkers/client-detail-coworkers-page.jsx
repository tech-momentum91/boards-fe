import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { RiSearchLine, RiAddLine, RiAlertFill, RiLayoutColumnLine } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Select from '@/components/ui/select';
import * as Modal from '@/components/ui/modal';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { useDebounce } from '@/hooks/use-debounce';
import {
  ACCESS_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from '@/components/clients-management/client-detail-coworkers/constant';
import ClientDetailCoworkersTable from '@/components/clients-management/client-detail-coworkers/client-detail-coworkers-table';
import ClientDetailAddCoworkersModel from './client-detail-add-coworkers-model';
import { getClientCenterOptions, enrichCenterOptionsWithLabels } from '@/api/client-centers';
import {
  extractClientDepartmentNames,
  toDepartmentSelectOptions,
} from '@/utils/coworker-departments';
import { extractClientAssignedCenterOptions, mergeCenterOptions } from '@/utils/coworker-centers';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  createCoworkerThunk,
  deleteCoworkerThunk,
  getCoworkerListThunk,
  openAddCoworkerModal,
  openEditCoworkerModal,
  openViewCoworkerModal,
  selectCoworkerListState,
  selectCoworkerMutationState,
  updateCoworkerThunk,
} from '@/redux/coworkerSlice';
import { getClientDetailThunk, selectClientDetail } from '@/redux/clientDetailSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { hasModulePermission } from '@/utils/user-role-utils';

const size = 'xsmall';
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_ORDER_BY = 'modified desc';

const toDateValue = (value) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const splitName = (fullName = '') => {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const toBooleanInt = (value) => (value ? 1 : 0);

const normalizeCoworkerToFormValues = (coworker = {}) => {
  const split = splitName(
    [coworker.first_name, coworker.last_name].filter(Boolean).join(' ') || coworker.name || '',
  );
  return {
    firstName: coworker.first_name || coworker.firstName || split.firstName,
    lastName: coworker.last_name || coworker.lastName || split.lastName,
    fullName:
      [coworker.first_name, coworker.last_name].filter(Boolean).join(' ') || coworker.name || '',
    email: coworker.email || '',
    phone: coworker.phone_number || coworker.phone || '',
    dateOfBirth: toDateValue(coworker.date_of_birth || coworker.DOB),
    employeeId: coworker.employee_id || coworker.employeeId || '',
    gender: coworker.gender || '',
    department: coworker.department || '',
    designation: coworker.designation || '',
    reportingManager: coworker.reporting_manager || coworker.reportingManager || '',
    workMode: coworker.work_mode || coworker.workMode || '',
    assignedCenter: coworker.assigned_center || coworker.center || '',
    status: coworker.status || 'Active',
    accessType: coworker.access_type || coworker.access || 'User',
    allowBooking: Boolean(coworker.allow_booking ?? coworker.allowBooking),
    allowVisitorInvites: Boolean(coworker.allow_visitor_invites ?? coworker.allowVisitorInvites),
    allowTicketCreation: Boolean(coworker.allow_ticket_management ?? coworker.allowTicketCreation),
  };
};

const formatDateOfBirth = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : '';

/** Full coworker payload — same field set for create and update APIs. */
const buildCoworkerApiPayload = (values, clientDetail) => ({
  first_name: values.firstName,
  last_name: values.lastName,
  email: values.email,
  phone_number: values.phone,
  date_of_birth: formatDateOfBirth(values.dateOfBirth),
  employee_id: values.employeeId || '',
  gender: values.gender,
  client_ref: clientDetail?.data?.name,
  department: values.department,
  reporting_manager: values.reportingManager || '',
  designation: values.designation || '',
  work_mode: values.workMode,
  assigned_center: values.assignedCenter,
  access_type: values.accessType,
  status: values.status || 'Active',
  allow_booking: toBooleanInt(values.allowBooking),
  allow_visitor_invites: toBooleanInt(values.allowVisitorInvites),
  allow_ticket_management: toBooleanInt(values.allowTicketCreation),
});

const buildCreatePayload = (values, clientDetail) => buildCoworkerApiPayload(values, clientDetail);

const buildUpdatePayload = (values, clientDetail) => buildCoworkerApiPayload(values, clientDetail);

const ClientDetailCoworkersPage = () => {
  const { id: routeClientId = '' } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [assignedCenterOptions, setAssignedCenterOptions] = useState([]);
  const [isLoadingAssignedCenters, setIsLoadingAssignedCenters] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const centersFetchKeyRef = useRef('');
  const enrichedCenterIdsRef = useRef(new Set());
  const coworkersTableRef = useRef(null);

  const dispatch = useDispatch();
  const clientDetail = useSelector(selectClientDetail);
  const coworkerList = useSelector(selectCoworkerListState);
  const coworkerMutations = useSelector(selectCoworkerMutationState);
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canWriteCustomer = useMemo(
    () => hasModulePermission(userSideBarPerm, 'Customer', 'write'),
    [userSideBarPerm],
  );

  const clientId = useMemo(() => {
    const detail = clientDetail?.data || {};
    return String(detail?.name || routeClientId || '').trim();
  }, [clientDetail?.data, routeClientId]);

  const clientRef = useMemo(() => {
    const detail = clientDetail?.data || {};
    return (
      detail?.customer_name ||
      detail?.custom_display_name ||
      detail?.name ||
      String(routeClientId || '').trim()
    );
  }, [clientDetail?.data, routeClientId]);

  const handleAddCoworker = useCallback(() => {
    dispatch(openAddCoworkerModal());
  }, [dispatch]);

  const handleEditCoworker = useCallback(
    (coworker) => {
      dispatch(
        openEditCoworkerModal({
          coworkerId: coworker.name,
          record: coworker,
          formValues: normalizeCoworkerToFormValues(coworker),
        }),
      );
    },
    [dispatch],
  );

  const handleViewCoworker = useCallback(
    (coworker) => {
      dispatch(
        openViewCoworkerModal({
          coworkerId: coworker.name,
          record: coworker,
          formValues: normalizeCoworkerToFormValues(coworker),
        }),
      );
    },
    [dispatch],
  );

  const debouncedSearch = useDebounce(searchTerm, 500);

  const coworkerFilters = useMemo(() => {
    const filters = [];
    if (departmentFilter !== 'all') filters.push(['department', '=', departmentFilter]);
    if (statusFilter !== 'all') filters.push(['status', '=', statusFilter]);
    if (accessFilter !== 'all') filters.push(['access_type', '=', accessFilter]);
    return filters;
  }, [accessFilter, departmentFilter, statusFilter]);

  const fetchCoworkers = useCallback(
    (targetPage, append = false) =>
      dispatch(
        getCoworkerListThunk({
          keyword: debouncedSearch.trim(),
          filters: coworkerFilters,
          page: targetPage,
          limitPageLength: DEFAULT_PAGE_SIZE,
          orderBy: DEFAULT_ORDER_BY,
          append,
          client_id: clientId,
        }),
      ),
    [clientId, coworkerFilters, debouncedSearch, dispatch],
  );

  useEffect(() => {
    if (!clientId) return;
    dispatch(getClientDetailThunk(clientId));
  }, [clientId, dispatch]);

  useEffect(() => {
    if (!clientId) return;
    setPage(1);
    fetchCoworkers(1, false);
  }, [clientId, coworkerFilters, debouncedSearch, fetchCoworkers]);

  useEffect(() => {
    if (!clientId) {
      setAssignedCenterOptions([]);
      setIsLoadingAssignedCenters(false);
      centersFetchKeyRef.current = '';
      return;
    }

    if (!clientDetail?.data) {
      setIsLoadingAssignedCenters(true);
      return;
    }

    const fromDetail = extractClientAssignedCenterOptions(clientDetail.data);
    const fetchKey = `${clientId}:${fromDetail.map((opt) => opt.value).join(',')}`;
    if (centersFetchKeyRef.current === fetchKey) return;
    centersFetchKeyRef.current = fetchKey;

    let cancelled = false;
    setIsLoadingAssignedCenters(true);

    getClientCenterOptions(clientId, fromDetail)
      .then((centers) => {
        if (cancelled) return;
        setAssignedCenterOptions(centers);
      })
      .catch(() => {
        if (cancelled) return;
        setAssignedCenterOptions(fromDetail);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAssignedCenters(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, clientDetail?.data]);

  useEffect(() => {
    const rowCenterIds = [
      ...new Set(
        (coworkerList?.rows || [])
          .map((row) => String(row.assigned_center ?? '').trim())
          .filter(Boolean),
      ),
    ];
    if (rowCenterIds.length === 0) return undefined;

    const extras = rowCenterIds
      .filter((id) => !assignedCenterOptions.some((opt) => opt.value === id))
      .map((id) => ({ value: id, label: id }));
    const needsLabelEnrichment = assignedCenterOptions.some(
      (opt) =>
        opt.value &&
        (!opt.label || opt.label === opt.value) &&
        !enrichedCenterIdsRef.current.has(opt.value),
    );
    if (extras.length === 0 && !needsLabelEnrichment) return undefined;

    const merged = mergeCenterOptions(assignedCenterOptions, extras);
    for (const opt of merged) {
      if (opt.value) enrichedCenterIdsRef.current.add(opt.value);
    }

    let cancelled = false;
    enrichCenterOptionsWithLabels(merged).then((enriched) => {
      if (cancelled) return;
      setAssignedCenterOptions(enriched);
    });

    return () => {
      cancelled = true;
    };
  }, [assignedCenterOptions, coworkerList?.rows]);

  useEffect(() => {
    if (!coworkerList?.error) return;
    showErrorToast(coworkerList.error, { defaultMessage: 'Failed to load co-workers.' });
  }, [coworkerList?.error]);

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  }, []);

  const handleDeleteCoworker = useCallback((coworker) => {
    setDeleteTarget(coworker);
  }, []);

  const refetchCoworkers = useCallback(
    (targetPage = page, append = false) => fetchCoworkers(targetPage, append),
    [fetchCoworkers, page],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget?.name) return;
    try {
      await dispatch(deleteCoworkerThunk({ coworkerId: deleteTarget.name })).unwrap();
      showSuccessToast('Co-worker deleted successfully.');
      setPage(1);
      await refetchCoworkers(1, false);
      setDeleteTarget(null);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to delete co-worker.' });
    }
  }, [deleteTarget, dispatch, coworkerList?.rows?.length, page, refetchCoworkers]);

  const handleModalSubmit = useCallback(
    async (values, modalState) => {
      if (!clientRef) {
        showErrorToast('Client reference not found. Please refresh and try again.');
        return false;
      }
      const mode = modalState?.mode || 'create';
      const payloadId = modalState?.coworker?.coworkerId;

      if (mode === 'edit' && payloadId) {
        const payload = buildUpdatePayload(values, clientDetail);
        try {
          await dispatch(updateCoworkerThunk({ coworkerId: payloadId, payload })).unwrap();
          showSuccessToast('Co-worker updated successfully.');
          await refetchCoworkers();
          return true;
        } catch (error) {
          showErrorToast(error, { defaultMessage: 'Failed to update co-worker.' });
          return false;
        }
      }

      try {
        const payload = buildCreatePayload(values, clientDetail);
        await dispatch(createCoworkerThunk(payload)).unwrap();
        showSuccessToast('Co-worker added successfully.');
        setPage(1);
        await refetchCoworkers(1, false);
        if (clientId) {
          await dispatch(getClientDetailThunk(clientId)).unwrap();
        }
        return true;
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to add co-worker.' });
        return false;
      }
    },
    [clientId, clientDetail, dispatch, refetchCoworkers],
  );

  const rows = coworkerList?.rows || [];
  const isLoading = Boolean(coworkerList?.isLoading);
  const isLoadingMore = Boolean(coworkerList?.isLoadingMore);
  const isInitialLoading = !coworkerList?.initialized || (isLoading && !coworkerList?.initialized);
  const totalPages = Math.max(1, Number(coworkerList?.totalPages || 1));
  const hasMore = page < totalPages;

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCoworkers(nextPage, true);
  }, [fetchCoworkers, hasMore, isLoading, isLoadingMore, page]);

  const departmentOptions = useMemo(() => {
    const fromClient = extractClientDepartmentNames(clientDetail?.data);
    return toDepartmentSelectOptions(fromClient, { includeAll: true });
  }, [clientDetail?.data]);

  const accessOptions = useMemo(() => {
    const dynamicValues = Object.keys(coworkerList?.accessTypeCounts || {});
    const fallback = ACCESS_FILTER_OPTIONS.filter((opt) => opt.value !== 'all').map(
      (opt) => opt.value,
    );
    const merged = [...new Set([...dynamicValues, ...fallback])];
    return [
      { value: 'all', label: 'All Access' },
      ...merged.map((item) => ({ value: item, label: item })),
    ];
  }, [coworkerList?.accessTypeCounts]);

  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6 py-5'>
        <div className='flex flex-col gap-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <Input.Root size={size} className='min-w-[276px]'>
                <Input.Wrapper>
                  <Input.Icon>
                    <RiSearchLine />
                  </Input.Icon>
                  <Input.Input
                    placeholder='Search by name, email, phone, center…'
                    value={searchTerm}
                    onChange={handleSearchChange}
                    aria-label='Search coworkers'
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            <div className='flex items-center gap-3 flex-wrap justify-end'>
              <Select.Root
                value={departmentFilter}
                onValueChange={(value) => {
                  setDepartmentFilter(value);
                  setPage(1);
                }}
                size={size}
              >
                <Select.Trigger className='w-[160px]'>
                  <Select.Value placeholder='All Departments' />
                </Select.Trigger>
                <Select.Content>
                  {departmentOptions.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              <Select.Root
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                size={size}
              >
                <Select.Trigger className='w-[140px]'>
                  <Select.Value placeholder='All Status' />
                </Select.Trigger>
                <Select.Content>
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              <Select.Root
                value={accessFilter}
                onValueChange={(value) => {
                  setAccessFilter(value);
                  setPage(1);
                }}
                size={size}
              >
                <Select.Trigger className='w-[140px]'>
                  <Select.Value placeholder='All Access' />
                </Select.Trigger>
                <Select.Content>
                  {accessOptions.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              <ColumnManagerDropdown
                open={isColumnManagerOpen}
                onOpenChange={setIsColumnManagerOpen}
                config={coworkersTableRef?.current?.columnConfigHook}
                tooltipContent={<p>Column Manager</p>}
                trigger={
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size={size}
                    className='gap-1'
                  >
                    <Button.Icon>
                      <RiLayoutColumnLine size={18} />
                    </Button.Icon>
                  </Button.Root>
                }
              />

              {canWriteCustomer ? (
                <Button.Root
                  variant='primary'
                  mode='filled'
                  size={size}
                  onClick={handleAddCoworker}
                  className='gap-1'
                >
                  <Button.Icon as={RiAddLine} />
                  Add CoWorker
                </Button.Root>
              ) : null}
            </div>
          </div>

          <ClientDetailCoworkersTable
            ref={coworkersTableRef}
            rows={rows}
            variant='compact'
            isLoading={isInitialLoading}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            enableScrollPagination
            onLoadMore={handleLoadMore}
            onEditCoworker={handleEditCoworker}
            onDeleteCoworker={handleDeleteCoworker}
            onViewCoworker={handleViewCoworker}
            assignedCenterOptions={assignedCenterOptions}
          />
          <ClientDetailAddCoworkersModel
            onSubmit={handleModalSubmit}
            departmentOptions={departmentOptions.filter((opt) => opt.value !== 'all')}
            assignedCenterOptions={assignedCenterOptions}
            isLoadingAssignedCenters={isLoadingAssignedCenters}
            clientId={clientId}
          />

          <Modal.Root
            open={Boolean(deleteTarget)}
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null);
            }}
          >
            <Modal.Content className='max-w-[450px]'>
              <Modal.Header
                icon={
                  <span className='p-2 bg-warning-base/10 items-center rounded-lg'>
                    <RiAlertFill size={24} className='text-warning-base' />
                  </span>
                }
                title='Remove coworker?'
                variant='default'
                description={`Are you sure you want to remove this coworker?`}
              />
              <Modal.Footer>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='medium'
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </Button.Root>
                <Button.Root
                  variant='primary'
                  mode='filled'
                  size='medium'
                  disabled={coworkerMutations?.isDeleting}
                  onClick={handleConfirmDelete}
                >
                  {coworkerMutations?.isDeleting ? 'Deleting…' : 'Confirm'}
                </Button.Root>
              </Modal.Footer>
            </Modal.Content>
          </Modal.Root>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailCoworkersPage;
