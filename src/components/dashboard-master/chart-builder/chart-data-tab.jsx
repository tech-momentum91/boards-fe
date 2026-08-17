import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  RiAddLine,
  RiCloseLine,
  RiCursorLine,
  RiDraggable,
  RiFilter3Line,
  RiSearchLine,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Switch from '@/components/ui/switch';
import * as Table from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { getDataTabFields, chartTableExtraFieldKey } from '@/services/chatbot-chart-service';
import { cn } from '@/utils/cn';
import { formatDrillDownFilterLabel } from '@/utils/chart-drill-down-utils';

const NUMERIC_FIELDTYPES = new Set(['Int', 'Float', 'Currency', 'Percent', 'Duration']);

function isNumericField(fieldtype, sampleValue) {
  if (fieldtype && NUMERIC_FIELDTYPES.has(fieldtype)) return true;
  if (sampleValue == null || sampleValue === '') return false;
  const n = Number(sampleValue);
  return !Number.isNaN(n) && String(sampleValue).trim() !== '';
}

function compareRowValues(a, b, fieldtype) {
  const aEmpty = a == null || a === '';
  const bEmpty = b == null || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (isNumericField(fieldtype, a) && isNumericField(fieldtype, b)) {
    return Number(a) - Number(b);
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function mapDetailFieldsToColumns(fields) {
  return (fields ?? []).map((field) => ({
    id: field.fieldname,
    label: field.label || field.fieldname,
    fieldtype: field.fieldtype,
    pinned: false,
    visible: true,
    isCatalog: true,
  }));
}

function applyColumnOrder(columns, columnOrder) {
  if (!columnOrder?.length) return columns;
  const orderMap = new Map(columnOrder.map((id, index) => [id, index]));
  return [...columns].sort((a, b) => {
    const aIndex = orderMap.has(a.id) ? orderMap.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bIndex = orderMap.has(b.id) ? orderMap.get(b.id) : Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

function ColumnPickerItem({ column, onToggle }) {
  const canToggle = !column.pinned;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg p-1.5',
        column.visible ? 'bg-bg-weak-100' : 'pl-2',
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className='flex-1 text-left min-w-0'>
        <span className='text-paragraph-sm text-text-main-900'>{column.label}</span>
        {column.doctype && (
          <span className='ml-1.5 text-paragraph-xs text-text-soft-400'>({column.doctype})</span>
        )}
      </div>
      <Switch.Root
        checked={column.visible}
        disabled={!canToggle}
        onCheckedChange={() => canToggle && onToggle(column.id)}
        className={cn('h-5 w-8 shrink-0', !canToggle && 'opacity-50 cursor-not-allowed')}
      />
    </div>
  );
}

function SortableTableHead({ column, sortDirection, onSort, disabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Table.Head
      ref={setNodeRef}
      style={style}
      className={cn(
        'label-xsmall whitespace-nowrap text-text-sub-500',
        isDragging && 'z-10 bg-bg-white-0 shadow-sm',
      )}
    >
      <div className='flex items-center gap-1'>
        {!disabled ? (
          <button
            type='button'
            className='flex shrink-0 cursor-grab items-center justify-center text-text-soft-400 hover:text-text-strong-950 active:cursor-grabbing'
            aria-label={`Reorder ${column.label}`}
            {...attributes}
            {...listeners}
          >
            <RiDraggable className='size-3.5' />
          </button>
        ) : null}
        <span>{column.label}</span>
        <button
          type='button'
          className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
          onClick={() => onSort(column.id)}
          aria-label={`Sort by ${column.label}`}
        >
          {Table.getSortingIcon(sortDirection)}
        </button>
      </div>
    </Table.Head>
  );
}

export default function ChartDataTab({
  chartData,
  chatbotConfig,
  onRefreshChart,
  onFetchTableData,
  chartPreviewing,
  drillDownFilter = null,
  onClearDrillDown,
  editChartId = null,
}) {
  const [search, setSearch] = useState('');
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [sortState, setSortState] = useState(null);
  const [availableFields, setAvailableFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [visibleExtraFieldIds, setVisibleExtraFieldIds] = useState([]);
  const [hiddenColumnIds, setHiddenColumnIds] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [tableRows, setTableRows] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [catalogFields, setCatalogFields] = useState(null);
  const tableRequestRef = useRef(0);

  const baseRows = chartData?.raw_rows ?? chartData?.raw_data ?? [];
  const hasPreviewData = Array.isArray(baseRows) && baseRows.length > 0;

  const detailDoctype = useMemo(
    () => drillDownFilter?.yAxisDoctype || chatbotConfig?.y_axis?.doctype || null,
    [drillDownFilter, chatbotConfig],
  );

  const resetDrillDownTableState = useCallback(() => {
    setVisibleExtraFieldIds([]);
    setHiddenColumnIds([]);
    setColumnOrder([]);
    setSortState(null);
    setSearch('');
    setCatalogFields(null);
  }, []);

  useEffect(() => {
    if (!drillDownFilter) {
      setTableRows([]);
      resetDrillDownTableState();
    }
  }, [chartData, drillDownFilter, resetDrillDownTableState]);

  const buildTableExtraFields = useCallback(
    (extraFieldIds) =>
      extraFieldIds
        .map((id) => availableFields.find((field) => field.id === id))
        .filter(Boolean)
        .map((field) => ({
          doctype: field.doctype,
          fieldname: field.fieldname,
          label: field.label,
          fieldtype: field.fieldtype,
        })),
    [availableFields],
  );

  const loadTableRows = useCallback(
    async (extraFieldIds, activeDrillDown = drillDownFilter) => {
      if (!onFetchTableData || !activeDrillDown) return;

      const tableExtraFields = buildTableExtraFields(extraFieldIds);
      const requestId = ++tableRequestRef.current;

      setDataLoading(true);
      try {
        const result = await onFetchTableData(
          tableExtraFields.length > 0 ? tableExtraFields : null,
          activeDrillDown,
        );
        if (requestId !== tableRequestRef.current) return;
        if (result?.__isDetailRows) {
          const rows = Array.isArray(result.rows) ? result.rows : [];
          setTableRows(rows);
        } else {
          setTableRows(Array.isArray(result) ? result : []);
        }
      } catch (error) {
        if (requestId !== tableRequestRef.current) return;
        toast.error(error?.message || 'Failed to load table data');
      } finally {
        if (requestId === tableRequestRef.current) {
          setDataLoading(false);
        }
      }
    },
    [buildTableExtraFields, onFetchTableData, drillDownFilter],
  );

  useEffect(() => {
    if (!drillDownFilter || !onFetchTableData) return;

    let cancelled = false;
    resetDrillDownTableState();
    setDataLoading(true);

    onFetchTableData(null, drillDownFilter)
      .then((result) => {
        if (cancelled) return;
        if (result?.__isDetailRows) {
          const rows = Array.isArray(result.rows) ? result.rows : [];
          const fields = Array.isArray(result.fields) ? result.fields : null;
          setTableRows(rows);
          setCatalogFields(fields);
          if (fields?.length) {
            setColumnOrder(fields.map((field) => field.fieldname));
          }
        } else {
          setTableRows(Array.isArray(result) ? result : []);
          setCatalogFields(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(error?.message || 'Failed to load filtered data');
        setTableRows([]);
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillDownFilter, editChartId]);

  const loadAvailableFields = useCallback(async () => {
    if (!detailDoctype) {
      setAvailableFields([]);
      return;
    }

    setFieldsLoading(true);
    try {
      const fields = await getDataTabFields(detailDoctype).catch(() => []);
      const catalogIds = new Set((catalogFields ?? []).map((field) => field.fieldname));

      const merged = fields
        .filter((field) => !catalogIds.has(field.fieldname))
        .map((field) => ({
          id: chartTableExtraFieldKey(detailDoctype, field.fieldname),
          label: field.label || field.fieldname,
          doctype: detailDoctype,
          fieldname: field.fieldname,
          fieldtype: field.fieldtype,
          pinned: false,
        }));

      merged.sort((a, b) => a.label.localeCompare(b.label));
      setAvailableFields(merged);
    } finally {
      setFieldsLoading(false);
    }
  }, [detailDoctype, catalogFields]);

  useEffect(() => {
    if (drillDownFilter && catalogFields?.length) {
      loadAvailableFields();
    }
  }, [drillDownFilter, catalogFields, loadAvailableFields]);

  const catalogColumns = useMemo(() => mapDetailFieldsToColumns(catalogFields), [catalogFields]);

  const extraColumns = useMemo(
    () =>
      availableFields
        .filter((field) => visibleExtraFieldIds.includes(field.id))
        .map((field) => ({ ...field, visible: true, isCatalog: false })),
    [availableFields, visibleExtraFieldIds],
  );

  const allColumns = useMemo(
    () => [...catalogColumns, ...extraColumns],
    [catalogColumns, extraColumns],
  );

  const visibleColumns = useMemo(() => {
    const visible = allColumns.filter((column) => !hiddenColumnIds.includes(column.id));
    return applyColumnOrder(visible, columnOrder);
  }, [allColumns, hiddenColumnIds, columnOrder]);

  const pickerColumns = useMemo(() => {
    const catalog = catalogColumns.map((column) => ({
      ...column,
      visible: !hiddenColumnIds.includes(column.id),
    }));
    const optional = availableFields.map((field) => ({
      ...field,
      visible: visibleExtraFieldIds.includes(field.id),
    }));
    return [...catalog, ...optional];
  }, [catalogColumns, availableFields, hiddenColumnIds, visibleExtraFieldIds]);

  const filteredPickerColumns = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return pickerColumns;
    return pickerColumns.filter((col) => {
      const haystack = `${col.label ?? ''} ${col.doctype ?? ''} ${col.id}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [pickerColumns, pickerSearch]);

  const shownPickerColumns = filteredPickerColumns.filter((col) => col.visible);
  const hiddenPickerColumns = filteredPickerColumns.filter((col) => !col.visible);

  const handleToggleColumn = useCallback(
    async (columnId) => {
      const isCatalogColumn = catalogFields?.some((field) => field.fieldname === columnId);

      if (isCatalogColumn) {
        setHiddenColumnIds((prev) =>
          prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId],
        );
        return;
      }

      const isVisible = visibleExtraFieldIds.includes(columnId);
      const nextVisible = isVisible
        ? visibleExtraFieldIds.filter((id) => id !== columnId)
        : [...visibleExtraFieldIds, columnId];

      setVisibleExtraFieldIds(nextVisible);
      setColumnOrder((prev) => {
        if (isVisible) return prev.filter((id) => id !== columnId);
        return prev.includes(columnId) ? prev : [...prev, columnId];
      });

      await loadTableRows(nextVisible);
    },
    [visibleExtraFieldIds, loadTableRows, catalogFields],
  );

  const handleHideAllOptional = useCallback(async () => {
    setHiddenColumnIds(catalogColumns.map((column) => column.id));
    setVisibleExtraFieldIds([]);
    await loadTableRows([]);
  }, [catalogColumns, loadTableRows]);

  const handleShowAllOptional = useCallback(async () => {
    setHiddenColumnIds([]);
    const allIds = availableFields.map((field) => field.id);
    setVisibleExtraFieldIds(allIds);
    setColumnOrder((prev) => [...new Set([...prev, ...allIds])]);
    await loadTableRows(allIds);
  }, [availableFields, loadTableRows]);

  const handleSort = useCallback((columnId) => {
    setSortState((prev) => {
      if (prev?.id !== columnId) return { id: columnId, direction: 'asc' };
      if (prev.direction === 'asc') return { id: columnId, direction: 'desc' };
      return null;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleColumnDragEnd = useCallback(
    ({ active, over }) => {
      if (!over || active.id === over.id) return;
      setColumnOrder((prev) => {
        const currentOrder = prev.length > 0 ? prev : visibleColumns.map((column) => column.id);
        const oldIndex = currentOrder.indexOf(active.id);
        const newIndex = currentOrder.indexOf(over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(currentOrder, oldIndex, newIndex);
      });
    },
    [visibleColumns],
  );

  const filteredRows = useMemo(() => {
    if (!Array.isArray(tableRows) || tableRows.length === 0) return [];
    const q = search.trim().toLowerCase();
    let next = tableRows;

    if (q) {
      next = next.filter((row) =>
        visibleColumns.some((col) =>
          String(row?.[col.id] ?? '')
            .toLowerCase()
            .includes(q),
        ),
      );
    }

    if (sortState?.id) {
      const column = visibleColumns.find((col) => col.id === sortState.id);
      const direction = sortState.direction === 'asc' ? 1 : -1;
      next = [...next].sort(
        (a, b) =>
          direction * compareRowValues(a?.[sortState.id], b?.[sortState.id], column?.fieldtype),
      );
    }

    return next;
  }, [tableRows, search, sortState, visibleColumns]);

  const drillDownLabel = useMemo(
    () => formatDrillDownFilterLabel(drillDownFilter),
    [drillDownFilter],
  );

  const handleClearDrillDownFilter = useCallback(() => {
    onClearDrillDown?.();
    setTableRows([]);
    resetDrillDownTableState();
  }, [onClearDrillDown, resetDrillDownTableState]);

  const isLoading = chartPreviewing || dataLoading;
  const rowDisplayLimit = 500;

  if (!drillDownFilter) {
    if (!hasPreviewData) {
      return (
        <div className='flex flex-col gap-4 px-5 py-6'>
          <p className='paragraph-small text-text-soft-400'>
            No data yet — configure axes and run a preview to see rows here.
          </p>
          <Button.Root
            size='xsmall'
            variant='neutral'
            mode='stroke'
            className='self-start'
            onClick={onRefreshChart}
            disabled={chartPreviewing}
          >
            {chartPreviewing ? 'Loading…' : 'Run preview'}
          </Button.Root>
        </div>
      );
    }

    return (
      <div className='flex flex-col items-center justify-center gap-3 px-6 py-16 text-center'>
        <div className='flex size-12 items-center justify-center rounded-full bg-bg-weak-100 text-text-soft-400'>
          <RiCursorLine className='size-6' aria-hidden />
        </div>
        <div className='max-w-xs space-y-1'>
          <p className='text-paragraph-sm font-medium text-text-strong-950'>
            Select a chart segment to view data
          </p>
          <p className='text-paragraph-sm text-text-soft-400'>
            Click any portion of the chart to load the filtered records for that segment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4 px-6 py-5'>
      <div className='flex items-center gap-2 rounded-lg border border-primary-base/20 bg-primary-alpha-10 px-3 py-2'>
        <RiFilter3Line className='size-4 shrink-0 text-primary-base' aria-hidden />
        <div className='min-w-0 flex-1'>
          <p className='text-subheading-2xs uppercase text-primary-base'>Filtered view</p>
          <p className='truncate text-paragraph-sm text-text-strong-950'>{drillDownLabel}</p>
        </div>
        <Button.Root
          size='xsmall'
          variant='neutral'
          mode='stroke'
          className='shrink-0 gap-1'
          onClick={handleClearDrillDownFilter}
          disabled={isLoading}
        >
          <Button.Icon as={RiCloseLine} />
          Clear
        </Button.Root>
      </div>

      <div className='flex items-center gap-2'>
        <Input.Root size='small' className='flex-1'>
          <Input.Wrapper>
            <Input.Icon as={RiSearchLine} />
            <Input.Input
              placeholder='Search data…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Input.Wrapper>
        </Input.Root>
        <Button.Root
          size='xsmall'
          variant='primary'
          mode='stroke'
          className='gap-1 shrink-0'
          disabled
        >
          <Button.Icon as={RiFilter3Line} />
          Filtered
        </Button.Root>
      </div>

      <div className='overflow-x-auto rounded-lg border border-stroke-soft-200'>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleColumnDragEnd}
        >
          <Table.Root variant='compact' className='min-w-full'>
            <Table.Header>
              <Table.Row>
                <SortableContext
                  items={visibleColumns.map((column) => column.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {visibleColumns.map((column) => {
                    const sortDirection =
                      sortState?.id === column.id ? sortState.direction : undefined;

                    return (
                      <SortableTableHead
                        key={column.id}
                        column={column}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        disabled={isLoading}
                      />
                    );
                  })}
                </SortableContext>

                <Table.Head className='w-10 px-2'>
                  <Popover.Root
                    open={columnPickerOpen}
                    onOpenChange={(open) => {
                      setColumnPickerOpen(open);
                      if (open) loadAvailableFields();
                      else setPickerSearch('');
                    }}
                    modal={false}
                  >
                    <Popover.Trigger asChild>
                      <button
                        type='button'
                        className='flex size-6 items-center justify-center rounded-md text-text-sub-500 hover:bg-bg-weak-100 hover:text-text-strong-950'
                        aria-label='Add columns'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RiAddLine className='size-4' />
                      </button>
                    </Popover.Trigger>
                    <Popover.Content
                      align='end'
                      side='bottom'
                      sideOffset={6}
                      showArrow={false}
                      collisionPadding={12}
                      className='w-[340px] !z-[300] !p-0 overflow-hidden rounded-2xl shadow-regular-lg'
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className='p-2 shrink-0'>
                        <Input.Root size='small' className='w-full'>
                          <Input.Wrapper>
                            <Input.Icon as={RiSearchLine} />
                            <Input.Input
                              placeholder='Search…'
                              value={pickerSearch}
                              onChange={(e) => setPickerSearch(e.target.value)}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>

                      <div className='h-px bg-stroke-soft-200 shrink-0' />

                      <div className='max-h-[280px] overflow-y-auto p-2'>
                        {fieldsLoading ? (
                          <p className='py-6 text-center text-paragraph-sm text-text-soft-400'>
                            Loading fields…
                          </p>
                        ) : !detailDoctype ? (
                          <p className='py-6 text-center text-paragraph-sm text-text-soft-400'>
                            Configure axes to browse fields.
                          </p>
                        ) : filteredPickerColumns.length === 0 ? (
                          <p className='py-6 text-center text-paragraph-sm text-text-soft-400'>
                            No fields found
                          </p>
                        ) : (
                          <div className='flex flex-col gap-2'>
                            {shownPickerColumns.length > 0 && (
                              <div className='flex flex-col gap-1'>
                                <div className='flex items-center justify-between px-2 py-0.5'>
                                  <p className='text-subheading-2xs uppercase text-text-soft-400'>
                                    Shown
                                  </p>
                                  {shownPickerColumns.length > 0 && (
                                    <Button.Root
                                      type='button'
                                      variant='primary'
                                      mode='ghost'
                                      size='xsmall'
                                      className='px-2 text-xs text-primary-base'
                                      onClick={handleHideAllOptional}
                                    >
                                      Hide All
                                    </Button.Root>
                                  )}
                                </div>
                                {shownPickerColumns.map((column) => (
                                  <ColumnPickerItem
                                    key={column.id}
                                    column={column}
                                    onToggle={handleToggleColumn}
                                  />
                                ))}
                              </div>
                            )}

                            {hiddenPickerColumns.length > 0 && (
                              <div className='flex flex-col gap-1 pt-1'>
                                <div className='flex items-center justify-between px-2 py-0.5'>
                                  <p className='text-subheading-2xs uppercase text-text-soft-400'>
                                    Hidden
                                  </p>
                                  <Button.Root
                                    type='button'
                                    variant='primary'
                                    mode='ghost'
                                    size='xsmall'
                                    className='px-2 text-xs text-primary-base'
                                    onClick={handleShowAllOptional}
                                  >
                                    Show All
                                  </Button.Root>
                                </div>
                                {hiddenPickerColumns.map((column) => (
                                  <ColumnPickerItem
                                    key={column.id}
                                    column={column}
                                    onToggle={handleToggleColumn}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Popover.Content>
                  </Popover.Root>
                </Table.Head>
              </Table.Row>
            </Table.Header>

            <Table.Body spacing={0}>
              {isLoading && filteredRows.length === 0 ? (
                <Table.Row>
                  <Table.Cell
                    colSpan={Math.max(visibleColumns.length + 1, 1)}
                    className='py-8 text-center paragraph-small text-text-soft-400'
                  >
                    Loading filtered data…
                  </Table.Cell>
                </Table.Row>
              ) : (
                filteredRows.slice(0, rowDisplayLimit).map((row, i) => (
                  <Table.Row key={i} className='border-t border-stroke-soft-200'>
                    {visibleColumns.map((column) => (
                      <Table.Cell
                        key={column.id}
                        className='paragraph-small text-text-strong-950 whitespace-nowrap'
                      >
                        {String(row[column.id] ?? '')}
                      </Table.Cell>
                    ))}
                    <Table.Cell className='w-10 px-2' aria-hidden />
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
        </DndContext>
      </div>

      {filteredRows.length > rowDisplayLimit && (
        <p className='paragraph-xsmall text-text-soft-400'>
          Showing first {rowDisplayLimit} of {filteredRows.length} rows
        </p>
      )}
      {search && filteredRows.length === 0 && !isLoading && (
        <p className='paragraph-xsmall text-text-soft-400'>No rows match your search.</p>
      )}
      {filteredRows.length === 0 && !search && !isLoading && (
        <p className='paragraph-xsmall text-text-soft-400'>
          No rows match the selected chart segment.
        </p>
      )}
    </div>
  );
}
