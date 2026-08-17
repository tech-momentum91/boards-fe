import React from 'react';
import {
  analyzeApplyCustomDefaults,
  applyCustomDefaultStatuses,
  prepareDefaultStatusesForSave,
  serializeDefaultStatusesForApi,
} from '@/api/dynamic-status';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

export function useCustomStatusSave({ doctype, field, context, onApplied }) {
  const [customMappingOpen, setCustomMappingOpen] = React.useState(false);
  const [customAnalysis, setCustomAnalysis] = React.useState(null);
  const [pendingDefaults, setPendingDefaults] = React.useState(null);
  const [isApplying, setIsApplying] = React.useState(false);

  const resetCustomSaveState = React.useCallback(() => {
    setCustomMappingOpen(false);
    setCustomAnalysis(null);
    setPendingDefaults(null);
    setIsApplying(false);
  }, []);

  const applyCustomDefaults = React.useCallback(
    async ({ defaultStatuses, statusMappings } = {}) => {
      if (!doctype || !field) return;

      setIsApplying(true);
      try {
        await applyCustomDefaultStatuses({
          doctype,
          field,
          context,
          defaultStatuses: defaultStatuses ?? null,
          statusMappings,
        });
        showSuccessToast('Default statuses applied');
        resetCustomSaveState();
        onApplied?.();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Unable to apply default statuses.' });
      } finally {
        setIsApplying(false);
      }
    },
    [context, doctype, field, onApplied, resetCustomSaveState],
  );

  const runCustomSave = React.useCallback(
    async (draftDefaultStatuses) => {
      if (!doctype || !field) return;

      const prepared = prepareDefaultStatusesForSave(draftDefaultStatuses);
      const payload = prepared.length > 0 ? serializeDefaultStatusesForApi(prepared) : null;

      setIsApplying(true);
      try {
        const result = await analyzeApplyCustomDefaults({
          doctype,
          field,
          context,
          defaultStatuses: payload,
        });
        setPendingDefaults(payload);

        if (result.needs_mapping) {
          setCustomAnalysis(result);
          setCustomMappingOpen(true);
          return;
        }

        await applyCustomDefaults({ defaultStatuses: payload });
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Unable to save default statuses.' });
      } finally {
        setIsApplying(false);
      }
    },
    [applyCustomDefaults, context, doctype, field],
  );

  const handleCustomMappingConfirm = React.useCallback(
    async ({ statusMappings }) => {
      await applyCustomDefaults({ defaultStatuses: pendingDefaults, statusMappings });
    },
    [applyCustomDefaults, pendingDefaults],
  );

  return {
    customMappingOpen,
    setCustomMappingOpen,
    customAnalysis,
    isApplying,
    runCustomSave,
    handleCustomMappingConfirm,
    resetCustomSaveState,
  };
}
