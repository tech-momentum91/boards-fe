import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';

import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Switch from '@/components/ui/switch';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Radio from '@/components/ui/radio';
import * as Textarea from '@/components/ui/textarea';
import { PhoneInputController } from '@/components/ui/phone-input';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '@/utils/error-utils';
import {
  PARTNER_CREATE_COMPANY_SIZE_OPTIONS,
  PARTNER_CREATE_ENGAGEMENT_FREQUENCY_OPTIONS,
  PARTNER_CREATE_INDUSTRY_TYPE_OPTIONS,
  PARTNER_FILTER_REVENUE_MODEL_OPTIONS,
  PARTNER_CREATE_PRIMARY_CATEGORY_OPTIONS,
  PARTNER_CREATE_SECONDARY_CATEGORY_OPTIONS,
} from '@/components/partner/constants';

import { State, City } from 'country-state-city';

import { partnerCreateSchema, defaultPartnerValues } from '@/schemas/partner-schema';

/** Until `getStatusOptions` returns; mirrors backend canonical onboarding stages. */
const PARTNER_ONBOARDING_STAGE_FALLBACK_OPTIONS = [
  { value: 'Lead Identified', label: 'Lead Identified' },
  { value: 'Initial Discussion', label: 'Initial Discussion' },
  { value: 'Proposal Shared', label: 'Proposal Shared' },
  { value: 'Commercial Finalized', label: 'Commercial Finalized' },
  { value: 'Agreement Signed', label: 'Agreement Signed' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];
import {
  fetchPartnerMasterAssigneesByRoles,
  selectPartnerMasterAssignees,
} from '@/redux/partnerSlice';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import {
  RiUserAddLine,
  RiArrowRightSLine,
  RiInformationLine,
  RiShieldCheckLine,
  RiGroupLine,
  RiBuilding4Line,
  RiGlobalLine,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiInformationFill,
  RiAddLine,
  RiDeleteBinLine,
} from 'react-icons/ri';

const flattenRhfErrors = (node, basePath = '') => {
  if (!node || typeof node !== 'object') return [];

  if (typeof node?.message === 'string') {
    return [{ path: basePath, message: node.message }];
  }

  // RHF can store array-level errors under `root`
  if (node?.root && typeof node.root === 'object') {
    const rootMsg = typeof node.root?.message === 'string' ? node.root.message : null;
    const out = flattenRhfErrors(node.root, basePath);
    return rootMsg ? [{ path: basePath, message: rootMsg }, ...out] : out;
  }

  const out = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'ref' || key === 'type') continue;
    const nextPath = basePath ? `${basePath}.${key}` : key;
    out.push(...flattenRhfErrors(value, nextPath));
  }
  return out;
};

const partnerFieldLabelFromPath = (path) => {
  const LABELS = {
    partner_name: 'Partner Name',
    website: 'Website',
    primary_category: 'Primary Category',
    secondary_category: 'Secondary Category',
    partner_base_state: 'Partner Base State',
    partner_base_city: 'Partner Base City',
    industry_type: 'Industry Type',
    company_size: 'Company Size',
    linkedin_url: 'LinkedIn URL',
    instagram_url: 'Instagram URL',
    facebook_url: 'Facebook URL',
    youtube_url: 'YouTube URL',
    revenue_model: 'Preferred Revenue Model',
    estimated_engagement_frequency: 'Estimated Engagement Frequency',
    partner_owner: 'Partner owner',
    onboarding_stage: 'Onboarding Stage',
    internal_description: 'Internal Description',
  };

  if (!path) return 'Unknown field';
  if (LABELS[path]) return LABELS[path];

  const contactMatch = path.match(/^contact\.(\d+)\.(.+)$/);
  if (contactMatch) {
    const index = Number(contactMatch[1]) + 1;
    const field = contactMatch[2];
    const contactLabels = {
      contact_name: 'Name',
      contact_designation: 'Designation',
      contact_email: 'Email',
      mobile_number: 'Phone',
      is_primary: 'Primary Contact',
    };
    return `Contact ${index} ${contactLabels[field] || field}`;
  }

  return path;
};

