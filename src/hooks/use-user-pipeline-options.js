import { useCallback, useEffect, useRef, useState } from 'react';
import { getCrmLeadOptions } from '@/api/crmLeads';
import { normalizePipelineOptions } from '@/components/users-management/user-pipelines-utils';
import { showErrorToast } from '@/utils/error-utils';

/**
 * Load CRM pipeline options while a user modal is open.
 * Guards against late resolves after close / newer open; exposes error + retry.
 */
export function useUserPipelineOptions(isOpen) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setOptions([]);
    setLoading(false);
    setError(null);
  }, []);

  const fetchOptions = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    getCrmLeadOptions()
      .then((opts) => {
        if (requestId !== requestIdRef.current) return;
        setOptions(normalizePipelineOptions(opts?.pipelines));
        setError(null);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        setOptions([]);
        setError(err || new Error('Failed to load pipelines'));
        showErrorToast(err, {
          defaultMessage: 'Failed to load pipelines. Please try again.',
        });
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
      return undefined;
    }
    fetchOptions();
    return () => {
      requestIdRef.current += 1;
    };
  }, [isOpen, fetchOptions, reset]);

  return {
    options,
    loading,
    error,
    hasError: Boolean(error),
    retry: fetchOptions,
    reset,
  };
}
