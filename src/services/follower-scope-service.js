import apiClient from '@/api/axios';
import { invalidateDocumentSubscribeCaches } from '@/services/document-subscribe-service';
import { createRequestCache } from '@/utils/request-cache';

const BASE = '/method/devx.api.follower_scope';
const PANEL_DEBOUNCE_MS = 300;

const assigneeCache = createRequestCache();
const panelCache = createRequestCache();
const roleOptionsCache = createRequestCache();
const pendingSiblingRefresh = new Map();

export const PROJECT_FOLLOWERS_CHANGED_EVENT = 'devx:project-followers-changed';

const panelKey = (project, section = '') => `${project || ''}::${section || ''}`;

function mapUser(user, fallbackRole = null) {
  return {
    label: user.label || user.full_name || user.email || user.value,
    value: user.value || user.user || user.email,
    email: user.email || user.value,
    name: user.name || user.value,
    full_name: user.full_name || user.label,
    image: user.image || user.avatar || user.user_image || null,
    user_role: user.user_role || user.role || fallbackRole,
    roles: user.roles || (user.role ? [user.role] : fallbackRole ? [fallbackRole] : []),
  };
}

export function emitProjectFollowersChanged(detail) {
  const projectId = String(detail?.projectId || '').trim();
  if (!projectId || typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(PROJECT_FOLLOWERS_CHANGED_EVENT, { detail: { ...detail, projectId } }),
  );
}

export function invalidateProjectFollowerCaches(project = null) {
  const projectId = String(project || '').trim();
  if (!projectId) {
    assigneeCache.clear();
    panelCache.clear();
    return;
  }
  assigneeCache.deleteKey(projectId);
  panelCache.invalidate((key) => key.startsWith(`${projectId}::`));
}

function commitPanel(project, section, panel) {
  const projectId = String(project || '').trim();
  const sectionKey = String(section || '');
  if (!projectId || !panel) return panel;

  panelCache.seed(panelKey(projectId, sectionKey), panel);
  if (Array.isArray(panel.assignee_options)) {
    assigneeCache.seed(
      projectId,
      panel.assignee_options.map((u) => mapUser(u)),
    );
  }
  // Sibling badges (header vs tab) need a fresh fetch; keep this section warm.
  panelCache.invalidate(
    (key) => key.startsWith(`${projectId}::`) && key !== panelKey(projectId, sectionKey),
  );
  // Role/custom follower changes fan out to leaf Document Subscribe rows.
  invalidateDocumentSubscribeCaches();
  emitProjectFollowersChanged({
    projectId,
    section: sectionKey,
    panel,
    source: 'mutation',
  });
  return panel;
}

/** Debounce sibling section badge refreshes after another section mutates. */
export function scheduleFollowerPanelRefresh(project, section = '') {
  const projectId = String(project || '').trim();
  if (!projectId) return;

  const key = panelKey(projectId, section);
  clearTimeout(pendingSiblingRefresh.get(key));
  pendingSiblingRefresh.set(
    key,
    setTimeout(async () => {
      pendingSiblingRefresh.delete(key);
      panelCache.deleteKey(key);
      try {
        const panel = await getProjectFollowerPanel(projectId, section, { force: true });
        emitProjectFollowersChanged({
          projectId,
          section: String(section || ''),
          panel,
          source: 'refresh',
        });
      } catch {
        // Keep key invalidated so the next open cannot serve TTL-stale data.
        panelCache.deleteKey(key);
      }
    }, PANEL_DEBOUNCE_MS),
  );
}

export async function getProjectAssigneeOptions(project) {
  const projectId = String(project || '').trim();
  if (!projectId) return [];

  return assigneeCache.run(projectId, async () => {
    const { data } = await apiClient.post(`${BASE}.get_project_assignee_options_api`, {
      project: projectId,
    });
    return (Array.isArray(data?.message) ? data.message : []).map((u) => mapUser(u));
  });
}

export async function getProjectRoleMemberOptions() {
  return roleOptionsCache.run('all', async () => {
    const { data } = await apiClient.post(`${BASE}.get_project_role_member_options_api`, {});
    const roles = data?.message?.roles ?? data?.roles ?? {};
    const mapped = {};
    Object.entries(roles).forEach(([role, users]) => {
      mapped[role] = (Array.isArray(users) ? users : []).map((u) => mapUser(u, role));
    });
    return mapped;
  });
}

export async function getProjectFollowerPanel(project, section = '', { force = false } = {}) {
  const projectId = String(project || '').trim();
  if (!projectId) return { roles: [], custom_followers: [], assignee_options: [] };

  const sectionKey = String(section || '');
  return panelCache.run(
    panelKey(projectId, sectionKey),
    async () => {
      const { data } = await apiClient.post(`${BASE}.get_project_follower_panel`, {
        project: projectId,
        section: sectionKey,
      });
      return data?.message ?? { roles: [], custom_followers: [], assignee_options: [] };
    },
    { force },
  );
}

async function mutatePanel(method, { project, section, ...body }) {
  const { data } = await apiClient.post(`${BASE}.${method}`, {
    project,
    section: section || '',
    ...body,
  });
  return commitPanel(project, section, data?.message ?? {});
}

export function toggleProjectRoleFollower(project, section, role, enabled) {
  return mutatePanel('toggle_project_role_follower', {
    project,
    section,
    role,
    enabled: enabled ? 1 : 0,
  });
}

export function addProjectCustomFollower(project, section, user) {
  return mutatePanel('add_project_custom_follower', { project, section, user });
}

export function removeProjectCustomFollower(project, section, user) {
  return mutatePanel('remove_project_custom_follower', { project, section, user });
}

export async function toggleLeafRoleFollowers(
  project,
  referenceDoctype,
  referenceName,
  role,
  enabled,
) {
  const { data } = await apiClient.post(`${BASE}.toggle_leaf_role_followers`, {
    project,
    reference_doctype: referenceDoctype,
    reference_name: referenceName,
    role,
    enabled: enabled ? 1 : 0,
  });
  invalidateDocumentSubscribeCaches(referenceDoctype, referenceName);
  const result = data?.message ?? {};
  emitProjectFollowersChanged({
    projectId: String(project || '').trim(),
    source: 'leaf',
    leaf: {
      referenceDoctype,
      referenceName,
      role,
      enabled: Boolean(enabled),
      users: Array.isArray(result.users) ? result.users : [],
    },
  });
  return result;
}
