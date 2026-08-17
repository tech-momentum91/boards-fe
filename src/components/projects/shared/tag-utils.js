/** Split comma-separated tag input into trimmed, non-empty tag strings. */
export function parseCommaSeparatedTags(input) {
  return String(input ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** Append new tags to an existing list, skipping exact duplicates. */
export function mergeUniqueTags(existingTags, incomingTags) {
  const existing = Array.isArray(existingTags) ? [...existingTags] : [];
  const incoming = Array.isArray(incomingTags)
    ? incomingTags.map((tag) => String(tag).trim()).filter(Boolean)
    : parseCommaSeparatedTags(incomingTags);

  for (const tag of incoming) {
    if (!existing.includes(tag)) {
      existing.push(tag);
    }
  }

  return existing;
}
