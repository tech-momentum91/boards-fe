/**
 * Get common pinning styles for table columns
 * @param {Object} column - The column object from TanStack Table
 * @param {Object} options - Additional options for styling
 * @param {boolean} options.includeBoxShadow - Whether to include box shadow for pinned columns
 * @param {number} options.opacity - Custom opacity for pinned columns (default: 0.85)
 * @returns {Object} - Style object with pinning properties
 */
export const getCommonPinningStyles = (column, options = {}) => {
  const { includeBoxShadow = true } = options;
  const isPinned = column.getIsPinned();
  const isLastLeftPinnedColumn = isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinnedColumn = isPinned === 'right' && column.getIsFirstColumn('right');

  const baseStyles = {
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    position: isPinned ? 'sticky' : 'relative',
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
    textAlign: isFirstRightPinnedColumn ? 'right' : isLastLeftPinnedColumn ? 'left' : '',
  };

  if (includeBoxShadow) {
    baseStyles.boxShadow = isLastLeftPinnedColumn
      ? '-4px 0 4px -4px rgba(0, 0, 0, 0.1) inset'
      : isFirstRightPinnedColumn
        ? '2px 0 2px -1px rgba(0, 0, 0, 0.1) inset'
        : undefined;
  }

  return baseStyles;
};
