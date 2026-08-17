/**
 * Column Configuration Service
 *
 * Handles persistence of column configurations (order and visibility)
 * Currently uses localStorage but structured to easily swap with API calls
 */

const STORAGE_PREFIX = 'column_config_';
const DEBOUNCE_DELAY = 1000; // 1 second debounce for API calls

// Simulates API delay for realistic behavior
const simulateApiDelay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch column configuration from storage/API
 * @param {string} tableId - Unique identifier for the table
 * @returns {Promise<Object|null>} Column configuration or null if not found
 */
export const fetchColumnConfig = async (tableId) => {
  try {
    // Simulate API call delay
    await simulateApiDelay();

    const key = `${STORAGE_PREFIX}${tableId}`;
    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    const config = JSON.parse(stored);

    // Validate structure
    if (!config.columns || !Array.isArray(config.columns)) {
      console.warn('Invalid column config structure, ignoring');
      return null;
    }

    return config;
  } catch (error) {
    console.error('Error fetching column config:', error);
    return null;
  }
};

/**
 * Save column configuration to storage/API
 * @param {string} tableId - Unique identifier for the table
 * @param {Object} config - Column configuration object
 * @param {Array} config.columns - Array of column configurations
 * @returns {Promise<boolean>} Success status
 */
export const saveColumnConfig = async (tableId, config) => {
  try {
    // Simulate API call delay
    await simulateApiDelay();

    const key = `${STORAGE_PREFIX}${tableId}`;

    // Add metadata
    const configWithMeta = {
      ...config,
      updatedAt: new Date().toISOString(),
      tableId,
    };

    localStorage.setItem(key, JSON.stringify(configWithMeta));

    return true;
  } catch (error) {
    console.error('Error saving column config:', error);
    return false;
  }
};

/**
 * Delete column configuration from storage/API
 * @param {string} tableId - Unique identifier for the table
 * @returns {Promise<boolean>} Success status
 */
export const deleteColumnConfig = async (tableId) => {
  try {
    await simulateApiDelay();

    const key = `${STORAGE_PREFIX}${tableId}`;
    localStorage.removeItem(key);

    return true;
  } catch (error) {
    console.error('Error deleting column config:', error);
    return false;
  }
};

/**
 * Debounced save function to optimize API calls
 * Returns a debounced version of saveColumnConfig
 */
let debounceTimer = null;

export const debouncedSaveColumnConfig = (tableId, config) => {
  return new Promise((resolve, reject) => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer
    debounceTimer = setTimeout(async () => {
      try {
        const result = await saveColumnConfig(tableId, config);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, DEBOUNCE_DELAY);
  });
};

/**
 * Immediately save without debouncing (for explicit user actions like "Save" button)
 */
export const immediateSaveColumnConfig = async (tableId, config) => {
  // Clear any pending debounced saves
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  return await saveColumnConfig(tableId, config);
};
