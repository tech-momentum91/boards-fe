import { useRef, useCallback, useEffect } from 'react';

/**
 * Returns a debounced version of the callback that delays execution until after
 * `delay` milliseconds have elapsed since the last call.
 * @param {Function} callback - The callback to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced callback
 */
export function useDebouncedCallback(callback, delay) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  callbackRef.current = callback;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  );
}
