import {
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-constants';

/** Page 4 layout tokens — mirrors proposal-template.css variation classes. */

/** Variation-3 grid stats — Figma 116:292 / `.proposal-page--4-variation-3` CSS. */
export const PAGE4_GRID_STATS_GROUP = {
  left: 202,
  top: 832.5,
  width: 723,
  height: 490.37,
};

export const PAGE4_GRID_STAT_SLOTS = [
  { left: 0, top: 0, contentPaddingLeft: 44.6 },
  {
    left: 433.89,
    top: 0,
    contentPaddingLeft: 44.11,
    valueSize: 66.667,
    sublabelSize: 24.957,
  },
  { left: 0, top: 316.37, contentPaddingLeft: 44.55 },
  { left: 434, top: 316.18, contentPaddingLeft: 44.6, valueSize: 64.667 },
];

/** `.proposal-page-4__building-wrap` — bottom edge aligns to y=1997 on the page. */
const PAGE4_BUILDING_BOTTOM_Y = 1997;

function createBuildingLayout(objectPosition) {
  return {
    wrap: {
      left: 0,
      top: PAGE4_BUILDING_BOTTOM_Y - PDF_PAGE_HEIGHT,
      width: PDF_PAGE_WIDTH,
      height: PDF_PAGE_HEIGHT,
    },
    objectPosition,
  };
}

const ROW_STAT_LABEL_HEIGHT = 34.173;
const ROW_STAT_VALUE_SIZE = 60.667;
const ROW_STAT_SUBLABEL_SIZE = 22.957;
const ROW_STAT_VALUE_SUFFIX_SIZE = 22.933;
const ROW_STAT_VALUE_SUPERSCRIPT_SIZE = 36.213;

const ROW_STAT_TYPOGRAPHY = [
  {
    labelSize: 30.173,
    labelHeight: ROW_STAT_LABEL_HEIGHT,
    valueSize: ROW_STAT_VALUE_SIZE,
    sublabelSize: ROW_STAT_SUBLABEL_SIZE,
    valueSuffixSize: ROW_STAT_VALUE_SUFFIX_SIZE,
  },
  {
    labelSize: 34.173,
    labelHeight: ROW_STAT_LABEL_HEIGHT,
    valueSize: ROW_STAT_VALUE_SIZE,
    sublabelSize: ROW_STAT_SUBLABEL_SIZE,
    valueSuffixSize: ROW_STAT_VALUE_SUFFIX_SIZE,
  },
  {
    labelSize: 30.173,
    labelHeight: ROW_STAT_LABEL_HEIGHT,
    valueSize: ROW_STAT_VALUE_SIZE,
    sublabelSize: ROW_STAT_SUBLABEL_SIZE,
    valueSuffixSize: ROW_STAT_VALUE_SUFFIX_SIZE,
  },
  {
    labelSize: 34.173,
    labelHeight: ROW_STAT_LABEL_HEIGHT,
    valueSize: ROW_STAT_VALUE_SIZE,
    sublabelSize: ROW_STAT_SUBLABEL_SIZE,
    valueSuffixSize: ROW_STAT_VALUE_SUFFIX_SIZE,
    valueSuperscriptSize: ROW_STAT_VALUE_SUPERSCRIPT_SIZE,
  },
];

function createStatsRowLayout(left) {
  return {
    left,
    top: 674,
    width: PDF_PAGE_WIDTH - left - 119.22,
    minHeight: 173.939,
  };
}

const PAGE4_LOCATION_LEFT_TITLE_WIDTH = 540;
const PAGE4_LOCATION_RIGHT_TITLE_WIDTH = 570;

const SHARED_SECTIONS = {
  locationsDefault: [
    {
      left: 160.1,
      top: 2129.5,
      titleWidth: PAGE4_LOCATION_LEFT_TITLE_WIDTH,
      descWidth: 424.191,
      descTop: 63.43,
      containerWidth: PAGE4_LOCATION_LEFT_TITLE_WIDTH,
    },
    {
      left: 700.63,
      top: 2129.5,
      titleWidth: PAGE4_LOCATION_RIGHT_TITLE_WIDTH,
      descWidth: 424.191,
      descTop: 63.43,
      containerWidth: PAGE4_LOCATION_RIGHT_TITLE_WIDTH,
    },
    {
      left: 160.1,
      top: 2420.26,
      titleWidth: PAGE4_LOCATION_LEFT_TITLE_WIDTH,
      descWidth: 424.191,
      descTop: 63.43,
      containerWidth: PAGE4_LOCATION_LEFT_TITLE_WIDTH,
    },
    {
      left: 700.63,
      top: 2420.26,
      titleWidth: PAGE4_LOCATION_RIGHT_TITLE_WIDTH,
      descWidth: 481.431,
      descTop: 63.42,
      containerWidth: PAGE4_LOCATION_RIGHT_TITLE_WIDTH,
    },
  ],
  mapDefault: {
    frame: { left: 1271, top: 2086.5, width: 995, height: 650 },
    image: { left: 0, top: 0, width: 995, height: 650 },
    objectFit: 'contain',
    objectPosition: 'center',
  },
  neighborsDefault: {
    title: { left: 160.1, top: 2726.22, width: 330.953 },
    subtitle: { left: 163.3, top: 2784.5, width: 1018.758 },
    cardLefts: [160.1, 870, 1580.41],
    cardTop: 2906.74,
  },
};

/** Locations, map, and neighbors — same for every stats layout variation. */
export const PDF_PAGE4_SHARED_FOOTER = {
  locations: SHARED_SECTIONS.locationsDefault,
  map: SHARED_SECTIONS.mapDefault,
  neighbors: SHARED_SECTIONS.neighborsDefault,
};

export const PDF_PAGE4_LAYOUTS = {
  'variation-1': {
    type: 'row',
    statsRow: createStatsRowLayout(809.39),
    statTypography: ROW_STAT_TYPOGRAPHY,
    building: createBuildingLayout('bottom center'),
    locations: SHARED_SECTIONS.locationsDefault,
    map: SHARED_SECTIONS.mapDefault,
    neighbors: SHARED_SECTIONS.neighborsDefault,
  },
  'variation-2': {
    type: 'row',
    statsRow: createStatsRowLayout(204.6),
    statTypography: ROW_STAT_TYPOGRAPHY,
    building: createBuildingLayout('bottom center'),
    locations: SHARED_SECTIONS.locationsDefault,
    map: SHARED_SECTIONS.mapDefault,
    neighbors: SHARED_SECTIONS.neighborsDefault,
  },
  'variation-3': {
    type: 'grid',
    statsGroup: PAGE4_GRID_STATS_GROUP,
    gridStats: PAGE4_GRID_STAT_SLOTS,
    statTypography: ROW_STAT_TYPOGRAPHY,
    building: createBuildingLayout('bottom right'),
    locations: SHARED_SECTIONS.locationsDefault,
    map: SHARED_SECTIONS.mapDefault,
    neighbors: SHARED_SECTIONS.neighborsDefault,
  },
};

export function getPdfPage4Layout(statsLayout = 'variation-1') {
  return PDF_PAGE4_LAYOUTS[statsLayout] ?? PDF_PAGE4_LAYOUTS['variation-1'];
}
