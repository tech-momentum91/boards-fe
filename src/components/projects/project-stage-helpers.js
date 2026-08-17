import { getStatusOptions } from '@/api/dynamic-status';
import { resolveStatusSemanticKey } from '@/components/ui/status-color-pill';

export const PROJECT_STAGE_CONFIG = {
  doctype: 'Project',
  field: 'custom_project_stage',
};

export async function fetchProjectStageOptions() {
  return getStatusOptions(PROJECT_STAGE_CONFIG);
}

export function buildProjectStageFilterOptions(stageOptions = []) {
  return [{ value: 'all', label: 'All Stages' }, ...(stageOptions ?? [])];
}

export function resolveProjectStageBadgeColor(stage, stageOptions = []) {
  const normalized = String(stage ?? '').trim();
  if (!normalized) return 'gray';

  const match = (stageOptions ?? []).find(
    (option) => String(option?.value ?? '').trim() === normalized,
  );
  const semantic = resolveStatusSemanticKey(match?.color);
  if (semantic) return semantic;

  const lower = normalized.toLowerCase();
  if (lower.startsWith('s1')) return 'blue';
  if (lower.startsWith('s2')) return 'purple';
  if (lower.startsWith('e1') || lower.startsWith('e2') || lower.startsWith('e3')) return 'orange';
  if (lower.startsWith('d1') || lower.startsWith('d2')) return 'green';
  return 'gray';
}
