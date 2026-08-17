import { useState, useEffect, useCallback } from 'react';

/**
 * Reusable hook for managing table variant (default/compact)
 * Handles state and localStorage persistence
 * @param {string} tableId - Unique identifier for the table (used for localStorage key)
 * @param {string} defaultVariant - Default variant ('default' | 'compact')
 * @returns {Object} - { variant, setVariant, toggleVariant }
 */
export const useTableVariant = (tableId, defaultVariant = 'compact') => {
  const storageKey = `table-variant-${tableId}`;

  // Initialize state from localStorage or default
  const [variant, setVariantState] = useState(() => {
    if (!tableId) return defaultVariant;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && (saved === 'default' || saved === 'compact')) {
        return saved;
      }
    } catch (error) {
      console.error('Failed to load table variant:', error);
    }
    return defaultVariant;
  });

  // Save to localStorage whenever variant changes
  useEffect(() => {
    if (!tableId) return;

    try {
      localStorage.setItem(storageKey, variant);
    } catch (error) {
      console.error('Failed to save table variant:', error);
    }
  }, [variant, tableId, storageKey]);

  // Set variant with validation
  const setVariant = useCallback((newVariant) => {
    if (newVariant === 'default' || newVariant === 'compact') {
      setVariantState(newVariant);
    }
  }, []);

  // Toggle between default and compact
  const toggleVariant = useCallback(() => {
    setVariantState((previous) => (previous === 'compact' ? 'default' : 'compact'));
  }, []);

  return {
    variant,
    setVariant,
    toggleVariant,
  };
};
