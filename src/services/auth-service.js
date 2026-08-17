import apiClient from '../api/axios';

/**
 * Login service - authenticates user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{data: any} | {error: string}>}
 */
export async function loginService(email, password) {
  try {
    const response = await apiClient.post('/method/login', {
      usr: email,
      pwd: password,
    });

    return response.status === 200 && response.data
      ? { data: response.data }
      : { error: 'Invalid response from server' };
  } catch (error) {
    console.error('Login service error', error);
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.exc ||
      'Invalid credentials. Please try again.';
    return { error: errorMessage };
  }
}

/**
 * Logout service - logs out the current user
 * @returns {Promise<{data: any, status: number} | {error: string}>}
 */
export async function logOutService() {
  try {
    const { data, status } = await apiClient.get('/method/logout');
    return { data, status };
  } catch (error) {
    console.error('Logout service error', error);
    const errorMessage = error.response?.data?.message || 'Logout failed. Please try again.';
    return { error: errorMessage };
  }
}

/**
 * Get user data by email ID
 * @param {string} email - User email
 * @returns {Promise<any>}
 */
export async function getUserByEmailID(email) {
  try {
    const { data } = await apiClient.get(`/resource/User/${email}`);
    return data;
  } catch (error) {
    console.error('Get user service error', error);
    const errorMessage =
      error.response?.data?.message || 'Failed to get user data. Please try again.';
    return { error: errorMessage };
  }
}

/**
 * Get current session
 * @returns {Promise<{message: string}>}
 */
export async function getSession() {
  try {
    const res = await apiClient.get('/method/frappe.auth.get_logged_user');
    return res.data;
  } catch (error) {
    // 403 or other errors mean user is not logged in - return empty message
    if (error.response?.status === 403 || error.response?.status === 401) {
      return { message: '' };
    }
    // For other errors, throw to be handled by caller
    throw error;
  }
}
