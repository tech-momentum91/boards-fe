import React from 'react';
import { RiPhoneLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import { resolveApiOrigin } from '@/api/api-origin';
import { getInfoCallStatusBadgeColor } from '@/components/crm-leads/constants';

const formatTimestamp = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const recordingSrc = (url) => {
  if (!url) return '';
  const origin = resolveApiOrigin();
  return `${origin}/api/method/devx.devx_crm.api.crm_lead.play_recording?url=${encodeURIComponent(url)}`;
};

/**
 * TruePulse call row in lead Activities (All + Calls filters).
 * Expects API shape: activity.call { call_status, call_duration_label, ... }
 */
const CrmActivitiesCallItem = ({ activity }) => {
  const call = activity?.call ?? activity ?? {};
  const status = call.call_status || activity.info_call_status || '';
  const durationLabel = call.call_duration_label || '0s';
  const callId = call.call_id || activity.id || '';
  const serviceName = call.service_name || '';
  const recording = call.call_recording_link || '';
  const timestamp = formatTimestamp(activity.creation || call.call_start_time);

  return (
    <div className='flex flex-col justify-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-3'>
      <div className='flex min-w-0 flex-wrap items-center gap-2'>
        <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-weak-50 text-text-sub-500'>
          <RiPhoneLine size={14} />
        </div>
        <Badge.Root
          variant='light'
          color={getInfoCallStatusBadgeColor(status)}
          size='medium'
          className='normal-case'
        >
          {String(status || 'Unknown').trim() || 'Unknown'}
        </Badge.Root>
        <span className='text-paragraph-sm text-text-sub-500'>{durationLabel}</span>
        {timestamp ? (
          <span className='ml-auto shrink-0 text-paragraph-xs text-text-soft-400'>{timestamp}</span>
        ) : null}
      </div>

      <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-paragraph-sm text-text-sub-500'>
        {callId ? <span className='font-medium text-text-strong-500'>#{callId}</span> : null}
        {serviceName ? <span>{serviceName}</span> : null}
        {call.caller_number ? <span>{call.caller_number}</span> : null}
        {recording ? (
          <audio
            controls
            preload='metadata'
            src={recordingSrc(recording)}
            className='ml-auto h-8 w-full max-w-sm'
          />
        ) : null}
      </div>
    </div>
  );
};

export default CrmActivitiesCallItem;
