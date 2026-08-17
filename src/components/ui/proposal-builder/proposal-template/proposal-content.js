/**
 * Proposal template fallback content.
 *
 * Primary source of truth is Proposal Template Settings (Desk/API). This file intentionally keeps
 * only the minimal shapes needed for rendering/loading and test safety.
 */

export const PROPOSAL_PAGE_COUNT = 9;

/** Figma template placeholders — replaced on proposal create / first load */
export const PROPOSAL_TEMPLATE_PLACEHOLDERS = {
  CLIENT_BRAND: '<<Client Brand Name>>',
  CLIENT_NAME: '<<Client Name>>',
  /** Geographic city from Center (Space → Center → city). */
  CITY_NAME: '<<City Name>>',
  /** Center display name from Center.center_name. */
  CENTER_NAME: '<<Center Name>>',
  /** Center / place name — same source as <<Center Name>>. */
  ASSET_NAME: '<<Asset Name>>',
};

const TEMPLATE_CLIENT_BRAND = PROPOSAL_TEMPLATE_PLACEHOLDERS.CLIENT_BRAND;
const TEMPLATE_CLIENT_NAME = PROPOSAL_TEMPLATE_PLACEHOLDERS.CLIENT_NAME;
const TEMPLATE_CITY_NAME = PROPOSAL_TEMPLATE_PLACEHOLDERS.CITY_NAME;
const TEMPLATE_CENTER_NAME = PROPOSAL_TEMPLATE_PLACEHOLDERS.CENTER_NAME;
const TEMPLATE_ASSET_NAME = PROPOSAL_TEMPLATE_PLACEHOLDERS.ASSET_NAME;

export const PAGE3_STAT_ICONS = {
  metro: '/proposal-template/page-3/icons/metro.png',
  gdp: '/proposal-template/page-3/icons/gdp.png',
  tech: '/proposal-template/page-3/icons/tech.png',
  startup: '/proposal-template/page-3/icons/startup.png',
  rank: '/proposal-template/page-3/icons/global-rank.png',
  gcc: '/proposal-template/page-3/icons/gcc.png',
  generic: '/proposal-template/page-3/icons/generic.png',
};

export const PAGE4_ICONS = {
  residential: '/proposal-template/page-4/icons/residential.png',
  plaza: '/proposal-template/page-4/icons/plaza.png',
  lifestyle: '/proposal-template/page-4/icons/lifestyle.png',
  hospitality: '/proposal-template/page-4/icons/residential.png',
  wellness: '/proposal-template/page-4/icons/plaza.png',
  retail: '/proposal-template/page-4/icons/lifestyle.png',
};

export const PAGE2_COMPARISON_COLUMNS = [
  { key: 'parameter', label: 'Parameter' },
  { key: 'devx', label: 'DevX Managed Office' },
  { key: 'traditional', label: 'Traditional Office' },
  { key: 'coworking', label: 'Coworking' },
];

export const PAGE2_COMPARISON_ROWS = [
  {
    id: 'setup',
    parameter: 'Setup / Fit-out',
    devx: 'Included',
    traditional: 'Client-led',
    coworking: 'Included (limited)',
  },
  {
    id: 'operations',
    parameter: 'Operations',
    devx: 'DevX-managed',
    traditional: 'Client-managed',
    coworking: 'Shared / basic',
  },
  {
    id: 'scalability',
    parameter: 'Scalability',
    devx: 'On-demand',
    traditional: 'Slow',
    coworking: 'Limited',
  },
];

