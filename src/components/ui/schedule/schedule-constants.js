/**
 * Schedule Constants
 * Dimension constants for schedule components
 */

export const SCHEDULE_DIMENSIONS = {
  // Heights
  HEADER_HEIGHT: 56,
  /** Sticky row above resource headers: center name bands */
  CENTER_GROUP_HEADER_HEIGHT: 40,
  RESOURCE_HEADER_HEIGHT: 96,
  RESOURCE_HEADER_HEIGHT_HORIZONTAL: 48,
  HOUR_HEIGHT: 120, // pixels per hour in time grid
  MINUTE_HEIGHT: 2, // pixels per minute (120px / 60min)
  GUTTER_TIME_SLOT_HEIGHT: 40, // pixels per time slot (vertical time grid)
  GUTTER_TIME_SLOT_WIDTH: 40, // pixels for first slot in horizontal timeline

  // Widths
  RESOURCE_COLUMN_WIDTH: 180,
  RESOURCE_SIDEBAR_WIDTH: 200,
  /** Center name column in time-x-resources-y (timeline) left sidebar */
  CENTER_GROUP_SIDEBAR_WIDTH: 96,
  TIME_LABEL_WIDTH: 104,
  TIME_SLOT_WIDTH: 180, // pixels per hour in timeline

  // Spacing
  EVENT_PADDING: 8,
  GRID_GAP: 0,
};
