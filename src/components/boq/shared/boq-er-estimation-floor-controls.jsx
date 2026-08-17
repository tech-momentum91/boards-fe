import React, { memo } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';

import {
  BOQ_ER_VIEW_MODE_OPTIONS,
  BOQ_ER_VIEW_MODES,
} from '@/components/boq/shared/boq-er-estimation-constants';
import { cn } from '@/utils/cn';

const BoqErEstimationFloorControls = ({
  floors = [],
  activeFloorIndex = 0,
  onFloorChange,
  viewMode = BOQ_ER_VIEW_MODES.THREED,
  onViewModeChange,
}) => {
  const canGoPrev = floors.length > 0 && activeFloorIndex > 0;
  const canGoNext = floors.length > 0 && activeFloorIndex < floors.length - 1;
  const floorLabel =
    floors.length > 0 ? `${activeFloorIndex + 1}/${floors.length} floor` : '0/0 floor';

  return (
    <div className='flex shrink-0 items-center justify-center gap-1 px-4 pb-4 pt-2'>
      <div className='inline-flex rounded-[10px] bg-bg-weak-100 p-1'>
        {BOQ_ER_VIEW_MODE_OPTIONS.map((option) => {
          const isActive = viewMode === option.id;
          return (
            <button
              key={option.id}
              type='button'
              onClick={() => onViewModeChange?.(option.id)}
              className={cn(
                'h-6 rounded-md px-3 text-[14px] font-medium leading-5 tracking-[-0.084px] transition-colors',
                isActive
                  ? 'bg-bg-white-0 text-text-main-900 shadow-[0px_6px_10px_0px_rgba(27,28,29,0.06),0px_2px_4px_0px_rgba(27,28,29,0.02)]'
                  : 'text-text-soft-400',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className='rounded-[7px] border border-stroke-soft-200 bg-bg-weak-100 p-1.5'>
        <div className='flex items-center gap-1.5'>
          <button
            type='button'
            disabled={!canGoPrev}
            onClick={() => onFloorChange?.(activeFloorIndex - 1)}
            className='flex size-8 items-center justify-center rounded-lg border border-stroke-soft-200 bg-bg-weak-100 text-text-soft-400 disabled:opacity-40'
            aria-label='Previous floor'
          >
            <RiArrowLeftSLine className='size-5' />
          </button>
          <span className='whitespace-nowrap px-1 text-[14px] leading-5 tracking-[-0.084px] text-text-main-900'>
            {floorLabel}
          </span>
          <button
            type='button'
            disabled={!canGoNext}
            onClick={() => onFloorChange?.(activeFloorIndex + 1)}
            className='flex size-8 items-center justify-center rounded-lg border border-stroke-soft-200 bg-bg-white-0 text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] disabled:opacity-40'
            aria-label='Next floor'
          >
            <RiArrowRightSLine className='size-5' />
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(BoqErEstimationFloorControls);
