import apiClient from '@/api/axios';
import { createRequestCache } from '@/utils/request-cache';

const BASE = '/method/devx.api.document_subscribe';
const statusCache = createRequestCache();
const subscribersCache = createRequestCache();

const keyOf = (doctype, name) => `${doctype || ''}::${name || ''}`;

export function invalidateDocumentSubscribeCaches(doctype, name) {
  if (!doctype && !name) {
    statusCache.clear();
    subscribersCache.clear();
    return;
  }
  const key = keyOf(doctype, name);
  statusCache.deleteKey(key);
  subscribersCache.deleteKey(key);
}

export async function getSubscriptionStatus(
  referenceDoctype,
  referenceName,
  { force = false } = {},
) {
  const key = keyOf(referenceDoctype, referenceName);
  if (key === '::') return { subscribed: 0 };

  return statusCache.run(
    key,
    async () => {
      const { data } = await apiClient.post(`${BASE}.get_subscription_status`, {
        reference_doctype: referenceDoctype,
        reference_name: referenceName,
      });
      return data?.message ?? { subscribed: 0 };
    },
    { force },
  );
}

export async function listDocumentSubscribers(
  referenceDoctype,
  referenceName,
  { force = false } = {},
) {
  const key = keyOf(referenceDoctype, referenceName);
  if (key === '::') return [];

  return subscribersCache.run(
    key,
    async () => {
      const { data } = await apiClient.post(`${BASE}.list_document_subscribers`, {
        reference_doctype: referenceDoctype,
        reference_name: referenceName,
      });
      return data?.message ?? [];
    },
    { force },
  );
}

export async function addDocumentSubscriber(referenceDoctype, referenceName, user) {
  const { data } = await apiClient.post(`${BASE}.add_document_subscriber`, {
    reference_doctype: referenceDoctype,
    reference_name: referenceName,
    user: user ?? 'self',
  });
  invalidateDocumentSubscribeCaches(referenceDoctype, referenceName);
  return data?.message ?? {};
}

export async function removeDocumentSubscriber(referenceDoctype, referenceName, user) {
  const { data } = await apiClient.post(`${BASE}.remove_document_subscriber`, {
    reference_doctype: referenceDoctype,
    reference_name: referenceName,
    user: user ?? 'self',
  });
  invalidateDocumentSubscribeCaches(referenceDoctype, referenceName);
  return data?.message ?? {};
}
