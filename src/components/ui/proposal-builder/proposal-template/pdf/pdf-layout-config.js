/** Hero clip frames + image offsets — mirrors pdf page components / Figma CSS. */
export const PDF_HERO_LAYOUTS = {
  page1: {
    frame: { width: 2528.666, height: 1550.573 },
    image: { left: -70.939, top: -197.346, width: 2621.877, height: 1747.918 },
  },
  page2: {
    frame: { width: 2557.054, height: 539.197 },
    image: { left: 0, top: -200.843, width: 2557.054, height: 1704.703 },
  },
  page3: {
    frame: { width: 2552.999, height: 539.197 },
    image: { left: 0, top: -200.1, width: 2552.999, height: 1701.999 },
  },
  page4: {
    frame: { width: 2550, height: 539.197 },
    image: { left: 0, top: -199.55, width: 2550, height: 1700 },
  },
  page5: {
    frame: { width: 2540.833, height: 539.197 },
    image: { left: 0, top: -197.86, width: 2540.833, height: 1693.888 },
  },
  page6: {
    frame: { width: 2520.555, height: 539.197 },
    image: { left: 0, top: -194.13, width: 2520.555, height: 1680.37 },
  },
  page7: {
    frame: { width: 2565.166, height: 539.197 },
    image: { left: 0, top: -202.34, width: 2565.166, height: 1710.11 },
  },
  page8: {
    frame: { width: 2593.55, height: 539.2 },
    image: { left: 0, top: -207.56, width: 2593.55, height: 1729.04 },
  },
  page9: {
    frame: { width: 2528.666, height: 1550.573 },
    image: { left: -70.939, top: -197.346, width: 2621.877, height: 1747.918 },
  },
};

/** Cover gallery clip sizes — object-fit: cover baked at export time. */
export const PDF_COVER_GALLERY_FRAMES = {
  galleryWide: { width: 2157.99, height: 755.501 },
  galleryLeftTop: { width: 1049, height: 667.38 },
  galleryLeftBottom: { width: 1049, height: 667.38 },
  galleryRight: { width: 1060.224, height: 1381.497 },
};

/** Page 2 footer — Figma node 1:61 */
export const PDF_PAGE2_FOOTER = {
  wrap: { width: 2772.439, height: 971.503 },
  image: { left: 0.19, top: -504.46, width: 2772.439, height: 1850.603 },
};

/** Page 3 footer skyline — mirrors .proposal-page-3__footer-wrap / __footer-image */
export const PDF_PAGE3_FOOTER = {
  height: 1217.61,
};

/** Cover logo clip — mirrors .proposal-page-1__logo-wrap / .proposal-page-9__logo-wrap */
export const PDF_COVER_LOGO = {
  position: { left: 158.17, top: 286.94, width: 228.706, height: 70.647 },
  image: { left: -51.01, top: -133.12, width: 335.559, height: 335.559 },
};

/** Page 8 footer office photo — mirrors .proposal-page-8__footer-wrap / __footer-image */
export const PDF_PAGE8_FOOTER = {
  position: { left: -23.78, top: 2794.71, width: 2523.781, height: 745.054 },
  image: { left: -117.44, top: -677.21, width: 2665, height: 1788 },
};

/** Page 6 inclusions heading — mirrors .proposal-page-6__inclusions-title / __inclusions-subtitle */
export const PDF_PAGE6_INCLUSIONS_TEXT = {
  title: {
    left: 205.53,
    top: 2027,
    width: 1400,
    height: 75,
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 60,
    letterSpacing: -1.28,
    color: '#444545',
  },
  subtitle: {
    left: 207.2,
    top: 2118.42,
    width: 2206,
    height: 59,
    fontFamily: 'DM Sans',
    fontWeight: '400',
    fontSize: 46,
    letterSpacing: -1.0133,
    color: '#444545',
    opacity: 0.87,
  },
};

/** Page 3 about city — mirrors .proposal-page-3__about-title / __about-subtitle */
export const PDF_PAGE3_ABOUT = {
  title: {
    left: 119.22,
    top: 1844,
    width: 2248,
    font: 'inter',
    size: 61,
    lineHeight: 1.25,
    letterSpacing: -1.28,
    color: '#444545',
  },
  subtitle: {
    left: 120.89,
    top: 1935,
    width: 2248,
    font: 'dmSans',
    size: 48.667,
    letterSpacing: -1.0133,
    color: '#444545',
    opacity: 0.87,
  },
};
