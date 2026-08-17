import React from 'react';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Select from '@/components/ui/select';
import { RiDownloadLine } from 'react-icons/ri';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useStatusModules } from '@/hooks/use-status-modules';
import { getStatusFieldKey, resolveStatusFieldDoctype } from '@/constants/status-field-key';
import {
  analyzeStatusImport,
  applyStatusImport,
  isSameStatusTarget,
  resolveSourceField,
  resolveSourceFieldSpec,
} from '@/components/customize-status/status-import-flow';
import { getStatusConfiguration } from '@/api/dynamic-status';
import ImportStatusMappingModal from '@/components/customize-status/import-status-mapping-modal';
import { storageColorToPickerSwatch } from '@/components/ui/status-color-pill';
import {
  STATUS_LIFECYCLE_CATEGORIES,
  normalizeStatusLifecycleCategory,
} from '@/components/customize-status/status-lifecycle-constants';

export default function ImportStatusesModal({
  open,
  onOpenChange,
  targetDoctype,
  targetField,
  targetContext,
  targetFieldLabel,
  initialSourceModuleId = '',
  initialSourceFieldKey = '',
  onImported,
}) {
  const [sourceModuleId, setSourceModuleId] = React.useState(initialSourceModuleId || '');
  const [sourceFieldKey, setSourceFieldKey] = React.useState(initialSourceFieldKey || '');
  const [previewRows, setPreviewRows] = React.useState([]);
  const [selected, setSelected] = React.useState(new Set());
  const [isLoading, setIsLoading] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [analysis, setAnalysis] = React.useState(null);
  const [mappingOpen, setMappingOpen] = React.useState(false);
  const [pendingImport, setPendingImport] = React.useState(null);

  const normalizedTargetContext = (targetContext || '').trim() || undefined;

  const { modules: registryModules } = useStatusModules({ enabled: open });

  const sourceModules = React.useMemo(
    () =>
      registryModules.filter(
        (module) =>
          !isSameStatusTarget(module, {
            doctype: targetDoctype,
            field: targetField,
            context: normalizedTargetContext,
          }),
      ),
    [normalizedTargetContext, registryModules, targetDoctype, targetField],
  );

  const selectedModule = React.useMemo(
    () => sourceModules.find((m) => m.id === sourceModuleId) ?? null,
    [sourceModuleId, sourceModules],
  );

  const fieldOptions = selectedModule?.fields || [];

  const selectedSourceFieldSpec = React.useMemo(
    () => resolveSourceFieldSpec(selectedModule, sourceFieldKey),
    [selectedModule, sourceFieldKey],
  );

  React.useEffect(() => {
    if (!open) {
      setSourceModuleId('');
      setSourceFieldKey('');
      setPreviewRows([]);
      setSelected(new Set());
      setAnalysis(null);
      setMappingOpen(false);
      setPendingImport(null);
      return;
    }
    if (initialSourceModuleId) {
      setSourceModuleId(initialSourceModuleId);
    }
    if (initialSourceFieldKey) {
      setSourceFieldKey(initialSourceFieldKey);
    }
  }, [initialSourceFieldKey, initialSourceModuleId, open]);

  React.useEffect(() => {
    if (!selectedModule) {
      setSourceFieldKey('');
      return;
    }
    const resolved = resolveSourceField(selectedModule, sourceFieldKey);
    if (resolved !== sourceFieldKey) {
      setSourceFieldKey(resolved);
    }
  }, [selectedModule, sourceFieldKey]);

  React.useEffect(() => {
    if (!open || !selectedModule || !selectedSourceFieldSpec?.field) {
      setPreviewRows([]);
      setSelected(new Set());
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const sourceDoctype = resolveStatusFieldDoctype(selectedSourceFieldSpec, selectedModule);
        const message = await getStatusConfiguration({
          doctype: sourceDoctype,
          field: selectedSourceFieldSpec.field,
          context: selectedSourceFieldSpec.context,
        });
        const rows = (message.statuses || [])
          .filter((s) => s.enabled !== false && s.is_active !== 0)
          .map((s) => ({
            label: s.label,
            color: s.color,
            category: normalizeStatusLifecycleCategory(s.category, { fallback: 'Active' }),
          }));
        if (!cancelled) {
          setPreviewRows(rows);
          setSelected(new Set(rows.map((r) => r.label)));
        }
      } catch (error) {
        if (!cancelled) {
          showErrorToast(error, { defaultMessage: 'Unable to load source statuses.' });
          setPreviewRows([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, selectedModule, selectedSourceFieldSpec]);

  const buildImportPayload = React.useCallback(
    (statusNames) => {
      if (!selectedModule || !selectedSourceFieldSpec) return null;
      return {
        targetDoctype,
        targetField,
        targetContext: normalizedTargetContext,
        sourceDoctype: resolveStatusFieldDoctype(selectedSourceFieldSpec, selectedModule),
        sourceField: selectedSourceFieldSpec.field,
        sourceContext: selectedSourceFieldSpec.context,
        statusNames,
      };
    },
    [normalizedTargetContext, selectedModule, selectedSourceFieldSpec, targetDoctype, targetField],
  );

  const toggleRow = (label) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const runImport = React.useCallback(
    async ({ statusMappings } = {}) => {
      if (!pendingImport) return;

      setIsImporting(true);
      try {
        await applyStatusImport({
          ...pendingImport,
          statusMappings,
        });
        showSuccessToast('Statuses imported');
        setMappingOpen(false);
        onImported?.();
        onOpenChange?.(false);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Unable to import statuses.' });
      } finally {
        setIsImporting(false);
      }
    },
    [onImported, onOpenChange, pendingImport],
  );

  const handleImport = async () => {
    if (!selectedModule || !selectedSourceFieldSpec?.field || selected.size === 0) return;

    const statusNames = [...selected];
    const importPayload = buildImportPayload(statusNames);
    if (!importPayload) return;

    setPendingImport(importPayload);

    setIsImporting(true);
    try {
      const result = await analyzeStatusImport(importPayload);
      setAnalysis(result);

      if (result.needs_mapping) {
        setMappingOpen(true);
        return;
      }

      await applyStatusImport(importPayload);
      showSuccessToast('Statuses imported');
      onImported?.();
      onOpenChange?.(false);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Unable to import statuses.' });
    } finally {
      setIsImporting(false);
    }
  };

  const targetColumnLabel = targetFieldLabel || targetField;

  return (
    <>
      <Modal.Root open={open} onOpenChange={onOpenChange}>
        <Modal.Content className='max-w-[480px]' showClose>
          <Modal.Header
            icon={RiDownloadLine}
            title='Import statuses'
            description={`Replace ${targetColumnLabel} statuses with selected imports. Matching names are kept automatically.`}
          />
          <Modal.Body className='flex flex-col gap-4'>
            <div className='rounded-xl border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2'>
              <p className='label-xs text-text-sub-600'>Target column</p>
              <p className='label-small text-text-strong-950 mt-0.5'>{targetColumnLabel}</p>
            </div>
            <div className='flex flex-col gap-2'>
              <label className='label-xs text-text-sub-600'>Source module</label>
              <Select.Root value={sourceModuleId || undefined} onValueChange={setSourceModuleId}>
                <Select.Trigger className='w-full'>
                  <Select.Value placeholder='Select module' />
                </Select.Trigger>
                <Select.Content>
                  {sourceModules.map((m) => (
                    <Select.Item key={m.id} value={m.id}>
                      {m.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            {fieldOptions.length > 1 ? (
              <div className='flex flex-col gap-2'>
                <label className='label-xs text-text-sub-600'>Source field</label>
                <Select.Root value={sourceFieldKey || undefined} onValueChange={setSourceFieldKey}>
                  <Select.Trigger className='w-full'>
                    <Select.Value placeholder='Select field' />
                  </Select.Trigger>
                  <Select.Content>
                    {fieldOptions.map((fieldSpec) => {
                      const fieldKey = getStatusFieldKey(fieldSpec);
                      return (
                        <Select.Item key={fieldKey} value={fieldKey}>
                          {fieldSpec.label || fieldSpec.field}
                        </Select.Item>
                      );
                    })}
                  </Select.Content>
                </Select.Root>
              </div>
            ) : fieldOptions.length === 1 ? (
              <div className='rounded-xl border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2'>
                <p className='label-xs text-text-sub-600'>Source field</p>
                <p className='label-small text-text-strong-950 mt-0.5'>
                  {fieldOptions[0].label || fieldOptions[0].field}
                </p>
              </div>
            ) : null}

            {isLoading ? (
              <p className='text-paragraph-sm text-text-sub-600 py-4 text-center'>
                Loading preview…
              </p>
            ) : previewRows.length > 0 ? (
              <div className='max-h-56 overflow-y-auto rounded-xl border border-stroke-soft-200 divide-y divide-stroke-soft-200'>
                {STATUS_LIFECYCLE_CATEGORIES.map((category) => {
                  const categoryRows = previewRows.filter((row) => row.category === category);
                  if (categoryRows.length === 0) return null;
                  return (
                    <div key={category}>
                      <p className='px-3 py-1.5 label-xs text-text-sub-600 bg-bg-weak-50'>
                        {category}
                      </p>
                      {categoryRows.map((row) => (
                        <label
                          key={`${row.category}-${row.label}`}
                          className='flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-bg-weak-50'
                        >
                          <input
                            type='checkbox'
                            checked={selected.has(row.label)}
                            onChange={() => toggleRow(row.label)}
                            className='size-4 rounded border-stroke-soft-200'
                          />
                          <span
                            className='size-2.5 rounded-sm shrink-0'
                            style={{ backgroundColor: storageColorToPickerSwatch(row.color) }}
                          />
                          <span className='label-small text-text-strong-950'>{row.label}</span>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : sourceModuleId && selectedSourceFieldSpec?.field ? (
              <p className='text-paragraph-sm text-text-sub-600 py-2'>
                No statuses to import from this source.
              </p>
            ) : null}
          </Modal.Body>
          <Modal.Footer className='justify-between'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              disabled={isImporting || selected.size === 0 || !selectedSourceFieldSpec?.field}
              onClick={handleImport}
            >
              {isImporting ? 'Checking…' : `Import (${selected.size})`}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <ImportStatusMappingModal
        open={mappingOpen}
        onOpenChange={setMappingOpen}
        analysis={analysis}
        targetDoctype={targetDoctype}
        targetFieldLabel={targetColumnLabel}
        isSubmitting={isImporting}
        onConfirm={(payload) => runImport(payload)}
      />
    </>
  );
}
