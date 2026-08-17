import apiClient from './axios';
import { getCrmContact } from './crmContacts';
import { getCrmAccount } from './crmAccounts';

/**
 * Check if a contact already has an active (primary) lead.
 * @param {string} contactId – CRM Contact name/id
 * @returns {Promise<{ has_primary_lead: boolean, lead_name: string|null, lead_display_name: string|null }>}
 */
export async function getPrimaryLeadForContact(contactId) {
  if (!contactId || !String(contactId).trim()) {
    return { has_primary_lead: false, lead_name: null, lead_display_name: null };
  }
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.doctype.crm_lead.crm_lead.get_primary_lead_for_contact',
    { params: { contact: contactId } },
  );
  const result = data?.message ?? data ?? {};
  return {
    has_primary_lead: Boolean(result.has_primary_lead),
    lead_name: result.lead_name ?? null,
    lead_display_name: result.lead_display_name ?? result.lead_name ?? '',
  };
}

/**
 * Create a new CRM Lead.
 * Payload: lead_name (required); associate_account->account, associate_contact->contact,
 * message->contact_message, is_primary (optional), delacon_*->backend names.
 * @param {Object} payload – field values
 * @returns {Promise<{ name: string, message: string }>}
 */
export async function createCrmLead(payload) {
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.doctype.crm_lead.crm_lead.create_crm_lead',
    payload,
  );
  return data?.message ?? data;
}

/**
 * CRM Lead list with pagination, search, filters, group-by.
 * Response includes tab badge counts (independent of other list filters/keyword):
 *   - pipeline_counts: { [pipelineName]: number }
 *   - stage_counts: { all, drop, pipeline, stages, stage_order }
 * Backend must ignore tab-scoped filters (lifecycle_stage / dropped lost_reason / keyword)
 * when computing those count maps; otherwise badges skew with the active tab.
 * @param {Object} opts – { keyword, page, pageSize, orderBy, orderDir, filters, groupBy, groupOrder }
 * @param {Object} [opts.filters] – include `pipeline: ['=', pipelineDocName]` to scope by CRM Stages Pipeline
 * @returns {Promise<Object>} API response with results, pagination metadata, and
 *   `{ tab_counts_ok, pipeline_counts, stage_counts }` (counts null when payload missing)
 */
export async function listCrmLeads({
  keyword,
  page,
  pageSize,
  orderBy,
  orderDir,
  filters,
  groupBy,
  groupOrder,
} = {}) {
  const params = {};
  if (keyword) params.keyword = keyword;
  if (page) params.page = page;
  if (pageSize) params.page_size = pageSize;
  if (orderBy) params.order_by = orderBy;
  if (orderDir) params.order_dir = orderDir;
  if (filters && Object.keys(filters).length > 0) params.filters = JSON.stringify(filters);
  if (groupBy) params.group_by = groupBy;
  if (groupOrder) params.group_order = groupOrder;

  const { data } = await apiClient.get('/method/devx.devx_crm.api.crm_lead.get_crm_lead_list', {
    params,
  });
  const result = data?.message ?? data ?? {};
  const parsed = parseCrmLeadListTabCounts(result);
  return {
    ...result,
    tab_counts_ok: parsed.ok,
    pipeline_counts: parsed.ok ? parsed.pipeline_counts : null,
    stage_counts: parsed.ok ? parsed.stage_counts : null,
  };
}

/**
 * Pipeline tab badge counts from a lightweight list call.
 * Returns `{ [pipelineId]: number }` when `tab_counts_ok`, otherwise `null`
 * so callers keep last-good badges (never wipe with {}).
 */
export async function getCrmLeadPipelineTabCounts(filters, keyword) {
  const result = await listCrmLeads({
    page: 1,
    pageSize: 1,
    keyword: keyword || undefined,
    filters: filters && Object.keys(filters).length > 0 ? filters : undefined,
  });
  if (!result?.tab_counts_ok) return null;
  if (!result?.pipeline_counts || typeof result.pipeline_counts !== 'object') return null;
  return result.pipeline_counts;
}

