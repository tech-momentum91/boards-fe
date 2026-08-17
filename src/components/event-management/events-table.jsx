import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import * as Tooltip from '@/components/ui/tooltip';
import { MultiSelect } from '@/components/ui/multi-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import InlineEditableText from '@/components/ui/inline-editable-text';
import { format } from 'date-fns';
import * as AvatarGroup from '@/components/ui/avatar-group';
import { useColumnConfig, useColumnConfigPopoverRef } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { formatEventRowStartEndDisplay, getEventRowScheduleIso } from '@/utils/date-utils';
import {
  getEventStatusBadgeColor,
  normalizeEventRevenueModeValue,
  EVENT_STATUS_OPTIONS,
  EVENT_ENGAGEMENT_MODE_OPTIONS,
  SPOTLIGHT_EVENT_REVENUE_MODE_OPTIONS,
  SPOTLIGHT_EVENT_CATEGORY_OPTIONS,
  formatMaxRegistrationsDisplay,
} from '@/components/event-management/constant';
import { hasStatusBadgeColor, StatusColorPill } from '@/components/ui/status-color-pill';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';
import { fetchEventColumnList, updateEventColumnList, updateEventThunk } from '@/redux/eventsSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';
import { toStatusFilterOptions, useStatusOptions } from '@/hooks/use-status-options';
import { eventsStatusFieldForModule } from '@/components/event-management/event-dynamic-status-helpers';

const eventsColMeta = (id) =>
  ({
    event_name: {
      columnClassName: 'w-[220px] min-w-[220px] max-w-[220px]',
      cellClassName: 'w-[220px] min-w-[220px] max-w-[220px]',
    },
    partner_name: { columnClassName: 'min-w-0 max-w-[200px]' },
    centre_name: { columnClassName: 'min-w-0 max-w-[220px]' },
    event_category: { columnClassName: 'min-w-0 max-w-[160px]' },
    engagement_mode: { columnClassName: 'min-w-0 max-w-[140px]' },
    revenue_mode: { columnClassName: 'min-w-0 max-w-[180px]' },
    status: { columnClassName: 'min-w-0 max-w-[200px]' },
    event_start_datetime: { columnClassName: 'min-w-0 max-w-[200px]' },
    event_end_datetime: { columnClassName: 'min-w-0 max-w-[200px]' },
    spoc_name: { columnClassName: 'min-w-0 max-w-[180px]' },
    spoc_phone: { columnClassName: 'min-w-0 max-w-[140px]' },
    spoc_email: { columnClassName: 'min-w-0 max-w-[220px]' },
    event_details: { columnClassName: 'min-w-0 max-w-[280px]' },
    creation: { columnClassName: 'min-w-0 max-w-[160px]' },
    modified: { columnClassName: 'min-w-0 max-w-[160px]' },
    owner: { columnClassName: 'min-w-0 max-w-[180px]' },
    modified_by: { columnClassName: 'min-w-0 max-w-[180px]' },
    clients: { columnClassName: 'min-w-0 max-w-[200px]' },
    participation_type: { columnClassName: 'min-w-0 max-w-[160px]' },
    registration_deadline: { columnClassName: 'min-w-0 max-w-[160px]' },
    max_registrations: { columnClassName: 'min-w-[170px] max-w-[200px]' },
    community_event_status: { columnClassName: 'min-w-[108px] max-w-[220px]' },
  })[id] || { columnClassName: 'min-w-0 max-w-[200px]' };

const eventsSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.id !== 'event_name'} />
  );
  Inner.displayName = `EventsSortHeader(${label})`;
  return Inner;
};

/** Start / end schedule columns (date + time) for Events list rows. */
const buildEventScheduleDateColumns = (extraDef = {}) => [
  {
    id: 'event_start_datetime',
    label: 'Event start date',
    accessorFn: (row) => getEventRowScheduleIso(row).start_datetime || '',
    enableSorting: true,
    meta: eventsColMeta('event_start_datetime'),
    header: eventsSortHeader('Event start date'),
    cell: ({ row }) => {
      const { start } = formatEventRowStartEndDisplay(row.original);
      return <TextCellWithTooltip text={start} />;
    },
    ...extraDef,
  },
  {
    id: 'event_end_datetime',
    label: 'Event end date',
    accessorFn: (row) => getEventRowScheduleIso(row).end_datetime || '',
    enableSorting: true,
    meta: eventsColMeta('event_end_datetime'),
    header: eventsSortHeader('Event end date'),
    cell: ({ row }) => {
      const { end } = formatEventRowStartEndDisplay(row.original);
      return <TextCellWithTooltip text={end} />;
    },
    ...extraDef,
  },
];

