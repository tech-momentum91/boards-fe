import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Table from '@/components/ui/table';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Switch from '@/components/ui/switch';
import * as Modal from '@/components/ui/modal';
import * as LinkButton from '@/components/ui/link-button';
import ErrorText from '@/components/ui/error-text';
import {
  RiDeleteBinLine,
  RiPencilLine,
  RiCheckLine,
  RiCloseLine,
  RiAddLine,
  RiAlertFill,
  RiLayoutGridLine,
  RiMoreLine,
  RiArrowDownSLine,
  RiInformationLine,
  RiUploadLine,
  RiLockLine,
  RiEyeLine,
  RiEyeCloseLine,
  RiUserLine,
} from 'react-icons/ri';
import * as Tooltip from '@/components/ui/tooltip';
import apiClient from '@/api/axios';
import { useSelector, useDispatch } from 'react-redux';
import { toHasParkingFlag } from '@/api/floorDetail';
import {
  addFloorWithFilesThunk,
  deleteFloorDetailThunk,
  editFloorWithFilesThunk,
  getCenterDetailsThunk,
  listFloorDetailsThunk,
  removeFloorLayoutThunk,
} from '@/redux/centerSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { hasModulePermission, isAdminRole } from '@/utils/user-role-utils';
import { cn } from '@/utils/cn';
import { useTableVariant } from '@/hooks/use-table-variant';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import ImagePreview from '@/components/ui/image-preview';
import RemoveFloorLayoutModal from '@/components/centers-management/remove-floor-layout-modal';
import UpdateFloorLayoutModal from '@/components/centers-management/update-floor-layout-modal';
import emptyState from '@/assets/images/empty-state.png';
import { createKnowledgeCenterMedia } from '@/redux/knowledgeCenterMediaSlice';
import { notifyFloorSyncResult, waitForFloorLabelSync } from '@/utils/floor-sync-utils';

function toAssetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//u.test(path)) return path;
  const base = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

/** Layout file from list API `attachments` (is_layout_image) or match to `layout_image` path. */
function getLayoutAttachmentForRow(item) {
  if (!item || !Array.isArray(item.attachments) || item.attachments.length === 0) {
    return null;
  }
  const byFlag = item.attachments.find(
    (a) => a && (a.is_layout_image === 1 || a.is_layout_image === true),
  );
  if (byFlag) return byFlag;
  if (item.layout_image) {
    const byUrl = item.attachments.find(
      (a) => a?.file_url && String(a.file_url) === String(item.layout_image),
    );
    if (byUrl) return byUrl;
  }
  return item.attachments[0] ?? null;
}

function getLayoutImageUrlForRow(item) {
  if (!item) return '';
  if (item.layout_image) return String(item.layout_image);
  const att = getLayoutAttachmentForRow(item);
  return att?.file_url ? String(att.file_url) : '';
}

function parseHasParking(value) {
  return toHasParkingFlag(value) === 1;
}

const EMPTY_PASSCODE = ['', '', '', '', '', ''];

const toPasscodeDigits = (passcode) =>
  Array.from({ length: 6 }, (_, i) => (passcode || '')[i] || '');

const vmsPasscodeResetSchema = z
  .object({
    newPasscode: z
      .string()
      .min(1, 'Passcode is required')
      .regex(/^\d{6}$/, 'Passcode must be 6 digits'),
    confirmPasscode: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!/^\d{6}$/.test(data.newPasscode)) return;

    if (data.confirmPasscode.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please confirm your passcode',
        path: ['confirmPasscode'],
      });
      return;
    }

    if (data.newPasscode !== data.confirmPasscode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passcodes do not match',
        path: ['confirmPasscode'],
      });
    }
  });

const getVmsUserDisplayLabel = (source) => {
  const username = source?.vms_user?.trim() || '';
  const userId =
    source?.vms_user_email?.trim() ||
    source?.vms_user_id?.trim() ||
    (username.includes('@') ? username : '');

  if (username) {
    return `${username}`;
  }

  return username || userId || '-';
};

