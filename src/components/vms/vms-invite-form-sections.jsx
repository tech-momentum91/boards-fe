import { useMemo } from 'react';
import { Controller } from 'react-hook-form';
import {
  RiAccountCircleLine,
  RiBuildingLine,
  RiCalendarLine,
  RiFileLine,
  RiHammerLine,
  RiUserFollowLine,
} from 'react-icons/ri';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Switch from '@/components/ui/switch';
import * as ButtonGroup from '@/components/ui/button-group';
import { Datepicker } from '@/components/ui/datepicker';
import { startOfDay } from 'date-fns';
import { TIME_OPTIONS } from '@/components/bookings/constants';
import { PhoneInputController } from '@/components/ui/phone-input';
import ErrorText from '@/components/ui/error-text';
import * as Button from '@/components/ui/button';
import * as Divider from '@/components/ui/divider';
import {
  VISITOR_WHOM_TO_MEET_INVITE_LABEL,
  VISITOR_WHOM_TO_MEET_OPTIONS,
  TYPE_OF_SPACE_OPTIONS,
} from '@/components/vms/constants';

function FormSectionHeader({ icon: Icon, children }) {
  return (
    <span className='flex items-center gap-2 label-medium text-text-sub-500'>
      {Icon ? <Icon className='size-5 shrink-0 text-text-soft-400' aria-hidden /> : null}
      {children}
    </span>
  );
}

/** One independent form block; use the same idea as Space Details (isolated section + layout classes on this node). */
function FormSection({ className, children, ...rest }) {
  return (
    <section className={className} {...rest}>
      {children}
    </section>
  );
}

/**
 * Space inquiry — type of space + seats. Compose in the drawer next to direct/CP blocks (not nested inside them).
 */
export function SpaceDetailsSection({ register, control, errors }) {
  return (
    <FormSection className='flex flex-col gap-4'>
      <FormSectionHeader icon={RiBuildingLine}>Space Details</FormSectionHeader>
      <div className='grid w-full grid-cols-2 gap-x-4 gap-y-4'>
        <div className='flex flex-col gap-1'>
          <Label.Root>
            Type of Space
            <Label.Asterisk />
          </Label.Root>
          <Controller
            name='type_of_space'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                size='small'
                value={field.value || ''}
                onValueChange={field.onChange}
                options={TYPE_OF_SPACE_OPTIONS.map((item) => ({
                  value: item,
                  label: item,
                }))}
                placeholder='Select'
                triggerClassName='w-full'
              />
            )}
          />
          {errors.type_of_space && (
            <ErrorText>{errors.type_of_space.message || 'Field is mandatory'}</ErrorText>
          )}
        </div>
        <div className='flex flex-col gap-1'>
          <Label.Root>
            No. of Seats
            <Label.Asterisk />
          </Label.Root>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Input
                type='number'
                placeholder='Enter no. of seats'
                {...register('seats', { valueAsNumber: true })}
              />
            </Input.Wrapper>
          </Input.Root>
          {errors.seats && <ErrorText>{errors.seats.message || 'Field is mandatory'}</ErrorText>}
        </div>
      </div>
    </FormSection>
  );
}

/** Inquiry type segmented control (Space only). */
export function SpaceInquiryTypeToggle({ inquiryType, onInquiryTypeChange }) {
  return (
    <FormSection className='w-full pb-6 flex gap-1 flex-col'>
      <Label.Root>
        Inquiry Type
        <Label.Asterisk />
      </Label.Root>
      <ButtonGroup.Root size='xsmall'>
        <ButtonGroup.Item
          className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
          onClick={() => onInquiryTypeChange('direct')}
          data-state={inquiryType === 'direct' ? 'on' : 'off'}
          type='button'
        >
          Direct
        </ButtonGroup.Item>
        <ButtonGroup.Item
          className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
          onClick={() => onInquiryTypeChange('channel-partner')}
          data-state={inquiryType === 'channel-partner' ? 'on' : 'off'}
          type='button'
        >
          Channel Partner
        </ButtonGroup.Item>
      </ButtonGroup.Root>
    </FormSection>
  );
}

