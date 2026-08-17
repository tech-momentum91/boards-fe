import React from 'react';
import { RiFileList2Line, RiLightbulbFlashLine, RiMicLine, RiPencilLine } from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import {
  EVENT_ENGAGEMENT_MODE_OPTIONS,
  SPOTLIGHT_EVENT_FACILITY_OPTIONS,
  SPOTLIGHT_EVENT_REVENUE_MODE_OPTIONS,
  formatMaxRegistrationsDisplay,
  isMaxRegistrationsUnlimited,
} from '@/components/event-management/constant';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  getInitials,
  getParticipationLabel,
  StatsCard,
  toNumberOrNull,
} from '@/components/event-management/event-helpers';

/** API returns child rows `{ facilities, name, ... }`; MultiSelect uses string values. */
// function facilitiesNeededToMultiSelectValues(rows) {
//   if (!Array.isArray(rows)) return [];
//   return rows
//     .map((row) => (typeof row === 'string' ? row : row?.facilities))
//     .filter((v) => v != null && String(v).trim() !== '');
// }

function multiSelectValuesToFacilitiesPayload(vals) {
  const list = Array.isArray(vals) ? vals : [];
  return list
    .filter((v) => v != null && String(v).trim() !== '')
    .map((name) => ({ facilities: String(name).trim() }));
}
import { SectionTitle } from '@/components/event-management/event-section-title';
import {
  InlineEditableRichEditor,
  InlineEditableSelect,
} from '@/components/event-management/inline-editable-fields';

