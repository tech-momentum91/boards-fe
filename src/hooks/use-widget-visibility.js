import { useState, useEffect, useCallback } from 'react';

const WIDGET_KEYS = {
  STATS: 'stats',
};

const DEFAULT_WIDGET_VISIBILITY = {
  [WIDGET_KEYS.STATS]: true,
};

/**
 * Hook to manage widget visibility with localStorage persistence
 * @param {string} storageKey - Key for localStorage
 * @returns {Object} - { widgetVisibility, toggleWidget, hideAllWidgets, showAllWidgets }
 */
export const useWidgetVisibility = (storageKey = 'ticket-management-widgets') => {
  const [widgetVisibility, setWidgetVisibility] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return { ...DEFAULT_WIDGET_VISIBILITY, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading widget visibility from localStorage:', error);
    }
    return DEFAULT_WIDGET_VISIBILITY;
  });

  // Persist to localStorage whenever visibility changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widgetVisibility));
    } catch (error) {
      console.error('Error saving widget visibility to localStorage:', error);
    }
  }, [widgetVisibility, storageKey]);

  const toggleWidget = useCallback((widgetKey) => {
    setWidgetVisibility((previous) => ({
      ...previous,
      [widgetKey]: !previous[widgetKey],
    }));
  }, []);

  const hideAllWidgets = useCallback(() => {
    setWidgetVisibility((previous) => {
      const updated = { ...previous };
      Object.keys(updated).forEach((key) => {
        updated[key] = false;
      });
      return updated;
    });
  }, []);

  const showAllWidgets = useCallback(() => {
    setWidgetVisibility((previous) => {
      const updated = { ...previous };
      Object.keys(DEFAULT_WIDGET_VISIBILITY).forEach((key) => {
        updated[key] = DEFAULT_WIDGET_VISIBILITY[key];
      });
      return updated;
    });
  }, []);

  return {
    widgetVisibility,
    toggleWidget,
    hideAllWidgets,
    showAllWidgets,
    WIDGET_KEYS,
  };
};
