import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createTaskView,
  deleteTaskView,
  duplicateTaskView,
  getListTaskViews,
  reorderTaskViews,
  toggleTaskViewFavorite,
  updateTaskView,
} from '@/services/task-view-service';
import { sortTaskViews } from '@/pages/boards/constants/task-view-constants';
import {
  buildTaskViewRecordPatch,
  persistTaskViewSettings,
  VIEW_SAVE_SCOPES,
} from '@/pages/boards/views/shared/view-settings';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

function resolveNextActiveViewId(views, removedViewId) {
  if (views.length === 0) {
    return null;
  }

  const defaultView = views.find((view) => view.isDefault);
  if (defaultView) {
    return defaultView.id;
  }

  const remaining = views.find((view) => view.id !== removedViewId);
  return remaining?.id ?? null;
}

export default function useListTaskViews(listId, preferredViewId = null) {
  const [views, setViews] = useState([]);
  const [viewsListId, setViewsListId] = useState(null);
  const [activeViewId, setActiveViewId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState(null);
  const preferredViewIdRef = useRef(preferredViewId);
  preferredViewIdRef.current = preferredViewId;

  const applyViews = useCallback((nextViews) => {
    const sortedViews = sortTaskViews(nextViews);
    setViews(sortedViews);
    return sortedViews;
  }, []);

  const loadViews = useCallback(async () => {
    if (!listId) {
      setViews([]);
      setViewsListId(null);
      setActiveViewId(null);
      setIsLoading(false);
      return;
    }

    // Prevent stale views from the previous list from remaining mounted while
    // the next list is loading (or fails).
    setViews([]);
    setViewsListId(null);
    setActiveViewId(null);
    setIsLoading(true);
    setError(null);

    const result = await getListTaskViews(listId);

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      setViews([]);
      setViewsListId(null);
      setActiveViewId(null);
      showErrorToast(result.error);
      return;
    }

    const nextViews = applyViews(result.data ?? []);
    setViewsListId(listId);
    setActiveViewId((currentId) => {
      const preferred = preferredViewIdRef.current;

      if (preferred && nextViews.some((view) => view.id === preferred)) {
        return preferred;
      }

      if (currentId && nextViews.some((view) => view.id === currentId)) {
        return currentId;
      }

      const defaultView = nextViews.find((view) => view.isDefault);
      return defaultView?.id ?? nextViews[0]?.id ?? null;
    });
  }, [applyViews, listId]);

  useEffect(() => {
    loadViews();
  }, [loadViews]);

  const handleCreateView = useCallback(
    async (viewType) => {
      if (!listId || !viewType) {
        return null;
      }

      setIsCreating(true);
      setError(null);

      const result = await createTaskView({
        listId,
        viewType,
      });

      setIsCreating(false);

      if (result.error) {
        setError(result.error);
        showErrorToast(result.error);
        return null;
      }

      const createdView = result.data;
      applyViews([...views, createdView]);
      setActiveViewId(createdView.id);
      showSuccessToast('View created.');
      return createdView;
    },
    [applyViews, listId, views],
  );

  const handleRenameView = useCallback(
    async (viewId, title) => {
      const trimmedTitle = String(title ?? '').trim();

      if (!viewId || !trimmedTitle) {
        showErrorToast('View name is required.');
        return null;
      }

      setIsMutating(true);
      const result = await updateTaskView(viewId, { title: trimmedTitle });
      setIsMutating(false);

      if (result.error) {
        showErrorToast(result.error);

        if (String(result.error).toLowerCase().includes('view not found')) {
          await loadViews();
        }

        return null;
      }

      const updatedView = result.data;
      applyViews(views.map((view) => (view.id === viewId ? updatedView : view)));
      showSuccessToast('View renamed.');
      return updatedView;
    },
    [applyViews, loadViews, views],
  );

  const handleTogglePinView = useCallback(
    async (viewId) => {
      if (!viewId) {
        return null;
      }

      setIsMutating(true);
      const result = await toggleTaskViewFavorite(viewId);
      setIsMutating(false);

      if (result.error) {
        showErrorToast(result.error);
        return null;
      }

      const updatedView = result.data;
      applyViews(views.map((view) => (view.id === viewId ? updatedView : view)));
      showSuccessToast(updatedView.favorite ? 'View pinned.' : 'View unpinned.');
      return updatedView;
    },
    [applyViews, views],
  );

  const handleDuplicateView = useCallback(
    async (viewId) => {
      if (!viewId) {
        return null;
      }

      setIsMutating(true);
      const result = await duplicateTaskView(viewId);
      setIsMutating(false);

      if (result.error) {
        showErrorToast(result.error);
        return null;
      }

      const duplicatedView = result.data;
      applyViews([...views, duplicatedView]);
      setActiveViewId(duplicatedView.id);
      showSuccessToast('View duplicated.');
      return duplicatedView;
    },
    [applyViews, views],
  );

  const saveViewAsNew = useCallback(
    async (viewId, settings = {}) => {
      if (!viewId) {
        return null;
      }

      setIsMutating(true);
      const duplicateResult = await duplicateTaskView(viewId);
      if (duplicateResult.error) {
        setIsMutating(false);
        showErrorToast(duplicateResult.error);
        return null;
      }

      const newView = duplicateResult.data;
      // New view tabs are shared list views — persist settings for everyone.
      const persistResult = await persistTaskViewSettings(newView.id, settings, {
        scope: VIEW_SAVE_SCOPES.ALL,
      });
      setIsMutating(false);

      if (persistResult.error) {
        const cleanup = await deleteTaskView(newView.id);
        if (cleanup?.error) {
          await loadViews();
        }
        showErrorToast(persistResult.error);
        return null;
      }

      const mergedView = {
        ...newView,
        ...buildTaskViewRecordPatch(settings),
        isPersonal: false,
      };
      applyViews([...views, mergedView]);
      setActiveViewId(newView.id);
      showSuccessToast('View saved as new.');
      return mergedView;
    },
    [applyViews, loadViews, views],
  );

  const handleDeleteView = useCallback(
    async (viewId) => {
      if (!viewId) {
        return false;
      }

      const targetView = views.find((view) => view.id === viewId);

      if (targetView?.isDefault) {
        showErrorToast('Default view cannot be deleted.');
        return false;
      }

      setIsMutating(true);
      const result = await deleteTaskView(viewId);
      setIsMutating(false);

      if (result.error) {
        showErrorToast(result.error);
        return false;
      }

      const nextViews = applyViews(views.filter((view) => view.id !== viewId));
      setActiveViewId((currentId) => {
        if (currentId !== viewId) {
          return currentId;
        }

        return resolveNextActiveViewId(nextViews, viewId);
      });
      showSuccessToast('View deleted.');
      return true;
    },
    [applyViews, views],
  );

  const handleReorderViews = useCallback(
    async (orderedViewIds) => {
      if (!listId || !orderedViewIds?.length) {
        return false;
      }

      const viewMap = new Map(views.map((view) => [view.id, view]));
      const reorderedViews = orderedViewIds
        .map((viewId, index) => {
          const view = viewMap.get(viewId);
          if (!view) {
            return null;
          }

          return {
            ...view,
            sortOrder: index,
          };
        })
        .filter(Boolean);

      if (reorderedViews.length !== views.length) {
        return false;
      }

      applyViews(reorderedViews);

      const result = await reorderTaskViews(listId, orderedViewIds);

      if (result.error) {
        showErrorToast(result.error);
        await loadViews();
        return false;
      }

      return true;
    },
    [applyViews, listId, loadViews, views],
  );

  const activeView = views.find((view) => view.id === activeViewId) ?? null;

  const patchViewSettings = useCallback((viewId, settings = {}, { isPersonal } = {}) => {
    if (!viewId) {
      return;
    }

    const patch = buildTaskViewRecordPatch(settings);
    setViews((previous) =>
      previous.map((view) =>
        view.id === viewId
          ? {
              ...view,
              ...patch,
              ...(typeof isPersonal === 'boolean' ? { isPersonal } : {}),
            }
          : view,
      ),
    );
  }, []);

  return {
    views,
    viewsListId,
    activeView,
    activeViewId,
    setActiveViewId,
    isLoading,
    isCreating,
    isMutating,
    error,
    reloadViews: loadViews,
    createView: handleCreateView,
    renameView: handleRenameView,
    togglePinView: handleTogglePinView,
    duplicateView: handleDuplicateView,
    deleteView: handleDeleteView,
    reorderViews: handleReorderViews,
    patchViewSettings,
    saveViewAsNew,
  };
}
