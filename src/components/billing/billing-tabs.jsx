import React from 'react';
import * as ButtonGroup from '@/components/ui/button-group';
import { BILLING_TAB_OPTIONS } from '@/components/billing/constants';

const BillingTabs = ({ value = 'all', onValueChange }) => {
  return (
    <ButtonGroup.Root size='small'>
      {BILLING_TAB_OPTIONS.map((tab) => {
        return (
          <ButtonGroup.Item
            data-state={tab.value.toLowerCase() === value ? 'on' : 'off'}
            onClick={(e) => {
              e.preventDefault();
              onValueChange?.(tab.value);
            }}
            className={
              'w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
            }
            size='small'
            key={tab.value}
          >
            {tab.label}
          </ButtonGroup.Item>
        );
      })}
    </ButtonGroup.Root>
  );
};

export default React.memo(BillingTabs);
