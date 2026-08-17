import React, { useState, useEffect } from 'react';
import CenterViewCommonLayout from './center-view-common-layout';
import * as Table from '@/components/ui/table';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Modal from '@/components/ui/modal';
import {
  RiDeleteBinLine,
  RiPencilLine,
  RiCheckLine,
  RiCloseLine,
  RiAddLine,
  RiAlertFill,
  RiLayoutGridLine,
} from 'react-icons/ri';
import { useSelector, useDispatch } from 'react-redux';
import { updateCenterFloorDetailsThunk, getCenterDetailsThunk } from '@/redux/centerSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { hasModulePermission } from '@/utils/user-role-utils';
import { useTableVariant } from '@/hooks/use-table-variant';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import emptyState from '@/assets/images/empty-state.png';

const CenterViewFloor = () => {
  const headColumns = ['Block', 'Floor', 'Carpet Area', 'Floor Height', ''];

  const dispatch = useDispatch();
  const { data: centerDetails } = useSelector((state) => state.center.centerDetails);
  const { userSideBarPerm } = useSelector((state) => state.auth);

  const [bodyRows, setBodyRows] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [floorToDelete, setFloorToDelete] = useState(null);

  const canWrite = hasModulePermission(userSideBarPerm, 'Center', 'write');

  // Table variant management with localStorage persistence
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'center-view-floor-table',
    'compact',
  );

  // Initialize bodyRows from centerDetails when available
  useEffect(() => {
    if (centerDetails?.floor_details && Array.isArray(centerDetails.floor_details)) {
      // Ensure each row has a unique ID
      // For existing floors from API, use 'name' field as ID
      // For new floors being added, generate a unique ID
      const baseTimestamp = Date.now();
      const rowsWithIds = centerDetails.floor_details.map((row, index) => ({
        ...row,
        id:
          row.name ||
          row.id ||
          `floor-${index}-${baseTimestamp}-${Math.random().toString(36).slice(2, 11)}`,
      }));
      setBodyRows(rowsWithIds);
    }
  }, [centerDetails?.floor_details]);

  // Get center ID from centerDetails
  const centerId = centerDetails?.name;

  // Function to update floor details via API
  const updateFloorDetails = async (updatedRows, operation = 'update') => {
    if (!centerId) {
      showErrorToast('Center ID not found. Please refresh the page.');
      return;
    }

    try {
      // Filter out rows with isNew flag and prepare floor_details array
      const floorDetails = updatedRows
        .filter((row) => !row.isNew)
        .map((row) => {
          const detail = {
            block: row.block,
            floor: row.floor,
            carpet_area: row.carpet_area,
            floor_height: row.floor_height,
          };

          // Include name field for existing floors
          if (row.name) {
            detail.name = row.name;
          }

          return detail;
        });

      await dispatch(
        updateCenterFloorDetailsThunk({
          center_id: centerId,
          floor_details: floorDetails,
        }),
      ).unwrap();

      // Refresh center details to get updated data
      await dispatch(getCenterDetailsThunk(centerId)).unwrap();

      // Show appropriate success message based on operation
      let successMessage = 'Floor details updated successfully.';
      if (operation === 'add') {
        successMessage = 'Floor added successfully';
      } else if (operation === 'edit') {
        successMessage = 'Floor updated successfully';
      } else if (operation === 'delete') {
        successMessage = 'Floor removed successfully';
      }

      showSuccessToast(successMessage);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to update floor details.' });
    }
  };

  const handleAddNewFloor = () => {
    // Generate a unique string ID for the new row
    const newId = `new-floor-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const newRow = {
      id: newId,
      block: '',
      floor: '',
      carpet_area: '',
      floor_height: '',
      isNew: true,
    };
    setBodyRows([...bodyRows, newRow]);
    setEditingRow(newId);
  };

  const handleSaveNewRow = async (id) => {
    // Validate that all fields are filled

    const rowToSave = bodyRows.find((row) => String(row.id) === String(id));
    if (
      !String(rowToSave?.block || '').trim() ||
      !String(rowToSave?.floor || '').trim() ||
      !String(rowToSave?.carpet_area || '').trim() ||
      !String(rowToSave?.floor_height || '').trim()
    ) {
      showErrorToast('Please fill all fields before saving.');
      return;
    }

    // Check for duplicate floor (same block and floor combination)
    const blockValue = String(rowToSave.block || '').trim();
    const floorValue = String(rowToSave.floor || '').trim();
    const carpetAreaValue = String(rowToSave.carpet_area || '').trim();
    const floorHeightValue = String(rowToSave.floor_height || '').trim();
    const duplicateExists = bodyRows.some(
      (row) =>
        String(row.id) !== String(id) &&
        !row.isNew &&
        String(row.block || '')
          .trim()
          .toLowerCase() === blockValue.toLowerCase() &&
        String(row.floor || '')
          .trim()
          .toLowerCase() === floorValue.toLowerCase() &&
        String(row.carpet_area || '')
          .trim()
          .toLowerCase() === carpetAreaValue.toLowerCase() &&
        String(row.floor_height || '')
          .trim()
          .toLowerCase() === floorHeightValue.toLowerCase(),
    );

    if (duplicateExists) {
      showErrorToast('Duplicate floor details cannot be added.');
      return;
    }

    // Update local state first
    const updatedRows = bodyRows.map((row) => {
      if (String(row.id) === String(id)) {
        const { isNew, ...rest } = row;
        return rest;
      }
      return row;
    });

    setBodyRows(updatedRows);
    setEditingRow(null);

    // Call API to update floor details
    await updateFloorDetails(updatedRows, 'add');
  };

  const handleCancelNewRow = (id) => {
    setBodyRows((previousRows) => previousRows.filter((row) => String(row.id) !== String(id)));
    setEditingRow(null);
  };

  const handleInputChange = (id, field, value) => {
    // Allow numeric values, decimal point, and comma for carpet_area and floor_height
    if (field === 'carpet_area' || field === 'floor_height') {
      // Allow digits, decimal point, and comma
      let cleanedValue = value.replaceAll(/[^\d,.]/g, '');
      // Ensure only one decimal point
      const parts = cleanedValue.split('.');
      if (parts.length > 2) {
        cleanedValue = `${parts[0]}.${parts.slice(1).join('')}`;
      }

      setBodyRows((previousRows) =>
        previousRows.map((row) => {
          // Use String() to ensure consistent type comparison
          if (String(row.id) === String(id)) {
            return { ...row, [field]: cleanedValue };
          }
          return row;
        }),
      );
    } else {
      setBodyRows((previousRows) =>
        previousRows.map((row) => {
          // Use String() to ensure consistent type comparison
          if (String(row.id) === String(id)) {
            return { ...row, [field]: value };
          }
          return row;
        }),
      );
    }
  };

  const handleEditRow = (id) => {
    setEditingRow(id);
  };

  const handleSaveRow = async (id) => {
    // Validate that all fields are filled
    const rowToSave = bodyRows.find((row) => String(row.id) === String(id));
    if (
      !String(rowToSave?.block || '').trim() ||
      !String(rowToSave?.floor || '').trim() ||
      !String(rowToSave?.carpet_area || '').trim() ||
      !String(rowToSave?.floor_height || '').trim()
    ) {
      showErrorToast('Please fill all fields before saving.');
      return;
    }

    // Check for duplicate floor (same block, floor, carpet_area, and floor_height combination, excluding current row)
    const blockValue = String(rowToSave.block || '').trim();
    const floorValue = String(rowToSave.floor || '').trim();
    const carpetAreaValue = String(rowToSave.carpet_area || '').trim();
    const floorHeightValue = String(rowToSave.floor_height || '').trim();
    const duplicateExists = bodyRows.some((row) => {
      // Skip the current row being edited
      if (String(row.id) === String(id)) return false;
      // Skip new rows (they're not saved yet)
      if (row.isNew) return false;

      const rowBlock = String(row.block || '')
        .trim()
        .toLowerCase();
      const rowFloor = String(row.floor || '')
        .trim()
        .toLowerCase();
      const rowCarpetArea = String(row.carpet_area || '')
        .trim()
        .toLowerCase();
      const rowFloorHeight = String(row.floor_height || '')
        .trim()
        .toLowerCase();

      return (
        rowBlock === blockValue.toLowerCase() &&
        rowFloor === floorValue.toLowerCase() &&
        rowCarpetArea === carpetAreaValue.toLowerCase() &&
        rowFloorHeight === floorHeightValue.toLowerCase()
      );
    });

    if (duplicateExists) {
      showErrorToast('Duplicate floor details cannot be added.');
      return;
    }

    // Calculate updated rows
    const updatedRows = bodyRows.map((row) => (String(row.id) === String(id) ? { ...row } : row));

    // Update local state
    setBodyRows(updatedRows);
    setEditingRow(null);

    // Call API to update floor details
    await updateFloorDetails(updatedRows, 'edit');
  };

  const handleCancelEdit = (id) => {
    // Reset to original values from centerDetails
    if (centerDetails?.floor_details && Array.isArray(centerDetails.floor_details)) {
      const originalRow = centerDetails.floor_details.find((row) => String(row.id) === String(id));
      if (originalRow) {
        setBodyRows((previousRows) =>
          previousRows.map((row) => (String(row.id) === String(id) ? originalRow : row)),
        );
      }
    }
    setEditingRow(null);
  };

  const handleDeleteClick = (floor) => {
    setFloorToDelete(floor);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!floorToDelete) return;

    // Update local state first
    const updatedRows = bodyRows.filter((row) => String(row.id) !== String(floorToDelete.id));
    setBodyRows(updatedRows);

    // Close modal
    setIsDeleteModalOpen(false);
    setFloorToDelete(null);

    // Call API to update floor details
    await updateFloorDetails(updatedRows, 'delete');
  };

  return (
    <div className='w-full h-full flex flex-col items-center '>
      {bodyRows.length === 0 ? (
        <div className='w-full h-full flex flex-col items-center justify-center gap-[20px]'>
          <img className='object-contain' src={emptyState} alt='no data' />
          <span className='label-medium text-[var(--color-text-soft-400)]'>
            No floors found for this center.
          </span>
          {canWrite && (
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={handleAddNewFloor}
              className='gap-2'
            >
              <Button.Icon as={RiAddLine} />
              Add Floor
            </Button.Root>
          )}
        </div>
      ) : (
        <CenterViewCommonLayout
          title='Floors'
          Icon={RiLayoutGridLine}
          buttonName='Add Floor'
          onButtonClick={handleAddNewFloor}
          showButton={bodyRows.length === 0 ? false : true}
          headerActions={
            <TableVariantToggle variant={tableVariant} onToggle={toggleTableVariant} />
          }
        >
          <Table.Root variant={tableVariant}>
            <Table.Header>
              <Table.Row>
                {headColumns.map((item, index) => (
                  <Table.Head
                    key={item || 'actions'}
                    className={
                      index === headColumns.length - 1
                        ? 'text-left label-small text-text-sub-600 font-medium w-[100px] sticky right-0 z-20 bg-bg-weak-50'
                        : 'text-left label-small text-text-sub-600 font-medium'
                    }
                  >
                    {item}
                  </Table.Head>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {bodyRows.map((item) => {
                // Ensure we have a valid ID for comparison
                const rowId = item.id;
                const isNewRow = item.isNew === true;
                const isEditingRow =
                  !item.isNew && editingRow !== null && String(editingRow) === String(rowId);

                return (
                  <Table.Row className='group/row paragraph-small text-text-main-900' key={item.id}>
                    <Table.Cell>
                      {isNewRow || isEditingRow ? (
                        <Input.Root size='small' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              placeholder='Enter block'
                              value={item.block || ''}
                              onChange={(e) => handleInputChange(item.id, 'block', e.target.value)}
                              autoFocus={isNewRow}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      ) : (
                        item.block
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {isNewRow || isEditingRow ? (
                        <Input.Root size='small' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              placeholder='Enter floor'
                              value={item.floor || ''}
                              onChange={(e) => handleInputChange(item.id, 'floor', e.target.value)}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      ) : (
                        item.floor
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {isNewRow || isEditingRow ? (
                        <Input.Root size='small' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              placeholder='Enter carpet area'
                              value={item.carpet_area || ''}
                              onChange={(e) =>
                                handleInputChange(item.id, 'carpet_area', e.target.value)
                              }
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      ) : (
                        item.carpet_area
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {isNewRow || isEditingRow ? (
                        <Input.Root size='small' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              placeholder='Enter floor height'
                              value={item.floor_height || ''}
                              onChange={(e) =>
                                handleInputChange(item.id, 'floor_height', e.target.value)
                              }
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      ) : (
                        item.floor_height
                      )}
                    </Table.Cell>
                    <Table.Cell className='border-stroke-soft-200 sticky right-0 z-20 bg-white'>
                      <div className='flex items-center justify-end '>
                        {isNewRow ? (
                          <>
                            {canWrite && (
                              <Button.Root
                                type='button'
                                variant='neutral'
                                mode='ghost'
                                size='xsmall'
                                onClick={() => handleSaveNewRow(item.id)}
                              >
                                <Button.Icon as={RiCheckLine} />
                              </Button.Root>
                            )}

                            {canWrite && (
                              <Button.Root
                                type='button'
                                variant='neutral'
                                mode='ghost'
                                size='xsmall'
                                onClick={() => handleCancelNewRow(item.id)}
                              >
                                <Button.Icon as={RiCloseLine} />
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
                                onClick={() => handleSaveRow(item.id)}
                              >
                                <Button.Icon as={RiCheckLine} />
                              </Button.Root>
                            )}

                            {canWrite && (
                              <Button.Root
                                type='button'
                                variant='neutral'
                                mode='ghost'
                                size='xsmall'
                                onClick={() => handleCancelEdit(item.id)}
                              >
                                <Button.Icon as={RiCloseLine} />
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
                              >
                                <Button.Icon as={RiDeleteBinLine} />
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
        </CenterViewCommonLayout>
      )}

      {/* Delete Confirmation Modal */}
      <Modal.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Modal.Content className='max-w-[450px]'>
          <Modal.Header
            variant='center'
            icon={
              <span className='p-2 bg-warning-base/10 rounded-lg'>
                <RiAlertFill size={24} className='text-warning-base' />
              </span>
            }
            title='Remove Floor?'
            description='Are you sure you want to remove this floor? This action cannot be undone.'
          />
          <Modal.Footer>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => {
                setIsDeleteModalOpen(false);
                setFloorToDelete(null);
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
              onClick={handleConfirmDelete}
              className='w-full'
            >
              Remove
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
};

export default CenterViewFloor;
