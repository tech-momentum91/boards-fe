import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';
import { RiTimeLine, RiArrowDownSLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as LinkButton from '@/components/ui/link-button';
import * as Modal from '@/components/ui/modal';
import { DateTimePicker } from '@/components/ui/datetimepicker';
import * as Switch from '@/components/ui/switch';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  getCenterDetailsThunk,
  getCenterWorkingHoursThunk,
  addCenterWorkingHoursThunk,
  updateCenterWorkingHoursThunk,
} from '@/redux/centerSlice';
import { cn } from '@/utils/cn';
import { hasModulePermission } from '@/utils/user-role-utils';
import {
  WEEKDAYS_SUN_FIRST,
  buildScheduleWeekRows,
  buildTodayWorkingSummary,
  dateToHhmmString,
  hhmmStringToDate,
  toApiHhMmss,
  workingApiRowsToDraft,
  stripLeadingWeekdayFromSummaryText,
} from '@/utils/center-working-hours-helpers';

const WH_SWITCH =
  'data-[state=checked]:[&>div]:!bg-[#0F9D58] hover:data-[state=checked]:[&>div]:!bg-[#0c8a4d]';
const SAVE_BTN =
  '!border-0 !bg-[#0F9D58] !text-white shadow-none hover:!bg-[#0c8a4d] focus-visible:!shadow-[0_0_0_3px_rgba(15,157,88,0.35)] disabled:!opacity-60';

