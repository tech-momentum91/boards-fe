import React, { useEffect, useRef, useState } from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';
import * as Popover from '@/components/ui/popover';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { selectVariants } from '@/components/ui/select';
import { cn } from '@/utils/cn';
import { showErrorToast } from '@/utils/error-utils';
import { getCrmLeadOptions } from '@/api/crmLeads';
import {
  buildLinkSelectOptions,
  darkenHex,
  getLinkFieldOptionLabel,
  resolveLinkFieldSelectValue,
  SELECT_NONE_VALUE,
  statusLabelRequiresLostReason,
  CRM_DEFAULT_PIPELINE_COLOR,
  CRM_DEFAULT_STAGE_COLOR,
  resolveCrmColor,
  resolveCrmStatusBadgeColor,
} from '@/components/crm-leads/constants';
import { StageColorPill } from '@/components/crm-leads/crm-stage-color-pill';

function renderStageText(value, stageColor) {
  const display = value && value !== '-' ? String(value).trim() : '';
  if (!display) return <span className='paragraph-small text-text-sub-600'>-</span>;
  if (!stageColor) {
    return (
      <span className='paragraph-small block min-w-0 max-w-full truncate text-text-sub-600' title={display}>
        {display}
      </span>
    );
  }
  const textColor = stageColor.length === 7 ? darkenHex(stageColor, 0.6) : stageColor;
  return (
    <span
      className='paragraph-small block min-w-0 max-w-full truncate'
      style={{ color: textColor }}
      title={display}
    >
      {display}
    </span>
  );
}

function renderStageDotLabel(label, color) {
  return (
    <div className='flex min-w-0 items-center gap-2'>
      {color ? (
        <span
          className='inline-block size-3 shrink-0 rounded-full'
          style={{ backgroundColor: color }}
        />
      ) : null}
      <span className='truncate'>{label}</span>
    </div>
  );
}

/**
 * Popover to edit pipeline / lifecycle stage / status. Commits once on close.
 * When status is Drop/Lost, shows mandatory Lost / drop reason (same as detail page).
 */
