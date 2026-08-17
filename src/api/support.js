import apiClient from '@/api/axios';

const CREATE_SUPPORT_WITH_FILES_API =
  '/method/devx.user_support.api.api_user_support.create_support_with_files';
const GET_SUPPORT_LISTVIEW_API =
  '/method/devx.user_support.api.api_user_support.get_support_listview';
const GET_SUPPORT_DETAIL_API = '/method/devx.user_support.api.api_user_support.get_support_detail';
const UPVOTE_SUPPORT_API = '/method/devx.user_support.api.api_user_support.upvote';
const GET_SUPPORT_COMMENTS_API = '/method/devx.user_support.api.api_comments.get_support_comments';
const ADD_SUPPORT_COMMENT_WITH_FILES_API =
  '/method/devx.user_support.api.api_comments.add_support_comment_with_files';
const EDIT_SUPPORT_COMMENT_WITH_FILES_API =
  '/method/devx.user_support.api.api_comments.edit_support_comment_with_files';
const DELETE_SUPPORT_COMMENT_ATTACHMENT_API =
  '/method/devx.user_support.api.api_comments.delete_support_comment_attachment';

const extractServerMessage = (result) => {
  if (!result?._server_messages) return result?.message;
  try {
    const parsed = JSON.parse(result._server_messages);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[parsed.length - 1];
    }
    return result?.message;
  } catch {
    return result?.message;
  }
};

const assertNoExc = (result) => {
  if (result?.exc_type) {
    throw new Error(extractServerMessage(result) || 'Request failed.');
  }
};

/**
 * Listview filters for `get_support_listview`: array of [field, operator, value] tuples.
 * Example: [["custom_module","in",["Vendors","Clients"]],["status","in",["Under Review","Accepted"]]]
 *
 * @param {{ module?: string[], status?: string[] }} listFilters - UI filter state (multi-select).
 * @returns {Array<[string, string, string[]]>}
 */
export function buildSupportIssuesListviewFilters(listFilters = {}) {
  const module = Array.isArray(listFilters.module) ? listFilters.module : [];
  const status = Array.isArray(listFilters.status) ? listFilters.status : [];
  const tuples = [];
  if (module.length > 0) {
    tuples.push(['modules', 'in', [...module]]);
  }
  if (status.length > 0) {
    tuples.push(['status', 'in', [...status]]);
  }
  return tuples;
}

/**
 * Sort mode for `get_support_listview` JSON body field **`order_by`**.
 * Maps to:
 * - **Latest Created** → `creation asc` | `creation desc`
 * - **Most Upvoted** → `upvote_count asc` | `upvote_count desc`
 */
export const SUPPORT_LISTVIEW_SORT_MODE = {
  LATEST_CREATED: 'created',
  MOST_UPVOTED: 'upvotes',
};

/**
 * Builds the `order_by` string for {@link getSupportIssuesListview}.
 *
 * @param {string} sortMode - {@link SUPPORT_LISTVIEW_SORT_MODE} value
 * @param {'asc' | 'desc'} direction
 * @returns {string} e.g. `creation desc`, `upvote_count asc`
 */
export function buildSupportListviewOrderBy(sortMode, direction) {
  const dir = direction === 'asc' ? 'asc' : 'desc';
  if (sortMode === SUPPORT_LISTVIEW_SORT_MODE.MOST_UPVOTED) {
    return `upvote_count ${dir}`;
  }
  return `creation ${dir}`;
}

/**
 * @param {{ subject: string, description: string, type: string, module: string[], files?: File[] }} params
 * `type` is API value: `Bug` or `Feature`. `module` is sent as a JSON array in the `module` field.
 */
export async function createSupportIssueWithFiles({
  subject,
  description,
  type,
  module: moduleList = [],
  files = [],
}) {
  const modules = Array.isArray(moduleList) ? moduleList : [];
  const formData = new FormData();
  formData.append('subject', subject ?? '');
  formData.append('description', description ?? '');
  formData.append('type', type ?? '');
  formData.append('modules', JSON.stringify(modules));

  if (Array.isArray(files) && files.length > 0) {
    files.forEach((file) => {
      if (file instanceof File) {
        formData.append('files', file);
      }
    });
  }

  const response = await apiClient.post(CREATE_SUPPORT_WITH_FILES_API, formData);
  const result = response?.data;
  assertNoExc(result);

  return result?.message;
}

