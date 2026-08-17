import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  RiAddLine,
  RiBuilding2Line,
  RiBriefcaseLine,
  RiCalendarLine,
  RiCheckLine,
  RiCloseLine,
  RiMapPin2Line,
  RiRuler2Line,
  RiStackLine,
  RiStickyNoteLine,
  RiSuitcaseLine,
  RiTeamLine,
} from 'react-icons/ri';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import FieldRow from '@/components/ui/field-row';
import { INDIA_CITY_OPTIONS } from '@/components/crm-leads/constants';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import { Datepicker } from '@/components/ui/datepicker';
import ErrorText from '@/components/ui/error-text';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Select from '@/components/ui/select';
import * as Tag from '@/components/ui/tag';
import { PROJECT_MEMBER_FIELDS } from '@/components/projects/constants';
import {
  buildParentProjectOptions,
  buildProjectCreatePayload,
} from '@/components/projects/list/project-helpers';
import { fetchProjectStageOptions } from '@/components/projects/project-stage-status-helpers';
import {
  createProject,
  fetchProjectAccounts,
  selectProjectAccounts,
  selectProjectAccountsLoading,
} from '@/redux/projectSlice';
import { defaultProjectCreateValues, projectCreateSchema } from '@/schemas/project';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

const CITY_MIN_SEARCH_LEN = 2;

function MemberField({ control, field, errors, disabled }) {
  const fieldName = `members.${field.id}`;
  const error = errors.members?.[field.id];

  return (
    <div className='flex flex-col gap-1'>
      <span className='text-label-sm text-text-strong-950'>{field.label}</span>
      <Controller
        control={control}
        name={fieldName}
        render={({ field: memberField }) => {
          const fieldValue = Array.isArray(memberField.value)
            ? memberField.value
            : memberField.value
              ? [memberField.value]
              : [];

          return (
            <AssigneeMultiSelect
              value={fieldValue}
              onChange={(values) => memberField.onChange(Array.isArray(values) ? values : [])}
              disabled={disabled}
              placeholder='Select'
              size='xsmall'
              variant='borderless'
              maxVisibleAvatars={2}
            />
          );
        }}
      />
      <ErrorText>{error?.message}</ErrorText>
    </div>
  );
}

