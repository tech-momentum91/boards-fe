import React from 'react';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiDraggable,
  RiDownloadLine,
  RiLockLine,
  RiPriceTag3Line,
} from 'react-icons/ri';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import * as Switch from '@/components/ui/switch';
import { cn } from '@/utils/cn';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import * as CompactButton from '@/components/ui/compact-button';
import { STATUS_CONFIG_PICKER_HEXES } from '@/constants/STATUS_CONSTANTS';
import {
  normalizeStatusConfigurationStorageColor,
  pickerSwatchToStorageHex,
  storageColorToPickerSwatch,
} from '@/components/ui/status-color-pill';
import {
  ACTIVE_SOURCE,
  STATUS_SOURCE_MODE,
  discoverDefaultStatuses,
  getStatusConfiguration,
  normalizeActiveSource,
  normalizeConfigurationStatuses,
  normalizeDefaultStatuses,
  prepareStatusesForSave,
  resolveSourceModeFromActiveSource,
  sanitizeStatusRowId,
  saveStatusConfiguration,
} from '@/api/dynamic-status';
import {
  STATUS_LIFECYCLE_CATEGORIES,
  getDefaultColorForStatusCategory,
  normalizeStatusLifecycleCategory,
} from '@/components/customize-status/status-lifecycle-constants';
import ImportStatusesModal from '@/components/customize-status/import-statuses-modal';
import ImportStatusMappingModal from '@/components/customize-status/import-status-mapping-modal';
import StatusSourceSelector from '@/components/customize-status/status-source-selector';
import CustomDefaultStatusesPanel from '@/components/customize-status/custom-default-statuses-panel';
import StatusFieldTabsPanel from '@/components/customize-status/status-field-tabs-panel';
import {
  getSourceModuleOptions,
  resolveSourceField,
} from '@/components/customize-status/status-import-flow';
import { useStatusSourceImport } from '@/components/customize-status/use-status-source-import';
import { useCustomStatusSave } from '@/components/customize-status/use-custom-status-save';
import { useStatusModules } from '@/hooks/use-status-modules';

const DEFAULT_STATUS_CATEGORY = 'Active';
const CATEGORY_DROPPABLE_PREFIX = 'category:';

function normalizeStatusCategory(category) {
  return normalizeStatusLifecycleCategory(category, { fallback: DEFAULT_STATUS_CATEGORY });
}

/** Inactive defaults stay in draft/DB for backend use but are hidden in Custom/import UI. */
function isHiddenBackendDefault(status) {
  return Boolean(status?.isDefault) && !status?.enabled && !status?.isNew && !status?.userAdded;
}

/** Statuses the Status Master list should render for the current editor mode. */
function getVisibleEditorStatuses(statuses = [], { syncDefaultCatalog = false } = {}) {
  const rows = Array.isArray(statuses) ? statuses : [];
  if (syncDefaultCatalog) {
    // Default section: only default / newly added catalog rows.
    return rows.filter((s) => s.isDefault || s.userAdded || s.isNew);
  }
  // Imported / Custom-other: hide backend-only inactive defaults.
  return rows.filter((s) => !isHiddenBackendDefault(s));
}

/** Merge a visible-list update back into the full draft (preserves hidden defaults). */
function mergeVisibleIntoDraft(
  previousDraft = [],
  nextVisible = [],
  { syncDefaultCatalog = false } = {},
) {
  if (syncDefaultCatalog) {
    return nextVisible;
  }
  const hiddenDefaults = (previousDraft || []).filter((s) => isHiddenBackendDefault(s));
  return [...nextVisible, ...hiddenDefaults];
}

function withNormalizedCategories(statuses = []) {
  return (Array.isArray(statuses) ? statuses : []).map((status) => ({
    ...status,
    category: normalizeStatusCategory(status?.category),
  }));
}

function groupStatusesByCategory(statuses = []) {
  const groups = Object.fromEntries(STATUS_LIFECYCLE_CATEGORIES.map((category) => [category, []]));
  withNormalizedCategories(statuses).forEach((status) => {
    groups[status.category].push(status);
  });
  return groups;
}

function flattenCategoryGroups(groups) {
  return STATUS_LIFECYCLE_CATEGORIES.flatMap((category) =>
    (groups[category] || []).map((status) => ({ ...status, category })),
  );
}

function categoryDroppableId(category) {
  return `${CATEGORY_DROPPABLE_PREFIX}${category}`;
}

function parseCategoryDroppableId(id) {
  const raw = String(id || '');
  if (!raw.startsWith(CATEGORY_DROPPABLE_PREFIX)) return null;
  return normalizeStatusCategory(raw.slice(CATEGORY_DROPPABLE_PREFIX.length));
}

function findCategoryForId(id, statuses = []) {
  const fromDroppable = parseCategoryDroppableId(id);
  if (fromDroppable) return fromDroppable;
  const status = statuses.find((row) => row.id === id);
  return status ? normalizeStatusCategory(status.category) : null;
}

function moveStatusToCategory(statuses, activeId, overId) {
  const activeItem = statuses.find((row) => row.id === activeId);
  if (!activeItem) return statuses;

  const sourceCategory = normalizeStatusCategory(activeItem.category);
  const targetCategory = findCategoryForId(overId, statuses);
  if (!targetCategory) return statuses;

  const withoutActive = statuses.filter((row) => row.id !== activeId);
  const groups = groupStatusesByCategory(withoutActive);
  const targetList = [...(groups[targetCategory] || [])];
  const moved = { ...activeItem, category: targetCategory };

  if (parseCategoryDroppableId(overId)) {
    targetList.push(moved);
  } else {
    const overIndex = targetList.findIndex((row) => row.id === overId);
    if (overIndex >= 0) targetList.splice(overIndex, 0, moved);
    else targetList.push(moved);
  }

  groups[targetCategory] = targetList;

  // No-op if nothing changed (same category + same index).
  if (sourceCategory === targetCategory) {
    const previousGroups = groupStatusesByCategory(statuses);
    const before = (previousGroups[sourceCategory] || []).map((row) => row.id).join('|');
    const after = targetList.map((row) => row.id).join('|');
    if (before === after) return statuses;
  }

  return flattenCategoryGroups(groups);
}

