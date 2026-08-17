import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { RiDeleteBinLine, RiDownloadLine, RiUploadCloud2Line, RiUploadLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Modal from '@/components/ui/modal';
import * as Label from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as CompactButton from '@/components/ui/compact-button';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import MediaPreview from '@/components/ui/media-preview';
import { cn } from '@/utils/cn';
import { formatFileSize, getFileExtension } from '@/utils/file-utils';
import { buildMediaPreviewItems, normalizeAttachment, toAbsoluteAttachmentUrl } from '@/lib/utils';
import { buildPresentationLinkPreviewItem } from '@/utils/knowledge-center-media-preview';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  EVENT_ATTACHMENT_TYPE_OPTIONS as ATTACHMENT_TYPE_OPTIONS,
  getAttachmentTypeColor,
} from './constant';

const getAttachmentFileUrl = (row) =>
  String(
    row?.fileUrl ||
      row?.file_url ||
      row?.attachment_url ||
      row?.attachment ||
      row?.url ||
      row?.file ||
      '',
  ).trim();

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value ?? '').trim());

/** Uploaded Frappe files live under /files or /private/files — not external links. */
const isUploadedFileUrl = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return false;
  try {
    const path = isHttpUrl(raw) ? new URL(raw).pathname : raw;
    return /\/(?:private\/)?files\//i.test(path);
  } catch {
    return /\/(?:private\/)?files\//i.test(raw);
  }
};

const getPathFileName = (fileUrl) => {
  try {
    return decodeURIComponent(String(fileUrl).split('?')[0].split('/').pop() || '');
  } catch {
    return String(fileUrl).split('?')[0].split('/').pop() || '';
  }
};

const getAttachmentDisplayName = (row) => {
  const storedName = String(row?.attachmentName || row?.attachment_name || '').trim();
  if (storedName && storedName !== '--') return storedName;

  const fileUrl = getAttachmentFileUrl(row);
  const fileName = String(row?.fileName || row?.file_name || '').trim();

  if (fileUrl && isUploadedFileUrl(fileUrl)) {
    if (fileName && fileName !== '--') return fileName;
    return getPathFileName(fileUrl) || '--';
  }

  // External URL without a stored name — don't use path slugs like "edit" / "view".
  if (fileUrl && isHttpUrl(fileUrl)) {
    const pathName = getPathFileName(fileUrl);
    if (fileName && fileName !== '--' && fileName !== pathName) return fileName;
    try {
      return new URL(fileUrl).hostname || fileUrl;
    } catch {
      return fileUrl;
    }
  }

  if (fileName && fileName !== '--') return fileName;
  return '--';
};

const getAttachmentListUrl = (row) => {
  const fileUrl = getAttachmentFileUrl(row);
  if (!fileUrl || isUploadedFileUrl(fileUrl)) return '';
  return isHttpUrl(fileUrl) ? fileUrl : '';
};

const getAttachmentTypeLabel = (row) => {
  const fileUrl = getAttachmentFileUrl(row);
  const fileName = String(row?.fileName || row?.file_name || '').trim();
  const fromUrl = fileUrl ? fileUrl.split('?')[0].split('/').pop() : '';
  const ext = getFileExtension(fileName) || getFileExtension(fromUrl) || '';
  if (ext) return String(ext).toUpperCase();
  if (isHttpUrl(fileUrl)) return 'URL';
  return '';
};

/** Build a MediaPreview item for any attachment row that has a URL (file or link). */
const buildEventAttachmentPreviewItem = (row) => {
  const fileUrl = getAttachmentFileUrl(row);
  if (!fileUrl) return null;

  const fileName = getAttachmentDisplayName(row) || row.fileName || row.file_name || 'file';
  const absoluteUrl = toAbsoluteAttachmentUrl(fileUrl) || fileUrl;
  const normalized = normalizeAttachment({
    fileName,
    fileUrl,
    file_url: fileUrl,
    id: row.id || row.childRowId,
  });
  const [mediaItem] = buildMediaPreviewItems([normalized]);
  if (mediaItem) {
    return {
      ...mediaItem,
      alt: fileName,
      caption: fileName,
      _rowId: String(row.id || row.childRowId || fileUrl),
    };
  }

  // URL / link — same embed preview as Knowledge Center presentation links.
  const linkItem = buildPresentationLinkPreviewItem(absoluteUrl, fileName);
  if (!linkItem) return null;
  return {
    ...linkItem,
    caption: fileName,
    _rowId: String(row.id || row.childRowId || fileUrl),
  };
};

