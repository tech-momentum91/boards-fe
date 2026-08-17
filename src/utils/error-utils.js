import React from 'react';
import { toast } from '@/components/ui/toast';
import * as AlertToast from '@/components/ui/toast-alert';
import { TOAST_POSITION } from '@/constants/constants';

/**
 * Parses _server_messages to extract user-friendly error message
 * Handles nested JSON strings like: ["{\"message\": \"Error test\", ...}"]
 * @param {string} serverMessages - The _server_messages string
 * @returns {string} Extracted message or original string if parsing fails
 */
const parseServerMessages = (serverMessages) => {
  if (!serverMessages || typeof serverMessages !== 'string') {
    return serverMessages;
  }

  try {
    // First parse: might be a JSON array string
    let parsed = JSON.parse(serverMessages);

    // If it's an array, get the first element
    if (Array.isArray(parsed) && parsed.length > 0) {
      parsed = parsed[0];
    }

    // If the element is still a string, parse it again (nested JSON)
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        // If second parse fails, use the string as-is
        return parsed;
      }
    }

    // Extract message from parsed object
    if (parsed && typeof parsed === 'object') {
      // Prioritize 'message' field
      if (parsed.message && typeof parsed.message === 'string') {
        return parsed.message;
      }
      // Fallback to other common fields
      if (parsed.title && typeof parsed.title === 'string') {
        return parsed.title;
      }
    }

    // If we have a string that's not JSON, return it
    if (typeof parsed === 'string') {
      return parsed;
    }

    // Fallback: return original if we can't extract a message
    return serverMessages;
  } catch {
    // If parsing fails completely, return original
    return serverMessages;
  }
};

/**
 * Serializes error object to preserve all information needed by showErrorToast
 * while ensuring it's Redux-serializable
 * @param {Error|AxiosError} error - The error object
 * @returns {Object|string} - Serialized error object with response.data, message, code, etc., or string
 */
export const serializeError = (error) => {
  // If error was already serialized by axios interceptor, use that
  if (error?.serialized) {
    return error.serialized;
  }

  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If it's not an error object, return a string representation
  if (!error || typeof error !== 'object') {
    return String(error || 'An error occurred');
  }

  // Build serializable error object
  const serialized = {
    message: error?.message || 'An error occurred',
  };

  // Preserve error code if present
  if (error?.code) {
    serialized.code = error.code;
  }

  // Preserve exc_type if present (for ValidationError, etc.)
  if (error?.exc_type) {
    serialized.exc_type = error.exc_type;
  }

  // Preserve response.data if present (this is what showErrorToast needs)
  if (error?.response?.data) {
    try {
      // Deep clone response.data to ensure it's serializable
      // Remove any functions, circular refs, etc.
      const responseData = JSON.parse(JSON.stringify(error.response.data));
      serialized.response = {
        data: responseData,
        status: error.response.status,
        statusText: error.response.statusText,
      };
    } catch {
      // If JSON.stringify fails, extract only the message
      serialized.response = {
        data: {
          message:
            error.response.data?.message ||
            error.response.data?._server_messages ||
            serialized.message,
        },
        status: error.response.status,
        statusText: error.response.statusText,
      };
    }
  }

  // If there's no response but there's useful error info, preserve it
  if (!serialized.response && (error?.message || error?.code)) {
    return serialized;
  }

  // Return the full serialized object so showErrorToast can access error.response.data
  return serialized;
};

/**
 * Extracts error message from various error formats
 * @param {any} error - Error object, Redux thunk result, or error response
 * @param {string} defaultMessage - Default message if error cannot be extracted
 * @returns {string} Extracted error message
 */
/**
 * Strip HTML tags from a string
 * @param {string} html - String that may contain HTML
 * @returns {string} - Plain text without HTML tags
 */
const stripHtmlTags = (html) => {
  if (typeof html !== 'string') return html;

  // Create a temporary DOM element to parse and extract text
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || html;
};

