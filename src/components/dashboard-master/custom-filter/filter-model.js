/**
 * Data model and helpers for the Custom Filter component.
 *
 * A filter tree is a group of rules and (optionally) nested groups.
 *
 *   FilterGroup = {
 *     id: string,
 *     kind: 'group',
 *     op: 'AND' | 'OR',
 *     children: Array<FilterRule | FilterGroup>,
 *   }
 *
 *   FilterRule = {
 *     id: string,
 *     kind: 'rule',
 *     field: string | null,
 *     operator: string | null,
 *     value: any,
 *   }
 *
 * On the wire we serialise this straight to the `filters_json` blob and let the
 * backend resolve `field`/`operator`/`value` against the chosen chart's schema.
 */

const genId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
};

export function createRule(overrides = {}) {
  return {
    id: genId(),
    kind: 'rule',
    field: null,
    operator: null,
    value: '',
    ...overrides,
  };
}

export function createGroup(overrides = {}) {
  return {
    id: genId(),
    kind: 'group',
    op: 'AND',
    children: [],
    ...overrides,
  };
}

export function emptyRootGroup() {
  return createGroup({ op: 'AND', children: [] });
}

/** Recursive map — returns a new tree with `mapper(node)` applied to each. */
export function mapTree(node, mapper) {
  if (!node) return node;
  if (node.kind === 'group') {
    return mapper({
      ...node,
      children: node.children.map((c) => mapTree(c, mapper)),
    });
  }
  return mapper(node);
}

/** Replace or delete a node by id. Returns a new tree. */
export function updateNode(root, id, mutator) {
  if (!root) return root;
  if (root.id === id) return mutator(root);
  if (root.kind !== 'group') return root;
  return {
    ...root,
    children: root.children.map((c) => updateNode(c, id, mutator)).filter((c) => c !== null),
  };
}

/** Remove a node by id. */
export function removeNode(root, id) {
  return updateNode(root, id, () => null);
}

/** Add a child (rule or group) to a group by id. */
export function addChildTo(root, groupId, child) {
  return updateNode(root, groupId, (group) => {
    if (group.kind !== 'group') return group;
    return { ...group, children: [...group.children, child] };
  });
}

/** Count total leaf rules across the tree — used to gate "Clear All". */
export function countRules(node) {
  if (!node) return 0;
  if (node.kind === 'rule') return 1;
  return node.children.reduce((sum, c) => sum + countRules(c), 0);
}

// ── Operators ───────────────────────────────────────────────────────────────

export const OPERATOR_LABELS = {
  equals: 'Is',
  not_equals: 'Is not',
  in: 'In',
  not_in: 'Not in',
  contains: 'Contains',
  not_contains: "Doesn't contain",
  greater_than: 'Greater than',
  less_than: 'Less than',
  greater_than_or_equal: 'Greater than or equal',
  less_than_or_equal: 'Less than or equal',
  between: 'Between',
  is_set: 'Is set',
  is_not_set: 'Is not set',
};

const OPERATOR_MAP = {
  equals: '=',
  not_equals: '!=',
  in: 'in',
  not_in: 'not in',
  contains: 'like',
  not_contains: 'not like',
  greater_than: '>',
  less_than: '<',
  greater_than_or_equal: '>=',
  less_than_or_equal: '<=',
  between: 'between',
  is_set: 'is set',
  is_not_set: 'is not set',
};

const TEXT_FIELD_TYPES = new Set([
  'Data',
  'Small Text',
  'Text',
  'Long Text',
  'Code',
  'Text Editor',
]);
const NUMERIC_FIELD_TYPES = new Set(['Int', 'Float', 'Currency', 'Percent']);
const DATE_FIELD_TYPES = new Set(['Date', 'Datetime', 'Time']);

const FIELD_TYPE_OPERATORS = {
  Data: [
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'in',
    'not_in',
    'is_set',
    'is_not_set',
  ],
  'Small Text': [
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'in',
    'not_in',
    'is_set',
    'is_not_set',
  ],
  Text: [
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'in',
    'not_in',
    'is_set',
    'is_not_set',
  ],
  'Long Text': [
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'in',
    'not_in',
    'is_set',
    'is_not_set',
  ],
  Code: [
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'in',
    'not_in',
    'is_set',
    'is_not_set',
  ],
  'Text Editor': [
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'in',
    'not_in',
    'is_set',
    'is_not_set',
  ],
  Int: [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_than_or_equal',
    'less_than_or_equal',
    'between',
    'in',
    'not_in',
    'is_set',
    'is_not_set',
  ],
  Float: [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_than_or_equal',
    'less_than_or_equal',
    'between',
    'in',
    'not_in',
    'is_set',
    'is_not_set',
  ],
  Currency: [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_than_or_equal',
    'less_than_or_equal',
    'between',
    'in',
    'not_in',
    'is_set',
    'is_not_set',
  ],
  Percent: [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_than_or_equal',
    'less_than_or_equal',
    'between',
    'in',
    'not_in',
    'is_set',
    'is_not_set',
  ],
  Date: [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_than_or_equal',
    'less_than_or_equal',
    'between',
    'is_set',
    'is_not_set',
  ],
  Datetime: [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_than_or_equal',
    'less_than_or_equal',
    'between',
    'is_set',
    'is_not_set',
  ],
  Time: [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_than_or_equal',
    'less_than_or_equal',
    'between',
    'is_set',
    'is_not_set',
  ],
  Select: ['equals', 'not_equals', 'in', 'not_in', 'is_set', 'is_not_set'],
  Link: ['equals', 'not_equals', 'in', 'not_in', 'is_set', 'is_not_set'],
  Check: ['equals'],
};

