import React, { useMemo, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine } from 'react-icons/ri';

import { PROJECT_BOQ_TEMPLATE_SELECT_TAB_IDS } from '@/components/boq/constants';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

const TAB_OPTIONS = [
  { id: PROJECT_BOQ_TEMPLATE_SELECT_TAB_IDS.TEMPLATE_MASTER, label: 'Template master' },
  { id: PROJECT_BOQ_TEMPLATE_SELECT_TAB_IDS.PREVIOUS_PROJECTS, label: 'Previous projects' },
];

const ProjectBoqTemplateSelect = ({
  value,
  onValueChange,
  options,
  error,
  placeholder = 'Select',
}) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(PROJECT_BOQ_TEMPLATE_SELECT_TAB_IDS.TEMPLATE_MASTER);

  const templateMasterOptions = options?.templateMaster ?? [];
  const previousProjectOptions = options?.previousProjects ?? [];

  const currentOptions = useMemo(() => {
    return activeTab === PROJECT_BOQ_TEMPLATE_SELECT_TAB_IDS.PREVIOUS_PROJECTS
      ? previousProjectOptions
      : templateMasterOptions;
  }, [activeTab, previousProjectOptions, templateMasterOptions]);

  const selectedLabel = useMemo(() => {
    const all = [...templateMasterOptions, ...previousProjectOptions];
    return all.find((option) => option.value === value)?.label ?? '';
  }, [templateMasterOptions, previousProjectOptions, value]);

  const handleSelect = (optionValue) => {
    onValueChange?.(optionValue);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg border border-stroke-soft-200',
            'bg-bg-white-0 px-2.5 py-2 text-left shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]',
            'text-paragraph-sm transition-colors hover:bg-bg-weak-50',
            error && 'ring-2 ring-error-base',
          )}
        >
          <span className={cn(selectedLabel ? 'text-text-main-900' : 'text-text-sub-500')}>
            {selectedLabel || placeholder}
          </span>
          <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
        </button>
      </Popover.Trigger>

      <Popover.Content
        align='start'
        sideOffset={4}
        className='w-[var(--radix-popover-trigger-width)] min-w-[280px] rounded-2xl border border-stroke-soft-200 p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      >
        <div className='mb-3.5 flex gap-1 rounded-[10px] bg-bg-weak-100 p-1'>
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab.id}
              type='button'
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 rounded-md px-1 py-1 text-label-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-bg-white-0 text-text-main-900 shadow-[0px_6px_10px_0px_rgba(27,28,29,0.06),0px_2px_4px_0px_rgba(27,28,29,0.02)]'
                  : 'text-text-soft-400',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className='max-h-[240px] overflow-y-auto'>
          {currentOptions.length === 0 ? (
            <p className='px-2 py-3 text-paragraph-sm text-text-sub-500'>No options available</p>
          ) : (
            currentOptions.map((option) => {
              const isSelected = value === option.value;
              return (
                <button
                  key={option.value}
                  type='button'
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left',
                    isSelected ? 'bg-bg-weak-100' : 'hover:bg-bg-weak-100',
                  )}
                >
                  <span
                    className={cn(
                      'text-paragraph-sm',
                      isSelected ? 'font-medium text-text-main-900' : 'text-text-main-900',
                    )}
                  >
                    {option.label}
                  </span>
                  {isSelected ? (
                    <RiCheckLine className='size-5 shrink-0 text-text-sub-600' aria-hidden />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};

export default ProjectBoqTemplateSelect;
