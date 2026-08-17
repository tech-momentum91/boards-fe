import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RiArrowRightSLine, RiSearchLine } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useStatusModules } from '@/hooks/use-status-modules';
import {
  findFieldSpecByKey,
  getStatusFieldKey,
  resolveStatusFieldDoctype,
} from '@/constants/status-field-key';
import {
  orderModulesForStatusMaster,
  getStatusMasterDisplay,
  partitionStatusMasterModules,
  isStatusMasterSystemModule,
} from '@/constants/STATUS_MASTER_DISPLAY';
import {
  ACTIVE_SOURCE,
  STATUS_SOURCE_MODE,
  getStatusConfiguration,
  normalizeActiveSource,
  normalizeDefaultStatuses,
  resolveSourceModeFromActiveSource,
} from '@/api/dynamic-status';
import ImportStatusesModal from '@/components/customize-status/import-statuses-modal';
import ImportStatusMappingModal from '@/components/customize-status/import-status-mapping-modal';
import StatusSourceSelector from '@/components/customize-status/status-source-selector';
import CustomDefaultStatusesPanel from '@/components/customize-status/custom-default-statuses-panel';
import StatusFieldTabsPanel from '@/components/customize-status/status-field-tabs-panel';
import StatusFieldColumnsBar from '@/components/customize-status/status-field-columns-bar';
import {
  getSourceModuleOptions,
  resolveSourceField,
} from '@/components/customize-status/status-import-flow';
import { useStatusSourceImport } from '@/components/customize-status/use-status-source-import';
import { useCustomStatusSave } from '@/components/customize-status/use-custom-status-save';
import { showErrorToast } from '@/utils/error-utils';
import { isSuperAdminRole } from '@/utils/user-role-utils';
import { useDebounce } from '@/hooks/use-debounce';

function ModuleCard({ module, onClick }) {
  const Icon = module.icon;

  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-4 rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-4 text-left',
        'transition-colors hover:bg-bg-weak-50',
      )}
    >
      <span className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-bg-weak-50'>
        <Icon className='size-5 text-text-sub-600' />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='label-medium block text-text-strong-950'>{module.title}</span>
        <span className='text-paragraph-xs mt-0.5 block text-text-sub-600'>
          {module.description}
        </span>
      </span>
      <RiArrowRightSLine className='size-5 shrink-0 text-text-soft-400' />
    </button>
  );
}

