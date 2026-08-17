import {
  analyzeImportStatuses,
  getStatusConfiguration,
  importStatuses,
} from '@/api/dynamic-status';
import { getStatusFieldKey, resolveStatusFieldDoctype } from '@/constants/status-field-key';

export function isSameStatusScope(fieldSpec, module, { doctype, field, context }) {
  if (!fieldSpec) return false;
  return (
    resolveStatusFieldDoctype(fieldSpec, module) === (doctype || '').trim() &&
    fieldSpec.field === field &&
    (fieldSpec.context || '').trim() === (context || '').trim()
  );
}

export function isSameStatusTarget(module, scope) {
  return (module.fields || []).some((fieldSpec) => isSameStatusScope(fieldSpec, module, scope));
}

export function getSourceModuleOptions(modules = [], { excludeScope, excludeModuleId } = {}) {
  return modules.filter((candidate) => {
    if (excludeScope && isSameStatusTarget(candidate, excludeScope)) {
      const otherScopes = (candidate.fields || []).filter(
        (fieldSpec) => !isSameStatusScope(fieldSpec, candidate, excludeScope),
      );
      return otherScopes.length > 0;
    }
    if (excludeModuleId && candidate.id === excludeModuleId) return false;
    return true;
  });
}

export async function fetchSourceStatusNames(sourceDoctype, sourceField, sourceContext) {
  const message = await getStatusConfiguration({
    doctype: sourceDoctype,
    field: sourceField,
    context: sourceContext,
  });

  return (message.statuses || [])
    .filter((row) => row.enabled !== false && row.is_active !== 0)
    .map((row) => (row.label || '').trim())
    .filter(Boolean);
}

export async function analyzeStatusImport({
  targetDoctype,
  targetField,
  targetContext,
  sourceDoctype,
  sourceField,
  sourceContext,
  statusNames,
}) {
  return analyzeImportStatuses({
    targetDoctype,
    targetField,
    targetContext,
    sourceDoctype,
    sourceField,
    sourceContext,
    statusNames,
  });
}

export async function applyStatusImport({
  targetDoctype,
  targetField,
  targetContext,
  sourceDoctype,
  sourceField,
  sourceContext,
  statusNames,
  statusMappings,
}) {
  return importStatuses({
    targetDoctype,
    targetField,
    targetContext,
    sourceDoctype,
    sourceField,
    sourceContext,
    statusNames,
    mode: 'replace',
    statusMappings,
  });
}

export function resolveSourceField(sourceModule, preferredFieldKey) {
  const spec = resolveSourceFieldSpec(sourceModule, preferredFieldKey);
  if (!spec) return '';
  return getStatusFieldKey(spec);
}

export function resolveSourceFieldSpec(sourceModule, preferredFieldKey) {
  const fields = sourceModule?.fields || [];
  if (fields.length === 0) return null;
  if (preferredFieldKey) {
    const match = fields.find((field) => getStatusFieldKey(field) === preferredFieldKey);
    if (match) return match;
    const byField = fields.filter((field) => field.field === preferredFieldKey);
    if (byField.length === 1) return byField[0];
  }
  return fields[0];
}

export function resolveSourceFieldDoctype(sourceModule, fieldKey) {
  const spec = resolveSourceFieldSpec(sourceModule, fieldKey);
  return resolveStatusFieldDoctype(spec, sourceModule);
}
