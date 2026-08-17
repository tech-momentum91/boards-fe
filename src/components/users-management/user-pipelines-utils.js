import { ALL_PIPELINE_TAB_VALUE } from '@/components/crm-leads/constants';

/** Normalize CRM lead pipeline options into `{ value, label }[]`. */
export function normalizePipelineOptions(list) {
  return (Array.isArray(list) ? list : [])
    .map((p) => {
      if (typeof p === 'string') {
        const value = p.trim();
        return value ? { value, label: value } : null;
      }
      const value = String(p?.value ?? p?.name ?? p?.pipeline ?? '').trim();
      if (!value || value === ALL_PIPELINE_TAB_VALUE) return null;
      const label = String(p?.label ?? p?.pipeline_label ?? value).trim() || value;
      return { value, label };
    })
    .filter(Boolean);
}

/**
 * Read assigned pipelines from a team-member / user list row.
 * Supports common shapes: string[], { name|value|pipeline }[], or JSON string.
 */
export function pipelinesFromUserRecord(userData) {
  if (!userData || typeof userData !== 'object') return [];

  const raw =
    userData.pipelines ??
    userData.pipeline_list ??
    userData.crm_pipelines ??
    userData.pipeline_names ??
    null;

  if (raw == null) return [];

  let list = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      list = parsed;
    } catch {
      list = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  if (!Array.isArray(list)) return [];

  return [
    ...new Set(
      list
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          return String(item?.value ?? item?.name ?? item?.pipeline ?? '').trim();
        })
        .filter((v) => v && v !== ALL_PIPELINE_TAB_VALUE),
    ),
  ];
}
