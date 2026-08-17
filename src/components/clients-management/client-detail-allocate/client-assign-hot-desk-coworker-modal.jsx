import React, { useCallback, useState } from 'react';
import { RiUserAddLine } from 'react-icons/ri';
import { useDispatch } from 'react-redux';

import { postAssignCoworkerToSubSpace } from '@/api/clientFloorLayout';
import {
  ClientAssignCoworkerPickerFields,
  useClearUnassignedCoworkersOnClose,
} from '@/components/clients-management/client-detail-allocate/client-assign-coworker-picker-fields';
import ClientHotDeskOneTimeFields from '@/components/clients-management/client-detail-allocate/client-hot-desk-one-time-fields';
import {
  ClientHotDeskRecurringCheckbox,
  ClientHotDeskRecurringFields,
  HOT_DESK_RECURRENCE_END_AFTER,
  HOT_DESK_RECURRENCE_END_ON,
} from '@/components/clients-management/client-detail-allocate/client-hot-desk-recurring-fields';
import {
  buildOneTimeHotDeskAssignPayload,
  buildRecurringAssignPayload,
} from '@/utils/assign-coworker-payload';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import { fetchClientFloorLayoutCoordinatesThunk } from '@/redux/clientDetailSlice';
import { LAYOUT_FILTER_ALL } from '@/constants/layout/filter-sentinel';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const DEFAULT_RECURRENCE_TYPE = 'Weekly';

/**
 * Hot-desk co-worker assignment with recurring schedule UI.
 *
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   clientId: string,
 *   centerId?: string,
 *   blockFloorId?: string,
 *   marker: object | null,
 *   onDeskAssignmentSaved?: (args: {
 *     deskId: string,
 *     coworkerId: string,
 *     coworkerName: string,
 *   }) => void,
 * }} props
 */
