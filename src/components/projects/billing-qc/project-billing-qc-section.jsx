import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiDownloadLine,
  RiFilter3Line,
  RiLayoutColumnLine,
  RiNotification3Line,
  RiSearch2Line,
  RiStackLine,
} from 'react-icons/ri';
import { getProjectBillingQcVendors } from '@/api/projectBillingQc';
import ProjectDetailBillingQcTable from '@/components/projects/billing-qc/project-detail-billing-qc-table';
import * as Button from '@/components/ui/button';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Input from '@/components/ui/input';
import { useColumnConfig } from '@/hooks/use-column-config';
import {
  PROJECT_DETAIL_BILLING_QC_COLUMNS,
  getStoredProjectDetailBillingQcColumnConfig,
  saveStoredProjectDetailBillingQcColumnConfig,
} from '@/components/projects/constants';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';

function formatBillingAmount(value) {
  const amount = Number(value) || 0;
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function mapBillingQcRow(row) {
  return {
    ...row,
    po_value: typeof row.po_value === 'number' ? formatBillingAmount(row.po_value) : row.po_value,
    gmr_value:
      typeof row.gmr_value === 'number' ? formatBillingAmount(row.gmr_value) : row.gmr_value,
  };
}

export default function ProjectBillingQcSection({ projectId }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    async function loadRows() {
      setIsLoading(true);
      try {
        const response = await getProjectBillingQcVendors(projectId);
        if (!cancelled) {
          setRows((response?.vendors ?? []).map(mapBillingQcRow));
        }
      } catch (error) {
        if (!cancelled) {
          showErrorToast(extractErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRows();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const columnConfig = useColumnConfig(
    'project-detail-billing-qc',
    PROJECT_DETAIL_BILLING_QC_COLUMNS,
    saveStoredProjectDetailBillingQcColumnConfig,
    getStoredProjectDetailBillingQcColumnConfig,
    { autoSave: true, debounce: 200, pinnedColumnId: 'vendor_name' },
  );

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      [
        row.vendor_name,
        ...(row.packages ?? []),
        row.status,
        row.certified_by?.name,
        row.submission_date,
        row.area,
        row.last_updated,
        row.po_value,
        row.gmr_value,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rows, searchQuery]);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='w-full max-w-[300px] min-w-[220px]'>
          <Input.Root size='xsmall'>
            <Input.Wrapper>
              <Input.Icon as={RiSearch2Line} />
              <Input.Input
                placeholder='Search here...'
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          <Button.Root variant='neutral' mode='stroke' size='xsmall' aria-label='Group view'>
            <Button.Icon as={RiStackLine} />
          </Button.Root>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='gap-1.5 px-1.5'
            aria-label='Notifications'
          >
            <Button.Icon as={RiNotification3Line} />
            <span className='inline-flex min-w-5 items-center justify-center rounded-full bg-bg-soft-200 px-1.5 text-label-xs text-text-sub-500'>
              16
            </span>
          </Button.Root>
          <Button.Root variant='neutral' mode='stroke' size='xsmall' aria-label='Filter'>
            <Button.Icon as={RiFilter3Line} />
          </Button.Root>
          <Button.Root variant='neutral' mode='stroke' size='xsmall' aria-label='Download'>
            <Button.Icon as={RiDownloadLine} />
          </Button.Root>
          <ColumnManagerDropdown
            open={isColumnManagerOpen}
            onOpenChange={setIsColumnManagerOpen}
            config={columnConfig}
            pinnedColumnId='vendor_name'
            tooltipContent={<p>Manage columns</p>}
            trigger={
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                aria-label='Manage columns'
              >
                <Button.Icon as={RiLayoutColumnLine} />
              </Button.Root>
            }
          />
        </div>
      </div>

      {isLoading ? (
        <div className='flex min-h-[200px] items-center justify-center text-paragraph-sm text-text-sub-500'>
          Loading billing & QC records...
        </div>
      ) : filteredRows.length > 0 ? (
        <ProjectDetailBillingQcTable
          rows={filteredRows}
          columnConfig={columnConfig.columns}
          onRowClick={(row) => {
            if (!projectId || !row?.id) return;
            navigate(
              `/procurements/project-procurements/${encodeURIComponent(projectId)}/billing-qc/${encodeURIComponent(row.id)}`,
            );
          }}
        />
      ) : (
        <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
          <p className='text-label-md text-text-strong-950'>No billing & QC records found</p>
          <p className='mt-1 text-paragraph-sm text-text-sub-500'>
            Adjust your search to find vendor submissions.
          </p>
        </div>
      )}
    </div>
  );
}
