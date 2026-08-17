/** Default page size for offset-paginated CRM / CP list tables. */
export const DEFAULT_LIST_PAGE_SIZE = 15;

/**
 * Flatten list API payloads: grouped `results{ key: rows[] }` or flat `results[]`.
 * @param {object} result - API message object
 * @param {(row: object) => object} [mapRow] - Optional row normalizer
 * @returns {object[]}
 */
export function flattenGroupedListResults(result, mapRow) {
  const map = typeof mapRow === 'function' ? mapRow : (row) => row;
  let flatRows = [];

  if (result?.is_grouped && result.results && typeof result.results === 'object') {
    for (const records of Object.values(result.results)) {
      if (Array.isArray(records)) {
        flatRows.push(...records.map(map));
      }
    }
    return flatRows;
  }

  if (Array.isArray(result?.results)) {
    flatRows = result.results.map(map);
  }

  return flatRows;
}

/**
 * Read offset pagination metadata from a list API response.
 * @param {object} result
 * @param {number} [fallbackPage=1]
 * @returns {{ page: number, totalCount: number, totalPages: number }}
 */
export function parseListPaginationMeta(result, fallbackPage = 1) {
  return {
    page: result?.page ?? fallbackPage,
    totalCount: result?.total_count ?? 0,
    totalPages: result?.total_pages ?? 0,
  };
}

/** Empty pagination state for list views. */
export function emptyListPagination(page = 1) {
  return { page, totalCount: 0, totalPages: 0 };
}
