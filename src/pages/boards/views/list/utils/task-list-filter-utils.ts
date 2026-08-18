import { TASK_PRIORITY_OPTIONS } from '@/components/clients-management/constants';
import { getAssigneeDisplayName } from '@/utils/task-utils';
import { isCheckboxChecked } from './custom-field-utils';
import { getTaskErpFieldValue, isErpColumn } from './erp-column-utils';

export const FILTER_STEPS = {
  COLUMN: 'column',
  OPERATOR: 'operator',
  VALUE: 'value',
};

const TEXT_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

const TITLE_OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
];

const NUMBER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

const DATE_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

const SELECT_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

const IS_SET_OPERATORS = [
  { value: 'equals', label: 'Is' },
  { value: 'not_equals', label: 'Is not' },
  { value: 'is_not_empty', label: 'Is set' },
  { value: 'is_empty', label: 'Is not set' },
];

const PEOPLE_OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

const CHECKBOX_OPERATORS = [
  { value: 'is_checked', label: 'Is checked' },
  { value: 'is_not_checked', label: 'Is not checked' },
];

const TEXT_FIELD_TYPES = new Set(['text', 'title', 'email', 'phone', 'url', 'long-text']);

const IS_SET_OPERATOR_COLUMN_KEYS = new Set(['assignee', 'dueDate', 'priority']);

const OPERATORS_BY_FIELD_TYPE = {
  text: TEXT_OPERATORS,
  title: TITLE_OPERATORS,
  email: TEXT_OPERATORS,
  phone: TEXT_OPERATORS,
  url: TEXT_OPERATORS,
  'long-text': TEXT_OPERATORS,
  number: NUMBER_OPERATORS,
  date: DATE_OPERATORS,
  status: SELECT_OPERATORS,
  priority: IS_SET_OPERATORS,
  dropdown: SELECT_OPERATORS,
  labels: SELECT_OPERATORS,
  tags: SELECT_OPERATORS,
  people: PEOPLE_OPERATORS,
  checkbox: CHECKBOX_OPERATORS,
};

const VALUELESS_OPERATORS = new Set(['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked']);

export function resolveColumnFieldType(column = {}) {
  if (column.key === 'title') {
    return 'title';
  }

  if (column.key === 'assignee') {
    return 'people';
  }

  if (column.key === 'dueDate') {
    return 'date';
  }

  if (column.key === 'status') {
    return 'status';
  }

  if (column.key === 'priority') {
    return 'priority';
  }

  if (column.key === 'tags' && !column.custom) {
    return 'tags';
  }

  return column.fieldType || 'text';
}

export function getOperatorsForColumn(column) {
  if (column?.key === 'title') {
    return TITLE_OPERATORS;
  }

  if (IS_SET_OPERATOR_COLUMN_KEYS.has(column?.key)) {
    return IS_SET_OPERATORS;
  }

  const fieldType = resolveColumnFieldType(column);
  return OPERATORS_BY_FIELD_TYPE[fieldType] ?? TEXT_OPERATORS;
}

export function operatorNeedsValue(operator) {
  return !VALUELESS_OPERATORS.has(operator);
}