/** Single-line truncated text with hover tooltip (full value). */
function TextCellWithTooltip({ text, strong = false }) {
  const raw = text == null || text === '' ? '' : String(text);
  const display = raw || '--';
  const textClass = strong
    ? 'text-paragraph-sm text-text-strong-950'
    : 'text-paragraph-sm text-text-sub-600';

  if (display === '--') {
    return <span className={cn(textClass, 'block min-w-0 truncate')}>{display}</span>;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          className={cn(
            textClass,
            'block min-w-0 w-full cursor-default truncate text-left align-top',
          )}
        >
          {display}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content side='bottom' className='max-w-sm break-words'>
        {display}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
TextCellWithTooltip.displayName = 'TextCellWithTooltip';

/** Inline-editable text cell with tooltip + truncate (name: editOnIconOnly so text click opens row). */
function EditableTextCell({ row, field, ctx, strong = false }) {
  if (!ctx?.onFieldUpdate)
    return <TextCellWithTooltip text={row.original[field]} strong={strong} />;
  const eventId = row.original.name;
  const value = String(row.original[field] ?? '').trim();
  const textClass = strong
    ? 'text-paragraph-sm font-medium text-text-strong-950'
    : 'text-paragraph-sm text-text-sub-600';
  return (
    <div className='w-full max-w-full overflow-hidden'>
      <Tooltip.Root size='xsmall'>
        <Tooltip.Trigger asChild>
          <div className='min-w-0 overflow-hidden'>
            <InlineEditableText
              value={value}
              editOnIconOnly
              placeholder='—'
              displayClassName={cn(textClass, 'truncate')}
              inputClassName={textClass}
              onSave={(v) => {
                const next = String(v ?? '').trim();
                if (next === value) return;
                ctx.onFieldUpdate(eventId, { [field]: next }, row.original);
              }}
            />
          </div>
        </Tooltip.Trigger>
        {value && <Tooltip.Content size='xsmall'>{value}</Tooltip.Content>}
      </Tooltip.Root>
    </div>
  );
}
EditableTextCell.displayName = 'EditableTextCell';

/** Inline searchable-select cell. `normalize` transforms the value before saving. */
function EditableSearchSelectCell({ row, field, options, ctx, normalize, fallbackLabel }) {
  if (!ctx?.onFieldUpdate) {
    return <TextCellWithTooltip text={fallbackLabel ?? row.original[field]} />;
  }
  const eventId = row.original.name;
  const value = row.original[field] || '';
  const label = options.find((o) => o.value === value)?.label || fallbackLabel || value || '--';
  return (
    <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
      <SearchableSelect
        variant='borderless'
        size='xsmall'
        showArrow={false}
        value={value}
        options={options}
        placeholder='—'
        searchPlaceholder='Search...'
        triggerClassName='!h-auto !min-h-8 w-full min-w-0 py-0'
        contentClassName='min-w-[230px]'
        onValueChange={(next) => {
          const final = normalize ? normalize(next) : next;
          if (final === value) return;
          ctx.onFieldUpdate(eventId, { [field]: final }, row.original);
        }}
        renderTrigger={() => (
          <span className='block min-w-0 truncate text-left text-paragraph-sm text-text-sub-600'>
            {label}
          </span>
        )}
      />
    </div>
  );
}
EditableSearchSelectCell.displayName = 'EditableSearchSelectCell';

/** Inline plain-select cell (no search). */
function EditablePlainSelectCell({ row, field, options, ctx }) {
  if (!ctx?.onFieldUpdate) return <TextCellWithTooltip text={row.original[field]} />;
  const eventId = row.original.name;
  const value = row.original[field] || '';
  const label = options.find((o) => o.value === value)?.label || value || '--';
  return (
    <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
      <Select.Root
        variant='borderless'
        size='xsmall'
        value={value}
        onValueChange={(next) =>
          next !== value && ctx.onFieldUpdate(eventId, { [field]: next }, row.original)
        }
      >
        <Select.Trigger className='w-full min-w-0' showArrow={false}>
          <Select.Value>
            <span className='block min-w-0 truncate text-paragraph-sm text-text-sub-600'>
              {label}
            </span>
          </Select.Value>
        </Select.Trigger>
        <Select.Content className='min-w-[200px]'>
          {options.map((opt) => (
            <Select.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  );
}
EditablePlainSelectCell.displayName = 'EditablePlainSelectCell';

/** Inline status select rendering a badge as the trigger value. */
function EditableStatusCell({ row, field, ctx }) {
  const value = row.original[field] || row.original.status || '';
  const statusOptions =
    Array.isArray(ctx?.statusOptions) && ctx.statusOptions.length > 0
      ? ctx.statusOptions
      : EVENT_STATUS_OPTIONS;
  const badge = (
    <Badge.Root
      size='small'
      variant='light'
      color={getEventStatusBadgeColor(value)}
      className='max-w-full'
    >
      <span className='block min-w-0 truncate'>{value || '--'}</span>
    </Badge.Root>
  );
  if (!ctx?.onFieldUpdate) return badge;
  const eventId = row.original.name;
  return (
    <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
      <Select.Root
        variant='borderless'
        size='xsmall'
        value={value}
        onValueChange={(next) =>
          next !== value && ctx.onFieldUpdate(eventId, { [field]: next }, row.original)
        }
      >
        <Select.Trigger className='w-full min-w-0' showArrow={false}>
          <Select.Value>{badge}</Select.Value>
        </Select.Trigger>
        <Select.Content className='min-w-[200px]'>
          {statusOptions.map((opt) => (
            <Select.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  );
}
EditableStatusCell.displayName = 'EditableStatusCell';

const isAllCentersRaw = (raw) => {
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr.some((c) => {
    const id = typeof c === 'string' ? c : c?.id || c?.center || c?.value || '';
    const nm = typeof c === 'string' ? c : c?.name || c?.center_name || '';
    return id === 'ALL' || nm === 'All Centers';
  });
};

const toCenterIds = (raw, options) => {
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr
    .map((c) => {
      const v =
        typeof c === 'string'
          ? c
          : c?.id || c?.center || c?.name || c?.value || c?.center_name || '';
      return (
        options.find((o) => o.value === v)?.value || options.find((o) => o.label === v)?.value || v
      );
    })
    .filter((v) => v && v !== 'All Centers' && v !== 'ALL');
};

const isTruthyAllFlag = (v) =>
  v === 1 ||
  v === true ||
  v === '1' ||
  String(v || '')
    .trim()
    .toLowerCase() === 'yes';

const extractCenterStrings = (rawCentreName) => {
  const raw = Array.isArray(rawCentreName) ? rawCentreName : rawCentreName ? [rawCentreName] : [];
  return raw
    .map((c) => {
      if (typeof c === 'string') return c;
      if (c && typeof c === 'object') return c.name || c.center || c.centre || c.value || '';
      return '';
    })
    .map((v) => String(v).trim())
    .filter(Boolean);
};

const parseCenterBadgeParts = (full) => {
  const s = String(full || '').trim();
  const m = s.match(/^(.+?)\s*\(([^)]+)\)$/);
  return { name: m ? m[1].trim() : s, code: m ? m[2] : null };
};

const allCentersStatusBadge = () => {
  const label = 'All Centers';
  const inner = (
    <Badge.Root
      size='small'
      variant='light'
      color={getEventStatusBadgeColor('All Centers')}
      className='max-w-full'
    >
      <span className='block min-w-0 truncate'>{label}</span>
    </Badge.Root>
  );
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div className='min-w-0 max-w-full cursor-default'>{inner}</div>
      </Tooltip.Trigger>
      <Tooltip.Content side='bottom' className='max-w-sm break-words'>
        Event applies to every center.
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

/** Center column: "All Centers" status badge, or client-table-style primary + overflow badges. */
const renderEventCentersCell = (row) => {
  if (isTruthyAllFlag(row?.all_centers)) {
    return allCentersStatusBadge();
  }

  const centers = extractCenterStrings(row?.centre_name || row?.center || row?.center_name);
  if (centers.length === 0) {
    return <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>--</span>;
  }

  const first = parseCenterBadgeParts(centers[0]);
  const additionalCenters = centers.slice(1);
  const additionalCount = additionalCenters.length;

  return (
    <div className='flex min-w-0 max-w-full flex-wrap items-center gap-2'>
      <Badge.Root variant='lighter' color='gray' size='medium' className='max-w-[min(100%,14rem)]'>
        <span className='paragraph-small block min-w-0 truncate font-medium text-text-strong-950'>
          {first.name}
        </span>
        {first.code ? (
          <span className='paragraph-small shrink-0 text-text-sub-400'>({first.code})</span>
        ) : null}
      </Badge.Root>
      {additionalCount > 0 ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Badge.Root variant='lighter' color='gray' size='medium'>
              <span className='text-label-xs font-semibold text-text-strong-950'>
                +{additionalCount}
              </span>
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
            <div className='flex flex-col gap-1'>
              <span className='mb-1 text-paragraph-sm font-medium text-text-strong-950'>
                Additional centers ({additionalCount})
              </span>
              {additionalCenters.map((center, index) => {
                const { name, code } = parseCenterBadgeParts(center);
                return (
                  <div key={index} className='text-paragraph-sm text-text-sub-600'>
                    {name}
                    {code ? <span className='ml-1 text-text-sub-400'>({code})</span> : null}
                  </div>
                );
              })}
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      ) : null}
    </div>
  );
};

/** Inline center multiselect (with search). Writes `centre_name` and clears `all_centers`. */
function EditableCentersCell({ row, ctx }) {
  if (!ctx?.onFieldUpdate) return renderEventCentersCell(row.original);
  const eventId = row.original.name;
  const raw = row.original.centre_name || row.original.center || row.original.center_name;
  const isAll = isTruthyAllFlag(row.original.all_centers) || isAllCentersRaw(raw);
  const selected = isAll ? [] : toCenterIds(raw, ctx.centerOptions);
  return (
    <div className='relative min-w-[200px] max-w-full' onClick={(e) => e.stopPropagation()}>
      {isAll && (
        <div className='pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2'>
          <Badge.Root size='small' variant='light' color='gray'>
            All Centers
          </Badge.Root>
        </div>
      )}
      <MultiSelect
        variant='borderless'
        size='xsmall'
        options={ctx.centerOptions}
        value={selected}
        commitOnBlur
        placeholder={isAll ? '' : 'Select centers'}
        onValueChange={(ids) =>
          ctx.onFieldUpdate(
            eventId,
            {
              centre_name: (Array.isArray(ids) ? ids : [])
                .filter((center) => center && center !== 'All Centers' && center !== 'ALL')
                .map((center) => ({ center })),
              all_centers: 0,
            },
            row.original,
          )
        }
      />
    </div>
  );
}
EditableCentersCell.displayName = 'EditableCentersCell';

/** Plain text for rich-text / HTML `event_details` from API. */
const stripHtmlToText = (html) => {
  if (html == null || html === '') return '--';
  const text = String(html)
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
  return text || '--';
};

const extractClientStrings = (rawClients) => {
  const raw = Array.isArray(rawClients) ? rawClients : rawClients ? [rawClients] : [];
  return raw
    .map((c) => {
      if (typeof c === 'string') return c;
      if (c && typeof c === 'object') {
        return c.client_name || c.customer_name || c.name || c.client || c.value || '';
      }
      return '';
    })
    .map((v) => String(v).trim())
    .filter(Boolean);
};

const allClientsStatusBadge = () => {
  const label = 'All Clients';
  const inner = (
    <Badge.Root
      size='small'
      variant='light'
      color={getEventStatusBadgeColor('All Clients')}
      className='max-w-full'
    >
      <span className='block min-w-0 truncate'>{label}</span>
    </Badge.Root>
  );
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div className='min-w-0 max-w-full cursor-default'>{inner}</div>
      </Tooltip.Trigger>
      <Tooltip.Content side='bottom' className='max-w-sm break-words'>
        Event applies to every client.
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

/** Clients column (community): "All Clients" status badge, or primary + overflow badges. */
const renderEventClientsCell = (row) => {
  if (isTruthyAllFlag(row?.all_clients)) {
    return allClientsStatusBadge();
  }

  const clients = extractClientStrings(
    row?.clients_applicable || row?.clients || row?.client || row?.brandcompany_name,
  );
  if (clients.length === 0) {
    return <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>--</span>;
  }

  const first = clients[0];
  const additional = clients.slice(1);
  const additionalCount = additional.length;

  return (
    <div className='flex min-w-0 max-w-full flex-wrap items-center gap-2'>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Badge.Root
            variant='lighter'
            color='gray'
            size='medium'
            className='max-w-[min(100%,14rem)]'
          >
            <span className='paragraph-small block min-w-0 truncate font-medium text-text-strong-950'>
              {first}
            </span>
          </Badge.Root>
        </Tooltip.Trigger>
        <Tooltip.Content side='bottom' className='max-w-sm break-words'>
          {first}
        </Tooltip.Content>
      </Tooltip.Root>
      {additionalCount > 0 ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Badge.Root variant='lighter' color='gray' size='medium'>
              <span className='text-label-xs font-semibold text-text-strong-950'>
                +{additionalCount}
              </span>
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
            <div className='flex flex-col gap-1'>
              <span className='mb-1 text-paragraph-sm font-medium text-text-strong-950'>
                Additional clients ({additionalCount})
              </span>
              {additional.map((name, index) => (
                <div key={index} className='text-paragraph-sm text-text-sub-600'>
                  {name}
                </div>
              ))}
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      ) : null}
    </div>
  );
};

const buildColumns = (moduleType, helpers = {}) => {
  const { editCtx = {}, columnConfigHook, onOpenStatuses } = helpers;
  const statusFieldName = eventsStatusFieldForModule(moduleType);
  const renderStatusHeader = (label = 'Status') => {
    const EventStatusTableColumnHeader = () => (
      <div className='flex items-center gap-0.5'>
        <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>{label}</span>
        {columnConfigHook && onOpenStatuses ? (
          <StatusColumnPopover
            columnId={statusFieldName}
            columnConfigHook={columnConfigHook}
            onOpenStatuses={onOpenStatuses}
          />
        ) : null}
      </div>
    );
    EventStatusTableColumnHeader.displayName = 'EventStatusTableColumnHeader';
    return EventStatusTableColumnHeader;
  };
  const renderStatusCell = ({ row }) => {
    const label = row.original.status;
    const colorRaw = row.original.status_color;
    if (hasStatusBadgeColor(colorRaw)) {
      return (
        <StatusColorPill
          value={label || '—'}
          color={colorRaw}
          className='max-w-[min(100%,160px)]'
        />
      );
    }
    return (
      <Badge.Root
        size='small'
        variant='light'
        color={getEventStatusBadgeColor(label)}
        className='whitespace-nowrap'
      >
        {label || '--'}
      </Badge.Root>
    );
  };
  const baseColumns = [
    {
      id: 'event_name',
      accessorKey: 'event_name',
      label: 'Event Name',
      enableHiding: false,
      enableSorting: false,
      meta: eventsColMeta('event_name'),
      header: eventsSortHeader('Event Name'),
      cell: ({ row }) => <EditableTextCell row={row} field='event_name' ctx={editCtx} strong />,
    },
  ];

  if (moduleType === 'spotlight') {
    /** Shown by default (column manager can hide except event_name). */
    const defaultMicroVisible = { visible: true, enableHiding: true };
    /** Optional: hidden until turned on in column manager. */
    const optionalHidden = { visible: false, enableHiding: true };
    return [
      ...baseColumns,
      // {
      //   id: 'clients',
      //   accessorKey: 'brandcompany_name',
      //   label: 'Clients',
      //   ...defaultMicroVisible,
      //   header: () => (
      //     <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>Clients</span>
      //   ),
      //   cell: ({ row }) => renderClientsCell(row.original.brandcompany_name),
      // },
      {
        id: 'partner_name',
        accessorKey: 'partner_name',
        label: 'Partner Name',
        ...defaultMicroVisible,
        enableSorting: true,
        meta: eventsColMeta('partner_name'),
        header: eventsSortHeader('Partner Name'),
        cell: ({ row }) => (
          <EditableSearchSelectCell
            row={row}
            field='partner_name'
            options={editCtx.partnerOptions || []}
            ctx={editCtx}
            fallbackLabel={row.original.partner_name}
          />
        ),
      },
      {
        id: 'centre_name',
        accessorKey: 'centre_name',
        label: 'Center',
        ...defaultMicroVisible,
        enableSorting: true,
        meta: eventsColMeta('centre_name'),
        header: eventsSortHeader('Center'),
        cell: ({ row }) => <EditableCentersCell row={row} ctx={editCtx} />,
      },
      {
        id: 'event_category',
        accessorKey: 'event_category',
        label: 'Category',
        ...defaultMicroVisible,
        enableSorting: true,
        meta: eventsColMeta('event_category'),
        header: eventsSortHeader('Category'),
        cell: ({ row }) => (
          <EditableSearchSelectCell
            row={row}
            field='event_category'
            options={SPOTLIGHT_EVENT_CATEGORY_OPTIONS}
            ctx={editCtx}
          />
        ),
      },
      {
        id: 'engagement_mode',
        accessorKey: 'engagement_mode',
        label: 'Eng. Mode',
        ...defaultMicroVisible,
        enableSorting: true,
        meta: eventsColMeta('engagement_mode'),
        header: eventsSortHeader('Eng. Mode'),
        cell: ({ row }) => (
          <EditablePlainSelectCell
            row={row}
            field='engagement_mode'
            options={EVENT_ENGAGEMENT_MODE_OPTIONS}
            ctx={editCtx}
          />
        ),
      },
      {
        id: 'revenue_mode',
        accessorKey: 'revenue_mode',
        label: 'Revenue Mode',
        ...defaultMicroVisible,
        enableSorting: true,
        meta: eventsColMeta('revenue_mode'),
        header: eventsSortHeader('Revenue Mode'),
        cell: ({ row }) => (
          <EditableSearchSelectCell
            row={row}
            field='revenue_mode'
            options={SPOTLIGHT_EVENT_REVENUE_MODE_OPTIONS}
            ctx={editCtx}
            normalize={normalizeEventRevenueModeValue}
            fallbackLabel={normalizeEventRevenueModeValue(row.original.revenue_mode)}
          />
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        label: 'Status',
        ...defaultMicroVisible,
        enableSorting: true,
        meta: eventsColMeta('status'),
        header: renderStatusHeader('Status'),
        cell: ({ row }) => <EditableStatusCell row={row} field='status' ctx={editCtx} />,
      },
      ...buildEventScheduleDateColumns(defaultMicroVisible),
      // {
      //   id: 'assignee',
      //   accessorKey: 'assignee',
      //   label: 'Assignee',
      //   ...optionalHidden,
      //   header: () => (
      //     <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>Assignee</span>
      //   ),
      //   cell: ({ row }) => (
      //     <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>
      //       {row.original.assignee || '--'}
      //     </span>
      //   ),
      // },
      // {
      //   id: 'event_type',
      //   accessorKey: 'event_type',
      //   label: 'Event type',
      //   ...optionalHidden,
      //   header: () => (
      //     <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>Event type</span>
      //   ),
      //   cell: ({ row }) => (
      //     <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>
      //       {row.original.event_type || '--'}
      //     </span>
      //   ),
      // },
      {
        id: 'spoc_name',
        accessorKey: 'spoc_name',
        label: 'SPOC name',
        ...optionalHidden,
        enableSorting: true,
        meta: eventsColMeta('spoc_name'),
        header: eventsSortHeader('SPOC name'),
        cell: ({ row }) => <TextCellWithTooltip text={row.original.spoc_name} />,
      },
      {
        id: 'spoc_phone',
        accessorKey: 'spoc_phone',
        label: 'SPOC phone',
        ...optionalHidden,
        enableSorting: true,
        meta: eventsColMeta('spoc_phone'),
        header: eventsSortHeader('SPOC phone'),
        cell: ({ row }) => <TextCellWithTooltip text={row.original.spoc_phone} />,
      },
      {
        id: 'spoc_email',
        accessorKey: 'spoc_email',
        label: 'SPOC email',
        ...optionalHidden,
        enableSorting: true,
        meta: eventsColMeta('spoc_email'),
        header: eventsSortHeader('SPOC email'),
        cell: ({ row }) => <TextCellWithTooltip text={row.original.spoc_email} />,
      },
      {
        id: 'event_details',
        accessorKey: 'event_details',
        label: 'Event details',
        ...optionalHidden,
        enableSorting: true,
        meta: eventsColMeta('event_details'),
        header: eventsSortHeader('Event details'),
        cell: ({ row }) => {
          const full = stripHtmlToText(row.original.event_details);
          if (full === '--') {
            return <span className='text-paragraph-sm text-text-sub-600'>--</span>;
          }
          return (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span className='line-clamp-2 block min-h-[2.5rem] min-w-0 cursor-default text-left text-paragraph-sm text-text-sub-600'>
                  {full}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content side='bottom' className='max-w-md break-words'>
                {full}
              </Tooltip.Content>
            </Tooltip.Root>
          );
        },
      },
      // {
      //   id: 'name',
      //   accessorKey: 'name',
      //   label: 'Document ID',
      //   ...optionalHidden,
      //   header: () => (
      //     <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>Document ID</span>
      //   ),
      //   cell: ({ row }) => (
      //     <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>
      //       {row.original.name || '--'}
      //     </span>
      //   ),
      // },
      {
        id: 'creation',
        accessorKey: 'creation',
        label: 'Created on',
        ...optionalHidden,
        enableSorting: true,
        meta: eventsColMeta('creation'),
        header: eventsSortHeader('Created on'),
        cell: ({ row }) => <TextCellWithTooltip text={row.original.creation} />,
      },
      {
        id: 'modified',
        accessorKey: 'modified',
        label: 'Modified on',
        ...optionalHidden,
        enableSorting: true,
        meta: eventsColMeta('modified'),
        header: eventsSortHeader('Modified on'),
        cell: ({ row }) => <TextCellWithTooltip text={row.original.modified} />,
      },
      {
        id: 'owner',
        accessorKey: 'owner',
        label: 'Owner',
        ...optionalHidden,
        enableSorting: true,
        meta: eventsColMeta('owner'),
        header: eventsSortHeader('Owner'),
        cell: ({ row }) => <TextCellWithTooltip text={row.original.owner} />,
      },
      {
        id: 'modified_by',
        accessorKey: 'modified_by',
        label: 'Modified by',
        ...optionalHidden,
        enableSorting: true,
        meta: eventsColMeta('modified_by'),
        header: eventsSortHeader('Modified by'),
        cell: ({ row }) => <TextCellWithTooltip text={row.original.modified_by} />,
      },
    ];
  }

  if (moduleType === 'hosted') {
    return [
      ...baseColumns,
      // {
      //   id: 'clients',
      //   accessorKey: 'clients',
      //   label: 'Clients',
      //   header: () => (
      //     <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>Clients</span>
      //   ),
      //   cell: ({ row }) => renderClientsCell(row.original.brandcompany_name),
      // },
      {
        id: 'partner_name',
        accessorKey: 'partner_name',
        label: 'Partner Name',
        enableSorting: true,
        meta: eventsColMeta('partner_name'),
        header: eventsSortHeader('Partner Name'),
        cell: ({ row }) => (
          <TextCellWithTooltip text={row.original.partner_name || row.original.brandcompany_name} />
        ),
      },
      {
        id: 'centre_name',
        accessorKey: 'centre_name',
        label: 'Center',
        enableSorting: true,
        meta: eventsColMeta('centre_name'),
        header: eventsSortHeader('Center'),
        cell: ({ row }) => renderEventCentersCell(row.original),
      },
      {
        id: 'event_category',
        accessorKey: 'event_category',
        label: 'Category',
        enableSorting: true,
        meta: eventsColMeta('event_category'),
        header: eventsSortHeader('Category'),
        cell: ({ row }) => (
          <TextCellWithTooltip text={row.original.event_category || row.original.category} />
        ),
      },
      {
        id: 'revenue_mode',
        accessorKey: 'revenue_mode',
        label: 'Revenue Mode',
        enableSorting: true,
        meta: eventsColMeta('revenue_mode'),
        header: eventsSortHeader('Revenue Mode'),
        cell: ({ row }) => (
          <TextCellWithTooltip text={normalizeEventRevenueModeValue(row.original.revenue_mode)} />
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        label: 'Status',
        header: renderStatusHeader('Status'),
        cell: renderStatusCell,
      },
      ...buildEventScheduleDateColumns(),
      {
        id: 'spoc_name',
        accessorKey: 'spoc_name',
        label: 'SPOC',
        enableSorting: true,
        meta: eventsColMeta('spoc_name'),
        header: eventsSortHeader('SPOC'),
        cell: ({ row }) => (
          <TextCellWithTooltip text={row.original.spoc_name || row.original.spoc} />
        ),
      },
    ];
  }

  // community — same Events API row shape as micro / external where fields overlap
  return [
    ...baseColumns,
    {
      id: 'centre_name',
      accessorKey: 'centre_name',
      label: 'Center',
      enableSorting: true,
      meta: eventsColMeta('centre_name'),
      header: eventsSortHeader('Center'),
      cell: ({ row }) => renderEventCentersCell(row.original),
    },
    {
      id: 'clients',
      accessorKey: 'clients',
      label: 'Clients',
      enableSorting: true,
      meta: eventsColMeta('clients'),
      header: eventsSortHeader('Clients'),
      cell: ({ row }) => renderEventClientsCell(row.original),
    },
    {
      id: 'participation_type',
      accessorKey: 'participation_type',
      label: 'Participation',
      enableSorting: true,
      meta: eventsColMeta('participation_type'),
      header: eventsSortHeader('Participation'),
      cell: ({ row }) => <TextCellWithTooltip text={row.original.participation_type} />,
    },
    ...buildEventScheduleDateColumns(),
    {
      id: 'registration_deadline',
      accessorKey: 'registration_deadline',
      label: 'Registration Deadline',
      enableSorting: true,
      meta: eventsColMeta('registration_deadline'),
      header: eventsSortHeader('Registration Deadline'),
      cell: ({ row }) => <TextCellWithTooltip text={row.original.registration_deadline} />,
    },
    {
      id: 'max_registrations',
      accessorKey: 'max_registrations',
      label: 'Max Registrations',
      enableSorting: true,
      meta: eventsColMeta('max_registrations'),
      header: eventsSortHeader('Max Registrations'),
      cell: ({ row }) => (
        <TextCellWithTooltip text={formatMaxRegistrationsDisplay(row.original.max_registrations)} />
      ),
    },
    {
      id: 'community_status',
      accessorKey: 'community_status',
      label: 'Status',
      header: renderStatusHeader('Status'),
      cell: ({ row }) => {
        const label = row.original.community_status || row.original.status;
        const colorRaw = row.original.community_status_color || row.original.status_color;
        if (hasStatusBadgeColor(colorRaw)) {
          return (
            <StatusColorPill
              value={label || '—'}
              color={colorRaw}
              className='max-w-[min(100%,160px)]'
            />
          );
        }
        return (
          <Badge.Root
            size='small'
            variant='light'
            color={getEventStatusBadgeColor(label)}
            className='whitespace-nowrap'
          >
            {label || '--'}
          </Badge.Root>
        );
      },
    },
    {
      id: 'creation',
      accessorKey: 'creation',
      label: 'Created At',
      enableSorting: true,
      meta: eventsColMeta('creation'),
      header: eventsSortHeader('Created At'),
      cell: ({ row }) => {
        const date = row.original.creation || row.original.created_at;
        if (!date) return <span className='text-paragraph-sm text-text-sub-600'>--</span>;
        try {
          const formatted = format(new Date(date), 'dd MMM yyyy');
          return <TextCellWithTooltip text={formatted} />;
        } catch {
          return <TextCellWithTooltip text={String(date)} />;
        }
      },
    },
    {
      id: 'owner',
      accessorKey: 'owner',
      label: 'Owner',
      enableSorting: true,
      meta: eventsColMeta('owner'),
      header: eventsSortHeader('Owner'),
      cell: ({ row }) => <TextCellWithTooltip text={row.original.created_by} />,
    },
  ];
};

const EventsTable = React.forwardRef(
  (
    {
      moduleType = 'spotlight',
      rows = [],
      sorting: sortingFromParent = [],
      onSortingChange,
      isLoading = false,
      isLoadingMore = false,
      onRowClick,
      onLoadMore,
      hasMore = false,
      enableScrollPagination = false,
      loadedCount: _loadedCount,
      totalCount: _totalCount,
      partnerOptions = [],
      centerOptions = [],
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const [localSorting, setLocalSorting] = useState(sortingFromParent);
    const [isSetStatusesOpen, setIsSetStatusesOpen] = React.useState(false);
    const [statusOptionsRefreshKey, setStatusOptionsRefreshKey] = React.useState(0);
    const { statusPopoverColumnConfig, syncColumnConfigHookToPopover } =
      useColumnConfigPopoverRef();
    const [localRows, setLocalRows] = useState(rows);
    const statusField = eventsStatusFieldForModule(moduleType);
    const { options: eventStatusOptions } = useStatusOptions({
      doctype: 'Events',
      field: statusField,
      refreshKey: statusOptionsRefreshKey,
    });
    const statusSelectOptions = useMemo(() => {
      const fromConfig = toStatusFilterOptions(eventStatusOptions);
      return fromConfig.length > 0 ? fromConfig : EVENT_STATUS_OPTIONS;
    }, [eventStatusOptions]);

    const handleSetStatusesOpenChange = React.useCallback((open) => {
      setIsSetStatusesOpen(open);
      if (!open) setStatusOptionsRefreshKey((key) => key + 1);
    }, []);

    useEffect(() => {
      setLocalRows(rows);
    }, [rows]);

    useEffect(() => {
      setLocalSorting(sortingFromParent);
    }, [sortingFromParent]);

    const handleFieldUpdate = useCallback(
      (eventId, patch, prevRow) => {
        if (!eventId || !patch) return;
        setLocalRows((prev) =>
          prev.map((r) => ((r.name || r.id) === eventId ? { ...r, ...patch } : r)),
        );
        dispatch(updateEventThunk({ eventId, ...patch }))
          .unwrap()
          .then(() => showSuccessToast('Saved'))
          .catch((error) => {
            setLocalRows((prev) => prev.map((r) => ((r.name || r.id) === eventId ? prevRow : r)));
            showErrorToast(error || 'Failed to update event');
          });
      },
      [dispatch],
    );

    const editCtx = useMemo(
      () => ({
        onFieldUpdate: handleFieldUpdate,
        partnerOptions,
        centerOptions,
        statusOptions: statusSelectOptions,
      }),
      [handleFieldUpdate, partnerOptions, centerOptions, statusSelectOptions],
    );

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const next =
          typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
        setLocalSorting(next);
        onSortingChange?.(next);
      },
      [localSorting, onSortingChange],
    );
    const allColumnDefs = useMemo(
      () =>
        buildColumns(moduleType, {
          editCtx,
          columnConfigHook: statusPopoverColumnConfig,
          onOpenStatuses: () => setIsSetStatusesOpen(true),
        }),
      [moduleType, editCtx, statusPopoverColumnConfig],
    );
    const defaultColumnConfig = useMemo(
      () => prepareColumnsForConfig(allColumnDefs),
      [allColumnDefs],
    );

    const persistCall = useMemo(
      () =>
        moduleType === 'spotlight'
          ? async (data) => dispatch(updateEventColumnList(data)).unwrap()
          : async () => undefined,
      [dispatch, moduleType],
    );

    const getCall = useMemo(
      () =>
        moduleType === 'spotlight'
          ? async () => {
              const result = await dispatch(fetchEventColumnList()).unwrap();
              return result || defaultColumnConfig;
            }
          : async () => defaultColumnConfig,
      [dispatch, moduleType, defaultColumnConfig],
    );

    const columnConfigHook = useColumnConfig(
      `events-table-${moduleType}`,
      defaultColumnConfig,
      persistCall,
      getCall,
      {
        autoSave: moduleType === 'spotlight',
        debounce: 300,
      },
    );
    syncColumnConfigHookToPopover(columnConfigHook);

    const columns = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfigHook.columns),
      [allColumnDefs, columnConfigHook.columns],
    );

    const data = Array.isArray(localRows) ? localRows : [];

    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore: Boolean(hasMore && enableScrollPagination),
      isLoading: Boolean(isLoadingMore || isLoading),
      threshold: 200,
      scrollContainer: null,
      enabled: Boolean(enableScrollPagination && onLoadMore),
    });

    const table = useReactTable({
      data,
      columns,
      state: { sorting: localSorting },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      manualSorting: true,
      enableSortingRemoval: true,
    });

    React.useImperativeHandle(ref, () => ({
      columnConfigHook,
    }));

    return (
      <div className='flex-1 min-h-0 flex flex-col w-full overflow-hidden'>
        <SetStatusesModal
          open={isSetStatusesOpen}
          onOpenChange={handleSetStatusesOpenChange}
          doctype='Events'
          field={statusField}
        />
        <Table.Root
          className='min-h-0 flex-1 overflow-auto'
          variant='compact'
          tableInstance={table}
          tableClassName='min-w-max'
        >
          <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head key={header.id} column={header.column}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>
          <Table.Body spacing={8}>
            {isLoading ? (
              <Table.Row>
                <Table.Cell colSpan={columns.length} className='py-8 text-center'>
                  <span className='text-paragraph-sm text-text-sub-500'>Loading events…</span>
                </Table.Cell>
              </Table.Row>
            ) : table.getRowModel().rows.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={columns.length} className='py-8 text-center'>
                  <span className='text-paragraph-sm text-text-sub-500'>No events found.</span>
                </Table.Cell>
              </Table.Row>
            ) : (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.original.name || row.id}>
                  <Table.Row
                    className={onRowClick ? 'cursor-pointer hover:bg-bg-weak-50' : undefined}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell key={cell.id} column={cell.column}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  <Table.RowDivider />
                </React.Fragment>
              ))
            )}
            {enableScrollPagination && !isLoading && table.getRowModel().rows.length > 0 && (
              <>
                {hasMore && (
                  <Table.Row ref={sentinelRef} data-scroll-sentinel>
                    <Table.Cell colSpan={columns.length} className='h-1 p-0' />
                  </Table.Row>
                )}
                {isLoadingMore && (
                  <Table.Row>
                    <Table.Cell colSpan={columns.length} className='py-6 text-center'>
                      <div className='flex items-center justify-center gap-2'>
                        <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                        <span className='text-paragraph-sm text-text-sub-600'>
                          Loading more events…
                        </span>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
              </>
            )}
          </Table.Body>
        </Table.Root>
      </div>
    );
  },
);

EventsTable.displayName = 'EventsTable';

export default EventsTable;
