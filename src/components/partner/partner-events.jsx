import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import * as Table from '@/components/ui/table';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { useColumnConfig } from '@/hooks/use-column-config';
// import { STATUS_BADGE_VARIANTS } from '@/components/event-management/constant';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { applyColumnConfig, prepareColumnsForConfig } from '@/lib/column-utils';
import { formatEventRowStartEndDisplay } from '@/utils/date-utils';
import { getAssigneeDisplayName, getAssigneeFirstNameInitial } from '@/utils/task-utils';
import { fetchPartnerEvents } from '@/redux/partnerSlice';

const PartnerEvents = ({ partnerId }) => {
  const dispatch = useDispatch();
  const tableRef = useRef(null);

  const { data: rows, loading, error, meta } = useSelector((state) => state.partner.partnerEvents);

  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const searchTimeoutRef = useRef(null);

  const normalizedRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  const allColumnDefs = useMemo(
    () => [
      {
        id: 'event_name',
        accessorKey: 'event_name',
        label: 'Event Name',
        enableHiding: false,
        header: () => (
          <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>Event Name</span>
        ),
        cell: ({ row }) => (
          <span className='text-paragraph-sm text-text-strong-950 whitespace-nowrap'>
            {row.original.event_name || '--'}
          </span>
        ),
      },
      {
        id: 'centre_name',
        accessorKey: 'centre_name',
        label: 'Centre Name',
        header: () => (
          <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>Centre Name</span>
        ),
        cell: ({ row }) => {
          const centres = Array.isArray(row.original.centre_name) ? row.original.centre_name : [];
          const names = centres.map((c) => c?.name).filter(Boolean);
          const text = names.length > 0 ? names.join(', ') : '--';
          return (
            <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>{text}</span>
          );
        },
      },
      {
        id: 'assignee',
        accessorKey: 'assignee',
        label: 'Assignee',
        header: () => (
          <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>Assignee</span>
        ),
        cell: ({ row }) => {
          const assignees = Array.isArray(row.original.assignee) ? row.original.assignee : [];
          if (assignees.length === 0) {
            return (
              <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>--</span>
            );
          }
          return (
            <div className='flex flex-wrap items-center gap-1'>
              {assignees.slice(0, 3).map((a, index) => {
                const display = getAssigneeDisplayName(a);
                return (
                  <Tooltip.Root size='xsmall' key={`${display}-${index}`}>
                    <Tooltip.Trigger asChild>
                      <span className='inline-flex'>
                        <CrmAccountAvatar
                          name={display}
                          initials={getAssigneeFirstNameInitial(a)}
                          image={a?.user_image || a?.image}
                          index={index}
                          size={24}
                        />
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content size='xsmall' side='bottom'>
                      {display}
                    </Tooltip.Content>
                  </Tooltip.Root>
                );
              })}
              {assignees.length > 3 && (
                <Tooltip.Root size='xsmall'>
                  <Tooltip.Trigger asChild>
                    <span className='text-paragraph-xs text-text-sub-500 whitespace-nowrap cursor-default'>
                      +{assignees.length - 3}
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content size='xsmall' side='bottom' className='max-w-xs'>
                    {assignees
                      .slice(3)
                      .map((a) => getAssigneeDisplayName(a))
                      .join(', ')}
                  </Tooltip.Content>
                </Tooltip.Root>
              )}
            </div>
          );
        },
      },
      {
        id: 'event_start_datetime',
        accessorKey: 'event_start_datetime',
        label: 'Event start date',
        header: () => (
          <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>
            Event start date
          </span>
        ),
        cell: ({ row }) => {
          const { start } = formatEventRowStartEndDisplay(row.original);
          return (
            <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>
              {start || '--'}
            </span>
          );
        },
      },
      {
        id: 'event_end_datetime',
        accessorKey: 'event_end_datetime',
        label: 'Event end date',
        header: () => (
          <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>
            Event end date
          </span>
        ),
        cell: ({ row }) => {
          const { end } = formatEventRowStartEndDisplay(row.original);
          return (
            <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>
              {end || '--'}
            </span>
          );
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        label: 'Status',
        header: () => (
          <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>Status</span>
        ),
        cell: ({ row }) => (
          <Badge.Root
            size='small'
            variant='light'
            color={[row.original.status]}
            className='whitespace-nowrap'
          >
            {row.original.status || '--'}
          </Badge.Root>
        ),
      },
      {
        id: 'clients',
        accessorKey: 'clients',
        label: 'Clients',
        header: () => (
          <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>Clients</span>
        ),
        cell: ({ row }) => {
          const clients = Array.isArray(row.original.clients) ? row.original.clients : [];
          const names = clients.map((c) => c?.name || c?.client_name).filter(Boolean);
          const text = names.length > 0 ? names.join(', ') : '--';
          return (
            <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>{text}</span>
          );
        },
      },
    ],
    [],
  );

  const defaultColumnConfig = useMemo(
    () => prepareColumnsForConfig(allColumnDefs),
    [allColumnDefs],
  );

  const columnConfigHook = useColumnConfig(
    'partner-events-table',
    defaultColumnConfig,
    async () => undefined,
    async () => defaultColumnConfig,
    { autoSave: false, debounce: 300 },
  );

  useEffect(() => {
    tableRef.current = { columnConfigHook };
  }, [columnConfigHook]);

  const visibleDefs = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfigHook.columns),
    [allColumnDefs, columnConfigHook.columns],
  );

  const loadEvents = useMemo(() => {
    return ({ keyword }) =>
      dispatch(
        fetchPartnerEvents({
          partner: partnerId,
          keyword: keyword ?? '',
          page: 1,
          page_size: 20,
        }),
      );
  }, [dispatch, partnerId]);

  useEffect(() => {
    if (!partnerId) return;
    loadEvents({ keyword: searchValue });
  }, [partnerId, loadEvents]); // intentionally not depending on searchValue (debounced)

  const handleSearchChange = (e) => {
    const next = e.target.value;
    setSearchValue(next);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (!partnerId) return;
      loadEvents({ keyword: next });
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const table = useReactTable({
    data: normalizedRows,
    columns: visibleDefs,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className='flex flex-col gap-4'>
      <header className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <Input.Root className='w-full lg:w-[372px]'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine />
            </Input.Icon>
            <Input.Input
              placeholder='Search events...'
              value={searchValue}
              onChange={handleSearchChange}
              aria-label='Search events'
            />
          </Input.Wrapper>
        </Input.Root>

        <div className='flex flex-wrap items-center gap-3'>
          <ColumnManagerDropdown
            open={isColumnManagerOpen}
            onOpenChange={setIsColumnManagerOpen}
            config={tableRef?.current?.columnConfigHook}
            tooltipContent={<p>Column Manager</p>}
            trigger={
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                className='gap-1'
                aria-label='Columns'
              >
                <Button.Icon>
                  <RiLayoutColumnLine size={20} />
                </Button.Icon>
              </Button.Root>
            }
          />
        </div>
      </header>

      {error ? (
        <div className='rounded-2xl border border-error-base/20 bg-error-lighter/30 p-6 text-paragraph-sm text-error-darker'>
          {error}
        </div>
      ) : (
        <div className='w-full rounded-2xl bg-bg-white-0 shadow-regular-xs'>
          <div className='w-full overflow-x-auto'>
            <Table.Root className='w-full' variant='compact'>
              <Table.Header>
                {table.getHeaderGroups().map((headerGroup) => (
                  <Table.Row key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <Table.Head key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </Table.Head>
                    ))}
                  </Table.Row>
                ))}
              </Table.Header>
              <Table.Body spacing={8}>
                {loading ? (
                  <Table.Row>
                    <Table.Cell colSpan={visibleDefs.length} className='py-8 text-center'>
                      <span className='text-paragraph-sm text-text-sub-500'>Loading events…</span>
                    </Table.Cell>
                  </Table.Row>
                ) : table.getRowModel().rows.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={visibleDefs.length} className='py-8 text-center'>
                      <span className='text-paragraph-sm text-text-sub-500'>No events found.</span>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <React.Fragment key={row.original.name || row.id}>
                      <Table.Row>
                        {row.getVisibleCells().map((cell) => (
                          <Table.Cell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </Table.Cell>
                        ))}
                      </Table.Row>
                      <Table.RowDivider />
                    </React.Fragment>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </div>
        </div>
      )}

      {/* tiny footer for sanity (optional data from API)
      {meta?.total_events != null ? (
        <div className='text-paragraph-xs text-text-sub-500'>
          Total events: {meta.total_events}
        </div>
      ) : null} */}
    </div>
  );
};

export default PartnerEvents;
