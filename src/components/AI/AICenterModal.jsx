import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { RefreshCw, X, Sparkles, AlertCircle } from 'lucide-react';
import useCenterAI from '@/hooks/useCenterAI';
import AILeftPanel from './AILeftPanel';
import AIRightPanel from './AIRightPanel';
import AISectionCard from './AISectionCard';
import AIActionSection from './AIActionSection';
import AIChatBar from './AIChatBar';
import AIHistoryPanel from './AIHistoryPanel';
import './AICenterModal.css';

const DEFAULT_FILTERS = {
  timeRange: '30d',
  tone: 'Operational',
  detailLevel: 'Standard',
};

const QUICK_ACTION_PRESETS = {
  'Last 7 Days Summary': {
    tab: 'overview',
    timeRange: '7d',
    tone: 'Operational',
    detailLevel: 'Standard',
  },
  'Last 30 Days Summary': {
    tab: 'overview',
    timeRange: '30d',
    tone: 'Operational',
    detailLevel: 'Standard',
  },
  'Ticket Summary': {
    tab: 'centre_insights',
    deepDive: 'tickets',
    timeRange: '30d',
    tone: 'Operational',
    detailLevel: 'Detailed',
  },
  'Occupancy Summary': {
    tab: 'facility',
    deepDive: 'spaces',
    timeRange: '30d',
    tone: 'Analytical',
    detailLevel: 'Standard',
  },
  'Financial Summary': {
    tab: 'clients',
    deepDive: 'billing',
    timeRange: '30d',
    tone: 'Executive',
    detailLevel: 'Standard',
  },
  'Risk Alerts': {
    tab: 'critical_actions',
    timeRange: '7d',
    tone: 'Operational',
    detailLevel: 'Detailed',
  },
  'Vendor Summary': {
    tab: 'facility',
    deepDive: 'opex',
    timeRange: '30d',
    tone: 'Operational',
    detailLevel: 'Standard',
  },
  'Recommended Actions': {
    tab: 'critical_actions',
    timeRange: '30d',
    tone: 'Executive',
    detailLevel: 'Detailed',
  },
};

const LOADING_MESSAGES = [
  'Gathering Tickets Data',
  'Gathering Spaces Data',
  'Gathering Finance Data',
  'AI is thinking',
];

const LoadingText = () => {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fullText = LOADING_MESSAGES[index];
    let i = 0;
    setDisplayText('');

    const typingInterval = setInterval(() => {
      if (i < fullText.length) {
        setDisplayText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, 40);

    return () => clearInterval(typingInterval);
  }, [index]);

  return (
    <p className='ai-loading-text'>
      {displayText}
      <span className='ai-loading-cursor' />
    </p>
  );
};

/**
 * AICenterModal — AI Intelligence Workspace modal for a Center.
 *
 * @param {string}   centerId   — Frappe docname for the Center
 * @param {string}   centerName — display name for the Center
 * @param {Function} onClose    — called when modal should close
 */