/**
 * Stage tab badge counts from a single list call (uses `stage_counts` payload).
 * Returns the CrmLeadsTab badge map, or `null` when unavailable so callers keep last-good.
 * @param {Object} [filters]
 * @param {string} [keyword]
 * @param {string} [droppedTabValue='__dropped_leads__']
 */
export async function getCrmLeadStageTabCounts(
  filters,
  keyword,
  droppedTabValue = '__dropped_leads__',
) {
  const result = await listCrmLeads({
    page: 1,
    pageSize: 1,
    keyword: keyword || undefined,
    filters: filters && Object.keys(filters).length > 0 ? filters : undefined,
  });
  return stageTabCountsFromListResponse(result, droppedTabValue);
}

/**
 * Parse list-api tab badge payloads.
 * Missing / wrong-shaped counts return `{ ok: false }` so callers can keep last-good
 * badges instead of silently rendering all zeros during a phased rollout.
 * @param {Object} result – get_crm_lead_list message
 * @returns {{ ok: boolean, pipeline_counts: Record<string, number>|null, stage_counts: Object|null }}
 */
export function parseCrmLeadListTabCounts(result = {}) {
  const hasPipeline =
    result?.pipeline_counts != null &&
    typeof result.pipeline_counts === 'object' &&
    !Array.isArray(result.pipeline_counts);
  const hasStage =
    result?.stage_counts != null &&
    typeof result.stage_counts === 'object' &&
    !Array.isArray(result.stage_counts);

  if (!hasPipeline || !hasStage) {
    return { ok: false, pipeline_counts: null, stage_counts: null };
  }

  const pipeline_counts = Object.fromEntries(
    Object.entries(result.pipeline_counts).map(([k, v]) => [k, Number(v) || 0]),
  );

  const rawStage = result.stage_counts;
  const stagesRaw =
    rawStage.stages != null &&
    typeof rawStage.stages === 'object' &&
    !Array.isArray(rawStage.stages)
      ? rawStage.stages
      : {};
  const stages = Object.fromEntries(Object.entries(stagesRaw).map(([k, v]) => [k, Number(v) || 0]));

  return {
    ok: true,
    pipeline_counts,
    stage_counts: {
      all: Number(rawStage.all) || 0,
      drop: Number(rawStage.drop) || 0,
      pipeline: String(rawStage.pipeline ?? '').trim(),
      stages,
      stage_order: Array.isArray(rawStage.stage_order) ? rawStage.stage_order : [],
    },
  };
}

/**
 * @deprecated Use parseCrmLeadListTabCounts — kept for older imports.
 */
export function normalizeCrmLeadListTabCounts(result = {}) {
  const parsed = parseCrmLeadListTabCounts(result);
  if (!parsed.ok) {
    return {
      pipeline_counts: {},
      stage_counts: {
        all: 0,
        drop: 0,
        pipeline: '',
        stages: {},
        stage_order: [],
      },
    };
  }
  return {
    pipeline_counts: parsed.pipeline_counts,
    stage_counts: parsed.stage_counts,
  };
}

/**
 * Map list `stage_counts` → CrmLeadsTab badge map (`all`, stage ids, dropped tab).
 * @param {Object} result – listCrmLeads response (with tab_counts_ok)
 * @param {string|null} [droppedTabValue='__dropped_leads__'] – omit dropped badge when null
 * @returns {Record<string, number>|null} null when counts are unavailable
 */
export function stageTabCountsFromListResponse(result, droppedTabValue = '__dropped_leads__') {
  if (result?.tab_counts_ok === false) return null;
  const stage_counts = result?.stage_counts;
  if (!stage_counts || typeof stage_counts !== 'object') return null;
  return {
    all: stage_counts.all ?? 0,
    ...(stage_counts.stages && typeof stage_counts.stages === 'object' ? stage_counts.stages : {}),
    ...(droppedTabValue ? { [droppedTabValue]: stage_counts.drop ?? 0 } : {}),
  };
}

