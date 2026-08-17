import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RiArrowLeftLine, RiArrowRightSLine, RiDeleteBin6Line, RiSearchLine } from 'react-icons/ri';

import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { formatFormulaExpression, validateFormulaJson } from '@/utils/formula-builder-utils';
import { getFormulaBuilderFields, listRegisteredDoctypes } from '@/services/chatbot-chart-service';
import SectionCard from './section-card';

const AGGREGATIONS = [
  { value: 'SUM', label: 'SUM()', description: 'Sum of values' },
  { value: 'AVG', label: 'AVG()', description: 'Average' },
  { value: 'COUNT', label: 'COUNT()', description: 'Count of records' },
  { value: 'MIN', label: 'MIN()', description: 'Minimum' },
  { value: 'MAX', label: 'MAX()', description: 'Maximum' },
];

const OPERATORS = [
  { value: '+', label: '+' },
  { value: '-', label: '−' },
  { value: '*', label: '×' },
  { value: '/', label: '÷' },
];

const EMPTY_FORMULA = { formula_record: '', terms: [] };

function chipClassName({ invalid = false, pending = false } = {}) {
  return cn(
    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs transition-colors',
    invalid && 'border-error-base bg-error-lighter text-error-base',
    !invalid &&
      pending &&
      'border-dashed border-primary-base/50 bg-primary-alpha-50/40 text-primary-base/80',
    !invalid &&
      !pending &&
      'border-stroke-soft-200 bg-bg-white-0 text-text-strong-950 hover:border-primary-base/50 hover:bg-primary-alpha-10',
  );
}

