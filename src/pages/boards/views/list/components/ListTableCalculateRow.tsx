import { cn } from '@/utils/cn';
import {
  getListTableRowStyle,
  getTableActionsCellClass,
  getTableDataCellClass,
  getTableStickyColumnClass,
  LIST_TABLE_ACTIONS_CELL_CLASS,
  LIST_TABLE_TITLE_CELL_CLASS,
  TABLE_FILLER_CELL_CLASS,
  TABLE_INDEX_CELL_CLASS,
} from '../utils/list-columns';

export default function ListTableCalculateRow({
  columns = [],
  calculations = {},
  isTableLayout = false,
}) {
  const hasCalculations = columns.some((column) => calculations[column.key]?.result != null);

  if (!hasCalculations) {
    return null;
  }

  return (
    <div
      className={cn(
        'grid bg-bg-weak-50',
        isTableLayout ? 'border-b border-stroke-soft-200' : 'border-t border-stroke-soft-200',
      )}
      style={getListTableRowStyle()}
    >
      {isTableLayout ? <div className={TABLE_INDEX_CELL_CLASS} /> : null}

      {columns.map((column) => {
        const calculation = calculations[column.key];

        return (
          <div
            key={column.key}
            className={cn(
              isTableLayout
                ? cn(
                    getTableDataCellClass(column),
                    'flex-col items-start justify-center px-2 py-0.5',
                    column.key === 'title' &&
                      getTableStickyColumnClass(column, { isTableLayout: true }),
                  )
                : cn(
                    'flex min-h-11 min-w-0 flex-col justify-center px-3 py-2',
                    column.key === 'title' && LIST_TABLE_TITLE_CELL_CLASS,
                  ),
            )}
          >
            {calculation?.result != null ? (
              <>
                <span className='truncate text-xs text-text-soft-400'>{calculation.label}</span>
                <span
                  className={cn(
                    'truncate font-medium text-text-main-900',
                    isTableLayout ? 'text-xs' : 'text-sm',
                  )}
                >
                  {calculation.result}
                </span>
              </>
            ) : null}
          </div>
        );
      })}

      {isTableLayout ? (
        <>
          <div className={TABLE_FILLER_CELL_CLASS} />
          <div className={cn(getTableActionsCellClass(false), 'bg-bg-weak-50')} />
        </>
      ) : (
        <div className={cn(LIST_TABLE_ACTIONS_CELL_CLASS, 'bg-bg-weak-50')} />
      )}
    </div>
  );
}
