/** Fallback accent palette when theme vars are not set (DevX 4-color anchors). */
export const DEFAULT_ACCENTS = ['#062F2F', '#2BB673', '#A8C3A6', '#0A4A4A'];

export function buildAccentCssVars(palette = []) {
  const colors = [...palette].filter(Boolean).slice(0, 4);
  while (colors.length < 4) {
    colors.push(DEFAULT_ACCENTS[colors.length % 4]);
  }
  const vars = {};
  colors.forEach((hex, i) => {
    vars[`--pub-accent-${i}`] = hex;
  });
  vars['--pub-tab-active'] = colors[0];
  return vars;
}

export function accentDotStyle(i) {
  return { backgroundColor: `var(--pub-accent-${i % 4}, ${DEFAULT_ACCENTS[i % 4]})` };
}

export function accentBorderLeft(i) {
  return { borderLeft: `4px solid var(--pub-accent-${i % 4}, ${DEFAULT_ACCENTS[i % 4]})` };
}

export function accentBorderTop(i) {
  return { borderTop: `4px solid var(--pub-accent-${i % 4}, ${DEFAULT_ACCENTS[i % 4]})` };
}

export function accentText(i) {
  return { color: `var(--pub-accent-${i % 4}, ${DEFAULT_ACCENTS[i % 4]})` };
}

export function accentChipStyle(i) {
  const hex = `var(--pub-accent-${i % 4}, ${DEFAULT_ACCENTS[i % 4]})`;
  return {
    background: `color-mix(in srgb, ${hex} 10%, white)`,
    borderColor: `color-mix(in srgb, ${hex} 22%, white)`,
  };
}

/** At a Glance fact cards — column-tinted backgrounds from website palette */
export function accentGlanceCardStyle(i) {
  const col = i % 4;
  const hex = `var(--pub-accent-${col}, ${DEFAULT_ACCENTS[col]})`;
  return {
    '--pub-glance-accent': hex,
    background: `color-mix(in srgb, ${hex} 8%, white)`,
    borderColor: `color-mix(in srgb, ${hex} 14%, white)`,
  };
}

export function accentIconBoxStyle(i) {
  const hex = `var(--pub-accent-${i % 4}, ${DEFAULT_ACCENTS[i % 4]})`;
  return {
    color: hex,
    background: `color-mix(in srgb, ${hex} 10%, white)`,
    borderColor: `color-mix(in srgb, ${hex} 18%, white)`,
  };
}

export function accentRoiStyle(i) {
  const hex = `var(--pub-accent-${i % 4}, ${DEFAULT_ACCENTS[i % 4]})`;
  return {
    background: `color-mix(in srgb, ${hex} 8%, white)`,
    borderColor: `color-mix(in srgb, ${hex} 25%, white)`,
    color: `color-mix(in srgb, ${hex} 85%, black)`,
  };
}
