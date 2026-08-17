/**
 * useBoardAttachments
 *
 * Generic hook for task and comment attachment state.
 *
 * Usage:
 *   const hook = useBoardAttachments('Task Item', taskId, {
 *     listFn: listBoardTaskAttachments,
 *     uploadFn: uploadBoardTaskAttachment,   // (id, file, { onProgress, signal })
 *     deleteFn: deleteBoardTaskAttachment,
 *   });
 *
 * Optimistic upload model
 * ─────────────────────────────────────────────────────────────────────────────
 * Files are added to `uploadQueue` immediately so the UI can show placeholders.
 * Each queue entry carries its own AbortController so uploads can be cancelled
 * individually.  On completion the entry is removed and the real record is
 * prepended to `attachments`.  On error the entry stays with status='error'
 * so the user can retry or dismiss it.
 *
 * State shape
 * ─────────────────────────────────────────────────────────────────────────────
 *   attachments   – normalised records from the server, ordered newest first
 *   uploadQueue   – [{ tempId, file, status, progress, error, controller }]
 *   isLoading     – true during the initial list fetch
 *   listError     – string | null – error from the list fetch
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @param {string}   referenceId   – task or comment ID
 * @param {object}   fns
 * @param {Function} fns.listFn    – (referenceId) => Promise<{ data, error }>
 * @param {Function} fns.uploadFn  – (referenceId, file, { onProgress, signal }) => Promise<{ data, error }>
 * @param {Function} fns.deleteFn  – (attachmentId) => Promise<{ data, error }>
 * @param {boolean}  [skip=false]  – when true, skip the initial fetch (e.g. no referenceId yet)
 */
export function useBoardAttachments(referenceId, { listFn, uploadFn, deleteFn }, skip = false) {
  const [attachments, setAttachments] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState(null);

  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // When the reference id changes (task/comment switch), reset state and
  // abort in-flight uploads so stale completion handlers can't mutate the
  // new reference's attachment list.
  useEffect(() => {
    generationRef.current += 1;
    setIsLoading(false);
    setListError(null);
    setAttachments([]);
    setUploadQueue((q) => {
      q.forEach((entry) => {
        try {
          entry.controller?.abort?.();
        } catch {
          // best-effort cancel
        }
      });
      return [];
    });
  }, [referenceId]);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!referenceId || !listFn) return;

    const generation = generationRef.current;
    setIsLoading(true);
    setListError(null);

    const result = await listFn(referenceId);

    if (!mountedRef.current) return;
    if (generationRef.current !== generation) return;

    setIsLoading(false);

    if (result.error) {
      setListError(result.error);
    } else {
      setAttachments(result.data ?? []);
    }
  }, [referenceId, listFn]);

  useEffect(() => {
    if (!skip) {
      load();
    }
  }, [load, skip]);

  // ── Upload ─────────────────────────────────────────────────────────────────

  /**
   * Start uploading one or more files.
   * Files are added to the uploadQueue immediately (optimistic).
   *
   * @param {File[]} files
   * @returns {Promise<void>}
   */
  const upload = useCallback(
    async (files) => {
      if (!referenceId || !uploadFn || !files?.length) return;

      const generation = generationRef.current;
      const entries = [...files].map((file) => ({
        tempId: crypto.randomUUID(),
        file,
        status: 'uploading',
        progress: 0,
        error: null,
        controller: new AbortController(),
      }));

      setUploadQueue((q) => [...entries, ...q]);

      await Promise.all(
        entries.map(async (entry) => {
          const { tempId, file, controller } = entry;

          const result = await uploadFn(referenceId, file, {
            onProgress: (pct) => {
              if (!mountedRef.current) return;
              if (generationRef.current !== generation) return;
              setUploadQueue((q) =>
                q.map((e) => (e.tempId === tempId ? { ...e, progress: pct } : e)),
              );
            },
            signal: controller.signal,
          });

          if (!mountedRef.current) return;
          if (generationRef.current !== generation) return;

          if (result.error) {
            setUploadQueue((q) =>
              q.map((e) =>
                e.tempId === tempId
                  ? { ...e, status: 'error', progress: 0, error: result.error }
                  : e,
              ),
            );
          } else {
            setUploadQueue((q) => q.filter((e) => e.tempId !== tempId));
            setAttachments((prev) => [result.data, ...prev]);
          }
        }),
      );
    },
    [referenceId, uploadFn],
  );

  // ── Cancel ────────────────────────────────────────────────────────────────

  const cancel = useCallback((tempId) => {
    setUploadQueue((q) => {
      const entry = q.find((e) => e.tempId === tempId);
      if (entry) {
        entry.controller.abort();
      }
      return q.filter((e) => e.tempId !== tempId);
    });
  }, []);

  // ── Retry ─────────────────────────────────────────────────────────────────

  const retry = useCallback(
    (tempId) => {
      const generation = generationRef.current;
      setUploadQueue((q) => {
        const entry = q.find((e) => e.tempId === tempId);
        if (!entry) return q;

        const newController = new AbortController();
        const updated = q.map((e) =>
          e.tempId === tempId
            ? { ...e, status: 'uploading', progress: 0, error: null, controller: newController }
            : e,
        );

        (async () => {
          const result = await uploadFn(referenceId, entry.file, {
            onProgress: (pct) => {
              if (!mountedRef.current) return;
              if (generationRef.current !== generation) return;
              setUploadQueue((prev) =>
                prev.map((e) => (e.tempId === tempId ? { ...e, progress: pct } : e)),
              );
            },
            signal: newController.signal,
          });

          if (!mountedRef.current) return;
          if (generationRef.current !== generation) return;

          if (result.error) {
            setUploadQueue((prev) =>
              prev.map((e) =>
                e.tempId === tempId
                  ? { ...e, status: 'error', progress: 0, error: result.error }
                  : e,
              ),
            );
          } else {
            setUploadQueue((prev) => prev.filter((e) => e.tempId !== tempId));
            setAttachments((prev) => [result.data, ...prev]);
          }
        })();

        return updated;
      });
    },
    [referenceId, uploadFn],
  );

  // ── Dismiss error entry ───────────────────────────────────────────────────

  const dismissError = useCallback((tempId) => {
    setUploadQueue((q) => q.filter((e) => e.tempId !== tempId));
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────

  const remove = useCallback(
    async (attachmentId) => {
      if (!deleteFn) return { error: 'Delete not configured.' };

      const result = await deleteFn(attachmentId);

      if (!mountedRef.current) return result;

      if (!result.error) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      }

      return result;
    },
    [deleteFn],
  );

  // ── Seed from external data (e.g. comments loaded from parent) ───────────

  const seed = useCallback((data) => {
    if (Array.isArray(data)) {
      setAttachments(data);
    }
  }, []);

  return {
    attachments,
    uploadQueue,
    isLoading,
    listError,
    load,
    upload,
    cancel,
    retry,
    dismissError,
    remove,
    seed,
  };
}
