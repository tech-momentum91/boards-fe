import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { State } from 'country-state-city';
import {
  RiArrowLeftSLine,
  RiInformationLine,
  RiInformationFill,
  RiFileListLine,
  RiFileListFill,
  RiMapPin2Line,
  RiStoreLine,
  RiUserReceivedLine,
  RiUserReceivedFill,
  RiFile2Line,
  RiFile2Fill,
  RiUserStarLine,
  RiUserStarFill,
} from 'react-icons/ri';

import PageLayout from '@/components/page-layout';
import VendorDetailRatingTab from '@/components/vendors-management/vendor-detail-rating/vendor-detail-rating-tab';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import ContactCards from '@/components/ui/contact-cards';
import VendorBills from '@/components/vendors-management/vendors-view-content/vendors-detail-billings-tab';
import VendorDetailOnboardingTab from '@/components/vendors-management/vendors-view-content/vendors-detail-onboarding-tab';
import AddVendorContactModal from '@/components/vendors-management/add-vendor-contact-modal';
import {
  getVendorDetailThunk,
  resetVendorDetail,
  selectVendorDetail,
  selectVendorLocalChanges,
  getVendorFieldValue,
  updateVendorFieldThunk,
  deleteVendorContactThunk,
  setVendorLocalChange,
  clearVendorLocalChanges,
  getVendorOpexCategoriesThunk,
  selectVendorOpexCategories,
} from '@/redux/vendorSlice';
import { showSuccessToast, showErrorToast, extractErrorMessage } from '@/utils/error-utils';
import {
  buildVendorCentersPutPayload,
  buildVendorMappingPutValue,
  coerceSelectDisplayValue,
  getVendorDetailServerDisplayValue,
  getVendorEffectiveStateIso,
  getVendorIndianCityOptions,
  getCategoriesMissingSubcategories,
  isVendorApplyAllCenters,
  mergeVendorCityIntoOptions,
  normalizeVendorDetailRecord,
  selectedCenterIdsFromVendorData,
  sortVendorStateOptions,
  vendorCenterSelectionsAreEqual,
  vendorMappingToCategorySelections,
} from '@/utils/vendor-utils';
import {
  getVendorStatusBadge,
  VENDOR_MAIN_TAB_ORDER,
  VENDOR_OPEX_TRIGGER_BADGE_MAX,
  VENDOR_DETAIL_TAB_READ_MODULE,
  VENDOR_STATUS_OPTIONS,
} from '@/components/vendors-management/constants';
import {
  useCanReadDetailTab,
  useClampActiveTabToPermitted,
} from '@/hooks/use-detail-tab-permissions';
import { VendorOpexCategorySubcategoryMultiselect } from '@/components/vendors-management/vendor-opex-category-subcategory-multiselect';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import VendorsDetailDocumentTab from '@/components/vendors-management/vendors-view-content/vendors-detail-document-tab';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import { cn } from '@/utils/cn';
import * as Tooltip from '@/components/ui/tooltip';
import { toStatusFilterOptions, useStatusOptions } from '@/hooks/use-status-options';

/** Partner detail pattern: inline borderless select with unknown-value merge. */
const InlineSelectField = ({
  value = '',
  options = [],
  onSave,
  renderTriggerValue,
  disabled = false,
}) => {
  const normalizedValue = coerceSelectDisplayValue(value);
  const optionsForSelect = useMemo(() => {
    if (!normalizedValue) return options;
    const hasMatch = options.some(
      (opt) =>
        String(opt?.value || '')
          .trim()
          .toLowerCase() === normalizedValue.toLowerCase() ||
        String(opt?.label || '')
          .trim()
          .toLowerCase() === normalizedValue.toLowerCase(),
    );
    if (hasMatch) return options;
    return [{ value: normalizedValue, label: normalizedValue }, ...options];
  }, [options, normalizedValue]);

  const matchedOptionByValue = optionsForSelect.find(
    (opt) =>
      String(opt?.value || '')
        .trim()
        .toLowerCase() === normalizedValue.toLowerCase(),
  );
  const matchedOptionByLabel = optionsForSelect.find(
    (opt) =>
      String(opt?.label || '')
        .trim()
        .toLowerCase() === normalizedValue.toLowerCase(),
  );
  const resolvedOption = matchedOptionByValue || matchedOptionByLabel;
  const selectValue = resolvedOption?.value || '';
  const displayLabel = resolvedOption?.label || (normalizedValue ? normalizedValue : 'Select');

  return (
    <SearchableSelect
      variant='borderless'
      value={selectValue}
      onValueChange={(next) => {
        if (next === selectValue) return;
        onSave?.(next);
      }}
      size='xsmall'
      disabled={disabled}
      options={optionsForSelect}
      placeholder='Select'
      triggerClassName='w-full -ml-2 text-left'
      showArrow={false}
      renderTrigger={() => {
        if (renderTriggerValue) {
          return renderTriggerValue(displayLabel);
        }
        return <span className='text-label-sm text-text-main-900'>{displayLabel}</span>;
      }}
    />
  );
};

