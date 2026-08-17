// Get center_name/zone from a successful center update (prefer server value over request).
export function getCenterLabelSyncFromUpdateAction(action) {
  const centerId = action?.meta?.arg?.center_id;
  const requestPayload = action?.meta?.arg?.payload;
  if (!centerId || !requestPayload || typeof requestPayload !== 'object') return null;

  const serverData =
    action?.payload?.data && typeof action.payload.data === 'object' ? action.payload.data : null;

  let updatedCenterName = null;
  if (Object.prototype.hasOwnProperty.call(requestPayload, 'center_name')) {
    updatedCenterName = serverData?.center_name ?? requestPayload.center_name;
  }

  let updatedZone = null;
  if (Object.prototype.hasOwnProperty.call(requestPayload, 'zone')) {
    updatedZone = serverData?.zone ?? requestPayload.zone;
  }

  if (updatedCenterName == null && updatedZone == null) return null;

  return {
    centerId: String(centerId),
    updatedCenterName,
    updatedZone,
  };
}

// Update matching center options in a cached list; return same array if nothing changed.
export function mapCenterOptionsWithLabelSync(
  centerOptions,
  sync,
  { setLabel = true, setZone = false } = {},
) {
  if (!Array.isArray(centerOptions) || !sync?.centerId) return centerOptions;

  const { centerId, updatedCenterName, updatedZone } = sync;
  let didChange = false;

  const nextCenterOptions = centerOptions.map((centerOption) => {
    const centerOptionId = centerOption?.value ?? centerOption?.name;
    if (String(centerOptionId) !== String(centerId)) return centerOption;

    const nextCenterOption = { ...centerOption };
    let rowChanged = false;

    if (updatedCenterName != null && nextCenterOption.center_name !== updatedCenterName) {
      nextCenterOption.center_name = updatedCenterName;
      rowChanged = true;
    }
    if (setLabel && updatedCenterName != null && nextCenterOption.label !== updatedCenterName) {
      nextCenterOption.label = updatedCenterName;
      rowChanged = true;
    }
    if (setZone && updatedZone != null && nextCenterOption.zone !== updatedZone) {
      nextCenterOption.zone = updatedZone;
      rowChanged = true;
    }

    if (!rowChanged) return centerOption;
    didChange = true;
    return nextCenterOption;
  });

  return didChange ? nextCenterOptions : centerOptions;
}
