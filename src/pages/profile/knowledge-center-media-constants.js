import {
  RiBox3Line,
  RiFileTextLine,
  RiImageLine,
  RiLayoutGridLine,
  RiLiveLine,
  RiStackLine,
  RiVidiconLine,
} from 'react-icons/ri';

/** Stored `media_type` for walkthrough (Matterport) showcase links. */
export const WALKTHROUGH_MEDIA_TYPE = 'Walkthrough';

/** Stored `media_type` for presentation links. */
export const PRESENTATION_MEDIA_TYPE = 'Presentation';

/** @param {string} [mediaType] */
export function isWalkthroughMediaType(mediaType) {
  return mediaType === WALKTHROUGH_MEDIA_TYPE;
}

/** @param {string} [mediaType] */
export function isPresentationMediaType(mediaType) {
  return mediaType === PRESENTATION_MEDIA_TYPE;
}

/** @param {string} [mediaType] */
export function isLinkBasedMediaType(mediaType) {
  return isWalkthroughMediaType(mediaType);
}

/** Sidebar categories — `value` is sent as `media_type` filter to the list API. */
export const MEDIA_CATEGORY_ITEMS = [
  { value: 'all', label: 'All', icon: RiStackLine },
  { value: 'Image', label: 'Images', icon: RiImageLine },
  { value: 'Layout', label: 'Layouts', icon: RiLayoutGridLine },
  { value: WALKTHROUGH_MEDIA_TYPE, label: 'Walkthrough', icon: RiLiveLine },
  { value: '3D', label: "3D's", icon: RiBox3Line },
  { value: 'Video', label: 'Videos', icon: RiVidiconLine },
  { value: PRESENTATION_MEDIA_TYPE, label: 'Presentations', icon: RiFileTextLine },
];

/** Add Media dropdown + stored `media_type` values (sidebar uses same values). */
export const MEDIA_TYPE_FORM_OPTIONS = [
  { value: 'Image', label: 'Images' },
  { value: 'Layout', label: 'Layouts' },
  { value: WALKTHROUGH_MEDIA_TYPE, label: 'Walkthrough' },
  { value: '3D', label: "3D's" },
  { value: 'Video', label: 'Videos' },
  { value: PRESENTATION_MEDIA_TYPE, label: 'Presentations' },
];

/** Pre-fill add form media type from sidebar tab (`all` → empty). */
export function getAddMediaDefaultType(activeCategory) {
  if (!activeCategory || activeCategory === 'all') return '';
  return MEDIA_TYPE_FORM_OPTIONS.some((item) => item.value === activeCategory)
    ? activeCategory
    : '';
}

/** Ribbon badge on cards (Figma labels / colors). */
export const MEDIA_TYPE_BADGE = {
  Image: { label: 'Photo', className: 'bg-[#375DFB]', color: '#375DFB' },
  Video: { label: 'Video', className: 'bg-[#F17B2C]', color: '#F17B2C' },
  [WALKTHROUGH_MEDIA_TYPE]: {
    label: 'Walkthrough',
    className: 'bg-[#6E3FF3]',
    color: '#6E3FF3',
  },
  '3D': { label: "3D's", className: 'bg-primary-base', color: '#079455' },
  Layout: { label: 'Layouts', className: 'bg-[#E255F2]', color: '#E255F2' },
  [PRESENTATION_MEDIA_TYPE]: {
    label: 'Presentation',
    className: 'bg-[#0E9384]',
    color: '#0E9384',
  },
};

export const mediaCategoryLabelByValue = MEDIA_CATEGORY_ITEMS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, /** @type {Record<string, string>} */ ({}));

/** Allowed file uploads per `media_type` (Walkthrough uses link field — no files). */
export const MEDIA_TYPE_UPLOAD_RULES = {
  Image: {
    accept:
      'image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg',
    extensions: new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']),
    multiple: true,
    hint: 'Images only (JPG, PNG, GIF, WebP, SVG), up to 10 MB each.',
  },
  Video: {
    accept: 'video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov,.m4v',
    extensions: new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v', 'avi', 'mkv']),
    multiple: true,
    hint: 'Videos only (MP4, WebM, MOV), up to 10 MB each.',
  },
  Layout: {
    accept:
      'image/jpeg,image/png,image/gif,image/webp,application/pdf,.jpg,.jpeg,.png,.gif,.webp,.pdf',
    extensions: new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']),
    multiple: true,
    hint: 'Layouts only (images or PDF), up to 10 MB each.',
  },
  '3D': {
    accept:
      'image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg',
    extensions: new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']),
    multiple: true,
    hint: '3D renders as images only (JPG, PNG, GIF, WebP, SVG), up to 10 MB each.',
  },
  [WALKTHROUGH_MEDIA_TYPE]: {
    accept: '',
    extensions: new Set(),
    multiple: false,
    usesFileUpload: false,
    hint: 'Walkthrough uses a Matterport showcase link instead of file upload.',
  },
  [PRESENTATION_MEDIA_TYPE]: {
    accept:
      'application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.ppt,.pptx,.doc,.docx',
    extensions: new Set(['pdf', 'ppt', 'pptx', 'doc', 'docx']),
    multiple: true,
    hint: 'PDF, PPT, PPTX, DOC, or DOCX files, up to 10 MB each.',
  },
};

/**
 * @param {File} file
 * @param {string} mediaType
 */
export function isFileAllowedForMediaType(file, mediaType) {
  const rules = MEDIA_TYPE_UPLOAD_RULES[mediaType];
  if (!rules || rules.usesFileUpload === false) return false;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (rules.extensions.has(ext)) return true;
  const mime = (file.type || '').toLowerCase();
  if (mediaType === 'Image' && mime.startsWith('image/')) return true;
  if (mediaType === 'Video' && mime.startsWith('video/')) return true;
  if (mediaType === 'Layout' && (mime.startsWith('image/') || mime === 'application/pdf')) {
    return true;
  }
  if (mediaType === '3D' && mime.startsWith('image/')) return true;
  if (mediaType === PRESENTATION_MEDIA_TYPE) {
    if (mime === 'application/pdf') return true;
    if (
      mime === 'application/vnd.ms-powerpoint' ||
      mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return true;
    }
  }
  return false;
}
