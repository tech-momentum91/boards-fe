import React, { useEffect, useRef, useState } from 'react';
import {
  RiArrowLeftLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiFunctionLine,
  RiSearchLine,
} from 'react-icons/ri';

import * as Popover from '@/components/ui/popover';
import * as Label from '@/components/ui/label';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { FORMULA_SENTINEL, isFormulaSentinel } from '@/utils/formula-builder-utils';
import {
  getDefaultTimeBucket,
  getValidTimeBucketOptions,
  isDatetimeAxisField,
} from '@/services/chatbot-chart-service';
import { useDoctypeAxisPicker } from '../chart-builder-hooks';
import SectionCard from './section-card';

// ─── Aggregation chips ────────────────────────────────────────────────────────

const AGG_OPTIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
  { value: 'count', label: 'Count' },
];

function AggChip({ label, active, onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'h-[22px] shrink-0 rounded-md px-2 py-1 label-xsmall transition-colors',
        active
          ? 'bg-primary-base text-static-white'
          : 'bg-bg-soft-200 text-text-sub-500 hover:bg-bg-weak-100',
      )}
    >
      {label}
    </button>
  );
}

function AggregationChips({ value, options, onChange }) {
  return (
    <div className='flex flex-wrap gap-1'>
      {options.map((opt) => (
        <AggChip
          key={opt.value}
          label={opt.label}
          active={value === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
}

// ─── DoctypeFieldPicker ───────────────────────────────────────────────────────

/**
 * Two-step axis field picker.
 *
 * Panel 1 — Doctype list: shows registered doctypes with field count badges.
 * Panel 2 — Field list:   shown after the user clicks a doctype row.
 *
 * Search works across both doctype names and field labels.
 */
function FormulaOptionRow({ disabled, tooltip, selected, onSelect }) {
  const row = (
    <button
      type='button'
      disabled={disabled}
      onClick={() => {
        if (!disabled) onSelect?.();
      }}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-bg-soft-200',
        selected && !disabled && 'bg-primary-lighter',
      )}
    >
      <span
        className={cn(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-md',
          disabled ? 'bg-bg-soft-200 text-text-soft-400' : 'bg-primary-alpha-10 text-primary-base',
        )}
      >
        <RiFunctionLine className='size-3.5' />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block truncate paragraph-small text-text-strong-950'>
          Formula (from Formula Builder)
        </span>
        <span className='block truncate label-xsmall text-text-soft-400'>
          Derived measure built from aggregations
        </span>
      </span>
      {selected ? <RiCheckLine className='size-4 shrink-0 text-primary-base' /> : null}
    </button>
  );

  if (!tooltip) return row;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className='block w-full'>{row}</span>
      </Tooltip.Trigger>
      <Tooltip.Content size='xsmall' variant='dark'>
        {tooltip}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

function DoctypeFieldPicker({
  axisType,
  chartType,
  value,
  onChange,
  placeholder,
  required,
  formulaIsActive = false,
  showFormulaOption = false,
  scopeDoctype = null,
  disabled = false,
  disabledReason = null,
}) {
  const [open, setOpen] = useState(false);
  const [activeDt, setActiveDt] = useState(null); // doctype currently drilled into
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  const { doctypes, doctypesLoading, fields, fieldsLoading, loadFieldsForDoctype } =
    useDoctypeAxisPicker(chartType, axisType, scopeDoctype);

  // Auto-focus search when popover opens; auto-drill when scoped to a single doctype.
  useEffect(() => {
    if (open) {
      if (scopeDoctype) {
        setActiveDt(scopeDoctype);
      }
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch('');
      setActiveDt(null);
    }
  }, [open, scopeDoctype]);

  // When activeDt changes, kick off field loading.
  useEffect(() => {
    loadFieldsForDoctype(activeDt);
  }, [activeDt, loadFieldsForDoctype]);

  const q = search.trim().toLowerCase();

  // ── Doctype panel ──────────────────────────────────────────────────────────

  // When searching, also check if the query matches field names in any doctype
  // so we can show matched doctypes with a visual hint.
  const filteredDoctypes = doctypes.filter(
    (dt) => !q || dt.label.toLowerCase().includes(q) || dt.doctype.toLowerCase().includes(q),
  );

  // ── Field panel ────────────────────────────────────────────────────────────

  const filteredFields = fields.filter(
    (f) =>
      !q ||
      (f.label || '').toLowerCase().includes(q) ||
      (f.fieldname || '').toLowerCase().includes(q),
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleDoctypeClick(dt) {
    setActiveDt(dt.doctype);
    setSearch('');
  }

  function handleFieldClick(field) {
    onChange(field);
    setOpen(false);
  }

  function handleBack() {
    setActiveDt(null);
    setSearch('');
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  // ── Trigger label ──────────────────────────────────────────────────────────

  const isFormulaSelected = isFormulaSentinel(value);

  const triggerLabel = isFormulaSelected
    ? 'Formula (from Formula Builder)'
    : value
      ? value.label || value.fieldname || 'Selected'
      : null;

  const triggerDoctype = isFormulaSelected ? null : value?.doctype || null;

  return (
    <Popover.Root open={open && !disabled} onOpenChange={(next) => !disabled && setOpen(next)}>
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          title={disabled ? disabledReason || undefined : undefined}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-lg border px-3 text-left transition-colors',
            'border-stroke-soft-200 bg-bg-white-0 hover:border-stroke-strong-950',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base',
            open && !disabled && 'border-primary-base ring-2 ring-primary-base',
            (!value || disabled) && 'text-text-soft-400',
            disabled && 'cursor-not-allowed opacity-60 hover:border-stroke-soft-200',
          )}
        >
          <span className='min-w-0 flex-1 truncate paragraph-small'>
            {triggerLabel ? (
              <span>
                <span className='text-text-strong-950'>{triggerLabel}</span>
                {triggerDoctype && (
                  <span className='ml-1.5 text-text-soft-400 text-xs'>· {triggerDoctype}</span>
                )}
              </span>
            ) : (
              <span className='text-text-soft-400'>
                {disabled && disabledReason ? disabledReason : placeholder}
              </span>
            )}
          </span>
          <RiArrowRightSLine
            className={cn(
              'ml-2 size-4 shrink-0 text-text-soft-400 transition-transform',
              open && 'rotate-90',
            )}
          />
        </button>
      </Popover.Trigger>

      <Popover.Content
        align='start'
        sideOffset={6}
        showArrow={false}
        className='w-[380px] !p-0 overflow-hidden !z-[300]'
      >
        {/* Search bar */}
        <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-3 py-2'>
          {activeDt && (
            <button
              type='button'
              onClick={handleBack}
              className='flex size-7 shrink-0 items-center justify-center rounded-md text-text-sub-500 hover:bg-bg-soft-200 transition-colors'
              aria-label='Back to doctypes'
            >
              <RiArrowLeftLine className='size-4' />
            </button>
          )}
          <div className='flex flex-1 items-center gap-2'>
            <RiSearchLine className='size-4 shrink-0 text-text-soft-400' />
            <input
              ref={searchRef}
              type='text'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeDt ? `Search in ${activeDt}…` : 'Search doctypes or fields…'}
              className='flex-1 bg-transparent paragraph-small text-text-strong-950 placeholder:text-text-soft-400 outline-none'
            />
            {search && (
              <button
                type='button'
                onClick={() => setSearch('')}
                className='text-xs text-text-soft-400 hover:text-text-sub-500'
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Panel body */}
        <div className='max-h-[320px] overflow-y-auto'>
          {activeDt ? (
            /* ── Field list ── */
            fieldsLoading ? (
              <PickerSkeleton rows={5} />
            ) : filteredFields.length === 0 ? (
              <EmptyState message={q ? 'No matching fields' : 'No fields available'} />
            ) : (
              <ul role='listbox'>
                {filteredFields.map((field) => {
                  const isSelected = value?.value === field.value;
                  return (
                    <li key={field.value} role='option' aria-selected={isSelected}>
                      <button
                        type='button'
                        onClick={() => handleFieldClick(field)}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          'hover:bg-bg-soft-200',
                          isSelected && 'bg-primary-lighter',
                        )}
                      >
                        <RiCheckLine
                          className={cn(
                            'size-4 shrink-0',
                            isSelected ? 'text-primary-base' : 'text-transparent',
                          )}
                        />
                        <span className='min-w-0 flex-1'>
                          <span className='block truncate paragraph-small text-text-strong-950'>
                            {field.label || field.fieldname}
                          </span>
                          {field.fieldtype && (
                            <span className='block truncate label-xsmall text-text-soft-400'>
                              {field.fieldtype}
                              {field.is_formula && ' · Formula'}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : /* ── Doctype list ── */
          doctypesLoading ? (
            <PickerSkeleton rows={6} />
          ) : filteredDoctypes.length === 0 ? (
            <EmptyState
              message={
                q
                  ? 'No matching doctypes — try a field name instead'
                  : 'No registered doctypes found. Run the registry sync first.'
              }
            />
          ) : (
            <ul role='listbox'>
              {showFormulaOption ? (
                <li role='option' aria-selected={isFormulaSelected}>
                  <FormulaOptionRow
                    disabled={axisType === 'x' || !formulaIsActive}
                    tooltip={
                      axisType === 'x'
                        ? 'Formulas can only be used as a Y-axis measure'
                        : !formulaIsActive
                          ? 'Build a formula first'
                          : null
                    }
                    selected={isFormulaSelected}
                    onSelect={() => {
                      onChange(FORMULA_SENTINEL);
                      setOpen(false);
                    }}
                  />
                </li>
              ) : null}
              {filteredDoctypes.map((dt) => {
                const hasSelectedField = value?.doctype === dt.doctype;
                return (
                  <li key={dt.doctype} role='option' aria-selected={hasSelectedField}>
                    <button
                      type='button'
                      onClick={() => handleDoctypeClick(dt)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        'hover:bg-bg-soft-200',
                        hasSelectedField && 'bg-primary-lighter',
                      )}
                    >
                      {/* Active indicator */}
                      <span
                        className={cn(
                          'size-2 shrink-0 rounded-full',
                          hasSelectedField ? 'bg-primary-base' : 'bg-transparent',
                        )}
                      />
                      {/* DocType name */}
                      <span className='min-w-0 flex-1 truncate paragraph-small text-text-strong-950'>
                        {dt.label || dt.doctype}
                      </span>
                      {/* Field count badge */}
                      <span className='shrink-0 rounded-md bg-bg-soft-200 px-1.5 py-0.5 label-xsmall text-text-sub-500'>
                        {dt.field_count}
                      </span>
                      <RiArrowRightSLine className='size-4 shrink-0 text-text-soft-400' />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Clear selection footer */}
        {value && (
          <div className='border-t border-stroke-soft-200 px-4 py-2'>
            <button
              type='button'
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className='paragraph-xsmall text-text-sub-500 hover:text-error-base transition-colors'
            >
              Clear selection
            </button>
          </div>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}

// ── Minor UI helpers ──────────────────────────────────────────────────────────

function PickerSkeleton({ rows = 4 }) {
  return (
    <div className='flex flex-col gap-0'>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-2.5'>
          <div className='size-2 shrink-0 rounded-full bg-bg-soft-200 animate-pulse' />
          <div className='h-3.5 flex-1 rounded bg-bg-soft-200 animate-pulse' />
          <div className='h-3.5 w-6 rounded bg-bg-soft-200 animate-pulse' />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className='px-4 py-6 text-center'>
      <p className='paragraph-small text-text-soft-400'>{message}</p>
    </div>
  );
}

// ─── AxisMappingSection ───────────────────────────────────────────────────────

function isCategoryAxisChart(chartType) {
  const type = (chartType || '').toLowerCase();
  return type === 'pie' || type === 'donut' || type === 'battery';
}

function isLineChart(chartType) {
  return (chartType || '').toLowerCase() === 'line';
}

/**
 * Axis configuration section inside the chart builder.
 *
 * Renders one DoctypeFieldPicker for X-axis, one for Y-axis (with aggregation
 * chips), and one for Group By — all using the two-step doctype→field flow.
 */
export default function AxisMappingSection({
  chartTypeMeta,
  chartType,
  xValue,
  xTimeBucket,
  yValue,
  yAggregation,
  groupByValue,
  formulaIsActive = false,
  onXChange,
  onXTimeBucketChange,
  onYChange,
  onGroupByChange,
}) {
  const supportsX = chartTypeMeta?.requires_x_axis !== false;
  const supportsGroup = chartTypeMeta?.supports_grouping !== false;
  const categoryAxisChart = isCategoryAxisChart(chartType);
  const lineChart = isLineChart(chartType);
  const xAxisLabel = categoryAxisChart ? 'Category' : 'Dimension';
  const yAxisLabel = categoryAxisChart ? 'Value' : 'Measure';
  const groupScopeDoctype = lineChart && xValue?.doctype ? xValue.doctype : null;
  const groupByDisabled = lineChart && !xValue?.doctype;

  const currentYValidAggs = yValue?.valid_aggregations ?? AGG_OPTIONS.map((o) => o.value);
  const aggOptions = AGG_OPTIONS.filter((o) => currentYValidAggs.includes(o.value));

  const showTimeBucketOptions = supportsX && isDatetimeAxisField(xValue);
  const timeBucketOptions = showTimeBucketOptions ? getValidTimeBucketOptions(xValue) : [];
  const activeTimeBucket = xTimeBucket || getDefaultTimeBucket(xValue);
  const yUsesFormula = isFormulaSentinel(yValue);

  return (
    <Tooltip.Provider delayDuration={150}>
      <SectionCard title='Axis Mapping' defaultOpen>
        {supportsX && (
          <div className='flex flex-col gap-3'>
            <p className='label-small text-text-soft-400'>
              {categoryAxisChart ? 'Category Mapping' : 'X Axis Mapping'}
            </p>
            <div className='flex flex-col gap-1'>
              <Label.Root>{xAxisLabel}</Label.Root>
              <DoctypeFieldPicker
                axisType='x'
                chartType={chartType}
                value={xValue}
                onChange={onXChange}
                placeholder={categoryAxisChart ? 'e.g. Status, Priority' : 'Choose X-axis field'}
                showFormulaOption
              />
              {categoryAxisChart && !xValue && (
                <p className='paragraph-xsmall text-text-soft-400'>
                  Each distinct value becomes a colored segment (e.g. Status → Open, Resolved…)
                </p>
              )}
            </div>

            {showTimeBucketOptions && (
              <div className='flex flex-col gap-1.5'>
                <Label.Root>
                  Group By Period
                  <Label.Asterisk />
                </Label.Root>
                <AggregationChips
                  value={activeTimeBucket}
                  options={timeBucketOptions}
                  onChange={onXTimeBucketChange}
                />
              </div>
            )}
          </div>
        )}

        <div className='flex flex-col gap-3'>
          <p className='label-small text-text-soft-400'>
            {categoryAxisChart ? 'Value Mapping' : 'Y Axis Mapping'}
          </p>
          <div className='flex flex-col gap-1'>
            <Label.Root>
              {yAxisLabel}
              <Label.Asterisk />
            </Label.Root>
            <DoctypeFieldPicker
              axisType='y'
              chartType={chartType}
              value={yValue}
              onChange={(option) => onYChange({ option })}
              placeholder={
                categoryAxisChart ? 'Choose field to count / sum' : 'Choose Y-axis measure'
              }
              required
              formulaIsActive={formulaIsActive}
              showFormulaOption
            />
          </div>

          {!yUsesFormula ? (
            <div className='flex flex-col gap-1.5'>
              <Label.Root>
                Aggregation
                <Label.Asterisk />
              </Label.Root>
              <AggregationChips
                value={yAggregation}
                options={aggOptions}
                onChange={(v) => onYChange({ aggregation: v })}
              />
            </div>
          ) : (
            <p className='paragraph-xsmall text-text-soft-400'>
              Aggregation is defined inside the formula expression.
            </p>
          )}
        </div>

        {supportsGroup && (
          <div className='flex flex-col gap-1'>
            <Label.Root>Group By</Label.Root>
            <DoctypeFieldPicker
              axisType='group'
              chartType={chartType}
              value={groupByValue}
              onChange={onGroupByChange}
              placeholder='None (optional)'
              scopeDoctype={groupScopeDoctype}
              disabled={groupByDisabled}
              disabledReason='Choose an X-axis field first'
            />
            {lineChart && xValue?.doctype ? (
              <p className='paragraph-xsmall text-text-soft-400'>
                Group by dimensions from {xValue.doctype} (e.g. center, client) while X stays on
                time.
              </p>
            ) : null}
          </div>
        )}
      </SectionCard>
    </Tooltip.Provider>
  );
}

export { FORMULA_SENTINEL };
