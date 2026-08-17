import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RiAlertFill } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';

const MaxTeamLimitModal = ({
  isOpen,
  onOpenChange,
  maxCount,
  centerId,
  onConfirm,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  const handleOk = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  const handleNavigateToConfig = (e) => {
    e.preventDefault();
    onOpenChange(false);
    if (centerId) {
      navigate(`/centers/${centerId}?tab=configuration&subtab=teams`);
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[440px] p-6 text-center rounded-20 bg-bg-white-0 shadow-regular-md'>
        <div className='flex flex-col items-center justify-center text-center w-full'>
          {/* Warning Icon */}
          <div className='p-3 bg-warning-lighter rounded-full inline-flex items-center justify-center text-warning-base mb-3'>
            <RiAlertFill size={32} />
          </div>

          {/* Modal Title */}
          <h3 className='text-heading-xs font-semibold text-text-strong-950 mb-3 text-center w-full'>
            Hired More than Required
          </h3>

          {/* Description Content */}
          <div className='flex flex-col items-center justify-center text-center gap-1.5 text-paragraph-sm text-text-sub-600 w-full mb-6'>
            <p className='m-0 p-0 text-center w-full leading-normal'>
              The maximum staff limit{' '}
              <span className='font-bold text-primary-base'>({maxCount ?? 'N/A'})</span> has been
              reached.
            </p>
            <p className='m-0 p-0 text-center w-full leading-normal'>
              You are adding an additional team member to this Center.
            </p>
            <p className='m-0 p-0 text-center w-full leading-normal'>
              If needed, update the limit in{' '}
              <a
                href={`/centers/${centerId}?tab=configuration&subtab=teams`}
                onClick={handleNavigateToConfig}
                className='font-semibold text-primary-base underline hover:text-primary-dark transition-colors'
              >
                Center → Config
              </a>
              .
            </p>
          </div>

          {/* Centered Action Button */}
          <div className='w-full flex justify-center items-center'>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='medium'
              onClick={handleOk}
              disabled={isLoading}
              className='w-full max-w-[180px] justify-center text-center'
            >
              {isLoading ? 'Processing...' : 'OK'}
            </Button.Root>
          </div>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
};

export default MaxTeamLimitModal;
