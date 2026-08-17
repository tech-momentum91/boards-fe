import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const EXTRACT_STRUCTURED_METHOD = '/method/devx_ai.metadata_generator.api.extract_structured';
const APPLY_SELECTED_METHOD = '/method/devx_ai.metadata_generator.api.apply_selected_metadata';

const HIDDEN_META_FIELDS = new Set(['category']);

function unwrap(response) {
  const result = response?.data;
  if (result?.exc_type) {
    throw new Error(extractErrorMessage({ payload: result }, 'Request failed.'));
  }
  return result?.message ?? result;
}

function normalizeMetaFieldRow(row = {}) {
  const label = String(row?.label || '').trim();
  const field = String(row?.field || '').trim();
  const value = String(row?.value ?? '').trim();
  return { label, field, value };
}

function isHiddenMetaField(row) {
  const field = String(row?.field || '')
    .trim()
    .toLowerCase();
  const label = String(row?.label || '')
    .trim()
    .toLowerCase();
  return HIDDEN_META_FIELDS.has(field) || HIDDEN_META_FIELDS.has(label);
}

export function metaFieldKey(row = {}) {
  return `${String(row.label || '')
    .trim()
    .toLowerCase()}::${String(row.value ?? '')
    .trim()
    .toLowerCase()}`;
}

export function normalizeSuggestedMetaFields(rows = []) {
  const seen = new Set();
  const result = [];

  for (const raw of rows || []) {
    const row = normalizeMetaFieldRow(raw);
    if (!row.label || row.value === '' || isHiddenMetaField(row)) continue;
    const key = metaFieldKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }

  return result;
}

/**
 * Preview metafields from a description without saving them.
 */
export async function suggestProductMetaFields({ itemCode, description } = {}) {
  const trimmedDescription = String(description ?? '').trim();
  if (!itemCode && !trimmedDescription) return [];

  const payload = {};
  if (itemCode) payload.item_code = itemCode;
  if (trimmedDescription) payload.description = trimmedDescription;

  const readRows = (data) => {
    const result = unwrap({ data });
    const body = result?.data ?? result ?? {};
    return normalizeSuggestedMetaFields(body.metafields || body.meta_fields || []);
  };

  try {
    const { data } = await apiClient.post(EXTRACT_STRUCTURED_METHOD, payload);
    return readRows(data);
  } catch (postError) {
    try {
      const { data } = await apiClient.get(EXTRACT_STRUCTURED_METHOD, { params: payload });
      return readRows(data);
    } catch {
      throw postError;
    }
  }
}

/**
 * Persist user-approved metafield rows onto the Item.
 */
export async function applySelectedProductMetaFields(
  itemCode,
  metafields = [],
  { replaceExisting = false } = {},
) {
  if (!itemCode) throw new Error('Product name is required');

  const rows = normalizeSuggestedMetaFields(metafields);
  if (rows.length === 0) {
    return { written: [], writtenCount: 0 };
  }

  const { data } = await apiClient.post(APPLY_SELECTED_METHOD, {
    item_code: itemCode,
    metafields: JSON.stringify(rows),
    replace_existing: replaceExisting ? 1 : 0,
  });
  const payload = unwrap({ data });
  const body = payload?.data ?? payload ?? {};
  const written = normalizeSuggestedMetaFields(body.written || body.mapped || rows);

  return {
    written,
    writtenCount: body.written_count ?? written.length,
  };
}
