import React from 'react';
import { RiBuilding2Line, RiGroupLine } from 'react-icons/ri';

/**
 * Read-only card for a client sub-space region on the floor plan.
 *
 * @param {{
 *   title: string,
 *   areaTypeLabel?: string,
 *   clientDepartment?: string,
 *   className?: string,
 * }} props
 */
export function ClientSubspaceHoverCard({
  title,
  areaTypeLabel = '',
  clientDepartment = '',
  className = '',
}) {
  const department = String(clientDepartment || '').trim();
  const areaLabel = String(areaTypeLabel || '').trim();

  return (
    <div
      className={`w-[min(280px,calc(100vw-1.5rem))] rounded-xl border border-stroke-soft-200 bg-white p-4 shadow-[0px_8px_20px_0px_rgba(0,0,0,0.08)] ${className}`}
      role='tooltip'
    >
      <p className='text-[18px] font-semibold leading-6 text-text-strong-950'>{title}</p>

      <p className='mt-2 flex items-center gap-2 text-[13px] leading-5 text-text-sub-600'>
        <RiGroupLine aria-hidden className='size-4 shrink-0 text-text-sub-500' />
        <span className='font-medium text-text-strong-950'>{department || '—'}</span>
      </p>

      {areaLabel ? (
        <p className='mt-1.5 flex items-center gap-2 text-[13px] leading-5 text-text-sub-600'>
          <RiBuilding2Line aria-hidden className='size-4 shrink-0 text-text-sub-500' />
          <span>{areaLabel}</span>
        </p>
      ) : null}
    </div>
  );
}
