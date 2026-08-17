import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Label from '@/components/ui/label';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Tag from '@/components/ui/tag';
import ErrorText from '@/components/ui/error-text';
import { RiTaskLine } from 'react-icons/ri';
import {
  createSettingsTrackerThunk,
  getSettingsTrackerListThunk,
} from '@/redux/settingsTrackerSlice';
import CenterAccessDropdown from '../center-access-dropdown';

import { selectCenterAccess } from '@/redux/centerSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { normalizeTrackerDisplayName } from '@/utils/tracker-name-utils';

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active', color: 'green' },
  { value: 'Inactive', label: 'Inactive', color: 'gray' },
];

const VIEW_TYPES = ['Daily', 'Weekly', 'Monthly', 'Annually'];
const trackerSettingsSchema = z.object({
  trackerName: z.string().trim().min(1, 'Field is mandatory'),
  viewType: z.enum(VIEW_TYPES, { required_error: 'Field is mandatory' }),
  selectedCenters: z.array(z.string()).min(1, 'Select at least one center'),
  status: z.enum(['Active', 'Inactive'], { required_error: 'Field is mandatory' }),
});

const TrackerSettingsModal = ({ open, onOpenChange }) => {
  const centerAccess = useSelector(selectCenterAccess);
  const {
    control,
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(trackerSettingsSchema),
    defaultValues: {
      trackerName: '',
      viewType: 'Daily',
      selectedCenters: [],
      status: 'Active',
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const viewType = watch('viewType');
  const selectedCenters = watch('selectedCenters') || [];
  const status = watch('status');

  const settingTrackerState = useSelector((state) => state.settingsTracker.createSettingsTracker);

  const dispatch = useDispatch();

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  const onSubmit = async (data) => {
    const totalCenters = Array.isArray(centerAccess?.data) ? centerAccess.data.length : 0;
    const selectedCount = Array.isArray(data.selectedCenters) ? data.selectedCenters.length : 0;
    const applyToAllCenters = totalCenters > 0 && selectedCount === totalCenters ? 1 : 0;

    const selectedSet = new Set(data.selectedCenters || []);
    const zoneStats = (centerAccess.data || []).reduce((accumulator, center) => {
      const zoneName = center?.zone || center?.zone_name || 'Unassigned';
      const centerId = center?.name || center?.center_id || center?.id;
      if (!centerId) return accumulator;

      if (!accumulator[zoneName]) {
        accumulator[zoneName] = { total: 0, selectedIds: [] };
      }

      accumulator[zoneName].total += 1;
      if (selectedSet.has(centerId)) {
        accumulator[zoneName].selectedIds.push(centerId);
      }
      return accumulator;
    }, {});

    // Build centers array in the format [{center: "CTR-153", disabled: 0}]
    const centers = (data.selectedCenters || []).map((centerId) => ({
      center: centerId,
      disabled: 0,
    }));

    // Match tracker-settings-page `buildCentersPayload`: when all centers are selected,
    // send only `apply_to_all_centers: 1` and omit `centers`. Sending both can fail on
    // create for some view types (e.g. Weekly/Monthly/Annually) depending on API validation.
    const basePayload = {
      tracker_name: normalizeTrackerDisplayName(data.trackerName),
      apply_to_all_centers: applyToAllCenters,
      view_type: data.viewType,
      status: data.status,
    };
    const payload =
      applyToAllCenters === 1
        ? { ...basePayload, apply_to_all_centers: 1 }
        : {
            ...basePayload,
            apply_to_all_centers: 0,
            ...(centers.length > 0 ? { centers } : {}),
          };

    try {
      const result = await dispatch(createSettingsTrackerThunk(payload)).unwrap();
      // console.log('result from tracker creation', result);
      showSuccessToast('Tracker created successfully');
      handleClose();

      dispatch(
        getSettingsTrackerListThunk({
          keyword: '',
          page: 1,
          limit_page_length: 10,
        }),
      );
    } catch (error) {
      const errMsg = extractErrorMessage(error);
      showErrorToast(errMsg);
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiTaskLine}
          title='New Facility Tracker'
          description='Add below details to add a tracker.'
        />

        <Modal.Body>
          <div className='w-full flex flex-col gap-4'>
            {/* Tracker Name */}
            <div className='w-full flex flex-col gap-1'>
              <Label.Root>
                Tracker Name
                <Label.Asterisk />
              </Label.Root>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Input placeholder='Enter tracker name' {...register('trackerName')} />
                </Input.Wrapper>
              </Input.Root>
              {errors.trackerName && <ErrorText>{errors.trackerName.message}</ErrorText>}
            </div>

            {/* View Type */}
            <div className='w-full flex flex-col gap-1'>
              <Label.Root>
                View Type
                <Label.Asterisk />
              </Label.Root>

              <ButtonGroup.Root className='flex-1'>
                <ButtonGroup.Item
                  className='flex-1'
                  data-state={viewType === 'Daily' ? 'on' : 'off'}
                  onClick={() => setValue('viewType', 'Daily', { shouldValidate: true })}
                >
                  Daily
                </ButtonGroup.Item>
                <ButtonGroup.Item
                  className='flex-1'
                  data-state={viewType === 'Weekly' ? 'on' : 'off'}
                  onClick={() => setValue('viewType', 'Weekly', { shouldValidate: true })}
                >
                  Weekly
                </ButtonGroup.Item>
                <ButtonGroup.Item
                  className='flex-1'
                  data-state={viewType === 'Monthly' ? 'on' : 'off'}
                  onClick={() => setValue('viewType', 'Monthly', { shouldValidate: true })}
                >
                  Monthly
                </ButtonGroup.Item>
                <ButtonGroup.Item
                  className='flex-1'
                  data-state={viewType === 'Annually' ? 'on' : 'off'}
                  onClick={() => setValue('viewType', 'Annually', { shouldValidate: true })}
                >
                  Annually
                </ButtonGroup.Item>
              </ButtonGroup.Root>
              {errors.viewType && <ErrorText>{errors.viewType.message}</ErrorText>}
            </div>

            {/*Center */}
            <div className='w-full flex flex-col gap-1'>
              <Label.Root>
                Center
                <Label.Asterisk />
              </Label.Root>
              <Controller
                name='selectedCenters'
                control={control}
                render={({ field }) => (
                  <CenterAccessDropdown
                    centers={centerAccess.data}
                    selectedCenters={field.value || []}
                    onChange={(nextSelected) => {
                      field.onChange(nextSelected || []);
                    }}
                    renderSelectedSummary={({ selectedCenters, normalizedCenters }) => {
                      const selected = normalizedCenters.filter((center) =>
                        selectedCenters.includes(center.id),
                      );

                      if (selected.length === 0) {
                        return (
                          <span className='truncate text-label-sm text-text-soft-400'>
                            Select centers
                          </span>
                        );
                      }

                      const visible = selected.slice(0, 2);
                      const extraCount = selected.length - visible.length;

                      return (
                        <div className='flex items-center gap-2 overflow-hidden'>
                          {visible.map((center) => (
                            <Tag.Root
                              key={center.id}
                              variant='stroke'
                              color='gray'
                              size='small'
                              className='bg-bg-white-0 ring-stroke-soft-200 text-text-sub-600 whitespace-nowrap normal-case'
                            >
                              {center.label}
                            </Tag.Root>
                          ))}
                          {extraCount > 0 && (
                            <Tag.Root
                              variant='stroke'
                              color='gray'
                              size='small'
                              className='bg-bg-white-0 ring-stroke-soft-200 text-text-sub-600 whitespace-nowrap'
                            >
                              +{extraCount}
                            </Tag.Root>
                          )}
                        </div>
                      );
                    }}
                  />
                )}
              />
              {errors.selectedCenters && <ErrorText>{errors.selectedCenters.message}</ErrorText>}
            </div>

            {/* Status */}
            <div className='w-full flex flex-col gap-1'>
              <Label.Root>Status</Label.Root>
              <Controller
                name='status'
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    size='small'
                    value={field.value}
                    onValueChange={field.onChange}
                    options={STATUS_OPTIONS}
                    placeholder='Select'
                    showArrow={false}
                    renderTrigger={({ selectedOption }) => (
                      <Badge.Root
                        variant='light'
                        color={
                          STATUS_OPTIONS.find((option) => option.value === status)?.color || 'gray'
                        }
                        className='text-nowrap'
                      >
                        {status}
                      </Badge.Root>
                    )}
                    renderOptionLabel={(option) => (
                      <Badge.Root variant='light' color={option.color} className='text-nowrap'>
                        {option.label}
                      </Badge.Root>
                    )}
                  />
                )}
              />
              {errors.status && <ErrorText>{errors.status.message}</ErrorText>}
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <div className='flex w-full items-center gap-2'>
            <Button.Root
              size='xsmall'
              variant='neutral'
              className='flex-1'
              mode='stroke'
              type='button'
              onClick={handleClose}
            >
              Cancel
            </Button.Root>
            <Button.Root
              size='xsmall'
              type='button'
              className='flex-1'
              onClick={handleSubmit(onSubmit)}
              disabled={settingTrackerState?.isLoading}
            >
              {settingTrackerState?.isLoading ? 'Adding...' : 'Add'}
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default TrackerSettingsModal;
