import { normHex } from '@/components/ui/proposal-builder/theme/theme-contrast';

import {
  getPage5GalleryImageFrames,
  PAGE5_SECTION_KEYS,
  resolvePage5LayoutId,
} from '@/components/ui/proposal-builder/proposal-template/page-5-gallery-layouts';
import {
  PDF_COVER_GALLERY_FRAMES,
  PDF_COVER_LOGO,
  PDF_HERO_LAYOUTS,
  PDF_PAGE3_FOOTER,
  PDF_PAGE8_FOOTER,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-layout-config';
import { getPdfPage4Layout } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-page-4-layout';
import {
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-constants';
import { resolvePdfAssetUrl } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-primitives';

/** Matches web `.proposal-hero-bg-wrap--client-ai` opacity */
const PDF_HERO_TINT_OPACITY = 0.4;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.addEventListener('load', () => resolve(img), { once: true });
    img.addEventListener('error', reject, { once: true });
    img.src = src;
  });
}

function canvasToDataUrl(canvas, mime = 'image/jpeg', quality = 0.92) {
  return canvas.toDataURL(mime, quality);
}

/**
 * Draw image into frame with optional offset (hero crop) and optional color-blend tint.
 * Approximates web `mix-blend-mode: color` via canvas globalCompositeOperation.
 */
export async function bakeHeroBackground(
  src,
  layout,
  tintColor,
  tintOpacity = PDF_HERO_TINT_OPACITY,
) {
  if (!src || typeof document === 'undefined') return src;

  try {
    const { frame, image } = layout;
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(frame.width);
    canvas.height = Math.round(frame.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;

    const ix = image?.left ?? 0;
    const iy = image?.top ?? 0;
    const iw = image?.width ?? frame.width;
    const ih = image?.height ?? frame.height;

    ctx.drawImage(img, ix, iy, iw, ih);

    if (tintColor) {
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = tintOpacity;
      ctx.fillStyle = normHex(tintColor);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return canvasToDataUrl(canvas);
  } catch {
    return src;
  }
}

function parseObjectPosition(position) {
  const parts = String(position || 'center')
    .trim()
    .split(/\s+/);
  if (parts.length === 1) {
    const token = parts[0];
    if (token === 'center') return ['center', 'center'];
    if (token === 'top' || token === 'bottom') return [token, 'center'];
    if (token === 'left' || token === 'right') return ['center', token];
  }
  return [parts[0] || 'center', parts[1] || 'center'];
}

function axisOffset(axis, frameSize, contentSize) {
  if (axis === 'left' || axis === 'top') return 0;
  if (axis === 'right' || axis === 'bottom') return frameSize - contentSize;
  return (frameSize - contentSize) / 2;
}

/** object-fit: cover into a fixed frame (gallery tiles, page 4 map). */
export async function bakeCoverImage(
  src,
  frameWidth,
  frameHeight,
  objectPosition = 'center',
  { preserveAlpha = false, backgroundColor = '#ffffff' } = {},
) {
  if (!src || typeof document === 'undefined') return src;

  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(frameWidth);
    canvas.height = Math.round(frameHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;

    if (preserveAlpha) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const scale = Math.max(frameWidth / img.naturalWidth, frameHeight / img.naturalHeight);
    const width = img.naturalWidth * scale;
    const height = img.naturalHeight * scale;
    const [vertical, horizontal] = parseObjectPosition(objectPosition);
    const left = axisOffset(horizontal, frameWidth, width);
    const top = axisOffset(vertical, frameHeight, height);

    ctx.drawImage(img, left, top, width, height);
    return canvasToDataUrl(canvas, preserveAlpha ? 'image/png' : 'image/jpeg');
  } catch {
    return src;
  }
}

/** object-fit: contain into a fixed frame with CSS-like object-position. */
export async function bakeContainImage(
  src,
  frameWidth,
  frameHeight,
  objectPosition = 'center',
  { preserveAlpha = false, backgroundColor = '#ffffff' } = {},
) {
  if (!src || typeof document === 'undefined') return src;

  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(frameWidth);
    canvas.height = Math.round(frameHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;

    const scale = Math.min(frameWidth / img.naturalWidth, frameHeight / img.naturalHeight);
    const width = img.naturalWidth * scale;
    const height = img.naturalHeight * scale;
    const [vertical, horizontal] = parseObjectPosition(objectPosition);
    const left = axisOffset(horizontal, frameWidth, width);
    const top = axisOffset(vertical, frameHeight, height);

    if (preserveAlpha) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, left, top, width, height);
    return canvasToDataUrl(canvas, preserveAlpha ? 'image/png' : 'image/jpeg');
  } catch {
    return src;
  }
}

/** width: 100%, bottom-aligned, natural aspect ratio — mirrors page 3 footer skyline CSS. */
export async function bakeWidthFitBottomImage(src, frameWidth, frameHeight) {
  if (!src || typeof document === 'undefined') return src;

  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(frameWidth);
    canvas.height = Math.round(frameHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;

    const scale = frameWidth / img.naturalWidth;
    const drawHeight = img.naturalHeight * scale;
    const top = frameHeight - drawHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, top, frameWidth, drawHeight);
    return canvasToDataUrl(canvas);
  } catch {
    return src;
  }
}

