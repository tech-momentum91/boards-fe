/** Page 3 layouts — position-only slots; shared typography per section. */

export const PAGE3_HIGHLIGHT_LEFTS = [119.22, 559.48];

export const PAGE3_HIGHLIGHT_SLOT = {
  top: 906.17,
  width: 420,
  height: 200,
  valueSize: 58.667,
  labelLeft: 210,
  labelTop: 21.24,
  descLeft: 1,
  descTop: 74.22,
  descWidth: 332.404,
  iconSize: 55.068,
};

export const PAGE3_HIGHLIGHT_LAYOUTS = PAGE3_HIGHLIGHT_LEFTS.map((left) => ({
  left,
  ...PAGE3_HIGHLIGHT_SLOT,
}));

export const PAGE3_PRESENCE_TOPS = [1131.84, 1332.14, 1532.64];

export const PAGE3_PRESENCE_SLOT = {
  left: 119.22,
  width: 750,
  titleLeft: 82,
  titleTop: 6.66,
  titleWidth: 612.946,
  descLeft: 3,
  descTop: 76.07,
  descWidth: 723.772,
  iconSize: 55.068,
};

export const PAGE3_PRESENCE_LAYOUTS = PAGE3_PRESENCE_TOPS.map((top) => ({
  top,
  ...PAGE3_PRESENCE_SLOT,
}));

export const PAGE3_STAT_LEFTS = [124.25, 526.28, 898.28, 1327.72, 1717.06, 2089.05];

export const PAGE3_STAT_SLOT = {
  top: 2066,
  titleLeft: 47,
  titleTop: 3.5,
  titleWidth: 225,
  valueTop: 57,
  valueWidth: 285,
  descTop: 140,
  descWidth: 250,
  valueSize: 62,
  descSize: 22,
  iconSize: 37,
};

export const PAGE3_STAT_LAYOUTS = PAGE3_STAT_LEFTS.map((left) => ({
  left,
  ...PAGE3_STAT_SLOT,
}));