function StatusColorPicker({ value, onChange, disabled = false }) {
  const [open, setOpen] = React.useState(false);
  const displaySwatch = storageColorToPickerSwatch(value);

  if (disabled) {
    return (
      <span
        className='grid size-5 shrink-0 place-items-center rounded-md bg-bg-weak-50 ring-1 ring-inset ring-stroke-soft-200'
        aria-hidden
      >
        <span className='size-2.5 rounded-sm' style={{ backgroundColor: displaySwatch }} />
      </span>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          className='grid size-5 shrink-0 place-items-center rounded-md bg-bg-weak-50 ring-1 ring-inset ring-stroke-soft-200'
          aria-label='Change status color'
          onClick={(e) => e.stopPropagation()}
        >
          <span className='size-2.5 rounded-sm' style={{ backgroundColor: displaySwatch }} />
        </button>
      </Popover.Trigger>
      <Popover.Content
        className='p-2'
        align='start'
        side='bottom'
        sideOffset={8}
        showArrow
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className='flex items-center gap-2'>
          {STATUS_CONFIG_PICKER_HEXES.map((c) => (
            <button
              key={c}
              type='button'
              onClick={() => {
                onChange?.(pickerSwatchToStorageHex(c));
                setOpen(false);
              }}
              className={cn(
                'size-4 rounded-full ring-2 ring-transparent',
                c === displaySwatch && 'ring-text-strong-950',
              )}
              style={{ backgroundColor: c }}
              aria-label={`Set color ${c}`}
            />
          ))}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

function SortableStatusItem({ status, disabled = false, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
    disabled,
    data: { type: 'status', category: normalizeStatusCategory(status.category) },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Hide the source row while DragOverlay is shown — prevents sibling rows from
    // visually "jumping" into other category sections mid-drag.
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'pointer-events-none')}>
      {children({ attributes, listeners })}
    </div>
  );
}

function StatusRow({
  status,
  onToggle,
  onDelete,
  onColorChange,
  dragHandleProps,
  isEditing,
  editValue,
  onEditStart,
  onEditChange,
  onEditCommit,
  readOnly = false,
  isDefault = false,
  lockDefaultLifecycle = false,
}) {
  const nameLocked = readOnly;
  const colorLocked = readOnly;
  const lifecycleLocked = Boolean(lockDefaultLifecycle && isDefault);
  const showLifecycleControls = !readOnly && !lifecycleLocked;

  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-lg border shadow-sm border-stroke-soft-200 py-3 pl-[3px] pr-2',
        !status.enabled && 'bg-bg-weak-100 opacity-60',
        readOnly && 'bg-bg-weak-50',
      )}
    >
      <div
        className={cn(
          'shrink-0 text-text-soft-400',
          readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        )}
        aria-hidden
        {...(readOnly ? {} : dragHandleProps)}
      >
        {readOnly ? (
          <RiLockLine className='size-5 text-text-soft-400' />
        ) : (
          <RiDraggable className='size-5' />
        )}
      </div>
      <div className='flex min-w-0 flex-1 items-center gap-2'>
        <StatusColorPicker value={status.color} onChange={onColorChange} disabled={colorLocked} />
        {isEditing && !nameLocked ? (
          <input
            type='text'
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={() => onEditCommit?.()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditCommit?.();
              if (e.key === 'Escape') onEditCommit?.(true);
            }}
            className='min-w-0 flex-1 bg-transparent text-paragraph-xs text-text-strong-950 outline-none'
            autoFocus
          />
        ) : (
          <button
            type='button'
            className={cn(
              'min-w-0 flex-1 truncate text-left label-small',
              nameLocked ? 'cursor-default text-text-strong-950' : 'text-text-strong-950',
              !status.enabled && 'text-text-soft-400',
            )}
            onClick={nameLocked ? undefined : onEditStart}
            disabled={nameLocked}
          >
            {status.label}
          </button>
        )}
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        {showLifecycleControls ? (
          <>
            <Switch.Root checked={status.enabled} onCheckedChange={onToggle} />
            {!isDefault ? (
              <CompactButton.Root
                type='button'
                variant='neutral'
                mode='ghost'
                size='xxsmall'
                onClick={onDelete}
                className='inline-flex opacity-0 transition-opacity group-hover:opacity-100'
              >
                <CompactButton.Icon as={RiDeleteBinLine} className='size-4 text-text-sub-600' />
              </CompactButton.Root>
            ) : null}
          </>
        ) : readOnly || lifecycleLocked ? (
          <span className='label-xs text-text-soft-400 pr-1'>
            {lifecycleLocked ? 'Required' : 'Default'}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function NewStatusRow({
  status,
  inputRef,
  onLabelChange,
  onBlurCommit,
  onDelete,
  onColorChange,
  onEnterCommit,
  dragHandleProps,
}) {
  return (
    <div className='flex items-center gap-3 rounded-xl border-2 border-text-strong-950 bg-bg-white-0 px-3 py-2'>
      <div
        className='shrink-0 cursor-grab text-text-soft-400 active:cursor-grabbing'
        {...dragHandleProps}
      >
        <RiDraggable className='size-4' />
      </div>
      <StatusColorPicker value={status.color} onChange={onColorChange} />
      <input
        ref={inputRef}
        type='text'
        value={status.label}
        onChange={(e) => onLabelChange(e.target.value)}
        onBlur={onBlurCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            // Draft-only: finalize the row name; persist happens on Save.
            (onEnterCommit || onBlurCommit)?.();
          }
        }}
        placeholder='Enter status name'
        className='min-w-0 flex-1 bg-transparent text-paragraph-sm outline-none placeholder:text-text-soft-400'
      />
      <CompactButton.Root
        type='button'
        variant='neutral'
        mode='ghost'
        size='xxsmall'
        onClick={onDelete}
      >
        <CompactButton.Icon as={RiDeleteBinLine} className='text-text-sub-600' />
      </CompactButton.Root>
    </div>
  );
}

