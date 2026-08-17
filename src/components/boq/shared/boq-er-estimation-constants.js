export const BOQ_ER_VIEW_MODES = {
  LAYOUT: 'layout',
  THREED: '3d',
  GFC: 'gfc',
};

export const BOQ_ER_VIEW_MODE_OPTIONS = [
  { id: BOQ_ER_VIEW_MODES.LAYOUT, label: 'Layout' },
  { id: BOQ_ER_VIEW_MODES.THREED, label: "3D's" },
  { id: BOQ_ER_VIEW_MODES.GFC, label: 'GFC' },
];

/** Task types shown as markers on the ER 3D’s / GFC layout tabs. */
export const BOQ_ER_TASK_TYPES = {
  THREED: '3D Tasks',
  GFC: 'GFC Tasks',
};

export const BOQ_ER_VIEW_MODE_TASK_TYPE = {
  [BOQ_ER_VIEW_MODES.THREED]: BOQ_ER_TASK_TYPES.THREED,
  [BOQ_ER_VIEW_MODES.GFC]: BOQ_ER_TASK_TYPES.GFC,
};

export const BOQ_ER_TABLE_COLUMNS = [
  {
    id: 'areaType',
    label: 'Subarea name',
    width: 160,
    sortable: false,
    headClassName: 'pl-[20px] pr-3',
    cellClassName: 'pl-[20px] pr-2',
    highlightedBg: 'bg-[#fbfbfb]',
    editable: true,
    inputType: 'text',
  },
  {
    id: 'item',
    label: 'Item',
    width: 236,
    sortable: false,
    headClassName: 'px-3',
    cellClassName: 'pl-3 pr-5',
    highlightedBg: 'bg-bg-white-0',
  },
  {
    id: 'uom',
    label: 'UOM',
    width: 99,
    sortable: true,
    headClassName: 'px-3',
    cellClassName: 'pl-3 pr-5',
    highlightedBg: 'bg-[#fbfbfb]',
  },
  {
    id: 'length',
    label: 'Length',
    width: 90,
    sortable: true,
    headClassName: 'px-3',
    cellClassName: 'px-2',
    highlightedBg: 'bg-[#fbfbfb]',
    editable: true,
  },
  {
    id: 'breadth',
    label: 'Breadth',
    width: 90,
    sortable: true,
    headClassName: 'px-3',
    cellClassName: 'px-2',
    highlightedBg: 'bg-[#fbfbfb]',
    editable: true,
  },
  {
    id: 'height',
    label: 'Height',
    width: 90,
    sortable: true,
    headClassName: 'px-3',
    cellClassName: 'px-2',
    highlightedBg: 'bg-[#fbfbfb]',
    editable: true,
  },
  {
    id: 'qty',
    label: 'Qty.',
    width: 90,
    sortable: true,
    headClassName: 'px-3',
    cellClassName: 'px-2',
    highlightedBg: 'bg-[#fbfbfb]',
    editable: false,
  },
  {
    id: 'actions',
    label: '',
    width: 96,
    sortable: false,
    headClassName: 'h-9 px-0',
    cellClassName: 'p-3',
    highlightedBg: 'bg-bg-white-0',
  },
];

export const BOQ_ER_EDITABLE_ITEM_FIELDS = ['areaType', 'length', 'breadth', 'height'];

export const BOQ_ER_DIMENSION_ITEM_FIELDS = ['length', 'breadth', 'height'];

export const BOQ_ER_TEXT_ITEM_FIELDS = ['areaType'];

export const BOQ_ER_LINE_ITEM_UPDATED_TOAST = 'Line item has been updated.';