export function getTaskFieldValue(task, column, erpValuesByLink = {}) {
  if (!task || !column) {
    return '';
  }

  if (isErpColumn(column)) {
    return getTaskErpFieldValue(task, column, erpValuesByLink);
  }

  if (column.custom || !column.builtin) {
    return task.customFields?.[column.key];
  }

  switch (column.key) {
    case 'title':
      return task.title ?? '';
    case 'assignee':
      return task.assignees ?? [];
    case 'dueDate':
      return task.dueDate ?? '';
    case 'status':
      return task.status ?? '';
    case 'priority':
      return task.priority ?? '';
    case 'tags':
      return task.tags ?? [];
    case 'createdBy': {
      const createdBy = task.createdBy ?? '';
      return createdBy ? [createdBy] : [];
    }
    case 'dateCreated':
      return task.dateCreated ?? task.creation ?? '';
    case 'dateUpdated':
      return task.dateUpdated ?? task.modified ?? '';
    case 'comments':
      return task.commentCount ?? 0;
    case 'latestComment':
      return task.latestComment ?? '';
    default:
      return task.customFields?.[column.key];
  }
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function isEmptyValue(value) {
  if (value == null || value === '') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function compareTextField(fieldValue, filterValue, operator) {
  const fieldText = normalizeText(fieldValue);
  const filterText = normalizeText(filterValue);

  switch (operator) {
    case 'equals':
      return fieldText === filterText;
    case 'not_equals':
      return fieldText !== filterText;
    case 'contains':
      return fieldText.includes(filterText);
    case 'not_contains':
      return !fieldText.includes(filterText);
    case 'is_empty':
      return isEmptyValue(fieldValue);
    case 'is_not_empty':
      return !isEmptyValue(fieldValue);
    default:
      return true;
  }
}

function compareNumberField(fieldValue, filterValue, operator) {
  if (operator === 'is_empty') {
    return isEmptyValue(fieldValue);
  }

  if (operator === 'is_not_empty') {
    return !isEmptyValue(fieldValue);
  }

  const fieldNumber = Number(fieldValue);
  const filterNumber = Number(filterValue);

  if (Number.isNaN(fieldNumber) || Number.isNaN(filterNumber)) {
    return false;
  }

  switch (operator) {
    case 'equals':
      return fieldNumber === filterNumber;
    case 'not_equals':
      return fieldNumber !== filterNumber;
    case 'gt':
      return fieldNumber > filterNumber;
    case 'gte':
      return fieldNumber >= filterNumber;
    case 'lt':
      return fieldNumber < filterNumber;
    case 'lte':
      return fieldNumber <= filterNumber;
    default:
      return true;
  }
}

function compareDateField(fieldValue, filterValue, operator) {
  if (operator === 'is_empty') {
    return isEmptyValue(fieldValue);
  }

  if (operator === 'is_not_empty') {
    return !isEmptyValue(fieldValue);
  }

  const fieldDate = parseDateValue(fieldValue);
  const filterDate = parseDateValue(filterValue);

  if (!fieldDate || !filterDate) {
    return false;
  }

  const fieldTime = fieldDate.getTime();
  const filterTime = filterDate.getTime();

  switch (operator) {
    case 'equals':
      return fieldTime === filterTime;
    case 'not_equals':
      return fieldTime !== filterTime;
    case 'before':
      return fieldTime < filterTime;
    case 'after':
      return fieldTime > filterTime;
    default:
      return true;
  }
}

function comparePeopleField(fieldValue, filterValue, operator) {
  const assigneeIds = (Array.isArray(fieldValue) ? fieldValue : fieldValue ? [fieldValue] : [])
    .map(String)
    .filter(Boolean);

  if (operator === 'is_empty') {
    return assigneeIds.length === 0;
  }

  if (operator === 'is_not_empty') {
    return assigneeIds.length > 0;
  }

  const filterIds = (Array.isArray(filterValue) ? filterValue : filterValue ? [filterValue] : [])
    .map(String)
    .filter(Boolean);

  if (filterIds.length === 0) {
    return true;
  }

  const hasMatch = filterIds.some((id) => assigneeIds.includes(id));

  if (operator === 'contains' || operator === 'equals') {
    return hasMatch;
  }

  if (operator === 'not_contains' || operator === 'not_equals') {
    return !hasMatch;
  }

  return true;
}

function compareCheckboxField(fieldValue, operator) {
  const checked = isCheckboxChecked(fieldValue);

  if (operator === 'is_checked') {
    return checked;
  }

  if (operator === 'is_not_checked') {
    return !checked;
  }

  return true;
}

function compareTagsField(fieldValue, filterValue, operator) {
  const tags = (Array.isArray(fieldValue) ? fieldValue : fieldValue ? [fieldValue] : [])
    .map((tag) => (typeof tag === 'string' ? tag : tag?.label || tag?.name || tag?.tag || ''))
    .map((tag) => String(tag).trim())
    .filter(Boolean);

  if (operator === 'is_empty') {
    return tags.length === 0;
  }

  if (operator === 'is_not_empty') {
    return tags.length > 0;
  }

  const filterTags = (Array.isArray(filterValue) ? filterValue : filterValue ? [filterValue] : [])
    .map((tag) => normalizeText(tag))
    .filter(Boolean);

  if (filterTags.length === 0) {
    return true;
  }

  const normalizedTags = tags.map((tag) => normalizeText(tag));
  const hasMatch = filterTags.some((filterTag) => normalizedTags.includes(filterTag));

  if (operator === 'equals' || operator === 'contains') {
    return hasMatch;
  }

  if (operator === 'not_equals' || operator === 'not_contains') {
    return !hasMatch;
  }

  return true;
}

export function evaluateTaskAgainstFilter(task, filter, columns = []) {
  if (!filter?.columnKey || !filter?.operator) {
    return true;
  }

  const column = columns.find((item) => item.key === filter.columnKey) ?? {
    key: filter.columnKey,
    fieldType: filter.fieldType,
  };

  const fieldType = resolveColumnFieldType(column);
  const fieldValue = getTaskFieldValue(task, column);
  const { operator, value } = filter;

  if (fieldType === 'checkbox') {
    return compareCheckboxField(fieldValue, operator);
  }

  if (fieldType === 'people') {
    return comparePeopleField(fieldValue, value, operator);
  }

  if (fieldType === 'tags' && !column.custom) {
    return compareTagsField(fieldValue, value, operator);
  }

  if (fieldType === 'date') {
    return compareDateField(fieldValue, value, operator);
  }

  if (fieldType === 'number') {
    return compareNumberField(fieldValue, value, operator);
  }

  if (fieldType === 'status' || fieldType === 'priority' || fieldType === 'dropdown') {
    if (operator === 'is_empty') {
      return isEmptyValue(fieldValue);
    }

    if (operator === 'is_not_empty') {
      return !isEmptyValue(fieldValue);
    }

    const fieldText = normalizeText(fieldValue);
    const filterText = normalizeText(value);

    if (operator === 'equals') {
      return fieldText === filterText;
    }

    if (operator === 'not_equals') {
      return fieldText !== filterText;
    }

    return true;
  }

  return compareTextField(fieldValue, value, operator);
}

export function taskMatchesFieldFilters(task, filters = [], columns = []) {
  const completeFilters = getCompleteFilters(filters);

  if (completeFilters.length === 0) {
    return true;
  }

  let result = evaluateTaskAgainstFilter(task, completeFilters[0], columns);

  for (let index = 1; index < completeFilters.length; index += 1) {
    const match = evaluateTaskAgainstFilter(task, completeFilters[index], columns);
    const logicOperator = completeFilters[index].logicOperator ?? 'and';
    result = logicOperator === 'or' ? result || match : result && match;
  }

  return result;
}

export function getUniqueAssigneeOptions(tasks = []) {
  const options = new Map();

  tasks.forEach((task) => {
    (task.assigneeDetails ?? []).forEach((entry) => {
      const id = entry?.user ?? entry?.name ?? entry?.email;
      if (!id) {
        return;
      }

      options.set(String(id), getAssigneeDisplayName(entry) || String(id));
    });

    (task.assignees ?? []).forEach((assigneeId) => {
      const id = String(assigneeId);
      if (id && !options.has(id)) {
        options.set(id, id);
      }
    });
  });

  return [...options.entries()].map(([value, label]) => ({ value, label }));
}

export function getUniqueCustomFieldOptions(tasks = [], columnKey) {
  const values = new Set();

  tasks.forEach((task) => {
    const value = task.customFields?.[columnKey];
    if (value == null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null && item !== '') {
          values.add(String(item));
        }
      });
      return;
    }

    values.add(String(value));
  });

  return [...values].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value }));
}