/**
 * Strips leading Python/Frappe style exception class from API `exception` strings, e.g.
 * `frappe.exceptions.ValidationError: Can't move: time already passed.` → user-facing text only.
 */
const stripPythonExceptionPrefix = (text) => {
  if (typeof text !== 'string') return text;
  const firstLine = text.split(/\n/).find((line) => String(line).trim()) ?? text;
  const trimmed = firstLine.trim();
  const stripped = trimmed.replace(/^(?:[A-Z_a-z]\w*\.)+[A-Z_a-z]\w*:\s*/, '');
  const out = stripped.trim();
  return out || trimmed;
};

const MESSAGE_PRIORITY_KEYS = [
  'error',
  'message',
  'detail',
  'title',
  'exception',
  'description',
  'reason',
];

const extractMessageValue = (value, depth = 0) => {
  if (value === null || value === undefined || depth > 5) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractMessageValue(item, depth + 1);
      if (extracted) {
        return extracted;
      }
    }
    return null;
  }

  if (typeof value === 'object') {
    for (const key of MESSAGE_PRIORITY_KEYS) {
      if (key in value) {
        const extracted = extractMessageValue(value[key], depth + 1);
        if (extracted) {
          return extracted;
        }
      }
    }

    for (const nestedValue of Object.values(value)) {
      const extracted = extractMessageValue(nestedValue, depth + 1);
      if (extracted) {
        return extracted;
      }
    }
  }

  return null;
};

export const extractErrorMessage = (
  error,
  defaultMessage = 'An error occurred. Please try again.',
) => {
  // Helper to extract and clean message
  const extractAndClean = (message) => {
    if (message === null || message === undefined) return null;
    const normalizedMessage =
      typeof message === 'object' ? extractMessageValue(message) : String(message);
    if (!normalizedMessage) return null;
    let cleaned = stripHtmlTags(String(normalizedMessage));
    cleaned = stripPythonExceptionPrefix(cleaned);
    return cleaned.trim() || null;
  };

  // Handle direct Frappe API payload (e.g. Redux thunk `.unwrap()` rejection)
  if (error && typeof error === 'object' && !error.payload && !error.response) {
    const directServerMessages = error._server_messages || error._serve_message;
    if (directServerMessages) {
      const parsed = parseServerMessages(directServerMessages);
      if (parsed !== directServerMessages) {
        return extractAndClean(parsed) || parsed;
      }
      return extractAndClean(directServerMessages) || directServerMessages;
    }
    if (error.message) {
      return extractAndClean(error.message) || error.message;
    }
    if (error.exception) {
      return extractAndClean(error.exception) || error.exception;
    }
  }

  // Handle Redux thunk rejection payload (string from serializeError)
  // But check if it's actually a _server_messages string that needs parsing
  if (typeof error === 'string') {
    // Check if it looks like a _server_messages JSON string
    if (error.trim().startsWith('[') || error.trim().startsWith('"[')) {
      const parsed = parseServerMessages(error);
      if (parsed !== error) {
        return extractAndClean(parsed) || parsed;
      }
    }
    return extractAndClean(error) || error;
  }

  // Handle Redux thunk rejection result
  if (error?.payload) {
    // If payload is a string (from serializeError)
    if (typeof error.payload === 'string') {
      // Check if it's a _server_messages string
      if (error.payload.trim().startsWith('[') || error.payload.trim().startsWith('"[')) {
        const parsed = parseServerMessages(error.payload);
        if (parsed !== error.payload) {
          return extractAndClean(parsed) || parsed;
        }
      }
      return extractAndClean(error.payload) || error.payload;
    }
    // Prefer Frappe _server_messages (user-facing) before raw message / exception
    const payloadServerMessages = error.payload?._server_messages || error.payload?._serve_message;
    if (payloadServerMessages) {
      const parsed = parseServerMessages(payloadServerMessages);
      if (parsed !== payloadServerMessages) {
        return extractAndClean(parsed) || parsed;
      }
      return extractAndClean(payloadServerMessages) || payloadServerMessages;
    }
    if (error.payload?.message) {
      return extractAndClean(error.payload.message) || error.payload.message;
    }
    if (error.payload?.exception) {
      return extractAndClean(error.payload.exception) || error.payload.exception;
    }
    // If payload has exc_type (like ValidationError)
    if (error.payload?.exc_type) {
      // Check if there's a message or exception in the payload
      const message = error.payload.message || error.payload.exception || error.payload;
      return extractAndClean(message) || message;
    }
  }

  // Handle API error response
  if (error?.response?.data) {
    const responseServerMessages =
      error.response.data._server_messages || error.response.data._serve_message;
    if (responseServerMessages) {
      const parsed = parseServerMessages(responseServerMessages);
      if (parsed !== responseServerMessages) {
        return extractAndClean(parsed) || parsed;
      }
      return extractAndClean(responseServerMessages) || responseServerMessages;
    }
    if (error.response.data.message) {
      return extractAndClean(error.response.data.message) || error.response.data.message;
    }
    if (error.response.data.exception) {
      return extractAndClean(error.response.data.exception) || error.response.data.exception;
    }
  }

  // Handle error object with message (skip generic RTK "Rejected" when payload had Frappe data)
  if (error?.message && error?.message !== 'Rejected') {
    return extractAndClean(error.message) || error.message;
  }

  // Handle error object with error.message
  if (error?.error?.message) {
    return extractAndClean(error.error.message) || error.error.message;
  }

  // Handle direct exc_type check (for ValidationError cases)
  if (error?.exc_type) {
    const message = error.message || error.exception || String(error);
    return extractAndClean(message) || message;
  }

  return defaultMessage;
};

