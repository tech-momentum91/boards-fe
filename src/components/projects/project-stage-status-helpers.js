import apiClient from '@/api/axios';
import { colorForProjectStage } from '@/components/projects/shared';

/** Preferred lifecycle letter order: Sales/Setup (S) → Execution (E) → Delivery/Done (D). */
const STAGE_LETTER_ORDER = { S: 0, E: 1, D: 2 };

/**
 * Sort key for Project Stages: letter group (S→E→D), then numeric suffix, then label.
 * Extra letter families fall after D and stay alphabetical.
 */
export function compareProjectStages(left, right) {
  const leftLabel = String(left?.label ?? left?.value ?? left ?? '').trim();
  const rightLabel = String(right?.label ?? right?.value ?? right ?? '').trim();

  const leftMatch = leftLabel.match(/^([A-Za-z]+)(\d*)$/);
  const rightMatch = rightLabel.match(/^([A-Za-z]+)(\d*)$/);

  const leftLetter = (leftMatch?.[1] || leftLabel.charAt(0) || '').toUpperCase();
  const rightLetter = (rightMatch?.[1] || rightLabel.charAt(0) || '').toUpperCase();

  const leftGroup = STAGE_LETTER_ORDER[leftLetter] ?? 100 + leftLetter.charCodeAt(0);
  const rightGroup = STAGE_LETTER_ORDER[rightLetter] ?? 100 + rightLetter.charCodeAt(0);
  if (leftGroup !== rightGroup) return leftGroup - rightGroup;

  const leftNum = leftMatch?.[2] ? Number(leftMatch[2]) : Number.POSITIVE_INFINITY;
  const rightNum = rightMatch?.[2] ? Number(rightMatch[2]) : Number.POSITIVE_INFINITY;
  if (leftNum !== rightNum) return leftNum - rightNum;

  return leftLabel.localeCompare(rightLabel, undefined, { numeric: true, sensitivity: 'base' });
}

export function sortProjectStageOptions(options = []) {
  return [...(options ?? [])].sort(compareProjectStages);
}

/**
 * Fetch Project Stages master options (`/resource/Project Stages`).
 * Values are document names (autoname = stage). Sorted S* → E* → D* → others.
 */
export async function fetchProjectStageOptions() {
  const { options } = await fetchProjectStageOptionsPage({
    limitStart: 0,
    limitPageLength: 999,
  });
  return sortProjectStageOptions(options);
}

/**
 * Paginated Project Stages fetch for infinite-scroll filters.
 * @returns {{ options: Array<{value: string, label: string}>, hasMore: boolean }}
 */
export async function fetchProjectStageOptionsPage({
  limitStart = 0,
  limitPageLength = 20,
  search = '',
} = {}) {
  const keyword = String(search || '').trim();
  const params = {
    fields: JSON.stringify(['name', 'stage']),
    limit_start: limitStart,
    limit_page_length: limitPageLength,
    order_by: 'stage asc',
  };
  if (keyword) {
    params.filters = JSON.stringify([['stage', 'like', `%${keyword}%`]]);
  }

  const response = await apiClient.get('/resource/Project Stages', { params });
  const rows = response.data?.data ?? [];
  const options = rows
    .map((row) => {
      const value = String(row?.name ?? '').trim();
      const label = String(row?.stage ?? row?.name ?? '').trim();
      if (!value) return null;
      return { value, label: label || value };
    })
    .filter(Boolean);

  return {
    options,
    hasMore: options.length >= limitPageLength,
  };
}

/** @deprecated Use {@link fetchProjectStageOptions}. */
export async function fetchProjectStageStatusOptions() {
  return fetchProjectStageOptions();
}

export function buildProjectStageFilterOptions(stageOptions = []) {
  return [{ value: 'all', label: 'All Stages' }, ...sortProjectStageOptions(stageOptions)];
}

export function resolveProjectStageBadgeColor(stage) {
  return colorForProjectStage(stage);
}
