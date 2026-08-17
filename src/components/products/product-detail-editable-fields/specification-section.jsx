import React, { useCallback } from 'react';

import { isJobProductType } from '@/components/products/products-job-pricing';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import {
  activateEditField,
  EditTextareaInput,
  useEditingField,
  useProductFieldSave,
} from '@/components/products/product-detail-editable-fields/shared';

export function ProductDetailSpecificationEditableSection({ product, onProductUpdated }) {
  const { saveFields } = useProductFieldSave(product.id, onProductUpdated);
  const { editingField, startEdit, endEdit } = useEditingField(product.id);
  const isJob = isJobProductType(product.devxProductType);
  const emptySpecificationMessage = isJob
    ? 'No job specifications have been added for this item.'
    : 'No product specification has been added for this item.';

  const specificationText = product.specificationNotes || '';

  const saveSpecification = useCallback(
    async (notes) => {
      const trimmed = notes?.trim();
      const current = (product.specificationNotes || '').trim();
      if (trimmed === current) return true;
      return saveFields('specification', { specificationNotes: trimmed });
    },
    [product.specificationNotes, saveFields],
  );

  if (editingField === 'specification') {
    return (
      <EditTextareaInput
        value={specificationText}
        placeholder={isJob ? 'Add job specifications' : 'Add product specification'}
        onSave={saveSpecification}
        onEndEdit={endEdit}
      />
    );
  }

  return (
    <EditableFieldWrapper editable className='cursor-pointer'>
      <div {...activateEditField(() => startEdit('specification'))}>
        <p className='whitespace-pre-wrap text-label-sm font-medium leading-5 text-text-soft-400'>
          {specificationText || emptySpecificationMessage}
        </p>
      </div>
    </EditableFieldWrapper>
  );
}