/**
 * Apply pipeline/stage badge counts from a list response.
 * Keeps previous badge state when the payload is incomplete (does not zero out).
 * @returns {boolean} true when counts were applied
 */
export function applyLeadListTabCounts(
  result,
  { setPipelineTabCounts, setStageTabCounts, droppedTabValue = null } = {},
) {
  if (!result?.tab_counts_ok) {
    return false;
  }
  if (typeof setPipelineTabCounts === 'function') {
    setPipelineTabCounts(result.pipeline_counts ?? {});
  }
  if (typeof setStageTabCounts === 'function') {
    const stages = stageTabCountsFromListResponse(result, droppedTabValue);
    if (stages) setStageTabCounts(stages);
  }
  return true;
}

/**
 * Fetch a single CRM Lead by name (Frappe resource API).
 * @param {string} name – CRM Lead name (id)
 * @returns {Promise<Object>} Lead document
 */
export async function getCrmLead(name) {
  if (!name) return null;
  const encoded = encodeURIComponent(name);
  const { data } = await apiClient.get(`/resource/CRM Lead/${encoded}`);
  const document_ = data?.data ?? data;
  if (!document_) return null;
  const normalized = normalizeCrmLeadDocument(document_);
  const contactId = String(normalized.contact || '').trim();
  if (contactId) {
    try {
      const contactDoc = await getCrmContact(contactId);
      const display = String(contactDoc?.full_name || '').trim();
      normalized.contact_display_name = display || contactId;
    } catch {
      normalized.contact_display_name = contactId;
    }
  } else {
    normalized.contact_display_name = '';
  }
  const accountId = String(normalized.account || '').trim();
  if (accountId) {
    try {
      const accountDoc = await getCrmAccount(accountId);
      // Always from Account.custom_legal_name (never lead_of / customer_name)
      normalized.company_legal_name = (accountDoc?.custom_legal_name || '').trim();
    } catch {
      normalized.company_legal_name = '';
    }
  } else {
    normalized.company_legal_name = '';
  }
  return normalized;
}