export function SpaceDirectFields({
  register,
  control,
  errors,
  watch,
  centerListData,
  leadSourceListData,
  salesPersonListData,
}) {
  const source_category = watch('source_category');

  const centerOptions = useMemo(() => {
    return (Array.isArray(centerListData) ? centerListData : []).map((center) => ({
      value: center.name,
      label: center.center_name || center.name || 'Unnamed Center',
    }));
  }, [centerListData]);

  const sourceCategoryOptions = useMemo(() => {
    const list = (leadSourceListData || []).map((row) => ({
      value: row.name,
      label: row.lead_source || row.name,
    }));
    if (!list.some((s) => s.value === 'Other')) {
      list.push({ value: 'Other', label: 'Other' });
    }
    return list;
  }, [leadSourceListData]);

  const salesPersonOptions = useMemo(() => {
    return (salesPersonListData || []).map((sp) => ({
      value: sp.name,
      label: sp.full_name,
    }));
  }, [salesPersonListData]);

  return (
    <div className='grid w-full grid-cols-2 gap-x-4 gap-y-3'>
      <div className='w-full flex flex-col gap-1'>
        <Label.Root>
          First Name
          <Label.Asterisk />
        </Label.Root>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Input placeholder='Enter first name' {...register('first_name')} />
          </Input.Wrapper>
        </Input.Root>
        {errors.first_name && (
          <ErrorText>{errors.first_name.message || 'Field is mandatory'}</ErrorText>
        )}
      </div>
      <div className='w-full flex flex-col gap-1'>
        <Label.Root>
          Last Name
          <Label.Asterisk />
        </Label.Root>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Input placeholder='Enter last name' {...register('last_name')} />
          </Input.Wrapper>
        </Input.Root>
        {errors.last_name && (
          <ErrorText>{errors.last_name.message || 'Field is mandatory'}</ErrorText>
        )}
      </div>
      <div className='w-full flex flex-col gap-1'>
        <Label.Root>
          Mobile Number
          <Label.Asterisk />
        </Label.Root>
        <Controller
          name='mobile_number'
          control={control}
          render={({ field }) => (
            <PhoneInputController
              value={field.value || ''}
              onChange={field.onChange}
              error={errors.mobile_number?.message || null}
              size='small'
              variant='default'
              placeholder='9876500011'
              maxLength={10}
              disabled={false}
            />
          )}
        />
        {errors.mobile_number && (
          <ErrorText>{errors.mobile_number.message || 'Field is mandatory'}</ErrorText>
        )}
      </div>
      <div className='w-full flex flex-col gap-1'>
        <Label.Root>
          Email
          <Label.Asterisk />
        </Label.Root>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Input type='email' placeholder='Enter email address' {...register('email')} />
          </Input.Wrapper>
        </Input.Root>
        {errors.email && <ErrorText>{errors.email.message || 'Field is mandatory'}</ErrorText>}
      </div>
      <div className='w-full flex flex-col gap-1'>
        <Label.Root>Company/Orgnization Name</Label.Root>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Input placeholder='Enter company name' {...register('company_name')} />
          </Input.Wrapper>
        </Input.Root>
      </div>
      <div className='w-full flex flex-col gap-1'>
        <Label.Root>
          Center
          <Label.Asterisk />
        </Label.Root>
        <Controller
          name='center'
          control={control}
          render={({ field }) => (
            <SearchableSelect
              size='small'
              value={field.value || ''}
              onValueChange={field.onChange}
              options={centerOptions}
              placeholder='Select center'
              triggerClassName='w-full'
            />
          )}
        />
        {errors.center && <ErrorText>{errors.center.message || 'Field is mandatory'}</ErrorText>}
      </div>
      <div className='w-full flex flex-col gap-1'>
        <Label.Root>No. of Visitors</Label.Root>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Input
              type='number'
              placeholder='Enter number of visitors'
              {...register('no_of_visitors', { valueAsNumber: true })}
            />
          </Input.Wrapper>
        </Input.Root>
        {errors.no_of_visitors && <ErrorText>{errors.no_of_visitors.message}</ErrorText>}
      </div>
      <div className='w-full flex flex-col gap-1'>
        <Label.Root>Source Category</Label.Root>
        <Controller
          name='source_category'
          control={control}
          render={({ field }) => (
            <SearchableSelect
              size='small'
              value={field.value || ''}
              onValueChange={field.onChange}
              options={sourceCategoryOptions}
              placeholder='Select'
              triggerClassName='w-full'
            />
          )}
        />
      </div>
      {source_category === 'Other' && (
        <div className='col-span-2 flex flex-col gap-1'>
          <Label.Root>
            Other Source
            <Label.Asterisk />
          </Label.Root>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Input placeholder='Enter other source' {...register('other_source')} />
            </Input.Wrapper>
          </Input.Root>
          {errors.other_source && <ErrorText>{errors.other_source.message}</ErrorText>}
        </div>
      )}
      <div className='w-full flex flex-col gap-1'>
        <Label.Root>Sales Person in Touch</Label.Root>
        <Controller
          name='sales_person_in_touch'
          control={control}
          render={({ field }) => (
            <SearchableSelect
              size='small'
              value={field.value || ''}
              onValueChange={field.onChange}
              options={salesPersonOptions}
              placeholder='Select'
              triggerClassName='w-full'
            />
          )}
        />
      </div>
      <div className='w-full flex flex-col gap-1'>
        <Label.Root>Vehicle Number</Label.Root>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Input placeholder='Enter vehicle number' {...register('vehicle_number')} />
          </Input.Wrapper>
        </Input.Root>
      </div>
      <div className='flex flex-col gap-1'>
        <Label.Root>Badge Number</Label.Root>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Input placeholder='Enter badge number' {...register('badge_number')} />
          </Input.Wrapper>
        </Input.Root>
      </div>
    </div>
  );
}

