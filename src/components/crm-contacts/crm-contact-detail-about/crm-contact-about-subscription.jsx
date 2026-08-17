import React, { useState, useRef } from 'react';
import { RiCompassDiscoverLine, RiCheckLine, RiSearchLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Popover from '@/components/ui/popover';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import {
  SUBSCRIPTION_STATUS_OPTIONS,
  SUBSCRIPTION_TYPE_OPTIONS,
  UNSUBSCRIBED_REASON_OPTIONS,
  SELECT_NONE_VALUE,
} from '../constants';
import { cn } from '@/utils/cn';

const FieldLabel = ({ children }) => (
  <label className='text-paragraph-sm opacity-72 text-text-sub-500 font-normal'>{children}</label>
);

const FieldValue = ({ children, className = '' }) => (
  <span className={cn('text-label-sm text-text-main-900 font-medium', className)}>
    {children || '--'}
  </span>
);

const SubscriptionTypeDisplay = ({ contact }) => {
  const values = Array.isArray(contact?.subscription_type)
    ? contact.subscription_type
    : [contact?.subscription_type].filter(Boolean);

  if (values.length === 0) return <FieldValue>--</FieldValue>;

  return (
    <div className='flex flex-wrap w-full -ml-2 items-center gap-2 py-0.5 transition-opacity hover:opacity-80'>
      {values.map((type, index) => (
        <Badge.Root
          key={index}
          variant='stroke'
          className='shrink-0 border-stroke-soft-200 bg-white px-2 text-[10px] font-medium uppercase tracking-wider text-text-sub-500'
        >
          {type}
        </Badge.Root>
      ))}
    </div>
  );
};

const SubscriptionTypePopover = ({ contact, onFieldChange, subscriptionTypeOptions, children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const values = Array.isArray(contact?.subscription_type)
    ? contact.subscription_type
    : [contact?.subscription_type].filter(Boolean);

  const options = subscriptionTypeOptions?.length
    ? subscriptionTypeOptions
    : SUBSCRIPTION_TYPE_OPTIONS;

  const handleToggle = (value) => {
    const nextValues = values.includes(value)
      ? values.filter((v) => v !== value)
      : [...values, value];
    onFieldChange?.('subscription_type', nextValues);
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredOptions = !q
    ? options
    : options.filter((opt) => (opt.label || '').toLowerCase().includes(q));

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Content
        className='p-1 min-w-[250px] border border-stroke-soft-200 shadow-regular-md'
        showArrow={false}
        align='start'
        sideOffset={4}
      >
        <div className='flex flex-col'>
          <div className='p-2 border-b border-stroke-soft-200'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  ref={searchInputRef}
                  placeholder='Search...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='max-h-60 overflow-y-auto scrollbar-hide py-1'>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = values.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    className={cn(
                      'group relative flex cursor-pointer select-none items-center gap-2 rounded-lg p-2 pr-9 transition-all duration-200',
                      'text-paragraph-sm text-text-strong-950',
                      'hover:bg-bg-weak-50 active:bg-bg-weak-100',
                      isSelected && 'bg-bg-weak-50',
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(opt.value);
                    }}
                  >
                    <span
                      className={cn(
                        'flex flex-1 items-center gap-2 transition-colors',
                        isSelected ? 'text-text-strong-950' : 'text-text-main-900',
                        'group-hover:text-text-strong-950',
                      )}
                    >
                      {opt.label}
                    </span>
                    {isSelected && (
                      <RiCheckLine className='absolute right-2 top-1/2 size-5 shrink-0 -translate-y-1/2 text-text-soft-400' />
                    )}
                  </div>
                );
              })
            ) : (
              <div className='px-4 py-8 text-center text-paragraph-sm text-text-soft-400'>
                {searchQuery.trim() ? 'No types found' : 'No types available'}
              </div>
            )}
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};

