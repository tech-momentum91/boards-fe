import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import CrmProposalsTable from '@/components/crm-proposals/crm-proposals-table';
import CrmProposalsToolbar from '@/components/crm-proposals/crm-proposals-toolbar';
import { exportLeadProposalsCsv } from '@/components/crm-proposals/crm-proposals-export-utils';
import { REACT_TABLE_ID_LEAD_PROPOSALS } from '@/components/crm-proposals/constants';
import { buildProposalBuilderPath } from '@/components/ui/proposal-builder/deck/constants';
import { listCrmProposals, normalizeCrmProposalListRow } from '@/api/crmProposals';
import { downloadCsv } from '@/components/crm-leads/crm-lead-suggested-inventory/utils';
import { useDebounce } from '@/hooks/use-debounce';
import {
  getCrmProposalsColumnPreferences,
  saveCrmProposalsColumnPreferences,
} from '@/redux/settingSlice';
import { extractErrorMessage } from '@/utils/error-utils';

const CrmLeadProposalsTab = ({ lead }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const tableRef = useRef(null);
  const leadId = lead?.name;

  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchProposals = useCallback(async () => {
    if (!leadId) {
      setRows([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const list = await listCrmProposals({ crm_lead: leadId, limit: 50 });
      setRows((list ?? []).map(normalizeCrmProposalListRow));
    } catch (error_) {
      setRows([]);
      setError(extractErrorMessage(error_, 'Could not load proposals for this lead.'));
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const filteredRows = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return rows;
    const q = debouncedSearchTerm.toLowerCase();
    return rows.filter((row) => (row.proposal_title || '').toLowerCase().includes(q));
  }, [rows, debouncedSearchTerm]);

  const persistColumnConfig = useCallback(
    async (cols) => {
      await dispatch(
        saveCrmProposalsColumnPreferences({
          columns: cols,
          react_table_id: REACT_TABLE_ID_LEAD_PROPOSALS,
        }),
      ).unwrap();
    },
    [dispatch],
  );

  const fetchColumnConfig = useCallback(async () => {
    const result = await dispatch(
      getCrmProposalsColumnPreferences({ react_table_id: REACT_TABLE_ID_LEAD_PROPOSALS }),
    ).unwrap();
    return result?.message ?? result?.data ?? result ?? [];
  }, [dispatch]);

  const handleOpen = useCallback(
    (row) => {
      if (!row?.id) return;
      navigate(buildProposalBuilderPath(row.id, { leadId }));
    },
    [navigate, leadId],
  );

  const handleDownload = useCallback(() => {
    if (filteredRows.length === 0) return;
    const visibleIds =
      tableRef.current?.columnConfigHook?.visibleColumns?.map((col) => col.id) || [];
    const csv = exportLeadProposalsCsv(filteredRows, visibleIds);
    downloadCsv(csv, `lead-proposals-${leadId || 'export'}.csv`);
  }, [filteredRows, leadId]);

  return (
    <div className='flex flex-1 flex-col overflow-hidden bg-white min-w-0'>
      <div className='flex flex-col gap-4 overflow-y-auto p-6'>
        <CrmProposalsToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          tableRef={tableRef}
          onDownload={handleDownload}
        />

        <div className='w-full overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
          <CrmProposalsTable
            ref={tableRef}
            rows={filteredRows}
            isLoading={isLoading}
            error={error}
            onRetry={fetchProposals}
            onOpenProposal={handleOpen}
            variant='compact'
            persistColumnConfig={persistColumnConfig}
            fetchColumnConfig={fetchColumnConfig}
            columnConfigId={REACT_TABLE_ID_LEAD_PROPOSALS}
            emptyVariant='lead'
            tableVariant='lead'
          />
        </div>
      </div>
    </div>
  );
};

export default CrmLeadProposalsTab;
