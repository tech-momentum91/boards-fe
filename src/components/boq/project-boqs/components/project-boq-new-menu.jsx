import React, { useMemo } from 'react';

import { PROJECT_BOQ_NEW_OPTIONS } from '@/components/boq/constants';
import * as Dropdown from '@/components/ui/dropdown';
import { cn } from '@/utils/cn';

const ProjectBoqNewMenu = ({ children, onSelect, excludeOptionIds = [] }) => {
  const options = useMemo(() => {
    const excluded = new Set(excludeOptionIds);
    return PROJECT_BOQ_NEW_OPTIONS.filter((option) => !excluded.has(option.id));
  }, [excludeOptionIds]);

  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>{children}</Dropdown.Trigger>

      <Dropdown.Content
        align='end'
        sideOffset={8}
        className='w-[281px] gap-1 rounded-2xl p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      >
        {options.map((option) => {
          const Icon = option.Icon;

          return (
            <Dropdown.Item
              key={option.id}
              className='gap-3 rounded-[10px] p-2 focus:bg-bg-weak-100 data-[highlighted]:bg-bg-weak-100'
              onSelect={() => onSelect?.(option.id)}
            >
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  'border border-stroke-soft-200 bg-bg-white-0',
                  'shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]',
                )}
              >
                <Icon className='size-5 text-text-sub-600' aria-hidden />
              </span>
              <span className='flex min-w-0 flex-1 flex-col gap-1'>
                <span className='text-label-sm font-medium text-text-main-900'>{option.title}</span>
                <span className='text-paragraph-xs text-text-sub-500'>{option.description}</span>
              </span>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Content>
    </Dropdown.Root>
  );
};

export default ProjectBoqNewMenu;
