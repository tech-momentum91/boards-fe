import apiClient from '@/api/axios';

/**
 * Unified edit-comment endpoint. Works for every module's comment doctype
 * (HD Ticket Comment, OPEX comment, Booking comment, CRM Account Activity,
 * Broker Lead Comment, etc.) via a single backend registry.
 */
const EDIT_COMMENT_API = '/method/devx.api.comment.edit_comment';

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
    throw new Error(extractServerMessage(result) || 'Failed to edit comment.');
  }
};

/**
 * Edit a comment in any module via the unified backend endpoint.
 *
 * @param {object} params
 * @param {string} params.commentDoctype - the comment's doctype, e.g. 'HD Ticket Comment',
 *   'CRM Account Activity', 'Broker Lead Comment'. (Sent as `comment_doctype`.)
 * @param {string} params.commentId - the comment document name. (Sent as `comment_id`.)
 * @param {string} params.content - the new comment body (HTML).
 * @param {Array<File|{file: File}>} [params.files] - optional new attachments.
 * @returns {Promise<object>} normalized comment ({ name, doctype, content, commented_by, creation, edited, files }).
 */
export async function editComment({ commentDoctype, commentId, content, files = [], reactions }) {
  if (!commentDoctype) throw new Error('Comment doctype is required.');
  if (!commentId) throw new Error('Comment id is required.');

  const fileList = (Array.isArray(files) ? files : [])
    .map((f) => f?.file ?? f)
    .filter((f) => f instanceof File);

  let payload;
  if (fileList.length > 0) {
    const formData = new FormData();
    formData.append('comment_doctype', String(commentDoctype));
    formData.append('comment_id', String(commentId));
    formData.append('content', content ?? '');
    if (reactions !== undefined) {
      formData.append('reactions', JSON.stringify(reactions));
    }
    fileList.forEach((file) => formData.append('files[]', file));
    payload = formData;
  } else {
    payload = {
      comment_doctype: String(commentDoctype),
      comment_id: String(commentId),
      content: content ?? '',
    };
    if (reactions !== undefined) {
      payload.reactions = reactions;
    }
  }

  const response = await apiClient.post(EDIT_COMMENT_API, payload);
  assertNoExc(response?.data);
  return response?.data?.message ?? response?.data;
}

export async function fetchCommentReactions(commentDoctype, commentNames) {
  if (!commentDoctype) throw new Error('Comment doctype is required.');
  if (!commentNames || !Array.isArray(commentNames))
    throw new Error('Comment names array is required.');

  const response = await apiClient.post('/method/devx.api.comment.fetch_comment_reactions', {
    comment_doctype: String(commentDoctype),
    comment_names: commentNames,
  });

  return response?.data?.message ?? response?.data;
}
