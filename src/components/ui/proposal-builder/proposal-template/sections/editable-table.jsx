import React, { useCallback } from 'react';

import EditableText from '@/components/ui/proposal-builder/proposal-template/sections/editable-text';

/**
 * Fixed-layout comparison table — cell values editable; rows/columns can be added or removed.
 */
export default function EditableTable({
  columns = [],
  rows = [],
  onCellChange,
  onAddRow,
  onRemoveRow,
  onAddColumn,
  onRemoveColumn,
  readOnly = false,
  className = '',
  basePath = [],
}) {
  const handleCellBlur = useCallback(
    (rowIndex, colKey, value) => {
      onCellChange?.([...basePath, 'rows', rowIndex, colKey], value);
    },
    [onCellChange, basePath],
  );

  const handleHeaderBlur = useCallback(
    (colIndex, value) => {
      onCellChange?.([...basePath, 'columns', colIndex, 'label'], value);
    },
    [onCellChange, basePath],
  );

  return (
    <div
      className={`proposal-editable-table ${readOnly ? '' : 'proposal-editable-table--editable'} ${className}`}
    >
      {!readOnly && (onAddRow || onAddColumn) ? (
        <div className='proposal-editable-table__toolbar'>
          {onAddRow ? (
            <button type='button' className='proposal-editable-table__btn' onClick={onAddRow}>
              Add row
            </button>
          ) : null}
          {onRemoveRow && rows.length > 1 ? (
            <button type='button' className='proposal-editable-table__btn' onClick={onRemoveRow}>
              Remove row
            </button>
          ) : null}
          {onAddColumn ? (
            <button type='button' className='proposal-editable-table__btn' onClick={onAddColumn}>
              Add column
            </button>
          ) : null}
          {onRemoveColumn && columns.length > 2 ? (
            <button type='button' className='proposal-editable-table__btn' onClick={onRemoveColumn}>
              Remove column
            </button>
          ) : null}
        </div>
      ) : null}

      <table className='proposal-editable-table__grid'>
        <thead>
          <tr>
            {columns.map((col, colIndex) => (
              <th key={col.key} className='proposal-editable-table__th'>
                <EditableText
                  className='proposal-editable-table__header-text'
                  element='span'
                  value={col.label}
                  path={[...basePath, 'columns', colIndex, 'label']}
                  onChange={readOnly ? null : (_path, value) => handleHeaderBlur(colIndex, value)}
                  readOnly={readOnly}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id ?? `row-${rowIndex}`}>
              {columns.map((col) => (
                <td key={col.key} className='proposal-editable-table__td'>
                  <EditableText
                    className='proposal-editable-table__cell-text'
                    element='span'
                    value={row[col.key] ?? ''}
                    path={[...basePath, 'rows', rowIndex, col.key]}
                    onChange={
                      readOnly ? null : (_path, value) => handleCellBlur(rowIndex, col.key, value)
                    }
                    readOnly={readOnly}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
