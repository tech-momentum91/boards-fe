import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { searchBoardTasks } from '@/services/tasks-service';

const RECENT_STORAGE_KEY = 'devx_boards_global_search_recent';
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

function readRecentSearches() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const value = window.localStorage.getItem(RECENT_STORAGE_KEY);
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeRecentSearches(value) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(value.slice(0, 8)));
}

export function useBoardsGlobalSearch({ enabled = true, limit = 50 } = {}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [recent, setRecent] = useState(readRecentSearches);
  const requestIdRef = useRef(0);

  const debouncedQuery = useDebounce(query.trim(), DEBOUNCE_MS);
  const canSearch = debouncedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    if (!canSearch) {
      requestIdRef.current += 1;
      setResults([]);
      setStatus('idle');
      setError('');
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setStatus('loading');
    setError('');

    let cancelled = false;

    searchBoardTasks(debouncedQuery, limit)
      .then((response) => {
        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        if (response.error) {
          setResults([]);
          setStatus('failed');
          setError(response.error);
          return;
        }

        setResults(response.data ?? []);
        setStatus('succeeded');
      })
      .catch((fetchError) => {
        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        setResults([]);
        setStatus('failed');
        setError(fetchError?.message || 'Failed to search tasks.');
      });

    return () => {
      cancelled = true;
    };
  }, [canSearch, debouncedQuery, enabled, limit]);

  const resetSearch = useCallback(() => {
    requestIdRef.current += 1;
    setQuery('');
    setResults([]);
    setStatus('idle');
    setError('');
  }, []);

  const addRecentSearch = useCallback((value) => {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return;
    }

    setRecent((previous) => {
      const next = [normalized, ...previous.filter((entry) => entry !== normalized)].slice(0, 8);
      writeRecentSearches(next);
      return next;
    });
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading: status === 'loading',
    canSearch,
    error,
    recent,
    addRecentSearch,
    resetSearch,
  };
}
