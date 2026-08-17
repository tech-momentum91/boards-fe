import { getFileExtension } from '@/lib/utils';

const NON_COMPRESSIBLE_IMAGE_EXTENSIONS = new Set(['gif', 'svg', 'bmp']);
const OUTPUT_MIME = 'image/jpeg';
const MIN_DIMENSION = 320;
const MAX_INITIAL_SIDE = 4096;

/** @param {File} file */
export function canCompressAttachmentFile(file) {
  if (!file) return false;
  const mime = (file.type || '').toLowerCase();
  if (!mime.startsWith('image/')) return false;
  if (mime === 'image/gif' || mime === 'image/svg+xml' || mime === 'image/bmp') return false;

  const ext = getFileExtension(file.name).toLowerCase();
  return !NON_COMPRESSIBLE_IMAGE_EXTENSIONS.has(ext);
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    const onLoad = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    const onError = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onError, { once: true });
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image compression failed'))),
      type,
      quality,
    );
  });
}

function scaledDimensions(naturalWidth, naturalHeight, maxSide) {
  const width = naturalWidth;
  const height = naturalHeight;

  if (width <= maxSide && height <= maxSide) {
    return { width, height };
  }

  const ratio = Math.min(maxSide / width, maxSide / height);
  return {
    width: Math.max(MIN_DIMENSION, Math.round(width * ratio)),
    height: Math.max(MIN_DIMENSION, Math.round(height * ratio)),
  };
}

/**
 * Compress raster images (JPEG/PNG/WebP) to fit under maxSizeBytes when possible.
 * @param {File} file
 * @param {number} maxSizeBytes
 * @returns {Promise<File>}
 */
async function compressImageToMaxSize(file, maxSizeBytes) {
  const img = await loadImageFromFile(file);
  const baseName = (file.name.replace(/\.[^.]+$/, '') || 'image').trim();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  let maxSide = Math.min(Math.max(img.naturalWidth, img.naturalHeight), MAX_INITIAL_SIDE);
  let { width, height } = scaledDimensions(img.naturalWidth, img.naturalHeight, maxSide);
  let smallestBlob = null;

  for (let resizeAttempt = 0; resizeAttempt < 10; resizeAttempt += 1) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    for (const quality of [0.92, 0.85, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38]) {
      const blob = await canvasToBlob(canvas, OUTPUT_MIME, quality);
      smallestBlob = !smallestBlob || blob.size < smallestBlob.size ? blob : smallestBlob;

      if (blob.size <= maxSizeBytes) {
        return new File([blob], `${baseName}.jpg`, {
          type: OUTPUT_MIME,
          lastModified: Date.now(),
        });
      }
    }

    if (width <= MIN_DIMENSION && height <= MIN_DIMENSION) break;

    maxSide = Math.round(maxSide * 0.85);
    ({ width, height } = scaledDimensions(img.naturalWidth, img.naturalHeight, maxSide));
  }

  if (smallestBlob) {
    return new File([smallestBlob], `${baseName}.jpg`, {
      type: OUTPUT_MIME,
      lastModified: Date.now(),
    });
  }

  return file;
}

/**
 * Returns a file at or under maxSizeBytes when compression is supported.
 * @param {File} file
 * @param {number} maxSizeBytes
 * @returns {Promise<{ file: File, compressed: boolean }>}
 */
export async function prepareAttachmentFileForUpload(file, maxSizeBytes) {
  if (!file || file.size <= maxSizeBytes) {
    return { file, compressed: false };
  }

  if (!canCompressAttachmentFile(file)) {
    return { file, compressed: false };
  }

  try {
    const compressed = await compressImageToMaxSize(file, maxSizeBytes);
    return {
      file: compressed,
      compressed: compressed.size < file.size,
    };
  } catch {
    return { file, compressed: false };
  }
}
