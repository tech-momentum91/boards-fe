import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  fetchPartnerThunk,
  updatePartnerThunk,
  uploadPartnerAttachmentThunk,
  deletePartnerAttachmentThunk,
  fetchPartnerMasterAssigneesByRoles,
  PARTNER_MASTER_ASSIGNEE_ROLES,
  selectPartnerMasterAssignees,
} from '@/redux/partnerSlice';
import { normalizePartnerDocument } from '@/utils/partner-document';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Textarea from '@/components/ui/textarea';
import * as Badge from '@/components/ui/badge';
import { PageLayout } from '@/components';
import EventAttachmentsTable from '@/components/event-management/event-attachments-table';
import { PartnerEntityActivities } from '@/components/partner';
import PartnerContact from '@/components/partner/partner-contact';
import PartnerDetailTasksTab from '@/pages/partner/partner-detail-tasks-tab';
import {
  PARTNER_FILTER_COMPANY_SIZE_OPTIONS,
  PARTNER_FILTER_ENGAGEMENT_FREQUENCY_OPTIONS,
  PARTNER_FILTER_INDUSTRY_OPTIONS,
  PARTNER_FILTER_PRIMARY_CATEGORY_OPTIONS,
  PARTNER_FILTER_REVENUE_MODEL_OPTIONS,
  PARTNER_FILTER_SECONDARY_CATEGORY_OPTIONS,
  PARTNER_DETAIL_MOCK_DATA,
  PARTNER_STAGE_COLOR_CODE_MAP,
  PARTNER_DETAIL_TAB_OPTIONS,
  PARTNER_DETAIL_TAB_READ_MODULE,
} from '@/components/partner/constants';
import {
  usePermittedTabDefs,
  useSyncDetailTabSearchParams,
  tabDefId,
} from '@/hooks/use-detail-tab-permissions';
import {
  RiFacebookCircleLine,
  RiGlobalLine,
  RiInstagramLine,
  RiArrowLeftSLine,
  RiBookletLine,
  RiFileList2Line,
  RiGridFill,
  RiLinkedinBoxLine,
  RiMoneyDollarCircleLine,
  RiYoutubeLine,
  RiLinkedinBoxFill,
  RiYoutubeFill,
} from 'react-icons/ri';
import {
  ensureSinglePrimary,
  getPartnerContacts,
  getRevenueModelValue,
  normalizePartnerAttachments,
  normalizePartnerRowForDetail,
} from '@/components/partner/partner-helper';
import PartnerEvents from '@/components/partner/partner-events';
import { getStatusOptions } from '@/api/dynamic-status';
import { toEventStatusSelectOptions } from '@/components/event-management/event-dynamic-status-helpers';
import { resolveStatusBadgeStyles } from '@/components/ui/status-color-pill';
import { State, City } from 'country-state-city';

const getStageBadgeClassName = () => 'text-nowrap border-transparent';

/** Badge colors: Status Configuration `color` first, then legacy map for unconfigured rows. */
function onboardingStageBadgeStyle(stageLabel, option) {
  const fromApi = resolveStatusBadgeStyles(option?.color);
  if (fromApi) {
    return { backgroundColor: fromApi.background, color: fromApi.text };
  }
  const legacy = PARTNER_STAGE_COLOR_CODE_MAP[stageLabel];
  if (legacy) {
    return { backgroundColor: legacy.bg, color: legacy.text };
  }
  const fallback = PARTNER_STAGE_COLOR_CODE_MAP.Inactive;
  return { backgroundColor: fallback.bg, color: fallback.text };
}

function indianStateIsoCodesContainingCity(cityName) {
  if (!cityName?.trim()) return [];
  const matches = [];
  for (const s of State.getStatesOfCountry('IN')) {
    const cities = City.getCitiesOfState('IN', s.isoCode);
    if (cities.some((c) => c.name === cityName)) matches.push(s.isoCode);
  }
  return matches;
}

/** Single value for selects (API may send linked DocTypes as objects). */
function coerceSelectDisplayValue(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    const name =
      value.secondary_category_name ??
      value.name ??
      value.label ??
      value.title ??
      value.revenue_model ??
      '';
    return String(name).trim();
  }
  return String(value).trim();
}