function normalizeCrmLeadDocument(leadDocument) {
  const contacts = Array.isArray(leadDocument.contacts) ? leadDocument.contacts : [];
  const primaryFromChild =
    contacts.find((row) => Number(row?.is_primary) === 1)?.contact ||
    contacts.find((row) => String(row?.contact || '').trim())?.contact ||
    '';
  // Prefer child-table primary; fall back to legacy contact if still present on older responses
  const contact = String(primaryFromChild || leadDocument.contact || '').trim() || '';

  return {
    name: leadDocument.name,
    lead_name: leadDocument.lead_name || '',
    company_legal_name: leadDocument.company_legal_name || '',
    lead_of: leadDocument.lead_of || '',
    contact,
    contact_display_name: '',
    account: leadDocument.account || '',
    cp_account: leadDocument.cp_account || '',
    cp_contact: leadDocument.cp_contact || '',
    is_primary: leadDocument.is_primary === 1 || leadDocument.is_primary === true,
    pipeline: leadDocument.pipeline || '',
    lifecycle_stage: leadDocument.lifecycle_stage || '',
    life_cycle_stage_status: leadDocument.life_cycle_stage_status || '',
    sales_owner: leadDocument.sales_owner || '',
    inside_sales: leadDocument.inside_sales || '',
    status: leadDocument.status || '',
    lost_reason: leadDocument.lost_reason || '',
    lead_relevance: leadDocument.lead_relevance || '',
    need_urgency: leadDocument.need_urgency || '',
    lead_size: leadDocument.lead_size || '',
    no_of_seats: leadDocument.no_of_seats ?? '',
    product: leadDocument.product || '',
    external_id: leadDocument.external_id || '',
    service_id: leadDocument.service_id || '',
    city: leadDocument.city || '',
    est_monthly_value: leadDocument.est_monthly_value || '',
    est_lifetime_value: leadDocument.est_lifetime_value || '',
    lead_source: leadDocument.lead_source || leadDocument.ci_source_name || '',
    campaign: leadDocument.campaign || '',
    source: leadDocument.source || '',
    source_type: leadDocument.source_type || '',
    medium: leadDocument.medium || '',
    term: leadDocument.term || '',
    content: leadDocument.content || '',
    tags: leadDocument.tags || '',
    _user_tags: leadDocument._user_tags || leadDocument.user_tags || '',
    /** DocType fields are utm_url / utm_content; *_pinakin are legacy payload aliases only. */
    utm_url: leadDocument.utm_url ?? leadDocument.utm_url_pinakin ?? '',
    utm_content: leadDocument.utm_content ?? leadDocument.utm_content_pinakin ?? '',
    gclid: leadDocument.gclid || '',
    ad_group: leadDocument.ad_group || '',
    landing_page_url: leadDocument.landing_page_url || '',
    contact_from_url: leadDocument.contact_from_url || '',
    contact_message: leadDocument.contact_message || '',
    // Prefer CRM fields; keep ci_* for older Community Inbound docs until fully backfilled.
    notes: leadDocument.notes || leadDocument.ci_raw_text || '',
    ci_score: leadDocument.ci_score ?? '',
    ci_action: leadDocument.ci_action || '',
    ci_contact_method: leadDocument.ci_contact_method || '',
    ci_source_name: leadDocument.ci_source_name || '',
    ci_raw_text: leadDocument.ci_raw_text || '',
    /** AI Signals (scraped) + legacy Community Inbound ci_* fallback. */
    is_devx: leadDocument.is_devx === 1 || leadDocument.is_devx === true,
    is_phi: leadDocument.is_phi === 1 || leadDocument.is_phi === true,
    workspace_requirement_type: leadDocument.workspace_requirement_type || '',
    expected_decision_timeline: leadDocument.expected_decision_timeline || '',
    source_id: leadDocument.source_id || '',
    info_date: leadDocument.info_date || '',
    info_termination_point: leadDocument.info_termination_point || '',
    info_call_status: leadDocument.info_call_status || '',
    city_from_delacon: leadDocument.city_from_delacon || '',
    adwords_info_conversions: leadDocument.adwords_info_conversions || '',
    adwords_info_cpc: leadDocument.adwords_info_cpc || '',
    adwords_info_cost: leadDocument.adwords_info_cost || '',
    info_caller: leadDocument.info_caller || '',
    adwords_info_clicks: leadDocument.adwords_info_clicks || '',
    call_recordings: leadDocument.call_recordings || '',
    landing_page_delacon: leadDocument.landing_page_delacon || '',
    web_info_page_called_from: leadDocument.web_info_page_called_from || '',
    web_info_search_engine: leadDocument.web_info_search_engine || '',
    web_info_search_type: leadDocument.web_info_search_type || '',
    inside_sales_fr_tat: leadDocument.inside_sales_fr_tat || '',
    sales_fr_tat: leadDocument.sales_fr_tat || '',
    agent_name: leadDocument.agent_name || '',
    agent_phone: leadDocument.agent_phone || '',
    call_start_time: leadDocument.call_start_time || '',
    call_end_time: leadDocument.call_end_time || '',
    ip_address: leadDocument.ip_address || '',
    tracking_number: leadDocument.tracking_number || '',
    true_pulse_data_bridge_id: leadDocument.true_pulse_data_bridge_id || '',
    service_name: leadDocument.service_name || '',
    call_type: leadDocument.call_type || '',
    call_duration: leadDocument.call_duration || '',
    page_called_from: leadDocument.page_called_from || '',
    referrer: leadDocument.referrer || '',
    device: leadDocument.device || '',
    browser: leadDocument.browser || '',
    call_flow: leadDocument.call_flow || '',
    stage_history: Array.isArray(leadDocument.stage_history) ? leadDocument.stage_history : [],
    contacts,
  };
}

