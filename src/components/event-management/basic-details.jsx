import React, { useEffect, useMemo, useRef } from 'react';
import {
  RiAttachment2,
  RiBookletLine,
  RiCalendarEventLine,
  RiContactsBook2Line,
  RiFileList2Line,
  RiGridFill,
  RiGroupLine,
  RiLightbulbFlashLine,
  RiPencilLine,
} from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import {
  EVENT_ENGAGEMENT_MODE_OPTIONS,
  COMMUNITY_EVENT_STATUS_OPTIONS,
  EVENT_STATUS_OPTIONS,
  SPOTLIGHT_EVENT_CATEGORY_OPTIONS,
  SPOTLIGHT_EVENT_REVENUE_MODE_OPTIONS,
  HOSTED_EVENT_CATEGORY_OPTIONS,
  HOSTED_EVENT_REVENUE_MODE_OPTIONS,
  COMMUNITY_PARTICIPATION_OPTIONS,
  REGISTRATION_MODE_OPTIONS,
  formatMaxRegistrationsDisplay,
  parseMaxRegistrationsInput,
} from '@/components/event-management/constant';
import { getInitials } from '@/components/event-management/event-helpers';
import { SectionTitle } from '@/components/event-management/event-section-title';
import {
  InlineEditableDate,
  InlineEditableSelect,
  InlineEditableText,
  InlineEditableTextarea,
} from '@/components/event-management/inline-editable-fields';
import { EventScheduleDateTimeInline } from '@/components/event-management/event-schedule-datetime-inline';
import EventAttachmentsTable from '@/components/event-management/event-attachments-table';
import { formatDateToYYYYMMDD } from '@/utils/date-utils';

const BasicDetailsAttachmentsSection = ({ files, onUpload, onDeleteAttachment }) => (
  <section className='border-stroke-soft-200 bg-bg-white-0 pb-5'>
    <SectionTitle
      icon={RiAttachment2}
      className='text-text-sub-900'
      iconClassName='text-text-soft-400'
    >
      Attachments
    </SectionTitle>
    <EventAttachmentsTable
      files={files}
      onUpload={onUpload}
      onDeleteAttachment={onDeleteAttachment}
    />
  </section>
);

/** Normalize datepicker values to `yyyy-MM-dd` for `update_events` and local state. */
function saveEventDateField(onChange, fieldName) {
  return (val) => onChange(fieldName, formatDateToYYYYMMDD(val));
}

