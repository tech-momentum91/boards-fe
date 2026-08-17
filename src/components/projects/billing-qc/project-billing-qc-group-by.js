export const BILLING_QC_GROUP_BY_FIELD_IDS = {
  AREA: 'area',
  CATEGORY: 'category',
  FLOOR: 'floor',
};

export const BILLING_QC_GROUP_BY_OPTIONS = [
  { value: BILLING_QC_GROUP_BY_FIELD_IDS.AREA, label: 'Area' },
  { value: BILLING_QC_GROUP_BY_FIELD_IDS.CATEGORY, label: 'Category' },
  { value: BILLING_QC_GROUP_BY_FIELD_IDS.FLOOR, label: 'Floor' },
];

/** Default matches current Area → Category hierarchy ("2 fields"). */
export const BILLING_QC_DEFAULT_GROUP_BY_RULES = [
  { id: 'group-1', field: BILLING_QC_GROUP_BY_FIELD_IDS.AREA, order: 'asc' },
  { id: 'group-2', field: BILLING_QC_GROUP_BY_FIELD_IDS.CATEGORY, order: 'asc' },
];

function formatInr(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹ 0';
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll(/[^\da-z]+/g, '-')
    .replaceAll(/^-|-$/g, '');
}

function normalizeRules(rules) {
  if (!Array.isArray(rules) || rules.length === 0) return [];
  return rules
    .filter((rule) => rule?.field)
    .map((rule) => ({
      id: rule.id,
      field: rule.field,
      order: rule.order === 'desc' ? 'desc' : 'asc',
    }));
}

function computeTotals(items = []) {
  let mr = 0;
  let gmr = 0;
  let difference = 0;

  items.forEach((item) => {
    mr += Number(item.vendor_amount_value) || 0;
    gmr += Number(item.amount_value) || 0;
    difference += Number(item.difference_value) || 0;
  });

  return {
    mr: formatInr(mr),
    gmr: formatInr(gmr),
    difference: formatInr(difference),
  };
}

function flattenBillingQcRows(areas = []) {
  return (Array.isArray(areas) ? areas : []).flatMap((area) =>
    (area.categories ?? []).flatMap((category) =>
      (category.items ?? []).map((item) => ({
        item,
        areaId: area.id,
        areaName: area.name,
        floor: area.floor,
        floorBadge: area.floor_badge,
        areaCompleted: Boolean(area.isCompleted || area.completed),
        categoryId: category.id,
        categoryName: category.name || 'General',
        categoryCompleted: Boolean(category.isCompleted || category.completed),
        gmrCertified: Boolean(category.gmrCertified),
        readOnly: Boolean(category.readOnly),
        jmrId: category.jmrId ?? category.id,
        status: category.status,
      })),
    ),
  );
}

function getGroupMeta(row, field) {
  if (field === BILLING_QC_GROUP_BY_FIELD_IDS.AREA) {
    return {
      id: row.areaId || `area-${slugify(row.areaName)}`,
      label: row.areaName || 'Area',
      floor_badge: row.floorBadge,
    };
  }

  if (field === BILLING_QC_GROUP_BY_FIELD_IDS.CATEGORY) {
    return {
      id: `category-${slugify(row.categoryName)}`,
      label: row.categoryName || 'General',
      floor_badge: undefined,
    };
  }

  if (field === BILLING_QC_GROUP_BY_FIELD_IDS.FLOOR) {
    const floor = String(row.floor ?? '').trim();
    return {
      id: `floor-${floor || 'unknown'}`,
      label: row.floorBadge || floor || 'Unknown',
      floor_badge: undefined,
    };
  }

  return { id: 'unknown', label: 'Unknown', floor_badge: undefined };
}

function sortGroupEntries(entries, order) {
  const sorted = [...entries].sort((a, b) =>
    String(a.label).localeCompare(String(b.label), undefined, {
      sensitivity: 'base',
      numeric: true,
    }),
  );
  return order === 'desc' ? sorted.reverse() : sorted;
}

function buildCategoryFromRows(groupMeta, rows) {
  const items = rows.map((row) => row.item);
  const first = rows[0];
  const uniqueCategoryIds = [...new Set(rows.map((row) => row.categoryId).filter(Boolean))];
  // Prefer real JMR id when this bucket maps to a single category document.
  const categoryId = uniqueCategoryIds.length === 1 ? uniqueCategoryIds[0] : groupMeta.id;

  return {
    id: categoryId,
    name: groupMeta.label,
    jmrId: uniqueCategoryIds.length === 1 ? (first?.jmrId ?? categoryId) : undefined,
    status: first?.status,
    completed: rows.every((row) => row.categoryCompleted),
    isCompleted: rows.every((row) => row.categoryCompleted),
    gmrCertified: rows.every((row) => row.gmrCertified),
    readOnly: rows.some((row) => row.readOnly),
    items,
    ...computeTotals(items),
  };
}

/**
 * Rebuilds Billing & QC JMR area → category rows from multi group-by rules.
 * Supports up to two levels (table UI is area + category). Extra rules are ignored.
 */
export function regroupBillingQcJmrAreas(areas = [], rules = []) {
  const activeRules = normalizeRules(rules).slice(0, 2);
  const rows = flattenBillingQcRows(areas);

  if (rows.length === 0) return [];

  if (activeRules.length === 0) {
    const items = rows.map((row) => row.item);
    return [
      {
        id: 'all',
        name: 'All items',
        floor_badge: undefined,
        isCompleted: false,
        categories: [
          {
            id: 'all-items',
            name: 'Items',
            items,
            isCompleted: false,
            ...computeTotals(items),
          },
        ],
        ...computeTotals(items),
      },
    ];
  }

  const [topRule, secondRule] = activeRules;
  const topMap = new Map();

  rows.forEach((row) => {
    const meta = getGroupMeta(row, topRule.field);
    if (!topMap.has(meta.id)) {
      topMap.set(meta.id, { ...meta, rows: [] });
    }
    topMap.get(meta.id).rows.push(row);
  });

  return sortGroupEntries([...topMap.values()], topRule.order).map((top) => {
    if (!secondRule) {
      const items = top.rows.map((row) => row.item);
      return {
        id: top.id,
        name: top.label,
        floor_badge:
          topRule.field === BILLING_QC_GROUP_BY_FIELD_IDS.AREA ? top.floor_badge : undefined,
        isCompleted: top.rows.every((row) => row.areaCompleted),
        categories: [
          {
            id: `${top.id}-items`,
            name: 'Items',
            items,
            isCompleted: top.rows.every((row) => row.categoryCompleted),
            ...computeTotals(items),
          },
        ],
        ...computeTotals(items),
      };
    }

    const nestedMap = new Map();
    top.rows.forEach((row) => {
      const meta = getGroupMeta(row, secondRule.field);
      if (!nestedMap.has(meta.id)) {
        nestedMap.set(meta.id, { ...meta, rows: [] });
      }
      nestedMap.get(meta.id).rows.push(row);
    });

    const categories = sortGroupEntries([...nestedMap.values()], secondRule.order).map((nested) =>
      buildCategoryFromRows(nested, nested.rows),
    );
    const items = categories.flatMap((category) => category.items);

    return {
      id: top.id,
      name: top.label,
      floor_badge:
        topRule.field === BILLING_QC_GROUP_BY_FIELD_IDS.AREA ? top.floor_badge : undefined,
      isCompleted: categories.length > 0 && categories.every((category) => category.isCompleted),
      categories,
      ...computeTotals(items),
    };
  });
}
