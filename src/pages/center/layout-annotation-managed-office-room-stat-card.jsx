import React from 'react';
import { RiHomeLine } from 'react-icons/ri';

function formatManagedOfficeRoomCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '00';
  return String(Math.floor(n)).padStart(2, '0');
}

/**
 * Managed-office room breakdown tile (matches layout detail `space.details` counts).
 *
 * @param {{ label: string, value: number | string | null | undefined }} props
 */
export default function ManagedOfficeRoomStatCard({ label, value }) {
  return (
    <div className='relative overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3 shadow-regular-xs'>
      <div
        className='pointer-events-none absolute inset-0 opacity-50'
        style={{
          backgroundImage:
            'repeating-radial-gradient(circle at 82% 16%, transparent 0, transparent 9px, rgba(148,163,184,0.14) 9px, rgba(148,163,184,0.14) 10px)',
        }}
        aria-hidden
      />
      <RiHomeLine className='absolute right-2.5 top-2.5 size-4 text-text-soft-400' aria-hidden />
      <div className='relative flex flex-col gap-1 pr-7'>
        <span className='label-sm font-medium leading-4 text-text-sub-500'>{label}</span>
        <span className='text-[22px] font-bold leading-7 tracking-[-0.44px] text-text-soft-400'>
          {formatManagedOfficeRoomCount(value)}
        </span>
      </div>
    </div>
  );
}
