/** Base route + section prefixes for Knowledge Center (landing vs future Case Studies, Media, etc.). */

export const KNOWLEDGE_CENTER_ROOT = '/settings/knowledge-center';

export const KNOWLEDGE_CENTER_QA = `${KNOWLEDGE_CENTER_ROOT}/QA`;

export const KNOWLEDGE_CENTER_MEDIA = `${KNOWLEDGE_CENTER_ROOT}/media`;

export const KNOWLEDGE_CENTER_CASE_STUDIES = `${KNOWLEDGE_CENTER_ROOT}/case-studies`;

export const KNOWLEDGE_CENTER_CALL_RECORDINGS = `${KNOWLEDGE_CENTER_ROOT}/call-recordings`;

/** Create flow (`/settings/knowledge-center/QA/new`). */
export const KNOWLEDGE_CENTER_QA_NEW = `${KNOWLEDGE_CENTER_QA}/new`;

export function knowledgeCenterQaDetailPath(recordName) {
  return `${KNOWLEDGE_CENTER_QA}/${encodeURIComponent(recordName)}`;
}

export function knowledgeCenterCaseStudyDetailPath(recordName) {
  return `${KNOWLEDGE_CENTER_CASE_STUDIES}/${encodeURIComponent(recordName)}`;
}
