/** Merge media from a variant update/detail response into a template product's variations. */
export function applyVariationMediaUpdate(product, variationId, updatedDetail = {}) {
  if (!product?.variations?.length || !variationId) {
    return product;
  }

  const imageUrl = updatedDetail.imageUrl || updatedDetail.image || '';
  const galleryImages = updatedDetail.galleryImages ?? updatedDetail.gallery_images;

  let didUpdate = false;
  const variations = product.variations.map((variation) => {
    if (variation.id !== variationId) return variation;

    didUpdate = true;
    const nextGallery =
      Array.isArray(galleryImages) && galleryImages.length > 0
        ? galleryImages
        : imageUrl
          ? [{ url: imageUrl }]
          : variation.galleryImages;

    return {
      ...variation,
      ...(imageUrl ? { imageUrl } : {}),
      ...(nextGallery ? { galleryImages: nextGallery } : {}),
    };
  });

  if (!didUpdate) return product;

  return {
    ...product,
    variations,
  };
}

/** Patch a variant's thumbnail in products list rows after a media upload. */
export function patchVariationImageInListRows(rows, templateId, variantId, imageUrl) {
  if (!Array.isArray(rows) || !templateId || !variantId || !imageUrl) {
    return rows;
  }

  return rows.map((row) => {
    if (row.id !== templateId || !row.variations?.length) return row;

    const variations = row.variations.map((variation) =>
      variation.id === variantId ? { ...variation, imageUrl } : variation,
    );

    const didPatch = variations.some(
      (variation, index) => variation.imageUrl !== row.variations[index]?.imageUrl,
    );
    if (!didPatch) return row;

    return { ...row, variations };
  });
}

export function getVariationThumbnailUrl(variation = {}) {
  if (variation.imageUrl) return variation.imageUrl;

  for (const item of variation.galleryImages ?? []) {
    const url = typeof item === 'string' ? item : item?.url;
    if (url) return url;
  }

  return null;
}

export function getVariationMediaItems(variation = {}) {
  const items = [];
  const seen = new Set();

  const add = (url, isVideo = false) => {
    const normalized = String(url || '').trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    items.push({
      id: `${variation.id || 'variation'}-${items.length}-${normalized}`,
      type: isVideo ? 'video' : 'image',
      url: normalized,
    });
  };

  if (variation.imageUrl) {
    add(variation.imageUrl);
  }

  (variation.galleryImages ?? []).forEach((entry) => {
    if (typeof entry === 'string') {
      add(entry);
      return;
    }
    add(entry?.url, Boolean(entry?.isVideo));
  });

  return items;
}
