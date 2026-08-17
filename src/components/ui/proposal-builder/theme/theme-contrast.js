/**
 * WCAG contrast helpers + deterministic shade generation for brand themes.
 *
 * Key guarantee: every shade in the 12-slot system is a tint/shade of the
 * PRIMARY colour's hue — never a complementary or AI-hallucinated hue.
 */

/* ── Hex normalization ──────────────────────────────────── */
export function normHex(h) {
  let x = String(h || '')
    .trim()
    .replace(/^#/, '');
  if (x.length === 3) x = [...x].map((c) => c + c).join('');
  return `#${x.slice(0, 6).toLowerCase()}`;
}

/** rgba() from #hex + alpha — html2canvas does not support `color()` from resolved color-mix(). */
export function hexToRgba(hex, alpha) {
  const h = normHex(hex).slice(1);
  const a = Math.max(0, Math.min(1, Number(alpha) || 0));
  if (h.length !== 6) return `rgba(0,0,0,${a})`;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ── WCAG luminance / contrast ──────────────────────────── */
function toLinear(c) {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const h = normHex(hex).slice(1);
  if (h.length !== 6) return 0.5;
  const r = toLinear(Number.parseInt(h.slice(0, 2), 16));
  const g = toLinear(Number.parseInt(h.slice(2, 4), 16));
  const b = toLinear(Number.parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fgHex, bgHex) {
  const L1 = relativeLuminance(fgHex) + 0.05;
  const L2 = relativeLuminance(bgHex) + 0.05;
  return L1 > L2 ? L1 / L2 : L2 / L1;
}

/* ── HSL ↔ hex utilities ────────────────────────────────── */
function hexToHsl(hex) {
  const h = normHex(hex).slice(1);
  const r = Number.parseInt(h.slice(0, 2), 16) / 255;
  const g = Number.parseInt(h.slice(2, 4), 16) / 255;
  const b = Number.parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let hue = 0,
    sat = 0;
  const lgt = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = lgt > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        hue = ((b - r) / d + 2) / 6;
        break;
      default:
        hue = ((r - g) / d + 4) / 6;
    }
  }
  return [hue * 360, sat * 100, lgt * 100];
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const toHex = (n) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate 12 on-hue tints/shades of `primaryHex`, guaranteed light → dark.
 * Saturation is tapered down at extreme light end so very pale tints don't
 * look grey, and slightly boosted at deep end for richness.
 */
export function generatePrimaryShades(primaryHex) {
  const [h, s] = hexToHsl(normHex(primaryHex));
  // [lightness%, saturation-factor]  — 12 stops, index 0 = lightest
  const stops = [
    [97, 0.12],
    [93, 0.22],
    [88, 0.35],
    [81, 0.5],
    [72, 0.65],
    [61, 0.8],
    [50, 0.92],
    [40, 1],
    [30, 1.05],
    [21, 1],
    [13, 0.9],
    [6, 0.75],
  ];
  return stops.map(([l, sf]) => hslToHex(h, Math.min(s * sf, 100), l));
}

/* ── Text colour selection ──────────────────────────────── */
function pickReadableTextOn(bgHex, preferred) {
  const pref = normHex(preferred);
  if (pref.length === 7 && contrastRatio(pref, bgHex) >= 4.5) return pref;
  const lum = relativeLuminance(bgHex);
  if (lum > 0.35) {
    // Light background — prefer darkest readable option
    for (const c of ['#0f172a', '#1e293b', '#334155']) {
      if (contrastRatio(c, bgHex) >= 4.5) return c;
    }
    return '#0f172a';
  }
  // Dark background
  for (const c of ['#f8fafc', '#f1f5f9', '#e2e8f0']) {
    if (contrastRatio(c, bgHex) >= 4.5) return c;
  }
  return '#f8fafc';
}

/**
 * Clones a scheme and applies three categories of corrections:
 *
 * 1. Slide background — forced to near-white for content slides.
 *    Medium-tone coloured backgrounds (lum 0.15–0.82) cause cards to
 *    blend in and introduce random off-brand colour wash.
 *
 * 2. Shades array — replaced with 12 mathematically-generated tints of
 *    the primary hue, guaranteeing on-brand colours only.
 *
 * 3. Text contrast — titleText / bodyText vs slideBackground,
 *    text.inverse vs background.dark.
 */
export function ensureReadableThemeScheme(scheme) {
  if (!scheme || typeof scheme !== 'object') return scheme;
  const out = JSON.parse(JSON.stringify(scheme));

  if (!out.usage) out.usage = {};
  if (!out.background) out.background = {};
  if (!out.text) out.text = {};

  /* ── 1. Slide background ─────────────────────────────── */
  const rawBg = normHex(out.usage.slideBackground || out.background.main || '#ffffff');
  const rawLum = relativeLuminance(rawBg);

  // Content slides: must be near-white (lum > 0.82) or near-black (lum < 0.12).
  // Anything in between is a medium-tone wash → force to near-white.
  const slideBg =
    rawLum >= 0.82
      ? rawBg
      : rawLum <= 0.12
        ? rawBg // dark theme — keep it
        : '#fafafa'; // medium tone → replace with near-white

  out.usage.slideBackground = slideBg;
  out.background.main = slideBg; // keep main in sync

  /* ── 2. Shades — always generate from primary hue ────── */
  const primaryHex = normHex(out.primary || '#0f172a');
  out.shades = generatePrimaryShades(primaryHex);

  // background.dark should be the darkest primary shade (shade-12)
  const deepShade = out.shades[9]; // shade-10 — rich dark
  const currentDark = normHex(out.background.dark || primaryHex);
  const darkLum = relativeLuminance(currentDark);

  // If AI's dark is too light (> 0.28 lum), replace with generated deep shade
  if (darkLum > 0.28) {
    out.background.dark = deepShade;
  }

  /* ── 3. Text contrast ────────────────────────────────── */
  const titlePref = out.usage.titleText || out.text.primary || '#0f172a';
  const bodyPref = out.usage.bodyText || out.text.secondary || '#334155';
  out.usage.titleText = pickReadableTextOn(slideBg, titlePref);

  let bodyText = pickReadableTextOn(slideBg, bodyPref);
  // If title and body resolve to same colour, differentiate body
  if (
    bodyText === out.usage.titleText &&
    relativeLuminance(slideBg) > 0.55 &&
    contrastRatio('#475569', slideBg) >= 4.5
  ) {
    bodyText = '#475569';
  }
  out.usage.bodyText = bodyText;

  // Ensure text properties are also in sync (CSS uses both paths)
  out.text.primary = out.usage.titleText;
  out.text.secondary = out.usage.bodyText;

  const dark = normHex(out.background.dark);
  const onHero = pickReadableTextOn(dark, out.text.inverse || '#f8fafc');
  out.text.inverse = onHero;

  return out;
}

/**
 * Multi-anchor presentation scheme (mirrors backend `_build_combined_palette_scheme`).
 */
export function buildCombinedPaletteScheme(anchors = []) {
  const list = anchors.map((c) => normHex(c)).filter((c) => c.length === 7);
  const primary = list[0] || '#062f2f';
  const secondary = list[1] || primary;
  const accent = list[2] || secondary;
  const palette = list.length > 0 ? list : [primary];
  const shades = generatePrimaryShades(primary);
  return {
    primary,
    secondary,
    accent,
    palette,
    accentPalette: [secondary, accent, list[3]].filter(Boolean),
    background: {
      main: '#ffffff',
      alt: shades[1],
      light: '#ffffff',
      dark: shades[9],
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      inverse: '#ffffff',
      muted: '#64748b',
    },
    borders: shades[3],
    shadows: 'rgba(0,0,0,0.12)',
    gradients: {
      primaryGradient: [primary, accent],
      backgroundGradient: ['#ffffff', shades[1]],
    },
    usage: {
      slideBackground: '#ffffff',
      titleText: '#0f172a',
      bodyText: '#475569',
      highlight: accent,
      cta: accent,
    },
  };
}

/** DevX brand palette — always exactly these 4 colors in this order. */
export const DEVX_BRAND_ANCHORS = ['#062F2F', '#2BB673', '#A8C3A6', '#0A4A4A'];

/** Fixed proposal template accent (theme / palette picker disabled in builder UI). */
export const PROPOSAL_PRIMARY_COLOR = '#4FAE7C';

export function buildDevxPalette() {
  return DEVX_BRAND_ANCHORS.map((c) => normHex(c));
}

export function buildDevxCombinedScheme(primaryHex = DEVX_BRAND_ANCHORS[0]) {
  const primary = normHex(primaryHex);
  const anchor = DEVX_BRAND_ANCHORS.some((c) => normHex(c) === primary)
    ? primary
    : normHex(DEVX_BRAND_ANCHORS[0]);
  const rest = DEVX_BRAND_ANCHORS.filter((c) => normHex(c) !== anchor).map((c) => normHex(c));
  return ensureReadableThemeScheme(buildCombinedPaletteScheme([anchor, ...rest]));
}