/**
 * Support issue list (`get_support_listview`). Sends **`order_by`** in the POST body (see {@link buildSupportListviewOrderBy}).
 *
 * @param {string} [orderBy] - Default `creation desc`.
 */
export async function getSupportIssuesListview({
  keyword = '',
  tab = 'Bug',
  /** @type {Array<[string, string, unknown]>|Record<string, unknown>} */
  filters = [],
  page = 1,
  limitPageLength = 20,
  orderBy = 'creation desc',
}) {
  const payload = {
    keyword,
    tab,
    filters,
    page,
    limit_page_length: limitPageLength,
    order_by: orderBy,
  };

  const response = await apiClient.post(GET_SUPPORT_LISTVIEW_API, payload);
  const result = response?.data;
  assertNoExc(result);

  // Frappe-style `{ message: { ... } }`, or listview payload may be the whole body.
  const rawPayload =
    result?.message && typeof result.message === 'object' ? result.message : result;
  const data = normalizeSupportIssuesListviewPayload(rawPayload, limitPageLength, page);

  return {
    total: data.total,
    page: data.page,
    limit: data.limit,
    pages: data.pages,
    results: data.results,
  };
}

/**
 * Backend may return listview data as `message` directly, or nested under `message.data`.
 * Field names vary: `total_count` / `total`, `total_pages` / `pages`, `page_size` / `limit`.
 */
function normalizeSupportIssuesListviewPayload(message, fallbackLimit, fallbackPage) {
  const empty = {
    total: 0,
    page: fallbackPage,
    limit: fallbackLimit,
    pages: 1,
    results: [],
  };

  if (!message || typeof message !== 'object') {
    return empty;
  }

  let data = null;
  if (Array.isArray(message.results)) {
    data = message;
  } else if (
    message.data &&
    typeof message.data === 'object' &&
    Array.isArray(message.data.results)
  ) {
    const { data: nested } = message;
    data = nested;
  }

  if (!data) {
    return empty;
  }

  const results = Array.isArray(data.results) ? data.results : [];
  const total = Number(data.total_count ?? data.total ?? 0);
  const page = Number(data.page ?? fallbackPage) || fallbackPage;
  const limit = Number(data.page_size ?? data.limit ?? fallbackLimit) || fallbackLimit;
  const pages = Number(data.total_pages ?? data.pages ?? 1) || 1;

  return {
    total: Number.isFinite(total) ? total : 0,
    page,
    limit,
    pages: Number.isFinite(pages) && pages > 0 ? pages : 1,
    results,
  };
}

export const getAbsoluteFileUrl = (filePath) => {
  const normalizedPath = String(filePath ?? '').trim();
  if (!normalizedPath) return '';
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
  const apiBaseUrl = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
};

const getFileNameFromPath = (filePath) => {
  const normalizedPath = String(filePath ?? '').trim();
  if (!normalizedPath) return 'Attachment';
  const lastSegment = normalizedPath.split('/').findLast(Boolean);
  return lastSegment || 'Attachment';
};

/** Normalize API workflow status to UI option values. */
export function mapApiSupportStatusToUi(raw) {
  return String(raw ?? '').trim();
}

/** Map API `type` / legacy `issue_type` to UI (`Bug` | `Feature`). */
export function mapApiSupportTypeToUiFilter(row) {
  const raw = row?.type ?? row?.issue_type;
  const t = String(raw ?? '').trim();
  const lower = t.toLowerCase();
  if (lower === 'feature' || t === 'Feature' || t === 'Product Features') return 'Feature';
  return 'Bug';
}

