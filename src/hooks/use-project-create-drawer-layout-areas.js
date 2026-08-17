import { useCallback, useEffect, useMemo, useState } from 'react';

import { getLayoutAreas } from '@/api/projectLayout';
import {
  buildLayoutAreasAreaOptions,
  buildLayoutAreasFloorOptions,
  buildLayoutPreviewLayoutFromFloor,
  findLayoutAreasFloorRecord,
  getLayoutAreasForFloor,
  normalizeProjectLayoutAreasResponse,
} from '@/components/projects/shared/project-layout-areas-helpers';
import { getProjectFloorSelectOptions } from '@/components/projects/shared';
import { extractErrorMessage } from '@/utils/error-utils';

/**
 * Fetch project layout areas when a create drawer opens and expose floor/area options
 * plus a read-only floor layout preview for the RiStackLine action.
 *
 * @param {{
 *   open: boolean,
 *   projectId?: string,
 *   watchedFloor?: string,
 *   projectFloors?: string[],
 * }} params
 */
export function useProjectCreateDrawerLayoutAreas({
  open,
  projectId,
  watchedFloor = '',
  projectFloors = [],
}) {
  const [bundle, setBundle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLayoutPanelOpen, setIsLayoutPanelOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setBundle(null);
      setError(null);
      setIsLoading(false);
      setIsLayoutPanelOpen(false);
      return undefined;
    }

    const normalizedProjectId = String(projectId ?? '').trim();
    if (!normalizedProjectId) {
      setBundle(null);
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getLayoutAreas({ project: normalizedProjectId })
      .then((result) => {
        if (cancelled) return;
        setBundle(normalizeProjectLayoutAreasResponse(result));
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setBundle(null);
        setError(extractErrorMessage(fetchError, 'Failed to load layout areas'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const apiFloorOptions = useMemo(
    () => buildLayoutAreasFloorOptions(bundle?.floors),
    [bundle?.floors],
  );

  const fallbackFloorOptions = useMemo(
    () => getProjectFloorSelectOptions(projectFloors, watchedFloor),
    [projectFloors, watchedFloor],
  );

  const floorOptions = apiFloorOptions.length > 0 ? apiFloorOptions : fallbackFloorOptions;

  const selectedFloorRecord = useMemo(
    () => findLayoutAreasFloorRecord(bundle?.floors, watchedFloor),
    [bundle?.floors, watchedFloor],
  );

  const areaOptions = useMemo(() => {
    const floorAreas = getLayoutAreasForFloor(bundle?.floors, watchedFloor);
    return buildLayoutAreasAreaOptions(floorAreas);
  }, [bundle?.floors, watchedFloor]);

  const previewLayout = useMemo(
    () => buildLayoutPreviewLayoutFromFloor(selectedFloorRecord),
    [selectedFloorRecord],
  );

  const canOpenLayoutPanel = Boolean(watchedFloor && previewLayout?.layout_image);

  const openLayoutPanel = useCallback(() => {
    if (!canOpenLayoutPanel) return;
    setIsLayoutPanelOpen(true);
  }, [canOpenLayoutPanel]);

  const closeLayoutPanel = useCallback(() => {
    setIsLayoutPanelOpen(false);
  }, []);

  useEffect(() => {
    if (!watchedFloor) {
      setIsLayoutPanelOpen(false);
    }
  }, [watchedFloor]);

  useEffect(() => {
    if (!open) {
      setIsLayoutPanelOpen(false);
    }
  }, [open]);

  return {
    layoutAreasLoading: isLoading,
    layoutAreasError: error,
    floorOptions,
    areaOptions,
    previewLayout,
    canOpenLayoutPanel,
    isLayoutPanelOpen,
    openLayoutPanel,
    closeLayoutPanel,
  };
}
