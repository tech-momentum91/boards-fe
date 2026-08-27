import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useInboxRealtime } from '@/hooks/use-inbox-realtime';
import { getInboxUnreadCount } from '@/services/inbox-service';

type RefreshOptions = {
  /** Always bump syncVersion so open inbox lists refetch. */
  force?: boolean;
};

type InboxSyncContextValue = {
  unreadCount: number;
  /** Monotonic counter — bump when inbox data may have changed. */
  syncVersion: number;
  refresh: (options?: RefreshOptions) => Promise<void>;
  isRealtimeConnected: boolean;
};

const InboxSyncContext = createContext<InboxSyncContextValue | null>(null);

const POLL_MS = 25_000;

/**
 * Single place for inbox unread count + change signals.
 * Uses realtime when the socket is healthy, and visibility/focus/poll as backup
 * so the sidebar badge and inbox list never stay stale until a navigation.
 */
export function InboxSyncProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.email || (typeof user?.name === 'string' ? user.name : null) || null;

  const [unreadCount, setUnreadCount] = useState(0);
  const [syncVersion, setSyncVersion] = useState(0);
  const requestIdRef = useRef(0);
  const unreadCountRef = useRef(0);

  const refresh = useCallback(async (options: RefreshOptions = {}) => {
    const force = Boolean(options.force);
    if (!isAuthenticated) {
      unreadCountRef.current = 0;
      setUnreadCount(0);
      return;
    }
    const requestId = ++requestIdRef.current;
    const result = await getInboxUnreadCount();
    if (requestIdRef.current !== requestId) return;
    if (result.error) {
      if (force) setSyncVersion((version) => version + 1);
      return;
    }

    const next = Number(result.count) || 0;
    const changed = next !== unreadCountRef.current;
    unreadCountRef.current = next;
    setUnreadCount(next);
    if (force || changed) {
      setSyncVersion((version) => version + 1);
    }
  }, [isAuthenticated]);

  const refreshForced = useCallback(() => refresh({ force: true }), [refresh]);

  const { isRealtimeConnected } = useInboxRealtime(userId, refreshForced, {
    enabled: Boolean(isAuthenticated && userId),
  });

  useEffect(() => {
    if (!isAuthenticated) {
      unreadCountRef.current = 0;
      setUnreadCount(0);
      return undefined;
    }

    refresh({ force: true });

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh({ force: true });
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh({ force: false });
      }
    }, POLL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.clearInterval(pollId);
    };
  }, [isAuthenticated, refresh]);

  const value = useMemo(
    () => ({
      unreadCount,
      syncVersion,
      refresh,
      isRealtimeConnected,
    }),
    [unreadCount, syncVersion, refresh, isRealtimeConnected],
  );

  return <InboxSyncContext.Provider value={value}>{children}</InboxSyncContext.Provider>;
}

export function useInboxSync() {
  const context = useContext(InboxSyncContext);
  if (!context) {
    throw new Error('useInboxSync must be used within InboxSyncProvider');
  }
  return context;
}

export function useInboxSyncOptional() {
  return useContext(InboxSyncContext);
}
