import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useDispatch } from 'react-redux';
import { getUserByEmailID, getSession } from '../services/auth-service';
import { clearAuthData, clearPostLoginRedirectPath } from '../utils/auth-utils';
import { logoutSuccess } from '../redux/authSlice';
import { getProfile } from '../redux/profileSlice';
import { socketService } from '../services/socket-service';
import { clearCsrfToken, fetchCsrfToken } from '../services/csrf-service';
import { clearBoardPushSubscription } from '../services/board-push';
import type { AppDispatch } from '../redux/store';

export interface AuthUser {
  full_name: string;
  email: string;
  user_image?: string;
  [key: string]: unknown;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (userData: unknown, email?: string) => void;
  logout: () => void | Promise<void>;
  refreshSession: () => void;
  sessionApiSucceeded: boolean;
  sessionApiError: boolean;
  socket: typeof socketService;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const normalizeUserProfile = (input: unknown): AuthUser => {
  // Preserve original `input?.data ?? input ?? {}` semantics.
  const maybe = input as { data?: Record<string, unknown> } | null | undefined;
  const document_ = (maybe?.data ?? maybe ?? {}) as Record<string, unknown>;

  const fullName =
    (document_.full_name as string | undefined) ||
    (document_.fullname as string | undefined) ||
    [document_.first_name, document_.last_name].filter(Boolean).join(' ') ||
    (document_.name as string | undefined) ||
    '';
  const email =
    (document_.email as string | undefined) || (document_.name as string | undefined) || '';
  const userImage =
    (document_.user_image as string | undefined) || (document_.avatar as string | undefined);

  return {
    full_name: fullName,
    email,
    ...(userImage ? { user_image: userImage } : {}),
  };
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionApiSucceeded, setSessionApiSucceeded] = useState(false);
  const [sessionApiError, setSessionApiError] = useState(false);
  const initialCheckRef = useRef(false);

  const persistUser = useCallback((userData: unknown, fallbackEmail?: string): AuthUser | null => {
    if (!userData) return null;

    const profile = normalizeUserProfile(userData);
    if (!profile.email && fallbackEmail) {
      profile.email = fallbackEmail;
    }

    setUser(profile);
    setIsAuthenticated(true);

    if (profile.email || fallbackEmail) {
      localStorage.setItem('email', profile.email || (fallbackEmail as string));
    } else {
      localStorage.removeItem('email');
    }
    localStorage.setItem('user', JSON.stringify(profile));
    return profile;
  }, []);

  const syncUserFromStorage = useCallback((): boolean => {
    const storedUser = localStorage.getItem('user');
    const storedEmail = localStorage.getItem('email');

    if (!storedUser) {
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as AuthUser;
      const resolvedEmail = parsedUser.email || storedEmail;

      if (!resolvedEmail) {
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }

      parsedUser.email = resolvedEmail;
      setUser(parsedUser);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Failed to parse stored user data:', error);
      clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    // Drop push while cookies/CSRF may still work; browser unsubscribe
    // still runs if the server call fails (e.g. session already gone).
    try {
      await clearBoardPushSubscription();
    } catch {
      /* ignore */
    }
    setUser(null);
    setIsAuthenticated(false);
    setSessionApiSucceeded(false);
    setSessionApiError(false);
    clearPostLoginRedirectPath();
    clearAuthData();
    clearCsrfToken();
    // Disconnect socket on logout
    socketService.disconnect();
    // Dispatch logoutSuccess to reset entire Redux state
    dispatch(logoutSuccess());
    // remove all related to column-config-*
    const columnConfigKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith('column-config-'),
    );
    columnConfigKeys.forEach((key) => {
      localStorage.removeItem(key);
    });
  }, [dispatch]);

  const checkAuth = useCallback(
    async (force = false) => {
      if (initialCheckRef.current && !force) {
        return;
      }

      if (!initialCheckRef.current) {
        initialCheckRef.current = true;
      }

      setLoading(true);
      setSessionApiSucceeded(false);
      setSessionApiError(false);
      try {
        // Check if there's a valid session on the server
        const session = await getSession();

        // Mark session API as succeeded (regardless of whether user is authenticated)
        setSessionApiSucceeded(true);
        setSessionApiError(false);

        // If valid session exists, fetch and persist user data
        if (session && session.message && session.message !== '' && session.message !== 'Guest') {
          // Fire-and-forget: primes the CSRF token cache so the first POST
          // of the session doesn't have to eat an extra round-trip. Also
          // covers the case where a token got generated on this session by
          // something else (e.g. the desk UI) between checks.
          fetchCsrfToken();
          const userData = await getUserByEmailID(session.message);
          if (userData && !userData.error) {
            persistUser(userData);
            // Fetch user profile after user data is fetched
            try {
              await dispatch(getProfile(session.message as never));
            } catch (error) {
              console.error('Failed to fetch user profile:', error);
            }
            return;
          }
        }

        // No valid server session found (403/401 or Guest user)
        // Important: Do NOT fallback to localStorage when server explicitly says no session
        // This ensures security - if server session expired, user must re-authenticate
        // console.log('No valid server session, logging out user');
        await logout();
      } catch {
        // console.error('Session check failed with unexpected error:', error);

        // Mark session API as failed (network error, server down, etc.)
        setSessionApiError(true);
        setSessionApiSucceeded(false);

        // For unexpected errors (network issues, server down, etc.)
        // Try to sync from localStorage as fallback
        // This allows the app to work offline temporarily
        // Note: sessionApiSucceeded remains false, so centers won't be fetched
        const synced = syncUserFromStorage();
        if (!synced) {
          await logout();
        }
      } finally {
        setLoading(false);
      }
    },
    [logout, persistUser, syncUserFromStorage, dispatch],
  );

  const refreshSession = useCallback(() => {
    checkAuth(true);
  }, [checkAuth]);

  // Note: checkAuth() is no longer called automatically on mount
  // It should be called explicitly from components that need it:
  // - ProtectedRoute (for protected pages and login page)
  // - RootRedirect (to determine redirect destination)

  // Connect socket only when user is fully authenticated
  useEffect(() => {
    if (isAuthenticated && sessionApiSucceeded && user) {
      // Only connect if not already connected
      // Socket authentication middleware will handle verification automatically
      if (!socketService.isConnected && !socketService.socket) {
        // console.log('🔌 Connecting socket...');
        socketService.connect();
      }
    } else if (!isAuthenticated) {
      // Disconnect socket when user is not authenticated
      socketService.disconnect();
    }
  }, [isAuthenticated, sessionApiSucceeded, user]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'user' || event.key === 'email') {
        syncUserFromStorage();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncUserFromStorage]);

  const login = useCallback(
    (userData: unknown, email?: string) => {
      persistUser(userData, email);
    },
    [persistUser],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        refreshSession,
        sessionApiSucceeded,
        sessionApiError,
        socket: socketService,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
