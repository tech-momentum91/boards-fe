import React, { useState, useMemo, useCallback } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiSendPlaneFill, RiLink, RiFileCopyLine, RiExternalLinkLine } from 'react-icons/ri';
import * as Table from '@/components/ui/table';
import * as LinkButton from '@/components/ui/link-button';
import * as CompactButton from '@/components/ui/compact-button';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import * as Avatar from '@/components/ui/avatar';
import { getSortingIcon } from '@/components/ui/table';
import { formatDateWithOrdinal } from '@/utils/date-utils';
import { getInitials } from '@/lib/utils';
import * as Badge from '@/components/ui/badge';

const EMPTY_VALUE = '-';

const LocationTable = ({
  locationSurveys,
  onRowClick,
  scoreColumnLabel = 'CSI Score',
  showRowActions = true,
}) => {
  const [localSorting, setLocalSorting] = useState([]);

  const handleSortingChange = useCallback(
    (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
      setLocalSorting(newSorting);
    },
    [localSorting],
  );

  // Define columns
  const columns = useMemo(() => {
    return [
      {
        id: 'month',
        accessorKey: 'month',
        header: () => (
          <div className='flex items-center gap-0.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Month</span>
          </div>
        ),
        cell: ({ row }) => {
          const survey = row.original;
          const month = survey.month_year;
          const display = month && String(month).trim() ? month : EMPTY_VALUE;
          return (
            <span className='text-paragraph-sm font-medium text-text-main-900'>{display}</span>
          );
        },
        enableSorting: false,
      },
      {
        id: 'csi_score',
        accessorKey: 'csi_score',
        header: ({ column }) => {
          const sortState = column.getIsSorted();
          return (
            <div className='flex items-center gap-1.5'>
              <span className='text-paragraph-sm text-text-sub-600'>{scoreColumnLabel}</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(sortState === 'asc')}
                aria-label={`Sort by ${scoreColumnLabel} ${sortState === 'asc' ? 'descending' : 'ascending'}`}
              >
                {getSortingIcon(sortState)}
              </button>
            </div>
          );
        },
        cell: ({ row }) => {
          const survey = row.original;
          const score =
            survey.avg_score ?? survey.csi_score ?? survey.score ?? survey.custom_csi_score;
          const numericScore = Number(score);
          const hasScore =
            score !== null &&
            score !== undefined &&
            score !== '' &&
            Number.isFinite(numericScore) &&
            numericScore > 0;
          const display = hasScore ? `${score}/10` : EMPTY_VALUE;
          return <span className='text-paragraph-sm text-text-sub-500'>{display}</span>;
        },
        enableSorting: true,
      },
      {
        id: 'trigger_date',
        accessorKey: 'trigger_date',
        header: () => (
          <div className='flex items-center gap-0.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Trigger Date</span>
          </div>
        ),
        cell: ({ row }) => {
          const survey = row.original;
          const startDate = formatDateWithOrdinal(survey.trigger_date);
          const display = (startDate && startDate.trim()) || EMPTY_VALUE;
          return <span className='text-paragraph-sm text-text-sub-500'>{display}</span>;
        },
        enableSorting: false,
      },
      {
        id: 'submitted_by',
        accessorKey: 'submitted_by',
        header: () => (
          <div className='flex items-center gap-0.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Submitted By</span>
          </div>
        ),
        cell: ({ row }) => {
          const survey = row.original;
          const submittedBy = survey.submitted_by;
          const userImage =
            survey.submitted_by_image || survey.respondent_image || survey.user_image;

          if (!submittedBy) {
            return <span className='text-paragraph-sm text-text-sub-500'>{EMPTY_VALUE}</span>;
          }

          const initials = getInitials(submittedBy);
          const displayName =
            typeof submittedBy === 'string'
              ? submittedBy
              : submittedBy.full_name || submittedBy.name || '--';

          return (
            <div className='flex items-center gap-2'>
              <Avatar.Root size='24' color='gray'>
                {userImage ? (
                  <Avatar.Image src={userImage} alt={displayName} />
                ) : (
                  <span className='text-label-xs'>{initials}</span>
                )}
              </Avatar.Root>
              <span className='text-paragraph-sm text-text-sub-500'>{displayName}</span>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'submission_date',
        accessorKey: 'submitted_date',
        header: () => (
          <div className='flex items-center gap-0.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Submission Date</span>
          </div>
        ),
        cell: ({ row }) => {
          const survey = row.original;
          const submissionDate = formatDateWithOrdinal(
            survey.submitted_date || survey.submission_date || survey.creation || survey.date,
          );
          const display = (submissionDate && submissionDate.trim()) || EMPTY_VALUE;
          return <span className='text-paragraph-sm text-text-sub-500'>{display}</span>;
        },
        enableSorting: false,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: () => (
          <div className='flex items-center gap-0.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Status</span>
          </div>
        ),
        cell: ({ row }) => {
          const survey = row.original;
          const status = survey.status || survey.custom_status;
          if (!status) {
            return <span className='text-paragraph-sm text-text-sub-500'>{EMPTY_VALUE}</span>;
          }
          const statusLower = status.toLowerCase();
          let color = 'gray';
          let label = status;

          if (statusLower === 'completed' || statusLower === 'submitted') {
            color = 'green';
            label = 'COMPLETED';
          } else if (statusLower === 'pending' || statusLower === 'draft') {
            color = 'yellow';
            label = 'PENDING';
          }

          return (
            <Badge.Root size='small' variant='light' color={color}>
              {label}
            </Badge.Root>
          );
        },
        enableSorting: false,
      },
      ...(showRowActions
        ? [
            {
              id: 'actions',
              header: () => <div />,
              meta: {
                headClassName: 'w-px',
                cellClassName: 'w-px whitespace-nowrap',
              },
              cell: ({ row }) => {
                const survey = row.original;
                const status = survey.status || survey.custom_status || 'N/A';
                const url = survey.doc_link;
                const statusLower = (status || '').toLowerCase();
                const isPending = statusLower === 'pending' || statusLower === 'draft';

                return (
                  <div className='flex items-center justify-end'>
                    {isPending ? (
                      <div className='flex items-center gap-3'>
                        <LinkButton.Root
                          variant='primary'
                          size='medium'
                          underline
                          onClick={async (e) => {
                            e.stopPropagation();
                            // Handle copy link
                            try {
                              await navigator.clipboard.writeText(url);
                              showSuccessToast('The link has been copied to your clipboard.');
                            } catch {
                              showErrorToast('Failed to copy the link.');
                            }
                          }}
                        >
                          <LinkButton.Icon as={RiFileCopyLine} />
                          {/* Copy Link */}
                        </LinkButton.Root>
                        <CompactButton.Root
                          type='button'
                          variant='stroke'
                          size='large'
                          className='shrink-0 transition-opacity group-hover/cell:opacity-100'
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          title='Open URL'
                          aria-label='Open URL'
                        >
                          <CompactButton.Icon as={RiExternalLinkLine} />
                        </CompactButton.Root>
                      </div>
                    ) : (
                      ''
                      // <LinkButton.Root
                      //   variant='primary'
                      //   size='small'
                      //   underline
                      //   onClick={(e) => {
                      //     e.stopPropagation();
                      //     // Handle resend
                      //   }}
                      // >
                      //   <LinkButton.Icon as={RiSendPlaneFill} />
                      //   Resend
                      // </LinkButton.Root>
                    )}
                  </div>
                );
              },
              enableSorting: false,
            },
          ]
        : []),
    ];
  }, [scoreColumnLabel, showRowActions]);

  const table = useReactTable({
    data: locationSurveys,
    columns,
    state: {
      sorting: localSorting,
    },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: false,
    enableSortingRemoval: true,
  });

  return (
    <Table.Root variant='compact'>
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.Head key={header.id} className={header.column.columnDef.meta?.headClassName}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </Table.Head>
            ))}
          </Table.Row>
        ))}
      </Table.Header>

      <Table.Body spacing={4}>
        {table.getRowModel().rows.map((row, i, rows) => (
          <React.Fragment key={row.id}>
            <Table.Row className='cursor-pointer' onClick={() => onRowClick?.(row.original)}>
              {row.getVisibleCells().map((cell) => (
                <Table.Cell
                  key={cell.id}
                  className={cell.column.columnDef.meta?.cellClassName}
                  onClick={(e) => {
                    if (cell.column.id === 'actions') {
                      e.stopPropagation();
                    }
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
            <Table.RowDivider />
          </React.Fragment>
        ))}
      </Table.Body>
    </Table.Root>
  );
};

export default LocationTable;
