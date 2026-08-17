/** Space `inventory_type` options — keep in sync with Space doctype (`space.json`). */
export const SPACE_INVENTORY_TYPE_OPTIONS = [
  { value: 'Managed Office', label: 'Managed Office' },
  { value: 'Co-working Space', label: 'Co-working Space' },
  { value: 'Resource', label: 'Resource' },
  { value: 'Parking', label: 'Parking' },
  { value: 'Pure Rental', label: 'Pure Rental' },
];

export const CASE_STUDY_TABLE_ID = 'knowledge-center-case-studies';

export const ALL_CENTERS = '__all_centers__';
export const ALL_SPACE_TYPES = '__all_space_types__';
export const ALL_CITIES = '__all_cities__';

export const SPACE_TYPE_FILTER_OPTIONS = [
  { value: ALL_SPACE_TYPES, label: 'All Space Types' },
  ...SPACE_INVENTORY_TYPE_OPTIONS,
];

export const SPACE_TYPE_FORM_OPTIONS = SPACE_INVENTORY_TYPE_OPTIONS;

/** Default table columns — matches Figma list + column manager. */
export const CASE_STUDY_DEFAULT_COLUMNS = [
  { id: 'case_study_name', label: 'Name', visible: true, enableHiding: false },
  { id: 'client', label: 'Client', visible: true, enableHiding: true },
  { id: 'center', label: 'Center', visible: true, enableHiding: true },
  { id: 'industry', label: 'Industry', visible: true, enableHiding: true },
  { id: 'creation', label: 'Created Date', visible: true, enableHiding: true },
  { id: 'modified', label: 'Last Modified', visible: true, enableHiding: true },
  { id: 'space_type', label: 'Space Type', visible: false, enableHiding: true },
  { id: 'no_of_seats', label: 'No. of Seats', visible: false, enableHiding: true },
];

export const NARRATIVE_SECTIONS = [
  {
    key: 'challenge',
    label: 'Add challenge',
    filledLabel: 'Challenge',
    icon: 'shield',
  },
  {
    key: 'solution',
    label: 'Add solution',
    filledLabel: 'DevX Solution',
    icon: 'lightbulb',
  },
  {
    key: 'outcome',
    label: 'Add outcome',
    filledLabel: 'Outcome',
    icon: 'focus',
  },
  {
    key: 'testimonial',
    label: 'Add testimonial',
    filledLabel: 'Testimonial',
    icon: 'quote',
  },
];
