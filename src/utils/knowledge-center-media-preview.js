import {
  getFileExtension,
  isOfficeDocumentFileUrl,
  isPdfFileUrl,
  resolveFileUrl,
  toAbsoluteAttachmentUrl,
} from '@/lib/utils';
import {
  isPresentationMediaType,
  isWalkthroughMediaType,
} from '@/pages/profile/knowledge-center-media-constants';
import { isVideoFileUrl } from '@/hooks/use-video-poster';

const MATTERPORT_THUMB_BASE = 'https://my.matterport.com/api/v1/player/models';

const IMAGE_URL_PATTERN = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|#|$)/i;

/** @param {string} [url] */
export function parseMatterportModelId(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`);
    const fromQuery = parsed.searchParams.get('m');
    if (fromQuery) return fromQuery;

    const fromPath = parsed.pathname.match(/\/models\/([^/]+)/i);
    if (fromPath?.[1]) return fromPath[1];
  } catch {
    const fallback = url.match(/[&?]m=([^&]+)/i);
    if (fallback?.[1]) return decodeURIComponent(fallback[1]);
  }

  return null;
}

/** @param {string} modelId */
export function getMatterportThumbUrl(modelId) {
  if (!modelId) return '';
  return `${MATTERPORT_THUMB_BASE}/${encodeURIComponent(modelId)}/thumb`;
}

/** @param {string} [url] — showcase or share link */
export function getMatterportEmbedUrl(url) {
  const modelId = parseMatterportModelId(url);
  if (!modelId) return '';
  return `https://my.matterport.com/show/?m=${encodeURIComponent(modelId)}&play=1`;
}

/** @param {string} [url] */
export function getPresentationViewUrl(url) {
  const normalized = normalizePresentationUrl(url);
  if (!normalized) return '';

  try {
    const parsed = new URL(normalized);
    if (!parsed.hostname.includes('canva.com')) return normalized;

    const match = parsed.pathname.match(/^\/design\/([^/]+)(?:\/([^/]+))?/i);
    if (!match) return normalized;

    const [, designId, slug] = match;
    return slug
      ? `https://www.canva.com/design/${designId}/${slug}/view`
      : `https://www.canva.com/design/${designId}/view`;
  } catch {
    return normalized;
  }
}

function parseHttpUrl(url) {
  try {
    return new URL(url.includes('://') ? url : `https://${url}`);
  } catch {
    return null;
  }
}

function isSharePointHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return (
    host.includes('sharepoint.com') ||
    host.includes('onedrive.live.com') ||
    host === '1drv.ms' ||
    host.endsWith('.1drv.ms')
  );
}

/** Sharing / file links → iframe-safe SharePoint embed (`action=embedview`). */
function getSharePointEmbedUrl(parsed) {
  if (!parsed || !isSharePointHost(parsed.hostname)) return '';
  const path = parsed.pathname.toLowerCase();
  if (path.includes('/embed.aspx') || path.includes('/wopiframe.aspx')) {
    return parsed.toString();
  }
  if (parsed.searchParams.get('action') === 'embedview') {
    return parsed.toString();
  }
  const next = new URL(parsed.toString());
  next.searchParams.set('action', 'embedview');
  next.searchParams.set('wdAllowInteractivity', 'true');
  return next.toString();
}

function getGoogleEmbedUrl(parsed) {
  if (!parsed) return '';
  const host = parsed.hostname.toLowerCase();
  if (!host.includes('drive.google.com') && !host.includes('docs.google.com')) return '';

  const docMatch = parsed.pathname.match(/\/(document|spreadsheets|presentation)\/d\/([^/]+)/i);
  if (docMatch) {
    return `https://docs.google.com/${docMatch[1]}/d/${docMatch[2]}/preview`;
  }
  const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/i);
  if (fileMatch) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }
  const id = parsed.searchParams.get('id');
  if (id && host.includes('drive.google.com')) {
    return `https://drive.google.com/file/d/${id}/preview`;
  }
  return '';
}

/** @param {string} [url] — view/share/edit link */
export function getPresentationEmbedUrl(url) {
  const viewUrl = getPresentationViewUrl(url);
  if (!viewUrl) return '';

  const parsed = parseHttpUrl(viewUrl);
  if (parsed) {
    const sharePoint = getSharePointEmbedUrl(parsed);
    if (sharePoint) return sharePoint;
    const google = getGoogleEmbedUrl(parsed);
    if (google) return google;
  }

  return viewUrl.includes('?') ? `${viewUrl}&embed` : `${viewUrl}?embed`;
}

/**
 * Same preview item Knowledge Center uses for an uploaded presentation link.
 * @param {string} [url]
 * @param {string} [alt]
 */
export function buildPresentationLinkPreviewItem(url, alt = 'Presentation') {
  const normalized = normalizePresentationUrl(url);
  if (!normalized) return null;

  if (IMAGE_URL_PATTERN.test(normalized.split('#')[0])) {
    return { type: 'image', src: normalized, alt };
  }

  const embedUrl = getPresentationEmbedUrl(normalized);
  if (!embedUrl) return null;

  return {
    type: 'presentation',
    src: embedUrl,
    embedUrl,
    alt,
    externalUrl: getPresentationViewUrl(normalized) || embedUrl,
  };
}