const buildPartnerApiPayload = (values) => ({
  partner_name: values.partner_name.trim(),
  website: (values.website ?? '').trim(),
  primary_category: values.primary_category,
  secondary_category: values.secondary_category.trim(),
  contact: (values.contact || []).map((c) => ({
    contact_name: c.contact_name.trim(),
    contact_designation: c.contact_designation.trim(),
    contact_email: c.contact_email.trim(),
    mobile_number: (c.mobile_number ?? '').trim(),
    is_primary: c.is_primary,
  })),
  partner_base_city: values.partner_base_city.trim(),
  industry_type: values.industry_type.trim(),
  company_size: values.company_size.trim(),
  linkedin_url: (values.linkedin_url ?? '').trim(),
  instagram_url: (values.instagram_url ?? '').trim(),
  facebook_url: (values.facebook_url ?? '').trim(),
  youtube_url: (values.youtube_url ?? '').trim(),
  revenue_model: values.revenue_model || [],
  estimated_engagement_frequency: values.estimated_engagement_frequency,
  partner_owner: values.partner_owner.trim(),
  onboarding_stage: values.onboarding_stage.trim(),
  internal_description: (values.internal_description ?? '').trim(),
});

function PartnerOwnerOptionRow({ user, size = 32, avatarIndex }) {
  const name = user.label || user.name || user.full_name || 'User';
  const email = user.email || user.value || '';
  return (
    <div className='flex items-center gap-2 min-w-0 flex-1'>
      <CrmAccountAvatar
        name={name}
        size={size}
        index={typeof avatarIndex === 'number' ? avatarIndex : undefined}
        className='shrink-0'
      />
      <div className='flex flex-col min-w-0 flex-1 text-left'>
        <span className='text-paragraph-sm text-text-main-900 truncate'>{name}</span>
        {email ? <span className='text-label-xs text-text-soft-400 truncate'>{email}</span> : null}
      </div>
    </div>
  );
}

