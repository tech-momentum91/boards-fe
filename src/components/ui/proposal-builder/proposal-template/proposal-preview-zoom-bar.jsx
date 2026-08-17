import React from 'react';
import { ChevronDown, ChevronUp, Maximize2, Minus, Plus, Scan } from 'lucide-react';

import * as Button from '@/components/ui/button';
import { PROPOSAL_ZOOM_MODES } from '@/components/ui/proposal-builder/proposal-template/hooks/use-proposal-preview-zoom';
import { cn } from '@/utils/cn';

export default function ProposalPreviewZoomBar({
  zoomPercent,
  zoomPercentInput,
  zoomMode,
  minPercent,
  maxPercent,
  zoomIn,
  zoomOut,
  fitPage,
  fillPage,
  handleSliderChange,
  handleZoomPercentInputChange,
  commitZoomPercentInput,
  currentPage,
  totalPages,
  pageInput,
  handlePageInputChange,
  commitPageInput,
  goToPreviousPage,
  goToNextPage,
}) {
  return (
    <div
      className='proposal-preview-zoom-bar flex shrink-0 items-center justify-between gap-4 border-t border-stroke-soft-200 bg-bg-white-0 px-4 py-2'
      role='toolbar'
      aria-label='Preview zoom and page controls'
    >
      <div className='proposal-preview-zoom-bar__zoom-group flex min-w-0 flex-1 items-center justify-center gap-2'>
        <input
          type='range'
          className='proposal-preview-zoom-bar__slider h-1 w-28 cursor-pointer accent-primary-base'
          min={minPercent}
          max={maxPercent}
          step={1}
          value={zoomPercent}
          onChange={handleSliderChange}
          aria-label='Zoom level'
          aria-valuemin={minPercent}
          aria-valuemax={maxPercent}
          aria-valuenow={zoomPercent}
        />

        <Button.Root
          type='button'
          size='xsmall'
          variant='neutral'
          mode='ghost'
          onClick={zoomOut}
          aria-label='Zoom out'
        >
          <Minus className='size-3.5' aria-hidden />
        </Button.Root>

        <div className='proposal-preview-zoom-bar__zoom-input-wrap flex min-w-12 items-center justify-center gap-0.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-1.5 py-0.5'>
          <input
            type='text'
            inputMode='numeric'
            pattern='[0-9]*'
            className='proposal-preview-zoom-bar__zoom-input w-7 border-0 bg-transparent p-0 text-center text-paragraph-xs text-text-strong-950 outline-none tabular-nums'
            value={zoomPercentInput}
            onChange={handleZoomPercentInputChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitZoomPercentInput();
              }
            }}
            onBlur={commitZoomPercentInput}
            aria-label='Zoom level percent'
            aria-valuemin={minPercent}
            aria-valuemax={maxPercent}
            aria-valuenow={zoomPercent}
          />
          <span className='text-paragraph-xs text-text-sub-600'>%</span>
        </div>

        <Button.Root
          type='button'
          size='xsmall'
          variant='neutral'
          mode='ghost'
          onClick={zoomIn}
          aria-label='Zoom in'
        >
          <Plus className='size-3.5' aria-hidden />
        </Button.Root>

        <div className='mx-1 hidden h-5 w-px shrink-0 bg-stroke-soft-200 sm:block' aria-hidden />

        <Button.Root
          type='button'
          size='xsmall'
          variant='neutral'
          mode='stroke'
          onClick={fitPage}
          aria-label='Fit page'
          aria-pressed={zoomMode === PROPOSAL_ZOOM_MODES.FIT_PAGE}
          className={cn(
            'hidden sm:inline-flex',
            zoomMode === PROPOSAL_ZOOM_MODES.FIT_PAGE && 'bg-bg-weak-100',
          )}
        >
          <Maximize2 className='size-3.5' aria-hidden />
          <span className='ml-1.5'>Fit page</span>
        </Button.Root>

        <Button.Root
          type='button'
          size='xsmall'
          variant='neutral'
          mode='stroke'
          onClick={fillPage}
          aria-label='Fill page'
          aria-pressed={zoomMode === PROPOSAL_ZOOM_MODES.FILL_PAGE}
          className={cn(
            'hidden sm:inline-flex',
            zoomMode === PROPOSAL_ZOOM_MODES.FILL_PAGE && 'bg-bg-weak-100',
          )}
        >
          <Scan className='size-3.5' aria-hidden />
          <span className='ml-1.5'>Fill page</span>
        </Button.Root>
      </div>

      <div className='proposal-preview-zoom-bar__page-nav flex shrink-0 items-center gap-2'>
        <span className='text-paragraph-xs text-text-sub-600'>Pages</span>

        <div className='proposal-preview-zoom-bar__page-input-wrap flex items-center gap-1 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1'>
          <input
            type='text'
            inputMode='numeric'
            pattern='[0-9]*'
            className='proposal-preview-zoom-bar__page-input w-7 border-0 bg-transparent p-0 text-center text-paragraph-xs text-text-strong-950 outline-none tabular-nums'
            value={pageInput}
            onChange={handlePageInputChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitPageInput();
              }
            }}
            onBlur={commitPageInput}
            aria-label='Jump to page'
          />
          <span className='text-paragraph-xs text-text-sub-600 tabular-nums'>/ {totalPages}</span>
        </div>

        <div className='flex items-center'>
          <Button.Root
            type='button'
            size='xsmall'
            variant='neutral'
            mode='ghost'
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            aria-label='Previous page'
          >
            <ChevronUp className='size-3.5' aria-hidden />
          </Button.Root>
          <Button.Root
            type='button'
            size='xsmall'
            variant='neutral'
            mode='ghost'
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            aria-label='Next page'
          >
            <ChevronDown className='size-3.5' aria-hidden />
          </Button.Root>
        </div>
      </div>
    </div>
  );
}
