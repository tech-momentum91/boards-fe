import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parse } from 'date-fns';
import { RiDeleteBin6Line, RiSearchLine } from 'react-icons/ri';

import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { Datepicker } from '@/components/ui/datepicker';
import { DateTimePicker } from '@/components/ui/datetimepicker';
import { formatDateToYYYYMMDD, formatEventDatetimeForApi, parseToDate } from '@/utils/date-utils';
import {
  getOperatorsForFieldType,
  isBetweenOperator,
  isDateFieldType,
  isMultiValueOperator,
  isNoValueOperator,
  isNumericFieldType,
  isTextFieldType,
  usesDistinctValueDropdown,
} from './filter-model';

/** Select menus inside the chart-builder drawer sit above the z-[200] modal shell. */
const SELECT_CONTENT_CLASS = 'z-[250] max-h-[min(320px,60vh)]';
const FILTER_PICKER_POPOVER_CLASS = 'z-[250]';
const FILTER_PICKER_TRIGGER_CLASS = 'h-8 min-h-8';

const SELECT_TRIGGER_CLASS = 'flex h-8 w-full min-w-0 items-center overflow-hidden';

function TruncatedSelectLabel({ label, placeholder }) {
  const text = label || placeholder;
  return (
    <span
      className={`block min-w-0 flex-1 truncate text-left text-paragraph-sm ${!label ? 'text-text-soft-400' : ''}`}
      title={label || undefined}
    >
      {text}
    </span>
  );
}

function getFieldMeta(fieldOptions, fieldname) {
  if (!fieldname) return null;
  const match = fieldOptions.find((opt) => opt.value === fieldname);
  return match?.meta ?? null;
}

function FieldSelect({ value, onChange, fieldOptions, disabled }) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return fieldOptions;
    return fieldOptions.filter((opt) => {
      const label = String(opt.label || '').toLowerCase();
      const fieldname = String(opt.value || '').toLowerCase();
      const fieldtype = String(opt.meta?.fieldtype || '').toLowerCase();
      return label.includes(query) || fieldname.includes(query) || fieldtype.includes(query);
    });
  }, [fieldOptions, searchQuery]);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const match = fieldOptions.find((opt) => opt.value === value);
    if (!match) return value;
    return match.meta?.fieldtype ? `${match.label} (${match.meta.fieldtype})` : match.label;
  }, [value, fieldOptions]);

  return (
    <Select.Root
      value={value || undefined}
      onValueChange={onChange}
      size='xsmall'
      disabled={disabled}
      onOpenChange={(open) => {
        if (!open) setSearchQuery('');
      }}
    >
      <Select.Trigger className={SELECT_TRIGGER_CLASS}>
        <TruncatedSelectLabel label={selectedLabel} placeholder='Field' />
      </Select.Trigger>
      <Select.Content
        layout='searchable'
        className={`${SELECT_CONTENT_CLASS} w-[min(100vw-48px,360px)] p-0`}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          requestAnimationFrame(() => searchInputRef.current?.focus());
        }}
      >
        <div className='flex min-h-0 flex-1 flex-col'>
          <div className='shrink-0 border-b border-stroke-soft-200 p-2'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  ref={searchInputRef}
                  placeholder='Search fields…'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='min-h-0 flex-1 overflow-y-auto p-2'>
            {filteredOptions.length === 0 ? (
              <div className='px-2 py-1 text-xs text-text-soft-400'>No fields</div>
            ) : (
              filteredOptions.map((opt) => (
                <Select.Item key={opt.value} value={opt.value}>
                  {opt.meta?.fieldtype ? `${opt.label} (${opt.meta.fieldtype})` : opt.label}
                </Select.Item>
              ))
            )}
          </div>
        </div>
      </Select.Content>
    </Select.Root>
  );
}

