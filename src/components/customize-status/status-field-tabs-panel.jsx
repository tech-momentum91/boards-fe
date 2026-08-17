import React from 'react';
import { getStatusFieldKey } from '@/constants/status-field-key';
import { StatusFieldEditor } from '@/components/customize-status/status-configuration-editor';

function resolveFieldContext(fieldSpec) {
  const explicit = (fieldSpec?.context || '').trim();
  if (explicit) return explicit;
  const key = getStatusFieldKey(fieldSpec);
  const separator = key.indexOf('::');
  return separator >= 0 ? key.slice(separator + 2) : undefined;
}

export default function StatusFieldTabsPanel({
  doctype,
  activeFieldSpec,
  refreshKey = 0,
  initialConfig = null,
  onRegisterSave,
  onRegisterDefaultStatuses,
  onSaved,
  sectionLabel = 'STATUS',
  syncDefaultCatalog = false,
  lockDefaultLifecycle = false,
}) {
  if (!activeFieldSpec) {
    return (
      <p className='text-paragraph-sm text-text-sub-600 py-6 text-center'>
        No status fields configured for this module.
      </p>
    );
  }

  const fieldKey = getStatusFieldKey(activeFieldSpec);
  const fieldDoctype = activeFieldSpec?.doctype || doctype;

  return (
    <StatusFieldEditor
      key={`${fieldDoctype}-${fieldKey}-${refreshKey}-${syncDefaultCatalog ? 'sync' : 'active'}`}
      doctype={fieldDoctype}
      field={activeFieldSpec.field}
      context={resolveFieldContext(activeFieldSpec)}
      fieldLabel={activeFieldSpec.label || activeFieldSpec.field}
      layout='status-master'
      sectionLabel={sectionLabel}
      hideSectionHeader
      showImport={false}
      showFooter={false}
      initialConfig={initialConfig}
      syncDefaultCatalog={syncDefaultCatalog}
      lockDefaultLifecycle={lockDefaultLifecycle}
      onSaved={onSaved}
      onRegisterSave={(handler) => onRegisterSave?.(0, handler)}
      onRegisterDefaultStatuses={onRegisterDefaultStatuses}
    />
  );
}
