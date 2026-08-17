import io from 'socket.io-client';

/**
 * Socket service for Frappe realtime events
 * Handles connection to Frappe socket.io server for real-time updates
 */
export class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.subscriptions = new Map(); // Track active subscriptions

    // Registries below are owned by callers, not by the socket instance, so they
    // survive connect/disconnect cycles and are replayed onto each new socket.
    this.eventListeners = new Map(); // event name -> Set<callback>
    this.relayedEvents = new Set(); // events already bridged to the current socket
    this.channelSubscriptions = new Map(); // task channel -> subscriber count
    this.connectionListeners = new Set();
  }

  /**
   * Get socket URL based on environment variables
   * Follows the same pattern as helpdesk/desk/src/socket.ts
   *
   * IMPORTANT: The browser automatically sets the 'origin' header to the page's origin.
   * Frappe's authentication middleware uses socket.request.headers.origin to build the auth URL.
   * Since we can't modify Frappe and can't set the 'origin' header (browser restriction),
   * the frontend MUST be served from the same origin as the backend for authentication to work.
   *
   * Production: Use reverse proxy (nginx) to serve both frontend and backend on same origin.
   * The reverse proxy routes socket.io connections to the backend socket.io server (port 9100).
   * In production, no port is needed in the URL since nginx handles routing on standard HTTPS port.
   * Development: Uses configured socket port directly.
   */
  getSocketUrl() {
    const socketPort = import.meta.env.VITE_SOCKET_PORT || '9000';
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
    const backendUrl = new URL(apiUrl);

    // Get site name from env var (required) or fallback to hostname
    const siteName = import.meta.env.VITE_SITE_NAME || window.site_name || backendUrl.hostname;

    // Local dev: connect through the Vite dev server so origin and host match.
    // Frappe's socket auth rejects cross-origin connections (e.g. :5173 → :9000).
    if (import.meta.env.DEV) {
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : `http://${backendUrl.hostname}:5173`;
      return `${origin}/${siteName}`;
    }

    const isProduction = import.meta.env.PROD;

    // Always use backend hostname and protocol from VITE_API_URL
    // This ensures socket connects directly to backend domain
    // Frontend: staging.devx.work
    // Backend: staging-api.devx.work
    // Socket connects to: staging-api.devx.work
    const host = backendUrl.hostname;
    const protocol = backendUrl.protocol.replace(':', '');

    // In production, if socket.io server is on custom port (like 9100), include it
    // If socket.io is on standard HTTPS port (443), don't include port in URL
    // In development, always use the configured socket port
    // Note: If backend has nginx proxying 443 to 9100, set VITE_SOCKET_PORT empty or '443'
    const useCustomPort =
      socketPort && socketPort !== '443' && socketPort !== '80' && socketPort !== '';
    const port = isProduction ? (useCustomPort ? `:${socketPort}` : '') : `:${socketPort}`;

    // Construct socket URL
    // Production: https://staging-api.devx.work/siteName (direct connection to backend)
    // Development: http://localhost:9100/siteName (direct connection)
    const socketUrl = `${protocol}://${host}${port}/${siteName}`;

    return socketUrl;
  }

  /**
   * Connect to Frappe socket server
   */
  connect() {
    if (this.socket?.connected) {
      // console.log('Socket already connected');
      return;
    }

    // Disconnect any existing socket first
    if (this.socket) {
      this.disconnect();
    }

    const socketUrl = this.getSocketUrl();
    if (!socketUrl) {
      console.error('Cannot connect: socket URL is invalid');
      return;
    }

    const siteName = window.site_name || import.meta.env.VITE_SITE_NAME || window.location.hostname;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';

    // console.log('Connecting to socket:', socketUrl);
    // console.log('Site name:', siteName);
    // console.log('Backend API URL:', apiUrl);
    // console.log('Window site_name:', window.site_name);
    // console.log('Env VITE_SITE_NAME:', import.meta.env.VITE_SITE_NAME);

    // Match helpdesk socket configuration exactly
    // Set autoConnect to false so we can control when to connect
    // This ensures the session is fully ready before authentication
    // Note: We cannot set the 'origin' header directly (browser restriction)
    // But by connecting to the backend hostname, the origin will be set correctly
    // The socket.io server will use the origin header to build the auth URL
    this.socket = io(socketUrl, {
      withCredentials: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      autoConnect: false, // Don't connect immediately - wait for session to be ready
      // Use transportOptions to ensure proper connection
      transportOptions: {
        polling: {
          extraHeaders: {
            // We can't set 'origin' header (browser restriction)
            // But we can set other headers if needed
            'X-Frappe-Site-Name': siteName,
          },
        },
      },
    });

    this.setupEventHandlers();

    // Manually connect after setup
    // This is called after session verification in auth context
    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        // console.log('🔌 Manually connecting socket...');
        this.socket.connect();
      }
    }, 100);
  }

  /**
   * Setup socket event handlers
   */
  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      // console.log('Socket connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Re-subscribe to all previous subscriptions after a short delay
      // to ensure authentication is complete
      setTimeout(() => {
        this.resubscribeAll();
        // Announced only once rooms are re-joined, so listeners that resync on
        // reconnect cannot miss events published in between.
        this.notifyConnectionChange(true);
      }, 100);
    });

    this.socket.on('disconnect', (reason) => {
      // console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.notifyConnectionChange(false);

      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      console.error('Error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type,
      });
      this.reconnectAttempts++;

      // Check if it's an authentication error
      if (error.message && error.message.includes('Unauthorized')) {
        console.error('Socket authentication failed. This might be due to:');
        console.error('1. Session not fully established on backend');
        console.error('2. Cookie not being sent correctly');
        console.error('3. Backend API endpoint /api/method/frappe.realtime.get_user_info failing');
        console.error('Error:', error.message);
        // Don't attempt to reconnect on auth errors - user needs to login again
        // or wait for session to be ready
        this.disconnect();
        return;
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      // console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      // console.log('Socket reconnection attempt', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
    });

    // Listen for Frappe realtime events
    this.socket.on('doc_update', (data) => {
      this.handleDocUpdate(data);
    });

    this.socket.on('doc_insert', (data) => {
      this.handleDocInsert(data);
    });

    this.socket.on('doc_delete', (data) => {
      this.handleDocDelete(data);
    });

    // Listen for list_update events (Frappe uses this for doctype-level updates)
    this.socket.on('list_update', (data) => {
      this.handleListUpdate(data);
    });

    // A new socket instance has no listeners of its own, so every event that
    // callers registered before this connection has to be bridged again.
    this.relayedEvents.clear();
    this.eventListeners.forEach((_listeners, event) => {
      this.attachEventRelay(event);
    });
  }

  /**
   * Bridge a Frappe realtime event from the socket into the callback registry.
   * Exactly one socket listener exists per event name regardless of how many
   * callbacks are registered for it.
   */
  attachEventRelay(event) {
    if (!this.socket || this.relayedEvents.has(event)) {
      return;
    }

    this.relayedEvents.add(event);
    this.socket.on(event, (data) => {
      const listeners = this.eventListeners.get(event);
      if (!listeners) {
        return;
      }

      // Copied so a callback that unregisters itself cannot disturb iteration.
      [...listeners].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Socket listener for '${event}' threw:`, error);
        }
      });
    });
  }

  /**
   * Listen for a named Frappe realtime event (e.g. one published via
   * frappe.publish_realtime). Multiple callbacks per event are supported and
   * registrations survive reconnects.
   *
   * @param {string} event - Realtime event name
   * @param {Function} callback - Invoked with the event payload
   * @returns {Function} Unregister function
   */
  onEvent(event, callback) {
    if (!event || typeof callback !== 'function') {
      return () => {};
    }

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);

    this.attachEventRelay(event);

    return () => {
      const listeners = this.eventListeners.get(event);
      if (!listeners) {
        return;
      }

      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    };
  }

  /**
   * Join a Frappe "task" room, which is how a room can be joined without the
   * doctype-level read permission that doc/doctype rooms require.
   *
   * Reference counted, so several components can watch the same channel and the
   * room is only left once the last of them unsubscribes.
   *
   * @param {string} channel - Channel id (room becomes `task_progress:<channel>`)
   * @returns {Function} Unsubscribe function
   */
  subscribeChannel(channel) {
    if (!channel) {
      return () => {};
    }

    const nextCount = (this.channelSubscriptions.get(channel) ?? 0) + 1;
    this.channelSubscriptions.set(channel, nextCount);

    if (nextCount === 1 && this.socket && this.isConnected) {
      this.socket.emit('task_subscribe', channel);
    }

    let released = false;
    return () => {
      // Guarded so a double cleanup cannot drop another component's reference.
      if (released) {
        return;
      }
      released = true;

      const currentCount = this.channelSubscriptions.get(channel);
      if (currentCount === undefined) {
        return;
      }

      if (currentCount <= 1) {
        this.channelSubscriptions.delete(channel);
        if (this.socket && this.isConnected) {
          this.socket.emit('task_unsubscribe', channel);
        }
        return;
      }

      this.channelSubscriptions.set(channel, currentCount - 1);
    };
  }

  /**
   * Observe connection state changes. Callbacks receive `true` once rooms have
   * been re-joined after a (re)connect, and `false` on disconnect.
   *
   * @param {Function} callback - Invoked with the new connected state
   * @returns {Function} Unregister function
   */
  onConnectionChange(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    this.connectionListeners.add(callback);
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  notifyConnectionChange(isConnected) {
    [...this.connectionListeners].forEach((callback) => {
      try {
        callback(isConnected);
      } catch (error) {
        console.error('Socket connection listener threw:', error);
      }
    });
  }

  /**
   * Handle document update event
   */
  handleDocUpdate(data) {
    const subscription = this.subscriptions.get(`doc_update:${data.doctype}`);
    if (subscription && subscription.callback) {
      subscription.callback(data);
    }
  }

  /**
   * Handle document insert event
   */
  handleDocInsert(data) {
    const subscription = this.subscriptions.get(`doc_insert:${data.doctype}`);
    if (subscription && subscription.callback) {
      subscription.callback(data);
    }
  }

  /**
   * Handle document delete event
   */
  handleDocDelete(data) {
    const subscription = this.subscriptions.get(`doc_delete:${data.doctype}`);
    if (subscription && subscription.callback) {
      subscription.callback(data);
    }
  }

  /**
   * Handle list update event (Frappe uses this for doctype-level updates)
   */
  handleListUpdate(data) {
    const { doctype } = data;
    if (!doctype) return;

    // Find all subscriptions for this doctype (any event type)
    this.subscriptions.forEach((subscription, key) => {
      if (subscription.doctype === doctype && subscription.callback) {
        // Call callback with the list_update data
        // The data might contain docname or full doc data
        subscription.callback(data);
      }
    });
  }

  /**
   * Subscribe to doctype events
   * @param {string} doctype - Document type (e.g., 'HD Ticket')
   * @param {string} eventType - Event type: 'doc_update', 'doc_insert', 'doc_delete', or 'all'
   * @param {Function} callback - Callback function to handle events
   * @param {string} docname - Optional: specific document name to filter events
   */
  subscribe(doctype, eventType, callback, docname = null) {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket not connected. Subscription will be active after connection.');
    }

    const eventTypes =
      eventType === 'all' ? ['doc_update', 'doc_insert', 'doc_delete'] : [eventType];

    eventTypes.forEach((type) => {
      const key = `${type}:${doctype}${docname ? `:${docname}` : ''}`;

      // Store subscription with callback
      this.subscriptions.set(key, {
        doctype,
        eventType: type,
        docname,
        callback,
      });

      // Emit subscription to Frappe server
      if (this.socket && this.isConnected) {
        if (docname) {
          // Subscribe to specific document
          this.socket.emit('doc_subscribe', doctype, docname);
        } else {
          // Subscribe to all documents of this doctype
          this.socket.emit('doctype_subscribe', doctype);
        }
      }
    });

    // Return unsubscribe function
    return () => {
      this.unsubscribe(doctype, eventType, docname);
    };
  }

  /**
   * Unsubscribe from doctype events
   */
  unsubscribe(doctype, eventType, docname = null) {
    const eventTypes =
      eventType === 'all' ? ['doc_update', 'doc_insert', 'doc_delete'] : [eventType];

    eventTypes.forEach((type) => {
      const key = `${type}:${doctype}${docname ? `:${docname}` : ''}`;
      this.subscriptions.delete(key);

      if (this.socket && this.isConnected) {
        if (docname) {
          this.socket.emit('doc_unsubscribe', doctype, docname);
        } else {
          this.socket.emit('doctype_unsubscribe', doctype);
        }
      }
    });
  }

  /**
   * Re-subscribe to all active subscriptions after reconnection
   */
  resubscribeAll() {
    this.subscriptions.forEach((subscription) => {
      if (this.socket && this.isConnected) {
        if (subscription.docname) {
          this.socket.emit('doc_subscribe', subscription.doctype, subscription.docname);
        } else {
          this.socket.emit('doctype_subscribe', subscription.doctype);
        }
      }
    });

    this.channelSubscriptions.forEach((_count, channel) => {
      if (this.socket && this.isConnected) {
        this.socket.emit('task_subscribe', channel);
      }
    });
  }

  /**
   * Disconnect from socket server
   */
  disconnect() {
    if (this.socket) {
      // Clear all subscriptions
      this.subscriptions.clear();

      // Remove all listeners
      this.socket.removeAllListeners();
      // The relays lived on the socket we are dropping; the callback registry
      // itself is owned by callers and is re-bridged on the next connect.
      this.relayedEvents.clear();

      // Disconnect
      this.socket.disconnect();
      this.socket = null;
      const wasConnected = this.isConnected;
      this.isConnected = false;
      // console.log('Socket disconnected');

      if (wasConnected) {
        this.notifyConnectionChange(false);
      }
    }
  }

  /**
   * Get socket connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
    };
  }
}

// Export singleton instance
export const socketService = new SocketService();
