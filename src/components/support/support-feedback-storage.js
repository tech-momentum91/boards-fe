import {
  SUPPORT_FEEDBACK_DEFAULT_STATUS,
  SUPPORT_FEEDBACK_SEED_ITEMS,
  SUPPORT_FEEDBACK_STORAGE_KEY,
} from '@/components/support/support-feedback-constants';

const seedItems = () => SUPPORT_FEEDBACK_SEED_ITEMS.map((row) => ({ ...row }));

const normalizeItem = (item) => {
  if (!item || typeof item !== 'object') return null;
  const upvotedBy = Array.isArray(item.upvotedBy) ? item.upvotedBy : [];
  const upvoteCount = typeof item.upvoteCount === 'number' ? item.upvoteCount : upvotedBy.length;
  const status =
    typeof item.status === 'string' && item.status.trim()
      ? item.status.trim()
      : SUPPORT_FEEDBACK_DEFAULT_STATUS;
  return {
    ...item,
    upvotedBy,
    upvoteCount,
    status,
    photos: Array.isArray(item.photos) ? item.photos : [],
  };
};

export function loadSupportFeedbackItems() {
  try {
    const raw = localStorage.getItem(SUPPORT_FEEDBACK_STORAGE_KEY);
    if (!raw) {
      const seeded = seedItems();
      localStorage.setItem(SUPPORT_FEEDBACK_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedItems();
    return parsed.map(normalizeItem).filter(Boolean);
  } catch {
    return seedItems();
  }
}

export function saveSupportFeedbackItems(items) {
  try {
    localStorage.setItem(SUPPORT_FEEDBACK_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}
