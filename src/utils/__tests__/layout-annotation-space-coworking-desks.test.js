import {
  collectDesksForCoworkingParentSpace,
  deskCoworkerCoordinateIsPlacedOnLayout,
  enrichDeskCoworkerMarkerFromDeskRow,
  flattenDeskCoworkerMarkersFromLayoutDetail,
  getDesksForSubSpaceFromLayoutDetail,
  pickNextUnplacedDeskId,
} from '../layout-annotation-space';
import { DESK_COWORKER_MARKER } from '@/constants/layout/annotation-sources';

describe('coworking desk marker helpers', () => {
  const spaceId = 'CTR-SPC-100';
  const layoutDetail = {
    layout_shapes: [
      {
        space_ref: spaceId,
        desks: [{ desk_id: 'D-SHAPE-1', sequence: 1 }],
        sub_spaces: [
          {
            sub_space_id: 'SS-A',
            desks: [
              { desk_id: 'D-1', sequence: 1, desk_coordinate: { x: 120, y: 340 } },
              { desk_id: 'D-2', sequence: 2 },
            ],
          },
          {
            sub_space_id: 'SS-B',
            desks: [{ desk_id: 'D-3', sequence: 1 }],
          },
        ],
      },
    ],
  };

  test('deskCoworkerCoordinateIsPlacedOnLayout ignores pixel allocation coords', () => {
    expect(deskCoworkerCoordinateIsPlacedOnLayout({ x: 120, y: 340 })).toBe(false);
    expect(deskCoworkerCoordinateIsPlacedOnLayout({ x: 0.25, y: 0.4 })).toBe(true);
    expect(deskCoworkerCoordinateIsPlacedOnLayout(null)).toBe(false);
  });

  test('collectDesksForCoworkingParentSpace aggregates desks from all sub-spaces', () => {
    const desks = collectDesksForCoworkingParentSpace(layoutDetail, spaceId);
    expect(desks.map((d) => d.desk_id).sort()).toEqual(['D-1', 'D-2', 'D-3', 'D-SHAPE-1']);
  });

  test('getDesksForSubSpaceFromLayoutDetail uses parent aggregation when ssid equals space id', () => {
    const desks = getDesksForSubSpaceFromLayoutDetail(layoutDetail, spaceId, spaceId);
    expect(desks).toHaveLength(4);
  });

  test('pickNextUnplacedDeskId skips pixel coords and returns first open desk', () => {
    const next = pickNextUnplacedDeskId(layoutDetail, [], spaceId, spaceId);
    expect(next).toBe('D-1');
  });

  test('pickNextUnplacedDeskId respects normalized saved layout coords', () => {
    const detail = {
      layout_shapes: [
        {
          space_ref: spaceId,
          sub_spaces: [
            {
              sub_space_id: 'SS-A',
              desks: [{ desk_id: 'D-1', desk_coordinate: { x: 0.2, y: 0.3 } }, { desk_id: 'D-2' }],
            },
          ],
        },
      ],
    };
    expect(pickNextUnplacedDeskId(detail, [], spaceId, spaceId)).toBe('D-2');
  });

  test('pickNextUnplacedDeskId counts local markers under parent coworking batch id', () => {
    const annotations = [
      {
        source: DESK_COWORKER_MARKER,
        parent_space_ref: spaceId,
        sub_space_id: spaceId,
        desk_id: 'D-1',
        id: 'desk-coworker-D-1',
        x: 0.1,
        y: 0.1,
      },
    ];
    expect(pickNextUnplacedDeskId(layoutDetail, annotations, spaceId, spaceId)).toBe('D-2');
  });

  test('flattenDeskCoworkerMarkersFromLayoutDetail includes assigned client logo', () => {
    const markers = flattenDeskCoworkerMarkersFromLayoutDetail({
      layout_shapes: [
        {
          space_ref: spaceId,
          sub_spaces: [
            {
              sub_space_id: 'SS-A',
              desks: [
                {
                  desk_id: 'D-1',
                  sequence: 1,
                  desk_coordinate: { x: 0.2, y: 0.3 },
                  assigned_client: {
                    customer_id: 'C-1',
                    customer_name: 'Acme Corp',
                    company_logo: 'https://example.com/logo.png',
                  },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      desk_id: 'D-1',
      company_logo: 'https://example.com/logo.png',
      client_name: 'Acme Corp',
    });
  });

  test('enrichDeskCoworkerMarkerFromDeskRow copies assigned client fields', () => {
    const enriched = enrichDeskCoworkerMarkerFromDeskRow(
      { id: 'desk-coworker-D-1', desk_id: 'D-1' },
      {
        desk_id: 'D-1',
        sequence: 4,
        assigned_client: {
          customer_name: 'Acme Corp',
          company_logo: 'https://example.com/logo.png',
        },
      },
    );
    expect(enriched).toMatchObject({
      desk_sequence: 4,
      company_logo: 'https://example.com/logo.png',
      client_name: 'Acme Corp',
    });
  });
});
