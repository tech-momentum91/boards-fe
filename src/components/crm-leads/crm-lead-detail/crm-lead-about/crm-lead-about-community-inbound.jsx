import React from 'react';
import * as Input from '@/components/ui/input';
import * as Textarea from '@/components/ui/textarea';
import * as Badge from '@/components/ui/badge';

const FieldLabel = ({ children }) => (
  <label className='text-paragraph-sm text-text-sub-500 opacity-72'>{children}</label>
);

const display = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
};

const ReadOnlyInput = ({ value }) => (
  <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
    <Input.Wrapper>
      <Input.Input
        value={display(value)}
        readOnly
        tabIndex={-1}
        className='text-label-sm text-text-main-900'
      />
    </Input.Wrapper>
  </Input.Root>
);

const LinkOrDash = ({ href }) => {
  const url = String(href || '').trim();
  if (!url) return <span className='text-label-sm text-text-main-900'>—</span>;

  const isHttpOrHttps = /^https?:\/\//i.test(url);
  if (!isHttpOrHttps) return <span className='text-label-sm text-text-main-900'>—</span>;

  return (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      className='break-all text-label-sm text-primary-base underline'
    >
      {url}
    </a>
  );
};

/**
 * Read-only AI Signals fields — CRM Lead fields with legacy ci_* fallback.
 */
const CrmLeadAboutCommunityInbound = ({ lead = {} }) => {
  const hasDevx = Boolean(lead?.is_devx);
  const hasPhi = Boolean(lead?.is_phi);
  // Prefer new CRM fields; fall back to ci_* for older Community Inbound leads.
  const notes = lead?.notes || lead?.ci_raw_text || '';
  const contactMessage = lead?.contact_message || '';
  const leadSource = lead?.lead_source || lead?.ci_source_name || '';

  return (
    <div className='flex flex-col gap-5 py-5'>
      <div className='grid grid-cols-2 gap-x-6 gap-y-5'>
        <div className='flex flex-col gap-1'>
          <FieldLabel>Source Type</FieldLabel>
          <ReadOnlyInput value={lead?.source_type} />
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Lead Source</FieldLabel>
          <ReadOnlyInput value={leadSource} />
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Brand</FieldLabel>
          <div className='flex flex-wrap items-center gap-2 pt-1'>
            {hasDevx ? (
              <Badge.Root color='blue' variant='light' size='small'>
                DevX
              </Badge.Root>
            ) : null}
            {hasPhi ? (
              <Badge.Root color='purple' variant='light' size='small'>
                PHI
              </Badge.Root>
            ) : null}
            {!hasDevx && !hasPhi ? (
              <span className='text-label-sm text-text-main-900'>—</span>
            ) : null}
          </div>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Platform Source</FieldLabel>
          <ReadOnlyInput value={lead?.source} />
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Space Type</FieldLabel>
          <ReadOnlyInput value={lead?.workspace_requirement_type} />
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Decision Timeline</FieldLabel>
          <ReadOnlyInput value={lead?.expected_decision_timeline} />
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Source ID</FieldLabel>
          <ReadOnlyInput value={lead?.source_id} />
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>External ID</FieldLabel>
          <ReadOnlyInput value={lead?.external_id} />
        </div>

        <div className='col-span-2 flex flex-col gap-1'>
          <FieldLabel>Landing Page URL</FieldLabel>
          <div className='pt-1'>
            <LinkOrDash href={lead?.landing_page_url} />
          </div>
        </div>

        <div className='col-span-2 flex flex-col gap-1'>
          <FieldLabel>Contact From URL</FieldLabel>
          <div className='pt-1'>
            <LinkOrDash href={lead?.contact_from_url} />
          </div>
        </div>

        <div className='col-span-2 flex flex-col gap-1'>
          <FieldLabel>Notes (action / outreach / confidence)</FieldLabel>
          <Textarea.Root
            variant='borderless'
            simple
            size='xsmall'
            rows={4}
            className='-ml-2 w-full min-h-[96px] text-label-sm text-text-main-900'
            value={notes || '—'}
            readOnly
          />
        </div>

        <div className='col-span-2 flex flex-col gap-1'>
          <FieldLabel>Contact Message</FieldLabel>
          <Textarea.Root
            variant='borderless'
            simple
            size='xsmall'
            rows={6}
            className='-ml-2 w-full min-h-[120px] text-label-sm text-text-main-900'
            value={contactMessage || '—'}
            readOnly
          />
        </div>
      </div>
    </div>
  );
};

export default CrmLeadAboutCommunityInbound;
