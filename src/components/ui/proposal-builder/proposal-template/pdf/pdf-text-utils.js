export {
  hasRupeeSymbol,
  resolveStatSuperscript,
} from '@/components/ui/proposal-builder/proposal-template/value-utils';

const RUPEE = '\u20B9';

/** Preserve line breaks; normalize legacy rupee encodings to U+20B9. */
export function normalizePdfText(value) {
  return String(value ?? '')
    .replaceAll('\r\n', '\n')
    .replaceAll('₹', RUPEE);
}
