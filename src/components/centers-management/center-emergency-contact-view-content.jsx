import React from 'react';
import { RiPhoneLine, RiPriceTag3Line, RiUser3Line } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import FieldRow from '@/components/ui/field-row';

const CenterEmergencyContactViewContent = ({ contact, onClose }) => {
  return (
    <>
      <Modal.Body className='flex flex-col gap-6'>
        <div className='flex flex-col gap-3'>
          <h3 className='text-label-md text-neutral-500'>Contact information</h3>
          <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
            <FieldRow icon={RiPriceTag3Line} label='Category'>
              <span className='text-paragraph-sm text-text-main-900 px-1'>
                {contact?.category || '—'}
              </span>
            </FieldRow>
            <FieldRow icon={RiUser3Line} label='Contact Name'>
              <span className='text-paragraph-sm text-text-main-900 px-1'>
                {contact?.contact_name || '—'}
              </span>
            </FieldRow>
            <FieldRow icon={RiPhoneLine} label='Contact Number'>
              <span className='text-paragraph-sm text-text-main-900 px-1'>
                {contact?.contact_number || '—'}
              </span>
            </FieldRow>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className='flex items-center justify-end gap-3 w-full'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='medium'
            onClick={onClose}
          >
            Close
          </Button.Root>
        </div>
      </Modal.Footer>
    </>
  );
};

export default CenterEmergencyContactViewContent;
