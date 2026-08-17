import React from 'react';
import {
  LayoutGrid,
  Users,
  Building2,
  TrendingUp,
  Lightbulb,
  AlertOctagon,
  Clock,
  ChevronRight,
} from 'lucide-react';

const TABS = [
  { key: 'overview', label: 'Overview', Icon: LayoutGrid },
  { key: 'clients', label: 'Clients', Icon: Users },
  { key: 'facility', label: 'Facility Management', Icon: Building2 },
  { key: 'sales', label: 'Sales', Icon: TrendingUp },
  { key: 'centre_insights', label: 'Centre Insights', Icon: Lightbulb },
  { key: 'critical_actions', label: 'Critical Actions', Icon: AlertOctagon },
  { key: 'history', label: 'History', Icon: Clock },
];

const AILeftPanel = ({ activeTab, onTabChange }) => {
  return (
    <div className='ai-left-panel'>
      <p className='ai-section-label'>SECTIONS</p>
      <nav className='ai-tab-list'>
        {TABS.map(({ key, label, Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              className={`ai-tab-btn${isActive ? ' active' : ''}`}
              onClick={() => onTabChange(key)}
            >
              <span className='ai-tab-icon'>
                <Icon size={16} />
              </span>
              <span className='ai-tab-label'>{label}</span>
              {isActive && (
                <span className='ai-tab-chevron'>
                  <ChevronRight size={14} />
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default AILeftPanel;
