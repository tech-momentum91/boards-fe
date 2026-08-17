import { State } from 'country-state-city';
import { indianStateIsoCodesContainingCity } from '@/utils/vendor-utils';

const INDIAN_STATES = State.getStatesOfCountry('IN');

/**
 * State display names for an Indian city (exact name match via country-state-city).
 * @param {string} cityName
 * @returns {string[]}
 */
export function getIndianStateNamesForCity(cityName) {
  const trimmed = String(cityName ?? '').trim();
  if (!trimmed) return [];
  const isoCodes = indianStateIsoCodesContainingCity(trimmed);
  const names = isoCodes
    .map((iso) => INDIAN_STATES.find((s) => s.isoCode === iso)?.name)
    .filter(Boolean);
  return [...new Set(names)];
}

/** Comma-separated unique states for all selected cities (for read-only display). */
export function deriveOperationalStatesDisplay(cityNames) {
  const cities = Array.isArray(cityNames) ? cityNames : [];
  const states = new Set();
  cities.forEach((city) => {
    getIndianStateNamesForCity(city).forEach((name) => states.add(name));
  });
  return [...states].sort((a, b) => a.localeCompare(b)).join(', ');
}

/** Cities array from a list/detail row. */
export function getOperationalCitiesFromRow(row) {
  const cities = row?.operationalCities;
  return Array.isArray(cities) ? cities.map((c) => String(c).trim()).filter(Boolean) : [];
}

/** Redux list patch after operational cities change. */
export function listRowPatchFromOperationalCities(cityNames) {
  return {
    operationalCities: Array.isArray(cityNames) ? cityNames : [],
    operationalState: deriveOperationalStatesDisplay(cityNames),
  };
}

/** Merge selected cities into India city options (for legacy/unknown values). */
export function buildOperationalCitySelectOptions(selectedCities, baseOptions = []) {
  const base = Array.isArray(baseOptions) ? baseOptions : [];
  const selected = Array.isArray(selectedCities) ? selectedCities : [];
  const extras = selected
    .filter((city) => city && !base.some((opt) => opt.value === city))
    .map((city) => ({ value: city, label: city }));
  return [...extras, ...base];
}

/** Child-table rows for create/update API (`operationalLocation`). */
export function buildOperationalLocationPayload(cityNames) {
  const cities = Array.isArray(cityNames) ? cityNames : [];
  return cities
    .map((city) => String(city ?? '').trim())
    .filter(Boolean)
    .map((city) => {
      const stateNames = getIndianStateNamesForCity(city);
      return {
        operationalCity: city,
        operationalState: stateNames.join(', '),
      };
    });
}