const PartnerBaseLocationInline = ({ cityValue = '', onSaveCity }) => {
  const allStateOptions = useMemo(
    () =>
      State.getStatesOfCountry('IN')
        .map((s) => ({ value: s.isoCode, label: s.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [],
  );

  const [stateIso, setStateIso] = useState('');

  useEffect(() => {
    const codes = indianStateIsoCodesContainingCity(cityValue);
    if (codes.length === 1) setStateIso(codes[0]);
    else setStateIso('');
  }, [cityValue]);

  const cityOptions = useMemo(() => {
    if (!stateIso) return [];
    return City.getCitiesOfState('IN', stateIso)
      .map((c) => ({ value: c.name, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [stateIso]);

  const normalizedCity = coerceSelectDisplayValue(cityValue);
  const cityOptionsForSelect = useMemo(() => {
    if (!normalizedCity) return cityOptions;
    const hasMatch = cityOptions.some(
      (opt) => String(opt.value).trim().toLowerCase() === normalizedCity.toLowerCase(),
    );
    if (hasMatch) return cityOptions;
    return [{ value: normalizedCity, label: normalizedCity }, ...cityOptions];
  }, [cityOptions, normalizedCity]);

  const citySelectValue =
    cityOptionsForSelect.find(
      (opt) => String(opt.value).trim().toLowerCase() === normalizedCity.toLowerCase(),
    )?.value || '';

  const stateDisplayLabel =
    allStateOptions.find((o) => o.value === stateIso)?.label ||
    (stateIso ? stateIso : 'Select State');

  return (
    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
      <SearchableSelect
        variant='borderless'
        value={stateIso}
        onValueChange={(next) => {
          setStateIso(next);
          const normalized = coerceSelectDisplayValue(cityValue).trim();
          if (!normalized) return;
          const existsInState = City.getCitiesOfState('IN', next).some(
            (c) => c.name.toLowerCase() === normalized.toLowerCase(),
          );
          if (!existsInState) onSaveCity?.('');
        }}
        size='xsmall'
        options={allStateOptions}
        placeholder='Select State'
        triggerClassName='w-full -ml-2 text-left'
        renderTrigger={({ selectedLabel }) => (
          <span className='text-label-sm text-text-main-900'>
            {selectedLabel || 'Select State'}
          </span>
        )}
      />

      <SearchableSelect
        variant='borderless'
        value={citySelectValue}
        onValueChange={(next) => {
          if (next === citySelectValue) return;
          onSaveCity?.(next);
        }}
        size='xsmall'
        disabled={!stateIso}
        options={cityOptionsForSelect}
        placeholder='Select City'
        triggerClassName='w-full -ml-2 text-left'
        renderTrigger={({ selectedLabel }) => (
          <span className='text-label-sm text-text-main-900'>
            {selectedLabel || normalizedCity || 'Select City'}
          </span>
        )}
      />
    </div>
  );
};

const PARTNER_DETAIL_VALID_TAB_VALUES = Object.freeze(
  PARTNER_DETAIL_TAB_OPTIONS.map((t) => t.value),
);

const InlineEditableText = ({ value = '', onSave }) => {
  const [draftValue, setDraftValue] = useState(value || '');
  useEffect(() => {
    setDraftValue(value || '');
  }, [value]);
  return (
    <Input.Root variant='borderless' size='xsmall' className='-ml-2 max-w-full'>
      <Input.Wrapper>
        <Input.Input
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onBlur={(e) => onSave?.(e.target.value.trim())}
          className='text-label-sm text-text-main-900'
        />
      </Input.Wrapper>
    </Input.Root>
  );
};

const InlineEditableSelect = ({ value = '', options = [], onSave, renderTriggerValue }) => {
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
      options={optionsForSelect}
      placeholder='Select'
      triggerClassName='w-full -ml-2 text-left'
      renderTrigger={({ selectedLabel }) => {
        const labelToRender = selectedLabel || displayLabel;
        return renderTriggerValue ? (
          renderTriggerValue(labelToRender, resolvedOption)
        ) : (
          <span className='text-label-sm text-text-main-900'>{labelToRender}</span>
        );
      }}
    />
  );
};

const InlineEditableTextarea = ({ value = '', onSave }) => {
  const [draftValue, setDraftValue] = useState(value || '');
  useEffect(() => {
    setDraftValue(value || '');
  }, [value]);
  return (
    <Textarea.Root
      value={draftValue}
      onChange={(e) => setDraftValue(e.target.value)}
      onBlur={() => onSave?.(draftValue.trim())}
      simple
      className='field-sizing-content text-paragraph-sm'
    />
  );
};

const InlineEditableSocialLink = ({ value = '', onSave, icon: Icon }) => {
  const [draftValue, setDraftValue] = useState(value || '');
  useEffect(() => {
    setDraftValue(value || '');
  }, [value]);
  return (
    <div className='relative'>
      <Icon
        size={16}
        className='pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-soft-400'
      />
      <Input.Root variant='borderless' size='xsmall' className='-ml-2 max-w-full'>
        <Input.Wrapper>
          <Input.Input
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onBlur={(e) => onSave?.(e.target.value.trim())}
            className='pl-6 text-label-sm text-text-main-900'
            placeholder='https://'
          />
        </Input.Wrapper>
      </Input.Root>
    </div>
  );
};

const SectionTitle = ({ icon: Icon, children }) => (
  <h2 className='mb-3 flex items-center gap-2 text-label-sm font-semibold uppercase text-text-sub-900'>
    <Icon size={20} className='text-text-soft-400' />
    <span>{children}</span>
  </h2>
);

// helpers moved to `src/components/partner/partner-helper.js`

const PartnerDetailPage = () => {
  const dispatch = useDispatch();
  const partnerMasterAssignees = useSelector(selectPartnerMasterAssignees);
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const [onboardingStageSelectOptions, setOnboardingStageSelectOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getStatusOptions({ doctype: 'Partner', field: 'onboarding_stage' })
      .then((rows) => {
        if (cancelled) return;
        setOnboardingStageSelectOptions(toEventStatusSelectOptions(rows));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPartnerFromRoute = id
    ? normalizePartnerRowForDetail(location.state?.initialPartner)
    : null;
  const [activeTab, setActiveTab] = useState('basic-details');
  const [isEditingName, setIsEditingName] = useState(false);
  const [headerNameDraft, setHeaderNameDraft] = useState('');
  const [partnerFields, setPartnerFields] = useState(() =>
    id ? initialPartnerFromRoute : PARTNER_DETAIL_MOCK_DATA,
  );
  const [detailLoading, setDetailLoading] = useState(Boolean(id));
  const partnerRef = useRef(partnerFields);

  useEffect(() => {
    dispatch(fetchPartnerMasterAssigneesByRoles({ roles: PARTNER_MASTER_ASSIGNEE_ROLES }));
  }, [dispatch]);

  const partnerOwnerOptions = useMemo(() => {
    const users = partnerMasterAssignees?.users;
    if (!Array.isArray(users) || users.length === 0) return [];

    const mapped = users
      .map((u) => ({
        value: u?.value ?? u?.user_id ?? u?.email ?? u?.name ?? '',
        label: u?.label ?? u?.full_name ?? u?.name ?? u?.email ?? '',
      }))
      .filter((opt) => opt.value && opt.label);

    return mapped;
  }, [partnerMasterAssignees?.users]);

  useEffect(() => {
    partnerRef.current = partnerFields;
  }, [partnerFields]);

  useEffect(() => {
    if (!id) {
      setPartnerFields(PARTNER_DETAIL_MOCK_DATA);
      setDetailLoading(false);
      return () => {};
    }

    let cancelled = false;
    setDetailLoading(true);

    dispatch(fetchPartnerThunk(id))
      .unwrap()
      .then((doc) => {
        if (!cancelled && doc) {
          setPartnerFields(doc);
        } else if (!cancelled && !doc) {
          showErrorToast(null, { defaultMessage: 'Partner not found' });
          setPartnerFields(initialPartnerFromRoute ?? {});
        }
      })
      .catch((error) => {
        if (!cancelled) {
          showErrorToast(error, { defaultMessage: 'Failed to load partner' });
          setPartnerFields(initialPartnerFromRoute ?? {});
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, dispatch]);

  const permittedPartnerTabs = usePermittedTabDefs(
    PARTNER_DETAIL_TAB_OPTIONS,
    PARTNER_DETAIL_TAB_READ_MODULE,
  );
  const permittedPartnerTabIds = useMemo(
    () => permittedPartnerTabs.map((t) => tabDefId(t)),
    [permittedPartnerTabs],
  );

  useSyncDetailTabSearchParams({
    validTabs: PARTNER_DETAIL_VALID_TAB_VALUES,
    defaultTabKey: 'basic-details',
    permittedIds: permittedPartnerTabIds,
    searchParams,
    setSearchParams,
    setActiveTab,
  });

  const handlePartnerTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (tab === 'basic-details') next.delete('tab');
          else next.set('tab', tab);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const partner = partnerFields ?? (id ? {} : PARTNER_DETAIL_MOCK_DATA);
  const partnerAttachments = useMemo(() => normalizePartnerAttachments(partner), [partner]);
  const contactsList = useMemo(() => ensureSinglePrimary(getPartnerContacts(partner)), [partner]);

  const headerOnboardingStageOption = useMemo(() => {
    const stage = partner?.onboarding_stage;
    if (stage == null || String(stage).trim() === '') return null;
    const s = String(coerceSelectDisplayValue(stage)).trim().toLowerCase();
    return (
      onboardingStageSelectOptions.find(
        (o) =>
          String(o.value || '')
            .trim()
            .toLowerCase() === s ||
          String(o.label || '')
            .trim()
            .toLowerCase() === s,
      ) ?? null
    );
  }, [partner?.onboarding_stage, onboardingStageSelectOptions]);

  const handleFieldChange = useCallback(
    async (fieldName, value) => {
      const currentValue = partnerRef.current?.[fieldName];
      const isSameValue = JSON.stringify(currentValue) === JSON.stringify(value);
      if (isSameValue) return;

      if (!id) {
        setPartnerFields((previous) =>
          previous == null ? { [fieldName]: value } : { ...previous, [fieldName]: value },
        );
        return;
      }

      const snapshot = partnerRef.current;
      const previousValue = snapshot?.[fieldName];

      setPartnerFields((previous) =>
        previous == null ? { [fieldName]: value } : { ...previous, [fieldName]: value },
      );

      try {
        const raw = await dispatch(
          updatePartnerThunk({ partnerName: id, fields: { [fieldName]: value } }),
        ).unwrap();

        if (raw && typeof raw === 'object') {
          setPartnerFields((previous) => normalizePartnerDocument(raw, previous) ?? previous);
        }
        showSuccessToast('Partner updated successfully');
      } catch (error) {
        setPartnerFields((previous) =>
          previous == null
            ? { [fieldName]: previousValue }
            : { ...previous, [fieldName]: previousValue },
        );
        showErrorToast(error, { defaultMessage: 'Failed to save partner' });
      }
    },
    [id, dispatch],
  );

  const handleDeleteAttachment = useCallback(
    async ({ attachment_id, childDoctype }) => {
      const resolvedPartnerId = partnerRef.current?.name || id;
      if (!resolvedPartnerId) throw new Error('Partner not loaded');
      await dispatch(
        deletePartnerAttachmentThunk({ partner: resolvedPartnerId, attachment_id, childDoctype }),
      );
      // showSuccessToast('Attachment deleted successfully');
      const refreshAction = await dispatch(fetchPartnerThunk(resolvedPartnerId));
      if (!fetchPartnerThunk.fulfilled.match(refreshAction)) {
        const p = refreshAction.payload;
        throw new Error(typeof p === 'string' ? p : p?.message || 'Failed to refresh attachments');
      }
      const refreshedDoc = refreshAction.payload;
      setPartnerFields(refreshedDoc);
    },
    [dispatch, id],
  );

  const handleUploadAttachments = useCallback(
    async ({ files, type }) => {
      const resolvedPartnerId = partnerRef.current?.name || id;
      if (!resolvedPartnerId) throw new Error('Partner not loaded');

      const fileList = Array.isArray(files) ? files.filter(Boolean) : [];
      if (fileList.length === 0) throw new Error('No files selected');

      const resultAction = await dispatch(
        uploadPartnerAttachmentThunk({
          partner: resolvedPartnerId,
          files: fileList,
        }),
      );

      if (!uploadPartnerAttachmentThunk.fulfilled.match(resultAction)) {
        const p = resultAction.payload;
        throw new Error(typeof p === 'string' ? p : p?.message || 'Failed to upload attachment');
      }

      // Always refresh partner after upload to avoid blank fields when the upload API
      // returns partial attachment rows (e.g. missing owner/creation/type).
      const refreshAction = await dispatch(fetchPartnerThunk(resolvedPartnerId));
      if (!fetchPartnerThunk.fulfilled.match(refreshAction)) {
        const p = refreshAction.payload;
        throw new Error(typeof p === 'string' ? p : p?.message || 'Failed to refresh attachments');
      }
      const refreshedDoc = refreshAction.payload;
      setPartnerFields(refreshedDoc);
      showSuccessToast(
        fileList.length > 1
          ? 'Attachments uploaded successfully'
          : 'Attachment uploaded successfully',
      );
      return normalizePartnerAttachments(refreshedDoc);
    },
    [dispatch, id],
  );

  useEffect(() => {
    setHeaderNameDraft(partner.partner_name || '');
  }, [partner.partner_name]);

  if (id && detailLoading && partnerFields === null) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex flex-1 items-center justify-center p-8 text-paragraph-sm text-text-sub-500'>
          Loading partner…
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showDefaultHeader={false}>
      <div className='flex h-full w-full flex-col'>
        {/* Header */}
        <div className='pt-6 pb-[14px] pl-6 pr-8 w-full  border-stroke-soft-200 bg-bg-white-0'>
          <div className='flex items-center justify-between gap-3 w-full'>
            <div className='flex items-center gap-4 min-w-0'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                aria-label='Back'
                onClick={() => navigate('/partner')}
              >
                <Button.Icon as={RiArrowLeftSLine} size={20} />
              </Button.Root>

              <div className='flex flex-col  min-w-0'>
                {!isEditingName ? (
                  <div
                    className='text-paragraph-lg  text-text-strong-950 '
                    onClick={() => {
                      setHeaderNameDraft(partner.partner_name || '');
                      setIsEditingName(true);
                    }}
                  >
                    {partner.partner_name}
                  </div>
                ) : (
                  <Input.Root size='small' className='min-w-[250px] max-w-[400px]'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={headerNameDraft}
                        autoFocus
                        onChange={(e) => setHeaderNameDraft(e.target.value)}
                        onBlur={() => {
                          setIsEditingName(false);
                          const next = headerNameDraft.trim();
                          if (next !== (partner.partner_name || '').trim()) {
                            handleFieldChange('partner_name', next);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                )}

                <span>
                  <Badge.Root
                    size='medium'
                    variant='light'
                    className={getStageBadgeClassName(partner.onboarding_stage)}
                    style={onboardingStageBadgeStyle(
                      partner.onboarding_stage,
                      headerOnboardingStageOption,
                    )}
                  >
                    {partner.onboarding_stage || 'Inactive'}
                  </Badge.Root>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className='flex-1 w-full h-full overflow-hidden flex flex-col min-h-0'>
          <div className='flex-1 min-h-0'>
            <TabMenuHorizontal.Root
              value={activeTab}
              onValueChange={handlePartnerTabChange}
              className='flex flex-col h-full min-h-0'
            >
              <TabMenuHorizontal.List wrapperClassName='w-full shrink-0' className='px-4'>
                {permittedPartnerTabs.map((tab) => {
                  const IconComponent =
                    activeTab === tab.value ? tab.activeIcon || tab.icon : tab.icon;
                  return (
                    <TabMenuHorizontal.Trigger key={tab.value} value={tab.value}>
                      {IconComponent ? <TabMenuHorizontal.Icon as={IconComponent} /> : null}
                      {tab.label}
                    </TabMenuHorizontal.Trigger>
                  );
                })}
              </TabMenuHorizontal.List>

              {/* Basic Details Tab */}
              <TabMenuHorizontal.Content
                value='basic-details'
                className='flex-1 min-h-0 max-w-[80%] overflow-y-auto px-6'
              >
                <div className='flex flex-col gap-5 py-5'>
                  <div className='flex flex-col gap-5'>
                    <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
                      <SectionTitle icon={RiBookletLine}>Basic Info</SectionTitle>
                      <div className='grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2'>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                            Partner Name
                          </div>
                          <InlineEditableText
                            value={partner.partner_name}
                            onSave={(val) => handleFieldChange('partner_name', val)}
                          />
                        </div>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                            Website
                          </div>
                          <InlineEditableText
                            value={partner.website}
                            onSave={(val) => handleFieldChange('website', val)}
                          />
                        </div>
                      </div>
                    </section>

                    <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
                      <SectionTitle icon={RiGridFill}>Category & Profile</SectionTitle>
                      <div className='grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2'>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                            Primary Category
                          </div>
                          <InlineEditableSelect
                            value={partner.primary_category}
                            options={PARTNER_FILTER_PRIMARY_CATEGORY_OPTIONS}
                            onSave={(val) => handleFieldChange('primary_category', val)}
                          />
                        </div>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                            Secondary Category
                          </div>
                          <InlineEditableSelect
                            value={partner.secondary_category}
                            options={PARTNER_FILTER_SECONDARY_CATEGORY_OPTIONS}
                            onSave={(val) => handleFieldChange('secondary_category', val)}
                          />
                        </div>
                        <div className='flex flex-col gap-1 sm:col-span-2'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                            Base State & City
                          </div>
                          <PartnerBaseLocationInline
                            cityValue={partner.partner_base_city}
                            onSaveCity={(val) => handleFieldChange('partner_base_city', val)}
                          />
                        </div>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                            Company Size
                          </div>
                          <InlineEditableSelect
                            value={partner.company_size}
                            options={PARTNER_FILTER_COMPANY_SIZE_OPTIONS}
                            onSave={(val) => handleFieldChange('company_size', val)}
                          />
                        </div>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                            Industry
                          </div>
                          <InlineEditableSelect
                            value={partner.industry_type}
                            options={PARTNER_FILTER_INDUSTRY_OPTIONS}
                            onSave={(val) => handleFieldChange('industry_type', val)}
                          />
                        </div>
                      </div>
                    </section>

                    <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
                      <SectionTitle icon={RiMoneyDollarCircleLine}>Commercial & Stage</SectionTitle>
                      <div className='grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2'>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                            Revenue Models
                          </div>
                          <InlineEditableSelect
                            value={getRevenueModelValue(partner)}
                            options={PARTNER_FILTER_REVENUE_MODEL_OPTIONS}
                            onSave={(val) =>
                              handleFieldChange(
                                'revenue_model',
                                val ? [{ revenue_model: val }] : [],
                              )
                            }
                          />
                        </div>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                            Engagement Frequency
                          </div>
                          <InlineEditableSelect
                            value={partner.estimated_engagement_frequency}
                            options={PARTNER_FILTER_ENGAGEMENT_FREQUENCY_OPTIONS}
                            onSave={(val) =>
                              handleFieldChange('estimated_engagement_frequency', val)
                            }
                          />
                        </div>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                            Partner owner
                          </div>
                          <InlineEditableSelect
                            value={partner.partner_owner}
                            options={partnerOwnerOptions}
                            onSave={(val) => handleFieldChange('partner_owner', val)}
                          />
                        </div>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                            Onboarding Stage
                          </div>
                          <InlineEditableSelect
                            value={partner.onboarding_stage}
                            options={onboardingStageSelectOptions}
                            onSave={(val) => handleFieldChange('onboarding_stage', val)}
                            renderTriggerValue={(stageLabel, stageOption) => (
                              <Badge.Root
                                size='medium'
                                variant='light'
                                className={getStageBadgeClassName(stageLabel)}
                                style={onboardingStageBadgeStyle(stageLabel, stageOption)}
                              >
                                {stageLabel || 'Select'}
                              </Badge.Root>
                            )}
                          />
                        </div>
                      </div>
                    </section>

                    <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
                      <SectionTitle icon={RiFileList2Line}>Internal Description</SectionTitle>
                      <InlineEditableTextarea
                        value={partner.internal_description}
                        onSave={(val) => handleFieldChange('internal_description', val)}
                      />
                    </section>

                    <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
                      <SectionTitle icon={RiGlobalLine}>Social Media Profiles</SectionTitle>
                      <div className='grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2'>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500 flex items-center gap-2'>
                            <RiLinkedinBoxFill size={20} color='blue' />
                            LinkedIn{' '}
                          </div>
                          <InlineEditableSocialLink
                            value={partner.linkedin_url}
                            onSave={(val) => handleFieldChange('linkedin_url', val)}
                            icon={RiLinkedinBoxLine}
                          />
                        </div>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500 flex items-center gap-2'>
                            <RiInstagramLine size={20} color='red' />
                            Instagram{' '}
                          </div>
                          <InlineEditableSocialLink
                            value={partner.instagram_url}
                            onSave={(val) => handleFieldChange('instagram_url', val)}
                            icon={RiInstagramLine}
                          />
                        </div>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500 flex items-center gap-2'>
                            <RiFacebookCircleLine size={20} color='blue' />
                            Facebook{' '}
                          </div>
                          <InlineEditableSocialLink
                            value={partner.facebook_url}
                            onSave={(val) => handleFieldChange('facebook_url', val)}
                            icon={RiFacebookCircleLine}
                          />
                        </div>
                        <div className='flex flex-col gap-1'>
                          <div className='text-paragraph-sm opacity-72 text-text-sub-500 flex items-center gap-2'>
                            <RiYoutubeFill size={20} color='red' />
                            YouTube{' '}
                          </div>
                          <InlineEditableSocialLink
                            value={partner.youtube_url}
                            onSave={(val) => handleFieldChange('youtube_url', val)}
                            icon={RiYoutubeLine}
                          />
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </TabMenuHorizontal.Content>

              {/* Contacts Tab */}
              <TabMenuHorizontal.Content
                value='contacts'
                className='flex-1 min-h-0 max-w-full overflow-y-auto py-4 px-6'
              >
                <PartnerContact
                  partnerId={id}
                  contacts={contactsList}
                  onPartnerUpdated={setPartnerFields}
                />
              </TabMenuHorizontal.Content>

              <TabMenuHorizontal.Content
                value='tasks'
                className='flex-1 min-h-0 overflow-y-auto py-4 px-6'
              >
                <PartnerDetailTasksTab partnerDocName={partner.name || id || ''} />
              </TabMenuHorizontal.Content>

              {/* Events Tab */}
              <TabMenuHorizontal.Content
                value='events'
                className='flex-1 min-h-0 overflow-y-auto py-4 px-6'
              >
                <PartnerEvents partnerId={id} />
              </TabMenuHorizontal.Content>

              {/* Attachments Tab */}
              <TabMenuHorizontal.Content
                value='attachments'
                className='flex-1 min-h-0 overflow-y-auto py-4 px-6'
              >
                <EventAttachmentsTable
                  files={partnerAttachments}
                  onUpload={handleUploadAttachments}
                  onDeleteAttachment={handleDeleteAttachment}
                />
              </TabMenuHorizontal.Content>

              {/* Activities Tab */}
              <TabMenuHorizontal.Content
                value='activities'
                className='flex flex-1 min-h-0 flex-col overflow-hidden'
              >
                <PartnerEntityActivities partnerName={partner?.name || id || ''} />
              </TabMenuHorizontal.Content>
            </TabMenuHorizontal.Root>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default PartnerDetailPage;
