import { annotationToLayoutCoordinate } from '../layout-coordinate-payload.js';

const COORD_KEYS = [
  'type',
  'x',
  'y',
  'width',
  'height',
  'radiusX',
  'radiusY',
  'points',
  'bezierPoints',
  'closed',
];

function toCleanCoord(ann) {
  const result = {};
  for (const key of COORD_KEYS) {
    if (ann[key] !== undefined) result[key] = ann[key];
  }
  return result;
}

describe('annotationToLayoutCoordinate', () => {
  it('serializes circle annotations when radius fields are preserved', () => {
    const ann = {
      type: 'circle',
      x: 0.5,
      y: 0.4,
      radiusX: 0.08,
      radiusY: 0.06,
    };

    const lc = annotationToLayoutCoordinate(toCleanCoord(ann));

    expect(lc).not.toBeNull();
    expect(Array.isArray(lc.points)).toBe(true);
    expect(lc.points.length).toBeGreaterThanOrEqual(3);
  });

  it('returns null for circle when radius fields are stripped', () => {
    const stripped = toCleanCoord({
      type: 'circle',
      x: 0.5,
      y: 0.4,
    });

    expect(annotationToLayoutCoordinate(stripped)).toBeNull();
  });

  it('serializes resized rectangle geometry', () => {
    const lc = annotationToLayoutCoordinate(
      toCleanCoord({
        type: 'rectangle',
        x: 0.1,
        y: 0.2,
        width: 0.35,
        height: 0.4,
      }),
    );

    expect(lc?.points).toHaveLength(4);
    expect(lc.points[1][0]).toBeCloseTo(0.45);
    expect(lc.points[2][1]).toBeCloseTo(0.6);
  });
});
