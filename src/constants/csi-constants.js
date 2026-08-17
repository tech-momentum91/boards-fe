export const CSI_QUARTER_OPTIONS = [
  { value: 'all', label: 'All Quarters' },
  { value: 'Q1', label: 'Jan - March' },
  { value: 'Q2', label: 'April - June' },
  { value: 'Q3', label: 'July - Sept' },
  { value: 'Q4', label: 'Oct - Dec' },
];

// Generate current year and past 4 years dynamically
const currentYear = new Date().getFullYear();
export const CSI_YEAR_OPTIONS = [
  { value: 'all', label: 'All Years' },
  ...Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - i;
    return { value: String(year), label: String(year) };
  }),
];

export const CSI_SCORE_LABELS = {
  10: 'Exceeds Expectations',
  9: 'Exceeds Expectations',
  8: 'Meets Expectations',
  7: 'Meets Expectations',
  6: 'Needs Significant Improvement',
  5: 'Needs Significant Improvement',
  4: 'Needs Significant Improvement',
  3: 'Needs Significant Improvement',
  2: 'Needs Significant Improvement',
  1: 'Needs Significant Improvement',
};

export const CSI_RATING_SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

/** Score card Tailwind classes by color variant (red, yellow, green, gray). Default = amber. */
export const CSI_SCORE_CARD_STYLES = {
  red: {
    cardBg: 'bg-error-lighter',
    scoreText: 'text-error-darker',
    starWrap: 'bg-error-light',
    starIcon: 'text-error-dark',
  },
  yellow: {
    cardBg: 'bg-away-lighter',
    scoreText: 'text-away-dark',
    starWrap: 'bg-away-light',
    starIcon: 'text-away-dark',
  },
  green: {
    cardBg: 'bg-success-lighter',
    scoreText: 'text-success-dark',
    starWrap: 'bg-success-light',
    starIcon: 'text-success-dark',
  },
  gray: {
    cardBg: 'bg-bg-weak-100',
    scoreText: 'text-text-main-900',
    starWrap: 'bg-bg-white-0',
    starIcon: 'text-text-sub-500',
  },
  default: {
    cardBg: 'bg-linear-to-b from-[#fbedb1] to-[#fef7ec]',
    scoreText: 'text-[#693d11]',
    starWrap: 'bg-white',
    starIcon: 'text-[#b47818]',
  },
};
