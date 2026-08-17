import {
  MS_FREQUENCY_OPTIONS,
  MS_MONTH_COLUMNS,
  MS_ROLE_OPTIONS,
} from '@/components/aum/maintenance-scheduler/maintenance-scheduler-constants';

/** Jan, Apr, Jul, Oct — months 1, 4, 7, 10 */
export const MS_QUARTERLY_MONTH_INDEXES = [0, 3, 6, 9];

/** Jan only */
export const MS_ANNUALLY_MONTH_INDEXES = [0];

export const MS_ALL_MONTH_INDEXES = MS_MONTH_COLUMNS.map((_, index) => index);

export const MS_TOOLBAR_COPY = {
  searchPlaceholder: 'Search here...',
  searchAriaLabel: 'Search maintenance scheduler',
  masterSetupLabel: 'Master Setup',
  centerSearchPlaceholder: 'Search...',
};

export function getMsRoleLabel(roleValue) {
  if (!roleValue) return '';
  const match = MS_ROLE_OPTIONS.find((option) => option.value === roleValue);
  if (match) return match.label;
  return roleValue;
}

export function getMsRoleAbbrev(roleValue) {
  if (!roleValue) return '';
  const match = MS_ROLE_OPTIONS.find((option) => option.value === roleValue);
  if (match) return match.abbrev;
  const parts = String(roleValue).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  return String(roleValue).slice(0, 3).toUpperCase();
}

export function getMsFrequencyLabel(frequencyValue) {
  if (!frequencyValue) return 'Select';
  return (
    MS_FREQUENCY_OPTIONS.find((option) => option.value === frequencyValue)?.label ?? frequencyValue
  );
}

export function filterMsSchedulerRows(rows, searchValue) {
  const query = String(searchValue ?? '')
    .trim()
    .toLowerCase();
  if (!query) return rows;

  const matchesRow = (row) => {
    const roleLabel = getMsRoleLabel(row.assigneeRole).toLowerCase();
    const frequencyLabel = getMsFrequencyLabel(row.frequency).toLowerCase();
    return (
      row.productType.toLowerCase().includes(query) ||
      roleLabel.includes(query) ||
      frequencyLabel.includes(query)
    );
  };

  return rows.filter((row) => {
    if (matchesRow(row)) return true;
    return row.children?.some((child) => matchesRow(child)) ?? false;
  });
}

export const MS_MONTH_DRAG_MIME = 'application/x-ms-month-cell';

