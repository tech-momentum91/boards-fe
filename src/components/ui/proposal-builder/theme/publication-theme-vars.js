import {
  buildAccentCssVars,
  DEFAULT_ACCENTS,
} from '@/components/ui/proposal-builder/theme/publication-accent';
import {
  buildCombinedPaletteScheme,
  buildDevxCombinedScheme,
  DEVX_BRAND_ANCHORS,
  ensureReadableThemeScheme,
  hexToRgba,
  normHex,
} from '@/components/ui/proposal-builder/theme/theme-contrast';

const DEVX_PRIMARY = '#062F2F';

// Fallback Google publication accents
const GOOGLE_ACCENT = {
  blue: DEFAULT_ACCENTS[0],
  red: DEFAULT_ACCENTS[1],
  yellow: DEFAULT_ACCENTS[2],
  green: DEFAULT_ACCENTS[3],
};
const SHADE_FALLBACK = [
  '#f8fafc',
  '#f1f5f9',
  '#e2e8f0',
  '#cbd5e1',
  '#94a3b8',
  '#64748b',
  '#475569',
  '#334155',
  '#1e293b',
  '#0f172a',
  '#020617',
  '#000000',
];

/**
 * Build CSS variables from an ensured color scheme.
 */
export function buildPublicationThemeVarsFromScheme(activeColorScheme, publicationPalette) {
  const cs = ensureReadableThemeScheme(activeColorScheme);
  const pal = publicationPalette?.length
    ? publicationPalette
    : cs.palette || [...DEVX_BRAND_ANCHORS];
  const sh = (n) => (cs.shades?.[n - 1] ? cs.shades[n - 1] : SHADE_FALLBACK[n - 1]);

  const tv = {
    '--color-primary': cs.primary,
    '--color-secondary': cs.secondary,
    '--color-accent': cs.accent,
    '--accent-1': sh(9),
    '--accent-2': pal[1] || cs.accentPalette?.[1] || cs.secondary || cs.accent || cs.primary,
    '--accent-3': pal[2] || cs.accentPalette?.[2] || cs.secondary || cs.accent || cs.primary,
    '--palette-1': pal[0] || cs.primary,
    '--palette-2': pal[1] || cs.secondary || cs.accent || cs.primary,
    '--palette-3': pal[2] || cs.accent || cs.secondary || cs.primary,
    '--palette-4': pal[3] || cs.background?.dark || cs.primary,
    '--primary-gradient-start': cs.gradients?.primaryGradient?.[0] || cs.primary,
    '--primary-gradient-end':
      cs.gradients?.primaryGradient?.[1] || cs.accent || cs.secondary || cs.primary,
    '--bg-main': cs.usage?.slideBackground || '#fafafa',
    '--bg-alt': cs.background?.alt || '#f1f5f9',
    '--bg-light': cs.background?.light || '#ffffff',
    '--bg-dark': cs.background?.dark || '#0F172A',
    '--text-primary': '#000000',
    '--text-secondary': '#000000',
    '--text-inverse': '#ffffff',
    '--text-muted': '#000000',
    '--border-color': cs.borders || '#E2E8F0',
    '--shadow-color': cs.shadows || 'rgba(0,0,0,0.1)',
    '--navy': '#000000',
    '--green': cs.accent,
    '--green-light': `${cs.accent}18`,
    '--beige': cs.background?.alt || '#F5F7F5',
    '--cream': cs.usage?.slideBackground || '#fafafa',
    '--sand': cs.borders || '#E2E8F3',
    '--text-main': '#000000',
    '--text-light': '#000000',
  };

  if (Array.isArray(cs.shades)) {
    cs.shades.forEach((shade, i) => {
      if (shade && typeof shade === 'string') {
        tv[`--shade-${i + 1}`] = shade;
      }
    });
  }

  const inv = cs.text?.inverse || '#ffffff';
  Object.assign(tv, {
    '--mix-inv-70': hexToRgba(inv, 0.7),
    '--mix-inv-82': hexToRgba(inv, 0.82),
    '--mix-inv-55': hexToRgba(inv, 0.55),
    '--mix-inv-60': hexToRgba(inv, 0.6),
    '--mix-inv-78': hexToRgba(inv, 0.78),
    '--mix-inv-84': hexToRgba(inv, 0.84),
    '--mix-inv-14': hexToRgba(inv, 0.14),
    '--mix-inv-08': hexToRgba(inv, 0.08),
    '--mix-inv-12': hexToRgba(inv, 0.12),
    '--mix-inv-72': hexToRgba(inv, 0.72),
    '--mix-inv-18': hexToRgba(inv, 0.18),
    '--mix-inv-22': hexToRgba(inv, 0.22),
    '--mix-inv-10': hexToRgba(inv, 0.1),
    '--mix-inv-35': hexToRgba(inv, 0.35),
    '--mix-inv-15': hexToRgba(inv, 0.15),
    '--mix-s3-30': hexToRgba(sh(3), 0.3),
    '--mix-s6-18': hexToRgba(sh(6), 0.18),
    '--mix-s6-25': hexToRgba(sh(6), 0.25),
    '--mix-s6-35': hexToRgba(sh(6), 0.35),
    '--mix-s6-40': hexToRgba(sh(6), 0.4),
    '--mix-s7-42': hexToRgba(sh(7), 0.42),
    '--mix-s7-55': hexToRgba(sh(7), 0.55),
    '--mix-s8-30': hexToRgba(sh(8), 0.3),
    '--mix-s9-55': hexToRgba(sh(9), 0.55),
    '--mix-s9-60': hexToRgba(sh(9), 0.6),
    '--mix-s10-70': hexToRgba(sh(10), 0.7),
    '--mix-s11-72': hexToRgba(sh(11), 0.72),
    '--mix-s12-35': hexToRgba(sh(12), 0.35),
    '--mix-s12-45': hexToRgba(sh(12), 0.45),
    '--mix-s12-80': hexToRgba(sh(12), 0.8),
  });

  // Extend with accent palette for publication (inline)
  const websitePalette = pal.slice(0, 4);
  return {
    ...tv,
    ...buildAccentCssVars(websitePalette),
    '--pub-blue': websitePalette[0] || GOOGLE_ACCENT.blue,
    '--pub-red': websitePalette[1] || GOOGLE_ACCENT.red,
    '--pub-yellow': websitePalette[2] || GOOGLE_ACCENT.yellow,
    '--pub-green': websitePalette[3] || GOOGLE_ACCENT.green,
  };
}

