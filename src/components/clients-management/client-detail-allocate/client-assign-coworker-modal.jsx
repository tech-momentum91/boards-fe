import React, { useCallback, useState } from 'react';
import { format } from 'date-fns';
import { RiUserAddLine } from 'react-icons/ri';
import { useDispatch } from 'react-redux';

import { postAssignCoworkerToSubSpace } from '@/api/clientFloorLayout';
import { CLIENT_SUBSPACE_SLOT_SOURCE } from '@/constants/layout/annotation-sources';
import { Datepicker } from '@/components/ui/datepicker';
import * as Label from '@/components/ui/label';
import { buildPermanentAssignPayload } from '@/utils/assign-coworker-payload';
import {
  ClientAssignCoworkerPickerFields,
  useClearUnassignedCoworkersOnClose,
} from '@/components/clients-management/client-detail-allocate/client-assign-coworker-picker-fields';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import { fetchClientFloorLayoutCoordinatesThunk } from '@/redux/clientDetailSlice';
import { LAYOUT_FILTER_ALL } from '@/constants/layout/filter-sentinel';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

/**
 * Assign co-worker to a floor-plan seat (client layout view).
 *
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   clientId: string,
 *   centerId?: string,
 *   blockFloorId?: string,
 *   marker: object | null,
 *   onClientMarkerAssign?: (args: { markerId: string, coworkerId: string, coworkerName: string }) => void,
 *   onDeskAssignmentSaved?: (args: {
 *     deskId: string,
 *     coworkerId: string,
 *     coworkerName: string,
 *   }) => void,
 * }} props
 */
export default function ClientAssignCoworkerModal({
  open,
  onOpenChange,
  clientId,
  centerId = '',
  blockFloorId = '',
  marker,
  onClientMarkerAssign,
  onDeskAssignmentSaved,
}) {
  const dispatch = useDispatch();
  const [selectedDepartment, setSelectedDepartment] = useState(LAYOUT_FILTER_ALL);
  const [selectedCoworkerId, setSelectedCoworkerId] = useState('');
  const [selectedCoworkerLabel, setSelectedCoworkerLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  useClearUnassignedCoworkersOnClose(open);

  const isSubSpaceSlot = marker?.source === CLIENT_SUBSPACE_SLOT_SOURCE;

  const handleOpenChange = useCallback(
    (nextOpen) => {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        setSelectedDepartment(LAYOUT_FILTER_ALL);
        setSelectedCoworkerId('');
        setSelectedCoworkerLabel('');
        setStartDate('');
        setIsSavingAssignment(false);
      }
    },
    [onOpenChange],
  );

  const handleSave = useCallback(async () => {
    if (!selectedCoworkerId || !marker) return;

    if (isSubSpaceSlot) {
      const center = String(centerId || '').trim();
      const cust = String(clientId || '').trim();
      const bf = String(blockFloorId || '').trim();
      const deskId = String(marker.desk_id || '').trim();
      if (!center || !cust || !bf) {
        showErrorToast(new Error('Missing layout context. Reload the page and try again.'));
        return;
      }
      if (!deskId) {
        showErrorToast(new Error('Missing desk for this seat. Reload the layout and try again.'));
        return;
      }
      if (!startDate) {
        showErrorToast(new Error('Please set start date.'));
        return;
      }
      setIsSavingAssignment(true);
      try {
        const assignResult = await postAssignCoworkerToSubSpace(
          buildPermanentAssignPayload({
            customerId: cust,
            spaceId: String(marker.space_id || '').trim(),
            subSpaceId: String(marker.sub_space_id || '').trim(),
            deskId,
            coworkerId: selectedCoworkerId,
            centerId: center,
            startDate,
          }),
        );
        showSuccessToast('Co-worker assigned to seat');
        onDeskAssignmentSaved?.({
          deskId,
          coworkerId: selectedCoworkerId,
          coworkerName: selectedCoworkerLabel || selectedCoworkerId,
          clientDeskStatus: assignResult?.client_desk_status,
          deskAssignment: {
            client_coworker_ref: selectedCoworkerId,
            coworker_name: selectedCoworkerLabel || selectedCoworkerId,
            start_date: startDate,
            assignment_type: 'Permanent',
            is_active_now: true,
          },
        });
        await dispatch(
          fetchClientFloorLayoutCoordinatesThunk({
            center_id: center,
            customer_id: cust,
            block_floor_id: bf,
          }),
        ).unwrap();
        handleOpenChange(false);
      } catch (error) {
        showErrorToast(error);
      } finally {
        setIsSavingAssignment(false);
      }
      return;
    }

    onClientMarkerAssign?.({
      markerId: marker.id,
      coworkerId: selectedCoworkerId,
      coworkerName: selectedCoworkerLabel || selectedCoworkerId,
    });
    handleOpenChange(false);
  }, [
    selectedCoworkerId,
    marker,
    isSubSpaceSlot,
    centerId,
    clientId,
    blockFloorId,
    dispatch,
    handleOpenChange,
    onClientMarkerAssign,
    onDeskAssignmentSaved,
    selectedCoworkerLabel,
    startDate,
  ]);

  const parseDateValue = (value) => {
    if (!value) return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[440px]'>
        <Modal.Header
          icon={RiUserAddLine}
          title='Assign Co-worker'
          description='Assign a co-worker to this workstation.'
        />
        <Modal.Body className='flex flex-col gap-4 pt-1'>
          <ClientAssignCoworkerPickerFields
            open={open}
            clientId={clientId}
            selectedDepartment={selectedDepartment}
            onDepartmentChange={setSelectedDepartment}
            selectedCoworkerId={selectedCoworkerId}
            onCoworkerIdChange={setSelectedCoworkerId}
            onSelectedCoworkerLabelChange={setSelectedCoworkerLabel}
          />

          {isSubSpaceSlot ? (
            <div className='flex flex-col gap-1.5'>
              <Label.Root>
                Start Date
                <Label.Asterisk className='text-red-500' />
              </Label.Root>
              <Datepicker
                value={parseDateValue(startDate)}
                onChange={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                placeholder='DD / MM / YYYY'
                size='small'
                variant='default'
                disabled={isSavingAssignment}
                className='bg-white'
              />
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer className='justify-end gap-2 sm:justify-between'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='w-full'
            disabled={isSavingAssignment}
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
            disabled={!selectedCoworkerId || isSavingAssignment}
            onClick={() => void handleSave()}
          >
            {isSavingAssignment ? 'Saving…' : 'Save'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