const MS_MONTH_ID_TO_INDEX = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Green day badge on the current month column header (today's date). */
export function getMsMonthHeaderBadge(columnId, referenceDate = new Date()) {
  const monthIndex = MS_MONTH_ID_TO_INDEX[columnId];
  if (monthIndex === undefined || monthIndex !== referenceDate.getMonth()) {
    return null;
  }
  return String(referenceDate.getDate());
}

function syncMsChildRowsFromParent(parentRow) {
  if (!parentRow.children?.length) return parentRow.children;
  return parentRow.children.map((child) => {
    if (child.apiMeta?.isCustomized) {
      return child;
    }
    return {
      ...child,
      assigneeRole: parentRow.assigneeRole,
      frequency: parentRow.frequency,
      monthCells: parentRow.monthCells.map((cell) => ({ ...cell })),
    };
  });
}

function applyMsSchedulerRowPatch(row, patchOrUpdater) {
  const patch = typeof patchOrUpdater === 'function' ? patchOrUpdater(row) : patchOrUpdater;
  return { ...row, ...patch };
}

function markChildRowCustomized(childRow) {
  return {
    ...childRow,
    apiMeta: {
      ...childRow.apiMeta,
      isCustomized: true,
    },
  };
}

/**
 * Flatten parent rows for grid display, optionally including expanded children.
 * @param {import('./maintenance-scheduler-constants').MsSchedulerRow[]} rows
 * @param {Set<string>} expandedRowIds
 */
export function flattenMsSchedulerRowsForDisplay(rows, expandedRowIds) {
  const displayRows = [];

  for (const row of rows) {
    const hasChildren = Boolean(row.children?.length);
    displayRows.push({
      ...row,
      rowKind: 'parent',
      hasChildren,
      isChildRow: false,
      editable: true,
    });

    if (hasChildren && expandedRowIds.has(row.id)) {
      for (const child of row.children) {
        displayRows.push({
          ...child,
          rowKind: 'child',
          hasChildren: false,
          isChildRow: true,
          parentId: row.id,
          editable: true,
        });
      }
    }
  }

  return displayRows;
}

export function getMsParentRowIdsWithChildren(rows) {
  return rows.filter((row) => row.children?.length).map((row) => row.id);
}

export function updateMsSchedulerRow(rows, rowId, patchOrUpdater) {
  return rows.map((row) => {
    if (row.id === rowId) {
      const updated = applyMsSchedulerRowPatch(row, patchOrUpdater);
      if (updated.children?.length) {
        updated.children = syncMsChildRowsFromParent(updated);
      }
      return updated;
    }

    if (row.children?.length) {
      const childIndex = row.children.findIndex((child) => child.id === rowId);
      if (childIndex >= 0) {
        const nextChildren = [...row.children];
        nextChildren[childIndex] = markChildRowCustomized(
          applyMsSchedulerRowPatch(row.children[childIndex], patchOrUpdater),
        );
        return { ...row, children: nextChildren };
      }
    }

    return row;
  });
}

export function getMsAllowedMonthIndexes(frequency) {
  const normalized = String(frequency ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'quarterly') {
    return MS_QUARTERLY_MONTH_INDEXES;
  }
  if (normalized === 'annually') {
    return MS_ANNUALLY_MONTH_INDEXES;
  }

  return MS_ALL_MONTH_INDEXES;
}

export function isMsMonthAllowedForFrequency(frequency, monthIndex) {
  return getMsAllowedMonthIndexes(frequency).includes(monthIndex);
}

export function applyMsFrequencyToMonthCells(frequency, monthCells = []) {
  const allowed = new Set(getMsAllowedMonthIndexes(frequency));

  return MS_ALL_MONTH_INDEXES.map((monthIndex) => {
    const cell = monthCells[monthIndex] ?? { type: 'add' };

    if (!allowed.has(monthIndex)) {
      return { type: 'empty' };
    }

    if (cell.type === 'planned') {
      return { type: 'planned' };
    }

    return { type: 'add' };
  });
}

export function planMsMonthCell(monthCells, monthIndex, frequency) {
  if (!isMsMonthAllowedForFrequency(frequency, monthIndex)) {
    return monthCells;
  }

  const nextCells = monthCells.map((cell) => ({ ...cell }));
  const currentType = nextCells[monthIndex]?.type;
  if (currentType !== 'add') return monthCells;
  nextCells[monthIndex] = { type: 'planned' };
  return nextCells;
}

export function unplanMsMonthCell(monthCells, monthIndex, frequency) {
  if (!isMsMonthAllowedForFrequency(frequency, monthIndex)) {
    return monthCells;
  }

  const nextCells = monthCells.map((cell) => ({ ...cell }));
  if (nextCells[monthIndex]?.type !== 'planned') return monthCells;
  nextCells[monthIndex] = { type: 'add' };
  return nextCells;
}

export function movePlannedMsMonthCell(monthCells, fromIndex, toIndex, frequency) {
  if (fromIndex === toIndex) return monthCells;
  if (!isMsMonthAllowedForFrequency(frequency, toIndex)) return monthCells;

  const nextCells = monthCells.map((cell) => ({ ...cell }));
  const source = nextCells[fromIndex];
  const target = nextCells[toIndex];

  if (source?.type !== 'planned') return monthCells;

  if (target?.type === 'planned') {
    nextCells[fromIndex] = { type: 'planned' };
    nextCells[toIndex] = { type: 'planned' };
    return nextCells;
  }

  nextCells[fromIndex] = { type: 'add' };
  nextCells[toIndex] = { type: 'planned' };
  return nextCells;
}