/**
 * Channel partner: CP block + Client details. Space Details is composed in the drawer (`SpaceDetailsSection`).
 */
export function SpaceChannelPartnerFields({
  register,
  control,
  errors,
  centerListData,
  salesPersonListData,
}) {
  const centerOptions = useMemo(() => {
    return (Array.isArray(centerListData) ? centerListData : []).map((center) => ({
      value: center.name,
      label: center.center_name || center.name || 'Unnamed Center',
    }));
  }, [centerListData]);

  const salesPersonOptions = useMemo(() => {
    return (salesPersonListData || []).map((sp) => ({
      value: sp.name,
      label: sp.full_name,
    }));
  }, [salesPersonListData]);

  return (
    <div className='flex w-full flex-col gap-4'>
      <FormSection className='flex flex-col gap-4'>
        <FormSectionHeader icon={RiAccountCircleLine}>Channel Partner Details</FormSectionHeader>
        <div className='grid w-full grid-cols-2 gap-x-4 gap-y-4'>
          <div className='w-full flex flex-col gap-2'>
            <Label.Root>
              CP Type
              <Label.Asterisk />
            </Label.Root>
            <Controller
              name='cp_type'
              control={control}
              render={({ field }) => (
                <ButtonGroup.Root size='xsmall'>
                  <ButtonGroup.Item
                    className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base text-center'
                    onClick={() => field.onChange('Digital')}
                    data-state={field.value === 'Digital' ? 'on' : 'off'}
                    type='button'
                  >
                    Digital
                  </ButtonGroup.Item>
                  <ButtonGroup.Item
                    className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base text-center'
                    onClick={() => field.onChange('IPC')}
                    data-state={field.value === 'IPC' ? 'on' : 'off'}
                    type='button'
                  >
                    IPC
                  </ButtonGroup.Item>
                  <ButtonGroup.Item
                    className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base text-center'
                    onClick={() => field.onChange('DPC')}
                    data-state={field.value === 'DPC' ? 'on' : 'off'}
                    type='button'
                  >
                    <span className='label-small w-full text-left'>DPC</span>
                  </ButtonGroup.Item>
                </ButtonGroup.Root>
              )}
            />
            {errors.cp_type && <ErrorText>{errors.cp_type.message}</ErrorText>}
          </div>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>
              CP Company Legal Name
              <Label.Asterisk />
            </Label.Root>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Input
                  placeholder='Enter CP company legal name'
                  {...register('cp_company_legal_name')}
                />
              </Input.Wrapper>
            </Input.Root>
            {errors.cp_company_legal_name && (
              <ErrorText>{errors.cp_company_legal_name.message}</ErrorText>
            )}
          </div>
        </div>
        <div className='grid w-full grid-cols-2 gap-x-4 gap-y-4'>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>
              CP First Name
              <Label.Asterisk />
            </Label.Root>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Input placeholder='Enter first name' {...register('first_name')} />
              </Input.Wrapper>
            </Input.Root>
            {errors.first_name && <ErrorText>{errors.first_name.message}</ErrorText>}
          </div>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>
              CP Last Name
              <Label.Asterisk />
            </Label.Root>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Input placeholder='Enter last name' {...register('last_name')} />
              </Input.Wrapper>
            </Input.Root>
            {errors.last_name && <ErrorText>{errors.last_name.message}</ErrorText>}
          </div>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>
              CP Contact Mobile Number
              <Label.Asterisk />
            </Label.Root>
            <Controller
              name='mobile_number'
              control={control}
              render={({ field }) => (
                <PhoneInputController
                  value={field.value || ''}
                  onChange={field.onChange}
                  error={errors.mobile_number?.message || null}
                  size='small'
                  variant='default'
                  placeholder='000 000 0000'
                  maxLength={10}
                  disabled={false}
                />
              )}
            />
            {errors.mobile_number && <ErrorText>{errors.mobile_number.message}</ErrorText>}
          </div>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>
              CP Contact Email
              <Label.Asterisk />
            </Label.Root>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Input
                  type='email'
                  placeholder='Enter CP contact email address'
                  {...register('email')}
                />
              </Input.Wrapper>
            </Input.Root>
            {errors.email && <ErrorText>{errors.email.message}</ErrorText>}
          </div>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>
              Center
              <Label.Asterisk />
            </Label.Root>
            <Controller
              name='center'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  size='small'
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  options={centerOptions}
                  placeholder='Select'
                  triggerClassName='w-full'
                />
              )}
            />
            {errors.center && <ErrorText>{errors.center.message}</ErrorText>}
          </div>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>No. of Visitors</Label.Root>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Input
                  type='number'
                  placeholder='Enter number of visitors'
                  {...register('no_of_visitors', { valueAsNumber: true })}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
        </div>
      </FormSection>

      <Divider.Root />
      <FormSection className='flex flex-col gap-4'>
        <FormSectionHeader icon={RiUserFollowLine}>Client Details</FormSectionHeader>
        <div className='grid w-full grid-cols-2 gap-x-4 gap-y-4'>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>
              First Name
              <Label.Asterisk />
            </Label.Root>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Input placeholder='Enter first name' {...register('client_first_name')} />
              </Input.Wrapper>
            </Input.Root>
            {errors.client_first_name && <ErrorText>{errors.client_first_name.message}</ErrorText>}
          </div>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>
              Last Name
              <Label.Asterisk />
            </Label.Root>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Input placeholder='Enter last name' {...register('client_last_name')} />
              </Input.Wrapper>
            </Input.Root>
            {errors.client_last_name && <ErrorText>{errors.client_last_name.message}</ErrorText>}
          </div>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>
              Mobile Number
              <Label.Asterisk />
            </Label.Root>
            <Controller
              name='client_mobile_number'
              control={control}
              render={({ field }) => (
                <PhoneInputController
                  value={field.value || ''}
                  onChange={field.onChange}
                  error={errors.client_mobile_number?.message || null}
                  size='small'
                  variant='default'
                  placeholder='9876500011'
                  maxLength={10}
                  disabled={false}
                />
              )}
            />
            {errors.client_mobile_number && (
              <ErrorText>{errors.client_mobile_number.message}</ErrorText>
            )}
          </div>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>Email</Label.Root>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Input
                  type='email'
                  placeholder='Enter email address'
                  {...register('client_email')}
                />
              </Input.Wrapper>
            </Input.Root>
            {errors.client_email && <ErrorText>{errors.client_email.message}</ErrorText>}
          </div>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>Company/Organization Name</Label.Root>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Input
                  placeholder='Enter company name'
                  {...register('client_company_name')}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>Vehicle Number</Label.Root>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Input placeholder='Enter vehicle number' {...register('vehicle_number')} />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>Badge Number</Label.Root>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Input placeholder='Enter badge number' {...register('badge_number')} />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='w-full flex flex-col gap-1 col-span-2'>
            <Label.Root>Sales Person in Touch</Label.Root>
            <Controller
              name='sales_person_in_touch'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  size='small'
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  options={salesPersonOptions}
                  placeholder='Select'
                  triggerClassName='w-full'
                />
              )}
            />
          </div>
        </div>
      </FormSection>
    </div>
  );
}

