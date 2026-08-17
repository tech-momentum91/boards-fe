import { PROJECT_MEMBER_FIELDS } from '@/components/projects/constants';
import { colorForProjectStage, formatProjectApiDate } from '@/components/projects/shared';

function normalizeMemberAssignees(value) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

/**
 * Maps project create form values to POST /resource/Project payload.
 */
export function buildProjectCreatePayload(values) {
  const users = [];

  PROJECT_MEMBER_FIELDS.forEach((field) => {
    const assignees = normalizeMemberAssignees(values.members?.[field.id]);
    assignees.forEach((user) => {
      users.push({
        user,
        custom_role: field.label,
      });
    });
  });

  const payload = {
    project_name: values.name?.trim(),
    custom_crm_account: values.account,
    customer: values.customer,
    custom_project_stage: values.stage,
    custom_city: values.city,
    custom_carpet_area: String(values.carpet_area ?? '').trim(),
    custom_design_start_date: formatProjectApiDate(values.design_start),
    custom_design_end_date: formatProjectApiDate(values.design_end),
    custom_project_start_date: formatProjectApiDate(values.project_start),
    custom_project_end_date: formatProjectApiDate(values.project_end),
    custom_floors: (values.floors ?? []).map((floor) => ({
      floor: String(floor).trim(),
      doctype: 'Project Floor',
    })),
    users,
  };

  return payload;
}

/** Group Project.users child rows into create/edit members form shape. */
export function buildProjectMembersFormValues(users = []) {
  const members = PROJECT_MEMBER_FIELDS.reduce((acc, field) => {
    acc[field.id] = [];
    return acc;
  }, {});

  const roleToFieldId = PROJECT_MEMBER_FIELDS.reduce((acc, field) => {
    acc[field.label] = field.id;
    return acc;
  }, {});

  (Array.isArray(users) ? users : []).forEach((row) => {
    const user = String(row?.user ?? '').trim();
    const role = String(row?.custom_role ?? '').trim();
    const fieldId = roleToFieldId[role];
    if (!user || !fieldId) return;
    if (!members[fieldId].includes(user)) {
      members[fieldId].push(user);
    }
  });

  return members;
}

/** Map members form values → Project.users payload rows. */
export function buildProjectUsersPayload(members = {}) {
  const users = [];
  PROJECT_MEMBER_FIELDS.forEach((field) => {
    normalizeMemberAssignees(members?.[field.id]).forEach((user) => {
      users.push({ user, custom_role: field.label });
    });
  });
  return users;
}

/** Normalize assignee value list to trimmed unique ids. */
export function normalizeProjectMemberIds(value) {
  return normalizeMemberAssignees(value);
}

