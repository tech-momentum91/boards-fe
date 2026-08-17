import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import {
  RiCloseLine,
  RiFireLine,
  RiFlowChart,
  RiMoreLine,
  RiSearchLine,
  RiUserLine,
  RiUserSharedLine,
} from 'react-icons/ri';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { CityCombobox } from '@/components/crm-leads/city-combobox';
import {
  LEAD_TEMPERATURE_COLORS,
  LEAD_TEMPERATURE_ICONS,
  LEAD_TEMPERATURE_OPTIONS,
} from '@/components/crm-leads/constants';
import { LeadPipelineEditPopover } from '@/components/crm-leads/lead-pipeline-edit-popover';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

const BarButton = forwardRef(
  ({ icon: Icon, label, danger = false, className, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type='button'
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition',
          danger
            ? 'text-red-400 hover:bg-red-500/15 hover:text-red-300'
            : 'text-white/80 hover:bg-white/10 hover:text-white',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
        {...rest}
      >
        {Icon ? <Icon size={16} className='shrink-0' /> : null}
        {label ? <span className='whitespace-nowrap'>{label}</span> : null}
      </button>
    );
  },
);

BarButton.displayName = 'BarButton';

function BarDivider() {
  return <span className='mx-1 h-5 w-px shrink-0 bg-white/15' />;
}

const ownerOptionGetValue = (opt) => opt?.value ?? opt?.email ?? '';
const ownerOptionGetLabel = (opt) => opt?.label ?? opt?.name ?? ownerOptionGetValue(opt) ?? '—';

