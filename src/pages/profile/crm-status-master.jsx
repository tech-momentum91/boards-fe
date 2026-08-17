import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDeleteBinLine,
  RiDraggable,
  RiFileCopyLine,
  RiFileWarningLine,
  RiGitBranchLine,
  RiIndeterminateCircleLine,
  RiSettings3Line,
  RiSearchLine,
  RiTaskLine,
} from 'react-icons/ri';
import { showSuccessToast, extractErrorMessage } from '@/utils/error-utils';
import * as Button from '@/components/ui/button';
import * as Switch from '@/components/ui/switch';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import PipelineCrmSettingsModal from '@/pages/profile/pipeline-crm-settings-modal';
import { toast } from '@/components/ui/toast';
import * as AlertToast from '@/components/ui/toast-alert';
import apiClient from '@/api/axios';
import { getCrmLeadOptions } from '@/api/crmLeads';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import {
  CRM_DEFAULT_PIPELINE_COLOR as DEFAULT_PIPELINE_COLOR,
  CRM_DEFAULT_STAGE_COLOR as DEFAULT_STAGE_COLOR,
  CRM_DEFAULT_STATUS_COLOR as DEFAULT_STATUS_COLOR,
  getCrmDefaultStatusColor as getDefaultStatusColor,
} from '@/components/crm-leads/constants';

const PRESET_CRM_COLORS = [
  '#6366F1', // indigo
  '#2563EB', // blue
  '#F97316', // orange
  '#FACC15', // yellow
  '#22C55E', // green
  '#0EA5E9', // sky
  '#EC4899', // pink
  '#EF4444', // red
  '#9C27B0', // purple (pipeline default)
  '#2196F3', // blue (stage default)
];

