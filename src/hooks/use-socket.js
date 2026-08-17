import { useContext, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';

/**
 * Custom hook to access socket service from auth context
 * Provides convenient methods to subscribe/unsubscribe to events
 */
export const useSocket = () => {
  const { socket, isAuthenticated } = useAuth();
  const subscriptionsRef = useRef([]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      // Unsubscribe from all subscriptions when component unmounts
      subscriptionsRef.current.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      subscriptionsRef.current = [];
    };
  }, []);

  /**
   * Register an unsubscribe function for unmount cleanup.
   *
   * The returned wrapper drops itself from the pending list when called, so a
   * caller that cleans up eagerly (e.g. when its subscription target changes)
   * does not leave a stale entry behind for the lifetime of the component.
   *
   * @param {Function} unregister - The underlying unsubscribe function
   * @returns {Function} Self-removing unsubscribe function
   */
  const trackSubscription = useCallback((unregister) => {
    const tracked = () => {
      subscriptionsRef.current = subscriptionsRef.current.filter((entry) => entry !== tracked);
      unregister();
    };

    subscriptionsRef.current.push(tracked);
    return tracked;
  }, []);

  /**
   * Subscribe to doctype events
   * @param {string} doctype - Document type (e.g., 'HD Ticket')
   * @param {string} eventType - Event type: 'doc_update', 'doc_insert', 'doc_delete', or 'all'
   * @param {Function} callback - Callback function to handle events
   * @param {string} docname - Optional: specific document name to filter events
   * @returns {Function} Unsubscribe function
   */
  const subscribe = useCallback(
    (doctype, eventType, callback, docname = null) => {
      if (!socket) {
        console.warn('Socket not available. Subscription will not be created.');
        return () => {};
      }

      if (!isAuthenticated) {
        console.warn('User not authenticated. Subscription will not be created.');
        return () => {};
      }

      const unsubscribe = socket.subscribe(doctype, eventType, callback, docname);

      // Store unsubscribe function for cleanup
      subscriptionsRef.current.push(unsubscribe);

      return unsubscribe;
    },
    [socket, isAuthenticated],
  );

  /**
   * Listen for a named Frappe realtime event.
   *
   * Unlike `subscribe`, this does not require an established connection: the
   * registration is replayed onto the socket once it (re)connects.
   *
   * @param {string} event - Realtime event name
   * @param {Function} callback - Invoked with the event payload
   * @returns {Function} Unregister function
   */
  const onEvent = useCallback(
    (event, callback) => {
      if (!socket) {
        return () => {};
      }

      return trackSubscription(socket.onEvent(event, callback));
    },
    [socket, trackSubscription],
  );

  /**
   * Join a Frappe task room by channel id, used for realtime channels that are
   * not tied to a doctype's read permission.
   *
   * @param {string} channel - Channel id
   * @returns {Function} Unsubscribe function
   */
  const subscribeChannel = useCallback(
    (channel) => {
      if (!socket) {
        return () => {};
      }

      return trackSubscription(socket.subscribeChannel(channel));
    },
    [socket, trackSubscription],
  );

  /**
   * Observe socket connection state.
   *
   * @param {Function} callback - Invoked with the new connected state
   * @returns {Function} Unregister function
   */
  const onConnectionChange = useCallback(
    (callback) => {
      if (!socket) {
        return () => {};
      }

      return trackSubscription(socket.onConnectionChange(callback));
    },
    [socket, trackSubscription],
  );

  /**
   * Unsubscribe from doctype events
   */
  const unsubscribe = useCallback(
    (doctype, eventType, docname = null) => {
      if (!socket) return;
      socket.unsubscribe(doctype, eventType, docname);
    },
    [socket],
  );

  /**
   * Get socket connection status
   */
  const getConnectionStatus = useCallback(() => {
    if (!socket) {
      return { isConnected: false, socketId: null };
    }
    return socket.getConnectionStatus();
  }, [socket]);

  return {
    socket,
    subscribe,
    unsubscribe,
    onEvent,
    subscribeChannel,
    onConnectionChange,
    getConnectionStatus,
    isAuthenticated,
  };
};