export function projectMemberSelectionsEqual(a, b) {
  const left = [...new Set(normalizeMemberAssignees(a))].sort();
  const right = [...new Set(normalizeMemberAssignees(b))].sort();
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function assigneeOptionKey(user) {
  return String(user?.value || user?.user || user?.email || '')
    .trim()
    .toLowerCase();
}

/**
 * Role dropdown options for project members: matching-role users first, then all other
 * project-role users (deduped). Plain option objects only — safe for AssigneeMultiSelect.
 */
export function buildProjectRoleAssigneeOptions(roleMemberOptions = {}, preferredRole = '') {
  const preferredKey = String(preferredRole || '').trim();
  const preferred = [];
  const others = [];
  const seen = new Set();

  const pushUser = (user, target) => {
    const key = assigneeOptionKey(user);
    if (!key || seen.has(key)) return;
    seen.add(key);
    target.push({
      ...user,
      value: user?.value || user?.user || user?.email,
    });
  };

  const preferredUsers =
    roleMemberOptions[preferredKey] ??
    (preferredKey
      ? Object.entries(roleMemberOptions).find(
          ([role]) => role.toLowerCase() === preferredKey.toLowerCase(),
        )?.[1]
      : null) ??
    [];

  (Array.isArray(preferredUsers) ? preferredUsers : []).forEach((user) =>
    pushUser(user, preferred),
  );

  Object.entries(roleMemberOptions || {}).forEach(([role, users]) => {
    if (preferredKey && role.toLowerCase() === preferredKey.toLowerCase()) return;
    (Array.isArray(users) ? users : []).forEach((user) => pushUser(user, others));
  });

  return [...preferred, ...others];
}

/** Filter role fields by role label or assigned member label/email. */
export function filterProjectMemberFields(keyword, members = {}, roleMemberOptions = {}) {
  const query = String(keyword ?? '')
    .trim()
    .toLowerCase();
  if (!query) return PROJECT_MEMBER_FIELDS;

  const allOptions = buildProjectRoleAssigneeOptions(roleMemberOptions, '');

  return PROJECT_MEMBER_FIELDS.filter((field) => {
    if (field.label.toLowerCase().includes(query)) return true;

    const selected = normalizeMemberAssignees(members?.[field.id]);
    const options = buildProjectRoleAssigneeOptions(roleMemberOptions, field.label);

    const searchPool = options.length > 0 ? options : allOptions;

    return selected.some((userId) => {
      const id = String(userId).toLowerCase();
      if (id.includes(query)) return true;

      const option = searchPool.find((item) => {
        const value = String(item?.value ?? '')
          .trim()
          .toLowerCase();
        const email = String(item?.email ?? '')
          .trim()
          .toLowerCase();
        return value === id || email === id;
      });

      return [option?.label, option?.full_name, option?.email]
        .map((part) => String(part ?? '').toLowerCase())
        .some((part) => part.includes(query));
    });
  });
}

/** True when a pointer/focus event target is inside a nested Radix menu / select. */
export function isNestedRadixOverlayTarget(target) {
  if (!(target instanceof Element)) return false;
  // Only treat dropdown/select menus as nested — do NOT match every popper wrapper
  // (that incorrectly includes this popover's own portal and can break open/close).
  return Boolean(
    target.closest('[data-radix-menu-content]') ||
    target.closest('[data-radix-select-content]') ||
    target.closest('[data-radix-dropdown-menu-content]') ||
    target.closest('[role="menu"]') ||
    target.closest('[role="listbox"]') ||
    target.closest('[data-project-members-nested="true"]'),
  );
}

/** Parent project options for create drawer: defaults to the current project title. */
export function buildParentProjectOptions(projectName) {
  const trimmedName = String(projectName ?? '').trim();
  if (!trimmedName) return [];

  return [{ value: trimmedName, label: trimmedName }];
}

export function countProjectMembers(project) {
  const users = project?.users ?? [];
  return Array.isArray(users) ? users.length : 0;
}

export function formatProjectCarpetArea(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';

  if (/sq\.?\s*ft/i.test(raw)) return raw;

  const numeric = raw.replaceAll(',', '');
  if (/^\d+(\.\d+)?$/.test(numeric)) {
    return `${Number(numeric).toLocaleString('en-IN')} sq.ft.`;
  }

  return raw;
}

export function formatProjectStageBadge(project) {
  const stage = String(project?.custom_project_stage ?? '').trim();
  const status = String(project?.status ?? '').trim();

  if (stage && status) {
    return `${stage}:${status.replaceAll(/\s+/g, ' ').toUpperCase()}`;
  }

  if (stage) return stage.toUpperCase();
  if (status) return status.replaceAll(/\s+/g, ' ').toUpperCase();
  return '—';
}

export function buildProjectDetailHeader(project) {
  if (!project) {
    return {
      title: '—',
      stageBadge: '—',
      stageColor: 'gray',
      locationLabel: '—',
      carpetArea: '—',
      memberCount: 0,
      membersLabel: '0 Members',
    };
  }

  const accountLabel =
    project.crm_account_name ?? project.custom_crm_account ?? project.customer_name ?? '';
  const city = project.custom_city ?? '';
  const locationParts = [accountLabel, city].filter(Boolean);
  const memberCount = countProjectMembers(project);

  return {
    title: project.project_name ?? project.name ?? '—',
    stageBadge: formatProjectStageBadge(project),
    stageColor: colorForProjectStage(project.custom_project_stage),
    locationLabel: locationParts.length > 0 ? locationParts.join(', ') : '—',
    carpetArea: formatProjectCarpetArea(project.custom_carpet_area),
    memberCount,
    membersLabel: `${memberCount} Member${memberCount === 1 ? '' : 's'}`,
  };
}
