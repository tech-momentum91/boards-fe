/**
 * Schema-v3 pagePlan fixtures for tests (backend is the sole page-plan builder).
 */

function sharedPrefix() {
  return [
    {
      id: 'page:page1',
      templateKey: 'page1',
      enabled: true,
      binding: {},
      label: 'Cover',
    },
    {
      id: 'page:page2',
      templateKey: 'page2',
      enabled: true,
      binding: {},
      label: 'Why DevX',
    },
  ];
}

function sharedSuffix() {
  return [
    {
      id: 'page:page7',
      templateKey: 'page7',
      enabled: true,
      binding: {},
      label: 'Amenities & Terms',
    },
    {
      id: 'page:page8',
      templateKey: 'page8',
      enabled: true,
      binding: {},
      label: 'Clients & Testimonials',
    },
    {
      id: 'page:page9',
      templateKey: 'page9',
      enabled: true,
      binding: {},
      label: 'Closing',
    },
  ];
}

function centerPages({ cityId, centerId, centerName, inventoryId, floor = '1', space = '' }) {
  const labelBase = centerName || centerId;
  return [
    {
      id: `center:${centerId}:page4`,
      templateKey: 'page4',
      enabled: true,
      binding: { cityId, centerId },
      label: `Asset Overview - ${labelBase}`,
    },
    {
      id: `center:${centerId}:page5`,
      templateKey: 'page5',
      enabled: true,
      binding: { cityId, centerId },
      label: `Center Snapshots - ${labelBase}`,
    },
    {
      id: `space:${inventoryId}:layout`,
      templateKey: 'page6',
      enabled: true,
      binding: { cityId, centerId, inventoryId },
      label: `Floor Plan - ${labelBase}${floor ? ` - Floor ${floor}` : ''}${space ? ` - ${space}` : ''}`,
    },
  ];
}

/** Single-city / single-center plan used by slice + flatten tests. */
export function fixtureSingleCenterPagePlan({
  city = 'Ahmedabad',
  cityId = 'ahmedabad',
  centerId = 'CENTER-001',
  centerName = 'Skyline',
  inventoryId = 'INV-001',
  floor = '12',
  space = 'S-12A',
} = {}) {
  return {
    prefix: sharedPrefix(),
    cities: [
      {
        id: `city:${cityId}`,
        page: {
          id: `city:${cityId}`,
          templateKey: 'page3',
          enabled: true,
          binding: { cityId },
          label: `National Presence - ${city}`,
        },
        centers: [
          {
            id: `center:${centerId}`,
            pages: centerPages({
              cityId,
              centerId,
              centerName,
              inventoryId,
              floor,
              space,
            }),
          },
        ],
      },
    ],
    suffix: sharedSuffix(),
  };
}

/** Matches `buildProposal()` inventory in proposal-page-instance-content tests. */
export function fixturePuneAhmedabadPagePlan() {
  return {
    prefix: sharedPrefix(),
    cities: [
      {
        id: 'city:pune',
        page: {
          id: 'city:pune',
          templateKey: 'page3',
          enabled: true,
          binding: { cityId: 'pune' },
          label: 'National Presence - Pune',
        },
        centers: [
          {
            id: 'center:PUNE-001',
            pages: centerPages({
              cityId: 'pune',
              centerId: 'PUNE-001',
              centerName: 'DevX Magarpatta',
              inventoryId: 'INV-PUNE-01',
              floor: '3',
              space: 'SP-PUN-01',
            }),
          },
        ],
      },
      {
        id: 'city:ahmedabad',
        page: {
          id: 'city:ahmedabad',
          templateKey: 'page3',
          enabled: true,
          binding: { cityId: 'ahmedabad' },
          label: 'National Presence - Ahmedabad',
        },
        centers: [
          {
            id: 'center:BN-AMD',
            pages: centerPages({
              cityId: 'ahmedabad',
              centerId: 'BN-AMD',
              centerName: 'Bodakdev',
              inventoryId: 'INV-BN-01',
              floor: '12',
              space: 'SP-AMD-01',
            }),
          },
        ],
      },
    ],
    suffix: sharedSuffix(),
  };
}

export function fixtureTwoCityPagePlan() {
  return {
    prefix: sharedPrefix(),
    cities: [
      {
        id: 'city:ahmedabad',
        page: {
          id: 'city:ahmedabad',
          templateKey: 'page3',
          enabled: true,
          binding: { cityId: 'ahmedabad' },
          label: 'National Presence - Ahmedabad',
        },
        centers: [
          {
            id: 'center:CENTER-001',
            pages: centerPages({
              cityId: 'ahmedabad',
              centerId: 'CENTER-001',
              inventoryId: 'INV-001',
              floor: '1',
            }),
          },
        ],
      },
      {
        id: 'city:mumbai',
        page: {
          id: 'city:mumbai',
          templateKey: 'page3',
          enabled: true,
          binding: { cityId: 'mumbai' },
          label: 'National Presence - Mumbai',
        },
        centers: [
          {
            id: 'center:CENTER-002',
            pages: centerPages({
              cityId: 'mumbai',
              centerId: 'CENTER-002',
              inventoryId: 'INV-002',
              floor: '2',
            }),
          },
        ],
      },
    ],
    suffix: sharedSuffix(),
  };
}

export function fixtureTwoCentersSameCityPagePlan() {
  return {
    prefix: sharedPrefix(),
    cities: [
      {
        id: 'city:ahmedabad',
        page: {
          id: 'city:ahmedabad',
          templateKey: 'page3',
          enabled: true,
          binding: { cityId: 'ahmedabad' },
          label: 'National Presence - Ahmedabad',
        },
        centers: [
          {
            id: 'center:CENTER-001',
            pages: centerPages({
              cityId: 'ahmedabad',
              centerId: 'CENTER-001',
              inventoryId: 'INV-001',
              floor: '1',
            }),
          },
          {
            id: 'center:CENTER-002',
            pages: centerPages({
              cityId: 'ahmedabad',
              centerId: 'CENTER-002',
              inventoryId: 'INV-002',
              floor: '2',
            }),
          },
        ],
      },
    ],
    suffix: sharedSuffix(),
  };
}
