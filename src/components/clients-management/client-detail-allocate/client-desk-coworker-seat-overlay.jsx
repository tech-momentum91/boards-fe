import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiUserAddFill } from 'react-icons/ri';

import { getDeskCoworkerSchedule } from '@/api/clientFloorLayout';
import {
  ClientDeskCoworkerHoverCard,
  getCoworkerDetailsDisplayName,
} from '@/components/clients-management/client-detail-allocate/client-desk-coworker-hover-card';
import { CrmAccountAvatar, getInitials } from '@/components/crm-accounts/crm-account-avatar';
import { cn } from '@/utils/cn';
import {
  getCoworkerAssignmentOverflowCount,
  normalizeDeskAssignmentRow,
  pickPrimaryCoworkerAssignment,
} from '@/utils/client-desk-assignment-utils';

function buildDetailsFromAssignment(row, fallbackDetails) {
  if (row?.coworker_details && typeof row.coworker_details === 'object') {
    return row.coworker_details;
  }
  const name = String(row?.coworker_name || row?.full_name || '').trim();
  if (name) {
    const parts = name.split(/\s+/);
    return {
      full_name: name,
      coworker_name: name,
      first_name: parts[0] || '',
      last_name: parts.slice(1).join(' '),
      image: row?.image ?? null,
      email: row?.email ?? null,
    };
  }
  if (fallbackDetails && typeof fallbackDetails === 'object') return fallbackDetails;
  return null;
}

/**
 * Desk seat marker — avatar when assigned to this desk_id; assign icon otherwise.
 * Detail popover opens on click (not hover).
 *
 * `forcePopoverOpen` keeps the popover open — used by the client layout header filter.
 *
 * @param {{
 *   ann: object,
 *   slotButtonClass: string,
 *   onAssign?: (ann: object, assignment?: object | null) => void,
 *   onRemove?: (ann: object, assignment?: object | null) => void | Promise<void>,
 *   forcePopoverOpen?: boolean,
 * }} props
 */
