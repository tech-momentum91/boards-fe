import { isPointInPolygon } from '../point-in-polygon.js';

describe('isPointInPolygon', () => {
  // Unit square: (0,0)→(1,0)→(1,1)→(0,1)
  const square = [0, 0, 1, 0, 1, 1, 0, 1];

  test('returns true for point inside polygon', () => {
    expect(isPointInPolygon(0.5, 0.5, square)).toBe(true);
  });

  test('returns false for point outside polygon', () => {
    expect(isPointInPolygon(2, 2, square)).toBe(false);
  });

  test('returns false for point clearly outside on x-axis', () => {
    expect(isPointInPolygon(-0.5, 0.5, square)).toBe(false);
  });

  test('returns false for degenerate polygon with fewer than 3 points (flat array < 6)', () => {
    expect(isPointInPolygon(0.5, 0.5, [0, 0, 1, 0])).toBe(false);
  });

  test('returns false for empty points array', () => {
    expect(isPointInPolygon(0.5, 0.5, [])).toBe(false);
  });

  test('handles irregular polygon — point inside L-shape', () => {
    const lShape = [0, 0, 0.5, 0, 0.5, 0.5, 1, 0.5, 1, 1, 0, 1];
    expect(isPointInPolygon(0.1, 0.9, lShape)).toBe(true);
  });

  test('handles irregular polygon — point outside L-shape concavity', () => {
    const lShape = [0, 0, 0.5, 0, 0.5, 0.5, 1, 0.5, 1, 1, 0, 1];
    expect(isPointInPolygon(0.8, 0.1, lShape)).toBe(false);
  });
});
