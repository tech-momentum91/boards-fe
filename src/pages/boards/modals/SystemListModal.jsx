import { useEffect, useState } from 'react';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Modal from '@/components/ui/modal';
import * as Select from '@/components/ui/select';
import {
  createSystemListTasks,
  getSystemListFilterValues,
  getSystemListFilters,
  getSystemListModules,
  getSystemListPrimaryColumns,
  previewSystemListTasks,
} from '@/services/system-list-service';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  getSystemListPrimaryColumns as getFallbackPrimaryColumns,
  SYSTEM_LIST_MODULES,
} from '../views/list/constants/system-list-constants';
import SystemListFilterPanel from './SystemListFilterPanel';

export default function SystemListModal({ open, onOpenChange, listId, onSuccess }) {
  const [moduleId, setModuleId] = useState('');
  const [primaryColumnId, setPrimaryColumnId] = useState('');
  const [filterId, setFilterId] = useState('');
  const [selectedFilterValues, setSelectedFilterValues] = useState([]);
  const [modules, setModules] = useState(SYSTEM_LIST_MODULES);
  const [primaryColumnOptions, setPrimaryColumnOptions] = useState([]);
  const [filterOptions, setFilterOptions] = useState([]);
  const [filterValueOptions, setFilterValueOptions] = useState([]);
  const [previewCount, setPreviewCount] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingFilterValues, setIsLoadingFilterValues] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setModuleId('');
    setPrimaryColumnId('');
    setFilterId('');
    setSelectedFilterValues([]);
    setPrimaryColumnOptions([]);
    setFilterOptions([]);
    setFilterValueOptions([]);
    setPreviewCount(null);
    setError(null);
    setIsSubmitting(false);

    getSystemListModules().then((result) => {
      if (result.error) {
        return;
      }

      const nextModules = (result.data ?? []).map((module) => ({
        value: module.id,
        label: module.label,
      }));

      if (nextModules.length > 0) {
        setModules(nextModules);
      }
    });
  }, [open]);

  useEffect(() => {
    if (!moduleId) {
      setPrimaryColumnId('');
      setFilterId('');
      setSelectedFilterValues([]);
      setPrimaryColumnOptions([]);
      setFilterOptions([]);
      setFilterValueOptions([]);
      setPreviewCount(null);
      return;
    }

    let isCancelled = false;
    setIsLoadingColumns(true);
    setIsLoadingFilters(true);

    Promise.all([getSystemListPrimaryColumns(moduleId), getSystemListFilters(moduleId)]).then(
      ([columnsResult, filtersResult]) => {
        if (isCancelled) {
          return;
        }

        const apiColumns = (columnsResult.data ?? []).map((column) => ({
          value: column.id,
          label: column.label,
        }));

        const nextColumns =
          apiColumns.length > 0
            ? apiColumns
            : getFallbackPrimaryColumns(moduleId).map((column) => ({
                value: column.value,
                label: column.label,
              }));

        const nextFilters = (filtersResult.data ?? []).map((filter) => ({
          value: filter.id,
          label: filter.label,
        }));

        setPrimaryColumnOptions(nextColumns);
        setFilterOptions(nextFilters);
        setPrimaryColumnId((current) => {
          if (current && nextColumns.some((column) => column.value === current)) {
            return current;
          }

          return '';
        });
        setFilterId('');
        setSelectedFilterValues([]);
        setFilterValueOptions([]);
        setPreviewCount(null);
        setIsLoadingColumns(false);
        setIsLoadingFilters(false);
      },
    );

    return () => {
      isCancelled = true;
    };
  }, [moduleId]);

  useEffect(() => {
    setFilterId('');
    setSelectedFilterValues([]);
    setFilterValueOptions([]);
  }, [primaryColumnId]);

  useEffect(() => {
    if (!moduleId || !primaryColumnId || !filterId) {
      setSelectedFilterValues([]);
      setFilterValueOptions([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingFilterValues(true);

    getSystemListFilterValues(moduleId, filterId).then((result) => {
      if (isCancelled) {
        return;
      }

      const nextValues = (result.data ?? []).map((value) => ({
        value: value.id,
        label: value.label,
      }));

      setFilterValueOptions(nextValues);
      setSelectedFilterValues(nextValues.map((value) => value.value));
      setIsLoadingFilterValues(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [filterId, moduleId, primaryColumnId]);

  useEffect(() => {
    if (!open || !listId || !moduleId || !primaryColumnId) {
      setPreviewCount(null);
      return;
    }

    if (filterId && selectedFilterValues.length === 0) {
      setPreviewCount({ match_count: 0, create_count: 0, skipped_count: 0 });
      return;
    }

    let isCancelled = false;
    setIsLoadingPreview(true);

    const timer = setTimeout(() => {
      previewSystemListTasks({
        listId,
        moduleId,
        primaryColumnId,
        filterId,
        filterValues: selectedFilterValues,
      }).then((result) => {
        if (isCancelled) {
          return;
        }

        setIsLoadingPreview(false);

        if (result.error) {
          setPreviewCount(null);
          return;
        }

        setPreviewCount(result.data ?? null);
      });
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [filterId, listId, moduleId, open, primaryColumnId, selectedFilterValues]);

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen && !isSubmitting) {
      onOpenChange?.(false);
    }
  };

  const handleCreate = async () => {
    if (!listId) {
      setError('List is required.');
      return;
    }

    if (!moduleId) {
      setError('Module is required.');
      return;
    }

    if (!primaryColumnId) {
      setError('Primary column is required.');
      return;
    }

    if (filterId && selectedFilterValues.length === 0) {
      setError('Select at least one filter value.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createSystemListTasks({
        listId,
        moduleId,
        primaryColumnId,
        filterId,
        filterValues: selectedFilterValues,
      });

      if (result.error) {
        setError(result.error);
        showErrorToast(result.error);
        return;
      }

      const createdCount = result.data?.created_count ?? 0;
      const skippedCount = result.data?.skipped_count ?? 0;

      if (createdCount === 0) {
        const message =
          skippedCount > 0
            ? 'All matching records already have tasks in this list.'
            : 'No records matched for task creation.';
        setError(message);
        showErrorToast(message);
        return;
      }

      const successMessage =
        skippedCount > 0
          ? `${createdCount} task${createdCount === 1 ? '' : 's'} created. ${skippedCount} skipped.`
          : `${createdCount} task${createdCount === 1 ? '' : 's'} created.`;

      showSuccessToast(successMessage);
      onOpenChange?.(false);
      onSuccess?.(result.data);
    } catch (submitError) {
      const message = submitError?.message || 'Something went wrong. Please try again.';
      setError(message);
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showFilterPanel = Boolean(moduleId && primaryColumnId);
  const createCount = previewCount?.create_count ?? 0;
  const skippedCount = previewCount?.skipped_count ?? 0;
  const canCreate =
    Boolean(primaryColumnId) &&
    !isSubmitting &&
    !isLoadingColumns &&
    !isLoadingFilters &&
    !isLoadingFilterValues &&
    !(filterId && selectedFilterValues.length === 0) &&
    createCount > 0;

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[480px] rounded-[20px] p-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'>
        <Modal.Header className='border-b border-stroke-soft-200 px-8 py-5 before:hidden'>
          <div className='flex min-w-0 flex-1 flex-col gap-1 pr-8'>
            <Modal.Title className='text-lg font-medium leading-6 tracking-[-0.27px] text-text-main-900'>
              System List
            </Modal.Title>
            <Modal.Description className='text-sm leading-5 tracking-[-0.084px] text-text-sub-500'>
              Create a dynamic list using records from an existing module.
            </Modal.Description>
          </div>
        </Modal.Header>

        <Modal.Body className='max-h-[70vh] space-y-4 overflow-y-auto px-8 pb-8 pt-6'>
          {error ? (
            <div className='rounded-lg bg-error-lighter px-3 py-2 text-paragraph-sm text-error-base'>
              {error}
            </div>
          ) : null}

          <div className='flex flex-col gap-3'>
            <div className='flex flex-col gap-1'>
              <Label.Root className='text-sm font-medium leading-5 tracking-[-0.084px] text-text-main-900'>
                Module
                <Label.Asterisk />
              </Label.Root>

              <Select.Root
                value={moduleId || undefined}
                onValueChange={setModuleId}
                disabled={isSubmitting}
              >
                <Select.Trigger size='small' className='w-full'>
                  <Select.Value placeholder='Select' />
                </Select.Trigger>
                <Select.Content className='max-h-60'>
                  {modules.map((module) => (
                    <Select.Item key={module.value} value={module.value}>
                      {module.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root className='text-sm font-medium leading-5 tracking-[-0.084px] text-text-main-900'>
                Primary Column
                <Label.Asterisk />
              </Label.Root>

              <Select.Root
                value={primaryColumnId || undefined}
                onValueChange={setPrimaryColumnId}
                disabled={isSubmitting || !moduleId || isLoadingColumns}
              >
                <Select.Trigger size='small' className='w-full'>
                  <Select.Value placeholder={isLoadingColumns ? 'Loading...' : 'Select'} />
                </Select.Trigger>
                <Select.Content className='max-h-60'>
                  {primaryColumnOptions.map((column) => (
                    <Select.Item key={column.value} value={column.value}>
                      {column.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            {showFilterPanel ? (
              <SystemListFilterPanel
                filterOptions={filterOptions}
                filterId={filterId}
                onFilterIdChange={setFilterId}
                filterValueOptions={filterValueOptions}
                selectedFilterValues={selectedFilterValues}
                onSelectedFilterValuesChange={setSelectedFilterValues}
                isLoadingFilters={isLoadingFilters}
                isLoadingValues={isLoadingFilterValues}
                disabled={isSubmitting}
              />
            ) : null}

            {showFilterPanel ? (
              <div className='rounded-xl border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2.5 text-sm text-text-sub-600'>
                {isLoadingPreview ? (
                  'Calculating task count...'
                ) : previewCount ? (
                  <>
                    <span className='font-medium text-text-main-900'>
                      {createCount} task{createCount === 1 ? '' : 's'}
                    </span>{' '}
                    will be created
                    {skippedCount > 0
                      ? ` (${skippedCount} already linked and will be skipped)`
                      : ''}
                    .
                  </>
                ) : (
                  'Select a primary column to preview task count.'
                )}
              </div>
            ) : null}
          </div>
        </Modal.Body>

        <Modal.Footer className='justify-end gap-3 border-t border-stroke-soft-200 px-8 py-6'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => onOpenChange?.(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button.Root>

          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            onClick={handleCreate}
            disabled={!canCreate}
          >
            {isSubmitting
              ? 'Creating...'
              : createCount > 0
                ? `Create ${createCount} task${createCount === 1 ? '' : 's'}`
                : 'Create'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
