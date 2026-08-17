import React, { useState, useEffect } from 'react';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiBuilding2Line,
  RiMoneyDollarCircleLine,
  RiRuler2Line,
  RiTable2,
  RiCalendarLine,
  RiTimeLine,
} from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Input from '@/components/ui/input';
import FieldRow from '@/components/ui/field-row';
import { Datepicker } from '@/components/ui/datepicker';
import { getMembershipBadge } from '@/components/agreements/constants';
import { cn } from '@/utils/cn';
import { formatDDMMYY, formatDateToYYYYMMDD } from '@/utils/date-utils';
import { parseDDMMYYYY } from '@/schemas/agreements-schema';

function parseMetricInput(raw) {
  if (raw === '' || raw === null || raw === undefined) return '';
  const n = Number(raw);
  return Number.isNaN(n) ? '' : n;
}

const toPickerDate = (val) => {
  if (!val) return undefined;
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val;
  const d = parseDDMMYYYY(val);
  return d instanceof Date ? d : undefined;
};

const sanitizeDecimalString = (raw) => {
  const cleaned = raw.replaceAll(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
};

const monthlyRevenueFromPriceAndSeats = (price, seats) => {
  const p = Number(price);
  if (!Number.isFinite(p)) return undefined;
  const sRaw = seats === '' || seats == null || seats === undefined ? 0 : Number(seats);
  const s = Number.isFinite(sRaw) && sRaw >= 0 ? sRaw : 0;
  return Math.round(p * s * 100) / 100;
};

/** Drawer passes `string[]`; tolerate a single scalar from older callers. */
function normalizeMembershipPlans(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((p) => String(p ?? '').trim()).filter(Boolean);
  }
  const one = String(raw).trim();
  return one ? [one] : [];
}

/**
 * Accordion list per space. Body metrics are inline-editable when `canEdit`.
 * `useAgreementLevelMetrics` entries share agreement-level API keys on commit.
 */
