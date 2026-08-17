import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { buildProposalBuilderPath } from '@/components/ui/proposal-builder/deck/constants';
import { getSuggestedInventory } from '@/api/crmSuggestedInventory';
import CrmLeadCreateProposalDrawer from '@/components/crm-leads/crm-lead-suggested-inventory/crm-lead-create-proposal-drawer';
import CrmLeadSuggestedInventoryTable from '@/components/crm-leads/crm-lead-suggested-inventory/crm-lead-suggested-inventory-table';
import CrmLeadSuggestedInventoryToolbar from '@/components/crm-leads/crm-lead-suggested-inventory/crm-lead-suggested-inventory-toolbar';
import {
  downloadCsv,
  exportInventoryCsv,
  filterInventoryRows,
  normalizeInventoryRow,
} from '@/components/crm-leads/crm-lead-suggested-inventory/utils';
import { showErrorToast } from '@/utils/error-utils';

const CrmLeadSuggestedInventoryTab = ({ lead, onInventoryCountChange }) => {
  const navigate = useNavigate();
  const leadId = lead?.name;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [manualRows, setManualRows] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const tableRef = useRef(null);

  const onCountChangeRef = useRef(onInventoryCountChange);
  onCountChangeRef.current = onInventoryCountChange;
  const loadIdRef = useRef(0);

  const fetchInventory = useCallback(async () => {
    if (!leadId) return;
    const loadId = ++loadIdRef.current;
    setLoading(true);
    try {
      const { items } = await getSuggestedInventory(leadId);
      if (loadId !== loadIdRef.current) return;
      const normalized = (items || []).map((item) => normalizeInventoryRow(item, item.space_id));
      setRows(normalized);
      onCountChangeRef.current?.(normalized.length);
    } catch (error) {
      if (loadId !== loadIdRef.current) return;
      showErrorToast(error?.message || 'Failed to load suggested inventory');
      setRows([]);
      onCountChangeRef.current?.(0);
    } finally {
      if (loadId === loadIdRef.current) setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchInventory();
    return () => {
      loadIdRef.current += 1;
    };
  }, [fetchInventory]);

  const displayRows = useMemo(() => filterInventoryRows(rows, search), [rows, search]);

  const allRowsById = useMemo(() => {
    const map = new Map();
    [...rows, ...manualRows].forEach((r) => {
      if (r.id) map.set(r.id, r);
    });
    return map;
  }, [rows, manualRows]);

  const selectedRows = useMemo(
    () => selectedIds.map((id) => allRowsById.get(id)).filter(Boolean),
    [selectedIds, allRowsById],
  );

  const handleAddManualRow = () => {
    const manualId = `manual-${crypto.randomUUID()}`;
    setManualRows((prev) => [
      ...prev,
      {
        id: manualId,
        _manualId: manualId,
        _isManual: true,
        _manualCenter: '',
        _manualInventoryType: '',
      },
    ]);
  };

  const handleManualRowChange = (manualId, patch) => {
    setManualRows((prev) =>
      prev.map((r) => {
        if (r._manualId !== manualId) return r;
        const next = { ...r, ...patch };
        if (patch.space_id) {
          return { ...next, id: patch.space_id };
        }
        return next;
      }),
    );
  };

  const handleRemoveRow = (row) => {
    if (row._isManual) {
      setManualRows((prev) => prev.filter((r) => r._manualId !== row._manualId));
    } else {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      onInventoryCountChange?.(Math.max(0, rows.length - 1));
    }
    setSelectedIds((prev) => prev.filter((id) => id !== row.id));
  };

  const handleDownload = () => {
    const visibleIds = tableRef.current?.columnConfigHook?.visibleColumns?.map((c) => c.id) || [];
    const exportRows = [...displayRows, ...manualRows.filter((m) => m.space_id)];
    const csv = exportInventoryCsv(exportRows, visibleIds);
    downloadCsv(csv, `suggested-inventory-${leadId}.csv`);
  };

  if (loading) {
    return (
      <div className='flex flex-1 items-center justify-center bg-bg-white-0'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary-base border-t-transparent' />
      </div>
    );
  }

  const isSearchEmpty =
    rows.length > 0 &&
    displayRows.length === 0 &&
    manualRows.length === 0 &&
    search.trim().length > 0;

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-white-0 px-6 py-5'>
      <CrmLeadSuggestedInventoryToolbar
        searchValue={search}
        onSearchChange={setSearch}
        onDownload={handleDownload}
        tableRef={tableRef}
        selectedCount={selectedIds.length}
        onCreateProposal={() => setDrawerOpen(true)}
      />

      <div className='mt-4 flex min-h-0 flex-1 flex-col'>
        {isSearchEmpty ? (
          <p className='mb-3 text-paragraph-sm text-text-sub-500'>
            No spaces match your search. Try a different term or clear the search.
          </p>
        ) : null}
        <CrmLeadSuggestedInventoryTable
          ref={tableRef}
          leadId={leadId}
          rows={displayRows}
          manualRows={manualRows}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRemoveRow={handleRemoveRow}
          onAddManualRow={handleAddManualRow}
          onManualRowChange={handleManualRowChange}
        />
      </div>

      <CrmLeadCreateProposalDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        lead={lead}
        selectedRows={selectedRows}
        onRemoveInventoryRow={(id) => setSelectedIds((prev) => prev.filter((x) => x !== id))}
        onCreated={(result) => {
          setSelectedIds([]);
          fetchInventory();
          const proposalName = result?.name;
          if (proposalName) {
            navigate(buildProposalBuilderPath(proposalName, { leadId: leadId || undefined }));
          }
        }}
      />
    </div>
  );
};

export default CrmLeadSuggestedInventoryTab;
