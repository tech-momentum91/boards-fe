import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Layers, Loader2, Sparkles } from 'lucide-react';

import { analyzeLayout } from '@/api/layoutAnalyze';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import { showErrorToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

const LOAD_PHASE_LABELS = [
  'Analyzing layout…',
  'Extracting assets…',
  'Structuring results…',
  'Done!',
];

function humanizeType(type) {
  if (!type) return '';
  return String(type)
    .replaceAll('_', ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function rowListKey(prefix, row) {
  const desc = String(row.description ?? '');
  return `${prefix}-${row.type}-${row.count}-${desc.slice(0, 48)}`;
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {string} [props.layoutId]
 */
export function LayoutAnalyzeModal({ open, onOpenChange, layoutId = '' }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [awaitingDone, setAwaitingDone] = useState(false);
  const [result, setResult] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const cycleTimerRef = useRef(null);
  const doneTimerRef = useRef(null);

  const reset = useCallback(() => {
    setPhaseIndex(0);
    setAwaitingDone(false);
    setResult(null);
    setIsFetching(false);
    if (cycleTimerRef.current) {
      clearInterval(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    if (doneTimerRef.current) {
      clearTimeout(doneTimerRef.current);
      doneTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return undefined;
    }

    const id = String(layoutId || '').trim();
    if (!id) {
      onOpenChange(false);
      return undefined;
    }

    const abortController = new AbortController();

    setResult(null);
    setPhaseIndex(0);
    setAwaitingDone(false);
    setIsFetching(true);

    cycleTimerRef.current = setInterval(() => {
      setPhaseIndex((prev) => {
        if (prev >= 2) return prev;
        return prev + 1;
      });
    }, 1600);

    let cancelled = false;

    (async () => {
      try {
        const message = await analyzeLayout({ layout: id, signal: abortController.signal });
        if (cancelled) return;

        if (cycleTimerRef.current) {
          clearInterval(cycleTimerRef.current);
          cycleTimerRef.current = null;
        }

        setPhaseIndex(3);
        setAwaitingDone(true);

        doneTimerRef.current = setTimeout(() => {
          if (cancelled) return;
          setAwaitingDone(false);
          setResult(message && typeof message === 'object' ? message : null);
          setIsFetching(false);
        }, 650);
      } catch (error) {
        if (cancelled) return;
        if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') return;
        if (cycleTimerRef.current) {
          clearInterval(cycleTimerRef.current);
          cycleTimerRef.current = null;
        }
        setIsFetching(false);
        showErrorToast(error);
        onOpenChange(false);
      }
    })();

    return () => {
      cancelled = true;
      abortController.abort();
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
      if (doneTimerRef.current) {
        clearTimeout(doneTimerRef.current);
        doneTimerRef.current = null;
      }
    };
  }, [open, layoutId, onOpenChange, reset]);

  const summary = result?.summary;
  const assets = Array.isArray(result?.assets) ? result.assets : [];
  const spaces = Array.isArray(result?.spaces) ? result.spaces : [];
  const observations = Array.isArray(result?.observations) ? result.observations : [];

  const layoutLabel = result?.layout;
  const modelLabel = result?.model;

  const showLoader = isFetching || awaitingDone;

  const activePhaseLabel = useMemo(() => {
    const idx = Math.min(phaseIndex, LOAD_PHASE_LABELS.length - 1);
    return LOAD_PHASE_LABELS[idx];
  }, [phaseIndex]);

  const hasStructuredDetail =
    summary != null || assets.length > 0 || spaces.length > 0 || observations.length > 0;

  let modalBodyMain = null;
  if (showLoader) {
    modalBodyMain = (
      <div className='flex min-h-[280px] flex-col items-center justify-center gap-6 px-2 py-8'>
        <div className='relative flex size-20 items-center justify-center'>
          <span className='absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-primary-base/25 via-purple-400/20 to-fuchsia-400/25 blur-md' />
          <span className='relative flex size-16 items-center justify-center rounded-2xl border border-stroke-soft-200 bg-bg-white-0 shadow-sm'>
            <Sparkles className='size-7 text-primary-base' aria-hidden />
          </span>
          <Loader2
            className='absolute -bottom-1 -right-1 size-7 animate-spin text-primary-base'
            aria-hidden
          />
        </div>
        <div className='flex w-full max-w-sm flex-col items-center gap-3'>
          <p className='text-center text-label-md font-medium text-text-strong-950'>
            {activePhaseLabel}
          </p>
          <div className='flex w-full justify-center gap-2'>
            {LOAD_PHASE_LABELS.slice(0, 4).map((label, i) => {
              const active = i === Math.min(phaseIndex, 3);
              const past = i < Math.min(phaseIndex, 3);
              return (
                <div
                  key={label}
                  className='flex flex-1 flex-col items-center gap-1.5'
                  title={label}
                >
                  <span
                    className={cn(
                      'h-1.5 w-full rounded-full transition-colors',
                      past || active ? 'bg-primary-base' : 'bg-stroke-soft-200',
                      active && 'ring-2 ring-primary-base/30',
                    )}
                  />
                  <span
                    className={cn(
                      'text-center text-[10px] leading-tight text-text-sub-500',
                      active && 'font-medium text-text-strong-950',
                    )}
                  >
                    {i === 0 && 'Analyze'}
                    {i === 1 && 'Assets'}
                    {i === 2 && 'Structure'}
                    {i === 3 && 'Done'}
                  </span>
                </div>
              );
            })}
          </div>
          <p className='text-center text-paragraph-xs text-text-sub-500'>
            Interpreting your floor plan with AI — this can take a little while.
          </p>
        </div>
      </div>
    );
  } else if (result) {
    modalBodyMain = (
      <div className='flex flex-col gap-5'>
        {(summary || layoutLabel || modelLabel) && (
          <div className='grid grid-cols-2 gap-3'>
            {typeof summary?.total_asset_types === 'number' ? (
              <div className='rounded-xl border border-stroke-soft-200 bg-bg-weak-50 px-4 py-3'>
                <div className='flex items-center gap-2 text-text-sub-600'>
                  <Layers className='size-4 shrink-0' aria-hidden />
                  <span className='text-paragraph-xs font-medium uppercase tracking-wide'>
                    Asset types
                  </span>
                </div>
                <p className='mt-1 text-2xl font-semibold tabular-nums text-text-strong-950'>
                  {summary.total_asset_types}
                </p>
              </div>
            ) : null}
            {typeof summary?.total_assets === 'number' ? (
              <div className='rounded-xl border border-stroke-soft-200 bg-bg-weak-50 px-4 py-3'>
                <div className='flex items-center gap-2 text-text-sub-600'>
                  <Box className='size-4 shrink-0' aria-hidden />
                  <span className='text-paragraph-xs font-medium uppercase tracking-wide'>
                    Total assets
                  </span>
                </div>
                <p className='mt-1 text-2xl font-semibold tabular-nums text-text-strong-950'>
                  {summary.total_assets}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {assets.length > 0 ? (
          <section className='flex flex-col gap-2'>
            <h3 className='text-label-sm font-semibold text-text-strong-950'>Assets</h3>
            <ul className='flex flex-col gap-2'>
              {assets.map((row) => (
                <li
                  key={rowListKey('asset', row)}
                  className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5'
                >
                  <div className='flex flex-wrap items-baseline justify-between gap-2'>
                    <span className='text-paragraph-sm font-medium text-text-strong-950'>
                      {humanizeType(row.type)}
                    </span>
                    <Badge.Root variant='filled' color='gray' size='small'>
                      {row.count}
                    </Badge.Root>
                  </div>
                  {row.description ? (
                    <p className='mt-1.5 text-paragraph-xs leading-relaxed text-text-sub-600'>
                      {row.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {spaces.length > 0 ? (
          <section className='flex flex-col gap-2'>
            <h3 className='text-label-sm font-semibold text-text-strong-950'>Spaces</h3>
            <ul className='flex flex-col gap-2'>
              {spaces.map((row) => (
                <li
                  key={rowListKey('space', row)}
                  className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5'
                >
                  <div className='flex flex-wrap items-baseline justify-between gap-2'>
                    <span className='text-paragraph-sm font-medium text-text-strong-950'>
                      {humanizeType(row.type)}
                    </span>
                    <Badge.Root variant='filled' color='purple' size='small'>
                      {row.count}
                    </Badge.Root>
                  </div>
                  {row.description ? (
                    <p className='mt-1.5 text-paragraph-xs leading-relaxed text-text-sub-600'>
                      {row.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {observations.length > 0 ? (
          <section className='flex flex-col gap-2'>
            <h3 className='text-label-sm font-semibold text-text-strong-950'>Observations</h3>
            <ul className='flex list-none flex-col gap-2'>
              {observations.map((text, obsIndex) => (
                <li
                  key={String(text)}
                  className='flex gap-2 rounded-xl border border-stroke-soft-200 bg-gradient-to-br from-bg-weak-50 to-bg-white-0 px-3 py-2.5 text-paragraph-xs leading-relaxed text-text-strong-950'
                >
                  <span
                    className='mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-base/15 text-[10px] font-semibold text-primary-base'
                    aria-hidden
                  >
                    {obsIndex + 1}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {hasStructuredDetail ? null : (
          <p className='text-paragraph-sm text-text-sub-600'>
            Analysis completed, but no structured details were returned.
          </p>
        )}
      </div>
    );
  } else {
    modalBodyMain = <p className='text-paragraph-sm text-text-sub-600'>No data.</p>;
  }

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className={cn(
          'flex max-h-[min(92vh,880px)] max-w-[min(100vw-1rem,42rem)] flex-col overflow-hidden',
        )}
      >
        <Modal.Header>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-white-0 ring-1 ring-inset ring-stroke-soft-200'>
            <Sparkles className='size-5 text-text-sub-600' aria-hidden />
          </div>
          <div className='flex-1 space-y-1'>
            <Modal.Title>Floor Plan Analysis</Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-2'>
          {modalBodyMain}
        </Modal.Body>
        <Modal.Footer className='flex-shrink-0 justify-end gap-2'>
          <Modal.Close asChild>
            <Button.Root type='button' variant='neutral' mode='stroke' size='small'>
              Close
            </Button.Root>
          </Modal.Close>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
