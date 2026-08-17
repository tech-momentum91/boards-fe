import React, { useState, useEffect } from 'react';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowLeftDoubleLine,
  RiArrowRightDoubleLine,
  RiArrowDownSLine,
} from 'react-icons/ri';
import { cn } from '@/utils/cn';

export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  className,
}) => {
  const [inputPage, setInputPage] = useState(currentPage);

  useEffect(() => {
    setInputPage(currentPage);
  }, [currentPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange?.(page);
    }
  };

  const handleInputBlur = () => {
    const page = Number.parseInt(inputPage, 10);
    if (!Number.isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
    } else {
      setInputPage(currentPage);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  // Generate page numbers with ellipsis logic
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(
          1,
          '...',
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  if (totalCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between py-4 px-6 bg-bg-white-0 border-t border-stroke-soft-200 select-none w-full shrink-0',
        className,
      )}
    >
      {/* Left side: Page indicator with input */}
      <div className='flex items-center gap-2 text-text-sub-500 text-paragraph-sm'>
        <span>Page</span>
        <input
          type='text'
          value={inputPage}
          onChange={(e) => setInputPage(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          className='w-10 h-8 text-center rounded-lg border border-stroke-soft-200 bg-bg-white-0 text-text-main-900 focus:outline-none focus:ring-1 focus:ring-primary-base focus:border-primary-base font-medium text-paragraph-sm'
        />
        <span>of {totalPages}</span>
      </div>

      {/* Center side: Page navigation */}
      <div className='flex items-center gap-2'>
        {/* First Page (<<) */}
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className='flex items-center justify-center w-8 h-8 rounded-lg text-text-sub-400 hover:bg-bg-weak-50 hover:text-text-main-900 disabled:opacity-30 disabled:pointer-events-none transition-colors'
          aria-label='First page'
        >
          <RiArrowLeftDoubleLine size={18} />
        </button>

        {/* Previous Page (<) */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className='flex items-center justify-center w-8 h-8 rounded-lg text-text-sub-400 hover:bg-bg-weak-50 hover:text-text-main-900 disabled:opacity-30 disabled:pointer-events-none transition-colors'
          aria-label='Previous page'
        >
          <RiArrowLeftSLine size={18} />
        </button>

        {/* Page Numbers */}
        <div className='flex items-center gap-1'>
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className='flex items-center justify-center w-8 h-8 text-text-sub-400 font-medium select-none'
                >
                  ...
                </span>
              );
            }

            const isActive = page === currentPage;

            return (
              <button
                key={`page-${page}`}
                onClick={() => handlePageChange(page)}
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg text-paragraph-sm font-medium transition-all',
                  isActive
                    ? 'bg-bg-weak-100 text-text-main-900 border border-stroke-soft-200 font-semibold shadow-sm'
                    : 'text-text-sub-500 hover:bg-bg-weak-50 hover:text-text-main-900',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Page (>) */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className='flex items-center justify-center w-8 h-8 rounded-lg text-text-sub-400 hover:bg-bg-weak-50 hover:text-text-main-900 disabled:opacity-30 disabled:pointer-events-none transition-colors'
          aria-label='Next page'
        >
          <RiArrowRightSLine size={18} />
        </button>

        {/* Last Page (>>) */}
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className='flex items-center justify-center w-8 h-8 rounded-lg text-text-sub-400 hover:bg-bg-weak-50 hover:text-text-main-900 disabled:opacity-30 disabled:pointer-events-none transition-colors'
          aria-label='Last page'
        >
          <RiArrowRightDoubleLine size={18} />
        </button>
      </div>

      {/* Right side: Per Page dropdown */}
      <div className='flex items-center gap-2 text-text-sub-500 text-paragraph-sm'>
        <div className='relative flex items-center shrink-0'>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className='appearance-none h-8 pl-3 pr-8 rounded-lg border border-stroke-soft-200 bg-bg-white-0 text-text-main-900 focus:outline-none font-medium cursor-pointer'
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <div className='absolute right-2.5 pointer-events-none text-text-sub-500 flex items-center justify-center'>
            <RiArrowDownSLine size={16} />
          </div>
        </div>
        <span>Per Page</span>
      </div>
    </div>
  );
};

export default Pagination;
