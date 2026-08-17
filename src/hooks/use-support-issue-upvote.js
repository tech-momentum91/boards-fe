import { useCallback, useEffect, useRef, useState } from 'react';

import { upvoteIssue } from '@/api/support';
import { showErrorToast } from '@/utils/error-utils';

const DEBOUNCE_MS = 400;

/**
 * Optimistic upvote toggle with debounced API sync (add vs remove) to avoid rapid duplicate calls.
 */
export function useSupportIssueUpvote(issueId, serverVoted, serverCount) {
  const [state, setState] = useState(() => ({
    voted: Boolean(serverVoted),
    count: Number(serverCount) || 0,
  }));
  const lastSyncedRef = useRef({
    voted: Boolean(serverVoted),
    count: Number(serverCount) || 0,
  });
  const pendingRef = useRef({
    voted: Boolean(serverVoted),
    count: Number(serverCount) || 0,
  });
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    const next = { voted: Boolean(serverVoted), count: Number(serverCount) || 0 };
    setState(next);
    lastSyncedRef.current = next;
    pendingRef.current = next;
  }, [issueId, serverVoted, serverCount]);

  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    },
    [],
  );

  const flush = useCallback(async () => {
    const id = String(issueId ?? '').trim();
    if (!id) return;

    const desired = pendingRef.current;
    const synced = lastSyncedRef.current;
    if (desired.voted === synced.voted) return;

    try {
      await upvoteIssue(id, desired.voted);
      // eslint-disable-next-line require-atomic-updates -- syncing refs after await; not React state
      lastSyncedRef.current = { voted: desired.voted, count: desired.count };
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Could not update upvote.' });
      setState({ voted: synced.voted, count: synced.count });
      // eslint-disable-next-line require-atomic-updates -- syncing refs after await; not React state
      pendingRef.current = { ...synced };
    }
  }, [issueId]);

  const toggle = useCallback(() => {
    setState((prev) => {
      const nextVoted = !prev.voted;
      const nextCount = nextVoted ? prev.count + 1 : Math.max(0, prev.count - 1);
      const next = { voted: nextVoted, count: nextCount };
      pendingRef.current = next;
      return next;
    });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      void flush();
    }, DEBOUNCE_MS);
  }, [flush]);

  return { voted: state.voted, count: state.count, toggle };
}
