import React, { useMemo } from 'react';
import * as Button from '@/components/ui/button';
import { RiPlayLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import CircularProgress from '@/components/ui/circular-progress';

const TaskListCardComponent = ({
  textTitle,
  viewType,
  floor,
  isOverdue,
  startTime,
  dueBy,
  onSelect,
}) => {
  const progressColor = useMemo(() => {
    const colors = ['red', 'green', 'blue', 'orange', 'purple', 'teal', 'pink', 'sky', 'yellow'];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  return (
    <div
      className='w-full p-4 bg-white rounded-lg shadow-regular-md flex items-center flex-col cursor-pointer'
      onClick={onSelect}
      role='button'
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.();
        }
      }}
    >
      <div className='w-full flex items-center justify-between'>
        <div className='w-full flex flex-col items-start gap-2'>
          <div className='w-full flex items-center gap-2'>
            <CircularProgress
              percentage={67}
              color={progressColor}
              size={18}
              aria-label='Task progress'
            />
            <span className='label-small'>{textTitle}</span>
          </div>

          <div className='w-full flex items-center gap-1.5'>
            <Badge.Root variant='stroke' color='gray'>
              {viewType}
            </Badge.Root>

            <Badge.Root variant='stroke' color='gray'>
              {floor}
            </Badge.Root>

            {isOverdue && (
              <Badge.Root variant='light' color='red'>
                Overdue
              </Badge.Root>
            )}
          </div>
        </div>

        <Button.Root
          variant='primary'
          mode='filled'
          className='gap-1'
          size='xsmall'
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.();
          }}
        >
          <Button.Icon as={RiPlayLine} />
          Start
        </Button.Root>
      </div>

      <div className='w-full pt-4 flex items-center justify-between'>
        <span className='label-xsmall text-text-sub-500'>Start Time {startTime}</span>
        <span className='label-xsmall text-text-sub-500'>Due by {dueBy}</span>
      </div>
    </div>
  );
};

export default TaskListCardComponent;