const DEFAULT_OPERATORS = ['equals', 'not_equals', 'is_set', 'is_not_set'];

/**
 * Return operator options for a given ERPNext field type.
 * @param {string|null} fieldtype
 * @param {string[]|null} suggestedOperators - optional API-provided operator keys
 * @returns {Array<{value: string, label: string}>}
 */
export function getOperatorsForFieldType(fieldtype, suggestedOperators = null) {
  const keys =
    Array.isArray(suggestedOperators) && suggestedOperators.length > 0
      ? suggestedOperators
      : FIELD_TYPE_OPERATORS[fieldtype] || DEFAULT_OPERATORS;

  return keys.map((value) => ({
    value,
    label: OPERATOR_LABELS[value] || value,
  }));
}

export function isNoValueOperator(operator) {
  return operator === 'is_set' || operator === 'is_not_set';
}

export function isBetweenOperator(operator) {
  return operator === 'between';
}

export function isMultiValueOperator(operator) {
  return operator === 'in' || operator === 'not_in';
}

export function isTextFieldType(fieldtype) {
  return TEXT_FIELD_TYPES.has(fieldtype);
}

export function isNumericFieldType(fieldtype) {
  return NUMERIC_FIELD_TYPES.has(fieldtype);
}

export function isDateFieldType(fieldtype) {
  return DATE_FIELD_TYPES.has(fieldtype);
}

/** Operators where picking from distinct values is more useful than free text. */
export function usesDistinctValueDropdown(fieldtype, operator) {
  if (!operator || isNoValueOperator(operator) || isBetweenOperator(operator)) return false;
  if (operator === 'contains' || operator === 'not_contains') return false;
  if (fieldtype === 'Select' || fieldtype === 'Link') return true;
  if (isTextFieldType(fieldtype)) return true;
  if (isNumericFieldType(fieldtype)) return true;
  return false;
}

function normalizeRuleValue(operator, rawValue) {
  if (isNoValueOperator(operator)) return null;

  if (isBetweenOperator(operator)) {
    if (Array.isArray(rawValue)) return rawValue;
    if (typeof rawValue === 'string' && rawValue.includes(',')) {
      const parts = rawValue
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      return parts.length === 2 ? parts : rawValue;
    }
    return rawValue;
  }

  if (isMultiValueOperator(operator)) {
    if (Array.isArray(rawValue)) return rawValue;
    if (typeof rawValue === 'string') {
      return rawValue
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return rawValue == null || rawValue === '' ? [] : [rawValue];
  }

  return rawValue;
}

function serializeRule(node, doctype) {
  const { field, operator, value: rawValue } = node;
  if (!field || !operator) return null;

  const backendOp = OPERATOR_MAP[operator] ?? operator;
  let value = normalizeRuleValue(operator, rawValue);

  if (backendOp === 'like' || backendOp === 'not like') {
    value = typeof value === 'string' && value.includes('%') ? value : `%${value ?? ''}%`;
  }

  return {
    fieldname: field,
    doctype: doctype || null,
    operator: backendOp,
    value,
  };
}

function hasSerializedContent(block) {
  if (!block) return false;
  return (block.conditions?.length ?? 0) > 0 || (block.groups?.length ?? 0) > 0;
}

function serializeGroupNode(node, doctype) {
  if (!node || node.kind !== 'group') return null;

  const activeDoctype = node.doctype || doctype || null;
  const conditions = [];
  const groups = [];
  const items = [];
  let emittedCount = 0;

  node.children.forEach((child) => {
    if (child.kind === 'rule') {
      const condition = serializeRule(child, activeDoctype);
      if (condition) {
        if (emittedCount > 0) condition.logic = node.op || 'AND';
        conditions.push(condition);
        items.push({ type: 'condition', ...condition });
        emittedCount++;
      }
      return;
    }

    if (child.kind === 'group') {
      const nested = serializeGroupNode(child, activeDoctype);
      if (hasSerializedContent(nested)) {
        if (emittedCount > 0) nested.logic = node.op || 'AND';
        groups.push(nested);
        items.push({ type: 'group', ...nested });
        emittedCount++;
      }
    }
  });

  const result = { logic: node.op || 'AND' };
  if (activeDoctype) result.doctype = activeDoctype;

  const hasInterleaved =
    items.length > 1 &&
    items.some((item, index) => index > 0 && items[index - 1].type !== item.type);

  if (hasInterleaved) {
    result.items = items;
    return items.length > 0 ? result : null;
  }

  if (conditions.length > 0) result.conditions = conditions;
  if (groups.length > 0) result.groups = groups;
  return hasSerializedContent(result) ? result : null;
}

/**
 * Serialize a FilterGroup tree to the format expected by the chart query planner.
 *
 * Returns `[]` when the tree has no complete rules (safe to pass as `filters` in
 * `buildChatbotChartPayload`), or a nested `{ logic, conditions?, groups? }` object.
 *
 * @param {object} node - Root FilterGroup from filter-model
 * @param {string|null} doctype - Base doctype for rules that omit their own doctype
 */
export function serializeFilterTree(node, doctype = null) {
  if (!node || node.kind !== 'group') return [];
  const serialized = serializeGroupNode(node, doctype);
  if (!serialized) return [];

  // Backward-compatible flat shape when there are no nested groups or interleaved items
  if (!serialized.groups?.length && !serialized.items?.length) {
    return {
      logic: serialized.logic,
      conditions: serialized.conditions || [],
    };
  }

  return serialized;
}
