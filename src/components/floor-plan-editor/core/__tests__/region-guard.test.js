import { isPointInAllocatedRegions } from '../region-guard.js';

const squarePolygonAnnotation = {
  id: 'ann-1',
  type: 'polygon',
  space_ref: 'space-a',
  points: [0, 0, 1, 0, 1, 1, 0, 1],
};

const rectangleAnnotation = {
  id: 'ann-2',
  type: 'rectangle',
  space_ref: 'space-b',
  x: 0.5,
  y: 0.5,
  width: 0.4,
  height: 0.4,
};

describe('isPointInAllocatedRegions', () => {
  test('returns true when point is inside a polygon annotation', () => {
    expect(isPointInAllocatedRegions(0.5, 0.5, [squarePolygonAnnotation])).toBe(true);
  });

  test('returns false when point is outside all polygon annotations', () => {
    expect(isPointInAllocatedRegions(2, 2, [squarePolygonAnnotation])).toBe(false);
  });

  test('returns true when point is inside a rectangle annotation', () => {
    expect(isPointInAllocatedRegions(0.65, 0.65, [rectangleAnnotation])).toBe(true);
  });

  test('returns false when point is outside a rectangle annotation', () => {
    expect(isPointInAllocatedRegions(0.1, 0.1, [rectangleAnnotation])).toBe(false);
  });

  test('returns true when point is inside any one of multiple annotations', () => {
    const smallSquare = {
      id: 'ann-3',
      type: 'polygon',
      space_ref: 'space-c',
      points: [0.1, 0.1, 0.2, 0.1, 0.2, 0.2, 0.1, 0.2],
    };
    expect(isPointInAllocatedRegions(0.15, 0.15, [rectangleAnnotation, smallSquare])).toBe(true);
  });

  test('returns false for empty annotations array', () => {
    expect(isPointInAllocatedRegions(0.5, 0.5, [])).toBe(false);
  });

  test('skips non-polygon non-rectangle annotation types (e.g. point)', () => {
    const dotAnnotation = { id: 'ann-4', type: 'point', x: 0.5, y: 0.5 };
    expect(isPointInAllocatedRegions(0.5, 0.5, [dotAnnotation])).toBe(false);
  });

  test('returns false when annotations is null/undefined', () => {
    expect(isPointInAllocatedRegions(0.5, 0.5, null)).toBe(false);
    expect(isPointInAllocatedRegions(0.5, 0.5, undefined)).toBe(false);
  });

  test('returns false for polygon without space_ref even if point is inside geometry', () => {
    const unassociated = {
      id: 'ann-no-ref',
      type: 'polygon',
      points: [0, 0, 1, 0, 1, 1, 0, 1],
    };
    expect(isPointInAllocatedRegions(0.5, 0.5, [unassociated])).toBe(false);
  });
});
