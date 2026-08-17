/**
 * Supplier / vendor domain helpers (normalization, category mapping, centers payload).
 * Used by vendor detail UI, Opex category multiselect, and related flows.
 */

import { City, State } from 'country-state-city';

function vendorMergedField(vendor, localChanges, fieldName) {
  if (localChanges && fieldName in localChanges) return localChanges[fieldName];
  return vendor?.[fieldName] ?? '';
}

/**
 * ISO codes of Indian states that contain the given city name (exact name match).
 * @param {string} cityName
 * @returns {string[]}
 */
export function indianStateIsoCodesContainingCity(cityName) {
  if (!cityName?.trim()) return [];
  const matches = [];
  for (const s of State.getStatesOfCountry('IN')) {
    const cities = City.getCitiesOfState('IN', s.isoCode);
    if (cities.some((c) => c.name === cityName)) matches.push(s.isoCode);
  }
  return matches;
}

/**
 * Single display string for select values (API may send linked DocTypes as objects).
 * @param {unknown} value
 * @returns {string}
 */
export function coerceSelectDisplayValue(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    const name =
      value.secondary_category_name ??
      value.name ??
      value.label ??
      value.title ??
      value.revenue_model ??
      '';
    return String(name).trim();
  }
  return String(value).trim();
}

/**
 * Saved state ISO from the vendor doc, or a single unambiguous inference from city when state is blank.
 * @param {object|null} normalizedVendor
 * @param {Record<string, unknown>|null} localChanges
 * @returns {string}
 */
export function getVendorEffectiveStateIso(normalizedVendor, localChanges) {
  const direct = String(vendorMergedField(normalizedVendor, localChanges, 'state') || '').trim();
  if (direct) return direct;
  const city = String(vendorMergedField(normalizedVendor, localChanges, 'city') || '').trim();
  const codes = indianStateIsoCodesContainingCity(city);
  return codes.length === 1 ? codes[0] : '';
}

/**
 * @param {{ value: string, label: string }[]} stateOptions
 * @returns {{ value: string, label: string }[]}
 */
