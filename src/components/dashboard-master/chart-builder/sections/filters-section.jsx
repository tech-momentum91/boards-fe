import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Select from '@/components/ui/select';
import SectionCard from './section-card';
import { CustomFilterPanel } from '@/components/dashboard-master/custom-filter';
import {
  getFilterDoctypes,
  getFilterFields,
  getFilterOptions,
} from '@/services/chatbot-chart-service';

/**
 * Wraps CustomFilterPanel and feeds it doctype-aware field/value options.
 * `baseDoctype` normally comes from the currently-selected Y-axis field.
 */
export default function FiltersSection({ baseDoctype, value, onChange, onApply }) {
  const [doctypes, setDoctypes] = useState([]);
  const [selectedDoctype, setSelectedDoctype] = useState(baseDoctype || '');
  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [doctypesLoading, setDoctypesLoading] = useState(false);
  const [valueCache, setValueCache] = useState({});
  const valueCacheRef = useRef({});

  const activeDoctype = selectedDoctype || baseDoctype || '';

  useEffect(() => {
    if (value?.doctype) {
      setSelectedDoctype(value.doctype);
    } else if (baseDoctype && !selectedDoctype) {
      setSelectedDoctype(baseDoctype);
    }
  }, [baseDoctype, selectedDoctype, value?.doctype]);

  useEffect(() => {
    if (!activeDoctype || value?.kind !== 'group' || value.doctype === activeDoctype) return;
    onChange({ ...value, doctype: activeDoctype });
  }, [activeDoctype]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    setDoctypesLoading(true);
    getFilterDoctypes()
      .then((rows) => {
        if (cancelled) return;
        setDoctypes(rows);
      })
      .catch(() => {
        if (!cancelled) setDoctypes([]);
      })
      .finally(() => {
        if (!cancelled) setDoctypesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeDoctype) {
      setFields([]);
      return undefined;
    }
    let cancelled = false;
    setFieldsLoading(true);
    getFilterFields(activeDoctype)
      .then((rows) => {
        if (cancelled) return;
        setFields(rows);
      })
      .catch(() => {
        if (!cancelled) setFields([]);
      })
      .finally(() => {
        if (!cancelled) setFieldsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeDoctype]);

  const doctypeOptions = useMemo(
    () => doctypes.map((d) => ({ value: d.name, label: d.name })),
    [doctypes],
  );

  const fieldOptions = useMemo(
    () =>
      fields.map((f) => ({
        value: f.fieldname,
        label: f.label || f.fieldname,
        meta: f,
      })),
    [fields],
  );

  const loadValueOptions = useCallback(
    async (fieldname, query = '') => {
      if (!activeDoctype || !fieldname) return [];
      const cacheKey = `${activeDoctype}::${fieldname}::${query}`;
      if (valueCacheRef.current[cacheKey]) return valueCacheRef.current[cacheKey];
      const rows = await getFilterOptions(activeDoctype, fieldname, query).catch(() => []);
      const opts = rows.map((r) => ({
        value: String(r.value ?? r.name ?? r),
        label: String(r.label ?? r.value ?? r.name ?? r),
      }));
      valueCacheRef.current = { ...valueCacheRef.current, [cacheKey]: opts };
      setValueCache(valueCacheRef.current);
      return opts;
    },
    [activeDoctype],
  );

  const searchValueOptions = useCallback(
    (fieldname, query = '') => loadValueOptions(fieldname, query),
    [loadValueOptions],
  );

  useEffect(() => {
    if (!value) return;
    const walk = (node) => {
      if (!node) return;
      if (node.kind === 'rule' && node.field) loadValueOptions(node.field);
      else if (node.kind === 'group') node.children.forEach(walk);
    };
    walk(value);
  }, [value, loadValueOptions]);

  const getValueOptions = useCallback(
    (fieldname, query = '') => {
      if (!fieldname || !activeDoctype) return [];
      return valueCache[`${activeDoctype}::${fieldname}::${query}`] ?? [];
    },
    [activeDoctype, valueCache],
  );

  const handleDoctypeChange = (nextDoctype) => {
    setSelectedDoctype(nextDoctype);
    valueCacheRef.current = {};
    setValueCache({});
    if (value?.kind === 'group') {
      onChange({ ...value, doctype: nextDoctype });
    }
  };

  return (
    <SectionCard title='Filters' defaultOpen={false}>
      <div className='mb-3 flex flex-col gap-2'>
        <span className='label-xsmall text-text-sub-500'>DocType</span>
        <Select.Root
          value={activeDoctype}
          onValueChange={handleDoctypeChange}
          size='xsmall'
          disabled={doctypesLoading}
        >
          <Select.Trigger className='h-8 w-full max-w-[280px]'>
            <Select.Value placeholder={doctypesLoading ? 'Loading doctypes…' : 'Select doctype'} />
          </Select.Trigger>
          <Select.Content className='z-[250] max-h-[min(320px,60vh)]'>
            {doctypeOptions.length === 0 ? (
              <div className='px-2 py-1 text-xs text-text-soft-400'>No doctypes</div>
            ) : (
              doctypeOptions.map((opt) => (
                <Select.Item key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Item>
              ))
            )}
          </Select.Content>
        </Select.Root>
      </div>

      {!activeDoctype && (
        <div className='paragraph-xsmall text-text-soft-400'>
          Select a doctype to configure filters for its fields.
        </div>
      )}

      {activeDoctype && (
        <>
          {fieldsLoading && (
            <div className='mb-2 paragraph-xsmall text-text-soft-400'>Loading fields…</div>
          )}
          <CustomFilterPanel
            value={value}
            onChange={onChange}
            fieldOptions={fieldOptions}
            getValueOptions={getValueOptions}
            searchValueOptions={searchValueOptions}
            onApply={onApply}
          />
        </>
      )}
    </SectionCard>
  );
}
