import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCommentsInitialLoading } from '@/hooks/use-comments-initial-loading';

/**
 * Shared wiring for a CrmComment-backed comment + activity timeline.
 *
 * Encapsulates the fetch-on-mount, add, and refetch pattern that is otherwise
 * duplicated across task / layout comment components. Callers provide the
 * Redux selector plus small builders that map ids/inputs to their specific
 * thunk arguments, keeping doctype-specific differences at the call site.
 *
 * @param {object} params
 * @param {string} params.entityId               Resolved id used for fetch/gating.
 * @param {(state: any) => any} params.selector   Redux selector for the comment slice.
 * @param {(id: string) => any} params.buildFetchArg  Maps an id to the fetch thunk arg.
 * @param {Function} params.fetchAction           Thunk action creator for fetching.
 * @param {(payload: object) => any} params.buildAddArg  Maps add input to the add thunk arg.
 * @param {Function} params.addAction             Thunk action creator for adding.
 * @param {Function} [params.clearAction]         Optional action dispatched on unmount.
 * @param {(id: string) => Promise<void> | void} [params.onAfterAdd]  Extra work after add succeeds.
 * @param {boolean|undefined} [params.controlledLoading]  Override the derived loading flag.
 */
export function useEntityComments({
  entityId,
  selector,
  buildFetchArg,
  fetchAction,
  buildAddArg,
  addAction,
  clearAction,
  onAfterAdd,
  controlledLoading,
}) {
  const dispatch = useDispatch();
  const commentState = useSelector(selector);

  const resolvedId = String(entityId ?? '').trim();
  const isLoading = commentState?.isLoading ?? false;
  const data = commentState?.data ?? {};

  const commentsData = useMemo(
    () => ({
      comments: data.comments ?? [],
      history: data.history ?? [],
    }),
    [data.comments, data.history],
  );

  const initialLoading = useCommentsInitialLoading({
    enabled: controlledLoading === undefined && Boolean(resolvedId),
    entityId: resolvedId,
    isLoading,
    hasData: Boolean(commentState?.data),
  });
  const loading = controlledLoading === undefined ? initialLoading : controlledLoading;

  useEffect(() => {
    if (resolvedId) {
      dispatch(fetchAction(buildFetchArg(resolvedId)));
    }
    // fetchAction / buildFetchArg are stable action-creator references.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, resolvedId]);

  useEffect(() => {
    if (!clearAction) return undefined;
    return () => {
      dispatch(clearAction());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const addComment = useCallback(
    async (id, content, attachments, visibleToClient, parentCommentId) => {
      const targetId = String(id ?? resolvedId ?? '').trim();
      if (!targetId) return;

      await dispatch(
        addAction(
          buildAddArg({ id: targetId, content, attachments, visibleToClient, parentCommentId }),
        ),
      ).unwrap();
      await dispatch(fetchAction(buildFetchArg(targetId))).unwrap();
      await onAfterAdd?.(targetId);
    },
    // action-creator refs are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, resolvedId, onAfterAdd],
  );

  const refetchComments = useCallback(() => {
    if (!resolvedId) return undefined;
    return dispatch(fetchAction(buildFetchArg(resolvedId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, resolvedId]);

  return { resolvedId, commentsData, loading, addComment, refetchComments };
}
