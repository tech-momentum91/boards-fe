import {
  RiBox3Line,
  RiEditLine,
  RiFileExcel2Line,
  RiFileLine,
  RiFolderLine,
  RiGroupLine,
  RiPantoneLine,
  RiPieChartLine,
  RiPulseLine,
  RiSearchLine,
  RiStackLine,
} from 'react-icons/ri';

/** ----- Page (route shell) ----- */

export const BOQ_PAGE_META = {
  title: 'BOQ Module',
  description: 'Manage product master, BOQ templates, and project BOQs',
};

export const BoqPageIcon = RiStackLine;

/** ----- Tabs ----- */

export const BOQ_TAB_IDS = {
  PRODUCT_MASTER: 'product-master',
  BOQ_TEMPLATES: 'boq-templates',
  PROJECT_BOQS: 'project-boqs',
};

export const BOQ_TABS = [
  {
    id: BOQ_TAB_IDS.PROJECT_BOQS,
    label: 'Project BOQ',
    IconLine: RiStackLine,
    IconFill: RiStackLine,
  },
  {
    id: BOQ_TAB_IDS.BOQ_TEMPLATES,
    label: 'BOQ Templates',
    IconLine: RiPantoneLine,
    IconFill: RiPantoneLine,
  },
  {
    id: BOQ_TAB_IDS.PRODUCT_MASTER,
    label: 'Product master',
    IconLine: RiBox3Line,
    IconFill: RiBox3Line,
  },
];

export const BOQ_DEFAULT_ACTIVE_TAB = BOQ_TAB_IDS.PROJECT_BOQS;

/** ----- BOQ Templates ----- */

export const BOQ_TEMPLATE_STATUS = {
  ACTIVE: 'ACTIVE',
  REVIEW: 'REVIEW',
  DRAFT: 'DRAFT',
  INACTIVE: 'INACTIVE',
};

export const BOQ_TEMPLATES_COLUMN_CONFIG_TABLE_ID = 'boq-templates-table';

export const BOQ_TEMPLATES_COLUMN_CONFIG = [
  { id: 'code', columnLabel: 'Code', visible: true, enableHiding: true },
  { id: 'templateName', columnLabel: 'Template Name', visible: true, enableHiding: true },
  { id: 'type', columnLabel: 'Type', visible: true, enableHiding: true },
  { id: 'status', columnLabel: 'Status', visible: true, enableHiding: true },
  { id: 'category', columnLabel: 'Category', visible: true, enableHiding: true },
  { id: 'sqftArea', columnLabel: 'Sqft Area', visible: true, enableHiding: true },
  { id: 'products', columnLabel: 'Product', visible: true, enableHiding: true },
  { id: 'tags', columnLabel: 'Tags', visible: true, enableHiding: true },
  { id: 'buyTotal', columnLabel: 'Buy total', visible: false, enableHiding: true },
  { id: 'sellTotal', columnLabel: 'Sell total', visible: false, enableHiding: true },
  { id: 'margins', columnLabel: 'Margins', visible: false, enableHiding: true },
  { id: 'createdBy', columnLabel: 'Created by', visible: false, enableHiding: true },
  { id: 'updated', columnLabel: 'Updated', visible: false, enableHiding: true },
];

/** ----- BOQ Templates filters (API-backed) ----- */

export const BOQ_FILTER_TAB_IDS = {
  TYPE: 'type',
  STATUS: 'status',
  CATEGORY: 'category',
  PRODUCTS: 'products',
  TAGS: 'tags',
};

export const BOQ_FILTER_TABS = [
  { value: BOQ_FILTER_TAB_IDS.TYPE, label: 'Type' },
  { value: BOQ_FILTER_TAB_IDS.STATUS, label: 'Status' },
  { value: BOQ_FILTER_TAB_IDS.CATEGORY, label: 'Category' },
  { value: BOQ_FILTER_TAB_IDS.PRODUCTS, label: 'Products' },
  { value: BOQ_FILTER_TAB_IDS.TAGS, label: 'Tags' },
];

export const DEFAULT_BOQ_TEMPLATE_FILTERS = {
  type: [],
  status: [],
  category: [],
  products: [],
  tags: [],
};

export const DEFAULT_BOQ_TEMPLATE_FORM = {
  templateName: '',
  templateType: '',
  templateCategory: '',
  sqftArea: '',
  description: '',
  tags: [],
  status: '',
};

export const BOQ_TEMPLATE_DRAWER_TAB_IDS = {
  PRODUCTS: 'products',
  ACTIVITY: 'activity',
};

