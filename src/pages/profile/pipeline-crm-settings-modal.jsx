import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowRightSLine, RiCheckLine, RiSearchLine, RiSettings3Line } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Modal from '@/components/ui/modal';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import { cn } from '@/utils/cn';

const MODAL_WIDTH_PX = 560;
const MODAL_BODY_HEIGHT_PX = 360;

const TAB_COPY = {
  product: {
    emptyNone:
      'No CRM Lead Products found. Products are managed in the backend CRM Lead Product doctype.',
    emptySearch: 'No products match your search.',
  },
  'drop-reason': {
    emptyNone: 'No drop reasons yet. Add one below or in CRM Setup.',
    emptySearch: 'No drop reasons match your search.',
    addPlaceholder: 'Enter Drop Reason',
  },
  'lead-relevance': {
    emptyNone: 'No lead relevance options yet. Add one below or in CRM Setup.',
    emptySearch: 'No lead relevance options match your search.',
    addPlaceholder: 'Enter Lead Relevance',
  },
  'lead-size': {
    emptyNone: 'No lead sizes yet. Add one below or in CRM Setup.',
    emptySearch: 'No lead sizes match your search.',
    addPlaceholder: 'Enter Lead Size',
  },
};

const PipelineSettingsOptionRow = ({ value, label, checked, disabled, disabledHint, onToggle }) => (
  <button
    type='button'
    role='option'
    aria-selected={checked}
    title={disabled ? disabledHint : undefined}
    disabled={disabled}
    onClick={() => {
      if (!disabled) onToggle?.(value);
    }}
    className={cn(
      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-paragraph-sm text-text-strong-950 transition duration-200 ease-out',
      checked ? 'bg-bg-weak-50' : 'bg-transparent hover:bg-bg-weak-50',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    )}
  >
    <span className='min-w-0 flex-1 truncate'>{label}</span>
    {checked && !disabled ? (
      <RiCheckLine className='size-5 shrink-0 text-text-soft-400' aria-hidden />
    ) : null}
  </button>
);

const PipelineSettingsAddInput = ({
  addPlaceholder,
  newValue,
  onNewValueChange,
  onCommitAdd,
  isCreating,
  isDisabled,
  inputRef,
}) => {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onCommitAdd?.();
    }
  };

  const handleBlur = () => {
    if (newValue.trim()) {
      onCommitAdd?.();
    }
  };

  return (
    <div className='relative w-full'>
      <input
        ref={inputRef}
        type='text'
        value={newValue}
        onChange={(event) => onNewValueChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={addPlaceholder}
        disabled={isCreating || isDisabled}
        className='w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm text-text-strong-950 outline-none transition-[border-color,box-shadow] placeholder:text-text-soft-400 focus:border-primary-base focus:ring-2 focus:ring-primary-base/20 disabled:cursor-not-allowed disabled:opacity-60'
        aria-label={addPlaceholder}
      />
      {isCreating ? (
        <span className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-primary-base/30 border-t-primary-base' />
      ) : null}
    </div>
  );
};

