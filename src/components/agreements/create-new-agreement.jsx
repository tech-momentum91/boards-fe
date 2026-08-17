import React, { useEffect, useMemo, useRef, useState, useCallback, use } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import * as Textarea from '@/components/ui/textarea';
import {
  RiArrowRightSLine,
  RiBuilding2Line,
  RiCloseLine,
  RiLayoutGridLine,
  RiImage2Line,
  RiUploadCloud2Line,
  RiUploadLine,
  RiCalendarLine,
  RiInformationLine,
  RiDeleteBinLine,
  RiSearchLine,
  RiBuildingLine,
  RiInformationFill,
  RiErrorWarningFill,
  RiFileLine,
} from 'react-icons/ri';

import * as Drawer from '@/components/ui/drawer';
import * as Select from '@/components/ui/select';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Dropdown from '@/components/ui/dropdown';
import * as Label from '@/components/ui/label';
import * as Checkbox from '@/components/ui/checkbox';
import * as Hint from '@/components/ui/hint';
import * as Tag from '@/components/ui/tag';
import ErrorText from '@/components/ui/error-text';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/utils/cn';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import { formatFileSize, getFileExtension } from '@/utils/file-utils';

import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { format } from 'date-fns';
import { Datepicker } from '@/components/ui/datepicker';
import {
  agreementsSchema,
  defaultAgreementValues,
  parseDDMMYYYY,
} from '@/schemas/agreements-schema';
import { convertDDMMYYYYToYYYYMMDD, formatDDMMYY, formatToDDMMYYYY } from '@/utils/date-utils';

import {
  createAgreementThunk,
  addAgreementAttachmentThunk,
  getAgreementsClientListThunk,
  getAgreementsListViewThunk,
  getAgreementPendingSpaceAllocationListThunk,
  getClientAssignedCentersListThunk,
  getClientCentersSpaceListThunk,
  getSpaceWiseDataThunk,
  resetClientCentersSpaceList,
} from '@/redux/agreementsSlice';

import { AGREEMENTS_CHANGE_TYPE_OPTIONS } from './constants';
import AgreementSpaceDetailCard from '@/components/agreements/agreement-space-detail-card';
import {
  mergeAmendmentSpaceDetailFromAgreement,
  isSeatReductionHint,
} from '@/components/agreements/amendment-space-form';
import AgreementAmenitiesSection from '@/components/agreements/agreement-amenities-section';
import { MultiSelect } from '@/components/ui/multi-select';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import { hasModulePermission } from '@/utils/user-role-utils';
/** Convert form value (Date or DD/MM/YYYY string) to Date for Datepicker, or undefined. */
const toPickerDate = (val) => {
  if (!val) return undefined;
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val;
  const d = parseDDMMYYYY(val);
  return d instanceof Date ? d : undefined;
};

/** Convert a Date or DD/MM/YYYY string into API format YYYY-MM-DD, or undefined if invalid. */
const toApiDate = (val) => {
  if (!val) return undefined;
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return format(val, 'yyyy-MM-dd');
  }
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const converted = convertDDMMYYYYToYYYYMMDD(val);
    return converted || undefined;
  }
  const d = parseDDMMYYYY(val);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return undefined;
  return format(d, 'yyyy-MM-dd');
};

/** Digits + one decimal point, max 2 fractional digits; undefined when empty (for controlled inputs). */
const sanitizeDecimalTextInput = (raw) => {
  let cleaned = String(raw ?? '').replaceAll(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = `${parts[0]}.${parts.slice(1).join('')}`;
  }
  const [intPart = '', decPart] = cleaned.split('.');
  const limited = decPart !== undefined ? `${intPart}.${decPart.slice(0, 2)}` : intPart;
  return limited === '' ? undefined : limited;
};

/** Agreement API may return child rows `{ space, name, ... }`; selects need string ids for Tag labels. */
function normalizeSpaceFieldToIds(raw) {
  const arr = Array.isArray(raw) ? raw : raw != null && raw !== '' ? [raw] : [];
  return arr
    .map((item) => {
      if (item == null || item === '') return null;
      if (typeof item === 'object') {
        return item.space ?? item.assign_space_id ?? item.name ?? null;
      }
      return String(item);
    })
    .filter(Boolean);
}

const OVERFLOW_BADGE_COPY = {
  space: {
    ariaMore: (n) => (n === 1 ? '1 more space' : `${n} more spaces`),
    listHeading: 'Additional spaces',
  },
  center: {
    ariaMore: (n) => (n === 1 ? '1 more center' : `${n} more centers`),
    listHeading: 'Additional centers',
  },
};