export const EventDetailsMicro = ({
  eventFields,
  onChange,
  speakers,
  onAddSpeaker,
  onEditSpeaker,
}) => (
  <div className='flex flex-col gap-5'>
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
      <div className='rounded-xl bg-[#E9F1FF] px-5 py-4'>
        <div className='mb-2 text-paragraph-sm opacity-72 text-text-sub-500'>Engagement Mode</div>
        <InlineEditableSelect
          value={eventFields.engagement_mode}
          options={EVENT_ENGAGEMENT_MODE_OPTIONS}
          onSave={(val) => onChange('engagement_mode', val)}
        />
      </div>
      <div className='rounded-xl bg-[#FFF5E6] px-5 py-4'>
        <div className='mb-2 text-paragraph-sm opacity-72 text-text-sub-500'>Revenue Mode</div>
        <InlineEditableSelect
          value={eventFields.revenue_mode}
          options={SPOTLIGHT_EVENT_REVENUE_MODE_OPTIONS}
          onSave={(val) => onChange('revenue_mode', val)}
        />
      </div>
    </div>

    <section className='rounded-xl bg-bg-weak-50 px-5 py-4'>
      <SectionTitle
        icon={RiFileList2Line}
        className='mb-2 text-label-xs text-text-sub-500'
        iconClassName='text-text-soft-400'
      >
        Description
      </SectionTitle>
      <InlineEditableRichEditor
        value={eventFields.event_details}
        onSave={(val) => onChange('event_details', val)}
      />
    </section>

    <section className='rounded-xl bg-bg-weak-50 px-5 py-4'>
      <SectionTitle
        icon={RiLightbulbFlashLine}
        className='mb-2 text-label-xs text-text-sub-500'
        iconClassName='text-text-soft-400'
      >
        Facility Needed
      </SectionTitle>
      <div className='mb-3 max-w-md'>
        <MultiSelect
          options={SPOTLIGHT_EVENT_FACILITY_OPTIONS}
          // value={facilitiesNeededToMultiSelectValues(eventFields.facilities_needed)}
          value={
            Array.isArray(eventFields.facilities_needed)
              ? eventFields.facilities_needed.map((facility) => facility.facilities)
              : []
          }
          onValueChange={(vals) =>
            onChange('facilities_needed', multiSelectValuesToFacilitiesPayload(vals))
          }
          placeholder='Select facilities'
        />
      </div>
      <div className='flex flex-wrap gap-2 mt-2'>
        {(Array.isArray(eventFields.facilities_needed) ? eventFields.facilities_needed : [])
          .length > 0 ? (
          (Array.isArray(eventFields.facilities_needed) ? eventFields.facilities_needed : []).map(
            // (facility, index) => {
            //   const label =
            //     typeof facility === 'string' ? facility : facility?.facilities ?? '--';
            //   const key =
            //     (typeof facility === 'object' && facility?.name) ||
            //     `${label}-${index}`;
            //   return (
            //     <Badge.Root key={key} size='small' variant='light' color='purple'>
            //       {label}
            //     </Badge.Root>
            //   );
            // },
            (facility) => (
              <Badge.Root key={facility.name} size='small' variant='light' color='purple'>
                {facility.facilities}
              </Badge.Root>
            ),
          )
        ) : (
          <span className='text-paragraph-sm text-text-sub-500'>--</span>
        )}
      </div>
    </section>

    <section className='rounded-xl bg-bg-weak-50 px-5 py-4'>
      <div className='mb-2 flex items-center justify-between'>
        <SectionTitle
          icon={RiMicLine}
          className='mb-0 text-label-xs text-text-sub-500'
          iconClassName='text-text-soft-400'
        >
          Speakers
        </SectionTitle>
        <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onAddSpeaker}>
          Add Speaker
        </Button.Root>
      </div>
      {speakers.length > 0 ? (
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          {speakers.map((speaker, index) => (
            <div
              key={`${speaker.email || speaker.phone || speaker.name}-${index}`}
              className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-3'
            >
              <div className='flex items-center gap-3'>
                <div className='flex size-8 items-center justify-center rounded-full bg-[#E9DEFF] text-label-sm font-medium text-[#5F3DC4]'>
                  {getInitials(speaker.name)}
                </div>
                <div className='min-w-0 w-full'>
                  <div className='mb-0.5 flex items-center gap-2 justify-between'>
                    <span className='text-label-sm text-text-main-900'>{speaker.name || '--'}</span>
                    <Button.Root
                      variant='neutral'
                      mode='ghost'
                      size='xsmall'
                      onClick={() => onEditSpeaker(index)}
                      aria-label='Edit speaker'
                    >
                      <Button.Icon as={RiPencilLine} />
                    </Button.Root>
                  </div>
                  <div className='flex items-center gap-1.5 text-paragraph-xs text-text-soft-400'>
                    <span>{String(speaker.phone || '--').replaceAll('-', ' ')}</span>
                    <span className='size-1 rounded-full bg-text-sub-500' />
                    <span className='truncate'>{speaker.email || '--'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className='text-paragraph-sm text-text-sub-500'>No speakers added yet.</p>
      )}
    </section>
  </div>
);

export const EventDetailsCommunity = ({ eventFields, onChange }) => (
  <div className='flex flex-col gap-5'>
    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
      <StatsCard
        label='Registered'
        value={eventFields.total_registered || '--'}
        bgClassName='bg-[#E9FFF5]'
      />
      <StatsCard
        label='Max Capacity'
        value={formatMaxRegistrationsDisplay(eventFields.max_registrations)}
        bgClassName='bg-bg-white-0 border border-stroke-soft-200'
      />
      <StatsCard
        label='Participation'
        value={getParticipationLabel(eventFields.participation_type)}
        bgClassName='bg-[#FFF7E6]'
      />
    </div>

    <section className='rounded-xl bg-bg-weak-50 px-5 py-4'>
      <SectionTitle
        icon={RiFileList2Line}
        className='mb-2 text-label-xs text-text-sub-500'
        iconClassName='text-text-soft-400'
      >
        About
      </SectionTitle>
      <InlineEditableRichEditor
        value={eventFields.event_details}
        onSave={(val) => onChange('event_details', val)}
      />
    </section>
  </div>
);

export const EventDetailsExternal = ({ eventFields, speakers, onChange }) => {
  const registered = toNumberOrNull(eventFields.total_registered);
  const unlimited = isMaxRegistrationsUnlimited(eventFields.max_registrations);
  const capacity = unlimited ? null : toNumberOrNull(eventFields.max_registrations);
  const seatsLeft =
    unlimited || registered == null || capacity == null ? null : Math.max(0, capacity - registered);

  return (
    <div className='flex flex-col gap-5'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <StatsCard
          label='Registered'
          value={eventFields.total_registered || '--'}
          bgClassName='bg-[#E9FFF5]'
        />
        <StatsCard
          label='Max Seats'
          value={formatMaxRegistrationsDisplay(eventFields.max_registrations)}
          bgClassName='bg-bg-white-0 border border-stroke-soft-200'
        />
        <StatsCard label='Seats Left' value={seatsLeft ?? '--'} bgClassName='bg-[#FFF7E6]' />
      </div>

      <section className='rounded-xl bg-bg-weak-50 px-5 py-4'>
        <SectionTitle
          icon={RiFileList2Line}
          className='mb-2 text-label-xs text-text-sub-500'
          iconClassName='text-text-soft-400'
        >
          About
        </SectionTitle>
        <InlineEditableRichEditor
          value={eventFields.event_details}
          onSave={(val) => onChange('event_details', val)}
        />
      </section>

      <section className='rounded-xl bg-bg-white-0 border border-stroke-soft-200 px-0 py-0'>
        <div className='px-5 py-4 border-b border-stroke-soft-200'>
          <div className='text-label-xs font-semibold uppercase text-text-sub-500'>Speakers</div>
        </div>
        <div className='divide-y divide-stroke-soft-200'>
          {speakers.length > 0 ? (
            speakers.map((speaker, index) => {
              const subtitle =
                speaker?.title ||
                speaker?.designation ||
                speaker?.company ||
                speaker?.email ||
                '--';
              return (
                <div
                  key={`${speaker.email || speaker.phone || speaker.name}-${index}`}
                  className='px-5 py-4 flex items-center gap-3'
                >
                  <div className='flex size-8 items-center justify-center rounded-full bg-[#EEF2FF] text-label-sm font-medium text-[#3B5CCC]'>
                    {getInitials(speaker.name)}
                  </div>
                  <div className='min-w-0'>
                    <div className='text-label-sm text-text-main-900'>{speaker.name || '--'}</div>
                    <div className='text-paragraph-xs text-text-sub-600 truncate'>{subtitle}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className='px-5 py-4 text-paragraph-sm text-text-sub-500'>
              No speakers added yet.
            </div>
          )}
        </div>
      </section>

      <section className='rounded-xl bg-bg-white-0 border border-stroke-soft-200 px-0 py-0'>
        <div className='px-5 py-4 border-b border-stroke-soft-200'>
          <div className='text-label-xs font-semibold uppercase text-text-sub-500'>Agenda</div>
        </div>
        <div className='divide-y divide-stroke-soft-200'>
          {Array.isArray(eventFields.agenda) && eventFields.agenda.length > 0 ? (
            eventFields.agenda.map((item, idx) => (
              <div key={`${item.time || item.title}-${idx}`} className='px-5 py-4 flex gap-6'>
                <div className='w-[80px] text-paragraph-xs text-text-sub-600'>
                  {item.time || '--'}
                </div>
                <div className='min-w-0'>
                  <div className='text-label-sm text-text-main-900'>{item.title || '--'}</div>
                  {item.subtitle ? (
                    <div className='text-paragraph-xs text-text-sub-600'>{item.subtitle}</div>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className='px-5 py-4 text-paragraph-sm text-text-sub-500'>
              Agenda will appear here.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const EVENT_DETAILS_BY_MODULE = {
  community: EventDetailsCommunity,
  hosted: EventDetailsExternal,
  spotlight: EventDetailsMicro,
};

export const EventDetailsByModule = ({
  moduleType,
  eventFields,
  onChange,
  speakers,
  onAddSpeaker,
  onEditSpeaker,
}) => {
  const Renderer = EVENT_DETAILS_BY_MODULE[moduleType] ?? EventDetailsMicro;
  return (
    <Renderer
      eventFields={eventFields}
      onChange={onChange}
      speakers={speakers}
      onAddSpeaker={onAddSpeaker}
      onEditSpeaker={onEditSpeaker}
    />
  );
};
