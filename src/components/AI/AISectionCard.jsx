import React from 'react';
import {
  FileText,
  TrendingUp,
  Zap,
  Shield,
  DollarSign,
  Users,
  Target,
  AlertTriangle,
  Lightbulb,
  LayoutGrid,
  Eye,
  ShieldAlert,
  Clock,
  BarChart2,
  CheckCircle,
  LayoutDashboard,
  Building2,
  AlertCircle,
  EyeOff,
  Sprout,
  Flame,
  CalendarClock,
  Map,
} from 'lucide-react';

// Maps icon string names from the LLM response to Lucide components
const ICON_MAP = {
  FileText,
  TrendingUp,
  Zap,
  Shield,
  DollarSign,
  Users,
  Target,
  AlertTriangle,
  Lightbulb,
  LayoutGrid,
  Eye,
  ShieldAlert,
  Clock,
  BarChart2,
  CheckCircle,
  LayoutDashboard,
  Building2,
  AlertCircle,
  EyeOff,
  Sprout,
  Flame,
  CalendarClock,
  Map,
};

// Maps border_color field from LLM response to actual CSS class
const BORDER_CLASS_MAP = {
  teal: 'ai-section-card-border-teal',
  red: 'ai-section-card-border-red',
  orange: 'ai-section-card-border-orange',
  yellow: 'ai-section-card-border-yellow',
};

/**
 * AISectionCard — renders a single AI summary section card.
 *
 * @param {Object} sectionData — { title, icon, border_color, bullets, summary, metrics }
 * Bullets can be strings or objects { text, priority, due } (actions tab).
 */
const AISectionCard = ({ sectionData }) => {
  if (!sectionData) return null;

  const { title, icon, border_color, bullets = [], summary, metrics } = sectionData;

  const IconComponent = ICON_MAP[icon] || FileText;
  const borderClass = BORDER_CLASS_MAP[border_color] || 'ai-section-card-border-teal';

  const PRIORITY_COLORS = {
    urgent: '#ef4444',
    this_week: '#f97316',
    strategic: '#14b8a6',
  };

  return (
    <div className={`ai-section-card ${borderClass}`}>
      {/* Card Header */}
      <div className='ai-section-card-header'>
        <div className='ai-section-icon-circle'>
          <IconComponent size={14} />
        </div>
        <h3 className='ai-section-card-title'>{title}</h3>
      </div>

      {/* Optional summary paragraph */}
      {summary && <p className='ai-section-card-summary'>{summary}</p>}

      {/* Optional metrics grid (deep dive cards) */}
      {metrics && typeof metrics === 'object' && Object.keys(metrics).length > 0 && (
        <div className='ai-section-metrics'>
          {Object.entries(metrics).map(([key, val]) => (
            <div key={key} className='ai-metric-item'>
              <span className='ai-metric-label'>{key.replaceAll('_', ' ')}</span>
              <span className='ai-metric-value'>{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bullet list — supports both plain strings and action objects */}
      {bullets.length > 0 && (
        <ul className='ai-bullet-list'>
          {bullets.map((bullet, index) => {
            if (bullet && typeof bullet === 'object') {
              // Actions tab: { text, priority, due }
              const dotColor = PRIORITY_COLORS[bullet.priority] || '#14b8a6';
              return (
                <li key={index} style={{ '--bullet-color': dotColor }}>
                  <span className='ai-action-bullet-text'>{bullet.text}</span>
                  {bullet.due && (
                    <span className='ai-action-due' style={{ color: dotColor }}>
                      {bullet.due}
                    </span>
                  )}
                </li>
              );
            }
            return <li key={index}>{bullet}</li>;
          })}
        </ul>
      )}
    </div>
  );
};

export default AISectionCard;
