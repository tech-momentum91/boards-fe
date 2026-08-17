/**
 * Normalize tracker/task display names before create or rename.
 * Trims edges and collapses repeated internal whitespace so accidental
 * double spaces (e.g. "Desk  Cleaning") are not persisted as document names.
 */
export function normalizeTrackerDisplayName(value) {
  return String(value ?? '')
    .trim()
    .replaceAll(/\s+/g, ' ');
}
