import React, { useRef } from 'react';
import { RiArrowDownSLine, RiArrowUpLine, RiUpload2Line } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Dropdown from '@/components/ui/dropdown';
import * as Tooltip from '@/components/ui/tooltip';
import {
  THREE_D_UPLOAD_MENU_OPTIONS,
  THREE_D_UPLOAD_MODES,
} from '@/components/projects/three-d/project-three-d-attachment-helpers';
import { cn } from '@/utils/cn';

export default function ProjectThreeDUploadMenu({
  onUpload,
  variant = 'button',
  buttonLabel = 'Upload Files',
  buttonSize = 'small',
  align = 'end',
  className,
  disabled = false,
}) {
  const fileInputRef = useRef(null);
  const pendingModeRef = useRef(THREE_D_UPLOAD_MODES.FILE);

  const openFilePicker = (mode) => {
    pendingModeRef.current = mode;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (files.length === 0) return;
    onUpload?.(pendingModeRef.current, files);
  };

  const menuItems = (
    <>
      {THREE_D_UPLOAD_MENU_OPTIONS.map((option) => (
        <Dropdown.Item
          key={option.id}
          disabled={disabled}
          onSelect={() => openFilePicker(option.id)}
        >
          <Dropdown.ItemIcon as={RiArrowUpLine} />
          {option.label}
        </Dropdown.Item>
      ))}
    </>
  );

  if (variant === 'icon') {
    return (
      <div className={cn('inline-flex items-center', className)}>
        <input
          ref={fileInputRef}
          type='file'
          multiple
          className='hidden'
          onChange={handleFileChange}
        />
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type='button'
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                openFilePicker(THREE_D_UPLOAD_MODES.NEW_VERSION);
              }}
              className='inline-flex size-7 items-center justify-center rounded-md text-text-sub-500 transition hover:bg-bg-weak-50 hover:text-text-strong-950 disabled:opacity-50'
              aria-label='Upload New Version'
            >
              <RiUpload2Line className='size-4' />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content>Upload New Version</Tooltip.Content>
        </Tooltip.Root>
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type='file'
        multiple
        className='hidden'
        onChange={handleFileChange}
      />
      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size={buttonSize}
            disabled={disabled}
            className='flex flex-row gap-1.5'
          >
            <Button.Icon as={RiArrowUpLine} />
            {buttonLabel}
            <RiArrowDownSLine className='size-4 text-text-soft-400' />
          </Button.Root>
        </Dropdown.Trigger>
        <Dropdown.Content align={align} sideOffset={8} className='w-[240px] p-2'>
          {menuItems}
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  );
}
