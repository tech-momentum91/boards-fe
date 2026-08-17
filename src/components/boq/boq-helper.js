import {
  BOQ_EMPTY_STATES,
  BOQ_FILTER_TAB_IDS,
  DEFAULT_BOQ_TEMPLATE_FILTERS,
  DEFAULT_BOQ_TEMPLATE_FORM,
  DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS,
  DEFAULT_PROJECT_BOQ_FILTERS,
  DEFAULT_PROJECT_BOQ_FORM,
  PROJECT_BOQ_PREVIOUS_PROJECT_PREFIX,
  PROJECT_BOQ_EMPTY_STATES,
  PROJECT_BOQ_FILTER_TAB_IDS,
  PROJECT_BOQ_DEFAULT_AREA_LOCATION,
  PROJECT_BOQ_TYPES,
} from '@/components/boq/constants';
import { formatBoqCompactRupeeAmount } from '@/components/boq/boq-templates/components/boq-template-product-master-utils';
import { normalizeBoqTemplateProductRow } from '@/api/boqProductPayload';

export const EMPTY_BOQ_SORTING = [];

export const EMPTY_BOQ_FILTER_OPTIONS_BY_TAB = {
  [BOQ_FILTER_TAB_IDS.TYPE]: [],
  [BOQ_FILTER_TAB_IDS.STATUS]: [],
  [BOQ_FILTER_TAB_IDS.CATEGORY]: [],
  [BOQ_FILTER_TAB_IDS.PRODUCTS]: [],
  [BOQ_FILTER_TAB_IDS.TAGS]: [],
};

export function cloneBoqTemplateProductFilters(filters = DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS) {
  return {
    brand: [...(filters?.brand ?? [])],
    units: [...(filters?.units ?? [])],
    areaLocation: [...(filters?.areaLocation ?? [])],
    boqType: [...(filters?.boqType ?? [])],
  };
}

const SORT_FIELD_ACCESSORS = {
  templateName: (row) => row.templateName ?? '',
  code: (row) => row.code ?? '',
  status: (row) => row.status ?? '',
  type: (row) => row.type ?? '',
  sqftArea: (row) => Number(row.sqftArea) || 0,
  products: (row) => Number(row.products) || 0,
  buyTotal: (row) => row.buyTotal ?? '',
  sellTotal: (row) => row.sellTotal ?? '',
  margins: (row) => parseMarginsPercent(row.margins),
  category: (row) => row.category ?? '',
};

function parseMarginsPercent(value) {
  const raw = String(value ?? '')
    .replace('%', '')
    .trim();
  const n = Number.parseFloat(raw);
  return Number.isNaN(n) ? 0 : n;
}

export function cloneBoqTemplateFilters(filters = DEFAULT_BOQ_TEMPLATE_FILTERS) {
  return {
    type: [...(filters?.type ?? [])],
    status: [...(filters?.status ?? [])],
    category: [...(filters?.category ?? [])],
    products: [...(filters?.products ?? [])],
    tags: [...(filters?.tags ?? [])],
  };
}

export function countBoqTemplateProductFilters(filters = DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS) {
  const cloned = cloneBoqTemplateProductFilters(filters);
  return (
    cloned.brand.length + cloned.units.length + cloned.areaLocation.length + cloned.boqType.length
  );
}

export function buildBoqTemplateApiFilters(filters = DEFAULT_BOQ_TEMPLATE_FILTERS) {
  const cloned = cloneBoqTemplateFilters(filters);
  const payload = {};

  if (cloned.type.length > 0) payload.type = cloned.type;
  if (cloned.status.length > 0) payload.status = cloned.status;
  if (cloned.category.length > 0) payload.category = cloned.category;
  if (cloned.products.length > 0) payload.products = cloned.products;
  if (cloned.tags.length > 0) payload.tags = cloned.tags;

  return payload;
}

export function buildBoqTemplateOrderParams(sorting = EMPTY_BOQ_SORTING) {
  if (!Array.isArray(sorting) || sorting.length === 0) {
    return { orderBy: 'modified', orderDir: 'desc' };
  }

  const [{ id, desc }] = sorting;
  const orderBy = SORT_FIELD_ACCESSORS[id] ? id : 'modified';
  return {
    orderBy,
    orderDir: desc ? 'desc' : 'asc',
  };
}

