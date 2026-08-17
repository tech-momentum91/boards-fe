import React, { memo, useEffect, useMemo, useState } from 'react';
import { RiMoneyDollarCircleLine, RiSuitcaseLine } from 'react-icons/ri';

import { fetchProjectProcurementsStats } from '@/api/projectProcurements';
import ProjectProcurementsStatCard from '@/components/procurements/project-procurements-stat-card';
import {
  EMPTY_PROJECT_PROCUREMENT_STATS,
  formatProcurementAmount,
  formatProcurementCount,
} from '@/components/procurements/project-procurements-utils';

const ICON_MAP = {
  suitcase: RiSuitcaseLine,
  money: RiMoneyDollarCircleLine,
};

const STAT_CARD_CONFIG = [
  {
    key: 'total_projects',
    label: 'Total Projects',
    tone: 'pink',
    icon: 'suitcase',
    format: 'count',
  },
  {
    key: 'total_boq_value',
    label: 'Total BOQ Value',
    tone: 'yellow',
    icon: 'money',
    format: 'amount',
  },
  { key: 'total_po_value', label: 'Total PO Value', tone: 'blue', icon: 'money', format: 'amount' },
  {
    key: 'pending_po_value',
    label: 'Pending PO Value',
    tone: 'orange',
    icon: 'money',
    format: 'amount',
  },
  { key: 'total_paid', label: 'Total Paid', tone: 'purple', icon: 'money', format: 'amount' },
  {
    key: 'pending_vendor_payment',
    label: 'Pending Vendor Payment',
    tone: 'red',
    icon: 'money',
    format: 'amount',
  },
];

const ProjectProcurementsStatCards = memo(({ fiscalYearStart, filters = {} }) => {
  const [stats, setStats] = useState(EMPTY_PROJECT_PROCUREMENT_STATS);

  useEffect(() => {
    let cancelled = false;

    fetchProjectProcurementsStats({ fiscalYearStart, filters })
      .then((payload) => {
        if (!cancelled) setStats(payload);
      })
      .catch(() => {
        if (!cancelled) setStats(EMPTY_PROJECT_PROCUREMENT_STATS);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, fiscalYearStart]);

  const cards = useMemo(
    () =>
      STAT_CARD_CONFIG.map(({ key, label, tone, icon, format }) => ({
        label,
        tone,
        icon: ICON_MAP[icon],
        value:
          format === 'count'
            ? formatProcurementCount(stats[key])
            : formatProcurementAmount(stats[key]),
      })),
    [stats],
  );

  return (
    <div className='flex w-full min-w-0 items-center gap-4 overflow-x-auto'>
      {cards.map(({ value, label, tone, icon }) => (
        <ProjectProcurementsStatCard
          key={label}
          value={value}
          label={label}
          tone={tone}
          icon={icon}
          className='min-w-[140px]'
        />
      ))}
    </div>
  );
});

ProjectProcurementsStatCards.displayName = 'ProjectProcurementsStatCards';

export default ProjectProcurementsStatCards;