function parseTimeFilterValue(value) {
  if (!value) return undefined;
  const str = String(value).trim();
  if (!str) return undefined;

  for (const pattern of ['HH:mm:ss', 'HH:mm']) {
    const parsed = parse(str, pattern, new Date());
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return undefined;
}

function parseFilterDateValue(value, fieldtype) {
  if (!value) return undefined;
  if (fieldtype === 'Time') return parseTimeFilterValue(value);
  return parseToDate(value) || undefined;
}

function formatFilterDateValue(date, fieldtype) {
  if (!date || Number.isNaN(date.getTime())) return '';
  if (fieldtype === 'Date') return formatDateToYYYYMMDD(date);
  if (fieldtype === 'Datetime') return formatEventDatetimeForApi(date);
  if (fieldtype === 'Time') return format(date, 'HH:mm:ss');
  return '';
}

function DateValueInput({ value, onChange, disabled, fieldtype }) {
  const parsedValue = parseFilterDateValue(value, fieldtype);

  const handleChange = (nextDate) => {
    onChange(formatFilterDateValue(nextDate, fieldtype));
  };

  if (fieldtype === 'Datetime') {
    return (
      <DateTimePicker
        value={parsedValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder='Select date & time'
        className={FILTER_PICKER_TRIGGER_CLASS}
        popoverContentClassName={FILTER_PICKER_POPOVER_CLASS}
      />
    );
  }

  if (fieldtype === 'Time') {
    return (
      <DateTimePicker
        mode='time_only'
        value={parsedValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder='Select time'
        className={FILTER_PICKER_TRIGGER_CLASS}
        popoverContentClassName={FILTER_PICKER_POPOVER_CLASS}
      />
    );
  }

  return (
    <Datepicker
      value={parsedValue}
      onChange={handleChange}
      disabled={disabled}
      placeholder='Select date'
      size='xsmall'
      variant='stroke'
      className={FILTER_PICKER_TRIGGER_CLASS}
      popoverContentClassName={FILTER_PICKER_POPOVER_CLASS}
    />
  );
}

function BetweenDateValueInput({ value, onChange, disabled, fieldtype }) {
  const from = Array.isArray(value) ? (value[0] ?? '') : '';
  const to = Array.isArray(value) ? (value[1] ?? '') : '';

  const update = (index, next) => {
    const nextValue = Array.isArray(value) ? [...value] : ['', ''];
    nextValue[index] = next;
    onChange(nextValue);
  };

  return (
    <div className='flex min-w-0 flex-1 items-center gap-1'>
      <div className='min-w-0 flex-1'>
        <DateValueInput
          value={from}
          onChange={(next) => update(0, next)}
          disabled={disabled}
          fieldtype={fieldtype}
        />
      </div>
      <span className='shrink-0 text-text-soft-400'>–</span>
      <div className='min-w-0 flex-1'>
        <DateValueInput
          value={to}
          onChange={(next) => update(1, next)}
          disabled={disabled}
          fieldtype={fieldtype}
        />
      </div>
    </div>
  );
}

function BetweenValueInput({ value, onChange, disabled, inputType = 'text' }) {
  const from = Array.isArray(value) ? (value[0] ?? '') : '';
  const to = Array.isArray(value) ? (value[1] ?? '') : '';

  const update = (index, next) => {
    const nextValue = Array.isArray(value) ? [...value] : ['', ''];
    nextValue[index] = next;
    onChange(nextValue);
  };

  return (
    <div className='flex min-w-0 flex-1 items-center gap-1'>
      <Input.Root size='xsmall' className='min-w-0 flex-1'>
        <Input.Wrapper>
          <Input.Input
            type={inputType}
            placeholder='From'
            value={from}
            disabled={disabled}
            onChange={(e) => update(0, e.target.value)}
          />
        </Input.Wrapper>
      </Input.Root>
      <span className='shrink-0 text-text-soft-400'>–</span>
      <Input.Root size='xsmall' className='min-w-0 flex-1'>
        <Input.Wrapper>
          <Input.Input
            type={inputType}
            placeholder='To'
            value={to}
            disabled={disabled}
            onChange={(e) => update(1, e.target.value)}
          />
        </Input.Wrapper>
      </Input.Root>
    </div>
  );
}

function TextValueInput({ value, onChange, disabled, type = 'text', placeholder = 'Value' }) {
  return (
    <Input.Root size='xsmall' className='w-full min-w-0'>
      <Input.Wrapper>
        <Input.Input
          type={type}
          placeholder={placeholder}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </Input.Wrapper>
    </Input.Root>
  );
}

function MultiValueInput({ value, onChange, disabled, placeholder = 'Comma-separated values' }) {
  const displayValue = Array.isArray(value) ? value.join(', ') : (value ?? '');
  return (
    <Input.Root size='xsmall' className='w-full min-w-0'>
      <Input.Wrapper>
        <Input.Input
          type='text'
          placeholder={placeholder}
          value={displayValue}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </Input.Wrapper>
    </Input.Root>
  );
}

function SearchableValueSelect({
  value,
  onChange,
  disabled,
  options,
  onSearch,
  placeholder = 'Value',
  multi = false,
  selectedValues = [],
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteOptions, setRemoteOptions] = useState(options);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    setRemoteOptions(options);
  }, [options]);

  useEffect(() => {
    if (!onSearch) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const requestId = ++searchRequestRef.current;
      setLoading(true);
      try {
        const rows = await onSearch(searchQuery);
        if (requestId !== searchRequestRef.current) return;
        setRemoteOptions(Array.isArray(rows) ? rows : []);
      } finally {
        if (requestId === searchRequestRef.current) {
          setLoading(false);
        }
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, onSearch]);

  const display = multi
    ? selectedValues.length > 0
      ? selectedValues
          .map((v) => remoteOptions.find((opt) => opt.value === v)?.label || v)
          .join(', ')
      : ''
    : null;

  const handleSelect = (next) => {
    if (!multi) {
      onChange(next);
      return;
    }
    if (selectedValues.includes(next)) {
      onChange(selectedValues.filter((v) => v !== next));
    } else {
      onChange([...selectedValues, next]);
    }
  };

  const selectedLabel = useMemo(() => {
    if (multi) return display;
    if (!value) return '';
    const match = [...remoteOptions, ...options].find((opt) => opt.value === value);
    return match?.label || value;
  }, [multi, display, value, remoteOptions, options]);

  return (
    <Select.Root
      value={multi ? selectedValues[0] || undefined : value || undefined}
      onValueChange={handleSelect}
      size='xsmall'
      disabled={disabled}
      onOpenChange={(open) => {
        if (!open) setSearchQuery('');
      }}
    >
      <Select.Trigger className={SELECT_TRIGGER_CLASS}>
        <TruncatedSelectLabel label={selectedLabel} placeholder={placeholder} />
      </Select.Trigger>
      <Select.Content
        layout='searchable'
        className={`${SELECT_CONTENT_CLASS} w-[min(100vw-48px,360px)] p-0`}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          requestAnimationFrame(() => searchInputRef.current?.focus());
        }}
      >
        <div className='flex min-h-0 flex-1 flex-col'>
          <div className='shrink-0 border-b border-stroke-soft-200 p-2'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  ref={searchInputRef}
                  placeholder='Search values…'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='min-h-0 flex-1 overflow-y-auto p-2'>
            {loading && <div className='px-2 py-1 text-xs text-text-soft-400'>Loading…</div>}
            {!loading && remoteOptions.length === 0 && (
              <div className='px-2 py-1 text-xs text-text-soft-400'>No options</div>
            )}
            {!loading &&
              remoteOptions.map((opt) => (
                <Select.Item key={opt.value} value={opt.value}>
                  {multi && selectedValues.includes(opt.value) ? '✓ ' : ''}
                  {opt.label}
                </Select.Item>
              ))}
          </div>
        </div>
      </Select.Content>
    </Select.Root>
  );
}