function FilterableOptionList({
  options = [],
  getOptionValue = (opt) => opt?.value ?? '',
  getOptionLabel = (opt) => opt?.label ?? String(opt?.value ?? ''),
  renderOptionLabel,
  allowClear = true,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options available',
  onSelect,
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const base = Array.isArray(options) ? options : [];
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((opt) => getOptionLabel(opt).toLowerCase().includes(q));
  }, [options, query, getOptionLabel]);

  return (
    <div className='flex w-64 flex-col'>
      <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-2 py-2'>
        <RiSearchLine size={16} className='shrink-0 text-text-soft-400' aria-hidden />
        <input
          type='text'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className='w-full bg-transparent text-sm text-text-main-900 outline-none placeholder:text-text-soft-400'
          autoFocus
        />
      </div>
      <div className='max-h-64 overflow-y-auto p-1'>
        {allowClear ? (
          <button
            type='button'
            onClick={() => onSelect?.('')}
            className='w-full rounded-lg px-2 py-2 text-left text-sm text-text-sub-500 transition hover:bg-bg-weak-50'
          >
            Clear
          </button>
        ) : null}
        {filtered.length === 0 ? (
          <div className='px-2 py-2 text-sm text-text-soft-400'>{emptyMessage}</div>
        ) : (
          filtered.map((opt) => {
            const value = String(getOptionValue(opt) ?? '');
            if (!value) return null;
            return (
              <button
                key={value}
                type='button'
                onClick={() => onSelect?.(value)}
                className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-text-main-900 transition hover:bg-bg-weak-50'
              >
                {renderOptionLabel ? renderOptionLabel(opt) : getOptionLabel(opt)}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function OptionListPopover({
  icon,
  label,
  options = [],
  getOptionValue,
  getOptionLabel,
  renderOptionLabel,
  allowClear = true,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options available',
  onApply,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <BarButton icon={icon} label={label} disabled={disabled} />
      </Popover.Trigger>
      <Popover.Content side='top' align='start' showArrow={false} className='w-auto p-0'>
        {open ? (
          <FilterableOptionList
            options={options}
            getOptionValue={getOptionValue}
            getOptionLabel={getOptionLabel}
            renderOptionLabel={renderOptionLabel}
            allowClear={allowClear}
            searchPlaceholder={searchPlaceholder}
            emptyMessage={emptyMessage}
            onSelect={(value) => {
              onApply?.(value);
              setOpen(false);
            }}
          />
        ) : null}
      </Popover.Content>
    </Popover.Root>
  );
}

function TemperaturePopover({ onApply, disabled = false }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <BarButton icon={RiFireLine} label='Temperature' disabled={disabled} />
      </Popover.Trigger>
      <Popover.Content side='top' align='start' showArrow={false} className='w-48 p-1'>
        <button
          type='button'
          onClick={() => {
            onApply?.('');
            setOpen(false);
          }}
          className='w-full rounded-lg px-2 py-2 text-left text-sm text-text-sub-500 transition hover:bg-bg-weak-50'
        >
          Clear
        </button>
        {LEAD_TEMPERATURE_OPTIONS.map((opt) => {
          const Icon = LEAD_TEMPERATURE_ICONS[opt.value];
          const color = LEAD_TEMPERATURE_COLORS[opt.value];
          return (
            <button
              key={opt.value}
              type='button'
              onClick={() => {
                onApply?.(opt.value);
                setOpen(false);
              }}
              className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-bg-weak-50'
            >
              <span
                className='inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-paragraph-xs font-medium'
                style={{
                  backgroundColor: `${color}20`,
                  borderColor: `${color}60`,
                  color,
                }}
              >
                {Icon ? <Icon className='size-3.5 shrink-0' aria-hidden /> : null}
                {opt.label}
              </span>
            </button>
          );
        })}
      </Popover.Content>
    </Popover.Root>
  );
}

function PipelinePopover({
  pipelineOptions = [],
  stageOptions = [],
  statusOptions = [],
  stageStatusMap = {},
  stageColorMap = {},
  pipelineValue = '',
  stageValue = '',
  statusValue = '',
  ensureStagesForPipeline,
  onApply,
  disabled = false,
}) {
  return (
    <LeadPipelineEditPopover
      showPipeline
      side='top'
      pipelineValue={pipelineValue}
      stageValue={stageValue}
      statusValue={statusValue}
      pipelineOptions={pipelineOptions}
      stageOptions={stageOptions}
      statusOptions={statusOptions}
      stageStatusMap={stageStatusMap}
      stageColorMap={stageColorMap}
      ensureStagesForPipeline={ensureStagesForPipeline}
      onCommit={(payload) => {
        if (disabled) return;
        const pipeline = String(payload?.pipeline ?? '').trim();
        const stage = String(payload?.lifecycle_stage ?? '').trim();
        const status = String(payload?.life_cycle_stage_status ?? '').trim();
        if (!pipeline || !stage || !status) return;
        onApply?.(payload);
      }}
      renderTriggerContent={() => (
        <span
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition',
            disabled
              ? 'pointer-events-none opacity-50 text-white/80'
              : 'text-white/80 hover:bg-white/10 hover:text-white',
          )}
        >
          <RiFlowChart size={16} className='shrink-0' />
          <span className='whitespace-nowrap'>Pipeline</span>
        </span>
      )}
    />
  );
}

function MorePopover({
  leadOptions = {},
  pipelineScopedOptions = {},
  onApplyField,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(null);

  useEffect(() => {
    if (!open) setActiveKey(null);
  }, [open]);

  const fields = useMemo(
    () => [
      {
        key: 'product',
        label: 'Product',
        options: pipelineScopedOptions.product ?? leadOptions.product ?? [],
      },
      {
        key: 'lead_source',
        label: 'Lead Source',
        options: leadOptions.lead_source ?? [],
      },
      {
        key: 'lead_size',
        label: 'Lead Size',
        options: pipelineScopedOptions.lead_size ?? leadOptions.lead_size ?? [],
      },
      {
        key: 'need_urgency',
        label: 'Need Urgency',
        options: leadOptions.need_urgency ?? [],
      },
      {
        key: 'lead_relevance',
        label: 'Lead Relevance',
        options: pipelineScopedOptions.lead_relevance ?? leadOptions.lead_relevance ?? [],
      },
      {
        key: 'info_call_status',
        label: 'Info Call Status',
        options: leadOptions.info_call_status ?? [],
      },
      {
        key: 'lost_cause',
        label: 'Drop Reason',
        options: pipelineScopedOptions.lost_reason ?? leadOptions.lost_reason ?? [],
      },
      {
        key: 'city',
        label: 'City',
        options: null,
      },
    ],
    [leadOptions, pipelineScopedOptions],
  );

  const activeField = fields.find((field) => field.key === activeKey);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <BarButton icon={RiMoreLine} label='More' disabled={disabled} />
      </Popover.Trigger>
      <Popover.Content side='top' align='end' showArrow={false} className='w-auto p-1'>
        {activeField ? (
          <div className='flex flex-col gap-1'>
            <button
              type='button'
              onClick={() => setActiveKey(null)}
              className='self-start px-2 py-1 text-xs font-medium text-text-sub-500 hover:text-text-main-900'
            >
              Back
            </button>
            <div className='px-2 text-xs font-medium text-text-soft-400'>{activeField.label}</div>
            {activeField.key === 'city' ? (
              <div className='w-64 p-2'>
                <CityCombobox
                  value=''
                  onChange={(next) => {
                    onApplyField?.('city', next ?? '');
                    setActiveKey(null);
                    setOpen(false);
                  }}
                />
                <button
                  type='button'
                  onClick={() => {
                    onApplyField?.('city', '');
                    setActiveKey(null);
                    setOpen(false);
                  }}
                  className='mt-2 w-full rounded-lg px-2 py-1.5 text-left text-sm text-text-sub-500 transition hover:bg-bg-weak-50'
                >
                  Clear city
                </button>
              </div>
            ) : (
              <FilterableOptionList
                options={activeField.options || []}
                searchPlaceholder={`Search ${activeField.label.toLowerCase()}...`}
                onSelect={(value) => {
                  onApplyField?.(activeField.key, value);
                  setActiveKey(null);
                  setOpen(false);
                }}
              />
            )}
          </div>
        ) : (
          <div className='flex w-56 flex-col gap-0.5'>
            <div className='px-2 py-1.5 text-xs font-medium uppercase tracking-[0.48px] text-text-soft-400'>
              Update fields
            </div>
            {fields.map((field) => (
              <button
                key={field.key}
                type='button'
                onClick={() => setActiveKey(field.key)}
                className='flex w-full items-center rounded-lg px-2 py-2 text-left text-sm text-text-main-900 transition hover:bg-bg-weak-50'
              >
                {field.label}
              </button>
            ))}
          </div>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}

/**
 * Fixed bottom bar for multi-selected CRM leads (boards-style).
 */
export default function CrmLeadsBulkActionsBar({
  selectedCount = 0,
  leadOptions = {},
  pipelineScopedOptions = {},
  stageOptions = [],
  statusOptions = [],
  stageStatusMap = {},
  stageColorMap = {},
  defaultPipelineId = '',
  defaultStageId = '',
  defaultStatusId = '',
  ensureStagesForPipeline,
  onClear,
  onApplyField,
  onApplyPipeline,
  disabled = false,
}) {
  if (!selectedCount) return null;

  const salesOwnerOptions = Array.isArray(leadOptions.sales_owner) ? leadOptions.sales_owner : [];
  const insideSalesOptions = Array.isArray(leadOptions.inside_sales)
    ? leadOptions.inside_sales
    : [];
  const pipelineOptions = Array.isArray(leadOptions.pipelines) ? leadOptions.pipelines : [];

  return (
    <div className='pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4'>
      <div className='pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-bg-strong-950 px-2 py-2 text-text-white-0 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.4)] ring-1 ring-white/10'>
        <div className='flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-sm font-medium'>
          <span className='whitespace-nowrap'>
            {selectedCount} {selectedCount === 1 ? 'Lead' : 'Leads'} selected
          </span>
          <button
            type='button'
            onClick={onClear}
            aria-label='Clear selection'
            disabled={disabled}
            className='text-white/60 transition hover:text-white disabled:opacity-50'
          >
            <RiCloseLine size={16} />
          </button>
        </div>

        <OptionListPopover
          icon={RiUserLine}
          label='Sales Owner'
          options={salesOwnerOptions}
          getOptionValue={ownerOptionGetValue}
          getOptionLabel={ownerOptionGetLabel}
          renderOptionLabel={(opt) => {
            const name = ownerOptionGetLabel(opt);
            return (
              <div className='flex min-w-0 items-center gap-2'>
                <CrmAccountAvatar name={name} size={20} />
                <span className='truncate'>{name}</span>
              </div>
            );
          }}
          searchPlaceholder='Search sales owner...'
          emptyMessage='No sales owners available'
          onApply={(value) => onApplyField?.('sales_owner', value)}
          disabled={disabled}
        />

        <OptionListPopover
          icon={RiUserSharedLine}
          label='Inside Sales'
          options={insideSalesOptions}
          getOptionValue={ownerOptionGetValue}
          getOptionLabel={ownerOptionGetLabel}
          renderOptionLabel={(opt) => {
            const name = ownerOptionGetLabel(opt);
            return (
              <div className='flex min-w-0 items-center gap-2'>
                <CrmAccountAvatar name={name} size={20} />
                <span className='truncate'>{name}</span>
              </div>
            );
          }}
          searchPlaceholder='Search inside sales...'
          emptyMessage='No inside sales available'
          onApply={(value) => onApplyField?.('inside_sales', value)}
          disabled={disabled}
        />

        <TemperaturePopover
          onApply={(value) => onApplyField?.('lead_temperature', value)}
          disabled={disabled}
        />

        <PipelinePopover
          pipelineOptions={pipelineOptions}
          stageOptions={stageOptions}
          statusOptions={statusOptions}
          stageStatusMap={stageStatusMap}
          stageColorMap={stageColorMap}
          pipelineValue={defaultPipelineId}
          stageValue={defaultStageId}
          statusValue={defaultStatusId}
          ensureStagesForPipeline={ensureStagesForPipeline}
          onApply={onApplyPipeline}
          disabled={disabled}
        />

        <BarDivider />

        <MorePopover
          leadOptions={leadOptions}
          pipelineScopedOptions={pipelineScopedOptions}
          onApplyField={onApplyField}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
