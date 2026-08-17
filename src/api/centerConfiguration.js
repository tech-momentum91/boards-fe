import apiClient from '@/api/axios';
import { extractErrorMessage, getFrappeResponseError } from '@/utils/error-utils';

const GET_TEAMS_CONFIG_ROLES_PATH =
  '/method/devx.center_management.api.center_configuration.get_teams_configuration_roles';
const GET_TEAMS_CONFIG_PATH =
  '/method/devx.center_management.api.center_configuration.get_center_teams_config';
const SAVE_TEAMS_CONFIG_PATH =
  '/method/devx.center_management.api.center_configuration.save_center_teams_config';
const GET_PRICING_CONFIG_PATH =
  '/method/devx.center_management.api.center_configuration.get_center_pricing_config';
const SAVE_PRICING_CONFIG_PATH =
  '/method/devx.center_management.api.center_configuration.save_center_pricing_config';

/**
 * Fetch categorized allowed roles for Teams configuration from backend API.
 * @returns {Promise<Object>}
 */
export const fetchCenterTeamsConfigRolesApi = async () => {
  try {
    const response = await apiClient.get(GET_TEAMS_CONFIG_ROLES_PATH);
    const frappeErr = getFrappeResponseError(
      response?.data,
      'Failed to fetch Teams configuration roles',
    );
    if (frappeErr) {
      throw new Error(frappeErr);
    }
    const message = response?.data?.message ?? response?.data ?? {};
    const data = message.data ?? message;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new TypeError('Invalid response structure for Teams configuration roles');
    }
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch Teams configuration roles'));
  }
};

/**
 * Fetch Teams Configuration for a center from backend API.
 * @param {string} centerId
 * @returns {Promise<Array>}
 */
export const fetchCenterTeamsConfigApi = async (centerId) => {
  if (!centerId) return [];
  try {
    const response = await apiClient.get(GET_TEAMS_CONFIG_PATH, {
      params: { center: centerId },
    });
    const frappeErr = getFrappeResponseError(response?.data, 'Failed to fetch Teams configuration');
    if (frappeErr) {
      throw new Error(frappeErr);
    }
    const message = response?.data?.message ?? response?.data ?? {};
    const data = Array.isArray(message) ? message : message.data;
    if (!Array.isArray(data)) {
      throw new TypeError('Invalid response structure for Teams configuration');
    }
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch Teams configuration'));
  }
};

/**
 * Save/Update Teams Configuration for a center to backend API.
 * @param {string} centerId
 * @param {Array} rows
 * @returns {Promise<Array>}
 */
export const saveCenterTeamsConfigApi = async (centerId, rows) => {
  if (!centerId) return [];
  try {
    const response = await apiClient.post(SAVE_TEAMS_CONFIG_PATH, {
      center: centerId,
      rows,
    });
    const frappeErr = getFrappeResponseError(response?.data, 'Failed to save Teams configuration');
    if (frappeErr) {
      throw new Error(frappeErr);
    }
    const message = response?.data?.message ?? response?.data ?? {};
    const data = Array.isArray(message) ? message : message.data;
    if (!Array.isArray(data)) {
      throw new TypeError('Invalid response structure for Teams configuration');
    }
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to save Teams configuration'));
  }
};

/**
 * Fetch Pricing Configuration for a center from backend API.
 * @param {string} centerId
 * @returns {Promise<Array>}
 */
export const fetchCenterPricingConfigApi = async (centerId) => {
  if (!centerId) return [];
  try {
    const response = await apiClient.get(GET_PRICING_CONFIG_PATH, {
      params: { center: centerId },
    });
    const frappeErr = getFrappeResponseError(
      response?.data,
      'Failed to fetch Pricing configuration',
    );
    if (frappeErr) {
      throw new Error(frappeErr);
    }
    const message = response?.data?.message ?? response?.data ?? {};
    const data = Array.isArray(message) ? message : message.data;
    if (!Array.isArray(data)) {
      throw new TypeError('Invalid response structure for Pricing configuration');
    }
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to fetch Pricing configuration'));
  }
};

/**
 * Save/Update Pricing Configuration for a center to backend API.
 * @param {string} centerId
 * @param {Array} rows
 * @returns {Promise<Array>}
 */
export const saveCenterPricingConfigApi = async (centerId, rows) => {
  if (!centerId) return [];
  try {
    const response = await apiClient.post(SAVE_PRICING_CONFIG_PATH, {
      center: centerId,
      rows,
    });
    const frappeErr = getFrappeResponseError(
      response?.data,
      'Failed to save Pricing configuration',
    );
    if (frappeErr) {
      throw new Error(frappeErr);
    }
    const message = response?.data?.message ?? response?.data ?? {};
    const data = Array.isArray(message) ? message : message.data;
    if (!Array.isArray(data)) {
      throw new TypeError('Invalid response structure for Pricing configuration');
    }
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to save Pricing configuration'));
  }
};
