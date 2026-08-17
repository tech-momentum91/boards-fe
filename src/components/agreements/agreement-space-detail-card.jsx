import React, { useCallback, useEffect, useState } from 'react';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiBuilding2Line,
  RiDeleteBinLine,
  RiCalendarLine,
} from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import ErrorText from '@/components/ui/error-text';
import { cn } from '@/utils/cn';
import { Datepicker } from '@/components/ui/datepicker';
import { formatDDMMYY } from '@/utils/date-utils';
import { addDays, addMonths, differenceInDays, getDaysInMonth, subDays } from 'date-fns';

import { getMembershipBadge } from '@/components/agreements/constants';
import { parseDDMMYYYY } from '@/schemas/agreements-schema';

/** Convert form value (Date or DD/MM/YYYY string) to Date for Datepicker, or undefined. */
const toPickerDate = (val) => {
  if (!val) return undefined;
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val;
  const d = parseDDMMYYYY(val);
  return d instanceof Date ? d : undefined;
};

const sanitizeIntString = (raw) => raw.replaceAll(/\D/g, '');

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

function roundLockInMonths(n) {
  return Math.round(n * 100) / 100;
}

function formatLockInMonths(v) {
  if (v == null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return String(roundLockInMonths(n));
}

function lockInEndFromPeriod(rentStart, months) {
  const start = toPickerDate(rentStart);
  const m = Number(months);
  if (!start || !Number.isFinite(m) || m <= 0) return undefined;
  const whole = Math.floor(m);
  const frac = m - whole;
  let d = addMonths(start, whole);
  if (frac > 0) {
    d = addDays(d, Math.round(frac * getDaysInMonth(d)));
  }
  return subDays(d, 1);
}

function lockInPeriodFromEnd(rentStart, lockInEnd) {
  const start = toPickerDate(rentStart);
  const end = toPickerDate(lockInEnd);
  if (!start || !end || end <= start) return undefined;
  const endExclusive = addDays(end, 1);
  let whole = 0;
  while (addMonths(start, whole + 1) <= endExclusive) whole += 1;
  const afterWhole = addMonths(start, whole);
  const days = differenceInDays(endExclusive, afterWhole);
  const dim = getDaysInMonth(afterWhole);
  const months = roundLockInMonths(whole + (dim > 0 ? days / dim : 0));
  return months > 0 ? months : undefined;
}

function withLockInSync(patch, { rentStartDate, lockInPeriod, lockInEndDate }) {
  const rent = patch.rent_start_date !== undefined ? patch.rent_start_date : rentStartDate;
  if (patch.lock_in_period != null && patch.lock_in_period !== '' && rent) {
    const end = lockInEndFromPeriod(rent, patch.lock_in_period);
    return end ? { ...patch, lock_in_end_date: end } : patch;
  }
  if (patch.lock_in_end_date && rent) {
    const months = lockInPeriodFromEnd(rent, patch.lock_in_end_date);
    return months ? { ...patch, lock_in_period: months } : patch;
  }
  if (patch.rent_start_date && rent) {
    if (lockInPeriod != null && lockInPeriod !== '') {
      const end = lockInEndFromPeriod(patch.rent_start_date, lockInPeriod);
      return end ? { ...patch, lock_in_end_date: end } : patch;
    }
    if (lockInEndDate) {
      const months = lockInPeriodFromEnd(patch.rent_start_date, lockInEndDate);
      return months ? { ...patch, lock_in_period: months } : patch;
    }
  }
  return patch;
}

/**
 * Collapsible card for a single space: header shows name + membership badge(s); body has seats, area, price, revenue.
 */
function AgreementSpaceDetailCard({
  spaceDisplayName,
  membershipPlans = [],
  noOfSeats,
  area,
  pricePerSeat,
  monthlyRevenue,
  seatChangeHint = '',
  rentStartDate,
  agreementEndDate,
  lockInPeriod,
  lockInEndDate,
  incrementDate,
  securityDepositAmount,
  errors = {},
  onChange,
  onRemove,
  className,
}) {
  const [expanded, setExpanded] = useState(true);
  const [lockInDraft, setLockInDraft] = useState('');

  useEffect(() => {
    setLockInDraft(formatLockInMonths(lockInPeriod));
  }, [lockInPeriod]);

  const seatsStr =
    noOfSeats === '' || noOfSeats === null || noOfSeats === undefined ? '' : String(noOfSeats);
  const areaStr = area === '' || area === null || area === undefined ? '' : String(area);
  const priceStr =
    pricePerSeat === '' || pricePerSeat === null || pricePerSeat === undefined
      ? ''
      : String(pricePerSeat);
  const revenueStr =
    monthlyRevenue === '' || monthlyRevenue === null || monthlyRevenue === undefined
      ? ''
      : String(monthlyRevenue);

  const emit = useCallback(
    (patch) => {
      onChange?.(withLockInSync(patch, { rentStartDate, lockInPeriod, lockInEndDate }));
    },
    [onChange, rentStartDate, lockInPeriod, lockInEndDate],
  );

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0',
        className,
      )}
    >
      <div className='flex items-center justify-between gap-2 border-b border-stroke-soft-200 px-3 py-2.5 bg-bg-weak-100'>
        <div className='flex min-w-0 flex-1 items-center gap-2'>
          <RiBuilding2Line className='size-5 shrink-0 text-text-sub-600' aria-hidden />
          <span className='truncate text-label-sm font-medium text-text-strong-950'>
            {spaceDisplayName}
          </span>
          <div className='ml-2 flex min-w-0 shrink-0 flex-wrap items-center gap-2'>
            {membershipPlans.length > 0 ? (
              membershipPlans.map((plan) => {
                const badge = getMembershipBadge(plan);
                return (
                  <Badge.Root key={plan} size='small' variant='light' color={badge.color}>
                    {badge.label}
                  </Badge.Root>
                );
              })
            ) : (
              <span className='text-paragraph-xs text-text-sub-500'>—</span>
            )}
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-1'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='ghost'
            size='xsmall'
            className='text-text-sub-600'
            onClick={() => onRemove?.()}
            aria-label='Remove space'
          >
            <Button.Icon as={RiDeleteBinLine} />
          </Button.Root>
          <Button.Root
            type='button'
            variant='neutral'
            mode='ghost'
            size='xsmall'
            className='text-text-sub-600'
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <Button.Icon as={expanded ? RiArrowUpSLine : RiArrowDownSLine} />
          </Button.Root>
        </div>
      </div>

      {expanded ? (
        <div className='grid grid-cols-2 gap-x-3 gap-y-4 p-4'>
          <div className='flex flex-col gap-1'>
            <Label.Root>
              No. of Seats <Label.Asterisk />
            </Label.Root>
            <Input.Root className='w-full'>
              <Input.Wrapper>
                <Input.Input
                  type='text'
                  inputMode='numeric'
                  placeholder='0'
                  value={seatsStr}
                  readOnly
                  onChange={(e) => {
                    const cleaned = sanitizeIntString(e.target.value);
                    if (!cleaned) {
                      emit({ no_of_seats: undefined });
                      return;
                    }
                    emit({ no_of_seats: Number(cleaned) });
                  }}
                />
              </Input.Wrapper>
            </Input.Root>
            {errors?.no_of_seats?.message && <ErrorText>{errors.no_of_seats.message}</ErrorText>}
            {seatChangeHint ? (
              <span
                className={`text-paragraph-xs ${
                  seatChangeHint.includes('reduced') ? 'text-error-base' : 'text-text-sub-600'
                }`}
              >
                {seatChangeHint}
              </span>
            ) : null}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>
              Area (Sq. Ft) <Label.Asterisk />
            </Label.Root>
            <Input.Root className='w-full'>
              <Input.Wrapper>
                <Input.Input
                  type='text'
                  inputMode='decimal'
                  placeholder='0'
                  value={areaStr}
                  readOnly
                  onChange={(e) => {
                    const cleaned = sanitizeDecimalString(e.target.value);
                    if (!cleaned) {
                      emit({ area: undefined });
                      return;
                    }
                    emit({ area: Number(cleaned) });
                  }}
                />
                <Input.Affix>SQFT</Input.Affix>
              </Input.Wrapper>
            </Input.Root>
            {errors?.area?.message && <ErrorText>{errors.area.message}</ErrorText>}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>
              Price Per Seat <Label.Asterisk />
            </Label.Root>
            <Input.Root className='w-full'>
              <Input.Wrapper>
                <Input.Input
                  type='text'
                  inputMode='decimal'
                  placeholder='0'
                  value={priceStr}
                  onChange={(e) => {
                    const cleaned = sanitizeDecimalString(e.target.value);
                    if (!cleaned) {
                      emit({ price_per_seat: undefined, monthly_revenue: undefined });
                      return;
                    }
                    const num = Number(cleaned);
                    if (Number.isNaN(num)) {
                      emit({ price_per_seat: undefined, monthly_revenue: undefined });
                      return;
                    }
                    const revenue = monthlyRevenueFromPriceAndSeats(num, noOfSeats);
                    emit({ price_per_seat: num, monthly_revenue: revenue });
                  }}
                />
                <Input.Affix>₹</Input.Affix>
              </Input.Wrapper>
            </Input.Root>
            {errors?.price_per_seat?.message && (
              <ErrorText>{errors.price_per_seat.message}</ErrorText>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>
              Monthly Revenue (Incl. GST) <Label.Asterisk />
            </Label.Root>
            <Input.Root className='w-full'>
              <Input.Wrapper>
                <Input.Input
                  type='text'
                  inputMode='decimal'
                  placeholder='Enter monthly revenue'
                  value={revenueStr}
                  onChange={(e) => {
                    const cleaned = sanitizeDecimalString(e.target.value);
                    if (!cleaned) {
                      emit({ monthly_revenue: undefined });
                      return;
                    }
                    const num = Number(cleaned);
                    emit({ monthly_revenue: Number.isNaN(num) ? undefined : num });
                  }}
                />
                <Input.Affix>₹</Input.Affix>
              </Input.Wrapper>
            </Input.Root>
            {errors?.monthly_revenue?.message && (
              <ErrorText>{errors.monthly_revenue.message}</ErrorText>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>Sec. Deposit Amt.</Label.Root>
            <Input.Root className='w-full'>
              <Input.Wrapper>
                <Input.Input
                  type='text'
                  inputMode='decimal'
                  placeholder='0'
                  value={
                    securityDepositAmount === undefined || securityDepositAmount === null
                      ? ''
                      : String(securityDepositAmount)
                  }
                  onChange={(e) => {
                    const cleaned = sanitizeDecimalString(e.target.value);
                    if (!cleaned) {
                      emit({ security_deposit_amount: undefined });
                      return;
                    }
                    emit({ security_deposit_amount: Number(cleaned) });
                  }}
                />
                <Input.Affix>₹</Input.Affix>
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>
              Rent Start Date <Label.Asterisk />
            </Label.Root>
            <Datepicker
              variant='neutral'
              mode='stroke'
              value={toPickerDate(rentStartDate)}
              onChange={(date) => emit({ rent_start_date: date })}
              placeholder='DD/MM/YY'
              formatDate={formatDDMMYY}
              size='medium'
              className='w-full'
              hasError={!!errors?.rent_start_date}
            />
            {errors?.rent_start_date?.message && (
              <ErrorText>{errors.rent_start_date.message}</ErrorText>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>
              Agreement End Date <Label.Asterisk />
            </Label.Root>
            <Datepicker
              variant='neutral'
              mode='stroke'
              value={toPickerDate(agreementEndDate)}
              onChange={(date) => emit({ agreement_end_date: date })}
              placeholder='DD/MM/YY'
              formatDate={formatDDMMYY}
              size='medium'
              className='w-full'
              hasError={!!errors?.agreement_end_date}
            />
            {errors?.agreement_end_date?.message && (
              <ErrorText>{errors.agreement_end_date.message}</ErrorText>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>
              Lock-in Period <Label.Asterisk />
            </Label.Root>
            <Input.Root className='w-full' hasError={!!errors?.lock_in_period}>
              <Input.Wrapper>
                <Input.Input
                  type='text'
                  inputMode='decimal'
                  placeholder='Enter months'
                  value={lockInDraft}
                  onChange={(e) => {
                    const cleaned = sanitizeDecimalString(e.target.value);
                    setLockInDraft(cleaned);
                    if (!cleaned) {
                      emit({ lock_in_period: undefined });
                      return;
                    }
                    if (cleaned.endsWith('.')) return;
                    const num = Number(cleaned);
                    if (!Number.isFinite(num)) return;
                    emit({ lock_in_period: roundLockInMonths(num) });
                  }}
                />
                <Input.Affix>MONTH</Input.Affix>
              </Input.Wrapper>
            </Input.Root>
            {errors?.lock_in_period?.message && (
              <ErrorText>{errors.lock_in_period.message}</ErrorText>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>
              Lock-in End Date <Label.Asterisk />
            </Label.Root>
            <Datepicker
              variant='neutral'
              mode='stroke'
              value={toPickerDate(lockInEndDate)}
              onChange={(date) => emit({ lock_in_end_date: date })}
              placeholder='DD/MM/YY'
              formatDate={formatDDMMYY}
              size='medium'
              className='w-full'
              hasError={!!errors?.lock_in_end_date}
            />
            {errors?.lock_in_end_date?.message && (
              <ErrorText>{errors.lock_in_end_date.message}</ErrorText>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>Increment Date</Label.Root>
            <Datepicker
              variant='neutral'
              mode='stroke'
              value={toPickerDate(incrementDate)}
              onChange={(date) => emit({ increment_date: date })}
              placeholder='DD/MM/YY'
              formatDate={formatDDMMYY}
              size='medium'
              className='w-full'
              hasError={!!errors?.increment_date}
            />
            {errors?.increment_date?.message && (
              <ErrorText>{errors.increment_date.message}</ErrorText>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AgreementSpaceDetailCard;
