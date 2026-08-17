import React from 'react';
import { PARTNER_STATS_CONFIG } from './constants';

const StatCard = ({ label, value, icon: Icon, gradient, text, icon_color }) => (
  <div
    className={`flex min-h-[96px] items-center justify-between gap-4 rounded-2xl bg-linear-to-b px-4 py-4 shadow-[0px_2px_4px_rgba(27,28,29,0.04)] ${gradient}`}
  >
    <div className='flex flex-col gap-2'>
      <div className={`text-title-h5 ${text}`}>{value}</div>
      <span className={`text-subheading-sm ${text} opacity-70`}>{label}</span>
    </div>
    <div className='flex items-center justify-center p-1 shrink-0 rounded-full bg-white/90 shadow-[0px_2px_4px_rgba(27,28,29,0.1)] self-start'>
      <Icon className={`size-5 ${icon_color}`} />
    </div>
  </div>
);

const PartnerStats = ({ stats = {} }) => {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-5'>
      {PARTNER_STATS_CONFIG.map((config) => (
        <StatCard key={config.key} {...config} value={stats[config.key] || '0'} />
      ))}
    </div>
  );
};

export default PartnerStats;
