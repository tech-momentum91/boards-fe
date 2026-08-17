import * as Badge from '@/components/ui/badge';
import * as CompactButton from '@/components/ui/compact-button';
import * as Table from '@/components/ui/table';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { CrmLifecycleStagePill } from '@/components/crm-tasks/crm-lifecycle-stage-pill';
import { formatDateWithOrdinal } from '@/utils/date-utils';
import { RiDeleteBinLine } from 'react-icons/ri';

import ProposalSpacesCell from '@/components/crm-proposals/proposal-spaces-cell';
import {
  getFrozenActionsColumnExtras,
  getFrozenLeftColumnExtras,
} from '@/lib/frozen-table-columns';
import {
  getProposalStatusBadge,
  getProposalValidityStatusBadge,
} from '@/components/crm-proposals/constants';

function formatProposalDateOrdinal(value) {
  if (!value || value === '-') return '—';
  return formatDateWithOrdinal(value) || '—';
}

function formatProposalAmount(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(String(value).replaceAll(/[^\d.-]/g, ''));
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString('en-IN');
}

function textCell(value) {
  const display = value && value !== '-' ? String(value).trim() : '';
  return (
    <span className='paragraph-small text-text-sub-600 truncate whitespace-nowrap'>
      {display || '—'}
    </span>
  );
}

function tagPillCell(value) {
  const display = value && value !== '-' ? String(value).trim() : '';
  return (
    <Badge.Root variant='stroke' color='gray' size='medium'>
      {display || '—'}
    </Badge.Root>
  );
}

function avatarNameCell(name) {
  const display = name && name !== '-' ? String(name).trim() : '';
  if (!display) {
    return <span className='paragraph-small text-text-sub-600'>—</span>;
  }
  return (
    <div className='flex min-w-0 items-center gap-2'>
      <CrmAccountAvatar name={display} size={24} className='shrink-0' />
      <span className='paragraph-small text-text-sub-600 truncate whitespace-nowrap'>
        {display}
      </span>
    </div>
  );
}

function ownerCell(name) {
  const display = name && name !== '-' ? String(name).trim() : '';
  if (!display) {
    return <span className='paragraph-small text-text-sub-600'>—</span>;
  }
  return (
    <div className='flex min-w-0 items-center gap-2'>
      <CrmAccountAvatar name={display} variant='salesOwner' size={24} className='shrink-0' />
      <span className='shrink-0 whitespace-nowrap paragraph-small text-text-sub-600'>
        {display}
      </span>
    </div>
  );
}

function statusCell(status) {
  const statusBadge = getProposalStatusBadge(status);
  return (
    <Badge.Root size='small' variant='light' color={statusBadge.color}>
      {statusBadge.label}
    </Badge.Root>
  );
}

function validityStatusCell(status) {
  const statusBadge = getProposalValidityStatusBadge(status);
  return (
    <Badge.Root size='small' variant='light' color={statusBadge.color}>
      <span className='text-subheading-2xs font-medium uppercase tracking-wide'>
        {statusBadge.label}
      </span>
    </Badge.Root>
  );
}

function buildActionsColumn({ freezeColumns, onDeleteProposal }) {
  return {
    id: 'actions',
    accessorKey: 'actions',
    ...getFrozenActionsColumnExtras(freezeColumns),
    header: () => <div className='invisible'>A</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className='flex items-center justify-end' onClick={(e) => e.stopPropagation()}>
        <CompactButton.Root
          type='button'
          variant='error'
          onClick={() => onDeleteProposal?.(row.original)}
          aria-label='Delete proposal'
        >
          <CompactButton.Icon as={RiDeleteBinLine} />
        </CompactButton.Root>
      </div>
    ),
  };
}

export function buildLeadDetailProposalColumns({ freezeColumns, hideColumns }) {
  const proposalLeftExtras = getFrozenLeftColumnExtras(freezeColumns);
  const defs = [
    {
      id: 'proposal',
      accessorKey: 'proposal_title',
      ...proposalLeftExtras,
      header: () => <Table.SortableHeader label='Proposal Name' />,
      enableSorting: false,
      meta: {
        ...proposalLeftExtras.meta,
        headClassName: [proposalLeftExtras.meta?.headClassName, 'overflow-hidden']
          .filter(Boolean)
          .join(' '),
        cellClassName: 'overflow-hidden',
      },
      cell: ({ row }) => (
        <div
          className='min-w-0 max-w-full truncate label-small font-medium text-text-strong-950'
          title={row.original.proposal_title || 'Untitled proposal'}
        >
          {row.original.proposal_title || 'Untitled proposal'}
        </div>
      ),
    },
    {
      id: 'suggested_inventory',
      accessorKey: 'spaces',
      header: ({ column }) => (
        <Table.SortableHeader column={column} label='Space proposed' sortable />
      ),
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original.spaces || []).join(', ');
        const b = (rowB.original.spaces || []).join(', ');
        return a.localeCompare(b);
      },
      meta: { cellClassName: 'max-w-[400px] overflow-hidden' },
      cell: ({ row }) => (
        <ProposalSpacesCell spaces={row.original.spaces} maxVisible={2} badgeVariant='stroke' />
      ),
    },
    {
      id: 'proposal_amount',
      accessorKey: 'proposal_amount',
      header: ({ column }) => (
        <Table.SortableHeader column={column} label='Proposal Amount (₹)' sortable />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
          {formatProposalAmount(row.original.proposal_amount)}
        </span>
      ),
    },
    {
      id: 'proposal_date',
      accessorKey: 'proposal_date',
      header: ({ column }) => (
        <Table.SortableHeader column={column} label='Proposal Date' sortable />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
          {formatProposalDateOrdinal(row.original.proposal_date)}
        </span>
      ),
    },
    {
      id: 'valid_till',
      accessorKey: 'valid_till',
      header: ({ column }) => <Table.SortableHeader column={column} label='Valid Till' sortable />,
      enableSorting: true,
      cell: ({ row }) => (
        <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
          {formatProposalDateOrdinal(row.original.valid_till)}
        </span>
      ),
    },
    {
      id: 'validity_status',
      accessorKey: 'validity_status',
      header: ({ column }) => <Table.SortableHeader column={column} label='Status' sortable />,
      enableSorting: true,
      cell: ({ row }) => validityStatusCell(row.original.validity_status),
    },
  ];

  return defs.filter((col) => !hideColumns.includes(col.id));
}

