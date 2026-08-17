import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiFileList2Line } from 'react-icons/ri';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import PageLayout from '@/components/page-layout';
import CrmProposalsTable from '@/components/crm-proposals/crm-proposals-table';
import CrmProposalsToolbar from '@/components/crm-proposals/crm-proposals-toolbar';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import {
  REACT_TABLE_ID_PROPOSALS,
  DEFAULT_GLOBAL_PROPOSAL_FILTERS,
  GLOBAL_PROPOSAL_FILTER_ALL,
} from '@/components/crm-proposals/constants';
import { buildProposalBuilderPath } from '@/components/ui/proposal-builder/deck/constants';
import {
  deleteCrmProposal,
  listCrmProposals,
  normalizeCrmProposalListRow,
} from '@/api/crmProposals';
import { getCrmLeadOptions } from '@/api/crmLeads';
import { useDebounce } from '@/hooks/use-debounce';
import {
  getCrmProposalsColumnPreferences,
  saveCrmProposalsColumnPreferences,
} from '@/redux/settingSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

const CrmProposals = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const tableRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_GLOBAL_PROPOSAL_FILTERS);
  const [filterOptions, setFilterOptions] = useState({ pipelines: [], stages: [] });
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProposals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await listCrmProposals({ limit: 100 });
      setRows((list ?? []).map(normalizeCrmProposalListRow));
    } catch (error_) {
      setRows([]);
      setError(extractErrorMessage(error_, 'Could not load proposals.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  useEffect(() => {
    getCrmLeadOptions()
      .then((options) => {
        setFilterOptions({
          pipelines: options?.pipelines ?? [],
          stages: options?.stages ?? [],
        });
      })
      .catch(() => {
        setFilterOptions({ pipelines: [], stages: [] });
      });
  }, []);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (appliedFilters.pipeline !== GLOBAL_PROPOSAL_FILTER_ALL) {
      result = result.filter((row) => row.pipeline === appliedFilters.pipeline);
    }
    if (appliedFilters.lifecycle_stage !== GLOBAL_PROPOSAL_FILTER_ALL) {
      result = result.filter((row) => row.lifecycle_stage === appliedFilters.lifecycle_stage);
    }
    if (appliedFilters.status !== GLOBAL_PROPOSAL_FILTER_ALL) {
      const status = appliedFilters.status.toLowerCase();
      result = result.filter((row) => String(row.status || '').toLowerCase() === status);
    }

    if (!debouncedSearchTerm.trim()) return result;
    const q = debouncedSearchTerm.toLowerCase();
    return result.filter((row) => {
      const spaceHaystack = (row.spaces || []).join(' ').toLowerCase();
      return (
        (row.proposal_title || '').toLowerCase().includes(q) ||
        (row.lead_name || '').toLowerCase().includes(q) ||
        (row.lead_display_name || '').toLowerCase().includes(q) ||
        (row.contact_name || '').toLowerCase().includes(q) ||
        (row.account_name || '').toLowerCase().includes(q) ||
        (row.pipeline_label || '').toLowerCase().includes(q) ||
        (row.lifecycle_stage_label || '').toLowerCase().includes(q) ||
        (row.life_cycle_stage_status_label || '').toLowerCase().includes(q) ||
        (row.sales_owner_name || '').toLowerCase().includes(q) ||
        (row.proposal_template || '').toLowerCase().includes(q) ||
        (row.status || '').toLowerCase().includes(q) ||
        (row.account || '').toLowerCase().includes(q) ||
        (row.format_label || '').toLowerCase().includes(q) ||
        (row.color_theme || '').toLowerCase().includes(q) ||
        spaceHaystack.includes(q) ||
        String(row.lead_req_seats ?? '').includes(q) ||
        String(row.proposal_amount ?? '').includes(q)
      );
    });
  }, [rows, debouncedSearchTerm, appliedFilters]);

  const persistColumnConfig = useCallback(
    async (cols) => {
      await dispatch(
        saveCrmProposalsColumnPreferences({
          columns: cols,
          react_table_id: REACT_TABLE_ID_PROPOSALS,
        }),
      ).unwrap();
    },
    [dispatch],
  );

  const fetchColumnConfig = useCallback(async () => {
    const result = await dispatch(
      getCrmProposalsColumnPreferences({ react_table_id: REACT_TABLE_ID_PROPOSALS }),
    ).unwrap();
    return result?.message ?? result?.data ?? result ?? [];
  }, [dispatch]);

  const handleOpen = useCallback(
    (row) => {
      if (!row?.id) return;
      navigate(buildProposalBuilderPath(row.id));
    },
    [navigate],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!proposalToDelete?.id) return;
    const deletedId = proposalToDelete.id;
    setIsDeleting(true);
    try {
      await deleteCrmProposal(deletedId);
      setRows((prev) => prev.filter((row) => row.id !== deletedId));
      showSuccessToast('Proposal deleted.');
      setProposalToDelete(null);
    } catch (error_) {
      showErrorToast(extractErrorMessage(error_, 'Could not delete proposal.'));
    } finally {
      setIsDeleting(false);
    }
  }, [proposalToDelete]);

  const handleCreate = useCallback(() => {
    navigate('/crm/leads');
  }, [navigate]);

  return (
    <PageLayout
      pageTitle='Proposals'
      pageIcon={<RiFileList2Line />}
      showDefaultHeader
      contentAreaClassName='overflow-y-auto'
    >
      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6'>
        <CrmProposalsToolbar
          variant='global'
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          appliedFilters={appliedFilters}
          onFiltersChange={setAppliedFilters}
          filterOptions={filterOptions}
          onCreate={handleCreate}
        />

        <div className='flex-1 min-h-0 overflow-hidden'>
          <CrmProposalsTable
            ref={tableRef}
            rows={filteredRows}
            isLoading={isLoading}
            error={error}
            onRetry={fetchProposals}
            onOpenProposal={handleOpen}
            onDeleteProposal={setProposalToDelete}
            tableVariant='global'
            persistColumnConfig={persistColumnConfig}
            fetchColumnConfig={fetchColumnConfig}
            columnConfigId={REACT_TABLE_ID_PROPOSALS}
          />
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(proposalToDelete)}
        onOpenChange={(open) => !open && setProposalToDelete(null)}
        title='Delete proposal?'
        description={`Are you sure you want to delete "${proposalToDelete?.proposal_title || 'this proposal'}"? This action cannot be undone.`}
        item={proposalToDelete}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </PageLayout>
  );
};

export default CrmProposals;