function StatusMasterModuleGrid({ modules, isLoading, onSelectModule }) {
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounce(search, 200);

  const filteredModules = React.useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return modules;
    return modules.filter((module) => {
      const haystack = [module.title, module.description, module.label, module.doctype]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [debouncedSearch, modules]);

  const { standard, system } = React.useMemo(
    () => partitionStatusMasterModules(filteredModules),
    [filteredModules],
  );

  const renderGrid = (list) => (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      {list.map((module) => (
        <ModuleCard key={module.id} module={module} onClick={() => onSelectModule(module.id)} />
      ))}
    </div>
  );

  return (
    <div className='w-full max-w-5xl mx-auto flex flex-col gap-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h1 className='title-h5 text-text-strong-950'>Status Master</h1>
          <p className='text-paragraph-sm text-text-sub-600 mt-1'>
            Manage all system statuses in one place
          </p>
        </div>
        <Input.Root size='medium' className='w-full sm:w-[280px]'>
          <Input.Wrapper>
            <Input.Icon as={RiSearchLine} />
            <Input.Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search...'
            />
          </Input.Wrapper>
        </Input.Root>
      </div>

      {isLoading ? (
        <p className='text-paragraph-sm text-text-sub-600 py-8 text-center'>Loading modules…</p>
      ) : filteredModules.length === 0 ? (
        <p className='text-paragraph-sm text-text-sub-600 py-8 text-center'>No modules found.</p>
      ) : (
        <div className='flex flex-col gap-8'>
          {standard.length > 0 ? renderGrid(standard) : null}

          {system.length > 0 ? (
            <div className='flex flex-col gap-4'>
              <div className='flex items-center gap-3'>
                <div className='h-px flex-1 bg-stroke-soft-200' />
                <p className='label-xs uppercase tracking-wide text-text-sub-600 shrink-0'>
                  System Statuses
                </p>
                <div className='h-px flex-1 bg-stroke-soft-200' />
              </div>
              {renderGrid(system)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function InactiveSourceNotice({ title, description }) {
  return (
    <div className='py-10 px-4 text-center'>
      <p className='label-small text-text-strong-950'>{title}</p>
      <p className='text-paragraph-sm text-text-sub-600 mt-1 max-w-md mx-auto'>{description}</p>
    </div>
  );
}

export function StatusModuleFieldConfigurator({
  module,
  modules,
  onBack,
  initialFieldKey,
  singleFieldMode = false,
  embedded = false,
}) {
  const display = getStatusMasterDisplay(module.id);
  const moduleTitle = display?.title ?? module.label ?? module.id;
  const allowImport = module.allow_import !== false;
  const lockDefaultLifecycle = !allowImport || isStatusMasterSystemModule(module.id);

  const fields = module.fields || [];
  const isMultiField = !singleFieldMode && fields.length > 1;
  const [activeFieldKey, setActiveFieldKey] = React.useState(
    initialFieldKey || getStatusFieldKey(fields[0]),
  );
  const [sourceMode, setSourceMode] = React.useState(STATUS_SOURCE_MODE.DEFAULT);
  const [activeSource, setActiveSource] = React.useState(ACTIVE_SOURCE.DEFAULT);
  const [sourceModuleId, setSourceModuleId] = React.useState('');
  const [sourceField, setSourceField] = React.useState('');
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [draftCatalogStatuses, setDraftCatalogStatuses] = React.useState([]);
  const [configSnapshot, setConfigSnapshot] = React.useState(null);
  const [configLoading, setConfigLoading] = React.useState(false);
  const [activeStatusesLoading, setActiveStatusesLoading] = React.useState(false);
  const saveHandlerRef = React.useRef(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [importPickerOpen, setImportPickerOpen] = React.useState(false);

  React.useEffect(() => {
    const nextFields = module.fields || [];
    setActiveFieldKey(initialFieldKey || getStatusFieldKey(nextFields[0]));
    setSourceMode(STATUS_SOURCE_MODE.DEFAULT);
    setActiveSource(ACTIVE_SOURCE.DEFAULT);
    setSourceModuleId('');
    setSourceField('');
    setRefreshKey(0);
    setDraftCatalogStatuses([]);
    setConfigSnapshot(null);
    setConfigLoading(false);
    setActiveStatusesLoading(false);
    setImportPickerOpen(false);
    saveHandlerRef.current = null;
  }, [initialFieldKey, module.id]);

  const activeFieldSpec = React.useMemo(
    () => findFieldSpecByKey(fields, activeFieldKey),
    [activeFieldKey, fields],
  );

  const activeFieldDoctype = React.useMemo(
    () => resolveStatusFieldDoctype(activeFieldSpec, module),
    [activeFieldSpec, module],
  );

  const handleConfigSaved = React.useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const handleApplied = React.useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const reloadActiveSourceAfterImport = React.useCallback(() => {
    // Parent load effect is the single getStatusConfiguration caller.
    setRefreshKey((value) => value + 1);
  }, []);

  const handleImported = React.useCallback(() => {
    setImportPickerOpen(false);
    reloadActiveSourceAfterImport();
  }, [reloadActiveSourceAfterImport]);

  const {
    mappingOpen,
    setMappingOpen,
    analysis,
    isImporting,
    runDirectImport,
    handleMappingConfirm,
    resetImportState,
  } = useStatusSourceImport({
    targetDoctype: activeFieldDoctype,
    targetField: activeFieldSpec?.field ?? '',
    targetContext: activeFieldSpec?.context,
    onImported: handleImported,
  });

  const {
    customMappingOpen,
    setCustomMappingOpen,
    customAnalysis,
    isApplying,
    runCustomSave,
    handleCustomMappingConfirm,
    resetCustomSaveState,
  } = useCustomStatusSave({
    doctype: activeFieldDoctype,
    field: activeFieldSpec?.field ?? '',
    context: activeFieldSpec?.context,
    onApplied: handleApplied,
  });

  React.useEffect(() => {
    if (!isMultiField) return;
    setSourceModuleId('');
    setSourceField('');
    setDraftCatalogStatuses([]);
    resetImportState();
    resetCustomSaveState();
  }, [activeFieldKey, isMultiField, resetCustomSaveState, resetImportState]);

  React.useEffect(() => {
    resetImportState();
    resetCustomSaveState();
  }, [module.id, activeFieldDoctype, resetCustomSaveState, resetImportState]);

  const registerActiveStatusesLoading = React.useCallback((_defaults, meta = {}) => {
    setActiveStatusesLoading(Boolean(meta.isLoading));
  }, []);

  React.useEffect(() => {
    if (!activeFieldSpec?.field) {
      setDraftCatalogStatuses([]);
      setConfigSnapshot(null);
      setConfigLoading(false);
      return;
    }

    let cancelled = false;
    setConfigLoading(true);
    setConfigSnapshot(null);

    (async () => {
      try {
        const message = await getStatusConfiguration({
          doctype: activeFieldDoctype,
          field: activeFieldSpec.field,
          context: activeFieldSpec.context,
        });
        if (cancelled) return;

        const nextActiveSource = normalizeActiveSource(message.active_source);

        setActiveSource(nextActiveSource);
        setConfigSnapshot(message);
        // default_statuses is derived from live is_default rows (single-table model)
        const defaults =
          Array.isArray(message.default_statuses) && message.default_statuses.length > 0
            ? message.default_statuses
            : (message.statuses ?? []).filter((s) => s.is_default || s.isDefault);
        setDraftCatalogStatuses(normalizeDefaultStatuses(defaults));
        setSourceMode(
          allowImport
            ? resolveSourceModeFromActiveSource(nextActiveSource)
            : STATUS_SOURCE_MODE.DEFAULT,
        );
      } catch (error) {
        if (!cancelled) {
          showErrorToast(error, { defaultMessage: 'Unable to load status configuration.' });
          setDraftCatalogStatuses([]);
          setConfigSnapshot(null);
        }
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeFieldDoctype,
    activeFieldSpec?.field,
    activeFieldSpec?.context,
    allowImport,
    refreshKey,
  ]);

  const sourceModuleOptions = React.useMemo(
    () =>
      getSourceModuleOptions(modules, {
        excludeScope: activeFieldSpec
          ? {
              doctype: activeFieldDoctype,
              field: activeFieldSpec.field,
              context: activeFieldSpec.context,
            }
          : null,
      }),
    [activeFieldDoctype, activeFieldSpec, modules],
  );

  const registerSaveHandler = React.useCallback((_index, handler) => {
    saveHandlerRef.current = handler;
  }, []);

  const isDefaultSourceActive = activeSource === ACTIVE_SOURCE.DEFAULT;
  const isCustomSourceActive = activeSource === ACTIVE_SOURCE.CUSTOM;
  const isEditingDefaultActive = sourceMode === STATUS_SOURCE_MODE.DEFAULT && isDefaultSourceActive;
  const isEditingCustomActive = sourceMode === STATUS_SOURCE_MODE.CUSTOM && isCustomSourceActive;
  const isInactivePanel = sourceMode === STATUS_SOURCE_MODE.CUSTOM && !isCustomSourceActive;
  const isPanelLoading =
    isEditingDefaultActive || isEditingCustomActive ? activeStatusesLoading : configLoading;
  const isSaveDisabled =
    isSaving || isApplying || isImporting || importPickerOpen || isPanelLoading || isInactivePanel;

  const handleSave = React.useCallback(async () => {
    setIsSaving(true);
    try {
      if (sourceMode === STATUS_SOURCE_MODE.DEFAULT) {
        if (isDefaultSourceActive) {
          if (!saveHandlerRef.current) {
            showErrorToast('Unable to save. Please try again.');
            return;
          }
          await saveHandlerRef.current();
          return;
        }

        await runCustomSave(draftCatalogStatuses);
        return;
      }

      if (!saveHandlerRef.current) {
        showErrorToast('Unable to save. Please try again.');
        return;
      }
      await saveHandlerRef.current();
    } finally {
      setIsSaving(false);
    }
  }, [draftCatalogStatuses, isDefaultSourceActive, runCustomSave, sourceMode]);

  const selectedSourceModule = React.useMemo(
    () => sourceModuleOptions.find((candidate) => candidate.id === sourceModuleId) ?? null,
    [sourceModuleId, sourceModuleOptions],
  );

  const sourceFieldOptions = selectedSourceModule?.fields || [];

  React.useEffect(() => {
    if (!selectedSourceModule) {
      setSourceField('');
      return;
    }
    const resolved = resolveSourceField(selectedSourceModule, sourceField);
    if (resolved !== sourceField) {
      setSourceField(resolved);
    }
  }, [selectedSourceModule, sourceField]);

  const openImportPicker = React.useCallback(
    (nextModuleId, nextSourceField) => {
      if (!allowImport || !nextModuleId) return;
      setSourceModuleId(nextModuleId);
      if (nextSourceField) setSourceField(nextSourceField);
      setImportPickerOpen(true);
    },
    [allowImport],
  );

  const startSourceImport = React.useCallback(
    (source, preferredFieldKey) => {
      if (!allowImport || !source) return;
      const resolvedSourceField = resolveSourceField(source, preferredFieldKey);
      setSourceField(resolvedSourceField);

      // Multi-column modules need the picker (field + status selection).
      // Single-column modules can import directly.
      if ((source.fields?.length ?? 0) > 1) {
        openImportPicker(source.id, resolvedSourceField);
        return;
      }

      runDirectImport(source, resolvedSourceField);
    },
    [allowImport, openImportPicker, runDirectImport],
  );

  const handleSourceModuleChange = React.useCallback(
    (nextModuleId) => {
      setSourceModuleId(nextModuleId);
      if (
        !allowImport ||
        !nextModuleId ||
        sourceMode !== STATUS_SOURCE_MODE.CUSTOM ||
        !activeFieldSpec
      )
        return;

      const source = sourceModuleOptions.find((candidate) => candidate.id === nextModuleId);
      if (!source) return;
      startSourceImport(source, sourceField);
    },
    [activeFieldSpec, allowImport, sourceField, sourceMode, sourceModuleOptions, startSourceImport],
  );

  const handleSourceFieldChange = React.useCallback(
    (nextSourceField) => {
      setSourceField(nextSourceField);
      if (sourceMode !== STATUS_SOURCE_MODE.CUSTOM || !selectedSourceModule || !nextSourceField)
        return;
      // Field dropdown only appears for multi-column modules — open picker for that field.
      openImportPicker(selectedSourceModule.id, nextSourceField);
    },
    [openImportPicker, selectedSourceModule, sourceMode],
  );

  return (
    <div
      className={
        embedded ? 'flex w-full flex-col gap-4' : 'w-full max-w-5xl mx-auto flex flex-col gap-4'
      }
    >
      {!embedded && onBack ? (
        <nav className='flex items-center gap-1 text-paragraph-sm text-text-sub-600'>
          <button
            type='button'
            onClick={onBack}
            className='hover:text-text-strong-950 transition-colors'
          >
            Status Master
          </button>
          <RiArrowRightSLine className='size-4 shrink-0 text-text-soft-400' />
          <span className='text-text-strong-950'>{moduleTitle}</span>
        </nav>
      ) : null}

      {isMultiField ? (
        <StatusFieldColumnsBar
          fields={fields}
          activeFieldKey={activeFieldKey}
          onActiveFieldChange={setActiveFieldKey}
        />
      ) : null}

      <div className='rounded-2xl border border-stroke-soft-200 bg-bg-white-0 overflow-hidden'>
        <div className='grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]'>
          <StatusSourceSelector
            idPrefix={`status-master-${module.id}`}
            sourceMode={sourceMode}
            onSourceModeChange={setSourceMode}
            sourceModuleId={sourceModuleId}
            onSourceModuleChange={handleSourceModuleChange}
            sourceModuleOptions={sourceModuleOptions}
            sourceField={sourceField}
            onSourceFieldChange={handleSourceFieldChange}
            sourceFieldOptions={sourceFieldOptions}
            allowImport={allowImport}
            className='border-b lg:border-b-0 lg:border-r'
          />

          <div className='min-w-0 bg-bg-white-0'>
            {configLoading ? (
              <p className='text-paragraph-sm text-text-sub-600 py-10 text-center'>Loading…</p>
            ) : sourceMode === STATUS_SOURCE_MODE.DEFAULT ? (
              isDefaultSourceActive ? (
                <div className='p-6'>
                  <StatusFieldTabsPanel
                    doctype={activeFieldDoctype}
                    activeFieldSpec={activeFieldSpec}
                    refreshKey={refreshKey}
                    initialConfig={configSnapshot}
                    syncDefaultCatalog
                    lockDefaultLifecycle={lockDefaultLifecycle}
                    onSaved={handleConfigSaved}
                    onRegisterSave={registerSaveHandler}
                    onRegisterDefaultStatuses={registerActiveStatusesLoading}
                  />
                </div>
              ) : (
                <div className='p-6'>
                  <CustomDefaultStatusesPanel
                    embedded
                    statuses={draftCatalogStatuses}
                    onChange={setDraftCatalogStatuses}
                    isLoading={configLoading}
                  />
                </div>
              )
            ) : isCustomSourceActive ? (
              <div className='p-6'>
                <StatusFieldTabsPanel
                  doctype={activeFieldDoctype}
                  activeFieldSpec={activeFieldSpec}
                  refreshKey={refreshKey}
                  initialConfig={configSnapshot}
                  lockDefaultLifecycle={lockDefaultLifecycle}
                  onSaved={handleConfigSaved}
                  onRegisterSave={registerSaveHandler}
                  onRegisterDefaultStatuses={registerActiveStatusesLoading}
                />
              </div>
            ) : (
              <InactiveSourceNotice
                title='Default statuses are active'
                description='Switch to Default to edit statuses, reorder, change colors, or enable and disable options. Click Save to apply changes to records.'
              />
            )}
          </div>
        </div>

        <div className='flex justify-end gap-2 px-6 py-4 border-t border-stroke-soft-200 bg-bg-white-0'>
          {onBack ? (
            <Button.Root type='button' variant='neutral' mode='stroke' onClick={onBack}>
              Cancel
            </Button.Root>
          ) : null}
          <Button.Root
            type='button'
            variant='primary'
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            {isSaving || isApplying ? 'Saving…' : 'Save'}
          </Button.Root>
        </div>
      </div>

      {allowImport ? (
        <ImportStatusesModal
          open={importPickerOpen}
          onOpenChange={setImportPickerOpen}
          targetDoctype={activeFieldDoctype}
          targetField={activeFieldSpec?.field}
          targetContext={activeFieldSpec?.context}
          targetFieldLabel={activeFieldSpec?.label || activeFieldSpec?.field}
          initialSourceModuleId={sourceModuleId}
          initialSourceFieldKey={sourceField}
          onImported={handleImported}
        />
      ) : null}

      <ImportStatusMappingModal
        open={mappingOpen}
        onOpenChange={setMappingOpen}
        analysis={analysis}
        targetDoctype={activeFieldDoctype}
        targetFieldLabel={activeFieldSpec?.label || activeFieldSpec?.field}
        isSubmitting={isImporting}
        onConfirm={handleMappingConfirm}
      />

      <ImportStatusMappingModal
        open={customMappingOpen}
        onOpenChange={setCustomMappingOpen}
        analysis={customAnalysis}
        targetDoctype={activeFieldDoctype}
        targetFieldLabel={activeFieldSpec?.label || activeFieldSpec?.field}
        title='Apply custom default statuses'
        descriptionPrefix='Some existing'
        isSubmitting={isApplying}
        onConfirm={handleCustomMappingConfirm}
      />
    </div>
  );
}

export default function DynamicStatusMasterPage() {
  const navigate = useNavigate();
  const { moduleId } = useParams();
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canManage = isSuperAdminRole(userSideBarPerm);
  const { modules: rawModules, isLoading: isLoadingModules } = useStatusModules({
    enabled: canManage,
  });
  const modules = React.useMemo(() => orderModulesForStatusMaster(rawModules), [rawModules]);

  const activeModule = React.useMemo(
    () => (moduleId ? (modules.find((m) => m.id === moduleId) ?? null) : null),
    [moduleId, modules],
  );

  React.useEffect(() => {
    if (!canManage) {
      navigate('/settings', { replace: true });
    }
  }, [canManage, navigate]);

  React.useEffect(() => {
    if (canManage && moduleId && !isLoadingModules && !activeModule) {
      navigate('/settings/status-master', { replace: true });
    }
  }, [activeModule, canManage, isLoadingModules, moduleId, navigate]);

  if (!canManage) {
    return (
      <p className='text-paragraph-sm text-text-sub-600 py-10 text-center'>
        Only Super Admin can access Status Master.
      </p>
    );
  }

  if (moduleId && activeModule) {
    return (
      <StatusModuleFieldConfigurator
        module={activeModule}
        modules={modules}
        onBack={() => navigate('/settings/status-master')}
      />
    );
  }

  return (
    <StatusMasterModuleGrid
      modules={modules}
      isLoading={isLoadingModules}
      onSelectModule={(id) => navigate(`/settings/status-master/${id}`)}
    />
  );
}
