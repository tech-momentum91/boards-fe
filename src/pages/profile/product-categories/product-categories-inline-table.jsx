import React, { useCallback } from 'react';
import { RiAddLine, RiDeleteBinLine, RiExpandUpDownFill } from 'react-icons/ri';

import * as CompactButton from '@/components/ui/compact-button';
import * as Table from '@/components/ui/table';
import {
  CategoryDraftSelect,
  CategoryDraftTextInput,
} from '@/pages/profile/product-categories/product-categories-inline-field';
import {
  getProductCategoryDependentFieldKeys,
  getProductCategoryParentOptions,
  getProductCategoryTabColumns,
  getProductCategoryTabPlaceholders,
  PRODUCT_CATEGORY_FIELD_KEYS,
  resolveProductCategoryParentLabel,
} from '@/pages/profile/product-categories/constants';
import { cn } from '@/utils/cn';

function ParentColumnHeader({ label }) {
  return (
    <div className='flex items-center gap-0.5'>
      <span>{label}</span>
      <RiExpandUpDownFill className='size-5 shrink-0 text-text-sub-600' aria-hidden />
    </div>
  );
}

const ProductCategoriesInlineTable = ({
  tabId,
  rows,
  rowsByTab,
  onRowsChange,
  onRemoveRow,
  onAddMore,
}) => {
  const columns = getProductCategoryTabColumns(tabId);
  const placeholders = getProductCategoryTabPlaceholders(tabId);
  const dataColumnCount = columns.length;
  const hasManyColumns = columns.length > 3;

  const updateRow = useCallback(
    (rowId, patch) => {
      onRowsChange(rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
    },
    [onRowsChange, rows],
  );

  const handleParentChange = useCallback(
    (rowId, fieldKey, value) => {
      const dependentKeys = getProductCategoryDependentFieldKeys(fieldKey);
      const patch = { [fieldKey]: value };

      dependentKeys.forEach((key) => {
        patch[key] = '';
      });

      updateRow(rowId, patch);
    },
    [updateRow],
  );

  const removeRow = useCallback(
    (rowId) => {
      onRemoveRow(rowId);
    },
    [onRemoveRow],
  );

  const handleAddMore = useCallback(() => {
    onAddMore();
  }, [onAddMore]);

  const renderTextCell = (row, fieldKey, { placeholder, isName = false } = {}) => {
    if (row.isDraft) {
      return (
        <CategoryDraftTextInput
          value={row[fieldKey] ?? ''}
          onChange={(event) => updateRow(row.id, { [fieldKey]: event.target.value })}
          placeholder={placeholder}
          isName={isName}
        />
      );
    }

    const value = row[fieldKey] ?? '';
    const className = isName
      ? 'label-small block truncate text-text-main-900'
      : 'paragraph-small block truncate text-text-sub-500';

    return <span className={className}>{value}</span>;
  };

  const renderParentCell = (row, column) => {
    const fieldKey = column.key;
    const value = row[fieldKey] ?? '';

    if (row.isDraft) {
      const options = getProductCategoryParentOptions(rowsByTab, fieldKey, row);

      return (
        <CategoryDraftSelect
          value={value}
          onValueChange={(nextValue) => handleParentChange(row.id, fieldKey, nextValue)}
          options={options}
        />
      );
    }

    return (
      <span className='paragraph-small block truncate text-text-sub-500'>
        {resolveProductCategoryParentLabel(rowsByTab, fieldKey, value)}
      </span>
    );
  };

  const renderCell = (row, column) => {
    if (column.type === 'parent') {
      return renderParentCell(row, column);
    }

    if (column.key === PRODUCT_CATEGORY_FIELD_KEYS.NAME) {
      return renderTextCell(row, column.key, {
        placeholder: placeholders.name,
        isName: true,
      });
    }

    return renderTextCell(row, column.key, {
      placeholder: placeholders.description,
    });
  };

  return (
    <div className='w-full overflow-x-auto rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
      <Table.Root
        variant='compact'
        className={cn('w-full overflow-visible', hasManyColumns && 'min-w-max')}
      >
        <Table.Header>
          <Table.Row className='border-0 hover:bg-transparent'>
            {columns.map((column) => (
              <Table.Head
                key={column.key}
                className={cn(
                  'h-9 border-0 bg-bg-weak-50 !rounded-none px-3 py-2 label-small font-medium text-text-soft-400',
                  column.minWidth,
                )}
              >
                {column.sortable ? <ParentColumnHeader label={column.label} /> : column.label}
              </Table.Head>
            ))}
            <Table.Head
              className={cn(
                'h-9 w-16 shrink-0 border-0 bg-bg-weak-50 !rounded-none p-0',
                hasManyColumns && 'sticky right-0',
              )}
            />
          </Table.Row>
        </Table.Header>

        <Table.Body spacing={0}>
          {rows.map((row, index) => (
            <React.Fragment key={row.id}>
              <Table.Row className='h-10 border-0 hover:bg-transparent'>
                {columns.map((column) => (
                  <Table.Cell
                    key={column.key}
                    className={cn(
                      'h-10 border-0 bg-bg-white-0 !rounded-none !p-0 group-hover/row:!bg-bg-white-0',
                      column.minWidth,
                    )}
                  >
                    <div className='flex h-10 min-h-10 items-center pl-3 pr-5'>
                      {renderCell(row, column)}
                    </div>
                  </Table.Cell>
                ))}
                <Table.Cell
                  className={cn(
                    'h-10 w-16 shrink-0 border-0 bg-bg-white-0 !rounded-none p-0 group-hover/row:!bg-bg-white-0',
                    hasManyColumns && 'sticky right-0 bg-bg-white-0',
                  )}
                >
                  <div className='flex h-10 items-center justify-center p-3'>
                    <CompactButton.Root
                      type='button'
                      variant='ghost'
                      size='medium'
                      className='text-text-sub-500 hover:text-error-base'
                      aria-label='Delete row'
                      onClick={() => removeRow(row.id)}
                    >
                      <CompactButton.Icon as={RiDeleteBinLine} />
                    </CompactButton.Root>
                  </div>
                </Table.Cell>
              </Table.Row>
              {index < rows.length - 1 ? <Table.RowDivider /> : null}
            </React.Fragment>
          ))}

          <Table.RowDivider className='[&_td]:!p-0' dividerClassName='!h-px' />

          <Table.Row className='border-0 bg-bg-weak-100 hover:bg-transparent'>
            <Table.Cell
              colSpan={dataColumnCount + 1}
              className='h-9 border-0 !rounded-none bg-bg-weak-100 px-3 py-2 first:!rounded-none last:!rounded-none'
            >
              <button
                type='button'
                onClick={handleAddMore}
                className='flex w-full items-center gap-3 text-left label-small font-medium text-text-soft-400 transition-colors hover:text-text-sub-500'
              >
                <span
                  className='flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'
                  aria-hidden
                >
                  <RiAddLine className='size-5 text-text-soft-400' />
                </span>
                Add More
              </button>
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    </div>
  );
};

export default ProductCategoriesInlineTable;