/** Small preset color picker used for pipeline / stage / status. */
const ColorSwatchPicker = ({
  color,
  fallbackColor,
  ariaLabel = 'Color',
  onChange,
  className = '',
}) => {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const paletteRef = useRef(null);
  const currentColor = color || fallbackColor;

  useEffect(() => {
    if (!isPaletteOpen) return;
    const handleClickOutside = (event) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target)) {
        setIsPaletteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPaletteOpen]);

  return (
    <div ref={paletteRef} className={cn('relative', className)}>
      <button
        type='button'
        aria-label={ariaLabel}
        className='flex items-center justify-center rounded-[4px] border border-[var(--color-stroke-sub-300)] bg-white p-[2px]'
        onClick={() => setIsPaletteOpen((previous) => !previous)}
      >
        <span className='h-3.5 w-3.5 rounded-[4px]' style={{ backgroundColor: currentColor }} />
      </button>
      {isPaletteOpen ? (
        <div className='absolute z-20 mt-2 -left-1 flex items-center gap-1 rounded-[10px] border border-[var(--color-stroke-soft-200)] bg-white px-2 py-2 shadow-custom-xs'>
          {PRESET_CRM_COLORS.map((presetColor) => {
            const isSelected = currentColor === presetColor;
            return (
              <button
                key={presetColor}
                type='button'
                className={cn(
                  'flex items-center justify-center rounded-[4px] border bg-white p-[2px]',
                  isSelected
                    ? 'border-[var(--color-success-base)]'
                    : 'border-[var(--color-stroke-sub-300)]',
                )}
                onClick={() => {
                  onChange?.(presetColor);
                  setIsPaletteOpen(false);
                }}
              >
                <span
                  className='h-3.5 w-3.5 rounded-[4px]'
                  style={{ backgroundColor: presetColor }}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const CUSTOMER_STAGE_NAME = 'Customer';
const CUSTOMER_DEFAULT_STATUS_NAME = 'Won';
const CUSTOMER_LEGACY_DEFAULT_STATUS_NAME = 'Customer';
const CUSTOMER_LOST_STATUS_NAME = 'Lost';

const createCustomerStage = (pipelineDocId = '') => ({
  id: createId(),
  backendName: null,
  isNew: true,
  isCustomerStage: true,
  pipeline: pipelineDocId || null,
  name: CUSTOMER_STAGE_NAME,
  color: DEFAULT_STAGE_COLOR,
  applyToExternal: false,
  _lastSavedFingerprint: null,
  _lastSavedInputFieldFingerprint: null,
  statuses: [
    {
      id: createId(),
      stageStatusLink: null,
      name: CUSTOMER_DEFAULT_STATUS_NAME,
      color: getDefaultStatusColor(CUSTOMER_DEFAULT_STATUS_NAME, 'customer'),
      isDefault: true,
      defaultType: 'customer',
    },
    {
      id: createId(),
      stageStatusLink: null,
      name: CUSTOMER_LOST_STATUS_NAME,
      color: getDefaultStatusColor(CUSTOMER_LOST_STATUS_NAME, 'lost'),
      isDefault: true,
      defaultType: 'lost',
    },
  ],
  position: 0,
});

const CRM_STATUS_MASTER_API_BASE =
  '/method/devx.devx_crm.doctype.crm_status_master.crm_status_master';
const LOST_REASON_API_BASE =
  '/method/devx.devx_crm.doctype.crm_lead_lost_reason.crm_lead_lost_reason';
const LEAD_RELEVANCE_API_BASE = '/method/devx.devx_crm.doctype.lead_relevance.lead_relevance';
const LEAD_SIZE_API_BASE = '/method/devx.devx_crm.doctype.crm_lead_size.crm_lead_size';

const PIPELINE_SETTINGS_TABS = [
  { id: 'product', label: 'Product' },
  { id: 'drop-reason', label: 'Drop Reasons' },
  { id: 'lead-relevance', label: 'Lead Relevance' },
  { id: 'lead-size', label: 'Lead Size' },
];

const normalizePipelineSettingValue = (value) => (value || '').trim().toLowerCase();

const unwrapFrappeMessage = (response) => response?.data?.message ?? response?.data;

const normalizeMasterOptions = (message, valueField) => {
  const byValue = new Map();
  const addRow = (row) => {
    if (!row || typeof row !== 'object') return;
    const name = String(row.name ?? '').trim();
    const label = String(row[valueField] ?? row.label ?? '').trim();
    if (!name && !label) return;
    const value = name || label;
    const display = label || name;
    if (!byValue.has(value)) byValue.set(value, { value, label: display });
  };
  if (Array.isArray(message)) {
    message.forEach(addRow);
  } else if (message && typeof message === 'object') {
    Object.values(message).forEach((rows) => {
      if (Array.isArray(rows)) rows.forEach(addRow);
    });
  }
  return [...byValue.values()];
};

const normalizeLostReasonOptions = (message) => normalizeMasterOptions(message, 'lost_reason');

const PIPELINE_SETTING_CREATE_CONFIG = {
  'drop-reason': {
    apiBase: LOST_REASON_API_BASE,
    getMethod: 'get_lost_reasons_by_stage_status',
    upsertMethod: 'upsert_lost_reason',
    valueField: 'lost_reason',
    normalizeOptions: (message) => normalizeLostReasonOptions(message),
  },
  'lead-relevance': {
    apiBase: LEAD_RELEVANCE_API_BASE,
    getMethod: 'get_lead_relevances',
    upsertMethod: 'upsert_lead_relevance',
    valueField: 'lead_relevance',
    normalizeOptions: (message) => normalizeMasterOptions(message, 'lead_relevance'),
  },
  'lead-size': {
    apiBase: LEAD_SIZE_API_BASE,
    getMethod: 'get_lead_sizes',
    upsertMethod: 'upsert_lead_size',
    valueField: 'lead_size',
    normalizeOptions: (message) => normalizeMasterOptions(message, 'lead_size'),
  },
};

/** Pipeline row → docnames saved on CRM Stages Pipeline (same role as `products`). */
const normalizePipelineAttachmentIds = (row, config) => {
  const { rawKeys, childTableField, valueField } = config;
  let raw;
  for (const key of rawKeys) {
    if (row?.[key] != null) {
      raw = row[key];
      break;
    }
  }
  if (raw == null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return [
    ...new Set(
      list
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object') {
            return String(
              item[childTableField] ?? item.name ?? item.value ?? item[valueField] ?? '',
            ).trim();
          }
          return '';
        })
        .filter(Boolean),
    ),
  ];
};

const PIPELINE_ATTACHMENT_CONFIG = {
  lostReason: {
    rawKeys: [
      'lost_reasons',
      'lost_reason_ids',
      'lostReasonIds',
      'lost_reason',
      'pipeline_lost_reason',
    ],
    childTableField: 'crm_pipeline_lost_reason',
    valueField: 'lost_reason',
    boardField: 'lostReasonIds',
  },
  leadRelevance: {
    rawKeys: [
      'lead_relevances',
      'lead_relevance_ids',
      'leadRelevanceIds',
      'lead_relevance',
      'pipeline_lead_relevance',
    ],
    childTableField: 'crm_pipeline_lead_relevance',
    valueField: 'lead_relevance',
    boardField: 'leadRelevanceIds',
  },
  leadSize: {
    rawKeys: ['lead_sizes', 'lead_size_ids', 'leadSizeIds', 'lead_size', 'pipeline_lead_size'],
    childTableField: 'crm_pipeline_lead_size',
    valueField: 'lead_size',
    boardField: 'leadSizeIds',
  },
};

const normalizePipelineLostReasonIds = (row) =>
  normalizePipelineAttachmentIds(row, PIPELINE_ATTACHMENT_CONFIG.lostReason);

const normalizePipelineLeadRelevanceIds = (row) =>
  normalizePipelineAttachmentIds(row, PIPELINE_ATTACHMENT_CONFIG.leadRelevance);

const normalizePipelineLeadSizeIds = (row) =>
  normalizePipelineAttachmentIds(row, PIPELINE_ATTACHMENT_CONFIG.leadSize);

/** List API may omit child tables; load from CRM Stages Pipeline doc when needed. */
const fetchPipelineAttachmentIdsForBoard = async (board, config) => {
  if (!board) return [];
  const fromList = normalizePipelineAttachmentIds(board, config);
  if (fromList.length > 0) return fromList;

  const docName = String(board.name ?? '').trim();
  if (!docName) return [];

  try {
    const response = await apiClient.get(
      `/resource/CRM Stages Pipeline/${encodeURIComponent(docName)}`,
    );
    const doc = response?.data?.data ?? response?.data;
    return normalizePipelineAttachmentIds(doc, config);
  } catch {
    return [];
  }
};

const enrichPipelineBoardsWithAttachments = async (boards) => {
  const list = Array.isArray(boards) ? boards : [];
  return Promise.all(
    list.map(async (board) => {
      const [lostReasonIds, leadRelevanceIds, leadSizeIds] = await Promise.all([
        fetchPipelineAttachmentIdsForBoard(board, PIPELINE_ATTACHMENT_CONFIG.lostReason),
        fetchPipelineAttachmentIdsForBoard(board, PIPELINE_ATTACHMENT_CONFIG.leadRelevance),
        fetchPipelineAttachmentIdsForBoard(board, PIPELINE_ATTACHMENT_CONFIG.leadSize),
      ]);
      return {
        ...board,
        ...(lostReasonIds.length > 0 ? { lostReasonIds } : {}),
        ...(leadRelevanceIds.length > 0 ? { leadRelevanceIds } : {}),
        ...(leadSizeIds.length > 0 ? { leadSizeIds } : {}),
      };
    }),
  );
};

/** Map stored pipeline option ids/labels to multiselect `value` (docname). Drops stale entries removed from CRM Setup. */
const resolvePipelineOptionSelection = (savedIds, options) => {
  const saved = Array.isArray(savedIds) ? savedIds : [];
  if (saved.length === 0) return [];
  const opts = Array.isArray(options) ? options : [];
  const valueSet = new Set(opts.map((o) => String(o?.value ?? '').trim()).filter(Boolean));
  const labelToValue = new Map();
  for (const o of opts) {
    const value = String(o?.value ?? '').trim();
    const label = String(o?.label ?? '')
      .trim()
      .toLowerCase();
    if (label && value) labelToValue.set(label, value);
  }
  return [
    ...new Set(
      saved
        .map((id) => {
          const key = String(id ?? '').trim();
          if (!key) return '';
          if (valueSet.has(key)) return key;
          const byLabel = labelToValue.get(key.toLowerCase());
          return byLabel && valueSet.has(byLabel) ? byLabel : '';
        })
        .filter(Boolean),
    ),
  ];
};

/** Keep pipeline-saved ids plus any valid in-modal picks (e.g. newly created, not saved yet). */
const mergePipelineModalSelection = (savedIds, options, prev) => {
  const resolved = resolvePipelineOptionSelection(savedIds, options);
  const opts = Array.isArray(options) ? options : [];
  const valueSet = new Set(opts.map((o) => String(o?.value ?? '').trim()).filter(Boolean));
  const prevValid = (Array.isArray(prev) ? prev : [])
    .map((id) => String(id ?? '').trim())
    .filter((id) => valueSet.has(id));
  return [...new Set([...resolved, ...prevValid])];
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildDefaultStatuses = (stageName) => {
  const cleanName = stageName.trim();
  if (!cleanName) {
    return [];
  }

  return [
    {
      id: createId(),
      stageStatusLink: null,
      name: cleanName,
      color: getDefaultStatusColor(cleanName, 'base'),
      isDefault: true,
      defaultType: 'base',
    },
    {
      id: createId(),
      stageStatusLink: null,
      name: `${cleanName} Drop`,
      color: getDefaultStatusColor(`${cleanName} Drop`, 'drop'),
      isDefault: true,
      defaultType: 'drop',
    },
  ];
};

const createEmptyStage = (pipelineDocId = '') => ({
  id: createId(),
  backendName: null,
  isNew: true,
  pipeline: pipelineDocId || null,
  name: '',
  color: DEFAULT_STAGE_COLOR,
  applyToExternal: false,
  statuses: [],
  position: 0,
  _lastSavedFingerprint: null,
  _lastSavedInputFieldFingerprint: null,
});

/** Stage title + status labels only (for unsaved hint; excludes apply-to-external, color, index). */
const computeStageInputFieldFingerprint = (stage) => {
  if (!stage || !stage.name?.trim()) return '';
  const st = (stage.statuses || []).map((s) => ({
    n: (s.name || '').trim(),
    l: (s.stageStatusLink || '').trim(),
    d: s.isDefault ? s.defaultType || '' : 'm',
  }));
  return JSON.stringify({ n: stage.name.trim(), s: st });
};

/** Fingerprint of fields sent to create/update_crm_stages (stage name, color, flags, positions, statuses in order). */
const computeStageSaveFingerprint = (stage) => {
  if (!stage || !stage.name?.trim()) return '';
  const st = (stage.statuses || []).map((s) => ({
    n: (s.name || '').trim(),
    l: (s.stageStatusLink || '').trim(),
    c: s.color || getDefaultStatusColor(s.name, s.defaultType),
    d: s.isDefault ? s.defaultType || '' : 'm',
  }));
  return JSON.stringify({
    n: stage.name.trim(),
    c: stage.color || DEFAULT_STAGE_COLOR,
    a: Boolean(stage.applyToExternal),
    p: toNumber(stage.position, 0),
    s: st,
  });
};

/** Unsaved hint only for text fields that use Enter / click-outside to save (not apply-to-external, etc.). */
const stageHasUnsavedChanges = (stage) => {
  if (!stage) return false;
  if (stage.isNew && !stage.backendName) {
    const hasContent =
      Boolean(stage.name?.trim()) ||
      (stage.statuses || []).some((s) => !s.isDefault && (s.name || '').trim());
    return hasContent;
  }
  if (!stage.isNew && stage.backendName && stage._lastSavedInputFieldFingerprint != null) {
    const fp = computeStageInputFieldFingerprint(stage);
    return fp !== stage._lastSavedInputFieldFingerprint;
  }
  return false;
};

/**
 * Build local status rows from server child rows (sorted by index).
 * Always use server `name` as id / stageStatusLink — never zip by UI array index.
 */
const normalizeStatusRowsFromServer = (stageName, isCustomerStage, rawRows) => {
  const sorted = [...(Array.isArray(rawRows) ? rawRows : [])].sort(
    (a, b) => toNumber(a?.index, 0) - toNumber(b?.index, 0),
  );
  const sn = (stageName || '').trim();
  const isCs = Boolean(isCustomerStage) || sn === CUSTOMER_STAGE_NAME;

  return sorted.map((row) => {
    const statusName = row?.status || '';
    const isBaseDefault = Boolean(sn) && !isCs && statusName === sn;
    const isDropDefault = Boolean(sn) && !isCs && statusName === `${sn} Drop`;
    const isCustomerDefault =
      isCs &&
      (statusName === CUSTOMER_DEFAULT_STATUS_NAME ||
        statusName === CUSTOMER_LEGACY_DEFAULT_STATUS_NAME);
    const isLost = isCs && statusName === CUSTOMER_LOST_STATUS_NAME;
    const isPermanentCustomerStatus = isCustomerDefault || isLost;
    const rid = (row?.name || '').trim();

    return {
      id: rid || createId(),
      stageStatusLink: rid || null,
      name: statusName,
      color:
        (row?.color || '').trim() ||
        getDefaultStatusColor(
          statusName,
          isBaseDefault
            ? 'base'
            : isDropDefault
              ? 'drop'
              : isCustomerDefault
                ? 'customer'
                : isLost
                  ? 'lost'
                  : null,
        ),
      isDefault: isBaseDefault || isDropDefault || isPermanentCustomerStatus,
      defaultType: isBaseDefault
        ? 'base'
        : isDropDefault
          ? 'drop'
          : isCustomerDefault
            ? 'customer'
            : isLost
              ? 'lost'
              : null,
    };
  });
};

const mapServerStageToLocal = (serverStage, fallbackPosition = 0) => {
  const stageName = (serverStage?.stage || '').trim();
  const stageColor = serverStage?.color || DEFAULT_STAGE_COLOR;
  const applyToExternal = Boolean(serverStage?.apply_to_external);
  const stagePosition = toNumber(serverStage?.stage_index, fallbackPosition);
  const rawStatuses = Array.isArray(serverStage?.crm_stage_status)
    ? [...serverStage.crm_stage_status]
    : [];

  const isCustomerStage =
    stageName === CUSTOMER_STAGE_NAME || Boolean(serverStage?.stage === CUSTOMER_STAGE_NAME);
  const statuses = normalizeStatusRowsFromServer(stageName, isCustomerStage, rawStatuses);

  const local = {
    id: createId(),
    pipeline: serverStage?.pipeline || null,
    backendName: serverStage?.name || stageName || null,
    isNew: false,
    isCustomerStage,
    name: serverStage?.stage || '',
    color: stageColor,
    applyToExternal,
    statuses,
    position: stagePosition,
  };
  return {
    ...local,
    _lastSavedFingerprint: computeStageSaveFingerprint(local),
    _lastSavedInputFieldFingerprint: computeStageInputFieldFingerprint(local),
  };
};

/** One pipeline row from get_crm_stages_all_pipelines → { name, pipeline, stages } for UI state. */
const normalizeServerBoard = (row) => {
  const pid = row?.name || '';
  const raw = Array.isArray(row?.stages) ? row.stages : [];
  const sorted = [...raw].sort((a, b) => toNumber(a?.stage_index, 0) - toNumber(b?.stage_index, 0));
  let stages = sorted.map((stg, index) => mapServerStageToLocal(stg, index));
  const hasCustomer = stages.some(
    (s) => s.isCustomerStage || (s.name && s.name.trim() === CUSTOMER_STAGE_NAME),
  );
  if (!hasCustomer) {
    stages.push(createCustomerStage(pid));
  }
  const customerStage = stages.find((s) => s.isCustomerStage);
  const others = stages.filter((s) => !s.isCustomerStage);
  stages = customerStage ? [...others, customerStage] : others;
  stages = stages.map((stage, index) => ({
    ...stage,
    pipeline: stage.pipeline || pid,
    position: index,
  }));
  return {
    name: pid,
    pipeline: row?.pipeline || pid,
    color: (row?.color || '').trim() || DEFAULT_PIPELINE_COLOR,
    stages,
    productIds: Array.isArray(row?.products) ? [...row.products] : [],
    lostReasonIds: normalizePipelineLostReasonIds(row),
    leadRelevanceIds: normalizePipelineLeadRelevanceIds(row),
    leadSizeIds: normalizePipelineLeadSizeIds(row),
  };
};

const isReasonRowTrailingEmpty = (rows, index) =>
  index === rows.length - 1 && !(rows[index]?.lost_reason || '').trim();

const canDragReasonRow = (rows, index) => {
  const row = rows[index];
  if (!row?.name) return false;
  return !isReasonRowTrailingEmpty(rows, index);
};

/** Compare lost-reason labels for duplicate detection within one drop/lost stage status. */
const normalizeDropReasonLabel = (value) => (value || '').trim().toLowerCase();

/** True if another row in the same `stage_status` list already uses this label (frontend-only guard). */
const hasDuplicateDropReasonInStatus = (rows, localId, label) => {
  const key = normalizeDropReasonLabel(label);
  if (!key) return false;
  return (rows || []).some(
    (r) => r.localId !== localId && normalizeDropReasonLabel(r.lost_reason) === key,
  );
};

const DropReasonsModal = ({
  isOpen,
  onOpenChange,
  stages,
  reasonsByStatus,
  activeStatusName,
  onSelectStatus,
  onChangeReason,
  onFocusReason,
  onBlurReason,
  onDeleteReason,
  onDragStartReason,
  onDragOverReason,
  onDropReason,
  registerReasonRow,
  pendingKeys,
}) => {
  if (!isOpen) return null;

  const stageItems = stages
    .map((stage) => {
      const status =
        stage.statuses.find((s) => s.defaultType === 'drop') ||
        stage.statuses.find((s) => s.defaultType === 'lost');
      if (!status?.name?.trim()) return null;
      const link = (status.stageStatusLink || '').trim();
      if (!link) return null;
      return {
        stageName: stage.name,
        statusName: status.name.trim(),
        stageStatusLink: link,
      };
    })
    .filter(Boolean);

  const selectedLink = activeStatusName || stageItems[0]?.stageStatusLink || '';
  const rows = reasonsByStatus[selectedLink] || [];
  const selectedStageName =
    stageItems.find((item) => item.stageStatusLink === selectedLink)?.stageName?.trim() || '';

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[560px] w-[560px] overflow-hidden rounded-[20px]'>
        <Modal.Header
          icon={RiCheckboxCircleLine}
          title='Configure Drop Reasons'
          description={
            selectedStageName
              ? `Add drop reasons for ${selectedStageName} stage.`
              : 'Add drop reasons for each drop/lost stage.'
          }
        />
        <Modal.Body className='p-0'>
          <TabMenuVertical.Root
            value={selectedLink}
            onValueChange={onSelectStatus}
            className='flex min-h-[280px] max-h-[calc(100vh-10rem)] w-full overflow-hidden'
          >
            <TabMenuVertical.List className='w-[180px] min-h-0 shrink-0 overflow-y-auto overflow-x-hidden overscroll-contain p-3 bg-bg-weak-100 border-r border-stroke-soft-200 space-y-1 rounded-bl-[20px]'>
              {stageItems.map((item) => (
                <TabMenuVertical.Trigger
                  key={item.stageStatusLink}
                  value={item.stageStatusLink}
                  className='grid-cols-[minmax(0,1fr)_auto] gap-2 data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
                >
                  <span className='truncate' title={item.statusName}>
                    {item.stageName}
                  </span>
                  <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                </TabMenuVertical.Trigger>
              ))}
            </TabMenuVertical.List>

            <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 space-y-1.5 rounded-br-[20px] bg-bg-weak-100'>
              {rows.map((reason, index) => {
                const key = `${selectedLink}:${reason.localId}`;
                const saving = pendingKeys.has(key);
                const draggable = canDragReasonRow(rows, index);
                return (
                  <div
                    key={reason.localId}
                    ref={(el) => registerReasonRow?.(reason.localId, el)}
                    draggable={draggable}
                    onDragStart={(event) => {
                      if (event.target.closest('input, button')) {
                        event.preventDefault();
                        return;
                      }
                      event.stopPropagation();
                      onDragStartReason?.(selectedLink, reason.localId);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onDragOverReason?.(selectedLink, reason.localId, event);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onDropReason?.(selectedLink);
                    }}
                    className='group relative flex h-8 items-center gap-2 border border-[var(--color-stroke-soft-200)] rounded-[8px] bg-white px-2 transition-all duration-150'
                  >
                    {draggable ? (
                      <span
                        className='shrink-0 cursor-grab text-[var(--color-text-soft-400)]'
                        title='Drag to reorder'
                      >
                        <RiDraggable className='size-3.5' />
                      </span>
                    ) : (
                      <span className='w-3.5 shrink-0' aria-hidden />
                    )}
                    <div className='relative min-w-0 flex-1'>
                      <input
                        value={reason.lost_reason}
                        onChange={(event) =>
                          onChangeReason(selectedLink, reason.localId, event.target.value)
                        }
                        onFocus={() => onFocusReason?.(selectedLink, reason.localId)}
                        onBlur={() => onBlurReason(selectedLink, reason.localId)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            onBlurReason(selectedLink, reason.localId);
                          }
                        }}
                        placeholder={
                          index === rows.length - 1
                            ? 'Type drop reason and press enter'
                            : 'Enter reason'
                        }
                        className='w-full bg-transparent outline-none text-[var(--color-text-main-900)] paragraph-small pr-8'
                      />
                      {Boolean(reason.name) && (
                        <button
                          type='button'
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => onDeleteReason(selectedLink, reason.localId)}
                          className='absolute right-0 top-1/2 -translate-y-1/2 text-[var(--color-text-soft-400)] hover:text-[var(--color-error-base)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity'
                          aria-label='Delete reason'
                        >
                          <RiDeleteBinLine className='size-3.5' />
                        </button>
                      )}
                    </div>
                    {saving && (
                      <span className='absolute -bottom-4 right-0 text-[10px] text-[var(--color-text-soft-400)]'>
                        Saving...
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </TabMenuVertical.Root>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
};

const StageStatusRow = ({
  status,
  stageId,
  canDelete = true,
  onStatusChange,
  onStatusBlur,
  onStatusCommit,
  onStatusColorChange,
  onRemoveStatus,
  onDragStartStatus,
  onDropStatus,
  onDragOverStatus,
  registerStatusRow,
  registerStatusInput,
  onConfigureDropReasons,
}) => {
  const isDropOrLostDefault =
    status.isDefault && (status.defaultType === 'drop' || status.defaultType === 'lost');
  const containerClasses = isDropOrLostDefault
    ? 'group flex h-8 items-center gap-2 border border-[var(--color-error-light)] rounded-[8px] bg-[var(--color-error-lighter)] px-2 transition-all duration-150'
    : 'group flex h-8 items-center gap-2 border border-[var(--color-stroke-soft-200)] rounded-[8px] bg-white px-2 transition-all duration-150';
  const textClasses = isDropOrLostDefault
    ? 'w-full bg-transparent outline-none paragraph-small text-[var(--color-error-dark)] disabled:cursor-default'
    : 'w-full bg-transparent outline-none text-[var(--color-text-main-900)] paragraph-small disabled:cursor-default';

  const handleStatusDragStart = (event) => {
    event.stopPropagation();
    onDragStartStatus(stageId, status.id);
  };

  const renderStatusLeadingSlot = () => {
    if (!isDropOrLostDefault) {
      return (
        <span className='cursor-grab text-[var(--color-text-soft-400)]' title='Drag status'>
          <RiDraggable className='size-3.5' />
        </span>
      );
    }
    if (status.defaultType === 'drop') {
      return (
        <span className='shrink-0 text-[var(--color-error-dark)]' aria-hidden title='Drop status'>
          <RiIndeterminateCircleLine className='size-3.5' />
        </span>
      );
    }
    if (status.defaultType === 'lost') {
      return (
        <span className='shrink-0 text-[var(--color-error-dark)]' aria-hidden title='Lost status'>
          <RiCloseCircleLine className='size-3.5' />
        </span>
      );
    }
    return <span className='w-3.5 shrink-0' aria-hidden />;
  };

  return (
    <div
      ref={(el) => registerStatusRow(status.id, el)}
      draggable={!isDropOrLostDefault}
      onDragStart={isDropOrLostDefault ? undefined : handleStatusDragStart}
      className={containerClasses}
      onDragOver={(event) => {
        event.stopPropagation();
        onDragOverStatus(stageId, status.id, event);
      }}
      onDrop={(event) => {
        event.stopPropagation();
        onDropStatus(stageId, event);
      }}
    >
      {renderStatusLeadingSlot()}

      <ColorSwatchPicker
        color={status.color}
        fallbackColor={getDefaultStatusColor(status.name, status.defaultType)}
        ariaLabel='Status color'
        onChange={(nextColor) => onStatusColorChange?.(stageId, status.id, nextColor)}
      />

      <input
        ref={(el) => registerStatusInput(status.id, el)}
        value={status.name}
        onChange={(event) => onStatusChange(stageId, status.id, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !status.isDefault) {
            event.preventDefault();
            onStatusCommit?.(stageId);
          }
        }}
        onBlur={() => {
          if (!status.isDefault) {
            onStatusBlur?.(stageId);
          }
        }}
        disabled={status.isDefault}
        placeholder='Enter status name'
        className={textClasses}
      />

      {canDelete ? (
        <button
          type='button'
          onClick={() => onRemoveStatus(stageId, status.id)}
          className='text-[var(--color-text-soft-400)] hover:text-[var(--color-error-base)] transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          aria-label='Delete status'
        >
          <RiDeleteBinLine className='size-3.5' />
        </button>
      ) : null}
    </div>
  );
};

const StageCard = ({
  boardId,
  stage,
  inputRef,
  onStageNameChange,
  onStageNameBlur,
  onStageNameCommit,
  onStageColorChange,
  onStageApplyExternalChange,
  onRemoveStage,
  onAddStatus,
  onStatusChange,
  onStatusBlur,
  onStatusCommit,
  onStatusColorChange,
  onRemoveStatus,
  onDragStartStage,
  onDropStage,
  onDragOverStage,
  onDragStartStatus,
  onDropStatus,
  onDragOverStatus,
  registerStatusRow,
  registerStatusInput,
  registerStageCard,
  onConfigureDropReasons,
}) => {
  const hasStageName = stage.name.trim().length > 0;
  const hasManualStatuses = stage.statuses.some((status) => !status.isDefault);
  const shouldShowDetails = hasStageName || hasManualStatuses;

  const isCustomerStage = Boolean(stage.isCustomerStage);

  return (
    <div
      ref={(el) => registerStageCard(stage.id, el)}
      draggable={!isCustomerStage}
      onDragStart={!isCustomerStage ? () => onDragStartStage(stage.id) : undefined}
      className='relative w-[280px] rounded-[12px] border border-[var(--color-stroke-soft-200)] bg-[var(--color-bg-weak-100)] p-2 flex flex-col gap-1 shrink-0'
      onDragOver={
        !isCustomerStage ? (event) => onDragOverStage(boardId, stage.id, event) : undefined
      }
      onDrop={!isCustomerStage ? () => onDropStage(boardId) : undefined}
    >
      {!isCustomerStage && (
        <div className='absolute top-0.5 left-1/2 -translate-x-1/2'>
          <RiDraggable className='size-3 text-[var(--color-text-soft-400)] cursor-grab rotate-90' />
        </div>
      )}

      <div className='group flex h-7 items-center gap-1.5 rounded-[8px] bg-[var(--color-bg-weak-100)] px-2'>
        <ColorSwatchPicker
          color={stage.color}
          fallbackColor={DEFAULT_STAGE_COLOR}
          ariaLabel='Stage color'
          onChange={(nextColor) => onStageColorChange(stage.id, nextColor)}
        />

        {isCustomerStage ? (
          <span className='flex-1 paragraph-small text-[var(--color-text-main-900)]'>
            {CUSTOMER_STAGE_NAME}
          </span>
        ) : (
          <input
            ref={inputRef}
            value={stage.name}
            onChange={(event) => onStageNameChange(stage.id, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onStageNameCommit?.(stage.id);
              }
            }}
            onBlur={() => onStageNameBlur(stage.id)}
            placeholder='Enter stage name'
            className='w-full bg-transparent outline-none paragraph-small text-[var(--color-text-main-900)]'
          />
        )}

        {!isCustomerStage && (
          <button
            type='button'
            onClick={() => onRemoveStage(stage.id)}
            className='text-[var(--color-text-soft-400)] hover:text-[var(--color-error-base)] transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            aria-label='Delete stage'
          >
            <RiDeleteBinLine className='size-3.5' />
          </button>
        )}
      </div>

      {shouldShowDetails && (
        <>
          <div className='-mx-2 mt-0.5 flex min-h-[20px] items-center justify-between border-y border-[var(--color-stroke-soft-200)] px-2 py-[6px]'>
            <span className='text-[var(--color-text-soft-400)] text-label-xs uppercase'>
              Apply to external
            </span>
            <Switch.Root
              checked={stage.applyToExternal}
              onCheckedChange={(checked) => onStageApplyExternalChange(stage.id, checked)}
              id={`stage-${stage.id}-apply-external`}
            />
          </div>

          <div className='mt-1 flex flex-col gap-1.5'>
            {stage.statuses.map((status) => (
              <StageStatusRow
                key={status.id}
                status={status}
                stageId={stage.id}
                canDelete={stage.statuses.length > 2}
                onStatusChange={onStatusChange}
                onStatusBlur={onStatusBlur}
                onStatusCommit={onStatusCommit}
                onStatusColorChange={onStatusColorChange}
                onRemoveStatus={onRemoveStatus}
                onDragStartStatus={onDragStartStatus}
                onDropStatus={onDropStatus}
                onDragOverStatus={onDragOverStatus}
                registerStatusRow={registerStatusRow}
                registerStatusInput={registerStatusInput}
                onConfigureDropReasons={onConfigureDropReasons}
              />
            ))}
          </div>

          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='mt-1.5 h-8 w-full gap-1.5 px-2'
            onClick={() => onAddStatus(stage.id)}
          >
            <Button.Icon as={RiAddLine} />
            Add Status
          </Button.Root>
        </>
      )}
    </div>
  );
};

const CrmStatusMaster = () => {
  const [pipelineBoards, setPipelineBoards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  /** Ref-count of in-flight writes per pipeline doc id (CRM Stages Pipeline.name). */
  const [savingByPipelineId, setSavingByPipelineId] = useState({});
  const [dropReasonsOpen, setDropReasonsOpen] = useState(false);
  /** CRM Stages Pipeline doc name (`board.name`) for the Configure Drop Reasons modal. */
  const [dropReasonsPipelineId, setDropReasonsPipelineId] = useState('');
  const [activeDropStatus, setActiveDropStatus] = useState('');
  const [reasonsByStatus, setReasonsByStatus] = useState({});
  const [pendingReasonKeys, setPendingReasonKeys] = useState(new Set());
  const [draggedStageId, setDraggedStageId] = useState(null);
  const [draggedStatusMeta, setDraggedStatusMeta] = useState(null);
  const [newPipelineTitle, setNewPipelineTitle] = useState('');
  const [isCreatingPipeline, setIsCreatingPipeline] = useState(false);
  const [newPipelineInputOpen, setNewPipelineInputOpen] = useState(false);
  const [renamingPipelineDocId, setRenamingPipelineDocId] = useState(null);
  /** Pipeline doc id → expanded. Omitted/false = collapsed (default). */
  const [expandedPipelines, setExpandedPipelines] = useState({});
  /** CRM Stages Pipeline doc id pending delete confirmation (same modal pattern as ticket delete). */
  const [pipelineDeleteId, setPipelineDeleteId] = useState(null);
  const [isDeletingPipeline, setIsDeletingPipeline] = useState(false);
  const [copyPipelineSourceId, setCopyPipelineSourceId] = useState(null);
  const [copyPipelineTitle, setCopyPipelineTitle] = useState('');
  const [isCopyingPipeline, setIsCopyingPipeline] = useState(false);
  const [pipelineSettingsModalId, setPipelineSettingsModalId] = useState(null);
  const [pipelineSettingsActiveTab, setPipelineSettingsActiveTab] = useState('product');
  const [pipelineSettingsSearch, setPipelineSettingsSearch] = useState('');
  const [isSavingPipelineSettings, setIsSavingPipelineSettings] = useState(false);
  const [pipelineSettingsProductSelection, setPipelineSettingsProductSelection] = useState([]);
  const [dropReasonModalSelection, setDropReasonModalSelection] = useState([]);
  const [leadRelevanceModalSelection, setLeadRelevanceModalSelection] = useState([]);
  const [leadSizeModalSelection, setLeadSizeModalSelection] = useState([]);
  const [leadProductOptions, setLeadProductOptions] = useState([]);
  const [lostReasonOptions, setLostReasonOptions] = useState([]);
  const [leadRelevanceOptions, setLeadRelevanceOptions] = useState([]);
  const [leadSizeOptions, setLeadSizeOptions] = useState([]);
  const [pipelineSettingsNewValue, setPipelineSettingsNewValue] = useState('');
  const [isCreatingPipelineSettingValue, setIsCreatingPipelineSettingValue] = useState(false);
  const pipelineSettingsNewValueInputRef = useRef(null);
  const pipelineBoardsRef = useRef([]);
  const savingByPipelineRef = useRef({});
  const newPipelineInputRef = useRef(null);
  /** Synchronous guard so blur + button cannot double-call create in one tick. */
  const isCreatingPipelineRef = useRef(false);
  const saveTimeoutRef = useRef({});
  /** Serialize saves per stage card to avoid TimestampMismatchError from overlapping API calls. */
  const saveQueueRef = useRef({});
  const stageNameInputReferences = useRef({});
  const statusRowReferences = useRef({});
  const statusInputReferences = useRef({});
  const previousStatusPositionsRef = useRef(null);
  const stageCardReferences = useRef({});
  const previousStagePositionsRef = useRef(null);
  const localReasonIdRef = useRef(0);
  const reasonRowRefs = useRef({});
  const previousReasonRowPositionsRef = useRef(null);
  const draggedReasonMetaRef = useRef(null);
  const reasonsByStatusRef = useRef({});
  /** Per (stage_status link, localId): `lost_reason` when the input was focused — used to revert duplicate labels. */
  const reasonFocusSnapshotRef = useRef({});

  const flatStages = useMemo(() => pipelineBoards.flatMap((b) => b.stages), [pipelineBoards]);

  const dropReasonModalStages = useMemo(() => {
    const pid = (dropReasonsPipelineId || '').trim();
    if (!pid) return [];
    return flatStages.filter((s) => (s.pipeline || '').trim() === pid);
  }, [flatStages, dropReasonsPipelineId]);

  const sortOptionsAlphabetically = (options) => {
    const list = Array.isArray(options) ? [...options] : [];
    return list.sort((a, b) =>
      String(a?.label ?? a?.value ?? '').localeCompare(
        String(b?.label ?? b?.value ?? ''),
        undefined,
        { sensitivity: 'base' },
      ),
    );
  };

  const filterOptionsBySearch = (options, search) => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((opt) =>
      String(opt?.label ?? opt?.value ?? '')
        .toLowerCase()
        .includes(query),
    );
  };

  const sortedLeadProductOptions = useMemo(
    () => sortOptionsAlphabetically(leadProductOptions),
    [leadProductOptions],
  );

  const sortedDropReasonOptions = useMemo(
    () => sortOptionsAlphabetically(lostReasonOptions),
    [lostReasonOptions],
  );

  const sortedLeadRelevanceOptions = useMemo(
    () => sortOptionsAlphabetically(leadRelevanceOptions),
    [leadRelevanceOptions],
  );

  const sortedLeadSizeOptions = useMemo(
    () => sortOptionsAlphabetically(leadSizeOptions),
    [leadSizeOptions],
  );

  const pipelineSettingsOptions = useMemo(() => {
    switch (pipelineSettingsActiveTab) {
      case 'product':
        return sortedLeadProductOptions;
      case 'lead-relevance':
        return sortedLeadRelevanceOptions;
      case 'lead-size':
        return sortedLeadSizeOptions;
      default:
        return sortedDropReasonOptions;
    }
  }, [
    pipelineSettingsActiveTab,
    sortedDropReasonOptions,
    sortedLeadProductOptions,
    sortedLeadRelevanceOptions,
    sortedLeadSizeOptions,
  ]);

  const filteredPipelineSettingsOptions = useMemo(
    () => filterOptionsBySearch(pipelineSettingsOptions, pipelineSettingsSearch),
    [pipelineSettingsOptions, pipelineSettingsSearch],
  );

  const pipelineSettingsModalSelection = useMemo(() => {
    switch (pipelineSettingsActiveTab) {
      case 'product':
        return pipelineSettingsProductSelection;
      case 'lead-relevance':
        return leadRelevanceModalSelection;
      case 'lead-size':
        return leadSizeModalSelection;
      default:
        return dropReasonModalSelection;
    }
  }, [
    dropReasonModalSelection,
    leadRelevanceModalSelection,
    leadSizeModalSelection,
    pipelineSettingsActiveTab,
    pipelineSettingsProductSelection,
  ]);

  const pipelineSettingsSelectionCounts = useMemo(
    () => ({
      product: pipelineSettingsProductSelection.length,
      'drop-reason': dropReasonModalSelection.length,
      'lead-relevance': leadRelevanceModalSelection.length,
      'lead-size': leadSizeModalSelection.length,
    }),
    [
      dropReasonModalSelection,
      leadRelevanceModalSelection,
      leadSizeModalSelection,
      pipelineSettingsProductSelection,
    ],
  );

  const missingPipelineSettingsTabs = useMemo(() => {
    return PIPELINE_SETTINGS_TABS.filter(
      (tab) => tab.id === 'product' && (pipelineSettingsSelectionCounts[tab.id] ?? 0) < 1,
    );
  }, [pipelineSettingsSelectionCounts]);

  const isPipelineSettingsSaveDisabled = missingPipelineSettingsTabs.length > 0;

  /**
   * Map of productDocName → pipeline display name for every product that is
   * already assigned to a pipeline OTHER than the one currently open in the
   * configure modal. Used to disable those options so a product cannot be
   * assigned to more than one pipeline simultaneously.
   */
  const productsUsedInOtherPipelines = useMemo(() => {
    const currentId = (pipelineSettingsModalId || '').trim();
    const map = {};
    for (const board of pipelineBoards) {
      if (board.name === currentId) continue;
      const displayName = String(board?.pipeline || board?.name || board.name).trim();
      for (const productDocName of board.productIds || []) {
        const key = String(productDocName || '').trim();
        if (key) map[key] = displayName;
      }
    }
    return map;
  }, [pipelineSettingsModalId, pipelineBoards]);

  const createLocalReasonId = () => {
    localReasonIdRef.current += 1;
    return `local-reason-${localReasonIdRef.current}`;
  };

  useEffect(() => {
    pipelineBoardsRef.current = pipelineBoards;
  }, [pipelineBoards]);

  useEffect(() => {
    const valid = new Set(pipelineBoards.map((b) => b.name));
    setExpandedPipelines((prev) => {
      const next = {};
      for (const id of Object.keys(prev)) {
        if (valid.has(id) && prev[id]) next[id] = true;
      }
      return next;
    });
  }, [pipelineBoards]);

  const togglePipelineExpanded = (pipelineDocId) => {
    if (!pipelineDocId) return;
    setExpandedPipelines((prev) => ({
      ...prev,
      [pipelineDocId]: !prev[pipelineDocId],
    }));
  };

  const isPipelineExpanded = (pipelineDocId) => Boolean(expandedPipelines[pipelineDocId]);

  useEffect(() => {
    savingByPipelineRef.current = savingByPipelineId;
  }, [savingByPipelineId]);

  const adjustPipelineSaveCount = (pipelineId, delta) => {
    if (!pipelineId || !delta) return;
    setSavingByPipelineId((prev) => {
      const next = { ...prev };
      const n = (next[pipelineId] || 0) + delta;
      if (n <= 0) delete next[pipelineId];
      else next[pipelineId] = n;
      return next;
    });
  };

  const withPipelineSave = async (pipelineId, fn) => {
    if (!pipelineId) {
      await fn();
      return;
    }
    adjustPipelineSaveCount(pipelineId, 1);
    try {
      await fn();
    } finally {
      adjustPipelineSaveCount(pipelineId, -1);
    }
  };

  const isPipelineSaving = (pipelineId) => (savingByPipelineId[pipelineId] ?? 0) > 0;

  const isPipelineSavingNow = (pipelineId) => (savingByPipelineRef.current[pipelineId] ?? 0) > 0;

  /** Only stage/status saves (create/update/delete + follow-up bulk index); not drag-reorder. */
  const showGlobalSyncBanner = Object.values(savingByPipelineId).some((c) => c > 0);

  useEffect(() => {
    reasonsByStatusRef.current = reasonsByStatus;
  }, [reasonsByStatus]);

  const findBoardIdForStage = (stageId) => {
    for (const b of pipelineBoardsRef.current) {
      if (b.stages.some((s) => s.id === stageId)) return b.name;
    }
    return '';
  };

  const resolvePipelineForStatusLink = (statusLink) => {
    const sl = (statusLink || '').trim();
    for (const b of pipelineBoardsRef.current) {
      for (const st of b.stages) {
        for (const row of st.statuses || []) {
          if ((row.stageStatusLink || '').trim() === sl) return b.name;
        }
      }
    }
    return '';
  };

  const setBoardStages = (pipelineDocId, updater) => {
    setPipelineBoards((boards) =>
      boards.map((board) => {
        if (board.name !== pipelineDocId) return board;
        let nextStages =
          typeof updater === 'function' ? updater(board.stages) : updater || board.stages;
        const customerStage = nextStages.find((s) => s.isCustomerStage);
        const others = nextStages.filter((s) => !s.isCustomerStage);
        nextStages = customerStage ? [...others, customerStage] : others;
        return {
          ...board,
          stages: nextStages.map((stage, index) => ({
            ...stage,
            pipeline: stage.pipeline || pipelineDocId,
            position: index,
          })),
        };
      }),
    );
  };

  const buildStagePayload = (stage) => {
    const seenNames = new Set();
    const pipelineDocId = (stage.pipeline || '').trim();
    return {
      pipeline: pipelineDocId,
      stage: stage.name.trim(),
      stage_index: stage.position,
      color: stage.color || DEFAULT_STAGE_COLOR,
      apply_to_external: Boolean(stage.applyToExternal),
      crm_stage_status: stage.statuses
        .filter((status) => status.name.trim())
        .map((status, index) => {
          const row = {
            status: status.name.trim(),
            index,
            color: status.color || getDefaultStatusColor(status.name, status.defaultType),
          };
          const link = (status.stageStatusLink || '').trim();
          if (link && !seenNames.has(link)) {
            seenNames.add(link);
            row.name = link;
          }
          return row;
        }),
    };
  };

  /** Call `bulk_update_crm_stage_index` only after drag-reorder or structural changes. */
  const persistStageOrder = async (pipelineDocId, providedStages = null) => {
    const board = pipelineBoardsRef.current.find((b) => b.name === pipelineDocId);
    if (!board && !providedStages) return;
    const stagesToUse = providedStages || board?.stages;
    if (!stagesToUse) return;

    const payload = stagesToUse
      .filter((stage) => !stage.isNew && (stage.backendName || stage.name.trim()))
      .map((stage) => ({
        stage: stage.backendName || stage.name.trim(),
        index: stage.position,
      }));

    if (payload.length === 0) return;

    try {
      await apiClient.post(`${CRM_STATUS_MASTER_API_BASE}.bulk_update_crm_stage_index`, {
        stages: payload,
      });
      setPipelineBoards((boards) =>
        boards.map((b) => {
          if (b.name !== pipelineDocId) return b;
          return {
            ...b,
            stages: b.stages.map((st) => ({
              ...st,
              _lastSavedFingerprint: computeStageSaveFingerprint(st),
              _lastSavedInputFieldFingerprint: computeStageInputFieldFingerprint(st),
            })),
          };
        }),
      );
    } catch {
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='error'
          variant='lighter'
          message='Unable to update stage order.'
        />
      ));
    }
  };

  /** Drag-reorder only: persists indices without pipeline loading overlay. */
  const saveStageOrder = (pipelineDocId) => {
    void persistStageOrder(pipelineDocId);
  };

  const saveStageToServer = async (stageId) => {
    const boardId = findBoardIdForStage(stageId);
    const board = pipelineBoardsRef.current.find((b) => b.name === boardId);
    const targetStage = board?.stages.find((stage) => stage.id === stageId);
    if (!targetStage || !boardId) return;

    const cleanStageName = targetStage.name.trim();
    if (!cleanStageName) return;

    const hasEmptyManualStatus = targetStage.statuses.some(
      (status) => !status.isDefault && !status.name.trim(),
    );
    if (hasEmptyManualStatus) return;

    const usedLinks = new Set();
    for (const s of targetStage.statuses) {
      if (!s.name.trim()) continue;
      const link = (s.stageStatusLink || '').trim();
      if (!link) continue;
      if (usedLinks.has(link)) {
        toast.custom((t) => (
          <AlertToast.Root
            t={t}
            status='error'
            variant='lighter'
            message='Row ids are out of sync. Refresh the page and try again.'
          />
        ));
        return;
      }
      usedLinks.add(link);
    }

    const applyStatusLinksFromDoc = (stage, serverDoc, backendName) => {
      let next;
      if (!serverDoc?.crm_stage_status?.length) {
        next = { ...stage, backendName, isNew: false };
      } else {
        const stageTitle = (serverDoc.stage || stage.name || '').trim();
        next = {
          ...stage,
          backendName,
          name: stageTitle || stage.name,
          color:
            serverDoc.color != null && String(serverDoc.color).trim() !== ''
              ? serverDoc.color
              : stage.color,
          pipeline: serverDoc.pipeline || stage.pipeline,
          isNew: false,
          statuses: normalizeStatusRowsFromServer(
            stageTitle,
            stage.isCustomerStage,
            serverDoc.crm_stage_status,
          ),
        };
      }
      return {
        ...next,
        _lastSavedFingerprint: computeStageSaveFingerprint(next),
        _lastSavedInputFieldFingerprint: computeStageInputFieldFingerprint(next),
      };
    };

    if (!targetStage.isNew && targetStage.backendName) {
      const fp = computeStageSaveFingerprint(targetStage);
      if (
        fp &&
        targetStage._lastSavedFingerprint != null &&
        fp === targetStage._lastSavedFingerprint
      ) {
        return;
      }
    }

    /** Apply-to-external / color / index only: no full-pipeline loading overlay. */
    const metadataOnlyPersist =
      !targetStage.isNew &&
      Boolean(targetStage.backendName) &&
      targetStage._lastSavedInputFieldFingerprint != null &&
      computeStageInputFieldFingerprint(targetStage) ===
        targetStage._lastSavedInputFieldFingerprint;

    const persistStagePayload = async () => {
      try {
        if (targetStage.isNew || !targetStage.backendName) {
          const response = await apiClient.post(
            `${CRM_STATUS_MASTER_API_BASE}.create_crm_stages`,
            buildStagePayload(targetStage),
          );
          const message = unwrapFrappeMessage(response);
          const createdName = message?.name || cleanStageName;
          const serverDoc = message?.doc;

          const currentBoard = pipelineBoardsRef.current.find((b) => b.name === boardId);
          const interimStages = currentBoard.stages.map((stage) => {
            if (stage.id !== stageId) return stage;
            return applyStatusLinksFromDoc(stage, serverDoc, createdName);
          });

          const customerStage = interimStages.find((s) => s.isCustomerStage);
          const others = interimStages.filter((s) => !s.isCustomerStage);
          let finalStages = customerStage ? [...others, customerStage] : others;
          finalStages = finalStages.map((stage, index) => ({
            ...stage,
            position: index,
          }));

          setBoardStages(boardId, finalStages);
          await persistStageOrder(boardId, finalStages);
          return;
        }

        const response = await apiClient.post(`${CRM_STATUS_MASTER_API_BASE}.update_crm_stages`, {
          name: targetStage.backendName,
          ...buildStagePayload(targetStage),
        });
        const message = unwrapFrappeMessage(response);
        const updatedName = message?.name || cleanStageName;
        const serverDoc = message?.doc;

        if (metadataOnlyPersist && serverDoc) {
          setBoardStages(boardId, (stages) =>
            stages.map((stage) => {
              if (stage.id !== stageId) return stage;
              const st = ((serverDoc.stage ?? stage.name) || '').trim();
              const next = {
                ...stage,
                backendName: updatedName,
                name: st || stage.name,
                color:
                  serverDoc.color != null && String(serverDoc.color).trim() !== ''
                    ? serverDoc.color
                    : stage.color,
                applyToExternal:
                  serverDoc.apply_to_external === undefined || serverDoc.apply_to_external === null
                    ? stage.applyToExternal
                    : Boolean(serverDoc.apply_to_external),
                pipeline: serverDoc.pipeline || stage.pipeline,
                position: toNumber(serverDoc.stage_index, stage.position),
                statuses: Array.isArray(serverDoc.crm_stage_status)
                  ? normalizeStatusRowsFromServer(
                      st || stage.name,
                      stage.isCustomerStage,
                      serverDoc.crm_stage_status,
                    )
                  : stage.statuses,
              };
              return {
                ...next,
                _lastSavedFingerprint: computeStageSaveFingerprint(next),
                _lastSavedInputFieldFingerprint: stage._lastSavedInputFieldFingerprint,
              };
            }),
          );
        } else {
          setBoardStages(boardId, (stages) =>
            stages.map((stage) => {
              if (stage.id !== stageId) return stage;
              return applyStatusLinksFromDoc(stage, serverDoc, updatedName);
            }),
          );
        }
      } catch (error) {
        const raw = error?.response?.data;
        const isTimestampMismatch =
          raw?.exc_type === 'TimestampMismatchError' ||
          (typeof raw?.exception === 'string' && raw.exception.includes('TimestampMismatchError'));

        if (isTimestampMismatch) {
          try {
            const response = await apiClient.get(
              `${CRM_STATUS_MASTER_API_BASE}.get_crm_stages_all_pipelines`,
            );
            const message = unwrapFrappeMessage(response);
            const rows = Array.isArray(message?.pipelines) ? message.pipelines : [];
            setPipelineBoards(rows.map((row) => normalizeServerBoard(row)));
            toast.custom((t) => (
              <AlertToast.Root
                t={t}
                status='warning'
                variant='lighter'
                message='Stages were refreshed from the server. Repeat your last edit if it did not apply.'
              />
            ));
          } catch {
            toast.custom((t) => (
              <AlertToast.Root
                t={t}
                status='error'
                variant='lighter'
                message='Unable to save CRM stage changes.'
              />
            ));
          }
          return;
        }

        toast.custom((t) => (
          <AlertToast.Root
            t={t}
            status='error'
            variant='lighter'
            message='Unable to save CRM stage changes.'
          />
        ));
      }
    };

    if (metadataOnlyPersist) {
      await persistStagePayload();
    } else {
      await withPipelineSave(boardId, persistStagePayload);
    }
  };

  const enqueueStageSave = (stageId) => {
    if (!stageId) return;
    const prev = saveQueueRef.current[stageId] || Promise.resolve();
    saveQueueRef.current[stageId] = prev.then(() => saveStageToServer(stageId)).catch(() => {});
  };

  const queueStageSave = (stageId, delay = 350) => {
    if (!stageId) return;

    if (saveTimeoutRef.current[stageId]) {
      clearTimeout(saveTimeoutRef.current[stageId]);
    }

    saveTimeoutRef.current[stageId] = setTimeout(() => {
      delete saveTimeoutRef.current[stageId];
      enqueueStageSave(stageId);
    }, delay);
  };

  /** Save immediately (Enter): cancel debounced save so we do not double-call the API. */
  const flushStageSave = (stageId) => {
    if (!stageId) return;
    if (saveTimeoutRef.current[stageId]) {
      clearTimeout(saveTimeoutRef.current[stageId]);
      delete saveTimeoutRef.current[stageId];
    }
    enqueueStageSave(stageId);
  };

  const withPendingReasonKey = async (key, runner) => {
    setPendingReasonKeys((current) => new Set(current).add(key));
    try {
      await runner();
    } finally {
      setPendingReasonKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  const ensureTrailingEmptyReasonRow = (rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (safeRows.length === 0 || safeRows.at(-1)?.lost_reason?.trim()) {
      return [...safeRows, { localId: createLocalReasonId(), name: null, lost_reason: '' }];
    }
    return safeRows;
  };

  const loadDropReasons = async (preferStatus = '', pipelineDocId = '') => {
    const pipelineId = (pipelineDocId || dropReasonsPipelineId || '').trim();
    if (!pipelineId) {
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='error'
          variant='lighter'
          message='Pipeline is required to load drop reasons.'
        />
      ));
      return;
    }
    try {
      const response = await apiClient.get(
        `${LOST_REASON_API_BASE}.get_lost_reasons_by_stage_status`,
        { params: { pipeline: pipelineId } },
      );
      const message = unwrapFrappeMessage(response) || {};
      const grouped = {};
      Object.entries(message).forEach(([statusName, rows]) => {
        grouped[statusName] = ensureTrailingEmptyReasonRow(
          (rows || []).map((row) => ({
            localId: row.name || createLocalReasonId(),
            name: row.name,
            lost_reason: row.lost_reason || '',
            stage: row.stage || '',
            idx: row.idx != null ? Number(row.idx) : 0,
          })),
        );
      });
      const board = pipelineBoardsRef.current.find((b) => b.name === pipelineId);
      const statusLinksFromStages = (board?.stages || []).flatMap((stage) =>
        (stage.statuses || [])
          .filter((s) => s.defaultType === 'drop' || s.defaultType === 'lost')
          .map((s) => (s.stageStatusLink || '').trim())
          .filter(Boolean),
      );
      statusLinksFromStages.forEach((linkKey) => {
        if (!grouped[linkKey]) {
          grouped[linkKey] = ensureTrailingEmptyReasonRow([]);
        }
      });
      setReasonsByStatus(grouped);
      if (preferStatus) setActiveDropStatus(preferStatus);
    } catch {
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='error'
          variant='lighter'
          message='Unable to load drop reasons.'
        />
      ));
    }
  };

  const handleConfigureDropReasons = (stageStatusLink) => {
    if (!stageStatusLink) {
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='error'
          variant='lighter'
          message='Save the stage first, then configure drop reasons.'
        />
      ));
      return;
    }
    const pipelineId = resolvePipelineForStatusLink(stageStatusLink);
    if (!pipelineId) {
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='error'
          variant='lighter'
          message='Could not resolve pipeline for this status. Save the board and try again.'
        />
      ));
      return;
    }
    setDropReasonsPipelineId(pipelineId);
    setDropReasonsOpen(true);
    setActiveDropStatus(stageStatusLink);
    void loadDropReasons(stageStatusLink, pipelineId);
  };

  const handleSelectDropStatus = (statusName) => {
    setActiveDropStatus(statusName);
    setReasonsByStatus((current) => ({
      ...current,
      [statusName]: ensureTrailingEmptyReasonRow(current[statusName] || []),
    }));
  };

  const handleReasonChange = (statusName, localId, value) => {
    setReasonsByStatus((current) => ({
      ...current,
      [statusName]: (current[statusName] || []).map((row) =>
        row.localId === localId ? { ...row, lost_reason: value } : row,
      ),
    }));
  };

  const handleReasonFocus = (statusName, localId) => {
    const rows = reasonsByStatusRef.current[statusName] || [];
    const row = rows.find((r) => r.localId === localId);
    reasonFocusSnapshotRef.current[`${statusName}:${localId}`] = row?.lost_reason ?? '';
  };

  const handleReasonBlur = async (statusName, localId) => {
    const rows = reasonsByStatus[statusName] || [];
    const target = rows.find((row) => row.localId === localId);
    if (!target) return;
    const nextValue = (target.lost_reason || '').trim();

    if (!nextValue) {
      if (target.name) {
        const key = `${statusName}:${localId}`;
        await withPendingReasonKey(key, async () => {
          await apiClient.post(`${LOST_REASON_API_BASE}.delete_lost_reason`, {
            name: target.name,
            pipeline: resolvePipelineForStatusLink(statusName) || undefined,
          });
        });
      }
      setReasonsByStatus((current) => {
        const cleaned = (current[statusName] || []).filter((row) => row.localId !== localId);
        return { ...current, [statusName]: ensureTrailingEmptyReasonRow(cleaned) };
      });
      return;
    }

    const snapKey = `${statusName}:${localId}`;
    const valueAtFocus = reasonFocusSnapshotRef.current[snapKey];
    if (normalizeDropReasonLabel(nextValue) === normalizeDropReasonLabel(valueAtFocus ?? '')) {
      return;
    }

    if (hasDuplicateDropReasonInStatus(rows, localId, nextValue)) {
      const revertTo = reasonFocusSnapshotRef.current[snapKey] ?? '';
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='error'
          variant='lighter'
          message='This drop reason already exists for this stage. Another stage in the same pipeline can use the same name.'
        />
      ));
      setReasonsByStatus((current) => ({
        ...current,
        [statusName]: (current[statusName] || []).map((row) =>
          row.localId === localId ? { ...row, lost_reason: revertTo } : row,
        ),
      }));
      return;
    }

    const key = `${statusName}:${localId}`;
    await withPendingReasonKey(key, async () => {
      const pipelineId = resolvePipelineForStatusLink(statusName);
      const response = await apiClient.post(`${LOST_REASON_API_BASE}.upsert_lost_reason`, {
        name: target.name || undefined,
        pipeline: pipelineId || undefined,
        stage_status: statusName,
        lost_reason: nextValue,
      });
      const saved = unwrapFrappeMessage(response) || {};
      setReasonsByStatus((current) => {
        const updated = (current[statusName] || []).map((row) => {
          if (row.localId !== localId) return row;
          return {
            ...row,
            name: saved.name || row.name,
            lost_reason: saved.lost_reason || nextValue,
            stage: saved.stage != null ? saved.stage : row.stage,
            idx: saved.idx != null ? Number(saved.idx) : row.idx,
          };
        });
        return {
          ...current,
          [statusName]: ensureTrailingEmptyReasonRow(updated),
        };
      });
      reasonFocusSnapshotRef.current[`${statusName}:${localId}`] = saved.lost_reason || nextValue;
    });
  };

  const handleReasonDelete = async (statusName, localId) => {
    const rows = reasonsByStatus[statusName] || [];
    const target = rows.find((row) => row.localId === localId);
    if (!target) return;
    if (target.name) {
      const key = `${statusName}:${localId}`;
      await withPendingReasonKey(key, async () => {
        await apiClient.post(`${LOST_REASON_API_BASE}.delete_lost_reason`, {
          name: target.name,
          pipeline: resolvePipelineForStatusLink(statusName) || undefined,
        });
      });
    }
    setReasonsByStatus((current) => {
      const cleaned = (current[statusName] || []).filter((row) => row.localId !== localId);
      return { ...current, [statusName]: ensureTrailingEmptyReasonRow(cleaned) };
    });
  };

  const registerDropReasonRow = (localId, element) => {
    if (element) {
      reasonRowRefs.current[localId] = element;
    } else {
      delete reasonRowRefs.current[localId];
    }
  };

  const handleDragStartReason = (statusName, localId) => {
    draggedReasonMetaRef.current = { statusName, localId };
  };

  const handleDragOverReasonReorder = (statusName, targetLocalId, event) => {
    event.preventDefault();
    const meta = draggedReasonMetaRef.current;
    if (!meta || meta.statusName !== statusName || meta.localId === targetLocalId) return;

    setReasonsByStatus((current) => {
      const rows = [...(current[statusName] || [])];
      const sourceIndex = rows.findIndex((r) => r.localId === meta.localId);
      const targetIndex = rows.findIndex((r) => r.localId === targetLocalId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;

      if (
        isReasonRowTrailingEmpty(rows, targetIndex) ||
        isReasonRowTrailingEmpty(rows, sourceIndex)
      ) {
        return current;
      }
      if (!rows[sourceIndex].name || !rows[targetIndex].name) return current;

      const targetEl = reasonRowRefs.current[targetLocalId];
      if (!targetEl) return current;

      const rect = targetEl.getBoundingClientRect();
      const midpointY = rect.top + rect.height / 2;
      const cursorY = event.clientY;
      const draggingDown = sourceIndex < targetIndex;
      const shouldReorder =
        (draggingDown && cursorY > midpointY) || (!draggingDown && cursorY < midpointY);
      if (!shouldReorder) return current;

      const previousPositions = {};
      rows.forEach((r) => {
        const el = reasonRowRefs.current[r.localId];
        if (el) previousPositions[r.localId] = el.getBoundingClientRect().top;
      });
      previousReasonRowPositionsRef.current = previousPositions;

      const reordered = [...rows];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return { ...current, [statusName]: reordered };
    });
  };

  const handleDropReasonReorder = async (statusName) => {
    draggedReasonMetaRef.current = null;
    const rows = reasonsByStatusRef.current[statusName] || [];
    const names = rows.filter((r) => r.name).map((r) => r.name);
    if (names.length < 2) return;
    try {
      const pipelineId = resolvePipelineForStatusLink(statusName);
      await apiClient.post(`${LOST_REASON_API_BASE}.reorder_lost_reasons`, {
        stage_status: statusName,
        ordered_names: names,
        pipeline: pipelineId || undefined,
      });
    } catch {
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='error'
          variant='lighter'
          message='Unable to reorder lost reasons.'
        />
      ));
      void loadDropReasons(statusName, resolvePipelineForStatusLink(statusName) || '');
    }
  };

  const registerStatusRow = (statusId, element) => {
    if (element) {
      statusRowReferences.current[statusId] = element;
    }
  };

  const registerStatusInput = (statusId, element) => {
    if (element) {
      statusInputReferences.current[statusId] = element;
    } else {
      delete statusInputReferences.current[statusId];
    }
  };

  const registerStageCard = (stageId, element) => {
    if (element) {
      stageCardReferences.current[stageId] = element;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      setPipelineBoards((boards) =>
        boards.map((board) => ({
          ...board,
          stages: board.stages.map((stage) => {
            const cardEl = stageCardReferences.current[stage.id];
            if (cardEl && !cardEl.contains(event.target)) {
              const cleanedStatuses = stage.statuses.filter(
                (status) => status.isDefault || status.name.trim(),
              );
              return { ...stage, statuses: cleanedStatuses };
            }
            return stage;
          }),
        })),
      );
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    const loadPipelineBoards = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(
          `${CRM_STATUS_MASTER_API_BASE}.get_crm_stages_all_pipelines`,
        );
        const message = unwrapFrappeMessage(response);
        const rows = Array.isArray(message?.pipelines) ? message.pipelines : [];
        if (!alive) return;
        const boards = rows.map((row) => normalizeServerBoard(row));
        setPipelineBoards(await enrichPipelineBoardsWithAttachments(boards));
      } catch {
        if (alive) {
          toast.custom((t) => (
            <AlertToast.Root
              t={t}
              status='error'
              variant='lighter'
              message='Unable to load CRM pipelines and stages.'
            />
          ));
        }
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    };

    loadPipelineBoards();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    getCrmLeadOptions()
      .then((opts) => {
        if (!alive) return;
        setLeadProductOptions(Array.isArray(opts.product) ? opts.product : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    apiClient
      .get(`${LOST_REASON_API_BASE}.get_lost_reasons_by_stage_status`)
      .then((response) => {
        if (!alive) return;
        setLostReasonOptions(normalizeLostReasonOptions(unwrapFrappeMessage(response)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    apiClient
      .get(`${LEAD_RELEVANCE_API_BASE}.get_lead_relevances`)
      .then((response) => {
        if (!alive) return;
        setLeadRelevanceOptions(
          normalizeMasterOptions(unwrapFrappeMessage(response), 'lead_relevance'),
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    apiClient
      .get(`${LEAD_SIZE_API_BASE}.get_lead_sizes`)
      .then((response) => {
        if (!alive) return;
        setLeadSizeOptions(normalizeMasterOptions(unwrapFrappeMessage(response), 'lead_size'));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const pipelineId = pipelineSettingsModalId;
    if (!pipelineId) return;

    const board = pipelineBoardsRef.current.find((b) => b.name === pipelineId);
    if (!board) return;

    if (lostReasonOptions.length > 0) {
      setDropReasonModalSelection((prev) => {
        const merged = mergePipelineModalSelection(board.lostReasonIds, lostReasonOptions, prev);
        const prevKey = [...prev].sort().join('\0');
        const nextKey = [...merged].sort().join('\0');
        return prevKey === nextKey ? prev : merged;
      });
    }

    if (leadRelevanceOptions.length > 0) {
      setLeadRelevanceModalSelection((prev) => {
        const merged = mergePipelineModalSelection(
          board.leadRelevanceIds,
          leadRelevanceOptions,
          prev,
        );
        const prevKey = [...prev].sort().join('\0');
        const nextKey = [...merged].sort().join('\0');
        return prevKey === nextKey ? prev : merged;
      });
    }

    if (leadSizeOptions.length > 0) {
      setLeadSizeModalSelection((prev) => {
        const merged = mergePipelineModalSelection(board.leadSizeIds, leadSizeOptions, prev);
        const prevKey = [...prev].sort().join('\0');
        const nextKey = [...merged].sort().join('\0');
        return prevKey === nextKey ? prev : merged;
      });
    }
  }, [pipelineSettingsModalId, lostReasonOptions, leadRelevanceOptions, leadSizeOptions]);

  useEffect(() => {
    return () => {
      Object.values(saveTimeoutRef.current).forEach((timerId) => clearTimeout(timerId));
    };
  }, []);

  const reloadPipelineBoards = async () => {
    const plRes = await apiClient.get(`${CRM_STATUS_MASTER_API_BASE}.get_crm_stages_all_pipelines`);
    const message = unwrapFrappeMessage(plRes);
    const rows = Array.isArray(message?.pipelines) ? message.pipelines : [];
    const boards = rows.map((row) => normalizeServerBoard(row));
    setPipelineBoards(await enrichPipelineBoardsWithAttachments(boards));
  };

  const clearNewPipelineDraft = () => {
    setNewPipelineTitle('');
  };

  const renamePipeline = async (docName, newTitleRaw) => {
    const newTitle = (newTitleRaw || '').trim();
    const board = pipelineBoardsRef.current.find((b) => b.name === docName);
    const previous = (board?.pipeline || board?.name || '').trim();
    if (!newTitle || newTitle === previous) return;
    setRenamingPipelineDocId(docName);
    try {
      await apiClient.post(`${CRM_STATUS_MASTER_API_BASE}.update_crm_pipeline`, {
        name: docName,
        pipeline: newTitle,
      });
      await reloadPipelineBoards();
    } catch {
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='error'
          variant='lighter'
          message='Unable to rename pipeline.'
        />
      ));
      await reloadPipelineBoards();
    } finally {
      setRenamingPipelineDocId(null);
    }
  };

  const updatePipelineColor = async (docName, nextColor) => {
    const color = (nextColor || '').trim() || DEFAULT_PIPELINE_COLOR;
    const board = pipelineBoardsRef.current.find((b) => b.name === docName);
    const previousColor = (board?.color || '').trim() || DEFAULT_PIPELINE_COLOR;
    if (color === previousColor) return;

    setPipelineBoards((boards) =>
      boards.map((b) => (b.name === docName ? { ...b, color } : b)),
    );

    try {
      await apiClient.post(`${CRM_STATUS_MASTER_API_BASE}.update_crm_pipeline`, {
        name: docName,
        color,
      });
    } catch {
      setPipelineBoards((boards) =>
        boards.map((b) => (b.name === docName ? { ...b, color: previousColor } : b)),
      );
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='error'
          variant='lighter'
          message='Unable to update pipeline color.'
        />
      ));
    }
  };

  const submitNewPipeline = async (titleFromBlur) => {
    const title = (typeof titleFromBlur === 'string' ? titleFromBlur : newPipelineTitle).trim();
    if (!title || isCreatingPipelineRef.current) return;
    isCreatingPipelineRef.current = true;
    setIsCreatingPipeline(true);
    try {
      await apiClient.post(`${CRM_STATUS_MASTER_API_BASE}.create_crm_pipeline`, {
        pipeline: title,
        color: DEFAULT_PIPELINE_COLOR,
      });
      await reloadPipelineBoards();
      setNewPipelineTitle('');
      setNewPipelineInputOpen(false);
      showSuccessToast('Pipeline created.');
    } catch (error_) {
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='error'
          variant='lighter'
          message={extractErrorMessage(error_, 'Unable to create pipeline.')}
        />
      ));
    } finally {
      // Mutex ref cleared after await; not derived from a stale render snapshot
      // eslint-disable-next-line require-atomic-updates -- ref lock, safe after async pipeline create
      isCreatingPipelineRef.current = false;
      setIsCreatingPipeline(false);
    }
  };

  const onNewPipelineInputBlur = (event) => {
    const value = (event.target?.value ?? '').trim();
    requestAnimationFrame(() => {
      if (!value) {
        clearNewPipelineDraft();
        setNewPipelineInputOpen(false);
        return;
      }
      void submitNewPipeline(value);
    });
  };

  const openNewPipelineInput = () => {
    setNewPipelineInputOpen(true);
    requestAnimationFrame(() => newPipelineInputRef.current?.focus());
  };

  const onAddPipelineButtonClick = () => {
    if (!newPipelineInputOpen) {
      openNewPipelineInput();
      return;
    }
    if (!newPipelineTitle.trim()) {
      newPipelineInputRef.current?.focus();
      return;
    }
    void submitNewPipeline();
  };

  const addStage = (pipelineDocId) => {
    if (!pipelineDocId) return;
    if (isPipelineSaving(pipelineDocId)) return;
    const nextStage = createEmptyStage(pipelineDocId);
    setBoardStages(pipelineDocId, (currentStages) => [...currentStages, nextStage]);

    requestAnimationFrame(() => {
      stageNameInputReferences.current[nextStage.id]?.focus();
    });
  };

  const closePipelineSettingsModal = () => {
    setPipelineSettingsModalId(null);
    setPipelineSettingsActiveTab('product');
    setPipelineSettingsSearch('');
    setPipelineSettingsNewValue('');
    setPipelineSettingsProductSelection([]);
    setDropReasonModalSelection([]);
    setLeadRelevanceModalSelection([]);
    setLeadSizeModalSelection([]);
  };

  const getPipelineSettingOptionsForTab = useCallback(
    (tabId) => {
      switch (tabId) {
        case 'lead-relevance':
          return leadRelevanceOptions;
        case 'lead-size':
          return leadSizeOptions;
        default:
          return lostReasonOptions;
      }
    },
    [leadRelevanceOptions, leadSizeOptions, lostReasonOptions],
  );

  const setPipelineSettingOptionsForTab = useCallback((tabId, options) => {
    switch (tabId) {
      case 'lead-relevance':
        setLeadRelevanceOptions(options);
        break;
      case 'lead-size':
        setLeadSizeOptions(options);
        break;
      default:
        setLostReasonOptions(options);
        break;
    }
  }, []);

  const appendPipelineSettingSelection = useCallback((tabId, docName) => {
    const value = String(docName || '').trim();
    if (!value) return;

    const append = (setter) => {
      setter((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.includes(value)) return list;
        return [...list, value];
      });
    };

    switch (tabId) {
      case 'lead-relevance':
        append(setLeadRelevanceModalSelection);
        break;
      case 'lead-size':
        append(setLeadSizeModalSelection);
        break;
      default:
        append(setDropReasonModalSelection);
        break;
    }
  }, []);

  const reloadPipelineSettingOptions = useCallback(
    async (tabId) => {
      const config = PIPELINE_SETTING_CREATE_CONFIG[tabId];
      if (!config) return [];
      const response = await apiClient.get(`${config.apiBase}.${config.getMethod}`);
      const options = config.normalizeOptions(unwrapFrappeMessage(response));
      setPipelineSettingOptionsForTab(tabId, options);
      return options;
    },
    [setPipelineSettingOptionsForTab],
  );

  const createPipelineSettingValue = useCallback(async () => {
    if (isCreatingPipelineSettingValue) return;
    if (pipelineSettingsActiveTab === 'product') return;

    const tabId = pipelineSettingsActiveTab;
    const config = PIPELINE_SETTING_CREATE_CONFIG[tabId];
    if (!config) return;

    const trimmedValue = pipelineSettingsNewValue.trim();
    if (!trimmedValue) {
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='error'
          variant='lighter'
          message={
            tabId === 'lead-relevance'
              ? 'Lead relevance is required'
              : tabId === 'lead-size'
                ? 'Lead size is required'
                : 'Drop reason is required'
          }
        />
      ));
      return;
    }

    const existingOptions = getPipelineSettingOptionsForTab(tabId);
    const isDuplicate = existingOptions.some(
      (opt) =>
        normalizePipelineSettingValue(opt?.label ?? opt?.value) ===
        normalizePipelineSettingValue(trimmedValue),
    );
    if (isDuplicate) {
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='error'
          variant='lighter'
          message={
            tabId === 'lead-relevance'
              ? 'This lead relevance already exists.'
              : tabId === 'lead-size'
                ? 'This lead size already exists.'
                : 'This drop reason already exists.'
          }
        />
      ));
      return;
    }

    setIsCreatingPipelineSettingValue(true);
    try {
      const response = await apiClient.post(`${config.apiBase}.${config.upsertMethod}`, {
        [config.valueField]: trimmedValue,
      });
      const savedItem = unwrapFrappeMessage(response) || {};
      const docName = String(savedItem.name ?? '').trim();
      if (!docName) {
        throw new Error('Unable to create value');
      }

      const options = await reloadPipelineSettingOptions(tabId);
      const valueToSelect =
        options.find((opt) => String(opt?.value ?? '').trim() === docName)?.value ||
        options.find(
          (opt) =>
            normalizePipelineSettingValue(opt?.label ?? opt?.value) ===
            normalizePipelineSettingValue(trimmedValue),
        )?.value ||
        docName;
      appendPipelineSettingSelection(tabId, valueToSelect);
      setPipelineSettingsNewValue('');

      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='success'
          variant='lighter'
          message={
            tabId === 'lead-relevance'
              ? 'Lead relevance created successfully.'
              : tabId === 'lead-size'
                ? 'Lead size created successfully.'
                : 'Drop reason created successfully.'
          }
        />
      ));
    } catch (error) {
      const data = error?.response?.data;
      let detail =
        tabId === 'lead-relevance'
          ? 'Unable to create lead relevance.'
          : tabId === 'lead-size'
            ? 'Unable to create lead size.'
            : 'Unable to create drop reason.';
      if (data?._server_messages) {
        try {
          const parsed = JSON.parse(data._server_messages);
          const first = JSON.parse(parsed[0]);
          if (first?.message) detail = first.message;
        } catch {
          /* noop */
        }
      } else if (typeof data?.message === 'string' && data.message.trim()) {
        detail = data.message.trim();
      }
      toast.custom((t) => (
        <AlertToast.Root t={t} status='error' variant='lighter' message={detail} />
      ));
    } finally {
      setIsCreatingPipelineSettingValue(false);
    }
  }, [
    appendPipelineSettingSelection,
    getPipelineSettingOptionsForTab,
    isCreatingPipelineSettingValue,
    pipelineSettingsActiveTab,
    pipelineSettingsNewValue,
    reloadPipelineSettingOptions,
  ]);

  const openPipelineSettings = async (pipelineDocId) => {
    if (!pipelineDocId) return;
    if (isPipelineSaving(pipelineDocId)) return;
    setPipelineSettingsModalId(pipelineDocId);
    setPipelineSettingsActiveTab('product');
    setPipelineSettingsSearch('');
    setPipelineSettingsNewValue('');

    let board = pipelineBoardsRef.current.find((b) => b.name === pipelineDocId);
    if (board) {
      const [lostReasonIds, leadRelevanceIds, leadSizeIds] = await Promise.all([
        fetchPipelineAttachmentIdsForBoard(board, PIPELINE_ATTACHMENT_CONFIG.lostReason),
        fetchPipelineAttachmentIdsForBoard(board, PIPELINE_ATTACHMENT_CONFIG.leadRelevance),
        fetchPipelineAttachmentIdsForBoard(board, PIPELINE_ATTACHMENT_CONFIG.leadSize),
      ]);
      board = {
        ...board,
        ...(lostReasonIds.length > 0 ? { lostReasonIds } : {}),
        ...(leadRelevanceIds.length > 0 ? { leadRelevanceIds } : {}),
        ...(leadSizeIds.length > 0 ? { leadSizeIds } : {}),
      };
      setPipelineBoards((boards) =>
        boards.map((b) => (b.name === pipelineDocId ? { ...b, ...board } : b)),
      );
    }

    setPipelineSettingsProductSelection(
      resolvePipelineOptionSelection(board?.productIds, leadProductOptions),
    );

    setDropReasonModalSelection(
      resolvePipelineOptionSelection(board?.lostReasonIds, lostReasonOptions),
    );
    setLeadRelevanceModalSelection(
      resolvePipelineOptionSelection(board?.leadRelevanceIds, leadRelevanceOptions),
    );
    setLeadSizeModalSelection(resolvePipelineOptionSelection(board?.leadSizeIds, leadSizeOptions));
  };

  const togglePipelineSettingsOption = (docName) => {
    const value = String(docName || '').trim();
    if (!value) return;

    const toggleList = (setter) => {
      setter((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.includes(value)) return list.filter((v) => v !== value);
        return [...list, value];
      });
    };

    switch (pipelineSettingsActiveTab) {
      case 'product':
        toggleList(setPipelineSettingsProductSelection);
        break;
      case 'lead-relevance':
        toggleList(setLeadRelevanceModalSelection);
        break;
      case 'lead-size':
        toggleList(setLeadSizeModalSelection);
        break;
      default:
        toggleList(setDropReasonModalSelection);
        break;
    }
  };

  const savePipelineSettings = async () => {
    if (!pipelineSettingsModalId) return;

    if (missingPipelineSettingsTabs.length > 0) {
      const [firstMissing] = missingPipelineSettingsTabs;
      setPipelineSettingsActiveTab(firstMissing.id);
      setPipelineSettingsSearch('');
      setPipelineSettingsNewValue('');
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='error'
          variant='lighter'
          message={`Select at least one ${firstMissing.label} option before saving.`}
        />
      ));
      return;
    }

    setIsSavingPipelineSettings(true);
    try {
      const resolvedDropReasons = resolvePipelineOptionSelection(
        dropReasonModalSelection,
        lostReasonOptions,
      );
      const resolvedLeadRelevances = resolvePipelineOptionSelection(
        leadRelevanceModalSelection,
        leadRelevanceOptions,
      );
      const resolvedLeadSizes = resolvePipelineOptionSelection(
        leadSizeModalSelection,
        leadSizeOptions,
      );
      const resolvedProducts = resolvePipelineOptionSelection(
        pipelineSettingsProductSelection,
        leadProductOptions,
      );

      const [productsResponse, lostReasonResponse, leadRelevanceResponse, leadSizeResponse] =
        await Promise.all([
          apiClient.post(`${CRM_STATUS_MASTER_API_BASE}.set_crm_pipeline_products`, {
            pipeline: pipelineSettingsModalId,
            products: resolvedProducts,
          }),
          apiClient.post(`${CRM_STATUS_MASTER_API_BASE}.set_crm_pipeline_lost_reason`, {
            pipeline: pipelineSettingsModalId,
            lost_reasons: resolvedDropReasons,
          }),
          apiClient.post(`${CRM_STATUS_MASTER_API_BASE}.set_crm_pipeline_lead_relevance`, {
            pipeline: pipelineSettingsModalId,
            lead_relevances: resolvedLeadRelevances,
          }),
          apiClient.post(`${CRM_STATUS_MASTER_API_BASE}.set_crm_pipeline_lead_size`, {
            pipeline: pipelineSettingsModalId,
            lead_sizes: resolvedLeadSizes,
          }),
        ]);

      void productsResponse;

      const fromSaveLost = normalizePipelineLostReasonIds(unwrapFrappeMessage(lostReasonResponse));
      const fromSaveRelevance = normalizePipelineLeadRelevanceIds(
        unwrapFrappeMessage(leadRelevanceResponse),
      );
      const fromSaveSize = normalizePipelineLeadSizeIds(unwrapFrappeMessage(leadSizeResponse));

      const savedProductIds = resolvedProducts;
      const savedLostReasonIds = fromSaveLost.length > 0 ? fromSaveLost : resolvedDropReasons;
      const savedLeadRelevanceIds =
        fromSaveRelevance.length > 0 ? fromSaveRelevance : resolvedLeadRelevances;
      const savedLeadSizeIds = fromSaveSize.length > 0 ? fromSaveSize : resolvedLeadSizes;

      setPipelineBoards((boards) =>
        boards.map((b) =>
          b.name === pipelineSettingsModalId
            ? {
                ...b,
                productIds: [...savedProductIds],
                lostReasonIds: [...savedLostReasonIds],
                leadRelevanceIds: [...savedLeadRelevanceIds],
                leadSizeIds: [...savedLeadSizeIds],
              }
            : b,
        ),
      );
      closePipelineSettingsModal();
      toast.custom((t) => (
        <AlertToast.Root
          t={t}
          status='success'
          variant='lighter'
          message='Pipeline CRM settings saved.'
        />
      ));
    } catch (error) {
      const data = error?.response?.data;
      let detail = 'Unable to save pipeline CRM settings.';
      if (data?._server_messages) {
        try {
          const parsed = JSON.parse(data._server_messages);
          const first = JSON.parse(parsed[0]);
          if (first?.message) detail = first.message;
        } catch {
          /* noop */
        }
      } else if (typeof data?.message === 'string' && data.message.trim()) {
        detail = data.message.trim();
      }
      toast.custom((t) => (
        <AlertToast.Root t={t} status='error' variant='lighter' message={detail} />
      ));
    } finally {
      setIsSavingPipelineSettings(false);
    }
  };

  const openCopyPipelineDialog = (pipelineDocId) => {
    if (!pipelineDocId) return;
    if (isPipelineSaving(pipelineDocId)) return;
    setCopyPipelineSourceId(pipelineDocId);
    setCopyPipelineTitle('');
  };

  const confirmCopyPipeline = async () => {
    const title = copyPipelineTitle.trim();
    const source = copyPipelineSourceId;
    if (!title || !source) return;
    setIsCopyingPipeline(true);
    try {
      await apiClient.post(`${CRM_STATUS_MASTER_API_BASE}.copy_crm_pipeline`, {
        source,
        pipeline: title,
      });
      await reloadPipelineBoards();
      setCopyPipelineSourceId(null);
      setCopyPipelineTitle('');
      toast.custom((t) => (
        <AlertToast.Root t={t} status='success' variant='lighter' message='Pipeline copied.' />
      ));
    } catch (error) {
      const data = error?.response?.data;
      let detail = 'Unable to copy pipeline.';
      if (data?._server_messages) {
        try {
          const parsed = JSON.parse(data._server_messages);
          const first = JSON.parse(parsed[0]);
          if (first?.message) detail = first.message;
        } catch {
          /* keep default */
        }
      } else if (typeof data?.message === 'string' && data.message.trim()) {
        detail = data.message.trim();
      }
      toast.custom((t) => (
        <AlertToast.Root t={t} status='error' variant='lighter' message={detail} />
      ));
    } finally {
      setIsCopyingPipeline(false);
    }
  };

  const requestPipelineDelete = (pipelineDocId) => {
    if (!pipelineDocId) return;
    if (isPipelineSaving(pipelineDocId)) return;
    setPipelineDeleteId(pipelineDocId);
  };

  const confirmDeletePipeline = async (pipelineDocId) => {
    if (!pipelineDocId) return;
    setIsDeletingPipeline(true);
    try {
      await apiClient.post(`${CRM_STATUS_MASTER_API_BASE}.delete_crm_pipeline`, {
        name: pipelineDocId,
      });
      setPipelineBoards((boards) => boards.filter((b) => b.name !== pipelineDocId));
      setPipelineDeleteId(null);
    } catch (error) {
      const data = error?.response?.data;
      let detail = 'Unable to delete pipeline.';
      if (data?._server_messages) {
        try {
          const parsed = JSON.parse(data._server_messages);
          const first = JSON.parse(parsed[0]);
          if (first?.message) detail = first.message;
        } catch {
          /* keep default */
        }
      } else if (typeof data?.message === 'string' && data.message.trim()) {
        detail = data.message.trim();
      }
      toast.custom((t) => (
        <AlertToast.Root t={t} status='error' variant='lighter' message={detail} />
      ));
    } finally {
      setIsDeletingPipeline(false);
    }
  };

  const removeStage = async (stageId) => {
    const boardId = findBoardIdForStage(stageId);
    const board = pipelineBoardsRef.current.find((b) => b.name === boardId);
    const targetStage = board?.stages.find((stage) => stage.id === stageId);

    const finalizeLocal = async (willPersistOrder = false) => {
      if (boardId) {
        const interimStages = board.stages.filter((stage) => stage.id !== stageId);
        const customerStage = interimStages.find((s) => s.isCustomerStage);
        const others = interimStages.filter((s) => !s.isCustomerStage);
        let finalStages = customerStage ? [...others, customerStage] : others;
        finalStages = finalStages.map((stage, index) => ({
          ...stage,
          position: index,
        }));

        setBoardStages(boardId, finalStages);
        if (willPersistOrder) {
          await persistStageOrder(boardId, finalStages);
        }
      }
      delete stageNameInputReferences.current[stageId];
      delete saveTimeoutRef.current[stageId];
    };

    if (targetStage?.backendName && !targetStage.isNew && boardId) {
      try {
        await apiClient.post(`${CRM_STATUS_MASTER_API_BASE}.delete_crm_stages`, {
          name: targetStage.backendName,
        });
      } catch (error) {
        const data = error?.response?.data;
        let detail = 'Unable to delete CRM stage.';
        if (data?._server_messages) {
          try {
            const parsed = JSON.parse(data._server_messages);
            const first = JSON.parse(parsed[0]);
            if (first?.message) detail = first.message;
          } catch {
            /* keep default */
          }
        } else if (typeof data?.message === 'string' && data.message.trim()) {
          detail = data.message.trim();
        }
        toast.custom((t) => (
          <AlertToast.Root t={t} status='error' variant='lighter' message={detail} />
        ));
        return;
      }
      await finalizeLocal(true);
      return;
    }

    await finalizeLocal(false);
  };

  const updateStage = (stageId, updater) => {
    const bid = findBoardIdForStage(stageId);
    if (!bid) return;
    setBoardStages(bid, (currentStages) =>
      currentStages.map((stage) => (stage.id === stageId ? updater(stage) : stage)),
    );
  };

  const onStageNameChange = (stageId, value) => {
    updateStage(stageId, (stage) => {
      if (stage.isCustomerStage) return stage;
      const cleanName = value.trim();
      const manualStatuses = stage.statuses.filter((status) => !status.isDefault);

      if (!cleanName) {
        return {
          ...stage,
          name: value,
          applyToExternal: false,
          statuses: manualStatuses,
        };
      }

      return {
        ...stage,
        name: value,
        statuses: [...buildDefaultStatuses(cleanName), ...manualStatuses],
      };
    });
  };

  const onStageNameBlur = (stageId) => {
    const bid = findBoardIdForStage(stageId);
    const targetStage = pipelineBoardsRef.current
      .find((b) => b.name === bid)
      ?.stages.find((stage) => stage.id === stageId);
    if (!targetStage) return;
    if (targetStage.isCustomerStage) {
      enqueueStageSave(stageId);
      return;
    }
    if (targetStage.name.trim()) {
      enqueueStageSave(stageId);
      return;
    }

    const hasManualStatuses = targetStage.statuses.some((status) => !status.isDefault);
    if (!hasManualStatuses) {
      removeStage(stageId);
      return;
    }

    toast.custom((t) => (
      <AlertToast.Root
        t={t}
        status='error'
        variant='lighter'
        message='Please add the stage name.'
      />
    ));

    requestAnimationFrame(() => {
      stageNameInputReferences.current[stageId]?.focus();
    });
  };

  const onStageColorChange = (stageId, color) => {
    updateStage(stageId, (stage) => ({ ...stage, color }));
    queueStageSave(stageId);
  };

  const onStatusColorChange = (stageId, statusId, color) => {
    updateStage(stageId, (stage) => ({
      ...stage,
      statuses: stage.statuses.map((status) =>
        status.id === statusId ? { ...status, color } : status,
      ),
    }));
    queueStageSave(stageId);
  };

  const onStageApplyExternalChange = (stageId, isChecked) => {
    updateStage(stageId, (stage) => ({ ...stage, applyToExternal: isChecked }));
    queueStageSave(stageId);
  };

  const onAddStatus = (stageId) => {
    const newStatusId = createId();

    updateStage(stageId, (stage) => {
      const hasManualStatuses = stage.statuses.some((status) => !status.isDefault);
      if (!stage.name.trim() && !hasManualStatuses && !stage.isCustomerStage) {
        return stage;
      }

      const newStatus = {
        id: newStatusId,
        stageStatusLink: null,
        name: '',
        color: DEFAULT_STATUS_COLOR,
        isDefault: false,
      };

      if (stage.isCustomerStage) {
        const lostIndex = stage.statuses.findIndex(
          (status) => status.isDefault && status.defaultType === 'lost',
        );
        let nextStatuses;
        if (lostIndex !== -1 && lostIndex === stage.statuses.length - 1) {
          nextStatuses = [
            ...stage.statuses.slice(0, lostIndex),
            newStatus,
            ...stage.statuses.slice(lostIndex),
          ];
        } else {
          nextStatuses = [...stage.statuses, newStatus];
        }
        return { ...stage, statuses: nextStatuses };
      }

      const dropIndex = stage.statuses.findIndex(
        (status) => status.isDefault && status.defaultType === 'drop',
      );

      let nextStatuses;
      if (dropIndex !== -1 && dropIndex === stage.statuses.length - 1) {
        nextStatuses = [
          ...stage.statuses.slice(0, dropIndex),
          newStatus,
          ...stage.statuses.slice(dropIndex),
        ];
      } else {
        nextStatuses = [...stage.statuses, newStatus];
      }

      return {
        ...stage,
        statuses: nextStatuses,
      };
    });

    requestAnimationFrame(() => {
      const inputEl = statusInputReferences.current[newStatusId];
      if (inputEl) {
        inputEl.focus();
      }
    });
  };

  const onStatusChange = (stageId, statusId, value) => {
    updateStage(stageId, (stage) => ({
      ...stage,
      statuses: stage.statuses.map((status) =>
        status.id === statusId && !status.isDefault ? { ...status, name: value } : status,
      ),
    }));
  };

  const onStageStatusBlur = (stageId) => {
    const bid = findBoardIdForStage(stageId);
    const st = pipelineBoardsRef.current
      .find((b) => b.name === bid)
      ?.stages.find((s) => s.id === stageId);
    if (!st) return;
    if (!st.name.trim() && !st.isCustomerStage) return;
    enqueueStageSave(stageId);
  };

  const onRemoveStatus = (stageId, statusId) => {
    updateStage(stageId, (stage) => ({
      ...stage,
      statuses: stage.statuses.filter((status) => status.id !== statusId),
    }));
    enqueueStageSave(stageId);
  };

  const onDragStartStage = (stageId) => {
    const bid = findBoardIdForStage(stageId);
    if (bid && isPipelineSavingNow(bid)) return;
    setDraggedStageId(stageId);
  };

  const onDragOverStage = (boardId, targetStageId, event) => {
    event.preventDefault();

    if (boardId && isPipelineSavingNow(boardId)) {
      return;
    }

    if (!draggedStageId || draggedStageId === targetStageId) {
      return;
    }
    const sourceBoardId = findBoardIdForStage(draggedStageId);
    if (sourceBoardId !== boardId) {
      return;
    }
    const board = pipelineBoardsRef.current.find((b) => b.name === boardId);
    const targetStage = board?.stages.find((s) => s.id === targetStageId);
    if (targetStage?.isCustomerStage) {
      return;
    }

    const scrollContainer = event.currentTarget;
    if (scrollContainer && scrollContainer.scrollWidth > scrollContainer.clientWidth) {
      const rect = scrollContainer.getBoundingClientRect();
      const edgeThreshold = rect.width * 0.4;
      const scrollSpeed = 60;

      if (event.clientX < rect.left + edgeThreshold) {
        scrollContainer.scrollLeft -= scrollSpeed;
      } else if (event.clientX > rect.right - edgeThreshold) {
        scrollContainer.scrollLeft += scrollSpeed;
      }
    }

    setBoardStages(boardId, (currentStages) => {
      const sourceIndex = currentStages.findIndex((stage) => stage.id === draggedStageId);
      const targetIndex = currentStages.findIndex((stage) => stage.id === targetStageId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return currentStages;
      }

      const targetEl = stageCardReferences.current[targetStageId];
      if (!targetEl) return currentStages;

      const rect = targetEl.getBoundingClientRect();
      const midpointX = rect.left + rect.width / 2;
      const cursorX = event.clientX;

      const draggingRight = sourceIndex < targetIndex;
      const shouldReorder =
        (draggingRight && cursorX > midpointX) || (!draggingRight && cursorX < midpointX);

      if (!shouldReorder) return currentStages;

      const previousPositions = {};
      currentStages.forEach((stage) => {
        const el = stageCardReferences.current[stage.id];
        if (el) {
          previousPositions[stage.id] = el.getBoundingClientRect().left;
        }
      });
      previousStagePositionsRef.current = previousPositions;

      const reordered = [...currentStages];
      const [movedStage] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, movedStage);
      return reordered;
    });
  };

  const onDropStage = (boardId) => {
    const sid = draggedStageId;
    if (!sid) {
      return;
    }
    const bid = findBoardIdForStage(sid) || boardId;
    setDraggedStageId(null);
    saveStageOrder(bid);
  };

  const onDragStartStatus = (stageId, statusId) => {
    const bid = findBoardIdForStage(stageId);
    if (bid && isPipelineSavingNow(bid)) return;
    setDraggedStatusMeta({ stageId, statusId });
  };

  const onDragOverStatus = (targetStageId, targetStatusId, event) => {
    event.preventDefault();

    if (!draggedStatusMeta) {
      return;
    }

    const { stageId: sourceStageId, statusId: sourceStatusId } = draggedStatusMeta;
    if (sourceStageId !== targetStageId || sourceStatusId === targetStatusId) {
      return;
    }

    const bid = findBoardIdForStage(targetStageId);
    if (!bid) return;
    if (isPipelineSavingNow(bid)) return;

    setBoardStages(bid, (currentStages) => {
      const targetStage = currentStages.find((stage) => stage.id === targetStageId);
      if (!targetStage) return currentStages;

      const sourceStatus = targetStage.statuses.find((status) => status.id === sourceStatusId);
      const targetStatus = targetStage.statuses.find((status) => status.id === targetStatusId);
      if (
        sourceStatus?.defaultType === 'drop' ||
        sourceStatus?.defaultType === 'lost' ||
        targetStatus?.defaultType === 'drop' ||
        targetStatus?.defaultType === 'lost'
      ) {
        return currentStages;
      }

      const sourceIndex = targetStage.statuses.findIndex((status) => status.id === sourceStatusId);
      const targetIndex = targetStage.statuses.findIndex((status) => status.id === targetStatusId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return currentStages;
      }

      const targetEl = statusRowReferences.current[targetStatusId];
      if (!targetEl) return currentStages;

      const rect = targetEl.getBoundingClientRect();
      const midpointY = rect.top + rect.height / 2;
      const cursorY = event.clientY;

      const draggingDown = sourceIndex < targetIndex;
      const shouldReorder =
        (draggingDown && cursorY > midpointY) || (!draggingDown && cursorY < midpointY);

      if (!shouldReorder) return currentStages;

      const previousPositions = {};
      targetStage.statuses.forEach((status) => {
        const el = statusRowReferences.current[status.id];
        if (el) {
          previousPositions[status.id] = el.getBoundingClientRect().top;
        }
      });
      previousStatusPositionsRef.current = previousPositions;

      return currentStages.map((stage) => {
        if (stage.id !== targetStageId) {
          return stage;
        }

        const reorderedStatuses = [...stage.statuses];
        const [movedStatus] = reorderedStatuses.splice(sourceIndex, 1);
        reorderedStatuses.splice(targetIndex, 0, movedStatus);
        return { ...stage, statuses: reorderedStatuses };
      });
    });
  };

  const onDropStatus = (stageId, event) => {
    event?.preventDefault();
    event?.stopPropagation();

    // Reordering already handled during drag over; just clear drag state
    if (draggedStatusMeta?.stageId) {
      enqueueStageSave(draggedStatusMeta.stageId);
    }
    setDraggedStatusMeta(null);
  };

  useLayoutEffect(() => {
    const previousPositions = previousStatusPositionsRef.current;
    if (!previousPositions) return;

    const animations = [];

    Object.entries(previousPositions).forEach(([statusId, previousTop]) => {
      const el = statusRowReferences.current[statusId];
      if (!el) return;

      const newTop = el.getBoundingClientRect().top;
      const deltaY = previousTop - newTop;
      if (!deltaY) return;

      el.style.transition = 'none';
      el.style.transform = `translateY(${deltaY}px)`;

      animations.push(() => {
        el.style.transition = 'transform 150ms ease';
        el.style.transform = '';
      });
    });

    if (animations.length > 0) {
      requestAnimationFrame(() => {
        animations.forEach((run) => run());
      });
    }

    previousStatusPositionsRef.current = null;
  }, [flatStages]);

  useLayoutEffect(() => {
    const previousPositions = previousStagePositionsRef.current;
    if (!previousPositions) return;

    const animations = [];

    Object.entries(previousPositions).forEach(([stageId, previousLeft]) => {
      const el = stageCardReferences.current[stageId];
      if (!el) return;

      const newLeft = el.getBoundingClientRect().left;
      const deltaX = previousLeft - newLeft;
      if (!deltaX) return;

      el.style.transition = 'none';
      el.style.transform = `translateX(${deltaX}px)`;

      animations.push(() => {
        el.style.transition = 'transform 150ms ease';
        el.style.transform = '';
      });
    });

    if (animations.length > 0) {
      requestAnimationFrame(() => {
        animations.forEach((run) => run());
      });
    }

    previousStagePositionsRef.current = null;
  }, [flatStages]);

  useLayoutEffect(() => {
    const previousPositions = previousReasonRowPositionsRef.current;
    if (!previousPositions) return;

    const animations = [];

    Object.entries(previousPositions).forEach(([localId, previousTop]) => {
      const el = reasonRowRefs.current[localId];
      if (!el) return;

      const newTop = el.getBoundingClientRect().top;
      const deltaY = previousTop - newTop;
      if (!deltaY) return;

      el.style.transition = 'none';
      el.style.transform = `translateY(${deltaY}px)`;

      animations.push(() => {
        el.style.transition = 'transform 150ms ease';
        el.style.transform = '';
      });
    });

    if (animations.length > 0) {
      requestAnimationFrame(() => {
        animations.forEach((run) => run());
      });
    }

    previousReasonRowPositionsRef.current = null;
  }, [reasonsByStatus]);

  return (
    <div className='w-full flex flex-col gap-5 pb-10'>
      <div className='w-full flex flex-col items-start gap-1'>
        <span className='text-text-main-900 text-label-sm'>CRM Stages</span>
        <span className='text-text-sub-500 text-paragraph-xs'>
          Manage stages and statuses for each pipeline. Expand a pipeline to edit its stages.
        </span>
      </div>

      {!isLoading && showGlobalSyncBanner && (
        <div
          className='flex w-full items-center gap-2.5 rounded-[10px] border border-stroke-soft-200 bg-bg-weak-100 px-3 py-2.5'
          role='status'
          aria-live='polite'
        >
          <span
            className='h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary-base border-t-transparent'
            aria-hidden
          />
          <span className='text-text-sub-500 paragraph-small'>
            Saving CRM stages… This can take a moment. Please wait before leaving this page.
          </span>
        </div>
      )}

      {isLoading && (
        <div className='w-full rounded-[10px] border border-[var(--color-stroke-soft-200)] bg-[var(--color-bg-weak-100)] p-4'>
          <span className='text-[var(--color-text-soft-400)] paragraph-small'>
            Loading pipelines and stages...
          </span>
        </div>
      )}

      {!isLoading && pipelineBoards.length === 0 && (
        <div className='w-full rounded-[10px] border border-[var(--color-stroke-soft-200)] bg-[var(--color-bg-weak-100)] p-4'>
          <span className='text-[var(--color-text-soft-400)] paragraph-small'>
            No pipelines yet. Add one to get started.
          </span>
        </div>
      )}

      {!isLoading &&
        pipelineBoards.map((board) => {
          const expanded = isPipelineExpanded(board.name);
          const selectedProductIds =
            pipelineSettingsModalId === board.name
              ? pipelineSettingsProductSelection
              : (board.productIds || []).map((id) => String(id ?? '').trim()).filter(Boolean);
          const productLabels = selectedProductIds
            .map((productId) => {
              const opt = leadProductOptions.find(
                (o) => String(o?.value ?? '').trim() === productId,
              );
              return String(opt?.label ?? opt?.value ?? productId).trim();
            })
            .filter(Boolean);
          const productBadgeLimit = expanded ? 3 : 4;
          return (
            <section
              key={board.name}
              className='relative w-full flex flex-col gap-3 rounded-[12px] border border-[var(--color-stroke-soft-200)] bg-white p-4 shadow-custom-xs'
            >
              <div className='flex w-full min-w-0 items-center justify-between gap-2'>
                <div className='flex min-w-0 flex-1 items-center gap-1.5'>
                  <button
                    type='button'
                    className='flex size-8 shrink-0 items-center justify-center rounded-lg text-text-sub-600 outline-none transition-colors hover:bg-bg-weak-100 hover:text-text-main-900 focus-visible:ring-2 focus-visible:ring-primary-base/30'
                    aria-expanded={expanded}
                    aria-controls={`pipeline-stages-${board.name}`}
                    id={`pipeline-toggle-${board.name}`}
                    title={expanded ? 'Collapse pipeline' : 'Expand pipeline'}
                    onClick={() => togglePipelineExpanded(board.name)}
                  >
                    {expanded ? (
                      <RiArrowDownSLine className='size-5' aria-hidden />
                    ) : (
                      <RiArrowRightSLine className='size-5' aria-hidden />
                    )}
                  </button>
                  <div className='flex min-w-0 flex-1 items-center gap-1'>
                    <ColorSwatchPicker
                      color={board.color}
                      fallbackColor={DEFAULT_PIPELINE_COLOR}
                      ariaLabel='Pipeline color'
                      onChange={(nextColor) => {
                        void updatePipelineColor(board.name, nextColor);
                      }}
                    />
                    <RiGitBranchLine className='size-5 shrink-0 text-text-soft-400' aria-hidden />
                    <Tooltip.Provider delayDuration={200}>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <input
                            key={board.name}
                            type='text'
                            defaultValue={board.pipeline || board.name}
                            disabled={
                              renamingPipelineDocId === board.name || isPipelineSaving(board.name)
                            }
                            aria-label='Pipeline name'
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.currentTarget.blur();
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                e.currentTarget.value = board.pipeline || board.name;
                                e.currentTarget.blur();
                              }
                            }}
                            onBlur={(e) => {
                              void renamePipeline(board.name, e.target.value);
                            }}
                            className='min-w-0 max-w-[250px] flex-1 truncate rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-text-main-900 text-label-sm font-medium outline-none transition-[border-color,box-shadow] placeholder:text-text-soft-400 hover:border-stroke-soft-200 focus:border-[var(--color-primary-base)] focus:ring-2 focus:ring-[var(--color-primary-base)]/25 focus:ring-offset-0 disabled:cursor-wait disabled:opacity-60'
                          />
                        </Tooltip.Trigger>
                        <Tooltip.Content
                          variant='dark'
                          size='xsmall'
                          side='top'
                          className='max-w-xs'
                        >
                          {board.pipeline || board.name}
                        </Tooltip.Content>
                      </Tooltip.Root>
                      {selectedProductIds.slice(0, productBadgeLimit).map((productId, index) => (
                        <Badge.Root key={productId} variant='lighter' color='gray' size='medium'>
                          <span className='paragraph-small font-medium text-text-strong-950'>
                            {productLabels[index]}
                          </span>
                        </Badge.Root>
                      ))}
                      {selectedProductIds.length > productBadgeLimit ? (
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <span className='inline-flex'>
                              <Badge.Root variant='lighter' color='gray' size='medium'>
                                <span className='paragraph-small font-medium text-text-strong-950'>
                                  +{selectedProductIds.length - productBadgeLimit}
                                </span>
                              </Badge.Root>
                            </span>
                          </Tooltip.Trigger>
                          <Tooltip.Content
                            variant='dark'
                            size='xsmall'
                            side='top'
                            className='max-w-xs'
                          >
                            <div className='flex flex-col gap-0.5'>
                              {productLabels.slice(productBadgeLimit).map((label) => (
                                <span key={label}>{label}</span>
                              ))}
                            </div>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      ) : null}
                    </Tooltip.Provider>
                  </div>
                </div>
                {expanded && (
                  <div className='flex shrink-0 items-center gap-1.5'>
                    <Button.Root
                      type='button'
                      size='small'
                      variant='neutral'
                      mode='ghost'
                      className='h-9 w-9 min-w-9 shrink-0 p-0'
                      disabled={isPipelineSaving(board.name)}
                      onClick={() => openPipelineSettings(board.name)}
                      aria-label='Configure pipeline CRM options'
                      title='Configure'
                    >
                      <Button.Icon as={RiSettings3Line} />
                    </Button.Root>
                    <Button.Root
                      type='button'
                      size='small'
                      variant='neutral'
                      mode='ghost'
                      className='h-9 w-9 min-w-9 shrink-0 p-0'
                      disabled={isPipelineSaving(board.name)}
                      onClick={() => openCopyPipelineDialog(board.name)}
                      aria-label='Copy pipeline'
                      title='Copy pipeline'
                    >
                      <Button.Icon as={RiFileCopyLine} />
                    </Button.Root>
                    <Button.Root
                      type='button'
                      size='small'
                      variant='error'
                      mode='ghost'
                      className='h-9 w-9 min-w-9 shrink-0 p-0'
                      disabled={isPipelineSaving(board.name)}
                      onClick={() => requestPipelineDelete(board.name)}
                      aria-label='Delete pipeline'
                      title='Delete pipeline'
                    >
                      <Button.Icon as={RiDeleteBinLine} />
                    </Button.Root>
                    <Button.Root
                      type='button'
                      size='small'
                      className='shrink-0 gap-2'
                      disabled={isPipelineSaving(board.name)}
                      onClick={() => addStage(board.name)}
                    >
                      <Button.Icon as={RiAddLine} />
                      Add Stage
                    </Button.Root>
                  </div>
                )}
              </div>

              {expanded && (
                <>
                  {board.stages.some(stageHasUnsavedChanges) && (
                    <div role='status' className='flex w-full items-start gap-2 px-0.5 py-1'>
                      <RiFileWarningLine
                        className='mt-0.5 size-4 shrink-0 text-error-dark'
                        aria-hidden
                      />
                      <p className='text-error-dark text-label-xs leading-snug'>
                        Press Enter in a field or click outside it to save your changes.
                      </p>
                    </div>
                  )}

                  {board.stages.length > 0 ? (
                    <div
                      id={`pipeline-stages-${board.name}`}
                      role='region'
                      aria-labelledby={`pipeline-toggle-${board.name}`}
                      className='w-full overflow-x-auto pb-2'
                    >
                      <div className='inline-flex min-w-full items-start gap-4'>
                        {board.stages.map((stage) => (
                          <StageCard
                            key={stage.id}
                            boardId={board.name}
                            stage={stage}
                            inputRef={(node) => {
                              if (node) {
                                stageNameInputReferences.current[stage.id] = node;
                              }
                            }}
                            onStageNameChange={onStageNameChange}
                            onStageNameBlur={onStageNameBlur}
                            onStageNameCommit={flushStageSave}
                            onStageColorChange={onStageColorChange}
                            onStageApplyExternalChange={onStageApplyExternalChange}
                            onRemoveStage={removeStage}
                            onAddStatus={onAddStatus}
                            onStatusChange={onStatusChange}
                            onStatusBlur={onStageStatusBlur}
                            onStatusCommit={flushStageSave}
                            onStatusColorChange={onStatusColorChange}
                            onRemoveStatus={onRemoveStatus}
                            onDragStartStage={onDragStartStage}
                            onDropStage={onDropStage}
                            onDragOverStage={onDragOverStage}
                            onDragStartStatus={onDragStartStatus}
                            onDropStatus={onDropStatus}
                            onDragOverStatus={onDragOverStatus}
                            registerStatusRow={registerStatusRow}
                            registerStatusInput={registerStatusInput}
                            registerStageCard={registerStageCard}
                            onConfigureDropReasons={handleConfigureDropReasons}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className='text-[var(--color-text-soft-400)] paragraph-small'>
                      No stages in this pipeline yet.
                    </span>
                  )}
                </>
              )}

              {isPipelineSaving(board.name) && (
                <div
                  className='absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-[12px] bg-white/80 backdrop-blur-[1px]'
                  role='status'
                  aria-live='polite'
                  aria-label='Saving stage and status changes'
                >
                  <span
                    className='h-5 w-5 animate-spin rounded-full border-2 border-primary-base border-t-transparent'
                    aria-hidden
                  />
                  <span className='text-text-sub-500 paragraph-xs'>Saving stages…</span>
                </div>
              )}
            </section>
          );
        })}

      {!isLoading && (
        <div className='flex w-full flex-col gap-2'>
          {newPipelineInputOpen && (
            <div className='flex h-10 w-full items-center gap-2 rounded-lg border-2 border-[var(--color-stroke-soft-200)] bg-white px-2.5 transition-[border-color,box-shadow] hover:border-[var(--color-stroke-sub-300)] focus-within:border-[var(--color-primary-base)] focus-within:ring-2 focus-within:ring-[var(--color-primary-base)]/30 focus-within:ring-offset-0'>
              <RiGitBranchLine className='size-5 shrink-0 text-text-soft-400' aria-hidden />
              <input
                ref={newPipelineInputRef}
                value={newPipelineTitle}
                onChange={(e) => setNewPipelineTitle(e.target.value)}
                onBlur={onNewPipelineInputBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void submitNewPipeline();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    clearNewPipelineDraft();
                    setNewPipelineInputOpen(false);
                  }
                }}
                disabled={isCreatingPipeline}
                placeholder='Add pipeline'
                autoFocus
                aria-label='New pipeline name'
                className='min-h-0 min-w-0 flex-1 border-0 bg-transparent py-2 paragraph-small text-[var(--color-text-main-900)] outline-none placeholder:text-[var(--color-text-soft-400)] disabled:opacity-60'
              />
            </div>
          )}
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='h-10 w-full gap-2'
            onMouseDown={(e) => {
              if (newPipelineInputOpen) e.preventDefault();
            }}
            onClick={onAddPipelineButtonClick}
          >
            <Button.Icon as={RiAddLine} />
            Add pipeline
          </Button.Root>
        </div>
      )}

      <PipelineCrmSettingsModal
        isOpen={pipelineSettingsModalId != null}
        onOpenChange={(open) => {
          if (!open) {
            if (isSavingPipelineSettings) return;
            closePipelineSettingsModal();
          }
        }}
        tabs={PIPELINE_SETTINGS_TABS}
        activeTab={pipelineSettingsActiveTab}
        onTabChange={(value) => {
          setPipelineSettingsActiveTab(value);
          setPipelineSettingsSearch('');
          setPipelineSettingsNewValue('');
        }}
        searchValue={pipelineSettingsSearch}
        onSearchChange={setPipelineSettingsSearch}
        options={filteredPipelineSettingsOptions}
        totalOptionsCount={pipelineSettingsOptions.length}
        selectedValues={pipelineSettingsModalSelection}
        selectionCountsByTab={pipelineSettingsSelectionCounts}
        onToggleOption={togglePipelineSettingsOption}
        isSaving={isSavingPipelineSettings}
        newValue={pipelineSettingsNewValue}
        onNewValueChange={setPipelineSettingsNewValue}
        onCommitAddValue={() => void createPipelineSettingValue()}
        isCreatingValue={isCreatingPipelineSettingValue}
        newValueInputRef={pipelineSettingsNewValueInputRef}
        selectionMode='multiple'
        disabledOptionHints={productsUsedInOtherPipelines}
        onCancel={closePipelineSettingsModal}
        saveDisabled={isPipelineSettingsSaveDisabled}
        onSave={() => void savePipelineSettings()}
      />

      <Modal.Root
        open={copyPipelineSourceId != null}
        onOpenChange={(open) => {
          if (!open) {
            if (isCopyingPipeline) return;
            setCopyPipelineSourceId(null);
            setCopyPipelineTitle('');
          }
        }}
      >
        <Modal.Content className='max-w-[440px]' showClose={false} overlayClassName='z-[100]'>
          <Modal.Header
            icon={RiFileCopyLine}
            title='Copy pipeline'
            description='The new pipeline will match this one: same stages, order, and statuses—including Customer.'
          />
          <Modal.Body className='space-y-2 pt-0'>
            <label
              className='block text-label-sm font-medium text-text-strong-950'
              htmlFor='copy-pipeline-name'
            >
              New pipeline name
            </label>
            <input
              id='copy-pipeline-name'
              type='text'
              value={copyPipelineTitle}
              onChange={(e) => setCopyPipelineTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && copyPipelineTitle.trim() && !isCopyingPipeline) {
                  e.preventDefault();
                  void confirmCopyPipeline();
                }
              }}
              placeholder='Enter name'
              autoFocus
              disabled={isCopyingPipeline}
              className='w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-label-sm text-text-main-900 outline-none transition-[border-color,box-shadow] placeholder:text-text-soft-400 focus:border-primary-base focus:ring-2 focus:ring-primary-base/20 disabled:opacity-60'
            />
          </Modal.Body>
          <Modal.Footer className='flex w-full flex-row items-center justify-end gap-3 border-t border-stroke-soft-200'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={isCopyingPipeline}
              onClick={() => {
                setCopyPipelineSourceId(null);
                setCopyPipelineTitle('');
              }}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              disabled={!copyPipelineTitle.trim() || isCopyingPipeline}
              onClick={() => void confirmCopyPipeline()}
            >
              {isCopyingPipeline ? (
                <span className='flex items-center justify-center gap-2'>
                  <span className='h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white' />
                  Creating…
                </span>
              ) : (
                'Create'
              )}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <DeleteConfirmModal
        isOpen={pipelineDeleteId != null}
        onOpenChange={(open) => {
          if (!open) {
            if (isDeletingPipeline) return;
            setPipelineDeleteId(null);
          }
        }}
        title='Delete Pipeline?'
        description='This will remove the pipeline and every stage and status under it. You cannot undo this.'
        note='If this pipeline is still in use, deletion will be blocked—contact an administrator to update configuration first.'
        item={pipelineDeleteId}
        onConfirm={confirmDeletePipeline}
        isLoading={isDeletingPipeline}
      />

      <DropReasonsModal
        isOpen={dropReasonsOpen}
        onOpenChange={(open) => {
          setDropReasonsOpen(open);
          if (!open) setDropReasonsPipelineId('');
        }}
        stages={dropReasonModalStages}
        reasonsByStatus={reasonsByStatus}
        activeStatusName={activeDropStatus}
        onSelectStatus={handleSelectDropStatus}
        onChangeReason={handleReasonChange}
        onFocusReason={handleReasonFocus}
        onBlurReason={handleReasonBlur}
        onDeleteReason={handleReasonDelete}
        onDragStartReason={handleDragStartReason}
        onDragOverReason={handleDragOverReasonReorder}
        onDropReason={handleDropReasonReorder}
        registerReasonRow={registerDropReasonRow}
        pendingKeys={pendingReasonKeys}
      />
    </div>
  );
};

export default CrmStatusMaster;