const PipelineCrmSettingsModal = ({
  isOpen,
  onOpenChange,
  tabs,
  activeTab,
  onTabChange,
  searchValue,
  onSearchChange,
  options,
  totalOptionsCount,
  selectedValues,
  selectionCountsByTab,
  onToggleOption,
  isSaving,
  newValue,
  onNewValueChange,
  onCommitAddValue,
  isCreatingValue,
  newValueInputRef,
  selectionMode = 'multiple',
  disabledOptionHints = {},
  onCancel,
  onSave,
  saveDisabled = false,
}) => {
  const tabCopy = TAB_COPY[activeTab] ?? TAB_COPY['drop-reason'];
  const isSingleSelect = selectionMode === 'single';
  const showAddInput = activeTab !== 'product';
  const isInteractionDisabled = isSaving || isCreatingValue;
  const selectedSingleValue = selectedValues[0] ?? '';
  const listScrollRef = useRef(null);
  const optionsContentRef = useRef(null);
  const pinnedAddInputRef = useRef(null);
  const [isListOverflowing, setIsListOverflowing] = useState(false);

  useEffect(() => {
    const listEl = listScrollRef.current;
    const optionsEl = optionsContentRef.current;
    if (!listEl || !optionsEl) return undefined;

    const updateOverflow = () => {
      if (!showAddInput) {
        setIsListOverflowing(false);
        return;
      }

      const panelHeight = listEl.parentElement?.clientHeight ?? listEl.clientHeight;
      const pinnedAddHeight = pinnedAddInputRef.current?.offsetHeight ?? 0;
      const optionsHeight = optionsEl.scrollHeight;
      const inlineAddHeight = 40;
      const listGap = 8;

      const fitsInline = optionsHeight + inlineAddHeight + listGap <= panelHeight + 1;
      if (fitsInline) {
        setIsListOverflowing(false);
        return;
      }

      const scrollableHeight = panelHeight - pinnedAddHeight;
      setIsListOverflowing(optionsHeight > scrollableHeight + 1);
    };

    updateOverflow();

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateOverflow);
    });
    resizeObserver.observe(listEl);
    resizeObserver.observe(optionsEl);
    if (pinnedAddInputRef.current) {
      resizeObserver.observe(pinnedAddInputRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [activeTab, options, showAddInput, newValue, isListOverflowing]);

  const addInput = showAddInput ? (
    <PipelineSettingsAddInput
      addPlaceholder={tabCopy.addPlaceholder}
      newValue={newValue}
      onNewValueChange={onNewValueChange}
      onCommitAdd={onCommitAddValue}
      isCreating={isCreatingValue}
      isDisabled={isInteractionDisabled}
      inputRef={newValueInputRef}
    />
  ) : null;

  const emptyMessage = useMemo(() => {
    if (totalOptionsCount === 0) return tabCopy.emptyNone;
    return tabCopy.emptySearch;
  }, [tabCopy.emptyNone, tabCopy.emptySearch, totalOptionsCount]);

  const renderOptions = () => {
    if (options.length === 0) {
      return (
        <div className='flex min-h-[160px] items-center justify-center px-1 py-4'>
          <p className='text-center text-label-sm text-text-soft-400'>{emptyMessage}</p>
        </div>
      );
    }

    return options.map((opt) => {
      const value = String(opt?.value ?? '').trim();
      const label = String(opt?.label ?? opt?.value ?? '').trim() || value;
      if (!value) return null;

      const disabledHint = disabledOptionHints[value];
      const isDisabled = Boolean(disabledHint) || isInteractionDisabled;
      const checked = isSingleSelect
        ? selectedSingleValue === value
        : selectedValues.includes(value);

      return (
        <PipelineSettingsOptionRow
          key={value}
          value={value}
          label={label}
          checked={checked}
          disabled={isDisabled}
          disabledHint={disabledHint ? `Already assigned to "${disabledHint}" pipeline` : undefined}
          onToggle={onToggleOption}
        />
      );
    });
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content
        className='flex w-[560px] max-w-[560px] flex-col overflow-hidden rounded-[20px]'
        style={{ width: MODAL_WIDTH_PX, maxWidth: MODAL_WIDTH_PX }}
        showClose
        overlayClassName='z-[100]'
      >
        <Modal.Header
          icon={RiSettings3Line}
          title='Configure'
          description='Configure product, drop reasons, lead relevance, and lead size.'
        />

        <Modal.Body className='min-h-0 flex-1 p-0'>
          <TabMenuVertical.Root
            value={activeTab}
            onValueChange={onTabChange}
            className='flex w-full overflow-hidden'
            style={{
              height: MODAL_BODY_HEIGHT_PX,
              minHeight: MODAL_BODY_HEIGHT_PX,
              maxHeight: MODAL_BODY_HEIGHT_PX,
            }}
          >
            <TabMenuVertical.List className='h-full w-[196px] min-h-0 shrink-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-bl-[20px] border-r border-stroke-soft-200 bg-bg-weak-100 p-3'>
              <p className='subheading-2xs mb-2 px-2 uppercase tracking-wide text-text-soft-400'>
                Pipelines
              </p>
              <div className='space-y-1'>
                {tabs.map((tab) => {
                  const count = selectionCountsByTab?.[tab.id] ?? 0;
                  return (
                    <TabMenuVertical.Trigger
                      key={tab.id}
                      value={tab.id}
                      className='grid-cols-[minmax(0,1fr)_auto] gap-2 data-[state=active]:bg-bg-white-0 data-[state=active]:text-text-strong-950 data-[state=active]:shadow-regular-sm'
                    >
                      <span className='truncate' title={tab.label}>
                        {tab.label}
                      </span>
                      {count > 0 ? (
                        <Badge.Root
                          size='medium'
                          variant='filled'
                          className='shrink-0 rounded-full bg-text-strong-950 text-white'
                        >
                          {count}
                        </Badge.Root>
                      ) : (
                        <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                      )}
                    </TabMenuVertical.Trigger>
                  );
                })}
              </div>
            </TabMenuVertical.List>

            <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-br-[20px] bg-bg-white-0'>
              <div className='shrink-0 p-3 pb-2'>
                <Input.Root size='xsmall'>
                  <Input.Wrapper>
                    <Input.Icon as={RiSearchLine} />
                    <Input.Input
                      type='text'
                      placeholder='Search...'
                      value={searchValue}
                      onChange={(event) => onSearchChange(event.target.value)}
                      aria-label='Search options'
                      disabled={isInteractionDisabled}
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>

              <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
                <div
                  ref={listScrollRef}
                  className={cn(
                    'min-h-0 flex-1 overflow-y-auto overscroll-contain px-3',
                    isListOverflowing ? 'pb-2' : 'pb-3',
                  )}
                  role='listbox'
                  aria-label='Pipeline CRM settings options'
                  aria-multiselectable={!isSingleSelect}
                >
                  <div ref={optionsContentRef} className='flex flex-col gap-1'>
                    {renderOptions()}
                    {showAddInput && !isListOverflowing ? (
                      <div className='pt-1'>{addInput}</div>
                    ) : null}
                  </div>
                </div>

                {showAddInput && isListOverflowing ? (
                  <div
                    ref={pinnedAddInputRef}
                    className='shrink-0 border-t border-stroke-soft-200 bg-bg-white-0 px-3 py-2'
                  >
                    {addInput}
                  </div>
                ) : null}
              </div>
            </div>
          </TabMenuVertical.Root>
        </Modal.Body>

        <Modal.Footer className='mt-0 flex w-full shrink-0 flex-row items-center justify-end gap-3 border-t border-stroke-soft-200'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            disabled={isSaving}
            onClick={onCancel}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            disabled={isSaving || isCreatingValue || saveDisabled}
            title={saveDisabled ? 'Select at least one product before saving.' : undefined}
            onClick={onSave}
          >
            {isSaving ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white' />
                Saving…
              </span>
            ) : (
              'Save'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default PipelineCrmSettingsModal;