const EventAttachmentsTable = ({ files, onUpload, onDownload, onDeleteAttachment }) => {
  const [searchValue, setSearchValue] = useState('');
  const [internalFiles, setInternalFiles] = useState(() => (Array.isArray(files) ? files : []));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [attachmentType, setAttachmentType] = useState(ATTACHMENT_TYPE_OPTIONS[0].value);
  const [pickedFiles, setPickedFiles] = useState([]);
  const [urlLink, setUrlLink] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (Array.isArray(files)) {
      setInternalFiles(files);
    }
  }, [files]);

  const filteredFiles = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return internalFiles;

    return internalFiles.filter((f) => {
      const haystack = [
        getAttachmentDisplayName(f),
        getAttachmentListUrl(f),
        f.fileName,
        f.type,
        f.uploadedBy,
        f.date,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [internalFiles, searchValue]);

  const pickedFilePreviewUrls = useMemo(
    () =>
      pickedFiles.map((file) => {
        if (!file) return null;
        const extension = getFileExtension(file.name);
        const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG'].includes(extension);
        return isImage ? URL.createObjectURL(file) : null;
      }),
    [pickedFiles],
  );

  useEffect(() => {
    return () => {
      pickedFilePreviewUrls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [pickedFilePreviewUrls]);

  const resetAddModal = () => {
    setAttachmentType(ATTACHMENT_TYPE_OPTIONS[0].value);
    setPickedFiles([]);
    setUrlLink('');
    setAttachmentName('');
    setDragActive(false);
    setIsUploading(false);
  };

  const openAddModal = () => {
    resetAddModal();
    setIsAddModalOpen(true);
  };

  const appendPickedFiles = (fileListLike) => {
    const list = [...(fileListLike || [])].filter(Boolean);
    if (list.length === 0) return;
    setPickedFiles((prev) => [...prev, ...list]);
    setAttachmentName((current) => {
      if (String(current ?? '').trim()) return current;
      return pickedFiles.length === 0 && list.length === 1 ? list[0]?.name || '' : current;
    });
  };

  const removePickedFileAt = (indexToRemove) => {
    setPickedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    const trimmedUrl = String(urlLink ?? '').trim();
    const trimmedName = String(attachmentName ?? '').trim();
    const hasFiles = pickedFiles.length > 0;
    const hasUrl = trimmedUrl.length > 0;
    if (!hasFiles && !hasUrl) {
      showErrorToast('Please select file(s) or enter a URL.');
      return;
    }
    if (hasUrl && !trimmedName) {
      showErrorToast('Please enter a name for the URL.');
      return;
    }
    if (hasUrl && !isHttpUrl(trimmedUrl)) {
      showErrorToast('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setIsUploading(true);
    try {
      if (!onUpload) {
        throw new Error('Upload API is not configured yet');
      }
      const uploadedRows = await onUpload({
        files: hasFiles ? pickedFiles : [],
        type: attachmentType,
        url: hasUrl ? trimmedUrl : '',
        attachment_name: trimmedName,
      });
      const newRows = Array.isArray(uploadedRows) ? uploadedRows : [];
      if (newRows.length > 0) {
        setInternalFiles((prev) => [...newRows, ...prev]);
      }
      showSuccessToast('Attachment(s) uploaded.');
      setIsAddModalOpen(false);
      resetAddModal();
    } catch (error) {
      showErrorToast(extractErrorMessage(error, 'Failed to upload attachment'), {
        defaultMessage: 'Failed to upload attachment',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteRow = useCallback(
    async (row) => {
      if (!row) return;
      const childRowId = row.childRowId || row.child_row_id || row.id;
      const childDoctype = row.childDoctype || row.child_doctype || 'Event Attachment';

      try {
        if (!onDeleteAttachment) throw new Error('Delete API is not configured yet');
        await onDeleteAttachment({ ...row, attachment_id: childRowId, childDoctype });
        setInternalFiles((prev) =>
          (Array.isArray(prev) ? prev : []).filter((f) => {
            const id = f?.childRowId || f?.child_row_id || f?.id;
            return String(id || '') !== String(childRowId || '');
          }),
        );
        showSuccessToast('Attachment deleted successfully.');
      } catch (error) {
        showErrorToast(extractErrorMessage(error, 'Failed to delete attachment'), {
          defaultMessage: 'Failed to delete attachment',
        });
      }
    },
    [onDeleteAttachment],
  );

  const handleDownloadRow = React.useCallback(
    (row) => {
      if (!row) return;
      if (onDownload) {
        onDownload(row);
        return;
      }

      const fileUrl = getAttachmentFileUrl(row);
      if (!fileUrl) {
        showErrorToast('No file URL available for download.');
        return;
      }

      const link = document.createElement('a');
      link.href = toAbsoluteAttachmentUrl(fileUrl) || fileUrl;
      link.download =
        getAttachmentDisplayName(row) || row.fileName || row.file_name || 'attachment';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [onDownload],
  );

  const handlePreviewRow = useCallback(
    (row) => {
      if (!row) return;
      const fileUrl = getAttachmentFileUrl(row);
      if (!fileUrl) {
        showErrorToast('No file URL available to preview.');
        return;
      }

      const items = (Array.isArray(filteredFiles) ? filteredFiles : [])
        .map((f) => buildEventAttachmentPreviewItem(f))
        .filter(Boolean);

      if (items.length === 0) {
        const absolute = toAbsoluteAttachmentUrl(fileUrl) || fileUrl;
        window.open(absolute, '_blank', 'noopener,noreferrer');
        return;
      }

      const rowId = String(row.id || row.childRowId || fileUrl);
      const clickedIndex = items.findIndex((item) => item._rowId === rowId);
      setPreviewItems(items);
      setPreviewIndex(clickedIndex >= 0 ? clickedIndex : 0);
      setPreviewOpen(true);
    },
    [filteredFiles],
  );

  const columns = useMemo(
    () => [
      {
        id: 'fileName',
        accessorKey: 'fileName',
        header: () => <span className='text-paragraph-sm text-text-sub-600'>NAME</span>,
        cell: ({ row }) => {
          const label = getAttachmentDisplayName(row.original);
          const canPreview = Boolean(getAttachmentFileUrl(row.original));
          return (
            <div className='flex items-center gap-2 min-w-0'>
              {canPreview ? (
                <button
                  type='button'
                  className='text-paragraph-sm font-medium text-primary-base truncate text-left hover:underline'
                  onClick={() => handlePreviewRow(row.original)}
                >
                  {label}
                </button>
              ) : (
                <span className='text-paragraph-sm font-medium text-text-strong-950 truncate'>
                  {label}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'url',
        header: () => <span className='text-paragraph-sm text-text-sub-600'>URL</span>,
        cell: ({ row }) => {
          const listUrl = getAttachmentListUrl(row.original);
          if (!listUrl) {
            return <span className='text-paragraph-sm text-text-sub-600'>-</span>;
          }
          return (
            <a
              href={listUrl}
              target='_blank'
              rel='noopener noreferrer'
              title={listUrl}
              className='text-paragraph-sm font-medium text-primary-base truncate block max-w-[280px] hover:underline'
            >
              {listUrl}
            </a>
          );
        },
      },
      {
        id: 'type',
        accessorKey: 'type',
        header: () => <span className='text-paragraph-sm text-text-sub-600'>TYPE</span>,
        cell: ({ row }) => {
          const fileType = getAttachmentTypeLabel(row.original);

          return (
            <Badge.Root
              size='small'
              variant='light'
              color={getAttachmentTypeColor(fileType.toLowerCase())}
              className='text-nowrap'
            >
              {fileType || '--'}
            </Badge.Root>
          );
        },
      },
      {
        id: 'uploadedBy',
        accessorKey: 'uploadedBy',
        header: () => <span className='text-paragraph-sm text-text-sub-600'>UPLOADED BY</span>,
        cell: ({ row }) => (
          <span className='text-paragraph-sm text-text-sub-600'>
            {row.original.uploadedBy || '--'}
          </span>
        ),
      },
      {
        id: 'date',
        accessorKey: 'date',
        header: () => <span className='text-paragraph-sm text-text-sub-600'>DATE</span>,
        cell: ({ row }) => (
          <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>
            {row.original.date || '--'}
          </span>
        ),
      },
      {
        id: 'action',
        header: () => null,
        cell: ({ row }) => (
          <div className='flex items-center justify-end'>
            <Button.Root
              variant='neutral'
              mode='ghost'
              size='small'
              aria-label='Download file'
              onClick={() => handleDownloadRow(row.original)}
            >
              <Button.Icon as={RiDownloadLine} />
            </Button.Root>
            <Button.Root
              variant='neutral'
              mode='ghost'
              size='small'
              aria-label='Delete file'
              onClick={() => handleDeleteRow(row.original)}
            >
              <Button.Icon as={RiDeleteBinLine} />
            </Button.Root>
          </div>
        ),
        meta: {
          cellClassName: 'px-2',
        },
      },
    ],
    [handleDeleteRow, handleDownloadRow, handlePreviewRow],
  );

  const table = useReactTable({
    data: filteredFiles,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className='flex flex-col gap-3'>
      <MediaPreview
        items={previewItems}
        customCaption={{}}
        initialIndex={previewIndex}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
      <div className='flex items-center justify-between'>
        {/* <div className='text-label-sm text-text-strong-950'>{files.length} Files</div> */}
        <Input.Root size='small' className='max-w-[420px]'>
          <Input.Wrapper>
            <Input.Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder='Search files...'
            />
          </Input.Wrapper>
        </Input.Root>
        <Button.Root size='small' className='gap-2' onClick={openAddModal}>
          <Button.Icon as={RiUploadLine} />
          Upload File
        </Button.Root>
      </div>

      {/* <div className='max-w-[420px]'>
        <Input.Root size='small' className='w-full'>
          <Input.Wrapper>
            <Input.Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder='Search files...'
            />
          </Input.Wrapper>
        </Input.Root>
      </div> */}

      <div className='w-full rounded-2xl bg-bg-white-0 shadow-regular-xs'>
        <div className='w-full overflow-x-auto'>
          <Table.Root className='w-full' variant='compact' tableInstance={table}>
            <Table.Header>
              {table.getHeaderGroups().map((headerGroup) => (
                <Table.Row key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Table.Head key={header.id} column={header.column}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </Table.Head>
                  ))}
                </Table.Row>
              ))}
            </Table.Header>
            <Table.Body spacing={8}>
              {table.getRowModel().rows.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={columns.length} className='text-center py-8'>
                    <span className='text-paragraph-sm text-text-sub-500'>
                      {searchValue.trim()
                        ? 'No files found matching your search.'
                        : 'No files found.'}
                    </span>
                  </Table.Cell>
                </Table.Row>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <Table.Row>
                      {row.getVisibleCells().map((cell) => (
                        <Table.Cell key={cell.id} column={cell.column}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                    <Table.RowDivider />
                  </React.Fragment>
                ))
              )}
            </Table.Body>
          </Table.Root>
        </div>
      </div>

      <Modal.Root
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) resetAddModal();
        }}
      >
        <Modal.Content className='max-w-[520px]' showClose>
          <Modal.Header
            title='Add Attachment'
            description='Upload a file and associate it with this event.'
          />

          <Modal.Body className='flex flex-col gap-5'>
            {/* <div className='flex flex-col gap-2'>
              <Label.Root>
                Attachment Type <Label.Asterisk />
              </Label.Root>
              <SearchableSelect
                value={attachmentType}
                onValueChange={setAttachmentType}
                disabled={isUploading}
                options={ATTACHMENT_TYPE_OPTIONS}
                placeholder='Select type'
                triggerClassName='w-full text-left'
                showArrow
              />
            </div> */}

            <div className='flex flex-col gap-2'>
              <Label.Root>
                Name {String(urlLink ?? '').trim() ? <Label.Asterisk /> : null}
              </Label.Root>
              <Input.Root size='small' className='w-full'>
                <Input.Wrapper>
                  <Input.Input
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    placeholder='Enter name'
                    disabled={isUploading}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            <div className='flex flex-col gap-2'>
              <Label.Root>
                File Upload <Label.Asterisk />
              </Label.Root>

              <input
                ref={fileInputRef}
                type='file'
                multiple
                className='hidden'
                onChange={(e) => appendPickedFiles(e.target.files)}
                disabled={isUploading}
              />

              {pickedFiles.length === 0 ? (
                <div
                  className={cn(
                    'rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-5 py-[19px]',
                    dragActive ? 'bg-bg-weak-50' : '',
                  )}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(false);
                    appendPickedFiles(e.dataTransfer.files);
                  }}
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <RiUploadCloud2Line className='size-6 text-text-sub-500' />
                      <div className='flex flex-col gap-1'>
                        <div className='text-paragraph-sm text-text-strong-950'>
                          Choose a file or drag &amp; drop it here.
                        </div>
                        <div className='text-paragraph-xs text-text-sub-600'>
                          PDF, DOC, DOCX, JPG, PNG up to 10 MB
                        </div>
                      </div>
                    </div>
                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      type='button'
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      Browse File
                    </Button.Root>
                  </div>
                </div>
              ) : (
                <div className='flex flex-col w-full gap-3'>
                  {Array.from({ length: pickedFiles.length }).map((_, index) => {
                    const file = pickedFiles.at(index);
                    if (!file) return null;

                    const extension = getFileExtension(file.name);
                    const isPdf = extension === 'PDF';
                    const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG'].includes(
                      extension,
                    );
                    const url = pickedFilePreviewUrls[index] || null;

                    return (
                      <div
                        key={file.name ? `${file.name}-${index}` : index}
                        className='group relative flex items-center gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3 transition-colors hover:border-stroke-soft-300'
                      >
                        <div className='relative h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-bg-weak-50 overflow-hidden'>
                          {isImage ? (
                            <img
                              src={url}
                              alt={file.name}
                              className='h-full w-full rounded-lg object-cover'
                            />
                          ) : (
                            <FileFormatIcon.Root
                              format={extension || 'FILE'}
                              color={isPdf ? 'red' : 'purple'}
                              size='medium'
                            />
                          )}
                        </div>

                        <div className='flex flex-1 flex-col gap-0.5 min-w-0'>
                          <div className='text-paragraph-sm font-semibold text-text-strong-950 truncate'>
                            {file.name}
                          </div>
                          <div className='text-paragraph-xs text-text-sub-600'>
                            {formatFileSize(file.size)}
                          </div>
                        </div>

                        <CompactButton.Root
                          variant='ghost'
                          size='large'
                          className='shrink-0 cursor-pointer'
                          onClick={() => removePickedFileAt(index)}
                          aria-label='Remove file'
                          disabled={isUploading}
                        >
                          <CompactButton.Icon as={RiDeleteBinLine} />
                        </CompactButton.Root>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className='flex items-center gap-3'>
              <div className='h-[1px] flex-1 bg-stroke-soft-200' />
              <div className='text-paragraph-xs text-text-sub-600'>OR</div>
              <div className='h-[1px] flex-1 bg-stroke-soft-200' />
            </div>

            <div className='flex flex-col gap-2'>
              <Label.Root>URL Link</Label.Root>
              <Input.Root size='small' className='w-full'>
                <Input.Wrapper>
                  <Input.Input
                    value={urlLink}
                    onChange={(e) => setUrlLink(e.target.value)}
                    placeholder='Paste URL link'
                    disabled={isUploading}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <div className='flex items-center justify-between gap-3 w-full'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                onClick={() => setIsAddModalOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='button'
                onClick={handleUpload}
                disabled={
                  (pickedFiles.length === 0 && !String(urlLink ?? '').trim()) || isUploading
                }
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button.Root>
            </div>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
};

export default EventAttachmentsTable;
