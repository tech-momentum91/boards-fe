import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RiDownloadLine } from 'react-icons/ri';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import { selectCenterAccess } from '@/redux/centerSlice';
import CenterAccessDropdown from '@/components/center-access-dropdown';

const CenterExportModal = ({ open, onOpenChange, onExport, isExporting = false }) => {
  const centersAccess = useSelector(selectCenterAccess);
  const centers = centersAccess.data || [];

  const [selectedCenters, setSelectedCenters] = useState([]);

  // Initialize/reset selection
  useEffect(() => {
    if (open) {
      setSelectedCenters(centers.map((c) => c.name));
    } else {
      setSelectedCenters([]);
    }
  }, [open, centers]);

  const handleExport = useCallback(() => {
    const centersByZone = centers.reduce((acc, c) => {
      if (!c.zone) return acc;
      if (!acc[c.zone]) acc[c.zone] = [];
      acc[c.zone].push(c.name);
      return acc;
    }, {});

    const selectedCentersByZone = selectedCenters.reduce((acc, cId) => {
      const center = centers.find((c) => c.name === cId);
      if (center && center.zone) {
        if (!acc[center.zone]) acc[center.zone] = [];
        acc[center.zone].push(cId);
      }
      return acc;
    }, {});

    const zonesPayload = {};
    Object.keys(selectedCentersByZone).forEach((zoneName) => {
      const selectedInZone = selectedCentersByZone[zoneName];
      const allInZone = centersByZone[zoneName] || [];
      if (selectedInZone.length === allInZone.length && allInZone.length > 0) {
        zonesPayload[zoneName] = [];
      } else {
        zonesPayload[zoneName] = selectedInZone;
      }
    });

    onExport?.({ zones: zonesPayload });
  }, [onExport, selectedCenters, centers]);

  const hasFilters = selectedCenters.length > 0 && selectedCenters.length < centers.length;

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[480px]'>
        <Modal.Header
          icon={RiDownloadLine}
          title='Export Centers as PDF'
          description='Select filters to export center data.'
        />

        <Modal.Body className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label.Root>Select Centers</Label.Root>
            <CenterAccessDropdown
              centers={centers}
              selectedCenters={selectedCenters}
              onChange={setSelectedCenters}
              isLoading={centersAccess.status === 'loading'}
            />
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='small'
            className='w-full'
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button.Root>
          <Button.Root
            variant='primary'
            mode='filled'
            size='small'
            className='w-full'
            onClick={handleExport}
            disabled={isExporting || selectedCenters.length === 0}
          >
            {isExporting ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                Exporting...
              </span>
            ) : hasFilters ? (
              'Export Filtered'
            ) : (
              'Export All'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CenterExportModal;