export const BOQ_TEMPLATE_DRAWER_TABS = [
  {
    id: BOQ_TEMPLATE_DRAWER_TAB_IDS.PRODUCTS,
    label: 'Products',
    Icon: RiBox3Line,
  },
  {
    id: BOQ_TEMPLATE_DRAWER_TAB_IDS.ACTIVITY,
    label: 'Activity',
    Icon: RiPulseLine,
  },
];

/** ----- BOQ Template products (drawer) ----- */

export const BOQ_TEMPLATE_NEW_PRODUCT_OPTION_IDS = {
  PRODUCT_MASTER: 'product-master',
  PREVIOUS_PROJECTS: 'previous-projects',
  CUSTOM_LINE: 'custom-line',
};

export const BOQ_ADD_LINE_MODES = {
  MASTER: 'master',
  CUSTOM: 'custom',
};

export const BOQ_NEW_PRODUCT_OPTION_CUSTOM_LINE = {
  id: BOQ_TEMPLATE_NEW_PRODUCT_OPTION_IDS.CUSTOM_LINE,
  title: 'Add custom line item',
  description: 'Add a line that is not in the product master',
  Icon: RiEditLine,
};

export const BOQ_TEMPLATE_NEW_PRODUCT_OPTIONS = [
  {
    id: BOQ_TEMPLATE_NEW_PRODUCT_OPTION_IDS.PRODUCT_MASTER,
    title: 'Add from product master',
    description: 'Browse and select from existing products',
    Icon: RiSearchLine,
  },
  {
    id: BOQ_TEMPLATE_NEW_PRODUCT_OPTION_IDS.PREVIOUS_PROJECTS,
    title: 'Add from previous projects',
    description: "Copy items from completed BOQ's",
    Icon: RiFolderLine,
  },
];

/** Project BOQ add-product menu (product master + previous projects only). */
export const PROJECT_BOQ_NEW_PRODUCT_OPTIONS = [...BOQ_TEMPLATE_NEW_PRODUCT_OPTIONS];

export const BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS = {
  BRAND: 'brand',
  UNITS: 'units',
  AREA: 'areaLocation',
  BOQ_TYPE: 'boqType',
};

export const BOQ_TEMPLATE_PRODUCT_FILTER_TABS = [
  { value: BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS.BRAND, label: 'Brand' },
  { value: BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS.UNITS, label: 'Units' },
  { value: BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS.AREA, label: 'Area' },
  { value: BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS.BOQ_TYPE, label: 'BOQ Type' },
];

export const DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS = {
  brand: [],
  units: [],
  areaLocation: [],
  boqType: [],
};

export const BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG_TABLE_ID = 'boq-template-products-table';

export const BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG = [
  { id: 'product', columnLabel: 'Name', visible: true, enableHiding: true, width: '249px' },
  {
    id: 'areaLocation',
    columnLabel: 'Area/ location',
    visible: true,
    enableHiding: true,
    width: '151px',
  },
  {
    id: 'description',
    columnLabel: 'Description',
    visible: true,
    enableHiding: true,
    width: 'minmax(280px,340px)',
  },
  {
    id: 'productCategory',
    columnLabel: 'Category',
    visible: true,
    enableHiding: true,
    width: 'minmax(200px,260px)',
  },
  { id: 'brand', columnLabel: 'Brand', visible: true, enableHiding: true, width: '139px' },
  { id: 'er', columnLabel: 'ER', visible: true, enableHiding: true, width: '139px' },
  { id: 'units', columnLabel: 'Units', visible: true, enableHiding: true, width: '85px' },
  {
    id: 'quantity',
    columnLabel: 'Quantity',
    visible: false,
    enableHiding: true,
    width: '130px',
  },
  {
    id: 'purchaseRate',
    columnLabel: 'Purchase',
    visible: true,
    enableHiding: true,
    width: '108px',
  },
  {
    id: 'sellingRate',
    columnLabel: 'Selling',
    visible: true,
    enableHiding: true,
    width: '108px',
  },
  { id: 'make', columnLabel: 'Make', visible: true, enableHiding: true, width: '187px' },
  { id: 'notes', columnLabel: 'Notes', visible: true, enableHiding: true, width: '187px' },
];

/** ----- Shared timing & pagination ----- */

export const BOQ_SEARCH_DEBOUNCE_MS = 300;
export const BOQ_TEMPLATE_LIST_SEARCH_DEBOUNCE_MS = 400;
export const BOQ_COLUMN_PREF_DEBOUNCE_MS = 300;
export const BOQ_DEFAULT_LIST_LIMIT = 200;
export const BOQ_PRODUCT_MASTER_COUNT_FETCH_LIMIT = 500;
export const BOQ_OUTSIDE_CLICK_GUARD_MS = 200;

/** ----- Shared display ----- */

export const BOQ_EMPTY_CELL = '--';
export const BOQ_DEFAULT_PRODUCT_SECTION = 'Other';
export const BOQ_BRAND_COLORS = {
  primary: '#16a34a',
  primaryHover: '#15803d',
};