/**
 * Detect Frappe RPC failures embedded in a 200 response body.
 * @returns {string|null} User-facing error message, or null when the response looks successful.
 */
export function getFrappeResponseError(result, defaultMessage) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  if (result.exc_type || result.exc || result._server_messages) {
    return extractErrorMessage(result, defaultMessage);
  }

  return null;
}

/**
 * Shows an error toast notification
 * @param {any} error - Error object, Redux thunk result, or error response
 * @param {Object} options - Toast options
 * @param {string} options.defaultMessage - Default message if error cannot be extracted
 * @param {string} options.position - Toast position ('bottom-right' | 'top-right' | etc.)
 * @param {string} options.variant - Toast variant ('lighter' | 'filled' | 'stroke')
 */
export const showErrorToast = (error, options = {}) => {
  const {
    defaultMessage = 'An error occurred. Please try again.',
    position = TOAST_POSITION,
    variant = 'lighter',
  } = options;
  const errorMessage = extractErrorMessage(error, defaultMessage);
  toast.custom(
    (t) =>
      React.createElement(AlertToast.Root, {
        t,
        status: 'error',
        variant,
        message: errorMessage,
      }),
    {
      position,
    },
  );
};

/**
 * Shows a success toast notification
 * @param {string} message - Success message
 * @param {Object} options - Toast options
 * @param {string} options.position - Toast position ('bottom-right' | 'top-right' | etc.)
 * @param {string} options.variant - Toast variant ('lighter' | 'filled' | 'stroke')
 */
export const showSuccessToast = (message, options = {}) => {
  const { position = TOAST_POSITION, variant = 'lighter' } = options;

  toast.custom(
    (t) =>
      React.createElement(AlertToast.Root, {
        t,
        status: 'success',
        variant,
        message,
      }),
    {
      position,
    },
  );
};

/**
 * Shows an informational toast notification.
 * @param {string} message
 * @param {Object} [options]
 */
export const showInfoToast = (message, options = {}) => {
  const { position = TOAST_POSITION, variant = 'lighter' } = options;

  toast.custom(
    (t) =>
      React.createElement(AlertToast.Root, {
        t,
        status: 'information',
        variant,
        message,
      }),
    {
      position,
    },
  );
};
