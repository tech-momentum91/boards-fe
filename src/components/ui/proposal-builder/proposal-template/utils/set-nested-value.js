function cloneValue(value) {
  if (Array.isArray(value)) {
    return [...value];
  }
  if (value !== null && typeof value === 'object') {
    return { ...value };
  }
  return value;
}

export function setNestedValue(obj, path, value) {
  const next = { ...obj };
  let cursor = next;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    cursor[key] = cloneValue(cursor[key]);
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
  return next;
}