export function buildGlobalProposalColumns({ freezeColumns, hideColumns, onDeleteProposal }) {
  const proposalLeftExtras = getFrozenLeftColumnExtras(freezeColumns);
  const defs = [
    {
      id: 'proposal',
      accessorKey: 'proposal_title',
      ...proposalLeftExtras,
      header: ({ column }) => <Table.SortableHeader column={column} label='Name' sortable />,
      enableSorting: true,
      meta: {
        ...proposalLeftExtras.meta,
        headClassName: [proposalLeftExtras.meta?.headClassName, 'overflow-hidden']
          .filter(Boolean)
          .join(' '),
        cellClassName: 'overflow-hidden',
      },
      cell: ({ row }) => (
        <div
          className='min-w-0 max-w-full truncate label-small font-medium text-text-strong-950'
          title={row.original.proposal_title || 'Untitled proposal'}
        >
          {row.original.proposal_title || 'Untitled proposal'}
        </div>
      ),
    },
    {
      id: 'lead_name',
      accessorKey: 'lead_name',
      header: ({ column }) => <Table.SortableHeader column={column} label='Lead' sortable />,
      enableSorting: true,
      cell: ({ row }) => textCell(row.original.lead_display_name || row.original.lead_name),
    },
    {
      id: 'contact_name',
      accessorKey: 'contact_name',
      header: ({ column }) => <Table.SortableHeader column={column} label='Contact' sortable />,
      enableSorting: true,
      cell: ({ row }) => avatarNameCell(row.original.contact_name),
    },
    {
      id: 'account_name',
      accessorKey: 'account_name',
      header: ({ column }) => <Table.SortableHeader column={column} label='Account' sortable />,
      enableSorting: true,
      cell: ({ row }) => textCell(row.original.account_name),
    },
    {
      id: 'pipeline_label',
      accessorKey: 'pipeline_label',
      header: ({ column }) => <Table.SortableHeader column={column} label='Pipeline' sortable />,
      enableSorting: true,
      cell: ({ row }) => textCell(row.original.pipeline_label || row.original.pipeline),
    },
    {
      id: 'lifecycle_stage_label',
      accessorKey: 'lifecycle_stage_label',
      header: ({ column }) => (
        <Table.SortableHeader column={column} label='Life Cycle Stage' sortable />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <CrmLifecycleStagePill
          value={row.original.lifecycle_stage_label || row.original.lifecycle_stage}
          stageColor={row.original.lifecycle_stage_color}
        />
      ),
    },
    {
      id: 'life_cycle_stage_status_label',
      accessorKey: 'life_cycle_stage_status_label',
      header: ({ column }) => (
        <Table.SortableHeader column={column} label='Life Cycle Stage Status' sortable />
      ),
      enableSorting: true,
      cell: ({ row }) =>
        tagPillCell(
          row.original.life_cycle_stage_status_label || row.original.life_cycle_stage_status,
        ),
    },
    {
      id: 'sales_owner_name',
      accessorKey: 'sales_owner_name',
      header: ({ column }) => <Table.SortableHeader column={column} label='Sales Owner' sortable />,
      enableSorting: true,
      cell: ({ row }) => ownerCell(row.original.sales_owner_name),
    },
    {
      id: 'proposal_amount',
      accessorKey: 'proposal_amount',
      header: ({ column }) => (
        <Table.SortableHeader column={column} label='Proposal Amount (₹)' sortable />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
          {formatProposalAmount(row.original.proposal_amount)}
        </span>
      ),
    },
    {
      id: 'proposal_date',
      accessorKey: 'proposal_date',
      header: ({ column }) => (
        <Table.SortableHeader column={column} label='Proposal Date' sortable />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
          {formatProposalDateOrdinal(row.original.proposal_date)}
        </span>
      ),
    },
    {
      id: 'valid_till',
      accessorKey: 'valid_till',
      header: ({ column }) => <Table.SortableHeader column={column} label='Valid Till' sortable />,
      enableSorting: true,
      cell: ({ row }) => (
        <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
          {formatProposalDateOrdinal(row.original.valid_till)}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <Table.SortableHeader column={column} label='Status' sortable />,
      enableSorting: true,
      cell: ({ row }) => statusCell(row.original.status),
    },
    buildActionsColumn({ freezeColumns, onDeleteProposal }),
  ];

  return defs.filter((col) => !hideColumns.includes(col.id));
}
