export const GRID_COLUMNS = 12;
export const DASHBOARD_MAX_WIDTH = 1440;
export const GRID_ROW_HEIGHT = 92;
export const KPI_GRID_HEIGHT = 1;
export const CHART_GRID_HEIGHT = 3;
// Charts that render a filterable legend panel need extra vertical room so the
// x-axis labels and legend never have to compete for space — 1.5x the base height.
export const CHART_LEGEND_GRID_HEIGHT = Math.ceil(CHART_GRID_HEIGHT * 1.5);
export const KPI_TILE_HEIGHT = GRID_ROW_HEIGHT * KPI_GRID_HEIGHT;
export const CHART_TILE_HEIGHT = GRID_ROW_HEIGHT * CHART_GRID_HEIGHT;

export function isKpiChartType(chartType) {
  return String(chartType || '').toLowerCase() === 'kpi';
}

export function getDefaultGridWidth(chartType) {
  return isKpiChartType(chartType) ? 2 : 6;
}

export function getDefaultGridHeight(chartType, hasLegend = false) {
  if (isKpiChartType(chartType)) return KPI_GRID_HEIGHT;
  return hasLegend ? CHART_LEGEND_GRID_HEIGHT : CHART_GRID_HEIGHT;
}

/** Whether a chart will render the filterable legend panel (mirrors chart-grid.jsx). */
export function chartShowLegends(chart) {
  if (isKpiChartType(chart?.chart_type)) return false;
  if (chart?.show_legends === 0 || chart?.show_legends === false) return false;
  return chart?.show_legends !== undefined ? Boolean(chart.show_legends) : true;
}

export function resolveGridHeight(chart) {
  const chartType = chart?.chart_type;
  const hasLegend = chartShowLegends(chart);
  const defaultHeight = getDefaultGridHeight(chartType, hasLegend);
  const persisted = Number(chart?.grid_height);

  if (!persisted || Number.isNaN(persisted)) {
    return defaultHeight;
  }

  if (persisted === KPI_GRID_HEIGHT && defaultHeight > KPI_GRID_HEIGHT) {
    return defaultHeight;
  }

  // Charts still sitting at the legacy base default (from before legend-aware
  // sizing existed) get bumped to the taller default so the legend has room.
  // Charts a user has deliberately resized to any other height are left alone.
  if (hasLegend && persisted === CHART_GRID_HEIGHT) {
    return defaultHeight;
  }

  return Math.max(1, persisted);
}

export function getChartGridDimensions(chart) {
  const chartType = chart?.chart_type;
  const width = Number(chart?.grid_width) || getDefaultGridWidth(chartType);
  const height = resolveGridHeight(chart);
  const x = Math.max(0, Number(chart?.grid_x) || 0);
  const y = Math.max(0, Number(chart?.grid_y) || 0);

  return {
    gridX: x,
    gridY: y,
    gridWidth: width,
    gridHeight: height,
  };
}

export function getTilePixelHeight(chart) {
  const { gridHeight } = getChartGridDimensions(chart);
  const gap = 12;
  return gridHeight * GRID_ROW_HEIGHT + Math.max(0, gridHeight - 1) * gap;
}

export function sortChartsByGrid(charts = []) {
  return [...charts].sort((left, right) => {
    const leftY = Number(left?.grid_y) || 0;
    const rightY = Number(right?.grid_y) || 0;
    if (leftY !== rightY) return leftY - rightY;

    const leftX = Number(left?.grid_x) || 0;
    const rightX = Number(right?.grid_x) || 0;
    if (leftX !== rightX) return leftX - rightX;

    return (Number(left?.sort_order) || 0) - (Number(right?.sort_order) || 0);
  });
}