export const BOQ_LABELS = {
  noCategoriesFound: 'No categories found.',
  searchProductsPlaceholder: 'Search by code, name, brand and category',
};

export const BOQ_EMPTY_STATES = {
  default: {
    title: 'No templates yet',
    description: 'Create your first BOQ template to get started.',
  },
  search: {
    title: 'No templates match these filters',
    description: 'Try adjusting filters or clearing search.',
  },
};

/** ----- Project BOQs ----- */

export const PROJECT_BOQ_TYPES = {
  DESIGN: 'design',
  MAIN: 'main',
  ADDITIONAL: 'additional',
};

export const PROJECT_BOQ_DEFAULT_AREA_LOCATION = 'All Areas';

export const PROJECT_BOQ_NEW_OPTION_IDS = {
  DESIGN: 'design',
  MAIN: 'main',
  ADDITIONAL: 'additional',
};

export const PROJECT_BOQ_NEW_OPTIONS = [
  {
    id: PROJECT_BOQ_NEW_OPTION_IDS.DESIGN,
    title: 'Create a Design BOQ',
    description: 'Generate a BOQ from design drawings for planning and estimation',
    Icon: RiSearchLine,
  },
  {
    id: PROJECT_BOQ_NEW_OPTION_IDS.MAIN,
    title: 'Create a Main BOQ',
    description: 'Create the primary BOQ with all project quantities and items.',
    Icon: RiFolderLine,
  },
  {
    id: PROJECT_BOQ_NEW_OPTION_IDS.ADDITIONAL,
    title: 'Create a Additional BOQ',
    description: 'Add a supplementary BOQ for extra or revised project work.',
    Icon: RiFileExcel2Line,
  },
];

export const PROJECT_BOQ_STATUS = {
  ACTIVE: 'ACTIVE',
  REVIEW: 'REVIEW',
  DRAFT: 'DRAFT',
  INACTIVE: 'INACTIVE',
};

export const PROJECT_BOQ_VERSION_STATUS = {
  DRAFT: 'DRAFT',
  INTERNAL_REVIEW: 'INTERNAL_REVIEW',
  SEND_TO_CLIENT: 'SEND_TO_CLIENT',
  CLIENT_APPROVED: 'CLIENT_APPROVED',
  REVISION_REQUIRED: 'REVISION_REQUIRED',
  INITIATE_TO_PROCUREMENT: 'INITIATE_TO_PROCUREMENT',
  LOCKED: 'LOCKED',
};

export const PROJECT_BOQ_VERSION_STATUS_OPTIONS = [
  { value: PROJECT_BOQ_VERSION_STATUS.DRAFT, label: 'Draft' },
  { value: PROJECT_BOQ_VERSION_STATUS.INTERNAL_REVIEW, label: 'Internal Review' },
  { value: PROJECT_BOQ_VERSION_STATUS.SEND_TO_CLIENT, label: 'Send to client' },
  { value: PROJECT_BOQ_VERSION_STATUS.CLIENT_APPROVED, label: 'Client approved' },
  { value: PROJECT_BOQ_VERSION_STATUS.REVISION_REQUIRED, label: 'Revision required' },
  { value: PROJECT_BOQ_VERSION_STATUS.LOCKED, label: 'Locked' },
  {
    value: PROJECT_BOQ_VERSION_STATUS.INITIATE_TO_PROCUREMENT,
    label: 'Initiate to Procurement',
  },
];

export function getProjectBoqVersionStatusLabel(statusValue) {
  return (
    PROJECT_BOQ_VERSION_STATUS_OPTIONS.find((option) => option.value === statusValue)?.label ??
    statusValue ??
    'Draft'
  );
}

export const PROJECT_BOQS_COLUMN_CONFIG_TABLE_ID = 'project-boqs-table';

export const PROJECT_BOQS_COLUMN_CONFIG = [
  { id: 'code', columnLabel: 'Code', visible: true, enableHiding: true },
  { id: 'boqName', columnLabel: 'BOQ Name', visible: true, enableHiding: true },
  { id: 'project', columnLabel: 'Project', visible: true, enableHiding: true },
  { id: 'client', columnLabel: 'Client', visible: true, enableHiding: true },
  { id: 'clientValue', columnLabel: 'Client value', visible: true, enableHiding: true },
  { id: 'boqType', columnLabel: 'BOQ Type', visible: false, enableHiding: true },
  { id: 'version', columnLabel: 'Version', visible: false, enableHiding: true },
  { id: 'createdBy', columnLabel: 'Created by', visible: false, enableHiding: true },
  { id: 'updated', columnLabel: 'Updated', visible: false, enableHiding: true },
];