export function mapSupportIssueDetailMessage(msg) {
  if (!msg) return null;
  const attachments = Array.isArray(msg.attachments) ? msg.attachments : [];
  let modules = [];
  if (Array.isArray(msg.modules)) {
    modules = msg.modules;
  } else if (msg.module != null && msg.module !== '') {
    modules = [String(msg.module)];
  }
  const moduleLabel = modules.length > 0 ? modules.join(', ') : '—';
  return {
    id: msg.id,
    title: msg.subject || 'Untitled issue',
    description: msg.description || '',
    status: mapApiSupportStatusToUi(msg.status ?? 'Under Review'),
    priority: msg.priority ?? null,
    modules,
    module: moduleLabel,
    type: mapApiSupportTypeToUiFilter(msg),
    email: msg.raised_by || '',
    raisedByName: msg.raised_by_name || 'Unknown',
    upvoteCount: msg.upvote_count ?? 0,
    userUpvoted: Boolean(msg.user_upvoted),
    createdAt: msg.created_at || '',
    modifiedAt: msg.modified_at || '',
    commentCount: msg.comment_count ?? 0,
    photos: attachments.map((row, index) => {
      const path = row?.url || '';
      return {
        id: path || index,
        name: getFileNameFromPath(path),
        url: getAbsoluteFileUrl(path),
      };
    }),
  };
}

/**
 * Issue detail for Support drawer (method API).
 */
export async function getSupportIssueDetail(issueId) {
  const normalizedId = String(issueId ?? '').trim();
  if (!normalizedId) {
    throw new Error('Support id is required.');
  }

  const response = await apiClient.post(GET_SUPPORT_DETAIL_API, {
    support_id: normalizedId,
  });
  const result = response?.data;
  assertNoExc(result);

  const msg = result?.message;
  const mapped = mapSupportIssueDetailMessage(msg);
  if (!mapped) {
    throw new Error('Issue details not found.');
  }
  return mapped;
}

export async function updateSupportIssueStatus(issueId, status) {
  const normalizedId = String(issueId ?? '').trim();
  if (!normalizedId) {
    throw new Error('Issue id is required.');
  }

  const normalizedStatus = String(status ?? '').trim();
  if (!normalizedStatus) {
    throw new Error('Status is required.');
  }

  const response = await apiClient.put(
    `/resource/User Support/${encodeURIComponent(normalizedId)}`,
    {
      status: normalizedStatus,
    },
  );
  const result = response?.data;

  assertNoExc(result);

  return result?.data || result?.message || {};
}

/**
 * Updates issue type on `User Support` (PUT). Body: `{ type: "Bug" | "Feature" }`.
 */
export async function updateSupportIssueType(issueId, typeUi) {
  const normalizedId = String(issueId ?? '').trim();
  if (!normalizedId) {
    throw new Error('Support id is required.');
  }

  const lower = String(typeUi ?? '')
    .trim()
    .toLowerCase();
  let apiType;
  if (lower === 'bug') apiType = 'Bug';
  else if (lower === 'feature') apiType = 'Feature';
  else throw new Error('Type must be Bug or Feature.');

  const response = await apiClient.put(
    `/resource/User Support/${encodeURIComponent(normalizedId)}`,
    {
      type: apiType,
    },
  );
  const result = response?.data;

  assertNoExc(result);

  return result?.data || result?.message || {};
}

/**
 * Delete support issue by id.
 * @param {string} issueId
 */
export async function deleteSupportIssue(issueId) {
  const normalizedId = String(issueId ?? '').trim();
  if (!normalizedId) {
    throw new Error('Support id is required.');
  }

  const response = await apiClient.delete(
    `/resource/User Support/${encodeURIComponent(normalizedId)}`,
  );
  const result = response?.data;
  assertNoExc(result);
  return result?.data || result?.message || {};
}

/**
 * Set whether the current user has upvoted this issue.
 * @param {string} issueId
 * @param {boolean} upvote - true to upvote, false to remove upvote
 */
export async function upvoteIssue(issueId, upvote) {
  const normalizedId = String(issueId ?? '').trim();
  if (!normalizedId) throw new Error('Support id is required.');

  const response = await apiClient.post(UPVOTE_SUPPORT_API, {
    support_id: normalizedId,
    upvote: Boolean(upvote),
  });
  assertNoExc(response?.data);
  return response?.data?.message ?? response?.data?.data;
}

