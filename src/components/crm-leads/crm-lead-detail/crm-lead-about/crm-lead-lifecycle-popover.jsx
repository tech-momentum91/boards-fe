import React, { useState, useEffect, useMemo } from 'react';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';
import { StageColorPill } from '@/components/crm-leads/crm-stage-color-pill';
import { showErrorToast } from '@/utils/error-utils';
import { getCrmLeadOptions } from '@/api/crmLeads';

const CrmLeadLifecyclePopover = ({
  lead,
  onFieldChange,
  onBatchFieldChange,
  leadOptions = {},
  children,
}) => {
  const [open, setOpen] = useState(false);
  const stageOptions = Array.isArray(leadOptions.stages) ? leadOptions.stages : [];
  const [localStage, setLocalStage] = useState(lead?.lifecycle_stage || '');
  const [localStatus, setLocalStatus] = useState(
    lead?.life_cycle_stage_status ?? lead?.status ?? '',
  );
  const [localLostReason, setLocalLostReason] = useState(lead?.lost_reason || '');
  const [lostReasonOptionsForStatus, setLostReasonOptionsForStatus] = useState([]);

  const baseStatusOpts =
    localStage && Array.isArray(leadOptions.stageStatusMap?.[localStage])
      ? leadOptions.stageStatusMap[localStage]
      : [];
  const statusOptions =
    localStatus && !baseStatusOpts.some((o) => o.value === localStatus)
      ? [{ value: localStatus, label: localStatus }, ...baseStatusOpts]
      : baseStatusOpts;
  const statusLower = localStatus ? String(localStatus).toLowerCase().trim() : '';
  const showLostReason = Boolean(
    statusLower && (statusLower.includes('lost') || statusLower.includes('drop')),
  );

  useEffect(() => {
    if (open) {
      setLocalStage(lead?.lifecycle_stage || '');
      setLocalStatus(lead?.life_cycle_stage_status ?? lead?.status ?? '');
      setLocalLostReason(lead?.lost_reason || '');
    }
  }, [open, lead]);

  useEffect(() => {
    const lower = localStatus ? String(localStatus).toLowerCase().trim() : '';
    if (!(lower && (lower.includes('lost') || lower.includes('drop')))) {
      setLocalLostReason('');
    }
  }, [localStatus]);

  useEffect(() => {
    if (!open || !showLostReason || !localStatus || String(localStatus).trim() === '') {
      setLostReasonOptionsForStatus([]);
      return;
    }
    let cancelled = false;
    getCrmLeadOptions(localStatus, lead?.pipeline)
      .then((opts) => {
        if (!cancelled)
          setLostReasonOptionsForStatus(Array.isArray(opts.lost_reason) ? opts.lost_reason : []);
      })
      .catch(() => {
        if (!cancelled) setLostReasonOptionsForStatus([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, showLostReason, localStatus, lead?.pipeline]);

  const lostReasonSelectOptions = useMemo(() => {
    const raw = lostReasonOptionsForStatus;
    const fv = localLostReason ? String(localLostReason).trim() : '';
    if (fv && !raw.some((o) => o.value === fv)) {
      return [{ value: fv, label: fv }, ...raw];
    }
    return raw;
  }, [lostReasonOptionsForStatus, localLostReason]);

  const handleStageChange = (value) => {
    setLocalStage(value);
    const opts = leadOptions.stageStatusMap?.[value] || [];
    const firstStatus = opts[0]?.value || '';
    setLocalStatus(firstStatus);
    setLocalLostReason('');
  };

  const handleSave = () => {
    if (!localStage) {
      showErrorToast('Lifecycle Stage is required');
      return;
    }
    if (!localStatus) {
      showErrorToast('Status is required');
      return;
    }
    if (showLostReason && !localLostReason) {
      showErrorToast('Lost Reason is required');
      return;
    }

    if (onBatchFieldChange) {
      onBatchFieldChange({
        lifecycle_stage: localStage,
        life_cycle_stage_status: localStatus,
        lost_reason: showLostReason ? localLostReason : '',
      });
    } else {
      onFieldChange?.('lifecycle_stage', localStage);
      onFieldChange?.('life_cycle_stage_status', localStatus);
      onFieldChange?.('lost_reason', showLostReason ? localLostReason : '');
    }
    setOpen(false);
  };

  const triggerStyles =
    'flex h-8 w-full items-center bg-white pl-2 pr-1.5 py-1.5 rounded-lg border border-stroke-soft-200 shadow-regular-xs';

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Content
        side='bottom'
        align='start'
        showArrow={false}
        className='flex w-[300px] flex-col gap-3 rounded-xl border border-stroke-soft-200 bg-bg-weak-100 p-4 shadow-regular-md'
      >
        <div className='flex flex-col gap-1'>
          <span className='text-subheading-2xs font-semibold uppercase tracking-wider text-text-soft-400'>
            Edit Lifecycle Stage
          </span>
        </div>

        <div className='flex flex-col gap-1.5'>
          <label className='text-label-sm font-medium text-text-main-900'>
            Lifecycle Stage <span className='text-error-base'>*</span>
          </label>
          <Select.Root value={localStage} onValueChange={handleStageChange} variant='stroke'>
            <Select.Trigger className={triggerStyles} showArrow={true}>
              <div className='flex items-center'>
                <StageColorPill
                  value={localStage}
                  stageColor={leadOptions.stageColorMap?.[localStage]}
                />
              </div>
            </Select.Trigger>
            <Select.Content>
              {stageOptions.map((opt) => (
                <Select.Item key={opt.value} value={opt.value}>
                  {opt.label ?? opt.value}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>

        <div className='flex flex-col gap-1.5'>
          <label className='text-label-sm font-medium text-text-main-900'>
            Status <span className='text-error-base'>*</span>
          </label>
          <Select.Root value={localStatus} onValueChange={setLocalStatus} variant='stroke'>
            <Select.Trigger
              className={cn(triggerStyles, 'text-label-sm font-medium text-text-main-900')}
              showArrow={true}
            >
              <span className='inline-flex items-center rounded-full border border-stroke-soft-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-text-sub-600'>
                {localStatus ?? '—'}
              </span>
            </Select.Trigger>
            <Select.Content>
              {statusOptions.map((opt) => (
                <Select.Item key={opt.value} value={opt.value}>
                  {opt.label ?? opt.value}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>

        {showLostReason && (
          <div className='animate-in fade-in slide-in-from-top-1 flex flex-col gap-1.5'>
            <label className='text-label-sm font-medium text-text-main-900'>
              Lost Reason <span className='text-error-base'>*</span>
            </label>
            <Select.Root
              value={localLostReason}
              onValueChange={setLocalLostReason}
              variant='stroke'
            >
              <Select.Trigger
                className={cn(triggerStyles, 'text-label-sm font-medium text-text-main-900')}
                showArrow={true}
              >
                <Select.Value placeholder='Select' />
              </Select.Trigger>
              <Select.Content>
                {lostReasonSelectOptions.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        )}

        <div className='mt-2 flex justify-end gap-2'>
          <button
            onClick={() => setOpen(false)}
            className='rounded-lg px-3 py-1.5 text-label-xs font-medium text-text-sub-600 transition-colors hover:bg-bg-soft-200'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className='rounded-lg bg-primary-base px-3 py-1.5 text-label-xs font-semibold text-white transition-colors hover:bg-primary-dark'
          >
            Save
          </button>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};

export default CrmLeadLifecyclePopover;
