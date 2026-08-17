import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Controller, useForm } from 'react-hook-form';
import * as Textarea from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RiCloseLine,
  RiCalendarLine,
  RiBuilding2Line,
  RiPriceTag3Line,
  RiInformationLine,
  RiFileTextLine,
  RiDownloadLine,
  RiAddLine,
  RiStickyNoteLine,
  RiMoneyDollarCircleLine,
  RiShieldLine,
  RiTimeLine,
  RiCalendarEventLine,
  RiArrowUpLine,
  RiFileUploadLine,
  RiFileLine,
} from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as Badge from '@/components/ui/badge';
import { StatusColorPill } from '@/components/ui/status-color-pill';
import * as Select from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import { Datepicker } from '@/components/ui/datepicker';
import ErrorText from '@/components/ui/error-text';
import * as Switch from '@/components/ui/switch';
import FieldRow from '@/components/ui/field-row';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  AGREEMENTS_FILTER_MEMBERSHIP_PLAN_OPTIONS,
  AGREEMENTS_CHANGE_TYPE_OPTIONS,
  getStatusBadge,
  getMembershipBadge,
  membershipPlanValues,
  membershipPlanValuesFromSpaceDetailRow,
  PAYMENT_DUE_DAYS,
  ESCALATION_YEAR_OPTIONS,
  DATE_VALIDATION_FIELDS,
} from '@/components/agreements/constants';
import { formatDDMMYY, formatOrdinal, formatDateToYYYYMMDD } from '@/utils/date-utils';
import {
  agreementsSchema,
  defaultAgreementValues,
  parseDDMMYYYY,
} from '@/schemas/agreements-schema';
import { getCenterListThunk } from '@/redux/centerSlice';
import {
  getAgreementByIdThunk,
  getClientCentersSpaceListThunk,
  deleteAgreementAttachmentThunk,
  addAgreementAttachmentThunk,
} from '@/redux/agreementsSlice';
import AgreementComments from '@/components/agreements/agreement-comments';
import AttachmentList from '@/components/ui/attachment-list';
import { getStatusOptions } from '@/api/dynamic-status';
import AgreementViewSpaceSection from '@/components/agreements/agreement-view-space-section';
import AgreementViewAmenitiesSection from '@/components/agreements/agreement-view-amenities-section';
import { DocumentFollowersPopover } from '@/components/document-subscribe';
import {
  getSubscriptionStatus,
  listDocumentSubscribers,
} from '@/services/document-subscribe-service';

/** Keep detail shape aligned with the Agreement API. */
function normalizeAgreementDetail(detail) {
  if (!detail) return null;
  return { ...detail };
}

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/** `space` on child rows may be a string id or a linked doc object from the API. */
function resolveSpaceRowKey(row, _rowIndex) {
  const raw = row?.space;
  const fromLink = typeof raw === 'object' && raw != null ? (raw.space ?? raw.name) : raw;
  const sid = fromLink ?? row?.space_id ?? row?.assign_space_id;
  if (sid != null && sid !== '') return String(sid);
  return '';
}

/** Match agreement space link id to client center space list (`name`, `id`, or `space_id`). */
function findCatalogSpaceRow(spaceList, sid) {
  if (!sid || !Array.isArray(spaceList) || spaceList.length === 0) return null;
  const s = String(sid);
  return (
    spaceList.find(
      (x) =>
        (x.name != null && String(x.name) === s) ||
        (x.id != null && String(x.id) === s) ||
        (x.space_id != null && String(x.space_id) === s),
    ) ?? null
  );
}

const toPickerDate = (val) => {
  if (!val) return undefined;
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val;
  const d = parseDDMMYYYY(val);
  return d instanceof Date ? d : undefined;
};

const getNumericPrefix = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const match = String(value).match(/\d+(\.\d+)?/);
  if (!match) return undefined;
  const n = Number(match[0]);
  return Number.isNaN(n) ? undefined : n;
};

/** Strip "Months" suffix for lock-in / notice-style month inputs. */
const monthsInputDisplay = (raw) => {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'string') return raw.replace(/\s*months?/i, '').trim();
  return String(raw);
};

