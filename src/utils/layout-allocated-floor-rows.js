/**
 * Map API row from `get_allocated_floor_layout_images` to layout card shape.
 *
 * @param {object} row
 * @param {number} idx
 * @returns {object}
 */
export function mapAllocatedFloorRowToLayoutCard(row, idx) {
  const center = String(row?.center ?? '').trim();
  const centerName = String(row?.center_name ?? '').trim() || center || 'Unassigned';
  const blockFloorId = String(row?.block_floor_id ?? row?.allocated_floor ?? '').trim();
  const floorRef = String(row?.floor_ref ?? '').trim();
  return {
    name: [center, blockFloorId, floorRef].filter(Boolean).join('|') || `layout-${idx}`,
    floor: row?.floor,
    block_floor_id: blockFloorId,
    image: row?.layout_image || '',
    thumbnail: row?.layout_image || '',
    layout_image: row?.layout_image || '',
    floor_ref: floorRef,
    center,
    center_name: centerName,
    space_id: row?.space_id || '',
    space_name: row?.space_name || '',
  };
}

/**
 * Group flat allocated-floor rows by center (preserves first-seen center order).
 *
 * @param {unknown[]} rows
 * @returns {Array<{ center: string, centerName: string, layouts: object[] }>}
 */
export function groupAllocatedFloorLayoutsByCenter(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const order = [];
  const byCenter = new Map();

  list.forEach((row, idx) => {
    const layout = mapAllocatedFloorRowToLayoutCard(row, idx);
    const key = layout.center || layout.center_name;
    if (!byCenter.has(key)) {
      byCenter.set(key, {
        center: layout.center,
        centerName: layout.center_name,
        layouts: [],
      });
      order.push(key);
    }
    byCenter.get(key).layouts.push(layout);
  });

  return order.map((key) => byCenter.get(key));
}
