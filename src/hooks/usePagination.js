import { useMemo } from 'react';

/**
 * Custom hook for pagination logic with MUI-style configuration
 * @param {Object} pagination - Pagination object with currentPage, totalPages, totalItems
 * @param {Function} onPageChange - Callback function when page changes
 * @param {Object} options - Configuration options
 * @param {number} options.siblingCount - Number of siblings on each side of current page (default: 1)
 * @param {number} options.boundaryCount - Number of boundary pages to show (default: 1)
 * @param {number} options.itemsPerPage - Items per page (default: 5)
 * @returns {Object} Pagination data and handlers
 */
export const usePagination = (pagination, onPageChange, options = {}) => {
  const { siblingCount = 1, boundaryCount = 1, itemsPerPage = 5 } = options;

  const paginationData = useMemo(() => {
    if (!pagination || pagination.totalPages <= 1) {
      return null;
    }

    const { currentPage, totalPages, totalItems } = pagination;

    // Calculate display info
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    /**
     * Generate page items following MUI's algorithm
     * @param {number} siblingCount - Number of siblings
     * @param {number} boundaryCount - Number of boundary pages
     * @returns {Array} Array of page numbers and ellipsis
     */
    const generatePageItems = (siblingCount, boundaryCount) => {
      const startPages = range(1, Math.min(boundaryCount, totalPages));
      const endPages = range(
        Math.max(totalPages - boundaryCount + 1, boundaryCount + 1),
        totalPages,
      );

      const siblingsStart = Math.max(
        Math.min(
          // Natural start
          currentPage - siblingCount,
          // Lower boundary when page is high
          totalPages - boundaryCount - siblingCount * 2 - 1,
        ),
        // Greater than startPages
        boundaryCount + 2,
      );

      const siblingsEnd = Math.min(
        Math.max(
          // Natural end
          currentPage + siblingCount,
          // Upper boundary when page is low
          boundaryCount + siblingCount * 2 + 2,
        ),
        // Less than endPages
        endPages.length > 0 ? endPages[0] - 2 : totalPages - 1,
      );

      // Build the items array
      const itemList = [
        ...startPages,

        // Start ellipsis
        ...(siblingsStart > boundaryCount + 2
          ? ['ellipsis-start']
          : boundaryCount + 1 < totalPages - boundaryCount
            ? [boundaryCount + 1]
            : []),

        // Sibling pages
        ...range(siblingsStart, siblingsEnd),

        // End ellipsis
        ...(siblingsEnd < totalPages - boundaryCount - 1
          ? ['ellipsis-end']
          : totalPages - boundaryCount > boundaryCount
            ? [totalPages - boundaryCount]
            : []),

        ...endPages,
      ];

      // Remove duplicates and sort
      const uniqueItems = [];
      const seen = new Set();

      for (const item of itemList) {
        if (typeof item === 'string' || !seen.has(item)) {
          uniqueItems.push(item);
          if (typeof item === 'number') {
            seen.add(item);
          }
        }
      }

      return uniqueItems;
    };

    /**
     * Generate mobile pages with maximum 5-6 page buttons, ensuring navigation
     * @returns {Array} Array of page elements with proper navigation
     */
    const generateMobilePages = () => {
      if (totalPages <= 5) {
        // If 5 or fewer total pages, show all
        return range(1, totalPages);
      }

      if (currentPage <= 3) {
        // Early pages: show 1 2 3 4 ... (ensuring you can get to page 4)
        return [1, 2, 3, 4, 'ellipsis-end'];
      } else if (currentPage >= totalPages - 2) {
        // Late pages: show ... N-3 N-2 N-1 N (ensuring you can get to N-3)
        return ['ellipsis-start', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        // Middle pages: show 1 ... current-1 current current+1 ... N (6 elements for navigation)
        return [1, 'ellipsis-start', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end'];
      }
    };

    // Generate pages for desktop (full functionality)
    const desktopPages = generatePageItems(siblingCount, boundaryCount);

    // Generate pages for mobile (5-6 page buttons with proper navigation)
    const mobilePages = generateMobilePages();

    return {
      currentPage,
      totalPages,
      totalItems,
      startItem,
      endItem,
      mobilePages,
      desktopPages,
      canGoPrevious: currentPage > 1,
      canGoNext: currentPage < totalPages,
      handlePrevious: () => onPageChange(currentPage - 1),
      handleNext: () => onPageChange(currentPage + 1),
      handlePageChange: (page) => onPageChange(page),
    };
  }, [pagination, onPageChange, siblingCount, boundaryCount, itemsPerPage]);

  return paginationData;
};

/**
 * Utility function to create a range of numbers
 * @param {number} start - Start number
 * @param {number} end - End number
 * @returns {Array} Array of numbers
 */
function range(start, end) {
  const length = end - start + 1;
  return Array.from({ length }, (_, i) => start + i);
}