/**
 * Update a CRM Lead (Frappe resource PUT).
 * @param {string} name – Lead name
 * @param {Object} payload – Field values to update
 * @returns {Promise<Object>}
 */
export async function updateCrmLead(name, payload) {
  if (!name) throw new Error('Lead name required');
  const encoded = encodeURIComponent(name);
  const { data } = await apiClient.put(`/resource/CRM Lead/${encoded}`, payload);
  return data?.data ?? data;
}

/**
 * Soft-delete a CRM Lead (sets is_deleted = 1, is_primary = 0).
 * @param {string} name – CRM Lead document id (e.g. CRM-LEAD-00007), same as in PUT /api/resource/CRM Lead/<id>
 * @returns {Promise<{ message: string }>}
 */
export async function deleteCrmLead(name) {
  if (!name) throw new Error('Lead document id is required (e.g. CRM-LEAD-00007)');
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.doctype.crm_lead.crm_lead.delete_crm_lead',
    { name },
  );
  return data?.message ?? data ?? {};
}

/** Frontend table/detail field name → Frappe CRM Lead field name */
export const CRM_LEAD_FIELD_TO_BACKEND = {
  name: 'lead_name',
  lead_name: 'lead_name',
  seats: 'no_of_seats',
  no_of_seats: 'no_of_seats',
  monthly_value: 'est_monthly_value',
  est_monthly_value: 'est_monthly_value',
  lost_cause: 'lost_reason',
  lost_reason: 'lost_reason',
};

/** Build single-field payload for lead update */
export function buildLeadFieldPayload(field, value) {
  const backendField = CRM_LEAD_FIELD_TO_BACKEND[field] || field;

  // Legacy Link field removed — use setCrmLeadPrimaryContact / contacts APIs instead
  if (backendField === 'contact') {
    return {};
  }

  if (backendField === 'tags') {
    const list = Array.isArray(value)
      ? value
          .map(String)
          .map((t) => t.trim())
          .filter(Boolean)
      : typeof value === 'string' && value.trim()
        ? (() => {
            try {
              const parsed = JSON.parse(value);
              return Array.isArray(parsed)
                ? parsed
                    .map(String)
                    .map((t) => t.trim())
                    .filter(Boolean)
                : [value.trim()];
            } catch {
              return value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
            }
          })()
        : [];
    return { tags: JSON.stringify(list) };
  }

  if (backendField === 'lead_name') {
    const trimmed = String(value ?? '').trim();
    return { lead_name: trimmed || '' };
  }

  if (backendField === 'no_of_seats') {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) return { no_of_seats: '' };
    const n = Number.parseInt(trimmed, 10);
    return { no_of_seats: Number.isNaN(n) ? '' : n };
  }

  if (backendField === 'est_monthly_value' || backendField === 'est_lifetime_value') {
    const trimmed = String(value ?? '').replaceAll(/[^\d.]/g, '');
    return { [backendField]: trimmed || '' };
  }

  const v = typeof value === 'string' ? value.trim() || undefined : value;
  if (v === undefined || v === null) return { [backendField]: '' };
  return { [backendField]: v };
}

/**
 * Fetch all CRM Lead link-field options in one call.
 * Used by create drawer, detail page, and filters.
 * @param {string} [stageStatus] – CRM Stage Status name. When set, lost_reason options are
 *   scoped to configured reasons for that status (drop/lost).
 * @param {string} [pipeline] – CRM Stages Pipeline document name; use with stageStatus for
 *   pipeline-scoped lost reasons, or alone for pipeline-scoped lead relevance, lead size, and product.
 * @returns {Promise<{ pipelines, lead_relevance, lead_size, need_urgency, info_call_status, lost_reason, lead_source, product }>}
 */