/** Grayscale + opacity — mirrors web `.proposal-page-8__client-logo` filter. */
export async function bakeGrayscaleLogo(src, opacity = 0.55) {
  if (!src || typeof document === 'undefined') return src;

  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;

    ctx.filter = 'brightness(0) saturate(100%)';
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, 0, 0);
    return canvasToDataUrl(canvas, 'image/png');
  } catch {
    return src;
  }
}

/**
 * Bake a CSS clip frame (negative image offsets) into a flat image for react-pdf.
 * Mirrors cropped `<img>` inside `overflow: hidden` wrappers on web pages.
 */
export async function bakeClippedImage(
  src,
  frame,
  image,
  { mime = 'image/jpeg', quality = 0.92, backgroundColor = '#ffffff' } = {},
) {
  if (!src || typeof document === 'undefined') return src;

  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(frame.width);
    canvas.height = Math.round(frame.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;

    if (mime === 'image/png') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const ix = image?.left ?? 0;
    const iy = image?.top ?? 0;
    const iw = image?.width ?? frame.width;
    const ih = image?.height ?? frame.height;
    ctx.drawImage(img, ix, iy, iw, ih);
    return canvasToDataUrl(canvas, mime, quality);
  } catch {
    return src;
  }
}

/** White logo — mirrors web `.proposal-page-1__logo` / `.proposal-page-9__logo` filter. */
export async function bakeWhiteLogo(src) {
  if (!src || typeof document === 'undefined') return src;

  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;

    ctx.filter = 'brightness(0) saturate(100%) invert(1)';
    ctx.drawImage(img, 0, 0);
    return canvasToDataUrl(canvas, 'image/png');
  } catch {
    return src;
  }
}

async function resolveSrc(src, origin) {
  const url = resolvePdfAssetUrl(src, origin);
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return url;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return url;
  }
}

/**
 * Bake heroes (color blend), cover galleries, and grayscale client logos for PDF export.
 */