/** Visitors / vendors / event: shared identity + conditional blocks. */
export function VisitorAndVendorCommonFields({
  activeTab,
  register,
  control,
  errors,
  purposeOfVisitListData,
  clientListData,
  centerListData,
  selectedPurposeOfVisit,
  whomToMeet,
  setValue,
}) {
  const resolvedWhomToMeet = whomToMeet || 'devx';
  const showVisitorHostFields = activeTab === 'visitors' || activeTab === 'event-participants';

  const centerOptions = useMemo(() => {
    return (Array.isArray(centerListData) ? centerListData : []).map((center) => ({
      value: center.name,
      label: center.center_name || center.name || 'Unnamed Center',
    }));
  }, [centerListData]);

  const clientOptions = useMemo(() => {
    return (clientListData || []).map((client) => ({
      value: client.name,
      label: client.customer_name,
    }));
  }, [clientListData]);

  const purposeOptions = useMemo(() => {
    const list = (purposeOfVisitListData || [])
      .filter((purpose) => (purpose?.name || '').trim().toLowerCase() !== 'other')
      .map((purpose) => ({
        value: purpose.name,
        label: purpose.name,
      }));
    list.push({ value: 'Other', label: 'Other' });
    return list;
  }, [purposeOfVisitListData]);

  return (
    <FormSection className='w-full'>
      <div className='w-full grid grid-cols-2 gap-x-4 gap-y-3'>
        <div className='w-full flex flex-col gap-1'>
          <Label.Root>
            First Name
            <Label.Asterisk />
          </Label.Root>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Input placeholder='Enter first name' {...register('first_name')} />
            </Input.Wrapper>
          </Input.Root>
          {errors.first_name && (
            <ErrorText>{errors.first_name.message || 'Field is mandatory'}</ErrorText>
          )}
        </div>
        <div className='w-full flex flex-col gap-1'>
          <Label.Root>
            Last Name
            <Label.Asterisk />
          </Label.Root>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Input placeholder='Enter last name' {...register('last_name')} />
            </Input.Wrapper>
          </Input.Root>
          {errors.last_name && (
            <ErrorText>{errors.last_name.message || 'Field is mandatory'}</ErrorText>
          )}
        </div>
        <div className='w-full flex flex-col gap-1'>
          <Label.Root>
            Mobile Number
            <Label.Asterisk />
          </Label.Root>
          <Controller
            name='mobile_number'
            control={control}
            render={({ field }) => (
              <PhoneInputController
                value={field.value || ''}
                onChange={field.onChange}
                error={errors.mobile_number?.message || null}
                size='small'
                variant='default'
                placeholder='9876500011'
                maxLength={10}
                disabled={false}
              />
            )}
          />
          {errors.mobile_number && (
            <ErrorText>{errors.mobile_number.message || 'Field is mandatory'}</ErrorText>
          )}
        </div>
        <div className='w-full flex flex-col gap-1'>
          <Label.Root>
            Email
            <Label.Asterisk />
          </Label.Root>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Input type='email' placeholder='Enter email address' {...register('email')} />
            </Input.Wrapper>
          </Input.Root>
          {errors.email && <ErrorText>{errors.email.message || 'Field is mandatory'}</ErrorText>}
        </div>
        <div className='w-full flex flex-col gap-1'>
          <Label.Root>
            Center
            <Label.Asterisk />
          </Label.Root>
          <Controller
            name='center'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                size='small'
                value={field.value || ''}
                onValueChange={field.onChange}
                options={centerOptions}
                placeholder='Select center'
                triggerClassName='w-full'
              />
            )}
          />
          {errors.center && <ErrorText>{errors.center.message || 'Field is mandatory'}</ErrorText>}
        </div>
        {activeTab !== 'vendors' && (
          <div className='w-full flex flex-col gap-1'>
            <Label.Root>Company/Orgnization Name</Label.Root>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Input placeholder='Enter company name' {...register('company_name')} />
              </Input.Wrapper>
            </Input.Root>
          </div>
        )}
        <div className='w-full flex flex-col gap-1'>
          <Label.Root>No. of Visitors</Label.Root>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Input
                type='number'
                placeholder='Enter number of visitors'
                {...register('no_of_visitors', { valueAsNumber: true })}
              />
            </Input.Wrapper>
          </Input.Root>
          {errors.no_of_visitors && <ErrorText>{errors.no_of_visitors.message}</ErrorText>}
        </div>
        {showVisitorHostFields ? (
          <>
            <div className='col-span-2 w-full flex flex-col gap-1'>
              <Label.Root>
                {VISITOR_WHOM_TO_MEET_INVITE_LABEL}
                <Label.Asterisk />
              </Label.Root>
              <ButtonGroup.Root size='xsmall' className='w-full'>
                {VISITOR_WHOM_TO_MEET_OPTIONS.map((option) => (
                  <ButtonGroup.Item
                    key={option.value}
                    type='button'
                    className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                    data-state={resolvedWhomToMeet === option.value ? 'on' : 'off'}
                    onClick={() => {
                      setValue('whom_to_meet', option.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      if (option.value === 'devx') {
                        setValue('host_company_name', '', {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }
                    }}
                  >
                    {option.label}
                  </ButtonGroup.Item>
                ))}
              </ButtonGroup.Root>
            </div>
            {resolvedWhomToMeet === 'client' ? (
              <div className='col-span-2 w-full flex flex-col gap-1'>
                <Label.Root>
                  Host Company Name
                  <Label.Asterisk />
                </Label.Root>
                <Controller
                  name='host_company_name'
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      size='small'
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={clientOptions}
                      placeholder='Select host company'
                      triggerClassName='w-full'
                    />
                  )}
                />
                {errors.host_company_name && (
                  <ErrorText>{errors.host_company_name.message || 'Field is mandatory'}</ErrorText>
                )}
              </div>
            ) : null}
            <div className='w-full flex flex-col gap-1'>
              <Label.Root>
                Host Name
                <Label.Asterisk />
              </Label.Root>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Input placeholder='Enter host name' {...register('host')} />
                </Input.Wrapper>
              </Input.Root>
              {errors.host && <ErrorText>{errors.host.message || 'Field is mandatory'}</ErrorText>}
            </div>
          </>
        ) : null}
        <div className='w-full flex flex-col gap-1'>
          <Label.Root>Vehicle Number</Label.Root>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Input placeholder='Enter vehicle number' {...register('vehicle_number')} />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <div className='w-full flex flex-col gap-1'>
          <Label.Root>Badge Number</Label.Root>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Input placeholder='Enter badge number' {...register('badge_number')} />
            </Input.Wrapper>
          </Input.Root>
        </div>
        {(activeTab === 'visitors' || activeTab === 'event-participants') && (
          <>
            <div className='w-full flex flex-col gap-1'>
              <Label.Root>Purpose of Visit</Label.Root>
              <Controller
                name='purpose_of_visit'
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    size='small'
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    options={purposeOptions}
                    placeholder='Select purpose of visit'
                    triggerClassName='w-full'
                  />
                )}
              />
              {errors.purpose_of_visit && <ErrorText>{errors.purpose_of_visit.message}</ErrorText>}
            </div>
            {(selectedPurposeOfVisit || '').trim().toLowerCase() === 'other' && (
              <div className='w-full flex flex-col gap-1'>
                <Label.Root>
                  Other Purpose
                  <Label.Asterisk />
                </Label.Root>
                <Input.Root size='small'>
                  <Input.Wrapper>
                    <Input.Input placeholder='Type here' {...register('other_purpose')} />
                  </Input.Wrapper>
                </Input.Root>
                {errors.other_purpose && (
                  <ErrorText>{errors.other_purpose.message || 'Field is mandatory'}</ErrorText>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </FormSection>
  );
}

export function VendorOnlyFields({
  register,
  control,
  errors,
  vendorListData,
  supervisorListData,
  materialCarrying,
  setMaterialCarrying,
}) {
  const vendorOptions = useMemo(() => {
    return (vendorListData || []).map((vendor) => ({
      value: vendor?.name,
      label: vendor?.name,
    }));
  }, [vendorListData]);

  const supervisorOptions = useMemo(() => {
    return (supervisorListData || []).map((sup) => ({
      value: sup.name,
      label: sup.employee_name || sup.name,
    }));
  }, [supervisorListData]);

  return (
    <FormSection className='w-full flex flex-col gap-x-4 gap-y-3'>
      <span className='flex items-center gap-1 label-medium text-text-sub-500'>
        <RiHammerLine size={20} className='text-text-soft-400' />
        Vendor Details
      </span>
      <div className='w-full grid grid-cols-2 gap-4'>
        <div className='w-full flex flex-col gap-1'>
          <Label.Root>
            Vendor
            <Label.Asterisk />
          </Label.Root>
          <Controller
            name='vendor'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                size='small'
                value={field.value || ''}
                onValueChange={field.onChange}
                options={vendorOptions}
                placeholder='Select'
                triggerClassName='w-full'
              />
            )}
          />
          {errors.vendor && <ErrorText>{errors.vendor.message}</ErrorText>}
        </div>
        <div className='w-full flex flex-col gap-1'>
          <Label.Root>
            Supervisor
            <Label.Asterisk />
          </Label.Root>
          <Controller
            name='assigned_supervisor'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                size='small'
                value={field.value || ''}
                onValueChange={field.onChange}
                options={supervisorOptions}
                placeholder='Select'
                triggerClassName='w-full'
              />
            )}
          />
          {errors.assigned_supervisor && (
            <ErrorText>{errors.assigned_supervisor.message}</ErrorText>
          )}
        </div>
      </div>
      <div className='w-full flex flex-col gap-2'>
        <Label.Root>Material Carrying</Label.Root>
        <ButtonGroup.Root size='xsmall'>
          <ButtonGroup.Item
            className='px-4 py-2 text-paragraph-sm text-text-main-900 data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
            type='button'
            onClick={() => setMaterialCarrying('yes')}
            data-state={materialCarrying === 'yes' ? 'on' : 'off'}
          >
            Yes
          </ButtonGroup.Item>
          <ButtonGroup.Item
            className='px-4 py-2 text-paragraph-sm text-text-main-900 data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
            type='button'
            onClick={() => setMaterialCarrying('no')}
            data-state={materialCarrying === 'no' ? 'on' : 'off'}
          >
            No
          </ButtonGroup.Item>
        </ButtonGroup.Root>
      </div>
      {materialCarrying === 'yes' && (
        <div className='w-full flex flex-col'>
          <Label.Root>
            Material Details <Label.Asterisk />
          </Label.Root>
          <textarea
            className='w-full border-1 border-stroke-soft-200 mt-2 rounded-md resize-none bg-transparent outline-none text-paragraph-sm text-text-sub-600 p-2'
            rows={4}
            cols={10}
            placeholder='Enter details here...'
            {...register('material_desc')}
          />
        </div>
      )}
    </FormSection>
  );
}