export const PROJECT_BOQ_FILTER_TAB_IDS = {
  CLIENT: 'client',
  CLIENT_VALUE: 'clientValue',
  PROJECT: 'project',
  BOQ_TYPE: 'boqType',
};

export const PROJECT_BOQ_FILTER_TABS = [
  { value: PROJECT_BOQ_FILTER_TAB_IDS.CLIENT, label: 'Client' },
  { value: PROJECT_BOQ_FILTER_TAB_IDS.CLIENT_VALUE, label: 'Client value' },
  { value: PROJECT_BOQ_FILTER_TAB_IDS.PROJECT, label: 'Project' },
  { value: PROJECT_BOQ_FILTER_TAB_IDS.BOQ_TYPE, label: 'BOQ type' },
];

export const DEFAULT_PROJECT_BOQ_FILTERS = {
  client: [],
  clientValue: [],
  project: [],
  boqType: [],
};

export const DEFAULT_PROJECT_BOQ_FORM = {
  client: '',
  project: '',
  boqTemplate: '',
  description: '',
  boqType: '',
};

export const PROJECT_BOQ_DRAWER_TAB_IDS = {
  PRODUCTS: 'products',
  ACTIVITY: 'activity',
};

export const PROJECT_BOQ_DRAWER_TABS = [
  {
    id: PROJECT_BOQ_DRAWER_TAB_IDS.PRODUCTS,
    label: 'Products',
    Icon: RiBox3Line,
  },
  {
    id: PROJECT_BOQ_DRAWER_TAB_IDS.ACTIVITY,
    label: 'Activity',
    Icon: RiPulseLine,
  },
];

export const PROJECT_BOQ_DETAIL_SECTION_TAB_IDS = {
  OVERVIEW: 'overview',
  COMPARISON_BOQ: 'comparison-boq',
  INTERNAL_BOQ: 'internal-boq',
  CLIENT_BOQ: 'client-boq',
  PACKAGE_STRATEGY: 'package-strategy',
  PROCUREMENT_PACKAGES: 'procurement-packages',
};

export const BOQ_PRODUCT_TARGET = {
  TEMPLATE: 'template',
  PROJECT: 'project',
};

export const BOQ_PRODUCT_SOURCE = {
  PRODUCT: 'From Product',
  PREVIOUS_PROJECT: 'From Previous Project',
  CUSTOM: 'Custom Line',
};

/** Temporarily hide Convert to Product in Purchase BOQ only. */
export const ENABLE_PURCHASE_BOQ_CONVERT_TO_PRODUCT = false;

export const PROJECT_BOQ_PRICE_VIEW = {
  COMPARISON: 'comparison',
  INTERNAL: 'internal',
  CLIENT: 'client',
};

export const PROJECT_BOQ_SECTION_PRICE_VIEW = {
  [PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.COMPARISON_BOQ]: PROJECT_BOQ_PRICE_VIEW.COMPARISON,
  [PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.INTERNAL_BOQ]: PROJECT_BOQ_PRICE_VIEW.INTERNAL,
  [PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.CLIENT_BOQ]: PROJECT_BOQ_PRICE_VIEW.CLIENT,
};

export const PROJECT_BOQ_DETAIL_SECTION_TABS = [
  {
    id: PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.OVERVIEW,
    label: 'Overview',
    Icon: RiPieChartLine,
  },
  {
    id: PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.COMPARISON_BOQ,
    label: 'Comparison BOQ',
    Icon: RiBox3Line,
  },
  {
    id: PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.INTERNAL_BOQ,
    label: 'Internal BOQ',
    Icon: RiFileLine,
  },
  {
    id: PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.CLIENT_BOQ,
    label: 'Client BOQ',
    Icon: RiGroupLine,
  },
  // {
  //   id: PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.PACKAGE_STRATEGY,
  //   label: 'Package strategy',
  //   Icon: RiStackLine,
  // },
  // {
  //   id: PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.PROCUREMENT_PACKAGES,
  //   label: 'Procurement packages',
  //   Icon: RiPantoneLine,
  // },
];

export const PROJECT_BOQ_TEMPLATE_SELECT_TAB_IDS = {
  TEMPLATE_MASTER: 'template-master',
  PREVIOUS_PROJECTS: 'previous-projects',
};

/** Prefix for previous-project selections in the BOQ template picker. */
export const PROJECT_BOQ_PREVIOUS_PROJECT_PREFIX = 'prev:';

export const PROJECT_BOQ_EMPTY_STATES = {
  default: {
    title: 'No project BOQs yet',
    description: 'Create your first project BOQ to get started.',
  },
  search: {
    title: 'No project BOQs match these filters',
    description: 'Try adjusting filters or clearing search.',
  },
};