export const defaultProposalContent = {
  page1: {
    clientBrandName: TEMPLATE_CLIENT_BRAND,
    title: `Fully Managed, Enterprise Grade Workspace for ${TEMPLATE_CLIENT_BRAND}`,
    subtitle: 'Your team and your brand, fully managed across multiple cities.',
    images: {
      heroBackground: '/proposal-template/page-1/hero-bg.png',
      logo: '/proposal-template/page-1/logo.png',
      galleryWide: '/proposal-template/page-1/gallery-wide.png',
      galleryLeftTop: '/proposal-template/page-1/gallery-left-top.png',
      galleryLeftBottom: '/proposal-template/page-1/gallery-left-bottom.png',
      galleryRight: '/proposal-template/page-1/gallery-right.png',
    },
  },
  page2: {
    clientBrandName: TEMPLATE_CLIENT_BRAND,
    cityName: TEMPLATE_CITY_NAME,
    heading: `Why DevX for ${TEMPLATE_CLIENT_BRAND} in ${TEMPLATE_CITY_NAME}`,
    features: [
      {
        id: 'speed',
        title: 'Speed to Launch',
        description: 'Launch fast with a fully-managed setup.',
        icon: '/proposal-template/page-2/icons/speed.png',
      },
      {
        id: 'experience',
        title: 'Enterprise Experience',
        description: 'Spaces designed for productivity and brand.',
        icon: '/proposal-template/page-2/icons/experience.png',
      },
      {
        id: 'ops',
        title: 'Operations Included',
        description: 'Day-to-day operations managed by DevX.',
        icon: '/proposal-template/page-2/icons/operations.png',
      },
    ],
    comparison: {
      title: 'A Quick Comparison',
      subtitle: `What makes DevX the right partner for ${TEMPLATE_CLIENT_NAME} in ${TEMPLATE_CITY_NAME}.`,
      columns: PAGE2_COMPARISON_COLUMNS,
      rows: PAGE2_COMPARISON_ROWS,
    },
    images: {
      heroBackground: '/proposal-template/page-2/hero-bg.png',
    },
  },
  page3: {
    heading: 'National Presence',
    spreadTitle: `A multi-city footprint for ${TEMPLATE_CLIENT_BRAND}`,
    highlights: [
      {
        id: 'cities',
        value: '10+',
        label: 'Cities',
        description: 'Across India',
        icon: PAGE3_STAT_ICONS.rank,
      },
      {
        id: 'centers',
        value: '20+',
        label: 'Centers',
        description: 'Enterprise-ready',
        icon: PAGE3_STAT_ICONS.gcc,
      },
      {
        id: 'seats',
        value: '10k+',
        label: 'Seats',
        description: 'Managed capacity',
        icon: PAGE3_STAT_ICONS.metro,
      },
      {
        id: 'sla',
        value: 'SLA',
        label: 'Support',
        description: 'Dedicated teams',
        icon: PAGE3_STAT_ICONS.generic,
      },
    ],
    presencePoints: [
      {
        id: 'presence-1',
        title: 'Multi-city support',
        description: 'Standardized experience and governance across locations.',
        icon: PAGE3_STAT_ICONS.tech,
      },
      {
        id: 'presence-2',
        title: 'Flexible scaling',
        description: 'Scale up or down with minimal lead time.',
        icon: PAGE3_STAT_ICONS.startup,
      },
      {
        id: 'presence-3',
        title: 'Operational excellence',
        description: 'Facilities, IT, and services under one roof.',
        icon: PAGE3_STAT_ICONS.gcc,
      },
      {
        id: 'presence-4',
        title: 'Brand-ready',
        description: 'Custom branding and layouts for enterprise needs.',
        icon: PAGE3_STAT_ICONS.rank,
      },
    ],
    aboutCity: {
      title: `About ${TEMPLATE_CITY_NAME}`,
      subtitle: 'Why DevX is the right partner for your enterprise managed office.',
      stats: [
        {
          id: 'metro',
          title: 'Metro',
          value: '—',
          description: 'Population & reach',
          icon: PAGE3_STAT_ICONS.metro,
        },
        {
          id: 'gdp',
          title: 'GDP',
          value: '—',
          description: 'Economic output',
          icon: PAGE3_STAT_ICONS.gdp,
        },
        {
          id: 'tech',
          title: 'Tech',
          value: '—',
          description: 'Tech ecosystem',
          icon: PAGE3_STAT_ICONS.tech,
        },
        {
          id: 'startup',
          title: 'Startups',
          value: '—',
          description: 'Startup density',
          icon: PAGE3_STAT_ICONS.startup,
        },
        {
          id: 'rank',
          title: 'Rank',
          value: '—',
          description: 'Global standing',
          icon: PAGE3_STAT_ICONS.rank,
        },
        {
          id: 'gcc',
          title: 'GCCs',
          value: '—',
          description: 'GCC footprint',
          icon: PAGE3_STAT_ICONS.gcc,
        },
      ],
    },
    images: {
      heroBackground: '/proposal-template/page-3/hero-bg.png',
      indiaMap: '/proposal-template/page-3/india-map.png',
      footerSkyline: '/proposal-template/page-3/footer-skyline.png',
    },
  },
  page4: {
    heading: `Asset Overview — ${TEMPLATE_ASSET_NAME}`,
    statsLayout: 'variation-1',
    assetStats: [
      { id: 'land', label: 'Land Area', value: '—', sublabel: 'Campus extent' },
      { id: 'build', label: 'Build Area', value: '—', sublabel: 'Gross area' },
      { id: 'floorplate', label: 'Floor Plate', value: '—', sublabel: 'Per floor' },
      { id: 'tower', label: 'Floors', value: '—', sublabel: 'Tower' },
    ],
    locationHighlights: [
      { id: 'metro', title: 'Metro', description: '—' },
      { id: 'road', title: 'Connectivity', description: '—' },
      { id: 'address', title: 'Address', description: '—' },
      { id: 'airport', title: 'Airport', description: '—' },
    ],
    neighbors: {
      title: "Who's already here",
      cards: [
        { id: 'n1', title: 'Enterprise', description: '—', icon: PAGE4_ICONS.residential },
        { id: 'n2', title: 'Retail', description: '—', icon: PAGE4_ICONS.retail },
        { id: 'n3', title: 'Lifestyle', description: '—', icon: PAGE4_ICONS.lifestyle },
      ],
    },
    images: {
      heroBackground: '/proposal-template/page-4/hero-bg.png',
      buildingHero: '/proposal-template/page-4/building-hero.png',
      locationMap: '/proposal-template/page-4/location-map.png',
    },
  },
  page5: {
    heading: `Center Snapshots — ${TEMPLATE_CENTER_NAME}`,
    sections: {
      commonAreas: { title: 'Common Areas', images: {} },
      meetingRooms: { title: 'Meeting Rooms', images: {} },
      offices: { title: 'The Offices', images: {} },
    },
    images: {
      heroBackground: '/proposal-template/page-5/hero-bg.png',
    },
  },
  page6: {
    heading: 'Floor Plan & Inclusions',
    floorPlan: {
      title: 'Floor Plan',
      image: '/proposal-template/page-6/floor-plan-composition.png',
      customAnnotations: [],
      customAnnotationMeta: null,
      editorSettings: null,
    },
    metrics: [
      { id: 'seats', label: 'Seats', value: '—' },
      { id: 'area', label: 'Area', value: '—' },
      { id: 'floor', label: 'Floor', value: '—' },
      { id: 'layout', label: 'Layout', value: '—' },
    ],
    inclusions: {
      title: 'Inclusions - Everything Covered',
      subtitle:
        'Every line item below is included in the managed office arrangement at no additional cost.',
      columns: [
        { key: 'inclusion', label: 'Inclusions' },
        { key: 'exclusion', label: 'Exclusions' },
      ],
      rows: [
        { id: 'row-1', inclusion: 'Office Rent', exclusion: 'Printing & Stationary' },
        {
          id: 'row-2',
          inclusion: 'Property TAX',
          exclusion:
            "All Hardware's like - TV, CCTV, Fridge, Oven, Access control, projector, screens.",
        },
        {
          id: 'row-3',
          inclusion: 'CAM',
          exclusion: 'CCTV in Production Area - to ensure GDPR Compliance',
        },
        {
          id: 'row-4',
          inclusion:
            'Electricity – 24*7 Access – AC Usage: 12 hours i.e. 9AM to 9 PM (Monday to Friday)',
          exclusion: 'Server Room Equipment',
        },
        {
          id: 'row-5',
          inclusion: 'Housekeeping Consumables',
          exclusion: 'Food & Beverages Consumables',
        },
        {
          id: 'row-6',
          inclusion: 'Housekeeping Supervisor and Staff',
          exclusion: 'Newspaper Services',
        },
        {
          id: 'row-7',
          inclusion: 'Internet Plan - BCP - 100 MBPS',
          exclusion: 'Parking Space - Post Complimentary offered',
        },
        {
          id: 'row-8',
          inclusion: 'Regular Shampooing and Dry-cleaning of Carpet',
          exclusion: 'AC beyond standard hours',
        },
        {
          id: 'row-9',
          inclusion: 'AMC of Office Assets like HVAC, Chairs and Other Furniture',
          exclusion: 'Branding Logo*',
        },
        { id: 'row-10', inclusion: 'Security Services - 24*7', exclusion: '' },
        { id: 'row-11', inclusion: 'Office Access - 24*7', exclusion: '' },
        { id: 'row-12', inclusion: 'Tea/Coffee/ Water - Common', exclusion: '' },
        { id: 'row-13', inclusion: 'CCTV in Common Areas', exclusion: '' },
        {
          id: 'row-14',
          inclusion:
            "Cable & electrical provision for TV's, CCTV, Access control. Projectors, Screens, Oven, Fridge",
          exclusion: '',
        },
        {
          id: 'row-15',
          inclusion: 'Servicing of Modular Furniture- workstation, Chair, Loose furniture, Carpet.',
          exclusion: '',
        },
        {
          id: 'row-16',
          inclusion:
            'Electrical- Table lighting, fancy lighting cabling of wires, AC setup, Lan ports provision on each workstation.',
          exclusion: '',
        },
        {
          id: 'row-17',
          inclusion: 'Ceiling- Industrial concept in workstation area and false ceiling in cabins',
          exclusion: '',
        },
        {
          id: 'row-18',
          inclusion: 'Server room- Race channel to be provided, Cable pulling to server room',
          exclusion: '',
        },
        {
          id: 'row-19',
          inclusion: 'Civil work- Painting, wallpapers, glass frosting, flooring, blinds',
          exclusion: '',
        },
        { id: 'row-20', inclusion: 'Common washroom', exclusion: '' },
      ],
    },
    images: {
      heroBackground: '/proposal-template/page-6/hero-bg.png',
    },
  },
  page7: {
    heading: 'Amenities & Commercial Terms',
    amenities: [
      { id: 'a1', title: 'Reception', icon: '/proposal-template/page-7/icons/reception.png' },
      { id: 'a2', title: 'Meeting rooms', icon: '/proposal-template/page-7/icons/meeting.png' },
      { id: 'a3', title: 'Pantry', icon: '/proposal-template/page-7/icons/pantry.png' },
      { id: 'a4', title: 'IT support', icon: '/proposal-template/page-7/icons/it.png' },
      { id: 'a5', title: 'Security', icon: '/proposal-template/page-7/icons/security.png' },
      { id: 'a6', title: 'Housekeeping', icon: '/proposal-template/page-7/icons/cleaning.png' },
    ],
    terms: {
      title: 'Commercial Terms',
      subtitle: 'High-level terms (editable).',
      table: {
        columns: [
          { key: 'parameter', label: 'Parameter' },
          { key: 'value', label: 'Value' },
          { key: 'notes', label: 'Notes' },
        ],
        rows: [{ id: 't1', parameter: '—', value: '—', notes: '—' }],
      },
    },
    images: {
      heroBackground: '/proposal-template/page-7/hero-bg.png',
    },
  },
  page8: {
    heading: 'Clients & Testimonials',
    stats: [
      { id: 's1', label: 'Cities', value: '—' },
      { id: 's2', label: 'Centers', value: '—' },
      { id: 's3', label: 'Seats', value: '—' },
      { id: 's4', label: 'NPS', value: '—' },
    ],
    categories: [
      {
        id: 'cat-1',
        label: 'Enterprise',
        logos: [{ id: 'l1', image: '/proposal-template/page-8/logos/logo-1.png' }],
      },
      {
        id: 'cat-2',
        label: 'Scaleups',
        logos: [{ id: 'l2', image: '/proposal-template/page-8/logos/logo-2.png' }],
      },
    ],
    testimonials: [
      {
        id: 't1',
        image: '/proposal-template/page-8/testimonials/testimonial-1.png',
        videoUrl: '',
        name: 'Customer',
        title: 'Role — Company',
      },
    ],
    images: {
      heroBackground: '/proposal-template/page-8/hero-bg.png',
      indiaMap: '/proposal-template/page-8/india-map.png',
      footerOffice: '/proposal-template/page-8/footer-office.png',
    },
  },
  page9: {
    title: 'The Last Office Decision You Will Ever Need to Make',
    subtitle: 'Copy for CTA',
    images: {
      heroBackground: '/proposal-template/page-9/hero-bg.png',
      logo: '/proposal-template/page-9/logo.png',
      galleryWide: '/proposal-template/page-9/gallery-wide.png',
      galleryLeftTop: '/proposal-template/page-9/gallery-left-top.png',
      galleryLeftBottom: '/proposal-template/page-9/gallery-left-bottom.png',
      galleryRight: '/proposal-template/page-9/gallery-right.png',
    },
  },
};

