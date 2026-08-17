/**
 * Page 5 gallery layouts — Figma City-Proposals (nodes 470:151, 455:76, 462:2).
 * Naming: `{leftCount}_x_{rightCount}` — e.g. 4_x_1 = four tiles left, one hero right.
 *
 * Image files use sequential numbers (1.png … n.png) in slot order:
 *
 * 4_x_1 (5 images):        3_x_1 common (4 images):
 *   1  2  5                    1  2  4
 *   3  4                       3
 *
 * 3_x_1 meeting/offices (3):  1_x_1 meeting (2):      1_x_0 (1 image):
 *   1  3                       1  2                    1
 *   2
 */

export const PAGE5_SECTION_KEYS = ['commonAreas', 'meetingRooms', 'offices'];

export const PAGE5_DEFAULT_LAYOUTS = {
  commonAreas: '4_x_1',
  meetingRooms: '2_x_1',
  offices: '3_x_1',
};

/** Section title + divider — shared across layout variants per section. */
export const PAGE5_SECTION_CHROME = {
  commonAreas: {
    titleTop: 669.95,
    titleWidth: 280.906,
    divider: { left: 428.27, top: 695.08, width: 1945.865 },
  },
  meetingRooms: {
    titleTop: 1606,
    titleWidth: 280.406,
    divider: { left: 427.61, top: 1629.13, width: 1946.865 },
  },
  offices: {
    titleTop: 2542.78,
    titleWidth: 208.406,
    divider: { left: 356.2, top: 2565.91, width: 2018.278 },
  },
};

export const PAGE5_GALLERY_LAYOUTS = {
  commonAreas: {
    /** 5 images — 2×2 grid left + hero right (Figma 470:151). */
    '4_x_1': {
      slots: [
        { key: '1', left: 121.29, top: 774.95, width: 469.812, height: 340.61 },
        { key: '2', left: 611.56, top: 774.95, width: 469.812, height: 340.61 },
        { key: '3', left: 121.29, top: 1135.39, width: 469.812, height: 340.61 },
        { key: '4', left: 611.56, top: 1135.39, width: 469.812, height: 340.61 },
        { key: '5', left: 1101.51, top: 774.95, width: 1272.965, height: 701.054 },
      ],
    },
    /** 4 images — 2 top + 1 wide bottom left + hero right (Figma 455:76 / 462:2). */
    '3_x_1': {
      slots: [
        { key: '1', left: 121.29, top: 774.95, width: 469.812, height: 340.61 },
        { key: '2', left: 611.56, top: 774.95, width: 469.812, height: 340.61 },
        { key: '3', left: 121, top: 1135, width: 960, height: 341 },
        { key: '4', left: 1101.51, top: 774.95, width: 1272.965, height: 701.054 },
      ],
    },
  },
  meetingRooms: {
    /** 3 images — 2 stacked left + hero right (Figma 462:2). */
    '2_x_1': {
      slots: [
        { key: '1', left: 116.72, top: 1711.27, width: 959.929, height: 341.187 },
        { key: '2', left: 116.72, top: 2072.45, width: 959.929, height: 340.322 },
        { key: '3', left: 1096.88, top: 1711.27, width: 1277.601, height: 701.509 },
      ],
    },
    /** 2 images — tall tile left + hero right. */
    '1_x_1': {
      slots: [
        { key: '1', left: 116.72, top: 1711.27, width: 959.929, height: 701.509 },
        { key: '2', left: 1096.88, top: 1711.27, width: 1277.601, height: 701.509 },
      ],
    },
    /** 1 image — full-width panorama (Figma 455:76). */
    '1_x_0': {
      slots: [{ key: '1', left: 116.72, top: 1711, width: 2257.273, height: 702 }],
    },
  },
  offices: {
    /** 3 images — 2 stacked left + hero right (Figma 455:76, only variant). */
    '3_x_1': {
      slots: [
        { key: '1', left: 116.72, top: 2648.04, width: 959.929, height: 341.187 },
        { key: '2', left: 116.72, top: 3009.23, width: 959.929, height: 340.322 },
        { key: '3', left: 1096.88, top: 2648.04, width: 1277.601, height: 701.509 },
      ],
    },
  },
};

const SECTION_CSS_SUFFIX = {
  commonAreas: 'common',
  meetingRooms: 'meeting',
  offices: 'offices',
};

const PAGE5_SECTION_FOLDERS = {
  commonAreas: 'common-areas',
  meetingRooms: 'meeting-rooms',
  offices: 'offices',
};

export function resolvePage5SectionLayout(sectionKey, layoutId) {
  const layouts = PAGE5_GALLERY_LAYOUTS[sectionKey];
  if (!layouts) return null;
  return layouts[layoutId] ?? layouts[PAGE5_DEFAULT_LAYOUTS[sectionKey]];
}

export function resolvePage5LayoutId(sectionKey, layoutId) {
  const layouts = PAGE5_GALLERY_LAYOUTS[sectionKey];
  if (!layouts) return PAGE5_DEFAULT_LAYOUTS[sectionKey];
  return layoutId && layouts[layoutId] ? layoutId : PAGE5_DEFAULT_LAYOUTS[sectionKey];
}

export function getPage5SectionCssSuffix(sectionKey) {
  return SECTION_CSS_SUFFIX[sectionKey] ?? sectionKey;
}

/** Width/height pairs for PDF cover baking — keyed by image slot number. */
export function getPage5GalleryImageFrames(sectionKey, layoutId) {
  const layout = resolvePage5SectionLayout(sectionKey, layoutId);
  if (!layout) return {};
  return Object.fromEntries(layout.slots.map(({ key, width, height }) => [key, { width, height }]));
}

/**
 * Build page 5 section layouts + numbered image paths.
 * @param {string} imageBasePath — e.g. /proposal-template/page-5 or /proposal-template/page-5/centers/NRK-IDR
 * @param {Partial<Record<typeof PAGE5_SECTION_KEYS[number], string>>} layouts — per-section layout ids
 */
export function buildPage5Sections(imageBasePath, layouts = {}) {
  return Object.fromEntries(
    PAGE5_SECTION_KEYS.map((sectionKey) => {
      const layoutId = resolvePage5LayoutId(sectionKey, layouts[sectionKey]);
      const layout = resolvePage5SectionLayout(sectionKey, layoutId);
      const folder = PAGE5_SECTION_FOLDERS[sectionKey];
      const images = Object.fromEntries(
        layout.slots.map(({ key }) => [key, `${imageBasePath}/${folder}/${key}.png`]),
      );
      return [sectionKey, { layout: layoutId, images }];
    }),
  );
}

/**
 * Build page 5 section layouts + image paths for a center registry entry.
 * @param {string} centerKey — e.g. NRK-IDR, JT-NOI
 * @param {Partial<Record<typeof PAGE5_SECTION_KEYS[number], string>>} layouts — per-section layout ids
 */
export function buildPage5CenterSections(centerKey, layouts = {}) {
  return buildPage5Sections(`/proposal-template/page-5/centers/${centerKey}`, layouts);
}
