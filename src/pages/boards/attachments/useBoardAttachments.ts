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

export type AttachmentPreviewType =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'text'
  | 'archive'
  | 'other';

export interface BoardAttachment {
  id: string;
  originalName: string;
  mimeType?: string;
  previewType: AttachmentPreviewType;
  size?: number | string | null;
  downloadUrl?: string;
}

export interface UploadEntry {
  tempId: string;
  file: File;
  status: 'uploading' | 'error';
  progress: number;
  error: string | null;
  controller: AbortController;
}

export interface AttachmentOperationResult<T> {
  data?: T;
  error?: string | null;
}

export interface BoardAttachmentFunctions {
  listFn: (referenceId: string) => Promise<AttachmentOperationResult<BoardAttachment[]>>;
  uploadFn: (
    referenceId: string,
    file: File,
    options: { onProgress: (percentage: number) => void; signal: AbortSignal },
  ) => Promise<AttachmentOperationResult<BoardAttachment>>;
  deleteFn: (attachmentId: string) => Promise<AttachmentOperationResult<undefined>>;
}

export interface BoardAttachmentsHook {
  attachments: BoardAttachment[];
  uploadQueue: UploadEntry[];
  isLoading: boolean;
  listError: string | null;
  load: () => Promise<void>;
  upload: (files: Iterable<File>) => Promise<void>;
  cancel: (tempId: string) => void;
  retry: (tempId: string) => void;
  dismissError: (tempId: string) => void;
  remove: (attachmentId: string) => Promise<AttachmentOperationResult<undefined>>;
  seed: (data: BoardAttachment[]) => void;
}

/**
 * @param {string}   referenceId   – task or comment ID
 * @param {object}   fns
 * @param {Function} fns.listFn    – (referenceId) => Promise<{ data, error }>
 * @param {Function} fns.uploadFn  – (referenceId, file, { onProgress, signal }) => Promise<{ data, error }>
 * @param {Function} fns.deleteFn  – (attachmentId) => Promise<{ data, error }>
 * @param {boolean}  [skip=false]  – when true, skip the initial fetch (e.g. no referenceId yet)
 */
export function useBoardAttachments(
  referenceId: string,
  { listFn, uploadFn, deleteFn }: BoardAttachmentFunctions,
  skip = false,
): BoardAttachmentsHook {
  const [attachments, setAttachments] = useState<BoardAttachment[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

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

    if (result.error != null) {
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
    async (files: Iterable<File>) => {
      const fileList = Array.from(files);
      if (!referenceId || fileList.length === 0) return;

      const generation = generationRef.current;
      const entries: UploadEntry[] = fileList.map((file) => ({
        tempId: crypto.randomUUID(),
        file,
        status: 'uploading' as const,
        progress: 0,
        error: null,
        controller: new AbortController(),
      }));

      setUploadQueue((q) => [...entries, ...q]);

      await Promise.all(
        entries.map(async (entry) => {
          const { tempId, file, controller } = entry;

          const result = await uploadFn(referenceId, file, {
            onProgress: (pct: number) => {
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

          const { data, error } = result;
          if (error != null) {
            setUploadQueue((q) =>
              q.map((e) =>
                e.tempId === tempId
                  ? { ...e, status: 'error', progress: 0, error }
                  : e,
              ),
            );
          } else if (data) {
            setUploadQueue((q) => q.filter((e) => e.tempId !== tempId));
            setAttachments((prev) => [data, ...prev]);
          }
        }),
      );
    },
    [referenceId, uploadFn],
  );

  // ── Cancel ────────────────────────────────────────────────────────────────

  const cancel = useCallback((tempId: string) => {
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
    (tempId: string) => {
      const generation = generationRef.current;
      setUploadQueue((q) => {
        const entry = q.find((e) => e.tempId === tempId);
        if (!entry) return q;

        const newController = new AbortController();
        const updated = q.map((e) =>
          e.tempId === tempId
            ? {
                ...e,
                status: 'uploading' as const,
                progress: 0,
                error: null,
                controller: newController,
              }
            : e,
        );

        (async () => {
          const result = await uploadFn(referenceId, entry.file, {
            onProgress: (pct: number) => {
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

          const { data, error } = result;
          if (error != null) {
            setUploadQueue((prev) =>
              prev.map((e) =>
                e.tempId === tempId
                  ? { ...e, status: 'error', progress: 0, error }
                  : e,
              ),
            );
          } else if (data) {
            setUploadQueue((prev) => prev.filter((e) => e.tempId !== tempId));
            setAttachments((prev) => [data, ...prev]);
          }
        })();

        return updated;
      });
    },
    [referenceId, uploadFn],
  );

  // ── Dismiss error entry ───────────────────────────────────────────────────

  const dismissError = useCallback((tempId: string) => {
    setUploadQueue((q) => q.filter((e) => e.tempId !== tempId));
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────

  const remove = useCallback(
    async (attachmentId: string) => {
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

  const seed = useCallback((data: BoardAttachment[]) => {
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