const AICenterModal = ({ centerId, centerName, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeQuickAction, setActiveQuickAction] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const {
    summaryData,
    isLoading,
    error,
    chatMessages,
    isChatLoading,
    historyData,
    isHistoryLoading,
    responseSource,
    fetchSummary,
    regenerate,
    fetchHistory,
    loadHistorySummary,
    sendChatMessage,
    clearChat,
  } = useCenterAI(centerId);

  // Fetch overview on mount
  useEffect(() => {
    if (centerId) {
      fetchSummary(DEFAULT_FILTERS);
    }
  }, [centerId, fetchSummary]);

  // Merge partial filter updates into current filters state
  const handleFiltersChange = useCallback((partialUpdate) => {
    setFilters((prev) => ({ ...prev, ...partialUpdate }));
  }, []);

  // Apply & Regenerate
  const handleApply = useCallback(() => {
    fetchSummary({ ...filters, tab: activeTab });
  }, [fetchSummary, filters, activeTab]);

  // Tab change triggers new fetch (or history fetch for 'history' tab)
  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);
      // Selecting a section clears the quick action highlight
      setActiveQuickAction(null);
      if (tab === 'history') {
        fetchHistory();
      } else {
        // Clear deep dive state when organically changing tabs
        const updatedFilters = { ...filters, isDeepDive: false, deepDiveSection: null };
        setFilters(updatedFilters);
        fetchSummary({ ...updatedFilters, tab });
      }
    },
    [fetchSummary, fetchHistory, filters],
  );

  // Quick action: look up preset, set tab + filters, fetch immediately
  const handleQuickAction = useCallback(
    (actionLabel) => {
      const preset = QUICK_ACTION_PRESETS[actionLabel];
      if (preset) {
        const { tab: newTab, deepDive, ...filterPreset } = preset;
        const mergedFilters = {
          ...filters,
          ...filterPreset,
          isDeepDive: !!deepDive,
          deepDiveSection: deepDive || null,
        };
        setFilters(mergedFilters);
        // Quick action is independent: highlight the action, default section to newTab unless specified
        setActiveQuickAction(actionLabel);
        setActiveTab(newTab || 'overview');
        fetchSummary({ ...mergedFilters, tab: newTab });
      } else {
        // Suggested prompt — treat as chat message
        sendChatMessage(actionLabel);
      }
    },
    [filters, fetchSummary, sendChatMessage],
  );

  // Restore a past summary from History tab
  const handleLoadHistorySummary = useCallback(
    (rec) => {
      // rec has summary_preview; we need to fetch the full_summary
      // For now, parse the stored full_summary if it came with the record,
      // otherwise just load the preview text as a section
      if (rec.full_summary) {
        loadHistorySummary(rec.full_summary);
      } else {
        loadHistorySummary(rec.summary_preview);
      }
      // Switch to the tab the summary was originally generated for
      const originalTab = (rec.tab || 'overview').toLowerCase();
      setActiveTab(originalTab);
    },
    [loadHistorySummary],
  );

  // Get sections for the active tab from summaryData
  const activeSections = useMemo(() => {
    if (!summaryData || typeof summaryData !== 'object') return [];
    return Object.values(summaryData);
  }, [summaryData]);

  // Close on overlay click (outside the modal card)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  // Determine if all sections are empty (no bullets or actions)
  const allSectionsEmpty = useMemo(() => {
    if (activeSections.length === 0) return true;
    return activeSections.every((sec) => {
      if (!sec || typeof sec !== 'object') return true;
      const bullets = sec?.bullets;
      const actions = sec?.actions;
      const hasBullets = Array.isArray(bullets) && bullets.length > 0;
      const hasActions = Array.isArray(actions) && actions.length > 0;
      return !hasBullets && !hasActions;
    });
  }, [activeSections]);

  return (
    <div className='ai-modal-overlay' onClick={handleOverlayClick}>
      <div
        className='ai-modal'
        role='dialog'
        aria-modal='true'
        aria-label='AI Intelligence Workspace'
      >
        {/* Header */}
        <div className='ai-modal-header'>
          <div className='ai-modal-header-left'>
            <div className='ai-modal-icon'>
              <Sparkles size={18} />
            </div>
            <div className='ai-modal-title-block'>
              <h2 className='ai-modal-title'>AI Intelligence Workspace</h2>
              <p className='ai-modal-subtitle'>{centerName || centerId}</p>
            </div>
          </div>
          <div className='ai-modal-header-right'>
            {responseSource === 'summary_cache' && (
              <span
                style={{
                  color: 'var(--text-muted, #6b7280)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  marginRight: '8px',
                }}
              >
                Cached
              </span>
            )}
            {activeTab !== 'history' && (
              <button
                className='ai-regenerate-btn'
                onClick={regenerate}
                disabled={isLoading}
                title='Regenerate summary'
              >
                <RefreshCw size={14} className={isLoading ? 'ai-spin' : ''} />
                Regenerate
              </button>
            )}
            <button className='ai-close-btn' onClick={onClose} aria-label='Close modal'>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body — 3 column layout */}
        <div className='ai-modal-body'>
          {/* Left — tabs */}
          <AILeftPanel activeTab={activeTab} onTabChange={handleTabChange} />

          {/* Main content area */}
          <div className='ai-main-panel'>
            {/* ── History tab ── */}
            {activeTab === 'history' && (
              <AIHistoryPanel
                records={historyData}
                isLoading={isHistoryLoading}
                onLoadHistorySummary={handleLoadHistorySummary}
                onRefresh={fetchHistory}
              />
            )}

            {/* ── AI summary tabs ── */}
            {activeTab !== 'history' && (
              <>
                {/* Loading state */}
                {isLoading && (
                  <div className='ai-loading-state'>
                    <div className='ai-spinner' />
                    <LoadingText />
                  </div>
                )}

                {/* Error state */}
                {!isLoading && error && (
                  <div className='ai-error-state'>
                    <AlertCircle size={36} strokeWidth={1.5} className='ai-error-icon' />
                    <p className='ai-error-message'>{error}</p>
                    <button
                      className='ai-apply-btn'
                      style={{ marginTop: '14px' }}
                      onClick={regenerate}
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Empty — sections exist but no content (or empty JSON from LLM) */}
                {!isLoading && !error && summaryData && allSectionsEmpty && (
                  <div className='ai-empty-state'>
                    <p>No actionable insights could be determined for this time range.</p>
                  </div>
                )}

                {/* Success — sections with content */}
                {!isLoading && !error && activeSections.length > 0 && !allSectionsEmpty && (
                  <div className='ai-sections-grid ai-fade-in'>
                    {activeSections.map((section, index) => {
                      if (activeTab === 'critical_actions') {
                        // Prefer AIActionSection if section has actions array;
                        // fallback to AISectionCard if LLM returned bullets instead
                        const hasActions =
                          Array.isArray(section?.actions) && section.actions.length > 0;
                        if (hasActions) {
                          return (
                            <AIActionSection
                              key={index}
                              sectionData={section}
                              centerId={centerId}
                              onCloseModal={onClose}
                            />
                          );
                        }
                        return <AISectionCard key={index} sectionData={section} />;
                      }
                      return <AISectionCard key={index} sectionData={section} />;
                    })}
                  </div>
                )}

                {/* Initial/no data state */}
                {!isLoading && !error && !summaryData && (
                  <div className='ai-empty-state'>
                    <p>
                      Select filters and click <strong>Regenerate</strong> to load your AI summary.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right — filters & quick actions */}
          <AIRightPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onApply={handleApply}
            onQuickAction={handleQuickAction}
            onPromptSend={(text) =>
              sendChatMessage(text, { timeRange: filters.timeRange, tab: activeTab })
            }
            activeTab={activeTab}
            activeQuickAction={activeQuickAction}
          />
        </div>

        {/* Chat panel pinned to bottom */}
        <AIChatBar
          centerName={centerName}
          activeTab={activeTab}
          messages={chatMessages}
          isLoading={isChatLoading}
          onSend={(text) => sendChatMessage(text, { timeRange: filters.timeRange, tab: activeTab })}
          onClear={clearChat}
          timeRange={filters.timeRange}
        />
      </div>
    </div>
  );
};

export default AICenterModal;
