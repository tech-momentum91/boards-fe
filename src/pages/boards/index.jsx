import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Sidebar from './sidebar/Sidebar';
import BoardHeader from './layout/BoardHeader';
import BoardsGlobalSearchModal from './layout/BoardsGlobalSearchModal';
import BoardViewTabs from './layout/BoardViewTabs';
import BoardTaskView from './views/shared/BoardTaskView';
import BoardContentPlaceholder, {
  BoardListContentSkeleton,
} from './layout/BoardContentPlaceholder';
import useListTaskViews from './hooks/useListTaskViews';
import { TASK_VIEW_TYPES } from './constants/task-view-constants';
import {
  BOARDS_VIEW_QUERY_PARAM,
  buildBoardsNavigationPath,
  collectAncestorIds,
  resolveBoardsRoute,
  setBoardsViewIdInSearchParams,
  stripBoardsViewIdFromSearch,
} from './utils/boards-navigation';

export default function BoardsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { spaceId, folderId, listId } = useParams();
  const [sidebarTree, setSidebarTree] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [favoritesVersion, setFavoritesVersion] = useState(0);
  const [favoriteTaskPatch, setFavoriteTaskPatch] = useState(null);
  const [statusTemplateVersion, setStatusTemplateVersion] = useState(0);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  const selectedItem = useMemo(
    () => resolveBoardsRoute(sidebarTree, { spaceId, folderId, listId }),
    [sidebarTree, spaceId, folderId, listId],
  );

  const activeId = selectedItem?.id ?? listId ?? folderId ?? spaceId ?? null;
  const isListSelected = selectedItem?.type === 'list';
  const viewIdFromUrl = searchParams.get(BOARDS_VIEW_QUERY_PARAM);
  const hydratedViewListRef = useRef(null);
  const skipViewUrlSyncRef = useRef(false);

  const {
    views,
    viewsListId,
    activeView,
    activeViewId,
    setActiveViewId,
    isCreating: isCreatingView,
    isMutating: isMutatingView,
    isLoading: isLoadingViews,
    createView,
    renameView,
    togglePinView,
    duplicateView,
    deleteView,
    reorderViews,
    patchViewSettings,
    saveViewAsNew,
  } = useListTaskViews(isListSelected ? selectedItem?.id : null, viewIdFromUrl);

  const viewsReady = viewsListId === selectedItem?.id;
  const displayActiveView = viewsReady ? activeView : null;

  const taskViewLayoutMode = useMemo(() => {
    switch (displayActiveView?.viewType) {
      case TASK_VIEW_TYPES.TABLE:
        return 'table';
      case TASK_VIEW_TYPES.CALENDAR:
        return 'calendar';
      default:
        return 'list';
    }
  }, [displayActiveView?.viewType]);

  useEffect(() => {
    hydratedViewListRef.current = null;
  }, [listId]);

  useEffect(() => {
    if (!isListSelected || isLoadingViews || views.length === 0) {
      return;
    }

    if (hydratedViewListRef.current === selectedItem?.id) {
      return;
    }

    hydratedViewListRef.current = selectedItem?.id;

    if (viewIdFromUrl && views.some((view) => view.id === viewIdFromUrl)) {
      if (activeViewId !== viewIdFromUrl) {
        skipViewUrlSyncRef.current = true;
        setActiveViewId(viewIdFromUrl);
      }
      return;
    }

    if (activeViewId) {
      setSearchParams((previous) => setBoardsViewIdInSearchParams(previous, activeViewId), {
        replace: true,
      });
    }
  }, [
    activeViewId,
    isListSelected,
    isLoadingViews,
    selectedItem?.id,
    setActiveViewId,
    setSearchParams,
    viewIdFromUrl,
    views,
  ]);

  useEffect(() => {
    if (!isListSelected || isLoadingViews || views.length === 0) {
      return;
    }

    if (hydratedViewListRef.current !== selectedItem?.id) {
      return;
    }

    if (!viewIdFromUrl || !views.some((view) => view.id === viewIdFromUrl)) {
      return;
    }

    setActiveViewId((currentId) => {
      if (currentId === viewIdFromUrl) {
        return currentId;
      }

      skipViewUrlSyncRef.current = true;
      return viewIdFromUrl;
    });
  }, [isListSelected, isLoadingViews, selectedItem?.id, setActiveViewId, viewIdFromUrl, views]);

  useEffect(() => {
    if (!isListSelected || !activeViewId || isLoadingViews) {
      return;
    }

    if (hydratedViewListRef.current !== selectedItem?.id) {
      return;
    }

    if (skipViewUrlSyncRef.current) {
      skipViewUrlSyncRef.current = false;
      return;
    }

    if (viewIdFromUrl === activeViewId) {
      return;
    }

    setSearchParams((previous) => setBoardsViewIdInSearchParams(previous, activeViewId), {
      replace: false,
    });
  }, [
    activeViewId,
    isListSelected,
    isLoadingViews,
    selectedItem?.id,
    setSearchParams,
    viewIdFromUrl,
  ]);

  const handleViewChange = useCallback(
    (viewId) => {
      setActiveViewId(viewId);
      setSearchParams((previous) => setBoardsViewIdInSearchParams(previous, viewId), {
        replace: false,
      });
    },
    [setActiveViewId, setSearchParams],
  );

  useEffect(() => {
    if (sidebarTree.length === 0 || !selectedItem?.id) {
      return;
    }

    const ancestors = collectAncestorIds(sidebarTree, selectedItem.id) ?? [];
    setExpandedIds((previous) => {
      const next = new Set(previous);
      ancestors.forEach((id) => next.add(id));
      next.add(selectedItem.id);

      const nextIds = [...next];
      if (
        nextIds.length === previous.length &&
        nextIds.every((id, index) => id === previous[index])
      ) {
        return previous;
      }

      return nextIds;
    });
  }, [selectedItem?.id, sidebarTree]);

  useEffect(() => {
    if (sidebarTree.length === 0 || !listId) {
      return;
    }

    const list = resolveBoardsRoute(sidebarTree, { spaceId, folderId, listId });

    if (!list) {
      navigate('/boards/no-access', { replace: true });
      return;
    }

    const canonicalPath = buildBoardsNavigationPath(list);

    if (location.pathname !== canonicalPath) {
      navigate(`${canonicalPath}${location.search}`, { replace: true });
    }
  }, [folderId, listId, location.pathname, location.search, navigate, sidebarTree, spaceId]);

  const handleSelectItem = useCallback(
    (item) => {
      const path = buildBoardsNavigationPath(item);

      if (item?.type === 'list') {
        navigate(`${path}${stripBoardsViewIdFromSearch(location.search)}`);
        return;
      }

      navigate(path);
    },
    [location.search, navigate],
  );

  const handleTreeLoaded = useCallback((items) => {
    setSidebarTree(items);
  }, []);

  const handleExpandedIdsChange = useCallback((ids) => {
    setExpandedIds(ids);
  }, []);

  const handleFavoriteTasksChange = useCallback((patch) => {
    if (patch?.taskId) {
      setFavoriteTaskPatch({ ...patch, nonce: Date.now() });
      return;
    }

    setFavoritesVersion((version) => version + 1);
  }, []);

  const openGlobalSearch = useCallback(() => {
    setIsGlobalSearchOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isSearchShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !event.shiftKey;
      if (!isSearchShortcut) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setIsGlobalSearchOpen((current) => !current);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  const handleAddView = useCallback(
    async (viewType) => {
      await createView(viewType);
    },
    [createView],
  );

  const handleViewSettingsPersisted = useCallback(
    (viewId, settings, options) => {
      patchViewSettings(viewId, settings, options);
    },
    [patchViewSettings],
  );

  const handleSaveViewAsNew = useCallback(
    async (viewId, settings) => {
      await saveViewAsNew(viewId, settings);
    },
    [saveViewAsNew],
  );

  const listViewContent = isListSelected ? (
    viewsReady && displayActiveView ? (
      <BoardTaskView
        key={selectedItem.id}
        list={selectedItem}
        taskView={displayActiveView}
        layoutMode={taskViewLayoutMode}
        sidebarTree={sidebarTree}
        onFavoriteTasksChange={handleFavoriteTasksChange}
        onViewSettingsPersisted={handleViewSettingsPersisted}
        onSaveViewAsNew={handleSaveViewAsNew}
        statusTemplateVersion={statusTemplateVersion}
      />
    ) : isLoadingViews ? (
      <BoardListContentSkeleton />
    ) : (
      <BoardContentPlaceholder item={selectedItem} />
    )
  ) : (
    <BoardContentPlaceholder item={selectedItem} />
  );

  return (
    <div className='flex h-dvh min-w-0 overflow-hidden'>
      <div className='flex h-full min-w-0 flex-1'>
        <Sidebar
          activeId={activeId}
          expandedIds={expandedIds}
          onExpandedIdsChange={handleExpandedIdsChange}
          onSelectItem={handleSelectItem}
          onTreeLoaded={handleTreeLoaded}
          favoritesVersion={favoritesVersion}
          favoriteTaskPatch={favoriteTaskPatch}
          onStatusTemplateChanged={() => setStatusTemplateVersion((version) => version + 1)}
        />

        <div className='flex min-w-0 flex-1 flex-col bg-bg-white-0'>
          <BoardHeader selectedItem={selectedItem} onOpenSearch={openGlobalSearch} />

          <BoardsGlobalSearchModal
            open={isGlobalSearchOpen}
            onOpenChange={setIsGlobalSearchOpen}
            sidebarTree={sidebarTree}
          />

          {isListSelected ? (
            <BoardViewTabs
              views={views}
              activeViewId={activeViewId}
              onViewChange={handleViewChange}
              onAddView={handleAddView}
              onRenameView={renameView}
              onTogglePinView={togglePinView}
              onDuplicateView={duplicateView}
              onDeleteView={deleteView}
              onReorderViews={reorderViews}
              isCreatingView={isCreatingView}
              isMutatingView={isMutatingView}
              isLoadingViews={isLoadingViews && !viewsReady}
              showAddView
            />
          ) : null}

          {listViewContent}
        </div>
      </div>
    </div>
  );
}
