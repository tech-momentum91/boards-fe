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
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Hint from '@/components/ui/hint';
import * as FileUpload from '@/components/ui/file-upload';
import * as Input from '@/components/ui/input';
import * as Badge from '@/components/ui/badge';
import { useTableVariant } from '@/hooks/use-table-variant';
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
import {
  getVendorDetailThunk,
  setAddVendorDocumentModal,
  setEditVendorDocumentModal,
  setRemoveVendorDocumentModal,
  uploadVendorDocumentThunk,
  updateVendorDocumentThunk,
  removeVendorDocumentThunk,
  fetchVendorDocumentTypesThunk,
} from '@/redux/vendorSlice';
import {
  convertYYYYMMDDToDDMMYYYY,
  parseDDMMYYYYToTimestamp,
  formatTimestampToDDMMYYYY,
  formatTimestampToYYYYMMDD,
  parseToDate,
} from '@/utils/date-utils';
import { format } from 'date-fns';
import { addVendorDocumentSchema, editVendorDocumentSchema } from '@/schemas/vendor-schemas';

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

const parseDDMMYYYYToDate = (dateString) => {
  if (!dateString) return undefined;
  const timestamp = parseDDMMYYYYToTimestamp(dateString);
  return timestamp ? new Date(timestamp) : undefined;
};

const formatDateToDDMMYYYY = (date) => {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return formatTimestampToDDMMYYYY(date.getTime());
};

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

const truncateFileName = (fileName, maxLength = 30) => {
  if (!fileName) return '';
  if (fileName.length <= maxLength) return fileName;
  return `${fileName.slice(0, maxLength)}...`;
};

// ---------------------------------------------------------------------------
// Add Vendor Document Modal
// ---------------------------------------------------------------------------