export const PROPOSAL_TEMPLATE_PAGES = [
  { id: 1, key: 'page1', label: 'Cover' },
  { id: 2, key: 'page2', label: 'Why DevX' },
  { id: 3, key: 'page3', label: 'National Presence' },
  { id: 4, key: 'page4', label: 'Asset Overview' },
  { id: 5, key: 'page5', label: 'Center Snapshots' },
  { id: 6, key: 'page6', label: 'Floor Plan' },
  { id: 7, key: 'page7', label: 'Amenities & Terms' },
  { id: 8, key: 'page8', label: 'Clients & Testimonials' },
  { id: 9, key: 'page9', label: 'Closing' },
];

function cloneProposalContent(content) {
  return JSON.parse(JSON.stringify(content));
}

function mergePageContent(defaults, saved) {
  if (!saved || typeof saved !== 'object') return cloneProposalContent(defaults);
  const merged = { ...defaults, ...saved };
  if (defaults.images && saved.images) {
    merged.images = { ...defaults.images, ...saved.images };
  }
  return merged;
}

/** Merge persisted template page content onto defaults (page1–page9). */
export function mergeProposalContent(saved = null) {
  if (!saved || typeof saved !== 'object') {
    return cloneProposalContent(defaultProposalContent);
  }
  return Object.fromEntries(
    Object.entries(defaultProposalContent).map(([key, defaults]) => [
      key,
      mergePageContent(defaults, saved[key]),
    ]),
  );
}
