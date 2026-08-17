import React from 'react';

import DashboardWidgetPreview from '@/components/dashboard-master/viewer/dashboard-widget-preview';

/** Renders the live chart preview inside the builder slide-over. */
export default function ChartPreview(props) {
  return <DashboardWidgetPreview variant='builder' {...props} />;
}
