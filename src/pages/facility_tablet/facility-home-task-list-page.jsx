import { useEffect, useState } from 'react';
import { TASK_LIST_CARD_CONSTANTS, COMPLETED_TASK_LIST_CARD_CONSTANTS } from './constant';
import { useDispatch } from 'react-redux';

import { fetchCenterTrackerTabsThunk } from '../../redux/centerTrackerSlice';
import { RiErrorWarningFill, RiTaskFill, RiTimeFill, RiTranslate } from 'react-icons/ri';
import * as Avatar from '@/components/ui/avatar';
import * as Alert from '@/components/ui/alert';
import * as Badge from '@/components/ui/badge';
import CardContentComponent from './card-content-component';
import TaskListCardComponent from './task-list-card-component';
import CircularProgress from '@/components/ui/circular-progress';
import { useNavigate } from 'react-router-dom';

const CompletedTabContent = ({ handleNavigate, ...props }) => {
  // console.log('props in hartik', props);
  return (
    <div
      onClick={handleNavigate}
      className='w-full rounded-md  bg-white flex shadow-regular-md flex-col gap-2 p-4 items-center'
    >
      <div className='w-full gap-1 flex items-center'>
        <CircularProgress percentage={100} color='green' size={12} aria-label='task-label' />
        <span className='label-small text-text-main-900'>Waiting Lounge</span>
      </div>

      <div className='w-full flex items-center gap-1'>
        <Badge.Root variant='stroke' color='gray'>
          Daily
        </Badge.Root>

        <Badge.Root variant='stroke' color='gray'>
          Floor 1
        </Badge.Root>
      </div>
    </div>
  );
};

const FacilityHomeTaskListPage = () => {
  const [centerId, setCenterId] = useState(null);
  const dispatch = useDispatch();
  const [showOverdueAlert, setShowOverdueAlert] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate('/facility-tablet/task-detail');
  };

  // const fetchTabsList = async () => {
  //   try{

  //     const response = dispatch(fetchCenterTrackerTabsThunk(centerId));
  //     console.log('response in hartik', response);
  //   }
  //   catch(error){
  //     console.log('error in hartik', error);
  //   }
  // }

  // useEffect(() => {
  //   fetchTabsList();;
  // }, [centerId]);

  return (
    <div className='flex flex-col gap-4  mb-4 bg-bg-weak-100 max-w-[400px] h-screen'>
      <div className='w-full bg-white flex px-4'>
        <div className='w-full  flex min-h-20 items-center justify-between'>
          {/* my task with icon */}
          <div className='flex items-center gap-2'>
            <span className='p-[6px] rounded-full bg-gradient-to-b from-[#CAC2FF] to-[#EEEBFF] '>
              <RiTaskFill color='purple' size={12} />
            </span>
            <span className='label-small text-main-900'>My Task</span>
          </div>

          <div className='flex items-center gap-2'>
            <RiTranslate size={20} />

            <Avatar.Root size={32}>
              <Avatar.Image src='https://github.com/shadcn.png' alt='Avatar' />
            </Avatar.Root>
          </div>
        </div>
      </div>

      <div className='w-full flex flex-col gap-4 px-4'>
        <CardContentComponent>
          <div className='w-full items-center flex gap-2'>
            <RiTimeFill color='green' />
            <span className='paragraph-small'>{"Today's Active tasks"}</span>
          </div>

          <div className='w-full items-center gap-4 flex '>
            <span className='text-main-900 title-h4'>
              8 <span className='text-neutral-400 title-h4'>out of 16</span>
            </span>

            <Badge.Root variant='light' color='red' size='small'>
              1 overdue task
            </Badge.Root>
          </div>
        </CardContentComponent>

        <div className='w-full flex items-center p-1 border-1 border-stroke-soft-200 rounded-md bg-[#F1F3F5]'>
          <div className='w-full flex rounded-md items-center justify-between'>
            <button
              type='button'
              onClick={() => setActiveTab('pending')}
              className={[
                'w-full flex items-center justify-center gap-2 rounded-md py-2 label-small transition-colors',
                activeTab === 'pending'
                  ? 'bg-white text-main-900'
                  : 'bg-transparent text-neutral-500',
              ].join(' ')}
            >
              {activeTab == 'pending' && (
                <span className='w-[7px] h-[7px] bg-primary-base rounded-full' />
              )}
              Pending
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('completed')}
              className={[
                'w-full flex items-center justify-center rounded-md py-2 gap-2 label-small transition-colors',
                activeTab === 'completed'
                  ? 'bg-white text-main-900'
                  : 'bg-transparent text-neutral-500',
              ].join(' ')}
            >
              {activeTab == 'completed' && (
                <span className='w-[7px] h-[7px] bg-primary-base rounded-full' />
              )}
              Completed
            </button>
          </div>
        </div>

        {/* error msg */}

        {showOverdueAlert ? (
          <Alert.Root variant='light' status='error' size='xsmall' wrapperClassName='items-center'>
            <Alert.Icon className='text-[var(--color-error-darker)]' as={RiErrorWarningFill} />
            <span className='paragraph-xsmall'>
              Complete overdue tasks immediately to avoid missing it.
            </span>
            <button
              type='button'
              aria-label='Dismiss alert'
              onClick={() => setShowOverdueAlert(false)}
              className='ml-auto'
            >
              <Alert.CloseIcon className='text-[var(--color-error-darker)]' />
            </button>
          </Alert.Root>
        ) : null}

        {activeTab == 'pending'
          ? TASK_LIST_CARD_CONSTANTS.map((item) => (
              <TaskListCardComponent key={item.id} {...item} onSelect={handleNavigate} />
            ))
          : COMPLETED_TASK_LIST_CARD_CONSTANTS.map((item) => (
              <CompletedTabContent handleNavigate={handleNavigate} key={item.id} {...item} />
            ))}
      </div>
    </div>
  );
};

export default FacilityHomeTaskListPage;
