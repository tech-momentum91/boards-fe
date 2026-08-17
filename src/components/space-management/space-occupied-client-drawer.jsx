import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiErrorWarningFill,
  RiMailLine,
  RiPencilLine,
  RiPhoneLine,
  RiTimeLine,
} from 'react-icons/ri';

import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import * as Input from '@/components/ui/input';
import { showSuccessToast, showErrorToast } from '@/utils/error-utils';
import { format } from 'date-fns';
import {
  getSpaceStatusBadge,
  OCCUPANCY_STATUS_OPTIONS,
} from '@/components/space-management/constants';
import {
  fetchAssignedSpaceDetail,
  selectAssignedSpaceDetail,
  updateAssignedSpace,
  updateSpaceField,
  fetchSpaceDetail,
} from '@/redux/spaceSlice';
import { postUpdateClientSpaceStatus } from '@/api/clientSpaceLayout';
import { Datepicker } from '@/components/ui/datepicker';
import { isLayoutCoworkingDeskMarkerType } from '@/utils/layout-coworking-inventory-type';
import AllocatedSpaceModal from '@/components/space-management/allocate-space-modal';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';

const STATUS_CONFIRMATION_REQUIRED = new Set(['On Notice', 'Left']);

const getStatusChangeConfirmation = (newStatus) => {
  if (newStatus === 'On Notice') {
    return {
      title: 'Change status to On Notice?',
      description:
        'This will mark the client as on notice. The lease end date will be treated as the final end date.',
      note: 'You can edit the lease end date after updating if needed.',
      confirmLabel: 'Update status',
      loadingLabel: 'Updating...',
    };
  }

  if (newStatus === 'Left') {
    return {
      title: 'Mark client as Left?',
      description: "This will release the client's allocation from this space.",
      confirmLabel: 'Mark as Left',
      loadingLabel: 'Updating...',
    };
  }

  return null;
};

const Section = ({ title, icon: Icon, children }) => {
  return (
    <div className='border-t border-stroke-soft-200 py-4'>
      <div className='flex items-center gap-1.5 px-1.5 mb-2'>
        {Icon ? <Icon size={20} fill='#868C98' /> : null}
        <div className='label-medium opacity-72  font-medium'>{title}</div>
      </div>
      {children}
    </div>
  );
};

const TwoColGrid = ({ children }) => (
  <div className='grid grid-cols-2 gap-x-10 gap-y-2'>{children}</div>
);

const KeyValue = ({ label, children }) => (
  <div className='flex flex-col gap-1.5 px-1.5'>
    <div className='paragraph-small text-text-sub-500 opacity-72'>{label}</div>
    <div className='text-paragraph-sm text-text-strong-950 min-h-[28px] flex items-center'>
      {children}
    </div>
  </div>
);

const getStatusUpdateSuccessMessage = (newStatus) => {
  if (newStatus === 'On Notice') {
    return 'Status updated successfully. This lease end date will be considered as the final end date. Edit if needed.';
  }
  return 'Status updated successfully.';
};

/** Compare YYYY-MM-DD strings (lexicographic order matches chronological). */
const isEndDateBeforeStartDate = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return endDate < startDate;
};