/** Center doc names from Events `centre_name` child rows (`center` field, e.g. CTR-378). */
export function normalizeCentreValues(centreName) {
  if (Array.isArray(centreName)) {
    return centreName
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          // Child row `name` is Events Center id (hvjk…); Link value is `center` (CTR-378).
          return item.center ?? item.centre ?? item.value ?? '';
        }
        return '';
      })
      .map(String)
      .filter(Boolean);
  }
  if (typeof centreName === 'string' && centreName.trim()) {
    return centreName
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function centreLabelsFromValues(values, centerOptions) {
  if (values.length === 0) return '--';
  const labelByValue = new Map(centerOptions.map((o) => [String(o.value), o.label]));
  return values.map((v) => labelByValue.get(String(v)) || v).join(', ');
}

/** Labels from event `centre_name` child rows when ids are outside the user's center list. */
function labelMapFromCentreRows(centreName) {
  const map = new Map();
  const rows = Array.isArray(centreName) ? centreName : [];
  rows.forEach((row) => {
    if (typeof row === 'string') {
      const s = row.trim();
      if (s) map.set(s, s);
      return;
    }
    if (row && typeof row === 'object') {
      const id = String(row.center ?? row.centre ?? row.value ?? '').trim();
      const label = String(
        row.center_name ?? row.centre_name ?? row.center_title ?? row.label ?? '',
      ).trim();
      if (id) map.set(id, label || id);
    }
  });
  return map;
}

function labelMapFromClientRows(clients) {
  const map = new Map();
  const rows = Array.isArray(clients) ? clients : [];
  rows.forEach((row) => {
    if (typeof row === 'string') {
      const s = row.trim();
      if (s) map.set(s, s);
      return;
    }
    if (row && typeof row === 'object') {
      const id = String(row.customer ?? row.client ?? row.value ?? '').trim();
      const label = String(row.customer_name ?? row.client_name ?? row.label ?? '').trim();
      if (id) map.set(id, label || id);
    }
  });
  return map;
}

/** Options list including selected values missing from the user's scoped dropdown (read-only display). */
function mergeSelectOptionsWithValues(options, selectedIds, labelById = new Map()) {
  const merged = new Map((Array.isArray(options) ? options : []).map((o) => [String(o.value), o]));
  (Array.isArray(selectedIds) ? selectedIds : []).forEach((id) => {
    const key = String(id).trim();
    if (!key || merged.has(key)) return;
    merged.set(key, { value: key, label: labelById.get(key) || key });
  });
  return [...merged.values()];
}

function commitCentreName(onChange, nextValues) {
  const next = Array.isArray(nextValues) ? nextValues.map(String).filter(Boolean) : [];
  const payload = next.map((center) => ({ center }));
  onChange('centre_name', payload);
}

export function isAllCentersTruth(val) {
  return (
    val === true ||
    val === 1 ||
    val === '1' ||
    String(val || '')
      .trim()
      .toLowerCase() === 'yes'
  );
}

/**
 * Clients tied to the event's center scope: full catalog when all centers;
 * otherwise clients whose `meta.centerRefs` match selected centre ids (or labels).
 */
export function resolveClientOptionsForEventCenters({
  clientOptions = [],
  centerOptions = [],
  allCenters = false,
  selectedCentreIds = [],
} = {}) {
  const base = Array.isArray(clientOptions) && clientOptions.length > 0 ? clientOptions : [];
  if (allCenters) return base;
  const ids = Array.isArray(selectedCentreIds) ? selectedCentreIds : [];
  if (ids.length === 0) return [];
  const idSet = new Set(ids.map((id) => String(id).trim()).filter(Boolean));
  const labelByValue = new Map(
    (Array.isArray(centerOptions) ? centerOptions : []).map((o) => [
      String(o.value),
      String(o.label || '').trim(),
    ]),
  );
  const matchTokens = new Set(idSet);
  ids.forEach((id) => {
    const lab = labelByValue.get(String(id).trim());
    if (lab) matchTokens.add(lab);
  });
  return base.filter((opt) => {
    const refs = opt.meta?.centerRefs;
    if (!Array.isArray(refs) || refs.length === 0) return false;
    return refs.some((r) => {
      const s = String(r).trim();
      return idSet.has(s) || matchTokens.has(s);
    });
  });
}

function isAllClientsTruth(val) {
  return (
    val === true ||
    val === 1 ||
    val === '1' ||
    String(val || '')
      .trim()
      .toLowerCase() === 'yes'
  );
}

function getPermittedCenterIdSet(centerOptions) {
  return new Set(
    (Array.isArray(centerOptions) ? centerOptions : [])
      .map((o) => String(o?.value ?? '').trim())
      .filter(Boolean),
  );
}

/** True when the logged-in user created the event (Frappe `owner` / `created_by`). */
export function isCurrentUserEventOwner(eventFields, currentUserEmail) {
  const owner = String(eventFields?.owner ?? eventFields?.created_by ?? '')
    .trim()
    .toLowerCase();
  const email = String(currentUserEmail ?? '')
    .trim()
    .toLowerCase();
  return Boolean(owner && email && owner === email);
}

/** Centers: All Centers checkbox + multiselect when custom (matches create flow). */
function CenterFieldBasicInfo({
  eventFields,
  onChange,
  centerOptions = [],
  centerLabelById = {},
  centersReadOnly = false,
  showAllCentersOption = true,
}) {
  const allCenters = isAllCentersTruth(eventFields.all_centers);

  const permittedIds = useMemo(() => getPermittedCenterIdSet(centerOptions), [centerOptions]);

  const centreValues = useMemo(() => {
    const all = normalizeCentreValues(eventFields.centre_name);
    if (centersReadOnly || permittedIds.size === 0) return all;
    return all.filter((id) => permittedIds.has(String(id)));
  }, [eventFields.centre_name, permittedIds, centersReadOnly]);

  const centerDisplayOptions = useMemo(() => {
    if (!centersReadOnly) return centerOptions;
    const labels = labelMapFromCentreRows(eventFields.centre_name);
    centerOptions.forEach((o) => {
      const key = String(o.value);
      labels.set(key, o.label || labels.get(key) || key);
    });
    Object.entries(centerLabelById || {}).forEach(([id, label]) => {
      const key = String(id).trim();
      const text = String(label ?? '').trim();
      if (key && text) labels.set(key, text);
    });
    return mergeSelectOptionsWithValues(centerOptions, centreValues, labels);
  }, [centersReadOnly, centerOptions, centerLabelById, eventFields.centre_name, centreValues]);

  return (
    <div className='flex flex-col gap-2'>
      <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Center</div>
      {showAllCentersOption ? (
        <div className='flex items-center gap-2'>
          <Checkbox.Root
            id='eventDetailAllCenters'
            checked={allCenters}
            disabled={centersReadOnly}
            onCheckedChange={(checked) => {
              onChange('all_centers', checked === true);
            }}
          />
          <label
            htmlFor='eventDetailAllCenters'
            className={`text-paragraph-sm select-none ${
              centersReadOnly
                ? 'cursor-default text-text-main-900'
                : 'cursor-pointer text-text-main-900'
            }`}
          >
            All Centers
          </label>
        </div>
      ) : allCenters ? (
        <div className='text-paragraph-sm text-text-sub-600'>All Centers</div>
      ) : null}
      {!allCenters ? (
        <MultiSelect
          options={centerDisplayOptions}
          value={centreValues}
          disabled={centersReadOnly}
          readableWhenDisabled={centersReadOnly}
          onValueChange={(value) =>
            commitCentreName(onChange, Array.isArray(value) ? value : value ? [value] : [])
          }
          placeholder='Select centers'
          className='w-full'
        />
      ) : null}
    </div>
  );
}

const BasicInfoMicro = ({
  eventFields,
  onChange,
  onScheduleCommit,
  centerOptions = [],
  centerLabelById = {},
  partnerOptions = [],
  centersReadOnly = false,
  showAllCentersOption = true,
  statusSelectOptions = [],
}) => {
  const resolvedPartnerOptions = Array.isArray(partnerOptions) ? partnerOptions : [];
  const partnerMeta =
    resolvedPartnerOptions.find((opt) => opt.value === eventFields.partner_name)?.meta || null;
  const partnerOwnerDisplay = partnerMeta?.owner_name || eventFields.partner_owner || '--';

  return (
    <div className='grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2'>
      <div className='flex flex-col gap-1'>
        <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Event Name</div>
        <InlineEditableText
          value={eventFields.event_name}
          onSave={(val) => onChange('event_name', val)}
        />
      </div>
      <div className='flex flex-col gap-1'>
        <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Partner Name</div>
        <InlineEditableSelect
          value={eventFields.partner_name}
          options={resolvedPartnerOptions}
          onSave={(val) => onChange('partner_name', val)}
        />
      </div>
      <div className='flex flex-col gap-1'>
        <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Partner Owner</div>
        <div className='text-paragraph-sm text-text-sub-700'>{partnerOwnerDisplay}</div>
      </div>
      <CenterFieldBasicInfo
        eventFields={eventFields}
        onChange={onChange}
        centerOptions={centerOptions}
        centerLabelById={centerLabelById}
        centersReadOnly={centersReadOnly}
        showAllCentersOption={showAllCentersOption}
      />
      <div className='flex flex-col gap-2 md:col-span-2'>
        <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Event schedule</div>
        <EventScheduleDateTimeInline
          startDatetimeIso={eventFields.start_datetime}
          endDatetimeIso={eventFields.end_datetime}
          onCommit={onScheduleCommit}
        />
      </div>
      <div className='flex flex-col gap-1'>
        <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Assignee</div>
        <AssigneeMultiSelect
          value={eventFields.assignee}
          onChange={(vals) => onChange('assignee', Array.isArray(vals) ? vals : [])}
          internalOnly
        />
      </div>
      <div className='flex flex-col gap-1'>
        <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Status</div>
        <InlineEditableSelect
          value={eventFields.status}
          options={statusSelectOptions}
          onSave={(val) => onChange('status', val)}
          showStatusBadge
        />
      </div>
    </div>
  );
};

export const BasicDetailsMicro = ({
  eventFields,
  onChange,
  onScheduleCommit,
  spocDetails,
  onOpenSpocModal,
  centerOptions = [],
  centerLabelById = {},
  partnerOptions = [],
  centersReadOnly = false,
  showAllCentersOption = true,
  statusSelectOptions = [],
  eventAttachments = [],
  onUploadAttachments,
  onDeleteAttachment,
}) => (
  <div className='flex flex-col gap-5 py-5'>
    <div className='flex flex-col gap-5'>
      <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
        <SectionTitle
          icon={RiBookletLine}
          className='text-text-sub-900'
          iconClassName='text-text-soft-400'
        >
          Basic Info
        </SectionTitle>
        <BasicInfoMicro
          eventFields={eventFields}
          onChange={onChange}
          onScheduleCommit={onScheduleCommit}
          centerOptions={centerOptions}
          centerLabelById={centerLabelById}
          partnerOptions={partnerOptions}
          centersReadOnly={centersReadOnly}
          showAllCentersOption={showAllCentersOption}
          statusSelectOptions={statusSelectOptions}
        />
      </section>

      <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
        <SectionTitle
          icon={RiGridFill}
          className='text-text-sub-900'
          iconClassName='text-text-soft-400'
        >
          Classification
        </SectionTitle>
        <div className='grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2'>
          <div className='flex flex-col gap-1'>
            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Event Category</div>
            <InlineEditableSelect
              value={eventFields.event_category}
              options={SPOTLIGHT_EVENT_CATEGORY_OPTIONS}
              onSave={(val) => onChange('event_category', val)}
            />
          </div>
          <div className='flex flex-col gap-1'>
            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Engagement Mode</div>
            <InlineEditableSelect
              value={eventFields.engagement_mode}
              options={EVENT_ENGAGEMENT_MODE_OPTIONS}
              onSave={(val) => onChange('engagement_mode', val)}
            />
          </div>
          <div className='flex flex-col gap-1'>
            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Revenue Mode</div>
            <InlineEditableSelect
              value={eventFields.revenue_mode}
              options={SPOTLIGHT_EVENT_REVENUE_MODE_OPTIONS}
              onSave={(val) => onChange('revenue_mode', val)}
            />
          </div>
        </div>
      </section>

      <section className=' border-stroke-soft-200 bg-bg-white-0 pb-5'>
        <SectionTitle
          icon={RiContactsBook2Line}
          className='mb-0 text-text-sub-900'
          iconClassName='text-text-soft-400'
        >
          SPOC
        </SectionTitle>
        <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 w-[50%] py-3'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3 min-w-0'>
              <div className='flex size-8 items-center justify-center rounded-full bg-[#E9DEFF] text-label-sm font-medium text-[#5F3DC4]'>
                {getInitials(spocDetails.name)}
              </div>
              <div className='min-w-0'>
                <div className='mb-0.5 flex items-center gap-2'>
                  <span className='text-label-sm text-text-main-900'>
                    {spocDetails.name || '--'}
                  </span>
                </div>
                <div className='flex items-center gap-1.5 text-paragraph-xs text-text-soft-400'>
                  <span>{String(spocDetails.phone || '--').replaceAll('-', ' ')}</span>
                  <span className='size-1 rounded-full bg-text-sub-500' />
                  <span className='truncate'>{spocDetails.email || '--'}</span>
                </div>
              </div>
            </div>
            <Button.Root
              variant='neutral'
              mode='ghost'
              size='xsmall'
              onClick={onOpenSpocModal}
              aria-label='Edit SPOC'
            >
              <Button.Icon as={RiPencilLine} />
            </Button.Root>
          </div>
        </div>
      </section>

      {/* <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
        <SectionTitle
          icon={RiLightbulbFlashLine}
          className='text-text-sub-900'
          iconClassName='text-text-soft-400'
        >
          Facilities
        </SectionTitle>
        <div className='flex flex-wrap gap-3 flex-row'>
          {(Array.isArray(eventFields.facilities_needed) ? eventFields.facilities_needed : []).map(
            (facility) => (
              <Badge.Root key={facility} size='small' variant='light' color='blue'>
                {facility}
              </Badge.Root>
            ),
          )}
        </div>
      </section> */}

      {/* <section className=' border-stroke-soft-200 bg-bg-white-0 pb-5 w-[50%]'>
        <SectionTitle
          icon={RiFileList2Line}
          className='text-text-sub-900'
          iconClassName='text-text-soft-400'
        >
          Description
        </SectionTitle>
        <InlineEditableTextarea
          value={eventFields.event_details}
          onSave={(val) => onChange('event_details', val)}
        />
      </section> */}

      {onUploadAttachments ? (
        <BasicDetailsAttachmentsSection
          files={eventAttachments}
          onUpload={onUploadAttachments}
          onDeleteAttachment={onDeleteAttachment}
        />
      ) : null}
    </div>
  </div>
);

export const BasicDetailsExternal = ({
  eventFields,
  onChange,
  onScheduleCommit,
  spocDetails,
  onOpenSpocModal,
  centerOptions = [],
  centerLabelById = {},
  partnerOptions = [],
  centersReadOnly = false,
  showAllCentersOption = true,
  statusSelectOptions = [],
  eventAttachments = [],
  onUploadAttachments,
  onDeleteAttachment,
}) => (
  <div className='flex flex-col gap-5 py-5'>
    <div className='flex flex-col gap-5'>
      <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
        <SectionTitle
          icon={RiBookletLine}
          className='text-text-sub-900'
          iconClassName='text-text-soft-400'
        >
          Basic Info
        </SectionTitle>
        <div className='grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2'>
          <div className='flex flex-col gap-1'>
            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Partner Name</div>
            <InlineEditableSelect
              value={eventFields.partner_name}
              options={partnerOptions}
              onSave={(val) => onChange('partner_name', val)}
            />
          </div>
          <div className='flex flex-col gap-1'>
            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Partner Owner</div>
            <div className='text-paragraph-sm text-text-sub-700'>
              {(() => {
                const resolved = Array.isArray(partnerOptions) ? partnerOptions : [];
                const meta =
                  resolved.find((opt) => opt.value === eventFields.partner_name)?.meta || null;
                return meta?.owner_name || eventFields.partner_owner || '--';
              })()}
            </div>
          </div>
          <CenterFieldBasicInfo
            eventFields={eventFields}
            onChange={onChange}
            centerOptions={centerOptions}
            centerLabelById={centerLabelById}
            centersReadOnly={centersReadOnly}
            showAllCentersOption={showAllCentersOption}
          />
          <div className='flex flex-col gap-2 md:col-span-2'>
            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Event schedule</div>
            <EventScheduleDateTimeInline
              startDatetimeIso={eventFields.start_datetime}
              endDatetimeIso={eventFields.end_datetime}
              onCommit={onScheduleCommit}
            />
          </div>
          <div className='flex flex-col gap-1'>
            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Assignee</div>
            <AssigneeMultiSelect
              value={eventFields.assignee}
              onChange={(vals) => onChange('assignee', Array.isArray(vals) ? vals : [])}
              internalOnly
            />
          </div>
          <div className='flex flex-col gap-1'>
            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Status</div>
            <InlineEditableSelect
              value={eventFields.status}
              options={statusSelectOptions}
              onSave={(val) => onChange('status', val)}
              showStatusBadge
            />
          </div>
        </div>
      </section>

      <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
        <SectionTitle
          icon={RiGridFill}
          className='text-text-sub-900'
          iconClassName='text-text-soft-400'
        >
          Category &amp; Revenue
        </SectionTitle>
        <div className='grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2'>
          <div className='flex flex-col gap-1'>
            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Event Category</div>
            <InlineEditableSelect
              value={eventFields.event_category}
              options={HOSTED_EVENT_CATEGORY_OPTIONS}
              onSave={(val) => onChange('event_category', val)}
            />
          </div>
          <div className='flex flex-col gap-1'>
            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Revenue Mode</div>
            <InlineEditableSelect
              value={eventFields.revenue_mode}
              options={HOSTED_EVENT_REVENUE_MODE_OPTIONS}
              onSave={(val) => onChange('revenue_mode', val)}
            />
          </div>
        </div>
      </section>

      <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
        <SectionTitle
          icon={RiCalendarEventLine}
          className='text-text-sub-900'
          iconClassName='text-text-soft-400'
        >
          Registration
        </SectionTitle>
        <div className='grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2'>
          <div className='flex flex-col gap-1'>
            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Mode</div>
            <InlineEditableSelect
              value={eventFields.registration_mode}
              options={REGISTRATION_MODE_OPTIONS}
              onSave={(val) => onChange('registration_mode', val)}
            />
          </div>
          <div className='flex flex-col gap-1'>
            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Max Seats</div>
            <InlineEditableText
              value={formatMaxRegistrationsDisplay(eventFields.max_registrations)}
              onSave={(val) => onChange('max_registrations', parseMaxRegistrationsInput(val))}
            />
          </div>
          <div className='flex flex-col gap-1 '>
            <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Deadline</div>
            <InlineEditableDate
              value={eventFields.registration_deadline}
              onSave={saveEventDateField(onChange, 'registration_deadline')}
            />
          </div>
        </div>
      </section>

      <section className=' border-stroke-soft-200 bg-bg-white-0 pb-5'>
        <SectionTitle
          icon={RiContactsBook2Line}
          className='mb-0 text-text-sub-900'
          iconClassName='text-text-soft-400'
        >
          SPOC
        </SectionTitle>
        <div className='rounded-xl border w-[50%] border-stroke-soft-200 bg-bg-white-0 px-4 py-3'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3 min-w-0'>
              <div className='flex size-8 items-center justify-center rounded-full bg-[#E9DEFF] text-label-sm font-medium text-[#5F3DC4]'>
                {getInitials(spocDetails.name)}
              </div>
              <div className='min-w-0'>
                <div className='mb-0.5 flex items-center gap-2'>
                  <span className='text-label-sm text-text-main-900'>
                    {spocDetails.name || '--'}
                  </span>
                </div>
                <div className='flex items-center gap-1.5 text-paragraph-xs text-text-soft-400'>
                  <span>{String(spocDetails.phone || '--').replaceAll('-', ' ')}</span>
                  <span className='size-1 rounded-full bg-text-sub-500' />
                  <span className='truncate'>{spocDetails.email || '--'}</span>
                </div>
              </div>
            </div>
            <Button.Root
              variant='neutral'
              mode='ghost'
              size='xsmall'
              onClick={onOpenSpocModal}
              aria-label='Edit SPOC'
            >
              <Button.Icon as={RiPencilLine} />
            </Button.Root>
          </div>
        </div>
      </section>

      {/* <section className=' border-stroke-soft-200 bg-bg-white-0 pb-5 w-[50%]'>
        <SectionTitle
          icon={RiFileList2Line}
          className='text-text-sub-900'
          iconClassName='text-text-soft-400'
        >
          About
        </SectionTitle>
        <InlineEditableTextarea
          value={eventFields.event_details}
          onSave={(val) => onChange('event_details', val)}
        />
      </section> */}

      {onUploadAttachments ? (
        <BasicDetailsAttachmentsSection
          files={eventAttachments}
          onUpload={onUploadAttachments}
          onDeleteAttachment={onDeleteAttachment}
        />
      ) : null}
    </div>
  </div>
);

export const BasicDetailsCommunity = ({
  eventFields,
  onChange,
  onScheduleCommit,
  clientOptions = [],
  centerOptions = [],
  statusSelectOptions = [],
  centerLabelById = {},
  centersReadOnly = false,
  clientsReadOnly = false,
  showAllCentersOption = true,
  showAllClientsOption = true,
  eventAttachments = [],
  onUploadAttachments,
  onDeleteAttachment,
}) => {
  const clientsApplicableFromBackendIsArray = Array.isArray(eventFields.clients);

  const clientsApplicableValues = useMemo(() => {
    const rows = Array.isArray(eventFields.clients) ? eventFields.clients : [];
    return rows
      .map((row) => {
        if (typeof row === 'string') return row;
        if (row && typeof row === 'object')
          return row.customer || row.client || row.value || row.name || '';
        return '';
      })
      .map((v) => String(v).trim())
      .filter(Boolean);
  }, [eventFields.clients]);

  const resolvedCenterOptions = useMemo(
    () => (Array.isArray(centerOptions) && centerOptions.length > 0 ? centerOptions : []),
    [centerOptions],
  );

  const allCentersSelected = isAllCentersTruth(eventFields.all_centers);
  const selectedCentreIds = useMemo(
    () => normalizeCentreValues(eventFields.centre_name),
    [eventFields.centre_name],
  );

  const centersSelectionReady =
    allCentersSelected || (Array.isArray(selectedCentreIds) && selectedCentreIds.length > 0);

  const resolvedClientOptions = useMemo(
    () =>
      resolveClientOptionsForEventCenters({
        clientOptions,
        centerOptions: resolvedCenterOptions,
        allCenters: allCentersSelected,
        selectedCentreIds,
      }),
    [clientOptions, allCentersSelected, selectedCentreIds, resolvedCenterOptions],
  );

  const clientsSectionLocked = !centersSelectionReady;
  const prevCentreIdsKeyRef = useRef(null);

  useEffect(() => {
    if (clientsReadOnly) return;
    if (!clientsApplicableFromBackendIsArray) return;
    if (isAllClientsTruth(eventFields.all_clients)) return;
    const catalogLoaded = Array.isArray(clientOptions) && clientOptions.length > 0;
    if (!catalogLoaded) return;

    if (!allCentersSelected && selectedCentreIds.length === 0) return;

    const centreKey = [...selectedCentreIds].map(String).sort().join('\0');
    const prevKey = prevCentreIdsKeyRef.current;
    prevCentreIdsKeyRef.current = centreKey;
    if (prevKey === null || prevKey === centreKey) return;

    const allowed = new Set(resolvedClientOptions.map((o) => String(o.value)));
    const nextValues = clientsApplicableValues.filter((id) => allowed.has(String(id)));
    if (nextValues.length !== clientsApplicableValues.length) {
      onChange(
        'clients',
        nextValues.map((customer) => ({ customer })),
      );
    }
  }, [
    resolvedClientOptions,
    clientOptions,
    eventFields.all_clients,
    allCentersSelected,
    selectedCentreIds,
    clientsApplicableFromBackendIsArray,
    clientsApplicableValues,
    onChange,
    clientsReadOnly,
  ]);

  const clientsApplicableLabel = (() => {
    if (isAllClientsTruth(eventFields.all_clients)) return 'All Clients';
    if (clientsApplicableValues.length === 0) return '--';
    const labelByValue = new Map(clientOptions.map((o) => [o.value, o.label]));
    return clientsApplicableValues.map((v) => labelByValue.get(v) || v).join(', ');
  })();

  const clientDisplayOptions = useMemo(() => {
    if (!clientsReadOnly) return resolvedClientOptions;
    const labels = labelMapFromClientRows(eventFields.clients);
    clientOptions.forEach((o) => {
      const key = String(o.value);
      labels.set(key, o.label || labels.get(key) || key);
    });
    return mergeSelectOptionsWithValues(clientOptions, clientsApplicableValues, labels);
  }, [
    clientsReadOnly,
    resolvedClientOptions,
    clientOptions,
    eventFields.clients,
    clientsApplicableValues,
  ]);

  return (
    <div className='flex flex-col gap-5 py-5'>
      <div className='flex flex-col gap-5'>
        <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
          <SectionTitle
            icon={RiBookletLine}
            className='text-text-sub-900'
            iconClassName='text-text-soft-400'
          >
            Basic Info
          </SectionTitle>
          <div className='grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2'>
            <div className='flex flex-col gap-1'>
              <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Event Name</div>
              <InlineEditableText
                value={eventFields.event_name}
                onSave={(val) => onChange('event_name', val)}
              />
            </div>
            <CenterFieldBasicInfo
              eventFields={eventFields}
              onChange={onChange}
              centerOptions={centerOptions}
              centerLabelById={centerLabelById}
              centersReadOnly={centersReadOnly}
              showAllCentersOption={showAllCentersOption}
            />
            <div className='flex flex-col gap-1'>
              <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Assignee</div>
              <AssigneeMultiSelect
                value={eventFields.assignee}
                onChange={(vals) => onChange('assignee', Array.isArray(vals) ? vals : [])}
                internalOnly
              />
            </div>

            <div className='flex flex-col gap-1'>
              <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Status</div>
              <InlineEditableSelect
                value={eventFields.community_status || eventFields.status}
                options={statusSelectOptions}
                onSave={(val) => onChange('community_status', val)}
                showStatusBadge
              />
            </div>
          </div>
        </section>

        <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
          <SectionTitle
            icon={RiGroupLine}
            className='text-text-sub-900'
            iconClassName='text-text-soft-400'
          >
            Clients &amp; Participation
          </SectionTitle>
          <div className='grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2'>
            <div className='flex flex-col gap-1 '>
              <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                Clients Applicable
              </div>
              <div
                className={`flex flex-col gap-3 ${clientsSectionLocked && !clientsReadOnly ? 'opacity-60' : ''}`}
              >
                {clientsApplicableFromBackendIsArray ? (
                  <>
                    {!clientsReadOnly && clientsSectionLocked ? (
                      <p className='text-paragraph-xs text-text-sub-600'>
                        Select at least one center in the section above
                        {showAllCentersOption ? ' (or keep All Centers on)' : ''} before choosing
                        which clients apply.
                      </p>
                    ) : null}
                    {showAllClientsOption ? (
                      <div className='flex items-center gap-2'>
                        <Checkbox.Root
                          id='allClientsDetail'
                          checked={isAllClientsTruth(eventFields.all_clients)}
                          onCheckedChange={(checked) => {
                            const next = Boolean(checked);
                            onChange('all_clients', next);
                            if (next) onChange('clients', []);
                          }}
                          disabled={clientsSectionLocked || clientsReadOnly}
                        />
                        <label
                          htmlFor='allClientsDetail'
                          className={`text-paragraph-sm select-none ${
                            clientsReadOnly
                              ? 'cursor-default text-text-main-900'
                              : 'cursor-pointer text-text-main-900'
                          }`}
                        >
                          All Clients
                        </label>
                      </div>
                    ) : isAllClientsTruth(eventFields.all_clients) ? (
                      <div className='text-paragraph-sm text-text-sub-600'>All Clients</div>
                    ) : null}

                    {!clientsSectionLocked &&
                    (showAllClientsOption ? !isAllClientsTruth(eventFields.all_clients) : true) ? (
                      <MultiSelect
                        options={clientDisplayOptions}
                        value={clientsApplicableValues}
                        onValueChange={(value) =>
                          onChange(
                            'clients',
                            (Array.isArray(value) ? value : value ? [value] : []).map(
                              (customer) => ({ customer }),
                            ),
                          )
                        }
                        placeholder='Select clients'
                        className='w-full'
                        disabled={clientsSectionLocked || clientsReadOnly}
                        readableWhenDisabled={clientsReadOnly}
                      />
                    ) : !clientsReadOnly && !clientsSectionLocked ? (
                      <div className='text-paragraph-sm text-text-sub-600'>
                        {clientsApplicableLabel}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className='flex items-center gap-2'>
                      <Checkbox.Root
                        id='allClientsDetailReadonly'
                        checked={Boolean(eventFields.all_clients)}
                        disabled
                      />
                      <label
                        htmlFor='allClientsDetailReadonly'
                        className='text-paragraph-sm text-text-main-900 cursor-default select-none opacity-90'
                      >
                        All Clients
                      </label>
                    </div>
                    <div className='text-paragraph-sm text-text-sub-600'>
                      {clientsApplicableLabel}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className='flex flex-col gap-1'>
              <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                Participation Type
              </div>
              <InlineEditableSelect
                value={eventFields.participation_type}
                options={COMMUNITY_PARTICIPATION_OPTIONS}
                onSave={(val) => onChange('participation_type', val)}
              />
            </div>

            {String(eventFields.participation_type || '').toLowerCase() === 'team participation' ? (
              <>
                <div className='flex flex-col gap-1'>
                  <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                    Minimum Team Members
                  </div>
                  <InlineEditableText
                    value={eventFields.minimum_team_members}
                    onSave={(val) => onChange('minimum_team_members', val)}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                    Maximum Team Members
                  </div>
                  <InlineEditableText
                    value={eventFields.maximum_team_members}
                    onSave={(val) => onChange('maximum_team_members', val)}
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>

        <section className='border-b border-stroke-soft-200 bg-bg-white-0 pb-5'>
          <SectionTitle
            icon={RiCalendarEventLine}
            className='text-text-sub-900'
            iconClassName='text-text-soft-400'
          >
            Schedule &amp; Registration
          </SectionTitle>
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Event schedule</div>
              <EventScheduleDateTimeInline
                startDatetimeIso={eventFields.start_datetime}
                endDatetimeIso={eventFields.end_datetime}
                onCommit={onScheduleCommit}
              />
            </div>
            <div className='grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2'>
              <div className='flex flex-col gap-1'>
                <div className='text-paragraph-sm opacity-72 text-text-sub-500'>Deadline</div>
                <InlineEditableDate
                  value={eventFields.registration_deadline}
                  onSave={saveEventDateField(onChange, 'registration_deadline')}
                />
              </div>
              <div className='flex flex-col gap-1'>
                <div className='text-paragraph-sm opacity-72 text-text-sub-500'>
                  Max Registrations
                </div>
                <InlineEditableText
                  value={formatMaxRegistrationsDisplay(eventFields.max_registrations)}
                  onSave={(val) => onChange('max_registrations', parseMaxRegistrationsInput(val))}
                />
              </div>
            </div>
          </div>
        </section>

        {onUploadAttachments ? (
          <BasicDetailsAttachmentsSection
            files={eventAttachments}
            onUpload={onUploadAttachments}
            onDeleteAttachment={onDeleteAttachment}
          />
        ) : null}

        {/* <section className=' border-stroke-soft-200 bg-bg-white-0 pb-5 w-[50%]'>
          <SectionTitle
            icon={RiFileList2Line}
            className='text-text-sub-900'
            iconClassName='text-text-soft-400'
          >
            About
          </SectionTitle>
          <InlineEditableTextarea
            value={eventFields.event_details}
            onSave={(val) => onChange('event_details', val)}
          />
        </section> */}
      </div>
    </div>
  );
};

const BASIC_DETAILS_BY_MODULE = {
  community: BasicDetailsCommunity,
  hosted: BasicDetailsExternal,
  spotlight: BasicDetailsMicro,
};

export const BasicDetailsByModule = ({
  moduleType,
  eventFields,
  onChange,
  onScheduleCommit,
  spocDetails,
  onOpenSpocModal,
  clientOptions,
  centerOptions,
  centerLabelById = {},
  partnerOptions,
  statusSelectOptions = [],
  centersReadOnly = false,
  clientsReadOnly = false,
  showAllCentersOption = true,
  showAllClientsOption = true,
  eventAttachments = [],
  onUploadAttachments,
  onDeleteAttachment,
}) => {
  const Renderer = BASIC_DETAILS_BY_MODULE[moduleType] ?? BasicDetailsMicro;
  return (
    <Renderer
      eventFields={eventFields}
      onChange={onChange}
      onScheduleCommit={onScheduleCommit}
      spocDetails={spocDetails}
      onOpenSpocModal={onOpenSpocModal}
      clientOptions={clientOptions}
      centerOptions={centerOptions}
      centerLabelById={centerLabelById}
      partnerOptions={partnerOptions}
      statusSelectOptions={statusSelectOptions}
      centersReadOnly={centersReadOnly}
      clientsReadOnly={clientsReadOnly}
      showAllCentersOption={showAllCentersOption}
      showAllClientsOption={showAllClientsOption}
      eventAttachments={eventAttachments}
      onUploadAttachments={onUploadAttachments}
      onDeleteAttachment={onDeleteAttachment}
    />
  );
};
