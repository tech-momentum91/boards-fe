/**
 * Normalize `vendor_list` items from get_opex_list / detail (and legacy Supplier rows)
 * to a consistent { name, supplier_name, image } shape (Supplier-compatible).
 */
export function normalizeOpexVendorRows(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (item == null || typeof item !== 'object') return null;
      const name = item.name ?? item.supplier_name ?? item.id;
      if (name == null || String(name).trim() === '') return null;
      const id = String(name);
      return {
        name: id,
        supplier_name:
          item.supplier_name ?? item.vendor_name ?? item.label ?? item.display_name ?? id,
        image: item.image ?? item.image_url ?? null,
      };
    })
    .filter(Boolean);
}

/** Map normalized vendor rows to OpexVendorSelect options: { id, name, avatar }. */
export function mapNormalizedVendorsToSelectOptions(normalized) {
  return normalizeOpexVendorRows(normalized).map((v) => ({
    id: v.name,
    name: v.supplier_name || v.name,
    avatar: v.image || null,
  }));
}

export function vendorSelectOptionsFromRow(row) {
  const base = normalizeOpexVendorRows(row?.vendor_list).map((v) => ({
    id: v.name,
    name: v.supplier_name || v.name,
    avatar: v.image || null,
  }));
  const currentId = row?.vendor;
  if (!currentId) return base;
  const idStr = String(currentId);
  if (base.some((o) => o.id === idStr)) return base;
  const label = row?.vendor_name ?? row?.supplier_name ?? row?.vendor_display_name ?? idStr;
  return [...base, { id: idStr, name: String(label), avatar: null }];
}