export function LeadPipelineEditPopover({
  showPipeline = true,
  pipelineValue = '',
  stageValue = '',
  statusValue = '',
  lostReasonValue = '',
  pipelineOptions = [],
  stageOptions = [],
  statusOptions = [],
  stageStatusMap = {},
  stageColorMap = {},
  stageColor = '',
  ensureStagesForPipeline,
  onCommit,
  triggerLabel = '',
  renderTriggerContent,
  formTrigger = false,
  hasError = false,
  placeholder = 'Select',
  stageStyle = 'pill',
  statusMultiple = false,
  side = 'bottom',
}) {
  const toStatusDraft = (v) => (statusMultiple ? (Array.isArray(v) ? v : v ? [v] : []) : v || '');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    pipeline: pipelineValue,
    lifecycle_stage: stageValue,
    life_cycle_stage_status: toStatusDraft(statusValue),
    lost_reason: lostReasonValue || '',
  });
  const [frozenOpts, setFrozenOpts] = useState({
    pipeline: pipelineOptions,
    stage: stageOptions,
    status: statusOptions,
  });
  const [frozenStageColors, setFrozenStageColors] = useState(stageColorMap);
  const [lostReasonOptions, setLostReasonOptions] = useState([]);
  const [lostReasonLoading, setLostReasonLoading] = useState(false);
  const [lostReasonError, setLostReasonError] = useState(false);
  const [lostReasonFetchFailed, setLostReasonFetchFailed] = useState(false);
  const [lostReasonRetryKey, setLostReasonRetryKey] = useState(0);
  const initRef = useRef(draft);
  const draftRef = useRef(draft);
  const frozenOptsRef = useRef(frozenOpts);
  const stageStatusMapRef = useRef(stageStatusMap);
  const pipelineLoadingRef = useRef(false);
  draftRef.current = draft;
  frozenOptsRef.current = frozenOpts;

  const statusForLabel = statusMultiple
    ? (draft.life_cycle_stage_status || [])[0]
    : draft.life_cycle_stage_status;
  const statusLabel =
    frozenOpts.status.find((o) => String(o.value) === String(statusForLabel))?.label ??
    statusForLabel;
  const showLostReason =
    !statusMultiple && Boolean(statusForLabel) && statusLabelRequiresLostReason(statusLabel);

  useEffect(() => {
    if (!open || !showLostReason || !statusForLabel) {
      setLostReasonOptions([]);
      setLostReasonLoading(false);
      setLostReasonFetchFailed(false);
      return;
    }
    let cancelled = false;
    setLostReasonLoading(true);
    setLostReasonFetchFailed(false);
    getCrmLeadOptions(String(statusForLabel).trim(), draft.pipeline || undefined)
      .then((opts) => {
        if (cancelled) return;
        setLostReasonOptions(Array.isArray(opts.lost_reason) ? opts.lost_reason : []);
        setLostReasonFetchFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLostReasonOptions([]);
        setLostReasonFetchFailed(true);
        showErrorToast('Failed to load drop reasons');
      })
      .finally(() => {
        if (!cancelled) setLostReasonLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, showLostReason, statusForLabel, draft.pipeline, lostReasonRetryKey]);

  const lostReasonSelectOptions = buildLinkSelectOptions(
    lostReasonOptions,
    draft.lost_reason,
    draft.lost_reason,
  );
  const lostReasonSelectValue = resolveLinkFieldSelectValue(
    draft.lost_reason,
    draft.lost_reason,
    lostReasonSelectOptions,
  );

  const setField = (key) => (v) => {
    if (key === 'pipeline') {
      setOpen(true);
      const nextPipeline = v || '';
      pipelineLoadingRef.current = true;
      const nextEmptyStatus = statusMultiple ? [] : '';
      setLostReasonError(false);
      setDraft((prev) => ({
        ...prev,
        pipeline: nextPipeline,
        lifecycle_stage: '',
        life_cycle_stage_status: nextEmptyStatus,
        lost_reason: '',
      }));
      setFrozenOpts((prev) => {
        const nextOpts = { ...prev, stage: [], status: [] };
        frozenOptsRef.current = nextOpts;
        return nextOpts;
      });
      if (nextPipeline && ensureStagesForPipeline) {
        // updateState:false — parent setStagesByPipeline remounts table columns and kills this popover
        Promise.resolve(ensureStagesForPipeline(nextPipeline, { updateState: false }))
          .then((data) => {
            if (!data) return;
            setOpen(true);
            stageStatusMapRef.current = data.stageStatusMap || {};
            setFrozenStageColors(data.stageColorMap || {});
            const nextStages = buildLinkSelectOptions(data.stages || [], '');
            const firstStage = nextStages[0]?.value || '';
            const statuses = firstStage ? data.stageStatusMap?.[firstStage] || [] : [];
            const clear =
              frozenOptsRef.current.status[0]?.value === SELECT_NONE_VALUE
                ? [frozenOptsRef.current.status[0]]
                : [];
            const nextStatus = statusMultiple
              ? clear.length > 0
                ? [SELECT_NONE_VALUE]
                : []
              : clear.length > 0
                ? ''
                : statuses[0]?.value || '';
            setDraft((prev) => ({
              ...prev,
              lifecycle_stage: firstStage,
              life_cycle_stage_status: nextStatus,
              lost_reason: '',
            }));
            setFrozenOpts((prev) => {
              const nextOpts = {
                ...prev,
                stage: nextStages,
                status: [
                  ...clear,
                  ...buildLinkSelectOptions(
                    statuses,
                    statusMultiple ? '' : nextStatus,
                    statusMultiple ? '' : nextStatus,
                  ),
                ],
              };
              frozenOptsRef.current = nextOpts;
              return nextOpts;
            });
          })
          .finally(() => {
            window.setTimeout(() => {
              pipelineLoadingRef.current = false;
            }, 150);
          });
      } else {
        window.setTimeout(() => {
          pipelineLoadingRef.current = false;
        }, 150);
      }
      return;
    }
    if (key === 'lifecycle_stage') {
      const next = v || '';
      const statuses = stageStatusMapRef.current?.[next] || [];
      const clear =
        frozenOptsRef.current.status[0]?.value === SELECT_NONE_VALUE
          ? [frozenOptsRef.current.status[0]]
          : [];
      const nextStatus = statusMultiple
        ? clear.length > 0
          ? [SELECT_NONE_VALUE]
          : []
        : clear.length > 0
          ? ''
          : statuses[0]?.value || '';
      setLostReasonError(false);
      setDraft((prev) => ({
        ...prev,
        lifecycle_stage: next,
        life_cycle_stage_status: nextStatus,
        lost_reason: '',
      }));
      setFrozenOpts((prev) => {
        const nextOpts = {
          ...prev,
          status: [
            ...clear,
            ...buildLinkSelectOptions(
              statuses,
              statusMultiple ? '' : nextStatus,
              statusMultiple ? '' : nextStatus,
            ),
          ],
        };
        frozenOptsRef.current = nextOpts;
        return nextOpts;
      });
      return;
    }
    if (key === 'life_cycle_stage_status' && statusMultiple) {
      let next = Array.isArray(v) ? v : [];
      if (next.includes(SELECT_NONE_VALUE)) {
        const prev = draftRef.current.life_cycle_stage_status || [];
        const noneAdded = !prev.includes(SELECT_NONE_VALUE);
        next = noneAdded ? [SELECT_NONE_VALUE] : next.filter((x) => x !== SELECT_NONE_VALUE);
        if (next.length === 0) next = [SELECT_NONE_VALUE];
      }
      setDraft((prev) => ({ ...prev, life_cycle_stage_status: next }));
      return;
    }
    if (key === 'life_cycle_stage_status') {
      const next = v || '';
      const nextLabel =
        frozenOptsRef.current.status.find((o) => String(o.value) === String(next))?.label ?? next;
      const needsReason = statusLabelRequiresLostReason(nextLabel);
      setLostReasonError(false);
      setDraft((prev) => ({
        ...prev,
        life_cycle_stage_status: next,
        lost_reason: needsReason ? prev.lost_reason || '' : '',
      }));
      return;
    }
    if (key === 'lost_reason') {
      setLostReasonError(false);
      setDraft((prev) => ({ ...prev, lost_reason: v || '' }));
      return;
    }
    setDraft((prev) => ({ ...prev, [key]: v || '' }));
  };
  const { triggerRoot, triggerArrow } = selectVariants({
    size: 'xsmall',
    variant: 'default',
    hasError,
  });

  const handleOpenChange = (next) => {
    if (next) {
      const initial = {
        pipeline: pipelineValue,
        lifecycle_stage: stageValue,
        life_cycle_stage_status: toStatusDraft(statusValue),
        lost_reason: lostReasonValue || '',
      };
      initRef.current = initial;
      setDraft(initial);
      setLostReasonError(false);
      const opts = { pipeline: pipelineOptions, stage: stageOptions, status: statusOptions };
      frozenOptsRef.current = opts;
      setFrozenOpts(opts);
      setFrozenStageColors(stageColorMap);
      stageStatusMapRef.current = stageStatusMap || {};
      setOpen(true);
      if (pipelineValue && ensureStagesForPipeline) {
        Promise.resolve(ensureStagesForPipeline(pipelineValue)).then((data) => {
          if (!data) return;
          if (data.stageStatusMap) stageStatusMapRef.current = data.stageStatusMap;
          setFrozenStageColors((prev) =>
            Object.keys(prev || {}).length > 0 ? prev : data.stageColorMap || {},
          );
          setFrozenOpts((prev) => {
            const stageKey = draftRef.current.lifecycle_stage || stageValue;
            const nextOpts = {
              pipeline: prev.pipeline,
              stage:
                prev.stage.length > 0
                  ? prev.stage
                  : buildLinkSelectOptions(data.stages || [], stageValue),
              status:
                prev.status.length > 0
                  ? prev.status
                  : buildLinkSelectOptions(
                      data.stageStatusMap?.[stageKey] || data.allStatuses || [],
                      statusMultiple ? '' : statusValue,
                    ),
            };
            frozenOptsRef.current = nextOpts;
            return nextOpts;
          });
        });
      }
      return;
    }
    if (!next && pipelineLoadingRef.current) {
      setOpen(true);
      return;
    }

    const d = draftRef.current;
    const i = initRef.current;
    const statusForCommit = statusMultiple
      ? (d.life_cycle_stage_status || [])[0]
      : d.life_cycle_stage_status;
    const commitStatusLabel =
      frozenOptsRef.current.status.find((o) => String(o.value) === String(statusForCommit))
        ?.label ?? statusForCommit;
    const needsLostReason =
      !statusMultiple &&
      Boolean(statusForCommit) &&
      statusLabelRequiresLostReason(commitStatusLabel);

    if (needsLostReason && !(d.lost_reason || '').trim()) {
      // Don't trap the user when options failed to load — discard and close.
      if (lostReasonFetchFailed) {
        setOpen(false);
        setLostReasonError(false);
        return;
      }
      setLostReasonError(true);
      showErrorToast('Lost / drop reason is required');
      setOpen(true);
      return;
    }

    setOpen(false);
    // Sync silent pipeline cache into parent state after popover has closed (safe to remount now)
    if (d.pipeline && ensureStagesForPipeline) {
      void ensureStagesForPipeline(d.pipeline);
    }
    const statusChanged = statusMultiple
      ? JSON.stringify(d.life_cycle_stage_status || []) !==
        JSON.stringify(i.life_cycle_stage_status || [])
      : d.life_cycle_stage_status !== i.life_cycle_stage_status;
    const lostChanged = (d.lost_reason || '') !== (i.lost_reason || '');
    const changed =
      d.lifecycle_stage !== i.lifecycle_stage ||
      statusChanged ||
      lostChanged ||
      (showPipeline && d.pipeline !== i.pipeline);
    if (!changed) return;
    const payload = {
      lifecycle_stage: d.lifecycle_stage,
      life_cycle_stage_status: d.life_cycle_stage_status,
      lost_reason: needsLostReason ? d.lost_reason || '' : '',
    };
    if (showPipeline) payload.pipeline = d.pipeline;
    onCommit?.(payload);
  };

  const stageDisplayLabel = getLinkFieldOptionLabel(
    draft.lifecycle_stage,
    frozenOpts.stage,
    draft.lifecycle_stage,
  );
  const stageDisplayColor = frozenStageColors[draft.lifecycle_stage] || stageColor;
  const displayLabel = triggerLabel || placeholder;

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type='button'
          className={cn(
            formTrigger
              ? triggerRoot({ class: 'w-full text-left' })
              : 'flex w-full min-w-0 max-w-full items-center overflow-hidden text-left',
          )}
        >
          {formTrigger ? (
            <>
              <span
                className={cn('min-w-0 flex-1 truncate', !triggerLabel && 'text-text-soft-400')}
              >
                {renderTriggerContent ? renderTriggerContent() : displayLabel}
              </span>
              <RiArrowDownSLine className={cn(triggerArrow(), 'shrink-0')} aria-hidden />
            </>
          ) : renderTriggerContent ? (
            <span className='block min-w-0 w-full truncate'>{renderTriggerContent()}</span>
          ) : (
            <span className='paragraph-small text-text-sub-600 block min-w-0 w-full truncate'>
              {displayLabel}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Content
        align='start'
        side={side}
        sideOffset={8}
        showArrow={false}
        className='flex w-[300px] flex-col gap-4 rounded-xl bg-bg-white-0 p-4 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200'
        onInteractOutside={(e) => {
          if (
            pipelineLoadingRef.current ||
            e.target?.closest?.('[data-radix-popper-content-wrapper]')
          ) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          if (
            pipelineLoadingRef.current ||
            e.target?.closest?.('[data-radix-popper-content-wrapper]')
          ) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => e.preventDefault()}
      >
        {showPipeline ? (
          <div className='flex w-full flex-col gap-1.5'>
            <label className='text-label-sm font-medium text-text-main-900'>Pipeline</label>
            <SearchableSelect
              variant='default'
              size='small'
              showArrow
              matchTriggerWidth
              triggerClassName='w-full'
              contentClassName='z-[60]'
              value={draft.pipeline}
              onValueChange={setField('pipeline')}
              options={frozenOpts.pipeline}
              searchPlaceholder='Search pipeline...'
              noResultsMessage='No pipelines found'
              emptyMessage='No pipelines available'
              renderOptionLabel={(opt) => (
                <StageColorPill
                  value={opt.label ?? opt.value}
                  stageColor={resolveCrmColor(opt.color, CRM_DEFAULT_PIPELINE_COLOR)}
                />
              )}
              renderTrigger={() => {
                const selected = frozenOpts.pipeline.find(
                  (o) => String(o.value) === String(draft.pipeline),
                );
                return renderStageText(
                  selected?.label ?? draft.pipeline ?? '',
                  resolveCrmColor(selected?.color, CRM_DEFAULT_PIPELINE_COLOR),
                );
              }}
            />
          </div>
        ) : null}
        <div className='flex w-full flex-col gap-1.5'>
          <label className='text-label-sm font-medium text-text-main-900'>Life Cycle Stage</label>
          <SearchableSelect
            variant='default'
            size='small'
            showArrow
            matchTriggerWidth
            triggerClassName='w-full'
            contentClassName='z-[60]'
            value={draft.lifecycle_stage}
            onValueChange={setField('lifecycle_stage')}
            options={frozenOpts.stage}
            searchPlaceholder='Search stage...'
            noResultsMessage='No stages found'
            emptyMessage='No stages available'
            renderTrigger={() =>
              stageStyle === 'dot'
                ? renderStageDotLabel(
                    draft.lifecycle_stage ? stageDisplayLabel : 'Select',
                    stageDisplayColor || CRM_DEFAULT_STAGE_COLOR,
                  )
                : renderStageText(
                    draft.lifecycle_stage ? stageDisplayLabel : '',
                    resolveCrmColor(stageDisplayColor, CRM_DEFAULT_STAGE_COLOR),
                  )
            }
            renderOptionLabel={(opt) =>
              stageStyle === 'dot' ? (
                renderStageDotLabel(
                  opt.label ?? opt.value,
                  resolveCrmColor(frozenStageColors[opt.value], CRM_DEFAULT_STAGE_COLOR),
                )
              ) : (
                <StageColorPill
                  value={opt.label ?? opt.value}
                  stageColor={resolveCrmColor(
                    frozenStageColors[opt.value],
                    CRM_DEFAULT_STAGE_COLOR,
                  )}
                />
              )
            }
          />
        </div>
        <div className='flex w-full flex-col gap-1.5'>
          <label className='text-label-sm font-medium text-text-main-900'>
            Lifecycle Stage Status
          </label>
          <SearchableSelect
            variant='default'
            size='small'
            showArrow
            matchTriggerWidth
            multiple={statusMultiple}
            triggerClassName='w-full'
            contentClassName='z-[60]'
            value={draft.life_cycle_stage_status}
            valueSentinel={statusMultiple ? undefined : SELECT_NONE_VALUE}
            onValueChange={setField('life_cycle_stage_status')}
            options={frozenOpts.status}
            searchPlaceholder='Search status...'
            noResultsMessage='No statuses found'
            emptyMessage='No statuses available'
            renderOptionLabel={(opt) => (
              <StageColorPill
                value={opt.label ?? opt.value}
                stageColor={resolveCrmStatusBadgeColor({
                  statusColor: opt.color,
                  statusLabel: opt.label ?? opt.value,
                })}
              />
            )}
            renderTrigger={() => {
              const selected = frozenOpts.status.find(
                (o) => String(o.value) === String(statusForLabel),
              );
              const label = selected?.label ?? statusLabel ?? '';
              return renderStageText(
                label,
                resolveCrmStatusBadgeColor({
                  statusColor: selected?.color,
                  statusLabel: label,
                }),
              );
            }}
          />
        </div>
        {showLostReason ? (
          <div className='animate-in fade-in slide-in-from-top-1 flex w-full flex-col gap-1.5'>
            <label className='text-label-sm font-medium text-text-main-900'>
              Lost / drop reason <span className='text-error-base'>*</span>
            </label>
            {lostReasonLoading ? (
              <p className='text-label-sm text-text-soft-400'>Loading reasons…</p>
            ) : lostReasonFetchFailed ? (
              <div className='flex flex-col gap-2'>
                <p className='text-label-sm text-error-base'>Couldn’t load drop reasons.</p>
                <button
                  type='button'
                  className='text-label-sm font-medium text-primary-base underline-offset-2 hover:underline self-start'
                  onClick={() => setLostReasonRetryKey((key) => key + 1)}
                >
                  Retry
                </button>
              </div>
            ) : (
              <SearchableSelect
                variant='default'
                size='small'
                showArrow
                matchTriggerWidth
                triggerClassName={cn(
                  'w-full',
                  lostReasonError && 'ring-1 ring-error-base border-error-base',
                )}
                contentClassName='z-[60]'
                value={lostReasonSelectValue}
                onValueChange={setField('lost_reason')}
                options={lostReasonSelectOptions}
                placeholder='Select reason...'
                searchPlaceholder='Search drop reason...'
                noResultsMessage='No drop reasons found'
                emptyMessage='No drop reasons available'
              />
            )}
          </div>
        ) : null}
      </Popover.Content>
    </Popover.Root>
  );
}

export { StageColorPill } from '@/components/crm-leads/crm-stage-color-pill';
