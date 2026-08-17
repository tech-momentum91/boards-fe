import React, { useEffect, useImperativeHandle, useMemo, useState } from 'react';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Avatar from '@/components/ui/avatar';
import * as CompactButton from '@/components/ui/compact-button';
import * as Button from '@/components/ui/button';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiBrushAiLine,
  RiBuildingLine,
  RiDeleteBinLine,
  RiGroupLine,
  RiPencilLine,
  RiShieldCheckLine,
  RiToolsLine,
  RiUserLine,
  RiAddLine,
} from 'react-icons/ri';
import {
  getCoreTeamRoleBadgeColor,
  getRoleBadgeColor,
  getStatusBadgeColor,
} from '@/components/team-management/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { cn } from '@/utils/cn';
import emptyState from '@/assets/images/empty-state.png';

const DEFAULT_AVATAR =
  'https://www.clipartmax.com/png/middle/258-2582267_circled-user-male-skin-type-1-2-icon-male-user-icon.png';

/** Resolve badge color for a role (tries core team map, then support/role map, then gray). */
const getRoleBadgeColorForDisplay = (role) => {
  if (!role) return 'gray';
  const coreColor = getCoreTeamRoleBadgeColor(role);
  if (coreColor !== 'gray') return coreColor;
  return getRoleBadgeColor(role);
};

const getIcons = (role) => {
  const Icons = {
    'CRM Team': <RiUserLine size={20} />,
    'Facility Team': <RiBuildingLine size={20} />,
    'Facility Lead': <RiGroupLine size={20} />,
    Housekeeping: <RiBrushAiLine size={20} />,
    Security: <RiShieldCheckLine size={20} />,
    MST: <RiToolsLine size={20} />,
  };
  return Icons[role];
};

/** Stable empty reference so memo/effects do not re-run when teamData is undefined. */
const EMPTY_SECTIONS = Object.freeze({});

const flattenListviewResults = (rawResults) => {
  if (Array.isArray(rawResults)) return rawResults;
  if (rawResults && typeof rawResults === 'object') {
    return Object.values(rawResults).flatMap((value) => (Array.isArray(value) ? value : []));
  }
  return [];
};

const normalizeListviewMember = (row, isCoreTeam) => ({
  ...row,
  team_member_id: row.team_member_id ?? row.employee_id ?? row.email,
  team_type: row.team_type || (isCoreTeam ? 'User' : 'Employee'),
  email: row.email ?? row.personal_email ?? row.company_email ?? row.prefered_email ?? '',
  mobile_no: row.mobile_no ?? row.cell_number ?? '',
  cell_number: row.cell_number ?? row.mobile_no ?? '',
});

/**
 * API returns grouped `{ [roleType]: Member[] }`, `{}` when filtered empty, or `[]` when
 * there are no assignments — the latter must not be passed to Object.entries as a list.
 */
const normalizeTeamSections = (data) => {
  if (!data) return EMPTY_SECTIONS;
  if (Array.isArray(data)) {
    return data.length > 0 ? { 'Team Members': data } : EMPTY_SECTIONS;
  }
  if (typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? value : []]),
    );
  }
  return EMPTY_SECTIONS;
};