const CrmContactAboutSubscription = ({ contact = {}, onFieldChange, contactOptions = {} }) => {
  const handleChange = (field, value) => {
    onFieldChange?.(field, value);
  };

  const subscriptionStatusOptions =
    contactOptions?.subscription_status?.length > 0
      ? [{ value: SELECT_NONE_VALUE, label: '—' }, ...contactOptions.subscription_status]
      : SUBSCRIPTION_STATUS_OPTIONS;

  const unsubscribedReasonSelectOptions = contactOptions?.unsubscribed_reason?.length
    ? [{ value: SELECT_NONE_VALUE, label: 'Select' }, ...contactOptions.unsubscribed_reason]
    : UNSUBSCRIBED_REASON_OPTIONS;

  const displayStatus =
    !contact?.subscription_status || contact.subscription_status === SELECT_NONE_VALUE
      ? '—'
      : contact.subscription_status;

  const displayAmbStatus =
    !contact?.amb_subscription_status || contact.amb_subscription_status === SELECT_NONE_VALUE
      ? '—'
      : contact.amb_subscription_status;

  const isUnsubscribed = contact?.subscription_status === 'Unsubscribed';

  return (
    <div className='flex flex-col gap-4 border-t border-stroke-soft-200 py-6'>
      <div className='flex items-center gap-2 mb-2'>
        <RiCompassDiscoverLine size={20} className='text-text-soft-400' />
        <span className='text-label-md text-text-sub-500 font-medium'>Subscription Details</span>
      </div>

      <div className='grid grid-cols-2 gap-x-12 gap-y-6 items-start'>
        {/* Subscription Status */}
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>Subscription Status</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2' className='w-full'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={contact?.subscription_status ?? ''}
              valueSentinel={SELECT_NONE_VALUE}
              onValueChange={(value) => handleChange('subscription_status', value)}
              options={subscriptionStatusOptions}
              searchPlaceholder='Search...'
              noResultsMessage='No statuses found'
              emptyMessage='No statuses available'
              triggerClassName='w-full -ml-2'
              renderTrigger={() => <FieldValue>{displayStatus}</FieldValue>}
            />
          </EditableFieldWrapper>
        </div>

        {/* Subscription Type */}
        <div className='flex flex-col gap-1.5'>
          <FieldLabel>Subscription Type</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2' className='w-full'>
            <SubscriptionTypePopover
              contact={contact}
              onFieldChange={handleChange}
              subscriptionTypeOptions={contactOptions?.subscription_type}
            >
              <div className='cursor-pointer w-full'>
                <SubscriptionTypeDisplay contact={contact} />
              </div>
            </SubscriptionTypePopover>
          </EditableFieldWrapper>
        </div>

        {/* AMB Subscription Status — same option set as Subscription Status (CRM Subscription Status) */}
        <div className='flex flex-col gap-1.5 col-span-2'>
          <FieldLabel>AMB Subscription Status</FieldLabel>
          <EditableFieldWrapper editable={true} iconClassName='mr-2' className='w-full'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={contact?.amb_subscription_status ?? ''}
              valueSentinel={SELECT_NONE_VALUE}
              onValueChange={(value) => handleChange('amb_subscription_status', value)}
              options={subscriptionStatusOptions}
              itemKeyPrefix='amb-'
              searchPlaceholder='Search...'
              noResultsMessage='No statuses found'
              emptyMessage='No statuses available'
              triggerClassName='w-full -ml-2'
              renderTrigger={() => <FieldValue>{displayAmbStatus}</FieldValue>}
            />
          </EditableFieldWrapper>
        </div>

        {/* Unsubscribed Reason - only when Unsubscribed */}
        {isUnsubscribed && (
          <div className='flex flex-col gap-1.5 col-span-2'>
            <FieldLabel>Unsubscribed Reason</FieldLabel>
            <EditableFieldWrapper editable={true} iconClassName='mr-2' className='w-full'>
              <SearchableSelect
                variant='borderless'
                size='xsmall'
                matchTriggerWidth={false}
                showArrow={false}
                value={contact?.unsubscribed_reason ?? ''}
                valueSentinel={SELECT_NONE_VALUE}
                onValueChange={(value) => handleChange('unsubscribed_reason', value)}
                options={unsubscribedReasonSelectOptions}
                searchPlaceholder='Search...'
                noResultsMessage='No reasons found'
                emptyMessage='No reasons available'
                triggerClassName='w-full -ml-2'
                renderTrigger={() => (
                  <FieldValue>
                    {!contact?.unsubscribed_reason ||
                    contact.unsubscribed_reason === SELECT_NONE_VALUE
                      ? '—'
                      : contact.unsubscribed_reason}
                  </FieldValue>
                )}
              />
            </EditableFieldWrapper>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrmContactAboutSubscription;
