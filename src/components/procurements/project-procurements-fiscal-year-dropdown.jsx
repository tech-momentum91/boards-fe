import React, { memo } from 'react';

import * as Select from '@/components/ui/select';
import { buildFiscalYearOptions } from '@/components/procurements/project-procurements-utils';

const FISCAL_YEAR_OPTIONS = buildFiscalYearOptions();

const ProjectProcurementsFiscalYearDropdown = memo(({ value, onValueChange }) => (
  <Select.Root size='xsmall' value={value} onValueChange={onValueChange}>
    <Select.Trigger className='min-w-[132px]'>
      <Select.Value placeholder='Select FY' />
    </Select.Trigger>
    <Select.Content>
      {FISCAL_YEAR_OPTIONS.map((option) => (
        <Select.Item key={option.value} value={option.value}>
          {option.label}
        </Select.Item>
      ))}
    </Select.Content>
  </Select.Root>
));

ProjectProcurementsFiscalYearDropdown.displayName = 'ProjectProcurementsFiscalYearDropdown';

export default ProjectProcurementsFiscalYearDropdown;