const PartnerCreateDrawer = ({
  open,
  onOpenChange,
  onSuccess,
  onCreatePartner,
  onboardingStageOptions: onboardingStageOptionsProp = [],
}) => {
  const dispatch = useDispatch();
  const { users: salesOwnerOptions, status: partnerOwnerAssigneesStatus } = useSelector(
    selectPartnerMasterAssignees,
  );
  const ownersLoading =
    partnerOwnerAssigneesStatus === 'loading' || partnerOwnerAssigneesStatus === 'idle';

  useEffect(() => {
    if (!open) return;
    if (partnerOwnerAssigneesStatus === 'succeeded') return;
    dispatch(fetchPartnerMasterAssigneesByRoles());
  }, [open, dispatch, partnerOwnerAssigneesStatus]);

  const [currentTab, setCurrentTab] = useState('basic');
  const contentScrollRef = useRef(null);
  const sectionIdMap = {
    basic: 'basic',
    category: 'category',
    contacts: 'contacts',
    profile: 'profile',
    social: 'social',
    commercial: 'commercial',
    stage: 'stage',
  };

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(partnerCreateSchema),
    defaultValues: defaultPartnerValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const {
    fields: contactFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'contact',
  });

  const allContacts = useWatch({ control, name: 'contact' });
  const partnerBaseStateIso = useWatch({ control, name: 'partner_base_state' });

  const indianStateOptions = useMemo(
    () =>
      State.getStatesOfCountry('IN')
        .map((s) => ({ value: s.isoCode, label: s.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [],
  );

  const indianCityOptionsForPartnerState = useMemo(() => {
    if (!partnerBaseStateIso) return [];
    return City.getCitiesOfState('IN', partnerBaseStateIso)
      .map((c) => ({ value: c.name, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [partnerBaseStateIso]);

  const stageSelectOptions = useMemo(
    () =>
      Array.isArray(onboardingStageOptionsProp) && onboardingStageOptionsProp.length > 0
        ? onboardingStageOptionsProp
        : PARTNER_ONBOARDING_STAGE_FALLBACK_OPTIONS,
    [onboardingStageOptionsProp],
  );

  useEffect(() => {
    if (!open || stageSelectOptions.length === 0) return;
    const cur = getValues('onboarding_stage');
    if (!cur) {
      setValue('onboarding_stage', stageSelectOptions[0].value, { shouldValidate: true });
      return;
    }
    const ok = stageSelectOptions.some((o) => o.value === cur);
    if (!ok) setValue('onboarding_stage', stageSelectOptions[0].value, { shouldValidate: true });
  }, [open, stageSelectOptions, getValues, setValue]);

  const secondaryCategoryOptions = useMemo(() => {
    return PARTNER_CREATE_SECONDARY_CATEGORY_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));
  }, []);

  const companySizeOptions = useMemo(() => {
    return PARTNER_CREATE_COMPANY_SIZE_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));
  }, []);

  const industryTypeOptions = useMemo(() => {
    return PARTNER_CREATE_INDUSTRY_TYPE_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));
  }, []);

  const revenueModelOptions = useMemo(() => {
    return PARTNER_FILTER_REVENUE_MODEL_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));
  }, []);

  const engagementFrequencyOptions = useMemo(() => {
    return PARTNER_CREATE_ENGAGEMENT_FREQUENCY_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));
  }, []);

  const partnerOwnerOptions = useMemo(() => {
    return (salesOwnerOptions || []).map((user, index) => {
      const optValue = user.value ?? user.user_id ?? String(index);
      return {
        value: optValue,
        label: user.label || user.name || user.full_name || 'User',
        user,
        index,
      };
    });
  }, [salesOwnerOptions]);

  const renderPartnerOwnerOptionLabel = useCallback((opt) => {
    return <PartnerOwnerOptionRow user={opt.user} size={32} avatarIndex={opt.index} />;
  }, []);

  const renderPartnerOwnerTrigger = useCallback(
    ({ selectedOption }) => {
      if (!selectedOption) {
        return ownersLoading
          ? 'Loading users…'
          : salesOwnerOptions?.length
            ? 'Select partner owner'
            : 'No sales users available';
      }
      return (
        <div className='flex items-center gap-2 min-w-0'>
          <CrmAccountAvatar
            name={selectedOption.label}
            size={24}
            index={selectedOption.index}
            className='shrink-0'
          />
          <span className='truncate text-paragraph-sm text-text-main-900'>
            {selectedOption.label}
          </span>
        </div>
      );
    },
    [ownersLoading, salesOwnerOptions],
  );

  const handleTabChange = async (value) => {
    setCurrentTab(value);
    const targetId = sectionIdMap[value] || 'basic';
    setTimeout(() => {
      const scrollContainer = contentScrollRef.current;
      if (!scrollContainer) return;
      const targetSection = scrollContainer.querySelector(`#${targetId}`);
      if (!targetSection) return;
      scrollContainer.scrollTo({
        top: targetSection.offsetTop,
        behavior: 'smooth',
      });
    }, 0);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange?.(false);
      setCurrentTab('basic');
      reset(defaultPartnerValues);
      clearErrors();
    }
  };

  const handleRemoveContact = (index) => {
    const contacts = allContacts || [];
    const contactToRemove = contacts[index];

    if (contactToRemove?.is_primary === 1) {
      const primaryCount = contacts.filter((c) => c?.is_primary === 1).length;
      if (primaryCount === 1 && contacts.length > 1) {
        const nextContactIndex = contacts.findIndex((_, i) => i !== index);
        if (nextContactIndex !== -1) {
          setValue(`contact.${nextContactIndex}.is_primary`, 1);
        }
      }
    }

    remove(index);
  };

  const onSubmit = async (formValues) => {
    try {
      if (onCreatePartner) {
        await onCreatePartner(buildPartnerApiPayload(formValues));
      }
      showSuccessToast('Partner created successfully.');
      onSuccess?.(formValues);
      onOpenChange?.(false);
      setCurrentTab('basic');
      reset(defaultPartnerValues);
      clearErrors();
    } catch (error) {
      showErrorToast(extractErrorMessage(error), { defaultMessage: 'Failed to create partner' });
    }
  };

  const onInvalid = (formErrors) => {
    const flat = flattenRhfErrors(formErrors);
    const labels = [];
    const seen = new Set();
    for (const e of flat) {
      const label = partnerFieldLabelFromPath(e.path);
      if (!label || seen.has(label)) continue;
      seen.add(label);
      labels.push(label);
    }

    if (labels.length === 0) {
      showErrorToast('Please check the form for errors.', { defaultMessage: 'Form has errors' });
      return;
    }

    const MAX = 6;
    const shown = labels.slice(0, MAX);
    const remaining = labels.length - shown.length;
    const suffix = remaining > 0 ? `, and ${remaining} more` : '';
    showErrorToast(`Please fill in the required fields: ${shown.join(', ')}${suffix}.`, {
      defaultMessage: 'Please fill in the required fields',
    });
  };

  const renderBasicInfo = () => (
    <div className='flex flex-col gap-3 pb-5' id='basic'>
      <h3 className='text-label-md text-neutral-500'>Basic Information</h3>
      <div className='grid grid-cols-2 gap-3'>
        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor='partner_name'>
            Partner Name <Label.Asterisk />
          </Label.Root>
          <Controller
            name='partner_name'
            control={control}
            render={({ field }) => (
              <Input.Root hasError={!!errors.partner_name} size='medium'>
                <Input.Wrapper>
                  <Input.Input id='partner_name' {...field} placeholder='Enter partner name' />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errors.partner_name && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors.partner_name.message}
            </Hint.Root>
          )}
        </div>

        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor='website'>Website</Label.Root>
          <Controller
            name='website'
            control={control}
            render={({ field }) => (
              <Input.Root hasError={!!errors.website} size='medium'>
                <Input.Wrapper>
                  <Input.Input id='website' {...field} placeholder='https://example.com' />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errors.website && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors.website.message}
            </Hint.Root>
          )}
        </div>
      </div>
    </div>
  );

  const renderCategoryStep = () => {
    return (
      <div className='flex flex-col gap-5 pt-4 pb-5' id='category'>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='primary_category'>
              Primary Category <Label.Asterisk />
            </Label.Root>
            <Controller
              name='primary_category'
              control={control}
              render={({ field }) => (
                <Radio.Group
                  value={field.value}
                  onValueChange={field.onChange}
                  className='grid grid-cols-3 gap-3'
                >
                  {PARTNER_CREATE_PRIMARY_CATEGORY_OPTIONS.map((opt) => {
                    const isSelected = field.value === opt.value;
                    return (
                      <Radio.Label
                        key={opt.value}
                        htmlFor={opt.value}
                        noBg={true}
                        className={[
                          'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer',
                          'border border-stroke-soft-200',
                          isSelected
                            ? 'bg-primary-lighter text-primary-base border-primary-base'
                            : 'bg-white',
                        ].join(' ')}
                      >
                        <Radio.Item value={opt.value} id={opt.value} />
                        <span className='text-label-sm whitespace-nowrap'>{opt.label}</span>
                      </Radio.Label>
                    );
                  })}
                </Radio.Group>
              )}
            />
            {errors.primary_category && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.primary_category.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='secondary_category'>Secondary Category</Label.Root>
            <Controller
              name='secondary_category'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  size='medium'
                  hasError={!!errors.secondary_category}
                  options={secondaryCategoryOptions}
                  placeholder='Select Secondary Category'
                  triggerClassName='w-full text-left'
                />
              )}
            />
            {errors.secondary_category && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.secondary_category.message}
              </Hint.Root>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContactsStep = () => {
    return (
      <div className='flex flex-col gap-5 pt-4 pb-5' id='contacts'>
        <div className='flex flex-col gap-3'>
          <h3 className='text-label-md text-neutral-500'>Contact Details</h3>

          <div className='flex flex-col gap-4'>
            {contactFields.map((contact, index) => {
              const contactErrors = errors.contact?.[index];
              return (
                <div key={contact.id} className='rounded-xl border border-stroke-soft-200 pt-0'>
                  <div className='flex items-center justify-between px-2 py-[10px] rounded-t-xl bg-bg-weak-100'>
                    <span className='text-label-xs text-text-sub-500'>CONTACT {index + 1}</span>

                    <div className='flex items-center gap-2'>
                      <div className='flex items-center gap-2'>
                        <Controller
                          name={`contact.${index}.is_primary`}
                          control={control}
                          render={({ field }) => (
                            <Switch.Root
                              id={`contact.${index}.is_primary`}
                              checked={field.value === 1}
                              onCheckedChange={(checked) => {
                                if (!checked) {
                                  const contacts = allContacts || [];
                                  const primaryCount = contacts.filter(
                                    (c) => c?.is_primary === 1,
                                  ).length;
                                  if (primaryCount === 1) return;
                                }

                                if (checked) {
                                  contactFields.forEach((_, i) => {
                                    if (i !== index) {
                                      setValue(`contact.${i}.is_primary`, 0);
                                    }
                                  });
                                }
                                field.onChange(checked ? 1 : 0);
                              }}
                            />
                          )}
                        />
                        <Label.Root
                          htmlFor={`contact.${index}.is_primary`}
                          className='text-label-sm text-text-main-900'
                        >
                          Primary Contact
                        </Label.Root>
                      </div>

                      {contactFields.length > 1 && (
                        <>
                          <div className='w-px h-4 bg-stroke-sub-300' />
                          <CompactButton.Root
                            type='button'
                            size='medium'
                            variant='ghost'
                            onClick={() => handleRemoveContact(index)}
                            className='text-text-sub-500'
                          >
                            <CompactButton.Icon as={RiDeleteBinLine} />
                          </CompactButton.Root>
                        </>
                      )}
                    </div>
                  </div>

                  <div className='border-t border-stroke-soft-200 rounded-b-xl bg-white p-4'>
                    <div className='grid grid-cols-2 gap-3'>
                      <div className='flex flex-col gap-1'>
                        <Label.Root htmlFor={`contact.${index}.contact_name`}>
                          Name <Label.Asterisk />
                        </Label.Root>
                        <Controller
                          name={`contact.${index}.contact_name`}
                          control={control}
                          render={({ field }) => (
                            <Input.Root hasError={!!contactErrors?.contact_name} size='medium'>
                              <Input.Wrapper>
                                <Input.Input
                                  id={`contact.${index}.contact_name`}
                                  {...field}
                                  placeholder='Full name'
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {contactErrors?.contact_name && (
                          <Hint.Root hasError>
                            <Hint.Icon as={RiInformationFill} />
                            {contactErrors.contact_name.message}
                          </Hint.Root>
                        )}
                      </div>

                      <div className='flex flex-col gap-1'>
                        <Label.Root htmlFor={`contact.${index}.contact_designation`}>
                          Designation
                        </Label.Root>
                        <Controller
                          name={`contact.${index}.contact_designation`}
                          control={control}
                          render={({ field }) => (
                            <Input.Root
                              hasError={!!contactErrors?.contact_designation}
                              size='medium'
                            >
                              <Input.Wrapper>
                                <Input.Input
                                  id={`contact.${index}.contact_designation`}
                                  {...field}
                                  placeholder='Title'
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {contactErrors?.contact_designation && (
                          <Hint.Root hasError>
                            <Hint.Icon as={RiInformationFill} />
                            {contactErrors.contact_designation.message}
                          </Hint.Root>
                        )}
                      </div>

                      <div className='flex flex-col gap-1'>
                        <Label.Root htmlFor={`contact.${index}.contact_email`}>
                          Email <Label.Asterisk />
                        </Label.Root>
                        <Controller
                          name={`contact.${index}.contact_email`}
                          control={control}
                          render={({ field }) => (
                            <Input.Root hasError={!!contactErrors?.contact_email} size='medium'>
                              <Input.Wrapper>
                                <Input.Input
                                  id={`contact.${index}.contact_email`}
                                  {...field}
                                  type='email'
                                  placeholder='email@example.com'
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {contactErrors?.contact_email && (
                          <Hint.Root hasError>
                            <Hint.Icon as={RiInformationFill} />
                            {contactErrors.contact_email.message}
                          </Hint.Root>
                        )}
                      </div>

                      <div className='flex flex-col gap-1'>
                        <Label.Root htmlFor={`contact.${index}.mobile_number`}>
                          Phone <Label.Asterisk />
                        </Label.Root>
                        <Controller
                          name={`contact.${index}.mobile_number`}
                          control={control}
                          render={({ field, fieldState }) => (
                            <PhoneInputController
                              value={field.value}
                              onChange={(formattedValue) => field.onChange(formattedValue)}
                              error={fieldState.error}
                              size='medium'
                              variant='default'
                              placeholder='9876500011'
                              maxLength={15}
                              disabled={isSubmitting}
                            />
                          )}
                        />
                        {contactErrors?.mobile_number && (
                          <Hint.Root hasError>
                            <Hint.Icon as={RiInformationFill} />
                            {contactErrors.mobile_number.message}
                          </Hint.Root>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='medium'
              onClick={() =>
                append({
                  contact_name: '',
                  contact_designation: '',
                  contact_email: '',
                  mobile_number: '',
                  is_primary: 0,
                })
              }
              className='w-full'
            >
              <Button.Icon as={RiAddLine} className='mr-1' />
              Add Another Contact
            </Button.Root>
          </div>
        </div>
      </div>
    );
  };

  const renderCompanyProfile = () => {
    return (
      <div className='flex flex-col gap-3 pt-4 pb-5' id='profile'>
        <div className='grid grid-cols-2 gap-3'>
          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='partner_base_state'>
              Partner Base State <Label.Asterisk />
            </Label.Root>
            <Controller
              name='partner_base_state'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={(next) => {
                    field.onChange(next);
                    setValue('partner_base_city', '');
                  }}
                  size='medium'
                  hasError={!!errors.partner_base_state}
                  options={indianStateOptions}
                  placeholder='Select State'
                  triggerClassName='w-full text-left'
                />
              )}
            />
            {errors.partner_base_state && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.partner_base_state.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='partner_base_city'>
              Partner Base City <Label.Asterisk />
            </Label.Root>
            <Controller
              name='partner_base_city'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  size='medium'
                  hasError={!!errors.partner_base_city}
                  disabled={!partnerBaseStateIso}
                  options={indianCityOptionsForPartnerState}
                  placeholder='Select City'
                  triggerClassName='w-full text-left'
                />
              )}
            />
            {errors.partner_base_city && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.partner_base_city.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='company_size'>
              Company Size <Label.Asterisk />
            </Label.Root>
            <Controller
              name='company_size'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  size='medium'
                  hasError={!!errors.company_size}
                  options={companySizeOptions}
                  placeholder='Select Company Size'
                  triggerClassName='w-full text-left'
                />
              )}
            />
            {errors.company_size && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.company_size.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='industry_type'>
              Industry Type <Label.Asterisk />
            </Label.Root>
            <Controller
              name='industry_type'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  size='medium'
                  hasError={!!errors.industry_type}
                  options={industryTypeOptions}
                  placeholder='Select Industry Type'
                  triggerClassName='w-full text-left'
                />
              )}
            />
            {errors.industry_type && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.industry_type.message}
              </Hint.Root>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSocialUrls = () => {
    const socialFields = [
      {
        name: 'linkedin_url',
        label: 'LinkedIn URL',
        placeholder: 'https://linkedin.com/company/...',
      },
      { name: 'instagram_url', label: 'Instagram URL', placeholder: 'https://instagram.com/...' },
      { name: 'facebook_url', label: 'Facebook URL', placeholder: 'https://facebook.com/...' },
      { name: 'youtube_url', label: 'YouTube URL', placeholder: 'https://youtube.com/...' },
    ];

    return (
      <div className='flex flex-col gap-5 pt-4 pb-5' id='social'>
        <h3 className='text-label-md text-neutral-500'>Social URLs</h3>
        <div className='flex flex-col gap-3'>
          {socialFields.map((f) => (
            <div key={f.name} className='flex flex-col gap-1'>
              <Label.Root htmlFor={f.name}>{f.label}</Label.Root>
              <Controller
                name={f.name}
                control={control}
                render={({ field }) => (
                  <Input.Root hasError={!!errors[f.name]} size='medium'>
                    <Input.Wrapper>
                      <Input.Input id={f.name} {...field} placeholder={f.placeholder} />
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
              {errors[f.name] && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiInformationFill} />
                  {errors[f.name].message}
                </Hint.Root>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCommercial = () => {
    return (
      <div className='grid grid-cols-2 gap-5 pt-4 pb-5' id='commercial'>
        <div className='flex flex-col gap-3'>
          <Label.Root htmlFor='revenue_model'>Preferred Revenue Model</Label.Root>

          <Controller
            name='revenue_model'
            control={control}
            render={({ field }) => {
              const rows = field.value || [];
              const selectedRevenueModel = rows[0]?.revenue_model || '';
              return (
                <SearchableSelect
                  value={selectedRevenueModel}
                  onValueChange={(next) => {
                    if (next === selectedRevenueModel) return;
                    field.onChange(next ? [{ revenue_model: next }] : []);
                  }}
                  size='medium'
                  hasError={!!errors.revenue_model}
                  options={revenueModelOptions}
                  placeholder='Select Preferred Revenue Model'
                  triggerClassName='w-full text-left'
                />
              );
            }}
          />

          {errors.revenue_model && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors.revenue_model.message}
            </Hint.Root>
          )}
        </div>

        <div className='flex flex-col gap-3'>
          <Label.Root htmlFor='estimated_engagement_frequency'>
            Estimated Engagement Frequency <Label.Asterisk />
          </Label.Root>
          <Controller
            name='estimated_engagement_frequency'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onValueChange={field.onChange}
                size='medium'
                hasError={!!errors.estimated_engagement_frequency}
                options={engagementFrequencyOptions}
                placeholder='Select Estimated Engagement Frequency'
                triggerClassName='w-full text-left'
              />
            )}
          />
          {errors.estimated_engagement_frequency && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors.estimated_engagement_frequency.message}
            </Hint.Root>
          )}
        </div>
      </div>
    );
  };

  const renderStageAndNotes = () => {
    return (
      <div className='flex flex-col gap-5 pt-4 pb-5' id='stage'>
        <div className='grid grid-cols-2 gap-3'>
          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='partner_owner'>
              Partner owner <Label.Asterisk />
            </Label.Root>
            <Controller
              name='partner_owner'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  size='medium'
                  hasError={!!errors.partner_owner}
                  disabled={ownersLoading}
                  options={partnerOwnerOptions}
                  placeholder='Select partner owner'
                  triggerClassName='w-full text-left'
                  renderTrigger={renderPartnerOwnerTrigger}
                  renderOptionLabel={renderPartnerOwnerOptionLabel}
                />
              )}
            />
            {errors.partner_owner && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.partner_owner.message}
              </Hint.Root>
            )}
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root htmlFor='onboarding_stage'>
              Onboarding Stage <Label.Asterisk />
            </Label.Root>
            <Controller
              name='onboarding_stage'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  size='medium'
                  hasError={!!errors.onboarding_stage}
                  options={stageSelectOptions}
                  placeholder='Select Onboarding Stage'
                  triggerClassName='w-full text-left'
                />
              )}
            />
            {errors.onboarding_stage && (
              <Hint.Root hasError>
                <Hint.Icon as={RiInformationFill} />
                {errors.onboarding_stage.message}
              </Hint.Root>
            )}
          </div>
        </div>

        <div className='flex flex-col gap-1'>
          <Label.Root htmlFor='internal_description'>Internal Description</Label.Root>
          <Controller
            name='internal_description'
            control={control}
            render={({ field }) => (
              <Textarea.Root
                {...field}
                id='internal_description'
                placeholder='Describe the partner, engagement goals, and any internal notes...'
                rows={5}
                hasError={!!errors.internal_description}
                simple
                variant='default'
                className='min-h-[120px]'
              />
            )}
          />
          {errors.internal_description && (
            <Hint.Root hasError>
              <Hint.Icon as={RiInformationFill} />
              {errors.internal_description.message}
            </Hint.Root>
          )}
        </div>
      </div>
    );
  };

  const renderAllSections = () => (
    <div className='flex flex-col divide-y divide-stroke-soft-200'>
      {renderBasicInfo()}
      {renderCategoryStep()}
      {renderContactsStep()}
      {renderCompanyProfile()}
      {renderSocialUrls()}
      {renderCommercial()}
      {renderStageAndNotes()}
    </div>
  );

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='relative flex h-full max-w-[800px] flex-col overflow-hidden'>
        <Drawer.Header className='sticky top-0 z-10 bg-white'>
          <div className='flex items-center justify-between gap-4 px-6 py-5'>
            <div className='rounded-full border border-stroke-soft-200 p-2.5'>
              <RiUserAddLine size={24} />
            </div>
            <div className='flex flex-col gap-1'>
              <Drawer.Title className='label-medium text-text-main-900'>Add Partner</Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>
                Add a new ecosystem or business partner
              </p>
            </div>
          </div>
        </Drawer.Header>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className='flex h-full flex-col overflow-hidden'
        >
          <Drawer.Body className='flex-1 overflow-hidden'>
            <TabMenuVertical.Root
              value={currentTab}
              onValueChange={handleTabChange}
              className='flex h-full w-full'
            >
              <TabMenuVertical.List className='p-4 w-[240px] bg-bg-weak-100 border-r border-stroke-soft-200'>
                <TabMenuVertical.Trigger
                  value='basic'
                  className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <TabMenuVertical.Icon as={RiInformationLine} />
                  <span className='truncate'>Basic Info</span>
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
                <TabMenuVertical.Trigger
                  value='category'
                  className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <TabMenuVertical.Icon as={RiShieldCheckLine} />
                  <span className='truncate'>Category</span>
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
                <TabMenuVertical.Trigger
                  value='contacts'
                  className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <TabMenuVertical.Icon as={RiGroupLine} />
                  <span className='truncate'>Contacts</span>
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
                <TabMenuVertical.Trigger
                  value='profile'
                  className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <TabMenuVertical.Icon as={RiBuilding4Line} />
                  <span className='truncate'>Company Profile</span>
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
                <TabMenuVertical.Trigger
                  value='social'
                  className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <TabMenuVertical.Icon as={RiGlobalLine} />
                  <span className='truncate'>Social URLs</span>
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
                <TabMenuVertical.Trigger
                  value='commercial'
                  className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <TabMenuVertical.Icon as={RiPriceTag3Line} />
                  <span className='truncate'>Commercial</span>
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
                <TabMenuVertical.Trigger
                  value='stage'
                  className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <TabMenuVertical.Icon as={RiStickyNoteLine} />
                  <span className='truncate'>Stage &amp; Notes</span>
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
              </TabMenuVertical.List>

              <div ref={contentScrollRef} className='flex-1 overflow-y-auto'>
                {Object.keys(sectionIdMap).map((tabValue) => (
                  <TabMenuVertical.Content key={tabValue} value={tabValue} className='h-full'>
                    <div className='px-8 py-5'>{renderAllSections()}</div>
                  </TabMenuVertical.Content>
                ))}
              </div>
            </TabMenuVertical.Root>
          </Drawer.Body>

          <Drawer.Footer className='border-t bg-white'>
            <div className='flex items-center justify-end gap-3 p-6'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                onClick={handleClose}
                disabled={isSubmitting}
                className='w-20'
              >
                Cancel
              </Button.Root>
              <Button.Root type='submit' size='medium' disabled={isSubmitting} className='w-28'>
                {isSubmitting ? 'Saving...' : 'Save Partner'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default PartnerCreateDrawer;