const AddVendorDocumentModal = ({ isOpen, onOpenChange, handleSave }) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);
  const [otherSelected, setOtherSelected] = useState(false);

  const { data: documentTypes, isLoading: isLoadingDocumentTypes } = useSelector(
    (state) => state.vendor.documentTypes,
  );

  const documentTypeOptions = useMemo(() => {
    return (documentTypes || []).map((type) => ({
      value: type.name,
      label: type.name,
    }));
  }, [documentTypes]);

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
    resolver: zodResolver(addVendorDocumentSchema),
    defaultValues: {
      documentType: '',
      expiryDate: '',
      file: null,
      otherDocumentType: '',
      otherType: '',
    },
  });

  const selectedDocumentType = watch('documentType');

  useEffect(() => {
    if (isOpen && documentTypes.length === 0) {
      dispatch(fetchVendorDocumentTypesThunk());
    }
  }, [isOpen, dispatch, documentTypes.length]);

  const selectedDocumentTypeData = documentTypes.find((type) => type.name === selectedDocumentType);
  const requiresExpiry = selectedDocumentTypeData?.has_expiry === 1;

  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedFile(null);
      setFileName('');
      setOtherSelected(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  const handleFileUploadClick = () => fileInputRef.current?.click();

  const onSubmit = async (data) => {
    if (!selectedFile) {
      setError('file', { message: 'File is required' });
      return;
    }

    if (requiresExpiry && (!data.expiryDate || !data.expiryDate.trim())) {
      setError('expiryDate', { message: 'Expiry Date is required' });
      return;
    }

    if (data.expiryDate && data.expiryDate.trim()) {
      const timestamp = parseDDMMYYYYToTimestamp(data.expiryDate);
      if (timestamp === null) {
        setError('expiryDate', { message: 'Date must be in DD/MM/YYYY format' });
        return;
      }
    }

    const isOtherType = data.documentType === 'Other';
    const otherTypeValue = isOtherType ? data.otherDocumentType?.trim() : undefined;

    if (handleSave) {
      const expiryTimestamp =
        data.expiryDate && data.expiryDate.trim()
          ? parseDDMMYYYYToTimestamp(data.expiryDate)
          : null;
      handleSave({
        ...data,
        documentType: data.documentType,
        otherType: otherTypeValue,
        expiryDate: expiryTimestamp,
        file: selectedFile,
      });
      return;
    }

    setIsLoading(true);
    try {
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiFileLine}
          title='Add Vendor Document'
          description='Enter below document details.'
        />
        <Modal.Body>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col gap-4'>
            {/* Document Type */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Document Type
                <Label.Asterisk />
              </Label.Root>
              <SearchableSelect
                value={selectedDocumentType}
                onValueChange={(value) => {
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
                hasError={Boolean(errors.documentType)}
                disabled={isLoading}
                options={documentTypeOptions}
                placeholder='Select document type'
                triggerClassName='w-full'
                emptyMessage={
                  isLoadingDocumentTypes ? 'Loading document types...' : 'No document types found'
                }
              />
              {errors.documentType && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.documentType.message}
                </Hint.Root>
              )}
            </div>

            {/* Other Type */}
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

            {/* File Upload */}
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

            {/* Expiry Date */}
            {requiresExpiry && (
              <div className='w-full flex flex-col gap-2'>
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

// ---------------------------------------------------------------------------
// Remove Vendor Document Modal
// ---------------------------------------------------------------------------

const RemoveVendorDocumentModal = ({ isOpen, onOpenChange, selectedDocument, handleConfirm }) => {
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async () => {
    if (!selectedDocument) return;
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
          title='Remove Vendor Document?'
          description='Are you sure you want to remove this vendor document?'
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

// ---------------------------------------------------------------------------
// Edit Vendor Document Modal
// ---------------------------------------------------------------------------

const EditVendorDocumentModal = ({
  isOpen,
  onOpenChange,
  handleSave,
  selectedDocument,
  vendorDocuments,
}) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [existingFileName, setExistingFileName] = useState('');
  const fileInputRef = useRef(null);
  const [otherSelected, setOtherSelected] = useState(false);

  const { data: documentTypes, isLoading: isLoadingDocumentTypes } = useSelector(
    (state) => state.vendor.documentTypes,
  );

  const documentTypeOptions = useMemo(() => {
    return (documentTypes || []).map((type) => ({
      value: type.name,
      label: type.name,
    }));
  }, [documentTypes]);

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
    resolver: zodResolver(editVendorDocumentSchema),
    defaultValues: {
      documentType: selectedDocument?.document_type,
      expiryDate: selectedDocument?.expiry_date,
      file: selectedDocument?.document_file || '',
      otherDocumentType: '',
      otherType: '',
    },
  });

  const selectedDocumentType = watch('documentType');

  useEffect(() => {
    if (isOpen && documentTypes.length === 0) {
      dispatch(fetchVendorDocumentTypesThunk());
    }
  }, [isOpen, dispatch, documentTypes.length]);

  const selectedDocumentTypeData = documentTypes.find((type) => type.name === selectedDocumentType);
  const requiresExpiry = selectedDocumentTypeData?.has_expiry === 1;

  useEffect(() => {
    if (selectedDocument && isOpen) {
      let expiryDateString = '';
      if (selectedDocument.expiry_date) {
        if (typeof selectedDocument.expiry_date === 'number') {
          expiryDateString = formatTimestampToDDMMYYYY(selectedDocument.expiry_date);
        } else if (typeof selectedDocument.expiry_date === 'string') {
          if (selectedDocument.expiry_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            expiryDateString = convertYYYYMMDDToDDMMYYYY(selectedDocument.expiry_date);
          } else if (selectedDocument.expiry_date.match(/^(?:\d{2}\/){2}\d{4}$/)) {
            expiryDateString = selectedDocument.expiry_date;
          } else {
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
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [selectedDocument, vendorDocuments, isOpen, reset]);

  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedFile(null);
      setFileName('');
      setExistingFileName('');
      setOtherSelected(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  const handleFileUploadClick = () => fileInputRef.current?.click();

  const onSubmit = async (data) => {
    if (requiresExpiry && (!data.expiryDate || !data.expiryDate.trim())) {
      setError('expiryDate', { message: 'Expiry Date is required' });
      return;
    }

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
        const otherTypeValue = isOtherType ? data.otherDocumentType?.trim() : undefined;
        const expiryTimestamp =
          data.expiryDate && data.expiryDate.trim()
            ? parseDDMMYYYYToTimestamp(data.expiryDate)
            : null;

        await handleSave({
          ...data,
          documentType: data.documentType,
          otherType: otherTypeValue,
          expiry_date: expiryTimestamp,
        });
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update vendor document.' });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiFileLine}
          title='Edit Vendor Document'
          description='Edit below document details.'
        />
        <Modal.Body>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col gap-4'>
            {/* Document Type */}
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Document Type
                <Label.Asterisk />
              </Label.Root>
              <SearchableSelect
                value={selectedDocumentType}
                onValueChange={(value) => {
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
                hasError={Boolean(errors.documentType)}
                disabled={isLoading}
                options={documentTypeOptions}
                placeholder='Select document type'
                triggerClassName='w-full'
                emptyMessage={
                  isLoadingDocumentTypes ? 'Loading document types...' : 'No document types found'
                }
              />
              {errors.documentType && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.documentType.message}
                </Hint.Root>
              )}
            </div>

            {/* Other Type */}
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

            {/* File Upload */}
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

            {/* Expiry Date */}
            {requiresExpiry && (
              <div className='w-full flex flex-col gap-2'>
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

// ---------------------------------------------------------------------------
// Main Tab Component
// ---------------------------------------------------------------------------

const VendorsDetailDocumentTab = ({ vendorId }) => {
  const dispatch = useDispatch();
  const { userSideBarPerm } = useSelector((state) => state.auth);

  const { isOpen: isAddVendorDocumentModalOpen } = useSelector(
    (state) => state.vendor.addVendorDocumentModal,
  );

  const { isOpen: isEditVendorDocumentModalOpen, selectedDocument } = useSelector(
    (state) => state.vendor.editVendorDocumentModal,
  );

  const { isOpen: isRemoveVendorDocumentModalOpen, selectedDocument: selectedDocumentToRemove } =
    useSelector((state) => state.vendor.removeVendorDocumentModal);

  const { data: vendorDetails } = useSelector((state) => state.vendor.vendorDetail);
  const canWrite = hasModulePermission(userSideBarPerm, 'Supplier', 'write');
  const canDelete = hasModulePermission(userSideBarPerm, 'Supplier', 'delete');

  const { variant: tableVariant } = useTableVariant('vendor-detail-document-table', 'compact');

  const header_columns = ['Document Type', 'File', 'Expiry Date', 'Status', ''];

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue.trim().toLowerCase());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const body_rows = vendorDetails?.custom_documents || [];

  const filteredRows = React.useMemo(() => {
    if (!debouncedSearch) return body_rows;
    return body_rows.filter((row) => {
      const docType = String(row?.other_type || row?.document_type || '').toLowerCase();
      const fileName =
        String(row?.file_name || row?.document_file || '')
          .split(/[/\\]/)
          .pop()
          .toLowerCase() || '';
      return docType.includes(debouncedSearch) || fileName.includes(debouncedSearch);
    });
  }, [body_rows, debouncedSearch]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleAddVendorDocument = async (data) => {
    const formData = new FormData();

    formData.append('vendor', vendorId);
    formData.append('document_type', data?.documentType);

    if (data?.otherType) {
      formData.append('other_type', data.otherType);
    }

    // Only append expiry_date if it was actually set
    if (data?.expiryDate) {
      const formatted = formatTimestampToYYYYMMDD(data.expiryDate);
      if (formatted) formData.append('expiry_date', formatted);
    }

    formData.append('document_file', data?.file);

    try {
      await dispatch(uploadVendorDocumentThunk(formData)).unwrap();
      await dispatch(getVendorDetailThunk(vendorId)).unwrap();
      dispatch(setAddVendorDocumentModal(false));
      showSuccessToast('Vendor document added successfully.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to add vendor document.' });
    }
  };

  const handleEdit = useCallback(
    (document) => {
      dispatch(setEditVendorDocumentModal({ document }));
    },
    [dispatch],
  );

  const handleRemove = useCallback(
    (document) => {
      dispatch(setRemoveVendorDocumentModal({ document }));
    },
    [dispatch],
  );

  const handleRemoveConfirm = async (_document) => {
    try {
      await dispatch(
        removeVendorDocumentThunk({
          vendor_id: vendorId,
          document_id: _document?.name,
        }),
      ).unwrap();
      await dispatch(getVendorDetailThunk(vendorId)).unwrap();
      dispatch(setRemoveVendorDocumentModal(false));
      showSuccessToast('Vendor document removed successfully.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to remove vendor document.' });
    }
  };

  const handleDownload = useCallback((_document) => {
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

        formData.append('vendor', vendorId);
        formData.append('document_type', _data?.documentType);
        if (_data?.otherType) {
          formData.append('other_type', _data.otherType);
        }

        const expiryTimestamp = parseDDMMYYYYToTimestamp(_data?.expiryDate);
        if (expiryTimestamp) {
          formData.append('expiry_date', formatTimestampToYYYYMMDD(expiryTimestamp));
        }

        const fileToUpload =
          _data?.file instanceof File ? _data.file : selectedDocument?.document_file;
        if (fileToUpload) {
          formData.append('document_file', fileToUpload);
        }

        formData.append('child_row_id', selectedDocument?.name);

        await dispatch(updateVendorDocumentThunk(formData)).unwrap();
        await dispatch(getVendorDetailThunk(vendorId)).unwrap();
        dispatch(setEditVendorDocumentModal(false));
        showSuccessToast('Vendor document updated successfully.');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update vendor document.' });
      }
    },
    [dispatch, selectedDocument, vendorId],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className='w-full h-full flex flex-col justify-start gap-[20px] p-5'>
      {body_rows?.length > 0 ? (
        <CenterViewCommonLayout
          title='Search Document'
          Icon={RiFile2Line}
          buttonName='Add Document'
          onButtonClick={() => dispatch(setAddVendorDocumentModal(true))}
          showButton={body_rows.length === 0 ? false : canWrite}
          headerActions={<div className='flex items-center gap-3' />}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        >
          {filteredRows?.length > 0 ? (
            <div className='w-full border-stroke-soft-200 rounded-lg border'>
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
                  {filteredRows.map((row, index) => {
                    const isLastRow = index === filteredRows.length - 1;
                    const isExpired =
                      row.status?.toLowerCase() === 'expired' ||
                      row.status?.toLowerCase() === 'invalid';
                    const documentType = row?.other_type || row?.document_type || '--';

                    const getFileName = () => {
                      if (row?.file_name) return row.file_name;
                      if (row?.document_file) {
                        const urlPath = row.document_file;
                        return urlPath.split('/').pop() || urlPath.split('\\').pop() || '--';
                      }
                      return '--';
                    };
                    const fileName = getFileName();

                    return (
                      <Table.Row
                        key={index}
                        className={isLastRow ? 'border-b-0' : 'border-b border-stroke-soft-200'}
                      >
                        {/* Document Type */}
                        <Table.Cell>
                          <div className='flex items-center gap-2'>
                            {isExpired && (
                              <span className='w-1.5 h-1.5 rounded-full bg-error-base shrink-0' />
                            )}
                            <span
                              className={`paragraph-small ${
                                isExpired
                                  ? 'text-error-base'
                                  : 'text-left label-small text-text-sub-500 whitespace-nowrap font-medium'
                              }`}
                            >
                              {documentType}
                            </span>
                          </div>
                        </Table.Cell>

                        {/* File */}
                        <Table.Cell>
                          <span className='text-left label-small text-text-sub-500 whitespace-nowrap font-medium'>
                            {fileName}
                          </span>
                        </Table.Cell>

                        {/* Expiry Date */}
                        <Table.Cell>
                          <span className='text-left label-small text-text-sub-500 whitespace-nowrap font-medium'>
                            {row.expiry_date || '--'}
                          </span>
                        </Table.Cell>

                        {/* Status */}
                        <Table.Cell>
                          <Badge.Root
                            variant='light'
                            color={getStatusVariant(row.status)}
                            size='small'
                          >
                            {row.status?.toUpperCase() || '--'}
                          </Badge.Root>
                        </Table.Cell>

                        {/* Actions */}
                        <Table.Cell className='border-stroke-soft-200 sticky right-0 z-20 bg-white'>
                          <div className='flex items-center justify-end gap-1'>
                            {canWrite && (
                              <Button.Root
                                size='xsmall'
                                variant='neutral'
                                mode='ghost'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(row);
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
                                handleDownload(row);
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
                                  handleRemove(row);
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
                </Table.Body>
              </Table.Root>
            </div>
          ) : (
            <div className='w-full flex flex-col items-center justify-center gap-4 py-10'>
              <img className='object-contain' src={emptyState} alt='no results' />
              <span className='label-medium text-[var(--color-text-soft-400)]'>
                No results found for your search.
              </span>
            </div>
          )}
        </CenterViewCommonLayout>
      ) : (
        /* Empty state — no documents at all */
        <div className='w-full h-full flex flex-col items-center justify-center gap-[20px] p-5'>
          <img className='object-contain' src={emptyState} alt='no data' />
          <span className='label-medium text-[var(--color-text-soft-400)]'>
            No documents found for this vendor. Start by adding one.
          </span>
          {canWrite && (
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => dispatch(setAddVendorDocumentModal(true))}
              className='gap-2'
            >
              <Button.Icon as={RiAddLine} />
              Add Document
            </Button.Root>
          )}
        </div>
      )}

      {/* Modals */}
      <AddVendorDocumentModal
        isOpen={isAddVendorDocumentModalOpen}
        onOpenChange={(open) => dispatch(setAddVendorDocumentModal(open))}
        handleSave={handleAddVendorDocument}
      />
      <EditVendorDocumentModal
        isOpen={isEditVendorDocumentModalOpen}
        onOpenChange={(open) => dispatch(setEditVendorDocumentModal(open))}
        handleSave={handleEditDocumentSave}
        vendorDocuments={vendorDetails?.custom_documents}
        selectedDocument={selectedDocument}
      />
      <RemoveVendorDocumentModal
        isOpen={isRemoveVendorDocumentModalOpen}
        onOpenChange={(open) => dispatch(setRemoveVendorDocumentModal(open))}
        selectedDocument={selectedDocumentToRemove}
        handleConfirm={handleRemoveConfirm}
      />
    </div>
  );
};

export default VendorsDetailDocumentTab;
