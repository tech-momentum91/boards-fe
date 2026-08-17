/**
 * @param {object | null | undefined} spaceOriginal
 * @returns {Array<{
 *   id: string,
 *   subSpaceId: string,
 *   name: string,
 *   type: string,
 *   areaType: string,
 *   deskCount: number,
 *   status: string,
 *   seq: number,
 * }>}
 */
export function mapSpaceDetailSubSpaces(spaceOriginal = {}) {
  const rows = Array.isArray(spaceOriginal?.sub_space) ? spaceOriginal.sub_space : [];

  return rows
    .map((row, index) => {
      const subSpaceId = String(row?.sub_space_id ?? '').trim();
      return {
        id: subSpaceId || String(row?.name ?? index),
        subSpaceId: subSpaceId || '—',
        name: String(row?.sub_space_name ?? '').trim() || '—',
        type: String(row?.sub_space_type ?? '').trim() || '—',
        areaType: String(row?.sub_space_area_type ?? '').trim() || '—',
        deskCount: Number(row?.desk_count ?? 0),
        status: String(row?.status ?? '').trim() || '—',
        seq: Number(row?.seq ?? row?.idx ?? index + 1),
      };
    })
    .sort((left, right) => left.seq - right.seq);
}
