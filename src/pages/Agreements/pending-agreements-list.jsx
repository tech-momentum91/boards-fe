import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AgreementsPendingToolbar from '@/components/agreements/agreements-pending-toolbar';
import AgreementsPendingTable from '@/components/agreements/agreements-pending-table';
import { RiAddLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { getAgreementPendingSpaceAllocationListThunk } from '@/redux/agreementsSlice';
import { formatToDDMMYYYY } from '@/utils/date-utils';

/**
 * Pre-index `{ value, label }[]` once → O(1) lookups per pending row (not O(options) × rows).
 * Keeps same behavior as prior: exact label, trim+case-insensitive label, match by value string.
 */
function buildOptionLookup(options) {
  const byValue = new Map();
  const byLabelExact = new Map();
  const byLabelNorm = new Map();
  for (const o of options || []) {
    if (!o) continue;
    const v = String(o.value ?? '').trim();
    const lab = String(o.label ?? '').trim();
    if (v) byValue.set(v, o);
    if (lab) {
      byLabelExact.set(lab, o);
      const nl = lab.toLowerCase();
      if (!byLabelNorm.has(nl)) byLabelNorm.set(nl, o);
    }
  }

  return { byValue, byLabelExact, byLabelNorm };
}

function resolvePendingClientValue(row, lookup) {
  const { byValue, byLabelExact, byLabelNorm } = lookup;
  const fromApi = row.customer_id ?? row.client ?? row.client_id;
  if (fromApi != null && String(fromApi).trim() !== '') {
    const v = String(fromApi).trim();
    if (byValue.has(v)) return v;
  }
  const name = String(row.client_name ?? '').trim();
  if (!name) return '';
  return (
    byLabelExact.get(name)?.value ??
    byLabelNorm.get(name.toLowerCase())?.value ??
    byValue.get(name)?.value ??
    name
  );
}

function resolvePendingCenterValue(row, lookup) {
  const { byValue, byLabelExact, byLabelNorm } = lookup;
  const fromApi = row.center ?? row.center_id;
  if (fromApi != null && String(fromApi).trim() !== '') {
    const v = String(fromApi).trim();
    if (byValue.has(v)) return v;
  }
  const name = String(row.center_name ?? '').trim();
  if (!name) return '';
  return (
    byLabelExact.get(name)?.value ??
    byLabelNorm.get(name.toLowerCase())?.value ??
    byValue.get(name)?.value ??
    name
  );
}

function buildPendingSpaceDetailsById(spaces) {
  return Object.fromEntries(
    (spaces || [])
      .map((s) => {
        const id = s.assign_space_id;
        if (!id) return null;
        const startRaw = s.start_date || s.agreement_start_date || s.lease_start_date || '';
        const endRaw =
          s.end_date || s.agreement_end_date || s.lease_end_date || s.contract_end_date || '';
        const o = {};
        if (endRaw) o.agreement_end_date = formatToDDMMYYYY(endRaw);
        if (startRaw) o.rent_start_date = formatToDDMMYYYY(startRaw);
        if (Object.keys(o).length === 0) return null;
        return [String(id), o];
      })
      .filter(Boolean),
  );
}

function pendingSpaceButtonFlags(assignedSpaces, isExist) {
  const spaces = Array.isArray(assignedSpaces) ? assignedSpaces : [];
  const hasLockedSpace = spaces.some((s) => String(s.status || '') === 'Locked');
  const hasUpdatedSpace = spaces.some((s) => String(s.status || '').toLowerCase() === 'updated');
  const isUpdatedOnly = Boolean(isExist) && hasUpdatedSpace && !hasLockedSpace;
  const assignSpaceStatusById = Object.fromEntries(
    spaces.filter((s) => s.assign_space_id).map((s) => [String(s.assign_space_id), s.status]),
  );
  return { isUpdatedOnly, assignSpaceStatusById };
}

function filterRowsByAppliedFilters(rows, appliedFilters, clientLookup, centerLookup) {
  let out = rows;
  const clients = appliedFilters?.client ?? [];
  const centers = appliedFilters?.center ?? [];
  if (clients.length > 0) {
    const labels = clients
      .map((v) => clientLookup.byValue.get(String(v).trim())?.label)
      .filter(Boolean);
    if (labels.length > 0) {
      out = out.filter((r) =>
        labels.some((label) =>
          (r.client || '').toLowerCase().includes(String(label).toLowerCase()),
        ),
      );
    }
  }
  if (centers.length > 0) {
    const labels = centers
      .map((v) => centerLookup.byValue.get(String(v).trim())?.label || v)
      .filter(Boolean);
    if (labels.length > 0) {
      out = out.filter((r) =>
        labels.some((label) =>
          (r.center || '').toLowerCase().includes(String(label).toLowerCase()),
        ),
      );
    }
  }
  return out;
}

/**
 * Pending agreements (mock data). Toolbar: search, group by, filter, columns — no create.
 */
const PendingAgreementsList = ({
  slotBeforeToolbar,
  filters,
  onSearchChange,
  appliedFilters,
  onFiltersChange,
  clientOptions,
  centerOptions,
  membershipPlanOptions,
  statusOptions,
  onCreateAgreement,
  onCreateAmendment,
}) => {
  const dispatch = useDispatch();
  const pending = useSelector((state) => state.agreements?.pendingSpaceAllocations);
  const tableRef = useRef(null);
  const [groupBy, setGroupBy] = useState('none');
  const pageSize = 20;

  const hasPendingActiveFilters = useMemo(
    () =>
      (appliedFilters?.client?.length || 0) +
        (appliedFilters?.center?.length || 0) +
        (appliedFilters?.membershipPlan?.length || 0) +
        (appliedFilters?.type?.length || 0) +
        (appliedFilters?.status?.length || 0) >
      0,
    [appliedFilters],
  );

  const emptyStateContext = useMemo(
    () => ((filters?.search || '').trim() || hasPendingActiveFilters ? 'search' : 'default'),
    [filters?.search, hasPendingActiveFilters],
  );

  useEffect(() => {
    const keyword = (filters?.search || '').trim();
    const delay = keyword ? 400 : 0;
    const id = window.setTimeout(() => {
      dispatch(
        getAgreementPendingSpaceAllocationListThunk({
          keyword,
          page: 1,
          page_size: pageSize,
        }),
      );
    }, delay);
    return () => window.clearTimeout(id);
  }, [dispatch, filters?.search]);

  const page = Number(pending?.data?.page ?? 1);
  const totalPages = Number(pending?.data?.total_pages ?? 0);
  const hasMore = totalPages > 0 && page < totalPages;

  const handleLoadMore = useCallback(() => {
    if (!hasMore || pending?.isLoading) return;
    dispatch(
      getAgreementPendingSpaceAllocationListThunk({
        keyword: (filters?.search || '').trim(),
        page: page + 1,
        page_size: pageSize,
        append: true,
      }),
    );
  }, [dispatch, filters?.search, hasMore, page, pageSize, pending?.isLoading]);

  const clientLookup = useMemo(() => buildOptionLookup(clientOptions), [clientOptions]);
  const centerLookup = useMemo(() => buildOptionLookup(centerOptions), [centerOptions]);

  const baseRows = useMemo(() => {
    const results = pending?.data?.results || [];
    const mapped = results.map((r, idx) => {
      const spaces = Array.isArray(r.assigned_spaces) ? r.assigned_spaces : [];
      const first = spaces[0] || {};
      const primarySpaceLabel = first.space_name || '--';
      const extraSpaceCount = Math.max(spaces.length - 1, 0);
      const extraSpaceNames = spaces
        .slice(1)
        .map((s) => s?.space_name)
        .filter(Boolean);
      const membershipPlans = [...new Set(spaces.map((s) => s?.space_type).filter(Boolean))];
      const statuses = [...new Set(spaces.map((s) => s?.status).filter(Boolean))];
      const clientId = resolvePendingClientValue(
        {
          client_name: r.client_name,
          customer_id: r.customer_id ?? first.customer_id,
          client: r.client,
        },
        clientLookup,
      );
      const centerId = resolvePendingCenterValue(
        {
          center_name: r.center_name ?? first.center_name,
          center: r.center ?? first.center,
          center_id: r.center_id ?? first.center_id,
        },
        centerLookup,
      );
      const spaceIds = spaces.map((s) => s.assign_space_id).filter(Boolean);
      const { isUpdatedOnly, assignSpaceStatusById } = pendingSpaceButtonFlags(spaces, r.isExist);
      const spaceDetailsById = buildPendingSpaceDetailsById(spaces);
      const amendmentHandler =
        r.parent_agreement_id && typeof onCreateAmendment === 'function'
          ? () =>
              onCreateAmendment({
                name: r.parent_agreement_id,
                ...(isUpdatedOnly ? { customerSpacesStatus: 'Updated' } : {}),
                assignSpaceStatusById,
                ...(Object.keys(spaceDetailsById).length > 0 ? { spaceDetailsById } : {}),
              })
          : undefined;
      return {
        id: `${r.client_name || 'client'}-${r.center_name || 'center'}-${idx}`,
        name: r.parent_agreement_id || '',
        client: r.client_name || '--',
        center: r.center_name || '--',
        primarySpaceLabel,
        extraSpaceCount,
        extraSpaceNames,
        membership_plan: membershipPlans.length > 0 ? membershipPlans : first.space_type || '--',
        status: statuses.length > 0 ? statuses : r.status || first.status || '--',
        assignedSeats: first.assigned_seats ?? r.assigned_seats ?? '--',
        objective: first.lease_duration || first.status || 'Pending',
        primaryActionLabel: r.isExist ? (
          <>
            <RiAddLine className='text-primary-base' /> Amendment
          </>
        ) : (
          <>
            <RiAddLine className='text-primary-base' /> Agreement
          </>
        ),
        actionVariant: 'split',
        onCreateAgreement:
          isUpdatedOnly && amendmentHandler
            ? amendmentHandler
            : typeof onCreateAgreement === 'function'
              ? () => {
                  const start =
                    first.start_date || first.agreement_start_date || first.lease_start_date || '';
                  const end =
                    first.end_date ||
                    first.agreement_end_date ||
                    first.lease_end_date ||
                    first.contract_end_date ||
                    '';
                  const spaceDetailsById = buildPendingSpaceDetailsById(spaces);
                  onCreateAgreement({
                    client: clientId || '',
                    center: centerId || '',
                    space: spaceIds,
                    /* Agreement start is chosen on the form; do not prefill from allocation. */
                    agreement_start_date: '',
                    agreement_end_date: end,
                    rent_start_date: start,
                    ...(Object.keys(spaceDetailsById).length > 0 ? { spaceDetailsById } : {}),
                  });
                }
              : undefined,
        onCreateAmendment: isUpdatedOnly ? undefined : amendmentHandler,
      };
    });
    return filterRowsByAppliedFilters(mapped, appliedFilters, clientLookup, centerLookup);
  }, [
    appliedFilters,
    clientLookup,
    centerLookup,
    onCreateAgreement,
    onCreateAmendment,
    pending?.data?.results,
  ]);

  return (
    <div className='flex-1 min-h-0 flex flex-col gap-5 w-full h-full'>
      <AgreementsPendingToolbar
        slotBeforeToolbar={slotBeforeToolbar}
        filters={filters}
        onSearchChange={onSearchChange}
        onFiltersChange={onFiltersChange}
        appliedFilters={appliedFilters}
        clientOptions={clientOptions}
        centerOptions={centerOptions}
        membershipPlanOptions={membershipPlanOptions}
        statusOptions={statusOptions}
        tableRef={tableRef}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />
      <AgreementsPendingTable
        ref={tableRef}
        rows={baseRows}
        groupBy={groupBy}
        enableScrollPagination
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        isLoading={pending?.isLoading}
        isLoadingMore={pending?.isLoading && baseRows.length > 0}
        emptyStateContext={emptyStateContext}
        error={pending?.error}
        onRetry={() =>
          dispatch(
            getAgreementPendingSpaceAllocationListThunk({
              keyword: (filters?.search || '').trim(),
              page: 1,
              page_size: pageSize,
            }),
          )
        }
      />
    </div>
  );
};

export default PendingAgreementsList;