export function normalizeBoqTemplateRow(row = {}) {
  return {
    ...row,
    id: row.id || row.code || row.name,
    sqftArea: row.sqftArea ?? '',
    buyTotal: row.buyTotal ?? '—',
    sellTotal: row.sellTotal ?? '—',
    margins: row.margins ?? '—',
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}

export function buildBoqTemplateFilterOptionsByTab(filterOptions = {}) {
  return {
    type: filterOptions.type ?? [],
    status: filterOptions.status ?? [],
    category: filterOptions.category ?? [],
    products: filterOptions.products ?? [],
    tags: filterOptions.tags ?? [],
  };
}

export function countBoqActiveFilters(filters = DEFAULT_BOQ_TEMPLATE_FILTERS) {
  return Object.values(cloneBoqTemplateFilters(filters)).reduce(
    (sum, values) => sum + (Array.isArray(values) ? values.length : 0),
    0,
  );
}

export function filterBoqTemplateProducts(products, { searchQuery, filters } = {}) {
  const query = String(searchQuery ?? '')
    .trim()
    .toLowerCase();
  const activeFilters = cloneBoqTemplateProductFilters(filters);

  return (products ?? []).filter((row) => {
    if (activeFilters.brand.length > 0) {
      const brand = String(row.brand ?? '').trim();
      if (!activeFilters.brand.includes(brand)) return false;
    }

    if (activeFilters.units.length > 0) {
      const unit = String(row.units ?? '').trim();
      if (!activeFilters.units.includes(unit)) return false;
    }

    if (activeFilters.areaLocation.length > 0) {
      const areas = String(row.areaLocation ?? row.area_location ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
      const resolvedAreas =
        areas.length > 0 ? areas : [resolveProjectBoqAreaLocation(row.areaLocation)];
      if (!activeFilters.areaLocation.some((filterArea) => resolvedAreas.includes(filterArea))) {
        return false;
      }
    }

    if (activeFilters.boqType.length > 0) {
      const boqType = String(row.boqType ?? row.boq_type ?? '').trim();
      if (!activeFilters.boqType.includes(boqType)) return false;
    }

    if (!query) return true;

    const haystack = [
      row.product,
      row.item,
      row.description,
      row.brand,
      row.section,
      row.productGroup,
      row.categoryType,
      row.areaLocation ?? row.area_location,
      row.sqft,
      row.make,
      row.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function formatMarginsDisplay(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  return raw.includes('%') ? raw : `${raw}%`;
}

export function normalizeMarginsInput(value) {
  const raw = String(value ?? '')
    .replace('%', '')
    .trim();
  if (!raw) return '';
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n)) return '';
  return `${n}%`;
}

export function resolveBoqEmptyContext({ keyword, filters }) {
  const hasFilters = Boolean(keyword?.trim()) || countBoqActiveFilters(filters) > 0;
  return hasFilters ? 'search' : 'default';
}

export function getBoqEmptyState(context = 'default') {
  return BOQ_EMPTY_STATES[context] || BOQ_EMPTY_STATES.default;
}

export function createDefaultBoqTemplateForm() {
  return {
    ...DEFAULT_BOQ_TEMPLATE_FORM,
    tags: [],
  };
}

export function formatBoqTemplateDrawerSubtitle(template) {
  const data = template ?? {};
  const parts = [];

  const code = String(data.code ?? data.id ?? '').trim();
  if (code) parts.push(code);

  const productCount = Number(data.products);
  if (!Number.isNaN(productCount)) {
    const label = productCount === 1 ? 'product' : 'products';
    parts.push(`${productCount} ${label}`);
  }

  const updated = String(data.updated ?? '').trim();
  if (updated) parts.push(updated);

  const sqftArea = data.sqftArea;
  if (sqftArea != null && sqftArea !== '') {
    parts.push(`${sqftArea} sqft`);
  }

  return parts.join(' · ');
}

/** Flatten grouped categories/sections from BOQ products API into a product list. */
export function flattenBoqProductsResponse(response) {
  const categories = response?.categories;
  if (!Array.isArray(categories)) return [];

  return categories.flatMap((category) =>
    (category.sections || []).flatMap((section) =>
      (section.products || []).map((product) =>
        normalizeBoqTemplateProductRow({
          ...product,
          categoryId: product.categoryId || category.categoryId,
          categoryType: product.categoryType || category.categoryType || category.label || '',
          categoryLabel: product.categoryLabel || category.label || '',
          categoryLetter: product.categoryLetter || category.letter || '',
          categoryGroup: product.categoryGroup || category.categoryGroup || '',
          section: product.section || product.productGroup || section.section || '',
        }),
      ),
    ),
  );
}

/** ----- Project BOQs ----- */

export const EMPTY_PROJECT_BOQ_FILTER_OPTIONS_BY_TAB = {
  [PROJECT_BOQ_FILTER_TAB_IDS.CLIENT]: [],
  [PROJECT_BOQ_FILTER_TAB_IDS.CLIENT_VALUE]: [],
};

const PROJECT_BOQ_SORT_FIELD_ACCESSORS = {
  code: (row) => row.code ?? '',
  boqName: (row) => row.boqName ?? '',
  project: (row) => row.project ?? '',
  client: (row) => row.client ?? '',
  clientValue: (row) => row.clientValue ?? '',
  boqType: (row) => row.boqType ?? '',
  version: (row) => row.version ?? '',
  updated: (row) => row.updated ?? '',
};

export function resolveProjectBoqAreaLocation(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || PROJECT_BOQ_DEFAULT_AREA_LOCATION;
}

const PROJECT_BOQ_TYPE_LABELS = {
  [PROJECT_BOQ_TYPES.DESIGN]: 'Design BOQ',
  [PROJECT_BOQ_TYPES.MAIN]: 'Main BOQ',
  [PROJECT_BOQ_TYPES.ADDITIONAL]: 'Additional BOQ',
};

export function cloneProjectBoqFilters(filters = DEFAULT_PROJECT_BOQ_FILTERS) {
  return {
    client: [...(filters?.client ?? [])],
    clientValue: [...(filters?.clientValue ?? [])],
    project: [...(filters?.project ?? [])],
    boqType: [...(filters?.boqType ?? [])],
  };
}

export function countProjectBoqActiveFilters(filters = DEFAULT_PROJECT_BOQ_FILTERS) {
  return Object.values(cloneProjectBoqFilters(filters)).reduce(
    (sum, values) => sum + (Array.isArray(values) ? values.length : 0),
    0,
  );
}

export function buildProjectBoqFilterOptionsByTab(filterOptions = {}) {
  return {
    client: filterOptions.client ?? [],
    clientValue: filterOptions.clientValue ?? [],
    project: filterOptions.project ?? [],
    boqType: filterOptions.boqType ?? filterOptions.boq_type ?? [],
  };
}

export function buildProjectBoqApiFilters(filters = DEFAULT_PROJECT_BOQ_FILTERS) {
  const cloned = cloneProjectBoqFilters(filters);
  const payload = {};

  if (cloned.client.length > 0) payload.client = cloned.client;
  if (cloned.clientValue.length > 0) payload.clientValue = cloned.clientValue;
  if (cloned.project.length > 0) payload.project = cloned.project;
  if (cloned.boqType.length > 0) payload.boqType = cloned.boqType;

  return payload;
}

export function buildProjectBoqOrderParams(sorting = EMPTY_BOQ_SORTING) {
  if (!Array.isArray(sorting) || sorting.length === 0) {
    return { orderBy: 'modified', orderDir: 'desc' };
  }

  const [{ id, desc }] = sorting;
  const orderBy = PROJECT_BOQ_SORT_FIELD_ACCESSORS[id] ? id : 'modified';
  return {
    orderBy,
    orderDir: desc ? 'desc' : 'asc',
  };
}

export function applyProjectBoqClientFilters(rows = [], filters = DEFAULT_PROJECT_BOQ_FILTERS) {
  const cloned = cloneProjectBoqFilters(filters);

  return rows.filter((row) => {
    if (
      cloned.client.length > 0 &&
      !cloned.client.includes(row.clientId) &&
      !cloned.client.includes(row.client)
    ) {
      return false;
    }
    if (cloned.clientValue.length > 0 && !cloned.clientValue.includes(row.clientValue))
      return false;
    if (
      cloned.project.length > 0 &&
      !cloned.project.includes(row.projectId) &&
      !cloned.project.includes(row.project)
    ) {
      return false;
    }
    if (cloned.boqType.length > 0 && !cloned.boqType.includes(row.boqType)) return false;
    return true;
  });
}

export function filterProjectBoqsByKeyword(rows = [], keyword = '') {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return rows;

  return rows.filter((row) => {
    const haystack = [
      row.code,
      row.boqName,
      row.project,
      row.client,
      row.clientValue,
      row.version,
      PROJECT_BOQ_TYPE_LABELS[row.boqType],
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function sortProjectBoqRows(rows = [], sorting = EMPTY_BOQ_SORTING) {
  if (!Array.isArray(sorting) || sorting.length === 0) return rows;

  const [{ id, desc }] = sorting;
  const accessor = PROJECT_BOQ_SORT_FIELD_ACCESSORS[id];
  if (!accessor) return rows;

  const sorted = [...rows].sort((a, b) => {
    const aVal = accessor(a);
    const bVal = accessor(b);
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return aVal - bVal;
    }
    return String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
  });

  return desc ? sorted.reverse() : sorted;
}

export function normalizeProjectBoqRow(row = {}) {
  const clientValueRaw = row.clientValue ?? row.sellTotal;
  const clientValue =
    typeof clientValueRaw === 'number'
      ? formatBoqCompactRupeeAmount(clientValueRaw)
      : (row.clientValue ?? '—');

  return {
    ...row,
    id: row.id || row.code || row.name,
    clientValue,
    version: row.version ?? 'v1',
    familyLabel: row.familyLabel || row.boqName || '',
  };
}

export function resolveProjectBoqEmptyContext({ keyword, filters }) {
  const hasFilters = Boolean(keyword?.trim()) || countProjectBoqActiveFilters(filters) > 0;
  return hasFilters ? 'search' : 'default';
}

export function getProjectBoqEmptyState(context = 'default') {
  return PROJECT_BOQ_EMPTY_STATES[context] || PROJECT_BOQ_EMPTY_STATES.default;
}

export function createDefaultProjectBoqForm(boqType = '') {
  return {
    ...DEFAULT_PROJECT_BOQ_FORM,
    boqType,
  };
}

export function parseProjectBoqTemplateSelection(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return { sourceTemplate: '', sourceProject: '' };
  }
  if (raw.startsWith(PROJECT_BOQ_PREVIOUS_PROJECT_PREFIX)) {
    return {
      sourceTemplate: '',
      sourceProject: raw.slice(PROJECT_BOQ_PREVIOUS_PROJECT_PREFIX.length),
    };
  }
  return { sourceTemplate: raw, sourceProject: '' };
}

export function buildProjectBoqCreatePayload(form) {
  const { sourceTemplate, sourceProject } = parseProjectBoqTemplateSelection(form.boqTemplate);
  const payload = {
    boqType: form.boqType,
    client: form.client,
    project: form.project,
    description: form.description,
  };

  if (sourceTemplate) {
    payload.boqTemplate = sourceTemplate;
  }
  if (sourceProject) {
    payload.sourceProject = sourceProject;
  }
  if (form.familyId || form.family_id) {
    payload.familyId = form.familyId || form.family_id;
  }

  return payload;
}

export function mapPreviousProjectsToBoqOptions(projects = [], { excludeProjectId } = {}) {
  const excluded = String(excludeProjectId || '').trim();
  return projects
    .filter((project) => {
      const projectId = String(project.projectId || project.id || '').trim();
      return projectId && projectId !== excluded;
    })
    .map((project) => {
      const projectId = String(project.projectId || project.id || '').trim();
      const name = String(project.name || projectId).trim();
      const client = String(project.client || '').trim();
      const city = String(project.city || '').trim();
      const labelParts = [name];
      if (client) labelParts.push(client);
      if (city) labelParts.push(city);

      return {
        value: `${PROJECT_BOQ_PREVIOUS_PROJECT_PREFIX}${projectId}`,
        label: labelParts.join(' · '),
        projectId,
      };
    });
}

export function formatProjectBoqDrawerSubtitle(boq) {
  const data = boq ?? {};
  const parts = [];

  const typeLabel = PROJECT_BOQ_TYPE_LABELS[data.boqType];
  if (typeLabel) parts.push(typeLabel);

  const version = String(data.version ?? '').trim();
  if (version) parts.push(version);

  const status = String(data.status ?? '').trim();
  if (status) parts.push(status);

  return parts.join(' · ');
}

export function getProjectBoqDetailTitle(boq) {
  const data = boq ?? {};
  return (
    String(data.projectTitle ?? data.project ?? data.boqName ?? 'Untitled BOQ').trim() ||
    'Untitled BOQ'
  );
}

export function formatProjectBoqDetailSubtitle(boq, { productCount = 0, floorsLabel = '' } = {}) {
  const data = boq ?? {};
  const parts = [];

  const code = String(data.code ?? '').trim();
  if (code) parts.push(code);

  const floors = String(floorsLabel || data.floors || '').trim();
  if (floors) parts.push(floors);

  const count = Number(productCount) || 0;
  parts.push(`${count} ${count === 1 ? 'product' : 'products'}`);

  const date = String(data.detailDate ?? data.updated ?? '').trim();
  if (date) parts.push(date);

  return parts.join(' · ');
}

export function getProjectBoqTypeLabel(boqType) {
  return PROJECT_BOQ_TYPE_LABELS[boqType] ?? boqType ?? '';
}

function buildProjectBoqFamilyBadgeLabel(child, { additionalIndex = 0 } = {}) {
  if (child.boqType === PROJECT_BOQ_TYPES.ADDITIONAL) {
    return `Additional BOQ-${additionalIndex}`;
  }
  return getProjectBoqTypeLabel(child.boqType);
}

const PROJECT_BOQ_BADGE_TYPE_ORDER = {
  [PROJECT_BOQ_TYPES.DESIGN]: 0,
  [PROJECT_BOQ_TYPES.MAIN]: 1,
  [PROJECT_BOQ_TYPES.ADDITIONAL]: 2,
};

/** Sorted family children with stable badge labels (Main BOQ, Design BOQ, Additional BOQ-1, …). */
export function buildProjectBoqFamilyBadgeMembers(children = []) {
  const dedupedByVersionGroup = [];
  const seenVersionGroups = new Set();

  for (const child of children) {
    const versionGroup = String(child.versionGroup || child.code || child.id || '').trim();
    if (versionGroup && seenVersionGroups.has(versionGroup)) continue;
    if (versionGroup) seenVersionGroups.add(versionGroup);
    dedupedByVersionGroup.push(child);
  }

  const sorted = [...dedupedByVersionGroup].sort((a, b) => {
    const orderA = PROJECT_BOQ_BADGE_TYPE_ORDER[a.boqType] ?? 99;
    const orderB = PROJECT_BOQ_BADGE_TYPE_ORDER[b.boqType] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.code ?? a.id ?? '').localeCompare(String(b.code ?? b.id ?? ''), undefined, {
      numeric: true,
    });
  });

  let additionalIndex = 0;
  return sorted.map((child) => {
    if (child.boqType === PROJECT_BOQ_TYPES.ADDITIONAL) {
      additionalIndex += 1;
    }
    const badgeLabel = buildProjectBoqFamilyBadgeLabel(child, { additionalIndex });
    return {
      ...child,
      familyLabel: badgeLabel,
      badgeLabel,
    };
  });
}

/** Prefer Design BOQ, then Main, then first additional when picking a default family member. */
export function getDefaultProjectBoqFamilyCode(members = []) {
  const labeled = buildProjectBoqFamilyBadgeMembers(members);
  const design = labeled.find((member) => member.boqType === PROJECT_BOQ_TYPES.DESIGN);
  if (design) return design.code || design.id || '';

  const main = labeled.find((member) => member.boqType === PROJECT_BOQ_TYPES.MAIN);
  if (main) return main.code || main.id || '';

  return labeled[0]?.code || labeled[0]?.id || '';
}

export function buildProjectBoqAutoName(boqType, { familyId, projectLabel, rows = [] }) {
  if (boqType === PROJECT_BOQ_TYPES.DESIGN) return 'Design BOQ';
  if (boqType === PROJECT_BOQ_TYPES.MAIN) return 'Main BOQ';
  if (boqType === PROJECT_BOQ_TYPES.ADDITIONAL) {
    const scopeRows = familyId
      ? rows.filter((row) => row.familyId === familyId)
      : rows.filter((row) => row.project === projectLabel);
    const additionalCount = scopeRows.filter(
      (row) => row.boqType === PROJECT_BOQ_TYPES.ADDITIONAL,
    ).length;
    return `Additional BOQ-${additionalCount + 1}`;
  }
  return '';
}

export function projectBoqTypeExistsForProject(boqType, projectId, rows = []) {
  if (boqType === PROJECT_BOQ_TYPES.ADDITIONAL) return false;
  return rows.some(
    (row) => (row.projectId || row.project) === projectId && row.boqType === boqType,
  );
}