function buildOccupancyGrid(existingCharts, requiredRows) {
  const normalized = existingCharts.map((chart) => getChartGridDimensions(chart));
  const maxRow = normalized.reduce(
    (max, chart) => Math.max(max, chart.gridY + chart.gridHeight),
    0,
  );
  const grid = Array.from({ length: maxRow + requiredRows + 1 }, () =>
    Array.from({ length: GRID_COLUMNS }, () => false),
  );

  normalized.forEach((chart) => {
    for (let row = chart.gridY; row < chart.gridY + chart.gridHeight; row += 1) {
      for (let col = chart.gridX; col < chart.gridX + chart.gridWidth; col += 1) {
        if (grid[row]) {
          grid[row][col] = true;
        }
      }
    }
  });

  return grid;
}

export function findNextAvailablePosition(
  existingCharts = [],
  requiredWidth,
  requiredHeight = KPI_GRID_HEIGHT,
) {
  const width = Math.max(1, Math.min(GRID_COLUMNS, Number(requiredWidth) || 6));
  const height = Math.max(1, Number(requiredHeight) || KPI_GRID_HEIGHT);

  if (existingCharts.length === 0) {
    return { gridX: 0, gridY: 0 };
  }

  const grid = buildOccupancyGrid(existingCharts, height);

  for (let rowIdx = 0; rowIdx <= grid.length - height; rowIdx += 1) {
    for (let colIdx = 0; colIdx <= GRID_COLUMNS - width; colIdx += 1) {
      const fits = Array.from({ length: height }, (_, rowOffset) =>
        Array.from(
          { length: width },
          (_, colOffset) => !grid[rowIdx + rowOffset][colIdx + colOffset],
        ),
      ).every((row) => row.every(Boolean));

      if (fits) {
        return { gridX: colIdx, gridY: rowIdx };
      }
    }
  }

  const maxRow = existingCharts.reduce((max, chart) => {
    const dims = getChartGridDimensions(chart);
    return Math.max(max, dims.gridY + dims.gridHeight);
  }, 0);

  return { gridX: 0, gridY: maxRow };
}

/** Pack charts left-to-right, top-to-bottom by sort order (preserves dimensions). */
export function compactChartsGridLayout(charts = []) {
  const sorted = [...charts].sort(
    (left, right) => (Number(left?.sort_order) || 0) - (Number(right?.sort_order) || 0),
  );

  const placed = [];

  return sorted.map((chart) => {
    const gridWidth = Number(chart?.grid_width) || getDefaultGridWidth(chart?.chart_type);
    const gridHeight = resolveGridHeight(chart);
    const { gridX, gridY } = findNextAvailablePosition(placed, gridWidth, gridHeight);
    const compacted = {
      ...chart,
      grid_x: gridX,
      grid_y: gridY,
      grid_width: gridWidth,
      grid_height: gridHeight,
    };
    placed.push(compacted);
    return compacted;
  });
}

/** Backfill missing grid coordinates and repair overlapping persisted positions. */
export function normalizeChartsGridLayout(charts = []) {
  const sorted = [...charts].sort(
    (left, right) => (Number(left?.sort_order) || 0) - (Number(right?.sort_order) || 0),
  );

  const placed = [];

  const result = sorted.map((chart) => {
    const defaultWidth = getDefaultGridWidth(chart?.chart_type);
    const defaultHeight = getDefaultGridHeight(chart?.chart_type, chartShowLegends(chart));
    const hasPersistedDimensions = Number(chart?.grid_width) > 0;
    const hasPersistedPosition = chart?.grid_x != null && chart?.grid_y != null;

    let gridX;
    let gridY;
    const gridWidth = hasPersistedDimensions ? Number(chart.grid_width) : defaultWidth;
    const gridHeight = hasPersistedDimensions ? resolveGridHeight(chart) : defaultHeight;

    if (hasPersistedPosition) {
      ({ gridX, gridY } = getChartGridDimensions(chart));
      const candidate = { x: gridX, y: gridY, width: gridWidth, height: gridHeight };
      const overlaps = placed.some((other) => rectsOverlap(candidate, getTileRect(other)));

      if (overlaps || gridX + gridWidth > GRID_COLUMNS) {
        ({ gridX, gridY } = findNextAvailablePosition(placed, gridWidth, gridHeight));
      }
    } else {
      ({ gridX, gridY } = findNextAvailablePosition(placed, gridWidth, gridHeight));
    }

    const normalized = {
      ...chart,
      grid_x: gridX,
      grid_y: gridY,
      grid_width: gridWidth,
      grid_height: gridHeight,
    };
    placed.push(normalized);
    return normalized;
  });

  const isLegacyVerticalStack =
    charts.length > 1 &&
    result.every((chart) => (Number(chart?.grid_x) || 0) === 0) &&
    result.some((chart) => (Number(chart?.grid_y) || 0) > 0);

  if (isLegacyVerticalStack) {
    return compactChartsGridLayout(result);
  }

  return result;
}

