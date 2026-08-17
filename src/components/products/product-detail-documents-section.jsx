import React, { useRef, useState } from 'react';

import {
  addProductDocument,
  getProductDocumentTypeLabel,
  removeProductDocument,
} from '@/api/products';
import { ProductDocumentsPanel } from '@/components/products/product-documents-panel';
import ProductEditDocumentModal from '@/components/products/product-edit-document-modal';
import ProductUploadDocumentModal from '@/components/products/product-upload-document-modal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { validateProductFiles } from '@/components/products/product-upload-utils';

function toDocumentFile(document, index) {
  return {
    id: document.id || document.url || `${document.name}-${index}`,
    fileName: document.name,
    size: document.size,
    documentTypeLabel: getProductDocumentTypeLabel(document),
  };
}

function getDocumentKey(document, index) {
  return document.url || document.id || `${document.name}-${index}`;
}

export default function ProductDetailDocumentsSection({
  productId,
  documents = [],
  allDocuments = documents,
  onDocumentsUpdated,
  simpleMode = false,
}) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingDocumentGroup, setEditingDocumentGroup] = useState(null);
  const [removingKey, setRemovingKey] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const files = documents.map((document, index) => ({
    ...toDocumentFile(document, index),
    document,
    index,
    key: getDocumentKey(document, index),
  }));

  const handleEditGroup = (group) => {
    setEditingDocumentGroup({
      key: group.key,
      label: group.label,
      documentType: group.documentType,
      otherType: group.otherType,
      documents: group.files.map((file) => file.document),
    });
  };

  const handleDeleteDocument = async (fileId) => {
    const entry = files.find((file) => file.id === fileId);
    if (!entry || !productId) {
      showErrorToast('Product not found.');
      return;
    }

    setRemovingKey(entry.key);

    try {
      const result = await removeProductDocument(productId, entry.document, allDocuments, {
        allowMissingDocumentType: simpleMode,
      });
      onDocumentsUpdated?.(result.product);
      showSuccessToast('Document removed');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to remove document.' });
    } finally {
      setRemovingKey(null);
    }
  };

  const handleSimpleUpload = async (fileList) => {
    if (!fileList?.length || !productId) return;

    const { validFiles, errorMessage } = validateProductFiles(fileList);
    if (errorMessage) {
      showErrorToast(errorMessage);
    }
    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      let currentDocuments = allDocuments;
      let latestProduct = null;

      for (const file of validFiles) {
        const result = await addProductDocument(productId, {
          file,
          existingDocuments: currentDocuments,
          allowMissingDocumentType: true,
        });
        latestProduct = result.product;
        currentDocuments = latestProduct?.documents ?? currentDocuments;
      }

      onDocumentsUpdated?.(latestProduct);
      showSuccessToast(validFiles.length > 1 ? 'Documents uploaded' : 'Document uploaded');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to upload document.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className='p-6 pb-16'>
        <ProductDocumentsPanel
          files={files}
          groupByDocumentType={!simpleMode}
          isUploading={isUploading}
          removingFileId={files.find((file) => file.key === removingKey)?.id ?? null}
          showFileInput={simpleMode}
          fileInputRef={fileInputRef}
          multiple
          onUploadClick={() => {
            if (simpleMode) {
              fileInputRef.current?.click();
              return;
            }
            setIsUploadModalOpen(true);
          }}
          onFileInputChange={(event) => {
            handleSimpleUpload(event.target.files);
            event.target.value = '';
          }}
          onEditGroup={simpleMode ? undefined : handleEditGroup}
          onRemoveFile={handleDeleteDocument}
        />
      </div>

      {!simpleMode ? (
        <>
          <ProductUploadDocumentModal
            open={isUploadModalOpen}
            onOpenChange={setIsUploadModalOpen}
            productId={productId}
            existingDocuments={allDocuments}
            onSuccess={onDocumentsUpdated}
          />
          <ProductEditDocumentModal
            open={Boolean(editingDocumentGroup)}
            onOpenChange={(open) => {
              if (!open) setEditingDocumentGroup(null);
            }}
            productId={productId}
            documentGroup={editingDocumentGroup}
            existingDocuments={allDocuments}
            onSuccess={onDocumentsUpdated}
          />
        </>
      ) : null}
    </>
  );
}