const CenterDetailFloors = () => {
  const dispatch = useDispatch();
  const { data: centerDetails } = useSelector((state) => state.center.centerDetails);
  const { userSideBarPerm } = useSelector((state) => state.auth);

  const [isVmsModalOpen, setIsVmsModalOpen] = useState(false);
  const [selectedFloorForVms, setSelectedFloorForVms] = useState(null);
  /** @type {['floor' | 'center', Function]} */
  const [vmsScope, setVmsScope] = useState('floor');
  const [isVmsResetMode, setIsVmsResetMode] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [displayPasscode, setDisplayPasscode] = useState(EMPTY_PASSCODE);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const {
    watch: watchPasscodeReset,
    setValue: setPasscodeResetValue,
    reset: resetPasscodeForm,
    handleSubmit: handlePasscodeResetSubmit,
    trigger: triggerPasscodeResetValidation,
    formState: { errors: passcodeResetErrors },
  } = useForm({
    resolver: zodResolver(vmsPasscodeResetSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { newPasscode: '', confirmPasscode: '' },
  });

  const watchedNewPasscode = watchPasscodeReset('newPasscode');
  const watchedConfirmPasscode = watchPasscodeReset('confirmPasscode');

  const canSavePasscodeReset = useMemo(
    () =>
      /^\d{6}$/.test(watchedNewPasscode || '') &&
      /^\d{6}$/.test(watchedConfirmPasscode || '') &&
      watchedNewPasscode === watchedConfirmPasscode,
    [watchedNewPasscode, watchedConfirmPasscode],
  );

  useEffect(() => {
    if (/^\d{6}$/.test(watchedNewPasscode || '')) {
      void triggerPasscodeResetValidation('confirmPasscode');
    }
  }, [watchedNewPasscode, watchedConfirmPasscode, triggerPasscodeResetValidation]);

  const hasVmsUser = (floor) => Boolean(floor?.vms_user?.trim());

  const getFloorRef = (floor) => floor?.name || floor?.id || '';

  const centerId = centerDetails?.name;
  const centerDisplayName = String(centerDetails?.center_name ?? centerDetails?.name ?? '').trim();

  const hasCenterVmsUser = Boolean(
    String(centerDetails?.vms_user || centerDetails?.vms_user_email || '').trim(),
  );

  const centerVmsSource = useMemo(
    () => ({
      vms_user: centerDetails?.vms_user || '',
      vms_user_email: centerDetails?.vms_user_email || '',
    }),
    [centerDetails?.vms_user, centerDetails?.vms_user_email],
  );

  const fetchVmsPasscode = async (floor, scope = vmsScope) => {
    if (scope === 'center') {
      if (!centerId) return EMPTY_PASSCODE;
      try {
        const { data } = await apiClient.get(
          '/method/devx.center_management.doctype.center.center.get_center_vms_passcode',
          { params: { center_id: centerId } },
        );
        return toPasscodeDigits(data?.message?.passcode ?? data?.passcode);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to load center passcode.' });
        return EMPTY_PASSCODE;
      }
    }

    const floorRef = getFloorRef(floor);
    if (!floorRef) return EMPTY_PASSCODE;
    try {
      const { data } = await apiClient.get(
        '/method/devx.center_management.doctype.center.center.get_vms_passcode',
        { params: { floor_ref: floorRef } },
      );
      return toPasscodeDigits(data?.message?.passcode ?? data?.passcode);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to load floor passcode.' });
      return EMPTY_PASSCODE;
    }
  };

  const handleCenterVmsLoginClick = async () => {
    setVmsScope('center');
    setSelectedFloorForVms(null);
    setIsVmsResetMode(false);
    setShowPasscode(false);
    resetPasscodeForm({ newPasscode: '', confirmPasscode: '' });
    setDisplayPasscode(EMPTY_PASSCODE);
    setIsVmsModalOpen(true);
    setDisplayPasscode(await fetchVmsPasscode(null, 'center'));
  };

  const handleVmsLoginClick = async (floor) => {
    setVmsScope('floor');
    setSelectedFloorForVms(floor);
    setIsVmsResetMode(false);
    setShowPasscode(false);
    resetPasscodeForm({ newPasscode: '', confirmPasscode: '' });
    setDisplayPasscode(EMPTY_PASSCODE);
    setIsVmsModalOpen(true);
    setDisplayPasscode(await fetchVmsPasscode(floor, 'floor'));
  };

  const handleSavePasscode = handlePasscodeResetSubmit(async ({ newPasscode }) => {
    if (vmsScope === 'center') {
      if (!centerId || !hasCenterVmsUser) {
        showErrorToast('Center login user is required to reset passcode.');
        return;
      }
      try {
        await apiClient.post(
          '/method/devx.center_management.doctype.center.center.update_center_vms_passcode',
          { center_id: centerId, passcode: newPasscode },
        );
        showSuccessToast('Passcode reset successfully.');
        setIsVmsResetMode(false);
        resetPasscodeForm({ newPasscode: '', confirmPasscode: '' });
        setDisplayPasscode(await fetchVmsPasscode(null, 'center'));
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to reset passcode.' });
      }
      return;
    }

    const floorRef = getFloorRef(selectedFloorForVms);
    if (!floorRef || !hasVmsUser(selectedFloorForVms)) {
      showErrorToast('VMS user is required to reset passcode.');
      return;
    }

    try {
      await apiClient.post(
        '/method/devx.center_management.doctype.center.center.update_vms_passcode',
        { floor_ref: floorRef, passcode: newPasscode },
      );

      showSuccessToast('Passcode reset successfully.');
      setIsVmsResetMode(false);
      resetPasscodeForm({ newPasscode: '', confirmPasscode: '' });
      setDisplayPasscode(await fetchVmsPasscode(selectedFloorForVms, 'floor'));
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to reset passcode.' });
    }
  });

  const renderPasscodeInputs = (valueArray, onChangeArray, isReadOnly, hasError = false) => {
    const handleOtpChange = (element, index) => {
      if (isReadOnly) return;
      const val = element.value.replaceAll(/\D/g, '');
      const newVals = [...valueArray];
      newVals[index] = val.slice(Math.max(0, val.length - 1));
      onChangeArray(newVals);

      if (val && index < 5) {
        const inputs = [...element.parentElement.querySelectorAll('input')];
        inputs[index + 1]?.focus();
      }
    };

    const handleOtpKeyDown = (e, index) => {
      if (isReadOnly) return;
      if (e.key === 'Backspace') {
        const newVals = [...valueArray];
        const inputs = [...e.target.parentElement.querySelectorAll('input')];
        if (!newVals[index] && index > 0) {
          inputs[index - 1]?.focus();
          const prevIndex = index - 1;
          newVals[prevIndex] = '';
          onChangeArray(newVals);
        } else {
          newVals[index] = '';
          onChangeArray(newVals);
        }
      }
    };

    const handleOtpPaste = (e) => {
      if (isReadOnly) return;
      e.preventDefault();
      const pasteData = e.clipboardData.getData('text').replaceAll(/\D/g, '').slice(0, 6);
      if (pasteData.length === 6) {
        onChangeArray([...pasteData]);
      }
    };

    return (
      <div className='flex w-full items-center gap-1.5' onPaste={handleOtpPaste}>
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <React.Fragment key={idx}>
            <input
              type={showPasscode ? 'text' : 'password'}
              value={valueArray[idx] || ''}
              readOnly={isReadOnly}
              maxLength={1}
              onChange={(e) => handleOtpChange(e.target, idx)}
              onKeyDown={(e) => handleOtpKeyDown(e, idx)}
              className={cn(
                'h-10 min-w-0 flex-1 border rounded-lg text-center font-medium text-paragraph-sm outline-none transition-all duration-200',
                hasError ? 'border-error-base' : 'border-stroke-soft-200',
                isReadOnly
                  ? 'bg-bg-weak-50 text-text-sub-500 cursor-not-allowed'
                  : 'bg-bg-white-0 text-text-strong-950 focus:border-primary-base focus:ring-2 focus:ring-primary-base/20',
              )}
            />
            {idx === 2 && <span className='shrink-0 text-stroke-soft-200 font-semibold'>-</span>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Get center ID from centerDetails
  const canWrite = hasModulePermission(userSideBarPerm, 'Center', 'write');
  const canSeeLayout = useMemo(() => isAdminRole(userSideBarPerm), [userSideBarPerm]);

  const headColumns = useMemo(() => {
    const cols = ['Block', 'Floor', 'Carpet Area (sq.ft.)', 'Floor Height (ft)', 'Has Parking'];
    if (canSeeLayout) cols.push('Layout Image');
    cols.push('');
    return cols;
  }, [canSeeLayout]);

  const [bodyRows, setBodyRows] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [icCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [floorToDelete, setFloorToDelete] = useState(null);
  const [layoutUploadRowId, setLayoutUploadRowId] = useState(null);
  const [layoutFilePickMode, setLayoutFilePickMode] = useState('upload');
  const [layoutUploadingRowId, setLayoutUploadingRowId] = useState(null);
  const [layoutRemovingRowId, setLayoutRemovingRowId] = useState(null);
  const [isRemoveLayoutModalOpen, setIsRemoveLayoutModalOpen] = useState(false);
  const [isUpdateLayoutModalOpen, setIsUpdateLayoutModalOpen] = useState(false);
  const [layoutToRemove, setLayoutToRemove] = useState(null);
  const [layoutPreviewItem, setLayoutPreviewItem] = useState(null);
  const layoutFileInputRef = useRef(null);
  const [isListLoading, setIsListLoading] = useState(false);
  const [layoutPreviewOpen, setLayoutPreviewOpen] = useState(false);
  const [layoutPreviewImages, setLayoutPreviewImages] = useState([]);
  const [floorSyncBanner, setFloorSyncBanner] = useState(null);
  const [syncingFloorRowId, setSyncingFloorRowId] = useState(null);

  // Table variant management with localStorage persistence
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'center-detail-floor-table',
    'compact',
  );

  const mapFloorsToRows = (floors) =>
    (floors || []).map((row, index) => ({
      ...row,
      id: row.name || row.id || `floor-${index}`,
      has_parking: parseHasParking(row.has_parking),
    }));

  const refreshFloorsFromApi = async () => {
    if (!centerId) return;
    const result = await dispatch(listFloorDetailsThunk(centerId)).unwrap();
    setBodyRows(mapFloorsToRows(result.floors));
    await dispatch(getCenterDetailsThunk(centerId)).unwrap();
  };

  useEffect(() => {
    if (!centerId) return undefined;
    let cancelled = false;
    (async () => {
      setIsListLoading(true);
      try {
        const result = await dispatch(listFloorDetailsThunk(centerId)).unwrap();
        if (cancelled) return;
        setBodyRows(mapFloorsToRows(result.floors));
      } catch (error) {
        if (!cancelled) {
          showErrorToast(error, { defaultMessage: 'Failed to load floors.' });
        }
      } finally {
        if (!cancelled) setIsListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [centerId, dispatch]);

  const handleCreateUser = async () => {
    if (isCreatingUser) return;

    if (!centerId) {
      showErrorToast('Center is required.');
      return;
    }

    if (vmsScope === 'center') {
      setIsCreatingUser(true);
      try {
        await apiClient.post(
          '/method/devx.center_management.doctype.center.center.create_center_security_user',
          { center_id: centerId },
        );
        await dispatch(getCenterDetailsThunk(centerId)).unwrap();
        showSuccessToast('Center login user created successfully.');
        setIsCreateUserModalOpen(false);
        setIsVmsModalOpen(true);
        setIsVmsResetMode(true);
        resetPasscodeForm({ newPasscode: '', confirmPasscode: '' });
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to create center login user.' });
      } finally {
        setIsCreatingUser(false);
      }
      return;
    }

    if (!selectedFloorForVms?.block?.trim() || !selectedFloorForVms?.floor?.trim()) {
      showErrorToast('Center, block, and floor are required.');
      return;
    }

    const floorId = selectedFloorForVms.id;

    setIsCreatingUser(true);
    try {
      await apiClient.post(
        '/method/devx.center_management.doctype.center.center.create_security_user',
        {
          center_id: centerId,
          block: selectedFloorForVms.block.trim(),
          floor: selectedFloorForVms.floor.trim(),
        },
      );

      const result = await dispatch(listFloorDetailsThunk(centerId)).unwrap();
      const floors = mapFloorsToRows(result.floors);
      setBodyRows(floors);
      const updatedFloor = floors.find((row) => row.id === floorId);
      if (updatedFloor) setSelectedFloorForVms(updatedFloor);

      showSuccessToast('User created successfully.');
      setIsCreateUserModalOpen(false);
      setIsVmsModalOpen(true);
      setIsVmsResetMode(true);
      resetPasscodeForm({ newPasscode: '', confirmPasscode: '' });
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to create user.' });
    } finally {
      setIsCreatingUser(false);
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
      has_parking: false,
      isNew: true,
    };
    setBodyRows([...bodyRows, newRow]);
    setEditingRow(newId);
  };

  const handleSaveNewRow = async (id) => {
    if (!centerId) {
      showErrorToast('Center ID not found. Please refresh the page.');
      return;
    }
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

    try {
      await dispatch(
        addFloorWithFilesThunk({
          center: centerId,
          block: rowToSave.block,
          floor: rowToSave.floor,
          carpet_area: rowToSave.carpet_area,
          floor_height: rowToSave.floor_height,
          has_parking: toHasParkingFlag(rowToSave.has_parking),
          file: rowToSave.pendingLayoutFile ?? undefined,
        }),
      ).unwrap();
      setEditingRow(null);
      showSuccessToast('Floor added successfully.');
      await refreshFloorsFromApi();
    } catch (error) {
      setBodyRows((previousRows) => previousRows.filter((row) => String(row.id) !== String(id)));
      setEditingRow(null);
      showErrorToast(error, { defaultMessage: 'Failed to add floor.' });
    }
  };

  const handleCancelNewRow = (id) => {
    setBodyRows((previousRows) => previousRows.filter((row) => String(row.id) !== String(id)));
    setEditingRow(null);
  };

  const handleHasParkingChange = (id, checked) => {
    setBodyRows((previousRows) =>
      previousRows.map((row) =>
        String(row.id) === String(id) ? { ...row, has_parking: Boolean(checked) } : row,
      ),
    );
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

    if (!rowToSave?.name) {
      showErrorToast('Invalid floor row.');
      return;
    }

    setSyncingFloorRowId(id);
    setFloorSyncBanner(null);

    try {
      const editResponse = await dispatch(
        editFloorWithFilesThunk({
          floor_ref: rowToSave.name,
          block: rowToSave.block,
          floor: rowToSave.floor,
          carpet_area: rowToSave.carpet_area,
          floor_height: rowToSave.floor_height,
          has_parking: toHasParkingFlag(rowToSave.has_parking),
        }),
      ).unwrap();

      const { immediate, finalStatus } = await waitForFloorLabelSync(editResponse, {
        onProgress: (message) => {
          setFloorSyncBanner({ type: 'info', message });
        },
      });

      setEditingRow(null);
      setFloorSyncBanner(null);

      if (immediate) {
        showSuccessToast(
          editResponse?.message || editResponse?.user_message || 'Floor updated successfully.',
        );
        await refreshFloorsFromApi();
        return;
      }

      notifyFloorSyncResult(finalStatus, { onRefresh: refreshFloorsFromApi });
      await refreshFloorsFromApi();
    } catch (error) {
      setFloorSyncBanner(null);
      showErrorToast(error, { defaultMessage: 'Failed to update floor.' });
      try {
        await refreshFloorsFromApi();
      } catch {
        /* ignore refresh failure */
      }
    } finally {
      setSyncingFloorRowId(null);
    }
  };

  const handleCancelEdit = async (_id) => {
    setEditingRow(null);
    try {
      await refreshFloorsFromApi();
    } catch {
      /* list refresh failed — row may be stale until next load */
    }
  };

  const handleDeleteClick = (floor) => {
    setFloorToDelete(floor);
    setIsDeleteModalOpen(true);
  };

  const openLayoutImagePreview = (item) => {
    const srcPath = getLayoutImageUrlForRow(item);
    if (!srcPath) return;
    const att = getLayoutAttachmentForRow(item);
    const label = String(
      att?.file_name ||
        item.block_floor_id ||
        `${item.block || ''} ${item.floor || ''}`.trim() ||
        'Layout',
    );
    setLayoutPreviewItem(item);
    setLayoutPreviewImages([
      {
        src: toAssetUrl(srcPath),
        alt: label,
        caption: label,
      },
    ]);
    setLayoutPreviewOpen(true);
  };

  const closeLayoutImagePreview = () => {
    setLayoutPreviewOpen(false);
    setLayoutPreviewItem(null);
  };

  const handleRemoveLayoutClick = (item) => {
    if (!canSeeLayout || layoutRemovingRowId != null) return;
    const att = getLayoutAttachmentForRow(item);
    const fileId = att?.name;
    if (!fileId) {
      showErrorToast('No layout attachment found for this floor. Refresh and try again.');
      return;
    }
    if (!centerId) {
      showErrorToast('Center reference not found. Refresh and try again.');
      return;
    }
    const blockFloorId = String(item?.block_floor_id ?? '').trim();
    if (!blockFloorId) {
      showErrorToast('Floor reference not found. Refresh and try again.');
      return;
    }
    setLayoutToRemove(item);
    setIsRemoveLayoutModalOpen(true);
  };

  const handlePreviewUpdateLayout = () => {
    if (!layoutPreviewItem || layoutUploadingRowId != null) return;
    setLayoutPreviewOpen(false);
    setIsUpdateLayoutModalOpen(true);
  };

  const handleConfirmUpdateLayout = () => {
    if (!layoutPreviewItem) return;
    setIsUpdateLayoutModalOpen(false);
    setLayoutFilePickMode('update');
    setLayoutUploadRowId(layoutPreviewItem.id);
    layoutFileInputRef.current?.click();
  };

  const handlePreviewRemoveLayout = () => {
    if (!layoutPreviewItem) return;
    setLayoutPreviewOpen(false);
    handleRemoveLayoutClick(layoutPreviewItem);
  };

  const handleConfirmRemoveLayout = async () => {
    if (!layoutToRemove || layoutRemovingRowId != null) return;
    const att = getLayoutAttachmentForRow(layoutToRemove);
    const fileId = att?.name;
    const blockFloorId = String(layoutToRemove?.block_floor_id ?? '').trim();
    if (!centerId || !fileId || !blockFloorId) {
      showErrorToast('Missing layout details. Refresh and try again.');
      return;
    }

    setLayoutRemovingRowId(layoutToRemove.id);
    try {
      await dispatch(
        removeFloorLayoutThunk({
          center: centerId,
          block_floor_id: blockFloorId,
          file_id: fileId,
        }),
      ).unwrap();
      showSuccessToast('Layout removed successfully.');
      setIsRemoveLayoutModalOpen(false);
      setLayoutToRemove(null);
      await refreshFloorsFromApi();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to remove layout.' });
    } finally {
      setLayoutRemovingRowId(null);
    }
  };

  const pickLayoutFileForRow = (rowId) => {
    setLayoutFilePickMode('upload');
    setLayoutUploadRowId(rowId);
    layoutFileInputRef.current?.click();
  };

  const handleLayoutFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const pickMode = layoutFilePickMode;
    setLayoutFilePickMode('upload');
    if (!file || !centerId || layoutUploadRowId == null) {
      setLayoutUploadRowId(null);
      return;
    }
    const targetId = layoutUploadRowId;
    setLayoutUploadRowId(null);
    const row = bodyRows.find((r) => String(r.id) === String(targetId));

    if (row?.isNew) {
      setBodyRows((previousRows) =>
        previousRows.map((item) =>
          String(item.id) === String(targetId)
            ? { ...item, pendingLayoutFile: file, pendingLayoutFileName: file.name }
            : item,
        ),
      );
      return;
    }

    if (!row?.name) {
      showErrorToast('Save the floor row first before uploading a layout image.');
      return;
    }
    setLayoutUploadingRowId(targetId);
    try {
      const isLayoutUpdate = pickMode === 'update';
      const layout_upload_response = await dispatch(
        editFloorWithFilesThunk({
          floor_ref: row.name,
          file,
          layout_action: isLayoutUpdate ? 'update' : 'upload',
        }),
      ).unwrap();

      if (!isLayoutUpdate) {
        const layout_image_url = layout_upload_response?.layout_image;
        const floorLabel = String(
          row.block_floor_id ?? row.floor ?? `${row.block ?? ''} ${row.floor ?? ''}`.trim(),
        ).trim();
        const mediaName = `${centerDisplayName || centerId}  ${floorLabel}  Layout`;

        await dispatch(
          createKnowledgeCenterMedia({
            media_name: mediaName,
            description: '',
            center: centerId,
            floor: row.floor,
            space: '',
            client: '',
            matterport_url: '',
            presentation_url: '',
            tags: [],
            is_active: 1,
            media_type: 'Layout',
            layout_image_url,
          }),
        ).unwrap();
      }

      showSuccessToast(isLayoutUpdate ? 'Layout image updated.' : 'Layout image uploaded.');
      setLayoutPreviewItem(null);
      await refreshFloorsFromApi();
    } catch (error) {
      showErrorToast(error, {
        defaultMessage:
          pickMode === 'update'
            ? 'Failed to update layout image.'
            : 'Failed to upload layout image.',
      });
    } finally {
      setLayoutUploadingRowId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!floorToDelete?.name) return;

    try {
      await dispatch(deleteFloorDetailThunk(floorToDelete.name)).unwrap();
      showSuccessToast('Floor removed successfully.');
      await refreshFloorsFromApi();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to delete floor.' });
    } finally {
      setIsDeleteModalOpen(false);
      setFloorToDelete(null);
    }
  };

  return (
    <div className='flex h-full flex-col gap-6'>
      {/* Header Section */}
      <div className='flex items-center justify-between gap-4'>
        <div className='flex items-center gap-2'>
          {canSeeLayout ? (
            <RiLayoutGridLine size={20} className='text-text-sub-500' aria-hidden />
          ) : null}
          <h2 className='text-title-h6 text-text-strong-950'>Floors</h2>
        </div>
        <div className='flex items-center gap-2'>
          {canWrite ? (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  onClick={() => {
                    if (hasCenterVmsUser) {
                      handleCenterVmsLoginClick();
                      return;
                    }
                    setVmsScope('center');
                    setSelectedFloorForVms(null);
                    setIsCreateUserModalOpen(true);
                  }}
                  className='gap-1'
                  aria-label={
                    hasCenterVmsUser ? 'Center login credentials' : 'Create center login user'
                  }
                >
                  <Button.Icon
                    as={hasCenterVmsUser ? RiLockLine : RiAddLine}
                    className={hasCenterVmsUser ? '-ml-1 mr-0' : undefined}
                  />
                  Login
                </Button.Root>
              </Tooltip.Trigger>
              <Tooltip.Content size='xsmall' className='max-w-[220px] text-center'>
                {hasCenterVmsUser
                  ? 'Center login credentials — this user can access all floors on the facility tablet'
                  : 'Create center login user — access all floors on the facility tablet'}
              </Tooltip.Content>
            </Tooltip.Root>
          ) : null}
        </div>
      </div>

      {floorSyncBanner ? (
        <div
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2 text-paragraph-sm',
            floorSyncBanner.type === 'info'
              ? 'border-warning-base/30 bg-warning-base/5 text-text-main-900'
              : 'border-error-base/30 bg-error-base/5 text-error-base',
          )}
        >
          <RiInformationLine className='mt-0.5 shrink-0' size={16} />
          <span>{floorSyncBanner.message}</span>
        </div>
      ) : null}

      {/* Table Section */}
      {isListLoading ? (
        <div className='flex min-h-[220px] flex-1 flex-col items-center justify-center gap-2 py-12'>
          <span className='text-paragraph-sm text-text-sub-600'>Loading floors…</span>
        </div>
      ) : bodyRows.length === 0 ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-5 py-12'>
          <img className='object-contain max-w-[200px]' src={emptyState} alt='no data' />
          <span className='label-medium text-text-soft-400'>No floors found for this center.</span>
          {canWrite && (
            <Button.Root
              variant='primary'
              mode='solid'
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
        <div className='flex flex-col justify-start items-start gap-4'>
          <div className='flex shrink-0  w-full min-h-0 overflow-auto rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
            <Table.Root variant={tableVariant}>
              <Table.Header>
                <Table.Row>
                  {headColumns.map((item, index) => (
                    <Table.Head
                      key={item || 'actions'}
                      className={
                        index === headColumns.length - 1 ? 'sticky right-0 z-20 bg-bg-weak-50' : ''
                      }
                    >
                      {item}
                    </Table.Head>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {bodyRows?.length > 0 &&
                  bodyRows?.map((item, index) => {
                    // Ensure we have a valid ID for comparison
                    const rowId = item.id;
                    const isNewRow = item.isNew === true;
                    const isEditingRow =
                      !item.isNew && editingRow !== null && String(editingRow) === String(rowId);

                    return (
                      <Table.Row
                        className={`group/row paragraph-small ${index === bodyRows.length - 1 ? 'border-b-0' : 'border-b border-stroke-soft-200'} text-text-main-900`}
                        key={item.id}
                      >
                        <Table.Cell>
                          {isNewRow || isEditingRow ? (
                            <Input.Root
                              variant='borderless'
                              size='small'
                              className='w-full'
                              noRing={true}
                            >
                              <Input.Wrapper className='px-0'>
                                <Input.Input
                                  type='text'
                                  placeholder='Block name'
                                  value={item.block || ''}
                                  onChange={(e) =>
                                    handleInputChange(item.id, 'block', e.target.value)
                                  }
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
                            <Input.Root
                              variant='borderless'
                              size='small'
                              className='w-full'
                              noRing={true}
                            >
                              <Input.Wrapper className='px-0'>
                                <Input.Input
                                  type='text'
                                  placeholder='Floor'
                                  value={item.floor || ''}
                                  onChange={(e) =>
                                    handleInputChange(item.id, 'floor', e.target.value)
                                  }
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          ) : (
                            item.floor
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {isNewRow || isEditingRow ? (
                            <Input.Root
                              variant='borderless'
                              size='small'
                              className='w-full'
                              noRing={true}
                            >
                              <Input.Wrapper className='px-0'>
                                <Input.Input
                                  type='text'
                                  placeholder='Carpet area'
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
                            <Input.Root
                              variant='borderless'
                              size='small'
                              className='w-full'
                              noRing={true}
                            >
                              <Input.Wrapper className='px-0'>
                                <Input.Input
                                  type='text'
                                  placeholder='Floor height'
                                  value={item.floor_height || ''}
                                  onChange={(e) =>
                                    handleInputChange(item.id, 'floor_height', e.target.value)
                                  }
                                />
                                <Input.Affix>ft</Input.Affix>
                              </Input.Wrapper>
                            </Input.Root>
                          ) : (
                            item.floor_height
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <Switch.Root
                            checked={Boolean(item.has_parking)}
                            disabled={(!isNewRow && !isEditingRow) || !canWrite}
                            className={cn(
                              !isNewRow &&
                                !isEditingRow &&
                                Boolean(item.has_parking) &&
                                '[&>div]:!bg-green-500 [&>div]:!ring-1 [&>div]:!ring-inset [&>div]:!ring-green-600/25',
                            )}
                            onCheckedChange={(checked) => handleHasParkingChange(item.id, checked)}
                          />
                        </Table.Cell>

                        {canSeeLayout ? (
                          <Table.Cell>
                            <div className='relative flex min-h-9 w-full max-w-[140px] flex-col items-stretch gap-1'>
                              {getLayoutImageUrlForRow(item) ? (
                                <div className='relative h-9 w-full overflow-hidden rounded border border-stroke-soft-200'>
                                  <button
                                    type='button'
                                    className='block h-full w-full cursor-zoom-in p-0 text-left'
                                    onClick={() => openLayoutImagePreview(item)}
                                    aria-label='Open layout preview'
                                  >
                                    <img
                                      className='pointer-events-none h-full w-full object-cover'
                                      alt=''
                                      src={toAssetUrl(getLayoutImageUrlForRow(item))}
                                    />
                                  </button>
                                </div>
                              ) : null}

                              {layoutRemovingRowId === item.id ? (
                                <span className='text-paragraph-xs text-text-sub-600'>
                                  Removing...
                                </span>
                              ) : null}

                              {(item?.attachments?.length ?? 0) === 0 && (
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='stroke'
                                  size='xsmall'
                                  className='gap-2'
                                  disabled={!canSeeLayout || layoutUploadingRowId === item.id}
                                  onClick={() => pickLayoutFileForRow(item.id)}
                                >
                                  <Button.Icon className='w-4' as={RiUploadLine} />
                                  {layoutUploadingRowId === item.id
                                    ? 'Uploading...'
                                    : item.pendingLayoutFileName
                                      ? 'Change layout'
                                      : 'Upload'}
                                </Button.Root>
                              )}
                              {isNewRow && item.pendingLayoutFileName ? (
                                <span className='max-w-[160px] truncate text-paragraph-xs text-text-sub-600'>
                                  {item.pendingLayoutFileName}
                                </span>
                              ) : null}
                            </div>
                          </Table.Cell>
                        ) : null}

                        <Table.Cell className='border-stroke-soft-200 sticky right-0 z-20 bg-white'>
                          <div className='flex items-center justify-end gap-1'>
                            {isNewRow ? (
                              <>
                                {canWrite && (
                                  <Button.Root
                                    type='button'
                                    variant='neutral'
                                    mode='ghost'
                                    size='xsmall'
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
                                    onClick={() => handleSaveNewRow(item.id)}
                                    className='h-7 w-7'
                                  >
                                    <Button.Icon as={RiCheckLine} className='text-green-500' />
                                  </Button.Root>
                                )}
                              </>
                            ) : isEditingRow ? (
                              <>
                                {syncingFloorRowId === item.id ? (
                                  <span className='text-paragraph-xs text-text-sub-600 px-1'>
                                    Updating…
                                  </span>
                                ) : null}
                                {canWrite && (
                                  <Button.Root
                                    type='button'
                                    variant='neutral'
                                    mode='ghost'
                                    size='xsmall'
                                    onClick={() => handleSaveRow(item.id)}
                                    disabled={syncingFloorRowId === item.id}
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
                                    onClick={() => handleCancelEdit(item.id)}
                                    className='h-7 w-7'
                                  >
                                    <Button.Icon as={RiCloseLine} className='text-red-500' />
                                  </Button.Root>
                                )}
                              </>
                            ) : (
                              <>
                                {hasVmsUser(item) ? (
                                  <Tooltip.Root size='xsmall'>
                                    <Tooltip.Trigger asChild>
                                      <Button.Root
                                        type='button'
                                        variant='neutral'
                                        mode='ghost'
                                        size='small'
                                        onClick={() => handleVmsLoginClick(item)}
                                        className='h-7 w-7 opacity-0 group-hover/row:opacity-100 transition-opacity'
                                        aria-label='Floor login credentials'
                                      >
                                        <Button.Icon as={RiLockLine} />
                                      </Button.Root>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content
                                      size='xsmall'
                                      className='max-w-[220px] text-center'
                                    >
                                      Floor login credentials — this user can access only this floor
                                      on the facility tablet
                                    </Tooltip.Content>
                                  </Tooltip.Root>
                                ) : (
                                  <Tooltip.Root size='xsmall'>
                                    <Tooltip.Trigger asChild>
                                      <Button.Root
                                        variant='neutral'
                                        mode='ghost'
                                        onClick={() => {
                                          setVmsScope('floor');
                                          setSelectedFloorForVms(item);
                                          setIsCreateUserModalOpen(true);
                                        }}
                                        className='h-7 w-7 opacity-0 group-hover/row:opacity-100 transition-opacity'
                                        aria-label='Create floor login user'
                                      >
                                        <Button.Icon as={RiAddLine} />
                                      </Button.Root>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content
                                      size='xsmall'
                                      className='max-w-[220px] text-center'
                                    >
                                      Create floor login user — access only this floor on the
                                      facility tablet
                                    </Tooltip.Content>
                                  </Tooltip.Root>
                                )}

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
          <LinkButton.Root
            variant='primary'
            // mode='ghost'
            size='small'
            onClick={() => handleAddNewFloor()}
            className='w-full justify-start'
          >
            <RiAddLine className='w-4 h-4' />
            Add New Floor
          </LinkButton.Root>
        </div>
      )}

      <input
        ref={layoutFileInputRef}
        type='file'
        accept='image/jpeg,image/png,image/webp,application/pdf,.pdf'
        className='hidden'
        onChange={handleLayoutFileChange}
      />

      {/* Delete Confirmation Modal */}
      <ImagePreview
        open={layoutPreviewOpen}
        onClose={closeLayoutImagePreview}
        images={layoutPreviewImages}
        initialIndex={0}
        onUpdate={canSeeLayout ? handlePreviewUpdateLayout : undefined}
        onRemove={canSeeLayout ? handlePreviewRemoveLayout : undefined}
        isUpdateDisabled={layoutUploadingRowId != null || layoutRemovingRowId != null}
        isRemoveDisabled={layoutRemovingRowId != null || layoutUploadingRowId != null}
      />

      <Modal.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Modal.Content className='max-w-[450px]'>
          <Modal.Header
            variant='default'
            icon={
              <span className='p-2 bg-warning-base/10 items-center rounded-lg'>
                <RiAlertFill size={24} className='text-warning-base' />
              </span>
            }
            title={`Remove ${floorToDelete?.floor || 'Floor'} Floor?`}
            description='Are you sure you want to remove this floor?'
          />
          {/* <Modal.Body>
            <div className='flex flex-col gap-3'>
              {hasRelatedSpaces && (
                <>
                  <div className='flex items-start gap-2 rounded-lg  '>
                    <RiInformationLine size={16} className='text-warning-base mt-0.5 shrink-0' />
                    <p className='text-paragraph-sm text-text-sub-600'>
                      Deleting this floor may impact related modules listed below. Proceed with
                      caution.
                    </p>
                  </div>

                  <div className='flex items-center gap-2 rounded-lg bg-warning-base/5 p-2'>
                    <RiLayoutGridLine size={16} className='text-text-sub-500' />
                    <span className='text-paragraph-sm text-text-main-900'>Spaces</span>
                  </div>
                </>
              )}
            </div>
          </Modal.Body> */}
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
              Confirm
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <RemoveFloorLayoutModal
        open={isRemoveLayoutModalOpen}
        onOpenChange={(open) => {
          setIsRemoveLayoutModalOpen(open);
          if (!open) setLayoutToRemove(null);
        }}
        onConfirm={handleConfirmRemoveLayout}
        isRemoving={layoutRemovingRowId != null}
      />

      <UpdateFloorLayoutModal
        open={isUpdateLayoutModalOpen}
        onOpenChange={(open) => {
          setIsUpdateLayoutModalOpen(open);
          if (!open && layoutUploadRowId == null) setLayoutPreviewItem(null);
        }}
        onConfirm={handleConfirmUpdateLayout}
        isUpdating={layoutUploadingRowId != null}
      />

      <Modal.Root open={icCreateUserModalOpen} onOpenChange={setIsCreateUserModalOpen}>
        <Modal.Content className='max-w-[440px] p-6'>
          <Modal.Header
            variant='center'
            icon={<RiUserLine size={24} className='text-text-sub-500 mt-1' />}
            title={vmsScope === 'center' ? 'Create Center User' : 'Create User'}
            description={
              vmsScope === 'center'
                ? 'Create a center login user with access to all floors on the facility tablet?'
                : 'Are you sure you want to create a new floor login user?'
            }
          />
          <Modal.Footer>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => setIsCreateUserModalOpen(false)}
              disabled={isCreatingUser}
              className='w-full'
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              onClick={handleCreateUser}
              disabled={isCreatingUser}
              className='w-full'
            >
              {isCreatingUser ? 'Creating…' : 'Create'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      {/* VMS Login / Reset Passcode Modal */}
      <Modal.Root open={isVmsModalOpen} onOpenChange={setIsVmsModalOpen}>
        <Modal.Content className='max-w-[400px] p-6'>
          {/* Avatar Header */}
          <div className='flex flex-col items-center justify-center w-full mb-6 mt-4'>
            <div className='flex items-center justify-center w-20 h-20 rounded-full bg-bg-weak-50 border border-stroke-soft-200'>
              <div className='flex items-center justify-center w-14 h-14 rounded-full bg-white border border-stroke-soft-200 shadow-sm'>
                <RiUserLine size={24} className='text-text-sub-500' />
              </div>
            </div>
            <h3 className='text-title-h6 text-text-strong-950 mt-4 text-center'>
              {isVmsResetMode
                ? 'Generate Passcode'
                : vmsScope === 'center'
                  ? 'Center Login Credentials'
                  : 'VMS Login Credentials'}
            </h3>
            {vmsScope === 'center' && !isVmsResetMode ? (
              <p className='text-paragraph-sm text-text-sub-500 mt-1 text-center px-2'>
                This user can view tasks across all floors for this center.
              </p>
            ) : null}
          </div>

          <div className='flex flex-col gap-5 mb-6'>
            <div className='w-full space-y-1'>
              <p className='text-text-main-900 text-sm ml-1'>
                User ID -{' '}
                <span className='text-text-strong-950 text-paragraph-md font-bold'>
                  {getVmsUserDisplayLabel(
                    vmsScope === 'center' ? centerVmsSource : selectedFloorForVms,
                  )}
                </span>
              </p>
            </div>

            {/* Passcode / New Passcode Field */}
            <div className='w-full space-y-1.5'>
              <div className='flex items-center justify-between w-full'>
                <label className='text-text-main-900 text-sm ml-1'>
                  {isVmsResetMode ? 'New Passcode' : 'Passcode'}
                </label>
                <button
                  type='button'
                  onClick={() => setShowPasscode(!showPasscode)}
                  className='text-text-sub-500 hover:text-text-main-900 transition-colors'
                  title={showPasscode ? 'Hide Passcode' : 'Show Passcode'}
                >
                  {showPasscode ? <RiEyeLine size={18} /> : <RiEyeCloseLine size={18} />}
                </button>
              </div>

              {isVmsResetMode
                ? renderPasscodeInputs(
                    toPasscodeDigits(watchedNewPasscode),
                    (digits) =>
                      setPasscodeResetValue('newPasscode', digits.join(''), {
                        shouldDirty: true,
                        shouldValidate: false,
                      }),
                    false,
                    Boolean(passcodeResetErrors.newPasscode),
                  )
                : renderPasscodeInputs(displayPasscode, () => {}, true)}
              {isVmsResetMode && passcodeResetErrors.newPasscode && (
                <ErrorText>{passcodeResetErrors.newPasscode.message}</ErrorText>
              )}
            </div>

            {/* Confirm Passcode Field (Only shown in Reset Mode) */}
            {isVmsResetMode && (
              <div className='w-full space-y-1.5'>
                <label className='text-text-main-900 text-sm ml-1'>Confirm Passcode</label>
                {renderPasscodeInputs(
                  toPasscodeDigits(watchedConfirmPasscode),
                  (digits) =>
                    setPasscodeResetValue('confirmPasscode', digits.join(''), {
                      shouldDirty: true,
                      shouldValidate: false,
                    }),
                  false,
                  Boolean(passcodeResetErrors.confirmPasscode),
                )}
                {passcodeResetErrors.confirmPasscode && (
                  <ErrorText>{passcodeResetErrors.confirmPasscode.message}</ErrorText>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className='w-full mt-6'>
            {isVmsResetMode ? (
              <div className='flex gap-3 w-full'>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='medium'
                  onClick={async () => {
                    setIsVmsResetMode(false);
                    resetPasscodeForm({ newPasscode: '', confirmPasscode: '' });
                    setDisplayPasscode(
                      await fetchVmsPasscode(
                        selectedFloorForVms,
                        vmsScope === 'center' ? 'center' : 'floor',
                      ),
                    );
                  }}
                  className='w-full'
                >
                  Cancel
                </Button.Root>
                <Button.Root
                  type='button'
                  variant='primary'
                  size='medium'
                  onClick={handleSavePasscode}
                  disabled={!canSavePasscodeReset}
                  className='w-full'
                >
                  Save
                </Button.Root>
              </div>
            ) : (
              <Button.Root
                type='button'
                variant='primary'
                size='medium'
                onClick={() => setIsVmsResetMode(true)}
                className='w-full'
              >
                Reset Passcode
              </Button.Root>
            )}
          </div>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
};

export default CenterDetailFloors;
