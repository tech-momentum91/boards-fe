import { splitFullNameIntoFirstAndLast } from '@/utils/user-utils';

export function formatAmount(value) {
  if (value == null || value === '') return '–';
  const num = Number(value);
  if (Number.isNaN(num)) return '–';
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(num);
}

export function amountToEditString(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return String(num);
}

export function normalizeAmountSaveValue(value) {
  return String(value ?? '')
    .replaceAll(',', '')
    .trim();
}

/**
 * Map table column field id → updateCpContactById camelCase payload.
 * @param {string} field
 * @param {string} value
 * @returns {Record<string, string> | null}
 */
export function buildCpContactTableUpdatePayload(field, value) {
  if (field === 'name') {
    const { firstName, lastName } = splitFullNameIntoFirstAndLast(value);
    return { firstName, lastName };
  }

  if (field === 'email') {
    return { email: String(value ?? '').trim() };
  }

  if (field === 'mobileNumber' || field === 'altMobileNumber' || field === 'dateOfBirth') {
    return { [field]: String(value ?? '').trim() };
  }

  if (field === 'dob') {
    return { dateOfBirth: String(value ?? '').trim() };
  }

  if (field === 'openLeadsAmount' || field === 'wonAmount') {
    const trimmed = normalizeAmountSaveValue(value);
    const num = trimmed === '' ? 0 : Number(trimmed);
    return { [field]: Number.isNaN(num) ? 0 : num };
  }

  return { [field]: value };
}