export async function getCrmLeadOptions(stageStatus, pipeline, leadOf) {
  const params = {};
  if (stageStatus != null && String(stageStatus).trim() !== '') {
    params.stage_status = String(stageStatus).trim();
  }
  if (pipeline != null && String(pipeline).trim() !== '') {
    params.pipeline = String(pipeline).trim();
  }
  if (leadOf != null && String(leadOf).trim() !== '') {
    params.lead_of = String(leadOf).trim();
  }
  const { data } = await apiClient.get('/method/devx.devx_crm.api.crm_lead.get_crm_lead_options', {
    params,
  });
  const result = data?.message ?? data ?? {};
  return {
    pipelines: Array.isArray(result.pipelines) ? result.pipelines : [],
    lead_of: Array.isArray(result.lead_of) ? result.lead_of : [],
    lead_relevance: Array.isArray(result.lead_relevance) ? result.lead_relevance : [],
    lead_size: Array.isArray(result.lead_size) ? result.lead_size : [],
    need_urgency: Array.isArray(result.need_urgency) ? result.need_urgency : [],
    info_call_status: Array.isArray(result.info_call_status) ? result.info_call_status : [],
    lost_reason: Array.isArray(result.lost_reason) ? result.lost_reason : [],
    lead_source: Array.isArray(result.lead_source) ? result.lead_source : [],
    product: Array.isArray(result.product) ? result.product : [],
  };
}

/**
 * Fetch CRM Lead Products for dropdown. Autoname is product field, so name = product value.
 * @deprecated Use getCrmLeadOptions().product instead
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function getCrmLeadProductList() {
  const options = await getCrmLeadOptions();
  return options.product;
}

/**
 * Fetch Sales Owner options: users with role "Sales". value = email, label = full_name.
 * @param {{ keyword?: string, pageSize?: number }} [opts]
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function getSalesOwnerList({ keyword, pageSize = 500 } = {}) {
  const params = { page_size: pageSize };
  const trimmedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
  if (trimmedKeyword) params.keyword = trimmedKeyword;

  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_options.get_sales_owner_list',
    { params },
  );
  const list = data?.message ?? data ?? [];
  return Array.isArray(list) ? list : [];
}

/**
 * Fetch Inside Sales options: users with role "Inside Sales". value = email, label = full_name.
 * @param {{ keyword?: string, pageSize?: number }} [opts]
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function getInsideSalesList({ keyword, pageSize = 500 } = {}) {
  const params = { page_size: pageSize };
  const trimmedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
  if (trimmedKeyword) params.keyword = trimmedKeyword;

  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_options.get_inside_sales_list',
    { params },
  );
  const list = data?.message ?? data ?? [];
  return Array.isArray(list) ? list : [];
}

/**
 * Fetch CRM Contacts for lead/account dropdowns.
 * value = name (id), label = full_name (first_name + last_name merged).
 * @param {{ keyword?: string, pageSize?: number }} [opts]
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function getCrmContactList({ keyword, pageSize = 500 } = {}) {
  const params = { page_size: pageSize };
  const trimmedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
  if (trimmedKeyword) params.keyword = trimmedKeyword;

  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_options.get_crm_contact_list',
    { params },
  );
  const list = data?.message ?? data ?? [];
  return Array.isArray(list) ? list : [];
}

/**
 * Normalize CP Contact / CP Account dropdown rows to `{ value, label }`.
 * Backend may return `name` instead of `value`.
 */
export function normalizeCpLinkOption(item) {
  if (!item || typeof item !== 'object') return null;
  const value = String(item.value ?? item.name ?? '').trim();
  if (!value) return null;
  const label = String(
    item.label ?? item.full_name ?? item.customer_name ?? item.name ?? value,
  ).trim();
  return { value, label: label || value };
}

