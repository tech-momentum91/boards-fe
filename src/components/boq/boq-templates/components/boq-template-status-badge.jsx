import React, { memo } from 'react';

import { BOQ_TEMPLATE_STATUS } from '@/components/boq/constants';
import * as Badge from '@/components/ui/badge';

const boqTemplateStatusBadgeColor = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === BOQ_TEMPLATE_STATUS.REVIEW) return 'orange';
  if (normalized === BOQ_TEMPLATE_STATUS.ACTIVE) return 'green';
  return 'gray';
};

const formatStatusLabel = (status) => {
  const normalized = String(status || '').trim();
  if (!normalized) return '--';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
};

const BoqTemplateStatusBadge = ({ status }) => {
  return (
    <Badge.Root
      size='small'
      variant='light'
      color={boqTemplateStatusBadgeColor(status)}
      className='min-w-[72px] justify-center whitespace-nowrap uppercase'
    >
      {formatStatusLabel(status)}
    </Badge.Root>
  );
};

export default memo(BoqTemplateStatusBadge);
