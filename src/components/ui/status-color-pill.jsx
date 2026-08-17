import React from 'react';
import * as Badge from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import {
  STATUS_BADGE_PALETTE,
  STATUS_CONFIG_PICKER_HEXES,
  STATUS_CONFIG_PICKER_TO_STORAGE_HEX,
  STATUS_HEX_TO_SEMANTIC,
  STATUS_SEMANTIC_ALIASES,
} from '@/constants/STATUS_CONSTANTS';

function expandShortHex(hex) {
  const h = hex.replace('#', '').toUpperCase();
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  if (h.length === 6) {
    return `#${h}`;
  }
  return null;
}

/** Normalize `#rgb` / `#rrggbb` to uppercase `#RRGGBB` or null */
export function normalizeStatusHex(color) {
  if (typeof color !== 'string') return null;
  const t = color.trim();
  if (!t.startsWith('#')) return null;
  return expandShortHex(t);
}

/**
 * Resolve API `color` (semantic name or legacy hex) to a palette key.
 * Returns null if unknown (caller shows neutral badge).
 */
export function resolveStatusSemanticKey(color) {
  if (color == null || color === '') return null;
  const raw = String(color).trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (STATUS_SEMANTIC_ALIASES[lower]) return STATUS_SEMANTIC_ALIASES[lower];
  if (STATUS_BADGE_PALETTE[lower]) return lower;

  const hex = normalizeStatusHex(raw);
  if (hex && STATUS_HEX_TO_SEMANTIC[hex]) return STATUS_HEX_TO_SEMANTIC[hex];

  for (const [key, entry] of Object.entries(STATUS_BADGE_PALETTE)) {
    if (hex && (hex === entry.text.toUpperCase() || hex === entry.background.toUpperCase())) {
      return key;
    }
  }

  return null;
}

/** `{ text, background }` in hex, or null */
export function resolveStatusBadgeStyles(color) {
  const key = resolveStatusSemanticKey(color);
  if (!key) return null;
  return STATUS_BADGE_PALETTE[key] || null;
}

export function hasStatusBadgeColor(color) {
  return resolveStatusBadgeStyles(color) != null;
}

/**
 * @deprecated Use `hasStatusBadgeColor` for conditionals and pass the raw API `color`
 * string into `StatusColorPill` (semantic name or hex). Kept for gradual migration.
 */
export function resolveStatusHex(color) {
  return hasStatusBadgeColor(color) ? resolveStatusBadgeStyles(color).text : null;
}

function hexKey(hex) {
  return normalizeStatusHex(hex);
}

/** Map a dark swatch from the config modal to the value persisted on Status Option `color`. */
export function pickerSwatchToStorageHex(pickerHex) {
  const k = hexKey(pickerHex);
  if (k && STATUS_CONFIG_PICKER_TO_STORAGE_HEX[k]) return STATUS_CONFIG_PICKER_TO_STORAGE_HEX[k];
  const styles = resolveStatusBadgeStyles(pickerHex);
  if (styles) return styles.background;
  return STATUS_BADGE_PALETTE.blue.background;
}

/** Map stored API color to the dark swatch shown in the modal (inverse of picker → storage). */
export function storageColorToPickerSwatch(stored) {
  const normalized = normalizeStatusConfigurationStorageColor(stored);
  const nu = hexKey(normalized);
  for (const p of STATUS_CONFIG_PICKER_HEXES) {
    if (hexKey(STATUS_CONFIG_PICKER_TO_STORAGE_HEX[p]) === nu) return p;
  }
  const k = hexKey(stored);
  if (k && STATUS_CONFIG_PICKER_TO_STORAGE_HEX[k]) return k;
  return STATUS_CONFIG_PICKER_HEXES[1] ?? '#375DFB';
}

/**
 * Normalize any legacy / picker / semantic color to the light hex we store on the backend.
 * Use when loading from API and before save.
 */
export function normalizeStatusConfigurationStorageColor(stored) {
  if (stored == null || stored === '') return STATUS_BADGE_PALETTE.blue.background;
  const raw = String(stored).trim();
  const asHex = hexKey(raw);
  if (asHex) {
    if (STATUS_CONFIG_PICKER_TO_STORAGE_HEX[asHex])
      return STATUS_CONFIG_PICKER_TO_STORAGE_HEX[asHex];
    for (const { background } of Object.values(STATUS_BADGE_PALETTE)) {
      if (asHex === hexKey(background)) return background;
    }
  }
  const styles = resolveStatusBadgeStyles(raw);
  if (styles) return styles.background;
  return STATUS_BADGE_PALETTE.blue.background;
}

const badgeShellClass = cn(
  'w-max max-w-full shrink-0 justify-center',
  'normal-case font-medium text-xs leading-normal text-center',
  'h-auto  px-2.5  gap-0',
);

/**
 * Status label pill using the fixed DevX palette (text + background).
 * Pass `color` exactly as returned by the API (`Status Option.color`: semantic or legacy hex).
 */
export function StatusColorPill({ value, color, className }) {
  const raw = value != null && value !== '' ? String(value).trim() : '';
  const display = raw && raw !== '-' ? raw : '—';

  const styles = resolveStatusBadgeStyles(color);

  if (!styles) {
    return (
      <Badge.Root
        size='small'
        variant='light'
        color='gray'
        className={cn(
          badgeShellClass,
          'border border-stroke-soft-200 bg-white text-paragraph-xs text-text-sub-600',
          className,
        )}
      >
        <span className='max-w-full truncate'>{display}</span>
      </Badge.Root>
    );
  }

  return (
    <Badge.Root
      size='small'
      variant='light'
      color='gray'
      className={cn(badgeShellClass, className)}
      style={{
        backgroundColor: styles.background,
        color: styles.text,
      }}
    >
      <span className='max-w-full truncate'>{display}</span>
    </Badge.Root>
  );
}