export function sortVendorStateOptions(stateOptions) {
  return [...(stateOptions || [])].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Cities for an Indian state ISO (sorted labels).
 * @param {string} stateIso
 * @returns {{ value: string, label: string }[]}
 */
export function getVendorIndianCityOptions(stateIso) {
  if (!String(stateIso || '').trim()) return [];
  return City.getCitiesOfState('IN', String(stateIso).trim())
    .map((c) => ({ value: c.name, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * If `rawCityValue` is not in `cityOptions`, prepend a synthetic option (partner-style).
 * @param {{ value: string, label: string }[]} cityOptions
 * @param {unknown} rawCityValue
 * @returns {{ value: string, label: string }[]}
 */
export function mergeVendorCityIntoOptions(cityOptions, rawCityValue) {
  const normalized = coerceSelectDisplayValue(rawCityValue);
  if (!normalized) return cityOptions || [];
  const opts = cityOptions || [];
  const hasMatch = opts.some(
    (opt) => String(opt.value).trim().toLowerCase() === normalized.toLowerCase(),
  );
  if (hasMatch) return opts;
  return [{ value: normalized, label: normalized }, ...opts];
}

/** Map API state / custom_state (ISO or full name) to Indian state ISO for dropdowns (same as create vendor). */
export function resolveStateIsoFromRaw(raw, stateOptions) {
  if (raw === undefined || raw === null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (stateOptions.some((o) => o.value === s)) return s;
  const byLabel = stateOptions.find(
    (o) => o.label === s || o.label.toLowerCase() === s.toLowerCase(),
  );
  return byLabel?.value ?? '';
}

/** From Supplier `custom_vendor_category_mapping` → controlled multiselect values. */
export function vendorMappingToCategorySelections(mapping) {
  if (!Array.isArray(mapping) || mapping.length === 0) {
    return { categories: [], subCategories: [] };
  }
  const subs = [];
  const catSet = new Set();
  for (const row of mapping) {
    const cat =
      typeof row.category === 'object'
        ? (row.category?.name ?? row.category?.category ?? '')
        : (row.category ?? '');
    const sub =
      typeof row.sub_category === 'object'
        ? (row.sub_category?.name ?? row.sub_category?.category ?? '')
        : (row.sub_category ?? '');
    const cs = String(cat).trim();
    const ss = String(sub).trim();
    if (ss) subs.push(ss);
    if (cs) catSet.add(cs);
  }
  return { categories: [...catSet], subCategories: subs };
}

export function buildGroupedSubCategories(selectedCategories, categoryData) {
  if (!selectedCategories?.length) return [];
  return selectedCategories
    .map((cat) => {
      const found = categoryData.find((item) => item.category === cat);
      const subs = found?.subcategories || [];
      return {
        category: cat,
        subcategories: subs.map((sub) => ({ value: sub, label: sub })),
      };
    })
    .filter((group) => group.subcategories.length > 0);
}

/** Categories that have ≥1 sub available but none selected. */
export function getCategoriesMissingSubcategories(subCategories, categories, categoryData) {
  if (!categories?.length) return [];
  const grouped = buildGroupedSubCategories(categories, categoryData);
  return categories.filter((cat) => {
    const group = grouped.find((g) => g.category === cat);
    if (!group || group.subcategories.length === 0) return false;
    return !group.subcategories.some((sub) => (subCategories || []).includes(sub.value));
  });
}

/** PUT `custom_vendor_category_mapping` rows; preserves child `name` when sub still exists. */
export function buildVendorMappingPutValue(selectedSubCategories, categoryData, existingMapping) {
  const subToCategoryMap = {};
  (categoryData || []).forEach((group) => {
    (group.subcategories || []).forEach((sub) => {
      if (!(sub in subToCategoryMap)) subToCategoryMap[sub] = group.category;
    });
  });

  const existingNameBySub = new Map();
  if (Array.isArray(existingMapping)) {
    existingMapping.forEach((row) => {
      const sub =
        typeof row.sub_category === 'object'
          ? (row.sub_category?.name ?? row.sub_category?.category)
          : row.sub_category;
      if (sub && row.name) existingNameBySub.set(String(sub).trim(), row.name);
    });
  }

  return (selectedSubCategories || []).map((sub) => {
    const category = subToCategoryMap[sub] ?? '';
    const name = existingNameBySub.get(String(sub).trim());
    const entry = { category, sub_category: sub };
    if (name) entry.name = name;
    return entry;
  });
}

export function isVendorApplyAllCenters(data) {
  if (!data) return false;
  return Boolean(
    Number(data.custom_apply_to_all_centers) === 1 ||
    data.apply_to_all_centers === 1 ||
    data.apply_to_all_centers === true,
  );
}

/** Canonical center code for dropdown / PUT — matches `centerAccess` row `name`. */
export function vendorCenterRowToCode(c) {
  if (c == null || c === '') return '';
  if (typeof c === 'string') return String(c).trim();
  if (typeof c === 'object') {
    const explicit = c.id ?? c.center ?? c.centre ?? c.value;
    if (explicit !== null && explicit !== undefined && String(explicit).trim() !== '') {
      return String(explicit).trim();
    }
    if (c.name != null && String(c.name).trim() !== '') return String(c.name).trim();
  }
  return '';
}

export function selectedCenterIdsFromVendorData(data) {
  if (!data) return [];
  if (isVendorApplyAllCenters(data)) return [];

  const selectedCenters = data.selected_centers;
  let ids = [];

  if (selectedCenters && typeof selectedCenters === 'object' && !Array.isArray(selectedCenters)) {
    ids = Object.values(selectedCenters).flat().map(vendorCenterRowToCode).filter(Boolean);
  } else if (typeof selectedCenters === 'string') {
    ids = selectedCenters
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (ids.length === 0 && Array.isArray(data.custom_centers)) {
    ids = data.custom_centers.map((row) => vendorCenterRowToCode(row)).filter(Boolean);
  }

  return [...new Set(ids.map(String))];
}

/**
 * Same center payload rules as create vendor: all accessible centers selected → apply-all;
 * omit `custom_centers` when apply-all.
 * @returns {null|{ custom_apply_to_all_centers: number, custom_centers?: object[] }}
 */
export function buildVendorCentersPutPayload(selectedCenterIds, centerAccessList) {
  const centersFromAccess = Array.isArray(centerAccessList) ? centerAccessList : [];
  const allCenterIds = centersFromAccess.map((c) => c.name);
  const selectedIds = Array.isArray(selectedCenterIds)
    ? [...new Set(selectedCenterIds.map(String).filter(Boolean))]
    : [];

  const isAllCentersSelected =
    allCenterIds.length > 0 && selectedIds.length === allCenterIds.length;

  let custom_centers_payload;

  if (!isAllCentersSelected) {
    if (selectedIds.length === 0) return null;

    const centersByZone = centersFromAccess.reduce((acc, c) => {
      const zoneName = c.zone || 'Unassigned';
      if (!acc[zoneName]) acc[zoneName] = [];
      acc[zoneName].push(c.name);
      return acc;
    }, {});

    custom_centers_payload = selectedIds.map((centerId) => {
      const center = centersFromAccess.find((c) => c.name === centerId);
      const zoneName = center?.zone || 'Unassigned';
      const allInZone = centersByZone[zoneName] || [];
      const selectedInZone = selectedIds.filter((id) => allInZone.includes(id));

      if (selectedInZone.length === allInZone.length) {
        return { zone: zoneName, center: null };
      }
      return { zone: zoneName, center: centerId };
    });

    const seen = new Set();
    custom_centers_payload = custom_centers_payload.filter((row) => {
      if (!row.center) {
        if (seen.has(row.zone)) return false;
        seen.add(row.zone);
      }
      return true;
    });
  }

  return {
    custom_apply_to_all_centers: isAllCentersSelected ? 1 : 0,
    ...(custom_centers_payload ? { custom_centers: custom_centers_payload } : {}),
  };
}

export function vendorCenterSelectionsAreEqual(a, b) {
  const setA = new Set((a || []).map(String).filter(Boolean));
  const setB = new Set((b || []).map(String).filter(Boolean));
  if (setA.size !== setB.size) return false;
  for (const id of setA) {
    if (!setB.has(id)) return false;
  }
  return true;
}

export function normalizeVendorDetailRecord(d, stateOptions) {
  if (!d) return null;
  const rawState = d.state ?? d.custom_state ?? '';
  return {
    id: d.name,
    name: d.name,
    vendor_name: d.supplier_name || d.name,
    status: d.disabled === 1 || d.disabled === true ? 'Inactive' : 'Active',
    centers: (() => {
      const applyToAll = d.custom_apply_to_all_centers || d.apply_to_all_centers;
      if (applyToAll) return ['All Centers'];

      const selectedCenters = d.selected_centers;

      if (
        selectedCenters &&
        typeof selectedCenters === 'object' &&
        !Array.isArray(selectedCenters)
      ) {
        return Object.values(selectedCenters)
          .flat()
          .map((c) =>
            c && typeof c === 'object'
              ? c.name || vendorCenterRowToCode(c)
              : vendorCenterRowToCode(c),
          )
          .filter(Boolean);
      }

      if (typeof selectedCenters === 'string') return [selectedCenters];

      return [];
    })(),
    state: resolveStateIsoFromRaw(rawState, stateOptions),
    city: d.custom_based_city || '',
    address: d.custom_address || '',
    apply_to_all_centers: d.custom_apply_to_all_centers || 0,

    subCategories: [
      ...new Set(
        d.custom_vendor_category_mapping?.map((c) =>
          typeof c.sub_category === 'object'
            ? c.sub_category?.name || c.sub_category?.category || ''
            : c.sub_category || '',
        ) || [],
      ),
    ].filter(Boolean),
    categories: [
      ...new Set(
        d.custom_vendor_category_mapping?.map((c) =>
          typeof c.category === 'object'
            ? c.category?.name || c.category?.category || ''
            : c.category || '',
        ) || [],
      ),
    ].filter(Boolean),

    contacts: d.custom_vendor_contacts || [],
  };
}

export function getVendorDetailServerDisplayValue(normalizedVendor, fieldname) {
  if (!normalizedVendor) return '';
  if (fieldname === 'sub_category') return normalizedVendor.subCategories?.[0] || '';
  if (fieldname === 'category') return normalizedVendor.categories?.[0] || '';
  if (fieldname === 'state') return normalizedVendor.state || '';
  if (fieldname === 'city') return normalizedVendor.city || '';
  if (fieldname === 'address') return normalizedVendor.address || '';
  const v = normalizedVendor[fieldname];
  return v !== undefined && v !== null ? String(v) : '';
}

/** Vendor rating tab — same status check pattern as CSI drawer / location-table. */
export function isVendorRatingEditable(survey) {
  const doc = survey ?? {};
  const raw = doc.status ?? doc.custom_status ?? '';
  const status = raw === 0 || raw === '0' ? 'draft' : String(raw).trim().toLowerCase();
  return status === 'pending' || status === 'draft' || status === 'open';
}

/** GET Vendor Survey — Frappe may return child rows under alternate field names. */
export function normalizeVendorRatingDetail(doc) {
  if (!doc || typeof doc !== 'object') return doc;

  const existing = doc.service_rating ?? doc.service_ratings;
  if (Array.isArray(existing) && existing.length > 0) return doc;

  const childTable =
    doc.vendor_survey_rating ??
    doc.vendor_survey_ratings ??
    doc.rating_details ??
    doc.survey_ratings ??
    doc.ratings;

  if (!Array.isArray(childTable) || childTable.length === 0) return doc;

  return { ...doc, service_rating: childTable };
}

/** get_vendor_rating grouped payload → [{ center_name, surveys }]. */
export function normalizeVendorRatingGroups(rawResults) {
  const toSurveys = (value) => (Array.isArray(value) ? value : []);

  if (Array.isArray(rawResults)) {
    return rawResults.map((group) => ({
      center_name: group.center_name ?? group.center ?? 'Unknown Location',
      surveys: toSurveys(group.surveys ?? group.ratings),
    }));
  }

  if (rawResults && typeof rawResults === 'object') {
    return Object.entries(rawResults).map(([center_name, surveys]) => ({
      center_name,
      surveys: toSurveys(surveys),
    }));
  }

  return [];
}
