import countryInfo from './country-info.json';

// Default country code
export const DEFAULT_COUNTRY_CODE = '+91';

/**
 * Build the same shape the Frappe API used (see previous fetchCountries implementation).
 * Data is bundled from Frappe's country_info.json — no network call.
 */
function buildCountriesFromStaticData() {
  const countriesList = [];
  let keyIndex = 0;

  Object.entries(countryInfo).forEach(([countryName, info]) => {
    if (!info.isd) return;

    const countryCode = (info.code || '').toLowerCase();
    const phoneCode = info.isd || '';
    const uniqueKey = `${phoneCode}-${countryCode || countryName.toLowerCase().replaceAll(/\s+/g, '-')}-${keyIndex++}`;

    countriesList.push({
      value: phoneCode,
      label: countryName,
      flagCode: countryCode,
      flag: countryCode ? `https://flagcdn.com/${countryCode}.svg` : null,
      code: countryCode,
      name: countryName,
      uniqueKey,
    });
  });

  return countriesList.sort((a, b) => {
    if (a.value === '+91' && a.name === 'India') return -1;
    if (b.value === '+91' && b.name === 'India') return 1;
    return a.name.localeCompare(b.name);
  });
}

/** All countries — loaded once with the bundle (no API). */
export const COUNTRIES = buildCountriesFromStaticData();

/** Synchronous access (preferred). */
export const getCountries = () => COUNTRIES;

/**
 * @returns {Promise<typeof COUNTRIES>} Resolves immediately with bundled data (kept for older call sites).
 */
export const fetchCountries = async () => COUNTRIES;

/**
 * @param {string} contactNumber
 * @param {Array} [countries=COUNTRIES]
 * @returns {{ countryCode: string, number: string }}
 */
export const parseContactNumber = (contactNumber, countries = COUNTRIES) => {
  if (!contactNumber) return { countryCode: DEFAULT_COUNTRY_CODE, number: '' };

  const cleanedNumber = contactNumber.replaceAll(/[^\d+-]/g, '');

  const sortedCountries = [...countries].sort((a, b) => b.value.length - a.value.length);
  const matchedCountry = sortedCountries.find((country) => cleanedNumber.startsWith(country.value));

  if (matchedCountry) {
    const number = cleanedNumber.replace(matchedCountry.value, '').replace(/^[\s-]+/, '');
    return {
      countryCode: matchedCountry.value,
      number,
    };
  }

  return { countryCode: DEFAULT_COUNTRY_CODE, number: cleanedNumber };
};

/**
 * Helper function to format phone number with country code
 */
export const formatPhoneNumber = (countryCode, number) => {
  if (!number) return '';
  return `${countryCode}-${number}`;
};

/** No-op: data is static; kept for any code that called this after tests. */
export const clearCountriesCache = () => {};