function CategorySection({ category, children, isOver = false }) {
  const { setNodeRef } = useDroppable({
    id: categoryDroppableId(category),
    data: { type: 'category', category },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col gap-2 rounded-xl p-1 transition-colors',
        isOver && 'bg-bg-weak-50 ring-1 ring-inset ring-stroke-soft-200',
      )}
    >
      <p className='label-small text-text-strong-950 px-1'>{category}</p>
      {children}
    </div>
  );
}

export function StatusFieldEditor({
  doctype,
  field,
  context,
  fieldLabel,
  layout = 'default',
  sectionLabel,
  hideSectionHeader = false,
  showImport = true,
  compact = false,
  showFooter = true,
  /** When provided (Status Master page load), hydrate from this and skip a second fetch. */
  initialConfig = null,
  syncDefaultCatalog = false,
  lockDefaultLifecycle = false,
  onSaved,
  onRegisterSave,
  onRegisterDefaultStatuses,
}) {
  const isStatusMasterLayout = layout === 'status-master';
  const protectDefaultLifecycle = Boolean(lockDefaultLifecycle);
  const scope = React.useMemo(
    () => ({ doctype, field, context: (context || '').trim() || undefined }),
    [context, doctype, field],
  );
  const [configName, setConfigName] = React.useState(null);
  const [statuses, setStatuses] = React.useState([]);
  const [draftStatuses, setDraftStatuses] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [importOpen, setImportOpen] = React.useState(false);
  const newStatusInputRef = React.useRef(null);
  const onRegisterDefaultStatusesRef = React.useRef(onRegisterDefaultStatuses);

  React.useEffect(() => {
    onRegisterDefaultStatusesRef.current = onRegisterDefaultStatuses;
  }, [onRegisterDefaultStatuses]);

  const loadGenerationRef = React.useRef(0);

  const applyConfigMessage = React.useCallback(
    (message) => {
      const nextConfigName = message?.config_name ?? null;
      const normalized = withNormalizedCategories(
        normalizeConfigurationStatuses(message?.statuses),
      );
      const defaultNormalized = withNormalizedCategories(
        normalizeDefaultStatuses(message?.default_statuses ?? []),
      );

      setConfigName(nextConfigName);
      setStatuses(normalized);
      setDraftStatuses(
        syncDefaultCatalog
          ? normalized.filter((s) => s.isDefault || s.userAdded || s.isNew)
          : normalized,
      );
      onRegisterDefaultStatusesRef.current?.(defaultNormalized, { isLoading: false });
      setEditingId(null);
      setEditingValue('');
      return { normalized, defaultNormalized, nextConfigName };
    },
    [syncDefaultCatalog],
  );

  const fetchConfig = React.useCallback(async () => {
    const generation = ++loadGenerationRef.current;
    setIsLoading(true);
    onRegisterDefaultStatusesRef.current?.([], { isLoading: true });
    try {
      const message = await getStatusConfiguration(scope);
      if (generation !== loadGenerationRef.current) return;

      let { normalized } = applyConfigMessage(message);

      if (normalized.length === 0) {
        const discovered = await discoverDefaultStatuses(scope);
        if (generation !== loadGenerationRef.current) return;
        const labels = discovered.labels || [];
        if (labels.length > 0) {
          normalized = labels.map((label, index) => ({
            id: `default_${index}`,
            label,
            color: normalizeStatusConfigurationStorageColor(
              getDefaultColorForStatusCategory(DEFAULT_STATUS_CATEGORY),
            ),
            category: DEFAULT_STATUS_CATEGORY,
            enabled: true,
            isDefault: true,
            order: index + 1,
          }));
          setStatuses(normalized);
          setDraftStatuses(
            syncDefaultCatalog
              ? normalized.filter((s) => s.isDefault || s.userAdded || s.isNew)
              : normalized,
          );
        }
      }
    } catch (error) {
      if (generation !== loadGenerationRef.current) return;
      showErrorToast(error, { defaultMessage: 'Unable to load statuses.' });
      onRegisterDefaultStatusesRef.current?.([], { isLoading: false });
    } finally {
      if (generation === loadGenerationRef.current) setIsLoading(false);
    }
  }, [applyConfigMessage, scope, syncDefaultCatalog]);

  React.useEffect(() => {
    if (initialConfig) {
      applyConfigMessage(initialConfig);
      setIsLoading(false);
      return undefined;
    }

    fetchConfig();
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [applyConfigMessage, fetchConfig, initialConfig]);

  const handleDeleteStatus = React.useCallback((status) => {
    if (!status) return;
    // Default / catalog rows are never deleted (used or unused) — disable instead.
    if (status.isDefault && !status.userAdded) {
      showErrorToast('Default statuses cannot be deleted. Disable them instead.');
      return;
    }
    const label = (status.label || '').trim();
    if (!label && !status.isNew) return;

    // Draft-only until Save — usage / persistence checked in save_status_configuration.
    setDraftStatuses((prev) => prev.filter((s) => s.id !== status.id));
    if (!status.isNew) {
      showSuccessToast('Removed from draft. Click Save to apply.');
    }
  }, []);

  const commitRename = React.useCallback(
    (cancel = false) => {
      const id = editingId;
      if (!id) return;
      const current = draftStatuses.find((s) => s.id === id);
      if (!current) {
        setEditingId(null);
        setEditingValue('');
        return;
      }

      const oldLabel = (current.label || '').trim();
      const nextLabel = (editingValue || '').trim();
      setEditingId(null);
      setEditingValue('');

      if (cancel || !nextLabel || nextLabel === oldLabel) return;

      const dup = draftStatuses.some(
        (s) =>
          s.id !== id &&
          String(s.label || '')
            .trim()
            .toLowerCase() === nextLabel.toLowerCase(),
      );
      if (dup) {
        showErrorToast(`Duplicate status: ${nextLabel}`);
        return;
      }

      setDraftStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, label: nextLabel } : s)));
    },
    [draftStatuses, editingId, editingValue],
  );

  const handleAddStatus = React.useCallback(
    (category = DEFAULT_STATUS_CATEGORY) => {
      const nextCategory = normalizeStatusCategory(category);
      const nextId = `custom_${Date.now()}`;
      setDraftStatuses((prev) => {
        const groups = groupStatusesByCategory(prev);
        groups[nextCategory] = [
          ...(groups[nextCategory] || []),
          {
            id: nextId,
            label: '',
            color: normalizeStatusConfigurationStorageColor(
              getDefaultColorForStatusCategory(nextCategory),
            ),
            category: nextCategory,
            enabled: true,
            // Default section additions join the default catalog; import-mode additions do not.
            isDefault: Boolean(syncDefaultCatalog),
            userAdded: !syncDefaultCatalog,
            isNew: true,
          },
        ];
        return flattenCategoryGroups(groups);
      });
      requestAnimationFrame(() => newStatusInputRef.current?.focus());
    },
    [syncDefaultCatalog],
  );

  const commitNewStatusIfNamed = React.useCallback((id) => {
    setDraftStatuses((prev) =>
      prev.map((s) => {
        if (s.id !== id || !s.isNew) return s;
        const trimmed = (s.label || '').trim();
        if (!trimmed) return s;
        return { ...s, label: trimmed, isNew: false };
      }),
    );
  }, []);

  const handleSave = React.useCallback(async () => {
    // Default section saves only default rows (omitted non-defaults stay in DB).
    // Custom section saves the full draft, including hidden inactive defaults.
    const saveDraft = syncDefaultCatalog
      ? getVisibleEditorStatuses(draftStatuses, { syncDefaultCatalog: true })
      : draftStatuses;
    const orderedDraft = flattenCategoryGroups(groupStatusesByCategory(saveDraft));
    const hadEmptyNewRows = orderedDraft.some((s) => s.isNew && !(s.label || '').trim());
    const preparedDraft = prepareStatusesForSave(orderedDraft);

    if (hadEmptyNewRows) {
      // preparedDraft is already the full save candidate (Custom includes hidden defaults).
      setDraftStatuses(preparedDraft);
    }

    if (preparedDraft.length === 0) {
      showErrorToast('Enter a status name before saving.');
      return;
    }

    setIsSaving(true);
    try {
      // Renames remap records inside save_status_configuration when row ids match.
      const payload = preparedDraft.map((s, index) => ({
        id: sanitizeStatusRowId(s.id),
        label: (s.label || '').trim(),
        color: normalizeStatusConfigurationStorageColor(s.color),
        category: normalizeStatusCategory(s.category),
        enabled: protectDefaultLifecycle && s.isDefault && !s.userAdded ? true : Boolean(s.enabled),
        isDefault: s.userAdded ? false : Boolean(s.isDefault),
        order: index + 1,
      }));

      const message = await saveStatusConfiguration({
        ...scope,
        configName,
        statuses: payload,
        syncDefaultCatalog,
        activeSource: syncDefaultCatalog ? ACTIVE_SOURCE.DEFAULT : ACTIVE_SOURCE.CUSTOM,
      });

      const saved = withNormalizedCategories(normalizeConfigurationStatuses(message.statuses));
      setConfigName(message.config_name ?? configName);
      setStatuses(saved);
      setDraftStatuses(
        syncDefaultCatalog ? saved.filter((s) => s.isDefault || s.userAdded || s.isNew) : saved,
      );
      showSuccessToast('Statuses updated');
      onSaved?.();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Unable to save statuses.' });
      // Roll draft back to last successful server state so optimistic removes don't stick.
      setDraftStatuses(
        syncDefaultCatalog
          ? statuses.filter((s) => s.isDefault || s.userAdded || s.isNew)
          : statuses,
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    configName,
    draftStatuses,
    onSaved,
    protectDefaultLifecycle,
    scope,
    statuses,
    syncDefaultCatalog,
  ]);

  React.useEffect(() => {
    onRegisterSave?.(handleSave);
    return () => onRegisterSave?.(null);
  }, [handleSave, onRegisterSave]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [activeDropCategory, setActiveDropCategory] = React.useState(null);
  const [activeDragId, setActiveDragId] = React.useState(null);

  const activeDragStatus = React.useMemo(
    () => draftStatuses.find((status) => status.id === activeDragId) || null,
    [activeDragId, draftStatuses],
  );

  const handleDragStart = React.useCallback(({ active }) => {
    setActiveDragId(active.id);
  }, []);

  const handleDragOver = React.useCallback(
    ({ active, over }) => {
      if (!over) {
        setActiveDropCategory(null);
        return;
      }

      const overCategoryFromData = over.data?.current?.category;
      const overCategory =
        parseCategoryDroppableId(over.id) ||
        (STATUS_LIFECYCLE_CATEGORIES.includes(overCategoryFromData) ? overCategoryFromData : null);
      if (overCategory) setActiveDropCategory(overCategory);

      setDraftStatuses((prev) => {
        const visible = getVisibleEditorStatuses(prev, { syncDefaultCatalog });
        const activeCategory = findCategoryForId(active.id, visible);
        const resolvedOver = findCategoryForId(over.id, visible);
        if (!activeCategory || !resolvedOver || activeCategory === resolvedOver) {
          return prev;
        }

        // Move into the target category while dragging so each SortableContext
        // only contains its own items (avoids rows visually leaving their section).
        return mergeVisibleIntoDraft(prev, moveStatusToCategory(visible, active.id, over.id), {
          syncDefaultCatalog,
        });
      });
    },
    [syncDefaultCatalog],
  );

  const handleDragEnd = React.useCallback(
    ({ active, over }) => {
      setActiveDragId(null);
      setActiveDropCategory(null);
      if (!over) return;

      setDraftStatuses((prev) => {
        const visible = getVisibleEditorStatuses(prev, { syncDefaultCatalog });
        const activeCategory = findCategoryForId(active.id, visible);
        const overCategory = findCategoryForId(over.id, visible);
        if (!activeCategory || !overCategory) return prev;

        if (activeCategory !== overCategory) {
          return mergeVisibleIntoDraft(prev, moveStatusToCategory(visible, active.id, over.id), {
            syncDefaultCatalog,
          });
        }

        const groups = groupStatusesByCategory(visible);
        const list = [...(groups[activeCategory] || [])];
        const oldIndex = list.findIndex((row) => row.id === active.id);
        const newIndex = parseCategoryDroppableId(over.id)
          ? list.length - 1
          : list.findIndex((row) => row.id === over.id);

        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev;
        groups[activeCategory] = arrayMove(list, oldIndex, newIndex);
        return mergeVisibleIntoDraft(prev, flattenCategoryGroups(groups), {
          syncDefaultCatalog,
        });
      });
    },
    [syncDefaultCatalog],
  );

  const handleDragCancel = React.useCallback(() => {
    setActiveDragId(null);
    setActiveDropCategory(null);
  }, []);

  const visibleDraftStatuses = React.useMemo(
    () => getVisibleEditorStatuses(draftStatuses, { syncDefaultCatalog }),
    [draftStatuses, syncDefaultCatalog],
  );

  const statusesByCategory = React.useMemo(
    () => groupStatusesByCategory(visibleDraftStatuses),
    [visibleDraftStatuses],
  );

  const renderRow = (status, focusNewInput) => {
    const rowReadOnly = isStatusMasterLayout
      ? false
      : !syncDefaultCatalog && Boolean(status.isDefault);
    const lifecycleLocked =
      protectDefaultLifecycle && Boolean(status.isDefault) && !status.userAdded;

    return (
      <SortableStatusItem key={status.id} status={status} disabled={rowReadOnly}>
        {({ attributes, listeners }) =>
          status.isNew ? (
            <NewStatusRow
              status={status}
              dragHandleProps={{ ...attributes, ...listeners }}
              inputRef={focusNewInput ? newStatusInputRef : undefined}
              onColorChange={(color) =>
                setDraftStatuses((prev) =>
                  prev.map((s) => (s.id === status.id ? { ...s, color } : s)),
                )
              }
              onLabelChange={(value) =>
                setDraftStatuses((prev) =>
                  prev.map((s) => (s.id === status.id ? { ...s, label: value } : s)),
                )
              }
              onBlurCommit={() => commitNewStatusIfNamed(status.id)}
              onEnterCommit={() => commitNewStatusIfNamed(status.id)}
              onDelete={() => setDraftStatuses((prev) => prev.filter((s) => s.id !== status.id))}
            />
          ) : (
            <StatusRow
              status={status}
              readOnly={rowReadOnly}
              isDefault={Boolean(status.isDefault) && !status.userAdded}
              lockDefaultLifecycle={protectDefaultLifecycle}
              dragHandleProps={{ ...attributes, ...listeners }}
              isEditing={editingId === status.id}
              editValue={editingId === status.id ? editingValue : ''}
              onEditStart={() => {
                setEditingId(status.id);
                setEditingValue(status.label || '');
              }}
              onEditChange={setEditingValue}
              onEditCommit={commitRename}
              onColorChange={(color) =>
                setDraftStatuses((prev) =>
                  prev.map((s) => (s.id === status.id ? { ...s, color } : s)),
                )
              }
              onToggle={(enabled) => {
                if (lifecycleLocked) return;
                setDraftStatuses((prev) =>
                  prev.map((s) => (s.id === status.id ? { ...s, enabled } : s)),
                );
              }}
              onDelete={() => handleDeleteStatus(status)}
            />
          )
        }
      </SortableStatusItem>
    );
  };

  const listHeader = sectionLabel || (isStatusMasterLayout ? 'STATUS' : fieldLabel || field);

  const statusListContent = (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className='flex flex-col gap-5'>
        {STATUS_LIFECYCLE_CATEGORIES.map((category) => {
          const rows = statusesByCategory[category] || [];
          const newestInCategory = [...rows].reverse().find((s) => s.isNew);
          return (
            <CategorySection
              key={category}
              category={category}
              isOver={activeDropCategory === category}
            >
              <SortableContext items={rows.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className='flex flex-col gap-2 min-h-[8px]'>
                  {rows.map((status) =>
                    renderRow(
                      status,
                      Boolean(newestInCategory && newestInCategory.id === status.id),
                    ),
                  )}
                </div>
              </SortableContext>

              <button
                type='button'
                onClick={() => handleAddStatus(category)}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stroke-soft-200 py-2',
                  'text-label-xs text-text-sub-600 transition-colors hover:bg-bg-weak-50 hover:text-text-strong-950',
                )}
              >
                <RiAddLine className='size-5' />
                Add Status
              </button>
            </CategorySection>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragStatus ? (
          <div className='cursor-grabbing shadow-regular-md rounded-xl bg-bg-white-0'>
            <StatusRow
              status={activeDragStatus}
              readOnly={false}
              isDefault={Boolean(activeDragStatus.isDefault) && !activeDragStatus.userAdded}
              lockDefaultLifecycle={protectDefaultLifecycle}
              dragHandleProps={{}}
              isEditing={false}
              editValue=''
              onEditStart={() => {}}
              onEditChange={() => {}}
              onEditCommit={() => {}}
              onColorChange={() => {}}
              onToggle={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );

  if (isStatusMasterLayout) {
    return (
      <div className='flex flex-col gap-3 min-w-0'>
        {!hideSectionHeader ? (
          <p className='label-xs uppercase tracking-wide text-text-sub-600'>{listHeader}</p>
        ) : null}

        {isLoading ? (
          <div className='py-6 text-center text-paragraph-sm text-text-sub-600'>Loading…</div>
        ) : (
          statusListContent
        )}

        {showImport ? (
          <ImportStatusesModal
            open={importOpen}
            onOpenChange={setImportOpen}
            targetDoctype={doctype}
            targetField={field}
            targetContext={context}
            targetFieldLabel={fieldLabel || field}
            onImported={fetchConfig}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        compact ? '' : 'rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-4',
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h3 className='label-medium text-text-strong-950'>{fieldLabel || field}</h3>
          <p className='text-paragraph-xs text-text-sub-600 mt-0.5'>
            {doctype} · {field}
          </p>
        </div>
        {showImport ? (
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => setImportOpen(true)}
          >
            <Button.Icon as={RiDownloadLine} />
            Import
          </Button.Root>
        ) : null}
      </div>

      {isLoading ? (
        <div className='py-6 text-center text-paragraph-sm text-text-sub-600'>Loading…</div>
      ) : (
        statusListContent
      )}

      {showFooter ? (
        <div className='flex justify-end gap-2 pt-2 border-t border-stroke-soft-200'>
          <Button.Root
            type='button'
            variant='primary'
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button.Root>
        </div>
      ) : null}

      {showImport ? (
        <ImportStatusesModal
          open={importOpen}
          onOpenChange={setImportOpen}
          targetDoctype={doctype}
          targetField={field}
          targetContext={context}
          targetFieldLabel={fieldLabel || field}
          onImported={fetchConfig}
        />
      ) : null}
    </div>
  );
}

function InactiveSourceNotice({ title, description }) {
  return (
    <div className='py-10 px-4 text-center'>
      <p className='label-small text-text-strong-950'>{title}</p>
      <p className='text-paragraph-sm text-text-sub-600 mt-1 max-w-md mx-auto'>{description}</p>
    </div>
  );
}

export default function StatusConfigurationEditor({
  mode = 'modal',
  open = false,
  onOpenChange,
  doctype = 'Space',
  field = 'status',
  context,
  fieldLabel,
  showImport = true,
  lockDefaultLifecycle,
  onSaved,
}) {
  const protectDefaultLifecycle = lockDefaultLifecycle ?? !showImport;
  const saveHandlerRef = React.useRef(null);
  const { modules } = useStatusModules({ enabled: mode === 'modal' && open });
  const [sourceMode, setSourceMode] = React.useState(STATUS_SOURCE_MODE.DEFAULT);
  const [activeSource, setActiveSource] = React.useState(ACTIVE_SOURCE.DEFAULT);
  const [sourceModuleId, setSourceModuleId] = React.useState('');
  const [sourceField, setSourceField] = React.useState('');
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [draftCatalogStatuses, setDraftCatalogStatuses] = React.useState([]);
  const [configLoading, setConfigLoading] = React.useState(false);
  const [activeStatusesLoading, setActiveStatusesLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [importPickerOpen, setImportPickerOpen] = React.useState(false);

  const modalFieldSpec = React.useMemo(
    () => ({ field, label: fieldLabel || field, context }),
    [context, field, fieldLabel],
  );

  const handleConfigSaved = React.useCallback(() => {
    setRefreshKey((value) => value + 1);
    onSaved?.();
    if (mode === 'modal') onOpenChange?.(false);
  }, [mode, onOpenChange, onSaved]);

  const handleApplied = React.useCallback(() => {
    setRefreshKey((value) => value + 1);
    onSaved?.();
    if (mode === 'modal') onOpenChange?.(false);
  }, [mode, onOpenChange, onSaved]);

  const reloadActiveSourceAfterImport = React.useCallback(async () => {
    try {
      const message = await getStatusConfiguration({ doctype, field, context });
      const nextActiveSource = normalizeActiveSource(message.active_source);
      setActiveSource(nextActiveSource);
      setSourceMode(resolveSourceModeFromActiveSource(nextActiveSource));
      const defaults =
        Array.isArray(message.default_statuses) && message.default_statuses.length > 0
          ? message.default_statuses
          : (message.statuses ?? []).filter((s) => s.is_default || s.isDefault);
      setDraftCatalogStatuses(normalizeDefaultStatuses(defaults));
    } catch {
      // Keep current UI; refreshKey remount still reloads the active list.
    }
    setRefreshKey((value) => value + 1);
  }, [context, doctype, field]);

  const handleImported = React.useCallback(() => {
    setImportPickerOpen(false);
    reloadActiveSourceAfterImport();
  }, [reloadActiveSourceAfterImport]);

  const {
    mappingOpen,
    setMappingOpen,
    analysis,
    isImporting,
    runDirectImport,
    handleMappingConfirm,
    resetImportState,
  } = useStatusSourceImport({
    targetDoctype: doctype,
    targetField: field,
    targetContext: context,
    onImported: handleImported,
  });

  const {
    customMappingOpen,
    setCustomMappingOpen,
    customAnalysis,
    isApplying,
    runCustomSave,
    handleCustomMappingConfirm,
    resetCustomSaveState,
  } = useCustomStatusSave({
    doctype,
    field,
    context,
    onApplied: handleApplied,
  });

  const registerActiveStatusesLoading = React.useCallback((_defaults, meta = {}) => {
    setActiveStatusesLoading(Boolean(meta.isLoading));
  }, []);

  const handleSaved = React.useCallback(() => {
    onSaved?.();
    if (mode === 'modal') onOpenChange?.(false);
  }, [mode, onOpenChange, onSaved]);

  React.useEffect(() => {
    if (mode !== 'modal' || !open) return;

    let cancelled = false;
    setConfigLoading(true);

    (async () => {
      try {
        const message = await getStatusConfiguration({ doctype, field, context });
        if (cancelled) return;

        const nextActiveSource = normalizeActiveSource(message.active_source);

        setActiveSource(nextActiveSource);
        const defaults =
          Array.isArray(message.default_statuses) && message.default_statuses.length > 0
            ? message.default_statuses
            : (message.statuses ?? []).filter((s) => s.is_default || s.isDefault);
        setDraftCatalogStatuses(normalizeDefaultStatuses(defaults));
        setSourceMode(resolveSourceModeFromActiveSource(nextActiveSource));
      } catch {
        if (!cancelled) setDraftCatalogStatuses([]);
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [context, doctype, field, mode, open, refreshKey]);

  React.useEffect(() => {
    if (open) return;
    setSourceMode(STATUS_SOURCE_MODE.DEFAULT);
    setActiveSource(ACTIVE_SOURCE.DEFAULT);
    setSourceModuleId('');
    setSourceField('');
    setImportPickerOpen(false);
    resetImportState();
    resetCustomSaveState();
    setDraftCatalogStatuses([]);
    setConfigLoading(false);
    setActiveStatusesLoading(false);
    setIsSaving(false);
  }, [open, resetCustomSaveState, resetImportState]);

  const sourceModuleOptions = React.useMemo(
    () =>
      getSourceModuleOptions(modules, {
        excludeScope: { doctype, field, context },
      }),
    [context, doctype, field, modules],
  );

  const selectedSourceModule = React.useMemo(
    () => sourceModuleOptions.find((candidate) => candidate.id === sourceModuleId) ?? null,
    [sourceModuleId, sourceModuleOptions],
  );

  const sourceFieldOptions = selectedSourceModule?.fields || [];

  React.useEffect(() => {
    if (!selectedSourceModule) {
      setSourceField('');
      return;
    }
    const resolved = resolveSourceField(selectedSourceModule, sourceField);
    if (resolved !== sourceField) {
      setSourceField(resolved);
    }
  }, [selectedSourceModule, sourceField]);

  const openImportPicker = React.useCallback((nextModuleId, nextSourceField) => {
    if (!nextModuleId) return;
    setSourceModuleId(nextModuleId);
    if (nextSourceField) setSourceField(nextSourceField);
    setImportPickerOpen(true);
  }, []);

  const startSourceImport = React.useCallback(
    (source, preferredFieldKey) => {
      if (!source) return;
      const resolvedSourceField = resolveSourceField(source, preferredFieldKey);
      setSourceField(resolvedSourceField);

      // Multi-column modules need the picker (field + status selection).
      // Single-column modules can import directly.
      if ((source.fields?.length ?? 0) > 1) {
        openImportPicker(source.id, resolvedSourceField);
        return;
      }

      runDirectImport(source, resolvedSourceField);
    },
    [openImportPicker, runDirectImport],
  );

  const handleSourceModuleChange = React.useCallback(
    (nextModuleId) => {
      setSourceModuleId(nextModuleId);
      if (!nextModuleId || sourceMode !== STATUS_SOURCE_MODE.CUSTOM || !showImport) return;

      const source = sourceModuleOptions.find((candidate) => candidate.id === nextModuleId);
      if (!source) return;
      startSourceImport(source, sourceField);
    },
    [showImport, sourceField, sourceMode, sourceModuleOptions, startSourceImport],
  );

  const handleSourceFieldChange = React.useCallback(
    (nextSourceField) => {
      setSourceField(nextSourceField);
      if (sourceMode !== STATUS_SOURCE_MODE.CUSTOM || !selectedSourceModule || !nextSourceField)
        return;
      // Field dropdown only appears for multi-column modules — open picker for that field.
      openImportPicker(selectedSourceModule.id, nextSourceField);
    },
    [openImportPicker, selectedSourceModule, sourceMode],
  );

  const isDefaultSourceActive = activeSource === ACTIVE_SOURCE.DEFAULT;
  const isCustomSourceActive = activeSource === ACTIVE_SOURCE.CUSTOM;
  const isEditingDefaultActive = sourceMode === STATUS_SOURCE_MODE.DEFAULT && isDefaultSourceActive;
  const isEditingCustomActive = sourceMode === STATUS_SOURCE_MODE.CUSTOM && isCustomSourceActive;
  const isInactivePanel = sourceMode === STATUS_SOURCE_MODE.CUSTOM && !isCustomSourceActive;
  const isPanelLoading =
    isEditingDefaultActive || isEditingCustomActive ? activeStatusesLoading : configLoading;
  const isSaveDisabled =
    isSaving || isApplying || isImporting || importPickerOpen || isPanelLoading || isInactivePanel;

  const handleSave = React.useCallback(async () => {
    setIsSaving(true);
    try {
      if (sourceMode === STATUS_SOURCE_MODE.DEFAULT) {
        if (isDefaultSourceActive) {
          if (!saveHandlerRef.current) {
            showErrorToast('Unable to save. Please try again.');
            return;
          }
          await saveHandlerRef.current();
          return;
        }

        await runCustomSave(draftCatalogStatuses);
        return;
      }

      if (!saveHandlerRef.current) {
        showErrorToast('Unable to save. Please try again.');
        return;
      }
      await saveHandlerRef.current();
    } finally {
      setIsSaving(false);
    }
  }, [draftCatalogStatuses, isDefaultSourceActive, runCustomSave, sourceMode]);

  const resolvedFieldLabel = fieldLabel || field;
  const modalDescription = `Create and manage ${resolvedFieldLabel.toLowerCase()} statuses`;

  if (mode === 'page') {
    return (
      <StatusFieldEditor
        key={refreshKey}
        doctype={doctype}
        field={field}
        fieldLabel={fieldLabel}
        layout='status-master'
        sectionLabel='STATUS'
        showImport={false}
        showFooter={false}
        lockDefaultLifecycle={protectDefaultLifecycle}
        onSaved={handleSaved}
        onRegisterSave={(fn) => {
          saveHandlerRef.current = fn;
        }}
      />
    );
  }

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[960px] overflow-hidden flex flex-col' showClose>
        <Modal.Header icon={RiPriceTag3Line} title='Set Statuses' description={modalDescription} />
        <Modal.Body className='max-h-[70vh] overflow-y-auto p-0'>
          {open ? (
            <div className='grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]'>
              <StatusSourceSelector
                idPrefix='modal-status-source'
                sourceMode={sourceMode}
                onSourceModeChange={setSourceMode}
                sourceModuleId={sourceModuleId}
                onSourceModuleChange={handleSourceModuleChange}
                sourceModuleOptions={sourceModuleOptions}
                sourceField={sourceField}
                onSourceFieldChange={handleSourceFieldChange}
                sourceFieldOptions={sourceFieldOptions}
                allowImport={showImport}
                className='border-b lg:border-b-0 lg:border-r'
              />

              <div className='min-w-0 bg-bg-white-0'>
                {sourceMode === STATUS_SOURCE_MODE.DEFAULT ? (
                  isDefaultSourceActive ? (
                    <div className='p-5'>
                      <StatusFieldTabsPanel
                        doctype={doctype}
                        activeFieldSpec={modalFieldSpec}
                        refreshKey={refreshKey}
                        syncDefaultCatalog
                        lockDefaultLifecycle={protectDefaultLifecycle}
                        onSaved={handleConfigSaved}
                        onRegisterSave={(_index, handler) => {
                          saveHandlerRef.current = handler;
                        }}
                        onRegisterDefaultStatuses={registerActiveStatusesLoading}
                      />
                    </div>
                  ) : (
                    <div className='p-5'>
                      <CustomDefaultStatusesPanel
                        embedded
                        statuses={draftCatalogStatuses}
                        onChange={setDraftCatalogStatuses}
                        isLoading={configLoading}
                      />
                    </div>
                  )
                ) : isCustomSourceActive ? (
                  <div className='p-5'>
                    <StatusFieldTabsPanel
                      doctype={doctype}
                      activeFieldSpec={modalFieldSpec}
                      refreshKey={refreshKey}
                      lockDefaultLifecycle={protectDefaultLifecycle}
                      onSaved={handleConfigSaved}
                      onRegisterSave={(_index, handler) => {
                        saveHandlerRef.current = handler;
                      }}
                      onRegisterDefaultStatuses={registerActiveStatusesLoading}
                    />
                  </div>
                ) : (
                  <InactiveSourceNotice
                    title='Default statuses are active'
                    description='Switch to Default to edit statuses, reorder, change colors, or enable and disable options. Click Save to apply changes to records.'
                  />
                )}
              </div>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer className='justify-between'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            {isSaving || isApplying ? 'Saving…' : 'Save'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>

      <ImportStatusesModal
        open={importPickerOpen}
        onOpenChange={setImportPickerOpen}
        targetDoctype={doctype}
        targetField={field}
        targetContext={context}
        targetFieldLabel={resolvedFieldLabel}
        initialSourceModuleId={sourceModuleId}
        initialSourceFieldKey={sourceField}
        onImported={handleImported}
      />

      <ImportStatusMappingModal
        open={mappingOpen}
        onOpenChange={setMappingOpen}
        analysis={analysis}
        targetDoctype={doctype}
        targetFieldLabel={resolvedFieldLabel}
        isSubmitting={isImporting}
        onConfirm={handleMappingConfirm}
      />

      <ImportStatusMappingModal
        open={customMappingOpen}
        onOpenChange={setCustomMappingOpen}
        analysis={customAnalysis}
        targetDoctype={doctype}
        targetFieldLabel={resolvedFieldLabel}
        title='Apply custom default statuses'
        descriptionPrefix='Some existing'
        isSubmitting={isApplying}
        onConfirm={handleCustomMappingConfirm}
      />
    </Modal.Root>
  );
}
