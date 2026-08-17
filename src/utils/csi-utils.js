import { CSI_SCORE_LABELS } from '@/constants/csi-constants';

/**
 * Group surveys by location
 * @param {Array} surveys - Array of CSI survey objects
 * @returns {Object} - Object with location names as keys and arrays of surveys as values
 */
export const groupSurveysByLocation = (surveys) => {
  if (!Array.isArray(surveys) || surveys.length === 0) {
    return {};
  }

  return surveys.reduce((accumulator, survey) => {
    const location =
      survey.custom_center_name ||
      survey.location ||
      survey.custom_location ||
      survey.center_name ||
      'Unknown Location';
    const locationKey = location;

    if (!accumulator[locationKey]) {
      accumulator[locationKey] = [];
    }
    accumulator[locationKey].push(survey);
    return accumulator;
  }, {});
};

/**
 * Calculate average CSI score from surveys
 * @param {Array} surveys - Array of CSI survey objects
 * @returns {number|null} - Average score or null if no valid scores
 */
export const calculateAvgScore = (surveys) => {
  if (!Array.isArray(surveys) || surveys.length === 0) {
    return null;
  }

  const validScores = surveys
    .map((survey) => {
      const score = survey.csi_score || survey.score || survey.custom_csi_score;
      return typeof score === 'number' ? score : Number.parseFloat(score);
    })
    .filter((score) => !Number.isNaN(score) && score >= 0 && score <= 10);

  if (validScores.length === 0) {
    return null;
  }

  const sum = validScores.reduce((accumulator, score) => accumulator + score, 0);
  return Math.round((sum / validScores.length) * 10) / 10; // Round to 1 decimal place
};

/**
 * Get label for score (e.g., "Meets Expectations")
 * @param {number} score - CSI score (1-10)
 * @returns {string} - Score label
 */
export const getScoreLabel = (score) => {
  const numericScore = Number(score);
  if (Number.isNaN(numericScore) || numericScore < 1 || numericScore > 10) return 'N/A';
  const roundedScore = Math.round(numericScore);
  return CSI_SCORE_LABELS[roundedScore] || 'N/A';
};

/**
 * Get color variant for score badge
 * @param {number} score - CSI score (1-10)
 * @returns {string} - Color variant ('green' | 'yellow' | 'red' | 'gray')
 */
export const getScoreColor = (score) => {
  const numericScore = Number(score);
  if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 10) return 'gray';

  if (numericScore >= 9) return 'green';
  if (numericScore >= 7) return 'yellow';
  return 'red';
};

/**
 * Count pending surveys
 * @param {Array} surveys - Array of CSI survey objects
 * @returns {number} - Count of pending surveys
 */
export const countPendingSurveys = (surveys) => {
  if (!Array.isArray(surveys)) return 0;

  return surveys.filter((survey) => {
    const status = survey.status || survey.custom_status || '';
    return status.toLowerCase() === 'pending' || status.toLowerCase() === 'draft';
  }).length;
};

/**
 * Count completed surveys
 * @param {Array} surveys - Array of CSI survey objects
 * @returns {number} - Count of completed surveys
 */
export const countCompletedSurveys = (surveys) => {
  if (!Array.isArray(surveys)) return 0;

  return surveys.filter((survey) => {
    const status = survey.status || survey.custom_status || '';
    return status.toLowerCase() === 'completed' || status.toLowerCase() === 'submitted';
  }).length;
};

/**
 * Get rating badge color for a specific rating value (1-10)
 * @param {number} rating - Rating value (1-10)
 * @param {number} selectedRating - Currently selected/highlighted rating
 * @returns {string} - Color variant ('green' | 'yellow' | 'red' | 'gray')
 */
export const getRatingBadgeColor = (rating, selectedRating) => {
  if (rating !== selectedRating) {
    return 'gray'; // Unselected badges are gray
  }

  if (rating >= 9) return 'green';
  if (rating >= 7) return 'yellow';
  return 'red';
};

/**
 * Get CSS classes for CSI score badge based on score value
 * Returns Tailwind classes for background and text colors
 * @param {number} score - CSI score value
 * @returns {string} - CSS classes string for badge styling
 */
export const getBadgeClasses = (score) => {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    return 'bg-[#F1F2F4] text-text-sub-500';
  }

  if (numericScore >= 9) {
    return 'bg-[#C9F4D7] text-[#007E3B]';
  }

  if (numericScore >= 7) {
    return 'bg-[#FFE4B3] text-[#915600]';
  }

  return 'bg-[#FDD4D7] text-[#B0202B]';
};

/**
 * Get Badge component color variant for CSI score
 * @param {number} score - CSI score value
 * @returns {string} - Badge color variant ('green' | 'yellow' | 'red' | 'gray')
 */
export const getBadgeColor = (score) => {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    return 'gray';
  }

  if (numericScore >= 9) {
    return 'green';
  }

  if (numericScore >= 7) {
    return 'yellow';
  }

  return 'red';
};

/**
 * Calculate average service ratings across all completed CSI surveys
 * Used for the detailed breakdown popover in CSI summary cards.
 *
 * @param {Array} surveys - Array of CSI survey objects
 * @returns {Array<{ service: string, average: number }>}
 */
export const getServiceRatingAverages = (surveys) => {
  if (!Array.isArray(surveys) || surveys.length === 0) return [];

  const serviceTotals = {};

  surveys.forEach((survey) => {
    const status = (survey.status || survey.custom_status || '').toLowerCase();
    const isCompleted = status === 'completed' || status === 'submitted';
    if (!isCompleted) return;

    const rawRatings = Array.isArray(survey.service_rating)
      ? survey.service_rating
      : Array.isArray(survey.service_ratings)
        ? survey.service_ratings
        : [];

    rawRatings.forEach((item) => {
      const serviceName = item.service || item.category || 'Other';
      const ratingValue = Number(item.rating ?? item.score);

      if (!Number.isFinite(ratingValue)) return;

      if (!serviceTotals[serviceName]) {
        serviceTotals[serviceName] = { total: 0, count: 0 };
      }

      serviceTotals[serviceName].total += ratingValue;
      serviceTotals[serviceName].count += 1;
    });
  });

  return Object.entries(serviceTotals)
    .map(([service, { total, count }]) => ({
      service,
      average: count > 0 ? total / count : 0,
    }))
    .sort((a, b) => b.average - a.average);
};
