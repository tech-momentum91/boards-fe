import React from 'react';
import { PARTICIPANTS_GROUP_STATS_CARDS } from '@/components/event-management/constant';

function ParticipantsStatCard({ label, value, icon: Icon, styles }) {
  return (
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
}

function formatParticipantStatNumber(n) {
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const EventParticipantsStatsCards = ({ aggregates }) => {
  if (!aggregates) return null;

  const { noOfClients, totalSeats, totalExpected, participantsPct } = aggregates;
  const cardValues = {
    no_of_clients: noOfClients.toLocaleString(),
    total_participants_seats: formatParticipantStatNumber(totalSeats),
    total_expected: formatParticipantStatNumber(totalExpected),
    total_participants_pct: participantsPct,
  };

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {PARTICIPANTS_GROUP_STATS_CARDS.map((card) => (
        <ParticipantsStatCard
          key={card.key}
          label={card.label}
          value={cardValues[card.key]}
          icon={card.icon}
          styles={card.styles}
        />
      ))}
    </div>
  );
};

export default EventParticipantsStatsCards;
