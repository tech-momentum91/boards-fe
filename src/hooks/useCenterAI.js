import { useState, useRef, useCallback } from 'react';
import apiClient from '@/api/axios';

/**
 * useCenterAI — custom hook that manages all AI state and API calls for the
 * AI Intelligence Workspace modal.
 *
 * @param {string} centerId — the Frappe docname for the Center
 */
const useCenterAI = (centerId) => {
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [responseSource, setResponseSource] = useState(null);

  // Track the most-recent filters so regenerate() can reuse them
  const currentFiltersRef = useRef({});

  /**
   * fetchSummary — explicitly called (never auto-triggered by state changes).
   * Calls the backend API and updates summaryData / loading / error state.
   */
  const fetchSummary = useCallback(
    async (filters = {}) => {
      if (!centerId) return;

      // Persist the latest filters
      currentFiltersRef.current = filters;

      setIsLoading(true);
      setError(null);
      setResponseSource(null);
      setSummaryData(null); // clear stale data from previous tab immediately

      try {
        const { timeRange, detailLevel, isDeepDive, deepDiveSection, ...otherFilters } = filters;

        if (isDeepDive && deepDiveSection) {
          const response = await apiClient.post(
            '/method/devx_ai.summary.api.get_section_deep_dive',
            {
              center_id: centerId,
              section: deepDiveSection,
              time_range: timeRange || '30d',
              tone: otherFilters.tone || 'Operational',
              detail_level: detailLevel || 'Standard',
            },
          );
          const result = response.data?.message || response.data;
          if (result?.success) {
            // console.log(`[useCenterAI] deep dive (${deepDiveSection}) success:`, result);
            setSummaryData({ [deepDiveSection]: result.data });
            setResponseSource(result.source);
          } else {
            console.error('[useCenterAI] deep dive error:', result?.error);
            setError(result?.error || 'Failed to generate deep dive.');
            setSummaryData(null);
          }
        } else {
          // Normal tab summary
          const response = await apiClient.post('/method/devx_ai.summary.api.get_center_summary', {
            center_id: centerId,
            time_range: timeRange || '30d',
            detail_level: detailLevel || 'Standard',
            ...otherFilters,
          });

          const result = response.data?.message || response.data;

          if (result?.success) {
            // console.log('[useCenterAI] fetchSummary success:', result);
            setSummaryData(result.data);
            setResponseSource(result.source);
          } else {
            console.error('[useCenterAI] fetchSummary business error:', result?.error);
            setError(result?.error || 'Failed to generate AI summary.');
            setSummaryData(null);
          }
        }
      } catch (error_) {
        console.error('[useCenterAI] fetchSummary network/system error:', error_);
        const message =
          error_?.message || error_?.exc || 'Failed to generate AI summary. Please try again.';
        setError(typeof message === 'string' ? message : JSON.stringify(message));
        setSummaryData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [centerId],
  );

  /**
   * fetchHistory — loads past AI Summary Log records for this center.
   */
  const fetchHistory = useCallback(
    async (limit = 20) => {
      if (!centerId) return;
      setIsHistoryLoading(true);
      try {
        const response = await apiClient.post('/method/devx_ai.summary.api.get_ai_history', {
          center_id: centerId,
          limit,
        });
        const result = response.data?.message || response.data;
        if (result?.success) {
          setHistoryData(result.data || []);
        } else {
          console.error('[useCenterAI] fetchHistory error:', result?.error);
          setHistoryData([]);
        }
      } catch (error_) {
        console.error('[useCenterAI] fetchHistory network error:', error_);
        setHistoryData([]);
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [centerId],
  );

  /**
   * loadHistorySummary — restore a stored summary into the main panel.
   */
  const loadHistorySummary = useCallback((fullSummaryJson) => {
    try {
      const parsed =
        typeof fullSummaryJson === 'string' ? JSON.parse(fullSummaryJson) : fullSummaryJson;
      setSummaryData(parsed);
      setError(null);
    } catch (error_) {
      console.error('[useCenterAI] loadHistorySummary parse error:', error_);
    }
  }, []);

  /**
   * regenerate — re-fetches using the last known filters + force_refresh flag.
   */
  const regenerate = useCallback(() => {
    fetchSummary({ ...currentFiltersRef.current, force_refresh: true });
  }, [fetchSummary]);

  /**
   * sendChatMessage — Phase 3/6: relevance-scoped chat with session memory on the server.
   */
  const sendChatMessage = useCallback(
    async (message, options = {}) => {
      const trimmed = message?.trim();
      if (!trimmed || !centerId) return;

      const timeRange = options.timeRange ?? currentFiltersRef.current?.timeRange ?? '30d';
      const tab = options.tab ?? currentFiltersRef.current?.tab ?? 'overview';

      const userMessage = {
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      setChatMessages((prev) => [...prev, userMessage]);
      setIsChatLoading(true);

      try {
        const response = await apiClient.post('/method/devx_ai.summary.api.chat_with_center', {
          center_id: centerId,
          message: trimmed,
          time_range: timeRange,
          tab,
        });
        const result = response.data?.message || response.data;

        if (result?.success && result.data) {
          setChatMessages((prev) => [
            ...prev,
            { role: 'assistant', content: result.data, timestamp: Date.now() },
          ]);
        } else {
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: {
                relevant: false,
                message: result?.error || 'Something went wrong. Please try again.',
                suggested_prompts: [],
              },
              timestamp: Date.now(),
            },
          ]);
        }
      } catch (error_) {
        console.error('[useCenterAI] sendChatMessage error:', error_);
        const apiMsg = error_?.response?.data?.message;
        const errText =
          (typeof apiMsg === 'string' && apiMsg) ||
          apiMsg?.error ||
          error_?.message ||
          'Something went wrong. Please try again.';
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: {
              relevant: false,
              message: errText,
              suggested_prompts: [],
            },
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsChatLoading(false);
      }
    },
    [centerId],
  );

  /**
   * clearChat — clears server session transcript and local UI.
   */
  const clearChat = useCallback(async () => {
    if (centerId) {
      try {
        await apiClient.post('/method/devx_ai.summary.api.clear_chat_history', {
          center_id: centerId,
        });
      } catch (error_) {
        console.error('[useCenterAI] clearChat error:', error_);
      }
    }
    setChatMessages([]);
  }, [centerId]);

  return {
    // State
    summaryData,
    isLoading,
    error,
    chatMessages,
    isChatLoading,
    historyData,
    isHistoryLoading,
    responseSource,
    // Functions
    fetchSummary,
    regenerate,
    fetchHistory,
    loadHistorySummary,
    sendChatMessage,
    clearChat,
  };
};

export default useCenterAI;
