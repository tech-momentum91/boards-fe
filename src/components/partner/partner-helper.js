import { PARTNER_AVATAR_COLORS } from '@/components/partner/constants';
import { getInitials } from '@/lib/utils';

export const getPartnerInitials = (name) => getInitials(name);

export const getPartnerAvatarColor = (index = 0) => {
  const safeIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
  const idx =
    ((safeIndex % PARTNER_AVATAR_COLORS.length) + PARTNER_AVATAR_COLORS.length) %
    PARTNER_AVATAR_COLORS.length;
  return PARTNER_AVATAR_COLORS[idx];
};

/**
 * Ensure exactly one item is marked primary (is_primary=1), if any primary exists.
 * Optionally maps each row via `mapRow` before enforcing.
 */
export const ensureSinglePrimary = (rows = [], mapRow) => {
  const src = Array.isArray(rows) ? rows : [];
  const mapped = typeof mapRow === 'function' ? src.map(mapRow) : src.map((r) => ({ ...r }));
  const normalized = mapped.map((c) => ({
    ...c,
    is_primary:
      c?.is_primary === 1 ||
      c?.is_primary === true ||
      c?.is_primary_contact === 1 ||
      c?.is_primary_contact === true
        ? 1
        : 0,
  }));
  const primaryIndex = normalized.findIndex((c) => c.is_primary === 1);
  if (primaryIndex === -1) return normalized;
  return normalized.map((c, idx) => (idx === primaryIndex ? c : { ...c, is_primary: 0 }));
};

export const getPartnerContacts = (p) => p?.contact ?? p?.contacts ?? [];

export const getRevenueModelValue = (p) => {
  const rm = p?.revenue_model ?? p?.preferred_revenue_models;
  if (!Array.isArray(rm) || rm.length === 0) return '';
  if (typeof rm[0] === 'object' && rm[0]?.revenue_model) {
    const rawValue = rm[0].revenue_model;
    if (typeof rawValue === 'object' && rawValue !== null) {
      return rawValue.model_name ?? rawValue.name ?? rawValue.title ?? '';
    }
    return String(rawValue);
  }
  return String(rm[0] || '');
};

export const normalizePartnerRowForDetail = (row) => {
  if (!row) return null;

  let revenueModelValue;
  if (typeof row.revenue_model === 'string') {
    revenueModelValue = row.revenue_model;
  } else if (Array.isArray(row.revenue_model)) {
    const firstRevenueModel = row.revenue_model[0];
    revenueModelValue =
      typeof firstRevenueModel === 'object' ? firstRevenueModel?.revenue_model : firstRevenueModel;
  } else {
    revenueModelValue = row.preferred_revenue_models?.[0];
  }

  const contact = row.primary_contact
    ? [
        {
          contact_name: row.primary_contact ?? '',
          contact_designation: '',
          contact_email: '',
          mobile_number: '',
          is_primary: 1,
        },
      ]
    : [];

  return {
    name: row.id,
    partner_name: row.partner_name ?? '',
    website: row.website ?? '',
    primary_category: row.primary ?? '',
    secondary_category: row.secondary ?? '',
    partner_base_city: row.city ?? '',
    company_size: row.size ?? '',
    industry_type: row.industry ?? '',
    contact,
    linkedin_url: '',
    instagram_url: '',
    facebook_url: '',
    youtube_url: '',
    revenue_model: revenueModelValue ? [{ revenue_model: revenueModelValue }] : [],
    estimated_engagement_frequency: row.frequency ?? '',
    partner_owner: row.partner_owner ?? row.owner ?? '',
    onboarding_stage: row.stage ?? row.onboarding_stage ?? '',
    internal_description: '',
  };
};

export const mapPartnerAttachmentRow = (att, idx = 0) => ({
  id:
    att?.name ||
    att?.id ||
    `${att?.file_name || att?.file_url || att?.attachment || att?.attachement || 'att'}-${idx}`,
  fileName:
    att?.attachment_name ||
    att?.attachmentName ||
    att?.file_name ||
    att?.fileName ||
    (typeof att?.file_url === 'string'
      ? att.file_url.split('/').pop()
      : typeof att?.attachment === 'string'
        ? att.attachment.split('/').pop()
        : typeof att?.attachement === 'string'
          ? att.attachement.split('/').pop()
          : '') ||
    '--',
  type: att?.attachment_type?.split?.('.').pop?.() || att?.type || 'Other',
  uploadedBy: att?.uploaded_by || att?.owner || att?.uploadedBy || '--',
  date: att?.creation || att?.date || '--',
  fileUrl: att?.file_url || att?.attachment || att?.attachement || att?.url || att?.file || '',
  childRowId: att?.name || att?.child_row_id || att?.id || '',
  childDoctype: att?.child_doctype || 'Partner Attachment',
  raw: att,
});

export const normalizePartnerAttachments = (doc) => {
  const rows =
    doc?.partner_attachments ||
    doc?.partner_attachment ||
    doc?.attachements ||
    doc?.attachments ||
    doc?.attachments_info ||
    doc?.files ||
    [];

  return (Array.isArray(rows) ? rows : []).map((att, idx) => mapPartnerAttachmentRow(att, idx));
};

export const extractAttachmentsFromUploadPayload = (payload) => {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (
    typeof payload === 'object' &&
    payload.message != null &&
    typeof payload.message === 'object'
  ) {
    const nested = extractAttachmentsFromUploadPayload(payload.message);
    if (nested.length > 0) return nested;
  }
  if (Array.isArray(payload.partner_attachments)) return payload.partner_attachments;
  if (Array.isArray(payload.attachements)) return payload.attachements;
  if (Array.isArray(payload.attachments)) return payload.attachments;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (
    payload.file_name ||
    payload.file_url ||
    payload.attachment ||
    payload.attachement ||
    (payload.name &&
      (payload.file || payload.attachment || payload.attachement || payload.file_name))
  ) {
    return [payload];
  }
  return [];
};
