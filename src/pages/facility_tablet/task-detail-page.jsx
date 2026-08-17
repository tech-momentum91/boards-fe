import React, { useState } from 'react';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Checkbox from '@/components/ui/checkbox';
import {
  RiCalendarLine,
  RiImage2Line,
  RiCameraLine,
  RiArrowLeftLine,
  RiTaskFill,
} from 'react-icons/ri';
import { COMPLETED_CHECKLIST_ITEMS } from './constant';
import { useNavigate } from 'react-router-dom';

const TaskDetailCardComponent = ({ children, cardTitle, CardIcon }) => {
  return (
    <div className='w-full h-full flex flex-col bg-white border-1 border-stroke-soft-200 shadow-regular-sm rounded-lg p-4'>
      <span className='label-medium flex items-center gap-1'>
        {CardIcon}

        {cardTitle}
      </span>
      {children}
    </div>
  );
};

const TaskDetailPage = () => {
  const navigate = useNavigate();
  const [checklistState, setChecklistState] = useState(
    COMPLETED_CHECKLIST_ITEMS.reduce((acc, item) => {
      acc[item.checklistTitle] = item.isCompleted;
      return acc;
    }, {}),
  );

  return (
    <div className='flex flex-col gap-4 bg-bg-weak-100 max-w-[400px] h-screen'>
      <div className='w-full h-[50px] bg-white flex flex-col gap-1 items-start justify-center px-4'>
        <div className='w-full flex gap-2 items-center justify-start'>
          <Button.Root onClick={() => navigate(-1)} variant='neutral' mode='ghost'>
            <Button.Icon as={RiArrowLeftLine} />
          </Button.Root>

          <div className='w-full flex flex-col items-start'>
            <span className='label-medium'>Waiting Lounge</span>
            <div className='flex items-center gap-1'>
              <Badge.Root variant='stroke' color='gray'>
                Daily
              </Badge.Root>

              <Badge.Root variant='stroke' color='gray'>
                Floor 1
              </Badge.Root>
            </div>
          </div>
        </div>
      </div>

      <div className='w-full px-4 gap-4 flex flex-col flex-1 overflow-y-auto pb-28'>
        <TaskDetailCardComponent
          cardTitle='Checklist'
          CardIcon={<RiTaskFill color='var(--color-text-soft-400)' />}
        >
          <div className='w-full flex flex-col gap-[6px] pt-4'>
            {COMPLETED_CHECKLIST_ITEMS.map((item) => (
              <label
                className='w-full label-small flex items-center gap-2 p-2 rounded-md bg-bg-weak-100'
                key={item.checklistTitle}
              >
                <Checkbox.Root
                  checked={Boolean(checklistState[item.checklistTitle])}
                  onCheckedChange={(checked) =>
                    setChecklistState((prev) => ({
                      ...prev,
                      [item.checklistTitle]: checked === true,
                    }))
                  }
                />

                {item.checklistTitle}
              </label>
            ))}
          </div>
        </TaskDetailCardComponent>

        <TaskDetailCardComponent
          cardTitle='Task Completion Photos'
          CardIcon={<RiImage2Line color='var(--color-text-soft-400)' />}
        >
          <div className='w-full pt-5 flex flex-col items-center text-center'>
            <div className='size-16 rounded-full bg-bg-soft-200 flex items-center justify-center'>
              <RiImage2Line size={28} className='text-text-soft-400' />
            </div>
            <span className='pt-4 label-medium text-text-strong-950'>No Photos</span>
            <span className='pt-2 label-small text-text-soft-400'>
              Add Minimum of 1 photo to finish this task.
            </span>

            <div className='w-full flex justify-center pt-4'>
              <Button.Root className='gap-3 w-full' variant='neutral' mode='stroke' size='small'>
                <Button.Icon as={RiCameraLine} />
                Click to take photo
              </Button.Root>
            </div>
          </div>
        </TaskDetailCardComponent>

        <TaskDetailCardComponent
          cardTitle='Task Details'
          CardIcon={<RiTaskFill color='var(--color-text-soft-400)' />}
        >
          <div className='flex  items-center gap-2 pt-2'>
            <RiCalendarLine />
            <span className='paragraph-small' />
          </div>
        </TaskDetailCardComponent>
      </div>

      <div className='fixed bottom-0 w-full max-w-[400px] px-4 pb-4 pt-3 bg-gradient-to-t from-bg-weak-100 to-transparent'>
        <Button.Root variant='primary' mode='filled' className='w-full' size='small'>
          Finish
        </Button.Root>
      </div>
    </div>
  );
};

export default TaskDetailPage;
