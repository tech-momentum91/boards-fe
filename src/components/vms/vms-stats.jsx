import React from 'react';
import { RiGroupLine } from 'react-icons/ri';
import { STATS_DISPLAY_CONFIG, STATS_ORDER } from '@/components/vms/constants';

const VmsStats = ({ stats = [], activeEventParticipants = 0 }) => {
  // Build a lookup from API stats array
  const statsMap = React.useMemo(() => {
    const map = {};
    if (Array.isArray(stats)) {
      stats.forEach((s) => {
        map[s.id] = s;
      });
    }
    return map;
  }, [stats]);

  const cards = React.useMemo(() => {
    return STATS_ORDER.map((id) => {
      if (id === 'active_event_participants') {
        return {
          id,
          label: 'ACTIVE EVENT PARTICIPANTS',
          value: activeEventParticipants,
          icon: RiGroupLine,
          gradient: 'from-[#e8e1ff] to-[#f3eeff]',
          textColor: 'text-[#5b21b6]',
          iconColor: 'text-[#7c3aed]',
        };
      }

      const apiStat = statsMap[id];
      const display = STATS_DISPLAY_CONFIG[id];
      if (!display) return null;

      return {
        id,
        label: display.label,
        value: apiStat?.value ?? 0,
        icon: display.icon,
        gradient: display.gradient,
        textColor: display.textColor,
        iconColor: display.iconColor,
      };
    }).filter(Boolean);
  }, [statsMap, activeEventParticipants]);

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-5'>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`flex min-h-[96px] items-center justify-between gap-4 rounded-2xl bg-linear-to-b px-4 py-4 shadow-[0px_2px_4px_rgba(27,28,29,0.04)] ${card.gradient}`}
          >
            <div className='flex flex-col gap-2'>
              <div className={`text-title-h5 ${card.textColor}`}>{card.value}</div>
              <div className={`text-subheading-sm ${card.textColor} opacity-70`}>{card.label}</div>
            </div>
            <div className='flex items-center justify-center p-1 shrink-0 rounded-full bg-white/90 shadow-[0px_2px_4px_rgba(27,28,29,0.1)] self-start'>
              <Icon className={`size-5 ${card.iconColor}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VmsStats;
