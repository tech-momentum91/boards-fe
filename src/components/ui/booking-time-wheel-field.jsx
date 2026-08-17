import * as React from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';

import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import {
  BOOKING_TIME_WHEEL_HEIGHT,
  BOOKING_TIME_WHEEL_ITEM_H,
  BOOKING_TIME_WHEEL_VISIBLE_ROWS,
  buildWheelRows,
  endHoursAfter,
  endMeridiemsAfter,
  endMinutesAfter,
  formatSingleTimeSummary,
  formatTimeSummary,
  HOURS_12,
  MERIDIEM,
  MINUTES,
  minEndTotalMinutes,
  minStartTotalMinutesForBookingDate,
  parsePickerTime,
  safeScrollTo,
  setScrollTopInstant,
  startHoursValid,
  startMeridiemsValid,
  startMinutesValid,
  timeStringToMinutes,
  to24Hour,
  totalMinutes12h,
  wheelRowVisualStyle,
  minutesToHHmm,
} from '@/utils/booking-time-wheel-utils';

import './booking-time-wheel-field.css';

const ITEM_H = BOOKING_TIME_WHEEL_ITEM_H;
const VISIBLE_ROWS = BOOKING_TIME_WHEEL_VISIBLE_ROWS;
const WHEEL_HEIGHT = BOOKING_TIME_WHEEL_HEIGHT;

