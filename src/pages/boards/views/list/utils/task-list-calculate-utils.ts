import { getTaskFieldValue, resolveColumnFieldType } from './task-list-filter-utils';

const COUNT_OPTIONS = [
  { type: 'count_values', label: 'Count values' },
  { type: 'count_unique', label: 'Count unique values' },
  { type: 'count_empty', label: 'Count empty' },
];

const PERCENT_OPTIONS = [
  { type: 'percent_empty', label: 'Percent empty' },
  { type: 'percent_not_empty', label: 'Percent not empty' },
];

const NUMBER_OPTIONS = [
  { type: 'sum', label: 'Sum' },
  { type: 'average', label: 'Average' },
  { type: 'min', label: 'Min' },
  { type: 'max', label: 'Max' },
  { type: 'count_values', label: 'Count values' },
  { type: 'count_empty', label: 'Count empty' },
];

const SELECT_LIKE_FIELD_TYPES = new Set([
  'status',
  'priority',
  'dropdown',
  'labels',
  'tags',
  'checkbox',
]);

function isEmptyFieldValue(value, fieldType) {
  if (fieldType === 'checkbox') {
    return false;
  }

  if (value == null || value === '') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function getNormalizedValues(value, fieldType) {
  if (isEmptyFieldValue(value, fieldType)) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((entry) => entry != null && entry !== '').map((entry) => String(entry));
  }

  if (fieldType === 'checkbox') {
    return [value ? 'checked' : 'unchecked'];
  }

  return [String(value)];
}

function getNumericValues(values = []) {
  return values
    .flatMap((value) => getNormalizedValues(value, 'number'))
    .map(Number)
    .filter((entry) => !Number.isNaN(entry));
}

export function isColumnCalculable(column = {}) {
  return column.key !== 'title';
}

export function getCalculateMenuConfig(column = {}) {
  const fieldType = resolveColumnFieldType(column);

  if (fieldType === 'number') {
    return {
      nested: false,
      defaultOption: NUMBER_OPTIONS[0],
      options: NUMBER_OPTIONS,
    };
  }

  if (SELECT_LIKE_FIELD_TYPES.has(fieldType)) {
    return {
      nested: true,
      defaultOption: COUNT_OPTIONS[0],
      groups: [
        { key: 'count', label: 'Count', options: COUNT_OPTIONS },
        { key: 'percent', label: 'Percent', options: PERCENT_OPTIONS },
      ],
    };
  }

  return {
    nested: false,
    defaultOption: COUNT_OPTIONS[0],
    options: COUNT_OPTIONS,
  };
}

export function getDefaultCalculateSelection(column = {}) {
  const config = getCalculateMenuConfig(column);
  return config.defaultOption ?? COUNT_OPTIONS[0];
}

export function computeColumnCalculation(tasks = [], column, calculationType) {
  const fieldType = resolveColumnFieldType(column);
  const total = tasks.length;
  const values = tasks.map((task) => getTaskFieldValue(task, column));
  const nonEmptyValues = values.filter((value) => !isEmptyFieldValue(value, fieldType));
  const emptyCount = total - nonEmptyValues.length;

  switch (calculationType) {
    case 'count_values':
      return String(nonEmptyValues.length);
    case 'count_unique': {
      const unique = new Set();
      nonEmptyValues.forEach((value) => {
        getNormalizedValues(value, fieldType).forEach((entry) => unique.add(entry));
      });
      return String(unique.size);
    }
    case 'count_empty':
      return String(emptyCount);
    case 'percent_empty':
      return total === 0 ? '0%' : `${Math.round((emptyCount / total) * 100)}%`;
    case 'percent_not_empty':
      return total === 0 ? '0%' : `${Math.round((nonEmptyValues.length / total) * 100)}%`;
    case 'sum': {
      const numbers = getNumericValues(nonEmptyValues);
      if (numbers.length === 0) {
        return '0';
      }
      return String(numbers.reduce((sum, value) => sum + value, 0));
    }
    case 'average': {
      const numbers = getNumericValues(nonEmptyValues);
      if (numbers.length === 0) {
        return '0';
      }
      const average = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
      return String(Math.round(average * 100) / 100);
    }
    case 'min': {
      const numbers = getNumericValues(nonEmptyValues);
      return numbers.length > 0 ? String(Math.min(...numbers)) : '0';
    }
    case 'max': {
      const numbers = getNumericValues(nonEmptyValues);
      return numbers.length > 0 ? String(Math.max(...numbers)) : '0';
    }
    default:
      return '—';
  }
}

export function buildColumnCalculationResults(tasks = [], columns = [], calculations = {}) {
  const results = {};

  Object.entries(calculations).forEach(([columnKey, calculation]) => {
    const column = columns.find((entry) => entry.key === columnKey);

    if (!column || !calculation?.type) {
      return;
    }

    results[columnKey] = {
      type: calculation.type,
      label: calculation.label,
      result: computeColumnCalculation(tasks, column, calculation.type),
    };
  });

  return results;
}
