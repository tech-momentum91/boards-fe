import React from 'react';

import { HorizontalBarChart } from '@/components/proposal-analytics/horizontal-bar-chart';
import { asArray } from '@/components/proposal-analytics/analytics-format-helpers';

export function DeviceChart({ data }) {
  return (
    <HorizontalBarChart
      title='Devices'
      data={asArray(data)}
      labelKey='device'
      valueKey='users'
      valueLabel='Visitors'
      emptyTitle='No device data'
      emptyDescription='Device distribution appears after tracked visits.'
    />
  );
}

export default DeviceChart;
