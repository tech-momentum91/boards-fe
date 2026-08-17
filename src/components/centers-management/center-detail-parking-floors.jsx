import React, { useState, useCallback, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import * as Table from '@/components/ui/table';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Modal from '@/components/ui/modal';
import * as LinkButton from '@/components/ui/link-button';
import * as Tooltip from '@/components/ui/tooltip';
import * as Badge from '@/components/ui/badge';
import {
  RiAddLine,
  RiCheckLine,
  RiCloseLine,
  RiLayoutGridLine,
  RiPencilLine,
  RiDeleteBinLine,
  RiAlertFill,
} from 'react-icons/ri';
import { hasModulePermission } from '@/utils/user-role-utils';
import { useSelector, useDispatch } from 'react-redux';
import {
  deleteParkingSpaceThunk,
  getParkingFloorDetailsThunk,
  updateParkingSpaceThunk,
} from '@/redux/centerSlice';
import { fetchFloors } from '@/redux/ticketManagementSlice';
import { createSpace } from '@/redux/spaceSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import emptyState from '@/assets/images/empty-state.png';

const PARKING_TYPES = ['Non Stackable', 'Dual Stackable', 'Triple Stackable'];
const VEHICLE_TYPES = ['Four Wheeler', 'Four Wheeler EV', 'Two Wheeler', 'Two Wheeler EV'];
const ASSIGNMENT_TYPES = ['FCFS', 'Dedicated'];

const BLOCK_FLOOR_SEP = ' - ';

const getBlockFromFullFloor = (raw) => {
  const text = String(raw ?? '').trim();
  const idx = text.indexOf(BLOCK_FLOOR_SEP);
  return idx === -1 ? '' : text.slice(0, idx).trim();
};

const buildFloorOptions = (options) =>
  [
    ...new Set(
      (options || [])
        .map((opt) => String(opt?.value ?? opt?.label ?? opt ?? '').trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const headColumns = [
  'Floor',
  'Vehicle Type',
  'Parking Type',
  'Assignment Type',
  'Per Parking Rate',
  'Parking no.',
  '',
];

/** Parking numbers shown as badges before +N in the Parking no. column. */
const VISIBLE_PARKING_BADGE_COUNT = 2;

const parseParkingNumbers = (raw) =>
  String(raw || '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

const parkingNumbersToText = (numbers) => (Array.isArray(numbers) ? numbers.join(', ') : '');

/** FormData for `create_space` — mirrors create-new-space + parking fields (parking_no as JSON array). */
const buildParkingSpaceCreateFormData = ({
  centerId: center,
  centerName,
  block,
  floor,
  vehicle_type,
  parking_type,
  assigning_type,
  parking_numbers,
  per_parking_rate,
}) => {
  const formData = new FormData();
  formData.append('center', center);
  if (centerName) {
    formData.append('center_name', centerName);
  }
  if (block) {
    formData.append('block', block);
  }
  formData.append('floor', floor);
  formData.append('vehicle_type', vehicle_type);
  formData.append('inventory_type', 'Parking');
  formData.append('inventory_name', `Parking — ${floor}`);
  formData.append('status', 'Available');
  formData.append('parking_type', parking_type);
  if (assigning_type) {
    formData.append('assigning_type', assigning_type);
  }
  formData.append('parking_no', JSON.stringify(parking_numbers));
  formData.append('total_seats', String(parking_numbers.length));
  formData.append('expected_per_seat_rate', String(per_parking_rate ?? 0));
  return formData;
};

const PerParkingRateInput = ({ value, onChange, readOnly }) => (
  <Input.Root variant='default' size='small' className='w-full min-w-[100px]'>
    <Input.Wrapper>
      <Input.Input
        type='numeric'
        value={value ?? '0'}
        placeholder='0'
        min='0'
        readOnly={readOnly}
        onChange={(e) => {
          if (readOnly) return;
          const { value: next } = e.target;
          if (next === '' || (!Number.isNaN(next) && Number.parseFloat(next) >= 0)) {
            onChange(next);
          }
        }}
        className='text-paragraph-sm text-text-strong-950'
      />
    </Input.Wrapper>
  </Input.Root>
);

const ParkingNumbersCell = ({ numbers }) => {
  const list = Array.isArray(numbers) ? numbers : [];
  if (list.length === 0) {
    return <span className='text-text-soft-400'>—</span>;
  }

  const shown = list.slice(0, VISIBLE_PARKING_BADGE_COUNT);
  const extra = list.slice(VISIBLE_PARKING_BADGE_COUNT);
  const extraCount = extra.length;

  return (
    <div className='flex flex-wrap items-center gap-2 w-full '>
      {shown.map((num, i) => (
        <Badge.Root key={`${String(num)}-${i}`} variant='lighter' color='gray' size='medium'>
          <span className='paragraph-small font-medium text-text-strong-950'>{num}</span>
        </Badge.Root>
      ))}
      {extraCount > 0 ? (
        <Tooltip.Root delayDuration={200}>
          <Tooltip.Trigger asChild>
            <Badge.Root variant='lighter' color='gray' size='medium'>
              <span className='text-label-xs font-semibold text-text-strong-950'>
                +{extraCount}
              </span>
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content side='top' className='max-w-xs text-left' variant='light' size='small'>
            <div className='flex flex-col gap-1'>
              <span className='mb-1 text-paragraph-sm font-medium text-text-strong-950'>
                Additional parking numbers ({extraCount})
              </span>
              <div className='flex flex-col gap-1'>
                {extra.map((n, idx) => (
                  <div key={idx} className='text-paragraph-sm text-text-sub-600'>
                    {n}
                  </div>
                ))}
              </div>
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      ) : null}
    </div>
  );
};

const ParkingNumbersTextarea = ({ value, onChange, placeholder, autoFocus }) => {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <Input.Root
      variant='default'
      size='small'
      className='w-full min-w-0 focus-within:before:!ring-primary-base focus-within:!shadow-button-important-focus'
    >
      <Input.Wrapper className='min-h-5 cursor-text items-start py-1'>
        <textarea
          ref={ref}
          rows={1}
          className='w-full min-h-[16px] resize-none bg-transparent text-paragraph-sm text-text-strong-950 placeholder:text-text-soft-400 placeholder:select-none outline-none focus:outline-none focus:ring-0 leading-snug'
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            const el = e.target;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
          }}
          autoFocus={autoFocus}
        />
      </Input.Wrapper>
    </Input.Root>
  );
};

const TypeSelectCell = ({ value, onChange, placeholder, options }) => (
  <Select.Root
    size='small'
    variant='borderless'
    value={value || undefined}
    onValueChange={onChange}
  >
    <Select.Trigger className='w-full min-w-[140px] h-auto min-h-8 py-1' showArrow={true}>
      <Select.Value placeholder={placeholder} />
    </Select.Trigger>
    <Select.Content className='min-w-[var(--radix-select-trigger-width)] w-max'>
      {(options || []).map((opt) => (
        <Select.Item key={opt} value={opt}>
          <span className='whitespace-nowrap'>{opt}</span>
        </Select.Item>
      ))}
    </Select.Content>
  </Select.Root>
);

const CenterDetailParkingFloors = () => {
  const dispatch = useDispatch();
  const { data: centerDetails } = useSelector((state) => state.center.centerDetails);
  const {
    data: parkingFloorsFromApi,
    isLoading,
    centerId: parkingDataCenterId,
  } = useSelector((state) => state.center.parkingFloors);
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canWrite = hasModulePermission(userSideBarPerm, 'Center', 'write');

  const centerId = centerDetails?.name;

  const [bodyRows, setBodyRows] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [isDeletingParking, setIsDeletingParking] = useState(false);
  const [savingParkingRowId, setSavingParkingRowId] = useState(null);
  const [floorOptions, setFloorOptions] = useState([]);

  useEffect(() => {
    setBodyRows([]);
    setEditingRow(null);
    setFloorOptions([]);
  }, [centerId]);

  useEffect(() => {
    if (!centerId) return;
    dispatch(getParkingFloorDetailsThunk(centerId))
      .unwrap()
      .catch((error) => {
        showErrorToast(typeof error === 'string' ? error : extractErrorMessage(error));
      });
  }, [centerId, dispatch]);

  useEffect(() => {
    if (!centerId) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await dispatch(fetchFloors({ center: centerId, has_parking: 1 })).unwrap();
        if (cancelled) return;
        setFloorOptions(buildFloorOptions(result?.options));
      } catch (error) {
        if (!cancelled) {
          setFloorOptions([]);
          showErrorToast(typeof error === 'string' ? error : extractErrorMessage(error), {
            defaultMessage: 'Could not load floors for parking.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [centerId, dispatch]);

  useEffect(() => {
    if (!centerId || parkingDataCenterId !== centerId) return;
    setBodyRows((previous) => {
      const pendingNew = previous.filter((row) => row.isNew);
      const fromApi = (parkingFloorsFromApi || []).map((row) => ({ ...row }));
      return [...fromApi, ...pendingNew];
    });
  }, [centerId, parkingDataCenterId, parkingFloorsFromApi]);

  const handleAddNewParkingFloor = useCallback(() => {
    const newId = `new-parking-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const newRow = {
      id: newId,
      floor: '',
      vehicle_type: '',
      type: '',
      assigning_type: '',
      per_parking_rate: '0',
      parking_no: '',
      isNew: true,
    };
    setBodyRows((previous) => [...previous, newRow]);
  }, []);

  const handleInputChange = useCallback((id, field, value) => {
    setBodyRows((previousRows) =>
      previousRows.map((row) => {
        if (String(row.id) !== String(id)) return row;
        if (field === 'assigning_type' && value === 'FCFS') {
          return { ...row, assigning_type: value, per_parking_rate: '0' };
        }
        return { ...row, [field]: value };
      }),
    );
  }, []);

  const handleSaveNewRow = useCallback(
    async (id) => {
      const rowToSave = bodyRows.find((row) => String(row.id) === String(id));
      if (!rowToSave?.isNew) return;

      const floorVal = String(rowToSave?.floor || '').trim();
      const vehicleTypeVal = String(rowToSave?.vehicle_type || '').trim();
      const typeVal = String(rowToSave?.type || '').trim();
      const assigningTypeVal = String(rowToSave?.assigning_type || '').trim();
      const parkingRaw = String(rowToSave?.parking_no || '').trim();
      const parking_numbers = parseParkingNumbers(parkingRaw);
      const perParkingRate = String(rowToSave?.per_parking_rate ?? '').trim();

      if (
        !floorVal ||
        !vehicleTypeVal ||
        !typeVal ||
        !assigningTypeVal ||
        parking_numbers.length === 0
      ) {
        showErrorToast('Please fill all fields before saving.');
        return;
      }

      if (perParkingRate !== '' && Number.isNaN(Number(perParkingRate))) {
        showErrorToast('Per parking rate must be a valid number.');
        return;
      }

      if (!floorOptions.includes(floorVal)) {
        showErrorToast('Please select a valid floor.');
        return;
      }

      if (!PARKING_TYPES.includes(typeVal)) {
        showErrorToast('Please select a valid type (Stackable or Non Stackable).');
        return;
      }

      if (!centerId) {
        showErrorToast('Center ID not found. Please refresh the page.');
        return;
      }

      setSavingParkingRowId(id);
      try {
        const formData = buildParkingSpaceCreateFormData({
          centerId,
          centerName: centerDetails?.center_name,
          block: getBlockFromFullFloor(floorVal),
          floor: floorVal,
          vehicle_type: vehicleTypeVal,
          parking_type: typeVal,
          assigning_type: assigningTypeVal,
          parking_numbers,
          per_parking_rate:
            assigningTypeVal === 'FCFS' ? 0 : perParkingRate === '' ? 0 : Number(perParkingRate),
        });

        await dispatch(createSpace(formData)).unwrap();
        showSuccessToast('Parking floor added successfully.');
        setBodyRows((prev) => prev.filter((row) => !(String(row.id) === String(id) && row.isNew)));
        try {
          await dispatch(getParkingFloorDetailsThunk(centerId)).unwrap();
        } catch {
          /* ignore refresh errors */
        }
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to create parking space. Please try again.',
        });
      } finally {
        setSavingParkingRowId(null);
      }
    },
    [bodyRows, floorOptions, centerDetails?.center_name, centerId, dispatch],
  );

  const handleCancelNewRow = useCallback((id) => {
    setBodyRows((previousRows) => previousRows.filter((row) => String(row.id) !== String(id)));
  }, []);

  const handleEditRow = useCallback((id) => {
    setEditingRow(id);
    setBodyRows((previousRows) =>
      previousRows.map((row) => {
        if (String(row.id) !== String(id) || row.isNew) return row;
        return {
          ...row,
          parking_no: parkingNumbersToText(row.parking_numbers),
        };
      }),
    );
  }, []);

  const handleSaveRow = useCallback(
    async (id) => {
      const rowToSave = bodyRows.find((row) => String(row.id) === String(id));
      if (!rowToSave) return;

      const floorVal = String(rowToSave?.floor || '').trim();
      const vehicleTypeVal = String(rowToSave?.vehicle_type || '').trim();
      const typeVal = String(rowToSave?.type || '').trim();
      const assigningTypeVal = String(rowToSave?.assigning_type || '').trim();
      const parkingRaw = String(rowToSave?.parking_no || '').trim();
      const parking_numbers = parseParkingNumbers(parkingRaw);
      const perParkingRate = String(rowToSave?.per_parking_rate ?? '').trim();

      if (
        !floorVal ||
        !vehicleTypeVal ||
        !typeVal ||
        !assigningTypeVal ||
        parking_numbers.length === 0
      ) {
        showErrorToast('Please fill all fields before saving.');
        return;
      }

      if (perParkingRate !== '' && Number.isNaN(Number(perParkingRate))) {
        showErrorToast('Per parking rate must be a valid number.');
        return;
      }

      if (!floorOptions.includes(floorVal)) {
        showErrorToast('Please select a valid floor.');
        return;
      }

      if (!PARKING_TYPES.includes(typeVal)) {
        showErrorToast('Please select a valid type (Stackable or Non Stackable).');
        return;
      }

      const rateValue =
        assigningTypeVal === 'FCFS' ? 0 : perParkingRate === '' ? 0 : Number(perParkingRate);
      const spaceId = String(rowToSave.space_id || '').trim();
      const blockVal = getBlockFromFullFloor(floorVal);

      if (!spaceId) {
        setBodyRows((previousRows) =>
          previousRows.map((row) => {
            if (String(row.id) !== String(id)) return row;
            const { parking_no, ...rest } = row;
            return {
              ...rest,
              floor: floorVal,
              type: typeVal,
              assigning_type: assigningTypeVal,
              per_parking_rate: rateValue,
              parking_numbers,
            };
          }),
        );
        setEditingRow(null);
        showSuccessToast('Parking floor updated successfully.');
        return;
      }

      setSavingParkingRowId(id);
      try {
        await dispatch(
          updateParkingSpaceThunk({
            space_id: spaceId,
            block: blockVal,
            floor: floorVal,
            vehicle_type: vehicleTypeVal,
            parking_type: typeVal,
            assigning_type: assigningTypeVal,
            parking_no: parking_numbers,
            expected_per_seat_rate: rateValue,
          }),
        ).unwrap();
        showSuccessToast('Parking floor updated successfully.');
        setEditingRow(null);
        if (centerId) {
          try {
            await dispatch(getParkingFloorDetailsThunk(centerId)).unwrap();
          } catch {
            /* ignore refresh errors */
          }
        }
      } catch (error) {
        showErrorToast(typeof error === 'string' ? error : extractErrorMessage(error));
      } finally {
        setSavingParkingRowId(null);
      }
    },
    [bodyRows, floorOptions, centerId, dispatch],
  );

  const handleCancelEdit = useCallback((id) => {
    setBodyRows((previousRows) =>
      previousRows.map((row) => {
        if (String(row.id) !== String(id)) return row;
        const { parking_no, ...rest } = row;
        return rest;
      }),
    );
    setEditingRow(null);
  }, []);

  const handleDeleteClick = useCallback((row) => {
    setRowToDelete(row);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!rowToDelete) return;
    const spaceId = String(rowToDelete.space_id || '').trim();

    if (!spaceId) {
      setBodyRows((previousRows) =>
        previousRows.filter((row) => String(row.id) !== String(rowToDelete.id)),
      );
      setIsDeleteModalOpen(false);
      setRowToDelete(null);
      showSuccessToast('Parking floor removed successfully.');
      return;
    }

    setIsDeletingParking(true);
    try {
      await dispatch(deleteParkingSpaceThunk(spaceId)).unwrap();
      showSuccessToast('Parking floor removed successfully.');
      setIsDeleteModalOpen(false);
      setRowToDelete(null);
      if (centerId) {
        try {
          await dispatch(getParkingFloorDetailsThunk(centerId)).unwrap();
        } catch {
          /* Row is already deleted; refresh failed — table may need manual reload */
        }
      }
    } catch (error) {
      showErrorToast(typeof error === 'string' ? error : extractErrorMessage(error));
    } finally {
      setIsDeletingParking(false);
    }
  }, [rowToDelete, dispatch, centerId]);

  return (
    <div className='flex h-full flex-col gap-6'>
      <div className='flex items-center gap-2'>
        <RiLayoutGridLine size={20} className='text-text-sub-500' />
        <h2 className='text-title-h6 text-text-strong-950'>Parking Floor</h2>
      </div>

      {!centerId ? (
        <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 text-paragraph-sm text-text-sub-600'>
          Center details are not loaded yet.
        </div>
      ) : isLoading && bodyRows.length === 0 ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-3 py-12'>
          <span className='label-medium text-text-soft-400'>Loading parking floors…</span>
        </div>
      ) : bodyRows.length === 0 ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-5 py-12'>
          <img className='object-contain max-w-[200px]' src={emptyState} alt='no data' />
          <span className='label-medium text-text-soft-400'>
            No parking floors found for this center.
          </span>
          {canWrite && (
            <Button.Root
              variant='primary'
              mode='solid'
              size='small'
              onClick={handleAddNewParkingFloor}
              className='gap-2'
            >
              <Button.Icon as={RiAddLine} />
              Add Parking Floor
            </Button.Root>
          )}
        </div>
      ) : (
        <div className='flex flex-col justify-start items-start gap-4'>
          <div className='flex shrink-0 w-full min-h-0 overflow-auto rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
            <Table.Root variant='compact'>
              <Table.Header>
                <Table.Row>
                  {headColumns.map((item, index) => (
                    <Table.Head
                      key={item || 'actions'}
                      className={
                        index === headColumns.length - 1
                          ? 'sticky right-0 z-20 bg-bg-weak-50'
                          : index < headColumns.length - 2
                            ? 'whitespace-nowrap'
                            : ''
                      }
                    >
                      {item}
                    </Table.Head>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {bodyRows.map((item, index) => {
                  const rowId = item.id;
                  const isNewRow = item.isNew === true;
                  const isEditingRow =
                    !item.isNew && editingRow !== null && String(editingRow) === String(rowId);

                  return (
                    <Table.Row
                      className={`group/row paragraph-small ${index === bodyRows.length - 1 ? 'border-b-0' : 'border-b border-stroke-soft-200'} text-text-main-900`}
                      key={item.id}
                    >
                      <Table.Cell className='align-middle whitespace-nowrap'>
                        {isNewRow || isEditingRow ? (
                          <TypeSelectCell
                            value={item.floor}
                            onChange={(v) => handleInputChange(item.id, 'floor', v)}
                            placeholder='Floor'
                            options={floorOptions}
                          />
                        ) : (
                          <span className='text-paragraph-sm'>{item.floor || '--'}</span>
                        )}
                      </Table.Cell>
                      <Table.Cell className='align-middle whitespace-nowrap'>
                        {isNewRow || isEditingRow ? (
                          <TypeSelectCell
                            value={item.vehicle_type}
                            onChange={(v) => handleInputChange(item.id, 'vehicle_type', v)}
                            placeholder='Vehicle Type'
                            options={VEHICLE_TYPES}
                          />
                        ) : (
                          <span className='text-paragraph-sm'>{item.vehicle_type || '--'}</span>
                        )}
                      </Table.Cell>
                      <Table.Cell className='align-middle whitespace-nowrap'>
                        {isNewRow || isEditingRow ? (
                          <TypeSelectCell
                            value={item.type}
                            onChange={(v) => handleInputChange(item.id, 'type', v)}
                            placeholder='Parking Type'
                            options={PARKING_TYPES}
                          />
                        ) : (
                          <span className='text-paragraph-sm'>{item.type || '--'}</span>
                        )}
                      </Table.Cell>
                      <Table.Cell className='align-middle whitespace-nowrap'>
                        {isNewRow || isEditingRow ? (
                          <TypeSelectCell
                            value={item.assigning_type}
                            onChange={(v) => handleInputChange(item.id, 'assigning_type', v)}
                            placeholder='Assignment Type'
                            options={ASSIGNMENT_TYPES}
                          />
                        ) : (
                          <span className='text-paragraph-sm'>{item.assigning_type || '--'}</span>
                        )}
                      </Table.Cell>
                      <Table.Cell className='align-middle whitespace-nowrap'>
                        {isNewRow || isEditingRow ? (
                          <PerParkingRateInput
                            value={
                              item.assigning_type === 'FCFS' ? '0' : (item.per_parking_rate ?? '0')
                            }
                            readOnly={item.assigning_type === 'FCFS'}
                            onChange={(v) => handleInputChange(item.id, 'per_parking_rate', v)}
                          />
                        ) : (
                          <span className='text-paragraph-sm whitespace-nowrap'>
                            {item.assigning_type === 'FCFS'
                              ? '0'
                              : item.per_parking_rate !== undefined &&
                                  item.per_parking_rate !== null &&
                                  item.per_parking_rate !== ''
                                ? Number(item.per_parking_rate).toLocaleString('en-IN')
                                : '0'}
                          </span>
                        )}
                      </Table.Cell>
                      <Table.Cell className='align-middle min-w-[220px] w-[min(320px,32vw)] max-w-[min(420px,50vw)]'>
                        {isNewRow || isEditingRow ? (
                          <ParkingNumbersTextarea
                            value={item.parking_no ?? ''}
                            onChange={(v) => handleInputChange(item.id, 'parking_no', v)}
                            placeholder='Parking no. (e.g. B-10,B-20,B-30...)'
                            autoFocus={isEditingRow}
                          />
                        ) : (
                          <ParkingNumbersCell numbers={item.parking_numbers} />
                        )}
                      </Table.Cell>
                      <Table.Cell className='border-stroke-soft-200 sticky right-0 z-20 bg-white align-top'>
                        <div className='flex items-center justify-end gap-1 min-h-8'>
                          {isNewRow ? (
                            <>
                              {canWrite && (
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='ghost'
                                  size='xsmall'
                                  disabled={savingParkingRowId === item.id}
                                  onClick={() => handleCancelNewRow(item.id)}
                                  className='h-7 w-7'
                                >
                                  <Button.Icon as={RiCloseLine} className='text-red-500' />
                                </Button.Root>
                              )}
                              {canWrite && (
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='ghost'
                                  size='xsmall'
                                  disabled={savingParkingRowId === item.id}
                                  onClick={() => handleSaveNewRow(item.id)}
                                  className='h-7 w-7'
                                >
                                  <Button.Icon as={RiCheckLine} className='text-green-500' />
                                </Button.Root>
                              )}
                            </>
                          ) : isEditingRow ? (
                            <>
                              {canWrite && (
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='ghost'
                                  size='xsmall'
                                  disabled={savingParkingRowId === item.id}
                                  onClick={() => handleSaveRow(item.id)}
                                  className='h-7 w-7'
                                >
                                  <Button.Icon as={RiCheckLine} className='text-green-500' />
                                </Button.Root>
                              )}
                              {canWrite && (
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='ghost'
                                  size='xsmall'
                                  disabled={savingParkingRowId === item.id}
                                  onClick={() => handleCancelEdit(item.id)}
                                  className='h-7 w-7'
                                >
                                  <Button.Icon as={RiCloseLine} className='text-red-500' />
                                </Button.Root>
                              )}
                            </>
                          ) : (
                            <>
                              {canWrite && (
                                <Button.Root
                                  variant='neutral'
                                  mode='ghost'
                                  size='small'
                                  onClick={() => handleEditRow(item.id)}
                                  className='h-7 w-7 opacity-0 group-hover/row:opacity-100 transition-opacity'
                                >
                                  <Button.Icon as={RiPencilLine} />
                                </Button.Root>
                              )}
                              {canWrite && (
                                <Button.Root
                                  variant='neutral'
                                  mode='ghost'
                                  size='small'
                                  onClick={() => handleDeleteClick(item)}
                                  className='h-7 w-7 opacity-0 group-hover/row:opacity-100 transition-opacity'
                                >
                                  <Button.Icon as={RiDeleteBinLine} className='text-red-500' />
                                </Button.Root>
                              )}
                            </>
                          )}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </div>
          {canWrite && (
            <div className='flex w-full justify-start'>
              <LinkButton.Root
                variant='primary'
                size='small'
                onClick={handleAddNewParkingFloor}
                className='inline-flex w-fit max-w-full'
              >
                <RiAddLine className='w-4 h-4' />
                Add New Parking Floor
              </LinkButton.Root>
            </div>
          )}
        </div>
      )}

      <Modal.Root
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) {
            setRowToDelete(null);
            setIsDeletingParking(false);
          }
        }}
      >
        <Modal.Content className='max-w-[450px]'>
          <Modal.Header
            variant='default'
            icon={
              <span className='p-2 bg-warning-base/10 items-center rounded-lg'>
                <RiAlertFill size={24} className='text-warning-base' />
              </span>
            }
            title={`Remove ${rowToDelete?.floor || 'Parking'} floor?`}
            description='Are you sure you want to remove this parking floor?'
          />
          <Modal.Footer>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={isDeletingParking}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setRowToDelete(null);
              }}
              className='w-full'
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              disabled={isDeletingParking}
              onClick={handleConfirmDelete}
              className='w-full'
            >
              {isDeletingParking ? 'Deleting…' : 'Confirm'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
};

export default CenterDetailParkingFloors;