/** +N chip beside multi-select tags (space / center): hover tooltip + click popover listing overflow items. */
function SelectionOverflowPlusBadge({ labels, variant = 'space' }) {
  const n = labels.length;
  if (n === 0) return null;

  const copy = OVERFLOW_BADGE_COPY[variant] ?? OVERFLOW_BADGE_COPY.space;
  const title = copy.ariaMore(n);

  const listPopover = (
    <ul className='max-h-56 space-y-1 overflow-y-auto py-0.5 text-left'>
      {labels.map((lab, i) => (
        <li
          key={`p-${String(lab)}-${i}`}
          className='text-paragraph-sm leading-snug text-text-strong-950'
        >
          {lab}
        </li>
      ))}
    </ul>
  );

  const listTooltip = (
    <ul className='max-h-56 space-y-1 overflow-y-auto py-0.5 text-left text-text-white-0'>
      {labels.map((lab, i) => (
        <li key={`t-${String(lab)}-${i}`} className='text-paragraph-sm leading-snug'>
          {lab}
        </li>
      ))}
    </ul>
  );

  return (
    <Tooltip.Root delayDuration={200}>
      <Tooltip.Trigger asChild>
        <span className='inline-flex shrink-0'>
          <Popover.Root modal={false}>
            <Popover.Trigger asChild>
              <button
                type='button'
                className={cn(
                  'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5',
                  'text-paragraph-xs tabular-nums text-text-soft-400',
                  'transition-colors hover:bg-bg-weak-100 hover:text-text-sub-600',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/30',
                )}
                aria-label={`${title}. Hover for preview or click for full list.`}
                aria-haspopup='dialog'
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                +{n}
              </button>
            </Popover.Trigger>
            <Popover.Content
              showArrow={false}
              align='start'
              sideOffset={8}
              collisionPadding={12}
              className='z-[100] max-w-xs border border-stroke-soft-200 bg-bg-white-0 p-3 shadow-regular-md'
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <p className='mb-2 text-label-xs font-medium text-text-sub-600'>{copy.listHeading}</p>
              {listPopover}
            </Popover.Content>
          </Popover.Root>
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content side='top' align='start' sideOffset={6} className='max-w-xs'>
        <p className='mb-1 text-label-xs text-text-white-0/80'>{copy.listHeading}</p>
        {listTooltip}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

const CreateNewAgreementDrawer = ({
  open,
  setOpen,
  onSuccess,
  title = 'Create New Agreement',
  description = 'Enter below details to add new agreement.',
  initialValues,
}) => {
  const dispatch = useDispatch();
  const photosInputRef = useRef(null);
  const amenitiesRef = useRef(null);
  const { agreementsClientList, clientCentersList, clientCentersSpaceList } = useSelector(
    (state) => state.agreements,
  );
  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    trigger,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    resolver: zodResolver(agreementsSchema),
    defaultValues: defaultAgreementValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
  });
  // Watchers for all form fields (required + optional)
  const watchClient = watch('client');
  const watchCenter = watch('center');
  const watchSpace = watch('space');
  const watchAgreementStartDate = watch('agreement_start_date');
  const photos = useWatch({ control, name: 'photos' }) || [];

  const getDateTs = useCallback((val) => {
    const d = toPickerDate(val);
    return d ? d.getTime() : null;
  }, []);

  const [photoDragActive, setPhotoDragActive] = useState(false);
  const [spaceDetailsById, setSpaceDetailsById] = useState({});
  const [agreementDrawerTab, setAgreementDrawerTab] = useState('basic');

  const spaceSelectionKey = useMemo(() => [...(watchSpace ?? [])].sort().join('|'), [watchSpace]);
  const onClose = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (open) setAgreementDrawerTab('basic');
  }, [open]);

  const isApplyingInitialRef = useRef(false);
  const isAmendment = Boolean(initialValues?.parent_agreement_id);
  const [centerSearchQuery, setCenterSearchQuery] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const lastFetchedCentersKeyRef = useRef('');
  /** Last primary center used to clear space only when switching center A → B, not [] → same center again. */
  const prevPrimaryCenterForSpaceClearRef = useRef(undefined);

  /** Keep latest initialValues for reset on open; dep list must not use `initialValues` or any parent
   * re-render (e.g. tab / unrelated state) that passes a new object ref will call `reset` again and
   * wipe in-progress edits (including cleared numeric fields). */
  const initialValuesRef = useRef(initialValues);
  initialValuesRef.current = initialValues;
  /** Only reset when drawer opens (false → true). Avoid re-running on `reset` ref churn or
   * re-renders while open, which was restoring prefill and blocking clears after tab changes. */
  const wasDrawerOpenRef = useRef(false);
  const resetRef = useRef(reset);
  resetRef.current = reset;

  useEffect(() => {
    if (open) {
      if (!wasDrawerOpenRef.current) {
        const raw = initialValuesRef.current;
        const isUsablePrefill =
          raw != null &&
          typeof raw === 'object' &&
          !(
            raw &&
            Object.prototype.hasOwnProperty.call(raw, 'nativeEvent') &&
            typeof raw?.preventDefault === 'function'
          ) &&
          ('client' in raw || 'parent_agreement_id' in raw || 'spaceDetailsById' in raw);
        const values = isUsablePrefill ? raw : defaultAgreementValues;
        const normalizedValues = {
          ...values,
          center: Array.isArray(values?.center)
            ? values.center
            : values?.center
              ? [values.center]
              : [],
          space: normalizeSpaceFieldToIds(values?.space),
        };
        resetRef.current(normalizedValues);
        if (values?.client) {
          dispatch(getClientAssignedCentersListThunk({ customerId: values.client }));
        }
      }
      wasDrawerOpenRef.current = true;
      // After reset / open, run full validation so all required fields (incl. space details when present) show errors
      queueMicrotask(() => {
        void trigger();
      });
    } else {
      wasDrawerOpenRef.current = false;
      dispatch(resetClientCentersSpaceList());
      lastFetchedCentersKeyRef.current = '';
      prevPrimaryCenterForSpaceClearRef.current = undefined;
    }
  }, [open, dispatch, trigger]);

  // When opening with amendment initialValues, resolve client/center/space names to option values
  // so the Selects show the correct selection (they use customer_id / center id / space value).
  useEffect(() => {
    if (!open || !initialValues?.client) return;

    isApplyingInitialRef.current = true;

    const clientName = initialValues.client;
    const centerName = Array.isArray(initialValues.center)
      ? initialValues.center[0]
      : initialValues.center;

    if (watchClient !== clientName) {
      setValue('space', []);
    }
    const wantedSpaceIds = normalizeSpaceFieldToIds(initialValues?.space);
    const spacesStatus = initialValues?.customerSpacesStatus;
    dispatch(
      getClientCentersSpaceListThunk({
        centerId: centerName,
        customerId: clientName,
        ...(isAmendment ? { assignSpaceIds: wantedSpaceIds } : { status: 'Locked' }),
        ...(isAmendment && spacesStatus ? { status: spacesStatus } : {}),
      }),
    );
    setValue('space', wantedSpaceIds);

    const t = setTimeout(() => {
      isApplyingInitialRef.current = false;
    }, 0);
    return () => clearTimeout(t);
  }, [
    open,
    initialValues?.client,
    initialValues?.center,
    initialValues?.space,
    initialValues?.customerSpacesStatus,
    initialValues?.assignSpaceStatusById,
    agreementsClientList,
    clientCentersList,
    watchClient,
    setValue,
    isAmendment,
    dispatch,
  ]);

  // Load assign-space data per selected space (one card per space)
  useEffect(() => {
    const ids = normalizeSpaceFieldToIds(watchSpace);
    if (ids.length === 0) {
      setSpaceDetailsById({});
      return undefined;
    }

    let cancelled = false;

    (async () => {
      const startAtOpen = getValues('agreement_start_date');
      // Pending flow passes `initialValues`; assign-space API often has no `agreement_end_date` here.
      const iv = initialValues;
      // Amendment: do not use agreement-level `agreement_start` / `rent` as a default for every space
      // (spaces without a child table row are still "allocate space" rows — fill from API + pending, not parent dates).
      const settled = await Promise.allSettled(
        ids.map((id) => dispatch(getSpaceWiseDataThunk({ assignSpaceIds: [id] })).unwrap()),
      );
      if (cancelled) return;
      const next = {};
      ids.forEach((id, i) => {
        const r = settled[i];
        if (r.status !== 'fulfilled') return;
        const data = r.value || {};
        const plans = Array.isArray(data.space_types)
          ? data.space_types
          : data.space_types
            ? [data.space_types]
            : [];
        const rentFallback = isAmendment
          ? ''
          : iv?.rent_start_date || iv?.agreement_start_date || startAtOpen || '';
        const rentFromApi =
          formatToDDMMYYYY(data.rent_start_date) || String(data.rent_start_date ?? '').trim();
        const endFromApi =
          formatToDDMMYYYY(data.agreement_end_date) || String(data.agreement_end_date ?? '').trim();
        next[id] = {
          membership_plan: plans,
          no_of_seats: data.no_of_seats ?? '',
          area: data.area ?? '',
          price_per_seat: data.price_per_seat ?? '',
          monthly_revenue: data.monthly_revenue ?? '',
          rent_start_date: rentFromApi || rentFallback || '',
          agreement_end_date: isAmendment
            ? endFromApi || ''
            : endFromApi || formatToDDMMYYYY(iv?.agreement_end_date) || '',
          lock_in_period: data.lock_in_period ?? '',
          lock_in_end_date: data.lock_in_end_date || '',
          increment_date: data.increment_date || '',
          security_deposit_amount: data.sec_deposit_amt || '',
        };
        if (iv?.spaceDetailsById) {
          const o = iv.spaceDetailsById[String(id)] ?? iv.spaceDetailsById[id];
          if (o) {
            const spaceStatus = String(
              initialValues?.assignSpaceStatusById?.[String(id)] || '',
            ).toLowerCase();
            const isUpdatedSpace = isAmendment && spaceStatus === 'updated';
            const apiPlans = next[id]?.membership_plan;
            next[id] = mergeAmendmentSpaceDetailFromAgreement(next[id], o, isUpdatedSpace);
            const oPlans = next[id]?.membership_plan;
            const oPlansUsable = Array.isArray(oPlans) && oPlans.length > 0;
            if (!oPlansUsable && Array.isArray(apiPlans) && apiPlans.length > 0) {
              next[id] = { ...next[id], membership_plan: apiPlans };
            }
          }
        }
      });
      const missingStr = (v) => v == null || (typeof v === 'string' && v.trim() === '');

      if (!cancelled && ((!isAmendment && !initialValues?.spaceDetailsById) || isAmendment)) {
        const client = getValues('client');
        const centerField = getValues('center');
        const centerId = Array.isArray(centerField) ? centerField[0] : centerField;
        const clientLabel = (agreementsClientList || []).find(
          (c) => c.customer_id === client,
        )?.client_name;
        const centerLabel = clientCentersList?.data?.find(
          (c) => c.center_id === centerId,
        )?.center_name;
        if (clientLabel && centerLabel) {
          try {
            const pendingRes = await dispatch(
              getAgreementPendingSpaceAllocationListThunk({ keyword: '', page: 1, page_size: 500 }),
            ).unwrap();
            if (cancelled) return;
            const results = Array.isArray(pendingRes?.results) ? pendingRes.results : [];
            const byClientCenter = results.find(
              (p) => p.client_name === clientLabel && p.center_name === centerLabel,
            );
            const endDateFromSpace = (s) => {
              const endRaw =
                s?.end_date ||
                s?.agreement_end_date ||
                s?.lease_end_date ||
                s?.contract_end_date ||
                '';
              return endRaw ? formatToDDMMYYYY(endRaw) : null;
            };
            const startDateFromSpace = (s) => {
              const startRaw =
                s?.start_date || s?.agreement_start_date || s?.lease_start_date || '';
              return startRaw ? formatToDDMMYYYY(startRaw) : null;
            };
            const findAssignedSpaceForId = (assignId) => {
              const inRow = (row) => {
                if (!row || !Array.isArray(row.assigned_spaces)) return null;
                return (
                  row.assigned_spaces.find(
                    (as) => String(as.assign_space_id) === String(assignId),
                  ) ?? null
                );
              };
              const a = inRow(byClientCenter);
              if (a) return a;
              for (const pRow of results) {
                const s = inRow(pRow);
                if (s) return s;
              }
              return null;
            };
            for (const id of ids) {
              if (!next[id]) continue;
              const s = findAssignedSpaceForId(id);
              if (!s) continue;
              const ad = endDateFromSpace(s);
              const rs = startDateFromSpace(s);
              if (isAmendment && String(s?.status || '').toLowerCase() === 'updated') {
                const o = iv?.spaceDetailsById?.[String(id)] ?? iv?.spaceDetailsById?.[id];
                if (o) {
                  const idx = ids.indexOf(id);
                  const apiData =
                    idx >= 0 && settled[idx]?.status === 'fulfilled'
                      ? settled[idx].value || {}
                      : {};
                  const apiPlans = Array.isArray(apiData.space_types)
                    ? apiData.space_types
                    : apiData.space_types
                      ? [apiData.space_types]
                      : next[id]?.membership_plan;
                  const apiRow = {
                    ...next[id],
                    no_of_seats: apiData.no_of_seats ?? next[id].no_of_seats,
                    area: apiData.area ?? next[id].area,
                    price_per_seat: apiData.price_per_seat ?? next[id].price_per_seat,
                    monthly_revenue: apiData.monthly_revenue ?? next[id].monthly_revenue,
                    membership_plan: apiPlans,
                  };
                  next[id] = mergeAmendmentSpaceDetailFromAgreement(apiRow, o, true);
                  const oPlans = next[id]?.membership_plan;
                  if (
                    (!Array.isArray(oPlans) || oPlans.length === 0) &&
                    Array.isArray(apiPlans) &&
                    apiPlans.length > 0
                  ) {
                    next[id] = { ...next[id], membership_plan: apiPlans };
                  }
                }
              }
              if (isAmendment) {
                if (ad && missingStr(next[id].agreement_end_date)) {
                  next[id] = { ...next[id], agreement_end_date: ad };
                }
                if (rs && missingStr(next[id].rent_start_date)) {
                  next[id] = { ...next[id], rent_start_date: rs };
                }
              } else {
                if (ad) next[id] = { ...next[id], agreement_end_date: ad };
                if (rs) next[id] = { ...next[id], rent_start_date: rs };
              }
            }
          } catch {
            /* keep assign-space API + form fallbacks */
          }
        }
      }
      if (cancelled) return;
      setSpaceDetailsById(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    spaceSelectionKey,
    dispatch,
    getValues,
    initialValues,
    isAmendment,
    agreementsClientList,
    clientCentersList,
  ]);

  const syncAggregatesToForm = useCallback(() => {
    const ids = normalizeSpaceFieldToIds(watchSpace);
    if (ids.length === 0) {
      setValue('no_of_seats', undefined);
      setValue('area', undefined);
      setValue('price_per_seat', undefined);
      setValue('membership_plan', undefined);
      setValue('monthly_revenue', '');
      return;
    }

    const entries = ids.map((id) => spaceDetailsById[id]).filter(Boolean);
    if (entries.length === 0 || entries.length !== ids.length) return;

    const toNum = (v) => {
      if (v === '' || v === null || v === undefined) return 0;
      const n = Number(String(v).replaceAll(',', ''));
      return Number.isNaN(n) ? 0 : n;
    };

    if (entries.length === 1) {
      const e = entries[0];
      setValue(
        'monthly_revenue',
        e.monthly_revenue === '' || e.monthly_revenue === undefined ? '' : toNum(e.monthly_revenue),
      );
      setValue('no_of_seats', toNum(e.no_of_seats) || undefined);
      setValue('area', toNum(e.area) || undefined);
      setValue('price_per_seat', toNum(e.price_per_seat) || undefined);
      setValue('membership_plan', e.membership_plan?.length ? e.membership_plan : undefined);
      return;
    }

    let totalRevenue = 0;
    let totalSeats = 0;
    let totalArea = 0;
    let weightedPriceSum = 0;
    const allPlans = new Set();
    for (const e of entries) {
      const seats = toNum(e.no_of_seats);
      const rev = toNum(e.monthly_revenue);
      const ar = toNum(e.area);
      const price = toNum(e.price_per_seat);
      totalRevenue += rev;
      totalSeats += seats;
      totalArea += ar;
      weightedPriceSum += price * seats;
      (e.membership_plan || []).forEach((p) => allPlans.add(p));
    }

    const avgPrice = totalSeats > 0 ? weightedPriceSum / totalSeats : 0;

    setValue('monthly_revenue', totalRevenue);
    setValue('no_of_seats', totalSeats || undefined);
    setValue('area', totalArea || undefined);
    setValue('price_per_seat', avgPrice || undefined);
    setValue('membership_plan', [...allPlans].length > 0 ? [...allPlans] : undefined);
  }, [watchSpace, spaceDetailsById, setValue]);

  useEffect(() => {
    setValue('space_details', spaceDetailsById, { shouldValidate: true });
  }, [spaceDetailsById, setValue]);

  useEffect(() => {
    if (!isAmendment || !initialValues?.roc) return;
    const hasReduction = Object.values(spaceDetailsById).some((d) =>
      isSeatReductionHint(d?.seat_change_hint),
    );
    if (hasReduction && !getValues('change_type')) {
      setValue('change_type', 'Seats Change', { shouldDirty: true, shouldValidate: true });
    }
  }, [spaceDetailsById, isAmendment, initialValues?.roc, getValues, setValue]);

  // Create-agreement only: when agreement start date is empty, prefill the earliest rent start date
  // from selected spaces so timeline starts from the first active space.
  useEffect(() => {
    if (isAmendment) return;
    if (watchAgreementStartDate != null && watchAgreementStartDate !== '') return;

    const ids = normalizeSpaceFieldToIds(watchSpace);
    if (ids.length === 0) return;

    const earliestTs = ids.reduce((minTs, id) => {
      const raw = spaceDetailsById[id]?.rent_start_date;
      const d = parseDDMMYYYY(raw);
      const ts = d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : null;
      if (ts == null) return minTs;
      return minTs == null || ts < minTs ? ts : minTs;
    }, null);

    if (earliestTs != null) {
      setValue('agreement_start_date', new Date(earliestTs), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [isAmendment, watchAgreementStartDate, watchSpace, spaceDetailsById, setValue]);

  /** Re-run zod (incl. superRefine: rent_start vs agreement_start) when either changes. */
  useEffect(() => {
    void trigger();
  }, [watchAgreementStartDate, spaceDetailsById, trigger]);

  useEffect(() => {
    if (!open || !isAmendment) return;
    const t = setTimeout(() => void trigger(), 0);
    return () => clearTimeout(t);
  }, [open, isAmendment, watchSpace, spaceDetailsById, trigger]);

  const patchSpaceDetail = useCallback((spaceId, patch) => {
    setSpaceDetailsById((prev) => ({
      ...prev,
      [spaceId]: { ...prev[spaceId], ...patch },
    }));
  }, []);

  const removeSpaceFromCard = useCallback(
    (spaceId) => {
      const next = (watchSpace || []).filter((id) => id !== spaceId);
      setValue('space', next, { shouldDirty: true, shouldValidate: true });
    },
    [watchSpace, setValue],
  );

  const getSpaceDisplayName = useCallback(
    (id) => {
      const row = clientCentersSpaceList?.data?.find((s) => s.name === id);
      return row?.space_name ?? id;
    },
    [clientCentersSpaceList?.data],
  );

  useEffect(() => {
    syncAggregatesToForm();
  }, [syncAggregatesToForm]);

  // When spaces for a selected center load, preselect all spaces by default
  useEffect(() => {
    const primaryCenter = Array.isArray(watchCenter) ? watchCenter[0] : watchCenter;
    if (!primaryCenter) return;
    if (isApplyingInitialRef.current) return;

    const spaces = clientCentersSpaceList?.data ?? [];
    if (spaces.length === 0) return;
    const spaceIds = spaces.map((space) => space.name);
    setValue('space', spaceIds);
    return;
  }, [watchCenter, clientCentersSpaceList?.data]);

  useEffect(() => {
    if (isApplyingInitialRef.current) return;
    // Don't clear center when form still has amendment initial client name (before resolve)
    if (initialValues?.client && watchClient === initialValues.client) return;
    if (!watchClient) return;

    // When client changes after initial load, clear all space-dependent fields
    setValue('center', []);
    setValue('space', []);
    setValue('no_of_seats', undefined);
    setValue('area', undefined);
    setValue('price_per_seat', undefined);
    setValue('membership_plan', undefined);
    setValue('monthly_revenue', '');
  }, [watchClient, setValue, initialValues?.client]);

  useEffect(() => {
    if (isApplyingInitialRef.current) return;
    const primaryCenter = Array.isArray(watchCenter) ? watchCenter[0] : watchCenter;
    const initialPrimaryCenter = Array.isArray(initialValues?.center)
      ? initialValues.center[0]
      : initialValues?.center;
    // Don't clear space when form still has amendment initial center (before resolve)
    if (initialPrimaryCenter && primaryCenter === initialPrimaryCenter) return;
    const prev = prevPrimaryCenterForSpaceClearRef.current;
    if (primaryCenter && prev && prev !== primaryCenter) {
      setValue('space', []);
    }
    prevPrimaryCenterForSpaceClearRef.current = primaryCenter || undefined;
  }, [watchCenter, setValue, initialValues?.center]);

  const handlePhotosPicked = useCallback(
    (files) => {
      if (!files?.length) return;
      const newPhotos = [...photos, ...files];
      setValue('photos', newPhotos, { shouldDirty: true });
    },
    [photos, setValue],
  );

  const removePhotoAt = useCallback(
    (index) => {
      const next = photos.filter((_, i) => i !== index);
      setValue('photos', next, { shouldDirty: true });
    },
    [photos, setValue],
  );

  const onCreate = useCallback(
    async (data) => {
      try {
        const toNumberOrUndefined = (v) => {
          if (v === '' || v === null || v === undefined) return undefined;
          const cleaned = typeof v === 'string' ? v.replaceAll(/[^\d.]/g, '') : v;
          const n = Number(cleaned);
          return Number.isNaN(n) ? undefined : n;
        };

        const payload = {
          parent_agreement_id: initialValues?.parent_agreement_id ?? undefined,
          roc: data.roc ? data.change_type : undefined,
          client: data.client,
          center: Array.isArray(data.center) ? data.center[0] : data.center,
          agreement_start_date: toApiDate(data.agreement_start_date),
          annual_escalation: toNumberOrUndefined(data.annual_escalation),
          escalation_years: toNumberOrUndefined(data.escalation_years),
          no_of_monthly_deposit: toNumberOrUndefined(data.no_of_monthly_deposit),
          notice_period_of_client: toNumberOrUndefined(data.notice_period_client),
          notice_period_of_devx: toNumberOrUndefined(data.notice_period_devx),
          payment_due_day: toNumberOrUndefined(data.payment_due_day),
          membership_plan: Array.isArray(data.membership_plan)
            ? data.membership_plan.map((label) => ({ plans: label }))
            : data.membership_plan
              ? [{ plans: data.membership_plan }]
              : [],
          space: Array.isArray(data.space)
            ? data.space.map((id) => {
                const s = spaceDetailsById[id] || {};
                return {
                  space: id,
                  rent_start_date: toApiDate(s.rent_start_date),
                  agreement_end_date: toApiDate(s.agreement_end_date),
                  lock_in_period: toNumberOrUndefined(s.lock_in_period),
                  lock_in_end_date: toApiDate(s.lock_in_end_date),
                  monthly_revenue: toNumberOrUndefined(s.monthly_revenue),
                  price_per_seat: toNumberOrUndefined(s.price_per_seat),
                  no_of_seats: toNumberOrUndefined(s.no_of_seats),
                  area: toNumberOrUndefined(s.area),
                  security_deposit_amount: toNumberOrUndefined(s.security_deposit_amount),
                  increment_date: s.increment_date ? toApiDate(s.increment_date) : undefined,
                };
              })
            : [],
          amenities_details: (amenitiesRef.current?.getAmenitiesRows?.() || [])
            .filter((r) => String(r?.name || '').trim())
            .map((r) => ({
              amenity_name: String(r.name || '').trim(),
              remarks: String(r.remark || '').trim(),
              included: r.checked ? 1 : 0,
            })),
          notes: typeof data.notes === 'string' ? data.notes.trim() : '',
        };

        const created = await dispatch(createAgreementThunk(payload)).unwrap();
        const agreementId = created?.name ?? created?.data?.name ?? payload?.name;

        if (agreementId && data.photos?.length > 0) {
          const photoFiles = data.photos.filter((f) => f instanceof File);
          if (photoFiles.length > 0) {
            try {
              await dispatch(
                addAgreementAttachmentThunk({ agreement_id: agreementId, files: photoFiles }),
              ).unwrap();
            } catch (error) {
              showErrorToast(error, {
                defaultMessage: 'Agreement created but attachments could not be added.',
              });
            }
          }
        }

        if (!initialValues?.parent_agreement_id) {
          showSuccessToast('Agreement created successfully.');
        }
        reset();
        onSuccess?.(created ?? payload);
        onClose();
        dispatch(
          getAgreementsListViewThunk({
            keyword: '',
            page: 1,
            page_size: 20,
            filters: [],
            order_by: 'creation desc',
            agreement_type: 'Client',
          }),
        );
        dispatch(
          getAgreementPendingSpaceAllocationListThunk({
            keyword: '',
            page: 1,
            page_size: 20,
          }),
        );
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to create agreement.' });
      }
    },
    [dispatch, initialValues?.parent_agreement_id, onSuccess, onClose, reset, spaceDetailsById],
  );

  const isSpaceDataComplete = useMemo(() => {
    const ids = normalizeSpaceFieldToIds(watchSpace);
    if (ids.length === 0) return false;
    return ids.every((id) => {
      const s = spaceDetailsById[id];
      if (!s) return false;

      const isSet = (v) => v !== undefined && v !== null && v !== '';

      return (
        isSet(s.no_of_seats) &&
        isSet(s.area) &&
        isSet(s.price_per_seat) &&
        isSet(s.monthly_revenue) &&
        isSet(s.rent_start_date) &&
        isSet(s.agreement_end_date) &&
        isSet(s.lock_in_period) &&
        isSet(s.lock_in_end_date)
      );
    });
  }, [watchSpace, spaceDetailsById]);

  const hasBasicErrors = Boolean(
    errors.client ||
    errors.center ||
    errors.space ||
    errors.no_of_monthly_deposit ||
    errors.notice_period_client ||
    errors.notice_period_devx ||
    errors.change_type ||
    errors.agreement_start_date ||
    errors.annual_escalation ||
    errors.escalation_years ||
    errors.payment_due_day,
  );
  const hasSpaceErrors = Boolean(errors.monthly_revenue || errors.space_details);
  const hasSeatReductionHint = useMemo(
    () => Object.values(spaceDetailsById).some((d) => isSeatReductionHint(d?.seat_change_hint)),
    [spaceDetailsById],
  );
  const hasAmenitiesErrors = Boolean(errors.amenities_details);

  const headerTitle = title;
  const headerDescription = description;

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Content className='relative flex h-full max-w-[800px] flex-col overflow-hidden'>
        <Drawer.Header
          className='px-6 py-4 border-b sticky top-0 z-10 bg-white border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-start justify-between w-full gap-4'>
            <div className='flex flex-col gap-1'>
              <div className='label-medium text-text-strong-950'>{headerTitle}</div>
              <div className='paragraph-small text-text-sub-600'>{headerDescription}</div>
            </div>
            <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onClose}>
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex-1 overflow-hidden p-0'>
          <form className='flex h-full flex-col overflow-hidden'>
            <TabMenuVertical.Root
              value={agreementDrawerTab}
              onValueChange={setAgreementDrawerTab}
              className='flex h-full w-full'
            >
              <TabMenuVertical.List className='w-[240px] shrink-0 border-r border-stroke-soft-200 bg-bg-weak-100 p-4'>
                <TabMenuVertical.Trigger
                  value='basic'
                  className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <TabMenuVertical.Icon as={RiInformationLine} />
                  <span className='truncate'>Basic Details</span>
                  {hasBasicErrors ? (
                    <RiInformationFill className='size-4 text-error-base ml-auto' />
                  ) : null}
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
                <TabMenuVertical.Trigger
                  value='space'
                  className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <TabMenuVertical.Icon as={RiBuilding2Line} />
                  <span className='truncate'>Space Details</span>
                  {hasSeatReductionHint ? (
                    <RiErrorWarningFill className='size-4 text-error-base ml-auto' />
                  ) : hasSpaceErrors ? (
                    <RiInformationFill className='size-4 text-error-base ml-auto' />
                  ) : null}
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
                <TabMenuVertical.Trigger
                  value='amenities'
                  className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <TabMenuVertical.Icon as={RiLayoutGridLine} />
                  <span className='truncate'>Amenities</span>
                  {hasAmenitiesErrors ? (
                    <RiInformationFill className='size-4 text-error-base ml-auto' />
                  ) : null}
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
              </TabMenuVertical.List>
              <div className='min-w-0 flex-1 overflow-y-auto'>
                <TabMenuVertical.Content
                  value='basic'
                  className='h-full data-[state=inactive]:hidden'
                  forceMount
                >
                  {/* Basic Info */}
                  <div className='flex flex-col px-8 gap-4 pb-5'>
                    <div className='flex items-center gap-2'>
                      <RiInformationLine
                        className='size-4 text-text-sub-600 shrink-0'
                        color='#868C98'
                        aria-hidden
                      />
                      <span className='label-medium text-[var(--color-text-sub-500)]'>
                        Basic Info
                      </span>
                    </div>

                    <div className='grid grid-cols-2 gap-y-4 gap-x-3'>
                      {/* Client * (with D badge) */}
                      <div className='flex flex-col gap-1 relative'>
                        <div className='flex items-center gap-1.5'>
                          <Label.Root>
                            Client <Label.Asterisk />
                          </Label.Root>
                        </div>
                        <Controller
                          name='client'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              disabled={isAmendment}
                              value={field.value || ''}
                              onValueChange={(value) => {
                                if (isAmendment) return;
                                field.onChange(value);

                                // When client is changed by the user, reset the form
                                // to default values while preserving the selected client.
                                reset({
                                  ...defaultAgreementValues,
                                  client: value,
                                  roc: initialValues?.roc,
                                });

                                dispatch(getClientAssignedCentersListThunk({ customerId: value }));
                              }}
                              hasError={Boolean(errors.client)}
                              options={(agreementsClientList || []).map((c) => ({
                                value: c.customer_id,
                                label: c.client_name,
                              }))}
                              placeholder='Select'
                              showArrow={true}
                              isolateSearchKeyboard
                            />
                          )}
                        />
                        {errors.client?.message ? (
                          <ErrorText>{errors.client.message}</ErrorText>
                        ) : null}
                      </div>

                      {/* Center * */}
                      <div className='flex flex-col gap-1'>
                        <Label.Root>
                          Center <Label.Asterisk />
                        </Label.Root>
                        <Controller
                          name='center'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              disabled={isAmendment || !watchClient}
                              multiple={true}
                              value={field.value || []}
                              onValueChange={(next) => {
                                field.onChange(next);
                                setValue('space', []);
                              }}
                              onOpenChange={(open) => {
                                if (open) return;
                                const current = Array.isArray(field.value)
                                  ? field.value
                                  : field.value
                                    ? [field.value]
                                    : [];
                                const nextKey = [...current].sort().join('|');
                                if (
                                  !watchClient ||
                                  current.length === 0 ||
                                  nextKey === lastFetchedCentersKeyRef.current
                                )
                                  return;
                                lastFetchedCentersKeyRef.current = nextKey;
                                setValue('space', []);
                                dispatch(
                                  getClientCentersSpaceListThunk({
                                    centerId: current,
                                    customerId: watchClient,
                                    ...(!isAmendment
                                      ? { status: 'Locked' }
                                      : initialValues?.customerSpacesStatus
                                        ? { status: initialValues.customerSpacesStatus }
                                        : {}),
                                  }),
                                );
                              }}
                              hasError={Boolean(errors.center)}
                              options={(clientCentersList?.data || []).map((opt) => ({
                                value: opt.center_id,
                                label: opt.center_name,
                              }))}
                              placeholder='Select Center'
                              showArrow={true}
                              isolateSearchKeyboard
                              renderTrigger={({ selectedOptions }) => (
                                <div className='flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden'>
                                  {selectedOptions.length === 0 ? (
                                    <span className='text-text-soft-400'>Select Center</span>
                                  ) : (
                                    <>
                                      <Tag.Root variant='gray' className='shrink-0 max-w-[150px]'>
                                        <span className='truncate block'>
                                          {selectedOptions[0].label}
                                        </span>
                                      </Tag.Root>
                                      {selectedOptions.length > 1 ? (
                                        <SelectionOverflowPlusBadge
                                          variant='center'
                                          labels={selectedOptions.slice(1).map((opt) => opt.label)}
                                        />
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              )}
                            />
                          )}
                        />
                        {errors.center ? (
                          <Hint.Root hasError>
                            <Hint.Icon as={RiInformationFill} />
                            {errors.center.message}
                          </Hint.Root>
                        ) : null}
                      </div>

                      {/* Space */}
                      <div className='flex flex-col gap-1 w-full col-span-2'>
                        <Label.Root>
                          Space <Label.Asterisk />
                        </Label.Root>
                        <Controller
                          name='space'
                          control={control}
                          render={({ field }) => {
                            const options =
                              clientCentersSpaceList?.data?.map((opt) => ({
                                value: opt.name,
                                label: opt.space_name,
                              })) ?? [];

                            const value = normalizeSpaceFieldToIds(field.value);

                            if (!Array.isArray(watchCenter) || watchCenter.length === 0) {
                              return (
                                <div className='flex items-center justify-center p-2 border border-dashed border-stroke-soft-200 rounded-lg bg-bg-weak-50 text-paragraph-sm text-text-disabled-300'>
                                  Select the center first
                                </div>
                              );
                            }

                            if (options.length === 0) {
                              return (
                                <div className='flex items-center justify-center p-2 border border-dashed border-stroke-soft-200 rounded-lg bg-bg-weak-50 text-paragraph-sm text-text-disabled-300'>
                                  No spaces available
                                </div>
                              );
                            }

                            return (
                              <SearchableSelect
                                multiple={true}
                                value={value}
                                onValueChange={field.onChange}
                                options={options}
                                placeholder='Select'
                                showArrow={true}
                                isolateSearchKeyboard
                                renderTrigger={({ selectedOptions }) => (
                                  <div className='flex items-center gap-2 min-w-0 flex-1 overflow-hidden'>
                                    {selectedOptions.length === 0 ? (
                                      <span className='text-text-soft-400'>Select</span>
                                    ) : (
                                      <>
                                        {selectedOptions.slice(0, 4).map((opt) => (
                                          <Tag.Root
                                            key={opt.value}
                                            variant='gray'
                                            className='shrink-0 max-w-[180px]'
                                          >
                                            <span className='truncate block'>{opt.label}</span>
                                            <Tag.DismissButton
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                field.onChange(
                                                  value.filter(
                                                    (x) => String(x) !== String(opt.value),
                                                  ),
                                                );
                                              }}
                                            />
                                          </Tag.Root>
                                        ))}
                                        {selectedOptions.length > 4 ? (
                                          <SelectionOverflowPlusBadge
                                            labels={selectedOptions
                                              .slice(4)
                                              .map((opt) => opt.label)}
                                          />
                                        ) : null}
                                      </>
                                    )}
                                  </div>
                                )}
                              />
                            );
                          }}
                        />

                        {errors.space?.message ? (
                          <ErrorText>{errors.space.message}</ErrorText>
                        ) : null}
                      </div>
                    </div>

                    <div className='grid grid-cols-2 gap-y-4 gap-x-3'>
                      {/* No. of Monthly Deposit */}
                      <div className='flex flex-col gap-1'>
                        <Label.Root>No. of Monthly Deposit</Label.Root>
                        <Controller
                          name='no_of_monthly_deposit'
                          control={control}
                          render={({ field }) => (
                            <Input.Root
                              className='w-full'
                              hasError={Boolean(errors.no_of_monthly_deposit)}
                            >
                              <Input.Wrapper>
                                <Input.Input
                                  type='text'
                                  inputMode='decimal'
                                  placeholder='Enter months'
                                  value={
                                    field.value === undefined || field.value === null
                                      ? ''
                                      : String(field.value)
                                  }
                                  onChange={(e) => {
                                    field.onChange(sanitizeDecimalTextInput(e.target.value));
                                  }}
                                />
                                <Input.Affix>MONTH</Input.Affix>
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {errors.no_of_monthly_deposit?.message ? (
                          <ErrorText>{errors.no_of_monthly_deposit.message}</ErrorText>
                        ) : null}
                      </div>

                      {/* Notice Period of Client */}
                      <div className='flex flex-col gap-1'>
                        <Label.Root>Notice Period of Client</Label.Root>
                        <Controller
                          name='notice_period_client'
                          control={control}
                          render={({ field }) => (
                            <Input.Root
                              className='w-full'
                              hasError={Boolean(errors.notice_period_client)}
                            >
                              <Input.Wrapper>
                                <Input.Input
                                  type='text'
                                  inputMode='decimal'
                                  placeholder='Enter months'
                                  value={
                                    field.value === undefined || field.value === null
                                      ? ''
                                      : String(field.value)
                                  }
                                  onChange={(e) => {
                                    field.onChange(sanitizeDecimalTextInput(e.target.value));
                                  }}
                                />
                                <Input.Affix>MONTH</Input.Affix>
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {errors.notice_period_client?.message ? (
                          <ErrorText>{errors.notice_period_client.message}</ErrorText>
                        ) : null}
                      </div>

                      {/* Notice Period of DevX */}
                      <div className='flex flex-col gap-1'>
                        <Label.Root>Notice Period of DevX</Label.Root>
                        <Controller
                          name='notice_period_devx'
                          control={control}
                          render={({ field }) => (
                            <Input.Root
                              className='w-full'
                              hasError={Boolean(errors.notice_period_devx)}
                            >
                              <Input.Wrapper>
                                <Input.Input
                                  type='text'
                                  inputMode='decimal'
                                  placeholder='Enter months'
                                  value={
                                    field.value === undefined || field.value === null
                                      ? ''
                                      : String(field.value)
                                  }
                                  onChange={(e) => {
                                    field.onChange(sanitizeDecimalTextInput(e.target.value));
                                  }}
                                />
                                <Input.Affix>MONTH</Input.Affix>
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {errors.notice_period_devx?.message ? (
                          <ErrorText>{errors.notice_period_devx.message}</ErrorText>
                        ) : null}
                      </div>

                      {/* ROC */}
                      {/* {initialValues?.roc && (
                  <div className='flex items-center'>
                    <label className='flex items-center gap-2 cursor-pointer'>
                      <input
                        type='checkbox'
                        disabled
                        {...register('roc')}
                        className='rounded border-stroke-soft-200 text-primary-base focus:ring-primary-base'
                      />
                      <span className='text-label-sm text-text-strong-950'>ROC</span>
                    </label>
                  </div>
                )} */}
                      {initialValues?.roc && (
                        <div className='flex flex-col gap-1'>
                          <Label.Root className='inline-flex items-center gap-1.5'>
                            Change Type <Label.Asterisk />
                            {hasSeatReductionHint && watch('change_type') === 'Seats Change' ? (
                              <RiInformationFill
                                className='size-4 shrink-0 text-error-base'
                                aria-hidden
                              />
                            ) : null}
                          </Label.Root>
                          <Controller
                            name='change_type'
                            control={control}
                            render={({ field }) => (
                              <SearchableSelect
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                hasError={Boolean(errors.change_type)}
                                options={AGREEMENTS_CHANGE_TYPE_OPTIONS}
                                placeholder='Select'
                                showArrow={true}
                                isolateSearchKeyboard
                              />
                            )}
                          />
                          {errors.change_type?.message ? (
                            <ErrorText>{errors.change_type.message}</ErrorText>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='border-b border-stroke-soft-200  px-8' />

                  {/* Agreement Timeline */}
                  <div className='flex flex-col px-8 gap-4 py-5'>
                    <div className='flex items-center gap-2'>
                      <RiCalendarLine className='size-5 text-text-sub-600' />
                      <div className='text-label-sm text-text-strong-950'>Agreement Timeline</div>
                    </div>
                    <div className='grid grid-cols-2 gap-y-4 gap-x-3'>
                      {/* Agreement Start Date */}
                      <div className='flex flex-col gap-1'>
                        <Label.Root>
                          Agreement Start Date <Label.Asterisk />
                        </Label.Root>
                        <Controller
                          name='agreement_start_date'
                          control={control}
                          render={({ field }) => (
                            <Datepicker
                              variant='neutral'
                              mode='stroke'
                              value={toPickerDate(field.value)}
                              onChange={(date) => field.onChange(date ?? undefined)}
                              disabled={isSubmitting}
                              placeholder='DD/MM/YY'
                              formatDate={formatDDMMYY}
                              hasError={!!errors.agreement_start_date}
                              size='medium'
                              className='w-full'
                            />
                          )}
                        />

                        {errors.agreement_start_date?.message ? (
                          <ErrorText>{errors.agreement_start_date.message}</ErrorText>
                        ) : null}
                      </div>
                      {/* Annual Escalation */}
                      <div className='flex flex-col gap-1'>
                        <Label.Root>Annual Escalation</Label.Root>
                        <Input.Root
                          className='w-full'
                          hasError={Boolean(errors.annual_escalation || errors.escalation_years)}
                        >
                          <Controller
                            name='annual_escalation'
                            control={control}
                            render={({ field }) => (
                              <Input.Wrapper className='flex-[3]'>
                                <Input.Input
                                  type='text'
                                  inputMode='decimal'
                                  placeholder='Enter escalation'
                                  value={field.value ?? ''}
                                  onChange={(e) => {
                                    const raw = e.target.value ?? '';
                                    const cleaned = raw.replaceAll(/[^\d.]/g, '');

                                    if (!cleaned) {
                                      field.onChange(undefined);
                                      return;
                                    }

                                    const num = Number(cleaned);
                                    field.onChange(Number.isNaN(num) ? undefined : num);
                                  }}
                                />
                                <Input.Affix>%</Input.Affix>
                              </Input.Wrapper>
                            )}
                          />
                          <Controller
                            name='escalation_years'
                            control={control}
                            render={({ field }) => (
                              <div className='flex-[2] flex min-w-0 items-center justify-center bg-bg-white-0'>
                                <Select.Root
                                  variant='borderless'
                                  size='xsmall'
                                  value={field.value || ''}
                                  onValueChange={field.onChange}
                                >
                                  <Select.Trigger
                                    className='w-full h-full border-none shadow-none focus:ring-0 focus:border-none focus:shadow-none bg-transparent hover:bg-transparent pl-2 pr-1'
                                    showArrow={true}
                                    hasError={Boolean(errors.escalation_years)}
                                  >
                                    <Select.Value placeholder='Year' />
                                  </Select.Trigger>
                                  <Select.Content className='min-w-[110px]'>
                                    {['1 Year', '2 Year', '3 Year', '4 Year', '5 Year'].map(
                                      (val) => (
                                        <Select.Item key={val} value={val}>
                                          {val}
                                        </Select.Item>
                                      ),
                                    )}
                                  </Select.Content>
                                </Select.Root>
                              </div>
                            )}
                          />
                        </Input.Root>
                        {errors.annual_escalation?.message || errors.escalation_years?.message ? (
                          <ErrorText>
                            {errors.annual_escalation?.message || errors.escalation_years?.message}
                          </ErrorText>
                        ) : null}
                      </div>
                      {/* Payment Due Day */}
                      <div className='flex flex-col gap-1'>
                        <Label.Root>Payment Due Date</Label.Root>
                        <Controller
                          name='payment_due_day'
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value ? String(field.value) : ''}
                              onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                              hasError={Boolean(errors.payment_due_day)}
                              options={Array.from({ length: 31 }, (_, i) => String(i + 1)).map(
                                (day) => ({
                                  value: day,
                                  label: day,
                                }),
                              )}
                              placeholder='Select'
                              showArrow={true}
                              isolateSearchKeyboard
                            />
                          )}
                        />
                        {errors.payment_due_day?.message ? (
                          <ErrorText>{errors.payment_due_day.message}</ErrorText>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className='border-b border-stroke-soft-200  px-8' />

                  {/* Agreement Document */}
                  <div className='flex flex-col px-8 gap-2 py-5 '>
                    <div className='flex items-center justify-between'>
                      <div className='text-label-sm text-text-strong-950'>Agreement Document</div>
                      {photos.length > 0 ? (
                        <Button.Root
                          variant='neutral'
                          mode='stroke'
                          size='xsmall'
                          className='pl-2.5 pr-3 py-1.5 gap-0.5'
                          type='button'
                          onClick={() => photosInputRef.current?.click()}
                        >
                          <Button.Icon as={RiUploadLine} />
                          <div className='text-label-sm px-1 text-text-sub-600'>Upload Files</div>
                        </Button.Root>
                      ) : null}
                      <input
                        ref={photosInputRef}
                        type='file'
                        multiple
                        className='hidden'
                        onChange={(e) => handlePhotosPicked(e.target.files)}
                      />
                    </div>

                    {photos.length === 0 ? (
                      <div
                        className={cn(
                          'rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-5 py-[19px]',
                          photoDragActive ? 'bg-bg-weak-50' : '',
                        )}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPhotoDragActive(true);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPhotoDragActive(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPhotoDragActive(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPhotoDragActive(false);
                          handlePhotosPicked(e.dataTransfer.files);
                        }}
                      >
                        <div className='flex items-center justify-between '>
                          <div className='flex items-center gap-3'>
                            <RiUploadCloud2Line className='size-6 text-text-sub-500' />
                            <div className='flex flex-col gap-1'>
                              <div className='text-paragraph-sm text-text-strong-950'>
                                Choose a file or drag & drop it here.
                              </div>
                              <div className='text-paragraph-xs text-text-sub-600'>
                                JPEG, PNG formats, up to 50 MB
                              </div>
                            </div>
                          </div>
                          <Button.Root
                            variant='neutral'
                            mode='stroke'
                            size='xsmall'
                            type='button'
                            onClick={() => photosInputRef.current?.click()}
                          >
                            Browse File
                          </Button.Root>
                        </div>
                      </div>
                    ) : (
                      <div className='flex flex-col w-full gap-3'>
                        {Array.from({ length: photos.length }).map((_, index) => {
                          const file = photos.at(index);
                          if (!file) return null;

                          const extension = getFileExtension(file.name);
                          const isPdf = extension === 'PDF';
                          const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG'].includes(
                            extension,
                          );
                          const url = isImage ? URL.createObjectURL(file) : null;

                          return (
                            <div
                              key={file.name ? `${file.name}-${index}` : index}
                              className='group relative flex items-center gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3 transition-colors hover:border-stroke-soft-300'
                            >
                              <div className='relative h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-bg-weak-50'>
                                {isImage ? (
                                  <img
                                    src={url}
                                    alt={file.name}
                                    className='h-full w-full rounded-lg object-cover'
                                  />
                                ) : (
                                  <FileFormatIcon.Root
                                    format={extension || 'FILE'}
                                    color={isPdf ? 'red' : 'purple'}
                                    size='medium'
                                  />
                                )}
                              </div>

                              <div className='flex flex-1 flex-col gap-0.5 min-w-0'>
                                <div className='text-paragraph-sm font-semibold text-text-strong-950 truncate'>
                                  {file.name}
                                </div>
                                <div className='text-paragraph-xs text-text-sub-600'>
                                  {formatFileSize(file.size)}
                                </div>
                              </div>

                              <Button.Root
                                type='button'
                                variant='neutral'
                                mode='stroke'
                                size='xxsmall'
                                className='shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity'
                                onClick={() => removePhotoAt(index)}
                                aria-label='Remove file'
                              >
                                <Button.Icon
                                  as={RiCloseLine}
                                  className='size-3 text-text-sub-600'
                                />
                              </Button.Root>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Notes — same pattern as VisitDetailsAndNotes (VMS); API wiring later */}
                  <div className='flex flex-col px-8 gap-2 py-5'>
                    <div className='flex items-center gap-2'>
                      <RiFileLine className='size-4 text-text-sub-600 shrink-0' aria-hidden />
                      <span className='label-medium text-[var(--color-text-sub-500)]'>Notes</span>
                    </div>
                    <Textarea.Root
                      simple
                      type='text'
                      className='w-full min-h-[65px]'
                      value={watch('notes') || ''}
                      onChange={(e) => setValue('notes', e.target.value)}
                      placeholder='Type here...'
                    />
                  </div>

                  <div className='border-b border-stroke-soft-200  px-8' />
                </TabMenuVertical.Content>

                <TabMenuVertical.Content
                  value='space'
                  className='h-full data-[state=inactive]:hidden'
                  forceMount
                >
                  <div className='flex flex-col gap-4 px-8 py-5'>
                    {Array.isArray(watchSpace) && watchSpace.length > 0 ? (
                      <>
                        {errors.monthly_revenue?.message ? (
                          <ErrorText>{errors.monthly_revenue.message}</ErrorText>
                        ) : null}
                        <div className='flex flex-col gap-4'>
                          {watchSpace.map((spaceId) => {
                            const detail = spaceDetailsById[spaceId];
                            if (!detail) {
                              return (
                                <div
                                  key={spaceId}
                                  className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4 text-paragraph-sm text-text-sub-600'
                                >
                                  Loading {getSpaceDisplayName(spaceId)}…
                                </div>
                              );
                            }
                            return (
                              <AgreementSpaceDetailCard
                                key={spaceId}
                                spaceDisplayName={getSpaceDisplayName(spaceId)}
                                membershipPlans={detail.membership_plan || []}
                                noOfSeats={detail.no_of_seats}
                                area={detail.area}
                                pricePerSeat={detail.price_per_seat}
                                monthlyRevenue={detail.monthly_revenue}
                                seatChangeHint={detail.seat_change_hint}
                                rentStartDate={detail.rent_start_date}
                                agreementEndDate={detail.agreement_end_date}
                                lockInPeriod={detail.lock_in_period}
                                lockInEndDate={detail.lock_in_end_date}
                                incrementDate={detail.increment_date}
                                securityDepositAmount={detail.security_deposit_amount}
                                errors={errors.space_details?.[spaceId]}
                                onChange={(patch) => patchSpaceDetail(spaceId, patch)}
                                onRemove={() => removeSpaceFromCard(spaceId)}
                              />
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className='rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 p-6 text-center text-paragraph-sm text-text-sub-600'>
                        Select one or more spaces in Basic Details to see space cards here.
                      </div>
                    )}
                  </div>
                </TabMenuVertical.Content>

                {/* forceMount: keep amenities mounted for ref on submit; hide when tab inactive (Radix keeps DOM). */}
                <TabMenuVertical.Content
                  value='amenities'
                  className='h-full data-[state=inactive]:hidden'
                  forceMount
                >
                  <div className='px-8 py-5'>
                    <AgreementAmenitiesSection
                      ref={amenitiesRef}
                      key={open ? 'amenities-open' : 'amenities-shut'}
                    />
                  </div>
                </TabMenuVertical.Content>
              </div>
            </TabMenuVertical.Root>
          </form>
        </Drawer.Body>

        <Drawer.Footer className='sticky border-t border-stroke-soft-200 bottom-0 z-10 bg-white'>
          <div className=' px-8 py-4 bg-bg-white-0'>
            <div className='flex items-center justify-end gap-3'>
              <Button.Root variant='neutral' mode='stroke' type='button' onClick={onClose}>
                Cancel
              </Button.Root>

              <div className='flex items-center gap-2'>
                <Button.Root
                  type='button'
                  disabled={!isValid || isSubmitting || !isSpaceDataComplete}
                  onClick={handleSubmit(onCreate)}
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </Button.Root>
              </div>
            </div>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CreateNewAgreementDrawer;
