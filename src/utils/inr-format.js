import { CURRENCY } from '@/constants/constants';
import { withPrefix } from '@/lib/utils';

const formatNumber2 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  const s = n.toFixed(2);
  return s.endsWith('.00') ? s.slice(0, -3) : s;
};

/**
 * Formats INR values with Indian units.
 * - >= 1 Crore: "₹1.25 Cr"
 * - >= 1 Lakh:  "₹12.5 L"
 * - otherwise:  "₹12,345"
 *
 * Handles negatives: "-₹1.2 L"
 */
export const formatInrCompact = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return withPrefix(CURRENCY, 0);

  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  const CRORE = 10_000_000;
  const LAKH = 100_000;

  if (abs >= CRORE) {
    return `${sign}${withPrefix(CURRENCY, '')}${formatNumber2(abs / CRORE)} Cr`;
  }

  if (abs >= LAKH) {
    return `${sign}${withPrefix(CURRENCY, '')}${formatNumber2(abs / LAKH)} L`;
  }

  // Keep standard currency formatting for smaller values (includes thousands separators)
  return `${sign}${withPrefix(CURRENCY, abs)}`;
};