export default function ClientDeskCoworkerSeatOverlay({
  ann,
  slotButtonClass,
  onAssign,
  onRemove,
  forcePopoverOpen = false,
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [fetchedAssignments, setFetchedAssignments] = useState(null);
  const [isFetchingSchedule, setIsFetchingSchedule] = useState(false);
  const rootRef = useRef(null);
  const fetchedForDeskRef = useRef('');

  const embeddedAssignments = useMemo(() => {
    const rows = Array.isArray(ann?.coworker_assignments) ? ann.coworker_assignments : [];
    return rows.filter(
      (row) =>
        row &&
        typeof row === 'object' &&
        Boolean(
          String(row.client_coworker_ref || row.coworker_id || row.coworker_ref || '').trim() ||
          row.coworker_name ||
          row.coworker_details ||
          row.full_name,
        ),
    );
  }, [ann?.coworker_assignments]);

  const assignments = useMemo(() => {
    if (Array.isArray(fetchedAssignments) && fetchedAssignments.length > 0) {
      return fetchedAssignments;
    }
    return embeddedAssignments;
  }, [embeddedAssignments, fetchedAssignments]);

  const hasDeskAssignment =
    assignments.length > 0 ||
    Boolean(String(ann?.client_coworker_ref || '').trim()) ||
    Boolean(ann?.coworker_details && typeof ann.coworker_details === 'object');
  const countedFromAnn = Number(ann?.coworker_assignment_count);
  const assignmentCount =
    Number.isFinite(countedFromAnn) && countedFromAnn > 0
      ? countedFromAnn
      : assignments.length > 0
        ? assignments.length
        : hasDeskAssignment
          ? 1
          : 0;
  const overflow =
    getCoworkerAssignmentOverflowCount(assignments) ||
    (assignmentCount > 1 ? assignmentCount - 1 : 0);

  const primaryIndex = useMemo(() => {
    const primary = pickPrimaryCoworkerAssignment(assignments);
    if (!primary) return 0;
    const idx = assignments.indexOf(primary);
    return idx >= 0 ? idx : 0;
  }, [assignments]);

  useEffect(() => {
    setPageIndex(primaryIndex);
    setFetchedAssignments(null);
    fetchedForDeskRef.current = '';
  }, [ann?.id, primaryIndex, embeddedAssignments.length]);

  useEffect(() => {
    if (forcePopoverOpen) {
      setIsPopoverOpen(true);
    }
  }, [forcePopoverOpen, ann?.id]);

  useEffect(() => {
    if (!hasDeskAssignment) {
      setIsPopoverOpen(false);
      setIsRemoving(false);
    }
  }, [hasDeskAssignment]);

  useEffect(() => {
    if (!isPopoverOpen || forcePopoverOpen) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      setIsPopoverOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [forcePopoverOpen, isPopoverOpen]);

  useEffect(() => {
    if (!isPopoverOpen || !hasDeskAssignment) return undefined;
    if (embeddedAssignments.length > 0) return undefined;
    const deskId = String(ann?.desk_id || '').trim();
    if (!deskId || fetchedForDeskRef.current === deskId) return undefined;

    let cancelled = false;
    setIsFetchingSchedule(true);
    fetchedForDeskRef.current = deskId;

    (async () => {
      try {
        const message = await getDeskCoworkerSchedule({
          desk_id: deskId,
          space_id: String(ann?.space_id || '').trim() || undefined,
        });
        if (cancelled) return;
        const rows = Array.isArray(message?.assignments) ? message.assignments : [];
        setFetchedAssignments(rows);
        if (rows.length > 0) {
          const primary = pickPrimaryCoworkerAssignment(rows);
          const idx = primary ? rows.indexOf(primary) : 0;
          setPageIndex(idx >= 0 ? idx : 0);
        }
      } catch {
        if (!cancelled) setFetchedAssignments([]);
      } finally {
        if (!cancelled) setIsFetchingSchedule(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPopoverOpen, hasDeskAssignment, embeddedAssignments.length, ann?.desk_id, ann?.space_id]);

  const safePageIndex = assignments.length > 0 ? Math.min(pageIndex, assignments.length - 1) : 0;
  const currentAssignment = assignments[safePageIndex] || null;

  const details = buildDetailsFromAssignment(
    currentAssignment,
    ann?.coworker_details != null && typeof ann.coworker_details === 'object'
      ? ann.coworker_details
      : null,
  );

  const deskAssignment =
    normalizeDeskAssignmentRow(currentAssignment) || ann?.desk_assignment || null;

  const coworkerRef =
    String(
      currentAssignment?.client_coworker_ref ||
        currentAssignment?.coworker_id ||
        ann?.client_coworker_ref ||
        '',
    ).trim() || '';

  const canShowPopover = hasDeskAssignment;
  const isOpen = canShowPopover && (isPopoverOpen || forcePopoverOpen);

  const handleTogglePopover = useCallback(
    (event) => {
      event.stopPropagation();
      if (!canShowPopover || isRemoving) return;
      setIsPopoverOpen((previous) => !previous);
    },
    [canShowPopover, isRemoving],
  );

  const handleRemove = useCallback(async () => {
    if (!onRemove || isRemoving) return;
    setIsRemoving(true);
    try {
      await onRemove(ann, currentAssignment);
      setIsPopoverOpen(false);
    } catch {
      // Parent shows error toast; keep popover open for retry.
    } finally {
      setIsRemoving(false);
    }
  }, [ann, currentAssignment, isRemoving, onRemove]);

  const handlePrev = useCallback(() => {
    if (assignments.length <= 1) return;
    setPageIndex((prev) => (prev - 1 + assignments.length) % assignments.length);
  }, [assignments.length]);

  const handleNext = useCallback(() => {
    if (assignments.length <= 1) return;
    setPageIndex((prev) => (prev + 1) % assignments.length);
  }, [assignments.length]);

  if (!hasDeskAssignment) {
    if (!onAssign) return null;
    return (
      <button
        type='button'
        className={slotButtonClass}
        onClick={(e) => {
          e.stopPropagation();
          onAssign(ann);
        }}
        aria-label='Assign co-worker'
      >
        <RiUserAddFill size={20} />
      </button>
    );
  }

  const displayName = getCoworkerDetailsDisplayName(details) || coworkerRef || 'Co-worker';

  return (
    <div ref={rootRef} className='pointer-events-auto relative flex flex-col items-center'>
      {isOpen ? (
        <div
          className='absolute bottom-[calc(100%+10px)] left-1/2 z-[50] -translate-x-1/2'
          onPointerDown={(event) => event.stopPropagation()}
        >
          <ClientDeskCoworkerHoverCard
            details={details}
            assignment={deskAssignment}
            coworkerRef={coworkerRef}
            onUpdate={onAssign && !isRemoving ? () => onAssign(ann, currentAssignment) : undefined}
            onRemove={onRemove ? handleRemove : undefined}
            isRemoving={isRemoving || isFetchingSchedule}
            pagination={
              assignments.length > 1
                ? {
                    index: safePageIndex,
                    count: assignments.length,
                    onPrev: handlePrev,
                    onNext: handleNext,
                  }
                : null
            }
          />
        </div>
      ) : null}
      <button
        type='button'
        className={cn(
          'relative flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.12)]',
          canShowPopover && 'cursor-pointer',
          isRemoving && 'opacity-60',
        )}
        aria-label={overflow > 0 ? `${displayName}, +${overflow} more` : displayName}
        title={ann.desk_id ? `Desk ${ann.desk_id}` : displayName}
        onClick={handleTogglePopover}
        disabled={isRemoving}
      >
        <CrmAccountAvatar
          name={displayName}
          initials={getInitials(displayName)}
          image={details?.image || details?.user_image || null}
          size={28}
          showNativeTitle={false}
        />
        {overflow > 0 ? (
          <span className='absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-text-strong-950 px-0.5 text-[9px] font-semibold leading-none text-white'>
            +{overflow}
          </span>
        ) : null}
      </button>
    </div>
  );
}