export function CenterWorkingHoursSection({
  centerName,
  todayWorkingHoursFromDetails = null,
  docWorkingHoursSummary = null,
}) {
  const dispatch = useDispatch();
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canEditCenter = hasModulePermission(userSideBarPerm, 'Center', 'write');
  const [rows, setRows] = useState([]);
  const [week, setWeek] = useState([]);
  const [todayApi, setTodayApi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(() => workingApiRowsToDraft([]));
  const [saving, setSaving] = useState(false);

  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const todayName = WEEKDAYS_SUN_FIRST[new Date().getDay()];

  const load = useCallback(async () => {
    if (!centerName) return;
    setLoading(true);
    try {
      const res = await dispatch(getCenterWorkingHoursThunk(centerName)).unwrap();
      setRows(Array.isArray(res?.working_hours) ? res.working_hours : []);
      setWeek(Array.isArray(res?.week) ? res.week : []);
      setTodayApi(res?.today != null && res.today !== '' ? String(res.today) : null);
    } catch {
      setRows([]);
      setWeek([]);
      setTodayApi(null);
    } finally {
      setLoading(false);
    }
  }, [centerName, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(
    () =>
      buildTodayWorkingSummary({
        workingHoursTodayApi: todayApi,
        workingHoursWeek: week,
        workingHoursRows: rows,
        todayWorkingHoursFromDetails,
        docWorkingHoursSummary,
        todayIso,
        todayWeekdayName: todayName,
      }),
    [
      todayApi,
      week,
      rows,
      todayWorkingHoursFromDetails,
      docWorkingHoursSummary,
      todayIso,
      todayName,
    ],
  );

  const scheduleRows = useMemo(
    () => buildScheduleWeekRows(week, rows, todayIso, todayName),
    [week, rows, todayIso, todayName],
  );

  const openModal = useCallback(() => {
    setDraft(workingApiRowsToDraft(rows));
    setModalOpen(true);
  }, [rows]);

  const patchDay = useCallback((day, partial) => {
    setDraft((prev) => ({ ...prev, [day]: { ...prev[day], ...partial } }));
  }, []);

  const save = useCallback(async () => {
    if (!centerName) return;
    setSaving(true);
    try {
      const c = centerName;
      for (const day of WEEKDAYS_SUN_FIRST) {
        const d = draft[day];
        const ex = rows.find((r) => r.day === day);
        if (!d.isOpen) {
          if (ex) {
            await dispatch(
              updateCenterWorkingHoursThunk({
                row_name: ex.name,
                day,
                is_closed: 1,
                open_24_hours: 0,
              }),
            ).unwrap();
          } else {
            await dispatch(
              addCenterWorkingHoursThunk({
                center: c,
                day,
                is_closed: 1,
                open_24_hours: 0,
                start_time: toApiHhMmss(d.start),
                end_time: toApiHhMmss(d.end),
              }),
            ).unwrap();
          }
          continue;
        }
        if (d.open24) {
          const payload = { day, is_closed: 0, open_24_hours: 1 };
          if (ex) {
            await dispatch(
              updateCenterWorkingHoursThunk({ row_name: ex.name, ...payload }),
            ).unwrap();
          } else {
            await dispatch(addCenterWorkingHoursThunk({ center: c, ...payload })).unwrap();
          }
          continue;
        }
        const timed = {
          is_closed: 0,
          open_24_hours: 0,
          start_time: toApiHhMmss(d.start),
          end_time: toApiHhMmss(d.end),
        };
        if (ex) {
          await dispatch(
            updateCenterWorkingHoursThunk({ row_name: ex.name, day, ...timed }),
          ).unwrap();
        } else {
          await dispatch(addCenterWorkingHoursThunk({ center: c, day, ...timed })).unwrap();
        }
      }
      const refreshed = await dispatch(getCenterWorkingHoursThunk(c)).unwrap();
      setRows(Array.isArray(refreshed?.working_hours) ? refreshed.working_hours : []);
      setWeek(Array.isArray(refreshed?.week) ? refreshed.week : []);
      setTodayApi(
        refreshed?.today != null && refreshed.today !== '' ? String(refreshed.today) : null,
      );
      await dispatch(getCenterDetailsThunk(c));
      setModalOpen(false);
      showSuccessToast('Working hours saved.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to save working hours.' });
    } finally {
      setSaving(false);
    }
  }, [centerName, draft, rows, dispatch]);

  const toneHeader = {
    open: 'text-green-600',
    closed: 'text-red-600',
    holiday: 'text-amber-600',
    muted: 'text-text-sub-600',
  };

  const toneCell = {
    open: 'text-green-600',
    closed: 'text-red-600',
    holiday: 'text-amber-600',
    muted: 'text-text-sub-600',
  };

  return (
    <>
      <div className='w-full min-w-0 max-w-[50%]'>
        <div className='flex flex-col gap-0.5'>
          {loading ? (
            <p className='paragraph-small text-text-sub-500'>Loading…</p>
          ) : (
            <>
              <button
                type='button'
                className='flex w-full min-w-0 items-center gap-2 py-0.5 text-left'
                onClick={() => setExpanded((v) => !v)}
              >
                <RiTimeLine className='size-4 shrink-0 text-text-sub-500' aria-hidden />
                {/* <span className='shrink-0 text-paragraph-sm text-text-strong-950'>Working hours</span> */}
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-paragraph-sm',
                    toneHeader[summary.tone],
                  )}
                >
                  {summary.dayName}
                  <span className='mx-1 select-none' aria-hidden>
                    –
                  </span>
                  <span className='font-normal'>
                    {stripLeadingWeekdayFromSummaryText(summary.text, summary.dayName)}
                  </span>
                </span>
                <RiArrowDownSLine
                  className={cn(
                    'size-4 shrink-0 text-text-sub-500 transition-transform',
                    expanded && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>

              {expanded && (
                <div className='flex flex-col gap-y-0.5 py-1 pl-6'>
                  {scheduleRows.map((row) => (
                    <div
                      key={row.key}
                      className='flex items-baseline justify-between gap-6 text-paragraph-sm leading-snug'
                    >
                      <span
                        className={cn(
                          'shrink-0 text-text-strong-950',
                          row.isToday && 'font-semibold text-green-600',
                        )}
                      >
                        {row.left}
                      </span>
                      <span
                        className={cn('min-w-0 flex-1 text-right tabular-nums', toneCell[row.tone])}
                      >
                        {row.text}
                      </span>
                    </div>
                  ))}

                  {canEditCenter && (
                    <LinkButton.Root
                      variant='primary'
                      size='small'
                      className='mt-1.5 w-fit label-xsmall text-green-600'
                      onClick={(e) => {
                        e.preventDefault();
                        openModal();
                      }}
                    >
                      Set standard hours
                    </LinkButton.Root>
                  )}
                </div>
              )}

              {!expanded && canEditCenter && (
                <div className='pl-6'>
                  <LinkButton.Root
                    variant='primary'
                    size='small'
                    className='w-fit label-xsmall text-green-600'
                    onClick={(e) => {
                      e.preventDefault();
                      openModal();
                    }}
                  >
                    Set standard hours
                  </LinkButton.Root>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Modal.Content className='max-w-[540px]'>
          <Modal.Header
            title='Set standard hours'
            description='Configure the standard hours of operation for this location.'
            className='py-4 pl-5 pr-12'
          />
          <Modal.Body className='max-h-[min(70vh,520px)] overflow-y-auto px-5 py-4'>
            <div className='flex flex-col gap-4'>
              {WEEKDAYS_SUN_FIRST.map((day) => {
                const d = draft[day];
                if (!d) return null;
                return (
                  <div
                    key={day}
                    className='border-b border-stroke-soft-200 pb-3 last:border-0 last:pb-0'
                  >
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-[100px_1fr] sm:gap-x-5'>
                      <div className='text-paragraph-sm font-semibold text-text-strong-950 sm:pt-0.5'>
                        {day}
                      </div>
                      <div className='flex min-w-0 flex-col gap-2'>
                        {d.open24 ? (
                          <div className='flex flex-wrap items-center gap-2'>
                            <Switch.Root
                              className={WH_SWITCH}
                              checked
                              onCheckedChange={(checked) => {
                                if (!checked) patchDay(day, { open24: false });
                              }}
                              disabled={!canEditCenter}
                            />
                            <span className='text-paragraph-sm text-text-sub-600'>
                              Open 24 hours
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className='flex flex-wrap items-center gap-x-5 gap-y-2'>
                              <div className='flex flex-wrap items-center gap-2'>
                                <Switch.Root
                                  className={WH_SWITCH}
                                  checked={d.isOpen}
                                  onCheckedChange={(checked) =>
                                    patchDay(day, {
                                      isOpen: checked,
                                      open24: checked ? d.open24 : false,
                                    })
                                  }
                                  disabled={!canEditCenter}
                                />
                                <span className='text-paragraph-sm text-text-sub-600'>
                                  {d.isOpen ? 'Open' : 'Closed'}
                                </span>
                              </div>
                              {d.isOpen && (
                                <div className='flex flex-wrap items-center gap-2'>
                                  <Switch.Root
                                    className={WH_SWITCH}
                                    checked={d.open24}
                                    onCheckedChange={(checked) =>
                                      patchDay(day, {
                                        open24: checked,
                                        isOpen: checked ? true : d.isOpen,
                                      })
                                    }
                                    disabled={!canEditCenter}
                                  />
                                  <span className='text-paragraph-sm text-text-sub-600'>
                                    Open 24 hours
                                  </span>
                                </div>
                              )}
                            </div>
                            {d.isOpen && !d.open24 && (
                              <div className='flex flex-wrap items-center gap-2.5'>
                                <DateTimePicker
                                  mode='time_only'
                                  value={hhmmStringToDate(d.start)}
                                  onChange={(next) =>
                                    next && patchDay(day, { start: dateToHhmmString(next) })
                                  }
                                  placeholder='Start time'
                                  disabled={!canEditCenter}
                                  className='min-h-9 min-w-0 flex-1 sm:max-w-[220px]'
                                />
                                <span className='text-[11px] font-semibold uppercase tracking-wide text-text-sub-500'>
                                  TO
                                </span>
                                <DateTimePicker
                                  mode='time_only'
                                  value={hhmmStringToDate(d.end)}
                                  onChange={(next) =>
                                    next && patchDay(day, { end: dateToHhmmString(next) })
                                  }
                                  placeholder='End time'
                                  disabled={!canEditCenter}
                                  className='min-h-9 min-w-0 flex-1 sm:max-w-[220px]'
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Modal.Body>
          <Modal.Footer className='flex justify-end gap-2 border-t border-stroke-soft-200'>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              type='button'
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button.Root>
            <Button.Root
              variant='neutral'
              mode='filled'
              size='small'
              type='button'
              disabled={!canEditCenter || saving}
              onClick={save}
              className={SAVE_BTN}
            >
              {saving ? 'Saving…' : 'Save schedule'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </>
  );
}
