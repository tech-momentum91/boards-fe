/** Split legacy `2ⁿᵈ` values into base + superscript for rendering. */
export function resolveStatSuperscript(stat) {
  if (stat?.valueSuperscript) {
    return { value: stat.value, valueSuperscript: stat.valueSuperscript };
  }

  const raw = String(stat?.value ?? '').trim();
  if (/^2(?:ⁿᵈ|\u207F\u1D48)$/u.test(raw)) {
    return { value: '2', valueSuperscript: 'nd' };
  }

  return { value: stat?.value ?? '', valueSuperscript: null };
}

export function hasRupeeSymbol(value) {
  return String(value ?? '').includes('₹');
}