const WheelColumn = React.memo(
  ({
    label = '',
    options,
    value,
    onChange,
    ariaLabel,
    textAlign = 'center',
    layout = 'drum',
    popoverOpen = true,
  }) => {
    const scrollRef = React.useRef(null);
    const snapTimerRef = React.useRef(null);
    const rafRef = React.useRef(null);
    const onChangeRef = React.useRef(onChange);

    React.useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    const { rows, baseLen } = React.useMemo(() => buildWheelRows(options), [options]);
    const totalLen = rows.length;

    const baseIndex = Math.max(0, options.indexOf(value));
    const [centerIdx, setCenterIdx] = React.useState(() => Math.max(0, options.indexOf(value)));

    const updateCenterFromScroll = React.useCallback(() => {
      const el = scrollRef.current;
      if (!el) return;
      const i = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(totalLen - 1, i));
      setCenterIdx((prev) => (prev === clamped ? prev : clamped));
    }, [totalLen]);

    React.useLayoutEffect(() => {
      const el = scrollRef.current;
      if (!el || baseLen === 0) return undefined;
      const target = baseIndex;
      const targetTop = target * ITEM_H;

      function applyScrollSync() {
        const node = scrollRef.current;
        if (!node) return;
        if (Math.abs(node.scrollTop - targetTop) < 0.5) {
          setCenterIdx(target);
          return;
        }
        setScrollTopInstant(node, targetTop);
        setCenterIdx(target);
      }

      applyScrollSync();
      return undefined;
    }, [baseIndex, baseLen, value, options, popoverOpen]);

    React.useEffect(() => () => clearTimeout(snapTimerRef.current), []);

    function scrollToBaseIndex(b) {
      const el = scrollRef.current;
      const idx = Math.max(0, Math.min(baseLen - 1, b));
      safeScrollTo(el, idx * ITEM_H, null);
    }

    const commitFromScroll = React.useCallback(() => {
      const el = scrollRef.current;
      if (!el || totalLen === 0) return;
      const i = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(totalLen - 1, i));
      const selected = options[clamped];
      if (selected !== undefined && selected !== value) {
        onChangeRef.current(selected);
      }
      setCenterIdx(clamped);
    }, [totalLen, options, value]);

    React.useEffect(() => {
      const el = scrollRef.current;
      if (!el || totalLen === 0) return undefined;
      const onScrollEnd = () => {
        window.clearTimeout(snapTimerRef.current);
        snapTimerRef.current = 0;
        commitFromScroll();
      };
      el.addEventListener('scrollend', onScrollEnd);
      return () => {
        el.removeEventListener('scrollend', onScrollEnd);
        window.clearTimeout(snapTimerRef.current);
        snapTimerRef.current = 0;
      };
    }, [totalLen, commitFromScroll]);

    const padTop = ((VISIBLE_ROWS - 1) / 2) * ITEM_H;
    const padBottom = padTop;

    const rowJustifyClass =
      textAlign === 'end'
        ? 'justify-end'
        : textAlign === 'start'
          ? 'justify-start'
          : 'justify-center';

    const isInline = layout === 'inline';

    function onScroll() {
      if (totalLen === 0) return;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        updateCenterFromScroll();
      });
      window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = window.setTimeout(() => {
        snapTimerRef.current = 0;
        commitFromScroll();
      }, 280);
    }

    return (
      <div
        className={cn(
          'booking-time-wheel-column-wrap',
          isInline && 'booking-time-wheel-column-wrap--inline',
        )}
      >
        {label ? (
          <span className='mb-1 min-h-[14px] text-xs font-semibold uppercase tracking-wider text-text-sub-600'>
            {label}
          </span>
        ) : null}
        <div
          className={cn(
            isInline ? 'booking-time-wheel-column-inner-inline' : 'booking-time-wheel-frame',
          )}
          style={{ height: WHEEL_HEIGHT }}
        >
          {totalLen > 0 ? (
            <>
              {!isInline ? <div aria-hidden className='booking-time-wheel-highlight' /> : null}
              <div
                ref={scrollRef}
                role='listbox'
                aria-label={ariaLabel}
                onScroll={onScroll}
                onWheel={(e) => e.stopPropagation()}
                className={cn(
                  'booking-time-wheel-scroll',
                  isInline && 'booking-time-wheel-scroll--inline',
                )}
                style={{
                  paddingTop: padTop,
                  paddingBottom: padBottom,
                }}
              >
                {rows.map((row, idx) => {
                  const dist = Math.abs(idx - centerIdx);
                  const vis = wheelRowVisualStyle(dist);
                  return (
                    <div
                      key={row.key}
                      role='option'
                      aria-selected={row.value === value}
                      tabIndex={-1}
                      style={{
                        height: ITEM_H,
                        lineHeight: `${ITEM_H}px`,
                        opacity: vis.opacity,
                        transform: vis.transform,
                      }}
                      className={cn(
                        'booking-time-wheel-item relative z-[15] flex w-full min-w-[36px] cursor-pointer items-center px-2 will-change-transform sm:min-w-[42px] sm:px-2.5',
                        vis.textClass,
                        rowJustifyClass,
                      )}
                      onClick={() => {
                        const b = options.indexOf(row.value);
                        if (b >= 0) {
                          onChange(row.value);
                          scrollToBaseIndex(b);
                        }
                      }}
                    >
                      {row.value}
                    </div>
                  );
                })}
              </div>
              {!isInline ? (
                <div aria-hidden className='booking-time-wheel-fade-wrap'>
                  <div className='booking-time-wheel-fade-top' />
                  <div className='booking-time-wheel-fade-bottom' />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    );
  },
);

WheelColumn.displayName = 'WheelColumn';

/**
 * Apple-style scroll wheels for start/end time. Opens in a popover.
 *
 * @param {{
 *   bookingDate?: string,
 *   startTime: string,
 *   endTime: string,
 *   onChange: (patch: { start_time?: string, end_time?: string }) => void,
 *   disabled?: boolean,
 *   placeholder?: string,
 *   applyTodayStartBookableFloor?: boolean,
 *   className?: string,
 * }} props
 */
export function BookingTimeWheelField({
  bookingDate,
  startTime,
  endTime,
  onChange,
  disabled,
  placeholder = 'Select time',
  applyTodayStartBookableFloor = true,
  className = '',
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef(null);
  const [popoverWidth, setPopoverWidth] = React.useState(undefined);

  const measureTriggerWidth = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    if (typeof window !== 'undefined') {
      setPopoverWidth(Math.min(w, window.innerWidth - 32));
    } else {
      setPopoverWidth(w);
    }
  }, []);

  React.useLayoutEffect(() => {
    measureTriggerWidth();
  }, [measureTriggerWidth]);

  React.useLayoutEffect(() => {
    if (!open) return undefined;
    measureTriggerWidth();
    const el = triggerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measureTriggerWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, measureTriggerWidth]);

  const startParts = React.useMemo(() => parsePickerTime(startTime), [startTime]);
  const endParts = React.useMemo(() => parsePickerTime(endTime), [endTime]);

  const startTotalM = React.useMemo(() => timeStringToMinutes(startTime), [startTime]);

  const minStartM = React.useMemo(() => {
    if (!applyTodayStartBookableFloor) return 0;
    return minStartTotalMinutesForBookingDate(bookingDate);
  }, [bookingDate, applyTodayStartBookableFloor]);

  const startMeridiemOptions = React.useMemo(() => {
    const o = startMeridiemsValid(minStartM);
    return o.length > 0 ? o : MERIDIEM;
  }, [minStartM]);

  const startHourOptions = React.useMemo(() => {
    const o = startHoursValid(minStartM, startParts.meridiem);
    return o.length > 0 ? o : HOURS_12;
  }, [minStartM, startParts.meridiem]);

  const startMinuteOptions = React.useMemo(() => {
    const o = startMinutesValid(minStartM, startParts.hour12, startParts.meridiem);
    return o.length > 0 ? o : MINUTES;
  }, [minStartM, startParts.hour12, startParts.meridiem]);

  const endMeridiemOptions = React.useMemo(() => {
    const o = endMeridiemsAfter(startTotalM);
    return o.length > 0 ? o : MERIDIEM;
  }, [startTotalM]);

  const endHourOptions = React.useMemo(() => {
    const o = endHoursAfter(startTotalM, endParts.meridiem, endParts.minute);
    return o.length > 0 ? o : HOURS_12;
  }, [startTotalM, endParts.meridiem, endParts.minute]);

  const endMinuteOptions = React.useMemo(() => {
    const o = endMinutesAfter(startTotalM, endParts.hour12, endParts.meridiem);
    return o.length > 0 ? o : MINUTES;
  }, [startTotalM, endParts.hour12, endParts.meridiem]);

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useLayoutEffect(() => {
    if (minStartM <= 0 || !startTime) return;
    const sm = timeStringToMinutes(startTime);
    if (sm >= minStartM) return;
    const nextStart = minutesToHHmm(minStartM);
    const em = timeStringToMinutes(endTime || '00:00');
    const patch = { start_time: nextStart };
    if (em < minEndTotalMinutes(minStartM)) {
      patch.end_time = minutesToHHmm(Math.min(minEndTotalMinutes(minStartM), 24 * 60 - 1));
    }
    onChangeRef.current(patch);
  }, [minStartM, startTime, endTime]);

  React.useLayoutEffect(() => {
    if (!startTime || !endTime) return;
    const sm = timeStringToMinutes(startTime);
    const parts = parsePickerTime(endTime);
    const em = totalMinutes12h(parts.hour12, parts.minute, parts.meridiem);
    if (em < minEndTotalMinutes(sm)) {
      onChangeRef.current({
        end_time: minutesToHHmm(Math.min(minEndTotalMinutes(sm), 24 * 60 - 1)),
      });
      return;
    }
    const mo = endMinutesAfter(sm, parts.hour12, parts.meridiem);
    if (mo.length > 0 && !mo.includes(parts.minute)) {
      onChangeRef.current({
        end_time: to24Hour(parts.hour12, mo[0], parts.meridiem),
      });
      return;
    }
    const ho = endHoursAfter(sm, parts.meridiem, parts.minute);
    if (ho.length > 0 && !ho.includes(parts.hour12)) {
      onChangeRef.current({
        end_time: to24Hour(ho[0], parts.minute, parts.meridiem),
      });
      return;
    }
    const merO = endMeridiemsAfter(sm);
    if (merO.length > 0 && !merO.includes(parts.meridiem)) {
      onChangeRef.current({
        end_time: to24Hour(parts.hour12, parts.minute, merO[0]),
      });
    }
  }, [startTime, endTime]);

  const summary = React.useMemo(
    () => formatTimeSummary(bookingDate, startTime, endTime),
    [bookingDate, startTime, endTime],
  );

  const patchStart = React.useCallback(
    (partial) => {
      const next = {
        hour12: partial.hour12 ?? startParts.hour12,
        minute: partial.minute ?? startParts.minute,
        meridiem: partial.meridiem ?? startParts.meridiem,
      };
      let t = to24Hour(next.hour12, next.minute, next.meridiem);
      let sm2 = timeStringToMinutes(t);
      if (minStartM > 0 && sm2 < minStartM) {
        t = minutesToHHmm(minStartM);
        sm2 = minStartM;
      }
      const em = timeStringToMinutes(endTime);
      const minEnd = minEndTotalMinutes(sm2);
      if (em < minEnd) {
        onChange({
          start_time: t,
          end_time: minutesToHHmm(Math.min(minEnd, 24 * 60 - 1)),
        });
        return;
      }
      onChange({ start_time: t });
    },
    [startParts, endTime, onChange, minStartM],
  );

  const patchEnd = React.useCallback(
    (partial) => {
      const next = {
        hour12: partial.hour12 ?? endParts.hour12,
        minute: partial.minute ?? endParts.minute,
        meridiem: partial.meridiem ?? endParts.meridiem,
      };
      let t = to24Hour(next.hour12, next.minute, next.meridiem);
      const em = timeStringToMinutes(t);
      const sm = timeStringToMinutes(startTime);
      if (em < minEndTotalMinutes(sm)) {
        const bumped = Math.min(minEndTotalMinutes(sm), 24 * 60 - 1);
        if (bumped <= sm) {
          onChange({ end_time: minutesToHHmm(24 * 60 - 1) });
          return;
        }
        const p = parsePickerTime(minutesToHHmm(bumped));
        t = to24Hour(p.hour12, p.minute, p.meridiem);
      }
      onChange({ end_time: t });
    },
    [endParts, startTime, onChange],
  );

  const onStartHour = React.useCallback((v) => patchStart({ hour12: v }), [patchStart]);
  const onStartMinute = React.useCallback((v) => patchStart({ minute: v }), [patchStart]);
  const onStartMeridiem = React.useCallback((v) => patchStart({ meridiem: v }), [patchStart]);
  const onEndHour = React.useCallback((v) => patchEnd({ hour12: v }), [patchEnd]);
  const onEndMinute = React.useCallback((v) => patchEnd({ minute: v }), [patchEnd]);
  const onEndMeridiem = React.useCallback((v) => patchEnd({ meridiem: v }), [patchEnd]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen} modal>
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          type='button'
          disabled={disabled}
          className={cn(
            'flex h-9 min-h-9 w-full items-center justify-between rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 text-left text-label-sm shadow-regular-xs outline-none transition',
            'hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-primary-base/20',
            summary ? 'text-text-strong-950' : 'text-text-soft-400',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          <span className='min-w-0 truncate'>{summary || placeholder}</span>
          <RiArrowDownSLine className='size-4 shrink-0 text-text-soft-400' aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Content
        align='start'
        side='bottom'
        sideOffset={8}
        avoidCollisions
        collisionPadding={{ top: 16, right: 16, bottom: 24, left: 16 }}
        showArrow={false}
        unstyled
        onOpenAutoFocus={(e) => e.preventDefault()}
        style={
          popoverWidth != null
            ? {
                width: popoverWidth,
                minWidth: popoverWidth,
                maxWidth: popoverWidth,
              }
            : undefined
        }
        className='booking-time-wheel-scope booking-time-wheel-popover z-[70] overflow-visible rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-0 font-sans text-label-sm text-text-strong-950 shadow-regular-md antialiased'
      >
        <div className='booking-time-wheel-split'>
          <div className='booking-time-wheel-split-pane'>
            <p className='text-center text-xs font-semibold uppercase tracking-[0.88px] text-text-sub-600'>
              Start
            </p>
            <div className='booking-time-wheel-drum' style={{ height: WHEEL_HEIGHT }}>
              <div aria-hidden className='booking-time-wheel-unified-highlight' />
              <div className='booking-time-wheel-columns booking-time-wheel-columns--unified'>
                <WheelColumn
                  layout='inline'
                  popoverOpen={open}
                  options={startHourOptions}
                  value={startParts.hour12}
                  onChange={onStartHour}
                  ariaLabel='Start hour'
                  textAlign='end'
                />
                <WheelColumn
                  layout='inline'
                  popoverOpen={open}
                  options={startMinuteOptions}
                  value={startParts.minute}
                  onChange={onStartMinute}
                  ariaLabel='Start minute'
                  textAlign='center'
                />
                <WheelColumn
                  layout='inline'
                  popoverOpen={open}
                  options={startMeridiemOptions}
                  value={startParts.meridiem}
                  onChange={onStartMeridiem}
                  ariaLabel='Start AM or PM'
                  textAlign='center'
                />
              </div>
              <div aria-hidden className='booking-time-wheel-fade-wrap'>
                <div className='booking-time-wheel-fade-top booking-time-wheel-fade-top--drum' />
                <div className='booking-time-wheel-fade-bottom booking-time-wheel-fade-bottom--drum' />
              </div>
            </div>
          </div>
          <div className='booking-time-wheel-split-pane'>
            <p className='text-center text-xs font-semibold uppercase tracking-[0.88px] text-text-sub-600'>
              End
            </p>
            <div className='booking-time-wheel-drum' style={{ height: WHEEL_HEIGHT }}>
              <div aria-hidden className='booking-time-wheel-unified-highlight' />
              <div className='booking-time-wheel-columns booking-time-wheel-columns--unified'>
                <WheelColumn
                  layout='inline'
                  popoverOpen={open}
                  options={endHourOptions}
                  value={endParts.hour12}
                  onChange={onEndHour}
                  ariaLabel='End hour'
                  textAlign='end'
                />
                <WheelColumn
                  layout='inline'
                  popoverOpen={open}
                  options={endMinuteOptions}
                  value={endParts.minute}
                  onChange={onEndMinute}
                  ariaLabel='End minute'
                  textAlign='center'
                />
                <WheelColumn
                  layout='inline'
                  popoverOpen={open}
                  options={endMeridiemOptions}
                  value={endParts.meridiem}
                  onChange={onEndMeridiem}
                  ariaLabel='End AM or PM'
                  textAlign='center'
                />
              </div>
              <div aria-hidden className='booking-time-wheel-fade-wrap'>
                <div className='booking-time-wheel-fade-top booking-time-wheel-fade-top--drum' />
                <div className='booking-time-wheel-fade-bottom booking-time-wheel-fade-bottom--drum' />
              </div>
            </div>
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

/**
 * Scroll-wheel picker for a single time (start or end).
 *
 * @param {{
 *   mode: 'start' | 'end',
 *   value: string,
 *   onChange: (value: string) => void,
 *   peerTime?: string,
 *   bookingDate?: string,
 *   applyTodayStartBookableFloor?: boolean,
 *   restrictByPeerTime?: boolean,
 *   disabled?: boolean,
 *   placeholder?: string,
 *   className?: string,
 *   ariaLabel?: string,
 * }} props
 */
export function BookingSingleTimeWheelField({
  mode,
  value,
  onChange,
  peerTime = '',
  bookingDate,
  applyTodayStartBookableFloor = true,
  restrictByPeerTime = true,
  disabled,
  placeholder = 'HH:MM',
  className = '',
  ariaLabel = 'Select time',
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef(null);
  const [popoverWidth, setPopoverWidth] = React.useState(undefined);

  const measureTriggerWidth = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    if (typeof window !== 'undefined') {
      setPopoverWidth(Math.min(Math.max(w, 280), window.innerWidth - 32));
    } else {
      setPopoverWidth(Math.max(w, 280));
    }
  }, []);

  React.useLayoutEffect(() => {
    measureTriggerWidth();
  }, [measureTriggerWidth]);

  React.useLayoutEffect(() => {
    if (!open) return undefined;
    measureTriggerWidth();
    const el = triggerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measureTriggerWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, measureTriggerWidth]);

  const parts = React.useMemo(() => parsePickerTime(value), [value]);
  const isStart = mode === 'start';
  const peerTotalM = React.useMemo(() => timeStringToMinutes(peerTime), [peerTime]);

  const minStartM = React.useMemo(() => {
    if (!isStart || !applyTodayStartBookableFloor) return 0;
    return minStartTotalMinutesForBookingDate(bookingDate);
  }, [bookingDate, applyTodayStartBookableFloor, isStart]);

  const meridiemOptions = React.useMemo(() => {
    if (isStart) {
      const o = startMeridiemsValid(minStartM);
      return o.length > 0 ? o : MERIDIEM;
    }
    if (!restrictByPeerTime) return MERIDIEM;
    const o = endMeridiemsAfter(peerTotalM);
    return o.length > 0 ? o : MERIDIEM;
  }, [isStart, minStartM, peerTotalM, restrictByPeerTime]);

  const hourOptions = React.useMemo(() => {
    if (isStart) {
      const o = startHoursValid(minStartM, parts.meridiem);
      return o.length > 0 ? o : HOURS_12;
    }
    if (!restrictByPeerTime) return HOURS_12;
    const o = endHoursAfter(peerTotalM, parts.meridiem, parts.minute);
    return o.length > 0 ? o : HOURS_12;
  }, [isStart, minStartM, parts.meridiem, parts.minute, peerTotalM, restrictByPeerTime]);

  const minuteOptions = React.useMemo(() => {
    if (isStart) {
      const o = startMinutesValid(minStartM, parts.hour12, parts.meridiem);
      return o.length > 0 ? o : MINUTES;
    }
    if (!restrictByPeerTime) return MINUTES;
    const o = endMinutesAfter(peerTotalM, parts.hour12, parts.meridiem);
    return o.length > 0 ? o : MINUTES;
  }, [isStart, minStartM, parts.hour12, parts.meridiem, peerTotalM, restrictByPeerTime]);

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const emitTime = React.useCallback(
    (partial) => {
      const next = {
        hour12: partial.hour12 ?? parts.hour12,
        minute: partial.minute ?? parts.minute,
        meridiem: partial.meridiem ?? parts.meridiem,
      };
      let t = to24Hour(next.hour12, next.minute, next.meridiem);
      let tm = timeStringToMinutes(t);

      if (isStart && minStartM > 0 && tm < minStartM) {
        t = minutesToHHmm(minStartM);
        tm = minStartM;
      }

      if (!isStart && restrictByPeerTime && tm < minEndTotalMinutes(peerTotalM)) {
        const bumped = Math.min(minEndTotalMinutes(peerTotalM), 24 * 60 - 1);
        if (bumped <= peerTotalM) {
          onChange(minutesToHHmm(24 * 60 - 1));
          return;
        }
        const p = parsePickerTime(minutesToHHmm(bumped));
        t = to24Hour(p.hour12, p.minute, p.meridiem);
      }

      onChange(t);
    },
    [isStart, minStartM, onChange, parts, peerTotalM, restrictByPeerTime],
  );

  React.useLayoutEffect(() => {
    if (!value) return;
    if (isStart && minStartM > 0) {
      const sm = timeStringToMinutes(value);
      if (sm < minStartM) onChangeRef.current(minutesToHHmm(minStartM));
      return;
    }
    if (!isStart && restrictByPeerTime && peerTime) {
      const em = timeStringToMinutes(value);
      if (em < minEndTotalMinutes(peerTotalM)) {
        onChangeRef.current(minutesToHHmm(Math.min(minEndTotalMinutes(peerTotalM), 24 * 60 - 1)));
      }
    }
  }, [value, isStart, minStartM, peerTime, peerTotalM, restrictByPeerTime]);

  const summary = React.useMemo(() => formatSingleTimeSummary(value), [value]);

  const onHour = React.useCallback((v) => emitTime({ hour12: v }), [emitTime]);
  const onMinute = React.useCallback((v) => emitTime({ minute: v }), [emitTime]);
  const onMeridiem = React.useCallback((v) => emitTime({ meridiem: v }), [emitTime]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen} modal>
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          type='button'
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'flex h-9 min-h-9 w-full items-center justify-between rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 text-left text-label-sm shadow-regular-xs outline-none transition',
            'hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-primary-base/20',
            summary ? 'text-text-strong-950' : 'text-text-soft-400',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          <span className='min-w-0 truncate'>{summary || placeholder}</span>
          <RiArrowDownSLine className='size-4 shrink-0 text-text-soft-400' aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Content
        align='start'
        side='bottom'
        sideOffset={8}
        avoidCollisions
        collisionPadding={{ top: 16, right: 16, bottom: 24, left: 16 }}
        showArrow={false}
        unstyled
        onOpenAutoFocus={(e) => e.preventDefault()}
        style={
          popoverWidth != null
            ? {
                width: popoverWidth,
                minWidth: popoverWidth,
                maxWidth: popoverWidth,
              }
            : undefined
        }
        className='booking-time-wheel-scope booking-time-wheel-popover z-[70] overflow-visible rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-2 font-sans text-label-sm text-text-strong-950 shadow-regular-md antialiased sm:p-3'
      >
        <div className='booking-time-wheel-drum' style={{ height: WHEEL_HEIGHT }}>
          <div aria-hidden className='booking-time-wheel-unified-highlight' />
          <div className='booking-time-wheel-columns booking-time-wheel-columns--unified'>
            <WheelColumn
              layout='inline'
              popoverOpen={open}
              options={hourOptions}
              value={parts.hour12}
              onChange={onHour}
              ariaLabel={`${isStart ? 'Start' : 'End'} hour`}
              textAlign='end'
            />
            <WheelColumn
              layout='inline'
              popoverOpen={open}
              options={minuteOptions}
              value={parts.minute}
              onChange={onMinute}
              ariaLabel={`${isStart ? 'Start' : 'End'} minute`}
              textAlign='center'
            />
            <WheelColumn
              layout='inline'
              popoverOpen={open}
              options={meridiemOptions}
              value={parts.meridiem}
              onChange={onMeridiem}
              ariaLabel={`${isStart ? 'Start' : 'End'} AM or PM`}
              textAlign='center'
            />
          </div>
          <div aria-hidden className='booking-time-wheel-fade-wrap'>
            <div className='booking-time-wheel-fade-top booking-time-wheel-fade-top--drum' />
            <div className='booking-time-wheel-fade-bottom booking-time-wheel-fade-bottom--drum' />
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

export default BookingTimeWheelField;