function AgreementViewSpaceSection({
  entries = [],
  className,
  canEdit = false,
  setLocalChanges,
  handleFieldChange,
  onCommitSpaceDetailMetric,
  onCommitSpaceDetailMetrics,
}) {
  const [openById, setOpenById] = useState(() =>
    Object.fromEntries(entries.map((e) => [e.id, false])),
  );

  useEffect(() => {
    setOpenById((prev) => {
      const next = {};
      entries.forEach((e) => {
        next[e.id] = prev[e.id] ?? false;
      });
      return next;
    });
  }, [entries]);

  const patchAgreementMetric = (field, raw) => {
    const v = raw === '' ? '' : Number(raw);
    setLocalChanges((p) => ({ ...p, [field]: Number.isNaN(Number(v)) ? '' : v }));
  };

  const commitAgreementMetric = (field, raw) => {
    const v = parseMetricInput(raw);
    handleFieldChange(field, v === '' ? '' : v);
  };

  const patchSpaceDetailMetric = (entryId, field, raw) => {
    const v = raw === '' ? '' : Number(raw);
    setLocalChanges((p) => ({
      ...p,
      spaceDetailMetrics: {
        ...p.spaceDetailMetrics,
        [entryId]: {
          ...p.spaceDetailMetrics?.[entryId],
          [field]: Number.isNaN(Number(v)) ? '' : v,
        },
      },
    }));
  };

  const commitSpaceDate = (entryId, field, date) => {
    const ymd = date ? formatDateToYYYYMMDD(date) : '';
    onCommitSpaceDetailMetric?.(entryId, field, ymd);
  };

  const metricInputValue = (entry, field) => {
    const v = entry[field];
    if (v === null || v === undefined || v === '') return '';
    return String(v);
  };

  if (entries.length === 0) return null;

  const toggle = (id) => {
    setOpenById((p) => ({ ...p, [id]: !p[id] }));
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {entries.map((entry) => {
        const open = Boolean(openById[entry.id]);
        const plans = normalizeMembershipPlans(entry.membershipPlans);
        const isPureRentalPlan =
          plans.length > 0 && plans.every((plan) => plan.toLowerCase() === 'pure rental');
        const useAgreement = Boolean(entry.useAgreementLevelMetrics);

        return (
          <div
            key={entry.id}
            className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'
          >
            <button
              type='button'
              className={cn(
                'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors',
                open
                  ? 'border-b border-stroke-soft-200 bg-bg-weak-100 hover:bg-bg-weak-50'
                  : 'hover:bg-bg-weak-50',
              )}
              onClick={() => toggle(entry.id)}
              aria-expanded={open}
            >
              <div className='flex min-w-0 flex-1 items-center gap-2'>
                <RiBuilding2Line className='size-5 shrink-0 text-text-sub-600' aria-hidden />
                <span className='truncate text-label-sm font-medium text-text-strong-950'>
                  {entry.displayName || '--'}
                </span>
                <div className='ml-2 flex min-w-0 shrink-0 flex-wrap items-center gap-2'>
                  {plans.length > 0 ? (
                    plans.map((plan, pi) => {
                      const badge = getMembershipBadge(plan);
                      return (
                        <Badge.Root
                          key={`${entry.id}-plan-${pi}-${plan}`}
                          size='small'
                          variant='light'
                          color={badge.color}
                        >
                          {badge.label}
                        </Badge.Root>
                      );
                    })
                  ) : (
                    <span className='text-paragraph-xs text-text-sub-500'>—</span>
                  )}
                </div>
              </div>
              {open ? (
                <RiArrowUpSLine className='size-5 shrink-0 text-text-sub-600' aria-hidden />
              ) : (
                <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-600' aria-hidden />
              )}
            </button>

            {open ? (
              <div className='divide-y divide-stroke-soft-200'>
                {!isPureRentalPlan ? (
                  <FieldRow icon={RiTable2} label='No. of Seats' editable={false}>
                    <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                      <Input.Wrapper>
                        <Input.Input
                          type='number'
                          inputMode='numeric'
                          value={metricInputValue(entry, 'no_of_seats')}
                          readOnly
                          placeholder='--'
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </FieldRow>
                ) : null}
                <FieldRow icon={RiRuler2Line} label='Area' editable={false}>
                  <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                    <Input.Wrapper>
                      <Input.Input
                        type='number'
                        inputMode='numeric'
                        value={metricInputValue(entry, 'area')}
                        readOnly
                        placeholder='--'
                      />
                      <Input.Affix>sq.ft.</Input.Affix>
                    </Input.Wrapper>
                  </Input.Root>
                </FieldRow>
                <FieldRow icon={RiMoneyDollarCircleLine} label='Price Per Seat' editable={canEdit}>
                  <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        inputMode='decimal'
                        value={metricInputValue(entry, 'price_per_seat')}
                        onChange={(e) => {
                          if (!canEdit) return;
                          const cleaned = sanitizeDecimalString(e.target.value);
                          if (!cleaned) {
                            if (useAgreement) {
                              setLocalChanges((p) => ({
                                ...p,
                                price_per_seat: undefined,
                                monthly_revenue: undefined,
                              }));
                            } else {
                              setLocalChanges((p) => ({
                                ...p,
                                spaceDetailMetrics: {
                                  ...p.spaceDetailMetrics,
                                  [entry.id]: {
                                    ...p.spaceDetailMetrics?.[entry.id],
                                    price_per_seat: undefined,
                                    monthly_revenue: undefined,
                                  },
                                },
                              }));
                            }
                            return;
                          }
                          const num = Number(cleaned);
                          if (Number.isNaN(num)) {
                            if (useAgreement) {
                              setLocalChanges((p) => ({
                                ...p,
                                price_per_seat: undefined,
                                monthly_revenue: undefined,
                              }));
                            } else {
                              setLocalChanges((p) => ({
                                ...p,
                                spaceDetailMetrics: {
                                  ...p.spaceDetailMetrics,
                                  [entry.id]: {
                                    ...p.spaceDetailMetrics?.[entry.id],
                                    price_per_seat: undefined,
                                    monthly_revenue: undefined,
                                  },
                                },
                              }));
                            }
                            return;
                          }
                          const revenue = monthlyRevenueFromPriceAndSeats(num, entry.no_of_seats);
                          if (useAgreement) {
                            setLocalChanges((p) => ({
                              ...p,
                              price_per_seat: num,
                              monthly_revenue: revenue,
                            }));
                          } else {
                            setLocalChanges((p) => ({
                              ...p,
                              spaceDetailMetrics: {
                                ...p.spaceDetailMetrics,
                                [entry.id]: {
                                  ...p.spaceDetailMetrics?.[entry.id],
                                  price_per_seat: num,
                                  monthly_revenue: revenue,
                                },
                              },
                            }));
                          }
                        }}
                        onBlur={(e) => {
                          if (!canEdit) return;
                          const cleaned = sanitizeDecimalString(e.target.value);
                          if (!cleaned) {
                            if (useAgreement) {
                              commitAgreementMetric('price_per_seat', '');
                              commitAgreementMetric('monthly_revenue', '');
                            } else {
                              onCommitSpaceDetailMetrics?.(entry.id, {
                                price_per_seat: '',
                                monthly_revenue: '',
                              });
                            }
                            return;
                          }
                          const num = Number(cleaned);
                          if (Number.isNaN(num)) {
                            if (useAgreement) {
                              commitAgreementMetric('price_per_seat', '');
                              commitAgreementMetric('monthly_revenue', '');
                            } else {
                              onCommitSpaceDetailMetrics?.(entry.id, {
                                price_per_seat: '',
                                monthly_revenue: '',
                              });
                            }
                            return;
                          }
                          const revenue = monthlyRevenueFromPriceAndSeats(num, entry.no_of_seats);
                          if (useAgreement) {
                            commitAgreementMetric('price_per_seat', cleaned);
                            commitAgreementMetric('monthly_revenue', String(revenue));
                          } else {
                            onCommitSpaceDetailMetrics?.(entry.id, {
                              price_per_seat: num,
                              monthly_revenue: revenue,
                            });
                          }
                        }}
                        readOnly={!canEdit}
                        placeholder='--'
                      />
                      <Input.Affix>₹</Input.Affix>
                    </Input.Wrapper>
                  </Input.Root>
                </FieldRow>
                <FieldRow
                  icon={RiMoneyDollarCircleLine}
                  label='Monthly Revenue (Incl. GST)'
                  truncate
                  editable={canEdit}
                >
                  <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                    <Input.Wrapper>
                      <Input.Input
                        type='number'
                        inputMode='decimal'
                        value={metricInputValue(entry, 'monthly_revenue')}
                        onChange={(e) => {
                          if (!canEdit) return;
                          if (useAgreement) {
                            patchAgreementMetric('monthly_revenue', e.target.value);
                          } else {
                            patchSpaceDetailMetric(entry.id, 'monthly_revenue', e.target.value);
                          }
                        }}
                        onBlur={(e) => {
                          if (!canEdit) return;
                          if (useAgreement) {
                            commitAgreementMetric('monthly_revenue', e.target.value);
                          } else {
                            onCommitSpaceDetailMetric?.(
                              entry.id,
                              'monthly_revenue',
                              e.target.value,
                            );
                          }
                        }}
                        readOnly={!canEdit}
                        placeholder='--'
                      />
                      <Input.Affix>₹</Input.Affix>
                    </Input.Wrapper>
                  </Input.Root>
                </FieldRow>

                <FieldRow
                  icon={RiMoneyDollarCircleLine}
                  label='Sec. Deposit Amt.'
                  editable={canEdit}
                >
                  <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                    <Input.Wrapper>
                      <Input.Input
                        type='number'
                        inputMode='decimal'
                        value={metricInputValue(entry, 'security_deposit_amount')}
                        onChange={(e) => {
                          if (!canEdit) return;
                          patchSpaceDetailMetric(
                            entry.id,
                            'security_deposit_amount',
                            e.target.value,
                          );
                        }}
                        onBlur={(e) => {
                          if (!canEdit) return;
                          onCommitSpaceDetailMetric?.(
                            entry.id,
                            'security_deposit_amount',
                            e.target.value,
                          );
                        }}
                        readOnly={!canEdit}
                        placeholder='--'
                      />
                      <Input.Affix>₹</Input.Affix>
                    </Input.Wrapper>
                  </Input.Root>
                </FieldRow>

                <FieldRow icon={RiCalendarLine} label='Rent Start Date' editable={canEdit}>
                  <Datepicker
                    variant='borderless'
                    size='xsmall'
                    value={toPickerDate(entry.rent_start_date)}
                    onChange={(date) => {
                      if (!canEdit) return;
                      commitSpaceDate(entry.id, 'rent_start_date', date);
                    }}
                    disabled={!canEdit}
                    placeholder='--'
                    formatDate={formatDDMMYY}
                  />
                </FieldRow>

                <FieldRow icon={RiCalendarLine} label='Agreement End Date' editable={canEdit}>
                  <Datepicker
                    variant='borderless'
                    size='xsmall'
                    value={toPickerDate(entry.agreement_end_date)}
                    onChange={(date) => {
                      if (!canEdit) return;
                      commitSpaceDate(entry.id, 'agreement_end_date', date);
                    }}
                    disabled={!canEdit}
                    placeholder='--'
                    formatDate={formatDDMMYY}
                  />
                </FieldRow>

                <FieldRow icon={RiTimeLine} label='Lock-in Period' editable={canEdit}>
                  <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                    <Input.Wrapper>
                      <Input.Input
                        type='number'
                        inputMode='numeric'
                        value={metricInputValue(entry, 'lock_in_period')}
                        onChange={(e) => {
                          if (!canEdit) return;
                          patchSpaceDetailMetric(entry.id, 'lock_in_period', e.target.value);
                        }}
                        onBlur={(e) => {
                          if (!canEdit) return;
                          onCommitSpaceDetailMetric?.(entry.id, 'lock_in_period', e.target.value);
                        }}
                        readOnly={!canEdit}
                        placeholder='--'
                      />
                      <Input.Affix>MONTH</Input.Affix>
                    </Input.Wrapper>
                  </Input.Root>
                </FieldRow>

                <FieldRow icon={RiCalendarLine} label='Lock-in End Date' editable={canEdit}>
                  <Datepicker
                    variant='borderless'
                    size='xsmall'
                    value={toPickerDate(entry.lock_in_end_date)}
                    onChange={(date) => {
                      if (!canEdit) return;
                      commitSpaceDate(entry.id, 'lock_in_end_date', date);
                    }}
                    disabled={!canEdit}
                    placeholder='--'
                    formatDate={formatDDMMYY}
                  />
                </FieldRow>

                <FieldRow icon={RiCalendarLine} label='Increment Date' editable={canEdit}>
                  <Datepicker
                    variant='borderless'
                    size='xsmall'
                    value={toPickerDate(entry.increment_date)}
                    onChange={(date) => {
                      if (!canEdit) return;
                      commitSpaceDate(entry.id, 'increment_date', date);
                    }}
                    disabled={!canEdit}
                    placeholder='--'
                    formatDate={formatDDMMYY}
                  />
                </FieldRow>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default AgreementViewSpaceSection;