/** Comma-separated office / shop list e.g. `"Shop-10, Shop-20"` → trimmed labels */
function parseCommaSeparatedShopLabels(raw) {
  if (raw == null || raw === '') return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatEscalationYearShort(value) {
  const n = Number(String(value ?? '').replaceAll(/\D/g, ''));
  return Number.isFinite(n) && n > 0 ? `${n} Y` : '';
}

const toFormDefaultsFromAgreement = (agreement) => {
  if (!agreement) return defaultAgreementValues;

  return {
    ...defaultAgreementValues,
    client: agreement.client ?? '',
    center: agreement.center ?? '',
    space: Array.isArray(agreement.space)
      ? agreement.space
          .map((s) => (typeof s === 'object' && s?.space != null ? s.space : s))
          .filter(Boolean)
      : [],
    no_of_monthly_deposit: agreement.no_of_monthly_deposit ?? undefined,
    notice_period_client: getNumericPrefix(agreement.notice_period_of_client),
    notice_period_devx: getNumericPrefix(agreement.notice_period_of_devx),
    agreement_start_date: agreement.agreement_start_date ?? '',
    annual_escalation: getNumericPrefix(agreement.annual_escalation),
    escalation_years: agreement.escalation_years != null ? String(agreement.escalation_years) : '',
    payment_due_day: agreement.payment_due_day ?? '',
    membership_plan: Array.isArray(agreement.membership_plan)
      ? agreement.membership_plan
          .map((plan) => (typeof plan === 'object' ? plan?.plans : plan))
          .filter(Boolean)
      : (agreement.membership_plan ?? undefined),
    notes: agreement.notes ?? '',
  };
};

// Status options are dynamic; prefer fetching from API.
const MEMBERSHIP_OPTIONS = AGREEMENTS_FILTER_MEMBERSHIP_PLAN_OPTIONS;

const AgreementViewDrawer = ({
  mode = 'client',
  isOpen = false,
  onClose,
  agreementId = null,
  onCreateAmendment,
  onFieldUpdate,
  onAddComment,
  onRefreshComments,
  commentsData = {},
  commentsLoading = false,
  commentsFetchStatus = 'idle',
  permissions = {},
}) => {
  const dispatch = useDispatch();
  const { data: centerListData } = useSelector((state) => state.center.centerListData);
  const { agreementDetail, agreementDetailLoading, agreementDetailError, clientCentersSpaceList } =
    useSelector((state) => state.agreements);
  const {
    control,
    reset,
    watch,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(agreementsSchema),
    defaultValues: defaultAgreementValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
  });
  const watchAgreementStartDate = watch('agreement_start_date');
  const watchRentStartDate = watch('rent_start_date');
  const watchAgreementEndDate = watch('agreement_end_date');
  const watchLockInEndDate = watch('lock_in_end_date');
  const watchIncrementDate = watch('increment_date');

  const canEdit = Boolean(permissions.canEdit);
  const agreement = React.useMemo(() => {
    if (!agreementId) return null;
    if (
      !agreementDetail ||
      (agreementDetail.name !== agreementId &&
        agreementDetail.name != null &&
        String(agreementDetail.name) !== String(agreementId))
    ) {
      return null;
    }
    return normalizeAgreementDetail(agreementDetail);
  }, [agreementId, agreementDetail]);

  const [localChanges, setLocalChanges] = useState({});
  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef(null);
  const [isDrawerFullyOpen, setIsDrawerFullyOpen] = useState(false);
  const [agreementSubscribers, setAgreementSubscribers] = useState([]);
  const [agreementSubscribed, setAgreementSubscribed] = useState(false);
  const [agreementSubscribersLoading, setAgreementSubscribersLoading] = useState(false);
  const isLandlordMode = mode === 'landlord';

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const fetchLatest = async () => {
      try {
        const opts = await getStatusOptions({ doctype: 'Agreement', field: 'status' });
        if (!cancelled) setDynamicStatusOptions(Array.isArray(opts) ? opts : []);
      } catch {
        if (!cancelled) setDynamicStatusOptions([]);
      }
    };

    fetchLatest();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const refreshAgreementSubscribers = useCallback(async () => {
    if (!isOpen) return;
    if (agreementId == null || agreementId === '') return;
    const ref = String(agreementId);
    setAgreementSubscribersLoading(true);
    try {
      const [status, list] = await Promise.all([
        getSubscriptionStatus('Agreement', ref),
        listDocumentSubscribers('Agreement', ref),
      ]);
      setAgreementSubscribed(Boolean(status?.subscribed));
      setAgreementSubscribers(Array.isArray(list) ? list : []);
    } catch {
      // keep existing list on failure
    } finally {
      setAgreementSubscribersLoading(false);
    }
  }, [isOpen, agreementId]);

  const agreementSubscriberSyncKey = React.useMemo(() => {
    if (!agreement) return '';
    return `${String(agreement.name ?? agreementId ?? '')}::${String(agreement.modified ?? '')}`;
  }, [agreement, agreementId]);

  const getApiVal = React.useCallback(
    (apiKey, fallback = '') => {
      if (hasOwn(localChanges, apiKey)) return localChanges[apiKey];
      const v = agreement?.[apiKey];
      if (apiKey === 'escalation_years' && v != null) {
        return String(v);
      }
      return v ?? fallback;
    },
    [agreement, localChanges],
  );

  // Get the center name for the agreement based on the center/office code to display in the drawer
  const displayCenterName = React.useMemo(() => {
    const centerCode = agreement?.center ?? '';
    if (!centerCode) return '--';
    const list = centerListData || [];
    const found = list.find(
      (c) =>
        (c.name && String(c.name) === String(centerCode)) ||
        (c.id && String(c.id) === String(centerCode)),
    );
    return found ? (found.center_name ?? found.name ?? found.id ?? centerCode) : centerCode;
  }, [centerListData, agreement, localChanges, isLandlordMode]);

  /** Client center spaces from thunk: `{ data: Space[], isLoading, error }` or legacy nested `data.data`. */
  const spaceList = React.useMemo(() => {
    const root = clientCentersSpaceList?.data;
    if (Array.isArray(root)) return root;
    if (root && Array.isArray(root.data)) return root.data;
    return [];
  }, [clientCentersSpaceList?.data]);

  const displaySpaceNames = React.useMemo(() => {
    if (!agreement?.space || !Array.isArray(agreement.space)) return [];
    const spaceIds = agreement.space
      .map((s) => (typeof s === 'object' && s?.space != null ? s.space : s))
      .filter(Boolean);
    if (spaceIds.length === 0) return [];
    return spaceIds.map((id) => {
      const sp = findCatalogSpaceRow(spaceList, id);
      return sp?.space_name ?? sp?.name ?? id;
    });
  }, [agreement, spaceList]);

  const spaceIds = React.useMemo(() => {
    if (!agreement?.space || !Array.isArray(agreement.space)) return [];
    return agreement.space
      .map((s) => (typeof s === 'object' && s?.space != null ? s.space : s))
      .filter(Boolean);
  }, [agreement]);

  const membershipPlans = React.useMemo(
    () => membershipPlanValues(agreement?.membership_plan),
    [agreement],
  );

  const amenitiesSplit = React.useMemo(() => {
    const list = Array.isArray(agreement?.amenities_details) ? agreement.amenities_details : [];
    const included = [];
    const excluded = [];
    list.forEach((a, i) => {
      const item = {
        id: String(a?.name ?? a?.amenity_name ?? i),
        name: a?.amenity_name ?? '',
        remark: a?.remarks ?? '',
      };
      if (Number(a?.included) === 1) included.push(item);
      else excluded.push(item);
    });
    return { included, excluded };
  }, [agreement]);

  /** Per-space rows for client view; uses `agreement.space_details` when API provides it, else derives from combined fields. */
  const clientSpaceViewEntries = React.useMemo(() => {
    if (isLandlordMode || !agreement) return [];

    const detailPatches = localChanges.spaceDetailMetrics ?? {};
    const detailsFromApi =
      Array.isArray(localChanges.space) && localChanges.space.length > 0
        ? localChanges.space
        : Array.isArray(agreement.space) && agreement.space.length > 0
          ? agreement.space
          : Array.isArray(localChanges.space_details) && localChanges.space_details.length > 0
            ? localChanges.space_details
            : Array.isArray(agreement.space_details)
              ? agreement.space_details
              : [];
    if (detailsFromApi.length > 0) {
      return detailsFromApi.map((d, i) => {
        const id = resolveSpaceRowKey(d, i) || String(spaceIds[i] ?? `space-${i}`);
        const spCatalog = findCatalogSpaceRow(spaceList, id);
        const fromRow = membershipPlanValuesFromSpaceDetailRow(d);
        const fromCatalog = spCatalog ? membershipPlanValues(spCatalog) : [];
        const a = membershipPlans;
        const plans = (() => {
          if (fromRow.length > 0) return fromRow;
          if (fromCatalog.length > 0) return fromCatalog;
          if (a.length === 0) return [];
          if (detailsFromApi.length === 1) return [...a];
          const atIndex =
            i < a.length && a[i] != null && String(a[i]).trim() !== '' ? String(a[i]).trim() : '';
          if (a.length === detailsFromApi.length && atIndex) return [atIndex];
          if (atIndex) return [atIndex];
          if (a.length === 1 && a[0] != null && String(a[0]).trim() !== '') {
            return [String(a[0]).trim()];
          }
          return [];
        })();
        const displayName =
          d.space_name ??
          d.space_display_name ??
          (typeof d.space === 'object' && d.space != null
            ? d.space.space_name || d.space.name
            : undefined) ??
          displaySpaceNames[i] ??
          (id ? String(id) : '--');

        const patch = detailPatches[id] ?? {};
        const pick = (key, fallback) => (hasOwn(patch, key) ? patch[key] : fallback);

        return {
          id,
          displayName,
          membershipPlans: plans,
          useAgreementLevelMetrics: false,
          no_of_seats: pick('no_of_seats', d.no_of_seats),
          area: pick('area', d.area),
          price_per_seat: pick('price_per_seat', d.price_per_seat),
          monthly_revenue: pick('monthly_revenue', d.monthly_revenue),
          security_deposit_amount: pick('security_deposit_amount', d.security_deposit_amount),
          rent_start_date: pick('rent_start_date', d.rent_start_date),
          agreement_end_date: pick('agreement_end_date', d.agreement_end_date),
          lock_in_period: pick('lock_in_period', d.lock_in_period),
          lock_in_end_date: pick('lock_in_end_date', d.lock_in_end_date),
          increment_date: pick('increment_date', d.increment_date),
        };
      });
    }

    const names = displaySpaceNames;
    if (names.length === 0) return [];

    const plans = membershipPlans;
    const fallbackMetrics = {
      no_of_seats: getApiVal('no_of_seats'),
      area: getApiVal('area'),
      price_per_seat: getApiVal('price_per_seat'),
      monthly_revenue: getApiVal('monthly_revenue'),
    };

    return names.map((displayName, i) => {
      let cardPlans = [];
      if (plans.length === names.length) {
        cardPlans = plans[i] ? [plans[i]] : [];
      } else if (names.length === 1 && plans.length > 1) {
        cardPlans = [...plans];
      } else if (names.length === 1 && plans.length === 1) {
        cardPlans = [plans[0]];
      } else if (plans.length > 0) {
        const atIndex =
          i < plans.length && plans[i] != null && String(plans[i]).trim() !== ''
            ? String(plans[i]).trim()
            : '';
        if (atIndex) cardPlans = [atIndex];
        else if (plans.length === 1 && plans[0] != null && String(plans[0]).trim() !== '') {
          cardPlans = [String(plans[0]).trim()];
        }
      }
      const sid = String(spaceIds[i] ?? '');
      if (cardPlans.length === 0 && sid) {
        const fromCat = membershipPlanValues(findCatalogSpaceRow(spaceList, sid));
        if (fromCat.length > 0) cardPlans = fromCat;
      }

      return {
        id: String(spaceIds[i] ?? `space-${i}`),
        displayName,
        membershipPlans: cardPlans,
        useAgreementLevelMetrics: true,
        ...fallbackMetrics,
      };
    });
  }, [
    agreement,
    displaySpaceNames,
    getApiVal,
    isLandlordMode,
    localChanges.space,
    localChanges.space_details,
    localChanges.spaceDetailMetrics,
    membershipPlans,
    spaceIds,
    spaceList,
  ]);

  useEffect(() => {
    // When start date changes, re-validate dependent date fields
    // so cross-field superRefine errors show/clear immediately
    trigger(DATE_VALIDATION_FIELDS);
  }, [
    watchAgreementStartDate,
    watchRentStartDate,
    watchAgreementEndDate,
    watchLockInEndDate,
    watchIncrementDate,
    trigger,
  ]);

  useEffect(() => {
    if (isOpen) {
      dispatch(getCenterListThunk({ keyword: '', filters: [], pageSize: 999 }));
    }
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (isOpen && agreementId) {
      dispatch(getAgreementByIdThunk(agreementId));
    }
  }, [isOpen, agreementId, dispatch]);

  useEffect(() => {
    if (!agreementDetail) return;
    setLocalChanges((prev) => {
      if (prev == null || (!prev.space && !prev.space_details)) return prev;
      const next = { ...prev };
      delete next.space;
      delete next.space_details;
      return next;
    });
  }, [agreementDetail]);

  // Get the space list for the agreement based on the center to display the space names in the drawer
  useEffect(() => {
    if (isLandlordMode) return;
    if (!isOpen || !agreement?.center || !agreement?.client) return;
    dispatch(
      getClientCentersSpaceListThunk({
        centerId: agreement.center,
        customerId: agreement.client,
      }),
    );
  }, [isOpen, agreement?.center, agreement?.client, dispatch, isLandlordMode]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setIsDrawerFullyOpen(true), 300);
      return () => clearTimeout(t);
    }
    setIsDrawerFullyOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !agreementId) {
      setLocalChanges({});
      return;
    }
    setLocalChanges({});
  }, [isOpen, agreementId]);

  useEffect(() => {
    setAgreementSubscribers([]);
    setAgreementSubscribed(false);
  }, [agreementId]);

  useEffect(() => {
    if (!isOpen || !agreementSubscriberSyncKey) return;
    refreshAgreementSubscribers();
  }, [isOpen, agreementSubscriberSyncKey, refreshAgreementSubscribers]);

  useEffect(() => {
    if (!isOpen || !agreementId) {
      reset(defaultAgreementValues);
      return;
    }

    if (!agreement) return;

    const nextValues = toFormDefaultsFromAgreement(agreement);
    const optimisticDateValues = {
      ...(hasOwn(localChanges, 'agreement_start_date')
        ? { agreement_start_date: localChanges.agreement_start_date }
        : {}),
      ...(hasOwn(localChanges, 'rent_start_date')
        ? { rent_start_date: localChanges.rent_start_date }
        : {}),
      ...(hasOwn(localChanges, 'agreement_end_date')
        ? { agreement_end_date: localChanges.agreement_end_date }
        : {}),
      ...(hasOwn(localChanges, 'lock_in_end_date')
        ? { lock_in_end_date: localChanges.lock_in_end_date }
        : {}),
      ...(hasOwn(localChanges, 'increment_date')
        ? { increment_date: localChanges.increment_date }
        : {}),
    };

    reset({ ...nextValues, ...optimisticDateValues });
  }, [isOpen, agreementId, agreement, localChanges, reset]);

  // When agreementDetail is updated (e.g. after refetch post-update), clear local changes so UI shows server state
  // useEffect(() => {
  //   if (!agreementId || !agreementDetail) return;
  //   const nameMatch =
  //     agreementDetail.name === agreementId ||
  //     String(agreementDetail.name) === String(agreementId);
  //   if (!nameMatch) return;
  //   setLocalChanges({});
  // }, [agreementDetail, agreementId]);

  const handleFieldChange = useCallback(
    (apiKey, value) => {
      if (!permissions?.canEdit) return;
      setLocalChanges((prev) => ({ ...prev, [apiKey]: value }));
      onFieldUpdate?.(agreement, apiKey, value);
    },
    [agreement, onFieldUpdate, permissions?.canEdit],
  );

  const commitSpaceDetailMetric = useCallback(
    (entryId, field, raw) => {
      if (!agreement || !permissions?.canEdit || isLandlordMode) return;

      let nextVal = raw;
      // Numeric fields
      if (
        [
          'no_of_seats',
          'area',
          'price_per_seat',
          'monthly_revenue',
          'security_deposit_amount',
          'lock_in_period',
        ].includes(field)
      ) {
        const trimmed = raw === '' || raw == null ? '' : String(raw).trim();
        const parsed = trimmed === '' ? '' : Number(trimmed);
        nextVal = parsed === '' || Number.isNaN(Number(parsed)) ? '' : Number(parsed);
      }

      // Agreement space detail fields mapping
      const details = Array.isArray(agreement.space)
        ? agreement.space.map((row) => ({ ...row }))
        : Array.isArray(agreement.space_details)
          ? agreement.space_details.map((row) => ({ ...row }))
          : [];

      if (details.length === 0) return;

      const idx = details.findIndex((row, i) => resolveSpaceRowKey(row, i) === String(entryId));
      if (idx === -1) return;

      const updated = [...details];
      updated[idx] = { ...updated[idx], [field]: nextVal };

      setLocalChanges((prev) => {
        const prevMetrics = prev.spaceDetailMetrics;
        const nextMetrics = prevMetrics ? { ...prevMetrics } : {};
        const existing = nextMetrics[entryId];
        if (existing) {
          const em = { ...existing };
          delete em[field];
          if (Object.keys(em).length === 0) delete nextMetrics[entryId];
          else nextMetrics[entryId] = em;
        }
        const fieldKey =
          Array.isArray(agreement.space) && agreement.space.length > 0 ? 'space' : 'space_details';
        return { ...prev, [fieldKey]: updated, spaceDetailMetrics: nextMetrics };
      });

      const fieldKey =
        Array.isArray(agreement.space) && agreement.space.length > 0 ? 'space' : 'space_details';
      onFieldUpdate?.(agreement, fieldKey, updated);
    },
    [agreement, isLandlordMode, onFieldUpdate, permissions?.canEdit],
  );

  /** Same row, multiple fields (e.g. price_per_seat + derived monthly_revenue) in one local + API update. */
  const commitSpaceDetailMetrics = useCallback(
    (entryId, patch) => {
      if (!agreement || !permissions?.canEdit || isLandlordMode) return;
      if (!patch || typeof patch !== 'object') return;

      const numericFieldSet = new Set([
        'no_of_seats',
        'area',
        'price_per_seat',
        'monthly_revenue',
        'security_deposit_amount',
        'lock_in_period',
      ]);

      const details = Array.isArray(agreement.space)
        ? agreement.space.map((row) => ({ ...row }))
        : Array.isArray(agreement.space_details)
          ? agreement.space_details.map((row) => ({ ...row }))
          : [];

      if (details.length === 0) return;

      const idx = details.findIndex((row, i) => resolveSpaceRowKey(row, i) === String(entryId));
      if (idx === -1) return;

      const updated = [...details];
      let nextRow = { ...updated[idx] };
      for (const [field, raw] of Object.entries(patch)) {
        let nextVal = raw;
        if (numericFieldSet.has(field)) {
          const trimmed = raw === '' || raw == null ? '' : String(raw).trim();
          const parsed = trimmed === '' ? '' : Number(trimmed);
          nextVal = parsed === '' || Number.isNaN(Number(parsed)) ? '' : Number(parsed);
        }
        nextRow = { ...nextRow, [field]: nextVal };
      }
      updated[idx] = nextRow;

      setLocalChanges((prev) => {
        const prevM = prev.spaceDetailMetrics;
        const nextM = prevM ? { ...prevM } : {};
        const ex = nextM[entryId];
        if (ex) {
          const em = { ...ex };
          for (const f of Object.keys(patch)) {
            delete em[f];
          }
          if (Object.keys(em).length === 0) delete nextM[entryId];
          else nextM[entryId] = em;
        }
        const fieldKey =
          Array.isArray(agreement.space) && agreement.space.length > 0 ? 'space' : 'space_details';
        return { ...prev, [fieldKey]: updated, spaceDetailMetrics: nextM };
      });

      const fieldKey =
        Array.isArray(agreement.space) && agreement.space.length > 0 ? 'space' : 'space_details';
      onFieldUpdate?.(agreement, fieldKey, updated);
    },
    [agreement, isLandlordMode, onFieldUpdate, permissions?.canEdit],
  );

  const handleValidatedDateChange = useCallback(
    async (apiKey, date, fieldOnChange) => {
      const nextValue = date ?? undefined;
      const nextApiValue = date ? formatDateToYYYYMMDD(date) : '';

      fieldOnChange(nextValue);
      setLocalChanges((prev) => ({ ...prev, [apiKey]: nextApiValue }));

      const datesValid = await trigger(DATE_VALIDATION_FIELDS);
      if (!datesValid) return;

      handleFieldChange(apiKey, nextApiValue);
    },
    [handleFieldChange, trigger],
  );

  const landlordOfficeShopLabels = useMemo(() => {
    if (!isLandlordMode) return [];
    const raw = Object.prototype.hasOwnProperty.call(localChanges, 'office')
      ? localChanges.office
      : agreement?.office;
    return parseCommaSeparatedShopLabels(raw);
  }, [isLandlordMode, agreement?.office, localChanges]);

  if (!isOpen) return null;

  const agreementName = agreement?.name || '--';
  const agreementTitle = isLandlordMode
    ? agreement?.landlord_name || agreement?.landlord || agreement?.client || '--'
    : agreement?.client || '--';
  const statusValue = getApiVal('status', '');
  const statusBadge = getStatusBadge(statusValue);
  const selectedStatusOption = dynamicStatusOptions.find(
    (o) => String(o.value).trim() === String(statusValue || '').trim(),
  );
  const statusPillLabel = selectedStatusOption?.label ?? statusBadge.label;
  const statusPillColor =
    selectedStatusOption?.color ?? agreement?.status_color ?? agreement?.statusColor ?? null;
  const membershipValue = membershipPlans[0] ?? '';
  const membershipBadge = getMembershipBadge(membershipValue);
  const rocValue = getApiVal('roc', '');
  const isRoc = rocValue ? 'Yes' : 'No';
  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => open === false && onClose?.()}>
      <Drawer.Content className='max-w-[1200px]'>
        <Drawer.Header
          className='px-6 py-3 border-b border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-center justify-end w-full'>
            {!isDrawerFullyOpen || !agreement ? (
              <>
                <div className='h-8 w-48 bg-bg-weak-100 rounded animate-pulse' />
                <div className='flex items-center gap-2'>
                  <div className='h-8 w-28 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='h-8 w-8 bg-bg-weak-100 rounded animate-pulse' />
                </div>
              </>
            ) : (
              <>
                <div className='flex items-center gap-3'>
                  {agreement?.name ? (
                    <DocumentFollowersPopover
                      referenceDoctype='Agreement'
                      referenceName={String(agreement.name)}
                      followers={agreementSubscribers}
                      subscribed={agreementSubscribed}
                      subscribersLoading={agreementSubscribersLoading}
                      onRefreshSubscribers={refreshAgreementSubscribers}
                      canManageOthers={canEdit}
                      internalOnlySearch
                    />
                  ) : null}
                  {/* {onCreateAmendment && (
                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      className='gap-1 p-1.5 pr-2 label-small'
                      onClick={() => onCreateAmendment(agreement)}
                    >
                      <RiAddLine size={20} /> Create Amendment
                    </Button.Root>
                  )} */}
                  <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onClose}>
                    <Button.Icon as={RiCloseLine} />
                  </Button.Root>
                </div>
              </>
            )}
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex-1 p-0 overflow-hidden flex flex-col'>
          {!isDrawerFullyOpen ? (
            <div className='flex items-center justify-center flex-1 p-8'>
              <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
            </div>
          ) : agreementId && agreementDetailLoading && !agreement ? (
            <div className='flex items-center justify-center flex-1 p-8'>
              <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
            </div>
          ) : agreementDetailError && agreementId ? (
            <div className='flex flex-col items-center justify-center flex-1 p-8 gap-2'>
              <span className='text-paragraph-sm text-error-darker'>{agreementDetailError}</span>
            </div>
          ) : agreementId && !agreement ? (
            <div className='flex items-center justify-center flex-1 p-8'>
              <span className='text-paragraph-sm text-text-sub-600'>Agreement not found.</span>
            </div>
          ) : !agreementId ? (
            <div className='flex items-center justify-center flex-1 p-8'>
              <span className='text-paragraph-sm text-text-sub-600'>No agreement selected.</span>
            </div>
          ) : !agreement ? (
            <div className='flex items-center justify-center flex-1 p-8'>
              <span className='text-paragraph-sm text-text-sub-600'>Loading…</span>
            </div>
          ) : (
            <div className='flex flex-1 min-h-0'>
              {/* Left Panel - Agreement Details */}
              <div className='w-[420px] border-r border-stroke-soft-200 overflow-y-auto shrink-0'>
                <div className='px-6 pt-5 pb-6 flex flex-col gap-3'>
                  <div>
                    <span className='ring-1 ring-stroke-soft-200 rounded-xl px-2 py-0.5 label-xsmall text-[var(--color-text-sub-500)]'>
                      {agreementName}
                    </span>
                  </div>
                  <div className='flex flex-col gap-4'>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <h2 className='title-h5 text-text-strong-950 truncate cursor-default'>
                          {agreementTitle}
                        </h2>
                      </Tooltip.Trigger>
                      <Tooltip.Content side='top' size='xsmall'>
                        {agreementTitle}
                      </Tooltip.Content>
                    </Tooltip.Root>

                    <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                      <FieldRow icon={RiPriceTag3Line} label='Status'>
                        {/* <Select.Root
                          variant='borderless'
                          value={statusValue || ''}
                          onValueChange={(v) => handleFieldChange('status', v)}
                          size='xsmall'
                        >
                          <Select.Trigger className='w-full' showArrow={false}>
                            <>
                              <StatusColorPill
                                value={statusPillLabel}
                                color={statusPillColor}
                                className='max-w-full text-nowrap'
                              />
                              <span className='hidden'>
                                <Select.Value />
                              </span>
                            </>
                          </Select.Trigger>
                          <Select.Content>
                            {dynamicStatusOptions.map((opt) => (
                              <Select.Item key={opt.value} value={opt.value}>
                                <StatusColorPill
                                  value={opt.label}
                                  color={opt.color}
                                  className='max-w-full'
                                />
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root> */}
                        <Badge.Root
                          variant='light'
                          color={statusBadge.color}
                          className='text-nowrap ml-2'
                        >
                          {statusBadge.label}
                        </Badge.Root>
                      </FieldRow>

                      <FieldRow icon={RiBuilding2Line} label='Center'>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <span className='text-paragraph-sm text-text-sub-600 truncate block w-full cursor-default'>
                              {isLandlordMode
                                ? String(getApiVal('center_name') ?? '').trim() || displayCenterName
                                : displayCenterName}
                            </span>
                          </Tooltip.Trigger>
                          <Tooltip.Content side='top' size='xsmall'>
                            {isLandlordMode
                              ? String(getApiVal('center_name') ?? '').trim() || displayCenterName
                              : displayCenterName}
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </FieldRow>

                      {isLandlordMode ? (
                        <FieldRow icon={RiBuilding2Line} label='Office'>
                          <div className='flex min-h-9 flex-wrap items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1.5'>
                            {landlordOfficeShopLabels.length === 0 ? (
                              <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
                                --
                              </span>
                            ) : (
                              landlordOfficeShopLabels.map((s, i) => (
                                <Badge.Root
                                  key={`${s}-${i}`}
                                  variant='lighter'
                                  color='gray'
                                  size='medium'
                                >
                                  <span className='paragraph-small font-medium whitespace-nowrap text-text-strong-950'>
                                    {s}
                                  </span>
                                </Badge.Root>
                              ))
                            )}
                          </div>
                        </FieldRow>
                      ) : null}

                      {isLandlordMode && (
                        <>
                          <FieldRow icon={RiInformationLine} label='Landlord'>
                            <Tooltip.Root>
                              <Tooltip.Trigger asChild>
                                <span className='text-paragraph-sm text-text-sub-600 truncate block w-full cursor-default'>
                                  {agreement?.landlord_name || agreement?.landlord || '--'}
                                </span>
                              </Tooltip.Trigger>
                              <Tooltip.Content side='top' size='xsmall'>
                                {agreement?.landlord_name || agreement?.landlord || '--'}
                              </Tooltip.Content>
                            </Tooltip.Root>
                          </FieldRow>
                          <FieldRow icon={RiInformationLine} label='SPOC Name'>
                            <Tooltip.Root>
                              <Tooltip.Trigger asChild>
                                <span className='text-paragraph-sm text-text-sub-600 truncate block w-full cursor-default'>
                                  {agreement?.spoc_name || '--'}
                                </span>
                              </Tooltip.Trigger>
                              <Tooltip.Content side='top' size='xsmall'>
                                {agreement?.spoc_name || '--'}
                              </Tooltip.Content>
                            </Tooltip.Root>
                          </FieldRow>
                          <FieldRow icon={RiInformationLine} label='SPOC Contact No.'>
                            <span className='text-paragraph-sm text-text-sub-600'>
                              {agreement?.spoc_contact || '--'}
                            </span>
                          </FieldRow>
                          <FieldRow icon={RiInformationLine} label='SPOC Email'>
                            <Tooltip.Root>
                              <Tooltip.Trigger asChild>
                                <span className='text-paragraph-sm text-text-sub-600 truncate block w-full cursor-default'>
                                  {agreement?.spoc_email || '--'}
                                </span>
                              </Tooltip.Trigger>
                              <Tooltip.Content side='top' size='xsmall'>
                                {agreement?.spoc_email || '--'}
                              </Tooltip.Content>
                            </Tooltip.Root>
                          </FieldRow>
                        </>
                      )}

                      {!isLandlordMode && (
                        <FieldRow
                          icon={RiShieldLine}
                          label='No. of M. Deposit'
                          editable={canEdit && !isLandlordMode}
                        >
                          <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                            <Input.Wrapper>
                              <Input.Input
                                type='number'
                                inputMode='numeric'
                                value={getApiVal('no_of_monthly_deposit') ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? '' : Number(e.target.value);
                                  setLocalChanges((p) => ({ ...p, no_of_monthly_deposit: v }));
                                }}
                                onBlur={(e) => {
                                  const v = e.target.value === '' ? '' : Number(e.target.value);
                                  handleFieldChange(
                                    'no_of_monthly_deposit',
                                    Number.isNaN(Number(v)) ? '' : v,
                                  );
                                }}
                                readOnly={!canEdit}
                                placeholder='--'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </FieldRow>
                      )}

                      <FieldRow
                        icon={RiCalendarLine}
                        label='Agreement Start Date'
                        editable={canEdit && !isLandlordMode}
                      >
                        <Controller
                          name='agreement_start_date'
                          control={control}
                          render={({ field }) => (
                            <Datepicker
                              variant='borderless'
                              value={toPickerDate(field.value)}
                              onChange={(date) =>
                                handleValidatedDateChange(
                                  'agreement_start_date',
                                  date,
                                  field.onChange,
                                )
                              }
                              disabled={!canEdit}
                              placeholder='--'
                              formatDate={formatDDMMYY}
                              hasError={!!errors.agreement_start_date}
                              size='xsmall'
                            />
                          )}
                        />
                        {errors.agreement_start_date?.message ? (
                          <ErrorText>{errors.agreement_start_date.message}</ErrorText>
                        ) : null}
                      </FieldRow>

                      {isLandlordMode && (
                        <>
                          <FieldRow
                            icon={RiCalendarLine}
                            label='Rent Start Date'
                            editable={canEdit}
                          >
                            <Datepicker
                              variant='borderless'
                              value={toPickerDate(
                                getApiVal(
                                  'landlord_rent_start_date',
                                  agreement?.landlord_rent_start_date ?? agreement?.rent_start_date,
                                ),
                              )}
                              onChange={(date) =>
                                handleFieldChange(
                                  'landlord_rent_start_date',
                                  date ? formatDateToYYYYMMDD(date) : '',
                                )
                              }
                              disabled={!canEdit}
                              placeholder='--'
                              formatDate={formatDDMMYY}
                              size='xsmall'
                            />
                          </FieldRow>
                          <FieldRow
                            icon={RiCalendarLine}
                            label='Agreement End Date'
                            editable={canEdit}
                          >
                            <Datepicker
                              variant='borderless'
                              value={toPickerDate(
                                getApiVal(
                                  'landlord_agreement_end_date',
                                  agreement?.landlord_agreement_end_date ??
                                    agreement?.agreement_end_date,
                                ),
                              )}
                              onChange={(date) =>
                                handleFieldChange(
                                  'landlord_agreement_end_date',
                                  date ? formatDateToYYYYMMDD(date) : '',
                                )
                              }
                              disabled={!canEdit}
                              placeholder='--'
                              formatDate={formatDDMMYY}
                              size='xsmall'
                            />
                          </FieldRow>
                          <FieldRow
                            icon={RiCalendarLine}
                            label='Lock in End Date'
                            editable={canEdit}
                          >
                            <Datepicker
                              variant='borderless'
                              value={toPickerDate(
                                getApiVal(
                                  'landlord_lock_in_end_date',
                                  agreement?.landlord_lock_in_end_date ??
                                    agreement?.lock_in_end_date,
                                ),
                              )}
                              onChange={(date) =>
                                handleFieldChange(
                                  'landlord_lock_in_end_date',
                                  date ? formatDateToYYYYMMDD(date) : '',
                                )
                              }
                              disabled={!canEdit}
                              placeholder='--'
                              formatDate={formatDDMMYY}
                              size='xsmall'
                            />
                          </FieldRow>
                          <FieldRow icon={RiTimeLine} label='Lock in Period' editable={canEdit}>
                            <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                              <Input.Wrapper>
                                <Input.Input
                                  inputMode='numeric'
                                  value={monthsInputDisplay(
                                    getApiVal(
                                      'landlord_lock_in_period',
                                      agreement?.landlord_lock_in_period ??
                                        agreement?.lock_in_period,
                                    ),
                                  )}
                                  onChange={(e) =>
                                    setLocalChanges((p) => ({
                                      ...p,
                                      landlord_lock_in_period: e.target.value,
                                    }))
                                  }
                                  onBlur={(e) => {
                                    const v = e.target.value.trim();
                                    handleFieldChange(
                                      'landlord_lock_in_period',
                                      v ? `${v} Months` : '',
                                    );
                                  }}
                                  readOnly={!canEdit}
                                  placeholder='--'
                                />
                                <Input.Affix>MONTH</Input.Affix>
                              </Input.Wrapper>
                            </Input.Root>
                          </FieldRow>
                        </>
                      )}

                      {!isLandlordMode && (
                        <FieldRow
                          icon={RiCalendarEventLine}
                          label='Payment Due Day'
                          editable={canEdit && !isLandlordMode}
                        >
                          <SearchableSelect
                            variant='borderless'
                            value={String(getApiVal('payment_due_day') ?? '')}
                            onValueChange={(v) =>
                              handleFieldChange('payment_due_day', v ? Number(v) : '')
                            }
                            disabled={!canEdit}
                            size='xsmall'
                            options={PAYMENT_DUE_DAYS.map((day) => ({
                              value: String(day),
                              label: formatOrdinal(day),
                            }))}
                            placeholder='--'
                            showArrow={false}
                            isolateSearchKeyboard
                          />
                        </FieldRow>
                      )}

                      {!isLandlordMode && (
                        <FieldRow
                          icon={RiArrowUpLine}
                          label='Annual Escalation'
                          editable={canEdit && !isLandlordMode}
                        >
                          <div className='flex w-full min-h-0 rounded-lg ring-1 ring-inset ring-stroke-soft-200 divide-x divide-stroke-soft-200 bg-bg-white-0'>
                            <Input.Root
                              variant='borderless'
                              size='xsmall'
                              className='min-h-0 flex-[3] min-w-0 rounded-none'
                            >
                              <Input.Wrapper className='w-full'>
                                <Input.Input
                                  type='text'
                                  inputMode='decimal'
                                  value={
                                    typeof getApiVal('annual_escalation') === 'string'
                                      ? getApiVal('annual_escalation').replaceAll('%', '')
                                      : (getApiVal('annual_escalation') ?? '')
                                  }
                                  onChange={(e) =>
                                    setLocalChanges((p) => ({
                                      ...p,
                                      annual_escalation: e.target.value,
                                    }))
                                  }
                                  onBlur={(e) => {
                                    const v = e.target.value.trim();
                                    handleFieldChange('annual_escalation', v ? `${v}%` : '');
                                  }}
                                  readOnly={!canEdit}
                                  placeholder='--'
                                />
                                <Input.Affix>%</Input.Affix>
                              </Input.Wrapper>
                            </Input.Root>
                            <div className='flex-[2.5] flex min-w-0 items-center justify-center bg-bg-white-0'>
                              <Select.Root
                                variant='borderless'
                                size='xsmall'
                                value={
                                  getApiVal('escalation_years') != null &&
                                  getApiVal('escalation_years') !== ''
                                    ? String(getApiVal('escalation_years')).replaceAll(/\D/g, '')
                                    : ''
                                }
                                onValueChange={(v) =>
                                  handleFieldChange('escalation_years', v ? Number(v) : '')
                                }
                                disabled={!canEdit}
                              >
                                <Select.Trigger
                                  className='w-full h-full border-none shadow-none focus:ring-0 focus:border-none focus:shadow-none bg-transparent hover:bg-transparent pl-2 pr-1'
                                  showArrow={canEdit}
                                >
                                  <Select.Value placeholder='Year'>
                                    {formatEscalationYearShort(getApiVal('escalation_years'))}
                                  </Select.Value>
                                </Select.Trigger>
                                <Select.Content className='min-w-[120px]'>
                                  {ESCALATION_YEAR_OPTIONS.map((year) => (
                                    <Select.Item key={year} value={String(year)}>
                                      {`${year} Year`}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
                            </div>
                          </div>
                        </FieldRow>
                      )}

                      <FieldRow
                        icon={RiTimeLine}
                        label={isLandlordMode ? 'Notice Period ' : 'Notice Period of Client'}
                        editable={canEdit && !isLandlordMode}
                        truncate
                      >
                        <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                          <Input.Wrapper>
                            <Input.Input
                              // type='number'
                              inputMode='numeric'
                              value={
                                typeof getApiVal('notice_period_of_client') === 'string'
                                  ? getApiVal('notice_period_of_client')
                                      .replace(/\s*months?/i, '')
                                      .trim()
                                  : (getApiVal('notice_period_of_client') ?? '')
                              }
                              onChange={(e) =>
                                setLocalChanges((p) => ({
                                  ...p,
                                  notice_period_of_client: e.target.value,
                                }))
                              }
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                handleFieldChange(
                                  'notice_period_of_client',
                                  v ? `${v} Months` : '',
                                );
                              }}
                              readOnly={!canEdit}
                              placeholder='--'
                            />
                            <Input.Affix>MONTH</Input.Affix>
                          </Input.Wrapper>
                        </Input.Root>
                      </FieldRow>

                      {!isLandlordMode && (
                        <FieldRow
                          icon={RiTimeLine}
                          label='Notice Period of DevX'
                          editable={canEdit && !isLandlordMode}
                        >
                          <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                            <Input.Wrapper>
                              <Input.Input
                                // type='number'
                                inputMode='numeric'
                                value={
                                  typeof getApiVal('notice_period_of_devx') === 'string'
                                    ? getApiVal('notice_period_of_devx')
                                        .replace(/\s*months?/i, '')
                                        .trim()
                                    : (getApiVal('notice_period_of_devx') ?? '')
                                }
                                onChange={(e) =>
                                  setLocalChanges((p) => ({
                                    ...p,
                                    notice_period_of_devx: e.target.value,
                                  }))
                                }
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  handleFieldChange(
                                    'notice_period_of_devx',
                                    v ? `${v} Months` : '',
                                  );
                                }}
                                readOnly={!canEdit}
                                placeholder='--'
                              />
                              <Input.Affix>MONTH</Input.Affix>
                            </Input.Wrapper>
                          </Input.Root>
                        </FieldRow>
                      )}

                      {isLandlordMode && (
                        <FieldRow
                          icon={RiBuilding2Line}
                          label='Allocated Parking'
                          editable={canEdit}
                        >
                          <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                            <Input.Wrapper>
                              <Input.Input
                                value={getApiVal('parking') ?? ''}
                                onChange={(e) =>
                                  setLocalChanges((p) => ({ ...p, parking: e.target.value }))
                                }
                                onBlur={(e) => handleFieldChange('parking', e.target.value.trim())}
                                readOnly={!canEdit}
                                placeholder='--'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </FieldRow>
                      )}

                      <FieldRow icon={RiFileUploadLine} label='ROC'>
                        {/* <Select.Root
                          variant='borderless'
                          value={isRoc ? 'Yes' : 'No'}
                          onValueChange={(v) => handleFieldChange('roc', v === 'Yes')}
                          size='xsmall'
                        >
                          <Select.Trigger className='w-full' showArrow={false}>
                            <Select.Value>{isRoc ? 'Yes' : 'No'}</Select.Value>
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value='Yes'>Yes</Select.Item>
                            <Select.Item value='No'>No</Select.Item>
                          </Select.Content>
                        </Select.Root> */}
                        <span className='text-paragraph-sm text-text-sub-600'>{isRoc}</span>
                      </FieldRow>

                      {agreement?.parent_agreement_id && (
                        <FieldRow icon={RiFileLine} label='Change Type'>
                          {/* <Select.Root
                            variant='borderless'
                            value={rocValue ?? ''}
                            onValueChange={(v) => handleFieldChange('roc', v)}
                            size='xsmall'
                          >
                            <Select.Trigger className='w-full' showArrow={false}>
                              <Select.Value>{rocValue}</Select.Value>
                            </Select.Trigger>
                            <Select.Content>
                              {AGREEMENTS_CHANGE_TYPE_OPTIONS.map((opt) => (
                                <Select.Item key={opt.value} value={opt.value}>
                                  {opt.label}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root> */}
                          <span className='text-paragraph-sm text-text-sub-600'>{rocValue}</span>
                        </FieldRow>
                      )}
                    </div>

                    {!isLandlordMode && clientSpaceViewEntries.length > 0 && (
                      <AgreementViewSpaceSection
                        key={agreementName}
                        entries={clientSpaceViewEntries}
                        canEdit={canEdit}
                        setLocalChanges={setLocalChanges}
                        handleFieldChange={handleFieldChange}
                        onCommitSpaceDetailMetric={commitSpaceDetailMetric}
                        onCommitSpaceDetailMetrics={commitSpaceDetailMetrics}
                      />
                    )}

                    {!isLandlordMode && (
                      <AgreementViewAmenitiesSection
                        included={amenitiesSplit.included}
                        excluded={amenitiesSplit.excluded}
                        onCommit={(nextAmenities) =>
                          handleFieldChange('amenities_details', nextAmenities)
                        }
                      />
                    )}

                    {/* Agreement Documents */}
                    <div className='flex flex-col gap-2'>
                      {(() => {
                        const docs = Array.isArray(agreement?.agreement_document)
                          ? agreement.agreement_document
                          : [];
                        const hasDocs = docs.length > 0;

                        const getDocLabel = (doc) => {
                          const url = doc?.agreement_document;
                          if (typeof url === 'string') {
                            const name = url.split('/').pop() || '';
                            try {
                              return decodeURIComponent(name) || name || 'Document';
                            } catch {
                              return name || 'Document';
                            }
                          }
                          return doc?.name ? `Document ${doc.name}` : 'Document';
                        };

                        const handleUploadFiles = () => {
                          if (!permissions?.canEdit) return;
                          fileInputRef.current?.click();
                        };

                        const handleFilesSelected = async (event) => {
                          const input = event.target;
                          const files = [...(input.files || [])].filter((f) => f instanceof File);
                          if (files.length === 0 || !agreementName || agreementName === '--')
                            return;
                          if (!permissions?.canEdit) return;

                          try {
                            setIsUploading(true);
                            await dispatch(
                              addAgreementAttachmentThunk({
                                agreement_id: agreementName,
                                files,
                              }),
                            ).unwrap();
                            await dispatch(getAgreementByIdThunk(agreementName));
                            onRefreshComments?.();
                          } catch (error) {
                            console.error('Failed to upload agreement attachments:', error);
                          } finally {
                            setIsUploading(false);
                            if (input) {
                              input.value = '';
                            }
                          }
                        };

                        return (
                          <>
                            <div className='flex items-center justify-between gap-2'>
                              <div className='flex items-center gap-2'>
                                <RiFileLine className='text-text-sub-500' size={20} />
                                <span className='label-medium text-text-sub-500'>
                                  Agreement Documents
                                </span>
                              </div>
                              {!hasDocs && permissions?.canEdit && (
                                <Button.Root
                                  variant='neutral'
                                  mode='stroke'
                                  size='xsmall'
                                  className='gap-1'
                                  type='button'
                                  onClick={handleUploadFiles}
                                  disabled={isUploading}
                                >
                                  <Button.Icon as={RiFileUploadLine} />
                                  <span className='text-label-sm'>
                                    {isUploading ? 'Uploading…' : 'Upload Files'}
                                  </span>
                                </Button.Root>
                              )}
                              <input
                                ref={fileInputRef}
                                type='file'
                                multiple
                                className='hidden'
                                onChange={handleFilesSelected}
                              />
                            </div>

                            {hasDocs ? (
                              <AttachmentList
                                attachments={docs.map((doc, idx) => ({
                                  id: doc.name || doc.file_id || `agreement-doc-${idx}`,
                                  fileName: getDocLabel(doc),
                                  fileUrl: doc.agreement_document,
                                  createdAt: doc.modified || doc.creation,
                                  size: doc.file_size || doc.file_size_bytes || 0,
                                  childRowId: doc.file_id || doc.name,
                                }))}
                                onRemove={
                                  permissions?.canEdit || permissions?.canDelete
                                    ? async (_id, fileId) => {
                                        if (!permissions?.canEdit && !permissions?.canDelete)
                                          return;
                                        const finalFileId = fileId || _id;
                                        if (!finalFileId) return;
                                        try {
                                          await dispatch(
                                            deleteAgreementAttachmentThunk({
                                              file_id: finalFileId,
                                            }),
                                          ).unwrap();
                                          if (agreementName && agreementName !== '--') {
                                            await dispatch(getAgreementByIdThunk(agreementName));
                                            onRefreshComments?.();
                                          }
                                        } catch (error) {
                                          console.error(
                                            'Failed to delete agreement attachment:',
                                            error,
                                          );
                                        }
                                      }
                                    : undefined
                                }
                                emptyStateMessage='No documents attached.'
                                emptyStateDescription=''
                              />
                            ) : (
                              <div className='rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-5 py-4'>
                                <p className='text-paragraph-sm text-text-sub-600'>
                                  No documents attached.
                                </p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Notes — below Agreement Documents; API field `notes` */}
                    <div className='flex flex-col gap-2 '>
                      <div className='flex items-center gap-2'>
                        <RiStickyNoteLine className='text-text-sub-500' size={20} />
                        <span className='label-medium text-text-sub-500'>Notes</span>
                      </div>
                      <Textarea.Root
                        // variant='undersline'
                        simple
                        className='w-full min-h-[65px]'
                        value={getApiVal('notes') ?? ''}
                        onChange={(e) => setLocalChanges((p) => ({ ...p, notes: e.target.value }))}
                        onBlur={(e) => handleFieldChange('notes', e.target.value)}
                        readOnly={!canEdit}
                        placeholder='Type here...'
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel - Comments */}
              <div className='flex flex-1 flex-col min-w-0 overflow-hidden'>
                <div className='px-6 py-3 border-b border-stroke-soft-200 flex flex-row items-center gap-2'>
                  <RiStickyNoteLine size={20} color='#868C98' />
                  <span className='label-medium text-text-sub-500'>Comments</span>
                </div>
                <div className='flex-1 overflow-y-auto min-h-0'>
                  <AgreementComments
                    agreementId={agreementId ?? agreement?.name ?? agreement?.id}
                    commentsData={commentsData}
                    onAddComment={permissions?.canEdit ? onAddComment : undefined}
                    onRefreshData={onRefreshComments}
                    loading={commentsLoading}
                    fetchStatus={commentsFetchStatus}
                  />
                </div>
              </div>
            </div>
          )}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default AgreementViewDrawer;
