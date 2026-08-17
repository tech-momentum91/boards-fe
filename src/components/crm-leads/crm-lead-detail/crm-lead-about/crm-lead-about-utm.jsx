import React, { useCallback, useMemo, useState } from 'react';
import { RiInformationLine } from 'react-icons/ri';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import * as Input from '@/components/ui/input';
import * as Tag from '@/components/ui/tag';
import * as Tooltip from '@/components/ui/tooltip';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Textarea from '@/components/ui/textarea';

const FieldLabel = ({ children }) => (
  <label className='text-paragraph-sm text-text-sub-500 opacity-72'>{children}</label>
);

const TAGS_HINT = 'Type tags as tag1,tag2,tag3…';

/** Normalize lead tags from API (JSON string, CSV, or array) to a string[]. */
export function parseLeadTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags))
    return tags
      .map(String)
      .map((t) => t.trim())
      .filter(Boolean);
  if (typeof tags !== 'string') return [];
  const trimmed = tags.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map(String)
        .map((t) => t.trim())
        .filter(Boolean);
    }
  } catch {
    /* fall through */
  }
  return trimmed
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

const CrmLeadAboutUtm = ({ lead, onFieldChange, isSaving, leadOptions = {} }) => {
  const [tagInput, setTagInput] = useState('');
  const tags = useMemo(() => {
    // Local edits set `tags` as an array; API returns Frappe `_user_tags` as ",a,b,c"
    if (Array.isArray(lead?.tags)) return parseLeadTags(lead.tags);
    return parseLeadTags(lead?._user_tags || lead?.tags);
  }, [lead?.tags, lead?._user_tags]);

  const handleChange = (field, value) => {
    onFieldChange?.(field, value);
  };

  const commitTagInput = useCallback(() => {
    if (!tagInput.trim()) return;
    const next = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => !tags.includes(t));
    if (next.length > 0) onFieldChange?.('tags', [...tags, ...next]);
    setTagInput('');
  }, [tagInput, tags, onFieldChange]);

  const handleTagKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      commitTagInput();
    },
    [commitTagInput],
  );

  const removeTag = useCallback(
    (tagToRemove) => {
      onFieldChange?.(
        'tags',
        tags.filter((t) => t !== tagToRemove),
      );
    },
    [tags, onFieldChange],
  );

  const leadSourceSelectOptions = useMemo(() => {
    const sources = leadOptions.lead_source || [];
    const rawLs = lead?.lead_source;
    if (rawLs && String(rawLs).trim() && !sources.some((o) => o.value === rawLs)) {
      return [{ value: rawLs, label: rawLs }, ...sources];
    }
    return sources;
  }, [leadOptions.lead_source, lead?.lead_source]);

  return (
    <div className='flex flex-col gap-5 py-5'>
      <div className='grid grid-cols-2 gap-x-6 gap-y-5'>
        <div className='flex flex-col gap-1'>
          <FieldLabel>Lead Source</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <SearchableSelect
              variant='borderless'
              size='xsmall'
              matchTriggerWidth={false}
              showArrow={false}
              value={lead?.lead_source ?? ''}
              onValueChange={(v) => handleChange('lead_source', v)}
              options={leadSourceSelectOptions}
              placeholder='Select'
              searchPlaceholder='Search...'
              noResultsMessage='No lead sources found'
              emptyMessage='No lead sources available'
              triggerClassName='-ml-2 w-full'
            />
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Campaign</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={lead?.campaign || ''}
                  onChange={(e) => handleChange('campaign', e.target.value)}
                  placeholder='Enter'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Medium</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={lead?.medium || ''}
                  onChange={(e) => handleChange('medium', e.target.value)}
                  placeholder='Enter'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Term</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={lead?.term || ''}
                  onChange={(e) => handleChange('term', e.target.value)}
                  placeholder='Enter'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Content</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={lead?.content || ''}
                  onChange={(e) => handleChange('content', e.target.value)}
                  placeholder='Enter'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='col-span-2 flex flex-col gap-1'>
          <div className='flex items-center gap-1'>
            <FieldLabel>Tags</FieldLabel>
            <Tooltip.Root delayDuration={0}>
              <Tooltip.Trigger asChild>
                <button
                  type='button'
                  className='inline-flex text-text-soft-400 hover:text-text-sub-600'
                  aria-label={TAGS_HINT}
                >
                  <RiInformationLine className='size-3.5' />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content side='top' size='medium' className='max-w-xs'>
                {TAGS_HINT}
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
          <div className='flex flex-col gap-2'>
            <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
              <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                <Input.Wrapper>
                  <Input.Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={commitTagInput}
                    placeholder='Type tags'
                    disabled={isSaving}
                    className='text-label-sm text-text-main-900'
                  />
                </Input.Wrapper>
              </Input.Root>
            </EditableFieldWrapper>
            {tags.length > 0 && (
              <div className='flex flex-wrap gap-2'>
                {tags.map((item) => (
                  <Tag.Root key={item} variant='stroke'>
                    <span className='text-label-xs text-text-sub-600'>{item}</span>
                    {!isSaving ? (
                      <Tag.DismissButton
                        onClick={() => removeTag(item)}
                        aria-label={`Remove ${item}`}
                      />
                    ) : null}
                  </Tag.Root>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>GClid</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={lead?.gclid || ''}
                  onChange={(e) => handleChange('gclid', e.target.value)}
                  placeholder='Enter'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='flex flex-col gap-1'>
          <FieldLabel>Ad Group</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={lead?.ad_group || ''}
                  onChange={(e) => handleChange('ad_group', e.target.value)}
                  placeholder='Enter'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='col-span-2 flex flex-col gap-1'>
          <FieldLabel>UTM URL</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={lead?.utm_url || ''}
                  onChange={(e) => handleChange('utm_url', e.target.value)}
                  placeholder='Enter'
                  maxLength={500}
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='col-span-2 flex flex-col gap-1'>
          <FieldLabel>Landing Page URL</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={lead?.landing_page_url || ''}
                  onChange={(e) => handleChange('landing_page_url', e.target.value)}
                  placeholder='Enter'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='col-span-2 flex flex-col gap-1'>
          <FieldLabel>Contact From URL</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={lead?.contact_from_url || ''}
                  onChange={(e) => handleChange('contact_from_url', e.target.value)}
                  placeholder='Enter'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>

        <div className='col-span-2 flex flex-col gap-1'>
          <FieldLabel>Message by Prospect</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
              <Input.Wrapper>
                <Input.Input
                  value={lead?.contact_message || ''}
                  onChange={(e) => handleChange('contact_message', e.target.value)}
                  placeholder='Enter'
                  className='text-label-sm text-text-main-900'
                />
              </Input.Wrapper>
            </Input.Root>
          </EditableFieldWrapper>
        </div>
        <div className='col-span-2 flex flex-col gap-1'>
          <FieldLabel>UTM Content</FieldLabel>
          <EditableFieldWrapper editable={!isSaving} iconClassName='mr-2'>
            <Textarea.Root
              variant='borderless'
              simple
              size='xsmall'
              rows={5}
              className='-ml-2 w-full min-h-[120px] text-label-sm text-text-main-900'
              value={lead?.utm_content || ''}
              onChange={(e) => handleChange('utm_content', e.target.value)}
              placeholder='Enter'
              maxLength={500}
            />
          </EditableFieldWrapper>
        </div>
      </div>
    </div>
  );
};

export default CrmLeadAboutUtm;