export default function ProjectCreateDrawer({ open, onOpenChange, onCreate }) {
  const dispatch = useDispatch();
  const isCreating = useSelector((state) => state.project.create.isLoading);
  const accountOptions = useSelector(selectProjectAccounts);
  const accountsLoading = useSelector(selectProjectAccountsLoading);
  const [floorInputVisible, setFloorInputVisible] = useState(false);
  const [newFloorValue, setNewFloorValue] = useState('');
  const [stageOptions, setStageOptions] = useState([]);
  const floorInputRef = useRef(null);
  const previousProjectNameRef = useRef('');

  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: defaultProjectCreateValues,
    mode: 'onChange',
  });

  const watchedStage = watch('stage');
  const watchedName = watch('name');
  const watchedCity = watch('city');

  const cityOptions = useMemo(() => {
    const value = String(watchedCity ?? '').trim();
    if (!value || INDIA_CITY_OPTIONS.some((option) => option.value === value)) {
      return INDIA_CITY_OPTIONS;
    }
    return [{ value, label: value }, ...INDIA_CITY_OPTIONS];
  }, [watchedCity]);

  const parentProjectOptions = useMemo(() => buildParentProjectOptions(watchedName), [watchedName]);

  const stageLabel = useMemo(
    () => stageOptions.find((option) => option.value === watchedStage)?.label ?? watchedStage,
    [stageOptions, watchedStage],
  );

  useEffect(() => {
    if (!open) {
      reset(defaultProjectCreateValues);
      setFloorInputVisible(false);
      setNewFloorValue('');
      previousProjectNameRef.current = '';
      return;
    }

    dispatch(fetchProjectAccounts())
      .unwrap()
      .catch((error) => {
        showErrorToast(extractErrorMessage(error));
      });

    let cancelled = false;
    fetchProjectStageOptions()
      .then((options) => {
        if (!cancelled) setStageOptions(options);
      })
      .catch((error) => {
        if (!cancelled) {
          setStageOptions([]);
          showErrorToast(extractErrorMessage(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, open, reset]);

  useEffect(() => {
    const trimmedName = String(watchedName ?? '').trim();
    if (!trimmedName) return;

    const currentParent = String(getValues('parent_project') ?? '').trim();
    const previousName = previousProjectNameRef.current;

    if (!currentParent || currentParent === previousName) {
      setValue('parent_project', trimmedName, { shouldValidate: true });
    }

    previousProjectNameRef.current = trimmedName;
  }, [getValues, setValue, watchedName]);

  const closeDrawer = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const isSubmitting = isCreating;

  const onSubmit = useCallback(
    async (values) => {
      try {
        await dispatch(createProject(buildProjectCreatePayload(values))).unwrap();
        showSuccessToast('Project created successfully');
        reset(defaultProjectCreateValues);
        onOpenChange(false);
        onCreate?.();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, onCreate, onOpenChange, reset],
  );

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[600px] h-full shadow-regular-md'>
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col'>
          <Drawer.Header className='min-h-[48px] gap-4 px-8 py-5'>
            <span className='flex size-12 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-500'>
              <RiSuitcaseLine className='size-6' />
            </span>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
              <Drawer.Title>Create New Project</Drawer.Title>
              <p className='text-paragraph-sm text-text-sub-500'>Enter project details</p>
            </div>
          </Drawer.Header>

          <Drawer.Body className='gap-6 overflow-y-auto  h-full px-8 py-6'>
            <Controller
              control={control}
              name='stage'
              render={({ field }) => (
                <Select.Root value={field.value} onValueChange={field.onChange} size='xsmall'>
                  <Select.Trigger className='h-7 w-fit max-w-full gap-1 rounded-lg border-0 bg-information-base px-2.5 text-label-xs text-static-white hover:bg-information-dark focus-visible:ring-information-base'>
                    <span className='truncate'>{stageLabel}</span>
                  </Select.Trigger>
                  <Select.Content className='min-w-[100px]'>
                    {stageOptions.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />

            <div className='flex flex-col gap-1'>
              <Input.Root size='medium'>
                <Input.Wrapper>
                  <Input.Input
                    {...register('name')}
                    placeholder='Enter project title'
                    className='text-title-h6'
                  />
                </Input.Wrapper>
              </Input.Root>
              <ErrorText>{errors.name?.message}</ErrorText>
            </div>

            <div className='flex flex-col gap-1'>
              <Input.Root size='small' variant='borderless' noRing>
                <Input.Wrapper>
                  <Input.Icon as={RiStickyNoteLine} />
                  <Input.Input
                    {...register('description')}
                    placeholder='Add description'
                    className='text-paragraph-md'
                  />
                </Input.Wrapper>
              </Input.Root>
              <ErrorText>{errors.description?.message}</ErrorText>
            </div>

            <div className='divide-y divide-stroke-soft-200 bg-black rounded-xl border border-stroke-soft-200 bg-white'>
              <FieldRow icon={RiBuilding2Line} label='Account' required>
                <Controller
                  control={control}
                  name='account'
                  render={({ field }) => (
                    <Select.Root
                      variant='borderless'
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      size='xsmall'
                      disabled={accountsLoading || isSubmitting}
                      hasError={Boolean(errors.account)}
                    >
                      <Select.Trigger>
                        <Select.Value
                          placeholder={accountsLoading ? 'Loading accounts...' : 'Select account'}
                        />
                      </Select.Trigger>
                      <Select.Content className='max-w-[max(var(--radix-select-trigger-width),320px)]'>
                        {accountOptions.map((account) => (
                          <Select.Item key={account.value} value={account.value}>
                            {account.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  )}
                />
                <ErrorText>{errors.account?.message}</ErrorText>
              </FieldRow>

              <FieldRow icon={RiMapPin2Line} label='City' required>
                <Controller
                  control={control}
                  name='city'
                  render={({ field }) => (
                    <SearchableSelect
                      variant='borderless'
                      size='xsmall'
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={cityOptions}
                      placeholder='Select city'
                      searchPlaceholder='Search Indian cities...'
                      minSearchLength={CITY_MIN_SEARCH_LEN}
                      minSearchMessage={`Type at least ${CITY_MIN_SEARCH_LEN} characters to search cities.`}
                      noResultsMessage='No cities found'
                      emptyMessage='Search for an Indian city'
                      hasError={Boolean(errors.city)}
                      triggerClassName='w-full'
                      contentClassName='min-w-[280px]'
                    />
                  )}
                />
                <ErrorText>{errors.city?.message}</ErrorText>
              </FieldRow>

              <FieldRow icon={RiBriefcaseLine} label='Parent Project'>
                <Controller
                  control={control}
                  name='parent_project'
                  render={({ field }) => (
                    <Select.Root
                      variant='borderless'
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      size='xsmall'
                      disabled={!watchedName?.trim() || isSubmitting}
                      hasError={Boolean(errors.parent_project)}
                    >
                      <Select.Trigger>
                        <Select.Value
                          placeholder={
                            !watchedName?.trim()
                              ? 'Enter project title first'
                              : 'Select parent project'
                          }
                        />
                      </Select.Trigger>
                      <Select.Content className='max-w-[max(var(--radix-select-trigger-width),320px)]'>
                        {parentProjectOptions.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  )}
                />
                <ErrorText>{errors.parent_project?.message}</ErrorText>
              </FieldRow>

              <FieldRow icon={RiCalendarLine} label='Design Start Date' required>
                <Controller
                  control={control}
                  name='design_start'
                  render={({ field }) => (
                    <Datepicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder='DD/MM/YYYY'
                      formatDate={(date) => format(date, 'dd/MM/yyyy')}
                      hasError={Boolean(errors.design_start)}
                      size='xsmall'
                    />
                  )}
                />
                <ErrorText>{errors.design_start?.message}</ErrorText>
              </FieldRow>

              <FieldRow icon={RiCalendarLine} label='Design End Date' required>
                <Controller
                  control={control}
                  name='design_end'
                  render={({ field }) => (
                    <Datepicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder='DD/MM/YYYY'
                      formatDate={(date) => format(date, 'dd/MM/yyyy')}
                      hasError={Boolean(errors.design_end)}
                      size='xsmall'
                    />
                  )}
                />
                <ErrorText>{errors.design_end?.message}</ErrorText>
              </FieldRow>

              <FieldRow icon={RiCalendarLine} label='Project Start Date' required>
                <Controller
                  control={control}
                  name='project_start'
                  render={({ field }) => (
                    <Datepicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder='DD/MM/YYYY'
                      formatDate={(date) => format(date, 'dd/MM/yyyy')}
                      hasError={Boolean(errors.project_start)}
                      size='xsmall'
                    />
                  )}
                />
                <ErrorText>{errors.project_start?.message}</ErrorText>
              </FieldRow>

              <FieldRow icon={RiCalendarLine} label='Project End Date' required>
                <Controller
                  control={control}
                  name='project_end'
                  render={({ field }) => (
                    <Datepicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder='DD/MM/YYYY'
                      formatDate={(date) => format(date, 'dd/MM/yyyy')}
                      hasError={Boolean(errors.project_end)}
                      size='xsmall'
                    />
                  )}
                />
                <ErrorText>{errors.project_end?.message}</ErrorText>
              </FieldRow>

              <FieldRow icon={RiRuler2Line} label='Carpet Area (sqft)' required>
                <Input.Root
                  size='xsmall'
                  variant='borderless'
                  noRing
                  hasError={Boolean(errors.carpet_area)}
                >
                  <Input.Wrapper>
                    <Input.Input
                      {...register('carpet_area')}
                      inputMode='decimal'
                      placeholder='Enter carpet area'
                    />
                  </Input.Wrapper>
                </Input.Root>
                <ErrorText>{errors.carpet_area?.message}</ErrorText>
              </FieldRow>
            </div>

            <div className='flex flex-col gap-3'>
              <div className='flex items-center gap-2 text-label-md text-text-sub-500'>
                <RiStackLine className='size-5 text-text-soft-400' />
                Floors
              </div>
              <Controller
                control={control}
                name='floors'
                render={({ field }) => {
                  const addFloor = () => {
                    const trimmed = newFloorValue.trim();
                    if (!trimmed || field.value.includes(trimmed)) return;
                    field.onChange([...field.value, trimmed]);
                    setNewFloorValue('');
                    setFloorInputVisible(false);
                  };

                  return (
                    <div className='flex flex-col gap-2'>
                      {field.value?.length > 0 ? (
                        <div className='flex flex-wrap items-center gap-2'>
                          {field.value.map((floor) => (
                            <Tag.Root key={floor} variant='stroke' className='h-6 rounded-full'>
                              {floor}
                              <Tag.DismissButton
                                type='button'
                                aria-label={`Remove ${floor}`}
                                onClick={() =>
                                  field.onChange(field.value.filter((item) => item !== floor))
                                }
                              />
                            </Tag.Root>
                          ))}
                        </div>
                      ) : null}
                      {floorInputVisible ? (
                        <div className='flex items-center gap-2'>
                          <Input.Root size='xsmall' className='flex-1'>
                            <Input.Wrapper>
                              <Input.Input
                                ref={floorInputRef}
                                value={newFloorValue}
                                onChange={(event) => setNewFloorValue(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    addFloor();
                                  }
                                }}
                                placeholder='Enter floor name'
                                disabled={isSubmitting}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                          <Button.Root
                            type='button'
                            variant='neutral'
                            mode='ghost'
                            size='xsmall'
                            onClick={() => {
                              setFloorInputVisible(false);
                              setNewFloorValue('');
                            }}
                            disabled={isSubmitting}
                          >
                            <Button.Icon as={RiCloseLine} />
                          </Button.Root>
                          <Button.Root
                            type='button'
                            variant='neutral'
                            mode='ghost'
                            size='xsmall'
                            onClick={addFloor}
                            disabled={isSubmitting || !newFloorValue.trim()}
                          >
                            <Button.Icon as={RiCheckLine} />
                          </Button.Root>
                        </div>
                      ) : (
                        <LinkButton.Root
                          variant='primary'
                          size='small'
                          underline
                          type='button'
                          className='w-fit gap-1'
                          onClick={() => {
                            setFloorInputVisible(true);
                            window.setTimeout(() => floorInputRef.current?.focus(), 0);
                          }}
                        >
                          <LinkButton.Icon as={RiAddLine} />
                          Add New Floor
                        </LinkButton.Root>
                      )}
                    </div>
                  );
                }}
              />
            </div>

            <div className='flex flex-col gap-4'>
              <div className='flex items-center gap-2 text-label-md text-text-sub-500'>
                <RiTeamLine className='size-5 text-text-soft-400' />
                Project Members
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {PROJECT_MEMBER_FIELDS.map((field) => (
                  <MemberField
                    key={field.id}
                    control={control}
                    field={field}
                    errors={errors}
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            </div>
          </Drawer.Body>

          <Drawer.Footer className='sticky bottom-0 flex justify-between p-6 flex-row z-10 border-t border-stroke-soft-200 bg-bg-white-0'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={closeDrawer}
              disabled={isSubmitting}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='submit'
              variant='primary'
              mode='filled'
              size='small'
              disabled={isSubmitting}
            >
              Create
            </Button.Root>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
}
