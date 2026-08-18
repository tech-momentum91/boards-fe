import { useEffect, useMemo, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import { getSystemListPrimaryColumns } from '@/services/system-list-service';
import FieldsVisibilityPanel from './components/FieldsVisibilityPanel';
import { createCustomFieldsVisibilityState } from './utils/list-columns';
import { getErpColumnKey, getErpFieldIcon, isErpColumn } from './utils/erp-column-utils';
import { ERP_MODULES, getErpModuleLabel } from './constants/list-custom-fields-constants';
import { getSystemListPrimaryColumns as getSystemListFallbackColumns } from './constants/system-list-constants';

export function ErpModuleSidebar({ activeModuleId, onModuleChange, modules = ERP_MODULES }) {
  return (
    <aside className='flex w-[240px] shrink-0 flex-col border-r border-stroke-soft-200 bg-[rgba(246,248,250,0.4)] p-2.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
      <div className='px-2 pb-1 pt-1.5'>
        <span className='text-xs font-medium uppercase leading-4 tracking-[0.48px] text-text-soft-400'>
          Modules
        </span>
      </div>

      <div className='flex flex-col gap-1 overflow-y-auto'>
        {modules.map((module) => {
          const Icon = module.icon;
          const isActive = activeModuleId === module.id;

          return (
            <button
              key={module.id}
              type='button'
              onClick={() => onModuleChange(module.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors',
                isActive
                  ? 'bg-[rgba(226,228,233,0.4)] text-text-main-900'
                  : 'text-text-sub-500 hover:bg-bg-weak-50',
              )}
            >
              <span className='flex size-5 shrink-0 items-center justify-center'>
                <Icon size={18} />
              </span>
              <span className='min-w-0 flex-1 truncate text-sm font-medium leading-5 tracking-[-0.084px]'>
                {module.label}
              </span>
              {isActive ? (
                <span className='flex size-5 shrink-0 items-center justify-center rounded-full bg-bg-white-0 shadow-[0px_2px_4px_0px_rgba(27,28,29,0.04)]'>
                  <RiArrowRightSLine size={16} className='text-icon-sub-500' />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function buildErpVisibilityFields({ moduleId, catalogFields = [], customColumns = [] }) {
  const visibleKeys = new Set(
    (customColumns ?? [])
      .filter((column) => isErpColumn(column) && column.visible !== false)
      .filter((column) => column.moduleId === moduleId)
      .map((column) => column.key),
  );

  return catalogFields.map((field) => {
    const fieldId = field.id ?? field.value;
    const label = field.label;
    return {
      id: fieldId,
      label,
      icon: getErpFieldIcon(moduleId, fieldId, label),
      visible: visibleKeys.has(getErpColumnKey(moduleId, fieldId)),
    };
  });
}

export function ErpFieldsPanel({ activeModuleId, customColumns = [], onToggleField, onHideAll }) {
  const [catalogByModule, setCatalogByModule] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeModuleId) {
      return;
    }

    if (catalogByModule[activeModuleId]) {
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    getSystemListPrimaryColumns(activeModuleId).then((result) => {
      if (isCancelled) {
        return;
      }

      const apiFields = (result.data ?? []).map((column) => ({
        id: column.id,
        label: column.label,
      }));

      const fallbackFields =
        apiFields.length > 0
          ? apiFields
          : getSystemListFallbackColumns(activeModuleId).map((column) => ({
              id: column.value,
              label: column.label,
            }));

      setCatalogByModule((previous) => ({
        ...previous,
        [activeModuleId]: fallbackFields,
      }));
      setIsLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [activeModuleId, catalogByModule]);

  const fields = useMemo(
    () =>
      buildErpVisibilityFields({
        moduleId: activeModuleId,
        catalogFields: catalogByModule[activeModuleId] ?? [],
        customColumns,
      }),
    [activeModuleId, catalogByModule, customColumns],
  );

  if (isLoading && fields.length === 0) {
    return (
      <div className='min-w-0 flex-1 overflow-y-auto px-4 py-6 text-sm text-text-sub-500'>
        Loading {getErpModuleLabel(activeModuleId)} fields...
      </div>
    );
  }

  if (!isLoading && fields.length === 0) {
    return (
      <div className='min-w-0 flex-1 overflow-y-auto px-4 py-6 text-sm text-text-sub-500'>
        No fields available for this module.
      </div>
    );
  }

  return (
    <div className='min-w-0 flex-1 overflow-y-auto'>
      <FieldsVisibilityPanel
        fields={fields}
        onToggleField={(fieldId) => {
          const field = fields.find((entry) => entry.id === fieldId);
          onToggleField?.(activeModuleId, fieldId, field?.label);
        }}
        onHideAll={() => onHideAll?.(activeModuleId)}
      />
    </div>
  );
}

export function StandardTabPanel({ fields = [], onToggleField, onHideAll }) {
  const panelFields = useMemo(
    () =>
      fields.map((field) => ({
        id: field.id,
        label: field.label,
        icon: field.icon,
        visible: field.visible,
      })),
    [fields],
  );

  return (
    <FieldsVisibilityPanel
      fields={panelFields}
      onToggleField={onToggleField}
      onHideAll={onHideAll}
    />
  );
}

export function CustomTabPanel({ customColumns = [], onToggleField, onHideAll, children = null }) {
  const panelFields = useMemo(
    () =>
      createCustomFieldsVisibilityState(
        (customColumns ?? []).filter((column) => !isErpColumn(column)),
      ),
    [customColumns],
  );

  return (
    <>
      {panelFields.length > 0 ? (
        <FieldsVisibilityPanel
          fields={panelFields}
          onToggleField={onToggleField}
          onHideAll={onHideAll}
        />
      ) : null}
      {children}
    </>
  );
}
