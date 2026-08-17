import React from 'react';
import { RiPriceTag3Line } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import { getStatusFieldKey } from '@/constants/status-field-key';
import { StatusFieldEditor } from '@/components/customize-status/status-configuration-editor';
import { useStatusModules } from '@/hooks/use-status-modules';

function ModuleListItem({ module, isActive, onClick }) {
  const fieldCount = module.fields?.length ?? 0;
  const totalStatuses = (module.fields || []).reduce(
    (sum, f) => sum + (Number(f.status_count) || 0),
    0,
  );

  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border px-4 py-3 text-left transition-colors',
        isActive
          ? 'border-primary-base bg-primary-alpha-10'
          : 'border-stroke-soft-200 bg-bg-white-0 hover:bg-bg-weak-50',
      )}
    >
      <div className='flex items-center gap-2'>
        <RiPriceTag3Line
          className={cn('size-4 shrink-0', isActive ? 'text-primary-base' : 'text-text-sub-600')}
        />
        <span className='label-small text-text-strong-950'>{module.label}</span>
      </div>
      <p className='text-paragraph-xs text-text-sub-600 mt-1 pl-6'>
        {fieldCount} field{fieldCount === 1 ? '' : 's'} · {totalStatuses} status
        {totalStatuses === 1 ? '' : 'es'}
      </p>
    </button>
  );
}

export default function CustomizeStatusPage() {
  const { modules, isLoading: isLoadingModules } = useStatusModules();
  const [activeModuleId, setActiveModuleId] = React.useState('');

  React.useEffect(() => {
    if (!activeModuleId && modules.length > 0) {
      setActiveModuleId(modules[0].id);
    }
  }, [activeModuleId, modules]);

  const activeModule = React.useMemo(
    () => modules.find((m) => m.id === activeModuleId) ?? modules[0] ?? null,
    [activeModuleId, modules],
  );

  return (
    <div className='w-full max-w-6xl mx-auto flex flex-col gap-6'>
      <div>
        <h1 className='title-h5 text-text-strong-950'>Customize Status</h1>
        <p className='text-paragraph-sm text-text-sub-600 mt-1'>
          Manage status options for all modules in one place. Default statuses come from your
          records and cannot be edited.
        </p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start'>
        <aside className='flex flex-col gap-2'>
          <p className='label-xs text-text-sub-600 uppercase tracking-wide px-1'>Modules</p>
          {isLoadingModules ? (
            <p className='text-paragraph-sm text-text-sub-600 px-1 py-4'>Loading modules…</p>
          ) : (
            modules.map((module) => (
              <ModuleListItem
                key={module.id}
                module={module}
                isActive={module.id === activeModule?.id}
                onClick={() => setActiveModuleId(module.id)}
              />
            ))
          )}
        </aside>

        <section className='flex flex-col gap-6 min-w-0'>
          {activeModule ? (
            <>
              <div>
                <h2 className='label-large text-text-strong-950'>{activeModule.label}</h2>
                <p className='text-paragraph-xs text-text-sub-600 mt-0.5'>{activeModule.doctype}</p>
              </div>

              {(activeModule.fields || []).map((fieldSpec) => (
                <StatusFieldEditor
                  key={fieldSpec.configKey || getStatusFieldKey(fieldSpec)}
                  doctype={activeModule.doctype}
                  field={fieldSpec.field}
                  context={fieldSpec.context}
                  fieldLabel={fieldSpec.label || fieldSpec.field}
                  showImport={activeModule.allow_import !== false}
                  lockDefaultLifecycle={activeModule.allow_import === false}
                />
              ))}
            </>
          ) : (
            <p className='text-paragraph-sm text-text-sub-600'>
              Select a module to configure statuses.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
