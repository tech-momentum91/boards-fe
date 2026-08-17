import React, { useCallback, useEffect, useState } from 'react';

import ClientHotDeskMonthDayGrid from '@/components/clients-management/client-detail-allocate/client-hot-desk-month-day-grid';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';

/**
 * Multiselect day-of-month picker (1–31) for monthly recurrence.
 *
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   selectedMonthDays: number[],
 *   onSave: (monthDays: number[]) => void,
 * }} props
 */
export default function ClientHotDeskSelectDatesModal({
  open,
  onOpenChange,
  selectedMonthDays,
  onSave,
}) {
  const [draftMonthDays, setDraftMonthDays] = useState([]);

  useEffect(() => {
    if (!open) return;
    setDraftMonthDays([...selectedMonthDays]);
  }, [open, selectedMonthDays]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleSave = useCallback(() => {
    onSave(draftMonthDays);
    onOpenChange(false);
  }, [draftMonthDays, onOpenChange, onSave]);

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content className='z-[61] max-w-[400px]' overlayClassName='z-[60]'>
        <Modal.Header title='Select Dates' />
        <Modal.Body className='flex justify-center'>
          <ClientHotDeskMonthDayGrid selectedDays={draftMonthDays} onChange={setDraftMonthDays} />
        </Modal.Body>
        <Modal.Footer className='justify-end gap-2 sm:justify-between'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='w-full'
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            className='w-full'
            onClick={handleSave}
          >
            Save
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