export default function ClientAssignHotDeskCoworkerModal({
  open,
  onOpenChange,
  clientId,
  centerId = '',
  blockFloorId = '',
  marker,
  onDeskAssignmentSaved,
}) {
  const dispatch = useDispatch();
  const [selectedDepartment, setSelectedDepartment] = useState(LAYOUT_FILTER_ALL);
  const [selectedCoworkerId, setSelectedCoworkerId] = useState('');
  const [selectedCoworkerLabel, setSelectedCoworkerLabel] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState(DEFAULT_RECURRENCE_TYPE);
  const [selectedDayKeys, setSelectedDayKeys] = useState([]);
  const [selectedMonthDays, setSelectedMonthDays] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recurrenceStartDate, setRecurrenceStartDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [recurrenceEndType, setRecurrenceEndType] = useState(HOT_DESK_RECURRENCE_END_ON);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceEndAfter, setRecurrenceEndAfter] = useState('');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  useClearUnassignedCoworkersOnClose(open);

  const resetForm = useCallback(() => {
    setSelectedDepartment(LAYOUT_FILTER_ALL);
    setSelectedCoworkerId('');
    setSelectedCoworkerLabel('');
    setIsRecurring(false);
    setRecurrenceType(DEFAULT_RECURRENCE_TYPE);
    setSelectedDayKeys([]);
    setSelectedMonthDays([]);
    setStartDate('');
    setEndDate('');
    setRecurrenceStartDate('');
    setIsHalfDay(false);
    setStartTime('');
    setEndTime('');
    setRecurrenceEndType(HOT_DESK_RECURRENCE_END_ON);
    setRecurrenceEndDate('');
    setRecurrenceEndAfter('');
    setIsSavingAssignment(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        resetForm();
      }
    },
    [onOpenChange, resetForm],
  );

  const handleToggleDayKey = useCallback((key) => {
    setSelectedDayKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const validateOneTimeFields = useCallback(() => {
    if (!startDate || !endDate) {
      showErrorToast(new Error('Please set start and end date.'));
      return false;
    }
    if (endDate < startDate) {
      showErrorToast(new Error('End date must be on or after start date.'));
      return false;
    }
    if (!startTime || !endTime) {
      showErrorToast(new Error('Please set start and end time.'));
      return false;
    }
    return true;
  }, [endDate, endTime, startDate, startTime]);

  const validateRecurringFields = useCallback(() => {
    if (!recurrenceStartDate) {
      showErrorToast(new Error('Please set start date.'));
      return false;
    }
    if (!startTime || !endTime) {
      showErrorToast(new Error('Please set start and end time.'));
      return false;
    }
    if (recurrenceType === 'Weekly' && selectedDayKeys.length === 0) {
      showErrorToast(new Error('Select at least one recurrence day.'));
      return false;
    }
    if (recurrenceType === 'Monthly' && selectedMonthDays.length === 0) {
      showErrorToast(new Error('Select at least one recurrence date.'));
      return false;
    }
    if (recurrenceEndType === HOT_DESK_RECURRENCE_END_ON && !recurrenceEndDate) {
      showErrorToast(new Error('Please select when recurrence ends.'));
      return false;
    }
    if (recurrenceEndType === HOT_DESK_RECURRENCE_END_AFTER) {
      const count = Number(recurrenceEndAfter);
      if (!Number.isFinite(count) || count < 1) {
        showErrorToast(new Error('Enter how many occurrences recurrence should run for.'));
        return false;
      }
    }
    return true;
  }, [
    endTime,
    recurrenceEndAfter,
    recurrenceEndDate,
    recurrenceEndType,
    recurrenceType,
    selectedDayKeys.length,
    selectedMonthDays.length,
    recurrenceStartDate,
    startTime,
  ]);

  const handleRecurrenceTypeChange = useCallback((value) => {
    setRecurrenceType(value);
    if (value !== 'Weekly') setSelectedDayKeys([]);
    if (value !== 'Monthly') setSelectedMonthDays([]);
  }, []);

  const handleAssign = useCallback(async () => {
    if (!selectedCoworkerId || !marker) return;

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

    if (isRecurring) {
      if (!validateRecurringFields()) return;
    } else if (!validateOneTimeFields()) {
      return;
    }

    setIsSavingAssignment(true);
    try {
      const baseParams = {
        customerId: cust,
        spaceId: String(marker.space_id || '').trim(),
        subSpaceId: String(marker.sub_space_id || '').trim(),
        deskId,
        coworkerId: selectedCoworkerId,
        centerId: center,
      };

      const payload = isRecurring
        ? buildRecurringAssignPayload({
            ...baseParams,
            recurringPeriod: recurrenceType,
            startDate: recurrenceStartDate,
            startTime,
            endTime,
            selectedDayKeys,
            selectedMonthDays,
            recurrenceEndType,
            recurrenceEndDate,
            recurrenceEndAfter,
          })
        : buildOneTimeHotDeskAssignPayload({
            ...baseParams,
            startDate,
            endDate,
            startTime,
            endTime,
          });

      const assignResult = await postAssignCoworkerToSubSpace(payload);
      showSuccessToast('Co-worker assigned to hot desk');
      onDeskAssignmentSaved?.({
        deskId,
        coworkerId: selectedCoworkerId,
        coworkerName: selectedCoworkerLabel || selectedCoworkerId,
        clientDeskStatus: assignResult?.client_desk_status,
        deskAssignment: isRecurring
          ? {
              client_coworker_ref: selectedCoworkerId,
              coworker_name: selectedCoworkerLabel || selectedCoworkerId,
              start_date: recurrenceStartDate,
              start_time: startTime,
              end_time: endTime,
              assignment_type: 'Recurring',
              recurring_desk_ref: recurrenceType,
              is_active_now: true,
            }
          : {
              client_coworker_ref: selectedCoworkerId,
              coworker_name: selectedCoworkerLabel || selectedCoworkerId,
              start_date: startDate,
              end_date: endDate,
              start_time: startTime,
              end_time: endTime,
              assignment_type: 'One-time',
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
  }, [
    selectedCoworkerId,
    marker,
    centerId,
    clientId,
    blockFloorId,
    isRecurring,
    recurrenceType,
    selectedDayKeys,
    selectedMonthDays,
    startTime,
    endTime,
    recurrenceEndType,
    recurrenceEndDate,
    recurrenceEndAfter,
    dispatch,
    handleOpenChange,
    validateRecurringFields,
    validateOneTimeFields,
    startDate,
    endDate,
    recurrenceStartDate,
    isHalfDay,
  ]);

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[520px]'>
        <Modal.Header
          icon={RiUserAddLine}
          title='Assign Co-worker'
          description='Assign a co-worker to this hot desk.'
        />
        <Modal.Body className='flex max-h-[min(70vh,640px)] flex-col gap-4 overflow-y-auto pt-1'>
          <ClientAssignCoworkerPickerFields
            open={open}
            clientId={clientId}
            selectedDepartment={selectedDepartment}
            onDepartmentChange={setSelectedDepartment}
            selectedCoworkerId={selectedCoworkerId}
            onCoworkerIdChange={setSelectedCoworkerId}
            onSelectedCoworkerLabelChange={setSelectedCoworkerLabel}
          />

          <ClientHotDeskRecurringCheckbox
            checked={isRecurring}
            onCheckedChange={setIsRecurring}
            disabled={isSavingAssignment}
          />

          {isRecurring ? (
            <ClientHotDeskRecurringFields
              disabled={isSavingAssignment}
              startDate={recurrenceStartDate}
              onStartDateChange={setRecurrenceStartDate}
              isHalfDay={isHalfDay}
              onHalfDayChange={setIsHalfDay}
              recurrenceType={recurrenceType}
              onRecurrenceTypeChange={handleRecurrenceTypeChange}
              selectedDayKeys={selectedDayKeys}
              onToggleDayKey={handleToggleDayKey}
              selectedMonthDays={selectedMonthDays}
              onMonthDaysChange={setSelectedMonthDays}
              startTime={startTime}
              onStartTimeChange={setStartTime}
              endTime={endTime}
              onEndTimeChange={setEndTime}
              recurrenceEndType={recurrenceEndType}
              onRecurrenceEndTypeChange={setRecurrenceEndType}
              recurrenceEndDate={recurrenceEndDate}
              onRecurrenceEndDateChange={setRecurrenceEndDate}
              recurrenceEndAfter={recurrenceEndAfter}
              onRecurrenceEndAfterChange={setRecurrenceEndAfter}
            />
          ) : (
            <ClientHotDeskOneTimeFields
              disabled={isSavingAssignment}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
              startTime={startTime}
              onStartTimeChange={setStartTime}
              endTime={endTime}
              onEndTimeChange={setEndTime}
            />
          )}
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
            onClick={() => void handleAssign()}
          >
            {isSavingAssignment ? 'Assigning…' : 'Assign'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