export function VisitDetailsAndNotes({ control, errors, register, activeTab }) {
  const visitTimeOptions = useMemo(() => {
    return TIME_OPTIONS.map((time) => ({
      value: time,
      label: time,
    }));
  }, []);

  return (
    <div className='flex w-full flex-col gap-5'>
      <FormSection className='flex flex-col gap-3'>
        <FormSectionHeader icon={RiCalendarLine}>Visit Details</FormSectionHeader>
        <div className='flex gap-4'>
          <div className='flex-1 flex flex-col gap-1'>
            <Label.Root className='text-text-main-900'>
              Visit Date <Label.Asterisk />
            </Label.Root>
            <Controller
              name='visit_date'
              control={control}
              render={({ field }) => (
                <Datepicker
                  value={field.value || null}
                  onChange={field.onChange}
                  variant='default'
                  size='small'
                  min={startOfDay(new Date())}
                />
              )}
            />
            {errors.visit_date && (
              <ErrorText>{errors.visit_date.message || 'Field is mandatory'}</ErrorText>
            )}
          </div>
          <div className='flex-1 flex flex-col gap-1'>
            <Label.Root className='text-text-main-900'>
              Visit Time <Label.Asterisk />
            </Label.Root>
            <Controller
              name='visit_time'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  size='small'
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  options={visitTimeOptions}
                  placeholder='Select time'
                  triggerClassName='w-full'
                />
              )}
            />
            {errors.visit_time && (
              <ErrorText>{errors.visit_time.message || 'Field is mandatory'}</ErrorText>
            )}
          </div>
        </div>
      </FormSection>
      {activeTab === 'visitors' && (
        <FormSection className='w-full rounded-md border-1 border-stroke-soft-200 flex items-center gap-2 paragraph-small text-[var(--color-text-main-900)] px-4 py-3 bg-[var(--color-bg-weak-100)]'>
          <Controller
            name='book_meeting_room'
            control={control}
            render={({ field }) => (
              <Switch.Root checked={Boolean(field.value)} onCheckedChange={field.onChange} />
            )}
          />
          Book a meeting room
        </FormSection>
      )}
      <FormSection className='flex flex-col gap-2'>
        <FormSectionHeader icon={RiFileLine}>Notes</FormSectionHeader>
        <textarea
          className='w-full border-1 border-stroke-soft-200 rounded-md resize-none bg-transparent outline-none text-paragraph-sm text-text-sub-600 p-2'
          rows={4}
          cols={10}
          placeholder='Type here...'
          {...register('notes')}
        />
      </FormSection>
    </div>
  );
}
