import { applyPdfImageProcessing } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-image-processing';
import { resolvePdfAssetUrl } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-primitives';

function isLikelyImageSrc(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('blob:')) return true;
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(trimmed)) return true;
  if (trimmed.startsWith('/proposal-template/')) return true;
  if (trimmed.startsWith('/api/') && trimmed.includes('image')) return true;
  return false;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', () => resolve(reader.result), { once: true });
    reader.addEventListener('error', reject, { once: true });
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetch an image URL and return a data: URL for @react-pdf/renderer.
 */
export async function imageSrcToDataUrl(src, origin) {
  const value = String(src || '').trim();
  if (!value) return value;
  if (value.startsWith('data:image/')) return value;

  const fetchUrl = value.startsWith('blob:') ? value : resolvePdfAssetUrl(value, origin);

  if (!fetchUrl) return value;

  try {
    const response = await fetch(fetchUrl, { credentials: 'include' });
    if (!response.ok) return value;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return value;
    return blobToDataUrl(blob);
  } catch {
    return value;
  }
}

async function prepareValue(value, origin) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('blob:')) {
      return imageSrcToDataUrl(trimmed, origin);
    }
    if (trimmed.startsWith('data:image/')) {
      return trimmed;
    }
    // Bare paths (no leading slash) are resolved via API — inline for react-pdf auth.
    if (
      trimmed &&
      !trimmed.startsWith('/') &&
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      isLikelyImageSrc(trimmed)
    ) {
      return imageSrcToDataUrl(trimmed, origin);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => prepareValue(item, origin)));
  }

  if (value && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, nested]) => [key, await prepareValue(nested, origin)]),
    );
    return Object.fromEntries(entries);
  }

  return value;
}

/**
 * Inline blob / remote image sources as data URLs so react-pdf can embed them.
 * Bakes hero color-blend, gallery cover crops, and grayscale logos for PDF parity.
 */
export async function prepareTemplateContentForPdf(
  content,
  origin,
  { clientAiTheme = false, primaryColor = null } = {},
) {
  if (!content || typeof content !== 'object') return content;
  const inlined = await prepareValue(content, origin);
  return applyPdfImageProcessing(inlined, origin, {
    clientAiTheme,
    primaryColor,
  });
}