export function getTileRect(chart) {
  const { gridX, gridY, gridWidth, gridHeight } = getChartGridDimensions(chart);
  return {
    x: gridX,
    y: gridY,
    width: gridWidth,
    height: gridHeight,
  };
}

export function rectsOverlap(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export function validateGridPosition(chart, gridX, gridY, otherCharts = []) {
  const width = Number(chart?.grid_width) || getDefaultGridWidth(chart?.chart_type);
  const height = resolveGridHeight(chart);

  if (gridX < 0 || gridY < 0 || gridX + width > GRID_COLUMNS) {
    return false;
  }

  const candidate = {
    x: gridX,
    y: gridY,
    width,
    height,
  };

  return !otherCharts.some((other) => rectsOverlap(candidate, getTileRect(other)));
}

export function findNearestValidGridPosition(chart, targetX, targetY, otherCharts = []) {
  if (validateGridPosition(chart, targetX, targetY, otherCharts)) {
    return { gridX: targetX, gridY: targetY };
  }

  for (let distance = 1; distance < 24; distance += 1) {
    for (let dy = 0; dy <= distance; dy += 1) {
      for (let dx = 0; dx <= distance - dy; dx += 1) {
        const candidates = [
          { gridX: targetX + dx, gridY: targetY + dy },
          { gridX: targetX - dx, gridY: targetY + dy },
          { gridX: targetX + dx, gridY: targetY - dy },
          { gridX: targetX - dx, gridY: targetY - dy },
        ];

        for (const candidate of candidates) {
          if (validateGridPosition(chart, candidate.gridX, candidate.gridY, otherCharts)) {
            return candidate;
          }
        }
      }
    }
  }

  const width = Number(chart?.grid_width) || getDefaultGridWidth(chart?.chart_type);
  const height = resolveGridHeight(chart);
  const maxY = otherCharts.reduce(
    (max, other) => Math.max(max, (Number(other?.grid_y) || 0) + resolveGridHeight(other)),
    0,
  );

  return findNextAvailablePosition(otherCharts, width, height) ?? { gridX: 0, gridY: maxY };
}

export function resolveDraggedChartPositions(items, activeId, overId) {
  const activeChart = items.find((chart) => chart.chart_id === activeId);
  const overChart = items.find((chart) => chart.chart_id === overId);

  if (!activeChart || !overChart) {
    return null;
  }

  const activePos = {
    gridX: Number(activeChart.grid_x) || 0,
    gridY: Number(activeChart.grid_y) || 0,
  };
  const overPos = {
    gridX: Number(overChart.grid_x) || 0,
    gridY: Number(overChart.grid_y) || 0,
  };

  const others = items.filter(
    (chart) => chart.chart_id !== activeChart.chart_id && chart.chart_id !== overChart.chart_id,
  );

  const swappedOver = { ...overChart, grid_x: activePos.gridX, grid_y: activePos.gridY };
  const swappedActive = { ...activeChart, grid_x: overPos.gridX, grid_y: overPos.gridY };

  const canSwap =
    validateGridPosition(activeChart, overPos.gridX, overPos.gridY, [...others, swappedOver]) &&
    validateGridPosition(overChart, activePos.gridX, activePos.gridY, [...others, swappedActive]);

  if (canSwap) {
    return [
      { chartId: activeChart.chart_id, gridX: overPos.gridX, gridY: overPos.gridY },
      { chartId: overChart.chart_id, gridX: activePos.gridX, gridY: activePos.gridY },
    ];
  }

  const activeTarget = findNearestValidGridPosition(
    activeChart,
    overPos.gridX,
    overPos.gridY,
    others,
  );
  const remainingOthers = others.filter((chart) => chart.chart_id !== overChart.chart_id);
  const overTarget = findNearestValidGridPosition(overChart, activePos.gridX, activePos.gridY, [
    ...remainingOthers,
    { ...activeChart, grid_x: activeTarget.gridX, grid_y: activeTarget.gridY },
  ]);

  return [
    { chartId: activeChart.chart_id, gridX: activeTarget.gridX, gridY: activeTarget.gridY },
    { chartId: overChart.chart_id, gridX: overTarget.gridX, gridY: overTarget.gridY },
  ];
}

export function applyGridPositionUpdates(charts, updates = []) {
  const updateMap = new Map(updates.map((update) => [update.chartId, update]));

  return sortChartsByGrid(
    charts.map((chart) => {
      const update = updateMap.get(chart.chart_id);
      if (!update) return chart;
      return {
        ...chart,
        grid_x: update.gridX,
        grid_y: update.gridY,
        ...(update.gridWidth != null ? { grid_width: update.gridWidth } : {}),
        ...(update.gridHeight != null ? { grid_height: update.gridHeight } : {}),
      };
    }),
  );
}

/**
 * Recomputes the grid layout after one tile is resized.
 * The resized tile keeps its position; any tiles that now overlap are
 * pushed to the next available free slot (top-left scan order).
 */
export function resolveResizedLayout(charts, resizedId, newWidth, newHeight) {
  const resized = charts.find((c) => c.chart_id === resizedId);
  if (!resized) return charts;

  const gridX = Number(resized.grid_x) || 0;
  const clampedW = Math.max(1, Math.min(GRID_COLUMNS - gridX, newWidth));
  const clampedH = Math.max(1, newHeight);

  const updatedResized = { ...resized, grid_width: clampedW, grid_height: clampedH };
  const others = charts.filter((c) => c.chart_id !== resizedId);

  // Sort others top-left first so earlier tiles get preferred positions
  const sorted = [...others].sort((a, b) => {
    const dy = (Number(a.grid_y) || 0) - (Number(b.grid_y) || 0);
    if (dy !== 0) return dy;
    return (Number(a.grid_x) || 0) - (Number(b.grid_x) || 0);
  });

  const placed = [updatedResized];
  const result = [updatedResized];

  for (const chart of sorted) {
    const w = Number(chart.grid_width) || getDefaultGridWidth(chart.chart_type);
    const h = resolveGridHeight(chart);
    const rect = {
      x: Number(chart.grid_x) || 0,
      y: Number(chart.grid_y) || 0,
      width: w,
      height: h,
    };
    const overlaps = placed.some((p) => rectsOverlap(rect, getTileRect(p)));

    if (overlaps) {
      const { gridX: nx, gridY: ny } = findNextAvailablePosition(placed, w, h);
      const relocated = { ...chart, grid_x: nx, grid_y: ny };
      placed.push(relocated);
      result.push(relocated);
    } else {
      placed.push(chart);
      result.push(chart);
    }
  }

  return compactChartsGridLayout(result);
}

export function getDragOverlayStyle(chart, containerWidthPx) {
  const { gridWidth, gridHeight } = getChartGridDimensions(chart);
  const gap = 12;
  const effectiveWidth = containerWidthPx ?? DASHBOARD_MAX_WIDTH;
  const columnWidth = (effectiveWidth - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  const width = columnWidth * gridWidth + gap * Math.max(0, gridWidth - 1);
  const height = gridHeight * GRID_ROW_HEIGHT + gap * Math.max(0, gridHeight - 1);

  return {
    width: `${width}px`,
    height: `${height}px`,
  };
}

export function getGridTileStyle(chart) {
  const { gridX, gridY, gridWidth, gridHeight } = getChartGridDimensions(chart);

  return {
    gridColumn: `${gridX + 1} / span ${gridWidth}`,
    gridRow: `${gridY + 1} / span ${gridHeight}`,
  };
}
