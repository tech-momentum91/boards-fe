import React from 'react';
import { Clock, RefreshCw } from 'lucide-react';

const TAB_BADGE_COLORS = {
  overview: '#0d9488',
  clients: '#2563eb',
  facility: '#16a34a',
  sales: '#ea580c',
  centre_insights: '#8b5cf6',
  critical_actions: '#dc2626',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} · ${d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}`;
  } catch {
    return dateStr;
  }
}

function truncate(str, maxLen = 120) {
  if (!str) return '';
  return str.length > maxLen ? `${str.slice(0, maxLen).trimEnd()}…` : str;
}

/**
 * AIHistoryPanel — renders the History tab content.
 *
 * @param {Array}    records               - AI Summary Log records from useCenterAI.historyData
 * @param {boolean}  isLoading             - true while fetching history
 * @param {Function} onLoadHistorySummary  - called with the full_summary JSON string to restore it
 * @param {Function} onRefresh             - called to re-fetch history
 */
const AIHistoryPanel = ({ records = [], isLoading, onLoadHistorySummary, onRefresh }) => {
  if (isLoading) {
    return (
      <div className='ai-loading-state'>
        <div className='ai-spinner' />
        <p>Loading history…</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className='ai-empty-state'>
        <Clock size={32} strokeWidth={1.5} style={{ opacity: 0.4, marginBottom: '12px' }} />
        <p>No history yet. Generate a summary to see it here.</p>
      </div>
    );
  }

  return (
    <div className='ai-history-panel'>
      <div className='ai-history-header'>
        <span className='ai-section-label'>PAST SUMMARIES ({records.length})</span>
        <button className='ai-history-refresh-btn' onClick={onRefresh} title='Refresh history'>
          <RefreshCw size={13} />
        </button>
      </div>

      <div className='ai-history-list'>
        {records.map((rec) => {
          const tabKey = (rec.tab || 'overview').toLowerCase();
          const badgeColor = TAB_BADGE_COLORS[tabKey] || '#0d9488';

          return (
            <div key={rec.name} className='ai-history-card'>
              <div className='ai-history-card-top'>
                <span className='ai-tab-badge' style={{ background: badgeColor }}>
                  {rec.tab || 'Overview'}
                </span>
                <span className='ai-history-date'>{formatDate(rec.creation)}</span>
              </div>

              <div className='ai-history-pills'>
                {rec.time_range && <span className='ai-filter-pill'>{rec.time_range}</span>}
                {rec.tone && <span className='ai-filter-pill'>{rec.tone}</span>}
                {rec.detail_level && <span className='ai-filter-pill'>{rec.detail_level}</span>}
              </div>

              {rec.summary_preview && (
                <p className='ai-history-preview'>{truncate(rec.summary_preview, 120)}</p>
              )}

              <button className='ai-history-load-btn' onClick={() => onLoadHistorySummary?.(rec)}>
                Load This Summary
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIHistoryPanel;
