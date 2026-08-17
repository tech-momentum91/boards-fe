import React, { memo, useMemo } from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';

import { getProjectBoqVersionStatusLabel } from '@/components/boq/constants';
import * as Button from '@/components/ui/button';
import * as Dropdown from '@/components/ui/dropdown';
import { cn } from '@/utils/cn';

const ProjectBoqOverviewFilterBar = memo(
  ({ options = [], activeId, onChange, versions = [], activeVersionId = '', onVersionChange }) => {
    const activeVersion = useMemo(
      () => versions.find((version) => version.id === activeVersionId) ?? versions[0] ?? null,
      [activeVersionId, versions],
    );
    const activeVersionLabel = activeVersion
      ? `${activeVersion.label}${activeVersion.status ? ` · ${getProjectBoqVersionStatusLabel(activeVersion.status)}` : ''}`
      : 'Select version';

    return (
      <div className='shrink-0 border-b border-stroke-soft-200 bg-[#e8e9ed]/30'>
        <div className='flex h-12 items-center gap-1.5 px-8'>
          {options.map((option) => {
            const isActive = option.id === activeId;
            return (
              <button
                key={option.id}
                type='button'
                onClick={() => onChange?.(option.id)}
                className={cn(
                  'inline-flex shrink-0 items-center rounded-md border bg-white px-3 py-1 text-[14px] font-medium leading-5 text-[#344054] transition-colors',
                  isActive
                    ? 'border-[rgba(71,84,103,0.5)] border-[1.5px]'
                    : 'border-[#eaecf0] hover:bg-bg-weak-50',
                )}
              >
                {option.label}
              </button>
            );
          })}
          {versions.length > 0 ? (
            <div className='ml-auto flex items-center gap-2 text-paragraph-sm text-text-sub-500'>
              <Dropdown.Root>
                <Dropdown.Trigger asChild>
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='small'
                    className='h-8 min-w-[140px] justify-between gap-2 bg-bg-white-0'
                    aria-label='Select BOQ version'
                  >
                    <span className='truncate'>{activeVersionLabel}</span>
                    <RiArrowDownSLine className='size-4 shrink-0 text-text-soft-400' aria-hidden />
                  </Button.Root>
                </Dropdown.Trigger>
                <Dropdown.Content align='end' sideOffset={8} className='w-[240px]'>
                  {versions.map((version) => {
                    const isActive = version.id === activeVersion?.id;
                    return (
                      <Dropdown.Item
                        key={version.id}
                        className={cn(
                          'justify-between rounded-lg px-2.5 py-2',
                          isActive && 'bg-bg-weak-50',
                        )}
                        onSelect={() => {
                          if (!isActive) onVersionChange?.(version.id);
                        }}
                      >
                        <span>{version.label}</span>
                        {version.status ? (
                          <span className='text-paragraph-xs text-text-sub-500'>
                            {getProjectBoqVersionStatusLabel(version.status)}
                          </span>
                        ) : null}
                      </Dropdown.Item>
                    );
                  })}
                </Dropdown.Content>
              </Dropdown.Root>
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

ProjectBoqOverviewFilterBar.displayName = 'ProjectBoqOverviewFilterBar';

export default ProjectBoqOverviewFilterBar;
