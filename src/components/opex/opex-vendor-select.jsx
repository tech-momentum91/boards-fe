import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RiSearchLine, RiCheckLine } from 'react-icons/ri';
import * as Dropdown from '@/components/ui/dropdown';
import * as Avatar from '@/components/ui/avatar';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { upperFirst } from 'lodash';
import { showErrorToast } from '@/utils/error-utils';

export default function OpexVendorSelect({
  value = null,
  onChange,
  vendorOptions = [],
  /** When set, called when the dropdown opens to load options (e.g. per-row center/category). */
  loadVendorOptionsOnOpen = null,
  disabled = false,
  readonly = false,
  placeholder = 'Select vendor',
  /** Table / dense views: show vendor label only (no avatar chip on trigger). */
  plainTrigger = false,
  className,
  triggerClassName,
  truncateAt = null,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftSelection, setDraftSelection] = useState(value ? [value] : []);
  const [fetchedVendorOptions, setFetchedVendorOptions] = useState(null);
  const inputRef = useRef(null);
  const fetchGenRef = useRef(0);

  const displayVendorOptions = useMemo(() => {
    let base;
    if (loadVendorOptionsOnOpen) {
      base = fetchedVendorOptions !== null ? fetchedVendorOptions : vendorOptions;
    } else {
      base = vendorOptions;
    }
    const vid = value?.id;
    if (vid != null && vid !== '' && !base.some((v) => String(v.id) === String(vid))) {
      return [...base, value];
    }
    return base;
  }, [loadVendorOptionsOnOpen, fetchedVendorOptions, vendorOptions, value]);

  // Search/filter vendors
  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return displayVendorOptions;
    const q = searchQuery.toLowerCase();
    return displayVendorOptions.filter((v) => (v?.name ?? '').toLowerCase().includes(q));
  }, [displayVendorOptions, searchQuery]);

  const selectedVendor = open ? draftSelection[0] || null : value || null;

  // Focus input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
  }, [open]);

  const handleOpen = () => {
    if (disabled || readonly) return;
    setDraftSelection(value ? [value] : []);
    setOpen(true);
    if (!loadVendorOptionsOnOpen) return;

    const gen = ++fetchGenRef.current;
    setFetchedVendorOptions(null);
    Promise.resolve(loadVendorOptionsOnOpen())
      .then((opts) => {
        if (gen !== fetchGenRef.current) return;
        setFetchedVendorOptions(Array.isArray(opts) ? opts : []);
      })
      .catch((error) => {
        if (gen !== fetchGenRef.current) return;
        setFetchedVendorOptions([]);
        showErrorToast(error, { defaultMessage: 'Failed to load vendors' });
      });
  };

  const handleClose = () => {
    setOpen(false);
    setSearchQuery('');
    setFetchedVendorOptions(null);
  };

  const handleSelect = (vendor) => {
    const currentId = selectedVendor?.id;
    const nextId = vendor?.id;
    const isSameAsCurrent =
      currentId != null && nextId != null && String(currentId) === String(nextId);
    if (isSameAsCurrent) {
      setDraftSelection([]);
      onChange?.(null);
      handleClose();
      return;
    }
    setDraftSelection([vendor]);
    onChange?.(vendor);
    handleClose();
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setDraftSelection([]);
    onChange?.(null);
  };

  const truncatedVendorLabel =
    plainTrigger &&
    typeof truncateAt === 'number' &&
    truncateAt > 0 &&
    selectedVendor?.name?.length > truncateAt
      ? `${selectedVendor.name.slice(0, truncateAt)}...`
      : selectedVendor?.name;

  const showVendorTooltip =
    plainTrigger &&
    typeof truncateAt === 'number' &&
    truncateAt > 0 &&
    selectedVendor?.name?.length > truncateAt;

  /** Disabled + plain: no dropdown; plain text so hover tooltips work (disabled buttons swallow hover). */
  if (disabled && plainTrigger) {
    return (
      <div className={cn('w-full min-w-0', className)}>
        {selectedVendor ? (
          showVendorTooltip ? (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <span
                  className={cn(
                    'text-paragraph-sm text-text-main-900 whitespace-nowrap truncate max-w-full block text-left opacity-50 cursor-default',
                    triggerClassName,
                  )}
                >
                  {truncatedVendorLabel}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content side='bottom'>{selectedVendor.name}</Tooltip.Content>
            </Tooltip.Root>
          ) : (
            <span
              className={cn(
                'text-paragraph-sm text-text-main-900 whitespace-nowrap truncate max-w-full block text-left opacity-50 cursor-default',
                triggerClassName,
              )}
            >
              {truncatedVendorLabel}
            </span>
          )
        ) : (
          <span className='text-paragraph-sm text-text-soft-400'>{placeholder}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('w-full min-w-0', className)}>
      <Dropdown.Root open={open} onOpenChange={(isOpen) => (isOpen ? handleOpen() : handleClose())}>
        <Dropdown.Trigger asChild>
          <Button.Root
            type='button'
            disabled={disabled}
            variant='neutral'
            mode='ghost'
            className={cn(
              'w-full text-left justify-start',
              disabled && 'opacity-50 cursor-not-allowed',
              triggerClassName,
            )}
          >
            {selectedVendor ? (
              plainTrigger ? (
                showVendorTooltip ? (
                  <Tooltip.Root size='xsmall'>
                    <Tooltip.Trigger asChild>
                      <span className='text-paragraph-sm text-text-main-900 whitespace-nowrap truncate max-w-full block text-left'>
                        {truncatedVendorLabel}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content side='bottom'>{selectedVendor.name}</Tooltip.Content>
                  </Tooltip.Root>
                ) : (
                  <span className='text-paragraph-sm text-text-main-900 whitespace-nowrap truncate max-w-full block text-left'>
                    {truncatedVendorLabel}
                  </span>
                )
              ) : (
                <div className='inline-flex items-center gap-2'>
                  <Avatar.Root size={24}>
                    {selectedVendor.avatar ? (
                      <Avatar.Image src={selectedVendor.avatar} alt={selectedVendor.name} />
                    ) : (
                      <span className='text-label-sm'>
                        {selectedVendor.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </span>
                    )}
                  </Avatar.Root>
                  <span className='text-paragraph-sm text-text-main-900 whitespace-nowrap'>
                    {selectedVendor.name}
                  </span>
                </div>
              )
            ) : (
              <span className='text-paragraph-sm text-text-soft-400'>{placeholder}</span>
            )}
          </Button.Root>
        </Dropdown.Trigger>
        <Dropdown.Content className='w-[320px] p-0 gap-0 max-h-[300px]' align='start'>
          {/* 🔍 Search Header (fixed) */}
          <div className='p-2 border-b border-stroke-soft-200'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  ref={inputRef}
                  placeholder='Search vendors...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  autoComplete='off'
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          {/* 📜 Scrollable Vendor List */}
          <div className='max-h-[250px] overflow-y-auto p-2'>
            {filteredVendors.length === 0 ? (
              <div className='flex items-center justify-center py-8'>
                <span className='text-paragraph-sm text-text-soft-400'>No vendors found</span>
              </div>
            ) : (
              <div className='flex flex-col gap-1'>
                {filteredVendors.map((vendor) => {
                  const isSelected =
                    selectedVendor != null && String(selectedVendor.id) === String(vendor.id);

                  return (
                    <Dropdown.Item
                      key={vendor.id}
                      onSelect={() => handleSelect(vendor)}
                      className={cn(
                        'group/item relative cursor-pointer select-none rounded-lg p-2 flex items-center gap-2 transition duration-200 ease-out',
                        isSelected && 'bg-bg-weak-50',
                      )}
                    >
                      <Avatar.Root size={24}>
                        {vendor.avatar ? (
                          <Avatar.Image src={vendor.avatar} alt={vendor.name} />
                        ) : (
                          <span className='text-label-xs'>
                            {(() => {
                              const parts = vendor.name.trim().split(' ');
                              return (
                                (upperFirst(parts[0])[0] || '') +
                                (parts[1] ? upperFirst(parts[1])[0] : '')
                              );
                            })()}
                          </span>
                        )}
                      </Avatar.Root>

                      <span className='text-paragraph-sm text-text-main-900'>{vendor.name}</span>

                      {isSelected && <RiCheckLine className='size-4 text-text-main-900 ml-auto' />}
                    </Dropdown.Item>
                  );
                })}
              </div>
            )}
          </div>
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  );
}
