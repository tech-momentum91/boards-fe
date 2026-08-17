import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDebounce } from '@/hooks/use-debounce';
import { buildQuickAccessRoutes } from '@/utils/sidebarPerm';
import {
  clearGlobalSearchResults,
  fetchGlobalSearchResults,
  selectGlobalSearchError,
  selectGlobalSearchResults,
  selectGlobalSearchStatus,
} from '@/redux/globalSearchSlice';

const RECENT_STORAGE_KEY = 'devx_global_search_recent';

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

export function useGlobalSearch({
  minLength = 2,
  debounceMs = 500,
  limit = 20,
  doctype = '',
} = {}) {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(() => readRecentSearches());
  const dispatch = useDispatch();
  const apiResults = useSelector(selectGlobalSearchResults);
  const status = useSelector(selectGlobalSearchStatus);
  const error = useSelector(selectGlobalSearchError);
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const isLoading = status === 'loading';

  const requestRef = useRef(null);
  const debouncedQuery = useDebounce(query, debounceMs);

  const canSearch = useMemo(
    () => String(debouncedQuery).trim().length >= minLength,
    [debouncedQuery, minLength],
  );

  const quickAccessResults = useMemo(() => {
    const searchText = String(debouncedQuery ?? '')
      .trim()
      .toLowerCase();

    if (!searchText || searchText.length < minLength) {
      return [];
    }

    const candidates = buildQuickAccessRoutes(userSideBarPerm);
    if (candidates.length === 0) {
      return [];
    }

    const terms = searchText.match(/[\da-z]+/g) || [];
    return candidates
      .filter((item) => {
        const searchable = `${item.title} ${item.subtitle} ${item.route}`.toLowerCase();
        return terms.every((term) => searchable.includes(term));
      })
      .slice(0, 6);
  }, [debouncedQuery, minLength, userSideBarPerm]);

  const results = useMemo(() => {
    if (quickAccessResults.length === 0) {
      return apiResults;
    }

    return [...quickAccessResults, ...apiResults];
  }, [apiResults, quickAccessResults]);

  const executeSearch = useCallback(
    ({ text, start = 0 } = {}) => {
      const trimmedText = String(text ?? '').trim();
      if (trimmedText.length < minLength) {
        dispatch(clearGlobalSearchResults());
        return;
      }

      requestRef.current?.abort?.();
      requestRef.current = dispatch(
        fetchGlobalSearchResults({
          text: trimmedText,
          start,
          limit,
          doctype,
        }),
      );
    },
    [dispatch, doctype, limit, minLength],
  );

  const addRecentSearch = useCallback((value) => {
    const searchText = String(value ?? '').trim();
    if (!searchText) {
      return;
    }

    setRecent((previous) => {
      const next = [searchText, ...previous.filter((item) => item !== searchText)];
      writeRecentSearches(next);
      return next.slice(0, 8);
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecent([]);
    writeRecentSearches([]);
  }, []);

  const loadMore = useCallback(() => {
    executeSearch({
      text: debouncedQuery,
      start: apiResults.length,
    });
  }, [apiResults.length, debouncedQuery, executeSearch]);

  useEffect(() => {
    if (!canSearch) {
      requestRef.current?.abort?.();
      dispatch(clearGlobalSearchResults());
      return;
    }

    executeSearch({
      text: debouncedQuery,
      start: 0,
    });
  }, [canSearch, debouncedQuery, dispatch, executeSearch]);

  useEffect(
    () => () => {
      requestRef.current?.abort?.();
    },
    [],
  );

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    recent,
    canSearch,
    addRecentSearch,
    clearRecentSearches,
    loadMore,
  };
}
