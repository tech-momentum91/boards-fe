import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiCloseLine, RiStackFill } from 'react-icons/ri';

import {
  createDefaultProjectBoqForm,
  mapPreviousProjectsToBoqOptions,
} from '@/components/boq/boq-helper';
import { fetchBoqPreviousProjects } from '@/api/boqTemplateProjects';
import { PROJECT_BOQ_NEW_OPTION_IDS } from '@/components/boq/constants';
import ProjectBoqClientSelect from '@/components/boq/project-boqs/components/project-boq-client-select';
import ProjectBoqTemplateSelect from '@/components/boq/project-boqs/components/project-boq-template-select';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Label from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Textarea from '@/components/ui/textarea';
import ErrorText from '@/components/ui/error-text';
import { cn } from '@/utils/cn';

const CREATE_TITLES = {
  [PROJECT_BOQ_NEW_OPTION_IDS.DESIGN]: 'Create a Design BOQ',
  [PROJECT_BOQ_NEW_OPTION_IDS.MAIN]: 'Create a Main BOQ',
  [PROJECT_BOQ_NEW_OPTION_IDS.ADDITIONAL]: 'Create a Additional BOQ',
};

const ReadOnlyContextField = ({ value }) => (
  <div
    className={cn(
      'flex w-full min-h-10 items-center rounded-lg border border-stroke-soft-200',
      'bg-bg-weak-50 px-2.5 py-2 text-paragraph-sm text-text-sub-600',
      'shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]',
    )}
  >
    {value || '—'}
  </div>
);

const resolveOptionLabel = (options, value) =>
  options.find((option) => option.value === value)?.label || value || '';

const CreateProjectBoqModal = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  boqType = '',
  clientOptions = [],
  projectOptions = [],
  onClientChange,
  templateOptions = {},
  prefill = null,
  lockContextFields = false,
}) => {
  const [form, setForm] = useState(() => createDefaultProjectBoqForm(boqType));
  const [errors, setErrors] = useState({});
  const [previousProjectOptions, setPreviousProjectOptions] = useState([]);

  useEffect(() => {
    if (!open) {
      setForm(createDefaultProjectBoqForm(boqType));
      setErrors({});
      setPreviousProjectOptions([]);
      return;
    }
    setForm({
      ...createDefaultProjectBoqForm(boqType),
      client: prefill?.client || '',
      project: prefill?.project || '',
    });
    setErrors({});
  }, [open, boqType, prefill?.client, prefill?.project]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    fetchBoqPreviousProjects({ excludeProjectId: form.project || undefined })
      .then((projects) => {
        if (cancelled) return;
        setPreviousProjectOptions(
          mapPreviousProjectsToBoqOptions(projects, { excludeProjectId: form.project }),
        );
      })
      .catch(() => {
        if (!cancelled) setPreviousProjectOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, form.project]);

  const resolvedTemplateOptions = useMemo(
    () => ({
      templateMaster: templateOptions?.templateMaster ?? [],
      previousProjects:
        templateOptions?.previousProjects?.length > 0
          ? templateOptions.previousProjects
          : previousProjectOptions,
    }),
    [previousProjectOptions, templateOptions],
  );

  const updateField = useCallback(
    (field, value) => {
      if (lockContextFields && (field === 'client' || field === 'project')) return;
      setForm((previous) => {
        const next = { ...previous, [field]: value };
        if (field === 'client') {
          next.project = '';
          onClientChange?.(value);
        }
        return next;
      });
      setErrors((previous) => {
        if (!previous[field]) return previous;
        const next = { ...previous };
        delete next[field];
        return next;
      });
    },
    [lockContextFields, onClientChange],
  );

  const validate = useCallback(() => {
    const nextErrors = {};
    if (!form.client) nextErrors.client = 'Client is required';
    if (!form.project) nextErrors.project = 'Project name is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [form.client, form.project]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    await onSubmit?.(form);
  }, [form, onSubmit, validate]);

  const canSubmit = Boolean(form.client && form.project);

  const modalTitle = CREATE_TITLES[boqType] || 'Create New BOQ';
  const clientLabel = resolveOptionLabel(clientOptions, form.client);
  const projectLabel = resolveOptionLabel(projectOptions, form.project);

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className='flex max-h-[min(734px,calc(100dvh-32px))] w-full max-w-[487px] flex-col overflow-hidden p-0'
        showClose={false}
      >
        <div className='flex shrink-0 items-center gap-4 border-b border-stroke-soft-200 px-5 py-4'>
          <span className='flex shrink-0 items-center justify-center rounded-full bg-success-lighter p-2.5'>
            <RiStackFill className='size-6 text-success-base' aria-hidden />
          </span>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <Modal.Title>{modalTitle}</Modal.Title>
            <Modal.Description>Quick create by entering basic details</Modal.Description>
          </div>
          <Modal.Close asChild>
            <CompactButton.Root variant='ghost' size='medium' className='shrink-0'>
              <CompactButton.Icon as={RiCloseLine} />
            </CompactButton.Root>
          </Modal.Close>
        </div>

        <Modal.Body className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5'>
          <div className='flex flex-col gap-1'>
            <Label.Root>
              Client
              <Label.Asterisk />
            </Label.Root>
            {lockContextFields ? (
              <ReadOnlyContextField value={clientLabel} />
            ) : (
              <ProjectBoqClientSelect
                value={form.client}
                onValueChange={(value) => updateField('client', value)}
                options={clientOptions}
                error={errors.client}
              />
            )}
            <ErrorText>{errors.client}</ErrorText>
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>
              Project name
              <Label.Asterisk />
            </Label.Root>
            {lockContextFields ? (
              <ReadOnlyContextField value={projectLabel} />
            ) : (
              <SearchableSelect
                value={form.project}
                onValueChange={(value) => updateField('project', value)}
                options={projectOptions}
                placeholder='Select'
                searchPlaceholder='Search project...'
                emptyMessage={form.client ? 'No projects available' : 'Select a client first'}
                noResultsMessage='No projects found'
                disabled={!form.client}
                hasError={Boolean(errors.project)}
                showArrow
                matchTriggerWidth
                triggerClassName='w-full'
              />
            )}
            <ErrorText>{errors.project}</ErrorText>
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>BOQ Template</Label.Root>
            <ProjectBoqTemplateSelect
              value={form.boqTemplate}
              onValueChange={(value) => updateField('boqTemplate', value)}
              options={resolvedTemplateOptions}
              error={errors.boqTemplate}
            />
            <ErrorText>{errors.boqTemplate}</ErrorText>
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>Description</Label.Root>
            <Textarea.Root
              className='h-[110px] min-h-[110px] w-full'
              placeholder='Type here....'
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              rows={4}
            />
          </div>
        </Modal.Body>

        <Modal.Footer className='flex shrink-0 gap-3 border-t border-stroke-soft-200 px-5 py-4'>
          <Modal.Close asChild>
            <Button.Root
              className='min-w-0 flex-1'
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
            >
              Cancel
            </Button.Root>
          </Modal.Close>
          <Button.Root
            type='button'
            className='min-w-0 flex-1 bg-[#079455] hover:bg-[#067644]'
            variant='primary'
            mode='filled'
            size='small'
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Creating...' : 'Create BOQ'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CreateProjectBoqModal;