function renderVendorCentersDropdownSummary({ selectedCenters, normalizedCenters }) {
  if (!selectedCenters?.length) {
    return <span className='truncate text-label-sm text-text-strong-950'>No centers selected</span>;
  }

  const idSet = new Set(normalizedCenters.map((c) => c.id));
  const isAllCenters =
    normalizedCenters.length > 0 &&
    selectedCenters.length === normalizedCenters.length &&
    selectedCenters.every((id) => idSet.has(id));

  if (isAllCenters) {
    const inner = (
      <Badge.Root size='small' variant='light' color='gray' className='max-w-full'>
        <span className='block min-w-0 truncate'>All Centers</span>
      </Badge.Root>
    );
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className='min-w-0 max-w-full cursor-default'>{inner}</div>
        </Tooltip.Trigger>
        <Tooltip.Content side='bottom' className='max-w-sm break-words'>
          Vendor applies to every center.
        </Tooltip.Content>
      </Tooltip.Root>
    );
  }

  const rows = selectedCenters
    .map((cid) => normalizedCenters.find((c) => c.id === cid))
    .filter(Boolean)
    .map((c) => ({
      name: c.label,
      code: c.center_code ? String(c.center_code).trim() || null : null,
    }));

  if (rows.length === 0) {
    return (
      <span className='truncate text-label-sm text-text-strong-950'>
        {selectedCenters.length} Centers
      </span>
    );
  }

  const visibleRows = rows.slice(0, VENDOR_OPEX_TRIGGER_BADGE_MAX);
  const overflowRows = rows.slice(VENDOR_OPEX_TRIGGER_BADGE_MAX);
  const overflowCount = overflowRows.length;

  return (
    <div className='flex min-w-0 max-w-full flex-wrap items-center gap-2'>
      {visibleRows.map((row, index) => (
        <Badge.Root
          key={`${row.name}-${row.code ?? index}`}
          variant='lighter'
          color='gray'
          size='medium'
          className='max-w-[min(100%,10rem)]'
        >
          <span className='paragraph-small block min-w-0 truncate font-medium text-text-strong-950'>
            {row.name}
          </span>
          {row.code ? (
            <span className='paragraph-small shrink-0 text-text-sub-400'>({row.code})</span>
          ) : null}
        </Badge.Root>
      ))}
      {overflowCount > 0 ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Badge.Root
              variant='lighter'
              color='gray'
              size='medium'
              className='shrink-0 cursor-default'
            >
              <span className='text-label-xs font-semibold text-text-strong-950'>
                +{overflowCount}
              </span>
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
            <div className='flex flex-col gap-1'>
              <span className='mb-1 text-paragraph-sm font-medium text-text-strong-950'>
                Additional centers ({overflowCount})
              </span>
              {overflowRows.map((center, index) => (
                <div key={index} className='text-paragraph-sm text-text-sub-600'>
                  {center.name}
                  {center.code ? (
                    <span className='ml-1 text-text-sub-400'>({center.code})</span>
                  ) : null}
                </div>
              ))}
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      ) : null}
    </div>
  );
}