const NESTED_COMMENT_KEYS = [
  'replies',
  'children',
  'child_comments',
  'nested_comments',
  'sub_comments',
];

/** Pull comment rows from varied API envelopes (`message`, `message.comments`, `data`, etc.). */
function extractSupportCommentsPayload(result) {
  if (!result) return [];
  const msg = result.message;
  if (Array.isArray(msg)) return msg;
  if (msg && typeof msg === 'object') {
    if (Array.isArray(msg.comments)) return msg.comments;
    if (Array.isArray(msg.data)) return msg.data;
    if (Array.isArray(msg.records)) return msg.records;
    if (Array.isArray(msg.items)) return msg.items;
    if (Array.isArray(msg.results)) return msg.results;
  }
  if (Array.isArray(result.data)) return result.data;
  if (result.data && typeof result.data === 'object' && Array.isArray(result.data.comments)) {
    return result.data.comments;
  }
  return [];
}

/** Flatten tree-shaped responses (parent rows with `replies` / `children` arrays). */
function flattenNestedSupportComments(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const out = [];

  const visit = (node, parentId) => {
    if (node == null) return;
    if (Array.isArray(node)) {
      node.forEach((n) => visit(n, parentId));
      return;
    }
    if (typeof node !== 'object') return;

    const next = { ...node };
    let childList = [];
    for (const key of NESTED_COMMENT_KEYS) {
      if (Array.isArray(next[key])) {
        childList = next[key];
        delete next[key];
        break;
      }
    }

    const selfId = next.name ?? next.comment_name ?? next.id ?? next.comment_id;
    if (parentId && (next.parent_comment == null || next.parent_comment === '')) {
      next.parent_comment = parentId;
    }

    out.push(next);
    const pidForChildren = selfId || parentId;
    if (childList.length > 0 && pidForChildren) {
      childList.forEach((ch) => visit(ch, pidForChildren));
    } else if (childList.length > 0) {
      childList.forEach((ch) => visit(ch, null));
    }
  };

  rows.forEach((r) => visit(r, null));
  return out;
}

function normalizeIssueParentRef(ref) {
  if (ref == null || ref === '') return null;
  if (typeof ref === 'object') {
    return ref.name ?? ref.comment_name ?? ref.id ?? ref.comment_id ?? null;
  }
  return String(ref);
}

function mapIssueCommentAttachment(a) {
  if (!a || typeof a !== 'object') return null;
  const url = a.file_url ?? a.url ?? a.fileUrl ?? '';
  const id = a.name ?? a.id ?? a.file_id ?? '';
  return {
    name: a.file_name ?? a.filename ?? a.name ?? 'Attachment',
    file_name: a.file_name ?? a.filename ?? a.name ?? '',
    file_url: getAbsoluteFileUrl(url),
    ...(id ? { id: String(id) } : {}),
  };
}

function mapIssueCommentRow(row) {
  if (!row || typeof row !== 'object') return null;
  const name = row.name ?? row.comment_name ?? row.id ?? row.comment_id;
  if (!name) return null;

  const rawParent = row.parent_comment ?? row.parent ?? row.parent_id ?? row.parent_comment_id;
  const parentId = normalizeIssueParentRef(rawParent);

  let rawAttachments = [];
  if (Array.isArray(row.attachments)) rawAttachments = row.attachments;
  else if (Array.isArray(row.files)) rawAttachments = row.files;

  const user = typeof row.user === 'object' && row.user !== null ? { ...row.user } : {};
  if (!user.name) {
    if (row.full_name) user.name = row.full_name;
    else if (row.owner_name) user.name = row.owner_name;
  }

  const commentedBy =
    row.commented_by ??
    row.comment_by ??
    row.owner ??
    row.owner_email ??
    row.email ??
    (typeof row.user === 'string' ? row.user : '') ??
    user.email ??
    '';

  if (!user.name && commentedBy) user.name = commentedBy;

  const creation =
    row.creation ?? row.created_at ?? row.modified ?? row.creation_time ?? row.timestamp ?? '';

  return {
    name,
    id: name,
    comment_doctype: row.comment_doctype ?? row.doctype ?? 'Support Comment',
    content: row.content ?? row.comment ?? row.text ?? '',
    creation,
    is_pinned: row.is_pinned ?? row.pinned ?? 0,
    parent_comment: parentId,
    commented_by: commentedBy,
    user: Object.keys(user).length > 0 ? user : row.user,
    custom_visible_to_client: row.custom_visible_to_client,
    attachments: rawAttachments.map(mapIssueCommentAttachment).filter(Boolean),
  };
}

