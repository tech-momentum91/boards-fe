import {
  buildLayoutDeskAssignItems,
  buildLayoutDeskMetaMap,
  buildSpaceLayoutDeskPickerAnnotations,
  collectClientAssignedDeskIds,
  collectFloorAreasFromMessage,
  coordinatesLookLikePixels,
  findCurrentSpaceLayoutAnnotationId,
  isLayoutDeskSelectable,
  mapAssignSpaceDeselectLayoutToPickerMessage,
  mapSpaceLayoutWithDesksToSpacesArray,
  normalizeLayoutCoordinateForImage,
} from '../space-layout-desk-picker-utils';
import {
  CLIENT_SPACE_REGION_SOURCE,
  CLIENT_SUBSPACE_SLOT_SOURCE,
} from '@/constants/layout/annotation-sources';

describe('space-layout-desk-picker-utils', () => {
  test('detects pixel coordinates', () => {
    expect(coordinatesLookLikePixels({ x: 120, y: 340, width: 24, height: 20 })).toBe(true);
    expect(coordinatesLookLikePixels({ x: 0.42, y: 0.18 })).toBe(false);
  });

  test('normalizes pixel desk coordinates to 0-1 space', () => {
    const normalized = normalizeLayoutCoordinateForImage(
      { x: 100, y: 200, width: 20, height: 20 },
      1000,
      500,
    );
    expect(normalized).toEqual({
      x: 0.1,
      y: 0.4,
      width: 0.02,
      height: 0.04,
    });
  });

  test('maps layout API message to a single-space array', () => {
    const spaces = mapSpaceLayoutWithDesksToSpacesArray({
      space_id: 'SPACE-001',
      space_name: 'Open Area',
      space_layout_coordinate: {
        points: [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
      },
      sub_spaces: [{ sub_space_id: 'SS-1', desks: [{ desk_id: 'D-1' }] }],
    });
    expect(spaces).toHaveLength(1);
    expect(spaces[0].space_id).toBe('SPACE-001');
    expect(spaces[0].sub_spaces[0].desks[0].desk_id).toBe('D-1');
  });

  test('builds desk meta map with sub-space ids', () => {
    const map = buildLayoutDeskMetaMap({
      sub_spaces: [
        {
          sub_space_id: 'SS-1',
          desks: [{ desk_id: 'D-1', desk_status: 'Available', sequence: 3 }],
        },
      ],
    });
    expect(map.get('D-1')).toMatchObject({ deskId: 'D-1', subSpaceId: 'SS-1', sequence: 3 });
  });

  test('collects floor areas from new API shape', () => {
    const areas = collectFloorAreasFromMessage({
      floor_areas: [
        { area_type: 'space', space_id: 'S-1', is_current_space: false },
        { area_type: 'space', space_id: 'S-2', is_current_space: true },
      ],
    });
    expect(areas).toHaveLength(2);
    expect(areas[1].space_id).toBe('S-2');
  });

  test('builds floor region and desk pin annotations from layout API message', () => {
    const message = {
      space_id: 'SPACE-001',
      space_name: 'Open Area',
      inventory_type: 'Co-working Space',
      floor_areas: [
        {
          area_type: 'space',
          space_id: 'SPACE-001',
          name: 'Open Area',
          is_current_space: true,
          inventory_type: 'Co-working Space',
          layout_coordinate: {
            points: [
              [0.1, 0.1],
              [0.4, 0.1],
              [0.4, 0.4],
              [0.1, 0.4],
            ],
          },
        },
        {
          area_type: 'space',
          space_id: 'SPACE-002',
          name: 'Other',
          is_current_space: false,
          inventory_type: 'Managed Office',
          layout_coordinate: {
            points: [
              [0.5, 0.1],
              [0.8, 0.1],
              [0.8, 0.4],
              [0.5, 0.4],
            ],
          },
        },
      ],
      areas: [
        {
          area_type: 'sub_space',
          sub_space_id: 'SS-1',
          space_id: 'SPACE-001',
          sub_space_name: 'Zone A',
          layout_coordinate: {
            points: [
              [0.15, 0.15],
              [0.35, 0.15],
              [0.35, 0.35],
              [0.15, 0.35],
            ],
          },
        },
      ],
      sub_spaces: [
        {
          sub_space_id: 'SS-1',
          desks: [
            {
              desk_id: 'D-1',
              desk_status: 'Available',
              sequence: 1,
              desk_coordinate: { x: 0.2, y: 0.2 },
            },
          ],
        },
      ],
    };

    const annotations = buildSpaceLayoutDeskPickerAnnotations(message, 1000, 800);
    const regions = annotations.filter((ann) => ann.source === CLIENT_SPACE_REGION_SOURCE);
    const desks = annotations.filter((ann) => ann.source === CLIENT_SUBSPACE_SLOT_SOURCE);

    expect(regions).toHaveLength(2);
    expect(regions.some((ann) => ann.is_current_space === true)).toBe(true);
    expect(desks).toHaveLength(1);
    expect(desks[0].desk_id).toBe('D-1');
  });

  test('assigns fallback coordinates to desks missing layout pins', () => {
    const message = {
      space_id: 'SPACE-001',
      sub_spaces: [
        {
          sub_space_id: 'SS-1',
          sub_space_coordinate: {
            points: [
              [0.1, 0.1],
              [0.4, 0.1],
              [0.4, 0.4],
              [0.1, 0.4],
            ],
          },
          desks: [
            { desk_id: 'D-1', desk_status: 'Available', sequence: 1 },
            { desk_id: 'D-2', desk_status: 'Available', sequence: 2 },
          ],
        },
      ],
    };

    const annotations = buildSpaceLayoutDeskPickerAnnotations(message, 1000, 800);
    const desks = annotations.filter((ann) => ann.source === CLIENT_SUBSPACE_SLOT_SOURCE);
    expect(desks).toHaveLength(2);
    expect(desks.every((desk) => Number.isFinite(desk.x) && Number.isFinite(desk.y))).toBe(true);
  });

  test('collects previously assigned client desk ids from layout response', () => {
    const ids = collectClientAssignedDeskIds({
      customer_id: 'CUST-001',
      client_assigned_desk_ids: ['D-01', 'D-02'],
      desks: [{ desk_id: 'D-03', previously_assigned: true }],
    });
    expect(ids.sort()).toEqual(['D-01', 'D-02', 'D-03']);
  });

  test('marks previously assigned desks as non-selectable', () => {
    const map = buildLayoutDeskMetaMap({
      client_assigned_desk_ids: ['D-01'],
      sub_spaces: [
        {
          sub_space_id: 'SS-1',
          desks: [
            { desk_id: 'D-01', desk_status: 'Occupied', sequence: 1 },
            { desk_id: 'D-02', desk_status: 'Available', sequence: 2 },
          ],
        },
      ],
    });
    expect(isLayoutDeskSelectable(map.get('D-01'))).toBe(false);
    expect(isLayoutDeskSelectable(map.get('D-02'))).toBe(true);
    expect(map.get('D-01')?.previouslyAssigned).toBe(true);
  });

  test('builds batch desk assign payload items', () => {
    const map = buildLayoutDeskMetaMap({
      sub_spaces: [
        {
          sub_space_id: 'SS-1',
          desks: [{ desk_id: 'D-1', desk_status: 'Available' }],
        },
      ],
    });
    expect(buildLayoutDeskAssignItems(['D-1'], map)).toEqual([
      { desk_id: 'D-1', sub_space_id: 'SS-1' },
    ]);
  });

  test('findCurrentSpaceLayoutAnnotationId returns current space region', () => {
    const annotations = [
      { id: 'other', source: CLIENT_SPACE_REGION_SOURCE, is_current_space: false },
      {
        id: 'current',
        source: CLIENT_SPACE_REGION_SOURCE,
        is_current_space: true,
        space_ref: 'S-1',
      },
    ];
    expect(findCurrentSpaceLayoutAnnotationId(annotations)).toBe('current');
  });

  test('marks desks with assigned_client as previously assigned', () => {
    const map = buildLayoutDeskMetaMap({
      sub_spaces: [
        {
          sub_space_id: 'SS-1',
          desks: [
            {
              desk_id: 'D-01',
              desk_status: 'Occupied',
              sequence: 1,
              assigned_client: {
                customer_id: 'CUST-1',
                customer_name: 'Acme Corp',
                company_logo: 'https://example.com/logo.png',
              },
            },
            { desk_id: 'D-02', desk_status: 'Available', sequence: 2 },
          ],
        },
      ],
    });
    expect(map.get('D-01')?.previouslyAssigned).toBe(true);
    expect(isLayoutDeskSelectable(map.get('D-01'))).toBe(false);
    expect(map.get('D-02')?.previouslyAssigned).toBe(false);
  });

  test('maps assign space deselect layout response for picker', () => {
    const mapped = mapAssignSpaceDeselectLayoutToPickerMessage({
      ok: true,
      floor: {
        layout_image_url: 'https://example.com/floor.jpg',
      },
      space: {
        space_id: 'SPC-1',
        space_name: 'Open Workspace',
        inventory_type: 'Co-working Space',
        space_layout_coordinate: {
          points: [
            { x: 0.1, y: 0.2 },
            { x: 0.4, y: 0.2 },
            { x: 0.4, y: 0.5 },
          ],
        },
        areas: [
          {
            area_type: 'space',
            id: 'SPC-1',
            is_current_space: true,
            coordinates: {
              points: [
                { x: 0.1, y: 0.2 },
                { x: 0.4, y: 0.2 },
                { x: 0.4, y: 0.5 },
              ],
            },
          },
        ],
      },
      assignment: {
        customer_name: 'Acme Corp',
        company_logo: 'https://example.com/acme.png',
      },
      desk_ids: ['D-01', 'D-02'],
      zones: [
        {
          sub_space_id: 'SS-1',
          sub_space_name: 'Zone A',
          coordinate: {
            points: [
              { x: 0.15, y: 0.25 },
              { x: 0.35, y: 0.25 },
              { x: 0.35, y: 0.45 },
            ],
          },
          desks: [
            {
              desk_id: 'D-01',
              sequence: 1,
              is_selected: true,
              coordinate: { x: 0.2, y: 0.3 },
            },
          ],
        },
      ],
    });

    expect(mapped?.space_id).toBe('SPC-1');
    expect(mapped?.layout_image_url).toBe('https://example.com/floor.jpg');
    expect(mapped?.client_assigned_desk_ids).toEqual(['D-01', 'D-02']);
    expect(mapped?.sub_spaces?.[0]?.desks?.[0]).toMatchObject({
      desk_id: 'D-01',
      previously_assigned: true,
      assigned_client: { customer_name: 'Acme Corp' },
    });

    const annotations = buildSpaceLayoutDeskPickerAnnotations(mapped, 1000, 800);
    const desks = annotations.filter((ann) => ann.source === CLIENT_SUBSPACE_SLOT_SOURCE);
    expect(desks.some((desk) => desk.desk_id === 'D-01')).toBe(true);
  });

  test('includes assigned_client and company_logo on desk pin annotations', () => {
    const message = {
      space_id: 'SPACE-001',
      sub_spaces: [
        {
          sub_space_id: 'SS-1',
          sub_space_coordinate: {
            points: [
              [0.1, 0.1],
              [0.4, 0.1],
              [0.4, 0.4],
              [0.1, 0.4],
            ],
          },
          desks: [
            {
              desk_id: 'D-1',
              desk_status: 'Occupied',
              sequence: 1,
              desk_coordinate: { x: 0.2, y: 0.2 },
              assigned_client: {
                customer_id: 'CUST-1',
                customer_name: 'Acme Corp',
                company_logo: 'https://example.com/acme.png',
              },
            },
          ],
        },
      ],
    };

    const annotations = buildSpaceLayoutDeskPickerAnnotations(message, 1000, 800);
    const desk = annotations.find((ann) => ann.source === CLIENT_SUBSPACE_SLOT_SOURCE);
    expect(desk).toMatchObject({
      desk_id: 'D-1',
      company_logo: 'https://example.com/acme.png',
      client_name: 'Acme Corp',
      hasAssignedClient: true,
      hasDeskAssignment: false,
    });
    expect(desk?.assigned_client).toMatchObject({
      customer_id: 'CUST-1',
      company_logo: 'https://example.com/acme.png',
    });
  });
});