const VendorCentersEditor = ({ vendorData, vendorId, dispatch, fullWidth = true }) => {
  const centerAccess = useSelector(selectCenterAccess);
  const centerAccessData = Array.isArray(centerAccess.data) ? centerAccess.data : [];
  const centersLoading = centerAccess.status === 'loading';

  const [applyAll, setApplyAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const lastSyncedSignatureRef = useRef('');

  const allCenterIds = useMemo(
    () => centerAccessData.map((c) => c?.name).filter(Boolean),
    [centerAccessData],
  );

  const dropdownSelected = useMemo(() => {
    if (applyAll && allCenterIds.length > 0) return allCenterIds;
    return selectedIds;
  }, [applyAll, allCenterIds, selectedIds]);

  const serverSignature = vendorData
    ? `${vendorId}|${vendorData.modified ?? ''}|${String(vendorData.custom_apply_to_all_centers ?? '')}|${JSON.stringify(vendorData.selected_centers ?? null)}`
    : '';

  useEffect(() => {
    lastSyncedSignatureRef.current = '';
  }, [vendorId]);

  useEffect(() => {
    if (!vendorData || !serverSignature) return;
    if (lastSyncedSignatureRef.current === serverSignature) return;
    lastSyncedSignatureRef.current = serverSignature;
    setApplyAll(isVendorApplyAllCenters(vendorData));
    setSelectedIds(selectedCenterIdsFromVendorData(vendorData));
  }, [serverSignature, vendorData, vendorId]);

  const persist = async (nextIds) => {
    if (!vendorId || saving) return;

    const ids = Array.isArray(nextIds) ? nextIds.map(String).filter(Boolean) : [];
    if (ids.length === 0) {
      showErrorToast('Select at least one center, or choose All Centers.');
      return;
    }

    if (centerAccessData.length === 0) {
      showErrorToast('Center directory is still loading. Please wait.');
      return;
    }

    const payload = buildVendorCentersPutPayload(ids, centerAccessData);
    if (!payload) return;

    setSaving(true);
    try {
      const result = await dispatch(updateVendorFieldThunk({ vendorId, payload }));
      if (updateVendorFieldThunk.rejected.match(result)) {
        showErrorToast(result.payload, { defaultMessage: 'Failed to update centers.' });
        setApplyAll(isVendorApplyAllCenters(vendorData));
        setSelectedIds(selectedCenterIdsFromVendorData(vendorData));
        return;
      }
      showSuccessToast('Centers updated.');
      await dispatch(getVendorDetailThunk(vendorId));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={
        fullWidth
          ? 'col-span-2 flex flex-col gap-2'
          : 'flex min-w-0 w-full max-w-full flex-col gap-2'
      }
    >
      <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Centers</div>
      <EditableFieldWrapper editable iconClassName='mr-2'>
        <div className={cn('flex flex-col gap-3 py-1', saving && 'pointer-events-none opacity-60')}>
          <CenterAccessDropdown
            centers={centerAccessData}
            selectedCenters={dropdownSelected}
            renderSelectedSummary={renderVendorCentersDropdownSummary}
            onChange={(ids) => {
              const arr = Array.isArray(ids) ? [...new Set(ids.map(String).filter(Boolean))] : [];

              if (arr.length === 0) {
                showErrorToast('Select at least one center, or choose All Centers.');
                return;
              }

              const baselineEffective =
                applyAll && allCenterIds.length > 0
                  ? [...allCenterIds]
                  : [...selectedIds].map(String).filter(Boolean);

              if (vendorCenterSelectionsAreEqual(arr, baselineEffective)) {
                return;
              }

              const isFullSelection =
                allCenterIds.length > 0 &&
                arr.length === allCenterIds.length &&
                allCenterIds.every((cid) => arr.includes(cid));

              if (isFullSelection) {
                setApplyAll(true);
                setSelectedIds([]);
              } else {
                setApplyAll(false);
                setSelectedIds(arr);
              }
              persist(arr);
            }}
            isLoading={centersLoading}
            className='w-full min-w-0'
          />
        </div>
      </EditableFieldWrapper>
    </div>
  );
};

const VendorInlineTextField = ({
  label,
  fieldName,
  vendor,
  localChanges,
  dispatch,
  handleFieldChange,
  placeholder,
}) => (
  <div className='flex flex-col gap-1'>
    <div className='text-paragraph-sm opacity-72 text-text-sub-500'>{label}</div>
    <EditableFieldWrapper editable={true} iconClassName='mr-2'>
      <Input.Root variant='borderless' size='xsmall' className='-ml-2 w-full'>
        <Input.Wrapper>
          <Input.Input
            value={getVendorFieldValue(vendor, localChanges, fieldName) || ''}
            onChange={(e) => dispatch(setVendorLocalChange({ fieldName, value: e.target.value }))}
            onBlur={(e) => handleFieldChange(fieldName, e.target.value.trim())}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            className='w-full bg-transparent text-paragraph-sm text-text-strong-950'
          />
        </Input.Wrapper>
      </Input.Root>
    </EditableFieldWrapper>
  </div>
);

const VendorLocationStateCity = ({
  labelCls,
  normalizedVendor,
  localChanges,
  sortedStateOptions,
  citySelectOptions,
  effectiveStateIso,
  onStateChange,
  onCityChange,
}) => {
  const stateIsoSaved = getVendorFieldValue(normalizedVendor, localChanges, 'state') || '';
  const cityVal = getVendorFieldValue(normalizedVendor, localChanges, 'city') || '';
  return (
    <>
      <div className='flex flex-col gap-1'>
        <div className={labelCls}>State</div>
        <EditableFieldWrapper editable iconClassName='mr-2'>
          <InlineSelectField
            value={stateIsoSaved}
            options={sortedStateOptions}
            onSave={onStateChange}
          />
        </EditableFieldWrapper>
      </div>
      <div className='flex flex-col gap-1'>
        <div className={labelCls}>City</div>
        <EditableFieldWrapper editable iconClassName='mr-2'>
          <InlineSelectField
            value={cityVal}
            options={citySelectOptions}
            onSave={onCityChange}
            disabled={!effectiveStateIso}
          />
        </EditableFieldWrapper>
      </div>
    </>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const VendorDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const vendorDetail = useSelector(selectVendorDetail);

  const stateOptions = useMemo(
    () => State.getStatesOfCountry('IN').map((s) => ({ value: s.isoCode, label: s.name })),
    [],
  );

  const normalizedVendor = useMemo(
    () => normalizeVendorDetailRecord(vendorDetail.data, stateOptions),
    [vendorDetail.data, stateOptions],
  );
  const localChanges = useSelector(selectVendorLocalChanges);
  const sortedVendorStateOptions = useMemo(
    () => sortVendorStateOptions(stateOptions),
    [stateOptions],
  );
  const vendorEffectiveStateIso = useMemo(
    () => getVendorEffectiveStateIso(normalizedVendor, localChanges),
    [normalizedVendor, localChanges],
  );
  const vendorCitySelectOptions = useMemo(
    () =>
      mergeVendorCityIntoOptions(
        getVendorIndianCityOptions(vendorEffectiveStateIso),
        getVendorFieldValue(normalizedVendor, localChanges, 'city'),
      ),
    [vendorEffectiveStateIso, normalizedVendor, localChanges],
  );
  const centerAccess = useSelector(selectCenterAccess);
  const { options: vendorStatusMasterOptions } = useStatusOptions({
    doctype: 'Supplier',
    field: 'custom_vendor_status',
  });
  const vendorStatusSelectOptions = useMemo(() => {
    const fromConfig = toStatusFilterOptions(vendorStatusMasterOptions);
    return fromConfig.length > 0 ? fromConfig : VENDOR_STATUS_OPTIONS;
  }, [vendorStatusMasterOptions]);

  useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [dispatch, centerAccess.status]);

  const vendorOpexCategoriesState = useSelector(selectVendorOpexCategories);
  const categoryData = Array.isArray(vendorOpexCategoriesState?.data)
    ? vendorOpexCategoriesState.data
    : [];
  const categoryOpexStatus = vendorOpexCategoriesState?.status ?? 'idle';

  const [mappingCategories, setMappingCategories] = useState([]);
  const [mappingSubCategories, setMappingSubCategories] = useState([]);
  const [vendorCategorySavePending, setVendorCategorySavePending] = useState(false);
  const categoryMappingSyncedRef = useRef('');
  const isSavingRef = useRef(false);
  const setVendorCategorySaving = useCallback((value) => {
    isSavingRef.current = value;
    setVendorCategorySavePending(value);
  }, []);
  /** Radix Tabs sometimes invokes `onValueChange` twice per click; collapse duplicate blocking toasts. */
  const vendorNavBlockToastAtRef = useRef(0);

  useEffect(() => {
    if (categoryOpexStatus === 'idle') {
      dispatch(getVendorOpexCategoriesThunk());
    }
  }, [dispatch, categoryOpexStatus]);

  const categoryMappingSyncSig = useMemo(
    () =>
      vendorDetail.data
        ? `${id}|${vendorDetail.data.modified ?? ''}|${JSON.stringify(vendorDetail.data.custom_vendor_category_mapping ?? null)}`
        : '',
    [id, vendorDetail.data],
  );

  useEffect(() => {
    categoryMappingSyncedRef.current = '';
  }, [id]);

  useEffect(() => {
    if (!vendorDetail.data || categoryMappingSyncedRef.current === categoryMappingSyncSig) return;
    categoryMappingSyncedRef.current = categoryMappingSyncSig;
    const next = vendorMappingToCategorySelections(
      vendorDetail.data.custom_vendor_category_mapping,
    );
    setMappingCategories(next.categories);
    setMappingSubCategories(next.subCategories);
  }, [categoryMappingSyncSig, vendorDetail.data]);

  // ── Local UI state ────────────────────────────────────────────────────────
  const getTabFromSearchParams = useMemo(() => {
    const raw = String(searchParams.get('tab') || '')
      .trim()
      .toLowerCase();
    return VENDOR_MAIN_TAB_ORDER.includes(raw) ? raw : 'about';
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState(getTabFromSearchParams);
  const [aboutSidebar, setAboutSidebar] = useState('basic');

  const canReadVendorTab = useCanReadDetailTab(VENDOR_DETAIL_TAB_READ_MODULE);
  const permittedMainTabIds = useMemo(
    () => VENDOR_MAIN_TAB_ORDER.filter((id) => canReadVendorTab(id)),
    [canReadVendorTab],
  );
  useClampActiveTabToPermitted(activeTab, setActiveTab, permittedMainTabIds);

  // Contact modal
  const [addVendorContactModalOpen, setAddVendorContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (id) {
      dispatch(getVendorDetailThunk(id));
    }
    return () => dispatch(resetVendorDetail());
  }, [dispatch, id]);

  useEffect(() => {
    dispatch(clearVendorLocalChanges());
  }, [id, dispatch]);

  // Keep active tab persistent across refresh via `?tab=<value>`
  useEffect(() => {
    const nextTab = getTabFromSearchParams;
    setActiveTab(nextTab);
  }, [getTabFromSearchParams]);

  const vendorName =
    getVendorFieldValue(normalizedVendor, localChanges, 'vendor_name') ||
    normalizedVendor?.name ||
    'Vendor Details';
  const vendorStatus = getVendorFieldValue(normalizedVendor, localChanges, 'status') || 'Active';
  const contacts = normalizedVendor?.contacts || [];

  const categoryMappingInvalid = useMemo(() => {
    if (!normalizedVendor) return false;
    if (!mappingCategories?.length) return true;
    return (
      getCategoriesMissingSubcategories(mappingSubCategories, mappingCategories, categoryData)
        .length > 0
    );
  }, [normalizedVendor, mappingCategories, mappingSubCategories, categoryData]);

  /** Same messages as header back — shown only when leaving About / vendor detail, not on dropdown blur. */
  const showCategoryMappingBlockingToast = useCallback(() => {
    if (!mappingCategories?.length) {
      showErrorToast('Select at least one category.');
      return;
    }
    const missing = getCategoriesMissingSubcategories(
      mappingSubCategories,
      mappingCategories,
      categoryData,
    );
    showErrorToast(
      missing.length > 0
        ? `Select at least one sub-category for: ${missing.join(', ')}`
        : 'Complete category and sub-category selection.',
    );
  }, [mappingCategories, mappingSubCategories, categoryData]);

  const emitVendorNavBlockToast = useCallback((run) => {
    const now = performance.now();
    if (now - vendorNavBlockToastAtRef.current < 650) return;
    vendorNavBlockToastAtRef.current = now;
    run();
  }, []);

  const persistVendorCategoryMapping = useCallback(async () => {
    const vendorId = normalizedVendor?.name || normalizedVendor?.id || id;
    if (!vendorId || !vendorDetail.data || isSavingRef.current) return;

    if (mappingCategories.length === 0) {
      return;
    }
    const missing = getCategoriesMissingSubcategories(
      mappingSubCategories,
      mappingCategories,
      categoryData,
    );
    if (missing.length > 0) {
      return;
    }

    const baseline = vendorMappingToCategorySelections(
      vendorDetail.data.custom_vendor_category_mapping,
    );
    const setEq = (a, b) =>
      a.length === b.length && a.every((x) => b.includes(x)) && b.every((x) => a.includes(x));
    if (
      setEq(mappingCategories, baseline.categories) &&
      setEq(mappingSubCategories, baseline.subCategories)
    ) {
      return;
    }

    setVendorCategorySaving(true);
    try {
      const value = buildVendorMappingPutValue(
        mappingSubCategories,
        categoryData,
        vendorDetail.data.custom_vendor_category_mapping,
      );
      const result = await dispatch(
        updateVendorFieldThunk({
          vendorId,
          fieldName: 'custom_vendor_category_mapping',
          value,
        }),
      );
      if (updateVendorFieldThunk.rejected.match(result)) {
        showErrorToast(result.payload, { defaultMessage: 'Failed to update categories.' });
        const reset = vendorMappingToCategorySelections(
          vendorDetail.data.custom_vendor_category_mapping,
        );
        setMappingCategories(reset.categories);
        setMappingSubCategories(reset.subCategories);
        return;
      }
      showSuccessToast('Categories updated.');
      await dispatch(getVendorDetailThunk(id));
    } finally {
      setVendorCategorySaving(false);
    }
  }, [
    id,
    dispatch,
    normalizedVendor,
    vendorDetail.data,
    mappingCategories,
    mappingSubCategories,
    categoryData,
    setVendorCategorySaving,
  ]);

  /** State is set but city is empty — mandatory pair (e.g. after changing state). Block leaving until city is chosen. */
  const mustSelectCity = useMemo(() => {
    if (!normalizedVendor) return false;
    const stateIso = getVendorEffectiveStateIso(normalizedVendor, localChanges);
    const cityVal = getVendorFieldValue(normalizedVendor, localChanges, 'city');
    const hasState = Boolean(stateIso && String(stateIso).trim());
    const hasCity = Boolean(cityVal && String(cityVal).trim());
    return hasState && !hasCity;
  }, [normalizedVendor, localChanges]);

  const handleTabChange = useCallback(
    (next) => {
      const nextTab = String(next || '').trim();
      if (!VENDOR_MAIN_TAB_ORDER.includes(nextTab)) return;
      if (nextTab === activeTab) return;

      if (nextTab !== 'about' && (mustSelectCity || categoryMappingInvalid)) {
        emitVendorNavBlockToast(() => {
          if (mustSelectCity) {
            showErrorToast('Please select a city.');
          } else {
            showCategoryMappingBlockingToast();
          }
        });
        return;
      }

      setActiveTab(nextTab);
      setSearchParams((prev) => {
        const sp = new URLSearchParams(prev);
        sp.set('tab', nextTab);
        return sp;
      });
    },
    [
      activeTab,
      mustSelectCity,
      categoryMappingInvalid,
      showCategoryMappingBlockingToast,
      emitVendorNavBlockToast,
      setSearchParams,
    ],
  );

  const blockVendorLeaveNavigation = mustSelectCity || categoryMappingInvalid;

  useEffect(() => {
    if (!blockVendorLeaveNavigation) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [blockVendorLeaveNavigation]);

  /** BrowserRouter has no useBlocker; block same-origin navigations via anchor clicks (sidebar Links). */
  useEffect(() => {
    if (!blockVendorLeaveNavigation) return undefined;

    const handleCaptureClick = (event) => {
      const anchor = event.target.closest?.('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.download) return;
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
      } catch {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (mustSelectCity || categoryMappingInvalid) {
        emitVendorNavBlockToast(() => {
          if (mustSelectCity) {
            showErrorToast('Please select a city.');
          } else {
            showCategoryMappingBlockingToast();
          }
        });
      }
    };

    document.addEventListener('click', handleCaptureClick, true);
    return () => document.removeEventListener('click', handleCaptureClick, true);
  }, [
    blockVendorLeaveNavigation,
    mustSelectCity,
    categoryMappingInvalid,
    showCategoryMappingBlockingToast,
    emitVendorNavBlockToast,
  ]);

  const handleFieldChange = async (fieldName, value) => {
    if (!id) return;

    if (fieldName === 'state') return;

    // Validation
    if (fieldName === 'city' && !value?.trim()) {
      showErrorToast('City name is required.');
      dispatch(setVendorLocalChange({ fieldName: 'city', value: normalizedVendor.city || '' }));
      return;
    }

    const vendorId = normalizedVendor?.name || normalizedVendor?.id || id;

    let payloadFieldName = fieldName;
    if (fieldName === 'vendor_name') payloadFieldName = 'supplier_name';
    if (fieldName === 'status') payloadFieldName = 'disabled';
    if (fieldName === 'city') payloadFieldName = 'custom_based_city';
    if (fieldName === 'address') payloadFieldName = 'custom_address';

    let payloadValue = value;
    if (fieldName === 'status') {
      payloadValue = value === 'Active' ? 0 : 1;
    }

    const serverValue = getVendorDetailServerDisplayValue(normalizedVendor, fieldName);
    if (String(serverValue) === String(value ?? '')) return;

    dispatch(setVendorLocalChange({ fieldName, value }));

    const result = await dispatch(
      updateVendorFieldThunk({ vendorId, fieldName: payloadFieldName, value: payloadValue }),
    );

    if (updateVendorFieldThunk.rejected.match(result)) {
      dispatch(setVendorLocalChange({ fieldName, value: null }));
      showErrorToast(result.payload, {
        defaultMessage: 'Failed to update vendor field. Please try again.',
      });
      return;
    }

    await dispatch(getVendorDetailThunk(id));
  };

  const handleStateChange = async (nextIso) => {
    if (!id || !normalizedVendor) return;
    const vendorId = normalizedVendor.name || normalizedVendor.id || id;
    const current = getVendorFieldValue(normalizedVendor, localChanges, 'state');
    if (String(current || '') === String(nextIso || '')) return;

    const trimmed = String(nextIso || '').trim();
    dispatch(setVendorLocalChange({ fieldName: 'state', value: trimmed }));
    dispatch(setVendorLocalChange({ fieldName: 'city', value: '' }));

    const result = await dispatch(
      updateVendorFieldThunk({
        vendorId,
        payload: {
          state: trimmed,
          custom_state: trimmed,
          custom_based_city: '',
        },
      }),
    );

    if (updateVendorFieldThunk.rejected.match(result)) {
      dispatch(setVendorLocalChange({ fieldName: 'state', value: null }));
      dispatch(setVendorLocalChange({ fieldName: 'city', value: null }));
      showErrorToast(result.payload, {
        defaultMessage: 'Failed to update state. Please try again.',
      });
      return;
    }

    showSuccessToast('State updated.');
    await dispatch(getVendorDetailThunk(id));
    dispatch(setVendorLocalChange({ fieldName: 'state', value: null }));
    dispatch(setVendorLocalChange({ fieldName: 'city', value: null }));
  };

  const handleCityChange = async (nextCity) => {
    if (!id || !normalizedVendor) return;
    if (!nextCity?.trim()) {
      showErrorToast('City is required.');
      return;
    }
    const stateIso = getVendorEffectiveStateIso(normalizedVendor, localChanges);
    if (!stateIso) {
      showErrorToast('Select a state first.');
      return;
    }

    const vendorId = normalizedVendor.name || normalizedVendor.id || id;
    const trimmed = nextCity.trim();
    const serverValue = getVendorDetailServerDisplayValue(normalizedVendor, 'city');
    if (String(serverValue) === String(trimmed)) return;

    dispatch(setVendorLocalChange({ fieldName: 'city', value: trimmed }));
    const result = await dispatch(
      updateVendorFieldThunk({
        vendorId,
        fieldName: 'custom_based_city',
        value: trimmed,
      }),
    );

    if (updateVendorFieldThunk.rejected.match(result)) {
      dispatch(setVendorLocalChange({ fieldName: 'city', value: null }));
      showErrorToast(result.payload, {
        defaultMessage: 'Failed to update city. Please try again.',
      });
      return;
    }

    showSuccessToast('City updated.');
    await dispatch(getVendorDetailThunk(id));
    dispatch(setVendorLocalChange({ fieldName: 'city', value: null }));
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setAddVendorContactModalOpen(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setAddVendorContactModalOpen(true);
  };
  const handleDeleteContact = async (contact) => {
    const contactId = contact?.originalContact?.name;

    if (!contactId || !id) {
      showErrorToast('Unable to delete contact');
      return;
    }

    try {
      const result = await dispatch(deleteVendorContactThunk({ vendorId: id, contactId }));

      if (deleteVendorContactThunk.rejected.match(result)) {
        const errorMessage = extractErrorMessage(result.payload || result.error);
        showErrorToast(errorMessage || 'Failed to delete contact.');
        return;
      }

      showSuccessToast('Contact deleted successfully.');
      await dispatch(getVendorDetailThunk(id));
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  };

  return (
    <PageLayout showDefaultHeader={false}>
      <div className='flex h-full w-full flex-col'>
        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div className='pt-5 pb-[14px] pl-8 pr-8 w-full bg-bg-white-0'>
          <div className='flex items-center justify-between gap-3 w-full'>
            <div className='flex items-center gap-4'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                aria-label='Back'
                onClick={() => {
                  if (categoryMappingInvalid) {
                    showCategoryMappingBlockingToast();
                    return;
                  }
                  if (mustSelectCity) {
                    showErrorToast('Please select a city.');
                    return;
                  }
                  navigate('/vendors');
                }}
              >
                <Button.Icon as={RiArrowLeftSLine} size={20} />
              </Button.Root>

              <div className='flex flex-col'>
                {/* Inline-editable vendor name in the header */}
                <EditableFieldWrapper editable={true} iconClassName='mr-2' className='w-full'>
                  <Input.Root variant='borderless' size='xsmall' className='-ml-2 w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        value={
                          getVendorFieldValue(normalizedVendor, localChanges, 'vendor_name') || ''
                        }
                        onChange={(e) =>
                          dispatch(
                            setVendorLocalChange({
                              fieldName: 'vendor_name',
                              value: e.target.value,
                            }),
                          )
                        }
                        onBlur={(e) => handleFieldChange('vendor_name', e.target.value.trim())}
                        placeholder='Vendor name'
                        className='w-full text-label-md text-text-strong-950 bg-transparent'
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </EditableFieldWrapper>

                <div className='w-full'>
                  <EditableFieldWrapper editable={true} iconClassName='mr-2' className='w-full'>
                    <SearchableSelect
                      variant='borderless'
                      value={getVendorFieldValue(normalizedVendor, localChanges, 'status')}
                      onValueChange={(value) => handleFieldChange('status', value)}
                      size='xsmall'
                      options={vendorStatusSelectOptions}
                      triggerClassName='w-full -ml-2 flex items-center'
                      showArrow={false}
                      renderTrigger={() => (
                        <Badge.Root
                          size='small'
                          variant='light'
                          color={
                            getVendorStatusBadge(
                              getVendorFieldValue(normalizedVendor, localChanges, 'status') ||
                                'Active',
                            ).color
                          }
                          className='text-nowrap'
                        >
                          {getVendorFieldValue(normalizedVendor, localChanges, 'status') || '--'}
                        </Badge.Root>
                      )}
                    />
                  </EditableFieldWrapper>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className='flex-1 w-full mt-[calc(-12px)] overflow-hidden flex flex-col min-h-0'>
          <TabMenuHorizontal.Root
            value={activeTab}
            onValueChange={handleTabChange}
            className='flex flex-col h-full min-h-0'
          >
            <TabMenuHorizontal.List
              wrapperClassName='w-full shrink-0'
              className='w-[calc(100%-64px)] mx-8'
            >
              {permittedMainTabIds.includes('about') ? (
                <TabMenuHorizontal.Trigger value='about' className='px-0'>
                  <TabMenuHorizontal.Icon
                    as={activeTab === 'about' ? RiInformationFill : RiInformationLine}
                  />
                  About
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedMainTabIds.includes('documents') ? (
                <TabMenuHorizontal.Trigger value='documents' className='px-0'>
                  <TabMenuHorizontal.Icon
                    as={activeTab === 'documents' ? RiFile2Fill : RiFile2Line}
                  />
                  Documents
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedMainTabIds.includes('onboarding') ? (
                <TabMenuHorizontal.Trigger value='onboarding' className='px-0'>
                  <TabMenuHorizontal.Icon
                    as={activeTab === 'onboarding' ? RiUserReceivedFill : RiUserReceivedLine}
                  />
                  Onboarding
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedMainTabIds.includes('rating') ? (
                <TabMenuHorizontal.Trigger value='rating' className='px-0'>
                  <TabMenuHorizontal.Icon
                    as={activeTab === 'rating' ? RiUserStarFill : RiUserStarLine}
                  />
                  Rating
                </TabMenuHorizontal.Trigger>
              ) : null}
              {permittedMainTabIds.includes('billings') ? (
                <TabMenuHorizontal.Trigger value='billings' className='px-0'>
                  <TabMenuHorizontal.Icon
                    as={activeTab === 'billings' ? RiFileListFill : RiFileListLine}
                  />
                  Bills
                </TabMenuHorizontal.Trigger>
              ) : null}
            </TabMenuHorizontal.List>

            {/* ── About Vendor Tab ──────────────────────────────────────── */}
            <TabMenuHorizontal.Content value='about' className='flex-1 min-h-0'>
              <div className='flex h-full min-h-0'>
                {/* Right content area */}
                <div className='flex-1 min-h-0 overflow-y-auto py-6 px-8 bg-white'>
                  {vendorDetail.isLoading && !normalizedVendor ? (
                    <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-text-sub-600'>
                      Loading vendor details...
                    </div>
                  ) : normalizedVendor ? (
                    <>
                      {/* ════════════════════════════════════════════════════
                          BASIC INFO TAB
                      ════════════════════════════════════════════════════ */}
                      {aboutSidebar === 'basic' && (
                        <div className='flex flex-col gap-6'>
                          {/* Info grid */}
                          <div className='grid grid-cols-2 gap-x-12 gap-y-4'>
                            {/* Status — inline select */}
                            {/* <div className='flex flex-col gap-1'>
                              <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                                Status
                              </div>
                              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                                <SearchableSelect
                                  variant='borderless'
                                  value={getVendorFieldValue(
                                    normalizedVendor,
                                    localChanges,
                                    'status',
                                  )}
                                  onValueChange={(val) => handleFieldChange('status', val)}
                                  size='xsmall'
                                  options={vendorStatusSelectOptions}
                                  triggerClassName='w-full -ml-2'
                                  showArrow={false}
                                  renderTrigger={() => (
                                    <Badge.Root
                                      size='small'
                                      variant='light'
                                      color={
                                        getVendorStatusBadge(
                                          getVendorFieldValue(
                                            normalizedVendor,
                                            localChanges,
                                            'status',
                                          ) || 'Active',
                                        ).color
                                      }
                                      className='text-nowrap'
                                    >
                                      {getVendorFieldValue(
                                        normalizedVendor,
                                        localChanges,
                                        'status',
                                      ) || '--'}
                                    </Badge.Root>
                                  )}
                                />
                              </EditableFieldWrapper>
                            </div> */}

                            {/* Row 1: Category | Sub-category (~50% each). Row 2: Centers (~50%). */}
                            <div className='flex min-w-0 flex-col gap-2'>
                              <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                                Category
                              </div>
                              <EditableFieldWrapper
                                editable
                                iconClassName='mr-2'
                                className='min-w-0'
                              >
                                <div className='flex flex-col gap-3 py-1'>
                                  <VendorOpexCategorySubcategoryMultiselect
                                    categoryData={categoryData}
                                    categoryLoading={categoryOpexStatus === 'loading'}
                                    categories={mappingCategories}
                                    subCategories={mappingSubCategories}
                                    onCategoriesChange={setMappingCategories}
                                    onSubCategoriesChange={setMappingSubCategories}
                                    disabled={vendorCategorySavePending}
                                    onCategoryDropdownClose={() =>
                                      void persistVendorCategoryMapping()
                                    }
                                    onSubCategoryDropdownClose={() =>
                                      void persistVendorCategoryMapping()
                                    }
                                    showLabels={false}
                                    showChevron={false}
                                    fieldScope='category'
                                    vendorDetailSurface
                                  />
                                </div>
                              </EditableFieldWrapper>
                            </div>
                            <div className='flex min-w-0 flex-col gap-2'>
                              <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                                Sub-category
                              </div>
                              <EditableFieldWrapper
                                editable
                                iconClassName='mr-2'
                                className='min-w-0'
                              >
                                <div className='flex flex-col gap-3 py-1'>
                                  <VendorOpexCategorySubcategoryMultiselect
                                    categoryData={categoryData}
                                    categoryLoading={categoryOpexStatus === 'loading'}
                                    categories={mappingCategories}
                                    subCategories={mappingSubCategories}
                                    onCategoriesChange={setMappingCategories}
                                    onSubCategoriesChange={setMappingSubCategories}
                                    disabled={vendorCategorySavePending}
                                    onCategoryDropdownClose={() =>
                                      void persistVendorCategoryMapping()
                                    }
                                    onSubCategoryDropdownClose={() =>
                                      void persistVendorCategoryMapping()
                                    }
                                    showLabels={false}
                                    showChevron={false}
                                    fieldScope='subcategory'
                                    vendorDetailSurface
                                  />
                                </div>
                              </EditableFieldWrapper>
                            </div>

                            <VendorCentersEditor
                              vendorData={vendorDetail.data}
                              vendorId={id}
                              dispatch={dispatch}
                              fullWidth={false}
                            />
                          </div>

                          {/* Contacts */}
                          <ContactCards
                            contacts={contacts}
                            onAddContact={handleAddContact}
                            onEditContact={handleEditContact}
                            onDeleteContact={handleDeleteContact}
                            emptyState={{
                              title: 'No contacts added yet.',
                              description: 'Add a contact to get started.',
                            }}
                            showActions={true}
                          />

                          {/* Location */}
                          <div className='flex flex-col gap-3 border-t border-stroke-soft-200 pt-4'>
                            <div className='flex items-center gap-2'>
                              <RiMapPin2Line size={20} className='text-text-soft-400' />
                              <span className='text-label-md text-text-sub-500'>Location</span>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                              <VendorLocationStateCity
                                labelCls='text-paragraph-sm opacity-72 text-text-sub-500'
                                normalizedVendor={normalizedVendor}
                                localChanges={localChanges}
                                sortedStateOptions={sortedVendorStateOptions}
                                citySelectOptions={vendorCitySelectOptions}
                                effectiveStateIso={vendorEffectiveStateIso}
                                onStateChange={handleStateChange}
                                onCityChange={handleCityChange}
                              />
                              <div className='col-span-2'>
                                <VendorInlineTextField
                                  label='Address'
                                  fieldName='address'
                                  vendor={normalizedVendor}
                                  localChanges={localChanges}
                                  dispatch={dispatch}
                                  handleFieldChange={handleFieldChange}
                                  placeholder='Enter address'
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ════════════════════════════════════════════════════
                          VENDOR DETAILS TAB
                      ════════════════════════════════════════════════════ */}
                      {aboutSidebar === 'details' && (
                        <div className='flex flex-col gap-5'>
                          <div className='flex items-center gap-2'>
                            <RiStoreLine className='size-5 text-text-sub-500 shrink-0' />
                            <h3 className='text-label-md text-neutral-500'>Vendor Details</h3>
                          </div>

                          <div className='grid grid-cols-2 gap-x-12 gap-y-4'>
                            {/* Vendor Name — inline editable */}
                            <VendorInlineTextField
                              label='Vendor Name'
                              fieldName='vendor_name'
                              vendor={normalizedVendor}
                              localChanges={localChanges}
                              dispatch={dispatch}
                              handleFieldChange={handleFieldChange}
                              placeholder='Enter vendor name'
                            />

                            <VendorCentersEditor
                              vendorData={vendorDetail.data}
                              vendorId={id}
                              dispatch={dispatch}
                            />

                            {/* Status — inline select */}
                            <div className='flex flex-col gap-1'>
                              <div className='paragraph-small text-text-sub-500'>Status</div>
                              <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                                <SearchableSelect
                                  variant='borderless'
                                  value={getVendorFieldValue(
                                    normalizedVendor,
                                    localChanges,
                                    'status',
                                  )}
                                  onValueChange={(value) => handleFieldChange('status', value)}
                                  size='xsmall'
                                  options={vendorStatusSelectOptions}
                                  triggerClassName='w-full -ml-2'
                                  showArrow={false}
                                  renderTrigger={() => (
                                    <Badge.Root
                                      size='small'
                                      color={
                                        getVendorStatusBadge(
                                          getVendorFieldValue(
                                            normalizedVendor,
                                            localChanges,
                                            'status',
                                          ) || 'Active',
                                        ).color
                                      }
                                      className='text-nowrap'
                                    >
                                      {getVendorFieldValue(
                                        normalizedVendor,
                                        localChanges,
                                        'status',
                                      ) || '--'}
                                    </Badge.Root>
                                  )}
                                />
                              </EditableFieldWrapper>
                            </div>

                            <VendorLocationStateCity
                              labelCls='paragraph-small text-text-sub-500'
                              normalizedVendor={normalizedVendor}
                              localChanges={localChanges}
                              sortedStateOptions={sortedVendorStateOptions}
                              citySelectOptions={vendorCitySelectOptions}
                              effectiveStateIso={vendorEffectiveStateIso}
                              onStateChange={handleStateChange}
                              onCityChange={handleCityChange}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-text-sub-600'>
                      {vendorDetail.error ? 'Failed to load vendor details.' : 'No vendor found.'}
                    </div>
                  )}
                </div>
              </div>
            </TabMenuHorizontal.Content>

            {/* Placeholder tabs */}
            <TabMenuHorizontal.Content value='documents' className='flex-1 min-h-0 overflow-y-auto'>
              <VendorsDetailDocumentTab vendorId={id} />
            </TabMenuHorizontal.Content>

            <TabMenuHorizontal.Content value='billings' className='flex-1 min-h-0 overflow-y-auto'>
              <VendorBills vendorId={id} />
            </TabMenuHorizontal.Content>

            <TabMenuHorizontal.Content
              value='onboarding'
              className='flex-1 min-h-0 overflow-y-auto'
            >
              <VendorDetailOnboardingTab vendorId={id} />
            </TabMenuHorizontal.Content>

            <TabMenuHorizontal.Content value='rating' className='flex-1 min-h-0 overflow-y-auto'>
              <VendorDetailRatingTab />
            </TabMenuHorizontal.Content>
          </TabMenuHorizontal.Root>
        </div>
      </div>
      {/* ── Add / Edit Contact Modal ───────────────────────────────────────── */}
      <AddVendorContactModal
        isOpen={addVendorContactModalOpen}
        onOpenChange={(open) => {
          setAddVendorContactModalOpen(open);
          if (!open) setEditingContact(null);
        }}
        vendorId={id}
        contact={editingContact}
        onSuccess={() => id && dispatch(getVendorDetailThunk(id))}
      />
    </PageLayout>
  );
};

export default VendorDetailPage;