/**
 * Resolves list thumbnail src: Matterport show links → Matterport thumb API;
 * Presentation direct image links → URL as-is.
 * @param {string} pathOrUrl
 * @param {string} [mediaType]
 */
export function resolveMediaThumbnailUrl(pathOrUrl, mediaType) {
  if (!pathOrUrl) return '';

  const modelId = parseMatterportModelId(pathOrUrl);
  if (modelId && isWalkthroughMediaType(mediaType)) {
    return getMatterportThumbUrl(modelId);
  }

  if (isPresentationMediaType(mediaType)) {
    const normalized = normalizePresentationUrl(pathOrUrl);
    if (IMAGE_URL_PATTERN.test(normalized.split('#')[0])) {
      return normalized;
    }
    return '';
  }

  return pathOrUrl;
}

function resolvePreviewSrc(path) {
  if (!path) return '';
  return toAbsoluteAttachmentUrl(resolveFileUrl(path));
}

function buildDocumentPreviewItem(path, alt) {
  const src = resolvePreviewSrc(path);
  const format = getFileExtension(path.split('/').pop() || path).toUpperCase() || 'FILE';
  return {
    type: 'document',
    src,
    alt,
    format,
    externalUrl: src,
  };
}

function previewTypeForFile(path, mediaType) {
  if (!path) return null;
  if (mediaType === 'Video' || isVideoFileUrl(path)) return 'video';
  if (isPdfFileUrl(path)) return 'pdf';
  if (isOfficeDocumentFileUrl(path)) return 'document';
  if (IMAGE_URL_PATTERN.test(path.split('#')[0])) return 'image';
  if (mediaType === 'Image' || mediaType === '3D' || mediaType === 'Layout') return 'image';
  return null;
}

/** @param {string} [url] */
export function normalizePresentationUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.includes('://') ? trimmed : `https://${trimmed}`;
}

/** @param {object} row — Knowledge Center Media list row */
export function hasKnowledgeCenterMediaPreview(row) {
  if (!row) return false;

  if (isWalkthroughMediaType(row.media_type)) {
    return Boolean(
      getMatterportEmbedUrl(row.matterport_url) || parseMatterportModelId(row.matterport_url),
    );
  }

  if (isPresentationMediaType(row.media_type)) {
    const normalized = normalizePresentationUrl(row.presentation_url);
    if (IMAGE_URL_PATTERN.test(normalized.split('#')[0])) {
      return Boolean(normalized);
    }
    if (getPresentationEmbedUrl(row.presentation_url)) return true;
    const urls = Array.isArray(row.thumbnail_urls) ? row.thumbnail_urls : [];
    return urls.some((path) => previewTypeForFile(path, row.media_type));
  }

  const urls = Array.isArray(row.thumbnail_urls) ? row.thumbnail_urls : [];
  return urls.some((path) => previewTypeForFile(path, row.media_type));
}

/** @param {object} row — caption fields for Figma 30531:348886 */
export function buildKnowledgeCenterMediaCaption(row) {
  if (!row) {
    return { title: '', clientLabel: '', centerName: '', floor: '', centerCode: '', tags: [] };
  }

  return {
    title: row.media_name || row.name || 'Media',
    clientLabel: row.client_name || row.client_label || row.client || '',
    centerName: row.center_name || '',
    floor: row.floor || '',
    centerCode: row.center_city || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}

/** @param {object} row */
export function buildKnowledgeCenterMediaPreviewItems(row) {
  if (!row) return [];

  const mediaType = row.media_type;
  const alt = row.media_name || row.name || 'Media';

  if (isWalkthroughMediaType(mediaType)) {
    const embedUrl = getMatterportEmbedUrl(row.matterport_url);
    if (!embedUrl) return [];
    return [
      {
        type: 'matterport',
        src: embedUrl,
        embedUrl,
        alt,
        externalUrl: row.matterport_url,
      },
    ];
  }

  if (isPresentationMediaType(mediaType)) {
    const items = [];
    const linkItem = buildPresentationLinkPreviewItem(row.presentation_url, alt);
    if (linkItem) items.push(linkItem);

    const urls = Array.isArray(row.thumbnail_urls) ? row.thumbnail_urls : [];
    urls.forEach((path) => {
      const type = previewTypeForFile(path, mediaType);
      if (!type) return;

      const src = resolvePreviewSrc(path);
      items.push(type === 'document' ? buildDocumentPreviewItem(path, alt) : { type, src, alt });
    });

    return items;
  }

  const urls = Array.isArray(row.thumbnail_urls) ? row.thumbnail_urls : [];
  const items = [];

  urls.forEach((path) => {
    const type = previewTypeForFile(path, mediaType);
    if (!type) return;

    const src = resolvePreviewSrc(path);
    items.push(type === 'document' ? buildDocumentPreviewItem(path, alt) : { type, src, alt });
  });

  return items;
}
