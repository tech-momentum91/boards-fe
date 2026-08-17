import React, { memo } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiCloseLine,
  RiExpandDiagonalLine,
  RiFullscreenExitLine,
} from 'react-icons/ri';

import ProjectBoqNewMenu from '@/components/boq/project-boqs/components/project-boq-new-menu';
import * as Button from '@/components/ui/button';

const ProjectBoqDetailHeader = memo(
  ({ title, subtitle, onClose, onAddBoqType, isFullscreen = false, onToggleFullscreen }) => (
    <header className='shrink-0 border-b border-[#e5e7eb] bg-bg-white-0 px-8 pt-6 pb-5'>
      <div className='flex items-start justify-between gap-6'>
        <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
          <h1 className='truncate text-[18px] font-medium leading-7 tracking-[-0.45px] text-[#0a0a0a]'>
            {title}
          </h1>
          {subtitle ? (
            <p className='truncate text-[12px] leading-4 text-[#737373]'>{subtitle}</p>
          ) : null}
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          <ProjectBoqNewMenu onSelect={onAddBoqType}>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='medium'
              className='h-8 shrink-0 gap-0.5 px-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
            >
              <Button.Icon as={RiAddLine} className='size-5' />
              <span className='px-1 text-label-sm font-medium text-text-sub-500'>Add BOQ</span>
              <Button.Icon as={RiArrowDownSLine} className='size-5 text-text-sub-500' />
            </Button.Root>
          </ProjectBoqNewMenu>

          {onToggleFullscreen ? (
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='medium'
              className='size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
              aria-label={isFullscreen ? 'Exit full screen' : 'Expand to full screen'}
              aria-pressed={isFullscreen}
              onClick={onToggleFullscreen}
            >
              <Button.Icon
                as={isFullscreen ? RiFullscreenExitLine : RiExpandDiagonalLine}
                className='size-5'
              />
            </Button.Root>
          ) : null}

          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='medium'
            className='size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
            aria-label='Close project BOQ'
            onClick={onClose}
          >
            <Button.Icon as={RiCloseLine} className='size-5' />
          </Button.Root>
        </div>
      </div>
    </header>
  ),
);

ProjectBoqDetailHeader.displayName = 'ProjectBoqDetailHeader';

export default ProjectBoqDetailHeader;