function SelectValueInput({ value, onChange, disabled, options, onSearch, placeholder = 'Value' }) {
  return (
    <SearchableValueSelect
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={options}
      onSearch={onSearch}
      placeholder={placeholder}
    />
  );
}

function MultiSelectValueInput({
  value,
  onChange,
  disabled,
  options,
  onSearch,
  placeholder = 'Select values',
}) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <SearchableValueSelect
      value={selected[0]}
      onChange={onChange}
      disabled={disabled}
      options={options}
      onSearch={onSearch}
      placeholder={placeholder}
      multi
      selectedValues={selected}
    />
  );
}

function FilterValueInput({ rule, fieldMeta, valueOptions, onSearchValues, onChange }) {
  const { operator } = rule;
  const fieldtype = fieldMeta?.fieldtype || '';
  const disabled = !operator;
  const useDropdown = usesDistinctValueDropdown(fieldtype, operator);

  const handleSearch = useMemo(
    () => (onSearchValues && rule.field ? (query) => onSearchValues(rule.field, query) : null),
    [onSearchValues, rule.field],
  );

  if (isNoValueOperator(operator)) {
    return (
      <div className='flex h-8 w-full min-w-0 items-center rounded-md border border-stroke-soft-200 bg-bg-weak-50 px-2 text-xs text-text-soft-400'>
        No value needed
      </div>
    );
  }

  if (isBetweenOperator(operator)) {
    if (isDateFieldType(fieldtype)) {
      return (
        <BetweenDateValueInput
          value={rule.value}
          onChange={onChange}
          disabled={disabled}
          fieldtype={fieldtype}
        />
      );
    }

    const inputType = isNumericFieldType(fieldtype) ? 'number' : 'text';
    return (
      <BetweenValueInput
        value={rule.value}
        onChange={onChange}
        disabled={disabled}
        inputType={inputType}
      />
    );
  }

  if (isMultiValueOperator(operator)) {
    if (useDropdown) {
      return (
        <MultiSelectValueInput
          value={rule.value}
          onChange={onChange}
          disabled={disabled}
          options={valueOptions}
          onSearch={handleSearch}
        />
      );
    }
    return <MultiValueInput value={rule.value} onChange={onChange} disabled={disabled} />;
  }

  if (useDropdown) {
    return (
      <SelectValueInput
        value={rule.value}
        onChange={onChange}
        disabled={disabled}
        options={valueOptions}
        onSearch={handleSearch}
      />
    );
  }

  if (fieldtype === 'Check') {
    return (
      <SelectValueInput
        value={String(rule.value ?? '')}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: '1', label: 'Yes' },
          { value: '0', label: 'No' },
        ]}
      />
    );
  }

  if (isNumericFieldType(fieldtype)) {
    return (
      <TextValueInput value={rule.value} onChange={onChange} disabled={disabled} type='number' />
    );
  }

  if (isDateFieldType(fieldtype)) {
    return (
      <DateValueInput
        value={rule.value}
        onChange={onChange}
        disabled={disabled}
        fieldtype={fieldtype}
      />
    );
  }

  return (
    <TextValueInput
      value={rule.value}
      onChange={onChange}
      disabled={disabled}
      type='text'
      placeholder={isTextFieldType(fieldtype) ? 'Enter value' : 'Value'}
    />
  );
}

