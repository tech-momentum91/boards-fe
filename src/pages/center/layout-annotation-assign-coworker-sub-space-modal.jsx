import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { RiInformationLine, RiUserAddLine, RiSearchLine } from 'react-icons/ri';

import {
  getCheckClientCenterFloorAssignment,
  postSaveClientCoworkingLayoutMarker,
} from '@/api/clientFloorLayout';
import { buildLayoutCoworkerSubSpaceAssignPayload } from '@/utils/layout-coworker-sub-space-assign-payload';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Modal from '@/components/ui/modal';
import * as Select from '@/components/ui/select';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

function clientDisplayName(client) {
  return (
    client?.customer_name || client?.custom_legal_name || client?.name || String(client?.name || '')
  );
}

/**
 * Mark CoWorkers: pick client, verify floor assignment, then save marker or open full allocate flow.
 *
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   clientsList: unknown[],
 *   centerId: string,
 *   blockFloorId: string,
 *   spaceId: string,
 *   subSpaceId: string,
 *   marker: { x: number, y: number } | null,
 *   spaceLabel?: string,
 *   subSpaceLabel?: string,
 *   mergedParentSpace?: object | null,
 *   onAssignSuccess?: () => void | Promise<void>,
 *   onRequireFloorAllocation?: (payload: {
 *     customerId: string,
 *     assignmentCheck: Record<string, unknown> | null,
 *   }) => void,
 * }} props
 */
