/**
 * Map Frappe Partner document (GET/PUT response) to the shape used by partner UI.
 * Child tables: contact, revenue_model.
 * When `previous` is provided, fields missing from `doc` keep the prior values (partial API responses).
 */

function mapContactRow(c) {
  const primary =
    c.is_primary === 1 ||
    c.is_primary === true ||
    c.is_primary_contact === 1 ||
    c.is_primary_contact === true;
  return {
    ...c,
    contact_name: c.contact_name ?? c.name ?? '',
    contact_designation: c.contact_designation ?? c.designation ?? '',
    contact_email: c.contact_email ?? c.email ?? '',
    mobile_number: c.mobile_number ?? c.phone ?? '',
    is_primary: primary ? 1 : 0,
  };
}

function mapRevenueRows(revenueRaw) {
  if (!Array.isArray(revenueRaw)) return [];
  return revenueRaw.map((row) => {
    if (row && typeof row === 'object' && row.revenue_model != null) {
      const rawValue = row.revenue_model;
      if (typeof rawValue === 'object' && rawValue !== null) {
        const name = rawValue.model_name ?? rawValue.name ?? rawValue.title ?? '';
        return { revenue_model: String(name).trim() };
      }
      return { revenue_model: String(rawValue) };
    }
    return { revenue_model: String(row) };
  });
}

/** Link / child row shapes from expand_links — UI expects the display string */
function stringifySecondaryCategory(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object') {
    const name =
      raw.secondary_category_name ?? raw.secondary_category ?? raw.name ?? raw.title ?? '';
    return String(name).trim();
  }
  return String(raw).trim();
}

export function normalizePartnerDocument(doc, previous) {
  if (!doc || typeof doc !== 'object') {
    return previous && typeof previous === 'object' ? { ...previous } : null;
  }

  const base = previous && typeof previous === 'object' ? { ...previous } : {};

  const scalar = (key, fallbackKey) => {
    const direct = doc[key];
    const alt = fallbackKey ? doc[fallbackKey] : undefined;
    if (direct !== undefined && direct !== null) return direct;
    if (alt !== undefined && alt !== null) return alt;
    return base[key] ?? '';
  };

  const revenueRaw = doc.revenue_model ?? doc.preferred_revenue_models;
  const revenue_model =
    revenueRaw !== undefined && revenueRaw !== null
      ? mapRevenueRows(revenueRaw)
      : (base.revenue_model ?? []);

  const contactRaw = doc.contact ?? doc.contacts;
  let contact = base.contact ?? [];
  if (contactRaw !== undefined && contactRaw !== null) {
    contact = Array.isArray(contactRaw) ? contactRaw.map(mapContactRow) : (base.contact ?? []);
  }

  const attachmentsRaw =
    doc.partner_attachments ??
    doc.partner_attachment ??
    doc.attachements ??
    doc.attachments ??
    doc.attachments_info ??
    doc.files;
  const attachments =
    attachmentsRaw !== undefined && attachmentsRaw !== null
      ? Array.isArray(attachmentsRaw)
        ? attachmentsRaw
        : []
      : (base.attachments ?? []);

  const secondary_category =
    doc.secondary_category !== undefined && doc.secondary_category !== null
      ? stringifySecondaryCategory(doc.secondary_category)
      : (base.secondary_category ?? '');

  return {
    ...base,
    name: doc.name !== undefined && doc.name !== null ? doc.name : base.name,
    partner_name: scalar('partner_name'),
    website: scalar('website'),
    primary_category: scalar('primary_category'),
    secondary_category,
    partner_base_city: scalar('partner_base_city'),
    company_size: scalar('company_size'),
    industry_type: scalar('industry_type'),
    contact,
    linkedin_url: scalar('linkedin_url'),
    instagram_url: scalar('instagram_url'),
    facebook_url: scalar('facebook_url'),
    youtube_url: scalar('youtube_url'),
    revenue_model,
    estimated_engagement_frequency: scalar('estimated_engagement_frequency'),
    /** Doc user field `owner` is not Partner `partner_owner` — avoid mixing them */
    partner_owner: scalar('partner_owner'),
    onboarding_stage: scalar('onboarding_stage'),
    internal_description: scalar('internal_description'),
    attachments,
  };
}
