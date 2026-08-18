export const BOARD_ICON_COLORS = [
  '#6E3FF3', // purple
  '#375DFB', // blue
  '#35B9E9', // sky
  '#22D3C5', // cyan
  '#079455', // green
  '#F2AE40', // yellow
  '#F17B2C', // orange
  '#DF1C41', // red
  '#FB4BA3', // pink
  '#E255F2', // magenta
  '#9B6B4A', // brown
  '#525866', // gray
];

export function normalizeBoardColor(color) {
  if (!color) return '';
  const value = String(color).trim().toLowerCase();
  const withHash = value.startsWith('#') ? value : `#${value}`;
  if (/^#[\da-f]{3}$/i.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[\da-f]{6}$/i.test(withHash)) {
    return withHash.toLowerCase();
  }
  return withHash;
}

export function colorsMatch(a, b) {
  if (!a || !b) return false;
  return normalizeBoardColor(a) === normalizeBoardColor(b);
}

export function isValidHexColor(color) {
  const normalized = normalizeBoardColor(color);
  return /^#[\da-f]{6}$/i.test(normalized);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function hexToRgb(hex) {
  const normalized = normalizeBoardColor(hex);
  if (!/^#[\da-f]{6}$/i.test(normalized)) {
    return { r: 82, g: 88, b: 102 };
  }
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex(r, g, b) {
  const toHex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsv(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === red) {
      h = ((green - blue) / delta) % 6;
    } else if (max === green) {
      h = (blue - red) / delta + 2;
    } else {
      h = (red - green) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max };
}

export function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  };
}

export function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

export function hsvToHex(h, s, v) {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

function relativeLuminance({ r, g, b }) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast of color text on white background (ClickUp-style OK / Low). */
export function getContrastAgainstWhite(hex) {
  const luminance = relativeLuminance(hexToRgb(hex));
  const contrast = 1.05 / (luminance + 0.05);
  return {
    ratio: contrast,
    ok: contrast >= 3,
    label: contrast >= 3 ? 'Contrast OK' : 'Low contrast',
  };
}