export default function LayoutAnnotationAssignCoworkerSubSpaceModal({
  open,
  onOpenChange,
  clientsList = [],
  centerId,
  blockFloorId,
  spaceId,
  subSpaceId,
  marker,
  spaceLabel = '',
  subSpaceLabel = '',
  mergedParentSpace = null,
  onAssignSuccess,
  onRequireFloorAllocation,
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingAssignment, setIsCheckingAssignment] = useState(false);
  const [assignmentCheck, setAssignmentCheck] = useState(null);
  const checkRequestIdRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setSelectedCustomerId('');
      setSearchClient('');
      setIsSaving(false);
      setIsCheckingAssignment(false);
      setAssignmentCheck(null);
      checkRequestIdRef.current += 1;
    }
  }, [open]);

  const filteredClients = useMemo(() => {
    const q = String(searchClient || '')
      .trim()
      .toLowerCase();
    if (!q) return clientsList || [];
    return (clientsList || []).filter((c) =>
      String(c?.customer_name || c?.custom_legal_name || c?.name || '')
        .toLowerCase()
        .includes(q),
    );
  }, [clientsList, searchClient]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const runAssignmentCheck = useCallback(
    async (customerId) => {
      const customer = String(customerId || '').trim();
      const center = String(centerId || '').trim();
      const floorId = String(blockFloorId || '').trim();
      const space = String(spaceId || '').trim();
      if (!customer || !center || !floorId || !space) {
        setAssignmentCheck(null);
        return;
      }

      const requestId = checkRequestIdRef.current + 1;
      checkRequestIdRef.current = requestId;
      setIsCheckingAssignment(true);
      setAssignmentCheck(null);

      try {
        const result = await getCheckClientCenterFloorAssignment({
          customer,
          center,
          block_floor_id: floorId,
          space_id: space,
        });
        if (checkRequestIdRef.current !== requestId) return;
        setAssignmentCheck(result);
      } catch (error) {
        if (checkRequestIdRef.current !== requestId) return;
        setAssignmentCheck(null);
        showErrorToast(error, {
          defaultMessage: 'Could not verify client assignment on this floor.',
        });
      } finally {
        if (checkRequestIdRef.current === requestId) {
          setIsCheckingAssignment(false);
        }
      }
    },
    [centerId, blockFloorId, spaceId],
  );

  const handleClientChange = useCallback(
    (value) => {
      setSelectedCustomerId(value);
      setAssignmentCheck(null);
      if (value) {
        void runAssignmentCheck(value);
      }
    },
    [runAssignmentCheck],
  );

  const handleContinueForNewAssignment = useCallback(() => {
    const customer = String(selectedCustomerId || '').trim();
    if (!customer) {
      showErrorToast(new Error('Please select a client.'));
      return;
    }
    if (assignmentCheck?.exists) return;
    onRequireFloorAllocation?.({
      customerId: customer,
      assignmentCheck,
    });
  }, [selectedCustomerId, assignmentCheck, onRequireFloorAllocation]);

  const handleSaveMarker = useCallback(async () => {
    const customer = String(selectedCustomerId || '').trim();
    const center = String(centerId || '').trim();
    const sid = String(spaceId || '').trim();
    const ssid = String(subSpaceId || '').trim();
    if (!customer) {
      showErrorToast(new Error('Please select a client.'));
      return;
    }
    if (!assignmentCheck?.exists) {
      showErrorToast(new Error('Complete space allocation before saving this marker.'));
      return;
    }
    if (!center || !sid || !ssid || !marker) {
      showErrorToast(new Error('Missing layout context. Reload the page and try again.'));
      return;
    }
    setIsSaving(true);
    try {
      const body = buildLayoutCoworkerSubSpaceAssignPayload({
        customerId: customer,
        spaceId: sid,
        subSpaceId: ssid,
        centerId: center,
        normalizedX: marker.x,
        normalizedY: marker.y,
      });
      await postSaveClientCoworkingLayoutMarker(body);
      showSuccessToast('Co-working marker saved.');
      await onAssignSuccess?.();
      handleOpenChange(false);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to save co-working marker.' });
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedCustomerId,
    assignmentCheck,
    centerId,
    spaceId,
    subSpaceId,
    marker,
    onAssignSuccess,
    handleOpenChange,
  ]);

  const hasExistingAssignment = Boolean(assignmentCheck?.exists);
  const needsFloorAllocation =
    Boolean(selectedCustomerId) && assignmentCheck && !assignmentCheck.exists;
  const assignment = assignmentCheck?.assignment;
  const assignmentSummary = assignment
    ? [
        assignment.customer_name,
        assignment.space_name,
        assignment.assigned_seats != null ? `${assignment.assigned_seats} seats` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const canSaveExisting =
    Boolean(selectedCustomerId) && hasExistingAssignment && !isCheckingAssignment && !isSaving;
  const canContinueAllocate =
    Boolean(selectedCustomerId) && needsFloorAllocation && !isCheckingAssignment && !isSaving;

  const contextLine = [spaceLabel, subSpaceLabel].filter(Boolean).join(' · ');

  const layoutAvailableSeats = Number(
    mergedParentSpace?.available_seats ?? mergedParentSpace?.availableSeats ?? 0,
  );
  const layoutTotalSeats = Number(
    mergedParentSpace?.total_seats ?? mergedParentSpace?.totalSeats ?? 0,
  );
  const seatsAvailabilityLine =
    layoutAvailableSeats > 0
      ? layoutTotalSeats > 0 && layoutTotalSeats !== layoutAvailableSeats
        ? `${layoutAvailableSeats} of ${layoutTotalSeats} seats available on this space`
        : `${layoutAvailableSeats} seat(s) available on this space`
      : '';

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[440px]'>
        <Modal.Header icon={RiUserAddLine} title='Mark co-worker' description='Select a client' />
        <Modal.Body className='flex flex-col gap-4 pt-1'>
          {seatsAvailabilityLine ? (
            <div className='flex items-center gap-2 rounded-xl bg-bg-weak-50 px-3 py-2 mt-2 text-paragraph-xs text-text-sub-600'>
              <RiInformationLine
                className='mt-0.5 shrink-0 text-primary-base'
                size={16}
                aria-hidden
              />
              <span>{seatsAvailabilityLine}.</span>
            </div>
          ) : null}

          <div className='flex flex-col gap-1.5'>
            <Label.Root>
              Client <Label.Asterisk className='text-error-base' />
            </Label.Root>
            <Select.Root
              value={selectedCustomerId}
              onValueChange={handleClientChange}
              disabled={isSaving}
            >
              <Select.Trigger className='w-full'>
                <Select.Value placeholder='Select client' />
              </Select.Trigger>
              <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                <div className='px-2 py-2'>
                  <Input.Root size='small'>
                    <Input.Wrapper>
                      <Input.Icon as={RiSearchLine} />
                      <Input.Input
                        placeholder='Search...'
                        value={searchClient}
                        onChange={(e) => setSearchClient(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <Select.Item key={client.name} value={client.name}>
                      {clientDisplayName(client)}
                    </Select.Item>
                  ))
                ) : (
                  <div className='px-3 py-2 text-paragraph-sm text-text-sub-500'>
                    No clients available
                  </div>
                )}
              </Select.Content>
            </Select.Root>
          </div>

          {isCheckingAssignment ? (
            <p className='text-paragraph-xs text-text-sub-500'>Checking floor assignment…</p>
          ) : null}

          {hasExistingAssignment && assignmentSummary ? (
            <div className='flex items-start gap-2 rounded-xl bg-success-lighter px-3 py-2 text-paragraph-xs text-text-sub-600'>
              <RiInformationLine
                className='mt-0.5 shrink-0 text-success-base'
                size={16}
                aria-hidden
              />
              <span>
                This client is already assigned on this floor ({assignmentSummary}). Save to place
                the marker on the layout.
              </span>
            </div>
          ) : null}

          {needsFloorAllocation ? (
            <div className='flex items-start gap-2 rounded-xl bg-warning-light px-3 py-2 text-paragraph-xs text-text-sub-600'>
              <RiInformationLine
                className='mt-0.5 shrink-0 text-warning-base'
                size={16}
                aria-hidden
              />
              <span>
                This client is not assigned on this floor yet.
                {seatsAvailabilityLine ? ` ${seatsAvailabilityLine}.` : ''} Continue to add seats,
                credits, and lease details.
              </span>
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
            disabled={isSaving}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button.Root>
          {canContinueAllocate ? (
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              className='w-full'
              onClick={handleContinueForNewAssignment}
            >
              Continue to allocate
            </Button.Root>
          ) : (
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              className='w-full'
              disabled={!canSaveExisting}
              onClick={() => void handleSaveMarker()}
            >
              {isSaving ? 'Saving…' : 'Save marker'}
            </Button.Root>
          )}
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
