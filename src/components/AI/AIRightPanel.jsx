import React from 'react';
import { PROMPTS_BY_TAB } from './aiPromptMaps';

const QUICK_ACTIONS = [
  'Last 7 Days Summary',
  'Last 30 Days Summary',
  'Ticket Summary',
  'Occupancy Summary',
  'Financial Summary',
  'Risk Alerts',
  'Vendor Summary',
  'Recommended Actions',
];

const TIME_RANGE_OPTIONS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

const TONE_OPTIONS = [
  { value: 'Operational', label: 'Operational' },
  { value: 'Executive', label: 'Executive' },
  { value: 'Analytical', label: 'Analytical' },
  { value: 'Casual', label: 'Casual' },
];

const DETAIL_LEVEL_OPTIONS = [
  { value: 'Concise', label: 'Concise' },
  { value: 'Standard', label: 'Standard' },
  { value: 'Detailed', label: 'Detailed' },
];

/**
 * AIRightPanel — filters, quick actions, and suggested prompts side panel.
 *
 * @param {Function} onPromptSend — sends a suggested chat prompt (Phase 3/6)
 */
const AIRightPanel = ({
  filters,
  onFiltersChange,
  onApply,
  onQuickAction,
  onPromptSend,
  activeTab,
  activeQuickAction,
}) => {
  const prompts = PROMPTS_BY_TAB[activeTab] || PROMPTS_BY_TAB.overview;

  return (
    <div className='ai-right-panel'>
      {/* Quick Actions */}
      <p className='ai-section-label'>QUICK ACTIONS</p>
      <div className='ai-quick-action-list'>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            className={`ai-quick-action-btn${activeQuickAction === action ? ' active' : ''}`}
            onClick={() => onQuickAction?.(action)}
          >
            {action}
          </button>
        ))}
      </div>

      <div className='ai-panel-divider' />

      {/* Filters */}
      <p className='ai-section-label'>FILTERS</p>

      <div className='ai-filter-group'>
        <label className='ai-filter-label'>TIME RANGE</label>
        <select
          className='ai-filter-select'
          value={filters?.timeRange || '30d'}
          onChange={(e) => onFiltersChange?.({ timeRange: e.target.value })}
        >
          {TIME_RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className='ai-filter-group'>
        <label className='ai-filter-label'>TONE</label>
        <select
          className='ai-filter-select'
          value={filters?.tone || 'Operational'}
          onChange={(e) => onFiltersChange?.({ tone: e.target.value })}
        >
          {TONE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className='ai-filter-group'>
        <label className='ai-filter-label'>DETAIL LEVEL</label>
        <select
          className='ai-filter-select'
          value={filters?.detailLevel || 'Standard'}
          onChange={(e) => onFiltersChange?.({ detailLevel: e.target.value })}
        >
          {DETAIL_LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button className='ai-apply-btn' onClick={onApply}>
        Apply &amp; Regenerate
      </button>

      <div className='ai-panel-divider' />

      {/* Suggested Prompts — open chat with selected text */}
      <p className='ai-section-label'>SUGGESTED PROMPTS</p>
      <div className='ai-prompt-chips ai-prompt-chips--chat'>
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type='button'
            className='ai-prompt-chip ai-prompt-chip--pill'
            onClick={() => onPromptSend?.(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AIRightPanel;