export async function applyPdfImageProcessing(
  content,
  origin,
  { clientAiTheme, primaryColor } = {},
) {
  if (!content || typeof content !== 'object' || typeof document === 'undefined') {
    return content;
  }

  const next = JSON.parse(JSON.stringify(content));

  const heroPages = Object.keys(PDF_HERO_LAYOUTS);
  await Promise.all(
    heroPages.map(async (pageKey) => {
      const page = next[pageKey];
      const heroSrc = page?.images?.heroBackground;
      if (!heroSrc) return;

      const resolved = await resolveSrc(heroSrc, origin);
      try {
        const baked = await bakeHeroBackground(
          resolved,
          PDF_HERO_LAYOUTS[pageKey],
          clientAiTheme && primaryColor ? primaryColor : null,
        );
        page.images.heroBackground = baked;
      } finally {
        if (resolved.startsWith('blob:')) URL.revokeObjectURL(resolved);
      }
    }),
  );

  for (const pageKey of ['page1', 'page9']) {
    const page = next[pageKey];
    if (!page?.images) continue;

    const logoSrc = page.images.logo;
    if (logoSrc) {
      const resolvedLogo = await resolveSrc(logoSrc, origin);
      const pageImages = page.images;
      try {
        const whiteLogo = await bakeWhiteLogo(resolvedLogo);
        pageImages.logo = await bakeClippedImage(
          whiteLogo,
          {
            width: PDF_COVER_LOGO.position.width,
            height: PDF_COVER_LOGO.position.height,
          },
          PDF_COVER_LOGO.image,
          { mime: 'image/png' },
        );
      } finally {
        if (resolvedLogo.startsWith('blob:')) URL.revokeObjectURL(resolvedLogo);
      }
    }

    await Promise.all(
      Object.entries(PDF_COVER_GALLERY_FRAMES).map(async ([key, frame]) => {
        const src = page.images[key];
        if (!src) return;

        const resolved = await resolveSrc(src, origin);
        const pageImages = page.images;
        try {
          pageImages[key] = await bakeCoverImage(resolved, frame.width, frame.height);
        } finally {
          if (resolved.startsWith('blob:')) URL.revokeObjectURL(resolved);
        }
      }),
    );
  }

  const page8 = next.page8;
  if (page8?.images?.footerOffice) {
    const resolved = await resolveSrc(page8.images.footerOffice, origin);
    try {
      page8.images.footerOffice = await bakeClippedImage(
        resolved,
        {
          width: PDF_PAGE8_FOOTER.position.width,
          height: PDF_PAGE8_FOOTER.position.height,
        },
        PDF_PAGE8_FOOTER.image,
      );
    } finally {
      if (resolved.startsWith('blob:')) URL.revokeObjectURL(resolved);
    }
  }

  if (page8?.categories) {
    await Promise.all(
      page8.categories.flatMap((category) =>
        (category.logos ?? []).map(async (logo) => {
          if (!logo?.src) return;
          const resolved = await resolveSrc(logo.src, origin);
          const logoRef = logo;
          try {
            logoRef.src = await bakeGrayscaleLogo(resolved);
          } finally {
            if (resolved.startsWith('blob:')) URL.revokeObjectURL(resolved);
          }
        }),
      ),
    );
  }

  const page3 = next.page3;
  if (page3?.images?.footerSkyline) {
    const resolved = await resolveSrc(page3.images.footerSkyline, origin);
    try {
      page3.images.footerSkyline = await bakeWidthFitBottomImage(
        resolved,
        PDF_PAGE_WIDTH,
        PDF_PAGE3_FOOTER.height,
      );
    } finally {
      if (resolved.startsWith('blob:')) URL.revokeObjectURL(resolved);
    }
  }

  const page5 = next.page5;
  if (page5?.sections) {
    await Promise.all(
      PAGE5_SECTION_KEYS.flatMap((sectionKey) => {
        const section = page5.sections[sectionKey];
        if (!section?.images) return [];

        const layoutId = resolvePage5LayoutId(sectionKey, section.layout);
        const imageFrames = getPage5GalleryImageFrames(sectionKey, layoutId);

        return Object.entries(imageFrames).map(async ([imageKey, frame]) => {
          const src = section.images[imageKey];
          if (!src) return;

          const resolved = await resolveSrc(src, origin);
          const sectionImages = section.images;
          try {
            sectionImages[imageKey] = await bakeCoverImage(resolved, frame.width, frame.height);
          } finally {
            if (resolved.startsWith('blob:')) URL.revokeObjectURL(resolved);
          }
        });
      }),
    );
  }

  const page4 = next.page4;
  if (page4?.images) {
    const layout = getPdfPage4Layout(page4.statsLayout || 'variation-1');

    const buildingSrc = page4.images.buildingHero;
    if (buildingSrc) {
      const resolved = await resolveSrc(buildingSrc, origin);
      try {
        const { wrap, objectPosition } = layout.building;
        page4.images.buildingHero = await bakeContainImage(
          resolved,
          wrap.width,
          wrap.height,
          objectPosition,
          { preserveAlpha: true },
        );
      } finally {
        if (resolved.startsWith('blob:')) URL.revokeObjectURL(resolved);
      }
    }

    const mapSrc = page4.images.locationMap;
    if (mapSrc) {
      const resolved = await resolveSrc(mapSrc, origin);
      try {
        const { frame, objectPosition = 'center', objectFit = 'cover' } = layout.map;
        const bakeMap =
          objectFit === 'contain'
            ? (source) => bakeContainImage(source, frame.width, frame.height, objectPosition)
            : (source) => bakeCoverImage(source, frame.width, frame.height, objectPosition);
        page4.images.locationMap = await bakeMap(resolved);
      } finally {
        if (resolved.startsWith('blob:')) URL.revokeObjectURL(resolved);
      }
    }
  }

  return next;
}
