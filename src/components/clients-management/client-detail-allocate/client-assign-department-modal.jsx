import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiBuilding2Line } from 'react-icons/ri';
import { useDispatch } from 'react-redux';

import {
  postAssignClientDepartmentToSubSpace,
  postDeassignClientDepartmentFromSubSpace,
} from '@/api/clientFloorLayout';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Modal from '@/components/ui/modal';
import * as Select from '@/components/ui/select';
import { fetchClientFloorLayoutCoordinatesThunk } from '@/redux/clientDetailSlice';
import { CLIENT_ASSIGN_DEPARTMENT_OPTIONS } from '@/utils/client-assign-departments';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

/**
 * Assign or update client department on a sub-space via coworker API methods.
 *
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   clientId: string,
 *   centerId?: string,
 *   blockFloorId?: string,
 *   subspace: object | null,
 * }} props
 */
export default function ClientAssignDepartmentModal({
  open,
  onOpenChange,
  clientId,
  centerId = '',
  blockFloorId = '',
  subspace,
}) {
  const dispatch = useDispatch();
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const customerId = String(clientId || '').trim();
  const center = String(centerId || '').trim();
  const spaceId = String(subspace?.space_id || '').trim();
  const subSpaceId = String(subspace?.sub_space_id || '').trim();
  const subSpaceName = String(subspace?.sub_space_name || subspace?.label || 'sub-space').trim();
  const initialDepartment = String(subspace?.client_department || '').trim();

  const hasRequiredContext = useMemo(
    () => Boolean(customerId && center && spaceId && subSpaceId),
    [center, customerId, spaceId, subSpaceId],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedDepartment(initialDepartment);
  }, [open, initialDepartment]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        setSelectedDepartment('');
        setIsSaving(false);
      }
    },
    [onOpenChange],
  );

  const refetchLayout = useCallback(async () => {
    const bf = String(blockFloorId || '').trim();
    if (!center || !customerId || !bf) return;
    await dispatch(
      fetchClientFloorLayoutCoordinatesThunk({
        center_id: center,
        customer_id: customerId,
        block_floor_id: bf,
      }),
    ).unwrap();
  }, [blockFloorId, center, customerId, dispatch]);

  const handleSave = useCallback(async () => {
    if (!selectedDepartment || !hasRequiredContext) return;
    setIsSaving(true);
    try {
      await postAssignClientDepartmentToSubSpace({
        customer_id: customerId,
        center_id: center,
        space_id: spaceId,
        sub_space_id: subSpaceId,
        client_department: selectedDepartment,
      });
      showSuccessToast(initialDepartment ? 'Department updated' : 'Department assigned');
      await refetchLayout();
      handleOpenChange(false);
    } catch (error) {
      showErrorToast(error);
    } finally {
      setIsSaving(false);
    }
  }, [
    center,
    customerId,
    handleOpenChange,
    hasRequiredContext,
    initialDepartment,
    refetchLayout,
    selectedDepartment,
    spaceId,
    subSpaceId,
  ]);

  const handleRemove = useCallback(async () => {
    if (!hasRequiredContext || !initialDepartment) return;
    setIsSaving(true);
    try {
      await postDeassignClientDepartmentFromSubSpace({
        customer_id: customerId,
        space_id: spaceId,
        sub_space_id: subSpaceId,
        center_id: center,
      });
      showSuccessToast('Department removed');
      await refetchLayout();
      handleOpenChange(false);
    } catch (error) {
      showErrorToast(error);
    } finally {
      setIsSaving(false);
    }
  }, [
    center,
    customerId,
    handleOpenChange,
    hasRequiredContext,
    initialDepartment,
    refetchLayout,
    spaceId,
    subSpaceId,
  ]);

  const description = `Assign a department to ${subSpaceName.toLowerCase()}.`;

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[440px]'>
        <Modal.Header icon={RiBuilding2Line} title='Assign Department' description={description} />
        <Modal.Body className='flex flex-col gap-4 pt-1'>
          {!hasRequiredContext ? (
            <p className='text-paragraph-sm text-error-base'>
              Missing layout context for this sub-space. Reload the layout and try again.
            </p>
          ) : null}
          <div className='flex flex-col gap-1.5'>
            <Label.Root htmlFor='assign-department-select'>
              Department
              <Label.Asterisk className='text-red-500' />
            </Label.Root>
            <Select.Root
              value={selectedDepartment || undefined}
              onValueChange={setSelectedDepartment}
              size='small'
              disabled={!hasRequiredContext || isSaving}
            >
              <Select.Trigger id='assign-department-select' className='w-full'>
                <Select.Value placeholder='Select' />
              </Select.Trigger>
              <Select.Content>
                {CLIENT_ASSIGN_DEPARTMENT_OPTIONS.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        </Modal.Body>
        <Modal.Footer className='flex-col gap-2 sm:flex-col sm:items-stretch'>
          {initialDepartment ? (
            <Button.Root
              type='button'
              variant='neutral'
              mode='ghost'
              size='small'
              className='w-full text-error-base'
              disabled={isSaving || !hasRequiredContext}
              onClick={() => void handleRemove()}
            >
              Remove department
            </Button.Root>
          ) : null}
          <div className='flex w-full gap-2'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='w-full'
              disabled={isSaving}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              className='w-full'
              disabled={!selectedDepartment || !hasRequiredContext || isSaving}
              onClick={() => void handleSave()}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
