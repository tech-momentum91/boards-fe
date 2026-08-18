import { useCallback, useRef, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { searchMentionUsers } from '@/redux/userSlice';

export const useMentionSearch = ({ debounceMs = 300, page_size = 50 } = {}) => {
  const dispatch = useDispatch();
  const timeoutRef = useRef(null);
  const requestIdRef = useRef(0);
  const currentPageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const [allUsers, setAllUsers] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');

  // Keep refs in sync with state
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);
  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current) {
      return;
    }
    setLoadingMore(true);
    try {
      const nextPage = currentPageRef.current + 1;
      const result = await dispatch(
        searchMentionUsers({
          keyword: currentQuery,
          page: nextPage,
          page_size,
        }),
      );
      if (searchMentionUsers.fulfilled.match(result)) {
         
        currentPageRef.current = result.payload.page;
        setAllUsers((prev) => [...prev, ...result.payload.users]);
        setHasMore(result.payload.hasMore);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [dispatch, currentQuery, page_size]);

  const searchMentions = useCallback(
    (query = '') =>
      new Promise((resolve) => {
        requestIdRef.current += 1;
        const requestId = requestIdRef.current;
        setCurrentQuery(query);
        currentPageRef.current = 1;

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          dispatch(
            searchMentionUsers({
              keyword: query,
              page: 1,
              page_size,
            }),
          )
            .then((result) => {
              if (requestId !== requestIdRef.current) {
                resolve([]);
                return;
              }
              if (searchMentionUsers.fulfilled.match(result)) {
                 
                currentPageRef.current = result.payload.page;
                setAllUsers(result.payload.users || []);
                setHasMore(result.payload.hasMore);
                resolve(result.payload.users || []);
                return;
              }
              resolve([]);
            })
            .catch(() => resolve([]));
        }, debounceMs);
      }),
    [dispatch, debounceMs, page_size],
  );

  return { searchMentions, users: allUsers, hasMore, loadingMore, loadMore };
};