function SearchableList({ items, query, onSelect, loading, emptyMessage }) {
  const filtered = query
    ? items.filter(
        (item) =>
          item.label?.toLowerCase().includes(query.toLowerCase()) ||
          item.sublabel?.toLowerCase().includes(query.toLowerCase()),
      )
    : items;

  if (loading) {
    return <div className='px-3 py-3 text-xs text-text-soft-400'>Loading…</div>;
  }

  if (filtered.length === 0) {
    return (
      <div className='px-3 py-3 text-xs text-text-soft-400'>
        {emptyMessage || (query ? `No results for "${query}"` : 'No options available')}
      </div>
    );
  }

  return (
    <ul className='max-h-56 overflow-y-auto py-1'>
      {filtered.map((item) => (
        <li key={item.value}>
          <button
            type='button'
            onClick={() => onSelect(item)}
            className='flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-bg-weak-50'
          >
            <span className='label-xsmall text-text-strong-950'>{item.label}</span>
            {item.sublabel ? (
              <span className='paragraph-xsmall ml-auto text-text-soft-400'>{item.sublabel}</span>
            ) : null}
            {item.description && !item.sublabel ? (
              <span className='paragraph-xsmall ml-auto text-text-soft-400'>
                {item.description}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function DoctypeFieldPopover({
  open,
  doctypes,
  fieldCache,
  loadFieldsForDoctype,
  initialDoctype = null,
  skipDoctypeStep = false,
  onSelectField,
}) {
  const [activeDoctype, setActiveDoctype] = useState(initialDoctype);
  const [search, setSearch] = useState('');
  const [fieldsLoading, setFieldsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setActiveDoctype(skipDoctypeStep ? initialDoctype : null);
      return;
    }
    setActiveDoctype(initialDoctype || (skipDoctypeStep ? initialDoctype : null));
  }, [open, initialDoctype, skipDoctypeStep]);

  useEffect(() => {
    if (!open || !activeDoctype) return;
    if (fieldCache[activeDoctype] !== undefined) return;

    let cancelled = false;
    setFieldsLoading(true);
    loadFieldsForDoctype(activeDoctype).finally(() => {
      if (!cancelled) setFieldsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, activeDoctype, fieldCache, loadFieldsForDoctype]);

  const showFieldPanel = Boolean(activeDoctype);
  const fields = activeDoctype ? (fieldCache[activeDoctype] ?? []) : [];

  return (
    <Popover.Content
      align='start'
      sideOffset={6}
      showArrow={false}
      className='w-[320px] !p-0 overflow-hidden !z-[350]'
    >
      <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-3 py-2'>
        {showFieldPanel && !skipDoctypeStep ? (
          <button
            type='button'
            onClick={() => {
              setActiveDoctype(null);
              setSearch('');
            }}
            className='flex size-7 shrink-0 items-center justify-center rounded-md text-text-sub-500 hover:bg-bg-soft-200'
            aria-label='Back to doctypes'
          >
            <RiArrowLeftLine className='size-4' />
          </button>
        ) : null}
        <RiSearchLine className='size-4 shrink-0 text-text-soft-400' />
        <input
          type='text'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={showFieldPanel ? `Search in ${activeDoctype}…` : 'Search data sources…'}
          className='flex-1 bg-transparent paragraph-small text-text-strong-950 placeholder:text-text-soft-400 outline-none'
        />
      </div>

      {showFieldPanel ? (
        <SearchableList
          items={fields.map((field) => ({
            value: `${activeDoctype}::${field.fieldname}`,
            label: field.label || field.fieldname,
            sublabel: field.fieldtype || '',
            doctype: activeDoctype,
            fieldname: field.fieldname,
            field_label: field.label || field.fieldname,
          }))}
          query={search}
          loading={fieldsLoading}
          onSelect={onSelectField}
          emptyMessage={fieldsLoading ? 'Loading fields…' : 'No fields available'}
        />
      ) : (
        <SearchableList
          items={doctypes}
          query={search}
          onSelect={(item) => {
            setActiveDoctype(item.name || item.value);
            setSearch('');
          }}
          emptyMessage='No registered doctypes found'
        />
      )}
    </Popover.Content>
  );
}

function ChipPopover({ trigger, children, open, onOpenChange }) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      {children}
    </Popover.Root>
  );
}

function TermEditor({
  term,
  index,
  doctypes,
  fieldCache,
  loadFieldsForDoctype,
  onUpdateTerm,
  onRemoveTerm,
  invalid = false,
}) {
  const [openChip, setOpenChip] = useState(null);

  const closeChip = () => setOpenChip(null);

  return (
    <span className='inline-flex flex-wrap items-center gap-1'>
      <ChipPopover
        open={openChip === 'agg'}
        onOpenChange={(next) => setOpenChip(next ? 'agg' : null)}
        trigger={
          <button type='button' className={chipClassName({ invalid })}>
            {term.aggregation}
          </button>
        }
      >
        <Popover.Content
          align='start'
          sideOffset={6}
          showArrow={false}
          className='w-[220px] !p-0 !z-[350]'
        >
          <SearchableList
            items={AGGREGATIONS}
            query=''
            onSelect={(item) => {
              onUpdateTerm(index, { aggregation: item.value });
              closeChip();
            }}
          />
        </Popover.Content>
      </ChipPopover>

      <span className='select-none font-mono text-xs text-text-sub-500'>(</span>

      <ChipPopover
        open={openChip === 'doctype'}
        onOpenChange={(next) => setOpenChip(next ? 'doctype' : null)}
        trigger={
          <button type='button' className={chipClassName({ invalid: invalid && !term.doctype })}>
            {term.doctype || 'Choose doctype'}
            <RiArrowRightSLine className='size-3 opacity-60' />
          </button>
        }
      >
        <DoctypeFieldPopover
          open={openChip === 'doctype'}
          doctypes={doctypes}
          fieldCache={fieldCache}
          loadFieldsForDoctype={loadFieldsForDoctype}
          initialDoctype={term.doctype}
          onSelectField={(item) => {
            onUpdateTerm(index, {
              doctype: item.doctype,
              fieldname: item.fieldname,
              field_label: item.field_label,
            });
            closeChip();
          }}
        />
      </ChipPopover>

      <span className='select-none font-mono text-xs text-text-sub-500'>.</span>

      <ChipPopover
        open={openChip === 'field'}
        onOpenChange={(next) => setOpenChip(next ? 'field' : null)}
        trigger={
          <button
            type='button'
            className={chipClassName({ invalid: invalid && !term.fieldname })}
            disabled={!term.doctype}
          >
            {term.field_label || term.fieldname || 'Choose field'}
            <RiArrowRightSLine className='size-3 opacity-60' />
          </button>
        }
      >
        <DoctypeFieldPopover
          open={openChip === 'field'}
          doctypes={doctypes}
          fieldCache={fieldCache}
          loadFieldsForDoctype={loadFieldsForDoctype}
          initialDoctype={term.doctype}
          skipDoctypeStep
          onSelectField={(item) => {
            onUpdateTerm(index, {
              doctype: item.doctype,
              fieldname: item.fieldname,
              field_label: item.field_label,
            });
            closeChip();
          }}
        />
      </ChipPopover>

      <span className='select-none font-mono text-xs text-text-sub-500'>)</span>

      <button
        type='button'
        onClick={() => onRemoveTerm(index)}
        className='ml-0.5 text-text-soft-400 transition hover:text-error-base'
        aria-label='Remove term'
      >
        <RiDeleteBin6Line className='size-3.5' />
      </button>
    </span>
  );
}

function OperatorChip({ operator, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <ChipPopover
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button type='button' className={chipClassName()}>
          {OPERATORS.find((item) => item.value === operator)?.label || operator}
        </button>
      }
    >
      <Popover.Content
        align='start'
        sideOffset={6}
        showArrow={false}
        className='w-[160px] !p-0 !z-[350]'
      >
        <SearchableList
          items={OPERATORS.map((item) => ({ ...item, description: 'Operator' }))}
          query=''
          onSelect={(item) => {
            onChange(item.value);
            setOpen(false);
          }}
        />
      </Popover.Content>
    </ChipPopover>
  );
}

function PendingTermEditor({
  pendingTerm,
  doctypes,
  fieldCache,
  loadFieldsForDoctype,
  onUpdatePendingTerm,
  onCommitPendingTerm,
  onCancelPendingTerm,
}) {
  const [openChip, setOpenChip] = useState('field');

  if (!pendingTerm) return null;

  return (
    <span className='inline-flex flex-wrap items-center gap-1'>
      <ChipPopover
        open={openChip === 'agg'}
        onOpenChange={(next) => setOpenChip(next ? 'agg' : null)}
        trigger={
          <button type='button' className={chipClassName({ pending: true })}>
            {pendingTerm.aggregation || 'SUM'}
          </button>
        }
      >
        <Popover.Content
          align='start'
          sideOffset={6}
          showArrow={false}
          className='w-[220px] !p-0 !z-[350]'
        >
          <SearchableList
            items={AGGREGATIONS}
            query=''
            onSelect={(item) => {
              onUpdatePendingTerm({ aggregation: item.value });
              setOpenChip('field');
            }}
          />
        </Popover.Content>
      </ChipPopover>

      <span className='select-none font-mono text-xs text-text-sub-500'>(</span>

      <ChipPopover
        open={openChip === 'field'}
        onOpenChange={(next) => setOpenChip(next ? 'field' : null)}
        trigger={
          <button
            type='button'
            className={chipClassName({ pending: true, invalid: !pendingTerm.fieldname })}
          >
            {pendingTerm.fieldname
              ? `${pendingTerm.doctype}.${pendingTerm.field_label || pendingTerm.fieldname}`
              : 'Choose field'}
            <RiArrowRightSLine className='size-3 opacity-60' />
          </button>
        }
      >
        <DoctypeFieldPopover
          open={openChip === 'field'}
          doctypes={doctypes}
          fieldCache={fieldCache}
          loadFieldsForDoctype={loadFieldsForDoctype}
          initialDoctype={pendingTerm.doctype}
          onSelectField={(item) => {
            onUpdatePendingTerm({
              doctype: item.doctype,
              fieldname: item.fieldname,
              field_label: item.field_label,
            });
            onCommitPendingTerm({
              ...pendingTerm,
              doctype: item.doctype,
              fieldname: item.fieldname,
              field_label: item.field_label,
            });
            setOpenChip(null);
          }}
        />
      </ChipPopover>

      <span className='select-none font-mono text-xs text-text-sub-500'>)</span>

      <button
        type='button'
        onClick={onCancelPendingTerm}
        className='paragraph-xsmall text-text-soft-400 transition hover:text-error-base'
      >
        Cancel
      </button>
    </span>
  );
}

/**
 * Inline formula builder with clickable tokens rendered inside a single expression area.
 */
export default function FormulaBuilderSection({ formulaJson, onChange, onDraftChange }) {
  const value = formulaJson ?? EMPTY_FORMULA;
  const terms = Array.isArray(value.terms) ? value.terms : [];

  const [doctypes, setDoctypes] = useState([]);
  const [fieldCache, setFieldCache] = useState({});
  const fieldCacheRef = useRef({});
  const [pendingTerm, setPendingTerm] = useState(null);

  useEffect(() => {
    fieldCacheRef.current = fieldCache;
  }, [fieldCache]);

  useEffect(() => {
    onDraftChange?.({ pendingTerm });
  }, [pendingTerm, onDraftChange]);

  useEffect(() => {
    listRegisteredDoctypes()
      .then((rows) =>
        setDoctypes(
          rows.map((dt) => ({
            value: dt.name,
            label: dt.label || dt.name,
            name: dt.name,
          })),
        ),
      )
      .catch(() => setDoctypes([]));
  }, []);

  const loadFieldsForDoctype = useCallback(async (doctype) => {
    if (!doctype) return [];
    if (fieldCacheRef.current[doctype] !== undefined) {
      return fieldCacheRef.current[doctype];
    }

    try {
      const fields = await getFormulaBuilderFields(doctype);
      setFieldCache((prev) => {
        const next = { ...prev, [doctype]: fields };
        fieldCacheRef.current = next;
        return next;
      });
      return fields;
    } catch {
      setFieldCache((prev) => {
        const next = { ...prev, [doctype]: [] };
        fieldCacheRef.current = next;
        return next;
      });
      return [];
    }
  }, []);

  const updateTerms = (nextTerms) => {
    onChange({ ...value, formula_record: value.formula_record || '', terms: nextTerms });
  };

  const handleUpdateTerm = (index, patch) => {
    const nextTerms = terms.map((term, termIndex) =>
      termIndex === index ? { ...term, ...patch } : term,
    );
    updateTerms(nextTerms);
  };

  const handleRemoveTerm = (index) => {
    const nextTerms = terms.filter((_, termIndex) => termIndex !== index);
    if (nextTerms.length > 0 && nextTerms[0].operator) {
      nextTerms[0] = { ...nextTerms[0], operator: undefined };
    }
    updateTerms(nextTerms);
    setPendingTerm(null);
  };

  const handleClearAll = () => {
    updateTerms([]);
    setPendingTerm(null);
  };

  const startFirstTerm = () => {
    setPendingTerm({
      aggregation: 'SUM',
      doctype: null,
      fieldname: null,
      field_label: null,
    });
  };

  const startNextTerm = (operator = '+') => {
    setPendingTerm({
      aggregation: 'SUM',
      doctype: null,
      fieldname: null,
      field_label: null,
      operator,
    });
  };

  const handleCommitPendingTerm = (completedTerm) => {
    const isFirst = terms.length === 0;
    const nextTerm = {
      aggregation: completedTerm.aggregation || 'SUM',
      doctype: completedTerm.doctype,
      fieldname: completedTerm.fieldname,
      field_label: completedTerm.field_label,
      ...(isFirst ? {} : { operator: completedTerm.operator || '+' }),
    };

    updateTerms([...terms, nextTerm]);
    setPendingTerm(null);
  };

  const canAddAnotherTerm =
    terms.length > 0 && !pendingTerm && terms.every((term) => term.doctype && term.fieldname);

  const expressionPreview = formatFormulaExpression(value);
  const validation = validateFormulaJson(value, { pendingTerm });

  return (
    <SectionCard title='Formula Builder' defaultOpen={false}>
      <div className='flex flex-col gap-3'>
        <div
          className={cn(
            'min-h-[96px] rounded-lg border bg-bg-white-0 px-3 py-3',
            validation.valid || validation.isEmpty
              ? 'border-stroke-soft-200'
              : 'border-error-base ring-1 ring-error-base/20',
          )}
        >
          {terms.length === 0 && !pendingTerm ? (
            <button
              type='button'
              onClick={startFirstTerm}
              className='flex h-full min-h-[72px] w-full items-center justify-center gap-2 rounded-md border border-dashed border-stroke-soft-200 px-3 py-4 text-left transition hover:border-primary-base/50 hover:bg-bg-weak-50'
            >
              <span className='inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-bg-soft-200 font-mono text-xs font-semibold text-text-sub-500'>
                /
              </span>
              <span className='paragraph-small text-text-soft-400'>
                Click to build a formula like SUM(HD Ticket.closed_date) − COUNT(HD
                Ticket.created_date)
              </span>
            </button>
          ) : (
            <div className='flex flex-wrap items-center gap-2'>
              {terms.map((term, index) => (
                <React.Fragment key={`${term.doctype}-${term.fieldname}-${index}`}>
                  {index > 0 ? (
                    <OperatorChip
                      operator={term.operator || '+'}
                      onChange={(operator) => handleUpdateTerm(index, { operator })}
                    />
                  ) : null}
                  <TermEditor
                    term={term}
                    index={index}
                    doctypes={doctypes}
                    fieldCache={fieldCache}
                    loadFieldsForDoctype={loadFieldsForDoctype}
                    onUpdateTerm={handleUpdateTerm}
                    onRemoveTerm={handleRemoveTerm}
                  />
                </React.Fragment>
              ))}

              {pendingTerm ? (
                <>
                  {pendingTerm.operator ? (
                    <OperatorChip
                      operator={pendingTerm.operator}
                      onChange={(operator) =>
                        setPendingTerm((current) => ({ ...current, operator }))
                      }
                    />
                  ) : null}
                  <PendingTermEditor
                    pendingTerm={pendingTerm}
                    doctypes={doctypes}
                    fieldCache={fieldCache}
                    loadFieldsForDoctype={loadFieldsForDoctype}
                    onUpdatePendingTerm={(patch) =>
                      setPendingTerm((current) => ({ ...current, ...patch }))
                    }
                    onCommitPendingTerm={handleCommitPendingTerm}
                    onCancelPendingTerm={() => setPendingTerm(null)}
                  />
                </>
              ) : null}

              {canAddAnotherTerm ? (
                <div className='flex flex-wrap items-center gap-1.5'>
                  {OPERATORS.map((operator) => (
                    <button
                      key={operator.value}
                      type='button'
                      onClick={() => startNextTerm(operator.value)}
                      className={chipClassName()}
                    >
                      {operator.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {!validation.valid && !validation.isEmpty ? (
          <div className='rounded-lg border border-error-base/30 bg-error-lighter px-3 py-2'>
            {validation.errors.map((error) => (
              <p key={error} className='paragraph-xsmall text-error-base'>
                {error}
              </p>
            ))}
          </div>
        ) : null}

        {expressionPreview ? (
          <p className='truncate font-mono paragraph-xsmall text-text-soft-400'>
            {expressionPreview}
          </p>
        ) : null}

        {terms.length > 0 ? (
          <div className='flex justify-end'>
            <button
              type='button'
              onClick={handleClearAll}
              className='paragraph-xsmall text-text-soft-400 transition hover:text-error-base'
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

export { validateFormulaJson } from '@/utils/formula-builder-utils';