/**
 * A single filter row: [connector][field] on first line, [operator][value][delete] below.
 */
export default function FilterRuleRow({
  rule,
  isFirstInGroup,
  groupOp,
  onGroupOpChange,
  fieldOptions,
  getValueOptions,
  searchValueOptions,
  onChange,
  onRemove,
  nested = false,
}) {
  const fieldMeta = useMemo(
    () => getFieldMeta(fieldOptions, rule.field),
    [fieldOptions, rule.field],
  );

  const operatorOptions = useMemo(
    () => getOperatorsForFieldType(fieldMeta?.fieldtype, fieldMeta?.suggested_operators),
    [fieldMeta],
  );

  const valueOptions = useMemo(
    () => (typeof getValueOptions === 'function' ? getValueOptions(rule.field) : []),
    [getValueOptions, rule.field],
  );

  const handleSearchValues = useCallback(
    (fieldname, query) => {
      if (typeof searchValueOptions === 'function') {
        return searchValueOptions(fieldname, query);
      }
      return Promise.resolve(valueOptions);
    },
    [searchValueOptions, valueOptions],
  );

  const update = (patch) => onChange({ ...rule, ...patch });
  const connectorWidth = nested ? 'w-[56px]' : 'w-[72px]';

  return (
    <div className='w-full min-w-0 border-b border-stroke-soft-100 pb-3 last:border-b-0 last:pb-0'>
      <div className='flex items-center gap-2'>
        <div className={`${connectorWidth} shrink-0`}>
          {isFirstInGroup ? (
            <span className='paragraph-small text-text-sub-500'>Where</span>
          ) : (
            <Select.Root value={groupOp} onValueChange={onGroupOpChange} size='xsmall'>
              <Select.Trigger className={`h-8 ${connectorWidth}`}>
                <Select.Value />
              </Select.Trigger>
              <Select.Content className={SELECT_CONTENT_CLASS}>
                <Select.Item value='AND'>AND</Select.Item>
                <Select.Item value='OR'>OR</Select.Item>
              </Select.Content>
            </Select.Root>
          )}
        </div>

        <div className='min-w-0 flex-1'>
          <FieldSelect
            value={rule.field}
            onChange={(v) => update({ field: v, operator: null, value: '' })}
            fieldOptions={fieldOptions}
          />
        </div>

        <button
          type='button'
          onClick={onRemove}
          className='shrink-0 rounded p-1.5 text-text-sub-500 hover:bg-bg-weak-50 hover:text-error-base'
          aria-label='Remove filter'
        >
          <RiDeleteBin6Line className='size-4' />
        </button>
      </div>

      <div
        className={`mt-2 grid grid-cols-1 gap-2 ${nested ? 'pl-[56px]' : 'pl-[80px] sm:grid-cols-2'}`}
      >
        <div className='min-w-0'>
          <Select.Root
            value={rule.operator || undefined}
            onValueChange={(v) => update({ operator: v, value: '' })}
            size='xsmall'
            disabled={!rule.field}
          >
            <Select.Trigger className={SELECT_TRIGGER_CLASS}>
              <TruncatedSelectLabel
                label={operatorOptions.find((opt) => opt.value === rule.operator)?.label}
                placeholder='Operator'
              />
            </Select.Trigger>
            <Select.Content className={SELECT_CONTENT_CLASS}>
              {operatorOptions.length === 0 ? (
                <div className='px-2 py-1 text-xs text-text-soft-400'>Select a field first</div>
              ) : (
                operatorOptions.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))
              )}
            </Select.Content>
          </Select.Root>
        </div>

        <div className='min-w-0'>
          <FilterValueInput
            rule={rule}
            fieldMeta={fieldMeta}
            valueOptions={valueOptions}
            onSearchValues={handleSearchValues}
            onChange={(value) => update({ value })}
          />
        </div>
      </div>
    </div>
  );
}