export function getFilterValueOptions(column, tasks = [], { statusOptions = [] } = {}) {
  const fieldType = resolveColumnFieldType(column);

  if (fieldType === 'status') {
    if (statusOptions.length > 0) {
      return statusOptions.map((option) => ({
        value: option.value,
        label: option.label,
      }));
    }

    const values = new Map();
    tasks.forEach((task) => {
      if (task.status) {
        values.set(String(task.status), String(task.status));
      }
    });

    return [...values.entries()].map(([value, label]) => ({ value, label }));
  }

  if (fieldType === 'priority') {
    return TASK_PRIORITY_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }

  if (fieldType === 'people') {
    return getUniqueAssigneeOptions(tasks);
  }

  if (fieldType === 'tags' && !column.custom) {
    const values = new Set();

    tasks.forEach((task) => {
      (task.tags ?? []).forEach((tag) => {
        const label = typeof tag === 'string' ? tag : tag?.label || tag?.name || tag?.tag;
        if (label) {
          values.add(String(label));
        }
      });
    });

    return [...values].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value }));
  }

  if (fieldType === 'checkbox') {
    return [];
  }

  if (fieldType === 'dropdown' || fieldType === 'labels' || fieldType === 'tags') {
    const options = column?.config?.options ?? [];

    if (options.length > 0) {
      return options.map((option) => ({
        value: option.id,
        label: option.label,
      }));
    }
  }

  if (column.custom) {
    return getUniqueCustomFieldOptions(tasks, column.key);
  }

  return [];
}

