import React from 'react';
import { RiArrowRightLine, RiErrorWarningLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Select from '@/components/ui/select';
import * as Radio from '@/components/ui/radio';
import { cn } from '@/utils/cn';
import { storageColorToPickerSwatch } from '@/components/ui/status-color-pill';

function getRecordLabel(doctype) {
  const labels = {
    Customer: 'client',
    'HD Ticket': 'ticket',
    Agreement: 'agreement',
    'Operating Expenses': 'expense',
    'Space Booking': 'booking',
    Center: 'center',
  };
  return labels[doctype] || 'record';
}

function buildInitialMappings(unmatched = []) {
  const initial = {};
  unmatched.forEach((row) => {
    initial[row.label] = '';
  });
  return initial;
}

function getAnalysisKey(analysis) {
  if (!analysis) return null;
  const unmatched = (analysis.unmatched_in_use || []).map((row) => row.label).join('\0');
  const imports = (analysis.import_statuses || []).map((row) => row.label).join('\0');
  return `${unmatched}::${imports}`;
}

function isSelectPortalTarget(target) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest('[data-radix-select-content]') ||
      target.closest('[data-radix-select-viewport]') ||
      target.closest('[role="listbox"]'),
    )
  );
}

export default function ImportStatusMappingModal({
  open,
  onOpenChange,
  analysis,
  targetDoctype,
  targetFieldLabel,
  title = 'Different statuses',
  descriptionPrefix = 'Some existing',
  onConfirm,
  isSubmitting = false,
}) {
  const idPrefix = React.useId();
  const strategyMapId = `${idPrefix}-import-strategy-map`;
  const strategyBulkId = `${idPrefix}-import-strategy-bulk`;
  const [strategy, setStrategy] = React.useState('map');
  const [mappings, setMappings] = React.useState({});
  const [replaceAllWith, setReplaceAllWith] = React.useState('');

  const unmatched = analysis?.unmatched_in_use || [];
  const importOptions = analysis?.import_statuses || [];
  const analysisKey = getAnalysisKey(analysis);
  const affectedCount = analysis?.affected_count || 0;
  const recordLabel = getRecordLabel(targetDoctype);
  const recordLabelPlural = affectedCount === 1 ? recordLabel : `${recordLabel}s`;
  const columnLabel = targetFieldLabel || analysis?.field_name || 'column';

  React.useEffect(() => {
    if (!open) {
      setStrategy('map');
      setMappings({});
      setReplaceAllWith('');
      return;
    }

    const nextUnmatched = analysis?.unmatched_in_use || [];
    const nextImportOptions = analysis?.import_statuses || [];
    const defaultOption = nextImportOptions[0]?.label || '';

    setMappings(buildInitialMappings(nextUnmatched));
    setReplaceAllWith(defaultOption);
    setStrategy('map');
  }, [open, analysisKey]);

  const applyBulkMapping = React.useCallback(
    (nextValue) => {
      if (!nextValue) return;
      setMappings((prev) => {
        const next = { ...prev };
        unmatched.forEach((row) => {
          next[row.label] = nextValue;
        });
        return next;
      });
    },
    [unmatched],
  );

  const handleStrategyChange = (nextStrategy) => {
    setStrategy(nextStrategy);
    if (nextStrategy === 'bulk' && replaceAllWith) {
      applyBulkMapping(replaceAllWith);
    }
  };

  const handleReplaceAllChange = (nextValue) => {
    setReplaceAllWith(nextValue);
    if (strategy === 'bulk') {
      applyBulkMapping(nextValue);
    }
  };

  const handleMappingChange = (oldLabel, newLabel) => {
    setMappings((prev) => ({ ...prev, [oldLabel]: newLabel }));
  };

  const allMapped = unmatched.every((row) => Boolean(mappings[row.label]));

  const handleConfirm = () => {
    const statusMappings = {};
    unmatched.forEach((row) => {
      const mapped = mappings[row.label];
      if (mapped) {
        statusMappings[row.label] = mapped;
      }
    });
    onConfirm?.({ statusMappings });
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className='max-w-[640px]'
        showClose
        onPointerDownOutside={(event) => {
          if (isSelectPortalTarget(event.target)) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (isSelectPortalTarget(event.target)) {
            event.preventDefault();
          }
        }}
      >
        <Modal.Header
          icon={RiErrorWarningLine}
          title={title}
          description={`${descriptionPrefix} ${recordLabelPlural} use statuses that are not in the import set for ${columnLabel}. ${affectedCount} ${recordLabelPlural} will be affected. Choose how to handle them.`}
        />
        <Modal.Body className='flex flex-col gap-5'>
          <Radio.Group
            value={strategy}
            onValueChange={handleStrategyChange}
            className='grid grid-cols-1 sm:grid-cols-2 gap-3'
          >
            <Radio.Label
              htmlFor={strategyMapId}
              noBg
              className={cn(
                'flex flex-col gap-1 rounded-2xl border p-4 cursor-pointer transition-colors',
                strategy === 'map'
                  ? 'border-primary-base bg-primary-alpha-10'
                  : 'border-stroke-soft-200 bg-bg-white-0 hover:bg-bg-weak-50',
              )}
            >
              <span className='flex items-start justify-between gap-2'>
                <span className='label-small text-text-strong-950'>Map statuses</span>
                <Radio.Item value='map' id={strategyMapId} />
              </span>
              <span className='text-paragraph-xs text-text-sub-600'>
                Choose which imported status replaces each existing one.
              </span>
            </Radio.Label>

            <Radio.Label
              htmlFor={strategyBulkId}
              noBg
              className={cn(
                'flex flex-col gap-2 rounded-2xl border p-4 cursor-pointer transition-colors',
                strategy === 'bulk'
                  ? 'border-primary-base bg-primary-alpha-10'
                  : 'border-stroke-soft-200 bg-bg-white-0 hover:bg-bg-weak-50',
              )}
            >
              <span className='flex items-start justify-between gap-2'>
                <span className='label-small text-text-strong-950'>Change all to</span>
                <Radio.Item value='bulk' id={strategyBulkId} />
              </span>
              <div
                className='min-w-0'
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <Select.Root
                  value={replaceAllWith}
                  onValueChange={handleReplaceAllChange}
                  disabled={strategy !== 'bulk'}
                >
                  <Select.Trigger>
                    <Select.Value placeholder='Select status' />
                  </Select.Trigger>
                  <Select.Content className='z-[100]' position='popper' sideOffset={6}>
                    {importOptions.map((option) => (
                      <Select.Item key={option.label} value={option.label}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
            </Radio.Label>
          </Radio.Group>

          <div className='flex flex-col gap-3'>
            <div className='grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 px-1'>
              <span className='label-xs uppercase tracking-wide text-text-sub-600'>Old status</span>
              <span aria-hidden className='w-5' />
              <span className='label-xs uppercase tracking-wide text-text-sub-600'>New status</span>
            </div>

            <div className='flex flex-col gap-2'>
              {unmatched.map((row) => (
                <div
                  key={row.label}
                  className='grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-3'
                >
                  <div className='min-w-0 flex items-center gap-2'>
                    <span
                      className='size-2.5 shrink-0 rounded-sm'
                      style={{ backgroundColor: storageColorToPickerSwatch(row.color) }}
                    />
                    <div className='min-w-0'>
                      <p className='label-small text-text-strong-950 truncate'>{row.label}</p>
                      <p className='text-paragraph-xs text-text-sub-600'>
                        {row.count} {row.count === 1 ? recordLabel : `${recordLabel}s`}
                      </p>
                    </div>
                  </div>
                  <RiArrowRightLine className='size-4 shrink-0 text-text-soft-400' />
                  <Select.Root
                    value={mappings[row.label] ?? ''}
                    onValueChange={(value) => handleMappingChange(row.label, value)}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder='Select status' />
                    </Select.Trigger>
                    <Select.Content className='z-[100]' position='popper' sideOffset={6}>
                      {importOptions.map((option) => (
                        <Select.Item key={option.label} value={option.label}>
                          {option.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              ))}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className='justify-between'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            disabled={!allMapped || isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
