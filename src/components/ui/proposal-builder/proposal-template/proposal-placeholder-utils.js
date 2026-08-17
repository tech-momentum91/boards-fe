import { capitalizeEachWordFirstLetter } from '@/lib/utils';

/** Title-case labels for proposal copy (city, center name, asset name). */
export function formatProposalTitleCase(value) {
  const text = String(value ?? '').trim();
  return text ? capitalizeEachWordFirstLetter(text) : '';
}
