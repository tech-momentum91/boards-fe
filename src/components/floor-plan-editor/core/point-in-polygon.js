/**
 * Ray-casting point-in-polygon for flat normalized [x0,y0,x1,y1,...] arrays.
 * Returns true if (px, py) lies inside the polygon.
 *
 * @param {number} px - normalized x (0–1)
 * @param {number} py - normalized y (0–1)
 * @param {number[]} flatPoints - flat array [x0,y0,x1,y1,...], minimum 6 values (3 vertices)
 * @returns {boolean}
 */
export function isPointInPolygon(px, py, flatPoints) {
  if (!Array.isArray(flatPoints) || flatPoints.length < 6) return false;

  const n = flatPoints.length / 2;
  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = flatPoints[i * 2];
    const yi = flatPoints[i * 2 + 1];
    const xj = flatPoints[j * 2];
    const yj = flatPoints[j * 2 + 1];

    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}
