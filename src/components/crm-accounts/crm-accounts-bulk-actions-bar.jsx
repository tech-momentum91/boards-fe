import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import {
  RiBuildingLine,
  RiCloseLine,
  RiGlobalLine,
  RiMoreLine,
  RiSearchLine,
  RiUserLine,
} from 'react-icons/ri';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { TYPE_OF_ORGANIZATION_OPTIONS } from '@/components/crm-accounts/constants';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

/** Columns that support bulk update (must match single-row editable fields). */
export const ACCOUNT_BULK_EDITABLE_COLUMN_IDS = [
  'name',
  'custom_legal_name',
  'website',
  'sales_owner',
  'cp_account',
  'cp_contact',
  'type_of_organization',
  'year_of_establishment',
  'no_of_employees',
  'industry',
];

const FIELD_META = {
  name: { key: 'legal_name', label: 'Account Name', type: 'text', icon: RiBuildingLine },
  custom_legal_name: {
    key: 'custom_legal_name',
    label: 'Company Legal Name',
    type: 'text',
    icon: RiBuildingLine,
  },
  website: { key: 'website', label: 'Website', type: 'text', icon: RiGlobalLine },
  sales_owner: { key: 'sales_owner', label: 'Sales Owner', type: 'owner', icon: RiUserLine },
  cp_account: { key: 'cp_account', label: 'CP Account', type: 'select', icon: RiBuildingLine },
  cp_contact: { key: 'cp_contact', label: 'CP Contact', type: 'select', icon: RiUserLine },
  type_of_organization: {
    key: 'type_of_organization',
    label: 'Type Organization',
    type: 'select',
    icon: RiBuildingLine,
  },
  year_of_establishment: {
    key: 'year_of_establishment',
    label: 'Year of Establishment',
    type: 'text',
    icon: RiBuildingLine,
  },
  no_of_employees: {
    key: 'no_of_employees',
    label: 'No. Employee',
    type: 'select',
    icon: RiUserLine,
  },
  industry: { key: 'industry', label: 'Industry', type: 'select', icon: RiBuildingLine },
};

/** Prefer these as primary bar buttons when visible; rest go under More. */
const PRIMARY_COLUMN_PRIORITY = [
  'sales_owner',
  'type_of_organization',
  'industry',
  'no_of_employees',
  'website',
  'name',
];

const BarButton = forwardRef(({ icon: Icon, label, className, disabled, ...rest }, ref) => {
  return (
    <button
      ref={ref}
      type='button'
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition',
        'text-white/80 hover:bg-white/10 hover:text-white',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon size={16} className='shrink-0' /> : null}
      {label ? <span className='whitespace-nowrap'>{label}</span> : null}
    </button>
  );
});

BarButton.displayName = 'BarButton';

function BarDivider() {
  return <span className='mx-1 h-5 w-px shrink-0 bg-white/15' />;
}

const optionGetValue = (opt) => opt?.value ?? opt?.email ?? '';
const optionGetLabel = (opt) => opt?.label ?? opt?.name ?? optionGetValue(opt) ?? '—';

function FilterableOptionList({
  options = [],
  getOptionValue = optionGetValue,
  getOptionLabel = optionGetLabel,
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

function TextFieldPopover({ icon, label, placeholder = 'Enter value...', onApply, disabled }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!open) setDraft('');
  }, [open]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <BarButton icon={icon} label={label} disabled={disabled} />
      </Popover.Trigger>
      <Popover.Content side='top' align='start' showArrow={false} className='w-72 p-3'>
        <div className='flex flex-col gap-2'>
          <input
            type='text'
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className='w-full rounded-lg border border-stroke-soft-200 px-2.5 py-2 text-sm text-text-main-900 outline-none focus:border-primary-base'
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onApply?.(draft.trim());
                setOpen(false);
              }
            }}
          />
          <div className='flex items-center justify-end gap-2'>
            <button
              type='button'
              onClick={() => {
                onApply?.('');
                setOpen(false);
              }}
              className='rounded-lg px-2.5 py-1.5 text-sm text-text-sub-500 transition hover:bg-bg-weak-50'
            >
              Clear
            </button>
            <button
              type='button'
              onClick={() => {
                onApply?.(draft.trim());
                setOpen(false);
              }}
              className='rounded-lg bg-primary-base px-2.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary-darker'
            >
              Apply
            </button>
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

