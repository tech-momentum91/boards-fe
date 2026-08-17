import { PROJECT_LAYOUT_MARKER_COLORS } from '@/components/projects/layouts/project-layout-floor-toolbar';

export const PROJECT_CREATE_TASK_MARKER_ID = 'project-create-task-marker';

export const PROJECT_CREATE_LAYOUT_MARKER_COLORS = {
  task: '#2563eb',
  gfc: PROJECT_LAYOUT_MARKER_COLORS.find((option) => option.id === 'purple')?.value ?? '#6E3FF3',
  graphics:
    PROJECT_LAYOUT_MARKER_COLORS.find((option) => option.id === 'green')?.value ?? '#079455',
  threeD: PROJECT_LAYOUT_MARKER_COLORS.find((option) => option.id === 'orange')?.value ?? '#F17B2C',
  snag: PROJECT_LAYOUT_MARKER_COLORS.find((option) => option.id === 'red')?.value ?? '#DF1C41',
};

/**
 * @param {number} nx normalized x (0-1)
 * @param {number} ny normalized y (0-1)
 * @param {number} naturalWidth
 * @param {number} naturalHeight
 * @returns {{ x: number, y: number } | null}
 */
export function projectCreateMarkerNormalizedToPixel(nx, ny, naturalWidth, naturalHeight) {
  if (naturalWidth <= 0 || naturalHeight <= 0) return null;
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;
  return {
    x: Math.round(Number(nx) * naturalWidth),
    y: Math.round(Number(ny) * naturalHeight),
  };
}

/**
 * @param {{ x?: number, y?: number } | null | undefined} coordinates
 * @param {number} naturalWidth
 * @param {number} naturalHeight
 * @returns {object | null}
 */
export function projectCreateMarkerPixelToAnnotation(coordinates, naturalWidth, naturalHeight) {
  const x = Number(coordinates?.x);
  const y = Number(coordinates?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || naturalWidth <= 0 || naturalHeight <= 0) {
    return null;
  }

  return {
    id: PROJECT_CREATE_TASK_MARKER_ID,
    type: 'point',
    x: x / naturalWidth,
    y: y / naturalHeight,
    marker: true,
    locked: false,
    visible: true,
    suppressCanvasShape: true,
    source: 'project-create-task-marker',
  };
}
