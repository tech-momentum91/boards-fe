import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchProposalAnalyticsDashboard } from '@/services/proposalAnalytics';

/** Keeps last successful dashboard payload per proposal+range so switching does not wipe history. */
const analyticsCache = new Map();

function rangeCacheKey(proposalId, fromDate, toDate) {
  const from = fromDate ? new Date(fromDate).toISOString().slice(0, 10) : '';
  const to = toDate ? new Date(toDate).toISOString().slice(0, 10) : '';
  return `${proposalId}::${from}::${to}`;
}

/**
 * @param {string | null | undefined} proposalId
 * @param {{ enabled?: boolean, pollMs?: number, fromDate?: Date|string|null, toDate?: Date|string|null }} [options]
 */
export function useProposalAnalytics(
  proposalId,
  { enabled = true, pollMs = 30_000, fromDate = null, toDate = null } = {},
) {
  const id = String(proposalId || '').trim();
  const cacheKey = id ? rangeCacheKey(id, fromDate, toDate) : '';
  const [data, setData] = useState(() => (cacheKey ? analyticsCache.get(cacheKey) || null : null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestSeq = useRef(0);

  const applyResult = useCallback((key, result, proposalKey) => {
    if (!result || typeof result !== 'object') return null;
    const responseId = String(result.proposal_id || proposalKey || '').trim();
    if (responseId && proposalKey && responseId !== proposalKey) {
      return null;
    }
    const next = { ...result, proposal_id: responseId || proposalKey };
    analyticsCache.set(key, next);
    return next;
  }, []);

  const fetchForProposal = useCallback(
    async (proposalKey, rangeKey, range, { signal, showLoading } = {}) => {
      if (!proposalKey) return null;
      const seq = ++requestSeq.current;
      if (showLoading) setLoading(true);
      setError(null);

      try {
        const result = await fetchProposalAnalyticsDashboard({
          proposalId: proposalKey,
          fromDate: range?.fromDate,
          toDate: range?.toDate,
          signal,
        });
        if (seq !== requestSeq.current) return null;
        const next = applyResult(rangeKey, result, proposalKey);
        setData(next);
        return next;
      } catch (error_) {
        if (seq !== requestSeq.current) return null;
        if (error_?.code === 'ERR_CANCELED' || error_?.name === 'CanceledError') return null;
        setError(error_?.message || 'Failed to load proposal analytics');
        if (!analyticsCache.has(rangeKey)) setData(null);
        return null;
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [applyResult],
  );

  const reload = useCallback(() => {
    if (!id || !enabled) return Promise.resolve(null);
    // Keep current values on screen while refreshing.
    return fetchForProposal(
      id,
      cacheKey,
      { fromDate, toDate },
      { showLoading: !analyticsCache.has(cacheKey) },
    );
  }, [id, enabled, fetchForProposal, cacheKey, fromDate, toDate]);

  useEffect(() => {
    if (!id || !enabled) {
      setLoading(false);
      setError(null);
      setData(cacheKey ? analyticsCache.get(cacheKey) || null : null);
      return undefined;
    }

    const cached = analyticsCache.get(cacheKey) || null;
    setData(cached);
    setError(null);

    const abortController = new AbortController();
    fetchForProposal(
      id,
      cacheKey,
      { fromDate, toDate },
      { signal: abortController.signal, showLoading: !cached },
    );

    const pollTimer =
      pollMs > 0
        ? setInterval(() => {
            fetchForProposal(id, cacheKey, { fromDate, toDate }, { showLoading: false });
          }, pollMs)
        : null;

    return () => {
      abortController.abort();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [id, enabled, fetchForProposal, pollMs, cacheKey, fromDate, toDate]);

  return { data, loading, error, reload, proposalId: id };
}

export default useProposalAnalytics;
