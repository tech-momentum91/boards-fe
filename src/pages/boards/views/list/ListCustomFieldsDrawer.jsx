import { useState } from 'react';
import * as Drawer from '@/components/ui/drawer';
import { cn } from '@/utils/cn';
import { CustomTabPanel, ErpFieldsPanel, ErpModuleSidebar, StandardTabPanel } from './ErpTabPanel';
import CreateCustomFieldPanel from './components/CreateCustomFieldPanel';
import {
  CUSTOM_FIELDS_TABS,
  CUSTOM_TAB_ALL_FIELDS,
} from './constants/list-custom-fields-constants';

function getCatalogFieldKey(field) {
  return field.templateId ?? field.type;
}

function SectionHeader({ children }) {
  return (
    <div className='px-2'>
      <span className='text-[11px] font-medium uppercase leading-3 tracking-[0.22px] text-text-soft-400'>
        {children}
      </span>
    </div>
  );
}

function FieldItem({ field, isActive = false, onClick }) {
  const Icon = field.icon;

  return (
    <button
      type='button'
      onClick={() => onClick?.(field)}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition-colors',
        isActive ? 'bg-bg-weak-100' : 'hover:bg-bg-weak-100',
      )}
    >
      <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
        <Icon size={18} />
      </span>
      <span className='text-sm font-medium leading-5 tracking-[-0.084px] text-text-sub-500'>
        {field.label}
      </span>
    </button>
  );
}

function FieldSection({ title, fields, activeFieldKey, onFieldSelect }) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-col gap-3 border-b border-stroke-soft-200 px-4 pb-4 last:border-b-0'>
      <SectionHeader>{title}</SectionHeader>
      <div className='flex flex-col gap-1'>
        {fields.map((field) => (
          <FieldItem
            key={getCatalogFieldKey(field)}
            field={field}
            isActive={activeFieldKey === getCatalogFieldKey(field)}
            onClick={onFieldSelect}
          />
        ))}
      </div>
    </div>
  );
}

function CustomTabFieldsContent({ activeFieldKey, onFieldSelect }) {
  return (
    <FieldSection
      title='All'
      fields={CUSTOM_TAB_ALL_FIELDS}
      activeFieldKey={activeFieldKey}
      onFieldSelect={onFieldSelect}
    />
  );
}

function TabBar({ activeTab, onTabChange }) {
  return (
    <div className='flex h-10 shrink-0 items-center gap-6 border-b border-stroke-soft-200 px-6'>
      {CUSTOM_FIELDS_TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type='button'
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative flex h-full items-center text-sm font-medium leading-5 tracking-[-0.084px] transition-colors',
              isActive ? 'text-text-main-900' : 'text-text-sub-500 hover:text-text-main-900',
            )}
          >
            {tab.label}
            {isActive ? (
              <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary-base' />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default function ListCustomFieldsDrawer({
  open = false,
  onOpenChange,
  onFieldCreate,
  existingColumns = [],
  standardFields = [],
  onStandardFieldToggle,
  onStandardHideAll,
  onCustomFieldToggle,
  onCustomHideAll,
  onErpFieldToggle,
  onErpHideAll,
}) {
  const [activeTab, setActiveTab] = useState('custom');
  const [activeFieldKey, setActiveFieldKey] = useState(null);
  const [selectedCatalogField, setSelectedCatalogField] = useState(null);
  const [activeErpModuleId, setActiveErpModuleId] = useState('clients');
  const isErpTab = activeTab === 'erp';
  const isCreateView = Boolean(selectedCatalogField);

  const handleClose = () => {
    setSelectedCatalogField(null);
    setActiveFieldKey(null);
    onOpenChange?.(false);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setActiveFieldKey(null);
    setSelectedCatalogField(null);
  };

  const handleFieldSelect = (field) => {
    setActiveFieldKey(getCatalogFieldKey(field));
    setSelectedCatalogField(field);
  };

  const handleBackToCatalog = () => {
    setSelectedCatalogField(null);
    setActiveFieldKey(null);
  };

  const handleCreateField = (form) => {
    onFieldCreate?.(form);
    handleClose();
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
    >
      <Drawer.Content
        className={cn(
          'flex h-full flex-col overflow-hidden',
          isErpTab ? 'max-w-[640px]' : 'max-w-[400px]',
        )}
      >
        {!isCreateView ? (
          <Drawer.Header className='relative shrink-0 px-6 py-5'>
            <Drawer.Title className='label-medium text-text-main-900'>Custom Fields</Drawer.Title>
          </Drawer.Header>
        ) : null}

        {isCreateView ? (
          <CreateCustomFieldPanel
            key={getCatalogFieldKey(selectedCatalogField)}
            catalogField={selectedCatalogField}
            existingColumns={existingColumns}
            onBack={handleBackToCatalog}
            onCreate={handleCreateField}
          />
        ) : isErpTab ? (
          <div className='flex min-h-0 flex-1'>
            <ErpModuleSidebar
              activeModuleId={activeErpModuleId}
              onModuleChange={setActiveErpModuleId}
            />

            <div className='flex min-w-0 flex-1 flex-col'>
              <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
              <ErpFieldsPanel
                activeModuleId={activeErpModuleId}
                customColumns={existingColumns}
                onToggleField={onErpFieldToggle}
                onHideAll={onErpHideAll}
              />
            </div>
          </div>
        ) : (
          <>
            <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
            <Drawer.Body className='min-h-0 flex-1 overflow-y-auto p-0'>
              {activeTab === 'standard' ? (
                <StandardTabPanel
                  fields={standardFields}
                  onToggleField={onStandardFieldToggle}
                  onHideAll={onStandardHideAll}
                />
              ) : (
                <div className='pt-4'>
                  <CustomTabPanel
                    customColumns={existingColumns}
                    onToggleField={onCustomFieldToggle}
                    onHideAll={onCustomHideAll}
                  >
                    <CustomTabFieldsContent
                      activeFieldKey={activeFieldKey}
                      onFieldSelect={handleFieldSelect}
                    />
                  </CustomTabPanel>
                </div>
              )}
            </Drawer.Body>
          </>
        )}
      </Drawer.Content>
    </Drawer.Root>
  );
}