export function normalizeCpContactOptions(list) {
  return (Array.isArray(list) ? list : []).map(normalizeCpLinkOption).filter(Boolean);
}

/**
 * CP Account options for CRM Lead/Account cp_account (non-disabled CP Account docs).
 * @param {{ keyword?: string, pageSize?: number }} [opts]
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function getCpAccountOptions({ keyword, pageSize = 500 } = {}) {
  const params = { page_size: pageSize };
  const trimmedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
  if (trimmedKeyword) params.keyword = trimmedKeyword;

  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_options.get_cp_account_options',
    { params },
  );
  const list = data?.message ?? data ?? [];
  return (Array.isArray(list) ? list : []).map(normalizeCpLinkOption).filter(Boolean);
}

/**
 * All CP Contact options when lead/account has no cp_account (same shape as getCrmContactList).
 * @param {{ keyword?: string, pageSize?: number }} [opts]
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function getCpContactLinkOptions({ keyword, pageSize = 500 } = {}) {
  const params = { page_size: pageSize };
  const trimmedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
  if (trimmedKeyword) params.keyword = trimmedKeyword;

  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_options.get_cp_contact_link_options',
    { params },
  );
  const list = data?.message ?? data ?? [];
  return normalizeCpContactOptions(list);
}

/**
 * CP Contacts for a single CP Account (cp_contact when cp_account is set).
 * @param {string} cpAccountName – CP Account document name
 * @param {{ keyword?: string, pageSize?: number }} [opts]
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function getCpContactsForCpAccount(cpAccountName, { keyword, pageSize = 500 } = {}) {
  if (!cpAccountName || !String(cpAccountName).trim()) return [];
  const params = {
    cp_account: String(cpAccountName).trim(),
    page_size: pageSize,
  };
  const trimmedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
  if (trimmedKeyword) params.keyword = trimmedKeyword;

  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_options.get_cp_contacts_for_cp_account',
    { params },
  );
  const list = data?.message ?? data ?? [];
  return normalizeCpContactOptions(list);
}

const CRM_STATUS_MASTER_API = '/method/devx.devx_crm.doctype.crm_status_master.crm_status_master';

/**
 * Fetch CRM stages and statuses from CRM Status Master.
 * Stages are lifecycle stages; each stage has statuses in sequence (by index).
 * @returns {Promise<{
 *   stages: Array<{ value: string, label: string }>,
 *   stageStatusMap: Record<string, Array<{ value: string, label: string, color?: string }>>,
 *   allStatuses: Array<{ value: string, label: string, color?: string }>,
 *   stageColorMap: Record<string, string>,
 *   statusColorMap: Record<string, string> – first-wins across stages: if the same
 *     status id appears under multiple stages with different colors, the first
 *     non-empty color is kept. Prefer stage-scoped `stageStatusMap[stage].color`
 *     or the row’s own color when available.
 * }>}
 * @param {string} [pipeline] – CRM Stages Pipeline document name; when set, only stages in that pipeline are returned.
 */