/**
 * DevX-only shortcut (no client website scrape).
 */
export function buildPublicationThemeVars(themeColor = DEVX_PRIMARY) {
  const scheme = buildDevxCombinedScheme(themeColor);
  const cs = ensureReadableThemeScheme(scheme);
  const palette = cs.palette?.length ? cs.palette : [...DEVX_BRAND_ANCHORS];
  return buildPublicationThemeVarsFromScheme(cs, palette);
}

/**
 * Resolve active scheme from builder theme controls.
 */
export function resolveActiveColorScheme({
  themeSource = 'devx',
  themeColor = DEVX_PRIMARY,
  websitePalette = [],
  websiteCombinedScheme = null,
}) {
  if (themeSource === 'devx') {
    return buildDevxCombinedScheme(themeColor);
  }

  if (websiteCombinedScheme) {
    return websiteCombinedScheme;
  }

  if (websitePalette.length > 0) {
    return buildCombinedPaletteScheme(websitePalette.map(normHex).filter(Boolean));
  }

  return buildDevxCombinedScheme(themeColor);
}

export function resolvePublicationPalette({
  themeSource = 'devx',
  websitePalette = [],
  activeColorScheme,
}) {
  if (websitePalette.length > 0) return websitePalette;
  const cs = ensureReadableThemeScheme(activeColorScheme);
  return cs.palette?.length ? cs.palette : [...DEVX_BRAND_ANCHORS];
}