/** Group flat `team_member_listview` rows by role type for sectioned tables. */
const groupListviewResultsByRoleType = (rawResults, roleTypeMap = {}, isCoreTeam = true) => {
  const rows = flattenListviewResults(rawResults);
  const groups = {};
  const seen = new Set();

  for (const row of rows) {
    const member = normalizeListviewMember(row, isCoreTeam);
    const dedupeKey = `${member.team_member_id ?? ''}:${member.role ?? ''}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const sectionKey = roleTypeMap[member.role] || member.role || 'Team Members';
    if (!groups[sectionKey]) groups[sectionKey] = [];
    groups[sectionKey].push(member);
  }

  return normalizeTeamSections(groups);
};

/** Center team API may return `mobile_no`; other shapes use cell_number / mobile_number. */
const getMemberPhoneDisplay = (item) => {
  const raw =
    item?.mobile_no ??
    item?.cell_number ??
    item?.mobile_number ??
    item?.phone ??
    item?.contact_number ??
    '';
  const s = String(raw).trim();
  return s || '--';
};

const DATA_COL_CLASS = 'min-w-0 flex-1';
const ACTIONS_COL_CLASS = 'min-w-0 w-[10%] shrink-0';

const COLUMN_LABELS = {
  name: 'Name',
  email: 'Email',
  cell_number: 'Phone',
  role: 'Role',
  status: 'Status',
};

import { getRoleMaxLimit } from '@/utils/center-configuration-storage';

const CenterViewTeamTable = React.forwardRef(
  (
    {
      centerId,
      listviewResults,
      roleTypeMap = {},
      teamScope = 'core_team',
      tableId,
      defaultColumns = [],
      fetchColumnConfig,
      persistColumnConfig,
      onEditMember,
      onRemoveMember,
      onAddMember,
    },
    ref,
  ) => {
    const isSupportTeam = teamScope === 'support_team';
    const sections = useMemo(
      () => groupListviewResultsByRoleType(listviewResults, roleTypeMap, !isSupportTeam),
      [listviewResults, roleTypeMap, isSupportTeam],
    );
    const sectionKeysSig = useMemo(() => Object.keys(sections).sort().join('\0'), [sections]);

    const hasNoResults = Object.keys(sections).length === 0;

    const getCall = React.useCallback(() => {
      if (typeof fetchColumnConfig === 'function') {
        return Promise.resolve(fetchColumnConfig()).then((res) => res ?? defaultColumns);
      }
      return Promise.resolve(defaultColumns);
    }, [fetchColumnConfig, defaultColumns]);

    const persistCall = React.useCallback(
      (cols) => {
        if (typeof persistColumnConfig === 'function') {
          return Promise.resolve(persistColumnConfig(cols));
        }
        return Promise.resolve(cols);
      },
      [persistColumnConfig],
    );

    const columnConfigHook = useColumnConfig(tableId, defaultColumns, persistCall, getCall, {
      autoSave: true,
      debounce: 300,
    });

    useImperativeHandle(ref, () => ({
      columnConfigHook,
    }));

    const visibleColumns = useMemo(() => {
      const ordered = [...(columnConfigHook.columns ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      const dataCols = ordered.filter((col) => col.visible !== false && col.id !== 'actions');
      const hasActions = ordered.some((col) => col.id === 'actions');
      return hasActions
        ? [...dataCols, { id: 'actions', label: 'Actions', visible: true }]
        : dataCols;
    }, [columnConfigHook.columns]);

    const [expandedKeys, setExpandedKeys] = useState(() => {
      const keys = Object.keys(sections);
      return keys.length > 0 ? Object.fromEntries(keys.map((k) => [k, true])) : {};
    });

    useEffect(() => {
      if (!sectionKeysSig) return;
      const keys = sectionKeysSig.split('\0');
      setExpandedKeys((previous) => {
        let changed = false;
        const next = { ...previous };
        for (const k of keys) {
          if (next[k] === undefined) {
            next[k] = true;
            changed = true;
          }
        }
        return changed ? next : previous;
      });
    }, [sectionKeysSig]);

    const toggleSection = (key) => {
      setExpandedKeys((previous) => ({ ...previous, [key]: !previous[key] }));
    };

    const renderHeadCell = (columnId) => {
      if (columnId === 'actions') {
        return <Table.Head key={columnId} className={ACTIONS_COL_CLASS} aria-label='Actions' />;
      }
      return (
        <Table.Head key={columnId} className={DATA_COL_CLASS}>
          {COLUMN_LABELS[columnId] ?? columnId}
        </Table.Head>
      );
    };

    const renderBodyCell = (columnId, item) => {
      if (columnId === 'name') {
        return (
          <Table.Cell
            key={columnId}
            className={cn(DATA_COL_CLASS, 'truncate align-middle')}
            title={item?.name}
          >
            <div className='flex items-center gap-2'>
              <Avatar.Root size={32} color='gray'>
                <Avatar.Image src={item?.image || DEFAULT_AVATAR} alt={item?.name} />
              </Avatar.Root>
              {item?.name}
            </div>
          </Table.Cell>
        );
      }
      if (columnId === 'email') {
        return (
          <Table.Cell
            key={columnId}
            className={cn(DATA_COL_CLASS, 'truncate align-middle')}
            title={item?.email?.trim() || '--'}
          >
            {item?.email?.trim() || '--'}
          </Table.Cell>
        );
      }
      if (columnId === 'cell_number') {
        const phone = getMemberPhoneDisplay(item);
        return (
          <Table.Cell
            key={columnId}
            className={cn(DATA_COL_CLASS, 'truncate align-middle')}
            title={phone}
          >
            {phone}
          </Table.Cell>
        );
      }
      if (columnId === 'role') {
        return (
          <Table.Cell
            key={columnId}
            className={cn(DATA_COL_CLASS, 'truncate align-middle')}
            title={item?.role}
          >
            <Badge.Root variant='light' color={getRoleBadgeColorForDisplay(item?.role)}>
              {item?.role}
            </Badge.Root>
          </Table.Cell>
        );
      }
      if (columnId === 'status') {
        return (
          <Table.Cell key={columnId} className={cn(DATA_COL_CLASS, 'align-middle')}>
            <Badge.Root variant='light' color={getStatusBadgeColor(item?.status)}>
              {item?.status}
            </Badge.Root>
          </Table.Cell>
        );
      }
      if (columnId === 'actions') {
        return (
          <Table.Cell
            key={columnId}
            className={cn(ACTIONS_COL_CLASS, 'gap-2 flex items-center justify-end align-middle')}
          >
            <CompactButton.Root
              size='medium'
              variant='ghost'
              color='gray'
              onClick={() => onEditMember?.(item)}
            >
              <CompactButton.Icon as={RiPencilLine} />
            </CompactButton.Root>
            <CompactButton.Root
              size='medium'
              variant='ghost'
              color='gray'
              onClick={() => onRemoveMember?.(item)}
            >
              <CompactButton.Icon as={RiDeleteBinLine} />
            </CompactButton.Root>
          </Table.Cell>
        );
      }
      return null;
    };

    if (hasNoResults) {
      return (
        <div className='w-full flex-1 flex flex-col items-center justify-center gap-3 py-16 px-4'>
          <img className='object-contain' src={emptyState} alt='no data' />
          <span className='label-medium text-[var(--color-text-soft-400)] text-center'>
            No team records found for this center, Please Add Member
          </span>
        </div>
      );
    }

    return (
      <div className='w-full flex-1 flex flex-col items-center justify-start'>
        <div className='w-full flex flex-col gap-10'>
          {Object.entries(sections).map(([key, value]) => {
            const isExpanded = expandedKeys[key] !== false;
            const maxLimit = getRoleMaxLimit(centerId, key);
            const countDisplay = maxLimit ? `${value.length}/${maxLimit}` : `${value.length}`;

            return (
              <div key={key} className='flex w-full flex-col items-start gap-1'>
                <button
                  type='button'
                  onClick={() => toggleSection(key)}
                  className='label-small flex items-center gap-2 font-medium text-[var(--color-text-sub-500)] cursor-pointer hover:opacity-80 transition-opacity w-full text-left'
                >
                  {getIcons(key)}
                  <span>{key}</span>
                  <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-bg-weak-100 text-text-sub-600 border border-stroke-soft-200'>
                    {countDisplay} Members
                  </span>
                  {isExpanded ? (
                    <RiArrowUpSLine size={16} className='shrink-0 ml-auto' />
                  ) : (
                    <RiArrowDownSLine size={16} className='shrink-0 ml-auto' />
                  )}
                </button>

                {isExpanded && (
                  <div className='w-full pt-2 [&_table]:table-fixed'>
                    <Table.Root variant='compact' className='w-full'>
                      <Table.Header>
                        <Table.Row>{visibleColumns.map((col) => renderHeadCell(col.id))}</Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {value.map((item, ind) => (
                          <Table.Row
                            className='paragraph-small border-b-1 border-stroke-soft-200'
                            key={item?.team_member_id ?? ind}
                          >
                            {visibleColumns.map((col) => renderBodyCell(col.id, item))}
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

CenterViewTeamTable.displayName = 'CenterViewTeamTable';

export default CenterViewTeamTable;
