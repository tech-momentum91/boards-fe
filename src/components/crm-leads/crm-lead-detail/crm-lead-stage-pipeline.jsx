import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { RiArrowDownSLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import { getCrmStages, getCrmLeadOptions } from '@/api/crmLeads';

const BAR_H = 32; // px — bar height
// StepBar-style chevron: 20px arrow depth, -mr-5 (20px) overlap between siblings
const NOTCH = 20;
const OVERLAP = 20;
/** Stages that fit in the viewport without horizontal scroll (wider track scrolls). */
const PIPELINE_VISIBLE_SLOTS = 7;
const EMPTY_STAGES = [];

function isDropOrLost(status) {
  const s = (status || '').toLowerCase().trim();
  return s.includes('drop') || s.includes('lost');
}

function hasLostReason(lead) {
  return Boolean((lead?.lost_reason || '').trim());
}

/**
 * Pipeline visual states:
 * - currentLost: current stage when status is drop/lost or a drop reason is set — light rose (Figma)
 * - current & visited: light blue (#C2D6FF); current uses semibold text
 * - skipped / future / unvisited: as before
 */
function segmentColors(state) {
  switch (state) {
    case 'currentLost':
      return { bg: '#FECDCA', text: '#525866' };
    case 'current':
    case 'visited':
      return { bg: '#C2D6FF', text: '#0a0d14' };
    case 'skipped':
      return { bg: '#F6F8FA', text: '#CDD0D5' };
    case 'future':
    case 'unvisited':
    default:
      return { bg: '#E2E4E9', text: '#868c98' };
  }
}

/**
 * History only affects stages at or before the current lifecycle index.
 * Stages after current are always "future" (unread), even if still in the child table.
 * Skipped = jumped over: not in history but sandwiched between two history indices (≤ current),
 * or any stage before current when stage_history is still empty (lead placed on a later stage).
 */
function computePipelineSegmentStates(stages, currentStageRaw, historySet) {
  const currentStage = (currentStageRaw || '').trim();
  const values = stages.map((s) => (s.value || '').trim());
  const currentIndex = values.indexOf(currentStage);
  const n = stages.length;
  const states = Array.from({ length: n }, () => 'unvisited');

  if (n === 0) return states;

  if (historySet.size === 0 && currentIndex > 0) {
    for (let index = 0; index < n; index += 1) {
      if (index < currentIndex) {
        states[index] = 'skipped';
      } else if (index === currentIndex) {
        states[index] = 'current';
      } else {
        states[index] = 'future';
      }
    }
    return states;
  }

  const effectiveHistoryIndices = [];
  if (currentIndex >= 0) {
    for (let i = 0; i <= currentIndex; i += 1) {
      if (historySet.has(values[i])) effectiveHistoryIndices.push(i);
    }
  }

  for (let index = 0; index < n; index += 1) {
    const stageValue = values[index];

    if (currentIndex < 0) {
      states[index] = stageValue === currentStage ? 'current' : 'future';
      continue;
    }

    if (index > currentIndex) {
      states[index] = 'future';
      continue;
    }

    if (index === currentIndex || stageValue === currentStage) {
      states[index] = 'current';
      continue;
    }

    if (historySet.has(stageValue)) {
      states[index] = 'visited';
      continue;
    }

    const hasLeft = effectiveHistoryIndices.some((a) => a < index);
    const hasRight = effectiveHistoryIndices.some((b) => b > index);
    if (hasLeft && hasRight) {
      states[index] = 'skipped';
      continue;
    }

    states[index] = 'unvisited';
  }

  return states;
}

/**
 * StepBar-style clip-path: flat left + right-pointing chevron, or full rect on last.
 * Overlap (-mr-5 / marginLeft -NOTCH) + later z-index on top hides the seam.
 */
function stepBarClipPath(isLast, n) {
  if (isLast) return 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
  return `polygon(0 0, calc(100% - ${n}px) 0, 100% 50%, calc(100% - ${n}px) 100%, 0 100%)`;
}

function stepBarGapClipPath(isLast, n) {
  if (isLast) return 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
  return `polygon(5px 0, calc(100% - 15px) 50%, 5px 100%, 0% 100%, calc(100% - ${n}px) 50%, 0% 0%)`;
}

/* ─────────────────────────────────────────────────────────────────────── */

const CrmLeadStagePipeline = ({ lead, onBatchFieldChange, isSaving }) => {
  const [crmData, setCrmData] = useState({ stages: [], stageStatusMap: {}, stageColorMap: {} });
  const [openStage, setOpenStage] = useState(null);
  const [pendingDrop, setPendingDrop] = useState(null);
  const [lostReasonOptions, setLostReasonOptions] = useState([]);
  const [lostReasonLoading, setLostReasonLoading] = useState(false);

  const confirmedRef = useRef(false);
  const savingRef = useRef(false);

  useEffect(() => {
    const pl =
      lead?.pipeline && String(lead.pipeline).trim() ? String(lead.pipeline).trim() : undefined;
    getCrmStages(pl)
      .then(setCrmData)
      .catch(() => {});
  }, [lead?.pipeline]);

  const stages = useMemo(
    () => (Array.isArray(crmData.stages) ? crmData.stages : EMPTY_STAGES),
    [crmData.stages],
  );

  const historySet = useMemo(() => {
    const set = new Set();
    const pl = (lead?.pipeline || '').trim();
    (lead?.stage_history || []).forEach((r) => {
      const v = (r?.crm_status_master || '').trim();
      if (!v) return;
      const rowPl = (r?.pipeline || '').trim();
      if (pl && rowPl && rowPl !== pl) return;
      set.add(v);
    });
    return set;
  }, [lead?.stage_history, lead?.pipeline]);

  const currentStage = (lead?.lifecycle_stage || '').trim();

  const pipelineSegmentStates = useMemo(
    () => computePipelineSegmentStates(stages, currentStage, historySet),
    [stages, currentStage, historySet],
  );

  const clearDrop = useCallback(() => {
    setPendingDrop(null);
    setLostReasonOptions([]);
    setLostReasonLoading(false);
  }, []);

  const handleOpenChange = useCallback(
    (stageValue, nextOpen) => {
      if (nextOpen) {
        confirmedRef.current = false;
        clearDrop();
        setOpenStage(stageValue);
        return;
      }
      let closed = false;
      setOpenStage((previous) => {
        if (previous !== stageValue) return previous;
        closed = true;
        return null;
      });
      if (closed) clearDrop();
    },
    [clearDrop],
  );

  const runSave = useCallback(
    async (stageValue, statusValue, reason) => {
      if (!lead?.name || isSaving) return;
      savingRef.current = true;
      try {
        await onBatchFieldChange?.({
          lifecycle_stage: stageValue,
          life_cycle_stage_status: statusValue,
          lost_reason: reason || '',
        });
        confirmedRef.current = true;
        setOpenStage(null);
        clearDrop();
      } catch {
        confirmedRef.current = false;
      } finally {
        savingRef.current = false;
      }
    },
    [lead?.name, isSaving, onBatchFieldChange, clearDrop],
  );

  const handlePickStatus = useCallback(
    (stageValue, statusValue) => {
      if (!statusValue) return;
      if (isDropOrLost(statusValue)) {
        setPendingDrop({ stage: stageValue, status: statusValue });
        setLostReasonLoading(true);
        setLostReasonOptions([]);
        getCrmLeadOptions(statusValue, lead?.pipeline)
          .then((o) => setLostReasonOptions(Array.isArray(o.lost_reason) ? o.lost_reason : []))
          .catch(() => setLostReasonOptions([]))
          .finally(() => setLostReasonLoading(false));
        return;
      }
      runSave(stageValue, statusValue, '');
    },
    [lead?.pipeline, runSave],
  );

  /** Map lead lost_reason (doc name or label) to option value so the selection shows. */
  const selectedLostReasonValue = useMemo(() => {
    const raw = (lead?.lost_reason || '').trim();
    if (!raw || lostReasonOptions.length === 0) return undefined;
    const match = lostReasonOptions.find(
      (o) => String(o?.value ?? o) === raw || String(o?.label ?? '').trim() === raw,
    );
    return match ? String(match.value ?? match) : raw;
  }, [lead?.lost_reason, lostReasonOptions]);

  const lostReasonSelectOptions = useMemo(
    () =>
      lostReasonOptions.map((o) => ({
        value: String(o?.value ?? o),
        label: String(o?.label ?? o?.value ?? o),
      })),
    [lostReasonOptions],
  );

  if (stages.length === 0) {
    return (
      <div className='border-b border-stroke-soft-200 bg-bg-white-0 px-4 py-3 sm:px-6'>
        <div className='h-8 animate-pulse overflow-hidden rounded-lg bg-stroke-soft-200' />
      </div>
    );
  }

  const total = stages.length;
  const trackMinWidthPercent = Math.max(100, (total / PIPELINE_VISIBLE_SLOTS) * 100);

  return (
    <div className='border-b border-stroke-soft-200 bg-bg-white-0 px-4 py-3 sm:px-6'>
      {/* min-w-0 lets the row shrink in flex parents so overflow-x-auto can scroll */}
      <div
        className='crm-lead-pipeline-scroll min-w-0 overflow-x-auto overflow-y-hidden rounded-lg'
        style={{ height: `${BAR_H}px` }}
      >
        <div
          className='flex h-full'
          style={{ minWidth: `${trackMinWidthPercent}%`, height: `${BAR_H}px` }}
        >
          {stages.map((stage, index) => {
            const stageValue = stage.value;
            const label = stage.label || stageValue;
            const isCurrent = stageValue === currentStage;
            const segmentState = pipelineSegmentStates[index] || 'unvisited';
            const rawLeadStatus = (lead?.life_cycle_stage_status || lead?.status || '').trim();
            const statuses = crmData.stageStatusMap?.[stageValue] || [];
            const statusMatch =
              isCurrent && rawLeadStatus
                ? statuses.find((o) => String(o?.value ?? '') === rawLeadStatus)
                : undefined;
            const currentStatusRaw = isCurrent ? rawLeadStatus : '';
            const currentStatusValue = (
              statusMatch?.label ??
              statusMatch?.value ??
              (isCurrent ? rawLeadStatus : '')
            ).trim();
            const currentIsDropOrLost =
              isCurrent &&
              (isDropOrLost(currentStatusRaw) ||
                isDropOrLost(statusMatch?.label) ||
                hasLostReason(lead));
            const visualState = currentIsDropOrLost ? 'currentLost' : segmentState;
            const { bg, text } = segmentColors(visualState);
            const isOpen = openStage === stageValue;

            const isLast = index === total - 1;
            const paddingLeft = index === 0 ? 10 : OVERLAP + 8;
            const paddingRight = isLast ? 10 : NOTCH + 8;

            return (
              /*
               * StepBar layout: negative marginLeft (-mr-5) pulls each segment over the previous.
               * Later segments sit on top (z-index) so the chevron overlap reads cleanly.
               */
              <div
                key={stageValue}
                style={{
                  position: 'relative',
                  width:
                    index === 0 ? `calc(100% / ${total})` : `calc(100% / ${total} + ${OVERLAP}px)`,
                  flexShrink: 0,
                  flexGrow: 0,
                  marginLeft: index > 0 ? `-${OVERLAP}px` : 0,
                  zIndex: stages.length - index,
                  height: `${BAR_H}px`,
                }}
              >
                <Popover.Root
                  open={isOpen}
                  onOpenChange={(open) => handleOpenChange(stageValue, open)}
                >
                  <Tooltip.Root delayDuration={300} open={isOpen ? false : undefined}>
                    <Tooltip.Trigger asChild>
                      <Popover.Trigger asChild>
                        <button
                          type='button'
                          disabled={isSaving}
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: bg,
                            color: text,
                            clipPath: stepBarClipPath(isLast, NOTCH),
                            paddingLeft: `${paddingLeft}px`,
                            paddingRight: `${paddingRight}px`,
                          }}
                          className={cn(
                            'relative flex cursor-pointer select-none items-center',
                            'justify-center gap-1 transition-[filter]',
                            'hover:brightness-95 focus-visible:outline-none focus-visible:brightness-90',
                            isSaving && 'pointer-events-none',
                          )}
                        >
                          {!isLast && (
                            <div
                              className='pointer-events-none absolute right-[-15px] h-full w-10 bg-white'
                              style={{
                                clipPath: stepBarGapClipPath(false, NOTCH),
                                zIndex: stages.length - index,
                              }}
                              aria-hidden
                            />
                          )}
                          <span
                            className={cn(
                              'truncate text-sm leading-none',
                              isCurrent
                                ? 'font-semibold'
                                : segmentState === 'visited'
                                  ? 'font-medium'
                                  : 'font-normal',
                            )}
                          >
                            {label}
                          </span>
                          <RiArrowDownSLine
                            className={cn(
                              'size-4 shrink-0 transition-transform',
                              isOpen && 'rotate-180',
                            )}
                            aria-hidden
                          />
                        </button>
                      </Popover.Trigger>
                    </Tooltip.Trigger>
                    <Tooltip.Content side='top' sideOffset={6} size='medium' variant='dark'>
                      <p className='text-xs leading-[18px]'>
                        <span className='text-white/60'>Lifecycle Stage: </span>
                        <span className='font-semibold text-white'>{label}</span>
                      </p>
                      {isCurrent && currentStatusValue && (
                        <p className='text-xs leading-[18px]'>
                          <span className='text-white/60'>Status: </span>
                          <span className='font-semibold text-white'>{currentStatusValue}</span>
                        </p>
                      )}
                    </Tooltip.Content>
                  </Tooltip.Root>

                  {/* ── Status dropdown ── */}
                  <Popover.Content
                    align='start'
                    alignOffset={index > 0 ? OVERLAP : 0}
                    side='bottom'
                    sideOffset={6}
                    showArrow={false}
                    className='z-50 w-[240px] overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-0 shadow-regular-md'
                  >
                    <ul className='max-h-[220px] overflow-y-auto py-1'>
                      {statuses.length === 0 && (
                        <li className='px-3 py-2.5 text-label-sm text-text-soft-400'>
                          No statuses
                        </li>
                      )}
                      {statuses.map((opt) => {
                        const isSelected = isCurrent && currentStatusRaw === opt.value;
                        const dropish = isDropOrLost(opt.value);
                        const isPendingDrop =
                          pendingDrop?.status === opt.value && openStage === stageValue;
                        return (
                          <li key={opt.value}>
                            <button
                              type='button'
                              className={cn(
                                'flex w-full items-center justify-between gap-2 px-3 py-2.5',
                                'text-left text-label-sm transition-colors hover:bg-bg-soft-200',
                                dropish
                                  ? 'font-medium text-error-base'
                                  : isSelected
                                    ? 'font-semibold text-text-main-900'
                                    : 'text-text-main-900',
                                isPendingDrop && 'bg-error-lighter',
                              )}
                              onClick={() => handlePickStatus(stageValue, opt.value)}
                            >
                              <span>{opt.label ?? opt.value}</span>
                              {isSelected && (
                                <span style={{ color: text }} aria-hidden>
                                  ✓
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {/* lost / drop reason panel */}
                    {pendingDrop?.stage === stageValue && (
                      <div className='border-t border-stroke-soft-200 bg-bg-white-0 px-3 py-3'>
                        <label
                          className='mb-2 block text-label-xs font-medium text-text-main-900'
                          htmlFor={`lost-reason-${stageValue}`}
                        >
                          Lost / drop reason <span className='text-error-base'>*</span>
                        </label>
                        {lostReasonLoading && (
                          <p className='text-label-sm text-text-soft-400'>Loading reasons…</p>
                        )}
                        {!lostReasonLoading && lostReasonSelectOptions.length === 0 && (
                          <p className='text-label-sm text-text-soft-400'>No reasons available</p>
                        )}
                        {!lostReasonLoading && lostReasonSelectOptions.length > 0 && (
                          <SearchableSelect
                            key={`${pendingDrop.stage}-${pendingDrop.status}`}
                            id={`lost-reason-${stageValue}`}
                            value={selectedLostReasonValue}
                            disabled={isSaving}
                            options={lostReasonSelectOptions}
                            placeholder='Select reason…'
                            searchPlaceholder='Search reason...'
                            noResultsMessage='No reasons found'
                            emptyMessage='No reasons available'
                            matchTriggerWidth
                            showArrow
                            isolateSearchKeyboard
                            contentClassName='z-[200]'
                            onValueChange={(v) => {
                              if (!v || !pendingDrop) return;
                              runSave(stageValue, pendingDrop.status, v);
                            }}
                          />
                        )}
                      </div>
                    )}
                  </Popover.Content>
                </Popover.Root>

                {/* Chevron separator: clip-path + overlap; no extra DOM */}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CrmLeadStagePipeline;
