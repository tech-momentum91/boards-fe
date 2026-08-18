import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiPushpin2Fill } from 'react-icons/ri';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { cn } from '@/utils/cn';
import { TASK_VIEW_TYPE_META } from '../constants/task-view-constants';
import AddViewMenu from './AddViewMenu';
import ViewOptionsMenu from './ViewOptionsMenu';

function SortableViewTab({ view, active, onSelect, onOpenMenu }) {
  const titleRef = useRef(null);
  const meta = TASK_VIEW_TYPE_META[view.viewType];
  const Icon = meta?.icon;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: view.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleTitleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (active) {
      onOpenMenu?.(view, titleRef);
      return;
    }

    onSelect?.(view.id);
  };

  const handleTabClick = (event) => {
    if (event.target.closest('[data-view-title]')) {
      return;
    }

    if (!active) {
      onSelect?.(view.id);
    }
  };

  const handleContextMenu = (event) => {
    if (active) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onOpenMenu?.(view, titleRef);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role='tab'
      tabIndex={0}
      aria-selected={active}
      onClick={handleTabClick}
      onContextMenu={handleContextMenu}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!active) {
            onSelect?.(view.id);
          }
        }
      }}
      className={cn(
        'relative flex h-full cursor-grab items-center gap-1.5 active:cursor-grabbing',
        active ? 'text-text-main-900' : 'text-text-sub-500 hover:text-text-main-900',
        isDragging && 'z-10 opacity-60',
      )}
      {...attributes}
      {...listeners}
    >
      {Icon ? (
        <Icon size={18} className={cn(active ? 'text-primary-base' : 'text-icon-soft-400')} />
      ) : null}

      <span
        ref={titleRef}
        data-view-title
        role={active ? 'button' : undefined}
        tabIndex={active ? 0 : -1}
        onClick={handleTitleClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleTitleClick(event);
          }
        }}
        className={cn('text-sm font-medium leading-5', active && 'cursor-pointer')}
      >
        {view.title}
      </span>

      {view.favorite ? <RiPushpin2Fill size={14} className='shrink-0 text-primary-base' /> : null}

      {active ? <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary-base' /> : null}
    </div>
  );
}

export default function BoardViewTabs({
  views = [],
  activeViewId,
  onViewChange,
  onAddView,
  onRenameView,
  onTogglePinView,
  onDuplicateView,
  onDeleteView,
  onReorderViews,
  isCreatingView = false,
  isMutatingView = false,
  isLoadingViews = false,
  showAddView = false,
}) {
  const addButtonRef = useRef(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState(null);
  const [menuAnchorRef, setMenuAnchorRef] = useState(null);
  const [viewToDelete, setViewToDelete] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const viewIds = useMemo(() => views.map((view) => view.id), [views]);

  const handleAddViewClick = () => {
    setIsAddMenuOpen((open) => !open);
  };

  const handleSelectViewType = async (viewType) => {
    await onAddView?.(viewType);
  };

  const handleOpenMenu = useCallback(
    (view, anchorRef) => {
      if (menuView?.id === view.id) {
        setMenuView(null);
        setMenuAnchorRef(null);
        return;
      }

      setMenuView(view);
      setMenuAnchorRef(anchorRef);
    },
    [menuView?.id],
  );

  const handleCloseMenu = useCallback(() => {
    setMenuView(null);
    setMenuAnchorRef(null);
  }, []);

  const handleDragEnd = useCallback(
    async ({ active, over }) => {
      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = viewIds.indexOf(active.id);
      const newIndex = viewIds.indexOf(over.id);

      if (oldIndex < 0 || newIndex < 0) {
        return;
      }

      const nextOrder = arrayMove(viewIds, oldIndex, newIndex);
      await onReorderViews?.(nextOrder);
    },
    [onReorderViews, viewIds],
  );

  const handleTogglePin = useCallback(async () => {
    if (!menuView?.id) {
      return;
    }

    await onTogglePinView?.(menuView.id);
  }, [menuView?.id, onTogglePinView]);

  const handleDuplicate = useCallback(async () => {
    if (!menuView?.id) {
      return;
    }

    await onDuplicateView?.(menuView.id);
  }, [menuView?.id, onDuplicateView]);

  const handleDeleteRequest = useCallback(() => {
    if (!menuView) {
      return;
    }

    setViewToDelete(menuView);
  }, [menuView]);

  const handleConfirmDelete = useCallback(async () => {
    if (!viewToDelete?.id) {
      return;
    }

    const deleted = await onDeleteView?.(viewToDelete.id);

    if (deleted) {
      setViewToDelete(null);
    }
  }, [onDeleteView, viewToDelete]);

  if (isLoadingViews) {
    return (
      <div className='flex h-10 shrink-0 items-center gap-4 border-b border-stroke-soft-200 bg-bg-white-0 px-6'>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className='h-4 w-16 animate-pulse rounded bg-bg-weak-50' />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className='flex h-10 shrink-0 items-center gap-4 border-b border-stroke-soft-200 bg-bg-white-0 px-6'>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={viewIds} strategy={horizontalListSortingStrategy}>
            <div className='flex h-full min-w-0 items-center gap-4 overflow-x-auto'>
              {views.map((view) => (
                <SortableViewTab
                  key={view.id}
                  view={view}
                  active={activeViewId === view.id}
                  onSelect={onViewChange}
                  onOpenMenu={handleOpenMenu}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {showAddView ? (
          <div className='relative flex h-full shrink-0 items-center'>
            <button
              ref={addButtonRef}
              type='button'
              onClick={handleAddViewClick}
              disabled={isCreatingView}
              aria-label='Add view'
              className={cn(
                'flex size-7 items-center justify-center rounded-lg text-icon-sub-500 transition-colors',
                isCreatingView
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:bg-bg-weak-100 hover:text-text-main-900',
              )}
            >
              <RiAddLine size={18} />
            </button>

            {isAddMenuOpen ? (
              <AddViewMenu
                anchorRef={addButtonRef}
                onClose={() => setIsAddMenuOpen(false)}
                onSelectViewType={handleSelectViewType}
                isCreating={isCreatingView}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {menuView && menuAnchorRef ? (
        <ViewOptionsMenu
          anchorRef={menuAnchorRef}
          view={menuView}
          onClose={handleCloseMenu}
          onRename={onRenameView}
          onTogglePin={handleTogglePin}
          onDuplicate={handleDuplicate}
          onDelete={handleDeleteRequest}
          isMutating={isMutatingView}
        />
      ) : null}

      <DeleteConfirmModal
        isOpen={Boolean(viewToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setViewToDelete(null);
          }
        }}
        title='Delete view?'
        description={`Are you sure you want to delete "${viewToDelete?.title ?? 'this view'}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        isLoading={isMutatingView}
        confirmLabel='Delete view'
        loadingLabel='Deleting...'
      />
    </>
  );
}
