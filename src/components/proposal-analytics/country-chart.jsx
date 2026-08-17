import React from 'react';

import { HorizontalBarChart } from '@/components/proposal-analytics/horizontal-bar-chart';
import { asArray } from '@/components/proposal-analytics/analytics-format-helpers';

export function CountryChart({ data }) {
  return (
    <HorizontalBarChart
      title='Country'
      data={asArray(data)}
      labelKey='country'
      valueKey='users'
      valueLabel='Visitors'
      emptyTitle='No country data'
      emptyDescription='Country is detected from visitor IP when the share link is opened.'
    />
  );
}

export default CountryChart;