export async function getCrmStages(pipeline) {
  const params = {};
  if (pipeline != null && String(pipeline).trim() !== '') {
    params.pipeline = String(pipeline).trim();
  }
  const { data } = await apiClient.get(`${CRM_STATUS_MASTER_API}.get_crm_stages`, { params });
  const raw = data?.message ?? data ?? [];
  const list = Array.isArray(raw) ? raw : [];

  const stages = [];
  const stageStatusMap = {};
  const allStatusesSeen = new Set();
  const allStatuses = [];
  const stageColorMap = {};
  const statusColorMap = {};

  list
    .sort((a, b) => (Number(a.stage_index) || 0) - (Number(b.stage_index) || 0))
    .forEach((stageDocument) => {
      const stageName = (stageDocument.stage || '').trim();
      const masterName = (stageDocument.name || '').trim();
      if (!stageName || !masterName) return;

      stages.push({ value: masterName, label: stageName });
      stageColorMap[masterName] = stageDocument.color || '';

      const rawStatuses = Array.isArray(stageDocument.crm_stage_status)
        ? [...stageDocument.crm_stage_status]
        : [];
      rawStatuses.sort((a, b) => (Number(a?.index) || 0) - (Number(b?.index) || 0));

      const statuses = rawStatuses.map((row) => {
        const statusLabel = (row?.status || '').trim();
        const linkName = (row?.name || '').trim();
        const statusColor = (row?.color || '').trim();
        const value = linkName || statusLabel;
        if (value && statusColor && !statusColorMap[value]) {
          statusColorMap[value] = statusColor;
        }
        return {
          value,
          label: statusLabel || linkName,
          color: statusColor,
        };
      });
      stageStatusMap[masterName] = statuses;

      statuses.forEach(({ value, label, color }) => {
        if (value && !allStatusesSeen.has(value)) {
          allStatusesSeen.add(value);
          allStatuses.push({ value, label: label || value, color: color || '' });
        }
      });
    });

  return { stages, stageStatusMap, allStatuses, stageColorMap, statusColorMap };
}

/**
 * Contact ids linked to a CRM Lead (child table + primary contact).
 * @param {string} leadName
 * @returns {Promise<{ contact_ids: string[], primary_contact: string|null }>}
 */
export async function getCrmLeadContacts(leadName) {
  if (!leadName) return { contact_ids: [], primary_contact: null };
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.doctype.crm_lead.crm_lead.get_crm_lead_contacts',
    { params: { lead_name: leadName } },
  );
  const result = data?.message ?? data ?? {};
  return {
    contact_ids: Array.isArray(result.contact_ids) ? result.contact_ids : [],
    primary_contact: result.primary_contact ?? null,
  };
}

/**
 * Link an existing CRM Contact to a CRM Lead (must belong to lead account).
 * @param {string} leadName
 * @param {string} contactId
 * @param {{ setAsPrimary?: boolean }} [opts]
 */
export async function addCrmLeadContact(leadName, contactId, { setAsPrimary = false } = {}) {
  if (!leadName) throw new Error('Lead name required');
  if (!contactId) throw new Error('Contact required');
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.doctype.crm_lead.crm_lead.add_crm_lead_contact',
    {
      lead_name: leadName,
      contact: contactId,
      set_as_primary: setAsPrimary ? 1 : 0,
    },
  );
  return data?.message ?? data;
}

/**
 * Unlink a CRM Contact from a CRM Lead.
 * @param {string} leadName
 * @param {string} contactId
 */
export async function removeCrmLeadContact(leadName, contactId) {
  if (!leadName) throw new Error('Lead name required');
  if (!contactId) throw new Error('Contact required');
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.doctype.crm_lead.crm_lead.remove_crm_lead_contact',
    {
      lead_name: leadName,
      contact: contactId,
    },
  );
  return data?.message ?? data;
}

/**
 * Set or clear the primary contact on a CRM Lead (contacts child table).
 * @param {string} leadName
 * @param {string} contactId – empty string clears primary
 */
export async function setCrmLeadPrimaryContact(leadName, contactId = '') {
  if (!leadName) throw new Error('Lead name required');
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.doctype.crm_lead.crm_lead.set_crm_lead_primary_contact',
    {
      lead_name: leadName,
      contact: contactId || '',
    },
  );
  return data?.message ?? data;
}

/**
 * Collect linked contact ids from a normalized lead document.
 * @param {Object} lead
 * @returns {string[]}
 */
export function getLeadLinkedContactIds(lead) {
  const ids = [];
  const rows = Array.isArray(lead?.contacts) ? lead.contacts : [];
  for (const row of rows) {
    const id = String(row?.contact || '').trim();
    if (id && !ids.includes(id)) ids.push(id);
  }
  const primary = String(lead?.contact || '').trim();
  if (primary && !ids.includes(primary)) ids.unshift(primary);
  return ids;
}
