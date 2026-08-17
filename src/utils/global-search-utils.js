const DETAIL_ROUTE_BY_DOCTYPE = {
  Customer: '/clients',
  'CRM Account': '/crm/accounts',
  'CRM Contact': '/crm/contacts',
  'CRM Lead': '/crm/leads',
  'Visitor Entry': '/vms/visitors',
  Supplier: '/vendors',
  Vendor: '/vendors',
  Center: '/centers',
  Space: '/spaces',
  Landlord: '/landlords',
  'HD Ticket': '/ticket-management',
  Employee: '/team-management/support_team',
};

const LIST_ROUTE_BY_DOCTYPE = {
  Task: '/settings/crm-task-master',
  ToDo: '/settings/crm-task-master',
  'Operating Expenses': '/opex',
  Agreement: '/agreements/client',
  'Space Booking': '/bookings/list',
  'Visitor Entry': '/vms/visitors',
  'HD Ticket': '/ticket-management',
};

const DOCTYPE_LABEL_BY_FRONTEND_MODULE = {
  'HD Ticket': 'Tickets',
  Customer: 'Clients',
  Supplier: 'Vendors',
  Vendor: 'Vendors',
  'CRM Account': 'CRM Accounts',
  'CRM Contact': 'CRM Contacts',
  'CRM Lead': 'CRM Leads',
  'Visitor Entry': 'VMS',
  Center: 'Centers',
  Space: 'Space Management',
  Landlord: 'Landlords',
  Employee: 'Support Team',
};

function encodeName(name) {
  return encodeURIComponent(String(name ?? '').trim());
}

function cleanFieldValue(raw) {
  return String(raw ?? '')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function getContentParts(content) {
  return String(content ?? '')
    .trim()
    .split(' ||| ')
    .map((part) => cleanFieldValue(part))
    .filter(Boolean);
}

function getBestMatchingPart(parts, query = '') {
  if (parts.length === 0) {
    return '';
  }

  const terms = String(query ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) {
    return parts[0];
  }

  return (
    parts.find((part) => {
      const lower = part.toLowerCase();
      return terms.some((term) => lower.includes(term));
    }) || parts[0]
  );
}

export function resolveGlobalSearchRoute(doctype, name) {
  if (!doctype || !name) {
    return null;
  }

  const normalizedDoctype = String(doctype).trim();
  const normalizedName = String(name).trim();
  if (!normalizedDoctype || !normalizedName) {
    return null;
  }

  const detailPrefix = DETAIL_ROUTE_BY_DOCTYPE[normalizedDoctype];
  if (detailPrefix) {
    return `${detailPrefix}/${encodeName(normalizedName)}`;
  }

  const listRoute = LIST_ROUTE_BY_DOCTYPE[normalizedDoctype];
  if (listRoute) {
    return listRoute;
  }

  return null;
}

export function hasGlobalSearchRoute(doctype, name) {
  return Boolean(resolveGlobalSearchRoute(doctype, name));
}

export function extractGlobalSearchSnippet(content, query = '') {
  const parts = getContentParts(content);
  if (parts.length === 0) {
    return '';
  }

  return getBestMatchingPart(parts, query) || parts[0];
}

export function normalizeGlobalSearchResult(raw, _query = '') {
  const doctype = String(raw?.doctype ?? '').trim();
  const name = String(raw?.name ?? '').trim();
  const contentParts = getContentParts(raw?.content);
  const firstContentPart = contentParts[0] || '';
  const computedTitle = String(raw?.title ?? '').trim() || firstContentPart || name;
  const moduleLabel = DOCTYPE_LABEL_BY_FRONTEND_MODULE[doctype] || doctype;
  const title = computedTitle || moduleLabel;
  const secondContentPart = contentParts.find((part) => part !== title) || '';
  const subtitle = secondContentPart || (contentParts.length > 1 ? contentParts[1] : '');

  return {
    id: `${doctype}::${name}`,
    doctype,
    moduleLabel,
    name,
    title,
    subtitle,
    score: Number(raw?.rank ?? 0),
    route: resolveGlobalSearchRoute(doctype, name),
    raw,
  };
}

export function normalizeGlobalSearchResults(rows = [], query = '') {
  return rows
    .map((row) => normalizeGlobalSearchResult(row, query))
    .filter((row) => row.doctype && row.name);
}

export const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};
