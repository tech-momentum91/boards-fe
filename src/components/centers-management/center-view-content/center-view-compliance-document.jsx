import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { hasModulePermission } from '@/utils/user-role-utils';
import emptyState from '@/assets/images/empty-state.png';
import CenterViewCommonLayout from '@/components/centers-management/center-view-content/center-view-common-layout';
import * as Button from '@/components/ui/button';
import * as Table from '@/components/ui/table';
import * as Modal from '@/components/ui/modal';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import CenterDocumentTypeSelect from '@/components/centers-management/center-view-content/center-document-type-select';
import * as FileUpload from '@/components/ui/file-upload';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import * as Input from '@/components/ui/input';
import * as Badge from '@/components/ui/badge';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import * as Filter from '@/components/ui/filter';
import { useTableVariant } from '@/hooks/use-table-variant';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { Datepicker } from '@/components/ui/datepicker';
import {
  RiAddLine,
  RiErrorWarningFill,
  RiFileLine,
  RiUploadLine,
  RiPencilLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiAlertFill,
  RiFile2Line,
  RiArrowUpDownLine,
} from 'react-icons/ri';
import CenterViewDocumentFilterDropdown from '@/components/centers-management/center-view-content/center-view-document-filter-dropdown';
import {
  CENTER_DETAIL_DOCUMENT_TAB_FILTER_DEFAULTS,
  CENTER_DETAIL_DOCUMENT_TAB_PERSIST_INCLUDE_KEYS,
  CENTER_DETAIL_DOCUMENT_TAB_PERSIST_TRUTHY_OBJECT_KEYS,
  compactCenterDetailDocumentTabFiltersForStorage,
  mergeStoredCenterDetailDocumentTabFilters,
  DOCUMENT_TYPE_CATEGORY_ORDER,
} from '@/components/centers-management/constants';
import {
  getCenterDetailsThunk,
  setAddComplianceDocumentModal,
  setEditComplianceDocumentModal,
  setRemoveComplianceDocumentModal,
  updateCenterThunk,
  uploadBuildingDetailsThunk,
  fetchCenterDocumentTypesThunk,
  fetchCenterBuildingDocumentsThunk,
} from '@/redux/centerSlice';
import {
  convertYYYYMMDDToDDMMYYYY,
  parseDDMMYYYYToTimestamp,
  formatTimestampToDDMMYYYY,
  formatTimestampToYYYYMMDD,
  parseToDate,
  formatDateWithOrdinal,
} from '@/utils/date-utils';
import { format } from 'date-fns';

/** Per-center sessionStorage key for the Document tab filter dropdown. */
const CENTER_DETAIL_DOCUMENT_VIEW_FILTERS_KEY = 'center-detail-document-view-filter-dropdown';

/**
 * Set of document `status` values recognized by the badge color helper. Used
 * to seed the Status filter even before any rows are loaded so the user
 * sees a stable list of choices.
 */
const KNOWN_DOCUMENT_STATUSES = ['Valid', 'To Be Expired', 'Expired'];

const computeDocumentFilterCount = (filters) => {
  if (!filters || typeof filters !== 'object') return 0;
  const docTypeCount = Array.isArray(filters.documentType) ? filters.documentType.length : 0;
  const statusCount = Array.isArray(filters.status) ? filters.status.length : 0;
  const expiryCount = filters.expiryDateFrom || filters.expiryDateTo ? 1 : 0;
  return docTypeCount + statusCount + expiryCount;
};

// Helper functions to convert between Date objects and DD/MM/YYYY strings
const parseDDMMYYYYToDate = (dateString) => {
  if (!dateString) return undefined;
  const timestamp = parseDDMMYYYYToTimestamp(dateString);
  return timestamp ? new Date(timestamp) : undefined;
};

const formatDateToDDMMYYYY = (date) => {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return formatTimestampToDDMMYYYY(date.getTime());
};

// Helper function to map status to badge color
const getStatusVariant = (status) => {
  if (!status) return 'disabled';

  const normalized = String(status).toLowerCase().trim().replaceAll(' ', '_');
  return (
    {
      valid: 'green',
      invalid: 'red',
      expired: 'red',
      to_be_expired: 'orange',
    }[normalized] || 'disabled'
  );
};

// Helper function to format date as "25th dec" (day with ordinal, lowercase month, no year)
const formatDateWithOrdinalNoYear = (input) => {
  const date = parseToDate(input);
  if (!date) return '--';

  const day = date.getDate();
  const month = format(date, 'MMM').toLowerCase();
  const ordinalSuffix =
    day % 10 === 1 && day % 100 !== 11
      ? 'st'
      : day % 10 === 2 && day % 100 !== 12
        ? 'nd'
        : day % 10 === 3 && day % 100 !== 13
          ? 'rd'
          : 'th';

  return `${day}${ordinalSuffix} ${month}`;
};

// Helper function to format date as "12th Sep 25" (day with ordinal, month abbreviation, 2-digit year)
const formatDocumentExpiryDate = (input) => {
  if (!input) return '--';
  const date = parseToDate(input);
  if (!date) return String(input);
  const day = date.getDate();
  const month = format(date, 'MMM');
  const year = format(date, 'yy');
  const ordinalSuffix =
    day % 10 === 1 && day % 100 !== 11
      ? 'st'
      : day % 10 === 2 && day % 100 !== 12
        ? 'nd'
        : day % 10 === 3 && day % 100 !== 13
          ? 'rd'
          : 'th';
  const paddedDay = day < 10 ? `0${day}` : `${day}`;
  return `${paddedDay}${ordinalSuffix} ${month} ${year}`;
};

// Helper function to truncate file names
const truncateFileName = (fileName, maxLength = 30) => {
  if (!fileName) return '';
  if (fileName.length <= maxLength) return fileName;
  return `${fileName.slice(0, maxLength)}...`;
};

import {
  addComplianceDocumentSchema,
  editComplianceDocumentSchema,
} from '@/schemas/compliance-document-schemas';

/** Matches Document Types > document_category select options (display order). */

