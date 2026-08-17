/**
 * Shared component to render parsed activity action strings.
 * Used by: CrmAccountActivitiesAccountItem, CrmTaskHistoryItem (task comment section)
 */
import React from 'react';
import { cn } from '@/utils/cn';
import { RiCalendarLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import {
  parseActionToSegments,
  isSpecialField,
  isDateField,
  getColorForValue,
} from './activity-action-renderer';

const WORD_COUNT_THRESHOLD = 4;

function wordCount(s) {
  if (!s || typeof s !== 'string') return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

const ColoredValueBadge = ({ label, color }) => (
  <Badge.Root
    variant='light'
    color={color}
    size='small'
    className='shrink-0 text-nowrap normal-case'
  >
    {label}
  </Badge.Root>
);

const PillBadge = ({ children }) => (
  <span className='inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-stroke-soft-200 bg-white px-2 py-0.5 text-subheading-2xs font-medium text-text-main-900'>
    {children}
  </span>
);

const UserAvatarBadge = ({ name }) => (
  <span className='inline-flex items-center gap-1.5'>
    <CrmAccountAvatar name={name} size={24} className='shrink-0' />
    <span className='text-paragraph-sm font-medium text-text-main-900'>{name}</span>
  </span>
);

const DateValueBadge = ({ value }) => (
  <span className='inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-stroke-soft-200 bg-white px-2 py-0.5 text-subheading-2xs font-medium text-text-main-900'>
    <RiCalendarLine size={12} className='text-text-soft-400 shrink-0' />
    {value}
  </span>
);

function SegmentDisplay({ segment, fieldName, singleLine }) {
  if (segment.type === 'text') {
    return <span className={cn(singleLine && 'min-w-0 shrink truncate')}>{segment.value}</span>;
  }

  const value = segment.value || '(empty)';
  if (!value || value === '(empty)') {
    return <span className='text-text-soft-400'>(empty)</span>;
  }

  if (segment.type === 'bracket') {
    return <UserAvatarBadge name={value} />;
  }

  const words = wordCount(value);
  const isDate = isDateField(fieldName);
  const isSpecial = isSpecialField(fieldName);

  if (isSpecial) {
    const color = getColorForValue(fieldName, value);
    return <ColoredValueBadge label={value} color={color} />;
  }
  if (isDate) {
    return <DateValueBadge value={value} />;
  }
  if (words > WORD_COUNT_THRESHOLD) {
    return (
      <span
        className={cn('font-semibold text-text-main-900', singleLine && 'min-w-0 shrink truncate')}
      >
        {value}
      </span>
    );
  }
  return <PillBadge>{value}</PillBadge>;
}

export function ActivityActionDisplay({ action, field, className, singleLine = false }) {
  const fieldName = field ?? '';
  const segments = parseActionToSegments(action);

  return (
    <span
      className={cn(
        'items-center gap-1.5',
        singleLine ? 'flex min-w-0 flex-1 flex-nowrap overflow-hidden' : 'inline-flex flex-wrap',
        className,
      )}
    >
      {segments.map((seg, i) => (
        <SegmentDisplay key={i} segment={seg} fieldName={fieldName} singleLine={singleLine} />
      ))}
    </span>
  );
}
