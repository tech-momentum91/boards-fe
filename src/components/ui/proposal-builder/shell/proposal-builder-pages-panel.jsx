import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RiDraggable } from 'react-icons/ri';

import * as Checkbox from '@/components/ui/checkbox';
import { flattenPagePlan } from '@/components/ui/proposal-builder/deck/proposal-page-plan';
import { PROPOSAL_TEMPLATE_PAGES } from '@/components/ui/proposal-builder/proposal-template/proposal-content';
import { sortPagesByOrder } from '@/components/ui/proposal-builder/deck/proposal-page-order';
import { cn } from '@/utils/cn';

const PAGE_DRAG_MIME = 'application/x-devx-proposal-page-id';
const GROUP_DRAG_MIME = 'application/x-devx-proposal-page-group';

const readDragPayload = (event, mime) => {
  try {
    return event.dataTransfer.getData(mime) || '';
  } catch {
    return '';
  }
};

const readGroupPayload = (event) => {
  const raw = readDragPayload(event, GROUP_DRAG_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const extractGroupLabel = (label, fallback) => {
  const raw = String(label || '').trim();
  if (!raw) return fallback;
  const parts = raw
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return raw;
  return parts.slice(1).join(' - ');
};

/**
 * Proposal pages visibility + reorder (flat list, same row UI as legacy section items).
 */
const ProposalBuilderPagesPanel = ({
  selectedCount,
  totalPages,
  pagesState,
  pageOrder,
  pagePlan,
  onTogglePage,
  onToggleAllPages,
  onTogglePageInstance,
  onReorderCity,
  onReorderCenter,
  onReorderPages,
  readOnly,
  sidebarDragPageRef,
  activePageId,
  onSelectPage,
}) => {
  const [dragOverPageId, setDragOverPageId] = useState(null);
  const [dragOverGroupId, setDragOverGroupId] = useState(null);
  const groupDragRef = useRef(null);
  const orderedPages = sortPagesByOrder(PROPOSAL_TEMPLATE_PAGES, pageOrder);
  const flatInstances = useMemo(() => (pagePlan ? flattenPagePlan(pagePlan) : []), [pagePlan]);
  const allSelected = pagePlan
    ? flatInstances.length > 0 && flatInstances.every((instance) => instance.enabled)
    : orderedPages.every((page) => pagesState[page.id]);
  const someSelected = pagePlan
    ? flatInstances.some((instance) => instance.enabled)
    : orderedPages.some((page) => pagesState[page.id]);
  const pageDraggable = !readOnly && orderedPages.length > 1 && !pagePlan;

  const clearDragState = useCallback(() => {
    sidebarDragPageRef.current = null;
    setDragOverPageId(null);
    groupDragRef.current = null;
    setDragOverGroupId(null);
  }, [sidebarDragPageRef]);

  const handlePageDragStart = useCallback(
    (event, pageId) => {
      event.stopPropagation();
      sidebarDragPageRef.current = pageId;
      event.dataTransfer.setData(PAGE_DRAG_MIME, String(pageId));
      event.dataTransfer.setData('text/plain', String(pageId));
      event.dataTransfer.effectAllowed = 'move';
    },
    [sidebarDragPageRef],
  );

  const handlePageDragOver = useCallback(
    (event, pageId) => {
      const draggedId = Number(
        sidebarDragPageRef.current || readDragPayload(event, PAGE_DRAG_MIME),
      );
      if (!draggedId || draggedId === pageId) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      setDragOverPageId(pageId);
    },
    [sidebarDragPageRef],
  );

  const handlePageDrop = useCallback(
    (event, pageId) => {
      event.preventDefault();
      event.stopPropagation();
      const draggedId = Number(
        sidebarDragPageRef.current ||
          readDragPayload(event, PAGE_DRAG_MIME) ||
          readDragPayload(event, 'text/plain'),
      );
      if (draggedId && draggedId !== pageId) {
        onReorderPages(draggedId, pageId);
      }
      clearDragState();
    },
    [clearDragState, onReorderPages, sidebarDragPageRef],
  );

  const handleGroupDragStart = useCallback((event, payload) => {
    event.stopPropagation();
    groupDragRef.current = payload;
    event.dataTransfer.setData(GROUP_DRAG_MIME, JSON.stringify(payload));
    event.dataTransfer.setData('text/plain', payload.id);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleGroupDragOver = useCallback((event, target) => {
    const dragged = groupDragRef.current || readGroupPayload(event);
    if (!dragged || dragged.type !== target.type) return;
    if (dragged.id === target.id) return;
    if (dragged.type === 'center' && dragged.cityId !== target.cityId) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setDragOverGroupId(target.id);
  }, []);

  const handleGroupDrop = useCallback(
    (event, target) => {
      event.preventDefault();
      event.stopPropagation();
      const dragged =
        groupDragRef.current || readGroupPayload(event) || readDragPayload(event, 'text/plain');
      if (!dragged || typeof dragged === 'string' || dragged.id === target.id) {
        clearDragState();
        return;
      }
      if (dragged.type === 'city') {
        onReorderCity?.(dragged.id, target.id);
        clearDragState();
        return;
      }
      if (dragged.type === 'center' && dragged.cityId === target.cityId) {
        onReorderCenter?.(target.cityId, dragged.id, target.id);
      }
      clearDragState();
    },
    [clearDragState, onReorderCenter, onReorderCity],
  );

  const renderPageRow = ({
    id,
    label,
    enabled,
    draggable,
    dragPayload,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragOver,
    isActive,
    onToggle,
    onSelect,
    indentClass,
    hideCheckbox,
    labelClassName,
  }) => {
    return (
      <div
        key={id}
        className={cn(
          'flex items-center gap-1.5 p-1.5',
          indentClass,
          isActive && 'bg-bg-weak-50',
          isDragOver && 'bg-primary-lighter/20 ring-1 ring-inset ring-primary-base',
        )}
        onDragOver={onDragOver}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          if (dragOverPageId === id) setDragOverPageId(null);
          if (dragOverGroupId === id) setDragOverGroupId(null);
        }}
        onDrop={onDrop}
      >
        {draggable ? (
          <button
            type='button'
            className='inline-flex shrink-0 cursor-grab items-center p-0.5 text-icon-soft-400 active:cursor-grabbing'
            draggable
            aria-label={`Drag to reorder ${label}`}
            onDragStart={(event) => {
              if (dragPayload?.type) {
                handleGroupDragStart(event, dragPayload);
              } else {
                handlePageDragStart(event, id);
              }
            }}
            onDragEnd={onDragEnd || clearDragState}
          >
            <RiDraggable className='size-3.5' />
          </button>
        ) : (
          <span className='inline-block w-4 shrink-0' aria-hidden />
        )}
        {hideCheckbox ? (
          <span className='inline-block w-4 shrink-0' aria-hidden />
        ) : (
          <Checkbox.Root
            size='small'
            checked={Boolean(enabled)}
            disabled={readOnly}
            onCheckedChange={onToggle}
            aria-label={label}
          />
        )}
        <button
          type='button'
          className={cn(
            'min-w-0 flex-1 truncate text-left text-label-xs font-medium',
            enabled === false ? 'text-text-sub-500' : 'text-text-main-900',
            labelClassName,
          )}
          onClick={onSelect}
        >
          {label}
        </button>
      </div>
    );
  };

  return (
    <div className='proposal-builder-pages-panel'>
      <div className='mb-3 flex items-center justify-between'>
        <p className='text-subheading-2xs uppercase tracking-wider text-text-soft-400'>
          Proposal Pages
        </p>
        <span className='text-subheading-2xs text-text-soft-400'>
          {selectedCount}/{totalPages}
        </span>
      </div>

      <div className='overflow-hidden rounded-10 border border-stroke-soft-200 bg-bg-white-0 shadow-regular-x-small'>
        <div className='flex items-center gap-1.5 border-b border-stroke-soft-200 bg-bg-weak-100 px-1.5 py-1'>
          <Checkbox.Root
            size='small'
            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
            disabled={readOnly}
            onCheckedChange={onToggleAllPages}
            aria-label='Toggle all pages'
          />
          <span className='text-label-xs font-semibold text-text-main-900'>All pages</span>
        </div>

        <div className='divide-y divide-stroke-soft-200/50'>
          {pagePlan
            ? [
                ...(pagePlan.prefix ?? []),
                ...(pagePlan.cities ?? []).flatMap((city) => [
                  city.page,
                  {
                    type: 'center-group',
                    cityId: city.id,
                    centers: city.centers ?? [],
                  },
                ]),
                ...(pagePlan.suffix ?? []),
              ].map((item) => {
                if (!item) return null;
                if (item.type === 'center-group') {
                  const { centers, cityId } = item;
                  return centers.map((center) => {
                    const centerLabel = extractGroupLabel(center.pages?.[0]?.label, center.id);
                    const centerDraggable = !readOnly && centers.length > 1;
                    const centerDragPayload = {
                      type: 'center',
                      id: center.id,
                      cityId,
                    };
                    return (
                      <div key={center.id}>
                        {renderPageRow({
                          id: center.id,
                          label: centerLabel ? `Center - ${centerLabel}` : center.id,
                          enabled: true,
                          draggable: centerDraggable,
                          dragPayload: centerDragPayload,
                          onDragOver: (event) => {
                            if (centerDraggable) handleGroupDragOver(event, centerDragPayload);
                          },
                          onDrop: (event) => handleGroupDrop(event, centerDragPayload),
                          onDragEnd: clearDragState,
                          isDragOver: dragOverGroupId === center.id,
                          hideCheckbox: true,
                          indentClass: 'pl-4',
                          labelClassName:
                            'text-text-soft-400 font-semibold uppercase tracking-wide',
                        })}
                        {(center.pages ?? []).map((page) =>
                          renderPageRow({
                            id: page.id,
                            label: page.label,
                            enabled: page.enabled,
                            draggable: false,
                            isActive: activePageId === page.id,
                            onToggle: () => onTogglePageInstance?.(page.id),
                            onSelect: () => {
                              if (!page.enabled) return;
                              onSelectPage?.(page.id);
                            },
                            indentClass: 'pl-8',
                          }),
                        )}
                      </div>
                    );
                  });
                }

                const isCityPage = Boolean(item.id?.startsWith('city:'));
                const cityDraggable = isCityPage && !readOnly && (pagePlan.cities ?? []).length > 1;
                const dragPayload = isCityPage ? { type: 'city', id: item.id } : null;

                return renderPageRow({
                  id: item.id,
                  label: item.label,
                  enabled: item.enabled,
                  draggable: Boolean(dragPayload) && cityDraggable,
                  dragPayload,
                  onDragOver: (event) => {
                    if (cityDraggable) handleGroupDragOver(event, dragPayload);
                  },
                  onDrop: (event) => {
                    if (cityDraggable) handleGroupDrop(event, dragPayload);
                  },
                  onDragEnd: clearDragState,
                  isDragOver: dragOverGroupId === item.id,
                  isActive: activePageId === item.id,
                  onToggle: () => onTogglePageInstance?.(item.id),
                  onSelect: () => {
                    if (!item.enabled) return;
                    onSelectPage?.(item.id);
                  },
                });
              })
            : orderedPages.map((page) => {
                const enabled = Boolean(pagesState[page.id]);
                const isDragOver = dragOverPageId === page.id;

                return renderPageRow({
                  id: page.id,
                  label: page.label,
                  enabled,
                  draggable: pageDraggable,
                  onDragOver: (event) => {
                    if (pageDraggable) handlePageDragOver(event, page.id);
                  },
                  onDrop: (event) => handlePageDrop(event, page.id),
                  onDragEnd: clearDragState,
                  isDragOver,
                  isActive: activePageId === page.id,
                  onToggle: () => onTogglePage(page.id),
                  onSelect: () => {
                    if (!enabled) return;
                    onSelectPage?.(page.id);
                  },
                });
              })}
        </div>
      </div>
    </div>
  );
};

export default ProposalBuilderPagesPanel;