function OptionListPopover({
  icon,
  label,
  options = [],
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

function FieldAction({ columnId, optionsByField, onApplyField, disabled }) {
  const meta = FIELD_META[columnId];
  if (!meta) return null;

  if (meta.type === 'text') {
    return (
      <TextFieldPopover
        icon={meta.icon}
        label={meta.label}
        placeholder={`Set ${meta.label.toLowerCase()}...`}
        onApply={(value) => onApplyField?.(meta.key, value)}
        disabled={disabled}
      />
    );
  }

  if (meta.type === 'owner') {
    const options = optionsByField.sales_owner ?? [];
    return (
      <OptionListPopover
        icon={meta.icon}
        label={meta.label}
        options={options}
        renderOptionLabel={(opt) => {
          const name = optionGetLabel(opt);
          return (
            <div className='flex min-w-0 items-center gap-2'>
              <CrmAccountAvatar name={name} size={20} />
              <span className='truncate'>{name}</span>
            </div>
          );
        }}
        searchPlaceholder='Search sales owner...'
        emptyMessage='No sales owners available'
        onApply={(value) => onApplyField?.(meta.key, value)}
        disabled={disabled}
      />
    );
  }

  const options = optionsByField[meta.key] ?? [];
  return (
    <OptionListPopover
      icon={meta.icon}
      label={meta.label}
      options={options}
      searchPlaceholder={`Search ${meta.label.toLowerCase()}...`}
      emptyMessage={`No ${meta.label.toLowerCase()} options`}
      onApply={(value) => onApplyField?.(meta.key, value)}
      disabled={disabled}
    />
  );
}

function MorePopover({ fields, optionsByField, onApplyField, disabled }) {
  const [open, setOpen] = useState(false);
  const [activeColumnId, setActiveColumnId] = useState(null);

  useEffect(() => {
    if (!open) setActiveColumnId(null);
  }, [open]);

  const activeMeta = activeColumnId ? FIELD_META[activeColumnId] : null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <BarButton icon={RiMoreLine} label='More' disabled={disabled} />
      </Popover.Trigger>
      <Popover.Content side='top' align='end' showArrow={false} className='w-auto p-1'>
        {activeMeta ? (
          <div className='flex flex-col gap-1'>
            <button
              type='button'
              onClick={() => setActiveColumnId(null)}
              className='self-start px-2 py-1 text-xs font-medium text-text-sub-500 hover:text-text-main-900'
            >
              Back
            </button>
            <div className='px-2 text-xs font-medium text-text-soft-400'>{activeMeta.label}</div>
            {activeMeta.type === 'text' ? (
              <div className='w-64 p-2'>
                <input
                  type='text'
                  placeholder={`Set ${activeMeta.label.toLowerCase()}...`}
                  className='w-full rounded-lg border border-stroke-soft-200 px-2.5 py-2 text-sm outline-none focus:border-primary-base'
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onApplyField?.(activeMeta.key, e.currentTarget.value.trim());
                      setActiveColumnId(null);
                      setOpen(false);
                    }
                  }}
                />
                <button
                  type='button'
                  onClick={() => {
                    onApplyField?.(activeMeta.key, '');
                    setActiveColumnId(null);
                    setOpen(false);
                  }}
                  className='mt-2 w-full rounded-lg px-2 py-1.5 text-left text-sm text-text-sub-500 transition hover:bg-bg-weak-50'
                >
                  Clear
                </button>
              </div>
            ) : (
              <FilterableOptionList
                options={
                  activeMeta.type === 'owner'
                    ? (optionsByField.sales_owner ?? [])
                    : (optionsByField[activeMeta.key] ?? [])
                }
                renderOptionLabel={
                  activeMeta.type === 'owner'
                    ? (opt) => {
                        const name = optionGetLabel(opt);
                        return (
                          <div className='flex min-w-0 items-center gap-2'>
                            <CrmAccountAvatar name={name} size={20} />
                            <span className='truncate'>{name}</span>
                          </div>
                        );
                      }
                    : undefined
                }
                searchPlaceholder={`Search ${activeMeta.label.toLowerCase()}...`}
                onSelect={(value) => {
                  onApplyField?.(activeMeta.key, value);
                  setActiveColumnId(null);
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
            {fields.map((columnId) => {
              const meta = FIELD_META[columnId];
              if (!meta) return null;
              return (
                <button
                  key={columnId}
                  type='button'
                  onClick={() => setActiveColumnId(columnId)}
                  className='flex w-full items-center rounded-lg px-2 py-2 text-left text-sm text-text-main-900 transition hover:bg-bg-weak-50'
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}

function flattenIndustryOptions(industryGroups = []) {
  const out = [];
  for (const group of industryGroups) {
    for (const opt of Array.isArray(group?.industry_name) ? group.industry_name : []) {
      if (opt?.value != null && opt.value !== '') {
        out.push({ value: String(opt.value), label: opt.label ?? String(opt.value) });
      }
    }
  }
  return out;
}

/**
 * Fixed bottom bar for multi-selected CRM accounts.
 * Only shows actions for currently visible editable columns.
 */
export default function CrmAccountsBulkActionsBar({
  selectedCount = 0,
  visibleColumnIds = [],
  salesOwnerOptions = [],
  typeOfOrgOptions = [],
  industryGroups = [],
  employeeOptions = [],
  cpAccountOptions = [],
  cpContactOptions = [],
  onClear,
  onApplyField,
  disabled = false,
}) {
  const visibleEditable = useMemo(() => {
    const visible = new Set((Array.isArray(visibleColumnIds) ? visibleColumnIds : []).map(String));
    return ACCOUNT_BULK_EDITABLE_COLUMN_IDS.filter((id) => visible.has(id));
  }, [visibleColumnIds]);

  const { primaryFields, moreFields } = useMemo(() => {
    const primary = [];
    const remaining = [...visibleEditable];

    for (const id of PRIMARY_COLUMN_PRIORITY) {
      const index = remaining.indexOf(id);
      if (index === -1) continue;
      primary.push(id);
      remaining.splice(index, 1);
      if (primary.length >= 4) break;
    }

    return { primaryFields: primary, moreFields: remaining };
  }, [visibleEditable]);

  const optionsByField = useMemo(
    () => ({
      sales_owner: Array.isArray(salesOwnerOptions) ? salesOwnerOptions : [],
      type_of_organization:
        Array.isArray(typeOfOrgOptions) && typeOfOrgOptions.length > 0
          ? typeOfOrgOptions
          : TYPE_OF_ORGANIZATION_OPTIONS,
      industry: flattenIndustryOptions(industryGroups),
      no_of_employees: Array.isArray(employeeOptions) ? employeeOptions : [],
      cp_account: Array.isArray(cpAccountOptions) ? cpAccountOptions : [],
      cp_contact: Array.isArray(cpContactOptions) ? cpContactOptions : [],
    }),
    [
      salesOwnerOptions,
      typeOfOrgOptions,
      industryGroups,
      employeeOptions,
      cpAccountOptions,
      cpContactOptions,
    ],
  );

  if (!selectedCount) return null;

  return (
    <div className='pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4'>
      <div className='pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-bg-strong-950 px-2 py-2 text-text-white-0 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.4)] ring-1 ring-white/10'>
        <div className='flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-sm font-medium'>
          <span className='whitespace-nowrap'>
            {selectedCount} {selectedCount === 1 ? 'Account' : 'Accounts'} selected
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

        {primaryFields.map((columnId) => (
          <FieldAction
            key={columnId}
            columnId={columnId}
            optionsByField={optionsByField}
            onApplyField={onApplyField}
            disabled={disabled}
          />
        ))}

        {moreFields.length > 0 ? (
          <>
            <BarDivider />
            <MorePopover
              fields={moreFields}
              optionsByField={optionsByField}
              onApplyField={onApplyField}
              disabled={disabled}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
