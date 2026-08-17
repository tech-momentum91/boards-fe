import React, { useEffect, useState } from 'react';
import { RiLayoutGridLine } from 'react-icons/ri';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { getProjectLayoutAreaTypeOptions } from '@/api/projectLayout';
import ProjectAreaTypeSelect from '@/components/projects/areas/project-area-type-select';
import * as Button from '@/components/ui/button';
import ErrorText from '@/components/ui/error-text';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Modal from '@/components/ui/modal';
import {
  defaultProjectLayoutAreaCreateValues,
  projectLayoutAreaCreateSchema,
} from '@/schemas/project';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';

export default function ProjectLayoutAddAreaModal({
  open,
  onOpenChange,
  onSave,
  isSaving = false,
}) {
  const [areaTypeOptions, setAreaTypeOptions] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectLayoutAreaCreateSchema),
    defaultValues: defaultProjectLayoutAreaCreateValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (!open) {
      reset(defaultProjectLayoutAreaCreateValues);
      return undefined;
    }

    let cancelled = false;
    setIsLoadingOptions(true);

    getProjectLayoutAreaTypeOptions()
      .then((options) => {
        if (!cancelled) setAreaTypeOptions(options);
      })
      .catch((error) => {
        if (!cancelled) {
          showErrorToast(extractErrorMessage(error, 'Failed to load area types'));
          setAreaTypeOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, reset]);

  const onSubmit = async (values) => {
    await onSave?.({
      area_label: String(values.area_label).trim(),
      area_type: values.area_type,
      carpet_area: String(values.carpet_area ?? '').trim(),
    });
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[440px]'>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header
            title='Add Area'
            description='Enter below details to add area.'
            icon={RiLayoutGridLine}
          />

          <Modal.Body className='flex flex-col gap-4 pt-2'>
            <div className='flex flex-col gap-1.5'>
              <Label.Root>
                Area Name <Label.Asterisk />
              </Label.Root>
              <Input.Root size='small' hasError={Boolean(errors.area_label)}>
                <Input.Wrapper>
                  <Input.Input
                    {...register('area_label')}
                    placeholder='Enter area name'
                    disabled={isSaving}
                  />
                </Input.Wrapper>
              </Input.Root>
              <ErrorText>{errors.area_label?.message}</ErrorText>
            </div>

            <div className='flex w-full flex-col gap-1.5'>
              <Label.Root>
                Area Type <Label.Asterisk />
              </Label.Root>
              <Controller
                control={control}
                name='area_type'
                render={({ field }) => (
                  <ProjectAreaTypeSelect
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    options={areaTypeOptions}
                    onOptionsChange={setAreaTypeOptions}
                    placeholder={isLoadingOptions ? 'Loading…' : 'Enter or select area type'}
                    disabled={isLoadingOptions || isSaving}
                    hasError={Boolean(errors.area_type)}
                    size='small'
                    triggerClassName='w-full'
                  />
                )}
              />
              <ErrorText>{errors.area_type?.message}</ErrorText>
            </div>

            <div className='flex flex-col gap-1.5'>
              <Label.Root>Carpet Area</Label.Root>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Input
                    {...register('carpet_area')}
                    placeholder='Enter carpet area'
                    disabled={isSaving}
                  />
                  <Input.InlineAffix>Sqft</Input.InlineAffix>
                </Input.Wrapper>
              </Input.Root>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Modal.Close asChild>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                className='w-full md:w-auto'
                disabled={isSaving}
              >
                Cancel
              </Button.Root>
            </Modal.Close>
            <Button.Root
              type='submit'
              variant='primary'
              mode='filled'
              size='small'
              className='w-full md:w-auto'
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button.Root>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}
