import React from 'react';
import {
  analyzeStatusImport,
  applyStatusImport,
  fetchSourceStatusNames,
  resolveSourceFieldSpec,
} from '@/components/customize-status/status-import-flow';
import { resolveStatusFieldDoctype } from '@/constants/status-field-key';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

/**
 * Sidebar-driven import: fetch all source statuses, analyze, then replace or open mapping modal.
 * Skips the checkbox "Import statuses" picker modal.
 */
export function useStatusSourceImport({ targetDoctype, targetField, targetContext, onImported }) {
  const [mappingOpen, setMappingOpen] = React.useState(false);
  const [analysis, setAnalysis] = React.useState(null);
  const [pendingImport, setPendingImport] = React.useState(null);
  const [isImporting, setIsImporting] = React.useState(false);

  const resetImportState = React.useCallback(() => {
    setMappingOpen(false);
    setAnalysis(null);
    setPendingImport(null);
    setIsImporting(false);
  }, []);

  const runDirectImport = React.useCallback(
    async (sourceModule, resolvedSourceFieldKey) => {
      if (!targetDoctype || !targetField || !resolvedSourceFieldKey || !sourceModule) return;

      const sourceFieldSpec = resolveSourceFieldSpec(sourceModule, resolvedSourceFieldKey);
      if (!sourceFieldSpec?.field) return;

      setIsImporting(true);
      try {
        const sourceDoctype = resolveStatusFieldDoctype(sourceFieldSpec, sourceModule);
        const statusNames = await fetchSourceStatusNames(
          sourceDoctype,
          sourceFieldSpec.field,
          sourceFieldSpec.context,
        );
        if (statusNames.length === 0) {
          showErrorToast('No statuses available to import from the selected source.');
          return;
        }

        const importContext = {
          targetDoctype,
          targetField,
          targetContext,
          sourceDoctype,
          sourceField: sourceFieldSpec.field,
          sourceContext: sourceFieldSpec.context,
          statusNames,
        };

        const result = await analyzeStatusImport(importContext);
        setPendingImport(importContext);
        setAnalysis(result);

        if (result.needs_mapping) {
          setMappingOpen(true);
          return;
        }

        await applyStatusImport(importContext);
        showSuccessToast('Statuses imported');
        resetImportState();
        onImported?.();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Unable to import statuses.' });
      } finally {
        setIsImporting(false);
      }
    },
    [onImported, resetImportState, targetContext, targetDoctype, targetField],
  );

  const handleMappingConfirm = React.useCallback(
    async ({ statusMappings }) => {
      if (!pendingImport) return;

      setIsImporting(true);
      try {
        await applyStatusImport({
          ...pendingImport,
          statusMappings,
        });
        showSuccessToast('Statuses imported');
        resetImportState();
        onImported?.();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Unable to import statuses.' });
      } finally {
        setIsImporting(false);
      }
    },
    [onImported, pendingImport, resetImportState],
  );

  return {
    mappingOpen,
    setMappingOpen,
    analysis,
    isImporting,
    runDirectImport,
    handleMappingConfirm,
    resetImportState,
  };
}