export function formatFilterLabel(filter, columns = []) {
  const column = columns.find((item) => item.key === filter.columnKey);
  const columnLabel = column?.label ?? filter.columnKey;
  const operatorLabel =
    getOperatorsForColumn(column ?? { fieldType: filter.fieldType }).find(
      (item) => item.value === filter.operator,
    )?.label ?? filter.operator;

  if (!operatorNeedsValue(filter.operator)) {
    return `${columnLabel} ${operatorLabel}`;
  }

  const valueLabel = Array.isArray(filter.value)
    ? filter.value.join(', ')
    : String(filter.value ?? '');

  return `${columnLabel} ${operatorLabel} ${valueLabel}`;
}

export function createFilterId() {
  return `filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyFilterRow(logicOperator = 'and') {
  return {
    id: createFilterId(),
    logicOperator,
    columnKey: '',
    fieldType: '',
    operator: '',
    value: '',
  };
}

export function getDefaultOperatorForColumn(column) {
  const operators = getOperatorsForColumn(column);
  const fieldType = resolveColumnFieldType(column);

  if (fieldType === 'checkbox') {
    return operators[0]?.value ?? 'is_checked';
  }

  if (TEXT_FIELD_TYPES.has(fieldType)) {
    return operators.find((item) => item.value === 'contains')?.value ?? 'contains';
  }

  return (
    operators.find((item) => item.value === 'equals')?.value ?? operators[0]?.value ?? 'equals'
  );
}

export function getOperatorDisplayLabel(operator, column) {
  const fieldType = resolveColumnFieldType(column);
  const isSelectLike =
    fieldType === 'status' ||
    fieldType === 'priority' ||
    fieldType === 'dropdown' ||
    fieldType === 'labels' ||
    fieldType === 'tags' ||
    fieldType === 'checkbox';

  if (isSelectLike) {
    if (operator === 'equals' || operator === 'is_checked') {
      return 'Is';
    }

    if (operator === 'not_equals' || operator === 'is_not_checked') {
      return 'Is not';
    }
  }

  return getOperatorsForColumn(column).find((item) => item.value === operator)?.label ?? operator;
}

function isCompleteFilter(filter) {
  if (!filter?.columnKey || !filter?.operator) {
    return false;
  }

  if (!operatorNeedsValue(filter.operator)) {
    return true;
  }

  if (filter.value == null || filter.value === '') {
    return false;
  }

  if (Array.isArray(filter.value)) {
    return filter.value.length > 0;
  }

  return true;
}

export function getCompleteFilters(filters = []) {
  return filters.filter(isCompleteFilter);
}

export function normalizeFiltersForUi(filters = [], columns = []) {
  if (filters.length === 0) {
    return [createEmptyFilterRow()];
  }

  return filters.map((filter) => {
    const column =
      columns.find((item) => item.key === filter.columnKey) ??
      (filter.columnKey ? { key: filter.columnKey, fieldType: filter.fieldType } : null);

    let operator = filter.operator ?? '';

    if (column && operator) {
      const allowedOperators = getOperatorsForColumn(column);
      if (!allowedOperators.some((item) => item.value === operator)) {
        operator = getDefaultOperatorForColumn(column);
      }
    }

    return {
      id: filter.id || createFilterId(),
      logicOperator: filter.logicOperator ?? 'and',
      columnKey: filter.columnKey ?? '',
      fieldType: filter.fieldType ?? '',
      operator,
      value: filter.value ?? '',
    };
  });
}

export function serializeFiltersForApply(rows = []) {
  return getCompleteFilters(rows).map(
    ({ id, logicOperator, columnKey, fieldType, operator, value }) => ({
      id,
      logicOperator,
      columnKey,
      fieldType,
      operator,
      value,
    }),
  );
}
