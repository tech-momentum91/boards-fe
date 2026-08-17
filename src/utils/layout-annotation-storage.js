/**
 * Browser persistence for layout annotations (normalized coordinates). Scoped by center + floor + file identity.
 */

const STORAGE_PREFIX = 'devx:layout-annotation:v1:';

/**
 * @param {string} [centerName]
 * @param {string} floor
 * @param {File} file
 * @returns {string | null}
 */
export function getLayoutAnnotationStorageKey(centerName, floor, file) {
  if (!file || floor === undefined || floor === null) return null;
  const center = centerName || '__no-center__';
  const fp = `${file.name}|${file.size}|${file.lastModified}`;
  return `${STORAGE_PREFIX}${encodeURIComponent(center)}:${encodeURIComponent(String(floor))}:${encodeURIComponent(fp)}`;
}

/**
 * @param {string | null} key
 * @returns {{ annotations: unknown[], savedAt?: string } | null}
 */
export function readLayoutAnnotationsFromStorage(key) {
  if (!key || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.annotations)) return null;
    return { annotations: data.annotations, savedAt: data.savedAt };
  } catch {
    return null;
  }
}

/**
 * @param {string | null} key
 * @param {unknown[]} annotations
 */
export function writeLayoutAnnotationsToStorage(key, annotations) {
  if (!key || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        v: 1,
        savedAt: new Date().toISOString(),
        annotations,
      }),
    );
  } catch (error) {
    console.warn('Failed to save layout annotations to localStorage', error);
  }
}
