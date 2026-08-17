import {
  findAssociatedSpaceRegionAt,
  isNormalizedPointInAssociatedSpaceShape,
  sampleClosedBezierOutlineNormalized,
} from '../space-region-hit.js';

describe('findAssociatedSpaceRegionAt', () => {
  test('returns top-most shape when overlapping', () => {
    const bottom = {
      id: 'b',
      type: 'polygon',
      space_ref: 's1',
      points: [0, 0, 1, 0, 1, 1, 0, 1],
    };
    const top = {
      id: 't',
      type: 'polygon',
      space_ref: 's2',
      points: [0.4, 0.4, 0.6, 0.4, 0.6, 0.6, 0.4, 0.6],
    };
    const hit = findAssociatedSpaceRegionAt(0.5, 0.5, [bottom, top]);
    expect(hit?.space_ref).toBe('s2');
  });

  test('ignores shapes without space_ref', () => {
    const noRef = {
      id: 'x',
      type: 'polygon',
      points: [0, 0, 1, 0, 1, 1, 0, 1],
    };
    expect(findAssociatedSpaceRegionAt(0.5, 0.5, [noRef])).toBeNull();
  });

  test('closed pen with bezierPoints contains interior point', () => {
    const pen = {
      id: 'p',
      type: 'pen',
      closed: true,
      space_ref: 'sp-pen',
      bezierPoints: [
        { x: 0.2, y: 0.2, handleIn: null, handleOut: null, pointType: 'corner' },
        { x: 0.8, y: 0.2, handleIn: null, handleOut: null, pointType: 'corner' },
        { x: 0.8, y: 0.8, handleIn: null, handleOut: null, pointType: 'corner' },
        { x: 0.2, y: 0.8, handleIn: null, handleOut: null, pointType: 'corner' },
      ],
    };
    expect(isNormalizedPointInAssociatedSpaceShape(0.5, 0.5, pen)).toBe(true);
    expect(isNormalizedPointInAssociatedSpaceShape(0.05, 0.05, pen)).toBe(false);
  });
});

describe('sampleClosedBezierOutlineNormalized', () => {
  test('returns enough vertices for polygon test', () => {
    const pts = [
      { x: 0, y: 0, handleIn: null, handleOut: null, pointType: 'corner' },
      { x: 1, y: 0, handleIn: null, handleOut: null, pointType: 'corner' },
      { x: 1, y: 1, handleIn: null, handleOut: null, pointType: 'corner' },
      { x: 0, y: 1, handleIn: null, handleOut: null, pointType: 'corner' },
    ];
    const flat = sampleClosedBezierOutlineNormalized(pts, 8);
    expect(flat.length).toBeGreaterThanOrEqual(6);
  });
});
