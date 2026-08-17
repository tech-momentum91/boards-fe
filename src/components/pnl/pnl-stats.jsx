import React, { useMemo } from 'react';
import {
  RiBillFill,
  RiHandCoinFill,
  RiTimeFill,
  RiMoneyDollarCircleFill,
  RiLineChartFill,
  RiPercentFill,
} from 'react-icons/ri';

import { formatInrCompact } from '@/utils/inr-format';

const formatPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '--';
  return `${n.toFixed(2)}%`;
};

const STATS_CONFIG = {
  billed: {
    label: 'BILLED',
    icon: RiBillFill,
    styles: {
      gradient: 'from-[#cac2ff] to-[#eeebff]',
      text: 'text-[#2b1664]',
      icon: 'text-[#5A36BF]',
    },
  },
  collected: {
    label: 'COLLECTED',
    icon: RiHandCoinFill,
    styles: {
      gradient: 'from-[#fbedb1] to-[#fef7ec]',
      text: 'text-[#693d11]',
      icon: 'text-[#B47818]',
    },
  },
  pending: {
    label: 'PENDING',
    icon: RiTimeFill,
    styles: {
      gradient: 'from-[#c2d6ff] to-[#ebf1ff]',
      text: 'text-[#162664]',
      icon: 'text-[#253EA7]',
    },
  },
  opex: {
    label: 'OPEX',
    icon: RiMoneyDollarCircleFill,
    styles: {
      gradient: 'from-[#f9c2ff] to-[#fdebff]',
      text: 'text-[#620f6c]',
      icon: 'text-[#9C23A9]',
    },
  },
  profit: {
    label: 'PROFIT',
    icon: RiLineChartFill,
    styles: {
      gradient: 'from-[#b7f0e2] to-[#e9fbf6]',
      text: 'text-[#0b4b3b]',
      icon: 'text-[#0b7a62]',
    },
  },
  margin_pct: {
    label: 'MARGIN %',
    icon: RiPercentFill,
    styles: {
      gradient: 'from-[#ffd6c2] to-[#fff1eb]',
      text: 'text-[#5b1f0a]',
      icon: 'text-[#C2540A]',
    },
  },
};

const StatCard = ({ label, value, icon: Icon, styles }) => (
  <div
    className={`flex min-h-[96px] items-center justify-between gap-4 rounded-2xl bg-linear-to-b px-4 py-4 shadow-[0px_2px_4px_rgba(27,28,29,0.04)] ${styles.gradient}`}
  >
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        <div className={`text-title-h5 ${styles.text}`}>{value}</div>
      </div>
      <div className='flex items-center gap-1.5'>
        <span className={`text-subheading-sm ${styles.text} opacity-70`}>{label}</span>
      </div>
    </div>

    <div className='flex items-center justify-center p-1 shrink-0 rounded-full bg-white/90 shadow-[0px_2px_4px_rgba(27,28,29,0.1)] self-start'>
      <Icon className={`size-5 ${styles.icon}`} />
    </div>
  </div>
);

const PnlStats = ({ rows = [], statusCounts = null }) => {
  const totals = useMemo(() => {
    if (statusCounts && typeof statusCounts === 'object') {
      const billed = Number(statusCounts.billed_amount) || 0;
      const collected = Number(statusCounts.collected_amount) || 0;
      const pending = Number(statusCounts.pending_amount) || 0;
      const opex = Number(statusCounts.opex_amount) || 0;
      const profit = Number(statusCounts.profit) || 0;
      const marginPct = billed > 0 ? (profit / billed) * 100 : 0;

      return {
        billed: formatInrCompact(billed),
        collected: formatInrCompact(collected),
        pending: formatInrCompact(pending),
        opex: formatInrCompact(opex),
        profit: formatInrCompact(profit),
        margin_pct: formatPercent(marginPct),
      };
    }

    const t = rows.reduce(
      (acc, r) => {
        acc.billed += Number(r.billed) || 0;
        acc.collected += Number(r.collected) || 0;
        acc.pending += Number(r.pending) || 0;
        acc.opex += Number(r.opex) || 0;
        acc.profit += Number(r.profit) || 0;
        return acc;
      },
      { billed: 0, collected: 0, pending: 0, opex: 0, profit: 0 },
    );

    const marginPct = t.billed > 0 ? (t.profit / t.billed) * 100 : 0;

    return {
      billed: formatInrCompact(t.billed || 0),
      collected: formatInrCompact(t.collected || 0),
      pending: formatInrCompact(t.pending || 0),
      opex: formatInrCompact(t.opex || 0),
      profit: formatInrCompact(t.profit || 0),
      margin_pct: formatPercent(marginPct),
    };
  }, [rows, statusCounts]);

  const statKeys = ['billed', 'collected', 'pending', 'opex', 'profit', 'margin_pct'];

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 mt-5'>
      {statKeys.map((key) => {
        const cfg = STATS_CONFIG[key];
        return (
          <StatCard
            key={key}
            label={cfg.label}
            icon={cfg.icon}
            styles={cfg.styles}
            value={totals[key]}
          />
        );
      })}
    </div>
  );
};

export default PnlStats;