const UNCATEGORIZED_DOCUMENT_TYPE_GROUP = 'Other';

function groupCenterDocumentTypes(documentTypes) {
  if (!Array.isArray(documentTypes) || documentTypes.length === 0) return [];

  const byCategory = new Map();
  for (const type of documentTypes) {
    const raw = (type.document_category || '').trim();
    const category = raw || UNCATEGORIZED_DOCUMENT_TYPE_GROUP;
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(type);
  }

  for (const types of byCategory.values()) {
    types.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }

  const groups = [];
  const seen = new Set();

  for (const category of DOCUMENT_TYPE_CATEGORY_ORDER) {
    const types = byCategory.get(category);
    if (types?.length) {
      groups.push({ label: category, value: category, types });
      seen.add(category);
    }
  }

  const remaining = [...byCategory.keys()]
    .filter((c) => !seen.has(c))
    .sort((a, b) => a.localeCompare(b));
  for (const category of remaining) {
    groups.push({ label: category, value: category, types: byCategory.get(category) });
  }

  return groups;
}

const AddComplianceDocumentModal = ({ isOpen, onOpenChange, handleSave }) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const [otherSelected, setOtherSelected] = useState(false);

  // Get document types from Redux
  const { data: documentTypes, isLoading: isLoadingDocumentTypes } = useSelector(
    (state) => state.center.documentTypes,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(addComplianceDocumentSchema),
    defaultValues: {
      documentType: '',
      expiryDate: '',
      file: null,
      otherDocumentType: '',
      otherType: '',
    },
  });

  const selectedDocumentType = watch('documentType');

  // Fetch document types when modal opens (includes document_category for grouped dropdown)
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchCenterDocumentTypesThunk());
    }
  }, [isOpen, dispatch]);

  // Get selected document type's has_expiry value
  const selectedDocumentTypeData = documentTypes.find((type) => type.name === selectedDocumentType);
  const requiresExpiry = selectedDocumentTypeData?.has_expiry === 1;

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedFile(null);
      setFileName('');
      setOtherSelected(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, reset]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      setValue('file', file);
      clearErrors('file');
    }
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onSubmit = async (data) => {
    if (!selectedFile) {
      setError('file', { message: 'File is required' });
      return;
    }

    // Validate expiry date if required
    if (requiresExpiry && (!data.expiryDate || !data.expiryDate.trim())) {
      setError('expiryDate', { message: 'Expiry Date is required' });
      return;
    }

    // Validate expiry date format if provided
    if (data.expiryDate && data.expiryDate.trim()) {
      const timestamp = parseDDMMYYYYToTimestamp(data.expiryDate);
      if (timestamp === null) {
        setError('expiryDate', { message: 'Date must be in DD/MM/YYYY format' });
        return;
      }
    }

    const isOtherType = data.documentType === 'Other';
    const resolvedDocumentType = data.documentType; // keep the select value (e.g., "Other")
    const otherTypeValue = isOtherType ? data.otherDocumentType?.trim() : undefined;

    if (handleSave) {
      // Convert DD/MM/YYYY to timestamp for API (only if provided)
      const expiryTimestamp =
        data.expiryDate && data.expiryDate.trim()
          ? parseDDMMYYYYToTimestamp(data.expiryDate)
          : null;
      handleSave({
        ...data,
        documentType: resolvedDocumentType,
        otherType: otherTypeValue,
        expiryDate: expiryTimestamp,
        file: selectedFile,
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onOpenChange(false);
      reset();
      setSelectedFile(null);
      setFileName('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    reset();
    setSelectedFile(null);
    setFileName('');
    setOtherSelected(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiFileLine}
          title='Add Compliance Document'
          description='Enter below document details.'
        />
        <Modal.Body>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col gap-4'>
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Document Type
                <Label.Asterisk />
              </Label.Root>
              <CenterDocumentTypeSelect
                documentTypes={documentTypes}
                value={selectedDocumentType}
                onChange={(value) => {
                  setValue('documentType', value);
                  setValue('expiryDate', '');
                  clearErrors('expiryDate');
                  if (value === 'Other') {
                    setOtherSelected(true);
                    clearErrors('otherDocumentType');
                  } else {
                    setValue('otherDocumentType', '');
                    clearErrors('otherDocumentType');
                    setOtherSelected(false);
                  }
                }}
                isLoading={isLoadingDocumentTypes}
                hasError={Boolean(errors.documentType)}
                disabled={isLoading}
              />
              {errors.documentType && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.documentType.message}
                </Hint.Root>
              )}
            </div>

            {otherSelected && (
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  Other Type
                  <Label.Asterisk />
                </Label.Root>
                <Input.Root
                  size='medium'
                  className='w-full'
                  hasError={Boolean(errors.otherDocumentType)}
                >
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      placeholder='Enter other document type'
                      {...register('otherDocumentType')}
                      disabled={isLoading}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {errors.otherDocumentType && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.otherDocumentType.message}
                  </Hint.Root>
                )}
              </div>
            )}

            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                File Upload
                <Label.Asterisk />
              </Label.Root>
              <input
                type='file'
                ref={fileInputRef}
                accept='.pdf,.doc,.docx,.jpg,.jpeg,.png'
                className='hidden'
                onChange={handleFileChange}
                disabled={isLoading}
              />
              <FileUpload.Root
                onClick={handleFileUploadClick}
                className={errors.file ? 'border-error-base' : ''}
              >
                <FileUpload.Icon as={RiUploadLine} />
                <div className='flex flex-col items-center gap-2'>
                  <FileUpload.Button>
                    {truncateFileName(fileName) || 'Choose file or drag & drop'}
                  </FileUpload.Button>
                  <span className='text-paragraph-xs text-text-sub-600'>
                    PDF, DOC, DOCX, JPG, PNG up to 10 MB
                  </span>
                </div>
              </FileUpload.Root>
              {errors.file && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.file.message}
                </Hint.Root>
              )}
              {fileName && !errors.file && (
                <span className='paragraph-small text-text-sub-600'>
                  {truncateFileName(fileName)}
                </span>
              )}
            </div>

            {requiresExpiry && (
              <div className='w-full flex  flex-col gap-2'>
                <Label.Root>
                  Expiry Date
                  <Label.Asterisk />
                </Label.Root>
                <div
                  className={`border rounded-lg ring-0.5 ring-inset transition-colors ${
                    errors.expiryDate
                      ? 'border-error-base ring-error-base focus-within:ring-error-base focus-within:border-error-base'
                      : 'border-stroke-soft-200 ring-stroke-soft-200 focus-within:ring-1 focus-within:ring-primary-base focus-within:border-primary-base'
                  }`}
                >
                  <Datepicker
                    value={parseDDMMYYYYToDate(watch('expiryDate'))}
                    onChange={(date) => {
                      const dateString = formatDateToDDMMYYYY(date);
                      setValue('expiryDate', dateString, { shouldValidate: true });
                    }}
                    placeholder='Select expiry date'
                    hasError={Boolean(errors.expiryDate)}
                    disabled={isLoading}
                    size='medium'
                  />
                </div>
                {errors.expiryDate && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.expiryDate.message}
                  </Hint.Root>
                )}
              </div>
            )}
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            onClick={handleCancel}
            className='w-full'
            disabled={isLoading}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            onClick={handleSubmit(onSubmit)}
            className='w-full'
            disabled={isLoading}
          >
            {isLoading ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                Uploading...
              </span>
            ) : (
              'Add Document'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

const RemoveComplianceDocumentModal = ({
  isOpen,
  onOpenChange,
  selectedDocument,
  handleConfirm,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async () => {
    if (!selectedDocument) {
      return;
    }

    setIsLoading(true);
    try {
      if (handleConfirm) {
        await handleConfirm(selectedDocument);
      }
    } catch {
      // Error handling is done in handleConfirm
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[500px]'>
        <Modal.Header
          variant='center'
          icon={
            <span className='p-2 bg-warning-base/10 rounded-lg'>
              <RiAlertFill size={24} className='text-warning-base' />
            </span>
          }
          title='Remove Compliance Document?'
          description='Are you sure you want to remove this compliance document?'
        />
        <Modal.Footer>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => onOpenChange(false)}
            className='w-full'
            disabled={isLoading}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            onClick={onSubmit}
            disabled={isLoading}
            className='w-full'
          >
            {isLoading ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                Removing...
              </span>
            ) : (
              'Remove'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

const EditComplianceDocumentModal = ({
  isOpen,
  onOpenChange,
  handleSave,
  selectedDocument,
  buildingDetails,
}) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [existingFileName, setExistingFileName] = useState('');
  const fileInputRef = useRef(null);

  const [otherSelected, setOtherSelected] = useState(false);

  const { data: centerDetails } = useSelector((state) => state.center.centerDetails);

  // Get document types from Redux
  const { data: documentTypes, isLoading: isLoadingDocumentTypes } = useSelector(
    (state) => state.center.documentTypes,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    clearErrors,
    setError,
  } = useForm({
    resolver: zodResolver(editComplianceDocumentSchema),
    defaultValues: {
      documentType: selectedDocument?.document_type,
      expiryDate: selectedDocument?.expiry_date,
      file: selectedDocument?.file_name || '',
      otherDocumentType: '',
      otherType: '',
    },
  });

  const selectedDocumentType = watch('documentType');

  // Fetch document types when modal opens (includes document_category for grouped dropdown)
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchCenterDocumentTypesThunk());
    }
  }, [isOpen, dispatch]);

  // Get selected document type's has_expiry value
  const selectedDocumentTypeData = documentTypes.find((type) => type.name === selectedDocumentType);
  const requiresExpiry = selectedDocumentTypeData?.has_expiry === 1;

  // Populate form when document data changes
  useEffect(() => {
    if (selectedDocument && isOpen) {
      // Handle expiry date - could be timestamp, YYYY-MM-DD string, or already DD/MM/YYYY
      let expiryDateString = '';
      if (selectedDocument.expiry_date) {
        if (typeof selectedDocument.expiry_date === 'number') {
          // It's a timestamp
          expiryDateString = formatTimestampToDDMMYYYY(selectedDocument.expiry_date);
        } else if (typeof selectedDocument.expiry_date === 'string') {
          // Check if it's YYYY-MM-DD format
          if (selectedDocument.expiry_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            expiryDateString = convertYYYYMMDDToDDMMYYYY(selectedDocument.expiry_date);
          } else if (selectedDocument.expiry_date.match(/^(?:\d{2}\/){2}\d{4}$/)) {
            // Already in DD/MM/YYYY format
            expiryDateString = selectedDocument.expiry_date;
          } else {
            // Try to parse it as a date and convert
            const parsedDate = parseToDate(selectedDocument.expiry_date);
            if (parsedDate) {
              expiryDateString = formatTimestampToDDMMYYYY(parsedDate.getTime());
            }
          }
        }
      }
      const isOtherType = selectedDocument?.document_type === 'Other';
      const otherTypeValue = selectedDocument?.other_type || '';

      reset({
        documentType: selectedDocument?.document_type || '',
        expiryDate: expiryDateString,
        file: selectedDocument?.document_file || null,
        otherDocumentType: otherTypeValue,
        otherType: otherTypeValue,
      });
      setOtherSelected(isOtherType);
      setExistingFileName(selectedDocument?.document_file || '');
      setSelectedFile(selectedDocument?.document_file || null);
      setFileName(selectedDocument?.file_name || '');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [selectedDocument, buildingDetails, isOpen, reset]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedFile(null);
      setFileName('');
      setExistingFileName('');
      setOtherSelected(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, reset]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      setValue('file', file);
      clearErrors('file');
    }
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onSubmit = async (data) => {
    // Validate expiry date if required

    if (requiresExpiry && (!data.expiryDate || !data.expiryDate.trim())) {
      setError('expiryDate', { message: 'Expiry Date is required' });
      return;
    }

    // Validate expiry date format if provided
    if (data.expiryDate && data.expiryDate.trim()) {
      const timestamp = parseDDMMYYYYToTimestamp(data.expiryDate);
      if (timestamp === null) {
        setError('expiryDate', { message: 'Date must be in DD/MM/YYYY format' });
        return;
      }
    }

    if (handleSave) {
      setIsLoading(true);
      try {
        const isOtherType = data.documentType === 'Other';
        const resolvedDocumentType = data.documentType;
        const otherTypeValue = isOtherType ? data.otherDocumentType?.trim() : undefined;

        // Convert DD/MM/YYYY to timestamp for API (only if provided)
        const expiryTimestamp =
          data.expiryDate && data.expiryDate.trim()
            ? parseDDMMYYYYToTimestamp(data.expiryDate)
            : null;

        const payload = {
          ...data,
          documentType: resolvedDocumentType,
          otherType: otherTypeValue,
          expiry_date: expiryTimestamp,
        };

        await handleSave(payload);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update compliance document.' });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      onOpenChange(false);
      reset();
      setSelectedFile(null);
      setFileName('');
      setExistingFileName('');
      setOtherSelected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    reset();
    setSelectedFile(null);
    setFileName('');
    setExistingFileName('');
    setOtherSelected(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiFileLine}
          title='Edit Compliance Document'
          description='Edit below document details.'
        />
        <Modal.Body>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col gap-4'>
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Document Type
                <Label.Asterisk />
              </Label.Root>
              <CenterDocumentTypeSelect
                documentTypes={documentTypes}
                value={selectedDocumentType}
                onChange={(value) => {
                  setValue('documentType', value);
                  setValue('expiryDate', '');
                  clearErrors('expiryDate');
                  if (value === 'Other') {
                    setOtherSelected(true);
                    clearErrors('otherDocumentType');
                  } else {
                    setValue('otherDocumentType', '');
                    clearErrors('otherDocumentType');
                    setOtherSelected(false);
                  }
                }}
                isLoading={isLoadingDocumentTypes}
                hasError={Boolean(errors.documentType)}
                disabled={isLoading}
              />
              {errors.documentType && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.documentType.message}
                </Hint.Root>
              )}
            </div>

            {otherSelected && (
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  Other Type
                  <Label.Asterisk />
                </Label.Root>
                <Input.Root
                  size='medium'
                  className='w-full'
                  hasError={Boolean(errors.otherDocumentType)}
                >
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      placeholder='Enter other document type'
                      {...register('otherDocumentType')}
                      disabled={isLoading}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {errors.otherDocumentType && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.otherDocumentType.message}
                  </Hint.Root>
                )}
              </div>
            )}

            <div className='w-full flex flex-col gap-2'>
              <Label.Root>File Upload</Label.Root>
              <input
                type='file'
                ref={fileInputRef}
                accept='.pdf,.doc,.docx,.jpg,.jpeg,.png'
                className='hidden'
                onChange={handleFileChange}
                disabled={isLoading}
              />
              <FileUpload.Root
                onClick={handleFileUploadClick}
                className={errors.file ? 'border-error-base' : ''}
              >
                <FileUpload.Icon as={RiUploadLine} />
                <div className='flex flex-col items-center gap-2'>
                  <FileUpload.Button>
                    {truncateFileName(fileName || existingFileName) || 'Choose file or drag & drop'}
                  </FileUpload.Button>
                  <span className='text-paragraph-xs text-text-sub-600'>
                    PDF, DOC, DOCX, JPG, PNG up to 10 MB
                  </span>
                </div>
              </FileUpload.Root>
              {errors.file && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.file.message}
                </Hint.Root>
              )}
              {(fileName || existingFileName) && !errors.file && (
                <span className='paragraph-small text-text-sub-600'>
                  {truncateFileName(fileName || existingFileName)}
                </span>
              )}
            </div>

            {requiresExpiry && (
              <div className='w-full flex  flex-col gap-2'>
                <Label.Root>
                  Expiry Date
                  <Label.Asterisk />
                </Label.Root>
                <div
                  className={`border rounded-lg ring-0.5 ring-inset transition-colors ${
                    errors.expiryDate
                      ? 'border-error-base ring-error-base focus-within:ring-error-base focus-within:border-error-base'
                      : 'border-stroke-soft-200 ring-stroke-soft-200 focus-within:ring-1 focus-within:ring-primary-base focus-within:border-primary-base'
                  }`}
                >
                  <Datepicker
                    value={parseDDMMYYYYToDate(watch('expiryDate'))}
                    onChange={(date) => {
                      const dateString = formatDateToDDMMYYYY(date);
                      setValue('expiryDate', dateString, { shouldValidate: true });
                    }}
                    placeholder='Select expiry date'
                    hasError={Boolean(errors.expiryDate)}
                    disabled={isLoading}
                    size='medium'
                  />
                </div>
                {errors.expiryDate && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.expiryDate.message}
                  </Hint.Root>
                )}
              </div>
            )}
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            onClick={handleCancel}
            className='w-full'
            disabled={isLoading}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            onClick={handleSubmit(onSubmit)}
            className='w-full'
            disabled={isLoading}
          >
            {isLoading ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                Updating...
              </span>
            ) : (
              'Update'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

const CenterViewComplianceDocument = () => {
  const dispatch = useDispatch();
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const { isOpen: isAddComplianceDocumentModalOpen } = useSelector(
    (state) => state.center.addComplianceDocumentModal,
  );

  const { isOpen: isEditComplianceDocumentModalOpen, selectedDocument } = useSelector(
    (state) => state.center.editComplianceDocumentModal,
  );

  const {
    isOpen: isRemoveComplianceDocumentModalOpen,
    selectedDocument: selectedDocumentToRemove,
  } = useSelector((state) => state.center.removeComplianceDocumentModal);

  const { data: centerDetails } = useSelector((state) => state.center.centerDetails);
  const {
    documents: buildingDocumentsFromApi,
    isLoading: isBuildingDocumentsLoading,
    error: buildingDocumentsError,
  } = useSelector((state) => state.center.centerBuildingDocuments);
  const { data: allDocumentTypes, isLoading: isLoadingDocumentTypes } = useSelector(
    (state) => state.center.documentTypes,
  );

  const canWrite = hasModulePermission(userSideBarPerm, 'Center', 'write');
  const canDelete = hasModulePermission(userSideBarPerm, 'Center', 'delete');

  // Table variant management with localStorage persistence
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'center-view-compliance-document-table',
    'compact',
  );

  // Filter state — popover open state, badge count, and the persisted filter
  // payload (applied via session-storage, scoped per-center).
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const filterDropdownRef = useRef(null);

  const centerIdForSession = centerDetails?.name;

  const [persistedDocFilters, setPersistedDocFilters] = usePersistedFilters({
    storageKey: centerIdForSession
      ? `${CENTER_DETAIL_DOCUMENT_VIEW_FILTERS_KEY}-${centerIdForSession}`
      : null,
    defaultFilters: CENTER_DETAIL_DOCUMENT_TAB_FILTER_DEFAULTS,
    persistIncludeKeys: CENTER_DETAIL_DOCUMENT_TAB_PERSIST_INCLUDE_KEYS,
    persistTrimStringArrays: true,
    persistTruthyObjectKeys: CENTER_DETAIL_DOCUMENT_TAB_PERSIST_TRUTHY_OBJECT_KEYS,
  });

  /**
   * `appliedFilters` is the live UI source of truth; the persistence layer
   * rehydrates it on mount and writes back when it changes.
   */
  const [appliedFilters, setAppliedFilters] = useState(() =>
    mergeStoredCenterDetailDocumentTabFilters(persistedDocFilters),
  );
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Re-merge applied filters whenever the persisted snapshot or center context
  // changes (e.g. user navigates between two centers in the same session).
  useEffect(() => {
    setAppliedFilters(mergeStoredCenterDetailDocumentTabFilters(persistedDocFilters));
    setFiltersInitialized(true);
  }, [persistedDocFilters, centerIdForSession]);

  // Persist applied filters back to session storage when they change.
  useEffect(() => {
    if (!filtersInitialized) return;
    const compact = compactCenterDetailDocumentTabFiltersForStorage(appliedFilters);
    if (JSON.stringify(compact) !== JSON.stringify(persistedDocFilters)) {
      setPersistedDocFilters(compact);
    }
  }, [appliedFilters, filtersInitialized, persistedDocFilters, setPersistedDocFilters]);

  // Keep the trigger badge in sync with the applied filters whenever the
  // popover is closed — the dropdown only updates `filterCount` while it's
  // open.
  useEffect(() => {
    if (!isFilterOpen) {
      setFilterCount(computeDocumentFilterCount(appliedFilters));
    }
  }, [appliedFilters, isFilterOpen]);

  const header_columns = ['Document Type', 'File', 'Expiry Date', 'Status', ''];

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue.trim().toLowerCase());
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const allBuildingRows = centerDetails?.building_details || [];

  // Full Document Types master list (ref_doctype = Center) for the filter dropdown.
  useEffect(() => {
    if (!centerIdForSession) return;
    dispatch(fetchCenterDocumentTypesThunk());
  }, [dispatch, centerIdForSession]);

  const apiFilters = React.useMemo(
    () => ({
      document_type: Array.isArray(appliedFilters.documentType) ? appliedFilters.documentType : [],
      status: Array.isArray(appliedFilters.status) ? appliedFilters.status : [],
      expiry_date_from: appliedFilters.expiryDateFrom || null,
      expiry_date_to: appliedFilters.expiryDateTo || null,
    }),
    [appliedFilters],
  );
  const apiFiltersKey = JSON.stringify(apiFilters);

  const buildingDetailsSignature = React.useMemo(() => {
    if (!Array.isArray(centerDetails?.building_details)) return '';
    return centerDetails.building_details
      .map((r) => r.name || `${r.document_type || ''}-${r.idx ?? ''}`)
      .join('|');
  }, [centerDetails?.building_details]);

  useEffect(() => {
    const cid = centerDetails?.name;
    if (!cid || !filtersInitialized) return;
    if (
      !Array.isArray(centerDetails?.building_details) ||
      centerDetails.building_details.length === 0
    )
      return;

    dispatch(
      fetchCenterBuildingDocumentsThunk({
        center_id: cid,
        keyword: debouncedSearch,
        filters: apiFilters,
      }),
    );
  }, [
    dispatch,
    centerDetails?.name,
    buildingDetailsSignature,
    debouncedSearch,
    apiFiltersKey,
    filtersInitialized,
  ]);

  /** List rows from server (keyword + filter-dropdown applied in API). */
  const documentRows = buildingDocumentsFromApi;

  /** Document-type options — full Document Types master + any custom values on rows. */
  const documentTypeOptions = React.useMemo(() => {
    const byValue = new Map();

    (allDocumentTypes || []).forEach((type) => {
      const value = String(type?.name || '').trim();
      if (value) byValue.set(value, { value, label: value });
    });

    allBuildingRows.forEach((row) => {
      const value = String(row?.other_type || row?.document_type || '').trim();
      if (value && !byValue.has(value)) byValue.set(value, { value, label: value });
    });

    (appliedFilters.documentType || []).forEach((v) => {
      const value = String(v || '').trim();
      if (value && !byValue.has(value)) byValue.set(value, { value, label: value });
    });

    return [...byValue.values()].sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [allDocumentTypes, allBuildingRows, appliedFilters.documentType]);

  /** Status options — known statuses + any extras from center rows. */
  const statusOptions = React.useMemo(() => {
    const set = new Set(KNOWN_DOCUMENT_STATUSES);
    allBuildingRows.forEach((row) => {
      const value = String(row?.status || '').trim();
      if (value) set.add(value);
    });
    (appliedFilters.status || []).forEach((v) => v && set.add(v));
    return [...set].map((value) => ({ value, label: value }));
  }, [allBuildingRows, appliedFilters.status]);

  /**
   * Group document rows for display.
   * Uses backend version/group ID if present (`version_group_id`, `group_id`, `parent_document_id`).
   * For backward compatibility when no backend version group ID exists, groups by Document Type.
   * Latest version is primary; earlier versions are history sub-rows.
   */
  const documentGroups = useMemo(() => {
    if (!Array.isArray(documentRows) || documentRows.length === 0) return [];

    const groupsMap = new Map();

    documentRows.forEach((row) => {
      const backendGroupId =
        row?.version_group_id ||
        row?.version_group ||
        row?.group_id ||
        row?.parent_document_id ||
        row?.parent_document ||
        null;

      const docTypeKey = (
        row?.document_type === 'Other' && row?.other_type
          ? row.other_type
          : row?.document_type || 'Unspecified'
      ).trim();

      const key = backendGroupId ? `version_group:${backendGroupId}` : docTypeKey;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key).push(row);
    });

    const result = [];

    const getValidTimestamp = (dateVal) => {
      if (dateVal === null || dateVal === undefined || dateVal === '') return null;
      if (typeof dateVal === 'number' && Number.isFinite(dateVal)) return dateVal;
      const time = new Date(String(dateVal)).getTime();
      return Number.isFinite(time) ? time : null;
    };

    groupsMap.forEach((rows, docTypeKey) => {
      const sorted = [...rows].sort((a, b) => {
        const timeA = getValidTimestamp(a?.creation);
        const timeB = getValidTimestamp(b?.creation);

        if (timeA !== null && timeB !== null) {
          if (timeA !== timeB) return timeA - timeB;
        } else if (timeA !== null) {
          return 1;
        } else if (timeB !== null) {
          return -1;
        }

        const idxA = typeof a?.idx === 'number' && Number.isFinite(a.idx) ? a.idx : 0;
        const idxB = typeof b?.idx === 'number' && Number.isFinite(b.idx) ? b.idx : 0;

        if (idxA !== idxB) return idxA - idxB;

        const nameA = String(a?.name ?? a?.id ?? '');
        const nameB = String(b?.name ?? b?.id ?? '');
        return nameA.localeCompare(nameB);
      });

      const isSingleRowGroup = sorted.length <= 1;

      const versioned = sorted.map((row, idx) => ({
        ...row,
        versionNumber: idx + 1,
        versionLabel: `V${idx + 1}`,
        isSingleRowGroup,
      }));

      const latestRow = versioned[versioned.length - 1];
      const historyRows = versioned.slice(0, versioned.length - 1).reverse();

      result.push({
        docTypeKey,
        latestRow,
        historyRows,
        allRows: versioned,
      });
    });

    return result;
  }, [documentRows]);

  const hasListQuery = Boolean(debouncedSearch) || computeDocumentFilterCount(appliedFilters) > 0;

  const handleFiltersChange = useCallback((next) => {
    setAppliedFilters((previous) => ({
      ...previous,
      documentType: Array.isArray(next?.documentType) ? next.documentType : [],
      status: Array.isArray(next?.status) ? next.status : [],
      expiryDateFrom: next?.expiryDateFrom || null,
      expiryDateTo: next?.expiryDateTo || null,
    }));
  }, []);

  const handleClearAllFilters = useCallback((event) => {
    event?.stopPropagation?.();
    setAppliedFilters({
      documentType: [],
      status: [],
      expiryDateFrom: null,
      expiryDateTo: null,
    });
    setFilterCount(0);
    setIsFilterOpen(false);
  }, []);

  const handleAddComplianceDocument = async (data) => {
    const formData = new FormData();

    formData.append('center', centerDetails?.name);
    formData.append('document_type', data?.documentType);
    if (data?.otherType) {
      formData.append('other_type', data.otherType);
    }
    formData.append('expiry_date', formatTimestampToYYYYMMDD(data?.expiryDate));
    formData.append('document_file', data?.file);

    try {
      const response = await dispatch(uploadBuildingDetailsThunk(formData)).unwrap();

      const response2 = await dispatch(getCenterDetailsThunk(centerDetails?.name)).unwrap();

      dispatch(setAddComplianceDocumentModal(false));

      showSuccessToast('Compliance document added successfully.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to add compliance document.' });
    }
  };

  const handleEdit = useCallback(
    (document) => {
      dispatch(setEditComplianceDocumentModal({ document }));
    },
    [dispatch],
  );

  const handleRemove = useCallback(
    (document) => {
      dispatch(setRemoveComplianceDocumentModal({ document }));
    },
    [dispatch],
  );

  const handleRemoveConfirm = async (_document) => {
    const existingDocument = centerDetails?.building_details?.filter(
      (item) => item.name !== _document.name,
    );

    const building_details = [];

    for (const item of existingDocument) {
      building_details.push({
        document_type: item.document_type,
        other_doc: '',
        document_file: item.document_file,
        expiry_date: item.expiry_date,
        status: item.status,
      });
    }

    const payload = {
      building_details,
    };

    try {
      const response = await dispatch(
        updateCenterThunk({ center_id: centerDetails?.name, payload }),
      ).unwrap();

      const response2 = await dispatch(getCenterDetailsThunk(centerDetails?.name)).unwrap();

      dispatch(setRemoveComplianceDocumentModal(false));

      showSuccessToast('Compliance document removed successfully.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to remove compliance document.' });
    }
  };

  const handleDownload = useCallback((_document) => {
    // TODO: Implement download functionality
    // Download document: _document
    const link = document.createElement('a');
    link.href = _document?.document_file;
    link.target = '_self';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleEditDocumentSave = useCallback(
    async (_data) => {
      if (!selectedDocument?.name) {
        showErrorToast('Document information not found. Please try again.');
        return;
      }

      try {
        const formData = new FormData();

        formData.append('center', centerDetails?.name);
        formData.append('document_type', _data?.documentType);
        if (_data?.otherType) {
          formData.append('other_type', _data.otherType);
        }

        // Convert expiry date from DD/MM/YYYY to YYYY-MM-DD format
        const expiryTimestamp = parseDDMMYYYYToTimestamp(_data?.expiryDate);
        if (expiryTimestamp) {
          formData.append('expiry_date', formatTimestampToYYYYMMDD(expiryTimestamp));
        }

        // Use new file if uploaded, otherwise use existing file
        const fileToUpload =
          _data?.file instanceof File ? _data.file : selectedDocument?.document_file;
        if (fileToUpload) {
          formData.append('document_file', fileToUpload);
        }

        formData.append('child_row_id', selectedDocument?.name);

        const response = await dispatch(uploadBuildingDetailsThunk(formData)).unwrap();

        // Refresh center details after update
        await dispatch(getCenterDetailsThunk(centerDetails?.name)).unwrap();

        dispatch(setEditComplianceDocumentModal(false));

        showSuccessToast('Compliance document updated successfully.');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update compliance document.' });
      }
    },
    [dispatch, selectedDocument, centerDetails?.name],
  );

  const handleDocumentRowClick = (data) => {
    window.open(data?.document_file, '_blank');
  };

  return (
    <div className='w-full h-full  justify-center gap-[20px]'>
      {allBuildingRows?.length > 0 ? (
        <CenterViewCommonLayout
          title='Search Document'
          Icon={RiFile2Line}
          buttonName='Add Document'
          onButtonClick={() => dispatch(setAddComplianceDocumentModal(true))}
          showButton={allBuildingRows.length === 0 ? false : true}
          headerActions={
            <div className='flex items-center gap-3'>
              <Popover.Root
                open={isFilterOpen}
                onOpenChange={(nextOpen) => {
                  const wasOpen = isFilterOpen;
                  setIsFilterOpen(nextOpen);
                  if (wasOpen && !nextOpen && filterDropdownRef.current) {
                    filterDropdownRef.current.handleClose();
                  }
                }}
              >
                <Filter.TriggerButton
                  filterCount={filterCount}
                  onClear={handleClearAllFilters}
                  tooltipContent='Filter'
                />
                <CenterViewDocumentFilterDropdown
                  ref={filterDropdownRef}
                  open={isFilterOpen}
                  setFilterCount={setFilterCount}
                  onFiltersChange={handleFiltersChange}
                  appliedFilters={appliedFilters}
                  documentTypeOptions={documentTypeOptions}
                  statusOptions={statusOptions}
                  isLoadingDocumentTypes={isLoadingDocumentTypes}
                />
              </Popover.Root>
              {/* <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <TableVariantToggle variant={tableVariant} onToggle={toggleTableVariant} />
                </Tooltip.Trigger>
                <Tooltip.Content side='top'>
                  {tableVariant === 'compact' ? 'Default view' : 'Compact view'}
                </Tooltip.Content>
              </Tooltip.Root> */}
            </div>
          }
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        >
          {buildingDocumentsError ? (
            <div className='w-full rounded-lg border border-error-base bg-error-lighter px-4 py-3 text-paragraph-sm text-error-base'>
              Could not load documents. Please try again.
            </div>
          ) : null}
          {isBuildingDocumentsLoading && documentRows.length === 0 ? (
            <div className='flex w-full items-center justify-center gap-2 py-16 text-paragraph-sm text-text-sub-600'>
              <span className='h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-stroke-soft-200 border-t-primary-base' />
              Loading documents…
            </div>
          ) : documentRows?.length > 0 ? (
            <div className='w-full border-stroke-soft-200 rounded-lg border '>
              <Table.Root variant={tableVariant}>
                <Table.Header>
                  <Table.Row>
                    {header_columns.map((col, ind) => (
                      <Table.Head
                        key={ind}
                        className={
                          ind === header_columns.length - 1
                            ? 'text-left label-small text-text-sub-600 font-medium sticky right-0 z-20 bg-bg-weak-50'
                            : 'text-left label-small text-text-sub-600 font-medium'
                        }
                      >
                        <div className='flex items-center gap-1.5'>
                          <span>{col}</span>
                          {col === 'Expiry Date' && (
                            <RiArrowUpDownLine className='size-4 text-text-soft-400' />
                          )}
                        </div>
                      </Table.Head>
                    ))}
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {documentGroups.map((group, groupIndex) => {
                    const { latestRow, historyRows } = group;
                    const isLatestExpired =
                      latestRow.status?.toLowerCase() === 'expired' ||
                      latestRow.status?.toLowerCase() === 'invalid';
                    const latestDocType = latestRow?.other_type || latestRow?.document_type || '--';

                    const getFileName = (row) => {
                      if (row?.file_name) return row.file_name;
                      if (row?.document_file) {
                        const urlPath = row.document_file;
                        const fileName = urlPath.split('/').pop() || urlPath.split('\\').pop();
                        return fileName || '--';
                      }
                      return '--';
                    };

                    const latestFileName = getFileName(latestRow);

                    return (
                      <React.Fragment key={latestRow.name || `group-${groupIndex}`}>
                        {/* Primary / Latest Version Row */}
                        <Table.Row
                          className={
                            groupIndex === documentGroups.length - 1 && historyRows.length === 0
                              ? 'border-b-0'
                              : 'border-b border-stroke-soft-200'
                          }
                        >
                          <Table.Cell>
                            <div className='flex items-center gap-2'>
                              {isLatestExpired && (
                                <span className='w-1.5 h-1.5 rounded-full bg-error-base shrink-0' />
                              )}
                              <span className='px-2 py-0.5 text-[11px] font-semibold rounded-full bg-success-lighter text-success-base border-0 shrink-0'>
                                {latestRow.versionLabel}
                              </span>
                              <span
                                className={`paragraph-small ${
                                  isLatestExpired
                                    ? 'text-error-base font-medium'
                                    : 'text-left label-small text-text-sub-500 whitespace-nowrap font-medium'
                                }`}
                              >
                                {latestDocType}
                              </span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <span className='text-left label-small text-text-sub-500 whitespace-nowrap font-medium'>
                              {latestFileName}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className='text-left label-small text-text-sub-500 whitespace-nowrap font-medium'>
                              {formatDocumentExpiryDate(latestRow.expiry_date)}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge.Root
                              variant='light'
                              color={getStatusVariant(latestRow.status)}
                              size='small'
                            >
                              {latestRow.status?.toUpperCase() || '--'}
                            </Badge.Root>
                          </Table.Cell>
                          <Table.Cell className='border-stroke-soft-200 sticky right-0 z-20 bg-white'>
                            <div className='flex items-center justify-end gap-1'>
                              {canWrite && (
                                <Button.Root
                                  size='xsmall'
                                  variant='neutral'
                                  mode='ghost'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(latestRow);
                                  }}
                                  aria-label='Edit document'
                                  className='h-7 w-7'
                                >
                                  <Button.Icon as={RiPencilLine} />
                                </Button.Root>
                              )}
                              <Button.Root
                                size='xsmall'
                                variant='neutral'
                                mode='ghost'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(latestRow);
                                }}
                                aria-label='Download document'
                                className='h-7 w-7'
                              >
                                <Button.Icon as={RiDownloadLine} />
                              </Button.Root>
                              {canDelete && (
                                <Button.Root
                                  size='xsmall'
                                  variant='neutral'
                                  mode='ghost'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(latestRow);
                                  }}
                                  aria-label='Remove document'
                                  className='h-7 w-7'
                                >
                                  <Button.Icon as={RiDeleteBinLine} />
                                </Button.Root>
                              )}
                            </div>
                          </Table.Cell>
                        </Table.Row>

                        {/* History Sub-Rows (Previous Versions) */}
                        {historyRows.map((subRow, subIndex) => {
                          const isSubExpired =
                            subRow.status?.toLowerCase() === 'expired' ||
                            subRow.status?.toLowerCase() === 'invalid';
                          const subDocType = subRow?.other_type || subRow?.document_type || '--';
                          const subFileName = getFileName(subRow);
                          const isLastSub =
                            groupIndex === documentGroups.length - 1 &&
                            subIndex === historyRows.length - 1;

                          return (
                            <Table.Row
                              key={subRow.name || `sub-${groupIndex}-${subIndex}`}
                              className={
                                isLastSub
                                  ? 'border-b-0 bg-bg-weak-50/40'
                                  : 'border-b border-stroke-soft-200 bg-bg-weak-50/40'
                              }
                            >
                              <Table.Cell>
                                <div className='flex items-center gap-2 pl-6 relative'>
                                  {/* Branch Line Connector */}
                                  <div className='absolute left-2.5 top-0 bottom-1/2 w-3 border-l-2 border-b-2 border-stroke-soft-200 rounded-bl-md pointer-events-none' />
                                  <span className='px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[#E8F0FE] text-[#1A73E8] border-0 shrink-0'>
                                    {subRow.versionLabel}
                                  </span>
                                  <span className='text-left label-small text-text-sub-500 whitespace-nowrap font-medium'>
                                    {subDocType}
                                  </span>
                                </div>
                              </Table.Cell>
                              <Table.Cell>
                                <span className='text-left label-small text-text-sub-500 whitespace-nowrap font-medium'>
                                  {subFileName}
                                </span>
                              </Table.Cell>
                              <Table.Cell>
                                <span className='text-left label-small text-text-sub-500 whitespace-nowrap font-medium'>
                                  {formatDocumentExpiryDate(subRow.expiry_date)}
                                </span>
                              </Table.Cell>
                              <Table.Cell>
                                <Badge.Root
                                  variant='light'
                                  color={getStatusVariant(subRow.status)}
                                  size='small'
                                >
                                  {subRow.status?.toUpperCase() || '--'}
                                </Badge.Root>
                              </Table.Cell>
                              <Table.Cell className='border-stroke-soft-200 sticky right-0 z-20 bg-white'>
                                <div className='flex items-center justify-end gap-1'>
                                  <Button.Root
                                    size='xsmall'
                                    variant='neutral'
                                    mode='ghost'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(subRow);
                                    }}
                                    aria-label='Download document'
                                    className='h-7 w-7'
                                  >
                                    <Button.Icon as={RiDownloadLine} />
                                  </Button.Root>
                                  {canDelete && (
                                    <Button.Root
                                      size='xsmall'
                                      variant='neutral'
                                      mode='ghost'
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(subRow);
                                      }}
                                      aria-label='Remove document'
                                      className='h-7 w-7'
                                    >
                                      <Button.Icon as={RiDeleteBinLine} />
                                    </Button.Root>
                                  )}
                                </div>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            </div>
          ) : (
            <div className='w-full flex flex-col items-center justify-center gap-4 py-10'>
              <img className='object-contain' src={emptyState} alt='no results' />
              <span className='label-medium text-[var(--color-text-soft-400)]'>
                {hasListQuery
                  ? 'No documents match your search or filters.'
                  : 'No documents found.'}
              </span>
            </div>
          )}
        </CenterViewCommonLayout>
      ) : (
        <div className='w-full h-full flex flex-col items-center justify-center gap-[20px]'>
          <img className='object-contain' src={emptyState} alt='no data' />
          <span className='label-medium text-[var(--color-text-soft-400)]'>
            No compliance document found for this center. Start by adding one.
          </span>
          {canWrite && (
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => dispatch(setAddComplianceDocumentModal(true))}
              className='gap-2'
            >
              <Button.Icon as={RiAddLine} />
              Add Document
            </Button.Root>
          )}
        </div>
      )}

      <AddComplianceDocumentModal
        isOpen={isAddComplianceDocumentModalOpen}
        onOpenChange={(open) => dispatch(setAddComplianceDocumentModal(open))}
        handleSave={handleAddComplianceDocument}
      />
      <EditComplianceDocumentModal
        isOpen={isEditComplianceDocumentModalOpen}
        onOpenChange={(open) => dispatch(setEditComplianceDocumentModal(open))}
        handleSave={handleEditDocumentSave}
        buildingDetails={centerDetails?.building_details}
        selectedDocument={selectedDocument}
      />
      <RemoveComplianceDocumentModal
        isOpen={isRemoveComplianceDocumentModalOpen}
        onOpenChange={(open) => dispatch(setRemoveComplianceDocumentModal(open))}
        selectedDocument={selectedDocumentToRemove}
        handleConfirm={handleRemoveConfirm}
      />
    </div>
  );
};

export default CenterViewComplianceDocument;