/**
 * Attach full parent comment objects for reply rows so `CommentItem` can render quoted previews.
 */
function hydrateSupportCommentParents(comments) {
  const byKey = new Map();
  for (const c of comments) {
    if (c?.name) byKey.set(String(c.name), c);
    if (c?.id && String(c.id) !== String(c.name)) byKey.set(String(c.id), c);
  }

  return comments.map((c) => {
    const pid = c.parent_comment;
    if (pid == null || pid === '') {
      return { ...c, custom_parent_comment: false };
    }
    if (typeof pid === 'object') {
      return { ...c, custom_parent_comment: false };
    }
    const parent = byKey.get(String(pid));
    if (!parent) {
      return { ...c, custom_parent_comment: false };
    }
    const parentForPreview = {
      ...parent,
      custom_parent_comment: null,
      parent_comment: null,
    };
    return {
      ...c,
      parent_comment: parentForPreview,
      custom_parent_comment: true,
    };
  });
}

export async function getIssueCommentsMapped(issueId) {
  const normalizedId = String(issueId ?? '').trim();
  if (!normalizedId) throw new Error('Support id is required.');

  const response = await apiClient.get(GET_SUPPORT_COMMENTS_API, {
    params: { support_id: normalizedId },
  });
  const result = response?.data;
  assertNoExc(result);

  const rawList = extractSupportCommentsPayload(result);
  const flatRows = flattenNestedSupportComments(rawList);
  const mapped = flatRows.map(mapIssueCommentRow).filter(Boolean);
  const hydrated = hydrateSupportCommentParents(mapped);
  return hydrated.sort((a, b) => {
    const ta = new Date(a.creation || 0).getTime();
    const tb = new Date(b.creation || 0).getTime();
    return ta - tb;
  });
}

export async function addIssueCommentWithFiles({
  support_id,
  issue_id,
  content,
  parent_comment = null,
  files = [],
}) {
  const id = support_id ?? issue_id;
  const formData = new FormData();
  formData.append('support_id', String(id ?? ''));
  formData.append('content', content ?? '');
  if (parent_comment) {
    formData.append('parent_comment', String(parent_comment));
  }
  const list = Array.isArray(files) ? files : [];
  list.forEach((entry) => {
    const file = entry?.file ?? entry;
    if (file instanceof File) {
      formData.append('files', file);
    }
  });

  const response = await apiClient.post(ADD_SUPPORT_COMMENT_WITH_FILES_API, formData);
  assertNoExc(response?.data);
  return response?.data?.message;
}

export async function editIssueCommentWithFiles({ comment_name, content, files = [] }) {
  const formData = new FormData();
  formData.append('comment_name', String(comment_name ?? ''));
  formData.append('content', content ?? '');
  const list = Array.isArray(files) ? files : [];
  list.forEach((f) => {
    if (f instanceof File) {
      formData.append('files', f);
    }
  });

  const response = await apiClient.post(EDIT_SUPPORT_COMMENT_WITH_FILES_API, formData);
  assertNoExc(response?.data);
  return response?.data?.message;
}

export async function deleteIssueCommentAttachment(fileId) {
  const id = String(fileId ?? '').trim();
  if (!id) throw new Error('File id is required.');

  const response = await apiClient.post(DELETE_SUPPORT_COMMENT_ATTACHMENT_API, { file_id: id });
  assertNoExc(response?.data);
  return response?.data?.message;
}
