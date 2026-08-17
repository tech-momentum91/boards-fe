import React from 'react';

import { HorizontalBarChart } from '@/components/proposal-analytics/horizontal-bar-chart';
import { asArray } from '@/components/proposal-analytics/analytics-format-helpers';

export function OSChart({ data }) {
  return (
    <HorizontalBarChart
      title='Operating system'
      data={asArray(data)}
      labelKey='os'
      valueKey='users'
      valueLabel='Visitors'
      emptyTitle='No OS data'
      emptyDescription='OS breakdown appears after tracked visits.'
    />
  );
}

export default OSChart;
