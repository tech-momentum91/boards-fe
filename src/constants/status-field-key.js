/** Composite key for status field tabs when multiple configs share the same field name. */
export function getStatusFieldKey(fieldSpec) {
  if (!fieldSpec) return '';
  const field = fieldSpec.field || '';
  const context = (fieldSpec.context || '').trim();
  return context ? `${field}::${context}` : field;
}

export function resolveStatusFieldDoctype(fieldSpec, module) {
  return (fieldSpec?.doctype || module?.doctype || '').trim();
}

/** Alias used by API-normalized field specs (`configKey` from `get_status_modules`). */
export const getStatusConfigKey = getStatusFieldKey;

export function findFieldSpecByKey(fields = [], fieldKey = '') {
  if (!fieldKey) return fields[0] ?? null;
  return fields.find((spec) => getStatusFieldKey(spec) === fieldKey) ?? fields[0] ?? null;
}

export function buildStatusScope({ doctype, field, context }) {
  return {
    doctype,
    field,
    context: (context || '').trim() || undefined,
  };
}