const InlineEditableStatus = ({ value, onChange, disabled, assignSpaceId, onStatusUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const badge = getSpaceStatusBadge(value);

  const handleStatusChange = async (newStatus) => {
    if (!assignSpaceId || newStatus === value) {
      setEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      // Call the update handler which will dispatch the thunk and refetch data
      await onStatusUpdate?.(assignSpaceId, newStatus);
      setEditing(false);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to update status. Please try again.' });
    } finally {
      setIsUpdating(false);
    }
  };

  if (editing && !disabled) {
    return (
      <Select.Root
        value={String(value || '')}
        onValueChange={handleStatusChange}
        disabled={isUpdating}
      >
        <Select.Trigger className='w-full max-w-[220px]'>
          <Select.Value placeholder='Select status' />
        </Select.Trigger>
        <Select.Content className='z-[100] min-w-[220px]'>
          {OCCUPANCY_STATUS_OPTIONS.map((opt) => (
            <Select.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    );
  }

  return (
    <div className='flex items-center gap-2'>
      <Badge.Root size='small' variant='light' color={badge.color}>
        {badge.label}
      </Badge.Root>
      {disabled || isUpdating ? null : (
        <Button.Root
          type='button'
          variant='neutral'
          mode='ghost'
          size='xsmall'
          aria-label='Edit status'
          onClick={() => setEditing(true)}
        >
          <RiPencilLine className='size-4 text-text-sub-600' />
        </Button.Root>
      )}
    </div>
  );
};

/**
 * Drawer shown when clicking an occupied client row inside Space Occupancy History.
 * Matches the provided UI reference (right-side drawer, with inline-editable status).
 */
const SpaceOccupiedClientDrawer = ({
  open,
  onOpenChange,
  rows = [],
  selectedIndex = 0,
  onSelectedIndexChange,
  onUpdateRow,
  spaceData = null,
  clientsList = [],
}) => {
  const dispatch = useDispatch();
  const assignedSpaceDetail = useSelector(selectAssignedSpaceDetail);
  const row = rows?.[selectedIndex] ?? null;
  const [isReducingSeats, setIsReducingSeats] = useState(false);
  const canPrevious = selectedIndex > 0;
  const canNext = selectedIndex < rows.length - 1;

  // Fetch detailed Assign Space data when drawer opens or selected row changes
  useEffect(() => {
    if (open && row?.assign_space_id) {
      dispatch(fetchAssignedSpaceDetail(row.assign_space_id));
    }
  }, [dispatch, open, row?.assign_space_id, selectedIndex]);

  // Handle status update: update via API, then refetch detail and listview
  const handleStatusUpdate = useCallback(
    async (assignSpaceId, newStatus) => {
      // Get current detail data to check space information before update
      const currentDetailData = assignedSpaceDetail.data || {};
      const spaceId = currentDetailData.space_id;
      const inventoryType = currentDetailData.inventory_type || '';
      const coworkingSpaceType = currentDetailData.coworking_space_type || '';
      const clientId = String(
        currentDetailData.customer ?? currentDetailData.customer_id ?? row?.customer ?? '',
      ).trim();

      if (newStatus === 'Left') {
        if (!clientId || !spaceId) {
          throw new Error('Missing client or space information.');
        }

        await postUpdateClientSpaceStatus({
          client_id: clientId,
          status: newStatus,
          space_id: spaceId,
        });
      } else {
        const fields = { status: newStatus };

        const updateResult = await dispatch(
          updateAssignedSpace({
            assignSpaceId,
            fields,
          }),
        );

        if (updateAssignedSpace.rejected.match(updateResult)) {
          throw updateResult.payload || updateResult.error;
        }
      }

      const detailResult = await dispatch(fetchAssignedSpaceDetail(assignSpaceId));
      if (fetchAssignedSpaceDetail.rejected.match(detailResult)) {
        throw detailResult.payload || detailResult.error;
      }

      const latestDetailData = detailResult.payload || {};

      // Check conditions:
      // 1. Space type is "Managed Office" OR
      // 2. Space type is "Co-working Space" AND sub-type is "Manager Cabin" or "Private Cabin"
      const shouldUpdateSpaceStatus =
        inventoryType === 'Managed Office' ||
        (inventoryType === 'Co-working Space' &&
          (coworkingSpaceType === 'Manager Cabin' || coworkingSpaceType === 'Private Cabin'));

      if (shouldUpdateSpaceStatus) {
        // If status changed to "Left", check if we need to update space status to "Available"
        if (newStatus === 'Left' && spaceId) {
          // Update space status to "Available"
          const spaceUpdateResult = await dispatch(
            updateSpaceField({
              spaceId,
              fieldname: 'status',
              value: 'Available',
            }),
          );

          if (updateSpaceField.rejected.match(spaceUpdateResult)) {
            // Log error but don't throw - client status update was successful
            console.error('Failed to update space status:', spaceUpdateResult.payload);
            showErrorToast('Failed to update space status. Please try again.');
          }
        } else {
          if (newStatus === 'Occupied' && spaceId) {
            const spaceUpdateResult = await dispatch(
              updateSpaceField({
                spaceId,
                fieldname: 'status',
                value: 'Occupied',
              }),
            );
            if (updateSpaceField.rejected.match(spaceUpdateResult)) {
              // Log error but don't throw - client status update was successful
              console.error('Failed to update space status:', spaceUpdateResult.payload);
              showErrorToast('Failed to update space status. Please try again.');
            }
          }
        }
      }

      await dispatch(fetchSpaceDetail(spaceId));
      // Trigger parent to refetch listview (which will update the table)
      if (onUpdateRow) {
        await onUpdateRow(selectedIndex, {
          status: newStatus,
          ...(newStatus === 'Left' && {
            end_date: latestDetailData.end_date,
            lease_end_date: latestDetailData.end_date,
          }),
        });
      }

      showSuccessToast(getStatusUpdateSuccessMessage(newStatus));
    },
    [dispatch, onUpdateRow, selectedIndex, assignedSpaceDetail.data, row?.customer],
  );

  // Use real-time API data if available, otherwise fallback to row data
  const detailData = assignedSpaceDetail.data || {};
  const { isLoading } = assignedSpaceDetail;

  // Get assign_space_id from detail data or row
  const assignSpaceId = detailData.name || row?.assign_space_id || null;

  // Helper to format dates
  const formatDate = (dateString) => {
    if (!dateString || dateString === '--') return '--';
    try {
      // Handle both "2026-01-20" and "20th Jan, 2026" formats
      if (dateString.includes(',')) {
        return dateString; // Already formatted
      }
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return dateString;
      return format(date, 'do MMM, yyyy'); // e.g., "20th Jan, 2026"
    } catch {
      return dateString;
    }
  };

  // Helper to format numbers (for prices, seats, etc.)
  const formatNumber = (value) => {
    if (value === null || value === undefined || value === '--') return '--';
    const number_ = Number(value);
    if (Number.isNaN(number_)) return value;
    // Format with commas for thousands
    return number_.toLocaleString('en-IN');
  };

  // Map API response fields to display fields
  const title = detailData.customer_name || detailData.customer || row?.client_name || '--';
  const phone = detailData.phone || row?.phone || '--';
  const email = detailData.email || row?.email || '--';
  const status = detailData.status || row?.status || null;
  const leaseStartDate = formatDate(detailData.start_date || row?.lease_start_date);
  const leaseEndDate = formatDate(detailData.end_date || row?.lease_end_date);
  // State for which field is being edited
  const [editingField, setEditingField] = useState(null); // 'status' | 'seats' | 'credit' | 'price' | 'note' | null

  // State for pending values while editing
  const [pendingStatus, setPendingStatus] = useState(status || '');
  const [pendingCredit, setPendingCredit] = useState(
    detailData.credit_per_seat ?? row?.credit_per_seat ?? '',
  );
  const [pendingPrice, setPendingPrice] = useState(
    detailData.expected_per_seat_rate ?? row?.price_per_seat ?? '',
  );
  const [pendingNote, setPendingNote] = useState(
    detailData.notes ||
      row?.note ||
      "Ensure the selected space matches the client's contract and seat count.",
  );
  const [pendingStartDate, setPendingStartDate] = useState(
    detailData.start_date ?? row?.lease_start_date ?? null,
  );
  const [pendingEndDate, setPendingEndDate] = useState(
    detailData.end_date ?? row?.lease_end_date ?? null,
  );
  const [pendingSeats, setPendingSeats] = useState(detailData.assigned_seats ?? row?.seats ?? '');
  const [isSavingSeats, setIsSavingSeats] = useState(false);
  const [seatReductionContext, setSeatReductionContext] = useState(null);
  const [statusConfirmContext, setStatusConfirmContext] = useState(null);
  const [isStatusConfirmLoading, setIsStatusConfirmLoading] = useState(false);

  const inventoryType = detailData.inventory_type ?? row?.inventory_type ?? '';
  const coworkingSpaceType = detailData.coworking_space_type ?? row?.coworking_space_type ?? '';
  const canEditSeats =
    status === 'Occupied' &&
    inventoryType === 'Co-working Space' &&
    isLayoutCoworkingDeskMarkerType(coworkingSpaceType);
  const savedSeats = Number(detailData.assigned_seats ?? row?.seats) || 0;
  const seatsExceedsSaved =
    canEditSeats && pendingSeats !== '' && Number(pendingSeats) > savedSeats;
  const seatsDirty = canEditSeats && pendingSeats !== '' && Number(pendingSeats) !== savedSeats;

  const statusChangeConfirmation = statusConfirmContext
    ? getStatusChangeConfirmation(statusConfirmContext.newStatus)
    : null;

  const handleConfirmedStatusChange = useCallback(async () => {
    if (!statusConfirmContext || !assignSpaceId) return;

    const { newStatus, previousStatus } = statusConfirmContext;
    setIsStatusConfirmLoading(true);
    setPendingStatus(newStatus);

    try {
      await handleStatusUpdate(assignSpaceId, newStatus);
      setStatusConfirmContext(null);
    } catch (error) {
      setPendingStatus(previousStatus);
      showErrorToast(error, {
        defaultMessage: 'Failed to update status. Please try again.',
      });
    } finally {
      setIsStatusConfirmLoading(false);
    }
  }, [assignSpaceId, handleStatusUpdate, statusConfirmContext]);

  // Update pending values when detailData or row changes
  useEffect(() => {
    setPendingStatus(status || '');
  }, [status]);
  useEffect(() => {
    setPendingCredit(detailData.credit_per_seat ?? row?.credit_per_seat ?? '');
  }, [detailData.credit_per_seat, row?.credit_per_seat]);
  useEffect(() => {
    setPendingPrice(detailData.expected_per_seat_rate ?? row?.price_per_seat ?? '');
  }, [detailData.expected_per_seat_rate, row?.price_per_seat]);
  useEffect(() => {
    setPendingNote(
      detailData.notes ||
        row?.note ||
        "Ensure the selected space matches the client's contract and seat count.",
    );
  }, [detailData.notes, row?.note]);

  // Update pending values when detailData or row changes
  useEffect(() => {
    setPendingStartDate(detailData.start_date ?? row?.lease_start_date ?? null);
  }, [detailData.start_date, row?.lease_start_date]);

  useEffect(() => {
    setPendingEndDate(detailData.end_date ?? row?.lease_end_date ?? null);
  }, [detailData.end_date, row?.lease_end_date]);

  useEffect(() => {
    setPendingSeats(detailData.assigned_seats ?? row?.seats ?? '');
  }, [detailData.assigned_seats, row?.seats]);

  const rawSeats = Number(seatsDirty && !seatsExceedsSaved ? pendingSeats : savedSeats) || 0;
  const rawPrice =
    Number(pendingPrice) || Number(detailData.expected_per_seat_rate ?? row?.price_per_seat) || 0;

  const today = new Date();
  const rawStartDate = detailData.start_date
    ? new Date(detailData.start_date)
    : row?.lease_start_date
      ? new Date(row.lease_start_date)
      : null;

  const rawEndDate = detailData.end_date
    ? new Date(detailData.end_date)
    : row?.lease_end_date
      ? new Date(row.lease_end_date)
      : null;

  const isWithinLeasePeriod =
    rawStartDate &&
    rawEndDate &&
    !Number.isNaN(rawStartDate.getTime()) &&
    !Number.isNaN(rawEndDate.getTime()) &&
    today >= rawStartDate &&
    today <= rawEndDate;

  const handleFieldUpdate = async (field, value) => {
    if (!assignSpaceId) return;

    const fieldMap = {
      credit: 'credit_per_seat',
      price: 'expected_per_seat_rate',
      note: 'notes',
      start_date: 'start_date',
      end_date: 'end_date',
    };

    try {
      const result = await dispatch(
        updateAssignedSpace({
          assignSpaceId,
          fields: { [fieldMap[field]]: value },
        }),
      );

      if (updateAssignedSpace.rejected.match(result)) {
        showErrorToast('Update failed');
        return;
      }

      await dispatch(fetchAssignedSpaceDetail(assignSpaceId));

      if (onUpdateRow) {
        await onUpdateRow(selectedIndex, { [fieldMap[field]]: value });
      }
    } catch (error) {
      showErrorToast(error?.message || 'Update failed');
    }
  };

  const handleSeatsUpdate = async () => {
    setIsReducingSeats(true);
    if (!assignSpaceId || !canEditSeats || !seatsDirty) return;
    const seats = Number(pendingSeats);
    if (!seats || seats < 1 || seats > savedSeats) {
      setPendingSeats(String(savedSeats));
      return;
    }

    const isOccupiedSeatReduction = status === 'Occupied' && seats < savedSeats;
    if (isOccupiedSeatReduction) {
      if (!spaceData?.id) {
        showErrorToast('Space data is not available. Please try again.');
        return;
      }
      setSeatReductionContext({
        assignSpaceId,
        originalAssignedSeats: savedSeats,
        updatedAssignedSeats: seats,
        customerId: detailData.customer || row?.customer || row?._original?.customer,
        startDate: detailData.start_date ?? row?.lease_start_date ?? '',
        endDate: detailData.end_date ?? row?.lease_end_date ?? '',
        expectedPerSeatRate: rawPrice,
        creditPerSeat:
          Number(pendingCredit) || Number(detailData.credit_per_seat ?? row?.credit_per_seat) || 0,
        notes: pendingNote,
        assign_sub_spaces: detailData.assign_sub_spaces ?? row?.assign_sub_spaces ?? [],
      });
      return;
    }

    setIsSavingSeats(true);
    try {
      const result = await dispatch(
        updateAssignedSpace({
          assignSpaceId,
          fields: { assigned_seats: seats, total_rate: seats * rawPrice },
        }),
      );

      if (updateAssignedSpace.rejected.match(result)) {
        showErrorToast('Update failed');
        setPendingSeats(String(savedSeats));
        return;
      }

      showSuccessToast('Seats updated successfully.');
      await dispatch(fetchAssignedSpaceDetail(assignSpaceId));
      if (onUpdateRow) {
        await onUpdateRow(selectedIndex, {
          assigned_seats: seats,
          total_price: seats * rawPrice,
        });
      }
    } catch (error) {
      setPendingSeats(String(savedSeats));
      showErrorToast(error?.message || 'Update failed');
    } finally {
      setIsSavingSeats(false);
    }
  };

  const totalPrice = formatNumber(
    seatsDirty ? rawSeats * rawPrice : (detailData.total_rate ?? row?.total_price),
  );
  const note =
    detailData.notes ||
    row?.note ||
    "Ensure the selected space matches the client's contract and seat count.";

  const infoText = useMemo(() => {
    const credit =
      Number(pendingCredit) || Number(detailData.credit_per_seat ?? row?.credit_per_seat) || 0;
    const total = seatsDirty
      ? rawSeats * credit
      : (detailData.total_credits ??
        row?.total_credits ??
        row?.totalCredits ??
        row?.totalCreditsTotal ??
        null);
    if (!total && total !== 0) return null;
    const formattedTotal = typeof total === 'number' ? total.toLocaleString('en-IN') : total;
    return `The client has received a total of ${formattedTotal} credits.`;
  }, [
    seatsDirty,
    rawSeats,
    pendingCredit,
    detailData.total_credits,
    detailData.credit_per_seat,
    row,
  ]);

  const noteRef = React.useRef(null);

  useEffect(() => {
    if (noteRef.current) {
      noteRef.current.style.height = 'auto';
      noteRef.current.style.height = `${noteRef.current.scrollHeight}px`;
    }
  }, [pendingNote]);

  return (
    <>
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Content className='max-w-[560px]'>
          {/* Top controls */}
          <Drawer.Header className='px-6 py-3 items-center' showCloseButton={false}>
            <div className='flex items-center  justify-between gap-2 w-full'>
              <div className='flex w-full items-center '>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  aria-label='Previous client'
                  disabled={!canPrevious}
                  onClick={() => canPrevious && onSelectedIndexChange?.(selectedIndex - 1)}
                >
                  <Button.Icon as={RiArrowLeftSLine} />
                </Button.Root>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  aria-label='Next client'
                  disabled={!canNext}
                  onClick={() => canNext && onSelectedIndexChange?.(selectedIndex + 1)}
                >
                  <Button.Icon as={RiArrowRightSLine} />
                </Button.Root>
              </div>
              <Drawer.Close asChild>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  aria-label='Close'
                >
                  <Button.Icon as={RiCloseLine} />
                </Button.Root>
              </Drawer.Close>
            </div>
          </Drawer.Header>

          <Drawer.Body className='p-0'>
            <div className='px-6 pt-5'>
              <div className='pb-5 px-1.5'>
                <div className='title-h5 text-text-main-900'>{title}</div>
                <div className='mt-1 flex flex-wrap label-small opacity-72 items-center gap-2 '>
                  <span className='inline-flex items-center gap-1'>
                    <RiPhoneLine className='size-4' />
                    {phone}
                  </span>
                  <span className='text-text-soft-400 items-center'>•</span>
                  <span className='inline-flex items-center gap-1'>
                    <RiMailLine className='size-4' />
                    {email}
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className='py-8 text-center text-paragraph-sm text-text-sub-600'>
                  Loading client details...
                </div>
              ) : (
                <>
                  <Section title='Basic Details' icon={RiTimeLine}>
                    <TwoColGrid>
                      {/* Status Field */}
                      <div className='flex flex-col gap-1 px-1.5'>
                        <div className='paragraph-small text-text-sub-500 opacity-72'>Status</div>
                        <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                          <Select.Root
                            variant='borderless'
                            value={pendingStatus}
                            onValueChange={async (value) => {
                              if (value === status) return;
                              const previousStatus = status || '';

                              if (STATUS_CONFIRMATION_REQUIRED.has(value)) {
                                setStatusConfirmContext({ newStatus: value, previousStatus });
                                return;
                              }

                              setPendingStatus(value);
                              try {
                                await handleStatusUpdate(assignSpaceId, value);
                              } catch (error) {
                                setPendingStatus(previousStatus);
                                showErrorToast(error, {
                                  defaultMessage: 'Failed to update status. Please try again.',
                                });
                              }
                            }}
                            size='xsmall'
                          >
                            <Select.Trigger className='w-full -ml-2' showArrow={false}>
                              <Select.Value placeholder='Select status' asChild>
                                <Badge.Root
                                  size='small'
                                  variant='light'
                                  color={getSpaceStatusBadge(pendingStatus)?.color || 'gray'}
                                  className='text-nowrap'
                                >
                                  {pendingStatus || '--'}
                                </Badge.Root>
                              </Select.Value>
                            </Select.Trigger>
                            <Select.Content className='z-[100] min-w-[220px]'>
                              {OCCUPANCY_STATUS_OPTIONS.map((opt) => (
                                <Select.Item key={opt.value} value={opt.value}>
                                  {opt.label}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        </EditableFieldWrapper>
                      </div>
                      <div className='flex flex-col gap-1 px-1.5'>
                        <div className='paragraph-small text-text-sub-500 opacity-72'>
                          Lease Start Date
                        </div>

                        {isWithinLeasePeriod ? (
                          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                            <Datepicker
                              value={pendingStartDate ? new Date(pendingStartDate) : null}
                              onChange={async (date) => {
                                // console.log('Datepicker onChange fired:', date);
                                if (!date || !assignSpaceId) return;

                                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                if (formattedDate === pendingStartDate) return;
                                setPendingStartDate(formattedDate);
                                const updatedFields = {
                                  start_date: formattedDate,
                                };
                                try {
                                  const result = await dispatch(
                                    updateAssignedSpace({
                                      assignSpaceId,
                                      fields: updatedFields,
                                    }),
                                  );
                                  if (updateAssignedSpace.rejected.match(result)) {
                                    showErrorToast('Failed to update start date');
                                    return;
                                  }
                                  await dispatch(fetchAssignedSpaceDetail(assignSpaceId));
                                  if (onUpdateRow)
                                    await onUpdateRow(selectedIndex, { start_date: formattedDate });
                                } catch (error) {
                                  showErrorToast(error?.message || 'Update failed');
                                }
                              }}
                            />
                          </EditableFieldWrapper>
                        ) : (
                          <div className='text-paragraph-sm text-text-strong-950 min-h-[28px] flex items-center'>
                            {leaseStartDate}
                          </div>
                        )}
                      </div>

                      <div className='flex flex-col gap-1 px-1.5'>
                        <div className='paragraph-small text-text-sub-500 opacity-72'>
                          Lease End Date
                        </div>

                        {isWithinLeasePeriod ? (
                          <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                            <Datepicker
                              value={pendingEndDate ? new Date(pendingEndDate) : null}
                              min={pendingStartDate ? new Date(pendingStartDate) : undefined}
                              onChange={async (date) => {
                                if (!date || !assignSpaceId) return;

                                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                if (formattedDate === pendingEndDate) return;

                                if (isEndDateBeforeStartDate(pendingStartDate, formattedDate)) {
                                  showErrorToast('End date must be on/after start date.');
                                  return;
                                }

                                setPendingEndDate(formattedDate);

                                const updatedFields = {
                                  end_date: formattedDate,
                                };

                                try {
                                  const result = await dispatch(
                                    updateAssignedSpace({
                                      assignSpaceId,
                                      fields: updatedFields,
                                    }),
                                  );
                                  if (updateAssignedSpace.rejected.match(result)) {
                                    setPendingEndDate(
                                      detailData.end_date ?? row?.lease_end_date ?? null,
                                    );
                                    showErrorToast('Failed to update end date');
                                    return;
                                  }
                                  await dispatch(fetchAssignedSpaceDetail(assignSpaceId));
                                  if (onUpdateRow)
                                    await onUpdateRow(selectedIndex, { end_date: formattedDate });
                                } catch (error) {
                                  setPendingEndDate(
                                    detailData.end_date ?? row?.lease_end_date ?? null,
                                  );
                                  showErrorToast(error?.message || 'Update failed');
                                }
                              }}
                            />
                          </EditableFieldWrapper>
                        ) : (
                          <div className='text-paragraph-sm text-text-strong-950 min-h-[28px] flex items-center'>
                            {leaseEndDate}
                          </div>
                        )}
                      </div>
                    </TwoColGrid>
                  </Section>

                  <Section title='Seats & Credits Details'>
                    <TwoColGrid>
                      {/* Seats Field */}
                      {canEditSeats ? (
                        <div className='flex flex-col gap-1 px-1.5'>
                          <div className='paragraph-small text-text-sub-500 opacity-72'>Seats</div>
                          <div className='flex items-center gap-2'>
                            <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='-ml-2 flex-1'
                                hasError={seatsExceedsSaved}
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    type='numeric'
                                    value={pendingSeats}
                                    min={1}
                                    max={savedSeats}
                                    disabled={isSavingSeats}
                                    onChange={(e) => setPendingSeats(e.target.value)}
                                    className='w-full text-paragraph-sm text-text-strong-950 bg-transparent'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </EditableFieldWrapper>
                            {seatsDirty && !seatsExceedsSaved ? (
                              <Button.Root
                                type='button'
                                variant='primary'
                                mode='filled'
                                size='xsmall'
                                disabled={isSavingSeats || Number(pendingSeats) < 1}
                                onClick={handleSeatsUpdate}
                              >
                                {isSavingSeats ? 'Saving…' : 'Save'}
                              </Button.Root>
                            ) : null}
                          </div>
                          {seatsExceedsSaved ? (
                            <div className='flex items-center gap-1 text-paragraph-xs text-error-base'>
                              <RiErrorWarningFill className='size-4 shrink-0' aria-hidden />
                              <span>
                                Seats cannot exceed the current value ({formatNumber(savedSeats)}).
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <KeyValue label='Seats'>{formatNumber(savedSeats)}</KeyValue>
                      )}
                      {/* Credit Per Seat Field */}
                      <div className='flex flex-col gap-1 px-1.5'>
                        <div className='paragraph-small text-text-sub-500 opacity-72'>
                          Credit Per Seat
                        </div>
                        <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                          <Input.Root variant='borderless' size='xsmall' className='-ml-2 w-full'>
                            <Input.Wrapper>
                              <Input.Input
                                type='numeric'
                                value={pendingCredit}
                                onChange={(e) => setPendingCredit(e.target.value)}
                                onBlur={async (e) => {
                                  await handleFieldUpdate('credit', Number(e.target.value));
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    await handleFieldUpdate('credit', Number(pendingCredit));
                                  }
                                }}
                                className='w-full text-paragraph-sm text-text-strong-950 bg-transparent'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </EditableFieldWrapper>
                      </div>
                    </TwoColGrid>
                    {infoText ? (
                      <div className='mt-4 rounded-lg bg-[#C2D6FF] px-3 py-2 text-label-sm text-[#162664] flex items-center gap-2'>
                        <RiErrorWarningFill color='#162664' size={16} />
                        <span>{infoText}</span>
                      </div>
                    ) : null}
                  </Section>

                  <Section title='Pricing Details' icon={RiTimeLine}>
                    <TwoColGrid>
                      {/* Price Per Seat Field */}
                      <div className='flex flex-col gap-1 px-1.5'>
                        <div className='paragraph-small text-text-sub-500 opacity-72'>
                          Price Per Seat
                        </div>
                        <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                          <Input.Root variant='borderless' size='xsmall' className='-ml-2 w-full'>
                            <Input.Wrapper>
                              <Input.Input
                                type='numeric'
                                value={pendingPrice}
                                onChange={(e) => setPendingPrice(e.target.value)}
                                onBlur={async (e) => {
                                  await handleFieldUpdate('price', Number(e.target.value));
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    await handleFieldUpdate('price', Number(pendingPrice));
                                  }
                                }}
                                className='w-full text-paragraph-sm text-text-strong-950 bg-transparent'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </EditableFieldWrapper>
                      </div>
                      <KeyValue label='Total Price'>{totalPrice}</KeyValue>
                    </TwoColGrid>
                  </Section>

                  <Section title='Note'>
                    <div className='flex flex-col gap-1 px-1.5'>
                      <div className='paragraph-small text-text-sub-500 opacity-72' />
                      <EditableFieldWrapper editable={true} iconClassName='mr-2'>
                        <Input.Root
                          variant='borderless'
                          size='xsmall'
                          className='-ml-2 w-full focus-within:[&]:ring-2 focus-within:[&]:ring-primary-base'
                        >
                          <Input.Wrapper className='focus-within:border-primary-base focus-within:ring-1 focus-within:ring-primary-base'>
                            <textarea
                              ref={noteRef}
                              value={pendingNote}
                              rows={4}
                              onChange={(e) => setPendingNote(e.target.value)}
                              onBlur={async (e) => {
                                await handleFieldUpdate('note', e.target.value);
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  await handleFieldUpdate('note', pendingNote);
                                }
                              }}
                              className='w-full resize-none bg-transparent outline-none text-paragraph-sm text-text-sub-600 px-1.5'
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </EditableFieldWrapper>
                    </div>
                  </Section>
                </>
              )}
            </div>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>

      <DeleteConfirmModal
        isOpen={Boolean(statusConfirmContext)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isStatusConfirmLoading) {
            setStatusConfirmContext(null);
          }
        }}
        title={statusChangeConfirmation?.title || 'Update status?'}
        description={statusChangeConfirmation?.description || ''}
        note={statusChangeConfirmation?.note}
        onConfirm={handleConfirmedStatusChange}
        isLoading={isStatusConfirmLoading}
        confirmLabel={statusChangeConfirmation?.confirmLabel || 'Confirm'}
        loadingLabel={statusChangeConfirmation?.loadingLabel || 'Updating...'}
      />

      <AllocatedSpaceModal
        isOpen={Boolean(seatReductionContext)}
        isReducingSeats={isReducingSeats}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSeatReductionContext(null);
        }}
        clientsList={clientsList}
        spaceData={spaceData}
        lockedCustomerId={seatReductionContext?.customerId}
        seatReductionContext={seatReductionContext}
        onAllocateSuccess={async () => {
          const newSeats = seatReductionContext?.updatedAssignedSeats;
          setSeatReductionContext(null);
          if (newSeats != null) setPendingSeats(String(newSeats));
          if (assignSpaceId) await dispatch(fetchAssignedSpaceDetail(assignSpaceId));
          if (onUpdateRow) {
            await onUpdateRow(selectedIndex, {
              assigned_seats: newSeats,
              total_price: newSeats * rawPrice,
            });
          }
        }}
      />
    </>
  );
};

export default SpaceOccupiedClientDrawer;
